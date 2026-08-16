/**
 * GoBD document immutability: no silent overwrite of released accounting docs.
 * Corrections create an explicit revision: original → reason → new → actor → time.
 */
import crypto from "node:crypto";
import { sqliteExec, sqliteGet, sqliteAll } from "../db/sqlite.mjs";
import { sha256Hex, encryptJson, decryptJson, isEncryptedBlob } from "../security/crypto.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { appendBusinessAudit } from "./business-audit.mjs";

export class GobdImmutableError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = "GobdImmutableError";
    this.code = "immutable_document";
    this.status = 409;
    this.detail = detail;
  }
}

const LOCKED = new Set(["released", "paid", "closed", "archived"]);

function pack(obj) {
  return encryptJson(obj);
}

function unpack(raw) {
  if (raw == null) return null;
  if (isEncryptedBlob(raw)) return decryptJson(raw, null);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isLockedStatus(status) {
  return LOCKED.has(String(status || "").toLowerCase());
}

/** Material fingerprint – ignores timestamps / delivery / cosmetic fields. */
export function payrollMaterialHash(job) {
  const state = job?.state && typeof job.state === "object" ? job.state : {};
  const inbound = job?.inbound && typeof job.inbound === "object" ? job.inbound : {};
  const wageSrc = state.wageItems || inbound.wageItems || job?.payslip?.wageItems || [];
  const payload = {
    period: job?.period || state.payrollMonth || inbound.period || "",
    companyId: job?.company?.id || state.mandantId || "",
    employeeId: job?.employee?.id || state.employeeId || "",
    payroll: job?.payroll || job?.payslip?.totals || null,
    taxClass: state.taxClass ?? inbound.employee?.taxClass ?? null,
    hours: state.hours ?? state.workedHours ?? inbound.attendance?.hours ?? null,
    hourlyRate: state.hourlyRate ?? null,
    wageItems: (Array.isArray(wageSrc) ? wageSrc : []).map((w) => ({
      code: w.code || w.lohnart || "",
      amount: w.amount ?? w.betrag ?? null,
    })),
  };
  return sha256Hex(JSON.stringify(payload));
}

export function invoiceMaterialHash(job) {
  const draft = job?.draft || {};
  const payload = {
    number: draft.number || job?.number || "",
    companyId: job?.company?.id || draft.company?.id || "",
    total: draft.total ?? draft.gross ?? draft.net ?? null,
    lines: (draft.lines || draft.items || []).map((l) => ({
      desc: l.description || l.label || "",
      amount: l.total ?? l.amount ?? l.price ?? null,
    })),
  };
  return sha256Hex(JSON.stringify(payload));
}

export function listRevisions(filter = {}) {
  let sql = `SELECT * FROM document_revisions WHERE 1=1`;
  const params = [];
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  if (filter.entityType) {
    sql += ` AND entity_type = ?`;
    params.push(String(filter.entityType));
  }
  if (filter.entityId) {
    sql += ` AND entity_id = ?`;
    params.push(String(filter.entityId));
  }
  if (filter.from) {
    sql += ` AND created_at >= ?`;
    params.push(String(filter.from));
  }
  if (filter.to) {
    sql += ` AND created_at <= ?`;
    params.push(String(filter.to));
  }
  sql += ` ORDER BY created_at ASC, revision_no ASC`;
  if (filter.limit) {
    sql += ` LIMIT ?`;
    params.push(Math.max(1, Math.min(5000, Number(filter.limit) || 500)));
  }
  return sqliteAll(sql, params).map((row) => ({
    revisionId: row.revision_id,
    companyId: row.company_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    revisionNo: row.revision_no,
    status: row.status,
    reason: row.reason,
    actor: row.actor,
    source: row.source,
    eventId: row.event_id,
    correlationId: row.correlation_id,
    payloadHash: row.payload_hash,
    payload: unpack(row.payload_json),
    createdAt: row.created_at,
  }));
}

function nextRevisionNo(entityType, entityId) {
  const row = sqliteGet(
    `SELECT MAX(revision_no) AS m FROM document_revisions WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  return (Number(row?.m) || 0) + 1;
}

/**
 * Persist a frozen snapshot of the current document before a correction.
 */
export function archiveDocumentRevision({
  entityType,
  entityId,
  job,
  reason,
  actor = "user",
  source = "user",
  correlationId = "",
  eventId = "",
}) {
  const companyId = normalizeCompanyId(
    job?.company?.id || job?.draft?.company?.id || ""
  ) || "";
  const revisionNo = nextRevisionNo(entityType, entityId);
  const revisionId = `${entityType}:${entityId}:r${revisionNo}:${crypto.randomUUID().slice(0, 8)}`;
  const payloadHash = entityType === "invoice"
    ? invoiceMaterialHash(job)
    : payrollMaterialHash(job);
  const eid = eventId || crypto.randomUUID();
  const corr = correlationId || eid;
  const createdAt = new Date().toISOString();

  sqliteExec(
    `INSERT INTO document_revisions(
      revision_id, company_id, entity_type, entity_id, revision_no, status,
      reason, actor, source, event_id, correlation_id, payload_json, payload_hash, created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      revisionId,
      companyId,
      entityType,
      entityId,
      revisionNo,
      job?.status || "",
      String(reason || "correction"),
      String(actor || "user"),
      String(source || "user"),
      eid,
      corr,
      pack(job),
      payloadHash,
      createdAt,
    ]
  );

  appendBusinessAudit({
    eventId: eid,
    companyId,
    employeeId: job?.employee?.id || "",
    actor,
    source,
    op: `${entityType}.revision_archived`,
    entityType,
    entityId,
    status: "COMPLETED",
    correlationId: corr,
    oldValue: {
      revisionNo,
      status: job?.status,
      materialHash: payloadHash,
      payroll: job?.payroll || job?.payslip?.totals || null,
    },
    newValue: null,
    detail: { reason, revisionId },
  });

  return {
    revisionId,
    revisionNo,
    payloadHash,
    eventId: eid,
    correlationId: corr,
    createdAt,
  };
}

/**
 * Guard write of payroll job. Throws GobdImmutableError if locked + material change without correction.
 * @returns {{ ok: true, archived?: object|null, materialHash: string }}
 */
export function guardPayrollWrite(prev, next, opts = {}) {
  const materialHash = payrollMaterialHash(next);
  if (!prev) {
    return { ok: true, archived: null, materialHash, isNew: true };
  }
  const prevHash = payrollMaterialHash(prev);
  const sameMaterial = prevHash === materialHash;
  const locked = isLockedStatus(prev.status);

  if (!locked || sameMaterial) {
    return { ok: true, archived: null, materialHash, sameMaterial, locked };
  }

  const correction = opts.correction;
  if (!correction || typeof correction !== "object") {
    throw new GobdImmutableError(
      "Freigegebene Abrechnung ist unveränderlich. Korrektur mit reason + confirm erforderlich.",
      {
        jobId: prev.jobId,
        status: prev.status,
        prevHash,
        nextHash: materialHash,
        hint: "POST /v1/payroll/:jobId/correct { confirm:true, reason, … }",
      }
    );
  }
  const reason = String(correction.reason || "").trim();
  if (reason.length < 3) {
    throw new GobdImmutableError("Korrekturgrund (reason) fehlt oder zu kurz.", {
      jobId: prev.jobId,
    });
  }

  const archived = archiveDocumentRevision({
    entityType: "payroll",
    entityId: prev.jobId,
    job: prev,
    reason,
    actor: correction.actor || opts.actor || "user",
    source: correction.source || opts.source || "user",
    correlationId: correction.correlationId || opts.correlationId || "",
    eventId: correction.eventId || "",
  });

  return { ok: true, archived, materialHash, corrected: true };
}

export function guardInvoiceWrite(prev, next, opts = {}) {
  const materialHash = invoiceMaterialHash(next);
  if (!prev) return { ok: true, archived: null, materialHash, isNew: true };
  const prevHash = invoiceMaterialHash(prev);
  const sameMaterial = prevHash === materialHash;
  const locked = isLockedStatus(prev.status);
  if (!locked || sameMaterial) {
    return { ok: true, archived: null, materialHash, sameMaterial, locked };
  }
  const correction = opts.correction;
  if (!correction || typeof correction !== "object") {
    throw new GobdImmutableError(
      "Freigegebene Rechnung ist unveränderlich. Korrektur mit reason erforderlich.",
      { id: prev.id, status: prev.status, prevHash, nextHash: materialHash }
    );
  }
  const reason = String(correction.reason || "").trim();
  if (reason.length < 3) {
    throw new GobdImmutableError("Korrekturgrund (reason) fehlt oder zu kurz.", { id: prev.id });
  }
  const archived = archiveDocumentRevision({
    entityType: "invoice",
    entityId: prev.id,
    job: prev,
    reason,
    actor: correction.actor || opts.actor || "user",
    source: correction.source || opts.source || "user",
    correlationId: correction.correlationId || opts.correlationId || "",
  });
  return { ok: true, archived, materialHash, corrected: true };
}

export function getRevision(revisionId) {
  const row = sqliteGet(`SELECT * FROM document_revisions WHERE revision_id = ?`, [String(revisionId)]);
  if (!row) return null;
  return {
    revisionId: row.revision_id,
    companyId: row.company_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    revisionNo: row.revision_no,
    status: row.status,
    reason: row.reason,
    actor: row.actor,
    source: row.source,
    eventId: row.event_id,
    correlationId: row.correlation_id,
    payloadHash: row.payload_hash,
    payload: unpack(row.payload_json),
    createdAt: row.created_at,
  };
}
