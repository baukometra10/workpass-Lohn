/**
 * Low monthly gross must NOT auto-become Minijob (hours×rate workers stay SV-pflichtig).
 */
import { getPayrollCore } from "../server/engine.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function approx(a, b, tol = 0.05) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

const PC = getPayrollCore();
const base = {
  employeeName: "Teilzeit Worker",
  employeeId: "BP-1",
  seller: "Firma GmbH",
  companyName: "Firma GmbH",
  payrollMonth: "2026-07",
  taxClass: "I",
  churchTaxRate: 0,
  healthFund: "TK",
  healthAdditionalPercent: 2.9,
  employmentType: "regular",
  wageItems: [{ code: "2000", label: "Stundenlohn", amount: 121.68, quantity: 8, taxFlag: "L", svFlag: "L" }],
  grossSalary: "121.68",
};

console.log("\nLow-gross SV transparency");

{
  const { payroll, sheetData } = PC.render(base, {});
  assert(payroll.employmentType === "regular", `expected regular, got ${payroll.employmentType}`);
  assert(payroll.health > 0, `KV should be > 0, got ${payroll.health}`);
  assert(payroll.pension > 0, `RV should be > 0, got ${payroll.pension}`);
  assert(payroll.unemployment > 0, `AV should be > 0, got ${payroll.unemployment}`);
  assert(payroll.care > 0, `PV should be > 0, got ${payroll.care}`);
  assert(String(sheetData.kvBeitrag || "").length > 0, "KV line visible");
  assert(String(sheetData.rvBeitrag || "").length > 0, "RV line visible");
  assert(String(sheetData.avBeitrag || "").length > 0, "AV line visible");
  assert(String(sheetData.pvBeitrag || "").length > 0, "PV line visible");
  console.log("  ✓ regular low gross: full SV lines shown", {
    kv: payroll.health, rv: payroll.pension, av: payroll.unemployment, pv: payroll.care, net: payroll.net,
  });
}

{
  const p = PC.calculate({ ...base, employmentType: "auto", grossSalary: 121.68 });
  assert(p.employmentType === "regular", `auto must not pick mini for 121.68, got ${p.employmentType}`);
  console.log("  ✓ auto no longer classifies 121.68 as mini");
}

{
  const { payroll, sheetData } = PC.render({ ...base, employmentType: "mini" }, {});
  assert(payroll.employmentType === "mini", "mini forced");
  assert(approx(payroll.pension, 121.68 * 0.036), `mini RV 3.6% got ${payroll.pension}`);
  assert(payroll.health === 0 && payroll.unemployment === 0 && payroll.care === 0, "mini AN KV/AV/PV = 0");
  assert(sheetData.kvBeitrag === "0,00", `mini KV shows 0,00 got ${sheetData.kvBeitrag}`);
  assert(sheetData.avBeitrag === "0,00", `mini AV shows 0,00 got ${sheetData.avBeitrag}`);
  assert(sheetData.pvBeitrag === "0,00", `mini PV shows 0,00 got ${sheetData.pvBeitrag}`);
  console.log("  ✓ explicit mini: RV only, zeros show 0,00");
}

console.log("OK");
