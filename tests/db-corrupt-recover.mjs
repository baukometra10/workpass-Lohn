/**
 * Corrupt SQLite → skip bad backup, restore next good one
 */
import path from "path";
import { fileURLToPath } from "url";
import {
  existsSync,
  unlinkSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readdirSync,
  renameSync,
  readFileSync,
} from "fs";

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
const { closeSqlite, openSqlite, isSqliteCorruptError } = await import("../server/db/sqlite.mjs");
const { createBackup, recoverCorruptDatabase, listBackups } = await import("../server/backup/backup.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Corrupt DB auto-restore (skip bad) ===");
initDb();
saveCompany({ id: "c-co", name: "Corrupt Co", taxNumber: "11/22/33" });
assert(loadCompany("c-co")?.name === "Corrupt Co", "Seed company");
const good = createBackup();
assert(good.ok && good.meta?.method === "vacuum_into", "VACUUM backup created");
assert(good.meta?.kind === "workpass.backup.v2", "backup v2 meta");
closeSqlite();

// Craft a "newer" corrupt .wpbak that decrypts to garbage but valid envelope
const badName = `workpass-2099-01-01T00-00-00-000Z.wpbak`;
const badPath = path.join(bakDir, badName);
{
  const { createCipheriv, randomBytes, createHash, scryptSync } = await import("node:crypto");
  const key = scryptSync("corrupt-test-key-material-not-for-prod", "workpass-backup-v1", 32, { N: 16384, r: 8, p: 1 });
  const garbage = Buffer.from("not-a-sqlite-file-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(garbage), cipher.final()]);
  const tag = cipher.getAuthTag();
  const meta = {
    kind: "workpass.backup.v1",
    createdAt: "2099-01-01T00:00:00.000Z",
    sqliteSha256: createHash("sha256").update(garbage).digest("hex"),
    bytes: garbage.length,
  };
  writeFileSync(
    badPath,
    ["WPBK1", JSON.stringify(meta), `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`].join("\n"),
    "utf8"
  );
}

const listed = listBackups();
assert(listed[0]?.fileName === badName, "Bad backup sorts newest-first");

writeFileSync(testDb, Buffer.from("this-is-not-a-valid-sqlite-database!!!!"));
for (const s of ["-wal", "-shm"]) {
  if (existsSync(testDb + s)) unlinkSync(testDb + s);
}

let threw = null;
try {
  openSqlite(testDb);
} catch (e) {
  threw = e;
}
assert(isSqliteCorruptError(threw), `Detected corrupt: ${threw?.message}`);
const recovered = recoverCorruptDatabase(threw);
assert(recovered.ok, `Recovered: ${recovered.message || recovered.reason}`);
assert(recovered.fileName === good.fileName, `Used good backup ${recovered.fileName}`);
assert(recovered.tried?.length >= 1, "Tried bad backup first");
assert(!existsSync(badPath), "Bad backup quarantined");
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
