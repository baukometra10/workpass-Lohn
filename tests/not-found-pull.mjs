/**
 * not_found from platform pull → clear German waiting state (no raw not_found).
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { runMonthClose } from "../server/month-close.mjs";
import http from "node:http";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const prevUrl = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
const prevMethod = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;

const server = http.createServer((req, res) => {
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address();
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = `http://127.0.0.1:${port}/export`;
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = "GET";

const id = `nf${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "NF GmbH" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== not_found becomes waiting message ===");
const result = await runMonthClose({
  companyId: id,
  period: "2026-07",
  pull: true,
  autoRelease: true,
  tenantScope: id,
  notify: false,
});
assert(result.waitingForPlatform === true, "waiting for platform");
assert(!result.ok, "not ok without data");
assert(!/^\s*not_found\s*$/i.test(result.error || ""), `error not raw not_found: ${result.error}`);
assert(/plattform|daten|monat/i.test(result.error || result.message || ""), "german guidance");
assert(result.missingOnPlatform === true, "missingOnPlatform flag");

server.close();
deleteCompany({ id });
if (prevUrl == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = prevUrl;
if (prevMethod == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = prevMethod;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
