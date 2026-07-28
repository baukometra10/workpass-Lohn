/**
 * Security unit tests: encryption, compare, posture, rate limit
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.WORKPASS_DATA_KEY = "test-encryption-key-for-unit-tests-only-32b";
process.env.WORKPASS_SQLITE_PATH = path.join(root, "server", "data", `sec-test-${Date.now()}.sqlite`);
delete process.env.WORKPASS_STRICT;
delete process.env.NODE_ENV;

const {
  encryptString,
  decryptString,
  encryptJson,
  decryptJson,
  secureCompare,
  isEncryptedBlob,
  securityPosture,
  resetDataKeyCache,
} = await import("../server/security/crypto.mjs");
const { rateLimit, noteAuthFailure, isAuthLocked, clearRateLimitState } = await import("../server/security/rate-limit.mjs");
const { initDb, saveCompany, loadCompany, closeSqlite } = await import("../server/db/repository.mjs").then(async (repo) => {
  const sqlite = await import("../server/db/sqlite.mjs");
  return { ...repo, closeSqlite: sqlite.closeSqlite };
});
const { sqliteGet } = await import("../server/db/sqlite.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Security: Crypto ===");
resetDataKeyCache();
const enc = encryptString("geheim-lohn-daten");
assert(isEncryptedBlob(enc), "Ciphertext prefix");
assert(enc !== "geheim-lohn-daten", "Not plaintext");
assert(decryptString(enc) === "geheim-lohn-daten", "Decrypt roundtrip");
const obj = encryptJson({ net: 2215.88, iban: "DE00" });
assert(decryptJson(obj)?.iban === "DE00", "JSON encrypt roundtrip");
assert(secureCompare("abc", "abc"), "Secure compare equal");
assert(!secureCompare("abc", "abd"), "Secure compare unequal");
assert(!secureCompare("abc", "ab"), "Secure compare length");

console.log("\n=== Security: At-rest in SQLite ===");
initDb();
saveCompany({ id: "sec-co", name: "Sec Co", taxNumber: "111/222/333" });
const loaded = loadCompany("sec-co");
assert(loaded?.taxNumber === "111/222/333", "App can read decrypted");
const raw = sqliteGet(`SELECT payload_json FROM companies WHERE id = ?`, ["sec-co"]);
assert(isEncryptedBlob(raw.payload_json), "DB stores encrypted blob");
assert(!String(raw.payload_json).includes("111/222/333"), "Tax number not visible in raw DB");

console.log("\n=== Security: Rate limit / lockout ===");
clearRateLimitState();
let denied = false;
for (let i = 0; i < 10; i++) noteAuthFailure("1.2.3.4");
assert(isAuthLocked("1.2.3.4"), "Auth lockout after failures");
const rl = rateLimit({ ip: "9.9.9.9", route: "t", limit: 3, windowMs: 60_000 });
rateLimit({ ip: "9.9.9.9", route: "t", limit: 3, windowMs: 60_000 });
rateLimit({ ip: "9.9.9.9", route: "t", limit: 3, windowMs: 60_000 });
const rl4 = rateLimit({ ip: "9.9.9.9", route: "t", limit: 3, windowMs: 60_000 });
assert(rl.ok && !rl4.ok, "Rate limit trips");

console.log("\n=== Security: Posture ===");
const p = securityPosture();
assert(p.encryption === "aes-256-gcm", "AES-256-GCM");
assert(p.keySource === "env", "Key from env in test");

closeSqlite();
try {
  const db = process.env.WORKPASS_SQLITE_PATH;
  unlinkSync(db);
  if (existsSync(`${db}-wal`)) unlinkSync(`${db}-wal`);
  if (existsSync(`${db}-shm`)) unlinkSync(`${db}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Security Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
