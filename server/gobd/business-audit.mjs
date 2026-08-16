/**
 * GoBD business audit ledger – tenant-scoped, append-only, hash-chained.
 */
import crypto from "node:crypto";
import { sqliteExec, sqliteGet, sqliteAll } from "../db/sqlite.mjs";
import { sha256Hex, encryptJson, decryptJson, isEncryptedBlob } from "../security/crypto.mjs";
import { normalizeCompanyId } from "../tenant.mjs";

export const SYNC_STATUSES = Object.freeze([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "DEAD_LETTER",
]);

function pack(obj) {
  if (obj == null) return null;
  return encryptJson(obj);
}

function unpack(raw) {
  if (raw == null || raw === "") return null;
  if (isEncryptedBlob(raw)) return decryptJson(raw, null);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function lastHash() {
  const row = sqliteGet(`SELECT hash FROM business_audit ORDER BY created_at DESC, event_id DESC LIMIT 1`);
  return row?.hash || "genesis";
}

/**
 * Append a business audit event.
 * @param {{
 *   op: string,
 *   companyId?: string,
 *   employeeId?: string,
 *   actor?: string,
 *   source?: 'user'|'api'|'job'|'platform'|'system',
 *   entityType?: string,
 *   entityId?: string,
 *   status?: string,
 *   correlationId?: string,
 *   eventId?: string,
 *   oldValue?: object|null,
 *   newValue?: object|null,
 *   detail?: object,
 * }} entry
 */
export function appendBusinessAudit(entry = {}) {
  const eventId = String(entry.eventId || crypto.randomUUID());
  const createdAt = new Date().toISOString();
  const prevHash = lastHash();
  const companyId = normalizeCompanyId(entry.companyId || "") || "";
  const status = SYNC_STATUSES.includes(String(entry.status || "").toUpperCase())
    ? String(entry.status).toUpperCase()
    : String(entry.status || "COMPLETED");
  const record = {
    eventId,
    companyId,
    employeeId: String(entry.employeeId || ""),
    actor: String(entry.actor || "system"),
    source: String(entry.source || "system"),
    op: String(entry.op || "event"),
    entityType: String(entry.entityType || ""),
    entityId: String(entry.entityId || ""),
    status,
    correlationId: String(entry.correlationId || eventId),
    createdAt,
    prevHash,
  };
  record.hash = sha256Hex(JSON.stringify({
    ...record,
    old: entry.oldValue ?? null,
    new: entry.newValue ?? null,
    detail: entry.detail ?? null,
  }));

  sqliteExec(
    `INSERT INTO business_audit(
      event_id, company_id, employee_id, actor, source, op, entity_type, entity_id,
      status, correlation_id, old_json, new_json, detail_json, prev_hash, hash, created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      eventId,
      companyId,
      record.employeeId,
      record.actor,
      record.source,
      record.op,
      record.entityType,
      record.entityId,
      status,
      record.correlationId,
      pack(entry.oldValue ?? null),
      pack(entry.newValue ?? null),
      JSON.stringify(entry.detail || {}),
      prevHash,
      record.hash,
      createdAt,
    ]
  );

  return { ...record, detail: entry.detail || null };
}

export function listBusinessAudit(filter = {}) {
  let sql = `SELECT * FROM business_audit WHERE 1=1`;
  const params = [];
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  if (filter.employeeId) {
    sql += ` AND employee_id = ?`;
    params.push(String(filter.employeeId));
  }
  if (filter.entityType) {
    sql += ` AND entity_type = ?`;
    params.push(String(filter.entityType));
  }
  if (filter.entityId) {
    sql += ` AND entity_id = ?`;
    params.push(String(filter.entityId));
  }
  if (filter.correlationId) {
    sql += ` AND correlation_id = ?`;
    params.push(String(filter.correlationId));
  }
  if (filter.from) {
    sql += ` AND created_at >= ?`;
    params.push(String(filter.from));
  }
  if (filter.to) {
    sql += ` AND created_at <= ?`;
    params.push(String(filter.to));
  }
  sql += ` ORDER BY created_at ASC, event_id ASC`;
  if (filter.limit) {
    sql += ` LIMIT ?`;
    params.push(Math.max(1, Math.min(5000, Number(filter.limit) || 500)));
  }
  return sqliteAll(sql, params).map((row) => ({
    eventId: row.event_id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    actor: row.actor,
    source: row.source,
    op: row.op,
    entityType: row.entity_type,
    entityId: row.entity_id,
    status: row.status,
    correlationId: row.correlation_id,
    oldValue: unpack(row.old_json),
    newValue: unpack(row.new_json),
    detail: (() => {
      try { return JSON.parse(row.detail_json || "{}"); } catch { return {}; }
    })(),
    prevHash: row.prev_hash,
    hash: row.hash,
    createdAt: row.created_at,
  }));
}

export function verifyBusinessAuditChain(filter = {}) {
  const rows = listBusinessAudit({ ...filter, limit: filter.limit || 2000 });
  let prev = filter.companyId ? null : "genesis";
  let checked = 0;
  for (const rec of rows) {
    if (prev != null && rec.prevHash && checked > 0 && !filter.companyId) {
      if (rec.prevHash !== prev) {
        return { ok: false, checked, brokenAt: checked, message: "prevHash-Kette unterbrochen", eventId: rec.eventId };
      }
    }
    prev = rec.hash;
    checked += 1;
  }
  return { ok: true, checked, brokenAt: null, message: `${checked} Business-Audit-Einträge` };
}
