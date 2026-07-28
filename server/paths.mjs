/**
 * Resolve a writable data directory for Railway / local.
 * Prefer WORKPASS_DATA_DIR, then /data, then server/data, then /tmp.
 */
import { mkdirSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const bundledData = path.join(serverRoot, "data");

let cached = null;

function canWrite(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.wp-write-${process.pid}`);
    writeFileSync(probe, "1");
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function resolveDataDir() {
  if (cached) return cached;

  const fromSqlite = process.env.WORKPASS_SQLITE_PATH
    ? path.dirname(process.env.WORKPASS_SQLITE_PATH)
    : null;

  const candidates = [
    process.env.WORKPASS_DATA_DIR,
    fromSqlite,
    "/data",
    bundledData,
    "/tmp/workpass-data",
  ].filter(Boolean);

  const unique = [...new Set(candidates.map((d) => path.resolve(d)))];

  for (const dir of unique) {
    if (canWrite(dir)) {
      cached = dir;
      if (fromSqlite && path.resolve(dir) !== path.resolve(fromSqlite)) {
        console.warn(`[paths] ${fromSqlite} not writable – using ${dir}`);
      }
      return cached;
    }
  }

  throw new Error(
    "Kein beschreibbares Datenverzeichnis. Auf Railway Volume auf /data mounten "
    + "oder WORKPASS_DATA_DIR setzen."
  );
}

export function resolveSqlitePath() {
  if (process.env.WORKPASS_SQLITE_PATH) {
    const p = process.env.WORKPASS_SQLITE_PATH;
    if (canWrite(path.dirname(p))) return p;
  }
  return path.join(resolveDataDir(), "workpass-local.sqlite");
}

export function resolveBackupDir() {
  if (process.env.WORKPASS_BACKUP_DIR && canWrite(process.env.WORKPASS_BACKUP_DIR)) {
    return process.env.WORKPASS_BACKUP_DIR;
  }
  const dir = path.join(resolveDataDir(), "backups");
  canWrite(dir);
  return dir;
}

export function logDataPaths() {
  const dataDir = resolveDataDir();
  console.log(`[paths] dataDir=${dataDir}`);
  console.log(`[paths] sqlite=${resolveSqlitePath()}`);
  console.log(`[paths] backups=${resolveBackupDir()}`);
}
