/**
 * Firm-month DATEV / LODAS export packages (released payslips).
 */
import { listPayrollJobs, loadCompany } from "./db/repository.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";

function realJobs(jobs, includeDemo = false) {
  if (includeDemo) return jobs || [];
  return (jobs || []).filter((j) => !isDemoPayrollJob(j));
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDe(n) {
  return Number(n || 0).toFixed(2).replace(".", ",");
}

function datevMonth(period) {
  if (!/^\d{4}-\d{2}$/.test(period)) return "";
  const [y, m] = period.split("-");
  return `01.${m}.${y}`;
}

function safeFilePart(s) {
  return String(s || "Mandant").replace(/[^\w\-äöüÄÖÜß]+/g, "_").slice(0, 40);
}

const WAGE = {
  gross: 2000,
  tax: 3100,
  church: 3150,
  soli: 3120,
  health: 4200,
  pension: 4300,
  care: 4400,
  unemployment: 4500,
};

function buildIni() {
  return `[Allgemein]
Feldanzahl=5
Feldtrennzeichen=Semikolon
Zahlenkomma=Komma
Datumsformat=TT.MM.JJJJ
Satzende=CR/LF
Importart=Bewegungsdaten

[Feld1]
Bezeichnung=Personalnummer
Typ=AN
Laenge=20

[Feld2]
Bezeichnung=Lohnart
Typ=NUM
Laenge=4

[Feld3]
Bezeichnung=Betrag
Typ=NUM
Laenge=12

[Feld4]
Bezeichnung=Abrechnungsmonat
Typ=DATE
Laenge=10

[Feld5]
Bezeichnung=Mitarbeitername
Typ=AN
Laenge=60
`;
}

/**
 * Rich DATEV month CSV + warnings.
 */
export function buildMonthDatevPackage(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || currentPeriod()).trim();
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "period ungültig" };
  const includeCalculated = opts.includeCalculated === true;
  const jobs = realJobs(listPayrollJobs({ companyId: cid, period }), opts.includeDemo)
    .filter((j) => j.status === "released" || (includeCalculated && j.status === "calculated"))
    .sort((a, b) => String(a.employee?.name || "").localeCompare(String(b.employee?.name || ""), "de"));
  const company = loadCompany(cid);
  const companyName = String(company?.name || jobs[0]?.company?.name || cid);
  const clientNo = String(company?.datevClientNo || company?.meta?.hubProfile?.datevClientNo || "").trim();
  const consultantNo = String(company?.datevConsultantNo || company?.meta?.hubProfile?.datevConsultantNo || "").trim();
  const header = [
    "Personalnummer",
    "Lohnart",
    "Bezeichnung",
    "Menge",
    "Betrag",
    "Abrechnungsmonat",
    "Mitarbeitername",
    "Firma",
    "Status",
    "Netto",
    "Brutto",
    "Stunden",
    "SV-Nummer",
    "Krankenkasse",
    "DATEV-Mandant",
    "DATEV-Berater",
  ].join(";");
  const lines = [header];
  const warnings = [];
  for (const j of jobs) {
    const state = j.state || {};
    const pers = String(state.personnelNumber || "").trim();
    const badge = String(state.employeeId || j.employee?.id || "").trim();
    const persOut = pers || "00000";
    if (!pers) warnings.push(`${badge || "MA"}: Personal-Nr. fehlt`);
    if (!String(state.employeeInsuranceNo || "").trim()) warnings.push(`${persOut}: SV-Nummer fehlt`);
    if (!String(state.healthFund || "").trim()) warnings.push(`${persOut}: Krankenkasse fehlt`);
    const name = String(state.employeeName || j.employee?.name || "").trim();
    const wages = Array.isArray(state.wageItems) ? state.wageItems : [];
    const gross = Number(j.payslip?.totals?.gross || state.grossSalary || 0);
    const net = Number(j.payslip?.totals?.net || 0);
    const hours = Number(state.workHours) || 0;
    const wageRows = wages.filter((w) => Number(w.amount) > 0);
    const pushRow = (code, label, qty, amount) => {
      lines.push([
        csvEscape(persOut),
        csvEscape(code),
        csvEscape(label),
        csvEscape(qty > 0 ? String(qty).replace(".", ",") : ""),
        csvEscape(fmtDe(amount)),
        csvEscape(period),
        csvEscape(name),
        csvEscape(companyName),
        csvEscape(j.status),
        csvEscape(fmtDe(net)),
        csvEscape(fmtDe(gross)),
        csvEscape(hours > 0 ? String(hours).replace(".", ",") : ""),
        csvEscape(state.employeeInsuranceNo || ""),
        csvEscape(state.healthFund || ""),
        csvEscape(clientNo),
        csvEscape(consultantNo),
      ].join(";"));
    };
    if (wageRows.length) {
      wageRows.forEach((w) => {
        pushRow(
          String(w.code || "2000"),
          String(w.label || "Lohnart"),
          Number(w.quantity || w.hours || hours) || 0,
          Number(w.amount) || 0
        );
      });
    } else if (gross > 0) {
      pushRow("2000", "Gehalt", hours, gross);
    }
  }
  const fileBase = `WorkPass_DATEV_${period}_${safeFilePart(companyName)}`;
  return {
    ok: true,
    kind: "portal.datev.month.v1",
    companyId: cid,
    period,
    count: jobs.length,
    warnings: [...new Set(warnings)].slice(0, 40),
    filename: `${fileBase}.csv`,
    content: `\ufeff${lines.join("\r\n")}`,
    lineCount: lines.length - 1,
    datevClientNo: clientNo,
    datevConsultantNo: consultantNo,
  };
}

/**
 * LODAS-style package: ini + movements + stamm as text files.
 */
export function buildMonthLodasPackage(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || currentPeriod()).trim();
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "period ungültig" };
  const includeCalculated = opts.includeCalculated === true;
  const jobs = realJobs(listPayrollJobs({ companyId: cid, period }), opts.includeDemo)
    .filter((j) => j.status === "released" || (includeCalculated && j.status === "calculated"))
    .sort((a, b) => String(a.employee?.name || "").localeCompare(String(b.employee?.name || ""), "de"));
  const company = loadCompany(cid);
  const companyName = String(company?.name || jobs[0]?.company?.name || cid);
  const monthLabel = datevMonth(period);
  const move = ["Personalnummer;Lohnart;Betrag;Abrechnungsmonat;Mitarbeitername"];
  const stamm = ["Personalnummer;Name;Steuer-ID;SV-Nummer;StKl;IBAN;BIC;Bank"];
  for (const j of jobs) {
    const state = j.state || {};
    const t = j.payslip?.totals || j.payroll || {};
    const pers = String(state.personnelNumber || state.employeeId || j.employee?.id || "").trim() || "00000";
    const name = String(state.employeeName || j.employee?.name || "").trim();
    const wages = (Array.isArray(state.wageItems) ? state.wageItems : []).filter((w) => Number(w.amount) > 0);
    if (wages.length) {
      wages.forEach((w) => {
        move.push([pers, String(w.code || WAGE.gross), fmtDe(w.amount), monthLabel, name].join(";"));
      });
    } else if (Number(t.gross || state.grossSalary) > 0) {
      move.push([pers, String(WAGE.gross), fmtDe(t.gross || state.grossSalary), monthLabel, name].join(";"));
    }
    const pushDed = (code, amount) => {
      const n = Number(amount) || 0;
      if (!n) return;
      move.push([pers, String(code), fmtDe(-Math.abs(n)), monthLabel, name].join(";"));
    };
    pushDed(WAGE.tax, t.payrollTax);
    pushDed(WAGE.soli, t.solidarity);
    pushDed(WAGE.church, t.churchTax);
    pushDed(WAGE.health, t.health);
    pushDed(WAGE.pension, t.pension);
    pushDed(WAGE.care, t.care);
    pushDed(WAGE.unemployment, t.unemployment);
    stamm.push([
      pers,
      name,
      String(state.employeeTaxId || ""),
      String(state.employeeInsuranceNo || ""),
      String(state.taxClass || "I"),
      String(state.bankIban || ""),
      String(state.bankBic || ""),
      String(state.bankName || ""),
    ].join(";"));
  }
  const base = `WorkPass_LODAS_${period}_${safeFilePart(companyName)}`;
  return {
    ok: true,
    kind: "portal.lodas.month.v1",
    companyId: cid,
    period,
    count: jobs.length,
    filename: `${base}.txt`,
    files: [
      { name: `${base}.ini`, content: buildIni() },
      { name: `${base}_bewegungen.csv`, content: `\ufeff${move.join("\r\n")}` },
      { name: `${base}_stamm.csv`, content: `\ufeff${stamm.join("\r\n")}` },
    ],
    content: [
      `=== ${base}.ini ===`,
      buildIni(),
      `=== ${base}_bewegungen.csv ===`,
      move.join("\r\n"),
      `=== ${base}_stamm.csv ===`,
      stamm.join("\r\n"),
    ].join("\r\n\r\n"),
  };
}
