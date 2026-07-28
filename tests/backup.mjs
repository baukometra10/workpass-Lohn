/**
 * Encrypted backup create → restore roundtrip
 */
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, unlinkSync, mkdirSync, rmSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `bak-test-${stamp}.sqlite`);
const bakDir = path.join(root, "server", "data", `bak-dir-${stamp}`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_BACKUP_DIR = bakDir;
process.env.WORKPASS_DATA_KEY = "backup-test-key-material-not-for-prod";
process.env.WORKPASS_BACKUP_KEY = "backup-test-key-material-not-for-prod";
delete process.env.WORKPASS_BACKUP_INTERVAL_HOURS;

mkdirSync(bakDir, { recursive: true });

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany, loadCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { createBackup, restoreBackup, listBackups } = await import("../server/backup/backup.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Backup encrypted ===");
initDb();
saveCompany({ id: "bak-co", name: "Backup Co", taxNumber: "99/88/77" });
assert(loadCompany("bak-co")?.name === "Backup Co", "Seed company");

const created = createBackup();
assert(created.ok && created.fileName.endsWith(".wpbak"), `Created ${created.fileName}`);
assert(listBackups().length >= 1, "Listed");
assert(created.meta?.sqliteSha256?.length === 64, "SHA-256 in meta");

// wipe logical data by restoring after changing
saveCompany({ id: "bak-co", name: "CHANGED", taxNumber: "00" });
assert(loadCompany("bak-co")?.name === "CHANGED", "Changed before restore");

const restored = restoreBackup(created.path);
assert(restored.ok, "Restore ok");
// reopen
const { openSqlite } = await import("../server/db/sqlite.mjs");
closeSqlite();
openSqlite(testDb);
const { loadCompany: load2 } = await import("../server/db/repository.mjs");
// repository ready flag may cache – load via fresh sqlite query path
const again = load2("bak-co");
assert(again?.name === "Backup Co", `Restored name=${again?.name}`);
assert(again?.taxNumber === "99/88/77", "Restored tax number");

closeSqlite();
try {
  rmSync(bakDir, { recursive: true, force: true });
  unlinkSync(testDb);
  for (const s of ["-wal", "-shm"]) {
    if (existsSync(testDb + s)) unlinkSync(testDb + s);
  }
  // pre-restore copies
  const dataDir = path.dirname(testDb);
  for (const f of (await import("fs")).readdirSync(dataDir)) {
    if (f.startsWith(`bak-test-${stamp}`) && f.includes("pre-restore")) {
      unlinkSync(path.join(dataDir, f));
    }
  }
} catch { /* ignore */ }

console.log(`\n=== Backup Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
