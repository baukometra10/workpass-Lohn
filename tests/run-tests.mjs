/**
 * Automatische Tests für PayrollCore + DATEV-Import
 * Ausführen: node tests/run-tests.mjs
 */
import { readFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import vm from "vm";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const require = createRequire(import.meta.url);

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

function loadScriptsInSandbox(extraFiles = []) {
  const sandbox = {
    window: {},
    document: { getElementById: () => null },
    console,
    Intl,
    localStorage: { getItem: () => null, setItem: () => {} },
    Event: class {},
    dispatchEvent: () => {},
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  const files = [
    "tax-rules.js",
    "legal-config.js",
    "vendor/pap-standalone.js",
    "payroll-bridge.js",
    "templates.js",
    "datev-import.js",
    "payroll-core.js",
    ...extraFiles,
  ];

  for (const file of files) {
    const path = `${root}/${file}`.replace(/\//g, "\\").replace(/\\/g, "/");
    const winPath = path.replace(/\//g, "\\");
    const actual = existsSync(winPath) ? winPath : path;
    if (!existsSync(actual)) throw new Error(`Missing: ${file}`);
    const code = readFileSync(actual, "utf8");
    vm.runInContext(code, ctx, { filename: file });
  }
  return sandbox;
}

console.log("\n=== Test 1: Referenz-PNG vorhanden ===");
  assert(existsSync(`${root}/assets/datev-lohn17-blank.png`.replace(/\//g, "\\")), "datev-lohn17-blank.png exists");

console.log("\n=== Test 2: PayrollCore + Mustermann Referenzwerte ===");
const sb = loadScriptsInSandbox();
const PC = sb.window.PayrollCore;
const refState = PC.referenceMustermannState();
assert(refState != null, "referenceMustermannState() returns data");
assert(refState.employeeId === "02006", "Pers.-Nr. 02006");
assert(refState.payrollMonth === "2025-07", "Monat Juli 2025");

const { payroll, sheetData } = PC.render(refState, { useReferenceDisplay: true });
assert(payroll.gross === 3620, `Brutto = 3620 (got ${payroll.gross})`);
assert(payroll.net === 2454.36, `Netto = 2454.36 (got ${payroll.net})`);
assert(sheetData.grossTotal === "3.620,00", `Anzeige Brutto ${sheetData.grossTotal}`);
assert(sheetData.payout === "2.454,36", `Auszahlung ${sheetData.payout}`);
assert(sheetData.persNr === "02006", "Blatt Pers.-Nr.");
assert(sheetData.headDate === "31.07.2025", `Kopfdatum ${sheetData.headDate}`);
assert(sheetData.wageRows?.length >= 2, "Lohnarten-Zeilen");
assert(sheetData.wageRows?.[0]?.amount === "120,00", "Lohnart 840 Betrag");
assert(sheetData.wageRows?.[1]?.amount === "3.500,00", "Lohnart 2000 Betrag");

console.log("\n=== Test 2c: STD ohne Bezeichnung → Stundenlohn ===");
const stdState = PC.normalizeDraft({
  ...PC.defaultState(),
  seller: "Test GmbH",
  employeeName: "Test Person",
  payrollMonth: "2026-08",
  taxClass: "I",
  wageItems: [{ code: "STD", amount: 447.3, quantity: 24.85, taxFlag: "L", svFlag: "L" }],
});
const stdSheet = PC.buildSheetData(stdState, PC.calculate(stdState), {});
assert(stdSheet.wageRows?.[0]?.code === "STD", "STD-Code bleibt");
assert(stdSheet.wageRows?.[0]?.label === "Stundenlohn", `Bezeichnung = Stundenlohn (got ${stdSheet.wageRows?.[0]?.label})`);
assert(stdSheet.wageRows?.[0]?.qty.includes("24"), `Anzahl Stunden (got ${stdSheet.wageRows?.[0]?.qty})`);
assert(PC.resolveWageLabel({ code: "STD" }) === "Stundenlohn", "resolveWageLabel STD");

console.log("\n=== Test 2b: Legal rates from Tax Rules Engine ===");
const r25 = sb.window.getLegalEmployeeRates({ payrollMonth: "2025-07" });
const r26 = sb.window.getLegalEmployeeRates({ payrollMonth: "2026-07" });
assert(r25.carePercent === 1.7, `2025 PV AN 1,7 (got ${r25.carePercent})`);
assert(r26.carePercent === 1.8, `2026 PV AN 1,8 (got ${r26.carePercent})`);
assert(r25.papYear === 2025 && r26.papYear === 2026, "papYear follows payroll month");

console.log("\n=== Test 3: DATEV CSV Import ===");
const csvSample = `Personal-Nr.;Lohnart-Nr.;Betrag;Abrechnungsmonat;Mitarbeitername
02006;2000;3500,00;07.2025;Mustermann
02006;840;120,00;07.2025;Mustermann`;
const parsed = sb.window.DatevImport.parseDatevCsvText(csvSample);
assert(parsed?.draft != null, "CSV parsed");
assert(parsed.draft.payroll?.employeeId === "02006", "CSV Pers.-Nr.");
const norm = PC.normalizeDraft(parsed.draft);
const calc = PC.calculate(norm);
assert(calc.gross > 0, "CSV Brutto berechnet");

console.log("\n=== Test 4: Validierung ===");
const empty = PC.defaultState();
const errs = PC.validate(empty);
assert(errs.length >= 2, "Leerer Datensatz wird abgelehnt");
const hints = PC.validatePrintHints(refState);
assert(Array.isArray(hints), "validatePrintHints liefert Array");
const csvPack = PC.buildDatevCsv(refState, payroll);
assert(csvPack.content.includes("Personalnummer"), "DATEV/WorkPass CSV Header");
assert(csvPack.content.includes("02006"), "CSV enthält Pers.-Nr.");

console.log("\n=== Test 5: DatevSheet Felddefinition ===");
const sb2 = loadScriptsInSandbox(["datev-sheet.js"]);
assert(Array.isArray(sb2.window.DatevSheet.FIELDS), "FIELDS definiert");
assert(sb2.window.DatevSheet.FIELDS.length >= 40, "≥40 Felder kalibriert");

console.log("\n=== Test 6: Plattform-Import platform.payroll.v1 ===");
const platformPath = `${root}/examples/platform-payroll.v1.json`.replace(/\//g, "\\");
assert(existsSync(platformPath), "Beispiel-JSON vorhanden");
const platformJson = JSON.parse(readFileSync(platformPath, "utf8"));
const ingested = PC.ingestPlatformPayload(platformJson);
assert(ingested.state != null, "ingest liefert State");
assert(ingested.state.employeeId === "02006", "Platform Pers.-Nr.");
assert(ingested.state.payrollMonth === "2025-07", "Platform Monat");
assert(ingested.state.companyName === "Muster GmbH", "Platform Firma");
assert((ingested.state.wageItems || []).length >= 2, "Platform Lohnarten");
const bad = PC.ingestPlatformPayload({ kind: "platform.payroll.v1", company: {}, employee: {} });
assert(bad.ok === false && bad.errors.length >= 1, "Ungültige Plattform-Nutzlast wird abgelehnt");

console.log("\n=== Test 7: Archiv & Anzahl-Mapping ===");
assert(PC.upsertArchiveEntry(PC.defaultState()) === false, "Leerer Entwurf nicht ins Archiv");
assert(PC.upsertArchiveEntry(refState) === true, "Gefüllter Entwurf wird archiviert");
const qtyIngest = PC.ingestPlatformPayload({
  kind: "platform.payroll.v1",
  company: { name: "Qty GmbH" },
  employee: { name: "Qty Worker", id: "99" },
  period: "2026-01",
  wageItems: [{ code: "1000", label: "Stundenlohn", amount: 800, quantity: 40, taxFlag: "L", svFlag: "L" }],
});
assert(qtyIngest.state?.wageItems?.[0]?.quantity === 40, "Plattform-Anzahl (quantity) übernommen");
const qtySheet = PC.buildSheetData(qtyIngest.state, PC.calculate(qtyIngest.state), {});
assert(qtySheet.wageRows?.[0]?.qty === "40", `Anzahl auf Blatt (${qtySheet.wageRows?.[0]?.qty})`);

console.log("\n=== Test 8: Geburtsdatum volles Jahr + Netto-Abzüge ===");
const birthState = PC.normalizeDraft({
  ...PC.defaultState(),
  seller: "Test GmbH\nMusterstr. 1",
  companyName: "Test GmbH",
  employeeName: "Max Test",
  employeeId: "100",
  employeeBirthDate: "1990-03-15",
  payrollMonth: "2026-01",
  taxClass: "I",
  churchConfession: "ev",
  churchTaxRate: "9",
  healthAdditionalPercent: "2.5",
  childlessPvSurcharge: true,
  taxAllowanceMonthly: "50",
  netDeductions: "25",
  wageItems: [
    { code: "2000", label: "Gehalt", amount: 3000, taxFlag: "L", svFlag: "L" },
    { code: "9900", label: "Abzug / Einbehalt (netto)", amount: 100, taxFlag: "F", svFlag: "N" },
  ],
});
const birthCalc = PC.calculate(birthState);
assert(birthCalc.gross === 3000, `Brutto ohne Netto-Abzug-Zeile = 3000 (got ${birthCalc.gross})`);
assert(birthCalc.netDeductions === 125, `Netto-Abzüge 100+25 = 125 (got ${birthCalc.netDeductions})`);
assert(birthCalc.net === Math.round((birthCalc.netBeforeDeductions - 125) * 100) / 100, "Netto nach Abzügen");
const birthSheet = PC.buildSheetData(birthState, birthCalc, {});
assert(birthSheet.birth === "15.03.1990", `Geburtsdatum volles Jahr (${birthSheet.birth})`);
assert(birthSheet.konf === "ev", `Konfession auf Blatt (${birthSheet.konf})`);
assert(birthSheet.netAbzug === "125,00" || birthSheet.netAbzug.includes("125"), `Netto-Abzüge auf Blatt (${birthSheet.netAbzug})`);
assert(PC.formatDateDE("2025-07-31", true) === "31.07.2025", "formatDateDE volles Jahr");

console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
