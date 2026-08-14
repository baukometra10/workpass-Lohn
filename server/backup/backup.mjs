/**
 * Encrypted backups of the local SQLite database.
 * Format: .wpbak (AES-256-GCM envelope, second layer on top of field encryption)
 *
 * Env:
 *   WORKPASS_BACKUP_DIR       default server/data/backups
 *   WORKPASS_BACKUP_KEY       optional; falls back to WORKPASS_DATA_KEY / local key
 *   WORKPASS_BACKUP_KEEP      max files to retain (default 30)
 *   WORKPASS_BACKUP_INTERVAL_HOURS  if set (e.g. 24), server auto-schedules
 *   WORKPASS_AUTO_RESTORE_ON_CORRUPT  default 1 – restore newest .wpbak if SQLite corrupt
 *   WORKPASS_RESET_CORRUPT_DB         default 0 – quarantine + empty DB if no backup
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  copyFileSync,
  statSync,
  renameSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSqlitePath, getSqlite, closeSqlite, sqliteFileIntegrityOk } from "../db/sqlite.mjs";
import { getDataKey } from "../security/crypto.mjs";
import { audit } from "../security/audit.mjs";
import { resolveBackupDir } from "../paths.mjs";

function envFlag(name, defaultOn = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return defaultOn;
  return !/^(0|false|no|off)$/i.test(String(raw).trim());
}

function removeSidecars(target) {
  for (const suffix of ["-wal", "-shm"]) {
    const p = `${target}${suffix}`;
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

function sqlPathLiteral(filePath) {
  return `'${String(filePath).replace(/'/g, "''")}'`;
}

/**
 * Quarantine a corrupt SQLite file (+ WAL/SHM) so a restore or fresh open can proceed.
 */
export function quarantineCorruptSqlite(target = getSqlitePath()) {
  closeSqlite();
  removeSidecars(target);
  if (!existsSync(target)) {
    return { ok: true, quarantined: null, target };
  }
  const quarantine = `${target}.corrupt-${Date.now()}`;
  renameSync(target, quarantine);
  return { ok: true, quarantined: quarantine, target };
}

/** Move a bad .wpbak aside so crash-loops do not keep reusing it. */
function quarantineBadBackup(backupPath) {
  try {
    if (!existsSync(backupPath)) return null;
    const dest = `${backupPath}.bad-${Date.now()}`;
    renameSync(backupPath, dest);
    console.error(`[sqlite] Backup quarantined → ${path.basename(dest)}`);
    return dest;
  } catch (e) {
    console.error(`[sqlite] Backup quarantine failed: ${e.message}`);
    return null;
  }
}

/**
 * If the live DB is corrupt, try encrypted backups newest-first until one passes integrity_check.
 * Default ON (disable with WORKPASS_AUTO_RESTORE_ON_CORRUPT=0).
 */
export function recoverCorruptDatabase(err) {
  const detail = String(err?.message || err || "database disk image malformed");
  if (!envFlag("WORKPASS_AUTO_RESTORE_ON_CORRUPT", true)) {
    return {
      ok: false,
      reason: "auto_restore_disabled",
      message: `SQLite korrupt (${detail}). Auto-Restore aus (WORKPASS_AUTO_RESTORE_ON_CORRUPT=0).`,
    };
  }

  const backups = listBackups();
  if (!backups.length) {
    return {
      ok: false,
      reason: "no_backups",
      message:
        `SQLite korrupt (${detail}). Keine .wpbak unter ${getBackupDir()}. `
        + "Volume/Backup prüfen oder WORKPASS_RESET_CORRUPT_DB=1 setzen (leere DB).",
    };
  }

  const q = quarantineCorruptSqlite();
  const tried = [];

  for (const bak of backups) {
    console.error(`[sqlite] CORRUPT – versuche Restore ${bak.fileName}`);
    try {
      const restored = restoreBackup(bak.path, { skipSafetyCopy: true, verifyIntegrity: true });
      try {
        audit({
          type: "backup.auto_restore",
          outcome: "ok",
          detail: { fileName: bak.fileName, quarantined: q.quarantined, error: detail, tried },
        });
      } catch { /* ignore */ }

      return {
        ok: true,
        fileName: bak.fileName,
        quarantined: q.quarantined,
        restored,
        tried,
        message: `SQLite aus Backup ${bak.fileName} wiederhergestellt`,
      };
    } catch (e) {
      const why = e?.message || String(e);
      console.error(`[sqlite] Backup unbrauchbar ${bak.fileName}: ${why}`);
      tried.push({ fileName: bak.fileName, error: why });
      quarantineBadBackup(bak.path);
      // Drop any partial restore before next attempt
      const target = getSqlitePath();
      removeSidecars(target);
      if (existsSync(target)) {
        try { unlinkSync(target); } catch { /* ignore */ }
      }
    }
  }

  return {
    ok: false,
    reason: "all_backups_corrupt",
    tried,
    quarantined: q.quarantined,
    message:
      `SQLite korrupt (${detail}). Alle ${backups.length} Backups unbrauchbar. `
      + "WORKPASS_RESET_CORRUPT_DB=1 setzen (leere DB) oder gültiges .wpbak einspielen.",
  };
}

/**
 * Last resort: quarantine corrupt file and let openSqlite create an empty DB.
 * Only when WORKPASS_RESET_CORRUPT_DB=1.
 */
export function resetCorruptDatabase(err) {
  if (!envFlag("WORKPASS_RESET_CORRUPT_DB", false)) {
    return { ok: false, reason: "reset_disabled" };
  }
  const detail = String(err?.message || err || "malformed");
  const q = quarantineCorruptSqlite();
  console.error(`[sqlite] CORRUPT – leere DB nach Quarantäne (${q.quarantined || "n/a"}): ${detail}`);
  try {
    audit({
      type: "backup.reset_corrupt",
      outcome: "ok",
      detail: { quarantined: q.quarantined, error: detail },
    });
  } catch { /* ignore */ }
  return { ok: true, quarantined: q.quarantined };
}

const MAGIC = "WPBK1";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBackupDir = path.join(rootDir, "data", "backups");

export function getBackupDir() {
  try {
    return resolveBackupDir();
  } catch {
    return process.env.WORKPASS_BACKUP_DIR || defaultBackupDir;
  }
}

function backupKey() {
  const material = process.env.WORKPASS_BACKUP_KEY || process.env.WORKPASS_DATA_KEY || "";
  if (material.trim()) {
    return scryptSync(material.trim(), "workpass-backup-v1", 32, { N: 16384, r: 8, p: 1 });
  }
  // Same derived data key family
  return getDataKey();
}

function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

function checkpointSqlite() {
  try {
    const db = getSqlite();
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    /* ignore if DB not open */
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function pruneBackups(dir, keep = Number(process.env.WORKPASS_BACKUP_KEEP || 30)) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".wpbak"))
    .map((f) => ({ f, t: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const extra of files.slice(Math.max(0, keep))) {
    try {
      unlinkSync(path.join(dir, extra.f));
    } catch { /* ignore */ }
  }
}

/**
 * Create an encrypted backup via VACUUM INTO (consistent snapshot), then integrity_check.
 * Never hot-copy the live WAL main file – that produced unusable .wpbak on Railway.
 */
export function createBackup(opts = {}) {
  const dir = opts.dir || getBackupDir();
  ensureDir(dir);
  checkpointSqlite();

  const sqlitePath = getSqlitePath();
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite nicht gefunden: ${sqlitePath}`);
  }

  const snapPath = path.join(dir, `workpass-snap-${Date.now()}-${process.pid}.sqlite`);
  let plain;
  try {
    const database = getSqlite();
    database.exec(`VACUUM INTO ${sqlPathLiteral(snapPath)}`);
    if (!sqliteFileIntegrityOk(snapPath)) {
      throw new Error("VACUUM-Snapshot failed integrity_check – Backup abgebrochen");
    }
    plain = readFileSync(snapPath);
  } finally {
    try { if (existsSync(snapPath)) unlinkSync(snapPath); } catch { /* ignore */ }
  }

  const digest = createHash("sha256").update(plain).digest("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", backupKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const meta = {
    kind: "workpass.backup.v2",
    method: "vacuum_into",
    createdAt: new Date().toISOString(),
    sqliteSha256: digest,
    bytes: plain.length,
    host: process.env.RAILWAY_PUBLIC_DOMAIN || process.env.WORKPASS_API_HOST || "local",
  };

  const stamp = meta.createdAt.replace(/[:.]/g, "-");
  const fileName = opts.fileName || `workpass-${stamp}.wpbak`;
  const outPath = path.join(dir, fileName);

  const body = [
    MAGIC,
    JSON.stringify(meta),
    `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`,
  ].join("\n");

  writeFileSync(outPath, body, "utf8");
  pruneBackups(dir);

  const result = {
    ok: true,
    path: outPath,
    fileName,
    meta,
    size: Buffer.byteLength(body, "utf8"),
  };

  try {
    audit({ type: "backup.create", outcome: "ok", detail: { fileName, sha256: digest, bytes: plain.length, method: "vacuum_into" } });
  } catch { /* ignore */ }

  return result;
}

/**
 * List available backups (newest first).
 */
export function listBackups(dir = getBackupDir()) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".wpbak"))
    .map((f) => {
      const full = path.join(dir, f);
      const st = statSync(full);
      let meta = null;
      try {
        const lines = readFileSync(full, "utf8").split("\n");
        meta = JSON.parse(lines[1] || "{}");
      } catch { /* ignore */ }
      return { fileName: f, path: full, size: st.size, mtime: st.mtime.toISOString(), meta };
    })
    .sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
}

/**
 * Restore encrypted backup into SQLite path.
 * WARNING: overwrites current DB – creates .pre-restore copy first.
 */
export function restoreBackup(backupPath, opts = {}) {
  const full = path.resolve(backupPath);
  if (!existsSync(full)) throw new Error(`Backup nicht gefunden: ${full}`);

  const lines = readFileSync(full, "utf8").split("\n");
  if (lines[0] !== MAGIC) throw new Error("Ungültiges Backup-Format (MAGIC)");
  const meta = JSON.parse(lines[1] || "{}");
  const [ivB64, tagB64, dataB64] = (lines[2] || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Backup Ciphertext fehlt");

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", backupKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  const digest = createHash("sha256").update(plain).digest("hex");
  if (meta.sqliteSha256 && meta.sqliteSha256 !== digest) {
    throw new Error("Integrität fehlgeschlagen – SHA-256 stimmt nicht");
  }

  const target = opts.targetPath || getSqlitePath();
  const targetDir = path.dirname(target);
  ensureDir(targetDir);

  if (existsSync(target) && !opts.skipSafetyCopy) {
    const safety = `${target}.pre-restore-${Date.now()}`;
    closeSqlite();
    copyFileSync(target, safety);
  } else {
    closeSqlite();
  }

  const tmp = `${target}.restore-tmp`;
  writeFileSync(tmp, plain);
  removeSidecars(target);

  const verify = opts.verifyIntegrity !== false;
  if (verify && !sqliteFileIntegrityOk(tmp)) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw new Error("Backup SQLite integrity_check fehlgeschlagen (Datei unbrauchbar)");
  }

  renameSync(tmp, target);
  removeSidecars(target);

  try {
    audit({ type: "backup.restore", outcome: "ok", detail: { file: full, sha256: digest } });
  } catch { /* ignore */ }

  return { ok: true, target, meta, sha256: digest };
}

let timer = null;

export function startBackupScheduler() {
  const hours = Number(process.env.WORKPASS_BACKUP_INTERVAL_HOURS || 0);
  if (!hours || hours <= 0) {
    return { ok: false, message: "Scheduler aus (WORKPASS_BACKUP_INTERVAL_HOURS nicht gesetzt)" };
  }
  if (timer) clearInterval(timer);
  const ms = hours * 60 * 60 * 1000;

  const run = () => {
    try {
      const r = createBackup();
      console.log(`[backup] OK ${r.fileName} (${r.meta.bytes} bytes)`);
    } catch (e) {
      console.error(`[backup] FEHLER: ${e.message}`);
      try { audit({ type: "backup.create", outcome: "error", detail: { error: e.message } }); } catch { /* */ }
    }
  };

  // first backup shortly after boot
  setTimeout(run, 15_000);
  timer = setInterval(run, ms);
  return { ok: true, intervalHours: hours };
}

export function stopBackupScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
