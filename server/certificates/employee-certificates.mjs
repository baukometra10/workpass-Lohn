/**
 * Per-employee Lohnsteuerbescheinigung + Verdienstbescheinigung from released payroll jobs.
 */
import { listPayrollJobs, loadCompany } from "../db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "../tenant.mjs";
import { isDemoPayrollJob } from "../demo-detect.mjs";
import { listEmployees } from "../employee-registry.mjs";

const LSTB_ROWS = [
  { nr: 1, key: "certPeriod", label: "Bescheinigungszeitraum" },
  { nr: 2, key: "empty2", label: "" },
  { nr: 3, key: "grossWages", label: "Bruttoarbeitslohn einschl. steuerpflichtiger Sachbezüge ohne 9. und 10.", money: true },
  { nr: 4, key: "payrollTax", label: "Einbehaltene Lohnsteuer von 3.", money: true },
  { nr: 5, key: "solidarity", label: "Einbehaltener Solidaritätszuschlag von 3.", money: true },
  { nr: 6, key: "churchTax", label: "Einbehaltene Kirchensteuer von 3.", money: true },
  { nr: 7, key: "empty7", label: "" },
  { nr: 8, key: "empty8", label: "" },
  { nr: 9, key: "empty9", label: "" },
  { nr: 10, key: "taxGross", label: "Steuer-Brutto (laufende Bezüge)", money: true },
  { nr: 11, key: "net", label: "Ausgezahltes Nettoentgelt", money: true },
  { nr: 12, key: "empty12", label: "" },
  { nr: 13, key: "empty13", label: "" },
  { nr: 14, key: "empty14", label: "" },
  { nr: 15, key: "pension", label: "Beiträge zur gesetzlichen Rentenversicherung", money: true },
  { nr: 16, key: "health", label: "Beiträge zur gesetzlichen Krankenversicherung", money: true },
  { nr: 17, key: "care", label: "Beiträge zur sozialen Pflegeversicherung", money: true },
  { nr: 18, key: "unemployment", label: "Beiträge zur Arbeitslosenversicherung", money: true },
  { nr: 19, key: "empty19", label: "" },
  { nr: 20, key: "empty20", label: "" },
  { nr: 21, key: "employerShare", label: "Arbeitgeberanteil zur Sozialversicherung", money: true },
  { nr: 22, key: "monthsCount", label: "Anzahl abgerechneter Monate" },
  { nr: 23, key: "hoursTotal", label: "Summe Arbeitsstunden", money: false },
  { nr: 24, key: "empty24", label: "" },
  { nr: 25, key: "empty25", label: "" },
  { nr: 26, key: "empty26", label: "" },
  { nr: 27, key: "empty27", label: "" },
];

const VB_ROWS = [
  { label: "Abrechnungs-Brutto", key: "gross" },
  { label: "Steuer-Brutto", key: "taxGross" },
  { label: "SV-Brutto", key: "svGross" },
  { label: "Gesamt-Brutto mtl.", key: "gross", monthly: true },
  { label: "Nettoentgelt mtl.", key: "net", monthly: true },
  { label: "Lohnsteuer", key: "payrollTax", deduction: true },
  { label: "Solidaritätszuschlag", key: "solidarity", deduction: true },
  { label: "Kirchensteuer", key: "churchTax", deduction: true },
  { label: "KV-Beitrag", key: "health", deduction: true },
  { label: "RV-Beitrag", key: "pension", deduction: true },
  { label: "PV-Beitrag", key: "care", deduction: true },
  { label: "AV-Beitrag", key: "unemployment", deduction: true },
  { label: "Netto-Verdienst", key: "net" },
];

function monthInYear(period, year) {
  return String(period || "").startsWith(`${year}-`);
}

function monthToNumeric(period) {
  const [y, m] = String(period || "").split("-").map(Number);
  if (!y || !m) return 0;
  return y * 100 + m;
}

function formatCertDate(value) {
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE");
}

function formatCertPeriod(start, end) {
  const a = formatCertDate(start);
  const b = formatCertDate(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || "-";
}

function resolveYearBounds(year, months, entryDate, exitDate) {
  const y = Number(year) || new Date().getFullYear();
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;
  let start = entryDate && String(entryDate).startsWith(String(y)) ? entryDate : yearStart;
  let end = exitDate && String(exitDate).startsWith(String(y)) ? exitDate : yearEnd;
  if (months.length) {
    const sorted = [...months].sort((a, b) => monthToNumeric(a) - monthToNumeric(b));
    const [fy, fm] = sorted[0].split("-").map(Number);
    const [ly, lm] = sorted[sorted.length - 1].split("-").map(Number);
    const calcStart = `${fy}-${String(fm).padStart(2, "0")}-01`;
    const lastDay = new Date(ly, lm, 0).getDate();
    const calcEnd = `${ly}-${String(lm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    if (!entryDate || entryDate < calcStart) start = calcStart;
    if (!exitDate || exitDate > calcEnd) end = calcEnd;
  }
  if (start > end) end = start;
  return { start, end };
}

function emptyTotals() {
  return {
    gross: 0,
    taxGross: 0,
    svGross: 0,
    payrollTax: 0,
    solidarity: 0,
    churchTax: 0,
    pension: 0,
    health: 0,
    care: 0,
    unemployment: 0,
    svTotal: 0,
    employerShare: 0,
    net: 0,
    hours: 0,
    monthsCount: 0,
    months: [],
  };
}

function payrollFromJob(job) {
  const t = job?.payslip?.totals || job?.payroll || {};
  const state = job?.state || {};
  const hours = Number(t.hours ?? state.workHours) || 0;
  return {
    gross: Number(t.gross) || 0,
    taxGross: Number(t.taxGross ?? t.gross) || 0,
    svGross: Number(t.svGross ?? t.gross) || 0,
    payrollTax: Number(t.payrollTax) || 0,
    solidarity: Number(t.solidarity) || 0,
    churchTax: Number(t.churchTax) || 0,
    pension: Number(t.pension) || 0,
    health: Number(t.health) || 0,
    care: Number(t.care) || 0,
    unemployment: Number(t.unemployment) || 0,
    svTotal: Number(t.svTotal) || (
      (Number(t.pension) || 0) + (Number(t.health) || 0)
      + (Number(t.care) || 0) + (Number(t.unemployment) || 0)
    ),
    employerShare: Number(t.employerShare) || 0,
    net: Number(t.net) || 0,
    hours,
  };
}

function addTotals(totals, payroll, period) {
  totals.gross += payroll.gross;
  totals.taxGross += payroll.taxGross;
  totals.svGross += payroll.svGross;
  totals.payrollTax += payroll.payrollTax;
  totals.solidarity += payroll.solidarity;
  totals.churchTax += payroll.churchTax;
  totals.pension += payroll.pension;
  totals.health += payroll.health;
  totals.care += payroll.care;
  totals.unemployment += payroll.unemployment;
  totals.svTotal += payroll.svTotal;
  totals.employerShare += payroll.employerShare;
  totals.net += payroll.net;
  totals.hours += payroll.hours;
  totals.monthsCount += 1;
  totals.months.push(period);
}

function employeeKey(job) {
  return normalizeEmployeeId(job?.employee?.id || job?.employee?.badgeId || job?.state?.employeeId || "");
}

function employeeDisplayName(job, registryName = "") {
  const candidates = [
    registryName,
    job?.employee?.name,
    job?.state?.employeeName,
    job?.payslip?.employee?.name,
  ];
  for (const c of candidates) {
    const n = String(c || "").trim();
    if (n) return n;
  }
  return employeeKey(job) || "Mitarbeiter";
}

function releasedYearJobs(companyId, employeeId, year) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  if (!cid || !eid) return [];
  const registry = new Map(
    (listEmployees(cid) || []).map((r) => [normalizeEmployeeId(r.badgeId || r.id), r])
  );
  return (listPayrollJobs({ companyId: cid }) || [])
    .filter((j) => !isDemoPayrollJob(j))
    .filter((j) => j.status === "released")
    .filter((j) => monthInYear(j.period, year))
    .filter((j) => employeeKey(j) === eid)
    .sort((a, b) => monthToNumeric(a.period) - monthToNumeric(b.period))
    .map((j) => ({
      job: j,
      period: j.period,
      payroll: payrollFromJob(j),
      registry: registry.get(eid),
    }));
}

function sellerBlock(company) {
  const hub = company?.meta?.hubProfile || {};
  const lines = [
    company?.name || hub.companyName || "",
    hub.seller || company?.address || "",
  ].filter(Boolean);
  return lines.join("\n").trim() || company?.name || "";
}

export function listCertificateSummary(companyId, year) {
  const cid = normalizeCompanyId(companyId);
  const y = Number(year) || new Date().getFullYear();
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const byEmp = new Map();
  for (const job of (listPayrollJobs({ companyId: cid }) || []).filter((j) => !isDemoPayrollJob(j) && j.status === "released" && monthInYear(j.period, y))) {
    const eid = employeeKey(job);
    if (!eid) continue;
    const row = byEmp.get(eid) || {
      employeeId: eid,
      name: employeeDisplayName(job),
      months: [],
      releasedCount: 0,
    };
    if (!row.months.includes(job.period)) row.months.push(job.period);
    row.releasedCount += 1;
    row.name = employeeDisplayName(job, row.name);
    byEmp.set(eid, row);
  }
  const employees = [...byEmp.values()]
    .map((r) => ({
      ...r,
      months: r.months.sort((a, b) => monthToNumeric(a) - monthToNumeric(b)),
      readyForLstb: r.months.length > 0,
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  return {
    ok: true,
    kind: "portal.certificates.summary.v1",
    companyId: cid,
    year: y,
    count: employees.length,
    employees,
  };
}

export function buildEmployeeLstbCertificate(companyId, employeeId, year) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  const y = Number(year) || new Date().getFullYear();
  if (!cid || !eid) return { ok: false, status: 422, error: "companyId und employeeId fehlen" };

  const company = loadCompany(cid) || {};
  const rows = releasedYearJobs(cid, eid, y);
  if (!rows.length) {
    return {
      ok: false,
      status: 422,
      error: `Keine freigegebenen Abrechnungen für ${eid} im Jahr ${y}`,
      year: y,
      employeeId: eid,
    };
  }

  const totals = emptyTotals();
  const monthDetails = [];
  for (const row of rows) {
    addTotals(totals, row.payroll, row.period);
    monthDetails.push({ period: row.period, payroll: row.payroll });
  }

  const first = rows[0].job;
  const state = first.state || {};
  const reg = rows[0].registry || {};
  const bounds = resolveYearBounds(
    y,
    totals.months,
    state.employeeEntryDate || reg.entryDate,
    state.employeeExitDate || reg.exitDate
  );
  const certPeriod = formatCertPeriod(bounds.start, bounds.end);

  const rowValues = {
    certPeriod,
    grossWages: totals.gross,
    payrollTax: totals.payrollTax,
    solidarity: totals.solidarity,
    churchTax: totals.churchTax,
    taxGross: totals.taxGross,
    net: totals.net,
    pension: totals.pension,
    health: totals.health,
    care: totals.care,
    unemployment: totals.unemployment,
    employerShare: totals.employerShare,
    monthsCount: String(totals.monthsCount),
    hoursTotal: totals.hours > 0 ? totals.hours.toFixed(2).replace(".", ",") : "0,00",
    empty2: "", empty7: "", empty8: "", empty9: "", empty12: "", empty13: "", empty14: "",
    empty19: "", empty20: "", empty24: "", empty25: "", empty26: "", empty27: "",
  };

  return {
    ok: true,
    kind: "portal.certificate.lstb.v1",
    companyId: cid,
    year: y,
    employeeId: eid,
    employeeName: employeeDisplayName(first, reg.name),
    employeeTaxId: String(state.employeeTaxId || reg.taxId || "").trim(),
    employeeInsuranceNo: String(state.employeeInsuranceNo || reg.insuranceNo || "").trim(),
    employeeBirthDate: String(state.employeeBirthDate || reg.birthDate || "").trim(),
    employeeAddress: String(state.employeeAddress || reg.address || "").trim(),
    personnelNumber: String(state.personnelNumber || state.employeeId || eid).trim(),
    taxClass: String(state.taxClass || "I").trim(),
    churchTaxRate: Number(state.churchTaxRate) || 0,
    childAllowanceFactor: Number(state.childAllowanceFactor ?? state.childAllowance) || 0,
    seller: sellerBlock(company),
    taxNumber: String(company.taxNumber || company.meta?.hubProfile?.taxNumber || "").trim(),
    certPeriod,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    totals,
    monthDetails,
    rows: LSTB_ROWS.map((row) => ({
      ...row,
      value: rowValues[row.key] ?? (row.money ? 0 : ""),
    })),
    hasData: totals.monthsCount > 0,
    note: "Aus freigegebenen Monatsabrechnungen · Jahres-Lohnsteuerbescheinigung pro Mitarbeiter",
  };
}

export function buildEmployeeVerdienstCertificate(companyId, employeeId, year, period) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  const y = Number(year) || new Date().getFullYear();
  if (!cid || !eid) return { ok: false, status: 422, error: "companyId und employeeId fehlt" };

  const company = loadCompany(cid) || {};
  const rows = releasedYearJobs(cid, eid, y);
  if (!rows.length) {
    return {
      ok: false,
      status: 422,
      error: `Keine freigegebenen Abrechnungen für ${eid} im Jahr ${y}`,
    };
  }

  const focusPeriod = String(period || "").trim() || rows[rows.length - 1].period;
  const focusRow = rows.find((r) => r.period === focusPeriod) || rows[rows.length - 1];
  const monthly = focusRow.payroll;

  const ytd = emptyTotals();
  for (const row of rows) addTotals(ytd, row.payroll, row.period);

  const state = focusRow.job.state || {};
  const reg = focusRow.registry || {};

  const tableRows = VB_ROWS.map((def) => {
    const mtl = def.monthly ? monthly[def.key] : (def.key === "taxGross" || def.key === "svGross" ? monthly[def.key] : monthly[def.key]);
    const jahr = ytd[def.key] ?? 0;
    return {
      label: def.label,
      monthly: Number(mtl) || 0,
      yearly: Number(jahr) || 0,
      deduction: Boolean(def.deduction),
    };
  });

  return {
    ok: true,
    kind: "portal.certificate.verdienst.v1",
    companyId: cid,
    year: y,
    period: focusRow.period,
    employeeId: eid,
    employeeName: employeeDisplayName(focusRow.job, reg.name),
    personnelNumber: String(state.personnelNumber || state.employeeId || eid).trim(),
    seller: sellerBlock(company),
    monthsInYear: rows.map((r) => r.period),
    monthly,
    ytd: {
      gross: ytd.gross,
      taxGross: ytd.taxGross,
      svGross: ytd.svGross,
      payrollTax: ytd.payrollTax,
      solidarity: ytd.solidarity,
      churchTax: ytd.churchTax,
      pension: ytd.pension,
      health: ytd.health,
      care: ytd.care,
      unemployment: ytd.unemployment,
      net: ytd.net,
    },
    rows: tableRows,
    note: "Verdienstbescheinigung aus freigegebenen Abrechnungen · Monat + Jahressumme",
  };
}
