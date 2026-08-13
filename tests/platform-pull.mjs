/**
 * Platform pull helpers: contract flatten + employee collect.
 */
import {
  collectEmployeesFromPayload,
  pickEmployeeRow,
  extractInlineReply,
} from "../server/platform-pull.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== collect from contract ===");
const fromContract = collectEmployeesFromPayload({
  contract: {
    employeeId: "BP-FA-Z2CIE",
    firstName: "Feras",
    lastName: "Almohammad",
    taxClass: "I",
    healthFund: "TK",
    insuranceNo: "12050855X123",
    bank: { name: "Sparkasse", iban: "DE89370400440532013000" },
    salary: { amount: 3200, label: "Monatsgehalt" },
  },
});
assert(fromContract.length === 1, "one from contract");
assert(fromContract[0].bankIban?.startsWith("DE89"), "iban from contract");
assert(Number(fromContract[0].wageItems?.[0]?.amount) === 3200, "salary → wageItems");
assert(fromContract[0].name.includes("Feras"), `name ${fromContract[0].name}`);

console.log("\n=== pick employee ===");
const rows = collectEmployeesFromPayload({
  employees: [
    { badgeId: "A-1", name: "Other" },
    { badgeId: "BP-FA-Z2CIE", name: "Feras Almohammad", bankIban: "DE11" },
  ],
});
const pick = pickEmployeeRow(rows, "BP-FA-Z2CIE");
assert(pick?.name === "Feras Almohammad", "picked right employee");

console.log("\n=== inline webhook reply ===");
const inline = extractInlineReply({
  ok: true,
  company: { id: "cmp-x", name: "Demo", taxNumber: "11/22/33" },
  hubProfile: { logoUrl: "https://example.com/logo.png", seller: "Demo\nBerlin" },
  employees: [{ badgeId: "B-1", name: "Ada", healthFund: "AOK" }],
});
assert(inline?.hubProfile?.logoUrl?.includes("logo.png"), "logo from inline");
assert(inline?.employees?.length === 1, "employees inline");

console.log("\n=== nested social/health/bank ===");
const nested = collectEmployeesFromPayload({
  contract: {
    employeeId: "BP-X",
    employee: { firstName: "Nora", lastName: "Klein" },
    socialInsurance: { number: "12121212A123" },
    healthInsurance: { name: "AOK Plus" },
    bankAccount: { name: "Commerzbank", iban: "DE44500105175407324931" },
    compensation: { monthly: 4100 },
  },
});
assert(nested[0].insuranceNo?.includes("12121212"), "SV nested");
assert(nested[0].healthFund === "AOK Plus", "KK nested");
assert(nested[0].bankIban?.startsWith("DE44"), "IBAN nested");
assert(Number(nested[0].wageItems?.[0]?.amount) === 4100, "monthly salary");

console.log("\n=== richness prefers full contract ===");
const rich = pickEmployeeRow([
  { badgeId: "BP-X", name: "Nora Klein" },
  {
    badgeId: "BP-X",
    name: "Nora Klein",
    insuranceNo: "12121212A123",
    healthFund: "AOK",
    bankIban: "DE44",
    wageItems: [{ amount: 4100 }],
    source: "contract",
  },
], "BP-X");
assert(rich.insuranceNo === "12121212A123", "picked rich row");

console.log(`\n${failed ? "FAILED" : "OK"} · passed=${passed} failed=${failed}`);
process.exit(failed ? 1 : 0);
