/**
 * Session / platform login tests
 * Run: node tests/auth-session.mjs
 */
process.env.WORKPASS_ADMIN_EMAIL = "admin@example.test";
process.env.WORKPASS_ADMIN_PASSWORD = "super-secret-admin-pass";
process.env.WORKPASS_SESSION_SECRET = "test-session-secret-32chars-min";
process.env.WORKPASS_API_KEY = "test-api-key-not-used-here-xxxx";

const {
  authPublicConfig,
  loginWithPassword,
  verifySessionToken,
  createSession,
} = await import("../server/auth-session.mjs");
const { clearRateLimitState } = await import("../server/security/rate-limit.mjs");

clearRateLimitState();

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };

console.log("\n=== Auth config ===");
const cfg = authPublicConfig();
assert(cfg.localAdminFallback === true, "local admin fallback visible");
assert(cfg.platformAuthConfigured === false, "platform auth off by default");

console.log("\n=== Local admin login ===");
const bad = await loginWithPassword("admin@example.test", "wrong-password-xx", req);
assert(!bad.ok && bad.status === 401, "reject wrong password");

const ok = await loginWithPassword("admin@example.test", "super-secret-admin-pass", req);
assert(ok.ok && ok.session, "login ok");
assert(ok.user.role === "admin", "role admin");
assert(ok.via === "local-admin", "via local-admin");

const verified = verifySessionToken(ok.session);
assert(verified.ok && verified.user.email === "admin@example.test", "session verifies");

console.log("\n=== Session forge rejected ===");
const forged = verifySessionToken(`${ok.session}tampered`);
assert(!forged.ok, "forged session rejected");

console.log("\n=== createSession helper ===");
const s = createSession({ email: "a@b.c", name: "A", role: "accountant" });
assert(s.user.role === "accountant", "accountant role");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
