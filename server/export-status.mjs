/**
 * Export run log + optional bank/Kanzlei status import (pain.002 stub).
 */
import { sqliteExec, sqliteGet, sqliteAll } from "./db/sqlite.mjs";
import { normalizeCompanyId } from "./tenant.mjs";

function now() {
  return new Date().toISOString();
}

function ensureTables() {
  sqliteExec(`
    CREATE TABLE IF NOT EXISTS export_runs (
      run_id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'exported',
      file_name TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    )
  `);
  sqliteExec(`
    CREATE TABLE IF NOT EXISTS export_import_status (
      import_id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      source TEXT NOT NULL DEFAULT 'manual',
      detail_json TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

export function recordExportRun({ companyId, period, kind, status = "exported", fileName = "", meta = {} }) {
  ensureTables();
  const cid = normalizeCompanyId(companyId);
  if (!cid || !kind) return { ok: false, error: "companyId/kind fehlt" };
  const runId = `exp:${kind}:${cid}:${period || "na"}:${Date.now()}`;
  const ts = now();
  sqliteExec(
    `INSERT INTO export_runs(run_id, company_id, period, kind, status, file_name, meta_json, created_at)
     VALUES(?,?,?,?,?,?,?,?)`,
    [runId, cid, String(period || ""), kind, status, fileName || "", JSON.stringify(meta || {}), ts]
  );
  return { ok: true, runId, createdAt: ts };
}

export function listExportRuns(companyId, opts = {}) {
  ensureTables();
  const cid = normalizeCompanyId(companyId);
  const period = String(opts.period || "").trim();
  const limit = Math.max(1, Math.min(50, Number(opts.limit) || 20));
  const rows = sqliteAll(
    `SELECT run_id, company_id, period, kind, status, file_name, meta_json, created_at
     FROM export_runs WHERE company_id = ? ${period ? "AND period = ?" : ""}
     ORDER BY created_at DESC LIMIT ?`,
    period ? [cid, period, limit] : [cid, limit]
  );
  return rows.map((r) => ({
    runId: r.run_id,
    companyId: r.company_id,
    period: r.period,
    kind: r.kind,
    status: r.status,
    fileName: r.file_name,
    meta: (() => { try { return JSON.parse(r.meta_json || "{}"); } catch { return {}; } })(),
    createdAt: r.created_at,
  }));
}

/** Parse minimal pain.002 / camt status text — human confirms import. */
export function importBankStatus({ companyId, period, kind, content, source = "pain.002" }) {
  ensureTables();
  const cid = normalizeCompanyId(companyId);
  const text = String(content || "");
  if (!cid || text.length < 8) return { ok: false, status: 422, error: "Inhalt fehlt" };
  let bankStatus = "unknown";
  if (/RJCT|rejected|abgelehnt/i.test(text)) bankStatus = "rejected";
  else if (/ACCP|accepted|gebucht|booked/i.test(text)) bankStatus = "accepted";
  else if (/PDNG|pending|wartend/i.test(text)) bankStatus = "pending";
  const importId = `imp:${kind}:${cid}:${Date.now()}`;
  const ts = now();
  sqliteExec(
    `INSERT INTO export_import_status(import_id, company_id, period, kind, status, source, detail_json, created_at)
     VALUES(?,?,?,?,?,?,?,?)`,
    [importId, cid, String(period || ""), kind || "sepa", bankStatus, source, JSON.stringify({ preview: text.slice(0, 500) }), ts]
  );
  return {
    ok: true,
    importId,
    bankStatus,
    message: bankStatus === "accepted"
      ? "Bankstatus: angenommen/gebucht (Stub-Parser — bitte XML prüfen)."
      : bankStatus === "rejected"
        ? "Bankstatus: abgelehnt (Stub-Parser)."
        : "Bankstatus empfangen — manuell prüfen.",
  };
}

export function listImportStatuses(companyId, opts = {}) {
  ensureTables();
  const cid = normalizeCompanyId(companyId);
  const period = String(opts.period || "").trim();
  const limit = Math.max(1, Math.min(50, Number(opts.limit) || 10));
  const rows = sqliteAll(
    `SELECT import_id, company_id, period, kind, status, source, detail_json, created_at
     FROM export_import_status WHERE company_id = ? ${period ? "AND period = ?" : ""}
     ORDER BY created_at DESC LIMIT ?`,
    period ? [cid, period, limit] : [cid, limit]
  );
  return rows.map((r) => ({
    importId: r.import_id,
    companyId: r.company_id,
    period: r.period,
    kind: r.kind,
    status: r.status,
    source: r.source,
    detail: (() => { try { return JSON.parse(r.detail_json || "{}"); } catch { return {}; } })(),
    createdAt: r.created_at,
  }));
}

export function exportStatusSummary(companyId, period) {
  const cid = normalizeCompanyId(companyId);
  const p = String(period || "").trim();
  const runs = listExportRuns(cid, { period: p, limit: 30 });
  const imports = listImportStatuses(cid, { period: p, limit: 10 });
  const latestByKind = {};
  for (const r of runs) {
    if (!latestByKind[r.kind]) latestByKind[r.kind] = r;
  }
  return {
    ok: true,
    kind: "portal.export_status.v1",
    companyId: cid,
    period: p,
    latestByKind,
    runs,
    imports,
  };
}
