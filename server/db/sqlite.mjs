/**
 * Local SQLite (Node built-in) – always-on source of truth for accounting.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSqlitePath } from "../paths.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const defaultDbPath = path.join(dataDir, "workpass-local.sqlite");

let db = null;
let dbPathUsed = "";

export function getSqlitePath() {
  return resolveSqlitePath();
}

/** True for SQLITE_CORRUPT / “database disk image malformed” style errors. */
export function isSqliteCorruptError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  return (
    m.includes("malformed")
    || m.includes("not a database")
    || m.includes("file is not a database")
    || m.includes("corrupt")
    || m.includes("sqlite_corrupt")
    || m.includes("integrity_check")
  );
}

function integrityOk(database) {
  try {
    const rows = database.prepare("PRAGMA integrity_check").all();
    if (!rows?.length) return false;
    const texts = rows.map((r) => {
      if (r == null) return "";
      if (typeof r === "string") return r;
      if (Array.isArray(r)) return String(r[0] ?? "");
      return String(r.integrity_check ?? Object.values(r)[0] ?? "");
    });
    return texts.length === 1 && texts[0].toLowerCase() === "ok";
  } catch {
    return false;
  }
}

function assertIntegrity(database) {
  if (!integrityOk(database)) {
    throw new Error("database disk image malformed");
  }
}

/** Open a SQLite file briefly and run integrity_check (does not touch the live connection). */
export function sqliteFileIntegrityOk(filePath) {
  if (!filePath || !existsSync(filePath)) return false;
  try {
    if (statSync(filePath).size < 100) return false;
  } catch {
    return false;
  }
  let opened;
  try {
    opened = new DatabaseSync(filePath, { readOnly: true });
    return integrityOk(opened);
  } catch {
    return false;
  } finally {
    try { opened?.close(); } catch { /* ignore */ }
  }
}

export function openSqlite(dbPath = getSqlitePath()) {
  if (db && dbPathUsed === dbPath) return db;
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let opened;
  try {
    opened = new DatabaseSync(dbPath);
    assertIntegrity(opened);
    opened.exec("PRAGMA journal_mode = WAL;");
    opened.exec("PRAGMA foreign_keys = ON;");
    const schema = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
    opened.exec(schema);
    opened.prepare(
      "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run("schema_version", "1");
  } catch (err) {
    try { opened?.close(); } catch { /* ignore */ }
    throw err;
  }
  db = opened;
  dbPathUsed = dbPath;
  return db;
}

export function getSqlite() {
  return openSqlite();
}

export function closeSqlite() {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
    dbPathUsed = "";
  }
}

export function sqliteExec(sql, params = []) {
  const database = getSqlite();
  return database.prepare(sql).run(...params);
}

export function sqliteGet(sql, params = []) {
  const database = getSqlite();
  return database.prepare(sql).get(...params) || null;
}

export function sqliteAll(sql, params = []) {
  const database = getSqlite();
  return database.prepare(sql).all(...params);
}

export { dataDir, defaultDbPath };
