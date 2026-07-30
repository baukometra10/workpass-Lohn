/**
 * Sync outbox: local → external Postgres (best-effort).
 * Local accounting never waits on remote success.
 */
import { sqliteExec, sqliteAll, sqliteGet, getSqlite } from "./sqlite.mjs";
import { pgQuery, postgresConfigured, postgresStatus } from "./postgres.mjs";
import { encryptJson, decryptJson, isEncryptedBlob } from "../security/crypto.mjs";

function now() {
  return new Date().toISOString();
}

function packOutbox(payload) {
  return encryptJson(payload);
}

function unpackOutbox(raw) {
  if (isEncryptedBlob(raw)) return decryptJson(raw, null);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function enqueueSync(entity, entityId, payload, op = "upsert") {
  const json = packOutbox(payload);
  sqliteExec(
    `INSERT INTO sync_outbox(entity, entity_id, op, payload_json, created_at, attempts, last_error)
     VALUES(?, ?, ?, ?, ?, 0, NULL)
     ON CONFLICT(entity, entity_id, op) DO UPDATE SET
       payload_json = excluded.payload_json,
       created_at = excluded.created_at,
       last_error = NULL`,
    [entity, entityId, op, json, now()]
  );
}

export function listOutbox(limit = 50) {
  return sqliteAll(
    `SELECT id, entity, entity_id, op, payload_json, created_at, attempts, last_error
     FROM sync_outbox ORDER BY id ASC LIMIT ?`,
    [limit]
  );
}

function markOutboxError(id, err) {
  sqliteExec(
    `UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [String(err).slice(0, 500), id]
  );
}

function removeOutbox(id) {
  sqliteExec(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
}

async function deleteRemote(entity, entityId) {
  if (entity === "company") {
    await pgQuery(`DELETE FROM payroll_jobs WHERE company_id = $1`, [entityId]);
    await pgQuery(`DELETE FROM invoice_jobs WHERE company_id = $1`, [entityId]);
    await pgQuery(`DELETE FROM deliveries WHERE company_id = $1`, [entityId]);
    await pgQuery(`DELETE FROM companies WHERE id = $1`, [entityId]);
    return;
  }
  if (entity === "payroll") {
    await pgQuery(`DELETE FROM payroll_jobs WHERE job_id = $1`, [entityId]);
    return;
  }
  if (entity === "invoice") {
    await pgQuery(`DELETE FROM invoice_jobs WHERE id = $1`, [entityId]);
    return;
  }
  if (entity === "delivery") {
    await pgQuery(`DELETE FROM deliveries WHERE delivery_id = $1`, [entityId]);
  }
}

async function upsertRemote(entity, payload) {
  const syncedAt = now();
  if (entity === "company") {
    await pgQuery(
      `INSERT INTO companies(id, name, payload_json, created_at, updated_at, synced_at, sync_version)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET
         name = EXCLUDED.name,
         payload_json = EXCLUDED.payload_json,
         updated_at = EXCLUDED.updated_at,
         synced_at = EXCLUDED.synced_at,
         sync_version = EXCLUDED.sync_version`,
      [
        payload.id,
        payload.name || "",
        JSON.stringify(payload),
        payload.createdAt || syncedAt,
        payload.updatedAt || syncedAt,
        syncedAt,
        payload.sync_version || 1,
      ]
    );
    return;
  }
  if (entity === "payroll") {
    await pgQuery(
      `INSERT INTO payroll_jobs(job_id, company_id, employee_id, period, status, payload_json, created_at, updated_at, released_at, synced_at, sync_version)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(job_id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         employee_id = EXCLUDED.employee_id,
         period = EXCLUDED.period,
         status = EXCLUDED.status,
         payload_json = EXCLUDED.payload_json,
         updated_at = EXCLUDED.updated_at,
         released_at = EXCLUDED.released_at,
         synced_at = EXCLUDED.synced_at,
         sync_version = EXCLUDED.sync_version`,
      [
        payload.jobId,
        payload.company?.id || "",
        payload.employee?.id || "",
        payload.period || "",
        payload.status || "",
        JSON.stringify(payload),
        payload.createdAt || syncedAt,
        payload.updatedAt || syncedAt,
        payload.releasedAt || null,
        syncedAt,
        1,
      ]
    );
    return;
  }
  if (entity === "invoice") {
    await pgQuery(
      `INSERT INTO invoice_jobs(id, company_id, number, status, payload_json, created_at, updated_at, released_at, synced_at, sync_version)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         number = EXCLUDED.number,
         status = EXCLUDED.status,
         payload_json = EXCLUDED.payload_json,
         updated_at = EXCLUDED.updated_at,
         released_at = EXCLUDED.released_at,
         synced_at = EXCLUDED.synced_at,
         sync_version = EXCLUDED.sync_version`,
      [
        payload.id,
        payload.company?.id || payload.draft?.company?.id || "",
        payload.draft?.number || "",
        payload.status || "",
        JSON.stringify(payload),
        payload.createdAt || syncedAt,
        payload.updatedAt || syncedAt,
        payload.releasedAt || null,
        syncedAt,
        1,
      ]
    );
    return;
  }
  if (entity === "delivery") {
    await pgQuery(
      `INSERT INTO deliveries(delivery_id, company_id, type, queue_status, payload_json, enqueued_at, acked_at, synced_at, sync_version)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(delivery_id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         type = EXCLUDED.type,
         queue_status = EXCLUDED.queue_status,
         payload_json = EXCLUDED.payload_json,
         acked_at = EXCLUDED.acked_at,
         synced_at = EXCLUDED.synced_at,
         sync_version = EXCLUDED.sync_version`,
      [
        payload.deliveryId,
        payload.company?.id || "",
        payload.type || "",
        payload.queueStatus || "pending",
        JSON.stringify(payload),
        payload.enqueuedAt || syncedAt,
        payload.ackedAt || null,
        syncedAt,
        1,
      ]
    );
  }
}

/**
 * Flush outbox to Postgres. Safe to call periodically.
 * Returns summary; never throws to caller of business APIs.
 */
export async function flushSyncOutbox(limit = 50) {
  if (!postgresConfigured()) {
    return { ok: true, mode: "local-only", flushed: 0, failed: 0, pending: listOutbox(1000).length };
  }

  const rows = listOutbox(limit);
  let flushed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = unpackOutbox(row.payload_json);
      if (!payload) throw new Error("Outbox payload unreadable");
      if (row.op === "delete") {
        await deleteRemote(row.entity, row.entity_id);
      } else {
        await upsertRemote(row.entity, payload);
        // mark local synced_at
        if (row.entity === "company") {
          sqliteExec(`UPDATE companies SET synced_at = ? WHERE id = ?`, [now(), row.entity_id]);
        } else if (row.entity === "payroll") {
          sqliteExec(`UPDATE payroll_jobs SET synced_at = ? WHERE job_id = ?`, [now(), row.entity_id]);
        } else if (row.entity === "invoice") {
          sqliteExec(`UPDATE invoice_jobs SET synced_at = ? WHERE id = ?`, [now(), row.entity_id]);
        } else if (row.entity === "delivery") {
          sqliteExec(`UPDATE deliveries SET synced_at = ? WHERE delivery_id = ?`, [now(), row.entity_id]);
        }
      }
      removeOutbox(row.id);
      flushed += 1;
    } catch (e) {
      markOutboxError(row.id, e.message || e);
      failed += 1;
    }
  }

  return {
    ok: failed === 0,
    mode: "dual",
    flushed,
    failed,
    pending: listOutbox(1000).length,
    postgres: postgresStatus(),
  };
}

export function syncHealth() {
  getSqlite();
  const pending = sqliteGet(`SELECT COUNT(*) AS c FROM sync_outbox`)?.c || 0;
  return {
    local: true,
    postgres: postgresStatus(),
    outboxPending: Number(pending),
  };
}

/** Fire-and-forget flush after local write */
export function scheduleSyncFlush() {
  if (!postgresConfigured()) return;
  setTimeout(() => {
    flushSyncOutbox().catch((e) => console.error("[sync]", e.message));
  }, 50);
}
