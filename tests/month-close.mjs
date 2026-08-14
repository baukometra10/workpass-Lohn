/**
 * Month-close with local batch (no platform pull).
 * Uses real employee identities (not Mustermann / Beispiel Anna).
 * Run: node tests/month-close.mjs
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { runMonthClose } from "../server/month-close.mjs";
import { listPayrollJobs } from "../server/db/repository.mjs";

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

const batch = {
  kind: "platform.payroll.batch.v1",
  period,
  company: { id, name: "Month Close Test GmbH", taxNumber: "123/456/78901" },
  note: "Echte Testmitarbeiter für Monatsabschluss",
  employees: [
    {
      employee: {
        id: "E-1001",
        badgeId: "E-1001",
        name: "Schmidt Laura",
        taxClass: "I",
        churchTaxRate: "9",
        healthFund: "AOK",
        healthPercent: "14.9",
      },
      attendance: { days: 21, hours: 168 },
      wageItems: [
        { code: "2000", label: "Gehalt", amount: 3500, taxFlag: "L", svFlag: "L" },
      ],
      bank: { name: "Bank", iban: "DE89370400440532013000" },
    },
    {
      employee: {
        id: "E-1002",
        badgeId: "E-1002",
        name: "Weber Tom",
        taxClass: "I",
        churchTaxRate: "0",
        healthFund: "TK",
        healthPercent: "14.6",
      },
      attendance: { days: 20, hours: 160 },
      wageItems: [
        { code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" },
      ],
      bank: { name: "Bank", iban: "DE89370400440532013000" },
    },
  ],
};

console.log("\n=== Month close with body batch + auto release ===");
const result = await runMonthClose({
  companyId: id,
  period,
  pull: false,
  autoRelease: true,
  batch,
  tenantScope: id,
});
assert(result.ok || result.waitingForPlatform || result.message, "month close responds");
assert(result.ok, "month close ok");
assert(result.batch?.count === 2, "2 employees calculated");
assert((result.newlyReleased?.length || 0) === 2, "2 released to platform queue");
assert(listPayrollJobs({ companyId: id, period }).every((j) => j.status === "released"), "all released");

console.log("\n=== Quiet idle without employees/hours (no platform spam) ===");
const idleId = `idle${Date.now().toString(36)}`;
activateCompany({
  company: { id: idleId, name: "Idle GmbH" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});
const wait = await runMonthClose({
  companyId: idleId,
  period: "2026-07",
  pull: false,
  autoRelease: true,
  tenantScope: idleId,
});
assert(!wait.ok && !wait.waitingForPlatform, "not waiting – empty firm stays quiet");
assert(/keine mitarbeiter|keine anfrage/i.test(wait.message || wait.error || ""), `quiet message: ${wait.message || wait.error}`);
deleteCompany({ id: idleId });

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
