/**
 * Encrypted backups of the local SQLite database.
 * Format: .wpbak (AES-256-GCM envelope, second layer on top of field encryption)
 *
 * Env:
 *   WORKPASS_BACKUP_DIR       default server/data/backups
 *   WORKPASS_BACKUP_KEY       optional; falls back to WORKPASS_DATA_KEY / local key
 *   WORKPASS_BACKUP_KEEP      max files to retain (default 30)
 *   WORKPASS_BACKUP_INTERVAL_HOURS  if set (e.g. 24), server auto-schedules
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
import { getSqlitePath, getSqlite, closeSqlite } from "../db/sqlite.mjs";
import { getDataKey } from "../security/crypto.mjs";
import { audit } from "../security/audit.mjs";

const MAGIC = "WPBK1";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBackupDir = path.join(rootDir, "data", "backups");

export function getBackupDir() {
  return process.env.WORKPASS_BACKUP_DIR || defaultBackupDir;
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
 * Create an encrypted backup of the live SQLite file.
 */
export function createBackup(opts = {}) {
  const dir = opts.dir || getBackupDir();
  ensureDir(dir);
  checkpointSqlite();

  const sqlitePath = getSqlitePath();
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite nicht gefunden: ${sqlitePath}`);
  }

  const plain = readFileSync(sqlitePath);
  const digest = createHash("sha256").update(plain).digest("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", backupKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const meta = {
    kind: "workpass.backup.v1",
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
    audit({ type: "backup.create", outcome: "ok", detail: { fileName, sha256: digest, bytes: plain.length } });
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
  renameSync(tmp, target);

  // remove wal/shm if present
  for (const suffix of ["-wal", "-shm"]) {
    const p = `${target}${suffix}`;
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }
  }

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
