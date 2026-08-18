/**
 * ELSTER submission with stored company certificate (PKCS#12).
 * Live Finanzamt send uses WORKPASS_ELSTER_SUBMIT_URL or WORKPASS_ELSTER_ERIC_CMD.
 * Without those, the job is queued with XML (not treated as arrived at the Finanzamt).
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { sqliteExec, sqliteGet, sqliteAll } from "../db/sqlite.mjs";
import { encryptString, decryptString, sha256Hex } from "../security/crypto.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { appendBusinessAudit } from "../gobd/business-audit.mjs";
import { buildYearLstbXml, elsterTestMode } from "./lstb-xml.mjs";
import { buildMonthLsta } from "./lsta-xml.mjs";

function now() {
  return new Date().toISOString();
}

function ensureColumn(table, column, defSql) {
  const cols = sqliteAll(`PRAGMA table_info(${table})`);
  if (cols.some((c) => c.name === column)) return;
  sqliteExec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defSql}`);
}

function ensureTables() {
  sqliteExec(`
    CREATE TABLE IF NOT EXISTS elster_certs (
      company_id TEXT PRIMARY KEY,
      auto_submit INTEGER NOT NULL DEFAULT 0,
      fingerprint TEXT NOT NULL DEFAULT '',
      p12_enc TEXT NOT NULL,
      pin_enc TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  sqliteExec(`
    CREATE TABLE IF NOT EXISTS elster_submissions (
      submission_id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING',
      xml TEXT NOT NULL DEFAULT '',
      error TEXT,
      created_at TEXT NOT NULL,
      submitted_at TEXT,
      mode TEXT,
      remote_id TEXT,
      test_mode INTEGER NOT NULL DEFAULT 1,
      employee_count INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'lstb'
    )
  `);
  ensureColumn("elster_submissions", "mode", "TEXT");
  ensureColumn("elster_submissions", "remote_id", "TEXT");
  ensureColumn("elster_submissions", "test_mode", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("elster_submissions", "employee_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("elster_submissions", "kind", "TEXT NOT NULL DEFAULT 'lstb'");
}

export function elsterChannelStatus() {
  const url = String(process.env.WORKPASS_ELSTER_SUBMIT_URL || "").trim();
  const cmd = String(process.env.WORKPASS_ELSTER_ERIC_CMD || "").trim();
  let mode = "none";
  if (url) mode = "submit-url";
  else if (cmd) mode = "eric-cmd";
  return {
    connected: Boolean(url || cmd),
    mode,
    testMode: elsterTestMode(),
    submitUrlSet: Boolean(url),
    ericCmdSet: Boolean(cmd),
  };
}

export function elsterCertStatus(companyId) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const channel = elsterChannelStatus();
  const row = sqliteGet(`SELECT company_id, auto_submit, fingerprint, updated_at FROM elster_certs WHERE company_id = ?`, [id]);
  if (!row) {
    return { ok: true, configured: false, autoSubmit: false, channel };
  }
  return {
    ok: true,
    configured: true,
    autoSubmit: Boolean(row.auto_submit),
    fingerprint: row.fingerprint,
    updatedAt: row.updated_at,
    channel,
  };
}

export function saveElsterCert({ companyId, p12Base64, pin, autoSubmit = false }) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  if (!id) throw new Error("companyId fehlt");
  const raw = String(p12Base64 || "").replace(/\s+/g, "");
  if (raw.length < 80) throw new Error("Zertifikat (PKCS#12) fehlt oder ist zu kurz");
  const pinStr = String(pin || "");
  if (pinStr.length < 4) throw new Error("Zertifikat-PIN fehlt");
  const ts = now();
  const fingerprint = sha256Hex(raw).slice(0, 16);
  sqliteExec(
    `INSERT INTO elster_certs(company_id, auto_submit, fingerprint, p12_enc, pin_enc, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(company_id) DO UPDATE SET
       auto_submit = excluded.auto_submit,
       fingerprint = excluded.fingerprint,
       p12_enc = excluded.p12_enc,
       pin_enc = excluded.pin_enc,
       updated_at = excluded.updated_at`,
    [id, autoSubmit ? 1 : 0, fingerprint, encryptString(raw), encryptString(pinStr), ts, ts]
  );
  return elsterCertStatus(id);
}

function loadCertSecrets(companyId) {
  ensureTables();
  const row = sqliteGet(`SELECT * FROM elster_certs WHERE company_id = ?`, [normalizeCompanyId(companyId)]);
  if (!row) return null;
  return {
    p12: decryptString(row.p12_enc),
    pin: decryptString(row.pin_enc),
    autoSubmit: Boolean(row.auto_submit),
    fingerprint: row.fingerprint,
  };
}

async function deliverToElsterChannel({ xml, cert, submissionId }) {
  const url = String(process.env.WORKPASS_ELSTER_SUBMIT_URL || "").trim();
  const cmd = String(process.env.WORKPASS_ELSTER_ERIC_CMD || "").trim();
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "close",
        "X-WorkPass-Elster-Key": process.env.WORKPASS_ELSTER_SUBMIT_KEY || "",
      },
      body: JSON.stringify({
        kind: "workpass.elster.submit.v1",
        datenArt: xml.includes("LStA") ? "LStA" : "LStB",
        submissionId,
        xml,
        p12: cert.p12,
        pin: cert.pin,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `ELSTER-Kanal HTTP ${res.status}`);
    }
    return {
      mode: "submit-url",
      accepted: data.accepted !== false,
      remoteId: data.id || null,
      finanzamtReached: data.finanzamtReached === true,
      hint: data.hint || null,
    };
  }
  if (cmd) {
    const run = spawnSync(cmd, ["--submit", submissionId], {
      input: xml,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (run.status !== 0) {
      throw new Error((run.stderr || run.stdout || "ERiC-Fehler").slice(0, 400));
    }
    return { mode: "eric-cmd", accepted: true, finanzamtReached: false };
  }
  return {
    mode: "queued-local",
    accepted: false,
    finanzamtReached: false,
    hint: "Kein ELSTER-Sidecar. XML und Zertifikat liegen lokal bereit – nicht beim Finanzamt. Setzen Sie WORKPASS_ELSTER_SUBMIT_URL oder WORKPASS_ELSTER_ERIC_CMD.",
  };
}

function userMessage({ year, delivered, testMode, employeeCount }) {
  if (delivered.accepted) {
    if (delivered.finanzamtReached) {
      return `ELSTER-Übermittlung ${year} vom Sidecar als beim Finanzamt angenommen gemeldet.`;
    }
    if (testMode) {
      return `ELSTER-Auftrag ${year} an den Testkanal übergeben (${employeeCount} LStB). Das ist nicht das Finanzamt.`;
    }
    return `ELSTER-Auftrag ${year} an den Kanal übergeben (${employeeCount} LStB). Die Annahme beim Finanzamt bestätigt nur ERiC/Sidecar – nicht dieser Server.`;
  }
  return `ELSTER-Auftrag ${year} liegt lokal bereit (${employeeCount} LStB). Noch nicht beim Finanzamt. ${delivered.hint || ""}`.trim();
}

export async function submitElsterYear({ companyId, period, year, actor = "user" }) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const cert = loadCertSecrets(id);
  if (!cert) {
    return { ok: false, status: 422, error: "Kein ELSTER-Zertifikat hinterlegt" };
  }
  const built = buildYearLstbXml(id, year || String(period || "").slice(0, 4) || new Date().getFullYear());
  const y = String(built.year);
  const xml = built.xml;
  const submissionId = `elster:${id}:${y}:${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = now();
  const testMode = built.testMode ? 1 : 0;
  sqliteExec(
    `INSERT INTO elster_submissions(submission_id, company_id, period, year, status, xml, created_at, test_mode, employee_count, kind)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [submissionId, id, period || "", y, "PROCESSING", xml, createdAt, testMode, built.employeeCount, "lstb"]
  );
  try {
    const delivered = await deliverToElsterChannel({ xml, cert, submissionId });
    const status = delivered.accepted ? "SENT" : "PENDING";
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, submitted_at = ?, error = ?, mode = ?, remote_id = ?, test_mode = ?, employee_count = ? WHERE submission_id = ?`,
      [
        status,
        now(),
        delivered.hint || null,
        delivered.mode || null,
        delivered.remoteId || null,
        testMode,
        built.employeeCount,
        submissionId,
      ]
    );
    appendBusinessAudit({
      companyId: id,
      actor,
      source: actor === "job" ? "job" : "user",
      op: "elster.submit",
      entityType: "elster",
      entityId: submissionId,
      status,
      detail: {
        year: y,
        mode: delivered.mode,
        testMode: Boolean(testMode),
        accepted: delivered.accepted,
        finanzamtReached: Boolean(delivered.finanzamtReached),
        employeeCount: built.employeeCount,
      },
    });
    return {
      ok: true,
      submissionId,
      status,
      year: y,
      mode: delivered.mode,
      remoteId: delivered.remoteId || null,
      testMode: Boolean(testMode),
      employeeCount: built.employeeCount,
      skipped: built.skipped,
      finanzamtReached: Boolean(delivered.finanzamtReached),
      hint: delivered.hint || null,
      channel: elsterChannelStatus(),
      message: userMessage({ year: y, delivered, testMode: Boolean(testMode), employeeCount: built.employeeCount }),
    };
  } catch (e) {
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, error = ?, mode = ? WHERE submission_id = ?`,
      ["FAILED", e.message || String(e), elsterChannelStatus().mode, submissionId]
    );
    return { ok: false, status: 502, error: e.message || String(e), submissionId };
  }
}

export function listElsterSubmissions(companyId, limit = 20) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  return sqliteAll(
    `SELECT submission_id, period, year, status, error, created_at, submitted_at, mode, remote_id, test_mode, employee_count, kind
     FROM elster_submissions WHERE company_id = ? ORDER BY created_at DESC LIMIT ?`,
    [id, Math.max(1, Math.min(100, Number(limit) || 20))]
  ).map((r) => ({
    submissionId: r.submission_id,
    kind: r.kind || "lstb",
    period: r.period,
    year: r.year,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    mode: r.mode || null,
    remoteId: r.remote_id || null,
    testMode: r.test_mode == null ? true : Boolean(r.test_mode),
    employeeCount: Number(r.employee_count) || 0,
  }));
}

export async function maybeAutoSubmitElster(companyId, period) {
  const st = elsterCertStatus(companyId);
  if (!st.configured || !st.autoSubmit) return { skipped: true };
  if (process.env.WORKPASS_ELSTER_AUTO_SUBMIT === "0") return { skipped: true, reason: "disabled" };
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const y = String(period || "").slice(0, 4) || String(new Date().getFullYear());
  const existing = sqliteGet(
    `SELECT submission_id, status FROM elster_submissions
     WHERE company_id = ? AND year = ? AND IFNULL(kind,'lstb') = 'lstb'
       AND status IN ('PENDING','PROCESSING','COMPLETED','SENT')
     ORDER BY created_at DESC LIMIT 1`,
    [id, y]
  );
  if (existing) {
    return {
      skipped: true,
      reason: "already_queued",
      submissionId: existing.submission_id,
      status: existing.status,
    };
  }
  return submitElsterYear({ companyId, period, year: y, actor: "job" });
}

function lstaUserMessage({ period, delivered, testMode, payable }) {
  const pay = Number(payable || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (delivered.accepted) {
    if (delivered.finanzamtReached) {
      return `LStA ${period} (${pay} €) vom Sidecar als beim Finanzamt angenommen gemeldet.`;
    }
    if (testMode) {
      return `LStA ${period} (${pay} €) an den Testkanal übergeben. Das ist nicht das Finanzamt.`;
    }
    return `LStA ${period} (${pay} €) an den ELSTER-Kanal übergeben. Die Annahme beim Finanzamt bestätigt nur ERiC/Sidecar.`;
  }
  return `LStA ${period} (${pay} €) liegt lokal bereit. Noch nicht beim Finanzamt. ${delivered.hint || ""}`.trim();
}

export { buildMonthLsta };

export async function submitElsterLsta({ companyId, period, actor = "user" }) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const cert = loadCertSecrets(id);
  if (!cert) {
    return { ok: false, status: 422, error: "Kein ELSTER-Zertifikat hinterlegt" };
  }
  const built = buildMonthLsta(id, period);
  if (!built.ok) return built;
  if (built.empty) {
    return { ok: false, status: 422, error: `Keine freigegebenen Abrechnungen für ${built.period}` };
  }
  const xml = built.xml;
  const submissionId = `lsta:${id}:${built.period}:${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = now();
  const testMode = built.testMode ? 1 : 0;
  sqliteExec(
    `INSERT INTO elster_submissions(submission_id, company_id, period, year, status, xml, created_at, test_mode, employee_count, kind)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [submissionId, id, built.period, built.year, "PROCESSING", xml, createdAt, testMode, built.employeeCount, "lsta"]
  );
  try {
    const delivered = await deliverToElsterChannel({ xml, cert, submissionId });
    const status = delivered.accepted ? "SENT" : "PENDING";
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, submitted_at = ?, error = ?, mode = ?, remote_id = ?, test_mode = ?, employee_count = ? WHERE submission_id = ?`,
      [
        status,
        now(),
        delivered.hint || null,
        delivered.mode || null,
        delivered.remoteId || null,
        testMode,
        built.employeeCount,
        submissionId,
      ]
    );
    appendBusinessAudit({
      companyId: id,
      actor,
      source: actor === "job" ? "job" : "user",
      op: "elster.lsta",
      entityType: "lsta",
      entityId: submissionId,
      status,
      detail: {
        period: built.period,
        mode: delivered.mode,
        testMode: Boolean(testMode),
        accepted: delivered.accepted,
        finanzamtReached: Boolean(delivered.finanzamtReached),
        payable: built.totals.payable,
        employeeCount: built.employeeCount,
      },
    });
    return {
      ok: true,
      submissionId,
      status,
      kind: "lsta",
      period: built.period,
      year: built.year,
      totals: built.totals,
      employeeCount: built.employeeCount,
      mode: delivered.mode,
      remoteId: delivered.remoteId || null,
      testMode: Boolean(testMode),
      finanzamtReached: Boolean(delivered.finanzamtReached),
      hint: delivered.hint || null,
      channel: elsterChannelStatus(),
      message: lstaUserMessage({
        period: built.period,
        delivered,
        testMode: Boolean(testMode),
        payable: built.totals.payable,
      }),
    };
  } catch (e) {
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, error = ?, mode = ? WHERE submission_id = ?`,
      ["FAILED", e.message || String(e), elsterChannelStatus().mode, submissionId]
    );
    return { ok: false, status: 502, error: e.message || String(e), submissionId };
  }
}

export async function maybeAutoSubmitLsta(companyId, period) {
  const st = elsterCertStatus(companyId);
  if (!st.configured || !st.autoSubmit) return { skipped: true };
  if (process.env.WORKPASS_ELSTER_AUTO_SUBMIT === "0") return { skipped: true, reason: "disabled" };
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const p = String(period || "").trim();
  const existing = sqliteGet(
    `SELECT submission_id, status FROM elster_submissions
     WHERE company_id = ? AND period = ? AND kind = 'lsta'
       AND status IN ('PENDING','PROCESSING','COMPLETED','SENT')
     ORDER BY created_at DESC LIMIT 1`,
    [id, p]
  );
  if (existing) {
    return {
      skipped: true,
      reason: "already_queued",
      submissionId: existing.submission_id,
      status: existing.status,
    };
  }
  return submitElsterLsta({ companyId, period: p, actor: "job" });
}

