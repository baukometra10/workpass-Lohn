/**
 * Portal employees / month / archive – real platform employees only.
 * Run: node tests/portal-overview.mjs
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { buildDemoPayrollBatch } from "../server/demo-payroll.mjs";
import { ingestPayrollBatch } from "../server/payroll-service.mjs";
import { listCompanyEmployees, monthOverview, listReleasedArchive } from "../server/portal-service.mjs";
import { runMonthClose } from "../server/month-close.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const id = `pt${Date.now().toString(36)}`;
const period = "2026-07";
activateCompany({
  company: { id, name: "Portal Test GmbH", taxNumber: "111/222/33333" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== Demo batch hidden from portal ===");
const demoBatch = buildDemoPayrollBatch({ companyId: id, period });
assert(demoBatch.ok && demoBatch.employees.length >= 1, "demo batch");
const demoIng = await ingestPayrollBatch(demoBatch, { tenantScope: id, demo: true });
assert(demoIng.ok, "ingest demo");
assert(listCompanyEmployees(id, { period }).count === 0, "demo not in portal list");

console.log("\n=== Real employee visible ===");
const real = await ingestPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period,
  company: { id, name: "Portal Test GmbH", taxNumber: "111/222/33333" },
  employees: [{
    employee: {
      badgeId: "B-501",
      name: "Portal Real MA",
      taxClass: "I",
      healthFund: "TK",
    },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3000 }],
    bank: { name: "Bank", iban: "DE89370400440532013000" },
  }],
}, { tenantScope: id });
assert(real.ok, "ingest real");

const emps = listCompanyEmployees(id, { period });
assert(emps.ok && emps.count === 1, "employees listed");
assert(emps.employees[0].name === "Portal Real MA", "real name only");

const month = monthOverview(id, { period, months: 3 });
assert(month.ok && month.current?.total >= 1, "month overview");

const close = await runMonthClose({
  companyId: id,
  period,
  pull: false,
  autoRelease: true,
  tenantScope: id,
  notify: false,
});
assert(close.ok, "month close");

const arch = listReleasedArchive(id, { period });
assert(arch.ok && arch.count >= 1, "archive has released");
assert(!arch.items.some((i) => /mustermann|beispiel/i.test(i.employee?.name || "")), "archive without demo names");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
