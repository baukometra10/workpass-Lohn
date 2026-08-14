/**
 * Gesetzliche Sätze – Fallback 2026, live aus Tax Rules Engine nach Beleg-/Abrechnungsdatum.
 * Die Buchhaltung liest keine Gesetze; getLegalConfigForDate() fragt den Engine.
 */
const LEGAL_CONFIG = {
  year: 2026,
  version: "2026.1",

  vat: {
    standard: 19,
    reduced: 7,
    zero: 0,
    rates: [
      { value: 0, label: "0 % (steuerfrei / Kleinunternehmer)" },
      { value: 7, label: "7 % (ermäßigt)" },
      { value: 19, label: "19 % (Regelsteuersatz)" },
    ],
  },

  socialSecurity: {
    // Arbeitnehmeranteile (Hälfte des Gesamtbeitragssatzes)
    pension: { total: 18.6, employee: 9.3, label: "Rentenversicherung (RV)" },
    health: { total: 14.6, employee: 7.3, label: "Krankenversicherung (KV)" },
    care: {
      total: 3.6,
      employee: 1.8,
      employeeChildless: 2.4, // +0,6 % Zuschlag kinderlos ab 23 J. – nur AN
      employer: 1.8,
      label: "Pflegeversicherung (PV)",
    },
    unemployment: { total: 2.6, employee: 1.3, label: "Arbeitslosenversicherung (AV)" },
    // Durchschnittlicher Zusatzbeitrag Krankenkassen 2026 (BMF PAP: 2,9 %)
    healthAdditionalAvg: 2.9,
    contributionCeiling: {
      pensionWest: 8050,
      pensionEast: 8050,
      health: 5512.5,
      care: 5512.5,
      unemployment: 8050,
    },
    // Geringfügig / Übergangsbereich 2026 (SGB IV)
    minijob: {
      ceiling: 603,
      rvEmployee: 3.6,
      employerKvFlat: 13,
      employerRvFlat: 15,
    },
    midijob: {
      lower: 603.01,
      upper: 2000,
      factorF: 0.6619,
      beGesamtA: 1.145937223,
      beGesamtB: 291.8744452,
      beAnA: 1.431639227,
      beAnB: 863.2784538,
    },
    umlagen: {
      u1: 1.1,
      u2: 0.49,
      insolvency: 0.15,
    },
    regionDefault: "west",
  },

  tax: {
    method: "BMF-PAP-2026",
    churchTaxRates: [
      { value: 0, label: "Keine Kirchensteuer" },
      { value: 8, label: "8 % (BY, BW)" },
      { value: 9, label: "9 % (übrige Bundesländer)" },
    ],
  },

  invoice: {
    requiredFields: [
      "seller",
      "customer",
      "invoiceNumber",
      "invoiceDate",
      "items",
    ],
    defaultPaymentDays: 14,
    defaultNote: "Zahlbar ohne Abzug innerhalb von 14 Tagen.",
    legalNote:
      "Gemäß § 14 UStG enthält diese Rechnung alle Pflichtangaben. Bei Kleinunternehmerregelung nach § 19 UStG entfällt die Ausweisung der Umsatzsteuer.",
  },
};

const PAYROLL_LAYOUTS = {
  datev: {
    id: "datev",
    name: "DATEV Lohn BLG (LOHN17)",
    description: "Originalformular DATEV – Referenz Mustermann Juli 2025, 1:1 wie LOHN17.",
    className: "layout-datev",
    family: "datev",
    referenceDemo: "datev",
  },
};

function getLegalConfigForDate(asOf) {
  const fallback = LEGAL_CONFIG;
  try {
    const eng = typeof window !== "undefined" ? window.TaxRulesEngine : null;
    const live = eng?.legalConfig
      ? eng.legalConfig({ asOf: asOf || "", country: "DE" })
      : null;
    if (!live?.socialSecurity) return fallback;
    return {
      year: live.year || fallback.year,
      version: live.version || fallback.version,
      rulesetId: live.rulesetId || fallback.rulesetId,
      asOf: live.asOf || asOf || fallback.asOf,
      vat: live.vat ? { ...fallback.vat, ...live.vat } : fallback.vat,
      socialSecurity: { ...fallback.socialSecurity, ...live.socialSecurity },
      tax: { ...fallback.tax, ...(live.tax || {}) },
      invoice: fallback.invoice,
    };
  } catch {
    return fallback;
  }
}

function getLegalEmployeeRates(options = {}) {
  const cfg = getLegalConfigForDate(options.asOf || options.payrollMonth || options.period);
  const ss = cfg.socialSecurity;
  const childless = Boolean(options.childlessOver23);
  const zusatz = Number(options.healthAdditional) || ss.healthAdditionalAvg;

  return {
    pensionPercent: ss.pension.employee,
    healthPercent: ss.health.employee + zusatz / 2,
    healthBasePercent: ss.health.employee,
    healthAdditionalPercent: zusatz / 2,
    carePercent: childless ? ss.care.employeeChildless : ss.care.employee,
    unemploymentPercent: ss.unemployment.employee,
    employerPensionPercent: ss.pension.employee,
    employerHealthPercent: ss.health.employee + zusatz / 2,
    employerCarePercent: ss.care.employer || ss.care.employee,
    employerUnemploymentPercent: ss.unemployment.employee,
    papYear: cfg.year,
    rulesetId: cfg.rulesetId || "",
    asOf: cfg.asOf || "",
  };
}

function applyContributionCeiling(gross, ceiling) {
  return Math.min(gross, ceiling);
}

function buildPayrollOptions(options = {}) {
  const month = options.payrollMonth || options.asOf || options.period || "";
  return {
    taxClass: options.taxClass || "I",
    churchTaxRate: Number(options.churchTaxRate) || 0,
    childlessOver23: Boolean(options.childlessOver23),
    healthAdditional: Number(options.healthAdditional)
      || getLegalConfigForDate(month).socialSecurity.healthAdditionalAvg,
    privateHealth: Boolean(options.privateHealth),
    taxAllowanceMonthly: Number(options.taxAllowanceMonthly) || 0,
    childAllowanceFactor: Number(options.childAllowanceFactor) || 0,
    factorMethod: Boolean(options.factorMethod),
    factorValue: Number(options.factorValue) || 1,
    pensionPercent: Number(options.pensionPercent),
    healthPercent: Number(options.healthPercent),
    carePercent: Number(options.carePercent),
    unemploymentPercent: Number(options.unemploymentPercent),
    taxGross: options.taxGross,
    svGross: options.svGross,
    allTaxFree: Boolean(options.allTaxFree),
    allSvFree: Boolean(options.allSvFree),
    employmentType: options.employmentType || "auto",
    minijobRvExempt: Boolean(options.minijobRvExempt),
    minijobTaxable: Boolean(options.minijobTaxable),
    country: options.country || "DE",
    payrollMonth: options.payrollMonth || month,
    asOf: options.asOf || month,
    period: options.period || month,
  };
}

function calculateLegalPayroll(gross, options = {}) {
  if (typeof window !== "undefined" && window.PayrollEngine?.calculateRealPayroll) {
    return window.PayrollEngine.calculateRealPayroll(gross, buildPayrollOptions(options));
  }

  const rates = getLegalEmployeeRates(options);
  const ss = LEGAL_CONFIG.socialSecurity;
  const pensionBase = applyContributionCeiling(gross, ss.contributionCeiling.pensionWest);
  const healthBase = applyContributionCeiling(gross, ss.contributionCeiling.health);
  const careBase = applyContributionCeiling(gross, ss.contributionCeiling.care);
  const unemploymentBase = applyContributionCeiling(gross, ss.contributionCeiling.unemployment);
  const pension = pensionBase * (rates.pensionPercent / 100);
  const health = healthBase * (rates.healthPercent / 100);
  const care = careBase * (rates.carePercent / 100);
  const unemployment = unemploymentBase * (rates.unemploymentPercent / 100);
  const svTotal = pension + health + care + unemployment;
  const employerCare = careBase * ((ss.care.employer || ss.care.employee) / 100);
  const employerShare =
    pension + health + employerCare + unemployment;

  return {
    gross,
    pensionBase,
    healthBase,
    careBase,
    unemploymentBase,
    pension,
    health,
    care,
    unemployment,
    svTotal,
    employerCare,
    employerShare,
    payrollTax: 0,
    payrollTaxPercent: 0,
    solidarity: 0,
    churchTax: 0,
    churchTaxRate: 0,
    employeeDeductions: svTotal,
    net: gross - svTotal,
    rates,
    taxMethod: "SV-only-fallback",
  };
}

if (typeof window !== "undefined") {
  window.LEGAL_CONFIG = LEGAL_CONFIG;
  window.PAYROLL_LAYOUTS = PAYROLL_LAYOUTS;
  window.getLegalEmployeeRates = getLegalEmployeeRates;
  window.getLegalConfigForDate = getLegalConfigForDate;
  window.calculateLegalPayroll = calculateLegalPayroll;
}
