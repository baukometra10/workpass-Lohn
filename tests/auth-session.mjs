/**
 * Session / platform login tests
 * Run: node tests/auth-session.mjs
 */
process.env.WORKPASS_ADMIN_EMAIL = "admin@example.test";
process.env.WORKPASS_ADMIN_PASSWORD = "super-secret-admin-pass";
process.env.WORKPASS_SESSION_SECRET = "test-session-secret-32chars-min";
process.env.WORKPASS_API_KEY = "test-api-key-not-used-here-xxxx";
// Simulate broken/slow platform auth – local admin must still win immediately
process.env.WORKPASS_PLATFORM_AUTH_URL = "http://127.0.0.1:9/does-not-exist";
process.env.WORKPASS_PLATFORM_AUTH_TIMEOUT_MS = "800";

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
assert(cfg.platformAuthConfigured === true, "platform url may stay configured");
assert(cfg.localAdminFirst === true, "local admin first");

console.log("\n=== Local admin first (even with platform URL) ===");
const t0 = Date.now();
const ok = await loginWithPassword("admin@example.test", "super-secret-admin-pass", req);
const dt = Date.now() - t0;
assert(ok.ok && ok.session, "login ok");
assert(ok.via === "local-admin", "via local-admin (not waiting for platform)");
assert(dt < 1500, `fast login (${dt}ms < 1500ms)`);
assert(ok.user.role === "admin", "role admin");

const verified = verifySessionToken(ok.session);
assert(verified.ok && verified.user.email === "admin@example.test", "session verifies");

console.log("\n=== Wrong password ===");
const bad = await loginWithPassword("admin@example.test", "wrong-password-xx", req);
assert(!bad.ok && bad.status === 401, "reject wrong password");

console.log("\n=== Session forge rejected ===");
const forged = verifySessionToken(`${ok.session}tampered`);
assert(!forged.ok, "forged session rejected");

console.log("\n=== createSession helper ===");
const s = createSession({ email: "a@b.c", name: "A", role: "accountant" });
assert(s.user.role === "accountant", "accountant role");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
