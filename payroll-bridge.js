/**
 * BMF-PAP 2026 + SV 2026 – klassisches Skript (file://-fähig, ohne ES-Module).
 * Nutzt vendor/pap-standalone.js (PapLib).
 */
(function initPayrollBridge() {
  const TAX_CLASS_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

  const SV_2026 = {
    pension: 9.3,
    health: 7.3,
    care: 1.8,
    careChildless: 2.4,
    unemployment: 1.3,
    healthAdditionalDefault: 2.9,
    ceilings: {
      pension: 8050,
      health: 5512.5,
      care: 5512.5,
      unemployment: 8050,
    },
  };

  function eurosToCent(value) {
    return Math.round(Number(value || 0) * 100);
  }

  function centToEuros(value) {
    return Number(value || 0) / 100;
  }

  function cappedBase(gross, ceiling) {
    return Math.min(Number(gross) || 0, ceiling);
  }

  function calculateSocialInsurance(gross, options = {}) {
    const childless = Boolean(options.childlessOver23);
    const zusatz = Number(options.healthAdditional) || SV_2026.healthAdditionalDefault;
    const privateHealth = Boolean(options.privateHealth);

    const pensionBase = cappedBase(gross, SV_2026.ceilings.pension);
    const healthBase = cappedBase(gross, SV_2026.ceilings.health);
    const careBase = cappedBase(gross, SV_2026.ceilings.care);
    const unemploymentBase = cappedBase(gross, SV_2026.ceilings.unemployment);

    const pensionRate = Number(options.pensionPercent) || SV_2026.pension;
    const healthRate = privateHealth
      ? 0
      : (Number(options.healthPercent) || SV_2026.health + zusatz / 2);
    const careRate = childless
      ? (Number(options.carePercent) || SV_2026.careChildless)
      : (Number(options.carePercent) || SV_2026.care);
    const unemploymentRate = Number(options.unemploymentPercent) || SV_2026.unemployment;

    const pension = pensionBase * (pensionRate / 100);
    const health = healthBase * (healthRate / 100);
    const care = careBase * (careRate / 100);
    const unemployment = unemploymentBase * (unemploymentRate / 100);
    const employeeTotal = pension + health + care + unemployment;

    return {
      pensionBase,
      healthBase,
      careBase,
      unemploymentBase,
      pension,
      health,
      care,
      unemployment,
      employeeTotal,
      employerTotal: employeeTotal,
      rates: {
        pensionPercent: pensionRate,
        healthPercent: healthRate,
        carePercent: careRate,
        unemploymentPercent: unemploymentRate,
        healthAdditionalPercent: zusatz,
      },
    };
  }

  function calculatePapTax(gross, options = {}) {
    if (typeof PapLib === "undefined" || typeof PapLib.calculate !== "function") {
      return {
        payrollTax: 0,
        solidarity: 0,
        churchTax: 0,
        churchTaxRate: Number(options.churchTaxRate) || 0,
        method: "SV-only-fallback",
      };
    }

    const taxClass = TAX_CLASS_MAP[options.taxClass] || 1;
    const churchRate = Number(options.churchTaxRate) || 0;
    const zusatz = Number(options.healthAdditional) || SV_2026.healthAdditionalDefault;

    const papInputs = {
      LZZ: 2,
      RE4: eurosToCent(gross),
      STKL: taxClass,
      KVZ: zusatz,
      PVZ: options.childlessOver23 ? 1 : 0,
      R: churchRate > 0 ? 1 : 0,
      KRV: 0,
      ALV: 0,
      PKV: options.privateHealth ? 1 : 0,
      LZZFREIB: eurosToCent(options.taxAllowanceMonthly || 0),
      ZKF: Number(options.childAllowanceFactor) || 0,
    };

    if (taxClass === 4 && options.factorMethod) {
      papInputs.af = 1;
      papInputs.f = Number(options.factorValue) || 1;
    }

    const pap = PapLib.calculate(2026, papInputs);
    const payrollTax = centToEuros(pap.LSTLZZ);
    const solidarity = centToEuros(pap.SOLZLZZ);
    const churchTax = churchRate > 0 ? payrollTax * (churchRate / 100) : 0;

    return {
      payrollTax,
      solidarity,
      churchTax,
      churchTaxRate: churchRate,
      pap,
      method: "BMF-PAP-2026",
    };
  }

  function resolveTaxBase(gross, taxGross, svGross, allTaxFree = false) {
    if (allTaxFree) return 0;
    const amount = Number(gross) || 0;
    const tax = taxGross != null ? Number(taxGross) : NaN;
    const sv = svGross != null ? Number(svGross) : NaN;
    if (!Number.isNaN(tax) && tax > 0) return tax;
    if (!Number.isNaN(sv) && sv > 0) return sv;
    return amount;
  }

  function resolveSvBase(gross, svGross, allSvFree = false) {
    if (allSvFree) return 0;
    const amount = Number(gross) || 0;
    const sv = svGross != null ? Number(svGross) : NaN;
    if (!Number.isNaN(sv) && sv > 0) return sv;
    return amount;
  }

  function calculateRealPayroll(gross, options = {}) {
    const amount = Number(gross) || 0;
    const taxBase = resolveTaxBase(amount, options.taxGross, options.svGross, options.allTaxFree);
    const svBase = resolveSvBase(amount, options.svGross, options.allSvFree);
    const sv = calculateSocialInsurance(svBase, options);
    const tax = calculatePapTax(taxBase, options);
    const employeeDeductions = tax.payrollTax + tax.solidarity + tax.churchTax + sv.employeeTotal;
    const net = amount - employeeDeductions;

    return {
      gross: amount,
      taxGross: taxBase,
      svGross: svBase,
      ...sv,
      svTotal: sv.employeeTotal,
      employerShare: sv.employerTotal,
      payrollTax: tax.payrollTax,
      solidarity: tax.solidarity,
      churchTax: tax.churchTax,
      churchTaxRate: tax.churchTaxRate,
      employeeDeductions,
      net,
      taxMethod: tax.method,
      pap: tax.pap,
      rates: sv.rates,
      payrollTaxPercent: amount > 0 ? (tax.payrollTax / amount) * 100 : 0,
    };
  }

  function formatDatevMonth(monthValue) {
    if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return "";
    const [year, month] = monthValue.split("-");
    return `01.${month}.${year}`;
  }

  function buildDatevIni() {
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

  const DATEV_WAGE_TYPES = {
    gross: 2000,
    tax: 3100,
    church: 3150,
    soli: 3120,
    health: 4200,
    pension: 4300,
    care: 4400,
    unemployment: 4500,
  };

  function buildDatevMovementLines(profile, month, mandantName) {
    const wageItems = Array.isArray(profile.wageItems) ? profile.wageItems : [];
    const grossFromItems = wageItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gross = grossFromItems > 0 ? grossFromItems : Number(profile.grossSalary) || 0;
    const payroll = calculateRealPayroll(gross, {
      taxGross: profile.taxGross,
      svGross: profile.svGross,
      taxClass: profile.taxClass,
      churchTaxRate: Number(profile.churchTaxRate) || 0,
      childlessOver23: Boolean(profile.childlessPvSurcharge),
      healthAdditional: Number(profile.healthAdditionalPercent) || SV_2026.healthAdditionalDefault,
      privateHealth: profile.healthFund === "Private Krankenversicherung",
      taxAllowanceMonthly: Number(profile.taxAllowanceMonthly) || 0,
      childAllowanceFactor: Number(profile.childAllowanceFactor) || 0,
      pensionPercent: Number(profile.pensionPercent),
      healthPercent: Number(profile.healthPercent),
      carePercent: Number(profile.carePercent),
      unemploymentPercent: Number(profile.unemploymentPercent),
    });

    const datevMonth = formatDatevMonth(month);
    const pers = profile.employeeId || "";
    const name = profile.employeeName || "";
    const fmt = (v) => v.toFixed(2).replace(".", ",");

    const rows = [];
    if (wageItems.length) {
      wageItems.forEach((item) => {
        const code = Number(item.code) || DATEV_WAGE_TYPES.gross;
        const amount = Number(item.amount) || 0;
        if (amount !== 0) rows.push([pers, code, fmt(amount), datevMonth, name]);
      });
    } else {
      rows.push([pers, DATEV_WAGE_TYPES.gross, fmt(payroll.gross), datevMonth, name]);
    }

    rows.push(
      [pers, DATEV_WAGE_TYPES.tax, fmt(-payroll.payrollTax), datevMonth, name],
      [pers, DATEV_WAGE_TYPES.soli, fmt(-payroll.solidarity), datevMonth, name],
      [pers, DATEV_WAGE_TYPES.health, fmt(-payroll.health), datevMonth, name],
      [pers, DATEV_WAGE_TYPES.pension, fmt(-payroll.pension), datevMonth, name],
      [pers, DATEV_WAGE_TYPES.care, fmt(-payroll.care), datevMonth, name],
      [pers, DATEV_WAGE_TYPES.unemployment, fmt(-payroll.unemployment), datevMonth, name]
    );

    if (payroll.churchTax > 0) {
      rows.push([pers, DATEV_WAGE_TYPES.church, fmt(-payroll.churchTax), datevMonth, name]);
    }

    return rows.map((row) => row.join(";"));
  }

  function buildDatevStammLine(profile) {
    const parts = [
      profile.employeeId || "",
      profile.employeeName || "",
      profile.employeeTaxId || "",
      profile.employeeInsuranceNo || "",
      profile.taxClass || "I",
      profile.bankIban || "",
      profile.bankBic || "",
      profile.bankName || "",
    ];
    return parts.join(";");
  }

  try {
    const papReady = typeof PapLib !== "undefined" && typeof PapLib.calculate === "function";
    window.PayrollEngine = {
      SV_2026,
      calculateRealPayroll,
      calculateSocialInsurance,
      calculatePapTax,
      buildDatevIni,
      buildDatevMovementLines,
      buildDatevStammLine,
      formatDatevMonth,
      DATEV_WAGE_TYPES,
      ready: papReady,
      error: papReady ? null : "PapLib nicht geladen",
    };
  } catch (error) {
    console.error("PayrollBridge Fehler:", error);
    window.PayrollEngine = { ready: false, error: String(error?.message || error) };
  }

  window.dispatchEvent(new Event("payroll-engine-ready"));
})();
