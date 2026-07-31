/**
 * Local-first repository. All reads/writes hit SQLite first.
 * Optional Postgres sync via outbox (never blocks accounting).
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sqliteExec, sqliteGet, sqliteAll, getSqlite, openSqlite } from "./sqlite.mjs";
import { enqueueSync, scheduleSyncFlush, syncHealth, flushSyncOutbox } from "./sync.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { encryptJson, decryptJson, isEncryptedBlob } from "../security/crypto.mjs";

const dataRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
let ready = false;

function now() {
  return new Date().toISOString();
}

function packPayload(obj) {
  return encryptJson(obj);
}

function unpackPayload(raw, fallback = null) {
  if (raw == null) return fallback;
  if (isEncryptedBlob(raw)) return decryptJson(raw, fallback);
  // Legacy plaintext JSON (pre-encryption) – still readable
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function initDb() {
  if (ready) return syncHealth();
  openSqlite();
  migrateJsonIfNeeded();
  ready = true;
  return syncHealth();
}

function migrateJsonIfNeeded() {
  getSqlite();
  const flag = sqliteGet(`SELECT value FROM meta WHERE key = ?`, ["json_migrated"]);
  if (flag?.value === "1") return;

  const companiesDir = path.join(dataRoot, "companies");
  const payrollDir = path.join(dataRoot, "payroll");
  const invoiceDir = path.join(dataRoot, "invoices");
  const queueFile = path.join(dataRoot, "delivery-queue.json");

  if (existsSync(companiesDir)) {
    for (const f of readdirSync(companiesDir).filter((x) => x.endsWith(".json"))) {
      try {
        const c = JSON.parse(readFileSync(path.join(companiesDir, f), "utf8"));
        if (c?.id) saveCompany(c, { skipSync: true, skipInit: true });
      } catch { /* skip */ }
    }
  }
  if (existsSync(payrollDir)) {
    for (const f of readdirSync(payrollDir).filter((x) => x.endsWith(".json"))) {
      try {
        const j = JSON.parse(readFileSync(path.join(payrollDir, f), "utf8"));
        if (j?.jobId) savePayrollJob(j, { skipSync: true, skipInit: true });
      } catch { /* skip */ }
    }
  }
  if (existsSync(invoiceDir)) {
    for (const f of readdirSync(invoiceDir).filter((x) => x.endsWith(".json"))) {
      try {
        const j = JSON.parse(readFileSync(path.join(invoiceDir, f), "utf8"));
        if (j?.id) saveInvoiceJob(j, { skipSync: true, skipInit: true });
      } catch { /* skip */ }
    }
  }
  if (existsSync(queueFile)) {
    try {
      const list = JSON.parse(readFileSync(queueFile, "utf8"));
      if (Array.isArray(list)) {
        for (const d of list) {
          if (d?.deliveryId) enqueueDeliveryRow(d, { skipSync: true, skipInit: true });
        }
      }
    } catch { /* skip */ }
  }

  sqliteExec(
    `INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ["json_migrated", "1"]
  );
}

function ensure(opts = {}) {
  if (!opts.skipInit) initDb();
  else openSqlite();
}

// --- Companies ---

export function saveCompany(company, opts = {}) {
  ensure(opts);
  const id = normalizeCompanyId(company.id);
  if (!id) throw new Error("company.id fehlt");
  const ts = now();
  const createdAt = company.createdAt || ts;
  const updatedAt = company.updatedAt || ts;
  const row = { ...company, id, createdAt, updatedAt };
  sqliteExec(
    `INSERT INTO companies(id, name, payload_json, created_at, updated_at, sync_version)
     VALUES(?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at,
       sync_version = companies.sync_version + 1`,
    [id, row.name || "", packPayload(row), createdAt, updatedAt]
  );
  if (!opts.skipSync) {
    enqueueSync("company", id, row);
    scheduleSyncFlush();
  }
  return row;
}

export function loadCompany(id) {
  initDb();
  const cid = normalizeCompanyId(id);
  if (!cid) return null;
  const row = sqliteGet(`SELECT payload_json FROM companies WHERE id = ?`, [cid]);
  return row ? unpackPayload(row.payload_json) : null;
}

export function listCompanies(filter = {}) {
  initDb();
  let rows;
  if (filter.companyId) {
    const want = normalizeCompanyId(filter.companyId);
    rows = sqliteAll(`SELECT payload_json FROM companies WHERE id = ?`, [want]);
  } else {
    rows = sqliteAll(`SELECT payload_json FROM companies ORDER BY name COLLATE NOCASE ASC`);
  }
  return rows.map((r) => unpackPayload(r.payload_json)).filter(Boolean);
}

/**
 * Hard-delete company + all local payroll/invoice/delivery rows for that tenant.
 * Platform company delete must call this (soft deactivate alone leaves the firm visible).
 */
export function deleteCompany(companyId, opts = {}) {
  ensure(opts);
  const id = normalizeCompanyId(companyId);
  if (!id) throw new Error("company.id fehlt");
  const existing = loadCompany(id);
  if (!existing) {
    return {
      ok: true,
      deleted: false,
      alreadyGone: true,
      companyId: id,
      purged: { payrollJobs: 0, invoiceJobs: 0, deliveries: 0 },
    };
  }

  const payroll = sqliteGet(
    `SELECT COUNT(*) AS c FROM payroll_jobs WHERE company_id = ?`,
    [id]
  );
  const invoices = sqliteGet(
    `SELECT COUNT(*) AS c FROM invoice_jobs WHERE company_id = ?`,
    [id]
  );
  const deliveries = sqliteGet(
    `SELECT COUNT(*) AS c FROM deliveries WHERE company_id = ?`,
    [id]
  );

  sqliteExec(`DELETE FROM payroll_jobs WHERE company_id = ?`, [id]);
  sqliteExec(`DELETE FROM invoice_jobs WHERE company_id = ?`, [id]);
  sqliteExec(`DELETE FROM deliveries WHERE company_id = ?`, [id]);
  sqliteExec(`DELETE FROM companies WHERE id = ?`, [id]);
  // Drop stale company upserts; keep a single delete op for remote Postgres
  sqliteExec(
    `DELETE FROM sync_outbox WHERE entity = 'company' AND entity_id = ? AND op = 'upsert'`,
    [id]
  );

  if (!opts.skipSync) {
    enqueueSync("company", id, {
      id,
      deleted: true,
      deletedAt: now(),
      name: existing?.name || id,
    }, "delete");
    scheduleSyncFlush();
  }

  return {
    ok: true,
    deleted: true,
    companyId: id,
    name: existing?.name || id,
    purged: {
      payrollJobs: Number(payroll?.c || 0),
      invoiceJobs: Number(invoices?.c || 0),
      deliveries: Number(deliveries?.c || 0),
    },
  };
}

// --- Payroll ---

export function savePayrollJob(job, opts = {}) {
  ensure(opts);
  if (!job?.jobId) throw new Error("jobId fehlt");
  const companyId = normalizeCompanyId(job.company?.id || job.state?.mandantId || "");
  if (!companyId) throw new Error("payroll company.id fehlt");
  if (!sqliteGet(`SELECT id FROM companies WHERE id = ?`, [companyId])) {
    saveCompany({
      id: companyId,
      name: job.company?.name || companyId,
      kind: "platform.company.v1",
      createdAt: job.createdAt || now(),
      updatedAt: now(),
    }, { skipSync: opts.skipSync, skipInit: true });
  }
  const ts = now();
  sqliteExec(
    `INSERT INTO payroll_jobs(job_id, company_id, employee_id, period, status, payload_json, created_at, updated_at, released_at, sync_version)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(job_id) DO UPDATE SET
       company_id = excluded.company_id,
       employee_id = excluded.employee_id,
       period = excluded.period,
       status = excluded.status,
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at,
       released_at = excluded.released_at,
       sync_version = payroll_jobs.sync_version + 1`,
    [
      job.jobId,
      companyId,
      job.employee?.id || "",
      job.period || "",
      job.status || "calculated",
      packPayload(job),
      job.createdAt || ts,
      job.updatedAt || ts,
      job.releasedAt || null,
    ]
  );
  if (!opts.skipSync) {
    enqueueSync("payroll", job.jobId, job);
    scheduleSyncFlush();
  }
  return job;
}

export function loadPayrollJob(jobId) {
  initDb();
  const row = sqliteGet(`SELECT payload_json FROM payroll_jobs WHERE job_id = ?`, [String(jobId)]);
  return row ? unpackPayload(row.payload_json) : null;
}

export function listPayrollJobs(filter = {}) {
  initDb();
  let sql = `SELECT payload_json FROM payroll_jobs WHERE 1=1`;
  const params = [];
  if (filter.status) {
    sql += ` AND status = ?`;
    params.push(filter.status);
  }
  if (filter.period) {
    sql += ` AND period = ?`;
    params.push(filter.period);
  }
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  sql += ` ORDER BY updated_at DESC`;
  return sqliteAll(sql, params).map((r) => unpackPayload(r.payload_json)).filter(Boolean);
}

export function deletePayrollJob(jobId, opts = {}) {
  ensure(opts);
  const id = String(jobId || "");
  if (!id) return { ok: false, error: "jobId fehlt" };
  sqliteExec(`DELETE FROM payroll_jobs WHERE job_id = ?`, [id]);
  return { ok: true, deleted: true, jobId: id };
}

// --- Invoices ---

export function saveInvoiceJob(job, opts = {}) {
  ensure(opts);
  if (!job?.id) throw new Error("invoice id fehlt");
  const companyId = normalizeCompanyId(job.company?.id || job.draft?.company?.id || "");
  if (!companyId) throw new Error("invoice company.id fehlt");
  if (!sqliteGet(`SELECT id FROM companies WHERE id = ?`, [companyId])) {
    saveCompany({
      id: companyId,
      name: job.company?.name || companyId,
      kind: "platform.company.v1",
      createdAt: job.createdAt || now(),
      updatedAt: now(),
    }, { skipSync: opts.skipSync, skipInit: true });
  }
  const ts = now();
  sqliteExec(
    `INSERT INTO invoice_jobs(id, company_id, number, status, payload_json, created_at, updated_at, released_at, sync_version)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       company_id = excluded.company_id,
       number = excluded.number,
       status = excluded.status,
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at,
       released_at = excluded.released_at,
       sync_version = invoice_jobs.sync_version + 1`,
    [
      job.id,
      companyId,
      job.draft?.number || "",
      job.status || "received",
      packPayload(job),
      job.createdAt || ts,
      job.updatedAt || ts,
      job.releasedAt || null,
    ]
  );
  if (!opts.skipSync) {
    enqueueSync("invoice", job.id, job);
    scheduleSyncFlush();
  }
  return job;
}

export function loadInvoiceJob(id) {
  initDb();
  const row = sqliteGet(`SELECT payload_json FROM invoice_jobs WHERE id = ?`, [String(id)]);
  return row ? unpackPayload(row.payload_json) : null;
}

export function listInvoiceJobs(filter = {}) {
  initDb();
  let sql = `SELECT payload_json FROM invoice_jobs WHERE 1=1`;
  const params = [];
  if (filter.status) {
    sql += ` AND status = ?`;
    params.push(filter.status);
  }
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  sql += ` ORDER BY updated_at DESC`;
  return sqliteAll(sql, params).map((r) => unpackPayload(r.payload_json)).filter(Boolean);
}

// --- Deliveries ---

export function enqueueDeliveryRow(delivery, opts = {}) {
  ensure(opts);
  if (!delivery?.deliveryId) throw new Error("deliveryId fehlt");
  const companyId = normalizeCompanyId(delivery.company?.id || "");
  const row = {
    ...delivery,
    queueStatus: delivery.queueStatus || "pending",
    enqueuedAt: delivery.enqueuedAt || now(),
    ackedAt: delivery.ackedAt || null,
  };
  sqliteExec(
    `INSERT INTO deliveries(delivery_id, company_id, type, queue_status, payload_json, enqueued_at, acked_at, sync_version)
     VALUES(?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(delivery_id) DO UPDATE SET
       company_id = excluded.company_id,
       type = excluded.type,
       queue_status = excluded.queue_status,
       payload_json = excluded.payload_json,
       enqueued_at = excluded.enqueued_at,
       acked_at = excluded.acked_at,
       sync_version = deliveries.sync_version + 1`,
    [
      row.deliveryId,
      companyId,
      row.type || "",
      row.queueStatus,
      packPayload(row),
      row.enqueuedAt,
      row.ackedAt,
    ]
  );
  if (!opts.skipSync) {
    enqueueSync("delivery", row.deliveryId, row);
    scheduleSyncFlush();
  }
  return row;
}

export function listPendingDeliveries(filter = {}) {
  initDb();
  let sql = `SELECT payload_json FROM deliveries WHERE queue_status = 'pending'`;
  const params = [];
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  sql += ` ORDER BY enqueued_at DESC`;
  return sqliteAll(sql, params).map((r) => unpackPayload(r.payload_json)).filter(Boolean);
}

export function listAllDeliveries() {
  initDb();
  return sqliteAll(`SELECT payload_json FROM deliveries ORDER BY enqueued_at DESC`)
    .map((r) => unpackPayload(r.payload_json))
    .filter(Boolean);
}

export function ackDeliveryRow(deliveryId, meta = {}) {
  initDb();
  const existing = sqliteGet(`SELECT payload_json FROM deliveries WHERE delivery_id = ?`, [deliveryId]);
  if (!existing) return { ok: false, error: "Delivery nicht gefunden" };
  const delivery = unpackPayload(existing.payload_json);
  delivery.queueStatus = "delivered";
  delivery.ackedAt = now();
  delivery.ackMeta = meta;
  sqliteExec(
    `UPDATE deliveries SET queue_status = ?, acked_at = ?, payload_json = ?, sync_version = sync_version + 1 WHERE delivery_id = ?`,
    ["delivered", delivery.ackedAt, packPayload(delivery), deliveryId]
  );
  enqueueSync("delivery", deliveryId, delivery);
  scheduleSyncFlush();
  return { ok: true, delivery };
}

export { syncHealth, flushSyncOutbox };
