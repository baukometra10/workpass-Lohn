/**
 * Month-close with local batch (no platform pull).
 * Run: node tests/month-close.mjs
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { runMonthClose } from "../server/month-close.mjs";
import { listPayrollJobs } from "../server/db/repository.mjs";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const id = `mc${Date.now().toString(36)}`;
const period = "2026-07";

console.log("\n=== Activate company ===");
activateCompany({
  company: { id, name: "Month Close Test GmbH", taxNumber: "123/456/78901" },
  login: { email: `${id}@firma.de`, password: "4821" },
  connection: { accountingEnabled: true },
});

const example = JSON.parse(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "examples", "platform-payroll.batch.v1.json"),
    "utf8"
  )
);
example.company = { ...example.company, id, name: "Month Close Test GmbH" };
example.period = period;

console.log("\n=== Month close with body batch + auto release ===");
const result = await runMonthClose({
  companyId: id,
  period,
  pull: false,
  autoRelease: true,
  batch: example,
  tenantScope: id,
});
assert(result.ok, "month close ok");
assert(result.batch?.count === 2, "2 employees calculated");
assert((result.newlyReleased?.length || 0) === 2, "2 released to platform queue");
assert(listPayrollJobs({ companyId: id, period }).every((j) => j.status === "released"), "all released");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
