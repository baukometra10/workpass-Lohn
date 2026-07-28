/**
 * Local SQLite (Node built-in) – always-on source of truth for accounting.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const defaultDbPath = path.join(dataDir, "workpass-local.sqlite");

let db = null;
let dbPathUsed = "";

export function getSqlitePath() {
  return process.env.WORKPASS_SQLITE_PATH || defaultDbPath;
}

export function openSqlite(dbPath = getSqlitePath()) {
  if (db && dbPathUsed === dbPath) return db;
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(dbPath);
  dbPathUsed = dbPath;
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  const schema = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
  // Strip PRAGMA lines already applied; exec full schema safely
  db.exec(schema);
  db.prepare(
    "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run("schema_version", "1");
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
