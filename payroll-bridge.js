/**
 * BMF-PAP 2026 + SV 2026 – klassisches Skript (file://-fähig, ohne ES-Module).
 * Nutzt vendor/pap-standalone.js (PapLib).
 * SV: BBG, AG/AN-Trennung, Minijob, Midijob/Übergangsbereich (§ 20 Abs. 2a SGB IV).
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
      /** BE Gesamt = a·AE − b (Bundesanzeiger 2026) */
      beGesamtA: 1.145937223,
      beGesamtB: 291.8744452,
      /** BE AN = a·AE − b */
      beAnA: 1.431639227,
      beAnB: 863.2784538,
    },
    /** Arbeitgeber-Umlagen (Durchschnitt / konfigurierbar je KK) */
    umlagen: {
      u1: 1.1,
      u2: 0.49,
      insolvency: 0.15,
    },
    /** 2026 West/Ost BBG angeglichen – Feld für spätere Jahre */
    regionDefault: "west",
  };

  function eurosToCent(value) {
    return Math.round(Number(value || 0) * 100);
  }

  function centToEuros(value) {
    return Number(value || 0) / 100;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function cappedBase(gross, ceiling) {
    return Math.min(Number(gross) || 0, ceiling);
  }

  /** employmentType: auto | regular | mini | midi
   *  auto = never infer Minijob from one month's gross (contract status).
   *  Uses Midijob only in Übergangsbereich; otherwise full SV.
   */
  function resolveEmploymentType(gross, options = {}) {
    const forced = String(options.employmentType || "auto").toLowerCase();
    if (forced === "regular" || forced === "mini" || forced === "midi") return forced;
    const ae = Number(gross) || 0;
    if (ae <= 0) return "regular";
    // Minijob is a Beschäftigungsart – never auto from low monthly hours/gross
    if (ae > SV_2026.minijob.ceiling && ae <= SV_2026.midijob.upper) return "midi";
    return "regular";
  }

  function midiBases(ae) {
    const m = SV_2026.midijob;
    const amount = Number(ae) || 0;
    if (amount < m.lower) {
      return { beGesamt: round2(amount * m.factorF), beAn: 0 };
    }
    return {
      beGesamt: round2(m.beGesamtA * amount - m.beGesamtB),
      beAn: round2(m.beAnA * amount - m.beAnB),
    };
  }

  function calculateSocialInsurance(gross, options = {}) {
    const childless = Boolean(options.childlessOver23);
    const zusatz = Number(options.healthAdditional) || SV_2026.healthAdditionalDefault;
    const privateHealth = Boolean(options.privateHealth);
    const employmentType = resolveEmploymentType(gross, options);
    const ae = Number(gross) || 0;

    const pensionBaseAe = cappedBase(ae, SV_2026.ceilings.pension);
    const healthBaseAe = cappedBase(ae, SV_2026.ceilings.health);
    const careBaseAe = cappedBase(ae, SV_2026.ceilings.care);
    const unemploymentBaseAe = cappedBase(ae, SV_2026.ceilings.unemployment);

    const pensionAnRate = Number(options.pensionPercent) || SV_2026.pension;
    const healthAnRate = privateHealth
      ? 0
      : (Number(options.healthPercent) || SV_2026.health + zusatz / 2);
    const careAnRate = childless
      ? (Number(options.carePercent) || SV_2026.careChildless)
      : (Number(options.carePercent) || SV_2026.care);
    const careAgRate = SV_2026.care; // Kinderlosenzuschlag nur AN
    const unemploymentAnRate = Number(options.unemploymentPercent) || SV_2026.unemployment;

    let pension = 0;
    let health = 0;
    let care = 0;
    let unemployment = 0;
    let employerPension = 0;
    let employerHealth = 0;
    let employerCare = 0;
    let employerUnemployment = 0;
    let pensionBase = pensionBaseAe;
    let healthBase = healthBaseAe;
    let careBase = careBaseAe;
    let unemploymentBase = unemploymentBaseAe;

    if (employmentType === "mini") {
      const rvExempt = Boolean(options.minijobRvExempt);
      pensionBase = pensionBaseAe;
      healthBase = 0;
      careBase = 0;
      unemploymentBase = 0;
      pension = rvExempt ? 0 : round2(pensionBaseAe * (SV_2026.minijob.rvEmployee / 100));
      health = 0;
      care = 0;
      unemployment = 0;
      employerPension = round2(pensionBaseAe * (SV_2026.minijob.employerRvFlat / 100));
      employerHealth = privateHealth ? 0 : round2(pensionBaseAe * (SV_2026.minijob.employerKvFlat / 100));
      employerCare = 0;
      employerUnemployment = 0;
    } else if (employmentType === "midi") {
      const { beGesamt, beAn } = midiBases(ae);
      pensionBase = beGesamt;
      healthBase = privateHealth ? 0 : beGesamt;
      careBase = beGesamt;
      unemploymentBase = beGesamt;

      const beGesamtP = Math.min(beGesamt, SV_2026.ceilings.pension);
      const beGesamtH = privateHealth ? 0 : Math.min(beGesamt, SV_2026.ceilings.health);
      const beGesamtC = Math.min(beGesamt, SV_2026.ceilings.care);
      const beGesamtU = Math.min(beGesamt, SV_2026.ceilings.unemployment);
      const beAnP = Math.min(beAn, SV_2026.ceilings.pension);
      const beAnH = privateHealth ? 0 : Math.min(beAn, SV_2026.ceilings.health);
      const beAnC = Math.min(beAn, SV_2026.ceilings.care);
      const beAnU = Math.min(beAn, SV_2026.ceilings.unemployment);

      const rvTotalRate = pensionAnRate * 2;
      const kvTotalRate = privateHealth ? 0 : (SV_2026.health * 2 + zusatz);
      const pvTotalRate = SV_2026.care * 2; // ohne Kinderlosenzuschlag
      const avTotalRate = unemploymentAnRate * 2;

      const rvTotal = beGesamtP * (rvTotalRate / 100);
      const kvTotal = beGesamtH * (kvTotalRate / 100);
      const pvTotal = beGesamtC * (pvTotalRate / 100);
      const avTotal = beGesamtU * (avTotalRate / 100);

      pension = round2(beAnP * (pensionAnRate / 100));
      health = round2(beAnH * (healthAnRate / 100));
      care = round2(beAnC * (careAnRate / 100));
      unemployment = round2(beAnU * (unemploymentAnRate / 100));

      employerPension = round2(rvTotal - beAnP * (pensionAnRate / 100));
      employerHealth = round2(kvTotal - beAnH * (healthAnRate / 100));
      // AG-PV ohne Kinderlosenzuschlag; Zuschlag bleibt vollständig beim AN
      employerCare = round2(pvTotal - beAnC * (careAgRate / 100));
      employerUnemployment = round2(avTotal - beAnU * (unemploymentAnRate / 100));
    } else {
      pension = round2(pensionBaseAe * (pensionAnRate / 100));
      health = round2(healthBaseAe * (healthAnRate / 100));
      care = round2(careBaseAe * (careAnRate / 100));
      unemployment = round2(unemploymentBaseAe * (unemploymentAnRate / 100));
      employerPension = round2(pensionBaseAe * (pensionAnRate / 100));
      employerHealth = round2(healthBaseAe * (healthAnRate / 100));
      employerCare = round2(careBaseAe * (careAgRate / 100));
      employerUnemployment = round2(unemploymentBaseAe * (unemploymentAnRate / 100));
    }

    const employeeTotal = round2(pension + health + care + unemployment);

    const u1Rate = Number(options.umlageU1);
    const u2Rate = Number(options.umlageU2);
    const insoRate = Number(options.umlageInsolvency);
    const umlageU1Pct = Number.isFinite(u1Rate) ? u1Rate : SV_2026.umlagen.u1;
    const umlageU2Pct = Number.isFinite(u2Rate) ? u2Rate : SV_2026.umlagen.u2;
    const umlageInsoPct = Number.isFinite(insoRate) ? insoRate : SV_2026.umlagen.insolvency;
    const umlageBase = employmentType === "mini" ? pensionBaseAe : pensionBaseAe;
    const umlageU1 = ae > 0 ? round2(umlageBase * (umlageU1Pct / 100)) : 0;
    const umlageU2 = ae > 0 ? round2(umlageBase * (umlageU2Pct / 100)) : 0;
    const umlageInsolvency = ae > 0 ? round2(umlageBase * (umlageInsoPct / 100)) : 0;
    const umlagenTotal = round2(umlageU1 + umlageU2 + umlageInsolvency);

    const employerTotal = round2(
      employerPension + employerHealth + employerCare + employerUnemployment + umlagenTotal
    );

    return {
      pensionBase,
      healthBase,
      careBase,
      unemploymentBase,
      pension,
      health,
      care,
      unemployment,
      employerPension,
      employerHealth,
      employerCare,
      employerUnemployment,
      umlageU1,
      umlageU2,
      umlageInsolvency,
      umlagenTotal,
      employeeTotal,
      employerTotal,
      employmentType,
      rates: {
        pensionPercent: employmentType === "mini" ? (options.minijobRvExempt ? 0 : SV_2026.minijob.rvEmployee) : pensionAnRate,
        healthPercent: employmentType === "mini" ? 0 : healthAnRate,
        carePercent: employmentType === "mini" ? 0 : careAnRate,
        unemploymentPercent: employmentType === "mini" ? 0 : unemploymentAnRate,
        healthAdditionalPercent: zusatz,
        employerCarePercent: careAgRate,
        umlageU1Percent: umlageU1Pct,
        umlageU2Percent: umlageU2Pct,
        umlageInsolvencyPercent: umlageInsoPct,
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
        churchTaxBase: 0,
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
    // BK = Bemessungsgrundlage Kirchenlohnsteuer (Cent) laut BMF-PAP
    const churchTaxBase = centToEuros(pap.BK != null ? pap.BK : pap.LSTLZZ);
    const churchTax = churchRate > 0 ? round2(churchTaxBase * (churchRate / 100)) : 0;

    return {
      payrollTax: round2(payrollTax),
      solidarity: round2(solidarity),
      churchTax,
      churchTaxRate: churchRate,
      churchTaxBase: round2(churchTaxBase),
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
    let taxOpts = { ...options };
    const svBase = resolveSvBase(amount, options.svGross, options.allSvFree);
    const employmentType = resolveEmploymentType(svBase, options);

    // Minijob: Standard Pauschalversteuerung → keine individuelle Lohnsteuer beim AN
    if (employmentType === "mini" && options.minijobTaxable !== true && !options.allTaxFree) {
      taxOpts = { ...taxOpts, allTaxFree: true };
    }

    const taxBase = resolveTaxBase(amount, options.taxGross, options.svGross, taxOpts.allTaxFree);
    const sv = calculateSocialInsurance(svBase, { ...options, employmentType });
    const tax = calculatePapTax(taxBase, taxOpts);
    const employeeDeductions = round2(
      tax.payrollTax + tax.solidarity + tax.churchTax + sv.employeeTotal
    );
    const net = round2(amount - employeeDeductions);

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
      churchTaxBase: tax.churchTaxBase,
      employeeDeductions,
      net,
      taxMethod: tax.method,
      pap: tax.pap,
      rates: sv.rates,
      employmentType,
      legalRatesApplied: true,
      payrollTaxPercent: amount > 0 ? round2((tax.payrollTax / amount) * 100) : 0,
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
      resolveEmploymentType,
      midiBases,
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
