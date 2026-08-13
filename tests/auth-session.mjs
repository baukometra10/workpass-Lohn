/**
 * Session / platform login tests
 * Run: node tests/auth-session.mjs
 */
import crypto from "node:crypto";
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

console.log("\n=== platform handoff ===");
const { createPlatformHandoff } = await import("../server/auth-session.mjs");
const { activateCompany, deleteCompany } = await import("../server/company-service.mjs");
const handoffId = "cmp-handoff-test-001";
activateCompany({
  kind: "platform.company.activate.v1",
  company: { id: handoffId, name: "Handoff Test GmbH" },
  login: { email: `${handoffId}@firma.de`, password: "4821" },
});
const handoff = createPlatformHandoff({
  companyId: handoffId,
  preferredLocale: "ar",
  user: { email: `${handoffId}@firma.de`, name: "Handoff User" },
}, { publicBase: "https://workpass-lohn.up.railway.app" });
assert(handoff.ok && handoff.openUrl, "handoff returns openUrl");
assert(String(handoff.openUrl).includes("#suppix-sso="), "openUrl has SSO hash");
assert(handoff.user?.companyId === handoffId, "tenant locked");
assert(handoff.user?.role === "accountant", "firm handoff is accountant");
const handoffVerify = verifySessionToken(handoff.session);
assert(handoffVerify.ok, "handoff session verifies with accounting secret");
assert(!createPlatformHandoff({}).ok, "handoff rejects missing companyId");
deleteCompany({ company: { id: handoffId }, event: "company.deleted" });

console.log("\n=== SSO bootstrap remint ===");
const { bootstrapPlatformSso } = await import("../server/auth-session.mjs");
const bootId = "cmp-sso-boot-001";
activateCompany({
  kind: "platform.company.activate.v1",
  company: { id: bootId, name: "SSO Boot GmbH" },
  login: { email: `${bootId}@firma.de`, password: "4821" },
});
const boot = bootstrapPlatformSso({
  companyId: bootId,
  token: "not-a-valid-hmac-token",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  user: { companyId: bootId, email: `${bootId}@firma.de`, name: "Boot" },
  via: "platform-launch",
}, { headers: {}, socket: { remoteAddress: "127.0.0.1" } });
assert(boot.ok && boot.session, "bootstrap remints for active company");
assert(verifySessionToken(boot.session).ok, "reminted session verifies");

console.log("\n=== Multi-secret session verify ===");
function mintWith(secret, user) {
  const now = Date.now();
  const payload = {
    sub: user.id || user.email,
    email: user.email,
    name: user.name,
    role: "accountant",
    companyId: user.companyId,
    locale: "",
    iat: now,
    exp: now + 3600000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
const altTok = mintWith(process.env.WORKPASS_API_KEY, {
  id: "u1",
  email: "a@b.c",
  name: "A",
  companyId: bootId,
});
assert(verifySessionToken(altTok).ok, "token signed with API_KEY still verifies");
deleteCompany({ company: { id: bootId }, event: "company.deleted" });

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
