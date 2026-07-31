/**
 * Tenant scope lock for company portal users.
 * Run: node tests/tenant-scope.mjs
 */
import { resolveTenantScope, normalizeCompanyId } from "../server/tenant.mjs";

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

console.log("\n=== Admin / API key: optional scope ===");
assert(resolveTenantScope("", null).tenantScope === "", "empty open");
assert(resolveTenantScope("acme", { role: "admin" }).tenantScope === "acme", "admin keeps requested");
assert(resolveTenantScope("acme", null).tenantScope === "acme", "api key header scope");

console.log("\n=== Company user locked ===");
const firm = { role: "accountant", companyId: "luf" };
const locked = resolveTenantScope("", firm);
assert(locked.ok && locked.tenantScope === "luf" && locked.locked, "force own company");
const same = resolveTenantScope("luf", firm);
assert(same.ok && same.tenantScope === "luf", "same company allowed");
const deny = resolveTenantScope("other-gmbh", firm);
assert(!deny.ok && deny.status === 403, "other company denied");
assert(normalizeCompanyId(" Luf ") === "luf", "normalize");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
