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
    const hours = num(state.workHours);
    const days = num(state.workDays);
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
      state.employeeName || empId || wageRows.length || String(state.seller || "").trim()
    );

    return {
      titleMonth: hasSheetContent && state.payrollMonth ? `für ${formatMonthLabel(state.payrollMonth)}` : "",
      usa: (state.seller || state.taxNumber || state.datevClientNo) ? buildDatevUsaLine(state) : "",
      headDate: hasSheetContent ? getPayrollMonthEndDate(state.payrollMonth) : "",
      headPage: hasSheetContent ? "Blatt: 1" : "",
      persNr: empId,
      birth: formatDateShortDatev(state.employeeBirthDate),
      stkl: (state.employeeName || empId) ? taxClassToDisplay(state.taxClass) : "",
      konf: (() => {
        const c = String(state.churchConfession || "").trim().toLowerCase();
        if (c === "rk" || c === "römisch-katholisch" || c === "katholisch") return "rk";
        if (c === "ev" || c === "evangelisch") return "ev";
        if (num(state.churchTaxRate) > 0) return c || "ev";
        return "";
      })(),
      stTg: num(state.workDays) > 0 ? String(state.workDays) : "",
      svNr: String(state.employeeInsuranceNo || ""),
      kkName: String(state.healthFund || ""),
      kkPct: useRef ? DATEV_REFERENCE_DISPLAY.kkPctDisplay : (num(state.healthPercent) > 0
        ? formatNumber(num(state.healthPercent))
        : (num(state.healthAdditionalPercent) > 0 ? formatNumber(14.6 / 2 + num(state.healthAdditionalPercent) / 2) : "")),
      pgrs: ref ? ref.pgrs : (String(state.departmentNo || "").trim() || ""),
      bgrs: ref ? ref.bgrs : "",
      svTg: num(state.workDays) > 0 ? String(state.workDays) : "",
      vacPrev: "",
      vacEnt: "",
      workDays: num(state.workDays) > 0 ? String(Math.round(num(state.workDays))) : "",
      workHours: num(state.workHours) > 0
        ? (Number.isInteger(num(state.workHours))
          ? String(num(state.workHours))
          : num(state.workHours).toLocaleString("de-DE", { maximumFractionDigits: 2 }))
        : "",
      sender: formatEmployerSenderLine(state.seller),
      empMeta: empId
        ? `*Pers.-Nr. ${empId}*  *Abt.-Nr. ${String(state.departmentNo || empId.replace(/\D/g, "").slice(0, 5) || "20000")}*`
        : "",
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
      workDays: "",
      workHours: "",
      grossSalary: "",
      bankName: "",
      bankIban: "",
      mandantId: "",
      companyName: "",
      taxNumber: "",
      vatId: "",
      datevClientNo: "",
      datevConsultantNo: "",
      wageItems: [],
      meta: {},
    };
  }

  function companyDisplayName(state) {
    if (state?.companyName) return String(state.companyName).trim();
    const first = String(state?.seller || "").trim().split(/\r?\n/).filter(Boolean)[0];
    return first || "Ohne Firma";
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

  function listArchiveEntries() {
    return Object.values(loadArchive()).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
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
      payroll: {
        employeeName: String(employee.name || employee.employeeName || "").trim(),
        employeeAddress: empAddress,
        employeeId: String(employee.id || employee.employeeId || employee.persNr || "").trim(),
        employeeTaxId: String(employee.taxId || employee.steuerId || "").trim(),
        employeeInsuranceNo: String(employee.insuranceNo || employee.svNr || "").trim(),
        employeeBirthDate: String(employee.birthDate || employee.birth || "").trim(),
        employeeEntryDate: String(employee.entryDate || employee.entry || "").trim(),
        payrollMonth: String(period).trim(),
        taxClass: String(employee.taxClass || employee.stkl || "I").trim(),
        churchTaxRate: String(employee.churchTaxRate ?? employee.kist ?? "0"),
        healthFund: String(employee.healthFund || employee.kk || "").trim(),
        healthPercent: employee.healthPercent != null ? String(employee.healthPercent) : "",
        workDays: attendance.days != null ? String(attendance.days) : (employee.workDays != null ? String(employee.workDays) : ""),
        workHours: attendance.hours != null ? String(attendance.hours) : (employee.workHours != null ? String(employee.workHours) : ""),
        bankName: String(bank.name || bank.bankName || "").trim(),
        bankIban: String(bank.iban || bank.bankIban || "").trim(),
        wageItems,
        grossSalary: String(wageItems.reduce((s, w) => s + num(w.amount), 0) || num(data.gross || data.grossSalary) || ""),
      },
      meta: {
        source: "platform",
        platformKind: PLATFORM_KIND,
        companyId,
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
      grossSalary: p.grossSalary ?? raw.grossSalary ?? d.grossSalary,
      bankName: p.bankName ?? raw.bankName ?? d.bankName,
      bankIban: p.bankIban ?? raw.bankIban ?? d.bankIban,
      wageItems: Array.isArray(p.wageItems) ? p.wageItems : (Array.isArray(raw.wageItems) ? raw.wageItems : d.wageItems),
      meta: { ...(d.meta || {}), ...(raw.meta || {}) },
    });
    if (!d.companyName) d.companyName = companyDisplayName(d);
    if (!d.mandantId && d.meta?.companyId) d.mandantId = d.meta.companyId;
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
    if (!String(state.employeeId || "").trim()) hints.push("Pers.-Nr. fehlt");
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
