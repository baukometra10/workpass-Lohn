/**
 * Gesetzliche Lohn-/SV-Regression 2026 (BMF-PAP + SGB IV).
 */
import { getPayrollCore } from "../server/engine.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(a, b, tol = 0.02) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

const PC = getPayrollCore();
const base = {
  employeeName: "Max Mustermann",
  employeeId: "1001",
  mandantId: "demo",
  companyName: "Demo GmbH",
  payrollMonth: "2026-07",
  taxClass: "I",
  churchTaxRate: 9,
  healthAdditionalPercent: 2.9,
};

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log("\nPayroll legal 2026");

check("Vollzeit: BMF-PAP liefert Lohnsteuer", () => {
  const p = PC.calculate({ ...base, grossSalary: 3500, employmentType: "regular" });
  assert(p.taxMethod === "BMF-PAP-2026" || p.method === "BMF-PAP-2026" || p.legalRatesApplied, "PAP nicht aktiv");
  assert(p.payrollTax > 300, `LSt zu niedrig: ${p.payrollTax}`);
  assert(approx(p.churchTax, p.payrollTax * 0.09) || approx(p.churchTax, (p.churchTaxBase || p.payrollTax) * 0.09), "KiSt ≠ 9% von BK/LSt");
  assert(approx(p.pension, 3500 * 0.093), `RV AN: ${p.pension}`);
  assert(approx(p.health, 3500 * (0.073 + 0.029 / 2)), `KV AN: ${p.health}`);
  assert(approx(p.care, 3500 * 0.018), `PV AN: ${p.care}`);
  assert(approx(p.unemployment, 3500 * 0.013), `AV AN: ${p.unemployment}`);
  assert(approx(p.employerCare, 3500 * 0.018), `PV AG muss 1,8% sein: ${p.employerCare}`);
  assert(p.net > 2000 && p.net < p.gross, `Netto unplausibel: ${p.net}`);
});

check("PV-Kinderlosenzuschlag nur beim AN", () => {
  const p = PC.calculate({
    ...base,
    grossSalary: 3500,
    employmentType: "regular",
    childlessPvSurcharge: true,
  });
  assert(approx(p.care, 3500 * 0.024), `PV AN kinderlos: ${p.care}`);
  assert(approx(p.employerCare, 3500 * 0.018), `PV AG bleibt 1,8%: ${p.employerCare}`);
  assert(p.employerShare < p.svTotal || p.employerCare < p.care, "AG-Anteil darf den Kinderlosenzuschlag nicht enthalten");
});

check("Midijob 750 €: reduzierte AN-SV (Übergangsbereich)", () => {
  const p = PC.calculate({ ...base, grossSalary: 750, employmentType: "midi", churchTaxRate: 0 });
  assert(p.employmentType === "midi", `Typ: ${p.employmentType}`);
  // BE AN ≈ 1.431639227*750 - 863.2784538 ≈ 210.45
  const beAn = 1.431639227 * 750 - 863.2784538;
  assert(approx(p.pension, beAn * 0.093, 0.05), `Midi RV: ${p.pension} vs ${beAn * 0.093}`);
  const fullRv = 750 * 0.093;
  assert(p.pension < fullRv - 1, "Midi-RV muss unter vollem AN-Satz liegen");
  assert(p.employerShare > p.svTotal, "Im Midijob trägt AG mehr als AN");
});

check("Minijob 500 €: nur RV-AN (oder 0 bei Befreiung), keine individuelle LSt", () => {
  const p = PC.calculate({ ...base, grossSalary: 500, employmentType: "mini" });
  assert(p.employmentType === "mini", `Typ: ${p.employmentType}`);
  assert(approx(p.pension, 500 * 0.036), `Minijob RV: ${p.pension}`);
  assert(p.health === 0 && p.care === 0 && p.unemployment === 0, "Minijob AN ohne KV/PV/AV");
  assert(p.payrollTax === 0 && p.churchTax === 0, "Pauschal → keine individuelle LSt");
  assert(approx(p.employerPension, 500 * 0.15), `AG RV-Pauschale: ${p.employerPension}`);
  assert(approx(p.employerHealth, 500 * 0.13), `AG KV-Pauschale: ${p.employerHealth}`);

  const exempt = PC.calculate({
    ...base,
    grossSalary: 500,
    employmentType: "mini",
    minijobRvExempt: true,
  });
  assert(exempt.pension === 0, "RV-Befreiung");
});

check("Auto: nie Minijob aus Brutto; Midi nur im Übergangsbereich", () => {
  assert(PC.calculate({ ...base, grossSalary: 400, employmentType: "auto" }).employmentType === "regular");
  assert(PC.calculate({ ...base, grossSalary: 1200, employmentType: "auto" }).employmentType === "midi");
  assert(PC.calculate({ ...base, grossSalary: 3000, employmentType: "auto" }).employmentType === "regular");
  assert(PC.calculate({ ...base, grossSalary: 400 }).employmentType === "regular");
});

check("Arbeitgeber-Umlagen U1/U2/Inso im AG-Anteil", () => {
  const p = PC.calculate({ ...base, grossSalary: 3500, employmentType: "regular" });
  assert(p.umlageU1 > 0 && p.umlageU2 > 0 && p.umlageInsolvency > 0, "Umlagen fehlen");
  assert(
    approx(p.employerShare, p.employerPension + p.employerHealth + p.employerCare + p.employerUnemployment + p.umlagenTotal, 0.05),
    `AG-Summe inkonsistent: ${p.employerShare}`
  );
  assert(p.employerShare > p.svTotal, "AG inkl. Umlagen > AN-SV");
});

check("BBG: KV/PV bei hohem Brutto gedeckelt", () => {
  const p = PC.calculate({ ...base, grossSalary: 9000, employmentType: "regular", churchTaxRate: 0 });
  assert(approx(p.health, 5512.5 * (0.073 + 0.029 / 2)), `KV an BBG: ${p.health}`);
  assert(approx(p.pension, 8050 * 0.093), `RV an BBG: ${p.pension}`);
});

check("2025-07: Tax Rules Pack 2025 (PV 1,7 %, KVZ 2,5 %)", () => {
  const p = PC.calculate({
    ...base,
    payrollMonth: "2025-07",
    grossSalary: 3500,
    healthAdditionalPercent: 2.5,
    employmentType: "regular",
  });
  assert(p.taxAudit?.rulesetId?.includes("2025") || p.taxAudit?.papYear === 2025, `taxAudit 2025: ${JSON.stringify(p.taxAudit)}`);
  assert(approx(p.care, 3500 * 0.017), `PV 2025: ${p.care}`);
  assert(approx(p.health, 3500 * (0.073 + 0.025 / 2)), `KV 2025: ${p.health}`);
});

if (failed) {
  console.error(`\nFAILED (${failed})`);
  process.exit(1);
}
console.log("\nOK – gesetzliche Kernfälle bestanden\n");
