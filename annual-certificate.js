/**
 * Lohnsteuerbescheinigung – Jahresaggregation aus gespeicherten Monatsdaten.
 * Summiert Brutto, Lohnsteuer, SV etc. je Kalenderjahr und Beschäftigungszeitraum.
 */

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

function monthInYear(monthKey, year) {
  return String(monthKey || "").startsWith(`${year}-`);
}

function monthToNumeric(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return 0;
  return y * 100 + m;
}

function formatCertDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE");
}

function formatCertPeriod(start, end) {
  const a = formatCertDate(start);
  const b = formatCertDate(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || "-";
}

const DE_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function monthNameFromIso(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(m[1]), month, name: DE_MONTHS[month - 1] };
}

/** e.g. "von Januar bis Dezember 2027" */
function formatCertPeriodVonBis(start, end) {
  const a = monthNameFromIso(start);
  const b = monthNameFromIso(end);
  if (!a && !b) return "";
  if (a && b) {
    if (a.year === b.year && a.month === b.month) {
      return `von ${a.name} ${a.year}`;
    }
    if (a.year === b.year) {
      return `von ${a.name} bis ${b.name} ${a.year}`;
    }
    return `von ${a.name} ${a.year} bis ${b.name} ${b.year}`;
  }
  const one = a || b;
  return `von ${one.name} ${one.year}`;
}

function resolveYearBounds(year, months, entryDate, exitDate) {
  const y = Number(year) || new Date().getFullYear();
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;

  let start = entryDate && entryDate.startsWith(String(y)) ? entryDate : yearStart;
  let end = exitDate && exitDate.startsWith(String(y)) ? exitDate : yearEnd;

  if (months.length) {
    const sorted = [...months].sort((a, b) => monthToNumeric(a) - monthToNumeric(b));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const [fy, fm] = first.split("-").map(Number);
    const [ly, lm] = last.split("-").map(Number);
    const calcStart = `${fy}-${String(fm).padStart(2, "0")}-01`;
    const lastDay = new Date(ly, lm, 0).getDate();
    const calcEnd = `${ly}-${String(lm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    if (!entryDate || entryDate < calcStart) start = calcStart;
    if (!exitDate || exitDate > calcEnd) end = calcEnd;
  }

  if (start > end) end = start;
  return { start, end };
}

function emptyAnnualTotals() {
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

function addPayrollToTotals(totals, payroll) {
  if (!payroll) return totals;
  totals.gross += Number(payroll.gross) || 0;
  totals.taxGross += Number(payroll.taxGross ?? payroll.gross) || 0;
  totals.svGross += Number(payroll.svGross ?? payroll.gross) || 0;
  totals.payrollTax += Number(payroll.payrollTax) || 0;
  totals.solidarity += Number(payroll.solidarity) || 0;
  totals.churchTax += Number(payroll.churchTax) || 0;
  totals.pension += Number(payroll.pension) || 0;
  totals.health += Number(payroll.health) || 0;
  totals.care += Number(payroll.care) || 0;
  totals.unemployment += Number(payroll.unemployment) || 0;
  totals.svTotal += Number(payroll.svTotal) || (
    (Number(payroll.pension) || 0)
    + (Number(payroll.health) || 0)
    + (Number(payroll.care) || 0)
    + (Number(payroll.unemployment) || 0)
  );
  totals.employerShare += Number(payroll.employerShare) || 0;
  totals.net += Number(payroll.net) || 0;
  totals.hours += Number(payroll.hours) || 0;
  totals.monthsCount += 1;
  return totals;
}

function buildAnnualCertificateData(options = {}) {
  const {
    year,
    employeeName,
    employeeId,
    employeeTaxId,
    employeeInsuranceNo,
    employeeBirthDate,
    employeeEntryDate,
    employeeExitDate,
    employeeAddress,
    seller,
    taxClass,
    churchTaxRate,
    childAllowanceFactor,
    history = {},
    currentMonth,
    currentProfile,
    calculateMonthPayroll,
  } = options;

  const y = Number(year) || new Date().getFullYear();
  const records = history[employeeName] || {};
  const monthKeys = Object.keys(records)
    .filter((m) => /^\d{4}-\d{2}$/.test(m) && monthInYear(m, y))
    .sort((a, b) => monthToNumeric(a) - monthToNumeric(b));

  const totals = emptyAnnualTotals();
  const monthDetails = [];

  monthKeys.forEach((monthKey) => {
    const record = records[monthKey];
    let payroll = record?.payrollSnapshot;
    if (!payroll && typeof calculateMonthPayroll === "function") {
      payroll = calculateMonthPayroll(record, monthKey);
    }
    if (payroll) {
      addPayrollToTotals(totals, payroll);
      totals.months.push(monthKey);
      monthDetails.push({ month: monthKey, payroll });
    }
  });

  const currentMonthKey = currentMonth || "";
  if (
    currentMonthKey
    && monthInYear(currentMonthKey, y)
    && !totals.months.includes(currentMonthKey)
    && typeof calculateMonthPayroll === "function"
    && currentProfile
  ) {
    const payroll = calculateMonthPayroll({ ...currentProfile, payrollMonth: currentMonthKey }, currentMonthKey);
    addPayrollToTotals(totals, payroll);
    totals.months.push(currentMonthKey);
    monthDetails.push({ month: currentMonthKey, payroll, isCurrent: true });
  }

  const bounds = resolveYearBounds(y, totals.months, employeeEntryDate, employeeExitDate);
  const certPeriod = formatCertPeriod(bounds.start, bounds.end);
  const certPeriodLabel = formatCertPeriodVonBis(bounds.start, bounds.end);

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
    empty2: "",
    empty7: "",
    empty8: "",
    empty9: "",
    empty12: "",
    empty13: "",
    empty14: "",
    empty19: "",
    empty20: "",
    empty24: "",
    empty25: "",
    empty26: "",
    empty27: "",
  };

  return {
    year: y,
    employeeName,
    employeeId,
    employeeTaxId,
    employeeInsuranceNo,
    employeeBirthDate,
    employeeEntryDate,
    employeeExitDate,
    employeeAddress,
    seller,
    taxClass,
    churchTaxRate,
    childAllowanceFactor,
    certPeriod,
    certPeriodLabel,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    totals,
    monthDetails,
    rows: LSTB_ROWS.map((row) => ({
      ...row,
      value: rowValues[row.key] ?? (row.money ? 0 : ""),
    })),
    hasData: totals.monthsCount > 0,
  };
}

if (typeof window !== "undefined") {
  window.AnnualCertificate = {
    LSTB_ROWS,
    buildAnnualCertificateData,
    formatCertPeriod,
    formatCertPeriodVonBis,
  };
}
