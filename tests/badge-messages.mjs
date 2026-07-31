/**
 * Badge import + bundled gap message once + platform seen confirmation.
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { ingestPayroll } from "../server/payroll-service.mjs";
import { importEmployees, listEmployees } from "../server/employee-registry.mjs";
import {
  listPendingMessagesForPlatform,
  ackMessage,
  listSeenConfirmations,
} from "../server/platform-messages.mjs";
import { getPayrollCore } from "../server/engine.mjs";

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

const id = `badge${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Badge Test GmbH" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== Employee import name + badge ===");
const imp = importEmployees(id, [
  { name: "Max Test", badgeId: "B-9" },
  { name: "Anna Test", badgeId: "B-8", personnelNumber: "88" },
]);
assert(imp.ok && imp.count === 2, "imported 2");
const listed = listEmployees(id);
assert(listed.some((e) => e.badgeId === "b-9" || e.badgeId === "B-9" || e.name === "Max Test"), "list has Max");

console.log("\n=== Badge hidden on payslip sheet ===");
const PC = getPayrollCore();
const sheet = PC.buildSheetData({
  employeeName: "Max Test",
  employeeId: "B-9",
  badgeId: "B-9",
  personnelNumber: "",
  hideBadgeOnPayslip: true,
  taxClass: "I",
  payrollMonth: "2026-07",
  wageItems: [{ code: "2000", label: "Gehalt", amount: 3000 }],
}, PC.calculate({
  employeeName: "Max Test",
  employeeId: "B-9",
  badgeId: "B-9",
  hideBadgeOnPayslip: true,
  taxClass: "I",
  payrollMonth: "2026-07",
  grossSalary: 3000,
  employmentType: "regular",
}));
assert(!sheet.persNr || sheet.persNr === "", `persNr empty on slip, got "${sheet.persNr}"`);
assert(!String(sheet.empMeta || "").includes("B-9"), "badge not in empMeta");

console.log("\n=== One bundled message + notify once ===");
const r1 = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-07",
  company: { id, name: "Badge Test GmbH" },
  employee: { badgeId: "B-9", name: "Max Test", taxClass: "I" },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 3000 }],
}, { tenantScope: id });
assert(r1.ok, "ingest 1");
assert((r1.platformMessages?.messages || []).length === 1, "exactly one message");
assert((r1.platformMessages?.created || 0) === 1, "created once");

const r2 = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-07",
  company: { id, name: "Badge Test GmbH" },
  employee: { badgeId: "B-9", name: "Max Test", taxClass: "I" },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 3000 }],
}, { tenantScope: id });
assert((r2.platformMessages?.created || 0) === 0, "second ingest does not create again");
const pending = listPendingMessagesForPlatform({ companyId: id });
const forEmp = pending.filter((m) => (m.employee?.id || "").includes("b-9") || (m.employee?.badgeId || "").includes("B-9") || m.employee?.name === "Max Test");
assert(forEmp.length === 1, `still one open bundle (${forEmp.length})`);
assert((forEmp[0].gaps || []).length >= 1, "bundled gaps");

console.log("\n=== Platform seen → accounting confirmation ===");
const acked = ackMessage(forEmp[0].messageId, { readBy: "platform-user" });
assert(acked.ok && acked.confirmation?.seen, "confirmation returned");
assert(acked.confirmation?.label?.includes("gesehen"), "label gesehen");
const seen = listSeenConfirmations({ companyId: id });
assert(seen.some((s) => s.messageId === forEmp[0].messageId), "seen list has confirmation");
assert(listPendingMessagesForPlatform({ companyId: id }).length === 0, "gone from pending");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
