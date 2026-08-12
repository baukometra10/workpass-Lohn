/**
 * Employee name/address normalization + activate branding.
 */
import {
  resolveEmployeeName,
  normalizeEmployeeRecord,
} from "../server/employee-normalize.mjs";
import { importEmployees, listEmployees, upsertEmployee } from "../server/employee-registry.mjs";
import { activateCompany, deleteCompany, loadCompany } from "../server/company-service.mjs";
import { extractHubProfileFromPayload } from "../server/company-branding.mjs";
import { ingestPayrollBatch } from "../server/payroll-service.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== resolve names ===");
assert(resolveEmployeeName({ name: "Anna Voll" }) === "Anna Voll", "direct name");
assert(resolveEmployeeName({ firstName: "Max", lastName: "Muster" }) === "Max Muster", "first+last");
assert(resolveEmployeeName({ vorname: "Ali", nachname: "Yilmaz" }) === "Ali Yilmaz", "DE keys");
assert(resolveEmployeeName({ employee: { givenName: "Eva", familyName: "Klein" } }) === "Eva Klein", "nested");
assert(resolveEmployeeName({ displayName: "Display X" }) === "Display X", "displayName");

console.log("\n=== import split names + id-only ===");
const cid = `en${Date.now().toString(36)}`;
activateCompany({
  company: { id: cid, name: "Normalize GmbH", taxNumber: "12/345/67890" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

const imp = importEmployees(cid, [
  { badgeId: "B-1", firstName: "Sara", lastName: "Neumann", street: "Weg 1", zip: "10115", city: "Berlin" },
  { badgeId: "B-2", id: "B-2" },
]);
assert(imp.count === 2, "imported 2");
assert(imp.namedCount === 1, "one named");
assert(listEmployees(cid).find((e) => e.badgeId === "B-1")?.name === "Sara Neumann", "split name stored");
assert(imp.needsNameCount >= 1, "id-only flagged needsName");

const up = upsertEmployee({
  companyId: cid,
  badgeId: "B-2",
  name: "Ben Update",
});
assert(up.ok && up.employee?.name === "Ben Update", "name filled later");

console.log("\n=== payroll batch with split names ===");
const batch = await ingestPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period: "2026-08",
  company: { id: cid, name: "Normalize GmbH", taxNumber: "12/345/67890" },
  employees: [{
    employee: {
      id: "B-3",
      badgeId: "B-3",
      firstName: "Lara",
      lastName: "Brandt",
      taxClass: "I",
      healthFund: "TK",
      healthPercent: "14.6",
    },
    attendance: { days: 20, hours: 160 },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
  }],
}, { tenantScope: cid, notifyGaps: false });
assert(batch.count === 1, "batch 1");
assert(batch.results?.[0]?.payslip?.employee?.name === "Lara Brandt", `payslip name (${batch.results?.[0]?.payslip?.employee?.name})`);

console.log("\n=== activate with top-level branding ===");
const bid = `br${Date.now().toString(36)}`;
const hub = extractHubProfileFromPayload({
  branding: {
    logoUrl: "https://example.com/logo.png",
    bank: { name: "Demo Bank", iban: "DE89370400440532013000", bic: "COBADEFFXXX" },
  },
  hubProfile: { payrollHeaderLine: "Firma Header" },
}, { id: bid, name: "Brand GmbH", street: "Allee 2", zip: "80331", city: "München" });
assert(hub?.logoUrl?.includes("example.com"), "logoUrl extracted");
assert(hub?.companyIban?.startsWith("DE89"), "iban from branding.bank");
assert(/Brand GmbH/.test(hub?.seller || ""), "seller from company address");

const act = activateCompany({
  kind: "platform.company.activate.v1",
  company: {
    id: bid,
    name: "Brand GmbH",
    street: "Allee 2",
    zip: "80331",
    city: "München",
    taxNumber: "11/222/33346",
  },
  branding: {
    logoUrl: "https://example.com/logo.png",
    bank: { iban: "DE89370400440532013000" },
  },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});
assert(act.ok && act.hubProfileSynced, "activate hubProfileSynced");
assert(loadCompany(bid)?.meta?.hubProfile?.logoUrl?.includes("example.com"), "logoUrl on company");
assert(loadCompany(bid)?.meta?.section?.id === `ws:${bid}`, "mandant workspace section");
assert(/München/.test(loadCompany(bid)?.meta?.hubProfile?.seller || ""), "seller persisted");

deleteCompany({ id: cid });
deleteCompany({ id: bid });

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
