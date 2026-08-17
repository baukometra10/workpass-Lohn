/**
 * ELSTER submission with stored company certificate (PKCS#12).
 * Live Finanzamt send uses WORKPASS_ELSTER_SUBMIT_URL or WORKPASS_ELSTER_ERIC_CMD.
 * Without those, the job is queued with XML and marked READY (operator/ERiC sidecar).
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { sqliteExec, sqliteGet, sqliteAll } from "../db/sqlite.mjs";
import { encryptString, decryptString, sha256Hex } from "../security/crypto.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { listPayrollJobs, loadCompany } from "../db/repository.mjs";
import { isDemoPayrollJob } from "../demo-detect.mjs";
import { appendBusinessAudit } from "../gobd/business-audit.mjs";
import { ACCOUNTING_VERSION } from "../version.mjs";

function now() {
  return new Date().toISOString();
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
      submitted_at TEXT
    )
  `);
}

export function elsterCertStatus(companyId) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const row = sqliteGet(`SELECT company_id, auto_submit, fingerprint, updated_at FROM elster_certs WHERE company_id = ?`, [id]);
  if (!row) return { ok: true, configured: false, autoSubmit: false };
  return {
    ok: true,
    configured: true,
    autoSubmit: Boolean(row.auto_submit),
    fingerprint: row.fingerprint,
    updatedAt: row.updated_at,
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

function buildYearLstbXml(companyId, year) {
  const jobs = (listPayrollJobs({ companyId }) || []).filter(
    (j) => !isDemoPayrollJob(j) && String(j.period || "").startsWith(String(year)) && j.status === "released"
  );
  const company = loadCompany(companyId) || {};
  const lines = jobs.map((j) => {
    const t = j.payslip?.totals || j.payroll || {};
    return `  <Arbeitnehmer id="${esc(j.employee?.id || "")}" name="${esc(j.employee?.name || "")}" period="${esc(j.period || "")}" brutto="${num(t.gross)}" lst="${num(t.payrollTax)}" soli="${num(t.solidarity)}" kist="${num(t.churchTax)}" netto="${num(t.net)}"/>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>LStB</DatenArt>
    <Vorgang>send-Auth</Vorgang>
    <Testmerker>${process.env.WORKPASS_ELSTER_TEST === "0" ? "0" : "700000004"}</Testmerker>
    <HerstellerID>WorkPass Lohn ${ACCOUNTING_VERSION}</HerstellerID>
    <DatenLieferant>${esc(company.name || companyId)}</DatenLieferant>
    <Datei>
      <Verschluesselung>PKCS#12</Verschluesselung>
    </Datei>
  </TransferHeader>
  <DatenTeil>
    <Nutzdaten>
      <NutzdatenHeader>
        <NutzdatenTicket>${crypto.randomUUID()}</NutzdatenTicket>
        <Empfaenger id="F">${esc(String(company.taxNumber || "").replace(/\s+/g, ""))}</Empfaenger>
      </NutzdatenHeader>
      <NutzdatenBlock>
        <Lohnsteuerbescheinigungen jahr="${esc(year)}" firma="${esc(companyId)}" anzahl="${jobs.length}">
${lines.join("\n")}
        </Lohnsteuerbescheinigungen>
      </NutzdatenBlock>
    </Nutzdaten>
  </DatenTeil>
</Elster>
`;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function num(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

async function deliverToElsterChannel({ xml, cert, submissionId }) {
  const url = String(process.env.WORKPASS_ELSTER_SUBMIT_URL || "").trim();
  const cmd = String(process.env.WORKPASS_ELSTER_ERIC_CMD || "").trim();
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WorkPass-Elster-Key": process.env.WORKPASS_ELSTER_SUBMIT_KEY || "",
      },
      body: JSON.stringify({
        kind: "workpass.elster.submit.v1",
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
    return { mode: "submit-url", accepted: true, remoteId: data.id || null };
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
    return { mode: "eric-cmd", accepted: true };
  }
  return {
    mode: "queued-local",
    accepted: false,
    hint: "Kein ERiC/Submit-URL. XML und Zertifikat liegen bereit – Sidecar setzen: WORKPASS_ELSTER_SUBMIT_URL oder WORKPASS_ELSTER_ERIC_CMD.",
  };
}

export async function submitElsterYear({ companyId, period, year, actor = "user" }) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  const cert = loadCertSecrets(id);
  if (!cert) {
    return { ok: false, status: 422, error: "Kein ELSTER-Zertifikat hinterlegt" };
  }
  const y = String(year || String(period || "").slice(0, 4) || new Date().getFullYear());
  const xml = buildYearLstbXml(id, y);
  const submissionId = `elster:${id}:${y}:${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = now();
  sqliteExec(
    `INSERT INTO elster_submissions(submission_id, company_id, period, year, status, xml, created_at)
     VALUES(?,?,?,?,?,?,?)`,
    [submissionId, id, period || "", y, "PROCESSING", xml, createdAt]
  );
  try {
    const delivered = await deliverToElsterChannel({ xml, cert, submissionId });
    const status = delivered.accepted ? "COMPLETED" : "PENDING";
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, submitted_at = ?, error = ? WHERE submission_id = ?`,
      [status, now(), delivered.hint || null, submissionId]
    );
    appendBusinessAudit({
      companyId: id,
      actor,
      source: actor === "job" ? "job" : "user",
      op: "elster.submit",
      entityType: "elster",
      entityId: submissionId,
      status,
      detail: { year: y, mode: delivered.mode },
    });
    return {
      ok: true,
      submissionId,
      status,
      year: y,
      mode: delivered.mode,
      hint: delivered.hint || null,
      message: delivered.accepted
        ? `ELSTER-Übermittlung ${y} gesendet.`
        : `ELSTER-Auftrag ${y} bereit (Zertifikat gespeichert). ${delivered.hint || ""}`,
    };
  } catch (e) {
    sqliteExec(
      `UPDATE elster_submissions SET status = ?, error = ? WHERE submission_id = ?`,
      ["FAILED", e.message || String(e), submissionId]
    );
    return { ok: false, status: 502, error: e.message || String(e), submissionId };
  }
}

export function listElsterSubmissions(companyId, limit = 20) {
  ensureTables();
  const id = normalizeCompanyId(companyId);
  return sqliteAll(
    `SELECT submission_id, period, year, status, error, created_at, submitted_at
     FROM elster_submissions WHERE company_id = ? ORDER BY created_at DESC LIMIT ?`,
    [id, Math.max(1, Math.min(100, Number(limit) || 20))]
  ).map((r) => ({
    submissionId: r.submission_id,
    period: r.period,
    year: r.year,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
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
     WHERE company_id = ? AND year = ? AND status IN ('PENDING','PROCESSING','COMPLETED')
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
