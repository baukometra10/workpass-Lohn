/**
 * Portal must show only real platform employees – never Mustermann / Beispiel Anna.
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { ingestPayrollBatch } from "../server/payroll-service.mjs";
import { buildDemoPayrollBatch } from "../server/demo-payroll.mjs";
import { listCompanyEmployees } from "../server/portal-service.mjs";
import { purgeDemoPayroll } from "../server/demo-purge.mjs";
import { isDemoPayrollJob } from "../server/demo-detect.mjs";

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

const id = `real${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Real GmbH" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== Demo seed must not appear in portal employees ===");
const batch = buildDemoPayrollBatch({ companyId: id, period: "2026-07" });
assert(batch.demo === true, "batch marked demo");
await ingestPayrollBatch(batch, { tenantScope: id, demo: true, autoRelease: true });

const withDemo = listCompanyEmployees(id, { period: "2026-07", includeDemo: true });
assert(withDemo.count >= 1, "demo jobs exist internally");
assert(withDemo.employees.some((e) => /mustermann|beispiel/i.test(e.name)), "demo names present if includeDemo");

const portal = listCompanyEmployees(id, { period: "2026-07" });
assert(portal.count === 0, `portal hides demo (got ${portal.count})`);
assert(!portal.employees.some((e) => /mustermann|beispiel/i.test(e.name)), "no example names in portal");

console.log("\n=== Real platform employee appears ===");
await ingestPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period: "2026-07",
  company: { id, name: "Real GmbH", taxNumber: "12/345/67890" },
  employees: [{
    employee: {
      badgeId: "B-777",
      name: "Echter Mitarbeiter",
      taxClass: "I",
      healthFund: "TK",
    },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3100 }],
    bank: { name: "Bank", iban: "DE89370400440532013000" },
  }],
}, { tenantScope: id, autoRelease: true });

const afterReal = listCompanyEmployees(id, { period: "2026-07" });
assert(afterReal.count === 1, `one real employee (got ${afterReal.count})`);
assert(afterReal.employees[0].name === "Echter Mitarbeiter", "real name");
assert(afterReal.employees[0].badgeId === "B-777" || afterReal.employees[0].id === "B-777", "badge id");

console.log("\n=== Purge removes leftover demo jobs ===");
const purged = purgeDemoPayroll(id);
assert(purged.ok && purged.purgedJobs >= 1, `purged demo jobs (${purged.purgedJobs})`);
const still = listCompanyEmployees(id, { period: "2026-07", includeDemo: true });
assert(!still.employees.some((e) => /mustermann|beispiel/i.test(e.name)), "demo gone after purge");
assert(still.employees.some((e) => e.name === "Echter Mitarbeiter"), "real employee kept");

assert(isDemoPayrollJob({
  employee: { id: "02006", name: "Mustermann Max" },
  inbound: { note: "Demo-Batch aus WorkPass Lohn (ohne echte Plattform)" },
}), "detect classic seed");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
