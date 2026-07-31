/**
 * Portal employees / month / archive + demo seed
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

const batch = buildDemoPayrollBatch({ companyId: id, period });
assert(batch.ok && batch.employees.length >= 1, "demo batch");
const ing = await ingestPayrollBatch(batch, { tenantScope: id });
assert(ing.ok, "ingest demo");

const emps = listCompanyEmployees(id, { period });
assert(emps.ok && emps.count >= 1, "employees listed");

const month = monthOverview(id, { period, months: 3 });
assert(month.ok && month.current?.total >= 1, "month overview");

const close = await runMonthClose({
  companyId: id,
  period,
  pull: false,
  autoRelease: true,
  tenantScope: id,
});
assert(close.ok, "month close");

const arch = listReleasedArchive(id, { period });
assert(arch.ok && arch.count >= 1, "archive has released");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
