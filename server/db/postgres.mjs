/**
 * Optional external PostgreSQL.
 * Never blocks local writes – sync is best-effort via outbox.
 *
 * Env: WORKPASS_DATABASE_URL=postgres://...
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

let pool = null;
let pgModule = null;
let initPromise = null;
let lastError = null;

export function postgresConfigured() {
  return Boolean(process.env.WORKPASS_DATABASE_URL || process.env.DATABASE_URL);
}

export function postgresStatus() {
  return {
    configured: postgresConfigured(),
    connected: Boolean(pool),
    lastError,
  };
}

async function loadPg() {
  if (pgModule) return pgModule;
  try {
    pgModule = await import("pg");
    return pgModule;
  } catch (e) {
    lastError = `pg package missing: ${e.message}. Run: npm install pg`;
    throw new Error(lastError);
  }
}

export async function getPostgresPool() {
  if (!postgresConfigured()) return null;
  if (pool) return pool;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { default: pg } = await loadPg();
    const { Pool } = pg;
    const url = process.env.WORKPASS_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20_000 });
    pool.on("error", (err) => {
      lastError = err.message;
      console.error("[postgres] pool error:", err.message);
    });
    try {
      await ensurePostgresSchema(pool);
      lastError = null;
    } catch (e) {
      lastError = e.message;
      console.error("[postgres] schema init failed:", e.message);
      // Keep pool – retries may succeed later
    }
    return pool;
  })();

  try {
    return await initPromise;
  } catch (e) {
    initPromise = null;
    pool = null;
    lastError = e.message;
    return null;
  }
}

async function ensurePostgresSchema(p) {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.postgres.sql");
  if (!existsSync(schemaPath)) return;
  const sql = readFileSync(schemaPath, "utf8");
  await p.query(sql);
}

export async function pgQuery(text, params = []) {
  const p = await getPostgresPool();
  if (!p) return null;
  try {
    const res = await p.query(text, params);
    lastError = null;
    return res;
  } catch (e) {
    lastError = e.message;
    throw e;
  }
}

export async function closePostgres() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
  initPromise = null;
}
