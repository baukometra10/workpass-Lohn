/**
 * Corrupt SQLite → auto-restore from newest encrypted backup
 */
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, unlinkSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `corrupt-test-${stamp}.sqlite`);
const bakDir = path.join(root, "server", "data", `corrupt-bak-${stamp}`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_BACKUP_DIR = bakDir;
process.env.WORKPASS_DATA_KEY = "corrupt-test-key-material-not-for-prod";
process.env.WORKPASS_BACKUP_KEY = "corrupt-test-key-material-not-for-prod";
process.env.WORKPASS_AUTO_RESTORE_ON_CORRUPT = "1";
delete process.env.WORKPASS_BACKUP_INTERVAL_HOURS;
delete process.env.WORKPASS_RESET_CORRUPT_DB;

mkdirSync(bakDir, { recursive: true });

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany, loadCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { createBackup } = await import("../server/backup/backup.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Corrupt DB auto-restore ===");
initDb();
saveCompany({ id: "c-co", name: "Corrupt Co", taxNumber: "11/22/33" });
assert(loadCompany("c-co")?.name === "Corrupt Co", "Seed company");
const bak = createBackup();
assert(bak.ok, "Backup created");
closeSqlite();

writeFileSync(testDb, Buffer.from("this-is-not-a-valid-sqlite-database!!!!"));
for (const s of ["-wal", "-shm"]) {
  if (existsSync(testDb + s)) unlinkSync(testDb + s);
}

// Reset module ready flag by re-importing path: call recover via fresh open through initDb
// repository `ready` is still true – force reopen by closing and toggling via dynamic re-init pattern
const repo = await import("../server/db/repository.mjs");
// ready stays true; open via recoverCorruptDatabase + openSqlite path used by initDb only when ready=false
// Simulate boot: close + call recover then open through exported helpers
const { recoverCorruptDatabase } = await import("../server/backup/backup.mjs");
const { openSqlite, isSqliteCorruptError } = await import("../server/db/sqlite.mjs");

let threw = null;
try {
  openSqlite(testDb);
} catch (e) {
  threw = e;
}
assert(isSqliteCorruptError(threw), `Detected corrupt: ${threw?.message}`);
const recovered = recoverCorruptDatabase(threw);
assert(recovered.ok, `Recovered: ${recovered.message || recovered.reason}`);
closeSqlite();
openSqlite(testDb);
const again = loadCompany("c-co");
assert(again?.name === "Corrupt Co", `Restored company name=${again?.name}`);

closeSqlite();
try {
  rmSync(bakDir, { recursive: true, force: true });
  for (const f of readdirSync(path.dirname(testDb))) {
    if (f.startsWith(`corrupt-test-${stamp}`)) {
      unlinkSync(path.join(path.dirname(testDb), f));
    }
  }
} catch { /* ignore */ }

console.log(`\n=== Corrupt recover: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
