import fs from "fs";

const bridge = fs.readFileSync("payroll-bridge.js", "utf8");
const start = bridge.indexOf("  const TAX_CLASS_MAP");
const end = bridge.indexOf("  try {");
if (start < 0 || end < 0) throw new Error("markers not found");

let core = bridge.slice(start, end).replace(/^  /gm, "");
core = core.split("typeof PapLib === \"undefined\" || typeof PapLib.calculate !== \"function\"").join("false");
core = core.split("PapLib.calculate(2026, papInputs)").join("papCalculate(2026, papInputs)");

const out = `/**
 * Echte Lohnberechnung nach BMF-Programmablaufplan 2026 (lohnsteuerrechner)
 * und Sozialversicherung nach SGB IV / Beitragsverordnung 2026.
 * Sync mit payroll-bridge.js (UI/Server nutzen Bridge via PapLib).
 */
import { calculate as papCalculate } from "./vendor/lohnsteuerrechner/dist/core/index.js";

${core}
try {
  window.PayrollEngine = {
    SV_2026,
    calculateRealPayroll,
    calculateSocialInsurance,
    calculatePapTax,
    resolveEmploymentType,
    midiBases,
    buildDatevIni,
    buildDatevMovementLines,
    buildDatevStammLine,
    formatDatevMonth,
    DATEV_WAGE_TYPES,
    ready: true,
  };
} catch (error) {
  console.error("PayrollEngine konnte nicht initialisiert werden:", error);
  if (typeof window !== "undefined") {
    window.PayrollEngine = { ready: false, error: String(error?.message || error) };
  }
}

if (typeof window !== "undefined") {
  window.dispatchEvent(new Event("payroll-engine-ready"));
}

export {
  SV_2026,
  calculateRealPayroll,
  calculateSocialInsurance,
  calculatePapTax,
  resolveEmploymentType,
  midiBases,
};
`;

fs.writeFileSync("payroll-engine.js", out);
console.log("synced payroll-engine.js", out.length);
