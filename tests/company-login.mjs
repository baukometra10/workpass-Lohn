/**
 * Company login (name@firma.de + PIN) tests
 * Run: node tests/company-login.mjs
 */
import { activateCompany, verifyCompanyLogin, setCompanyLogin, syncCompanyLogin } from "../server/company-service.mjs";
import { loginWithPassword } from "../server/auth-session.mjs";
import { clearRateLimitState } from "../server/security/rate-limit.mjs";

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

const id = `co${Date.now().toString(36)}`;
const email = `${id}@firma.de`;
const pin = "4821";

console.log("\n=== Activate with firm login ===");
const act = activateCompany({
  kind: "platform.company.activate.v1",
  company: { id, name: "Demo Firma GmbH" },
  login: { email, password: pin },
  connection: { accountingEnabled: true },
});
assert(act.ok, "activate ok");
assert(act.login?.ready === true, "login ready");
assert(act.login?.email === email, "login email");

console.log("\n=== Company verify ===");
const v = verifyCompanyLogin(email, pin);
assert(v.ok && v.user.companyId === id, "verify company login");
assert(v.user.role === "accountant", "role accountant");

const bad = verifyCompanyLogin(email, "0000");
assert(!bad.ok, "reject wrong pin");

console.log("\n=== HTTP login path ===");
const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
const logged = await loginWithPassword(email, pin, req);
assert(logged.ok && logged.via === "company-login", "loginWithPassword company");
assert(logged.user.companyId === id, "session companyId");

console.log("\n=== Update credentials ===");
const upd = setCompanyLogin(id, { email, password: "9999" });
assert(upd.ok, "setCompanyLogin");
assert(verifyCompanyLogin(email, "9999").ok, "new pin works");
assert(!verifyCompanyLogin(email, pin).ok, "old pin rejected");

console.log("\n=== login-sync for existing platform firm ===");
const syncId = `sy${Date.now().toString(36)}`;
const syncMail = `${syncId}@firma.de`;
const syn = syncCompanyLogin({
  companyId: syncId,
  name: "Sync Firma",
  login: { email: syncMail, password: "1234" },
});
assert(syn.ok && syn.login?.ready, "login-sync ok");
assert(verifyCompanyLogin(syncMail, "1234").ok, "login after sync");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
