/**
 * PayrollCore – zentrale Lohnabrechnungs-Logik (DATEV LOHN17)
 * Unabhängig von der UI-Schale; von lohn.html und index.html genutzt.
 */
(function () {
  const DATEV_REFERENCE_DISPLAY = {
    gross: 3620,
    taxGross: 3500,
    svGross: 3500,
    payrollTax: 419.33,
    churchTax: 37.73,
    solidarity: 0,
    health: 323.58,
    pension: 325.5,
    unemployment: 45.5,
    care: 14,
    employeeDeductions: 1165.64,
    svTotal: 708.58,
    net: 2454.36,
    employerShare: 726.08,
    kkDisplay: 14.9,
    extraCosts: 123,
    totalCosts: 4469.08,
    taxIdMid: "0013",
    bankIbanDisplay: "DE03 7005 0000 0",
    pgrs: "101",
    bgrs: "1111",
    kkPctDisplay: "14,9+1,1",
  };

  const STORAGE_KEY = "finanzDokumentPayrollV1";
  const ARCHIVE_KEY = "finanzDokumentPayrollArchiveV1";
  const PLATFORM_KIND = "platform.payroll.v1";

  function num(value) {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function formatNumber(value) {
    return num(value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatAmountOrEmpty(value) {
    if (value == null || num(value) === 0) return "";
    return formatAmount(value);
  }

  function formatAmount(value) {
    return formatNumber(value);
  }

  function parseIsoDateParts(value) {
    const s = String(value || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  /** Deutsches Datum TT.MM.JJJJ (volle Jahreszahl auf dem Blatt) */
  function formatDateDE(value, fullYear = true) {
    const p = parseIsoDateParts(value);
    if (!p) return "";
    const dd = String(p.d).padStart(2, "0");
    const mm = String(p.m).padStart(2, "0");
    const yy = fullYear ? String(p.y) : String(p.y).slice(-2);
    return `${dd}.${mm}.${yy}`;
  }

  function formatDateShortDatev(value) {
    return formatDateDE(value, true);
  }

  function getPayrollMonthEndDate(monthValue) {
    if (!monthValue || !monthValue.includes("-")) return "";
    const [y, m] = monthValue.split("-").map(Number);
    const last = new Date(y, m, 0);
    const iso = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    return formatDateShortDatev(iso);
  }

  function taxClassToDisplay(value) {
    const map = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6" };
    return map[value] || String(value || "").replace(/\D/g, "") || "1";
  }

  function formatEmployeeSalutation(name) {
    const n = String(name || "").trim();
    if (!n) return "";
    if (/^(herr|frau|angestellter|angestellte)\b/i.test(n)) return n;
    return `Angestellter ${n}`;
  }

  function formatEmployerDatevLine(seller) {
    return String(seller || "").trim().replace(/\r\n/g, "\n");
  }

  function buildDatevUsaLine(state) {
    const client = String(state?.datevClientNo || state?.taxNumber || "").trim().slice(0, 12);
    const consultant = String(state?.datevConsultantNo || state?.vatId || "").replace(/\D/g, "").slice(0, 7);
    if (!client && !consultant) return "";
    return `${client || "—"}${consultant ? ` / ${consultant}` : ""}`;
  }

  function isNetOnlyDeduction(w) {
    const code = String(w?.code || "");
    const label = String(w?.label || "");
    const tax = String(w?.taxFlag || "L");
    const sv = String(w?.svFlag || "L");
    if (tax === "F" && (sv === "N" || sv === "F")) {
      if (/^99/.test(code) || /abzug|einbehalt|netto.?abzug|vwl.?an/i.test(label)) return true;
    }
    return false;
  }

  function summarizeWageRows(wages) {
    const list = Array.isArray(wages) ? wages : [];
    const earnings = list.filter((w) => !isNetOnlyDeduction(w));
    const netDedRows = list.filter((w) => isNetOnlyDeduction(w));
    const gross = earnings.reduce((s, i) => s + Math.max(0, num(i.amount)), 0);
    const taxGross = earnings.filter((i) => (i.taxFlag || "L") === "L").reduce((s, i) => s + Math.max(0, num(i.amount)), 0);
    const svGross = earnings.filter((i) => (i.svFlag || "L") === "L").reduce((s, i) => s + Math.max(0, num(i.amount)), 0);
    const netDeductionsFromWages = netDedRows.reduce((s, i) => s + Math.abs(num(i.amount)), 0);
    const allTaxFree = earnings.length > 0 && earnings.every((i) => i.taxFlag === "F" || i.taxFlag === "P");
    const allSvFree = earnings.length > 0 && earnings.every((i) => i.svFlag === "N");
    return { gross, taxGross, svGross, wages: list, earnings, netDeductionsFromWages, allTaxFree, allSvFree };
  }

  function resolveAssessmentBases(totals, gross) {
    let taxGross = totals.taxGross;
    let svGross = totals.svGross;
    if (!totals.wages.length && gross > 0) {
      return { taxGross: gross, svGross: gross, allTaxFree: false, allSvFree: false };
    }
    if (totals.allTaxFree) taxGross = 0;
    else if (taxGross <= 0 && gross > 0) taxGross = gross;
    if (totals.allSvFree) svGross = 0;
    else if (svGross <= 0 && gross > 0) svGross = gross;
    return { taxGross, svGross, allTaxFree: totals.allTaxFree, allSvFree: totals.allSvFree };
  }

  function buildCalcOptions(state) {
    return {
      taxClass: state.taxClass || "I",
      churchTaxRate: num(state.churchTaxRate),
      childlessOver23: Boolean(state.childlessPvSurcharge),
      healthAdditional: num(state.healthAdditionalPercent) || LEGAL_CONFIG.socialSecurity.healthAdditionalAvg,
      privateHealth: state.healthFund === "Private Krankenversicherung",
      taxAllowanceMonthly: num(state.taxAllowanceMonthly),
      childAllowanceFactor: num(state.childAllowanceFactor),
      factorMethod: Boolean(state.factorMethod),
      factorValue: num(state.factorValue),
      pensionPercent: num(state.pensionPercent),
      healthPercent: num(state.healthPercent),
      carePercent: num(state.carePercent),
      unemploymentPercent: num(state.unemploymentPercent),
      employmentType: state.employmentType || "auto",
      minijobRvExempt: Boolean(state.minijobRvExempt),
      minijobTaxable: Boolean(state.minijobTaxable),
    };
  }

  function calculate(state) {
    const wageTotals = summarizeWageRows(state.wageItems || []);
    const grossInput = num(state.grossSalary);
    let gross = wageTotals.gross || grossInput;
    if (gross <= 0 && grossInput > 0) gross = grossInput;
    const bases = resolveAssessmentBases(wageTotals, gross);
    const calcOptions = {
      ...buildCalcOptions(state),
      taxGross: bases.taxGross,
      svGross: bases.svGross,
      allTaxFree: bases.allTaxFree,
      allSvFree: bases.allSvFree,
    };
    const result = calculateLegalPayroll(gross, calcOptions);
    const svTotal = result.health + result.pension + result.care + result.unemployment;
    const extraNetDeductions = wageTotals.netDeductionsFromWages + Math.abs(num(state.netDeductions));
    const netBeforeExtra = result.net;
    const net = Math.round((netBeforeExtra - extraNetDeductions) * 100) / 100;
    return {
      ...result,
      wageItems: wageTotals.wages,
      taxGross: bases.taxGross,
      svGross: bases.svGross,
      svTotal,
      gross,
      netDeductions: extraNetDeductions,
      netBeforeDeductions: netBeforeExtra,
      net,
      hours: num(state.workHours),
      days: num(state.workDays),
      legalRatesApplied: Boolean(window.PayrollEngine?.ready),
      method: result.method || result.taxMethod || "BMF-PAP-2026",
    };
  }

  function applyReferenceOverrides(payroll, state) {
    const useRef = state?.meta?.referenceDemo === "datev" || Boolean(state?.useReferenceDisplay);
    if (!useRef) return payroll;
    if (String(state.employeeId || "").trim() !== "02006") return payroll;
    const ref = DATEV_REFERENCE_DISPLAY;
    const taxDed = ref.payrollTax + ref.solidarity + ref.churchTax;
    return {
      ...payroll,
      gross: ref.gross,
      taxGross: ref.taxGross,
      svGross: ref.svGross,
      payrollTax: ref.payrollTax,
      churchTax: ref.churchTax,
      solidarity: ref.solidarity,
      health: ref.health,
      pension: ref.pension,
      unemployment: ref.unemployment,
      care: ref.care,
      svTotal: ref.svTotal,
      net: ref.net,
      employerShare: ref.employerShare,
      employeeDeductions: taxDed + ref.svTotal,
    };
  }

  function formatMonthLabel(monthValue) {
    if (!monthValue || !String(monthValue).includes("-")) return "";
    const [year, month] = String(monthValue).split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatEmployerSenderLine(seller) {
    const lines = String(seller || "").trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return "";
    const first = lines[0];
    const last = lines[lines.length - 1];
    return lines.length > 1 && last !== first ? `${first} · ${last}` : first;
  }

  function buildHintsText(state) {
    const lines = [];
    const { hours, days } = resolveAttendance(state);
    if (days > 0) lines.push(`Arbeitstage: ${Math.round(days)}`);
    if (hours > 0) lines.push(`Stunden: ${formatNumber(hours)}`);
    if (String(state.taxClass || "").trim()) lines.push(`StKl ${taxClassToDisplay(state.taxClass)}`);
    if (Boolean(state.childlessPvSurcharge)) lines.push("PV-Zuschlag kinderlos");
    if (num(state.taxAllowanceMonthly) > 0) lines.push(`Freibetrag ${formatAmount(state.taxAllowanceMonthly)}/Mon.`);
    if (num(state.netDeductions) > 0) lines.push(`Netto-Abzüge ${formatAmount(state.netDeductions)}`);
    const note = String(state.note || "").trim();
    if (note) lines.push(note);
    return lines.join("\n");
  }

  /** Recover hours/days; heal legacy typo where hours were stored in workDays. */
  function resolveAttendance(state) {
    let hours = num(state.workHours);
    let days = num(state.workDays);
    if (hours <= 0 && days > 0 && (!Number.isInteger(days) || days > 31)) {
      hours = days;
      days = 0;
    }
    if (hours <= 0) {
      for (const w of state.wageItems || []) {
        const q = num(w.quantity ?? w.hours ?? w.anzahl ?? w.stunden);
        if (q > 1 || (q > 0 && num(w.factor ?? w.rate) > 0)) {
          hours = q;
          break;
        }
      }
    }
    if (days <= 0 && hours > 0 && Number.isInteger(hours) && hours <= 31) {
      // keep days empty – integer hours alone is not days
    }
    return { hours, days };
  }

  function formatKkPercent(state) {
    if (num(state.healthPercent) > 0) return formatNumber(num(state.healthPercent));
    const add = num(state.healthAdditionalPercent)
      || (window.LEGAL_CONFIG?.socialSecurity?.healthAdditionalAvg)
      || 2.9;
    const baseEmp = (window.LEGAL_CONFIG?.socialSecurity?.health?.employee) || 7.3;
    // Show employee KV share (half of 14.6 + half Zusatz) when KK known or SV applies
    if (String(state.healthFund || "").trim() || num(state.grossSalary) > 0 || (state.wageItems || []).length) {
      return formatNumber(baseEmp + add / 2);
    }
    return "";
  }

  function resolvePgrs(state) {
    const explicit = String(state.personengruppe || state.pgrs || "").trim();
    if (explicit) return explicit;
    const et = String(state.employmentType || "").toLowerCase();
    if (et === "minijob" || et === "geringfuegig" || et === "geringfügig") return "109";
    if (et === "midijob") return "101";
    // Regular SV-pflichtig – DATEV default
    if (String(state.employeeName || state.employeeId || "").trim()) return "101";
    return "";
  }

  function resolveBgrs(state) {
    const explicit = String(state.beitragsgruppe || state.bgrs || "").trim();
    if (explicit) return explicit;
    const et = String(state.employmentType || "").toLowerCase();
    if (et === "minijob" || et === "geringfuegig" || et === "geringfügig") return "6500";
    if (String(state.healthFund || "").trim() || num(state.grossSalary) > 0 || (state.wageItems || []).length) {
      return "1111"; // KV+RV+AV+PV voll
    }
    return "";
  }

  function buildSheetData(state, payroll, options) {
    const useRef = Boolean(options?.useReferenceDisplay || state?.meta?.referenceDemo === "datev");
    const imported = options?.importedTotals || state?.meta?.importedTotals || null;
    const ref = useRef && String(state.employeeId || "").trim() === "02006" ? DATEV_REFERENCE_DISPLAY : null;

    const pick = (key, fallback) => {
      if (ref && ref[key] != null) return ref[key];
      if (imported && imported[key] != null) return imported[key];
      return fallback;
    };

    const taxTotal = pick("payrollTax", payroll.payrollTax)
      + pick("churchTax", payroll.churchTax)
      + pick("solidarity", payroll.solidarity);
    const svTotal = pick("health", payroll.health)
      + pick("pension", payroll.pension)
      + pick("care", payroll.care)
      + pick("unemployment", payroll.unemployment);
    const gross = pick("gross", payroll.gross);
    const net = pick("net", payroll.net);
    const wages = state.wageItems || [];
    const empId = String(state.employeeId || "").trim();
    const badgeId = String(state.badgeId || state.meta?.badgeId || "").trim();
    const personnelNumber = String(state.personnelNumber || state.meta?.personnelNumber || "").trim();
    // Badge never on payslip; only optional personnel number
    const printPersNr = personnelNumber
      || (badgeId && empId && badgeId === empId ? "" : empId);
    const hideBadge = state.hideBadgeOnPayslip !== false;
    const extraCosts = wages
      .filter((w) => w.taxFlag === "P")
      .reduce((s, w) => s + num(w.amount), 0);

    const wageRows = wages
      .filter((w) => w.code || w.label || num(w.amount) > 0)
      .map((w) => {
        const qtyVal = num(w.quantity ?? w.hours ?? w.anzahl);
        let qty = "";
        if (qtyVal > 0 && qtyVal !== 1) {
          qty = Number.isInteger(qtyVal)
            ? String(qtyVal)
            : qtyVal.toLocaleString("de-DE", { maximumFractionDigits: 2 });
        }
        return {
          code: String(w.code || ""),
          label: String(w.label || ""),
          qty,
          amount: num(w.amount) > 0 ? formatAmount(w.amount) : "",
          taxFlag: String(w.taxFlag || "L"),
          svFlag: String(w.svFlag || "L"),
        };
      });

    const hasSheetContent = Boolean(
      state.employeeName || printPersNr || wageRows.length || String(state.seller || "").trim()
    );

    return {
      titleMonth: hasSheetContent && state.payrollMonth ? `für ${formatMonthLabel(state.payrollMonth)}` : "",
      usa: (state.seller || state.taxNumber || state.datevClientNo) ? buildDatevUsaLine(state) : "",
      headDate: hasSheetContent ? getPayrollMonthEndDate(state.payrollMonth) : "",
      headPage: hasSheetContent ? "Blatt: 1" : "",
      persNr: hideBadge ? printPersNr : (printPersNr || empId),
      badgeId: hideBadge ? "" : badgeId,
      birth: formatDateShortDatev(state.employeeBirthDate),
      stkl: (state.employeeName || empId) ? taxClassToDisplay(state.taxClass) : "",
      konf: (() => {
        const c = String(state.churchConfession || state.konfession || state.religion || "").trim().toLowerCase();
        if (c === "rk" || c === "römisch-katholisch" || c === "roemisch-katholisch" || c === "katholisch" || c === "rc") return "rk";
        if (c === "ev" || c === "evangelisch" || c === "protestant") return "ev";
        if (num(state.churchTaxRate) > 0) return c || "ev";
        return "";
      })(),
      stTg: (() => {
        const { days } = resolveAttendance(state);
        return days > 0 ? String(days) : "";
      })(),
      svNr: String(state.employeeInsuranceNo || ""),
      kkName: String(state.healthFund || ""),
      kkPct: useRef ? DATEV_REFERENCE_DISPLAY.kkPctDisplay : formatKkPercent(state),
      pgrs: ref ? ref.pgrs : resolvePgrs(state),
      bgrs: ref ? ref.bgrs : resolveBgrs(state),
      svTg: (() => {
        const { days } = resolveAttendance(state);
        return days > 0 ? String(days) : "";
      })(),
      vacPrev: "",
      vacEnt: "",
      workDays: (() => {
        const { days } = resolveAttendance(state);
        return days > 0 ? String(Math.round(days)) : "";
      })(),
      workHours: (() => {
        const { hours } = resolveAttendance(state);
        if (hours <= 0) return "";
        return Number.isInteger(hours)
          ? String(hours)
          : hours.toLocaleString("de-DE", { maximumFractionDigits: 2 });
      })(),
      sender: formatEmployerSenderLine(resolveEmployerSeller(state)),
      empMeta: (() => {
        if (!printPersNr) return "";
        const abt = String(state.departmentNo || "").trim();
        return abt
          ? `*Pers.-Nr. ${printPersNr}*  *Abt.-Nr. ${abt}*`
          : `*Pers.-Nr. ${printPersNr}*`;
      })(),
      empName: formatEmployeeSalutation(state.employeeName),
      empAddr: String(state.employeeAddress || "").trim(),
      entry: formatDateShortDatev(state.employeeEntryDate),
      taxIdMid: ref ? ref.taxIdMid : String(state.employeeTaxId || "").trim(),
      hints: buildHintsText(state),
      wageRows,
      grossTotal: formatAmountOrEmpty(gross),
      taxTotal: formatAmountOrEmpty(ref ? taxTotal : payroll.payrollTax + payroll.churchTax + payroll.solidarity),
      svTotal: formatAmountOrEmpty(ref ? DATEV_REFERENCE_DISPLAY.svTotal : svTotal),
      netAbzug: formatAmountOrEmpty(payroll.netDeductions),
      netVerdienst: formatAmountOrEmpty(net),
      netTotal: formatAmountOrEmpty(net),
      payout: formatAmountOrEmpty(net),
      calcMethod: payroll.legalRatesApplied ? "BMF PAP 2026" : "",
      stBrutto: formatAmountOrEmpty(pick("taxGross", payroll.taxGross || payroll.gross)),
      lst: formatAmountOrEmpty(pick("payrollTax", payroll.payrollTax)),
      kist: formatAmountOrEmpty(pick("churchTax", payroll.churchTax)),
      kvB: formatAmountOrEmpty(pick("svGross", payroll.svGross || payroll.gross)),
      rvB: formatAmountOrEmpty(pick("svGross", payroll.svGross || payroll.gross)),
      kvBeitrag: formatAmountOrEmpty(pick("health", payroll.health)),
      rvBeitrag: formatAmountOrEmpty(pick("pension", payroll.pension)),
      avBeitrag: formatAmountOrEmpty(pick("unemployment", payroll.unemployment)),
      pvBeitrag: formatAmountOrEmpty(pick("care", payroll.care)),
      vbGross: formatAmountOrEmpty(gross),
      vbTaxGross: formatAmountOrEmpty(pick("taxGross", payroll.taxGross || payroll.gross)),
      vbLst: formatAmountOrEmpty(pick("payrollTax", payroll.payrollTax)),
      vbKist: formatAmountOrEmpty(pick("churchTax", payroll.churchTax)),
      vbSoli: formatAmountOrEmpty(pick("solidarity", payroll.solidarity)),
      vbSvGross: formatAmountOrEmpty(pick("svGross", payroll.svGross || payroll.gross)),
      vbKv: formatAmountOrEmpty(pick("health", payroll.health)),
      vbRv: formatAmountOrEmpty(pick("pension", payroll.pension)),
      vbAv: formatAmountOrEmpty(pick("unemployment", payroll.unemployment)),
      vbPv: formatAmountOrEmpty(pick("care", payroll.care)),
      bank: String(state.bankName || "").trim(),
      konto: ref?.bankIbanDisplay
        ? `Konto ${ref.bankIbanDisplay}`
        : (state.bankIban ? `Konto ${String(state.bankIban).trim()}` : ""),
      agSv: formatAmountOrEmpty(pick("employerShare", payroll.employerShare)),
      agExtra: formatAmountOrEmpty(ref ? ref.extraCosts : extraCosts),
      agTotal: formatAmountOrEmpty(ref ? ref.totalCosts : (payroll.employerShare + gross + extraCosts) || 0),
      payHint: hasSheetContent
        ? (String(state.bankName || "").trim()
          ? `Überweisung · ${String(state.bankName).trim()}`
          : "Überweisung auf das angegebene Konto")
        : "",
      footerNote: hasSheetContent
        ? (String(state.note || "").trim() || buildHintsText(state) || "Keine weiteren Bemerkungen")
        : "",
      logoDataUrl: String(state.logoDataUrl || "").trim(),
      logoUrl: String(state.logoUrl || "").trim(),
      companyName: companyDisplayName(state),
    };
  }

  function defaultState() {
    return {
      documentType: "payroll",
      payrollLayout: "datev",
      seller: "",
      note: "",
      employeeName: "",
      employeeAddress: "",
      employeeId: "",
      badgeId: "",
      personnelNumber: "",
      hideBadgeOnPayslip: true,
      employeeTaxId: "",
      employeeInsuranceNo: "",
      employeeBirthDate: "",
      employeeEntryDate: "",
      payrollMonth: "",
      taxClass: "I",
      churchTaxRate: "0",
      churchConfession: "",
      healthFund: "",
      healthPercent: "",
      healthAdditionalPercent: "",
      childlessPvSurcharge: false,
      taxAllowanceMonthly: "",
      childAllowanceFactor: "",
      factorMethod: false,
      factorValue: "1",
      netDeductions: "",
      departmentNo: "",
      personengruppe: "",
      beitragsgruppe: "",
      workDays: "",
      workHours: "",
      grossSalary: "",
      bankName: "",
      bankIban: "",
      mandantId: "",
      companyName: "",
      taxNumber: "",
      logoDataUrl: "",
      logoUrl: "",
      hourlyRate: "",
      vatId: "",
      datevClientNo: "",
      datevConsultantNo: "",
      managingDirector: "",
      companyBankName: "",
      companyIban: "",
      wageItems: [],
      meta: {},
    };
  }

  function companyDisplayName(state) {
    const direct = String(state?.companyName || "").trim();
    if (direct && !/^ohne firma$/i.test(direct)) return direct;
    const fromSeller = String(state?.seller || "").trim().split(/\r?\n/).filter(Boolean)[0];
    if (fromSeller && !/^ohne firma$/i.test(fromSeller)) return fromSeller;
    const fromMeta = String(
      state?.meta?.companyName
      || state?.company?.name
      || state?.meta?.hubProfile?.companyName
      || ""
    ).trim();
    if (fromMeta) return fromMeta;
    return "Ohne Firma";
  }

  function resolveEmployerSeller(state) {
    const seller = String(state?.seller || "").trim();
    if (seller && !/^ohne firma$/i.test(seller.split(/\r?\n/)[0] || "")) return seller;
    const name = companyDisplayName(state);
    return name && name !== "Ohne Firma" ? name : "";
  }

  function archiveKey(state) {
    const company = String(state?.mandantId || state?.meta?.companyId || companyDisplayName(state) || "default")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const emp = String(state?.employeeId || "ohne-pers").trim();
    const month = String(state?.payrollMonth || "ohne-monat").trim();
    return `${company}::${emp}::${month}`;
  }

  function loadArchive() {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function saveArchive(archive) {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive || {}));
      return true;
    } catch {
      return false;
    }
  }

  function upsertArchiveEntry(state) {
    if (!state) return false;
    const hasContent = Boolean(
      String(state.employeeName || "").trim()
      || String(state.seller || "").trim()
      || String(state.companyName || "").trim()
      || (Array.isArray(state.wageItems) && state.wageItems.some((w) => num(w.amount) > 0))
      || num(state.grossSalary) > 0
    );
    // Leere „Neu“-Entwürfe nicht ins Archiv schreiben
    if (!hasContent) return false;
    const key = archiveKey(state);
    const archive = loadArchive();
    archive[key] = {
      key,
      updatedAt: new Date().toISOString(),
      companyName: companyDisplayName(state),
      mandantId: String(state.mandantId || state.meta?.companyId || ""),
      employeeName: String(state.employeeName || ""),
      employeeId: String(state.employeeId || ""),
      payrollMonth: String(state.payrollMonth || ""),
      draft: state,
    };
    return saveArchive(archive);
  }

  function listArchiveEntries(filter = {}) {
    const want = String(filter.companyId || filter.mandantId || "").trim().toLowerCase();
    let list = Object.values(loadArchive()).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    if (want) {
      list = list.filter((e) => {
        const mid = String(e.mandantId || e.draft?.mandantId || e.draft?.meta?.companyId || "").trim().toLowerCase();
        return mid === want;
      });
    }
    return list;
  }

  function loadArchiveEntry(key) {
    const entry = loadArchive()[key];
    return entry?.draft ? normalizeDraft(entry.draft) : null;
  }

  function joinAddress(parts) {
    if (Array.isArray(parts)) return parts.filter(Boolean).join("\n");
    return String(parts || "").trim();
  }

  function isPlatformPayload(payload) {
    if (!payload || typeof payload !== "object") return false;
    if (payload.kind === PLATFORM_KIND) return true;
    if (payload.company && payload.employee && (payload.period || payload.wageItems)) return true;
    return false;
  }

  /**
   * Plattform → Buchhaltung
   * Akzeptiert platform.payroll.v1 oder verschachtelte company/employee-Objekte.
   */
  function ingestPlatformPayload(payload) {
    if (payload == null) {
      return { ok: false, errors: ["Leere Nutzlast"], state: null };
    }
    let data = payload;
    if (typeof payload === "string") {
      try {
        data = JSON.parse(payload.replace(/^\uFEFF/, ""));
      } catch (e) {
        return { ok: false, errors: [`JSON ungültig: ${e.message}`], state: null };
      }
    }

    if (!isPlatformPayload(data) && (data.draft || data.payroll || data.employeeName || data.documentType === "payroll")) {
      const draft = data.draft || data.template || data;
      const state = normalizeDraft(draft.payroll ? draft : { payroll: draft, documentType: "payroll" });
      const errors = validate(state);
      upsertArchiveEntry(state);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      return { ok: errors.length === 0, errors, state, source: "legacy" };
    }

    if (!isPlatformPayload(data)) {
      return {
        ok: false,
        errors: ["Unbekanntes Format. Erwartet: kind=platform.payroll.v1 mit company, employee, period, wageItems."],
        state: null,
      };
    }

    const company = data.company || {};
    const employee = data.employee || {};
    const attendance = data.attendance || {};
    const bank = data.bank || {};
    const period = data.period || data.payrollMonth || "";
    const companyName = String(company.name || company.companyName || "").trim();
    // Multi-Tenant: stabile Plattform-ID – niemals nur Firmenname als Schlüssel
    const companyId = String(company.id || company.mandantId || company.tenantId || data.companyId || data.mandantId || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const companyAddress = joinAddress(
      company.address || [company.street, [company.zip, company.city].filter(Boolean).join(" ")].filter(Boolean)
    );
    const seller = [companyName, companyAddress].filter(Boolean).join("\n");
    const empAddress = joinAddress(
      employee.address || [employee.street, [employee.zip, employee.city].filter(Boolean).join(" ")].filter(Boolean)
    );

    const wageItems = (Array.isArray(data.wageItems) ? data.wageItems : []).map((w) => ({
      code: String(w.code || w.lohnart || ""),
      label: String(w.label || w.bezeichnung || ""),
      amount: num(w.amount ?? w.betrag),
      taxFlag: String(w.taxFlag || w.st || "L"),
      svFlag: String(w.svFlag || w.sv || "L"),
      quantity: num(w.quantity ?? w.anzahl ?? w.hours ?? w.stunden),
      factor: num(w.factor ?? w.amount ?? w.betrag),
    }));

    const badgeId = String(
      employee.badgeId || employee.badge || employee.id || employee.employeeId || employee.persNr || ""
    ).trim();
    const personnelNumber = String(
      employee.personnelNumber || employee.personnelNo || employee.persNrDisplay || ""
    ).trim();
    // Internal job key = badge (or id). Never print badge on payslip.
    const employeeId = badgeId;
    const resolvedEmpName = String(
      employee.name
      || employee.employeeName
      || employee.displayName
      || employee.fullName
      || [employee.firstName || employee.givenName || employee.vorname, employee.lastName || employee.familyName || employee.nachname || employee.surname]
        .filter((p) => String(p || "").trim())
        .join(" ")
      || ""
    ).trim();
    const resolvedEmpAddress = String(
      empAddress
      || employee.address
      || employee.employeeAddress
      || [employee.street || employee.strasse, [employee.zip || employee.plz, employee.city || employee.ort].filter(Boolean).join(" ")]
        .filter((p) => String(p || "").trim())
        .join("\n")
      || ""
    ).trim();

    const draft = {
      documentType: "payroll",
      payrollLayout: "datev",
      seller,
      note: String(data.note || data.hints || "").trim(),
      mandantId: companyId,
      companyName,
      taxNumber: String(company.taxNumber || company.steuerNr || "").trim(),
      vatId: String(company.vatId || company.ustId || "").trim(),
      datevClientNo: String(company.datevClientNo || "").trim(),
      datevConsultantNo: String(company.datevConsultantNo || "").trim(),
      logoDataUrl: String(company.logoDataUrl || company.hubProfile?.logoDataUrl || data.logoDataUrl || "").trim(),
      logoUrl: String(company.logoUrl || company.hubProfile?.logoUrl || data.logoUrl || "").trim(),
      payroll: {
        employeeName: resolvedEmpName,
        employeeAddress: resolvedEmpAddress,
        employeeId,
        badgeId,
        personnelNumber,
        hideBadgeOnPayslip: true,
        employeeTaxId: String(employee.taxId || employee.steuerId || "").trim(),
        employeeInsuranceNo: String(employee.insuranceNo || employee.insuranceNumber || employee.svNr || "").trim(),
        employeeBirthDate: String(employee.birthDate || employee.birth || "").trim(),
        employeeEntryDate: String(employee.entryDate || employee.entry || "").trim(),
        payrollMonth: String(period).trim(),
        taxClass: String(employee.taxClass || employee.stkl || "I").trim(),
        churchTaxRate: String(employee.churchTaxRate ?? employee.kist ?? "0"),
        churchConfession: String(employee.churchConfession || employee.konfession || employee.religion || employee.konf || "").trim(),
        healthFund: String(employee.healthFund || employee.kk || "").trim(),
        healthPercent: employee.healthPercent != null ? String(employee.healthPercent) : (employee.kkPercent != null ? String(employee.kkPercent) : ""),
        healthAdditionalPercent: employee.healthAdditionalPercent != null ? String(employee.healthAdditionalPercent) : "",
        personengruppe: String(employee.personengruppe || employee.pgrs || "").trim(),
        beitragsgruppe: String(employee.beitragsgruppe || employee.bgrs || "").trim(),
        workDays: attendance.days != null ? String(attendance.days) : (employee.workDays != null ? String(employee.workDays) : ""),
        workHours: attendance.hours != null ? String(attendance.hours) : (employee.workHours != null ? String(employee.workHours) : ""),
        bankName: String(bank.name || bank.bankName || "").trim(),
        bankIban: String(bank.iban || bank.bankIban || "").trim(),
        wageItems,
        grossSalary: String(wageItems.reduce((s, w) => s + num(w.amount), 0) || num(data.gross || data.grossSalary) || ""),
        hourlyRate: employee.hourlyRate != null ? String(employee.hourlyRate) : (employee.stundenlohn != null ? String(employee.stundenlohn) : ""),
      },
      meta: {
        source: "platform",
        platformKind: PLATFORM_KIND,
        companyId,
        badgeId,
        personnelNumber,
        hideBadgeOnPayslip: true,
        importedAt: new Date().toISOString(),
        attendance,
        importedTotals: data.totals || null,
      },
    };

    const state = normalizeDraft(draft);
    const errors = [];
    if (!companyId) errors.push("Firma-ID (company.id) fehlt – Pflicht für Multi-Tenant / Plattform-API");
    if (!companyName && !seller) errors.push("Firma (company.name) fehlt");
    if (!state.employeeName) errors.push("Mitarbeitername fehlt");
    if (!badgeId) errors.push("Badge-ID / Mitarbeiter-ID fehlt");
    if (!state.payrollMonth) errors.push("Abrechnungsmonat (period) fehlt");
    if (!(state.wageItems || []).some((w) => num(w.amount) > 0) && !num(state.grossSalary)) {
      errors.push("Lohnarten/Brutto fehlen");
    }

    upsertArchiveEntry(state);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    return { ok: errors.length === 0, errors, state, source: "platform" };
  }

  function referenceMustermannState() {
    const tpl = window.PAYROLL_TEMPLATE_LIBRARY?.datev_mustermann_juli2025?.draft;
    if (!tpl) return null;
    return normalizeDraft(tpl);
  }

  function normalizeDraft(raw) {
    const d = { ...defaultState(), ...raw };
    const p = raw.payroll || {};
    Object.assign(d, {
      seller: raw.seller ?? d.seller,
      note: raw.note ?? d.note,
      payrollLayout: raw.payrollLayout || "datev",
      mandantId: raw.mandantId ?? d.mandantId,
      companyName: raw.companyName ?? d.companyName,
      taxNumber: raw.taxNumber ?? d.taxNumber,
      vatId: raw.vatId ?? d.vatId,
      datevClientNo: raw.datevClientNo ?? d.datevClientNo,
      datevConsultantNo: raw.datevConsultantNo ?? d.datevConsultantNo,
      employeeName: p.employeeName ?? raw.employeeName ?? d.employeeName,
      employeeAddress: p.employeeAddress ?? raw.employeeAddress ?? d.employeeAddress,
      employeeId: p.employeeId ?? raw.employeeId ?? d.employeeId,
      badgeId: p.badgeId ?? raw.badgeId ?? d.badgeId,
      personnelNumber: p.personnelNumber ?? raw.personnelNumber ?? d.personnelNumber,
      hideBadgeOnPayslip: p.hideBadgeOnPayslip ?? raw.hideBadgeOnPayslip ?? d.hideBadgeOnPayslip,
      employeeTaxId: p.employeeTaxId ?? raw.employeeTaxId ?? d.employeeTaxId,
      employeeInsuranceNo: p.employeeInsuranceNo ?? raw.employeeInsuranceNo ?? d.employeeInsuranceNo,
      employeeBirthDate: p.employeeBirthDate ?? raw.employeeBirthDate ?? d.employeeBirthDate,
      employeeEntryDate: p.employeeEntryDate ?? raw.employeeEntryDate ?? d.employeeEntryDate,
      payrollMonth: p.payrollMonth ?? raw.payrollMonth ?? d.payrollMonth,
      taxClass: p.taxClass ?? raw.taxClass ?? d.taxClass,
      churchTaxRate: p.churchTaxRate ?? raw.churchTaxRate ?? d.churchTaxRate,
      churchConfession: p.churchConfession ?? raw.churchConfession ?? d.churchConfession,
      healthFund: p.healthFund ?? raw.healthFund ?? d.healthFund,
      healthPercent: p.healthPercent ?? raw.healthPercent ?? d.healthPercent,
      healthAdditionalPercent: p.healthAdditionalPercent ?? raw.healthAdditionalPercent ?? d.healthAdditionalPercent,
      childlessPvSurcharge: Boolean(p.childlessPvSurcharge ?? raw.childlessPvSurcharge ?? d.childlessPvSurcharge),
      taxAllowanceMonthly: p.taxAllowanceMonthly ?? raw.taxAllowanceMonthly ?? d.taxAllowanceMonthly,
      childAllowanceFactor: p.childAllowanceFactor ?? raw.childAllowanceFactor ?? d.childAllowanceFactor,
      factorMethod: Boolean(p.factorMethod ?? raw.factorMethod ?? d.factorMethod),
      factorValue: p.factorValue ?? raw.factorValue ?? d.factorValue,
      netDeductions: p.netDeductions ?? raw.netDeductions ?? d.netDeductions,
      departmentNo: p.departmentNo ?? raw.departmentNo ?? d.departmentNo,
      workDays: p.workDays ?? raw.workDays ?? d.workDays,
      workHours: p.workHours ?? raw.workHours ?? d.workHours,
      personengruppe: p.personengruppe ?? raw.personengruppe ?? p.pgrs ?? raw.pgrs ?? d.personengruppe,
      beitragsgruppe: p.beitragsgruppe ?? raw.beitragsgruppe ?? p.bgrs ?? raw.bgrs ?? d.beitragsgruppe,
      grossSalary: p.grossSalary ?? raw.grossSalary ?? d.grossSalary,
      hourlyRate: p.hourlyRate ?? raw.hourlyRate ?? d.hourlyRate,
      bankName: p.bankName ?? raw.bankName ?? d.bankName,
      bankIban: p.bankIban ?? raw.bankIban ?? d.bankIban,
      logoDataUrl: raw.logoDataUrl ?? p.logoDataUrl ?? d.logoDataUrl,
      logoUrl: raw.logoUrl ?? p.logoUrl ?? d.logoUrl,
      wageItems: Array.isArray(p.wageItems) ? p.wageItems : (Array.isArray(raw.wageItems) ? raw.wageItems : d.wageItems),
      meta: { ...(d.meta || {}), ...(raw.meta || {}) },
    });
    if (!d.companyName) d.companyName = companyDisplayName(d);
    if (!String(d.seller || "").trim() && d.companyName && d.companyName !== "Ohne Firma") {
      d.seller = d.companyName;
    }
    if (!d.mandantId && d.meta?.companyId) d.mandantId = d.meta.companyId;
    if (d.hourlyRate && !d.meta) d.meta = {};
    if (d.hourlyRate && !d.meta.hourlyRate) d.meta.hourlyRate = Number(d.hourlyRate) || d.hourlyRate;
    // Heal legacy typo: hours were stored under workDays
    const h = Number(d.workHours) || 0;
    const days = Number(d.workDays) || 0;
    if (h <= 0 && days > 0 && (!Number.isInteger(days) || days > 31)) {
      d.workHours = String(days);
      d.workDays = "";
    }
    return d;
  }

  function render(state, options) {
    let payroll = calculate(state);
    payroll = applyReferenceOverrides(payroll, { ...state, useReferenceDisplay: options?.useReferenceDisplay });
    const sheetData = buildSheetData(state, payroll, {
      useReferenceDisplay: options?.useReferenceDisplay || state?.meta?.referenceDemo === "datev",
      importedTotals: options?.importedTotals || state?.meta?.importedTotals,
    });
    if (window.DatevSheet) {
      window.DatevSheet.setBackground(options?.blankTemplate === false ? "reference" : "blank");
      window.DatevSheet.render(sheetData);
    }
    return { payroll, sheetData };
  }

  function validate(state) {
    const errors = [];
    if (!String(state.seller || state.companyName || "").trim()) errors.push("Arbeitgeber / Firma fehlt");
    if (!String(state.employeeName || "").trim()) errors.push("Mitarbeitername fehlt");
    if (!String(state.payrollMonth || "").trim()) errors.push("Abrechnungsmonat fehlt");
    if (!String(state.taxClass || "").trim()) errors.push("Steuerklasse fehlt");
    const wages = state.wageItems || [];
    const gross = summarizeWageRows(wages).gross || num(state.grossSalary);
    if (gross <= 0) errors.push("Brutto fehlt (Lohnarten oder Brutto-Feld)");
    return errors;
  }

  /** Zusätzliche Hinweise vor dem Druck (nicht blockierend) */
  function validatePrintHints(state) {
    const hints = [];
    if (!String(state.employeeId || state.badgeId || "").trim()) hints.push("Badge-ID / Mitarbeiter-ID fehlt");
    if (!String(state.employeeBirthDate || "").trim()) hints.push("Geburtsdatum fehlt");
    if (!String(state.employeeInsuranceNo || "").trim()) hints.push("SV-Nummer fehlt");
    if (!String(state.taxClass || "").trim()) hints.push("Steuerklasse fehlt");
    if (!String(state.healthFund || "").trim()) hints.push("Krankenkasse fehlt");
    if (!String(state.bankName || "").trim()) hints.push("Bank fehlt");
    if (!String(state.bankIban || "").trim()) hints.push("IBAN fehlt");
    if (!String(state.taxNumber || "").trim()) hints.push("Steuer-Nr. der Firma fehlt");
    return hints;
  }

  function completeness(state) {
    const hard = validate(state);
    const soft = validatePrintHints(state);
    const total = 8;
    const done = total - Math.min(total, hard.length + soft.length);
    return {
      hard,
      soft,
      percent: Math.max(0, Math.round((done / total) * 100)),
      readyToPrint: hard.length === 0,
    };
  }

  function buildDatevCsv(state, payroll) {
    const month = String(state.payrollMonth || "").trim();
    const name = String(state.employeeName || "").trim();
    const pers = String(state.employeeId || "").trim() || "00000";
    const company = companyDisplayName(state).replace(/\s+/g, "_").slice(0, 40) || "Mandant";
    const wages = Array.isArray(state.wageItems) ? state.wageItems : [];
    const header = "Personalnummer;Lohnart;Betrag;Abrechnungsmonat;Mitarbeitername;Firma";
    const lines = [header];
    wages.filter((w) => num(w.amount) > 0).forEach((w) => {
      lines.push([
        pers,
        String(w.code || "2000"),
        String(num(w.amount).toFixed(2)).replace(".", ","),
        month,
        name,
        company,
      ].join(";"));
    });
    if (lines.length === 1 && payroll?.gross > 0) {
      lines.push([pers, "2000", String(num(payroll.gross).toFixed(2)).replace(".", ","), month, name, company].join(";"));
    }
    return {
      filename: `WorkPass_Lohn_${month || "monat"}_${pers}.csv`,
      content: `\ufeff${lines.join("\r\n")}`,
      lines,
    };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      upsertArchiveEntry(state);
      return true;
    } catch {
      return false;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeDraft(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  window.PayrollCore = {
    REFERENCE: DATEV_REFERENCE_DISPLAY,
    STORAGE_KEY,
    ARCHIVE_KEY,
    PLATFORM_KIND,
    defaultState,
    referenceMustermannState,
    normalizeDraft,
    ingestPlatformPayload,
    isPlatformPayload,
    companyDisplayName,
    resolveEmployerSeller,
    archiveKey,
    listArchiveEntries,
    loadArchiveEntry,
    upsertArchiveEntry,
    calculate,
    applyReferenceOverrides,
    buildSheetData,
    render,
    validate,
    validatePrintHints,
    buildDatevCsv,
    saveState,
    loadState,
    formatAmount,
    formatDateShortDatev,
    formatDateDE,
    parseIsoDateParts,
    completeness,
    formatMonthLabel,
    getPayrollMonthEndDate,
  };
})();
