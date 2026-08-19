/* WorkPass Steuerprogramm – Rechnung & Hub (Suppix AI) */

const itemsBody = document.getElementById("itemsBody");
const previewItemsBody = document.getElementById("previewItemsBody");
const addItemBtn = document.getElementById("addItemBtn");
const printBtn = document.getElementById("printBtn");
const printVerdienstBtn = document.getElementById("printVerdienstBtn");
const previewVerdienstBtn = document.getElementById("previewVerdienstBtn");
const verdienstSheet = document.getElementById("verdienstSheet");
const pdfExportBtn = document.getElementById("pdfExportBtn");
const csvExportBtn = document.getElementById("csvExportBtn");
const datevCsvExportBtn = document.getElementById("datevCsvExportBtn");
const elsterXmlExportBtn = document.getElementById("elsterXmlExportBtn");
const duplicateDocBtn = document.getElementById("duplicateDocBtn");
const exportAllPayrollCsvBtn = document.getElementById("exportAllPayrollCsvBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const loadDraftBtn = document.getElementById("loadDraftBtn");
const resetBtn = document.getElementById("resetBtn");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");
const previewZoomInput = document.getElementById("previewZoom");
const draftSaveState = document.getElementById("draftSaveState");
const invoicePreviewEl = document.getElementById("invoicePreview");
const documentTypeInput = document.getElementById("documentType");
const payrollFields = document.getElementById("payrollFields");
const payrollSheet = document.getElementById("payrollSheet");
const annualTaxSheet = document.getElementById("annualTaxSheet");
const taxYearInput = document.getElementById("taxYear");
const modeChip = document.getElementById("modeChip");
const completionChip = document.getElementById("completionChip");
const signaturePad = document.getElementById("signaturePad");
const signaturePreview = document.getElementById("signaturePreview");
const signatureNameInput = document.getElementById("signatureName");
const signatureNamePreview = document.getElementById("signatureNamePreview");

const invoiceNumberInput = document.getElementById("invoiceNumber");
const invoiceDateInput = document.getElementById("invoiceDate");
const serviceDateInput = document.getElementById("serviceDate");
const dueDateInput = document.getElementById("dueDate");
const taxRateInput = document.getElementById("taxRate");
const kleinunternehmerInput = document.getElementById("kleinunternehmer");
const reverseChargeInput = document.getElementById("reverseCharge");
const sellerInput = document.getElementById("seller");
const companySellerInput = document.getElementById("companySeller");
const customerInput = document.getElementById("customer");
const noteInput = document.getElementById("note");

const previewInvoiceNumber = document.getElementById("previewInvoiceNumber");
const previewInvoiceDate = document.getElementById("previewInvoiceDate");
const previewServiceDate = document.getElementById("previewServiceDate");
const previewDueDate = document.getElementById("previewDueDate");
const invoiceComplianceList = document.getElementById("invoiceComplianceList");
const onboardingBanner = document.getElementById("onboardingBanner");
const dismissOnboardingBtn = document.getElementById("dismissOnboardingBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const importPayrollBtn = document.getElementById("importPayrollBtn");
const exportPayrollJsonBtn = document.getElementById("exportPayrollJsonBtn");
const importPayrollInput = document.getElementById("importPayrollInput");
const pvTaxClassSelectDv = document.getElementById("pvTaxClassSelectDv");
const appVersionLabel = document.getElementById("appVersionLabel");
const sidebarVersionLabel = document.getElementById("sidebarVersionLabel");
const topbarHeading = document.getElementById("topbarHeading");
const topbarSubheading = document.getElementById("topbarSubheading");
const lexBreadcrumb = document.getElementById("lexBreadcrumb");
const lexBcModule = document.getElementById("lexBcModule");
const lexBcDoc = document.getElementById("lexBcDoc");
const lexAppbarMandant = document.getElementById("lexAppbarMandant");
const lexStatusMandant = document.getElementById("lexStatusMandant");
const lexStatusMessage = document.getElementById("lexStatusMessage");
const lexStatusDate = document.getElementById("lexStatusDate");
const lexStatusVersion = document.getElementById("lexStatusVersion");
const payrollNavGroup = document.querySelector(".mode-payroll-nav");
const docTypeCards = document.querySelectorAll(".doc-type-card");
const previewSeller = document.getElementById("previewSeller");
const previewCustomer = document.getElementById("previewCustomer");
const previewSubtotal = document.getElementById("previewSubtotal");
const previewTax = document.getElementById("previewTax");
const previewTotal = document.getElementById("previewTotal");
const previewNote = document.getElementById("previewNote");
const previewTaxNumber = document.getElementById("previewTaxNumber");
const previewVatId = document.getElementById("previewVatId");
const previewCommercialRegister = document.getElementById("previewCommercialRegister");
const previewCompanyBank = document.getElementById("previewCompanyBank");
const taxRowPreview = document.getElementById("taxRowPreview");
const paymentStatus = document.getElementById("paymentStatus");
const previewDocumentTitle = document.getElementById("previewDocumentTitle");
const subtotalLabel = document.getElementById("subtotalLabel");
const taxLabel = document.getElementById("taxLabel");
const totalLabel = document.getElementById("totalLabel");
const previewPayrollMonth = document.getElementById("previewPayrollMonth");

const companyProfileSelect = document.getElementById("companyProfileSelect");
const companyProfileNameInput = document.getElementById("companyProfileName");
const saveCompanyProfileBtn = document.getElementById("saveCompanyProfileBtn");
const syncCompanyProfileBtn = document.getElementById("syncCompanyProfileBtn");
const newCompanyProfileBtn = document.getElementById("newCompanyProfileBtn");
const deleteCompanyProfileBtn = document.getElementById("deleteCompanyProfileBtn");
const taxNumberInput = document.getElementById("taxNumber");
const vatIdInput = document.getElementById("vatId");
const commercialRegisterInput = document.getElementById("commercialRegister");
const managingDirectorInput = document.getElementById("managingDirector");
const companyBankNameInput = document.getElementById("companyBankName");
const companyIbanInput = document.getElementById("companyIban");
const companyBicInput = document.getElementById("companyBic");
const datevClientNoInput = document.getElementById("datevClientNo");
const datevConsultantNoInput = document.getElementById("datevConsultantNo");
const payrollLayoutSelect = document.getElementById("payrollLayoutSelect");
const payrollLayoutDescription = document.getElementById("payrollLayoutDescription");
const payrollLayoutDescriptionPayroll = document.getElementById("payrollLayoutDescriptionPayroll");
const payrollTemplatePicker = document.getElementById("payrollTemplatePicker");
const applyLegalRatesBtn = document.getElementById("applyLegalRatesBtn");
const companyLogoInput = document.getElementById("companyLogoInput");
const companyLogoPreview = document.getElementById("companyLogoPreview");
const removeLogoBtn = document.getElementById("removeLogoBtn");
const previewCompanyLogo = document.getElementById("previewCompanyLogo");
const payrollHeadLogo = document.getElementById("payrollHeadLogo");

const employeeNameInput = document.getElementById("employeeName");
const employeeAddressInput = document.getElementById("employeeAddress");
const employeeIdInput = document.getElementById("employeeId");
const employeeTaxIdInput = document.getElementById("employeeTaxId");
const employeeInsuranceNoInput = document.getElementById("employeeInsuranceNo");
const employeeBirthDateInput = document.getElementById("employeeBirthDate");
const employeeEntryDateInput = document.getElementById("employeeEntryDate");
const employeeExitDateInput = document.getElementById("employeeExitDate");
const payrollMonthInput = document.getElementById("payrollMonth");
const taxClassInput = document.getElementById("taxClass");
const grossSalaryInput = document.getElementById("grossSalary");
const payrollTaxEffective = document.getElementById("payrollTaxEffective");
const taxAllowanceMonthlyInput = document.getElementById("taxAllowanceMonthly");
const childAllowanceFactorInput = document.getElementById("childAllowanceFactor");
const factorMethodInput = document.getElementById("factorMethod");
const factorValueInput = document.getElementById("factorValue");
const churchTaxRateInput = document.getElementById("churchTaxRate");
const datevLodasExportBtn = document.getElementById("datevLodasExportBtn");
const childlessPvSurchargeInput = document.getElementById("childlessPvSurcharge");
const healthAdditionalPercentInput = document.getElementById("healthAdditionalPercent");
const healthFundInput = document.getElementById("healthFund");
const pensionPercentInput = document.getElementById("pensionPercent");
const healthPercentInput = document.getElementById("healthPercent");
const carePercentInput = document.getElementById("carePercent");
const unemploymentPercentInput = document.getElementById("unemploymentPercent");
const workHoursInput = document.getElementById("workHours");
const workDaysInput = document.getElementById("workDays");
const bankNameInput = document.getElementById("bankName");
const bankBicInput = document.getElementById("bankBic");
const bankIbanInput = document.getElementById("bankIban");
const wageItemsBody = document.getElementById("wageItemsBody");
const addWageItemBtn = document.getElementById("addWageItemBtn");
const payrollHeaderLineInput = document.getElementById("payrollHeaderLine");
const payrollFooterLineInput = document.getElementById("payrollFooterLine");
const employeeSearchInput = document.getElementById("employeeSearch");
const employeeReferenceMonthInput = document.getElementById("employeeReferenceMonth");
const loadEmployeeDataBtn = document.getElementById("loadEmployeeDataBtn");
const loadDatevRefBtn = document.getElementById("loadDatevRefBtn");
const loadAgendaRefBtn = document.getElementById("loadAgendaRefBtn");
const loadCurrentLayoutRefBtn = document.getElementById("loadCurrentLayoutRefBtn");
const saveEmployeeDataBtn = document.getElementById("saveEmployeeDataBtn");

const payrollHeadMonth = document.getElementById("payrollHeadMonth");
const pvTaxClassBadge = document.getElementById("pvTaxClassBadge");
const pvChildAllowance = document.getElementById("pvChildAllowance");
const pvPayoutHighlight = document.getElementById("pvPayoutHighlight");
const pvTaxMethodNote = document.getElementById("pvTaxMethodNote");
const payrollHeadPage = document.getElementById("payrollHeadPage");
const payrollHeadRun = document.getElementById("payrollHeadRun");
const payrollHeadDate = document.getElementById("payrollHeadDate");
const pvPersNr = document.getElementById("pvPersNr");
const pvTaxId = document.getElementById("pvTaxId");
const pvBirthDate = document.getElementById("pvBirthDate");
const pvEntryDate = document.getElementById("pvEntryDate");
const pvExitDate = document.getElementById("pvExitDate");
const pvTaxClassSelect = document.getElementById("pvTaxClassSelect");
const pvGrossEdit = document.getElementById("pvGrossEdit");
let sheetEditorSyncLock = false;
const pvHealthPct = document.getElementById("pvHealthPct");
const pvPensionPct = document.getElementById("pvPensionPct");
const pvInsuranceNo = document.getElementById("pvInsuranceNo");
const pvHealthFund = document.getElementById("pvHealthFund");
const pvTaxAllowance = document.getElementById("pvTaxAllowance");
const pvAddress = document.getElementById("pvAddress");
const pvCompanyBlock = document.getElementById("pvCompanyBlock");
const pvHours = document.getElementById("pvHours");
const pvDays = document.getElementById("pvDays");
const pvPaidUnpaidHours = document.getElementById("pvPaidUnpaidHours");
const pvAverageHourRate = document.getElementById("pvAverageHourRate");
const pvEmployerShare = document.getElementById("pvEmployerShare");
const pvInfoText = document.getElementById("pvInfoText");
const pvLetterheadSub = document.getElementById("pvLetterheadSub");
const pvFooterBlock = document.getElementById("pvFooterBlock");
const pvWageRows = document.getElementById("pvWageRows");
const pvWageRowsAgenda = document.getElementById("pvWageRowsAgenda");
const pvDatevBetragRows = document.getElementById("pvDatevBetragRows");
const pvWageGrossTotal = document.getElementById("pvWageGrossTotal");
const pvTaxBaseRows = document.getElementById("pvTaxBaseRows");
const pvDeductionRows = document.getElementById("pvDeductionRows");
const pvTotalGross = document.getElementById("pvTotalGross");
const pvTaxGross = document.getElementById("pvTaxGross");
const pvSvgGross = document.getElementById("pvSvgGross");
const pvNet = document.getElementById("pvNet");
const pvNetBreakdown = document.getElementById("pvNetBreakdown");
const pvBank = document.getElementById("pvBank");
const pvBic = document.getElementById("pvBic");
const pvIban = document.getElementById("pvIban");
const pvPayout = document.getElementById("pvPayout");
const pvSvgGrossRef = document.getElementById("pvSvgGrossRef");
const pvSvgGrossAv = document.getElementById("pvSvgGrossAv");
const pvSvgGrossPv = document.getElementById("pvSvgGrossPv");
const pvHealthCont = document.getElementById("pvHealthCont");
const pvPensionCont = document.getElementById("pvPensionCont");
const pvUnemploymentCont = document.getElementById("pvUnemploymentCont");
const pvCareCont = document.getElementById("pvCareCont");
const pvTaxRow = document.getElementById("pvTaxRow");
const pvChurchRow = document.getElementById("pvChurchRow");
const pvSoliRow = document.getElementById("pvSoliRow");
const pvGrossBox = document.getElementById("pvGrossBox");
const pvTaxDeductionBox = document.getElementById("pvTaxDeductionBox");
const pvSvDeductionBox = document.getElementById("pvSvDeductionBox");
const pvTotalGrossAside = document.getElementById("pvTotalGrossAside");
const pvTaxAside = document.getElementById("pvTaxAside");
const pvSvAside = document.getElementById("pvSvAside");
const pvNetAside = document.getElementById("pvNetAside");

const invoiceOnlyElements = document.querySelectorAll(".mode-invoice-only");
const payrollOnlyElements = document.querySelectorAll(".mode-payroll-only");
const annualOnlyElements = document.querySelectorAll(".mode-annual-only");
const payrollTabBtn = document.querySelector('.form-tab[data-tab="payroll"]');

const WAGE_TYPE_PRESETS = [
  { code: "2000", label: "Gehalt", taxFlag: "L", svFlag: "L" },
  { code: "2010", label: "Überstunden", taxFlag: "L", svFlag: "L" },
  { code: "2100", label: "Bonus / Prämie", taxFlag: "L", svFlag: "L" },
  { code: "2150", label: "Provision", taxFlag: "L", svFlag: "L" },
  { code: "2600", label: "Fahrtkosten (steuerfrei)", taxFlag: "F", svFlag: "N" },
  { code: "2700", label: "Verpflegungsmehraufwand", taxFlag: "P", svFlag: "N" },
];

const STORAGE_KEY = "finanzDokumentDraftV3";
const EMPLOYEE_HISTORY_KEY = "payrollEmployeeHistoryV2";
const COMPANY_PROFILES_KEY = "finanzDokumentProfilesV1";
const ONBOARDING_KEY = "finanzDokumentOnboardingDismissed";
const APP_VERSION = "2.53.8";
const APP_VERSION_BUILD = "2026.45";

/** Verhindert Speichern leerer Entwürfe während des App-Starts */
let appBootstrapping = true;

function preparePayrollPrint() {
  const mode = getCurrentMode();
  if (mode !== "payroll" && mode !== "payroll-annual") return false;
  document.body.classList.remove("print-verdienst-only");
  document.body.classList.add("print-payroll-only");
  if (mode === "payroll-annual") document.body.classList.add("print-annual-only");
  if (mode === "payroll") {
    updatePreview();
    document.getElementById("datevSheetHost")?.classList.remove("hidden");
  }
  if (invoicePreviewEl) {
    invoicePreviewEl.dataset.printZoom = invoicePreviewEl.style.zoom || "";
    invoicePreviewEl.style.zoom = "1";
  }
  return true;
}

function restoreAfterPrint() {
  document.body.classList.remove("print-payroll-only", "print-annual-only", "print-verdienst-only");
  if (invoicePreviewEl?.dataset.printZoom != null) {
    invoicePreviewEl.style.zoom = invoicePreviewEl.dataset.printZoom;
    delete invoicePreviewEl.dataset.printZoom;
  } else {
    applyPreviewZoom();
  }
}

/** Exakte Anzeigewerte aus Referenz-Screenshot Mustermann 07/2025 */
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
};

let useDatevReferenceDisplay = false;
let datevReferenceLoading = false;
let importedCsvTotals = null;
let payrollBgDataUrl = "";
let usePdfBackground = false;
let hidePdfChrome = false;

const PAYROLL_BG_STORAGE = "finanzDokumentPayrollBgV1";
const PAYROLL_BG_REF_PATH = "assets/referenz-datev-mustermann.png";
let verdienstPreviewMode = false;
const signatureCtx = signaturePad?.getContext?.("2d") || null;

let signatureDataUrl = "";
let signatureMode = "auto";
let signatureStyleId = "formal";
let signatureColorId = "navy";
let signatureLayout = (window.WorkPassSignature?.defaultLayout?.() || {
  xPct: 55, yPct: 82, wPct: 36, rotation: -1.5, opacity: 1,
  showCaption: false, captionText: null, captionCustom: false, showLine: true, locked: false,
});
let signatureAttestation = null;
let signatureAudit = [];
let signatureRenderToken = 0;
let signatureDrag = null;
let isDrawing = false;
let lastPoint = null;
let activeCompanyProfileId = "default";
let activeLogoDataUrl = "";
let grossSyncLock = false;

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_MAX_WIDTH = 480;

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function formatDateShortDatev(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

function formatDateForView(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-DE");
}

function formatMonthForView(value) {
  if (!value || !value.includes("-")) return "-";
  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(value) {
  return formatNumber(value);
}

function getEmployeeAddressText() {
  const direct = employeeAddressInput?.value?.trim() || "";
  if (direct) return direct;
  return customerInput?.value?.trim() || "";
}

function syncEmployeeAddressFields(source = "auto") {
  if (!employeeAddressInput || !customerInput) return;
  if (source === "employee") {
    customerInput.value = employeeAddressInput.value;
    return;
  }
  if (source === "customer") {
    employeeAddressInput.value = customerInput.value;
    return;
  }
  if (!employeeAddressInput.value.trim() && customerInput.value.trim()) {
    employeeAddressInput.value = customerInput.value;
  }
}

function formatAddressLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatAddressBlockHtml(text, emptyLabel = "– keine Adresse –") {
  const lines = formatAddressLines(text);
  if (!lines.length) return `<span class="ag-addr-empty">${emptyLabel}</span>`;
  return lines
    .map((line, index) => `<span class="${index === 0 ? "ag-addr-line ag-addr-line-first" : "ag-addr-line"}">${escapeHtml(line)}</span>`)
    .join("<br>");
}

function formatEmployerDatevLine(text) {
  const lines = formatAddressLines(text);
  if (!lines.length) return "";
  return lines.join("* ");
}

function formatEmployerAgendaLine(text) {
  const lines = formatAddressLines(text);
  if (!lines.length) return "– Arbeitgeber-Adresse eintragen –";
  return lines.join(", ");
}

function syncPayrollSheetEditorsFromForm(payroll) {
  if (sheetEditorSyncLock) return;
  sheetEditorSyncLock = true;
  const taxVal = taxClassInput?.value || "I";
  if (pvTaxClassSelect) pvTaxClassSelect.value = taxVal;
  if (pvTaxClassSelectDv) pvTaxClassSelectDv.value = taxVal;
  if (pvGrossEdit) {
    const grossVal = payroll?.gross ?? numberValue(grossSalaryInput);
    if (document.activeElement !== pvGrossEdit) {
      pvGrossEdit.value = grossVal > 0 ? String(Number(grossVal.toFixed(2))) : "";
    }
  }
  sheetEditorSyncLock = false;
}

function bindTaxClassSelect(selectEl) {
  if (!selectEl || !taxClassInput) return;
  selectEl.addEventListener("change", () => {
    if (sheetEditorSyncLock) return;
    taxClassInput.value = selectEl.value;
    toggleTaxClassIvFields();
    updatePreview();
    saveDraft(false);
  });
}

function initPayrollSheetEditors() {
  bindTaxClassSelect(pvTaxClassSelect);
  bindTaxClassSelect(pvTaxClassSelectDv);
  if (pvGrossEdit && grossSalaryInput) {
    const applyGrossFromSheet = () => {
      if (sheetEditorSyncLock) return;
      const value = numberValue(pvGrossEdit);
      grossSalaryInput.value = value > 0 ? String(value) : "";
      onGrossSalaryInput();
      updatePreview();
      saveDraft(false);
    };
    pvGrossEdit.addEventListener("change", applyGrossFromSheet);
    pvGrossEdit.addEventListener("input", applyGrossFromSheet);
  }
}

function taxClassToDisplay(taxClass) {
  const map = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6" };
  return map[taxClass] || taxClass;
}

function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function renderMonthCalendar(monthValue) {
  const tbody = document.getElementById("pvCalendarBody");
  if (!tbody || !monthValue?.includes("-")) return;
  clearTableBody(tbody);
  const [year, month] = monthValue.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = new Map();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const kw = getIsoWeek(date);
    if (!weeks.has(kw)) weeks.set(kw, Array(7).fill(""));
    const dow = (date.getDay() + 6) % 7;
    if (dow < 5) weeks.get(kw)[dow] = "A";
  }
  [...weeks.entries()].forEach(([kw, days]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="ag-kw">${kw}</td>${days.map((mark) => `<td>${mark}</td>`).join("")}`;
    tbody.appendChild(tr);
  });
}

function normalizeEmployeeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function monthToNumeric(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return -1;
  const [year, month] = value.split("-").map(Number);
  return year * 12 + month;
}

function getPreviousMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearTableBody(tbody) {
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
}

function numberValue(input) {
  return Number(input?.value) || 0;
}

function setNodeText(node, value) {
  if (node) node.textContent = value;
}

/* ── Tabs ── */

function initLexShell() {
  if (lexStatusDate) {
    lexStatusDate.textContent = new Date().toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  if (lexStatusVersion) lexStatusVersion.textContent = `v${APP_VERSION}`;

  const menuPortal = document.getElementById("lexMenuPortal");
  const menuActions = {
    file: [
      { key: "menu.saveDraft", fb: "Entwurf speichern", action: () => saveDraft(true) },
      { key: "menu.loadDraft", fb: "Entwurf laden", action: () => loadDraft(true) },
      { key: "menu.dupTemplate", fb: "Als Vorlage duplizieren", action: () => duplicateDocBtn?.click() },
      { key: "menu.exportBackup", fb: "Datensicherung exportieren", action: () => exportDataBtn?.click() },
    ],
    edit: [
      { key: "action.reset", fb: "Zurücksetzen", action: () => resetBtn?.click() },
      { key: "menu.applyLegal", fb: "Gesetzliche Sätze übernehmen", action: () => applyLegalRatesBtn?.click() },
    ],
    view: [
      { key: "menu.overview", fb: "Übersicht", action: () => document.querySelector('.form-tab[data-tab="dashboard"]')?.click() },
      { key: "menu.createDoc", fb: "Rechnung", action: () => document.querySelector('.form-tab[data-tab="document"]')?.click() },
      { key: "menu.zoom100", fb: "Vorschau 100 %", action: () => { if (previewZoomInput) { previewZoomInput.value = "100"; applyPreviewZoom(); } } },
    ],
    export: [
      { key: "menu.exportPdf", fb: "PDF exportieren", action: () => pdfExportBtn?.click() },
      { key: "menu.print", fb: "Drucken", action: () => printBtn?.click() },
      { key: "menu.invoiceCsv", fb: "Rechnung CSV", action: () => csvExportBtn?.click() },
      { key: "menu.datevCsv", fb: "DATEV CSV (Lohn)", action: () => datevCsvExportBtn?.click() },
      { key: "menu.elsterXml", fb: "ELSTER-XML", action: () => elsterXmlExportBtn?.click() },
    ],
  };

  document.querySelectorAll(".lex-menu-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const tab = btn.dataset.tabJump;
      if (tab) {
        document.querySelector(`.form-tab[data-tab="${tab}"]`)?.click();
        return;
      }
      const menu = btn.dataset.menu;
      if (!menuPortal || !menuActions[menu]) return;
      const rect = btn.getBoundingClientRect();
      menuPortal.innerHTML = menuActions[menu].map((item, i) => (
        `<button type="button" data-menu-idx="${i}">${escapeHtmlLite(hubT(item.key, item.fb))}</button>`
      )).join("");
      menuPortal.hidden = false;
      menuPortal.style.visibility = "hidden";
      menuPortal.style.left = "0px";
      menuPortal.style.top = `${rect.bottom + 2}px`;
      const mw = Math.max(menuPortal.offsetWidth || 220, 220);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - mw - 8));
      menuPortal.style.left = `${left}px`;
      menuPortal.style.visibility = "";
      menuPortal.querySelectorAll("button").forEach((itemBtn, idx) => {
        itemBtn.addEventListener("click", () => {
          menuPortal.hidden = true;
          menuActions[menu][idx]?.action?.();
        });
      });
      event.stopPropagation();
    });
  });

  document.addEventListener("click", () => {
    if (menuPortal) menuPortal.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      saveDraft(true);
    } else if (key === "p") {
      event.preventDefault();
      printBtn?.click();
    }
  });
  updateLexShellUI();
  initRibbonResponsive();
  initAppbarResponsive();
}

function openAppbarOverflowMenu(anchorBtn) {
  const menuPortal = document.getElementById("lexMenuPortal");
  const overflow = document.getElementById("wpAppbarOverflow");
  if (!menuPortal || !overflow || !anchorBtn) return;
  const items = [];
  const mandant = document.getElementById("lexAppbarMandant");
  if (mandant?.textContent?.trim()) {
    items.push({
      label: mandant.textContent.trim(),
      action: () => document.querySelector('.form-tab[data-tab="company"]')?.click(),
    });
  }
  const lohn = overflow.querySelector('a[href="lohn.html"]') || document.getElementById("wpAppbarLohn");
  if (lohn && !lohn.hidden) {
    items.push({
      label: ribbonBtnLabel(lohn) || hubT("nav.lohn", "Lohn"),
      action: () => { window.location.href = lohn.href || "lohn.html"; },
    });
  }
  const lockBtn = overflow.querySelector("#btnLock") || document.getElementById("btnLock");
  if (lockBtn && !lockBtn.hidden) {
    items.push({
      label: ribbonBtnLabel(lockBtn) || hubT("nav.lock", "Sperren"),
      action: () => lockBtn.click(),
    });
  }
  const admin = overflow.querySelector('a[href="admin.html"]');
  if (admin && !admin.hidden) {
    items.push({
      label: ribbonBtnLabel(admin) || hubT("nav.admin", "Admin"),
      action: () => { window.location.href = admin.href; },
    });
  }
  const badge = document.getElementById("hubCompanyBadge");
  if (badge && !badge.hidden && badge.textContent?.trim()) {
    items.push({
      label: badge.textContent.trim(),
      action: () => document.querySelector('.form-tab[data-tab="company"]')?.click(),
    });
  }
  if (!items.length) return;
  menuPortal.innerHTML = items.map((it, i) => (
    `<button type="button" data-appbar-idx="${i}">${escapeHtmlLite(it.label)}</button>`
  )).join("");
  menuPortal.hidden = false;
  menuPortal.style.visibility = "hidden";
  const rect = anchorBtn.getBoundingClientRect();
  menuPortal.style.left = "0px";
  menuPortal.style.top = `${rect.bottom + 4}px`;
  const mw = Math.max(menuPortal.offsetWidth || 220, 220);
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - mw - 8));
  menuPortal.style.left = `${left}px`;
  menuPortal.style.visibility = "";
  anchorBtn.setAttribute("aria-expanded", "true");
  menuPortal.querySelectorAll("button").forEach((itemBtn, idx) => {
    itemBtn.addEventListener("click", () => {
      menuPortal.hidden = true;
      anchorBtn.setAttribute("aria-expanded", "false");
      items[idx]?.action?.();
    });
  });
}

function initAppbarResponsive() {
  const moreBtn = document.getElementById("wpAppbarMore");
  if (!moreBtn) return;
  const mqCompact = window.matchMedia("(max-width: 1280px)");
  const mqTight = window.matchMedia("(max-width: 900px)");

  const apply = () => {
    const compact = mqCompact.matches || window.innerWidth <= 1280;
    const tight = mqTight.matches || window.innerWidth <= 900;
    document.body.classList.toggle("hub-appbar-compact", compact);
    document.body.classList.toggle("hub-appbar-tight", tight);
    // Keep Mehr visible via CSS; only set hidden=false when compact
    if (compact) moreBtn.removeAttribute("hidden");
    else moreBtn.setAttribute("hidden", "");
    moreBtn.setAttribute("aria-expanded", "false");
    const portal = document.getElementById("lexMenuPortal");
    if (portal) portal.hidden = true;
  };

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const portal = document.getElementById("lexMenuPortal");
    if (portal && !portal.hidden && moreBtn.getAttribute("aria-expanded") === "true") {
      portal.hidden = true;
      moreBtn.setAttribute("aria-expanded", "false");
      return;
    }
    openAppbarOverflowMenu(moreBtn);
  });

  apply();
  window.addEventListener("resize", apply);
  if (typeof mqCompact.addEventListener === "function") {
    mqCompact.addEventListener("change", apply);
    mqTight.addEventListener("change", apply);
  } else {
    mqCompact.addListener(apply);
    mqTight.addListener(apply);
  }
  // Re-apply after auth unlock / hub boot (class timing)
  window.addEventListener("workpass:locale", apply);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });
  setTimeout(apply, 0);
  setTimeout(apply, 400);
}

function ribbonBtnLabel(btn) {
  const text = (btn.querySelector(".i18n-text")?.textContent
    || [...btn.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("")
    || btn.textContent
    || "").replace(/\s+/g, " ").trim();
  return text || btn.title || btn.id || "…";
}

function openRibbonGroupMenu(groupIndex, anchorBtn) {
  const menuPortal = document.getElementById("lexMenuPortal");
  const groups = document.querySelectorAll(".lex-ribbon-full .lex-ribbon-group");
  const group = groups[groupIndex];
  if (!menuPortal || !group || !anchorBtn) return;
  const buttons = [...group.querySelectorAll(".lex-ribbon-btn")].filter((b) => {
    if (b.hidden || b.classList.contains("hidden")) return false;
    const style = window.getComputedStyle(b);
    return style.display !== "none" && style.visibility !== "hidden";
  });
  if (!buttons.length) return;
  menuPortal.innerHTML = buttons.map((b, i) => (
    `<button type="button" data-ribbon-idx="${i}">${escapeHtmlLite(ribbonBtnLabel(b))}</button>`
  )).join("");
  menuPortal.hidden = false;
  menuPortal.style.visibility = "hidden";
  const rect = anchorBtn.getBoundingClientRect();
  menuPortal.style.left = "0px";
  menuPortal.style.top = `${rect.bottom + 4}px`;
  const mw = Math.max(menuPortal.offsetWidth || 220, 220);
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - mw - 8));
  menuPortal.style.left = `${left}px`;
  menuPortal.style.visibility = "";
  menuPortal.querySelectorAll("button").forEach((itemBtn, idx) => {
    itemBtn.addEventListener("click", () => {
      menuPortal.hidden = true;
      buttons[idx]?.click();
    });
  });
}

function initRibbonResponsive() {
  const compact = document.getElementById("lexRibbonCompact");
  const full = document.querySelector(".lex-ribbon-full");
  if (!compact || !full) return;
  const mq = window.matchMedia("(max-width: 1400px)");

  const apply = () => {
    const narrow = mq.matches || window.innerWidth <= 1400;
    document.body.classList.toggle("hub-ribbon-compact", narrow);
    if (narrow) {
      compact.removeAttribute("hidden");
      full.setAttribute("hidden", "");
    } else {
      compact.setAttribute("hidden", "");
      full.removeAttribute("hidden");
    }
    const portal = document.getElementById("lexMenuPortal");
    if (portal) portal.hidden = true;
  };

  compact.querySelectorAll("[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById(btn.dataset.cmd)?.click();
    });
  });
  compact.querySelectorAll("[data-ribbon-group]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRibbonGroupMenu(Number(btn.dataset.ribbonGroup), btn);
    });
  });

  apply();
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", apply);
  else if (typeof mq.addListener === "function") mq.addListener(apply);
  window.addEventListener("resize", apply);
  setTimeout(apply, 0);
  setTimeout(apply, 400);
}

const HUB_API_CFG_KEY = "workpass.lohn.apiConfig.v1";
let hubDashboardSeq = 0;

function hubIsLocalHostPage() {
  const h = String(location.hostname || "");
  return h === "localhost" || h === "127.0.0.1" || h === "" || location.protocol === "file:";
}

function hubDefaultApiBase() {
  if (hubIsLocalHostPage()) return "http://127.0.0.1:8787";
  return String(location.origin || "").replace(/\/+$/, "");
}

function hubResolveApiBase() {
  let raw = "";
  try {
    const saved = JSON.parse(localStorage.getItem(HUB_API_CFG_KEY) || "null");
    raw = saved?.base ? String(saved.base).trim().replace(/\/+$/, "") : "";
  } catch {
    raw = "";
  }
  if (!raw) raw = hubDefaultApiBase();
  if (!hubIsLocalHostPage()) {
    try {
      const u = new URL(raw, location.href);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return "";
      }
      if (u.origin === location.origin) return "";
    } catch {
      /* keep raw */
    }
  }
  return raw.replace(/\/+$/, "");
}

function hubApiConfig() {
  let key = hubIsLocalHostPage() ? "workpass-dev-key" : "";
  let companyId = "";
  try {
    const saved = JSON.parse(localStorage.getItem(HUB_API_CFG_KEY) || "null");
    if (saved?.key) key = String(saved.key).trim();
    if (saved?.companyId) companyId = String(saved.companyId).trim();
  } catch {
    /* ignore */
  }
  const sessionUser = window.WorkPassAuth?.getSessionUser?.();
  if (sessionUser?.companyId) companyId = String(sessionUser.companyId).trim();
  return { base: hubResolveApiBase(), key, companyId };
}

function hubCurrentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function hubApiFetch(path, options = {}) {
  const { base, key, companyId } = hubApiConfig();
  const sessionToken = window.WorkPassAuth?.getSessionToken?.() || "";
  if (!key && !sessionToken) {
    throw new Error("API-Key oder Plattform-Login erforderlich.");
  }
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (key) headers["X-WorkPass-Key"] = key;
  if (sessionToken) headers["X-WorkPass-Session"] = sessionToken;
  if (!options.skipTenant && companyId) headers["X-WorkPass-Company-Id"] = companyId;
  const { skipTenant: _skip, headers: _h, ...fetchOpts } = options;
  const res = await fetch(`${base}${path}`, { ...fetchOpts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

function hubSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function hubFormatSyncLabel(sync) {
  if (!sync) return "Offline";
  const pending = Number(sync?.pending?.messages || 0) + Number(sync?.pending?.deliveries || 0);
  const wh = sync?.webhook?.last || {};
  if (wh.ok === false && sync?.webhook?.configured) return "Fehler";
  if (pending > 0) return "Wartet";
  if (sync?.webhook?.configured) return "OK";
  return "—";
}

function hubShowSyncStatus(text, { error = false, nextActions = [] } = {}) {
  const el = document.getElementById("dashSyncStatus");
  const list = document.getElementById("dashSyncNextActions");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("is-error", "is-ok");
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle("is-error", error);
  el.classList.toggle("is-ok", !error);
  if (list) {
    const actions = Array.isArray(nextActions) ? nextActions.filter(Boolean).slice(0, 4) : [];
    if (!actions.length) {
      list.hidden = true;
      list.innerHTML = "";
    } else {
      list.hidden = false;
      list.innerHTML = actions.map((a) => `<li>${escapeHtmlLite(a)}</li>`).join("");
    }
  }
}

function hubT(key, fallback, vars) {
  const v = window.WorkPassI18n?.t?.(key, vars);
  return (v && v !== key) ? v : (fallback || key);
}

/** Map known German/platform sync messages → UI locale. Keep env var names as-is. */
function localizeHubSyncMessage(msg) {
  const raw = String(msg || "").trim();
  if (!raw) return hubT("hub.syncChecked", "Sync geprüft");
  if (/Webhook-Key abgelehnt/i.test(raw) || /webhook.?key.*(abgelehnt|rejected)/i.test(raw)) {
    return hubT(
      "hub.webhookKeyRejected",
      "Webhook-Key abgelehnt. Railway WORKPASS_PLATFORM_WEBHOOK_KEY und Plattform-Secret müssen exakt übereinstimmen."
    );
  }
  if (/Kein Webhook-Key/i.test(raw)) {
    return hubT(
      "hub.webhookKeyMissing",
      "Kein Webhook-Key. Railway: WORKPASS_PLATFORM_WEBHOOK_KEY setzen (gleicher Wert wie auf der Plattform)."
    );
  }
  if (/WORKPASS_API_KEY als Webhook-Key/i.test(raw)) {
    return hubT(
      "hub.webhookKeyWrongSecret",
      "Es wurde WORKPASS_API_KEY als Webhook-Key genutzt. Setze WORKPASS_PLATFORM_WEBHOOK_KEY auf denselben Secret wie die Plattform."
    );
  }
  if (/Sync geprüft/i.test(raw)) return hubT("hub.syncChecked", "Sync geprüft");
  if (/Sync-Prüfung fehlgeschlagen/i.test(raw)) return hubT("hub.syncFailed", "Sync-Prüfung fehlgeschlagen.");
  return raw;
}

function hubFormatAutoSyncHint(sync, autoResult = null) {
  const auto = sync?.autoPipeline || {};
  const last = autoResult || auto.lastResult || null;
  const pending = Number(sync?.pending?.messages || 0) + Number(sync?.pending?.deliveries || 0);
  const wh = sync?.webhook?.last || {};
  const fromStatus = Array.isArray(sync?.nextActions) ? sync.nextActions : [];
  const actions = Array.isArray(last?.nextActions) && last.nextActions.length
    ? last.nextActions
    : fromStatus;
  if (sync?.status === "error" || (wh.ok === false && sync?.webhook?.configured)) {
    const raw = String(sync?.message || "");
    let text = hubT("hub.webhookError", "Webhook-Fehler {status} · Plattform-Endpoint prüfen", { status: wh.status || "" });
    if (/401/.test(raw) || wh.status === 401 || /Webhook-Key/i.test(raw)) {
      text = localizeHubSyncMessage(raw) !== raw
        ? localizeHubSyncMessage(raw)
        : hubT(
          "hub.webhook401Firm",
          "Die Plattform antwortet nicht (401). Bitte den Webhook auf der Plattform prüfen und Daten erneut senden."
        );
      return {
        text,
        error: true,
        nextActions: [
          hubT("hub.webhook401Next1", "Auf der Plattform: Webhook-URL und Secret prüfen"),
          hubT("hub.webhook401Next2", "Secret muss mit WORKPASS_PLATFORM_WEBHOOK_KEY übereinstimmen"),
          hubT("hub.webhook401Next3", "Danach Sync erneut prüfen oder in Lohn „Jetzt synchronisieren“"),
        ],
      };
    } else if (raw && !/WORKPASS_|Endpoint|GET \/v1/i.test(raw)) {
      text = localizeHubSyncMessage(raw);
    }
    return {
      text,
      error: true,
      nextActions: actions.length ? actions.filter((a) => !/WORKPASS_|Endpoint|Pull-URL|batch/i.test(String(a))) : [
        hubT("hub.fixWebhook", "Auf der Plattform den Webhook-Endpoint live schalten"),
        hubT("hub.thenSync", "Danach Sync erneut prüfen oder in Lohn „Jetzt synchronisieren“"),
      ],
    };
  }
  if (sync?.status === "waiting" || last?.waitingForPlatform || (pending > 0 && !last?.ok)) {
    return {
      text: sync?.message || last?.message || hubT("hub.waitPlatform", "Warte auf Plattform · {n} offene Nachricht(en)", { n: pending }),
      error: false,
      nextActions: actions.length ? actions : [
        hubT("hub.platformShouldSend", "Plattform soll Import/Batch senden (Mitarbeiter, Monat, Rechnungen)"),
        hubT("hub.syncInLohn", "In Lohn-Portal: Empfang → API-Bridge → Jetzt synchronisieren"),
      ],
    };
  }
  if (sync?.status === "manual" || auto.enabled === false) {
    return {
      text: sync?.message || hubT("hub.autoOff", "Automatik aus · manuell in Lohn synchronisieren"),
      error: false,
      nextActions: actions.length ? actions : [hubT("hub.openLohnSync", "Lohn-Portal öffnen und „Jetzt synchronisieren“ tippen")],
    };
  }
  if (sync?.message || last?.message) {
    return { text: sync?.message || last.message, error: false, nextActions: actions };
  }
  if (auto.lastSuccessAt) {
    return {
      text: hubT("hub.autoOk", "Automatik an · letzter Erfolg {at}", { at: auto.lastSuccessAt }),
      error: false,
      nextActions: actions,
    };
  }
  return {
    text: hubT("hub.syncLimited", "Webhook nicht gesetzt · Sync nur begrenzt möglich"),
    error: false,
    nextActions: actions,
  };
}

function focusNextMandantField({ openCompanyTab = true } = {}) {
  const MC = window.MandantChecklist;
  const checks = getMandantChecklistState();
  const key = MC?.nextOpen?.(checks);
  if (!key) {
    hubShowSyncStatus(hubT("hub.checkAllDone", "Alle Stammdaten sind vollständig."), { error: false });
    return;
  }
  const fieldId = MC?.HUB_FIELD_MAP?.[key];
  if (MC?.focusField) {
    MC.focusField(fieldId, { openCompanyTab });
    return;
  }
  document.querySelector('.form-tab[data-tab="company"]')?.click();
}

function initDashboardActions() {
  document.querySelectorAll("[data-dash-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.dashGo;
      const mode = btn.dataset.dashMode;
      if (mode === "payroll" || mode === "payroll-annual") {
        window.location.href = mode === "payroll-annual" ? "lohn.html#portalExportCard" : "lohn.html";
        return;
      }
      if (mode && documentTypeInput) {
        documentTypeInput.value = mode;
        syncDocTypeCards(mode);
        toggleModeUI();
      }
      document.querySelector(`.form-tab[data-tab="${tab}"]`)?.click();
      updatePreview();
    });
  });

  const dashBody = document.getElementById("dashEmployeeBody");
  if (dashBody) {
    dashBody.addEventListener("click", (event) => {
      const loadBtn = event.target.closest("[data-dash-load]");
      if (!loadBtn) return;
      window.location.href = "lohn.html";
    });
  }

  const syncBtn = document.getElementById("dashSyncCheckBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      runHubSyncCheck();
    });
  }

  const MC = window.MandantChecklist;
  if (MC?.wireClickToFocus) {
    MC.wireClickToFocus("dashChecklist", MC.HUB_FIELD_MAP, { openCompanyTab: true });
    MC.wireClickToFocus("companyChecklist", MC.HUB_FIELD_MAP, { openCompanyTab: false });
  }
  document.getElementById("dashChecklistNextBtn")?.addEventListener("click", () => {
    focusNextMandantField({ openCompanyTab: true });
  });
  document.getElementById("companyChecklistNextBtn")?.addEventListener("click", () => {
    focusNextMandantField({ openCompanyTab: false });
  });
}

async function runHubSyncCheck() {
  const firm = Boolean(window.WorkPassAuth?.isCompanyPortalUser?.());
  const session = Boolean(window.WorkPassAuth?.getSessionToken?.());
  if (!firm && !session) {
    hubShowSyncStatus("Sync prüfen braucht Firmen-Login (Plattform-Konto).", { error: true });
    return;
  }
  const syncBtn = document.getElementById("dashSyncCheckBtn");
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.setAttribute("aria-busy", "true");
    syncBtn.classList.add("is-busy");
  }
  hubShowSyncStatus("Sync wird geprüft …");
  try {
    let sync = await hubApiFetch("/v1/platform/status");
    let auto = null;
    if (firm) {
      try {
        auto = await hubApiFetch("/v1/payroll/auto-sync", {
          method: "POST",
          body: JSON.stringify({ period: hubCurrentPeriod() }),
        });
        sync = await hubApiFetch("/v1/platform/status");
      } catch {
        /* status alone is enough for the KPI */
      }
    }
    const pending = Number(sync?.pending?.messages || 0) + Number(sync?.pending?.deliveries || 0);
    const wh = sync?.webhook?.last || {};
    const pipe = sync?.autoPipeline || {};
    const payrollReleased = Number(auto?.jobs?.released ?? auto?.close?.newlyReleased?.length ?? 0);
    const invoicesReleased = Number(auto?.invoiceSync?.pendingReleased || auto?.invoices?.released || 0);
    const hint = hubFormatAutoSyncHint(sync, auto);
    const parts = [
      localizeHubSyncMessage(auto?.message || hint.text),
      hubT("hub.releasedCounts", "Freigegeben: {p} Abrechnung(en) · {i} Rechnung(en)", {
        p: payrollReleased,
        i: invoicesReleased,
      }),
      pipe.lastSuccessAt && !auto?.message
        ? hubT("hub.lastSuccess", "Letzter Erfolg: {at}", { at: pipe.lastSuccessAt })
        : null,
      pending ? hubT("hub.pendingCount", "Pending: {n}", { n: pending }) : null,
    ].filter(Boolean);
    const err = Boolean(hint.error || (wh.ok === false && sync?.webhook?.configured));
    hubShowSyncStatus(parts.join(" · "), { error: err, nextActions: hint.nextActions });
    hubSetText("dashKpiFirmSync", hubFormatSyncLabel(sync));
    window.WorkPassHub?.pushSyncLog?.({
      message: auto?.message || hint.text || hubT("hub.syncChecked", "Sync geprüft"),
      payrollReleased,
      invoicesReleased,
      pending,
    });
    await updateDashboard();
  } catch (err) {
    hubShowSyncStatus(err?.message || hubT("hub.syncFailed", "Sync-Prüfung fehlgeschlagen."), { error: true });
    hubSetText("dashKpiFirmSync", hubT("hub.offline", "Offline"));
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.removeAttribute("aria-busy");
      syncBtn.classList.remove("is-busy");
    }
  }
}

function getEmployeeYtdTotals(employeeName, year, currentMonth) {
  if (!window.AnnualCertificate?.buildAnnualCertificateData) return null;
  const data = window.AnnualCertificate.buildAnnualCertificateData({
    year,
    employeeName: normalizeEmployeeName(employeeName),
    history: readEmployeeHistory(),
    currentMonth,
    currentProfile: collectPayrollProfile(),
    calculateMonthPayroll: (profile) => calculatePayrollFromProfile(profile),
  });
  return data?.totals || null;
}

function updateLocalDashboardKpis() {
  const profiles = readCompanyProfiles();
  const history = readEmployeeHistory();
  const employeeNames = Object.keys(history);
  let monthCount = 0;
  employeeNames.forEach((name) => {
    monthCount += Object.keys(history[name] || {}).filter((m) => /^\d{4}-\d{2}$/.test(m)).length;
  });

  const archiveLen = window.WorkPassHub?.readInvoiceArchive?.()?.length || 0;
  hubSetText("dashKpiProfiles", String(Object.keys(profiles).length));
  hubSetText("dashKpiEmployees", String(employeeNames.length));
  hubSetText("dashKpiPayrollMonths", String(monthCount));
  hubSetText("dashKpiInvoicesLocal", String(archiveLen));
  const mode = getCurrentMode();
  hubSetText("dashKpiMode", mode === "payroll-annual"
    ? hubT("doc.annualTaxShort", "LStB")
    : (mode === "payroll" ? hubT("nav.lohn", "Lohn") : hubT("doc.invoice", "Rechnung")));

  const profileName = companyProfileNameInput?.value?.trim()
    || profiles[activeCompanyProfileId]?.name
    || "Standard-Mandant";

  return { employeeNames, monthCount, profileName, history };
}

function updateDashboardEmployeeTable(employeeNames, history) {
  const dashBody = document.getElementById("dashEmployeeBody");
  if (!dashBody) return;
  dashBody.innerHTML = "";
  if (!employeeNames.length) {
    dashBody.innerHTML = `<tr><td colspan="4" class="dash-empty">${escapeHtmlLite(hubT("hub.empEmpty", "Noch keine Lohn-Monatsdaten gespeichert."))}</td></tr>`;
    return;
  }
  employeeNames.sort((a, b) => a.localeCompare(b, "de")).forEach((name) => {
    const months = Object.keys(history[name] || {}).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
    const last = months[months.length - 1] || "-";
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = name;
    const tdCount = document.createElement("td");
    tdCount.textContent = String(months.length);
    const tdLast = document.createElement("td");
    tdLast.textContent = last;
    const tdAction = document.createElement("td");
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "secondary-btn dash-load-btn";
    loadBtn.textContent = hubT("common.load", "Laden");
    loadBtn.dataset.dashLoad = name;
    tdAction.appendChild(loadBtn);
    tr.append(tdName, tdCount, tdLast, tdAction);
    dashBody.appendChild(tr);
  });
}

let hubServerCompany = null;
let hubWorkspace = null;

function syncSellerFields(from) {
  const sellerVal = sellerInput?.value || "";
  const companyVal = companySellerInput?.value || "";
  if (from === "company" && sellerInput && companySellerInput) {
    if (sellerInput.value !== companySellerInput.value) sellerInput.value = companySellerInput.value;
  } else if (from === "seller" && companySellerInput && sellerInput) {
    if (companySellerInput.value !== sellerInput.value) companySellerInput.value = sellerInput.value;
  } else if (companySellerInput && !companySellerInput.value && sellerVal) {
    companySellerInput.value = sellerVal;
  } else if (sellerInput && !sellerVal && companyVal) {
    sellerInput.value = companyVal;
  }
}

function getSellerText() {
  return String(sellerInput?.value || companySellerInput?.value || "").trim();
}

function getMandantChecklistState() {
  syncSellerFields();
  const MC = window.MandantChecklist;
  if (MC?.evaluate) {
    return MC.evaluate({
      seller: getSellerText(),
      taxNumber: taxNumberInput?.value,
      vatId: vatIdInput?.value,
      companyIban: companyIbanInput?.value,
      logoDataUrl: activeLogoDataUrl,
      commercialRegister: commercialRegisterInput?.value,
      managingDirector: managingDirectorInput?.value,
      payrollLayout: payrollLayoutSelect?.value || "datev",
      datevClientNo: datevClientNoInput?.value,
      datevConsultantNo: datevConsultantNoInput?.value,
      server: hubServerCompany,
    });
  }
  return {
    seller: Boolean(getSellerText()),
    tax: Boolean(taxNumberInput?.value?.trim() || vatIdInput?.value?.trim()),
    bank: Boolean(companyIbanInput?.value?.trim()),
    logo: Boolean(activeLogoDataUrl),
    register: Boolean(commercialRegisterInput?.value?.trim() || managingDirectorInput?.value?.trim()),
    layout: Boolean(payrollLayoutSelect?.value || "datev"),
    datev: Boolean(datevClientNoInput?.value?.trim() || datevConsultantNoInput?.value?.trim()),
  };
}

function applyChecklistToDom(rootId, checks) {
  if (window.MandantChecklist?.applyToDom) {
    window.MandantChecklist.applyToDom(rootId, checks);
    return;
  }
  const checklist = document.getElementById(rootId);
  if (!checklist) return;
  checklist.querySelectorAll("li[data-check]").forEach((li) => {
    const key = li.dataset.check;
    li.classList.toggle("done", Boolean(checks[key]));
  });
}

function updateDashboardChecklist() {
  syncSellerFields();
  const checks = getMandantChecklistState();
  applyChecklistToDom("dashChecklist", checks);
  applyChecklistToDom("companyChecklist", checks);
  const MC = window.MandantChecklist;
  if (MC?.renderSummary) {
    MC.renderSummary("dashChecklistSummary", checks);
    MC.renderSummary("companyChecklistSummary", checks);
  }
}

function renderMandantAccountingStatus() {
  const el = document.getElementById("mandantAccountingStatus");
  if (!el) return;
  const firm = Boolean(window.WorkPassAuth?.isCompanyPortalUser?.());
  const checks = getMandantChecklistState();
  const MC = window.MandantChecklist;
  const sum = MC?.summary?.(checks) || { done: 0, total: 7, text: "" };
  const next = MC?.nextHint?.(checks) || "";
  if (!firm) {
    el.hidden = false;
    el.innerHTML = `<strong>${escapeHtmlLite(hubT("hub.localClient", "Lokaler Mandant"))}</strong> · ${escapeHtmlLite(sum.text)}${sum.done < sum.total ? ` · ${escapeHtmlLite(next)}` : ""}`;
    el.classList.toggle("is-ok", sum.done >= sum.total);
    el.classList.toggle("is-error", false);
    return;
  }
  const user = window.WorkPassAuth?.getSessionUser?.();
  const companyId = user?.companyId || hubApiConfig().companyId || "—";
  const ws = hubWorkspace || {};
  const active = ws.accountingEnabled !== false && (ws.workspaceStatus || "active") !== "inactive";
  const section = ws.section?.title || ws.section?.name || hubT("hub.accounting", "Buchhaltung");
  const name = hubServerCompany?.name || companyId;
  const hubOk = Boolean(hubServerCompany?.hubProfile || hubServerCompany?.meta?.hubProfile);
  el.hidden = false;
  el.innerHTML = active
    ? `<strong>${escapeHtmlLite(hubT("hub.accountingOn", "Buchhaltung aktiv"))}</strong> · ${escapeHtmlLite(name)} · ${escapeHtmlLite(section)} · ${escapeHtmlLite(sum.text)}${hubOk ? ` · ${escapeHtmlLite(hubT("hub.serverProfileOk", "Server-Profil ✓"))}` : ` · ${escapeHtmlLite(hubT("hub.serverProfileOpen", "Server-Profil offen"))}`}${sum.done < sum.total ? ` · ${escapeHtmlLite(next)}` : ""}`
    : `<strong>${escapeHtmlLite(hubT("hub.accountingOff", "Buchhaltung inaktiv"))}</strong> · ${escapeHtmlLite(name)} · ${escapeHtmlLite(hubT("hub.firmIdLine", "Firma {id}", { id: companyId }))} · ${escapeHtmlLite(hubT("hub.activateInAdmin", "bitte im Admin/Plattform aktivieren"))}`;
  el.classList.toggle("is-ok", active && sum.done >= sum.total);
  el.classList.toggle("is-error", !active);
}

function escapeHtmlLite(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseSellerAddress(sellerText) {
  const lines = String(sellerText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const name = lines[0] || "";
  let street = "";
  let zip = "";
  let city = "";
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const m = last.match(/^(\d{4,5})\s+(.+)$/);
    if (m) {
      zip = m[1];
      city = m[2];
      street = lines.length > 2 ? lines.slice(1, -1).join(", ") : "";
    } else {
      street = lines[1] || "";
      if (lines.length > 2) city = lines.slice(2).join(" ");
    }
  }
  return { name, street, zip, city, address: lines.join("\n") };
}

function buildHubProfilePayload() {
  const data = collectCompanyProfileData();
  return {
    seller: data.seller || "",
    commercialRegister: data.commercialRegister || "",
    managingDirector: data.managingDirector || "",
    companyBankName: data.companyBankName || "",
    companyIban: data.companyIban || "",
    companyBic: data.companyBic || "",
    datevClientNo: datevClientNoInput?.value || "",
    datevConsultantNo: datevConsultantNoInput?.value || "",
    payrollLayout: data.payrollLayout || "datev",
    payrollHeaderLine: data.payrollHeaderLine || "",
    payrollFooterLine: data.payrollFooterLine || "",
    note: data.note || "",
    logoDataUrl: data.logoDataUrl || "",
  };
}

function buildCompanyUpsertBody(companyId) {
  const data = collectCompanyProfileData();
  const parsed = parseSellerAddress(data.seller);
  const name = data.name && data.name !== "Unbenannt" && data.name !== "Standard-Mandant"
    ? data.name
    : (parsed.name || companyId);
  return {
    id: companyId,
    name,
    street: parsed.street,
    zip: parsed.zip,
    city: parsed.city,
    address: parsed.address || data.seller || "",
    taxNumber: data.taxNumber || "",
    vatId: data.vatId || "",
    datevClientNo: data.datevClientNo || "",
    datevConsultantNo: data.datevConsultantNo || "",
    hubProfile: buildHubProfilePayload(),
  };
}

function setMandantSyncHint(text, { error = false } = {}) {
  const el = document.getElementById("mandantProfileSyncHint");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("is-error", error);
  el.classList.toggle("is-ok", !error && /Server|synchron/i.test(text));
}

function fillIfEmpty(input, value) {
  if (!input || !value) return false;
  if (String(input.value || "").trim()) return false;
  input.value = String(value);
  return true;
}

function applyHubProfileFromServer(hubProfile, { force = false } = {}) {
  if (!hubProfile || typeof hubProfile !== "object") return false;
  let changed = false;
  const setVal = (input, value) => {
    if (value == null || value === "") return;
    if (!input) return;
    if (!force && String(input.value || "").trim()) return;
    input.value = String(value);
    changed = true;
  };
  if (hubProfile.seller) {
    if (force || !getSellerText()) {
      if (sellerInput) sellerInput.value = hubProfile.seller;
      syncSellerFields("seller");
      changed = true;
    }
  }
  setVal(commercialRegisterInput, hubProfile.commercialRegister);
  setVal(managingDirectorInput, hubProfile.managingDirector);
  setVal(companyBankNameInput, hubProfile.companyBankName);
  setVal(companyIbanInput, hubProfile.companyIban);
  setVal(companyBicInput, hubProfile.companyBic);
  setVal(datevClientNoInput, hubProfile.datevClientNo);
  setVal(datevConsultantNoInput, hubProfile.datevConsultantNo);
  setVal(payrollHeaderLineInput, hubProfile.payrollHeaderLine);
  setVal(payrollFooterLineInput, hubProfile.payrollFooterLine);
  if (hubProfile.payrollLayout && payrollLayoutSelect) {
    if (force || !payrollLayoutSelect.value) {
      payrollLayoutSelect.value = hubProfile.payrollLayout;
      applyPayrollLayout(hubProfile.payrollLayout);
      changed = true;
    }
  }
  if (hubProfile.note && noteInput && (force || !noteInput.value.trim())) {
    noteInput.value = hubProfile.note;
    changed = true;
  }
  if (hubProfile.logoDataUrl && (force || !activeLogoDataUrl)) {
    activeLogoDataUrl = hubProfile.logoDataUrl;
    updateDocumentLogos();
    changed = true;
  } else if (hubProfile.logoUrl && (force || !activeLogoDataUrl) && /^https?:\/\//i.test(String(hubProfile.logoUrl))) {
    // Platform sent remote logo URL – use until data-URL hydrate arrives
    activeLogoDataUrl = String(hubProfile.logoUrl);
    updateDocumentLogos();
    changed = true;
  }
  return changed;
}

async function pushCompanyProfileToBridge({ quiet = false } = {}) {
  const firm = Boolean(window.WorkPassAuth?.isCompanyPortalUser?.());
  const sessionToken = window.WorkPassAuth?.getSessionToken?.() || "";
  const companyId = window.WorkPassAuth?.getSessionUser?.()?.companyId || hubApiConfig().companyId;
  if (!companyId || (!firm && !sessionToken && !hubApiConfig().key)) {
    if (!quiet) setMandantSyncHint("Nur lokal gespeichert (kein Firmen-Login / API-Key).", { error: false });
    return { ok: false, skipped: true };
  }
  try {
    const body = buildCompanyUpsertBody(companyId);
    const result = await hubApiFetch("/v1/company/upsert", {
      method: "POST",
      body: JSON.stringify(body),
    });
    hubServerCompany = result.company || hubServerCompany;
    const msg = result.logoSkipped
      ? "Auf Server gespeichert (Logo lokal – zu groß)."
      : `Auf Server gespeichert · Firma ${companyId}`;
    setMandantSyncHint(msg, { error: false });
    if (!quiet && !result.logoSkipped) {
      /* toast via hint only */
    }
    return result;
  } catch (err) {
    setMandantSyncHint(err?.message || "Server-Sync fehlgeschlagen.", { error: true });
    return { ok: false, error: err?.message };
  }
}

async function pullCompanyProfileFromBridge({ force = false } = {}) {
  const companyId = window.WorkPassAuth?.getSessionUser?.()?.companyId || hubApiConfig().companyId;
  if (!companyId || !window.WorkPassAuth?.getSessionToken?.()) return { ok: false, skipped: true };
  try {
    const data = await hubApiFetch(`/v1/company/${encodeURIComponent(companyId)}`);
    const company = data.company;
    if (!company) return { ok: false };
    hubServerCompany = {
      id: company.id,
      name: company.name,
      street: company.street,
      zip: company.zip,
      city: company.city,
      address: company.address,
      taxNumber: company.taxNumber,
      vatId: company.vatId,
      hubProfile: company.meta?.hubProfile || null,
    };
    hubWorkspace = data.workspace || hubWorkspace;
    fillIfEmpty(taxNumberInput, company.taxNumber);
    fillIfEmpty(vatIdInput, company.vatId);
    fillIfEmpty(datevClientNoInput, company.datevClientNo);
    fillIfEmpty(datevConsultantNoInput, company.datevConsultantNo);
    if (companyProfileNameInput && (force || !companyProfileNameInput.value.trim() || companyProfileNameInput.value === "Standard-Mandant")) {
      if (company.name) companyProfileNameInput.value = company.name;
    }
    if (!getSellerText() || force) {
      const addr = company.address
        || [company.name, company.street, [company.zip, company.city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
      if (addr) {
        if (sellerInput) sellerInput.value = addr;
        syncSellerFields("seller");
      }
    }
    applyHubProfileFromServer(company.meta?.hubProfile, { force });
    updateDashboardChecklist();
    renderMandantAccountingStatus();
    setMandantSyncHint(
      company.meta?.hubProfile
        ? hubT("hub.loadedFromServer", "Vom Server geladen · {name}", { name: company.name || companyId })
        : hubT("hub.fromServerLocal", "Firma vom Server · Stammdaten-Erweiterung noch lokal"),
      { error: false }
    );
    return { ok: true, company };
  } catch (err) {
    setMandantSyncHint(err?.message || hubT("hub.loadServerFail", "Laden vom Server fehlgeschlagen."), { error: true });
    return { ok: false, error: err?.message };
  }
}

async function refreshMandantAccountingStatus() {
  if (!window.WorkPassAuth?.isCompanyPortalUser?.()) {
    hubServerCompany = null;
    hubWorkspace = null;
    renderMandantAccountingStatus();
    setMandantSyncHint("Lokal gespeichert. Mit Firmen-Login zusätzlich auf dem Server.");
    return;
  }
  try {
    const me = await hubApiFetch("/v1/auth/me", { skipTenant: true });
    hubWorkspace = me?.workspace || null;
    if (me?.company) {
      hubServerCompany = me.company;
      fillIfEmpty(taxNumberInput, me.company.taxNumber);
      fillIfEmpty(vatIdInput, me.company.vatId);
      if (!getSellerText() && (me.company.name || me.company.address)) {
        const addr = me.company.address
          || [me.company.name, me.company.street, [me.company.zip, me.company.city].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join("\n");
        if (sellerInput) sellerInput.value = addr;
        syncSellerFields("seller");
      }
      applyHubProfileFromServer(me.company.hubProfile, { force: false });
    }
    await pullCompanyProfileFromBridge({ force: false });
  } catch {
    hubWorkspace = hubWorkspace || { accountingEnabled: true, workspaceStatus: "unknown" };
  }
  renderMandantAccountingStatus();
  updateDashboardChecklist();
}

function hubFirmOutcome({ employees = 0, released = 0, pending = 0, syncLabel = "—", period = "", whStatus = "" } = {}) {
  if (syncLabel === "Fehler" || whStatus === 401) {
    return {
      title: hubT("hub.outcome.platformBlocked", "Plattform antwortet nicht"),
      hint: hubT("hub.outcome.platformBlockedHint", "Webhook auf der Plattform prüfen – danach Sync erneut starten."),
      tone: "warn",
    };
  }
  if (Number(employees) === 0 && Number(released) === 0) {
    return {
      title: hubT("hub.outcome.needsSync", "Bereit für den ersten Sync"),
      hint: hubT("hub.outcome.needsSyncHint", "Tippen Sie auf „Jetzt synchronisieren“ – WorkPass holt Ihre Mitarbeiter automatisch."),
      tone: "ready",
    };
  }
  if (Number(pending) > 0) {
    return {
      title: hubT("hub.outcome.waiting", "Wartet auf Plattformdaten"),
      hint: hubT("hub.outcome.waitingHint", "{n} offene Nachricht(en) · Monat {period} läuft weiter für vollständige Personen.", { n: pending, period }),
      tone: "wait",
    };
  }
  if (Number(released) > 0 && Number(released) >= Number(employees) && Number(employees) > 0) {
    return {
      title: hubT("hub.outcome.done", "Alles bereit für diesen Monat"),
      hint: hubT("hub.outcome.doneHint", "{released} Abrechnung(en) freigegeben · Monat {period}", { released, period }),
      tone: "ok",
    };
  }
  return {
    title: hubT("hub.outcome.active", "Lohnlauf aktiv"),
    hint: hubT("hub.outcome.activeHint", "{employees} Mitarbeiter · {released} freigegeben · Monat {period}", { employees, released, period }),
    tone: "ok",
  };
}

function renderFirmCockpit({ name, companyId, period, outcome, meta }) {
  const cockpit = document.getElementById("firmCockpit");
  if (!cockpit) return;
  cockpit.hidden = false;
  cockpit.dataset.tone = outcome?.tone || "ready";
  hubSetText("firmCockpitName", name || companyId || "—");
  hubSetText("firmCockpitStatus", outcome?.title || "—");
  const hintEl = document.getElementById("firmCockpitMeta");
  if (hintEl) {
    const parts = [outcome?.hint, meta].filter(Boolean);
    hintEl.textContent = parts.join(" · ");
  }
}

async function updateDashboard() {
  const seq = ++hubDashboardSeq;
  const firm = Boolean(window.WorkPassAuth?.isCompanyPortalUser?.());
  const localGrid = document.getElementById("dashKpiGridLocal");
  const firmGrid = document.getElementById("dashKpiGridFirm");
  const actionsLocal = document.getElementById("dashActionsLocal");
  const actionsFirm = document.getElementById("dashActionsFirm");
  const firmCockpit = document.getElementById("firmCockpit");
  const onboard = document.getElementById("onboardingBanner");
  const hubBanner = document.getElementById("dashHubBanner");
  if (localGrid) localGrid.hidden = firm;
  if (firmGrid) firmGrid.hidden = !firm;
  if (actionsLocal) actionsLocal.hidden = firm;
  if (actionsFirm) actionsFirm.hidden = !firm;
  if (firmCockpit) firmCockpit.hidden = !firm;
  if (onboard) onboard.hidden = firm || onboard.hidden;
  if (hubBanner) hubBanner.hidden = firm;
  document.body.classList.toggle("company-portal", firm);

  const { employeeNames, monthCount, profileName, history } = updateLocalDashboardKpis();
  updateDashboardEmployeeTable(employeeNames, history);
  updateDashboardChecklist();
  await refreshMandantAccountingStatus();

  const localMeta = document.getElementById("dashLocalMeta");
  if (!firm) {
    if (firmCockpit) firmCockpit.hidden = true;
    hubSetText("dashWelcomeText", hubT("hub.welcomeLocal", "Mandant „{name}“ · {n} gespeicherte Lohn-Monate", {
      name: profileName,
      n: monthCount,
    }));
    if (localMeta) localMeta.textContent = "";
    return;
  }

  const user = window.WorkPassAuth?.getSessionUser?.();
  const companyId = user?.companyId || hubApiConfig().companyId || "—";
  const companyName = hubServerCompany?.name || hubWorkspace?.name || user?.companyName || companyId;
  hubSetText("dashWelcomeText", hubT("hub.firmHeadline", "{name} · Lohn & Belege", { name: companyName }));
  if (localMeta) {
    localMeta.textContent = hubT("hub.firmMetaQuiet", "Monat {period} · ID {id}", {
      period: hubCurrentPeriod(),
      id: companyId,
    });
  }

  const period = hubCurrentPeriod();
  try {
    const [emps, month, inbox, invArch, msgs, sync] = await Promise.all([
      hubApiFetch(`/v1/portal/employees?period=${encodeURIComponent(period)}`),
      hubApiFetch(`/v1/portal/month?period=${encodeURIComponent(period)}&months=6`),
      hubApiFetch("/v1/inbox").catch(() => ({ invoices: [] })),
      hubApiFetch("/v1/portal/invoices?all=1").catch(() => ({ count: 0 })),
      hubApiFetch("/v1/messages?status=open").catch(() => ({ count: 0, messages: [] })),
      hubApiFetch("/v1/platform/status").catch(() => null),
    ]);
    if (seq !== hubDashboardSeq) return;

    const released = Number(month?.current?.released || 0);
    const empCount = Number(emps?.count || 0);
    const invoiceCount = Number(invArch?.count)
      || (Array.isArray(inbox?.invoices) ? inbox.invoices.length : 0);
    const msgCount = Number(msgs?.count ?? (msgs?.messages || []).length ?? 0);
    const syncLabel = hubFormatSyncLabel(sync);

    hubSetText("dashKpiFirmEmployees", String(empCount));
    hubSetText("dashKpiFirmReleased", String(released));
    hubSetText("dashKpiFirmInvoices", String(invoiceCount));
    hubSetText("dashKpiFirmMessages", String(msgCount));
    hubSetText("dashKpiFirmSync", syncLabel);
    window.WorkPassHub?.setServerInvoices?.(invArch?.items || inbox?.invoices || []);
    window.hubApiFetch = hubApiFetch;

    const pending = Number(sync?.pending?.messages || 0) + Number(sync?.pending?.deliveries || 0);
    const wh = sync?.webhook?.last || {};
    const outcome = hubFirmOutcome({
      employees: empCount,
      released,
      pending,
      syncLabel,
      period,
      whStatus: wh.status,
    });
    renderFirmCockpit({
      name: companyName,
      companyId,
      period,
      outcome,
      meta: hubT("hub.firmMetaQuiet", "Monat {period} · ID {id}", { period, id: companyId }),
    });
    hubSetText("dashWelcomeText", `${companyName} · ${outcome.title}`);
    const hint = hubFormatAutoSyncHint(sync);
    if (!document.getElementById("dashSyncStatus")?.textContent || document.getElementById("dashSyncStatus")?.hidden) {
      hubShowSyncStatus(hint.text, { error: hint.error, nextActions: hint.nextActions });
    } else if (hint.nextActions?.length) {
      const list = document.getElementById("dashSyncNextActions");
      if (list && list.hidden) {
        list.hidden = false;
        list.innerHTML = hint.nextActions.slice(0, 4).map((a) => `<li>${escapeHtmlLite(a)}</li>`).join("");
      }
    }
  } catch (err) {
    if (seq !== hubDashboardSeq) return;
    hubSetText("dashKpiFirmEmployees", "—");
    hubSetText("dashKpiFirmReleased", "—");
    hubSetText("dashKpiFirmInvoices", "—");
    hubSetText("dashKpiFirmMessages", "—");
    hubSetText("dashKpiFirmSync", hubT("hub.offline", "Offline"));
    const outcome = {
      title: hubT("hub.outcome.offline", "Verbindung wird geprüft"),
      hint: hubT("hub.outcome.offlineHint", "Kurz warten oder später erneut öffnen."),
      tone: "warn",
    };
    renderFirmCockpit({
      name: companyName,
      companyId,
      period,
      outcome,
      meta: hubT("hub.firmMetaQuiet", "Monat {period} · ID {id}", { period, id: companyId }),
    });
    hubSetText("dashWelcomeText", `${companyName} · ${outcome.title}`);
  }
}

window.updateDashboard = updateDashboard;
window.runHubSyncCheck = runHubSyncCheck;
window.hubApiFetch = hubApiFetch;

function initTabs() {
  document.querySelectorAll(".form-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (target === "payroll") {
        window.location.href = "lohn.html";
        return;
      }
      document.querySelectorAll(".form-tab").forEach((t) => {
        const active = t.dataset.tab === target;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tabPanel === target);
      });
      document.body.classList.toggle("dashboard-tab", target === "dashboard");
      document.body.classList.toggle("help-tab", target === "help");
      document.body.classList.toggle("company-tab", target === "company");
      updateTopbarForMode();
      updateDashboard();
      updatePreview();
    });
  });
  const initialTab = document.querySelector(".form-tab.active")?.dataset.tab || "dashboard";
  document.body.classList.toggle("dashboard-tab", initialTab === "dashboard");
  document.body.classList.toggle("help-tab", initialTab === "help");
  document.body.classList.toggle("company-tab", initialTab === "company");
}

function syncDocTypeCards(mode) {
  docTypeCards.forEach((card) => {
    const active = card.dataset.docType === mode;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function initDocTypeCards() {
  docTypeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const type = card.dataset.docType;
      if (!type || !documentTypeInput) return;
      if (type === "payroll" || type === "payroll-annual") {
        window.location.href = type === "payroll-annual" ? "lohn.html#portalExportCard" : "lohn.html";
        return;
      }
      documentTypeInput.value = type;
      syncDocTypeCards(type);
      if (!invoiceNumberInput.value.trim()) setDefaultInvoiceNumber();
      if (type === "payroll") {
        if (payrollLayoutSelect) payrollLayoutSelect.value = "datev";
        applyPayrollLayout("datev");
        updateLayoutDescription();
      }
      updatePreview();
      saveDraft(false);
    });
  });
  syncDocTypeCards(getCurrentMode());
}

function updateLexShellUI() {
  const mode = getCurrentMode();
  const activeTab = document.querySelector(".form-tab.active")?.dataset.tab || "document";
  const tt = (k, fb) => (window.WorkPassI18n?.t?.(k) && window.WorkPassI18n.t(k) !== k)
    ? window.WorkPassI18n.t(k)
    : fb;
  const tabLabels = {
    dashboard: tt("nav.overview", "Übersicht"),
    document: tt("nav.document", "Rechnung"),
    company: tt("nav.company", "Firma"),
    payroll: tt("nav.payrollFull", "Lohnabrechnung"),
    help: tt("nav.help", "Hilfe"),
  };
  const docLabels = {
    invoice: tt("doc.invoice", "Rechnung"),
    payroll: tt("doc.payroll", "Lohnabrechnung (monatlich)"),
    "payroll-annual": tt("doc.payrollAnnual", "Lohnsteuerbescheinigung"),
  };
  if (lexBcModule) lexBcModule.textContent = tabLabels[activeTab] || tabLabels.document;
  if (lexBcDoc) {
    lexBcDoc.textContent = activeTab === "dashboard" ? tt("doc.home", "Startseite") : (docLabels[mode] || docLabels.invoice);
  }
  const profileName = companyProfileNameInput?.value?.trim()
    || readCompanyProfiles()[activeCompanyProfileId]?.name
    || tt("mandant.default", "Standard-Mandant");
  const mandantLine = `${tt("mandant.label", "Mandant")}: ${profileName}`;
  if (lexAppbarMandant) lexAppbarMandant.textContent = mandantLine;
  if (lexStatusMandant) lexStatusMandant.textContent = mandantLine;
}

function updateTopbarForMode() {
  const mode = getCurrentMode();
  const activeTab = document.querySelector(".form-tab.active")?.dataset.tab || "document";
  const tt = (k, fb) => (window.WorkPassI18n?.t?.(k) && window.WorkPassI18n.t(k) !== k)
    ? window.WorkPassI18n.t(k)
    : fb;
  const tabTitles = {
    dashboard: tt("nav.overview", "Übersicht"),
    document: tt("nav.document", "Rechnung"),
    company: tt("nav.company", "Firma"),
    payroll: tt("menu.payrollGroup", "Lohn & Gehalt"),
    help: tt("nav.help", "Hilfe"),
  };
  const tabSubs = {
    dashboard: tt("hub.sub.dashboard", "Dashboard · Mandant, Mitarbeiter & Schnellzugriff"),
    document: mode === "payroll-annual"
      ? tt("hub.sub.annual", "Jahres-Lohnsteuerbescheinigung · ELSTER-kompatibel")
      : (mode === "payroll" ? tt("hub.sub.payroll", "Monatsabrechnung · DATEV LOHN17 (1:1 Referenz)") : tt("hub.sub.invoice", "Ausgangsrechnungen nach § 14 UStG")),
    company: tt("hub.sub.company", "Firmenprofil · Briefkopf, Steuer-Nr., IBAN — nicht die LStB der Mitarbeiter"),
    payroll: tt("hub.sub.payrollMenu", "Monatsabrechnung · DATEV LOHN17 · Referenz Mustermann"),
    help: tt("hub.sub.help", "Schnellstart, Pflichtfelder, Export & Recht"),
  };
  if (topbarHeading) topbarHeading.textContent = tabTitles[activeTab] || tabTitles.document;
  if (topbarSubheading) topbarSubheading.textContent = tabSubs[activeTab] || tabSubs.document;
  updateLexShellUI();
}

/* ── Company Profiles ── */

function defaultCompanyProfile() {
  return {
    id: "default",
    name: "Standard-Mandant",
    seller: "",
    taxNumber: "",
    vatId: "",
    commercialRegister: "",
    managingDirector: "",
    companyBankName: "",
    companyIban: "",
    companyBic: "",
    datevClientNo: "",
    datevConsultantNo: "",
    payrollLayout: "datev",
    payrollHeaderLine: "",
    payrollFooterLine: "",
    logoDataUrl: "",
    note: LEGAL_CONFIG.invoice.defaultNote,
  };
}

function setLogoPreviewImage(imgEl, dataUrl) {
  if (!imgEl) return;
  if (dataUrl) {
    imgEl.src = dataUrl;
    imgEl.classList.remove("hidden");
  } else {
    imgEl.removeAttribute("src");
    imgEl.classList.add("hidden");
  }
}

function updateDocumentLogos() {
  setLogoPreviewImage(previewCompanyLogo, activeLogoDataUrl);
  setLogoPreviewImage(payrollHeadLogo, activeLogoDataUrl);
  setLogoPreviewImage(companyLogoPreview, activeLogoDataUrl);
}

function resizeLogoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bildformat nicht unterstützt."));
      img.onload = () => {
        const scale = img.width > LOGO_MAX_WIDTH ? LOGO_MAX_WIDTH / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, 0.92));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleLogoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    window.alert("Bitte eine Bilddatei (PNG, JPG, WebP) auswählen.");
    return;
  }
  if (file.size > LOGO_MAX_BYTES) {
    window.alert("Logo ist zu groß. Maximal 2 MB erlaubt.");
    return;
  }
  try {
    activeLogoDataUrl = await resizeLogoFile(file);
    updateDocumentLogos();
    saveDraft(false);
    updateDashboardChecklist();
  } catch (error) {
    window.alert("Logo konnte nicht verarbeitet werden.");
    console.error(error);
  }
}

function removeCompanyLogo() {
  activeLogoDataUrl = "";
  if (companyLogoInput) companyLogoInput.value = "";
  updateDocumentLogos();
  saveDraft(false);
  updateDashboardChecklist();
}

function readCompanyProfiles() {
  try {
    const raw = localStorage.getItem(COMPANY_PROFILES_KEY);
    if (!raw) return { default: defaultCompanyProfile() };
    const parsed = JSON.parse(raw);
    if (!parsed.default) parsed.default = defaultCompanyProfile();
    return parsed;
  } catch {
    return { default: defaultCompanyProfile() };
  }
}

function writeCompanyProfiles(profiles) {
  localStorage.setItem(COMPANY_PROFILES_KEY, JSON.stringify(profiles));
}

function collectCompanyProfileData() {
  syncSellerFields();
  return {
    id: activeCompanyProfileId,
    name: companyProfileNameInput?.value?.trim() || "Unbenannt",
    seller: getSellerText(),
    taxNumber: taxNumberInput?.value || "",
    vatId: vatIdInput?.value || "",
    commercialRegister: commercialRegisterInput?.value || "",
    managingDirector: managingDirectorInput?.value || "",
    companyBankName: companyBankNameInput?.value || "",
    companyIban: companyIbanInput?.value || "",
    companyBic: companyBicInput?.value || "",
    datevClientNo: datevClientNoInput?.value || "",
    datevConsultantNo: datevConsultantNoInput?.value || "",
    payrollLayout: payrollLayoutSelect?.value || "datev",
    payrollHeaderLine: payrollHeaderLineInput?.value || "",
    payrollFooterLine: payrollFooterLineInput?.value || "",
    logoDataUrl: activeLogoDataUrl,
    note: noteInput.value,
  };
}

function applyCompanyProfile(profile) {
  if (!profile) return;
  if (companyProfileNameInput) companyProfileNameInput.value = profile.name || "";
  sellerInput.value = profile.seller || "";
  syncSellerFields("seller");
  if (taxNumberInput) taxNumberInput.value = profile.taxNumber || "";
  if (vatIdInput) vatIdInput.value = profile.vatId || "";
  if (commercialRegisterInput) commercialRegisterInput.value = profile.commercialRegister || "";
  if (managingDirectorInput) managingDirectorInput.value = profile.managingDirector || "";
  if (companyBankNameInput) companyBankNameInput.value = profile.companyBankName || "";
  if (companyIbanInput) companyIbanInput.value = profile.companyIban || "";
  if (companyBicInput) companyBicInput.value = profile.companyBic || "";
  if (datevClientNoInput) datevClientNoInput.value = profile.datevClientNo || "";
  if (datevConsultantNoInput) datevConsultantNoInput.value = profile.datevConsultantNo || "";
  if (payrollLayoutSelect) payrollLayoutSelect.value = profile.payrollLayout || "datev";
  if (payrollHeaderLineInput) payrollHeaderLineInput.value = profile.payrollHeaderLine || "";
  if (payrollFooterLineInput) payrollFooterLineInput.value = profile.payrollFooterLine || "";
  activeLogoDataUrl = profile.logoDataUrl || "";
  if (companyLogoInput) companyLogoInput.value = "";
  updateDocumentLogos();
  if (profile.note) noteInput.value = profile.note;
  applyPayrollLayout(profile.payrollLayout || "datev");
  updateLayoutDescription();
  updateLexShellUI();
  updateDashboardChecklist();
}

function refreshCompanyProfileSelect(applyProfile = true) {
  if (!companyProfileSelect) return;
  const profiles = readCompanyProfiles();
  const current = companyProfileSelect.value || activeCompanyProfileId;
  companyProfileSelect.innerHTML = "";
  Object.values(profiles).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    companyProfileSelect.appendChild(opt);
  });
  companyProfileSelect.value = profiles[current] ? current : "default";
  activeCompanyProfileId = companyProfileSelect.value;
  if (applyProfile) applyCompanyProfile(profiles[activeCompanyProfileId]);
}

function initPayrollLayoutSelect() {
  if (!payrollLayoutSelect) return;
  payrollLayoutSelect.innerHTML = "";
  Object.values(PAYROLL_LAYOUTS).forEach((layout) => {
    const opt = document.createElement("option");
    opt.value = layout.id;
    opt.textContent = layout.name;
    payrollLayoutSelect.appendChild(opt);
  });
  payrollLayoutSelect.value = getSelectedPayrollLayout() || "datev";
}

async function saveCurrentCompanyProfile(showMessage = true) {
  const profiles = readCompanyProfiles();
  const data = collectCompanyProfileData();
  const id = activeCompanyProfileId === "default" && data.name !== "Standard-Mandant"
    ? `profile-${Date.now()}`
    : activeCompanyProfileId;
  data.id = id;
  profiles[id] = data;
  if (id !== activeCompanyProfileId && activeCompanyProfileId !== "default") {
    delete profiles[activeCompanyProfileId];
  }
  activeCompanyProfileId = id;
  writeCompanyProfiles(profiles);
  refreshCompanyProfileSelect();
  updateDashboardChecklist();
  const sync = await pushCompanyProfileToBridge({ quiet: !showMessage });
  if (showMessage) {
    if (sync?.ok && !sync.skipped) {
      window.alert(sync.logoSkipped
        ? "Mandantenprofil lokal und auf dem Server gespeichert (Logo nur lokal – zu groß)."
        : "Mandantenprofil lokal und auf dem Server gespeichert.");
    } else if (sync?.skipped) {
      window.alert("Mandantenprofil lokal gespeichert.");
    } else {
      window.alert(`Mandantenprofil lokal gespeichert.\nServer: ${sync?.error || "Sync fehlgeschlagen"}`);
    }
  }
}

function createNewCompanyProfile() {
  const name = window.prompt("Name des neuen Mandantenprofils:", "Neuer Mandant");
  if (!name?.trim()) return;
  const id = `profile-${Date.now()}`;
  const profiles = readCompanyProfiles();
  profiles[id] = { ...defaultCompanyProfile(), id, name: name.trim(), seller: "" };
  activeCompanyProfileId = id;
  writeCompanyProfiles(profiles);
  refreshCompanyProfileSelect();
  applyCompanyProfile(profiles[id]);
  saveDraft(false);
}

function deleteCurrentCompanyProfile() {
  if (activeCompanyProfileId === "default") {
    window.alert("Das Standard-Profil kann nicht gelöscht werden.");
    return;
  }
  if (!window.confirm("Mandantenprofil wirklich löschen?")) return;
  const profiles = readCompanyProfiles();
  delete profiles[activeCompanyProfileId];
  activeCompanyProfileId = "default";
  writeCompanyProfiles(profiles);
  refreshCompanyProfileSelect();
  saveDraft(false);
}

/* ── Payroll Layouts ── */

function normalizePayrollLayoutId(layoutId) {
  return PAYROLL_LAYOUTS[layoutId] ? layoutId : "datev";
}

function isDatevPayrollLayout(layoutId = getSelectedPayrollLayout()) {
  return normalizePayrollLayoutId(layoutId) === "datev";
}

function getPayrollLayoutMeta(layoutId = getSelectedPayrollLayout()) {
  return PAYROLL_LAYOUTS[normalizePayrollLayoutId(layoutId)] || PAYROLL_LAYOUTS.datev;
}

function applyPayrollLayout(layoutId) {
  if (!payrollSheet) return;
  Object.values(PAYROLL_LAYOUTS).forEach((layout) => {
    payrollSheet.classList.remove(layout.className);
    verdienstSheet?.classList.remove(layout.className);
  });
  const layout = getPayrollLayoutMeta(layoutId);
  payrollSheet.classList.add(layout.className);
  verdienstSheet?.classList.add(layout.className);
  if (payrollLayoutSelect && payrollLayoutSelect.value !== layout.id) {
    payrollLayoutSelect.value = layout.id;
  }
  syncPayrollTemplatePickerActive();
  updateLayoutDescription();
}

function setVerdienstPreviewMode(active) {
  verdienstPreviewMode = Boolean(active);
  document.body.classList.toggle("verdienst-preview-mode", verdienstPreviewMode);
  if (previewVerdienstBtn) {
    const tt = (k, fb) => (window.WorkPassI18n?.t?.(k) && window.WorkPassI18n.t(k) !== k)
      ? window.WorkPassI18n.t(k) : fb;
    previewVerdienstBtn.textContent = verdienstPreviewMode ? tt("hub.showPayslip", "Abrechnung") : tt("hub.showVb", "VB anzeigen");
    previewVerdienstBtn.title = verdienstPreviewMode
      ? tt("hub.backPayslip", "Zur Monatsabrechnung zurück")
      : tt("hub.showVbTitle", "Verdienstbescheinigung anzeigen");
  }
  if (!verdienstPreviewMode && getCurrentMode() === "payroll") {
    payrollSheet?.classList.remove("hidden");
    verdienstSheet?.classList.add("hidden");
  }
}

function syncVerdienstSheetMeta(payroll, employeeName, monthLabel) {
  const meta = document.getElementById("vbMeta");
  if (meta) {
    meta.textContent = `${formatEmployeeSalutation(employeeName)} · ${monthLabel} · Pers.-Nr. ${employeeIdInput.value.trim() || "-"}`;
  }
  const ts = document.getElementById("vbTimestamp");
  if (ts) ts.textContent = buildAgendaTimestampLine();
}

function printVerdienstbescheinigung() {
  if (getCurrentMode() !== "payroll") return;
  if (!validatePayrollDocumentBeforePrint()) return;
  updatePreview();
  document.body.classList.add("print-verdienst-only");
  const clearPrintMode = () => {
    document.body.classList.remove("print-verdienst-only");
    window.removeEventListener("afterprint", clearPrintMode);
  };
  window.addEventListener("afterprint", clearPrintMode);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      setTimeout(clearPrintMode, 1200);
    });
  });
}

function updateLayoutDescription() {
  const layout = getPayrollLayoutMeta();
  const text = layout.description;
  if (payrollLayoutDescription) payrollLayoutDescription.textContent = text;
  if (payrollLayoutDescriptionPayroll) payrollLayoutDescriptionPayroll.textContent = text;
}

function syncPayrollTemplatePickerActive() {
  const activeId = getSelectedPayrollLayout();
  document.querySelectorAll(".payroll-template-card").forEach((card) => {
    const selected = card.dataset.payrollLayout === activeId;
    card.classList.toggle("active", selected);
    card.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function initPayrollTemplatePicker() {
  if (!payrollTemplatePicker) return;
  payrollTemplatePicker.innerHTML = "";
  Object.values(PAYROLL_LAYOUTS).forEach((layout) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "doc-type-card payroll-template-card";
    btn.dataset.payrollLayout = layout.id;
    btn.setAttribute("aria-pressed", "false");
    const short = layout.description.split("–")[0].split(":")[0].trim();
    btn.innerHTML = `<strong>${layout.name}</strong><span>${short}</span>`;
    btn.addEventListener("click", () => {
      if (layout.id === "datev") {
        loadDatevReferenceDemo();
        return;
      }
      if (payrollLayoutSelect) payrollLayoutSelect.value = layout.id;
      applyPayrollLayout(layout.id);
      updatePreview();
      saveDraft(false);
    });
    payrollTemplatePicker.appendChild(btn);
  });
  syncPayrollTemplatePickerActive();
}

function loadReferenceForCurrentLayout() {
  const meta = getPayrollLayoutMeta();
  if (meta.referenceDemo === "datev") loadDatevReferenceDemo();
  else loadAgendaReferenceDemo(meta.id);
}

function getSelectedPayrollLayout() {
  return payrollLayoutSelect?.value || "datev";
}

function ensurePayrollDefaultLayout() {
  const layout = payrollLayoutSelect?.value || "datev";
  if (payrollLayoutSelect && !PAYROLL_LAYOUTS[layout]) {
    payrollLayoutSelect.value = "datev";
  }
  applyPayrollLayout(payrollLayoutSelect?.value || "datev");
}

function loadDatevReferenceDemo() {
  datevReferenceLoading = true;
  documentTypeInput.value = "payroll";
  syncDocTypeCards("payroll");
  if (payrollLayoutSelect) payrollLayoutSelect.value = "datev";
  applyPayrollLayout("datev");
  loadBuiltInTemplate("datev_mustermann_juli2025");
  applyReferenzPngDirect();
  datevReferenceLoading = false;
  updatePreview();
  saveDraft(false);
}

function applyReferenzPngDirect() {
  payrollBgDataUrl = PAYROLL_BG_REF_PATH;
  usePdfBackground = true;
  hidePdfChrome = true;
  if (usePdfBackgroundInput) usePdfBackgroundInput.checked = true;
  if (hidePdfChromeInput) hidePdfChromeInput.checked = true;
  savePayrollBackgroundSettings();
  applyPayrollBackgroundUI();
}

function setOverlayText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "-";
}

function buildDatevSheetData(payroll) {
  const ref = useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY : null;
  const imported = importedCsvTotals;
  const num = (key, fallback) => {
    if (ref && ref[key] != null) return ref[key];
    if (imported && imported[key] != null) return imported[key];
    return fallback;
  };

  const taxTotal = num("payrollTax", payroll.payrollTax) + num("churchTax", payroll.churchTax) + num("solidarity", payroll.solidarity);
  const svTotal = num("health", payroll.health)
    + num("pension", payroll.pension)
    + num("care", payroll.care)
    + num("unemployment", payroll.unemployment);
  const gross = num("gross", payroll.gross);
  const net = num("net", payroll.net);
  const wages = getWageRowsData();
  const wage840 = wages.find((w) => w.code === "840");
  const wage2000 = wages.find((w) => w.code === "2000");
  const empId = employeeIdInput.value.trim() || "-";

  return {
    usa: buildDatevUsaLine(),
    headDate: getPayrollMonthEndDate(payrollMonthInput.value),
    headPage: "Blatt 1",
    persNr: empId === "-" ? "" : empId,
    birth: formatDateShortDatev(employeeBirthDateInput.value),
    stkl: taxClassToDisplay(taxClassInput.value),
    konf: Number(churchTaxRateInput?.value) > 0 ? "ev" : "",
    stTg: workDaysInput.value || "30",
    svNr: employeeInsuranceNoInput?.value || "",
    kkName: healthFundInput?.value || "",
    kkPct: useDatevReferenceDisplay ? "14,90" : formatNumber(Number(healthPercentInput?.value) || 0),
    pgrs: "101",
    bgrs: "1112",
    svTg: workDaysInput.value || "30",
    vacPrev: "0,00",
    vacEnt: "0,00",
    workDays: formatNumber(Number(workDaysInput.value) || 0),
    workHours: formatNumber(Number(workHoursInput.value) || 0),
    sender: formatEmployerDatevLine(sellerInput.value.trim()),
    empMeta: empId !== "-"
      ? `*Pers.-Nr. ${empId}*`
      : "",
    empName: formatEmployeeSalutation(employeeNameInput.value.trim() || ""),
    empAddr: getEmployeeAddressText() || "",
    entry: formatDateShortDatev(employeeEntryDateInput.value),
    taxIdMid: useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY.taxIdMid : (employeeTaxIdInput.value.trim().slice(0, 4) || ""),
    hints: buildDatevHintsText(payroll),
    wage840: wage840 ? formatAmount(wage840.amount) : "",
    wage2000: wage2000 ? formatAmount(wage2000.amount) : "",
    grossTotal: formatAmount(gross),
    taxTotal: formatAmount(ref ? taxTotal : payroll.payrollTax + payroll.churchTax + payroll.solidarity),
    svTotal: formatAmount(ref ? DATEV_REFERENCE_DISPLAY.svTotal : svTotal),
    netTotal: formatAmount(net),
    payout: formatAmount(net),
    stBrutto: formatAmount(num("taxGross", payroll.taxGross || payroll.gross)),
    lst: formatAmount(num("payrollTax", payroll.payrollTax)),
    kist: formatAmount(num("churchTax", payroll.churchTax)),
    kvB: formatAmount(num("svGross", payroll.svGross || payroll.gross)),
    rvB: formatAmount(num("svGross", payroll.svGross || payroll.gross)),
    kvBeitrag: formatAmount(num("health", payroll.health)),
    rvBeitrag: formatAmount(num("pension", payroll.pension)),
    avBeitrag: formatAmount(num("unemployment", payroll.unemployment)),
    pvBeitrag: formatAmount(num("care", payroll.care)),
    bank: `Bank ${bankNameInput.value.trim() || ""}`,
    konto: window.PayrollCore?.formatPayslipKonto
      ? window.PayrollCore.formatPayslipKonto(useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY.bankIbanDisplay : (bankIbanInput.value.trim() || ""))
      : `Konto ${useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY.bankIbanDisplay : (bankIbanInput.value.trim() || "")}`,
    agSv: formatAmount(num("employerShare", payroll.employerShare)),
    agExtra: formatAmount(useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY.extraCosts : 0),
    agTotal: formatAmount(useDatevReferenceDisplay ? DATEV_REFERENCE_DISPLAY.totalCosts : (payroll.employerShare + gross)),
  };
}

function updateDatevRefOverlay(payroll) {
  if (!window.PayrollCore || !window.DatevSheet) return;
  const state = collectPayrollStateFromDom();
  window.PayrollCore.render(state, {
    useReferenceDisplay: useDatevReferenceDisplay,
    importedTotals: importedCsvTotals,
    blankTemplate: true,
  });
}

function collectPayrollStateFromDom() {
  return {
    seller: sellerInput?.value || "",
    note: noteInput?.value || "",
    employeeName: employeeNameInput?.value || "",
    employeeAddress: getEmployeeAddressText(),
    employeeId: employeeIdInput?.value || "",
    employeeTaxId: employeeTaxIdInput?.value || "",
    employeeInsuranceNo: employeeInsuranceNoInput?.value || "",
    employeeBirthDate: employeeBirthDateInput?.value || "",
    employeeEntryDate: employeeEntryDateInput?.value || "",
    payrollMonth: payrollMonthInput?.value || "",
    taxClass: taxClassInput?.value || "I",
    churchTaxRate: churchTaxRateInput?.value || "0",
    healthFund: healthFundInput?.value || "",
    workDays: workDaysInput?.value || "30",
    workHours: workHoursInput?.value || "",
    bankName: bankNameInput?.value || "",
    bankIban: bankIbanInput?.value || "",
    healthPercent: healthPercentInput?.value || "",
    wageItems: getWageRowsData(),
    meta: {
      referenceDemo: useDatevReferenceDisplay ? "datev" : null,
      importedTotals: importedCsvTotals,
    },
    taxNumber: taxNumberInput?.value || "",
    vatId: vatIdInput?.value || "",
  };
}

function loadAgendaReferenceDemo(layoutId = "agenda") {
  documentTypeInput.value = "payroll";
  toggleModeUI();
  const layout = normalizePayrollLayoutId(layoutId);
  if (payrollLayoutSelect) payrollLayoutSelect.value = layout;
  applyPayrollLayout(layout);
  sellerInput.value = "Muster GmbH\nMusterstraße 1\n12345 Musterstadt";
  employeeNameInput.value = "Max Muster";
  if (employeeSearchInput) employeeSearchInput.value = "";
  employeeIdInput.value = "10001";
  employeeAddressInput.value = "Beispielweg 5\n12345 Musterstadt";
  employeeTaxIdInput.value = "98765432109";
  if (employeeInsuranceNoInput) employeeInsuranceNoInput.value = "1234567890123";
  employeeBirthDateInput.value = "1985-04-12";
  employeeEntryDateInput.value = "2018-06-01";
  employeeExitDateInput.value = "";
  payrollMonthInput.value = "2019-03";
  if (employeeReferenceMonthInput) employeeReferenceMonthInput.value = "2019-03";
  taxClassInput.value = "I";
  if (churchTaxRateInput) churchTaxRateInput.value = "0";
  if (healthFundInput) healthFundInput.value = "AOK";
  if (workDaysInput) workDaysInput.value = "21";
  if (workHoursInput) workHoursInput.value = "168";
  grossSalaryInput.value = "2872.80";
  bankNameInput.value = "Sparkasse Musterstadt";
  bankIbanInput.value = "DE89370400440532013000";
  noteInput.value = "Stundenlohn 17,10 · Referenz Agenda LOHN März 2019";
  loadWageItems([
    { code: "0001", label: "Stundenlohn", quantity: 168, factor: 17.1, amount: 2872.8, taxFlag: "L", svFlag: "L" },
  ], 2872.8, "Stundenlohn");
  applyLegalRatesToForm(false);
  updatePreview();
  saveDraft(false);
}

function getPayrollAssessmentDays(monthValue, workDays) {
  const days = Number(workDays) || 0;
  if (days > 0) return Math.round(days);
  return 30;
}

/* ── Legal Rates ── */

function resolvePapYear(payroll) {
  const fromAudit = payroll?.taxAudit?.papYear;
  if (fromAudit) return Number(fromAudit) || fromAudit;
  const fromMethod = String(payroll?.taxMethod || payroll?.method || "").match(/(\d{4})/);
  if (fromMethod) return fromMethod[1];
  try {
    const asOf = payrollMonthInput?.value || "";
    const r = window.TaxRulesEngine?.resolveSv?.({ asOf, country: "DE" });
    if (r?.ok && r.papYear) return r.papYear;
  } catch { /* ignore */ }
  return "";
}

function syncHubPapLabels(payroll) {
  const pap = resolvePapYear(payroll);
  const ruleset = payroll?.taxAudit?.rulesetId || "";
  const chip = document.getElementById("legalChip");
  if (chip) {
    chip.textContent = pap
      ? `Berechnung: BMF PAP ${pap} · SV gesetzlich${ruleset ? ` · ${ruleset}` : ""}`
      : "Berechnung: BMF PAP · SV gesetzlich";
  }
  const taxLabel = document.getElementById("payrollTaxPapLabel");
  if (taxLabel) taxLabel.textContent = pap ? `Lohnsteuer (BMF PAP ${pap})` : "Lohnsteuer (BMF PAP)";
  const legend = document.getElementById("pvLegendCalc");
  if (legend) legend.textContent = pap
    ? `* Berechnung Lohnsteuer: BMF PAP ${pap}`
    : "* Berechnung Lohnsteuer: BMF PAP";
}

function applyLegalRatesToForm(showMessage = true) {
  const month = payrollMonthInput?.value || "";
  const cfg = typeof getLegalConfigForDate === "function"
    ? getLegalConfigForDate(month)
    : LEGAL_CONFIG;
  const rates = getLegalEmployeeRates({
    childlessOver23: childlessPvSurchargeInput?.checked,
    healthAdditional: cfg.socialSecurity.healthAdditionalAvg,
    payrollMonth: month,
    asOf: month,
  });

  pensionPercentInput.value = String(rates.pensionPercent);
  healthPercentInput.value = String(rates.healthPercent.toFixed(2));
  carePercentInput.value = String(rates.carePercent);
  unemploymentPercentInput.value = String(rates.unemploymentPercent);
  if (healthAdditionalPercentInput) {
    healthAdditionalPercentInput.value = String(cfg.socialSecurity.healthAdditionalAvg);
  }

  const title = document.getElementById("legalRatesBannerTitle");
  const text = document.getElementById("legalRatesBannerText");
  const pap = cfg.year || rates.papYear || "";
  const ss = cfg.socialSecurity;
  if (title) title.textContent = pap
    ? `Gesetzliche Sätze ${pap} · BMF PAP`
    : "Gesetzliche Sätze · BMF PAP";
  if (text && ss) {
    text.textContent =
      `Lohnsteuer nach BMF PAP ${pap || ""} · SV: RV ${ss.pension.employee} · KV ${ss.health.employee}+${ss.healthAdditionalAvg} % · PV ${ss.care.employee}/${ss.care.employeeChildless} · AV ${ss.unemployment.employee}`
        .replace(/\s+/g, " ").trim();
  }
  syncHubPapLabels({ taxAudit: { papYear: pap, rulesetId: cfg.rulesetId } });

  updatePreview();
  saveDraft(false);
  if (showMessage) {
    const id = cfg.rulesetId ? ` (${cfg.rulesetId})` : "";
    window.alert(pap
      ? `Gesetzliche Sätze ${pap} wurden übernommen${id}.`
      : "Gesetzliche Sätze wurden übernommen.");
  }
}

function syncHealthPercentFromAdditional() {
  const zusatz = numberValue(healthAdditionalPercentInput);
  const base = LEGAL_CONFIG.socialSecurity.health.employee;
  healthPercentInput.value = String((base + zusatz / 2).toFixed(2));
}

function toggleTaxClassIvFields() {
  const show = taxClassInput?.value === "IV";
  document.querySelectorAll(".tax-class-iv-only").forEach((el) => {
    el.classList.toggle("hidden", !show);
  });
}

function collectPayrollCalcOptions() {
  return buildPayrollOptions({
    taxClass: taxClassInput.value,
    churchTaxRate: numberValue(churchTaxRateInput),
    childlessOver23: childlessPvSurchargeInput?.checked,
    healthAdditional: numberValue(healthAdditionalPercentInput),
    privateHealth: healthFundInput?.value === "Private Krankenversicherung",
    taxAllowanceMonthly: numberValue(taxAllowanceMonthlyInput),
    childAllowanceFactor: numberValue(childAllowanceFactorInput),
    factorMethod: factorMethodInput?.checked,
    factorValue: numberValue(factorValueInput),
    pensionPercent: numberValue(pensionPercentInput),
    healthPercent: numberValue(healthPercentInput),
    carePercent: numberValue(carePercentInput),
    unemploymentPercent: numberValue(unemploymentPercentInput),
    payrollMonth: payrollMonthInput?.value || "",
    asOf: payrollMonthInput?.value || "",
    period: payrollMonthInput?.value || "",
  });
}

function updatePayrollTaxEffectiveDisplay(payroll) {
  if (!payrollTaxEffective) return;
  if (!window.PayrollEngine?.ready) {
    payrollTaxEffective.value = window.PayrollEngine?.error
      ? "BMF-Modul nicht geladen – Seite neu laden"
      : "BMF-Modul wird geladen…";
    return;
  }
  if (payroll.taxMethod === "SV-only-fallback") {
    payrollTaxEffective.value = "Lohnsteuer nicht verfügbar – BMF-Modul prüfen";
    return;
  }
  const pct = payroll.gross > 0
    ? ((payroll.payrollTax / payroll.gross) * 100).toFixed(2).replace(".", ",")
    : "0,00";
  const pap = resolvePapYear(payroll);
  payrollTaxEffective.value = pap
    ? `${eur.format(payroll.payrollTax)} (${pct} % vom Brutto, BMF PAP ${pap})`
    : `${eur.format(payroll.payrollTax)} (${pct} % vom Brutto, BMF PAP)`;
  syncHubPapLabels(payroll);
}

/* ── Employee History ── */

function readEmployeeHistory() {
  try {
    const raw = localStorage.getItem(EMPLOYEE_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeEmployeeHistory(history) {
  localStorage.setItem(EMPLOYEE_HISTORY_KEY, JSON.stringify(history));
}

function collectPayrollProfile() {
  return {
    employeeName: employeeNameInput.value,
    employeeId: employeeIdInput.value,
    employeeTaxId: employeeTaxIdInput.value,
    employeeInsuranceNo: employeeInsuranceNoInput?.value || "",
    employeeBirthDate: employeeBirthDateInput.value,
    employeeEntryDate: employeeEntryDateInput.value,
    employeeExitDate: employeeExitDateInput.value,
    taxClass: taxClassInput.value,
    grossSalary: grossSalaryInput.value,
    taxAllowanceMonthly: taxAllowanceMonthlyInput?.value || "0",
    childAllowanceFactor: childAllowanceFactorInput?.value || "0",
    factorMethod: factorMethodInput?.checked || false,
    factorValue: factorValueInput?.value || "1",
    churchTaxRate: churchTaxRateInput?.value || "0",
    childlessPvSurcharge: childlessPvSurchargeInput?.checked || false,
    healthAdditionalPercent: healthAdditionalPercentInput?.value || "2.9",
    pensionPercent: pensionPercentInput.value,
    healthPercent: healthPercentInput.value,
    healthFund: healthFundInput?.value || "AOK",
    carePercent: carePercentInput.value,
    unemploymentPercent: unemploymentPercentInput.value,
    workHours: workHoursInput.value,
    workDays: workDaysInput.value,
    bankName: bankNameInput.value,
    bankBic: bankBicInput.value,
    bankIban: bankIbanInput.value,
    ...(() => {
      const wageTotals = summarizeWageRows(getWageRowsData());
      return {
        wageItems: wageTotals.wages,
        grossSalary: grossSalaryInput.value,
        taxGross: wageTotals.taxGross,
        svGross: wageTotals.svGross,
      };
    })(),
    customer: getEmployeeAddressText(),
    employeeAddress: getEmployeeAddressText(),
    seller: sellerInput.value,
    note: noteInput.value,
  };
}

function applyPayrollProfile(profile, keepCurrentMonth = true) {
  if (!profile || typeof profile !== "object") return;

  employeeNameInput.value = profile.employeeName || employeeNameInput.value || "";
  employeeIdInput.value = profile.employeeId || "";
  employeeTaxIdInput.value = profile.employeeTaxId || "";
  if (employeeInsuranceNoInput) employeeInsuranceNoInput.value = profile.employeeInsuranceNo || "";
  employeeBirthDateInput.value = profile.employeeBirthDate || "";
  employeeEntryDateInput.value = profile.employeeEntryDate || "";
  employeeExitDateInput.value = profile.employeeExitDate || "";
  taxClassInput.value = profile.taxClass || "I";
  grossSalaryInput.value = profile.grossSalary || "0";
  if (taxAllowanceMonthlyInput) taxAllowanceMonthlyInput.value = profile.taxAllowanceMonthly || "0";
  if (childAllowanceFactorInput) childAllowanceFactorInput.value = profile.childAllowanceFactor || "0";
  if (factorMethodInput) factorMethodInput.checked = Boolean(profile.factorMethod);
  if (factorValueInput) factorValueInput.value = profile.factorValue || "1";
  if (churchTaxRateInput) churchTaxRateInput.value = profile.churchTaxRate || "0";
  if (childlessPvSurchargeInput) childlessPvSurchargeInput.checked = Boolean(profile.childlessPvSurcharge);
  if (healthAdditionalPercentInput) healthAdditionalPercentInput.value = profile.healthAdditionalPercent || "2.9";
  pensionPercentInput.value = profile.pensionPercent || "9.3";
  healthPercentInput.value = profile.healthPercent || "8.75";
  if (healthFundInput) healthFundInput.value = profile.healthFund || "AOK";
  carePercentInput.value = profile.carePercent || "1.8";
  unemploymentPercentInput.value = profile.unemploymentPercent || "1.3";
  workHoursInput.value = profile.workHours || "160";
  workDaysInput.value = profile.workDays || "21";
  bankNameInput.value = profile.bankName || "";
  bankBicInput.value = profile.bankBic || "";
  bankIbanInput.value = profile.bankIban || "";
  loadWageItems(profile.wageItems, Number(profile.grossSalary) || 0, "Gehalt");
  const savedAddress = profile.employeeAddress || profile.customer || "";
  customerInput.value = savedAddress || customerInput.value || "";
  if (employeeAddressInput) employeeAddressInput.value = savedAddress || employeeAddressInput.value || "";
  sellerInput.value = profile.seller || sellerInput.value || "";
  noteInput.value = profile.note || noteInput.value || "";

  if (!keepCurrentMonth && profile.payrollMonth) {
    payrollMonthInput.value = profile.payrollMonth;
  }
  toggleTaxClassIvFields();
}

function refreshEmployeeNameSuggestions() {
  if (!employeeSearchInput) return;
  const history = readEmployeeHistory();
  const names = Object.keys(history).sort((a, b) => a.localeCompare(b, "de"));
  const currentValue = normalizeEmployeeName(employeeSearchInput.value);
  const fallbackName = normalizeEmployeeName(employeeNameInput.value);

  employeeSearchInput.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Mitarbeiter wählen --";
  employeeSearchInput.appendChild(placeholder);

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    employeeSearchInput.appendChild(option);
  });

  const resolved = names.includes(currentValue) ? currentValue : (names.includes(fallbackName) ? fallbackName : "");
  employeeSearchInput.value = resolved;
}

function saveCurrentEmployeeMonth(showMessage = true) {
  const employeeName = normalizeEmployeeName(employeeNameInput.value || employeeSearchInput?.value);
  const month = payrollMonthInput.value || employeeReferenceMonthInput?.value;

  if (!employeeName || !month) {
    if (showMessage) window.alert("Bitte Mitarbeitername und Monat eintragen.");
    return false;
  }

  const history = readEmployeeHistory();
  if (!history[employeeName]) history[employeeName] = {};
  const profile = collectPayrollProfile();
  const snapshot = calculatePayrollFromProfile(profile);
  history[employeeName][month] = {
    ...profile,
    payrollMonth: month,
    payrollSnapshot: snapshot,
    updatedAt: new Date().toISOString(),
  };
  writeEmployeeHistory(history);
  refreshEmployeeNameSuggestions();
  if (employeeSearchInput) employeeSearchInput.value = employeeName;
  updateDashboard();
  if (showMessage) window.alert("Monatsdaten für Mitarbeiter gespeichert.");
  return true;
}

function findBestEmployeeProfile(employeeName, referenceMonth) {
  const history = readEmployeeHistory();
  const directRecords = history[employeeName];
  const matchedKey = Object.keys(history).find((key) => normalizeEmployeeName(key).toLowerCase() === employeeName.toLowerCase());
  const records = directRecords || (matchedKey ? history[matchedKey] : null);
  if (!records || typeof records !== "object") return null;

  const months = Object.keys(records).filter((m) => /^\d{4}-\d{2}$/.test(m));
  if (!months.length) return null;

  if (referenceMonth && records[referenceMonth]) return records[referenceMonth];

  if (referenceMonth) {
    const previousMonth = getPreviousMonth(referenceMonth);
    if (previousMonth && records[previousMonth]) return records[previousMonth];
    const refNumeric = monthToNumeric(referenceMonth);
    const candidates = months
      .map((month) => ({ month, num: monthToNumeric(month) }))
      .filter((item) => item.num > 0 && item.num < refNumeric)
      .sort((a, b) => b.num - a.num);
    if (candidates.length) return records[candidates[0].month];
  }

  const latest = months.map((month) => ({ month, num: monthToNumeric(month) })).sort((a, b) => b.num - a.num)[0];
  return latest ? records[latest.month] : null;
}

function loadSelectedEmployeeData(showMessage = true) {
  const employeeName = normalizeEmployeeName(employeeSearchInput?.value || employeeNameInput.value);
  const referenceMonth = employeeReferenceMonthInput?.value || payrollMonthInput.value;

  if (!employeeName) {
    if (showMessage) window.alert("Bitte zuerst einen Mitarbeiter auswählen.");
    return false;
  }

  const profile = findBestEmployeeProfile(employeeName, referenceMonth);
  if (!profile) {
    if (showMessage) window.alert("Keine gespeicherten Monatsdaten für diesen Mitarbeiter gefunden.");
    return false;
  }

  applyPayrollProfile(profile, true);
  employeeNameInput.value = employeeName;
  if (employeeSearchInput) employeeSearchInput.value = employeeName;
  if (!payrollMonthInput.value && referenceMonth) payrollMonthInput.value = referenceMonth;
  if (documentTypeInput) documentTypeInput.value = "payroll";
  updatePreview();
  saveDraft(false);
  if (showMessage) window.alert("Mitarbeiterdaten wurden übernommen.");
  return true;
}

/* ── Signature ── */

function getSignatureEngine() {
  return window.WorkPassSignature || null;
}

function getCompanySignatureName() {
  const eng = getSignatureEngine();
  if (eng?.resolveCompanyName) {
    return eng.resolveCompanyName({
      companyProfileName: companyProfileNameInput?.value,
      seller: sellerInput?.value,
      managingDirector: managingDirectorInput?.value,
    });
  }
  const profile = companyProfileNameInput?.value?.trim();
  if (profile && !/work\s*pass|suppix/i.test(profile)) return profile;
  const sellerFirst = String(sellerInput?.value || "").trim().split(/\r?\n/).find(Boolean) || "";
  if (sellerFirst && !/work\s*pass|suppix/i.test(sellerFirst)) return sellerFirst;
  return "";
}

function getSignatureDisplayName() {
  if (signatureMode === "none") return "";
  if (signatureMode === "auto") return getCompanySignatureName();
  return signatureNameInput?.value?.trim() || "";
}

function getInvoiceDocumentSnapshot() {
  const rows = typeof getRowsData === "function" ? getRowsData() : [];
  const subtotal = rows.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const isKlein = kleinunternehmerInput?.checked;
  const isReverse = reverseChargeInput?.checked;
  const taxRate = (isKlein || isReverse) ? 0 : (Number(taxRateInput?.value) || 0);
  const tax = subtotal * (taxRate / 100);
  return {
    type: "invoice",
    number: invoiceNumberInput?.value || "",
    date: invoiceDateInput?.value || "",
    seller: sellerInput?.value || "",
    customer: getEmployeeAddressText(),
    total: (subtotal + tax).toFixed(2),
    items: rows.map((r) => ({
      description: r.description,
      quantity: r.quantity,
      price: r.price,
      total: r.total,
    })),
    note: noteInput?.value || "",
  };
}

function pushSignatureAudit(event, detail = {}) {
  signatureAudit = [
    {
      at: new Date().toISOString(),
      event,
      ...detail,
    },
    ...signatureAudit,
  ].slice(0, 40);
}

async function refreshSignatureSealUi() {
  const badge = document.getElementById("signatureSealBadge");
  const proofEl = document.getElementById("signatureSealProof");
  const statusEl = document.getElementById("sigSealStatus");
  const eng = getSignatureEngine();
  if (!signatureAttestation || signatureMode === "none") {
    if (badge) badge.hidden = true;
    if (statusEl) {
      statusEl.textContent = "Siegel: offen (Entwurf)";
      statusEl.classList.remove("is-sealed", "is-broken");
    }
    return;
  }
  const live = {
    document: getInvoiceDocumentSnapshot(),
    signatureDataUrl,
  };
  const check = eng?.verifyAttestation
    ? await eng.verifyAttestation(signatureAttestation, live)
    : { ok: false, reason: "missing" };
  if (badge) {
    badge.hidden = false;
    badge.classList.toggle("is-valid", Boolean(check.ok));
    badge.classList.toggle("is-invalid", !check.ok);
  }
  if (proofEl) {
    const short = eng?.shortProof?.(signatureAttestation.proof) || "";
    proofEl.textContent = check.ok
      ? `gültig · ${short}`
      : `ungültig (${check.reason}) · ${short}`;
  }
  if (statusEl) {
    statusEl.classList.toggle("is-sealed", Boolean(check.ok));
    statusEl.classList.toggle("is-broken", !check.ok);
    statusEl.textContent = check.ok
      ? `Siegel aktiv · ${new Date(signatureAttestation.sealedAt).toLocaleString("de-DE")}`
      : `Siegel gebrochen: ${check.reason} – bitte erneut siegeln`;
  }
}

async function sealActiveSignature({ save = true } = {}) {
  const eng = getSignatureEngine();
  if (!eng?.buildAttestation) return;
  if (signatureMode === "none") {
    window.alert("Kein Siegel möglich im Modus „Ohne Signatur“.");
    return;
  }
  await refreshActiveSignature({ save: false });
  if (!signatureDataUrl && signatureMode !== "none") {
    window.alert("Bitte zuerst eine Signatur erzeugen (Firma/Name/Zeichnen).");
    return;
  }
  signatureAttestation = await eng.buildAttestation({
    mode: signatureMode,
    styleId: signatureStyleId,
    colorId: signatureColorId,
    layout: signatureLayout,
    displayName: getSignatureDisplayName(),
    signatureDataUrl,
    document: getInvoiceDocumentSnapshot(),
    companyProfileName: companyProfileNameInput?.value,
    seller: sellerInput?.value,
    managingDirector: managingDirectorInput?.value,
    status: "sealed",
  });
  signatureLayout = { ...signatureLayout, locked: true };
  const lock = document.getElementById("sigLockPosition");
  if (lock) lock.checked = true;
  pushSignatureAudit("sealed", { proof: signatureAttestation.proof });
  applySignatureLayoutToDom();
  await refreshSignatureSealUi();
  if (save) saveDraft(false);
  if (lexStatusMessage) lexStatusMessage.textContent = "Signatur technisch gesiegelt";
}

function unsealActiveSignature({ save = true } = {}) {
  signatureAttestation = null;
  pushSignatureAudit("unsealed");
  refreshSignatureSealUi();
  if (save) saveDraft(false);
}

function invalidateSealIfNeeded(reason = "edited") {
  if (!signatureAttestation) return;
  pushSignatureAudit("invalidated", { reason });
  // keep attestation object so UI can show "broken" against live document
  refreshSignatureSealUi();
}

function resizeSignatureCanvas() {
  if (!signaturePad || !signatureCtx) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const width = signaturePad.clientWidth || 700;
  const height = signaturePad.clientHeight || 160;
  signaturePad.width = Math.floor(width * ratio);
  signaturePad.height = Math.floor(height * ratio);
  signatureCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
  signatureCtx.strokeStyle = getSignatureEngine()?.getColor?.(signatureColorId) || "#111111";
  if (signatureMode === "draw" && signatureDataUrl) drawSignatureImage(signatureDataUrl);
}

function getCanvasPoint(event) {
  const rect = signaturePad.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function startDrawing(event) {
  if (signatureMode !== "draw") return;
  isDrawing = true;
  lastPoint = getCanvasPoint(event);
  signaturePad?.setPointerCapture?.(event.pointerId);
}

function draw(event) {
  if (!isDrawing || !signatureCtx || signatureMode !== "draw") return;
  const currentPoint = getCanvasPoint(event);
  signatureCtx.beginPath();
  signatureCtx.moveTo(lastPoint.x, lastPoint.y);
  signatureCtx.lineTo(currentPoint.x, currentPoint.y);
  signatureCtx.stroke();
  lastPoint = currentPoint;
}

function endDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  lastPoint = null;
  if (signaturePad && signatureMode === "draw") {
    signatureDataUrl = signaturePad.toDataURL("image/png");
    applySignaturePreview(signatureDataUrl, signatureNameInput?.value?.trim() || "");
    saveDraft(false);
  }
}

function clearSignature(shouldSave = true) {
  if (signatureCtx && signaturePad) {
    signatureCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
  }
  signatureDataUrl = "";
  if (signatureMode === "draw") {
    applySignaturePreview("", signatureNameInput?.value?.trim() || "");
  } else {
    refreshActiveSignature({ save: shouldSave });
    return;
  }
  if (shouldSave) saveDraft(false);
}

function drawSignatureImage(dataUrl) {
  if (!signaturePad || !signatureCtx || !dataUrl) return;
  const img = new Image();
  img.onload = () => {
    signatureCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
    signatureCtx.drawImage(img, 0, 0, signaturePad.clientWidth || 700, signaturePad.clientHeight || 160);
    signatureDataUrl = signaturePad.toDataURL("image/png");
    applySignaturePreview(signatureDataUrl, getSignatureDisplayName());
  };
  img.src = dataUrl;
}

function applySignaturePreview(dataUrl, displayName) {
  const box = document.getElementById("signaturePreviewBox");
  const badge = document.getElementById("signatureModeBadge");
  const lineEl = document.getElementById("signatureLineEl");
  const eng = getSignatureEngine();
  const modeMeta = eng?.MODES?.find((m) => m.id === signatureMode);
  const layout = eng?.normalizeLayout?.(signatureLayout) || signatureLayout;
  signatureLayout = layout;

  if (box) applySignatureLayoutToDom();

  const caption = eng?.resolveCaption?.(layout, displayName) ?? (layout.showCaption ? displayName : "");

  if (signatureMode === "none") {
    if (box) {
      box.hidden = true;
      box.classList.add("is-empty");
    }
    if (signaturePreview) {
      signaturePreview.classList.add("hidden");
      signaturePreview.removeAttribute("src");
    }
    if (signatureNamePreview) {
      signatureNamePreview.textContent = "";
      signatureNamePreview.classList.add("is-hidden");
    }
    refreshSignatureSealUi();
    return;
  }

  if (box) box.hidden = false;

  if (lineEl) lineEl.classList.toggle("is-hidden", !layout.showLine);

  if (signatureNamePreview) {
    const showCap = Boolean(layout.showCaption) && caption !== "";
    signatureNamePreview.classList.toggle("is-hidden", !showCap);
    if (!signatureNamePreview.classList.contains("is-editing")) {
      signatureNamePreview.textContent = showCap ? caption : "";
    }
  }

  if (badge) {
    badge.classList.toggle("hidden", !modeMeta);
    badge.textContent = modeMeta ? modeMeta.label : "";
  }

  const hasImage = Boolean(dataUrl);
  if (!hasImage && signatureMode !== "draw") {
    if (signaturePreview) {
      signaturePreview.classList.add("hidden");
      signaturePreview.removeAttribute("src");
    }
    if (box) box.classList.toggle("is-empty", !caption);
    syncSignatureFormControls(displayName);
    refreshSignatureSealUi();
    return;
  }

  if (!hasImage) {
    if (signaturePreview) {
      signaturePreview.classList.add("hidden");
      signaturePreview.removeAttribute("src");
    }
    if (box) box.classList.add("is-empty");
    syncSignatureFormControls(displayName);
    refreshSignatureSealUi();
    return;
  }

  if (signaturePreview) {
    signaturePreview.classList.remove("hidden");
    signaturePreview.src = dataUrl;
  }
  if (box) box.classList.remove("is-empty");
  syncSignatureFormControls(displayName);
  refreshSignatureSealUi();
}

function ensureInvoiceDocStage() {
  if (!invoicePreviewEl) return null;
  let stage = document.getElementById("invoiceDocStage");
  if (stage?.dataset.ready === "1") return stage;

  if (!stage) {
    stage = document.createElement("div");
    stage.id = "invoiceDocStage";
  }
  stage.className = "invoice-doc-stage mode-invoice-only";
  stage.dataset.ready = "1";

  const anchor = document.getElementById("datevSheetHost")
    || invoicePreviewEl.querySelector(".preview-tools");
  if (stage.parentElement !== invoicePreviewEl) {
    if (anchor?.parentElement === invoicePreviewEl) anchor.after(stage);
    else invoicePreviewEl.appendChild(stage);
  }

  const selectors = [
    ".invoice-top.mode-invoice-only",
    "#invoiceMetaBlock",
    ".addresses.mode-invoice-only",
    "table.preview-items.mode-invoice-only",
    ".totals.mode-invoice-only",
    "#invoiceBankBlock",
    ".note-box.mode-invoice-only",
    "#signaturePreviewBox",
    "#signatureSealBadge",
  ];
  selectors.forEach((sel) => {
    const el = invoicePreviewEl.querySelector(sel);
    if (el && el.parentElement !== stage) stage.appendChild(el);
  });
  return stage;
}

function getSignatureStage() {
  return ensureInvoiceDocStage() || invoicePreviewEl;
}

function stagePointToPct(clientX, clientY, stage) {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(stage.offsetWidth || rect.width || 1, 1);
  const h = Math.max(stage.offsetHeight || rect.height || 1, 1);
  return {
    xPct: ((clientX - rect.left) / w) * 100,
    yPct: ((clientY - rect.top) / h) * 100,
    w,
    h,
    rect,
  };
}

function autoScrollPreviewDuringDrag(clientY) {
  if (!invoicePreviewEl) return;
  const pr = invoicePreviewEl.getBoundingClientRect();
  const edge = 48;
  if (clientY < pr.top + edge) invoicePreviewEl.scrollTop -= 18;
  else if (clientY > pr.bottom - edge) invoicePreviewEl.scrollTop += 18;
}
function applySignatureLayoutToDom() {
  ensureInvoiceDocStage();
  const box = document.getElementById("signaturePreviewBox");
  const eng = getSignatureEngine();
  const layout = eng?.normalizeLayout?.(signatureLayout) || signatureLayout;
  signatureLayout = layout;
  if (!box) return;
  box.style.left = `${layout.xPct}%`;
  box.style.top = `${layout.yPct}%`;
  box.style.width = `${layout.wPct}%`;
  box.style.opacity = String(layout.opacity);
  box.style.transform = `rotate(${layout.rotation}deg)`;
  box.classList.toggle("is-locked", Boolean(layout.locked));
}

function syncSignatureFormControls(displayName) {
  const eng = getSignatureEngine();
  const layout = eng?.normalizeLayout?.(signatureLayout) || signatureLayout;
  const showCap = document.getElementById("sigShowCaption");
  const showLine = document.getElementById("sigShowLine");
  const lock = document.getElementById("sigLockPosition");
  const captionInput = document.getElementById("sigCaptionInput");
  const rot = document.getElementById("sigRotation");
  const rotVal = document.getElementById("sigRotationVal");
  const op = document.getElementById("sigOpacity");
  const opVal = document.getElementById("sigOpacityVal");
  const w = document.getElementById("sigWidth");
  const wVal = document.getElementById("sigWidthVal");
  const adv = document.getElementById("signatureAdvancedBox");

  if (adv) adv.hidden = signatureMode === "none";
  if (showCap) showCap.checked = Boolean(layout.showCaption);
  if (showLine) showLine.checked = layout.showLine !== false;
  if (lock) lock.checked = Boolean(layout.locked);
  if (captionInput && document.activeElement !== captionInput) {
    if (layout.captionCustom) captionInput.value = layout.captionText ?? "";
    else captionInput.value = displayName || getSignatureDisplayName() || "";
  }
  if (rot) rot.value = String(layout.rotation);
  if (rotVal) rotVal.textContent = `${Number(layout.rotation).toFixed(1)}°`;
  if (op) op.value = String(Math.round((layout.opacity || 1) * 100));
  if (opVal) opVal.textContent = `${Math.round((layout.opacity || 1) * 100)}%`;
  if (w) w.value = String(Math.round(layout.wPct));
  if (wVal) wVal.textContent = `${Math.round(layout.wPct)}%`;
}

function commitSignatureLayout(patch = {}, { save = true } = {}) {
  const eng = getSignatureEngine();
  signatureLayout = eng?.normalizeLayout?.({ ...signatureLayout, ...patch }) || { ...signatureLayout, ...patch };
  applySignatureLayoutToDom();
  const displayName = getSignatureDisplayName();
  const caption = eng?.resolveCaption?.(signatureLayout, displayName) ?? displayName;
  if (signatureNamePreview) {
    const showCap = signatureLayout.showCaption && caption !== "";
    signatureNamePreview.classList.toggle("is-hidden", !showCap);
    if (!signatureNamePreview.classList.contains("is-editing")) {
      signatureNamePreview.textContent = showCap ? caption : "";
    }
  }
  const lineEl = document.getElementById("signatureLineEl");
  if (lineEl) lineEl.classList.toggle("is-hidden", !signatureLayout.showLine);
  syncSignatureFormControls(displayName);
  if (save) saveDraft(false);
}

function initSignatureStageInteractions() {
  const box = document.getElementById("signaturePreviewBox");
  ensureInvoiceDocStage();
  if (!box || box.dataset.sigBound) return;
  box.dataset.sigBound = "1";

  const selectBox = () => {
    box.classList.add("is-selected");
    try { box.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
  };

  const onMove = (event) => {
    if (!signatureDrag || signatureLayout.locked) return;
    const stage = getSignatureStage();
    if (!stage) return;
    autoScrollPreviewDuringDrag(event.clientY);
    const pt = stagePointToPct(event.clientX, event.clientY, stage);
    if (signatureDrag.type === "move") {
      let xPct = ((event.clientX - pt.rect.left - signatureDrag.offsetX) / pt.w) * 100;
      let yPct = ((event.clientY - pt.rect.top - signatureDrag.offsetY) / pt.h) * 100;
      xPct = Math.min(92, Math.max(0, xPct));
      yPct = Math.min(94, Math.max(0, yPct));
      signatureLayout.xPct = xPct;
      signatureLayout.yPct = yPct;
      applySignatureLayoutToDom();
    } else if (signatureDrag.type === "resize") {
      const dx = ((event.clientX - signatureDrag.startX) / pt.w) * 100;
      signatureLayout.wPct = signatureDrag.startW + dx;
      applySignatureLayoutToDom();
    }
  };

  const onUp = () => {
    if (!signatureDrag) return;
    signatureDrag = null;
    box.classList.remove("is-dragging");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    invalidateSealIfNeeded("moved");
    commitSignatureLayout({}, { save: true });
  };

  box.addEventListener("pointerdown", (event) => {
    if (getCurrentMode() !== "invoice") return;
    selectBox();
    if (signatureLayout.locked) return;
    if (event.target.closest?.(".signature-name")) return;

    const stage = getSignatureStage();
    if (!stage) return;
    const pt = stagePointToPct(event.clientX, event.clientY, stage);
    const resize = event.target.closest?.("[data-sig-resize]");
    if (resize) {
      signatureDrag = {
        type: "resize",
        startX: event.clientX,
        startW: signatureLayout.wPct,
      };
    } else {
      signatureDrag = {
        type: "move",
        offsetX: event.clientX - pt.rect.left - (signatureLayout.xPct / 100) * pt.w,
        offsetY: event.clientY - pt.rect.top - (signatureLayout.yPct / 100) * pt.h,
      };
    }
    box.classList.add("is-dragging");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    event.preventDefault();
  });

  box.addEventListener("keydown", (event) => {
    if (signatureLayout.locked) return;
    const step = event.shiftKey ? 2.5 : 0.8;
    let handled = true;
    if (event.key === "ArrowLeft") commitSignatureLayout({ xPct: signatureLayout.xPct - step });
    else if (event.key === "ArrowRight") commitSignatureLayout({ xPct: signatureLayout.xPct + step });
    else if (event.key === "ArrowUp") commitSignatureLayout({ yPct: signatureLayout.yPct - step });
    else if (event.key === "ArrowDown") commitSignatureLayout({ yPct: signatureLayout.yPct + step });
    else if (event.key === "Delete" || event.key === "Backspace") {
      commitSignatureLayout({ showCaption: false, captionCustom: true, captionText: "" });
      const showCap = document.getElementById("sigShowCaption");
      if (showCap) showCap.checked = false;
    } else handled = false;
    if (handled) {
      invalidateSealIfNeeded("keyboard");
      event.preventDefault();
    }
  });

  signatureNamePreview?.addEventListener("dblclick", () => {
    if (!signatureLayout.showCaption && !signatureNamePreview.classList.contains("is-hidden")) return;
    signatureLayout.showCaption = true;
    signatureNamePreview.classList.remove("is-hidden");
    signatureNamePreview.contentEditable = "true";
    signatureNamePreview.classList.add("is-editing");
    signatureNamePreview.focus();
    const range = document.createRange();
    range.selectNodeContents(signatureNamePreview);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });

  signatureNamePreview?.addEventListener("blur", () => {
    if (!signatureNamePreview.classList.contains("is-editing")) return;
    signatureNamePreview.contentEditable = "false";
    signatureNamePreview.classList.remove("is-editing");
    const text = signatureNamePreview.textContent.trim();
    if (!text) {
      commitSignatureLayout({ showCaption: false, captionCustom: true, captionText: "" }, { save: true });
      const showCap = document.getElementById("sigShowCaption");
      if (showCap) showCap.checked = false;
    } else {
      commitSignatureLayout({ showCaption: true, captionCustom: true, captionText: text }, { save: true });
    }
    invalidateSealIfNeeded("caption");
  });

  signatureNamePreview?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      signatureNamePreview.blur();
    } else if (event.key === "Escape") {
      signatureNamePreview.textContent = getSignatureEngine()?.resolveCaption?.(signatureLayout, getSignatureDisplayName()) || "";
      signatureNamePreview.contentEditable = "false";
      signatureNamePreview.classList.remove("is-editing");
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!box.contains(event.target)) box.classList.remove("is-selected");
    const hat = document.getElementById("signatureStyleHat");
    if (hat && !hat.contains(event.target) && event.target !== signatureNameInput) {
      hat.hidden = true;
    }
  });
}

function bindSignatureAdvancedControls() {
  if (bindSignatureAdvancedControls.done) return;
  bindSignatureAdvancedControls.done = true;

  document.getElementById("sigShowCaption")?.addEventListener("change", (e) => {
    commitSignatureLayout({ showCaption: e.target.checked }, { save: true });
  });
  document.getElementById("sigShowLine")?.addEventListener("change", (e) => {
    commitSignatureLayout({ showLine: e.target.checked }, { save: true });
  });
  document.getElementById("sigLockPosition")?.addEventListener("change", (e) => {
    commitSignatureLayout({ locked: e.target.checked }, { save: true });
  });
  document.getElementById("sigCaptionClearBtn")?.addEventListener("click", () => {
    commitSignatureLayout({ showCaption: false, captionCustom: true, captionText: "" }, { save: true });
    const showCap = document.getElementById("sigShowCaption");
    if (showCap) showCap.checked = false;
    const input = document.getElementById("sigCaptionInput");
    if (input) input.value = "";
  });
  document.getElementById("sigCaptionResetBtn")?.addEventListener("click", () => {
    commitSignatureLayout({ showCaption: true, captionCustom: false, captionText: null }, { save: true });
    const showCap = document.getElementById("sigShowCaption");
    if (showCap) showCap.checked = true;
  });
  let captionTimer = null;
  document.getElementById("sigCaptionInput")?.addEventListener("input", (e) => {
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => {
      const val = e.target.value;
      if (!val.trim()) {
        commitSignatureLayout({ showCaption: false, captionCustom: true, captionText: "" }, { save: true });
        const showCap = document.getElementById("sigShowCaption");
        if (showCap) showCap.checked = false;
      } else {
        commitSignatureLayout({ showCaption: true, captionCustom: true, captionText: val }, { save: true });
        const showCap = document.getElementById("sigShowCaption");
        if (showCap) showCap.checked = true;
      }
    }, 180);
  });
  document.getElementById("sigRotation")?.addEventListener("input", (e) => {
    commitSignatureLayout({ rotation: Number(e.target.value) }, { save: false });
  });
  document.getElementById("sigRotation")?.addEventListener("change", () => saveDraft(false));
  document.getElementById("sigOpacity")?.addEventListener("input", (e) => {
    commitSignatureLayout({ opacity: Number(e.target.value) / 100 }, { save: false });
  });
  document.getElementById("sigOpacity")?.addEventListener("change", () => saveDraft(false));
  document.getElementById("sigWidth")?.addEventListener("input", (e) => {
    commitSignatureLayout({ wPct: Number(e.target.value) }, { save: false });
  });
  document.getElementById("sigWidth")?.addEventListener("change", () => saveDraft(false));
  document.getElementById("sigResetLayoutBtn")?.addEventListener("click", () => {
    signatureLayout = getSignatureEngine()?.defaultLayout?.() || signatureLayout;
    invalidateSealIfNeeded("layout_reset");
    commitSignatureLayout({}, { save: true });
  });
  document.getElementById("sigSealBtn")?.addEventListener("click", () => {
    sealActiveSignature({ save: true });
  });
  document.getElementById("sigUnsealBtn")?.addEventListener("click", () => {
    unsealActiveSignature({ save: true });
  });
}

function updateSignaturePreview() {
  refreshActiveSignature({ save: false });
}

function renderSignatureStyleCards(options = {}) {
  const eng = getSignatureEngine();
  const hat = document.getElementById("signatureStyleHat");
  const grid = document.getElementById("signatureStyleGrid");
  if (!eng) return;
  const sample = signatureNameInput?.value?.trim()
    || (signatureMode === "auto" ? getCompanySignatureName() : "")
    || "Alex";
  const html = eng.STYLES.map((style) => `
    <button type="button" class="sig-style-card${style.id === signatureStyleId ? " active" : ""}" data-style="${style.id}" title="${style.label}" role="option">
      <span class="sig-style-label">${style.label}</span>
      ${eng.previewSvgMarkup(sample, style.id, signatureColorId)}
    </button>
  `).join("");
  const bind = (root) => {
    if (!root) return;
    root.innerHTML = html;
    root.querySelectorAll("[data-style]").forEach((btn) => {
      btn.addEventListener("click", () => {
        signatureStyleId = btn.getAttribute("data-style") || "elegant";
        if (signatureNameInput?.value?.trim()) signatureMode = "styled";
        else if (signatureMode === "none") signatureMode = "auto";
        if (hat) hat.hidden = true;
        renderSignatureControls();
        refreshActiveSignature({ save: true });
      });
    });
  };
  bind(hat);
  bind(grid);
  if (hat && options.open) hat.hidden = false;
}

function openSignatureStyleHat() {
  const hat = document.getElementById("signatureStyleHat");
  if (!hat || signatureMode === "none") return;
  renderSignatureStyleCards({ open: true });
  hat.hidden = false;
}

function renderSignatureColorRow() {
  const row = document.getElementById("signatureColorRow");
  const eng = getSignatureEngine();
  if (!row || !eng) return;
  row.innerHTML = eng.COLORS.map((c) => `
    <button type="button" class="sig-color-btn${c.id === signatureColorId ? " active" : ""}"
      data-color="${c.id}" title="${c.label}" style="background:${c.value}" aria-label="${c.label}"></button>
  `).join("");
  row.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      signatureColorId = btn.getAttribute("data-color") || "ink";
      if (signatureMode === "none") signatureMode = "auto";
      if (signatureMode === "draw" && signatureCtx) {
        signatureCtx.strokeStyle = eng.getColor(signatureColorId);
      }
      renderSignatureControls();
      refreshActiveSignature({ save: true });
    });
  });
}

function renderSignatureModeRow() {
  const row = document.getElementById("signatureModeRow");
  const eng = getSignatureEngine();
  if (!row || !eng) return;
  row.innerHTML = eng.MODES.map((m) => `
    <button type="button" class="sig-mode-btn${m.id === signatureMode ? " active" : ""}" data-mode="${m.id}">
      <strong>${m.label}</strong>
      <span>${m.hint}</span>
    </button>
  `).join("");
  row.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      signatureMode = btn.getAttribute("data-mode") || "auto";
      if (signatureMode === "styled" && !signatureNameInput.value.trim()) {
        const hint = managingDirectorInput?.value?.trim() || "";
        if (hint) signatureNameInput.value = hint;
      }
      if (signatureMode === "draw") {
        signatureDataUrl = "";
        if (signatureCtx && signaturePad) signatureCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
      }
      renderSignatureControls();
      refreshActiveSignature({ save: true });
    });
  });
}

function renderSignatureControls() {
  const eng = getSignatureEngine();
  const drawPanel = document.getElementById("signatureDrawPanel");
  const styleGrid = document.getElementById("signatureStyleGrid");
  const colorRow = document.getElementById("signatureColorRow");
  const hint = document.getElementById("signatureModeHint");
  const nameLabelParent = signatureNameInput?.closest("label");

  renderSignatureModeRow();
  renderSignatureColorRow();
  renderSignatureStyleCards();

  const showStyles = signatureMode === "styled" || signatureMode === "auto";
  const showDraw = signatureMode === "draw";
  const showName = signatureMode === "styled" || signatureMode === "draw";

  if (drawPanel) drawPanel.hidden = !showDraw;
  if (styleGrid) styleGrid.hidden = !showStyles;
  if (colorRow) colorRow.hidden = !(showStyles || showDraw);
  if (nameLabelParent) nameLabelParent.hidden = !showName;

  if (hint && eng) {
    const meta = eng.MODES.find((m) => m.id === signatureMode);
    if (signatureMode === "auto") {
      const company = getCompanySignatureName();
      hint.textContent = company
        ? `Automatisch mit Firmenname: „${company}“ (nicht Plattformname).`
        : "Bitte Firmenname unter Absender / Mandantenprofil eintragen – dann wird automatisch unterschrieben.";
    } else {
      hint.textContent = meta?.hint || "";
    }
  }

  if (showDraw) resizeSignatureCanvas();
}

async function refreshActiveSignature({ save = false } = {}) {
  const eng = getSignatureEngine();
  const token = ++signatureRenderToken;

  if (signatureMode === "none") {
    signatureDataUrl = "";
    applySignaturePreview("", "");
    if (save) saveDraft(false);
    return;
  }

  if (signatureMode === "draw") {
    applySignaturePreview(signatureDataUrl, signatureNameInput?.value?.trim() || "");
    if (save) saveDraft(false);
    return;
  }

  const plan = eng?.resolveSignaturePlan?.({
    mode: signatureMode,
    signatureName: signatureNameInput?.value,
    signatureDataUrl,
    styleId: signatureStyleId,
    colorId: signatureColorId,
    companyProfileName: companyProfileNameInput?.value,
    seller: sellerInput?.value,
    managingDirector: managingDirectorInput?.value,
  }) || { displayName: getSignatureDisplayName(), needsRender: true, showBlock: true };

  if (!plan.showBlock || !plan.displayName) {
    signatureDataUrl = "";
    applySignaturePreview("", plan.displayName || "");
    if (save) saveDraft(false);
    return;
  }

  if (!eng?.renderSignatureDataUrl) {
    applySignaturePreview("", plan.displayName);
    return;
  }

  applySignaturePreview(signatureDataUrl || "", plan.displayName);
  try {
    const dataUrl = await eng.renderSignatureDataUrl(plan.displayName, {
      styleId: plan.styleId || signatureStyleId,
      colorId: plan.colorId || signatureColorId,
    });
    if (token !== signatureRenderToken) return;
    signatureDataUrl = dataUrl;
    applySignaturePreview(dataUrl, plan.displayName);
    if (save) saveDraft(false);
  } catch (err) {
    console.warn("Signatur-Render fehlgeschlagen", err);
  }
}

function initSignaturePad() {
  const eng = getSignatureEngine();
  eng?.ensureFontsCss?.();
  if (eng?.normalizeLayout) signatureLayout = eng.normalizeLayout(signatureLayout);
  renderSignatureControls();
  bindSignatureAdvancedControls();
  ensureInvoiceDocStage();
  initSignatureStageInteractions();
  refreshActiveSignature({ save: false });

  if (signaturePad) {
    signaturePad.addEventListener("pointerdown", startDrawing);
    signaturePad.addEventListener("pointermove", draw);
    signaturePad.addEventListener("pointerup", endDrawing);
    signaturePad.addEventListener("pointerleave", endDrawing);
    signaturePad.addEventListener("pointercancel", endDrawing);
  }
  window.addEventListener("resize", () => {
    if (signatureMode === "draw") resizeSignatureCanvas();
  });
  clearSignatureBtn?.addEventListener("click", () => {
    if (signatureMode === "draw") clearSignature(true);
    else if (signatureMode === "none") {
      signatureMode = "auto";
      renderSignatureControls();
      refreshActiveSignature({ save: true });
    } else {
      signatureMode = "none";
      renderSignatureControls();
      refreshActiveSignature({ save: true });
    }
  });

  let nameTimer = null;
  signatureNameInput?.addEventListener("input", () => {
    if (signatureMode === "auto" || signatureMode === "none") {
      signatureMode = "styled";
      renderSignatureControls();
    }
    openSignatureStyleHat();
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => refreshActiveSignature({ save: true }), 220);
  });
  signatureNameInput?.addEventListener("focus", () => openSignatureStyleHat());

  const bumpAuto = () => {
    if (signatureMode === "auto") {
      renderSignatureStyleCards();
      refreshActiveSignature({ save: true });
    } else {
      renderSignatureControls();
    }
  };
  sellerInput?.addEventListener("input", bumpAuto);
  companyProfileNameInput?.addEventListener("input", bumpAuto);
  managingDirectorInput?.addEventListener("input", bumpAuto);
}

/* ── Mode ── */

function getCurrentMode() {
  const val = documentTypeInput?.value || "invoice";
  if (val === "payroll-annual") return "payroll-annual";
  if (val === "payroll") return "payroll";
  return "invoice";
}

function isPayrollFamilyMode() {
  const mode = getCurrentMode();
  return mode === "payroll" || mode === "payroll-annual";
}

function splitMoneyParts(value) {
  const n = Math.abs(Number(value) || 0);
  const fixed = n.toFixed(2);
  const [euroPart, centPart] = fixed.split(".");
  const euros = Number(euroPart).toLocaleString("de-DE");
  return { euro: euros, cent: centPart || "00" };
}

function calculatePayrollFromProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  const wages = Array.isArray(profile.wageItems) ? profile.wageItems : [];
  let wageTotals = wages.length
    ? summarizeWageRows(wages)
    : { gross: 0, taxGross: 0, svGross: 0, wages: [], allTaxFree: false, allSvFree: false };
  const grossInput = Number(profile.grossSalary) || 0;
  let gross = wageTotals.gross;
  if (gross <= 0 && grossInput > 0) {
    wageTotals = {
      gross: grossInput,
      taxGross: grossInput,
      svGross: grossInput,
      wages: [{ code: "2000", label: "Gehalt", amount: grossInput, taxFlag: "L", svFlag: "L" }],
      allTaxFree: false,
      allSvFree: false,
    };
    gross = grossInput;
  }
  const bases = resolvePayrollAssessmentBases(wageTotals, gross);
  const result = calculateLegalPayroll(gross, buildPayrollOptions({
    taxClass: profile.taxClass || "I",
    churchTaxRate: Number(profile.churchTaxRate) || 0,
    childlessOver23: Boolean(profile.childlessPvSurcharge),
    healthAdditional: Number(profile.healthAdditionalPercent) || LEGAL_CONFIG.socialSecurity.healthAdditionalAvg,
    privateHealth: profile.healthFund === "Private Krankenversicherung",
    taxAllowanceMonthly: Number(profile.taxAllowanceMonthly) || 0,
    childAllowanceFactor: Number(profile.childAllowanceFactor) || 0,
    factorMethod: Boolean(profile.factorMethod),
    factorValue: Number(profile.factorValue) || 1,
    pensionPercent: Number(profile.pensionPercent),
    healthPercent: Number(profile.healthPercent),
    carePercent: Number(profile.carePercent),
    unemploymentPercent: Number(profile.unemploymentPercent),
    taxGross: bases.taxGross,
    svGross: bases.svGross,
    allTaxFree: bases.allTaxFree,
    allSvFree: bases.allSvFree,
    payrollMonth: profile.payrollMonth || "",
    asOf: profile.payrollMonth || "",
    period: profile.payrollMonth || "",
  }));
  const rates = result.rates || getLegalEmployeeRates({ childlessOver23: profile.childlessPvSurcharge, healthAdditional: profile.healthAdditionalPercent });
  return {
    ...result,
    taxGross: bases.taxGross,
    svGross: bases.svGross,
    hours: Number(profile.workHours) || 0,
    days: Number(profile.workDays) || 0,
    pensionPercent: rates.pensionPercent,
    healthPercent: rates.healthPercent,
    carePercent: rates.carePercent,
    unemploymentPercent: rates.unemploymentPercent,
    svTotal: result.svTotal ?? (result.pension + result.health + result.care + result.unemployment),
  };
}

function toggleModeUI() {
  const mode = getCurrentMode();
  const isPayrollFamily = isPayrollFamilyMode();
  const isMonthly = mode === "payroll";
  const isAnnual = mode === "payroll-annual";

  invoiceOnlyElements.forEach((el) => el.classList.toggle("hidden", isPayrollFamily));
  payrollOnlyElements.forEach((el) => el.classList.toggle("hidden", !isPayrollFamily));
  annualOnlyElements.forEach((el) => el.classList.toggle("hidden", !isAnnual));

  if (payrollTabBtn) payrollTabBtn.classList.toggle("hidden", !isPayrollFamily);
  if (payrollNavGroup) payrollNavGroup.classList.toggle("hidden", !isPayrollFamily);
  payrollFields?.classList.toggle("hidden", !isPayrollFamily);
  const datevSheetHost = document.getElementById("datevSheetHost");
  datevSheetHost?.classList.toggle("hidden", !isMonthly || verdienstPreviewMode);
  payrollSheet?.classList.add("hidden");
  annualTaxSheet?.classList.toggle("hidden", !isAnnual);
  if (!isMonthly) setVerdienstPreviewMode(false);
  verdienstSheet?.classList.toggle("hidden", !isMonthly || !verdienstPreviewMode);

  document.body.classList.toggle("payroll-mode", isPayrollFamily);
  document.body.classList.toggle("annual-mode", isAnnual);

  if (modeChip) {
    const modeLabel = isAnnual
      ? hubT("doc.annualTax", "Lohnsteuerbescheinigung")
      : (isMonthly ? hubT("nav.payrollMonthly", "Lohnabrechnung (monatlich)") : hubT("doc.invoice", "Rechnung"));
    modeChip.textContent = hubT("status.modeOf", "Modus: {mode}", { mode: modeLabel });
  }

  syncDocTypeCards(mode);
  updateTopbarForMode();

  if (isMonthly) ensureDefaultWageRowsFromLegacy(numberValue(grossSalaryInput), "Gehalt");
  if (isAnnual && taxYearInput && !taxYearInput.value) {
    taxYearInput.value = String(new Date().getFullYear());
  }

  if (previewZoomInput) previewZoomInput.disabled = false;
  if (printBtn) {
    printBtn.disabled = false;
    printBtn.title = "";
  }
  applyPreviewZoom();
  updateIncompleteFieldHighlights();
  updateDashboard();
}

function setPaymentStatus(invoiceDateValue, dueDateValue) {
  paymentStatus.classList.remove("status-warning", "status-overdue");
  if (!invoiceDateValue || !dueDateValue) {
    paymentStatus.textContent = "offen";
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateValue);
  dueDate.setHours(0, 0, 0, 0);
  if (dueDate < today) {
    paymentStatus.textContent = "überfällig";
    paymentStatus.classList.add("status-overdue");
    return;
  }
  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3) {
    paymentStatus.textContent = "bald fällig";
    paymentStatus.classList.add("status-warning");
    return;
  }
  paymentStatus.textContent = "offen";
}

/* ── Invoice Items ── */

function createItemRow(description = "", quantity = 1, price = 0) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input class="desc-input" type="text" value="${escapeHtml(description)}" placeholder="z. B. Beratung" /></td>
    <td><input class="qty-input" type="number" min="0" step="1" value="${quantity}" /></td>
    <td><input class="price-input" type="number" min="0" step="0.01" value="${price}" /></td>
    <td class="line-total">0,00</td>
    <td><button type="button" class="remove-item">Entfernen</button></td>
  `;
  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      updatePreview();
      saveDraft(false);
      updateIncompleteFieldHighlights();
    });
  });
  row.querySelector(".remove-item").addEventListener("click", () => {
    row.remove();
    updatePreview();
    saveDraft(false);
    updateIncompleteFieldHighlights();
  });
  itemsBody.appendChild(row);
  updatePreview();
  updateIncompleteFieldHighlights();
}

function getRowsData() {
  return [...itemsBody.querySelectorAll("tr")].map((row) => {
    const description = row.querySelector(".desc-input").value.trim();
    const quantity = Number(row.querySelector(".qty-input").value) || 0;
    const price = Number(row.querySelector(".price-input").value) || 0;
    const total = quantity * price;
    row.querySelector(".line-total").textContent = eur.format(total);
    return { description, quantity, price, total };
  });
}

function findWagePreset(code) {
  return WAGE_TYPE_PRESETS.find((preset) => preset.code === code) || WAGE_TYPE_PRESETS[0];
}

function buildWageCodeOptions(selectedCode = "2000") {
  const custom = selectedCode && !WAGE_TYPE_PRESETS.some((preset) => preset.code === selectedCode);
  const options = WAGE_TYPE_PRESETS.map((preset) => {
    const selected = preset.code === selectedCode ? " selected" : "";
    return `<option value="${preset.code}"${selected}>${preset.code} ${preset.label}</option>`;
  }).join("");
  const customSelected = custom ? " selected" : "";
  return `${options}<option value="${escapeHtml(selectedCode)}"${customSelected}>${escapeHtml(selectedCode)} (eigene)</option>`;
}

function updateWageRowAmountFields(row, amountOverride = null) {
  const qtyInput = row.querySelector(".wage-qty-input");
  const factorInput = row.querySelector(".wage-factor-input");
  const amountInput = row.querySelector(".wage-amount-input");
  const quantity = Number(qtyInput?.value) || 0;
  const factor = Number(factorInput?.value) || 0;
  const amount = amountOverride != null ? amountOverride : quantity * factor;
  if (amountInput && document.activeElement !== amountInput) {
    amountInput.value = amount > 0 ? String(amount) : "";
  }
}

function createWageRow(data = {}) {
  if (!wageItemsBody) return;
  const preset = findWagePreset(data.code || "2000");
  const code = data.code || preset.code;
  const label = data.label || preset.label;
  let quantity = Number(data.quantity);
  let factor = Number(data.factor);
  const amountFromData = Number(data.amount);
  if (Number.isNaN(quantity)) quantity = 1;
  if (Number.isNaN(factor)) factor = 0;
  if (amountFromData > 0 && factor <= 0 && quantity <= 0) {
    quantity = 1;
    factor = amountFromData;
  }
  const initialAmount = amountFromData > 0 ? amountFromData : quantity * factor;
  const taxFlag = data.taxFlag || preset.taxFlag || "L";
  const svFlag = data.svFlag || preset.svFlag || "L";

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><select class="wage-code-input">${buildWageCodeOptions(code)}</select></td>
    <td><input class="wage-label-input" type="text" value="${escapeHtml(label)}" /></td>
    <td><input class="wage-qty-input" type="number" min="0" step="0.01" value="${quantity}" /></td>
    <td><input class="wage-factor-input" type="number" min="0" step="0.01" value="${factor > 0 ? factor : ""}" placeholder="EUR" /></td>
    <td><input class="wage-amount-input" type="number" min="0" step="0.01" value="${initialAmount > 0 ? initialAmount : ""}" placeholder="EUR" /></td>
    <td>
      <select class="wage-tax-flag-input">
        <option value="L"${taxFlag === "L" ? " selected" : ""}>L</option>
        <option value="F"${taxFlag === "F" ? " selected" : ""}>F</option>
        <option value="P"${taxFlag === "P" ? " selected" : ""}>P</option>
      </select>
    </td>
    <td>
      <select class="wage-sv-flag-input">
        <option value="L"${svFlag === "L" ? " selected" : ""}>L</option>
        <option value="N"${svFlag === "N" ? " selected" : ""}>N</option>
      </select>
    </td>
    <td><button type="button" class="remove-wage-item" title="Zeile entfernen">×</button></td>
  `;

  const onWageUpdate = () => {
    if (useDatevReferenceDisplay && !datevReferenceLoading) useDatevReferenceDisplay = false;
    if (importedCsvTotals && !datevReferenceLoading) importedCsvTotals = null;
    if (!grossSyncLock) syncGrossSalaryFromWages();
    updatePreview();
    saveDraft(false);
  };

  row.querySelector(".wage-code-input").addEventListener("change", (event) => {
    const nextPreset = findWagePreset(event.target.value);
    row.querySelector(".wage-label-input").value = nextPreset.label;
    row.querySelector(".wage-tax-flag-input").value = nextPreset.taxFlag || "L";
    row.querySelector(".wage-sv-flag-input").value = nextPreset.svFlag || "L";
    onWageUpdate();
  });

  const qtyInput = row.querySelector(".wage-qty-input");
  const factorInput = row.querySelector(".wage-factor-input");
  const amountInput = row.querySelector(".wage-amount-input");

  qtyInput.addEventListener("input", () => {
    updateWageRowAmountFields(row);
    onWageUpdate();
  });
  factorInput.addEventListener("input", () => {
    updateWageRowAmountFields(row);
    onWageUpdate();
  });
  amountInput.addEventListener("input", () => {
    const amount = Number(amountInput.value) || 0;
    if (amount > 0) {
      qtyInput.value = "1";
      factorInput.value = String(amount);
    }
    onWageUpdate();
  });

  row.querySelectorAll(".wage-label-input, .wage-tax-flag-input, .wage-sv-flag-input").forEach((input) => {
    input.addEventListener("input", onWageUpdate);
    input.addEventListener("change", onWageUpdate);
  });

  row.querySelector(".remove-wage-item").addEventListener("click", () => {
    if (wageItemsBody.querySelectorAll("tr").length <= 1) {
      window.alert("Mindestens eine Lohnart muss vorhanden sein.");
      return;
    }
    row.remove();
    onWageUpdate();
  });

  wageItemsBody.appendChild(row);
  updateWageRowAmountFields(row, initialAmount);
  if (!grossSyncLock) syncGrossSalaryFromWages();
  updatePreview();
}

function getWageRowsData() {
  if (!wageItemsBody) return [];
  return [...wageItemsBody.querySelectorAll("tr")].map((row) => {
    const code = row.querySelector(".wage-code-input").value.trim();
    const label = row.querySelector(".wage-label-input").value.trim();
    const quantity = Number(row.querySelector(".wage-qty-input").value) || 0;
    const factor = Number(row.querySelector(".wage-factor-input").value) || 0;
    const amountInput = Number(row.querySelector(".wage-amount-input")?.value) || 0;
    const amount = amountInput > 0 ? amountInput : quantity * factor;
    updateWageRowAmountFields(row, amount);
    return {
      code,
      label,
      quantity: amount > 0 && quantity <= 0 ? 1 : quantity,
      factor: amount > 0 && factor <= 0 ? amount : factor,
      amount,
      taxFlag: row.querySelector(".wage-tax-flag-input").value || "L",
      svFlag: row.querySelector(".wage-sv-flag-input").value || "L",
    };
  });
}

function summarizeWageRows(wages = []) {
  const gross = wages.reduce((sum, item) => sum + item.amount, 0);
  const taxGross = wages
    .filter((item) => (item.taxFlag || "L") === "L")
    .reduce((sum, item) => sum + item.amount, 0);
  const svGross = wages
    .filter((item) => (item.svFlag || "L") === "L")
    .reduce((sum, item) => sum + item.amount, 0);
  const allTaxFree = wages.length > 0 && wages.every((item) => item.taxFlag === "F" || item.taxFlag === "P");
  const allSvFree = wages.length > 0 && wages.every((item) => item.svFlag === "N");
  return { gross, taxGross, svGross, wages, allTaxFree, allSvFree };
}

function resolvePayrollAssessmentBases(wageTotals, gross) {
  const wages = wageTotals.wages || [];
  let taxGross = wageTotals.taxGross;
  let svGross = wageTotals.svGross;

  if (!wages.length && gross > 0) {
    return { taxGross: gross, svGross: gross, allTaxFree: false, allSvFree: false };
  }

  if (wageTotals.allTaxFree) taxGross = 0;
  else if (taxGross <= 0 && gross > 0) taxGross = gross;

  if (wageTotals.allSvFree) svGross = 0;
  else if (svGross <= 0 && gross > 0) svGross = gross;

  return {
    taxGross,
    svGross,
    allTaxFree: Boolean(wageTotals.allTaxFree),
    allSvFree: Boolean(wageTotals.allSvFree),
  };
}

function syncGrossSalaryFromWages() {
  const totals = summarizeWageRows(getWageRowsData());
  const grossFieldActive = grossSalaryInput && document.activeElement === grossSalaryInput;
  if (grossSalaryInput && !grossSyncLock && !grossFieldActive) {
    grossSalaryInput.value = String(totals.gross > 0 ? totals.gross.toFixed(2) : "");
  }
  return totals;
}

function syncFirstWageRowFromGross(gross) {
  if (!wageItemsBody) return;
  grossSyncLock = true;
  let firstRow = wageItemsBody.querySelector("tr");
  if (!firstRow) {
    createWageRow({ code: "2000", label: "Gehalt", quantity: 1, factor: gross });
    grossSyncLock = false;
    return;
  }
  const qtyInput = firstRow.querySelector(".wage-qty-input");
  const factorInput = firstRow.querySelector(".wage-factor-input");
  const amountInput = firstRow.querySelector(".wage-amount-input");
  if (qtyInput) qtyInput.value = "1";
  if (factorInput) factorInput.value = gross > 0 ? String(gross) : "";
  if (amountInput) amountInput.value = gross > 0 ? String(gross) : "";
  grossSyncLock = false;
}

function onGrossSalaryInput() {
  const gross = numberValue(grossSalaryInput);
  syncFirstWageRowFromGross(gross);
  updatePreview();
  saveDraft(false);
}

function ensureDefaultWageRowsFromLegacy(gross = 0, label = "Gehalt") {
  if (!wageItemsBody || wageItemsBody.querySelectorAll("tr").length) return;
  const fallbackGross = gross > 0 ? gross : numberValue(grossSalaryInput) || 3500;
  createWageRow({
    code: "2000",
    label,
    quantity: 1,
    factor: fallbackGross,
    amount: fallbackGross,
  });
  if (grossSalaryInput && !grossSalaryInput.value) {
    grossSalaryInput.value = String(fallbackGross);
  }
}

function normalizeLoadedWageItems(items, fallbackGross = 0) {
  const gross = Number(fallbackGross) || 0;
  if (!Array.isArray(items) || !items.length) return items;
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || Number(item.quantity) * Number(item.factor) || 0), 0);
  if (total >= 1 || gross < 1) return items;
  return items.map((item, index) => {
    if (index !== 0) return item;
    return { ...item, code: item.code || "2000", label: item.label || "Gehalt", quantity: 1, factor: gross, amount: gross };
  });
}

function loadWageItems(items, fallbackGross = 0, fallbackLabel = "Gehalt") {
  if (!wageItemsBody) return;
  wageItemsBody.innerHTML = "";
  const normalized = normalizeLoadedWageItems(items, fallbackGross);
  const list = Array.isArray(normalized) && normalized.length ? normalized : null;
  if (list) {
    list.forEach((item) => createWageRow(item));
    if (grossSalaryInput && fallbackGross > 0) grossSalaryInput.value = String(fallbackGross);
    return;
  }
  ensureDefaultWageRowsFromLegacy(fallbackGross, fallbackLabel);
}

function formatEmployeeSalutation(name) {
  const raw = String(name || "").trim();
  if (!raw || raw === "-") return "-";
  if (/^(herr|frau|firma|herrn|angestellter)\b/i.test(raw)) return raw;
  return `Herrn ${raw}`;
}

function buildAgendaTimestampLine() {
  const now = new Date();
  const date = now.toLocaleDateString("de-DE");
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const user = signatureNameInput?.value?.trim()
    || managingDirectorInput?.value?.trim()
    || companyProfileNameInput?.value?.trim()
    || "Benutzer";
  return `Erstellt am ${date} um ${time} Uhr von ${user} mit Agenda LOHN V21.0 R2: FinanzDokument Pro ${APP_VERSION}`;
}

function buildPayrollFooterText() {
  const custom = payrollFooterLineInput?.value?.trim();
  if (custom) return custom;
  const lines = [];
  const director = managingDirectorInput?.value?.trim();
  const register = commercialRegisterInput?.value?.trim();
  if (director || register) lines.push([director, register].filter(Boolean).join(" · "));
  const taxNo = taxNumberInput?.value?.trim();
  const vat = vatIdInput?.value?.trim();
  if (taxNo || vat) {
    lines.push([taxNo ? `St.-Nr. ${taxNo}` : "", vat ? `USt-IdNr. ${vat}` : ""].filter(Boolean).join(" · "));
  }
  const bank = companyBankNameInput?.value?.trim();
  const iban = companyIbanInput?.value?.trim();
  const bic = companyBicInput?.value?.trim();
  if (bank || iban || bic) {
    lines.push([bank, iban ? `IBAN ${iban}` : "", bic ? `BIC ${bic}` : ""].filter(Boolean).join(" · "));
  }
  return lines.join("\n") || "-";
}

function formatAmountAgendaEmployer(value) {
  const amount = Math.abs(Number(value) || 0);
  if (amount <= 0) return "0,00";
  return `${formatAmount(amount)}-`;
}

function formatAmountAgendaDeduction(value) {
  const amount = Math.abs(Number(value) || 0);
  if (amount <= 0) return "";
  return `${formatAmount(amount)}-`;
}

function formatVerdienstCell(value, isDeduction) {
  if (isDeduction) {
    const formatted = formatAmountAgendaDeduction(value);
    return formatted || "0,00";
  }
  return formatAmount(value);
}

function getPayrollMonthEndDate(monthValue) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return "-";
  const [year, month] = monthValue.split("-").map(Number);
  const last = new Date(year, month, 0);
  return formatDateForView(`${year}-${String(month).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`);
}

function applyDatevReferenceOverrides(payroll) {
  if (importedCsvTotals && isDatevPayrollLayout()) {
    const t = importedCsvTotals;
    const taxDed = t.payrollTax + t.solidarity + t.churchTax;
    const svTotal = t.health + t.pension + t.care + t.unemployment;
    return {
      ...payroll,
      gross: t.gross || payroll.gross,
      payrollTax: t.payrollTax ?? payroll.payrollTax,
      churchTax: t.churchTax ?? payroll.churchTax,
      solidarity: t.solidarity ?? payroll.solidarity,
      health: t.health ?? payroll.health,
      pension: t.pension ?? payroll.pension,
      unemployment: t.unemployment ?? payroll.unemployment,
      care: t.care ?? payroll.care,
      svTotal: svTotal || payroll.svTotal,
      net: t.net || payroll.net,
      employeeDeductions: taxDed + svTotal,
    };
  }
  if (!useDatevReferenceDisplay || !isDatevPayrollLayout()) return payroll;
  if (employeeIdInput.value.trim() !== "02006") return payroll;
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

function buildDatevHintsText(payroll) {
  const lines = [];
  const note = noteInput?.value?.trim();
  if (note) lines.push(note);
  lines.push("Wöch.Arb.Zt. 30,00 Ersteintr. 01.01.19");
  lines.push("- AN-PV-%-Satz 3 Kinder < 25 J.: 0,40%");
  return lines.join("\n") || "-";
}

function readPayrollBackgroundSettings() {
  try {
    const raw = localStorage.getItem(PAYROLL_BG_STORAGE);
    if (!raw) return;
    const data = JSON.parse(raw);
    payrollBgDataUrl = data.dataUrl || "";
    usePdfBackground = Boolean(data.enabled);
    hidePdfChrome = Boolean(data.hideChrome);
  } catch {
    payrollBgDataUrl = "";
  }
}

function ensurePdfJsReady() {
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    throw new Error("PDF-Bibliothek nicht geladen. Seite mit F5 neu laden.");
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  }
  return pdfjs;
}

function canvasToCompressedJpeg(canvas, maxChars = 4_500_000) {
  for (const quality of [0.92, 0.85, 0.75, 0.65, 0.55]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= maxChars) return dataUrl;
  }
  const smaller = document.createElement("canvas");
  smaller.width = Math.round(canvas.width * 0.75);
  smaller.height = Math.round(canvas.height * 0.75);
  smaller.getContext("2d").drawImage(canvas, 0, 0, smaller.width, smaller.height);
  return smaller.toDataURL("image/jpeg", 0.72);
}

function savePayrollBackgroundSettings() {
  if (!payrollBgDataUrl) {
    localStorage.removeItem(PAYROLL_BG_STORAGE);
    return true;
  }
  try {
    localStorage.setItem(PAYROLL_BG_STORAGE, JSON.stringify({
      dataUrl: payrollBgDataUrl,
      enabled: usePdfBackground,
      hideChrome: hidePdfChrome,
    }));
    return true;
  } catch (err) {
    console.warn("Hintergrund konnte nicht dauerhaft gespeichert werden:", err);
    return false;
  }
}

async function pdfFirstPageToDataUrl(file) {
  const pdfjs = ensurePdfJsReady();
  const data = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (/password|encrypted|verschlüsselt/i.test(msg)) {
      throw new Error("PDF ist passwortgeschützt. Bitte ohne Passwort speichern oder als PNG/JPG exportieren.");
    }
    throw new Error(`PDF konnte nicht gelesen werden: ${msg || "Unbekannter Fehler"}`);
  }
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 1240;
  const scale = Math.min(2.5, Math.max(1, targetWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvasToCompressedJpeg(canvas);
}

function applyPayrollFormBackground(dataUrl, options = {}) {
  payrollBgDataUrl = dataUrl;
  usePdfBackground = true;
  if (options.hideChrome !== false) hidePdfChrome = true;
  if (payrollLayoutSelect) payrollLayoutSelect.value = "datev";
  applyPayrollLayout("datev");
  focusPayrollAfterImport();
  const persisted = savePayrollBackgroundSettings();
  applyPayrollBackgroundUI();
  updatePreview();
  if (lexStatusMessage) lexStatusMessage.textContent = "Formular-Hintergrund geladen";
  return persisted;
}

async function importPdfTemplateFile(file) {
  if (!file) return;
  const name = file.name || "Datei";
  if (lexStatusMessage) lexStatusMessage.textContent = `${name} wird geladen…`;
  try {
    let dataUrl;
    const lower = name.toLowerCase();
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      dataUrl = await pdfFirstPageToDataUrl(file);
    } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
      dataUrl = await readImageFileAsDataUrl(file);
    } else {
      window.alert("Bitte PDF, PNG oder JPG wählen.");
      return;
    }
    const persisted = applyPayrollFormBackground(dataUrl);
    const storageHint = persisted
      ? ""
      : "\n\nHinweis: Bild zu groß für Browser-Speicher – Hintergrund gilt bis zum Schließen der Seite.";
    window.alert(
      `DATEV-Formular als Hintergrund geladen.${storageHint}\n\n`
      + "Empfohlen: „Nur Werte anzeigen (Raster ausblenden)“ ist aktiv – Vorschau rechts prüfen."
    );
  } catch (err) {
    if (lexStatusMessage) lexStatusMessage.textContent = "PDF-Import fehlgeschlagen";
    window.alert(`Import fehlgeschlagen: ${err.message || err}\n\nTipp: Seite über Doppelklick oder http://localhost öffnen; bei Problemen PDF als PNG speichern.`);
  }
}

function applyPayrollBackgroundUI() {
  const layer = document.getElementById("payrollBgLayer");
  const img = document.getElementById("payrollBgImage");
  const overlay = document.getElementById("datevValueOverlay");
  const hideRow = document.getElementById("hideChromeRow");
  const refMode = usePdfBackground && hidePdfChrome && Boolean(payrollBgDataUrl);
  if (usePdfBackgroundInput) usePdfBackgroundInput.checked = usePdfBackground;
  if (hidePdfChromeInput) hidePdfChromeInput.checked = hidePdfChrome;
  if (img && payrollBgDataUrl) img.src = payrollBgDataUrl;
  if (layer) layer.classList.toggle("hidden", !(usePdfBackground && payrollBgDataUrl));
  if (overlay) overlay.classList.toggle("hidden", !refMode);
  if (payrollSheet) {
    payrollSheet.classList.toggle("layout-datev-pdf-bg", usePdfBackground && Boolean(payrollBgDataUrl));
    payrollSheet.classList.toggle("layout-datev-bg-chrome-hidden", hidePdfChrome && usePdfBackground && Boolean(payrollBgDataUrl));
    payrollSheet.classList.toggle("layout-datev-ref-mode", refMode);
  }
  if (hideRow) hideRow.classList.toggle("hidden", !(usePdfBackground && payrollBgDataUrl));
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}

async function loadReferenzPngBackground() {
  try {
    const resp = await fetch(PAYROLL_BG_REF_PATH);
    if (!resp.ok) throw new Error("Referenz-PNG nicht gefunden");
    const blob = await resp.blob();
    const dataUrl = await readImageFileAsDataUrl(blob);
    applyPayrollFormBackground(dataUrl);
    loadBuiltInTemplate("datev_mustermann_juli2025");
    if (lexStatusMessage) lexStatusMessage.textContent = "Referenz-PNG + Mustermann geladen";
  } catch (err) {
    window.alert(`Referenz-PNG konnte nicht geladen werden (${err.message}). Seite über http://localhost öffnen, nicht als file://.`);
  }
}

function clearPdfTemplateBackground() {
  payrollBgDataUrl = "";
  usePdfBackground = false;
  hidePdfChrome = false;
  localStorage.removeItem(PAYROLL_BG_STORAGE);
  applyPayrollBackgroundUI();
  if (lexStatusMessage) lexStatusMessage.textContent = "Formular-Hintergrund entfernt";
}

function importDatevCsvFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => window.alert("CSV konnte nicht gelesen werden.");
  reader.onload = () => {
    try {
      const parsed = window.DatevImport?.parseDatevCsvText(stripBom(reader.result));
      if (!parsed?.draft) {
        window.alert("Keine gültige DATEV-CSV erkannt.\n\nUnterstützt: Export aus dieser App oder LODAS-Bewegungsdaten (Personal-Nr.;Lohnart;Betrag;…).");
        return;
      }
      importedCsvTotals = parsed.draft.meta?.importedTotals || null;
      useDatevReferenceDisplay = false;
      datevReferenceLoading = true;
      applyImportedDraft(parsed.draft, { saveToStorage: false, showMessage: false });
      saveDraft(false);
      datevReferenceLoading = false;
      window.alert(`DATEV-CSV importiert (${parsed.format}). Felder sind bearbeitbar.`);
      if (lexStatusMessage) lexStatusMessage.textContent = `CSV importiert (${parsed.format})`;
    } catch (err) {
      window.alert(`CSV-Import fehlgeschlagen: ${err.message || err}`);
    }
  };
  reader.readAsText(file, "UTF-8");
}

function buildDatevUsaLine() {
  return "USA/US";
}

function renderDatevBetragRows(wages, spacerCount) {
  const container = pvDatevBetragRows || document.getElementById("pvDatevBetragRows");
  if (!container) return;
  container.innerHTML = "";
  wages.forEach((item) => {
    const amount = Number(item.amount) || Number(item.quantity) * Number(item.factor) || 0;
    const row = document.createElement("div");
    row.className = "ag-dv-rail-amt";
    row.textContent = formatAmount(amount);
    container.appendChild(row);
  });
  const hint = document.createElement("div");
  hint.className = "ag-dv-rail-hint-spacer";
  container.appendChild(hint);
  for (let i = 0; i < spacerCount; i += 1) {
    const spacer = document.createElement("div");
    spacer.className = "ag-dv-rail-spacer";
    container.appendChild(spacer);
  }
}

function renderWagePreviewRows(wages, gross) {
  const isDatev = isDatevPayrollLayout();
  const tbody = isDatev ? pvWageRows : (pvWageRowsAgenda || pvWageRows);
  if (!tbody) return;
  tbody.innerHTML = "";
  wages.forEach((item) => {
    const amount = Number(item.amount) || Number(item.quantity) * Number(item.factor) || 0;
    const qty = amount > 0 && Number(item.quantity) <= 0 ? 1 : Number(item.quantity) || 0;
    const factor = amount > 0 && Number(item.factor) <= 0 ? amount : Number(item.factor) || 0;
    const tr = document.createElement("tr");
    if (isDatev) {
      const pct = item.code === "840" ? "25,00" : (item.percent ? formatNumber(item.percent) : "");
      tr.innerHTML = `
        <td>${escapeHtml(item.code || "2000")}</td>
        <td>${escapeHtml(item.label || "-")}</td>
        <td></td>
        <td class="ag-num">${formatNumber(qty)}</td>
        <td class="ag-num">${formatNumber(factor)}</td>
        <td class="ag-num">${pct}</td>
        <td>${escapeHtml(item.taxFlag || "L")}</td>
        <td>${escapeHtml(item.svFlag || "L")}</td>
        <td>${amount > 0 ? "J" : ""}</td>
      `;
    } else {
      tr.innerHTML = `
        <td>${escapeHtml(item.code || "0001")}</td>
        <td>${escapeHtml(item.label || "-")}</td>
        <td class="ag-num">${formatNumber(qty)}</td>
        <td class="ag-num">${formatNumber(factor)}</td>
        <td></td>
        <td>${escapeHtml(item.taxFlag || "L")}</td>
        <td>${escapeHtml(item.svFlag || "L")}</td>
        <td>${amount > 0 ? "J" : ""}</td>
        <td class="ag-num">${formatAmount(amount)}</td>
      `;
    }
    tbody.appendChild(tr);
  });
  if (isDatev) {
    const hint = document.createElement("tr");
    hint.className = "ag-earnings-hint";
    hint.innerHTML = `<td colspan="9">**** Testabrechnung als erfasster Hinweistext</td>`;
    tbody.appendChild(hint);
  }
  const dataRows = tbody.querySelectorAll("tr").length;
  const minRows = Math.max(isDatev ? 6 : 8, dataRows + 2);
  const colSpan = isDatev ? 9 : 9;
  let spacerCount = 0;
  for (let i = dataRows; i < minRows; i += 1) {
    const spacer = document.createElement("tr");
    spacer.className = "ag-earnings-spacer";
    spacer.innerHTML = `<td colspan="${colSpan}"></td>`;
    tbody.appendChild(spacer);
    if (isDatev) spacerCount += 1;
  }
  if (isDatev) renderDatevBetragRows(wages, spacerCount);
}

function setDatevTaxRows(payroll) {
  const taxBody = document.getElementById("pvDatevTaxRow");
  const svBody = document.getElementById("pvDatevSvRow");
  if (!taxBody || !svBody) return;
  const taxGross = payroll.taxGross ?? payroll.gross;
  const svGross = payroll.svGross ?? payroll.gross;
  taxBody.innerHTML = `<tr>
    <td class="ag-row-h">St</td><td>L</td>
    <td class="ag-num">${formatAmount(taxGross)}</td>
    <td class="ag-num">${formatAmount(payroll.payrollTax)}</td>
    <td class="ag-num">${formatAmount(payroll.churchTax)}</td>
    <td class="ag-num">${formatAmount(payroll.solidarity)}</td>
  </tr>`;
  svBody.innerHTML = `<tr>
    <td class="ag-row-h">SV</td><td>L</td>
    <td class="ag-num">${formatAmount(svGross)}</td>
    <td class="ag-num">${formatAmount(svGross)}</td>
    <td class="ag-num">${formatAmount(svGross)}</td>
    <td class="ag-num">${formatAmount(svGross)}</td>
    <td class="ag-num">${formatAmount(payroll.health)}</td>
    <td class="ag-num">${formatAmount(payroll.pension)}</td>
    <td class="ag-num">${formatAmount(payroll.unemployment)}</td>
    <td class="ag-num">${formatAmount(payroll.care)}</td>
  </tr>`;
}

function populateDatevVerdienstTables(leftEl, rightEl, nettoEl, payroll) {
  if (!leftEl || !rightEl) return;
  clearTableBody(leftEl);
  clearTableBody(rightEl);
  const taxGross = payroll.taxGross ?? payroll.gross;
  const svGross = payroll.svGross ?? payroll.gross;
  const leftRows = [
    ["Gesamt-Brutto", payroll.gross],
    ["Steuer-Brutto", taxGross],
    ["Lohnsteuer", payroll.payrollTax],
    ["Kirchensteuer", payroll.churchTax],
    ["Solidaritätszuschlag", payroll.solidarity],
    ["Steuerfreie Bezüge", 0],
    ["P. verm. Beitr. AG", 0],
    ["ZVK-Betrag", 0],
  ];
  const rightRows = [
    ["SV-Brutto", svGross],
    ["KV-Beitrag", payroll.health],
    ["RV-Beitrag", payroll.pension],
    ["AV-Beitrag", payroll.unemployment],
    ["PV-Beitrag", payroll.care],
    ["", ""],
    ["", ""],
    ["", ""],
  ];
  leftRows.forEach(([label, val]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td class="ag-num">${label ? formatAmount(val) : ""}</td>`;
    leftEl.appendChild(tr);
  });
  rightRows.forEach(([label, val]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td class="ag-num">${label ? formatAmount(val) : ""}</td>`;
    rightEl.appendChild(tr);
  });
  if (nettoEl) {
    clearTableBody(nettoEl);
    if (nettoEl.id === "pvDatevVbNetto") {
      for (let i = 0; i < 8; i += 1) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td class=\"ag-num\"></td>";
        nettoEl.appendChild(tr);
      }
      return;
    }
    const nettoRows = (payroll.wageItems || []).map((item) => [
      `${item.code} ${item.label}`,
      Number(item.amount) || 0,
    ]);
    if (!nettoRows.length) nettoRows.push(["2000 Gehalt", payroll.gross]);
    for (let i = nettoRows.length; i < 8; i += 1) nettoRows.push(["", ""]);
    nettoRows.forEach(([label, val]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(label)}</td><td class="ag-num">${label ? formatAmount(val) : ""}</td>`;
      nettoEl.appendChild(tr);
    });
  }
}

function setDatevVerdienstSplit(payroll) {
  populateDatevVerdienstTables(
    document.getElementById("pvDatevVerdienstLeft"),
    document.getElementById("pvDatevVerdienstRight"),
    null,
    payroll,
  );
  populateDatevVerdienstTables(
    document.getElementById("pvDatevVbLeft"),
    document.getElementById("pvDatevVbRight"),
    document.getElementById("pvDatevVbNetto"),
    payroll,
  );
}

function syncDatevMasterFields(payroll, taxClass, taxAllowance, childAllowance, assessmentDays) {
  const kkTotal = (payroll.healthPercent || 0) * 2;
  const refGridEmpty = useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006";
  setNodeText(document.getElementById("pvDvPersNr"), employeeIdInput.value.trim() || "-");
  setNodeText(document.getElementById("pvDvBirthDate"), formatDateShortDatev(employeeBirthDateInput.value));
  setNodeText(document.getElementById("pvDvFactor"), taxClass === "IV" && factorMethodInput?.checked ? formatNumber(numberValue(factorValueInput)) : "-");
  setNodeText(document.getElementById("pvDvChildFb"), formatNumber(childAllowance));
  setNodeText(document.getElementById("pvDvKonfession"), useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? "ev"
    : (payroll.churchTaxRate > 0 ? (Number(churchTaxRateInput?.value) === 8 ? "rk" : "ev") : "/"));
  setNodeText(document.getElementById("pvDvFreibYear"), taxAllowance > 0 ? formatAmount(taxAllowance * 12) : "-");
  setNodeText(document.getElementById("pvDvFreibMtl"), formatAmount(taxAllowance));
  setNodeText(document.getElementById("pvDvStTage"), String(assessmentDays));
  setNodeText(document.getElementById("pvDvInsuranceNo"), employeeInsuranceNoInput?.value?.trim() || "-");
  setNodeText(document.getElementById("pvDvHealthFund"), (healthFundInput?.value || "AOK").trim());
  setNodeText(document.getElementById("pvDvKkPct"), useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? formatNumber(DATEV_REFERENCE_DISPLAY.kkDisplay)
    : (kkTotal > 0 ? formatNumber(kkTotal) : "-"));
  setNodeText(document.getElementById("pvDvPgrs"), "101");
  setNodeText(document.getElementById("pvDvBgrs"), "1112");
  setNodeText(document.getElementById("pvDvUm"), "1");
  setNodeText(document.getElementById("pvDvSvTage"), String(assessmentDays));
  const entryShort = formatDateShortDatev(employeeEntryDateInput.value);
  const exitShort = formatDateForView(employeeExitDateInput.value) || "-";
  const taxId = employeeTaxIdInput.value.trim() || "-";
  setNodeText(document.getElementById("pvDvEntryMid"), entryShort);
  setNodeText(document.getElementById("pvDvExitMid"), refGridEmpty && !employeeExitDateInput.value.trim() ? "" : exitShort);
  setNodeText(document.getElementById("pvDvTaxIdMid"), useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? DATEV_REFERENCE_DISPLAY.taxIdMid
    : taxId);
  setNodeText(document.getElementById("pvDvMfbMid"), "Nein");
  setNodeText(document.getElementById("pvDvMfb"), "Nein");
  setNodeText(document.getElementById("pvDvVacPrev"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvVacEnt"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvVacTaken"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvVacRemain"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvWorkDays"), refGridEmpty ? "" : formatNumber(payroll.days));
  setNodeText(document.getElementById("pvDvVacDays"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvSickDays"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvMissingDays"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvWorkHours"), refGridEmpty ? "" : formatNumber(payroll.hours));
  setNodeText(document.getElementById("pvDvMissingHours"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvOvertimeHours"), refGridEmpty ? "" : "0,00");
  setNodeText(document.getElementById("pvDvHourRate"), refGridEmpty ? "" : formatNumber(payroll.averageHourRate));
  setNodeText(document.getElementById("pvDvHourRate2"), refGridEmpty ? "" : "-");
  setNodeText(document.getElementById("pvDvHourRate3"), refGridEmpty ? "" : "-");
  setNodeText(document.getElementById("pvDvBasePay"), refGridEmpty ? "" : "-");
  setNodeText(document.getElementById("pvDvEmployerShareDay"), refGridEmpty ? "" : formatAmount(payroll.employerShare));
}

function setAgendaTaxRows(payroll) {
  const tbody = document.getElementById("pvAgendaTaxRows");
  if (!tbody) return;
  clearTableBody(tbody);
  const taxGross = payroll.taxGross ?? payroll.gross;
  const svGross = payroll.svGross ?? payroll.gross;
  const cellGross = (value) => (value ? `<td class="ag-num">${formatAmount(value)}</td>` : "<td></td>");
  const cellDed = (value) => (value ? `<td class="ag-num">${formatAmountAgendaDeduction(value)}</td>` : "<td></td>");
  const rows = [
    ["LSt", taxGross, payroll.payrollTax, "", "", "", "", "", ""],
    ["SolZ", "", payroll.solidarity, "", "", "", "", "", ""],
    ["KiSt", "", payroll.churchTax, "", "", "", "", "", ""],
    ["KV", "", "", "", "", svGross, payroll.health, "", ""],
    ["RV", "", "", "", "", svGross, payroll.pension, "", ""],
    ["AV", "", "", "", "", svGross, payroll.unemployment, "", ""],
    ["PV", "", "", "", "", svGross, payroll.care, "", ""],
  ];
  rows.forEach(([label, stBruttoL, stAbzL, stBruttoS, stAbzS, svBruttoL, svBeitrL, svBruttoS, svBeitrS]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="ag-row-h">${label}</td>${cellGross(stBruttoL)}${cellDed(stAbzL)}${cellGross(stBruttoS)}${cellDed(stAbzS)}${cellGross(svBruttoL)}${cellDed(svBeitrL)}${cellGross(svBruttoS)}${cellDed(svBeitrS)}`;
    tbody.appendChild(tr);
  });
}

function setVerdienstRows(payroll, ytd = null) {
  const tbody = document.getElementById("pvVerdienstRows");
  if (!tbody) return;
  clearTableBody(tbody);
  const DEDUCTION_KEYS = new Set([
    "payrollTax", "solidarity", "churchTax", "health", "pension", "care", "unemployment",
  ]);
  const ytdVal = (key, isDeduction) => {
    if (!ytd || !key || ytd[key] == null) return "–";
    return formatVerdienstCell(ytd[key], isDeduction);
  };
  const rows = [
    ["Abrechnungs-Brutto", payroll.gross, "gross", false],
    ["Steuer-Brutto", payroll.taxGross ?? payroll.gross, "taxGross", false],
    ["SV-Brutto", payroll.svGross ?? payroll.gross, "svGross", false],
    ["Gesamt-Brutto mtl.", payroll.gross, "gross", false],
    ["Nettoentgelt mtl.", payroll.net, "net", false],
    ["Steuerfreie Bezüge", 0, null, false],
    ["P. verm. Beitr. AG", 0, null, false],
    ["ZVK-Betrag mtl.", 0, null, false],
    ["ZVK-Förderung AG", 0, null, false],
    ["Lohnsteuer", payroll.payrollTax, "payrollTax", true],
    ["Solidaritätszuschlag", payroll.solidarity, "solidarity", true],
    ["Kirchensteuer", payroll.churchTax, "churchTax", true],
    ["KV-Beitrag", payroll.health, "health", true],
    ["RV-Beitrag", payroll.pension, "pension", true],
    ["PV-Beitrag", payroll.care, "care", true],
    ["AV-Beitrag", payroll.unemployment, "unemployment", true],
    ["Netto-Verdienst", payroll.net, "net", false],
  ];
  rows.forEach(([label, mtl, ytdKey, isDeduction]) => {
    const tr = document.createElement("tr");
    const deduct = isDeduction || (ytdKey && DEDUCTION_KEYS.has(ytdKey));
    const jahr = ytdKey ? ytdVal(ytdKey, deduct) : "–";
    tr.innerHTML = `<td>${label}</td><td></td><td class="ag-num">${formatVerdienstCell(mtl, deduct)}</td><td class="ag-num">${jahr}</td>`;
    tbody.appendChild(tr);
  });
}

/* ── Payroll Calculation ── */

function calculatePayrollData() {
  const grossInput = numberValue(grossSalaryInput);
  let wageTotals = summarizeWageRows(getWageRowsData());
  let gross = wageTotals.gross;
  if (gross <= 0 && grossInput > 0) {
    syncFirstWageRowFromGross(grossInput);
    wageTotals = summarizeWageRows(getWageRowsData());
    gross = wageTotals.gross || grossInput;
  } else if (!grossSyncLock && document.activeElement !== grossSalaryInput) {
    wageTotals = syncGrossSalaryFromWages();
    gross = wageTotals.gross;
  }
  const hours = numberValue(workHoursInput);
  const days = numberValue(workDaysInput);
  const bases = resolvePayrollAssessmentBases(wageTotals, gross);
  const calcOptions = {
    ...collectPayrollCalcOptions(),
    taxGross: bases.taxGross,
    svGross: bases.svGross,
    allTaxFree: bases.allTaxFree,
    allSvFree: bases.allSvFree,
  };
  const result = calculateLegalPayroll(gross, calcOptions);
  updatePayrollTaxEffectiveDisplay(result);

  const rates = result.rates || getLegalEmployeeRates(collectPayrollCalcOptions());

  return {
    ...result,
    wageItems: wageTotals.wages,
    taxGross: bases.taxGross,
    svGross: bases.svGross,
    averageHourRate: hours > 0 ? gross / hours : 0,
    hours,
    days,
    assessmentDays: getPayrollAssessmentDays(payrollMonthInput?.value, days),
    payrollTaxPercent: gross > 0 ? (result.payrollTax / gross) * 100 : 0,
    pensionPercent: rates.pensionPercent ?? numberValue(pensionPercentInput),
    healthPercent: rates.healthPercent ?? numberValue(healthPercentInput),
    carePercent: rates.carePercent ?? numberValue(carePercentInput),
    unemploymentPercent: rates.unemploymentPercent ?? numberValue(unemploymentPercentInput),
    taxMethod: result.taxMethod || LEGAL_CONFIG.tax.method,
    legalRatesApplied: Boolean(window.PayrollEngine?.ready),
  };
}

function isLikelyInsuranceNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const compact = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return /^[0-9]{2}[0-9]{6}[A-Z][0-9]{3}$/.test(compact);
}

function warnInsuranceNumberIfNeeded(askOnPrint = false) {
  if (!employeeInsuranceNoInput) return true;
  const value = employeeInsuranceNoInput.value;
  if (isLikelyInsuranceNumber(value)) return true;
  const warningText = "SV-Nummer wirkt ungewöhnlich. Bitte Format prüfen (z. B. 12 345678 A 123).";
  if (askOnPrint) return window.confirm(`${warningText}\n\nTrotzdem drucken?`);
  window.alert(warningText);
  return true;
}

/* ── Preview: Invoice ── */

function updateInvoicePreview() {
  const rowsData = getRowsData();
  const subtotal = rowsData.reduce((sum, item) => sum + item.total, 0);
  const isKlein = kleinunternehmerInput?.checked;
  const isReverse = reverseChargeInput?.checked;
  let taxRate = (isKlein || isReverse) ? 0 : (Number(taxRateInput.value) || 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  previewDocumentTitle.textContent = "Rechnung";
  previewInvoiceNumber.textContent = `Nr. ${invoiceNumberInput.value.trim() || "-"}`;
  previewInvoiceDate.textContent = formatDateForView(invoiceDateInput.value);
  if (previewServiceDate) {
    previewServiceDate.textContent = formatDateForView(serviceDateInput?.value || invoiceDateInput.value);
  }
  previewDueDate.textContent = formatDateForView(dueDateInput.value);
  previewSeller.textContent = sellerInput.value.trim() || "-";
  previewCustomer.textContent = customerInput.value.trim() || "-";

  let noteText = noteInput.value.trim() || "-";
  if (isKlein) noteText += "\n\nGemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
  if (isReverse) noteText += "\n\nSteuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).";
  previewNote.textContent = noteText;

  refreshActiveSignature({ save: false });
  refreshSignatureSealUi();

  if (previewTaxNumber) {
    previewTaxNumber.textContent = taxNumberInput?.value?.trim()
      ? `Steuernummer: ${taxNumberInput.value.trim()}`
      : "";
  }
  if (previewVatId) {
    previewVatId.textContent = vatIdInput?.value?.trim()
      ? `USt-IdNr.: ${vatIdInput.value.trim()}`
      : "";
  }
  if (previewCommercialRegister) {
    previewCommercialRegister.textContent = commercialRegisterInput?.value?.trim()
      ? commercialRegisterInput.value.trim()
      : "";
  }
  if (previewCompanyBank) {
    const parts = [];
    if (companyBankNameInput?.value?.trim()) parts.push(companyBankNameInput.value.trim());
    if (companyIbanInput?.value?.trim()) parts.push(`IBAN: ${companyIbanInput.value.trim()}`);
    if (companyBicInput?.value?.trim()) parts.push(`BIC: ${companyBicInput.value.trim()}`);
    previewCompanyBank.textContent = parts.length ? parts.join(" · ") : "-";
  }

  subtotalLabel.textContent = "Zwischensumme (netto):";
  if (isReverse) {
    taxLabel.textContent = "USt (§ 13b Reverse-Charge):";
  } else {
    taxLabel.textContent = isKlein ? "USt (§ 19):" : `USt (${taxRate} %):`;
  }
  totalLabel.textContent = "Gesamtbetrag:";
  setPaymentStatus(invoiceDateInput.value, dueDateInput.value);

  if (taxRowPreview) taxRowPreview.classList.toggle("hidden", isKlein || isReverse);

  clearTableBody(previewItemsBody);
  rowsData.forEach((item) => {
    if (!item.description && item.quantity === 0 && item.price === 0) return;
    const row = document.createElement("tr");
    ["description", "quantity", "price", "total"].forEach((key, i) => {
      const td = document.createElement("td");
      if (key === "price" || key === "total") td.textContent = eur.format(item[key]);
      else if (key === "description") td.textContent = item.description || "-";
      else td.textContent = String(item.quantity);
      row.appendChild(td);
    });
    previewItemsBody.appendChild(row);
  });

  if (!previewItemsBody.children.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4">Keine Positionen vorhanden.</td>`;
    previewItemsBody.appendChild(row);
  }

  previewSubtotal.textContent = eur.format(subtotal);
  previewTax.textContent = isKlein ? "entfällt" : `${eur.format(tax)} (${taxRate} %)`;
  previewTotal.textContent = eur.format(total);
  updateInvoiceComplianceList();
}

function updateInvoiceComplianceList() {
  if (!invoiceComplianceList) return;
  const isKlein = kleinunternehmerInput?.checked;
  const checks = [
    { ok: Boolean(sellerInput.value.trim()), key: "comp.seller", fb: "Name und Anschrift des leistenden Unternehmers" },
    { ok: Boolean(customerInput.value.trim()), key: "comp.customer", fb: "Name und Anschrift des Leistungsempfängers" },
    { ok: Boolean(invoiceNumberInput.value.trim()), key: "comp.number", fb: "Fortlaufende Rechnungsnummer" },
    { ok: Boolean(invoiceDateInput.value), key: "comp.issueDate", fb: "Ausstellungsdatum" },
    { ok: Boolean(serviceDateInput?.value || invoiceDateInput.value), key: "comp.serviceDate", fb: "Leistungsdatum" },
    { ok: getRowsData().some((i) => i.description && i.quantity > 0), key: "comp.qtyType", fb: "Menge und Art der Leistung" },
    { ok: getRowsData().some((i) => i.price >= 0 && i.total >= 0), key: "comp.net", fb: "Entgelt (netto)" },
    {
      ok: isKlein || Boolean(taxRateInput.value),
      key: isKlein ? "comp.hint19" : "comp.tax",
      fb: isKlein ? "Hinweis § 19 UStG" : "Steuersatz und Steuerbetrag",
    },
    { ok: Boolean(taxNumberInput?.value?.trim() || vatIdInput?.value?.trim()), key: "comp.taxId", fb: "Steuernummer oder USt-IdNr." },
  ];
  invoiceComplianceList.innerHTML = "";
  checks.forEach(({ ok, key, fb }) => {
    const li = document.createElement("li");
    li.className = ok ? "compliance-ok" : "compliance-missing";
    li.textContent = `${ok ? "✓" : "○"} ${hubT(key, fb)}`;
    invoiceComplianceList.appendChild(li);
  });
}

/* ── Preview: Payroll ── */

function setDeductionRows(payroll) {
  if (!pvDeductionRows) return;
  clearTableBody(pvDeductionRows);
  const agendaStyle = getSelectedPayrollLayout() === "agenda";
  const fmt = agendaStyle ? formatAmountAgendaDeduction : formatAmount;
  const rows = agendaStyle
    ? [
      ["LSt", payroll.payrollTax],
      ["SolZ", payroll.solidarity],
      ...(payroll.churchTax > 0 ? [["KiSt", payroll.churchTax]] : []),
      ["KV", payroll.health],
      ["RV", payroll.pension],
      ["PV", payroll.care],
      ["AV", payroll.unemployment],
    ]
    : [
      [`LSt (BMF PAP)`, payroll.payrollTax],
      ["SolZ", payroll.solidarity],
      ...(payroll.churchTaxRate > 0 ? [[`KiSt (${payroll.churchTaxRate} %)`, payroll.churchTax]] : []),
      [`RV (${formatNumber(payroll.pensionPercent)} %)`, payroll.pension],
      [`KV (${formatNumber(payroll.healthPercent)} %)`, payroll.health],
      [`PV (${formatNumber(payroll.carePercent)} %)`, payroll.care],
      [`AV (${formatNumber(payroll.unemploymentPercent)} %)`, payroll.unemployment],
    ];
  rows.forEach(([name, value]) => {
    const row = document.createElement("tr");
    const display = agendaStyle ? (fmt(value) || "0,00") : fmt(value);
    row.innerHTML = `<td>${name}</td><td class="ag-num">${display}</td>`;
    pvDeductionRows.appendChild(row);
  });
}

function buildTaxClassLabel(taxClass) {
  const labels = {
    I: "I – Ledig",
    II: "II – Alleinerziehend",
    III: "III – Verheiratet (höher verd.)",
    IV: "IV – Verheiratet (gleich)",
    V: "V – Verheiratet (niedriger verd.)",
    VI: "VI – Zweitjob",
  };
  return labels[taxClass] || taxClass;
}

function updatePayrollPreview() {
  const layoutId = getSelectedPayrollLayout();
  applyPayrollLayout(layoutId);
  let payroll = calculatePayrollData();
  payroll = applyDatevReferenceOverrides(payroll);
  const employeeName = employeeNameInput.value.trim() || "-";
  const employeeId = employeeIdInput.value.trim() || "-";
  const taxClass = taxClassInput.value || "I";
  const taxAllowance = numberValue(taxAllowanceMonthlyInput);
  const childAllowance = numberValue(childAllowanceFactorInput);
  const factorNote = taxClass === "IV" && factorMethodInput?.checked
    ? ` · Faktorverfahren ${numberValue(factorValueInput)}`
    : "";

  previewDocumentTitle.textContent = "Lohnabrechnung";
  previewInvoiceNumber.textContent = `Nr. ${invoiceNumberInput.value.trim() || "-"}`;
  previewInvoiceDate.textContent = formatDateForView(invoiceDateInput.value);
  previewPayrollMonth.textContent = formatMonthForView(payrollMonthInput.value);
  previewSeller.textContent = sellerInput.value.trim() || "-";
  previewCustomer.textContent = customerInput.value.trim() || "-";
  previewNote.textContent = noteInput.value.trim() || "-";
  subtotalLabel.textContent = "Brutto:";
  taxLabel.textContent = "Abzüge gesamt:";
  totalLabel.textContent = "Nettoauszahlung:";

  const monthLabel = formatMonthForView(payrollMonthInput.value);
  const isDatevLayout = layoutId === "datev";
  payrollHeadMonth.textContent = monthLabel;
  payrollHeadRun.textContent = "1 / 10000";
  payrollHeadPage.textContent = "1";
  setNodeText(document.getElementById("payrollHeadPageDatev"), "1");
  setNodeText(document.getElementById("payrollHeadDate"), getPayrollMonthEndDate(payrollMonthInput.value));
  setNodeText(document.getElementById("payrollHeadUsa"), buildDatevUsaLine());
  const payrollTitleEl = document.getElementById("payrollTitleText") || payrollSheet?.querySelector(".ag-title");
  const payrollTitleMonthEl = document.getElementById("payrollTitleMonth");
  if (payrollTitleEl) {
    if (isDatevLayout) {
      payrollTitleEl.textContent = "Abrechnung der Brutto/Netto-Bezüge";
      if (payrollTitleMonthEl) payrollTitleMonthEl.textContent = `für ${monthLabel}`;
    } else {
      payrollTitleEl.textContent = "Abrechnung der Brutto-Netto-Bezüge";
      if (payrollTitleMonthEl) payrollTitleMonthEl.textContent = "";
    }
  }
  const assessmentDays = payroll.assessmentDays ?? getPayrollAssessmentDays(payrollMonthInput?.value, payroll.days);
  setNodeText(document.getElementById("pvChildFreibetrag"), formatNumber(childAllowance));
  setNodeText(document.getElementById("pvStTage"), String(assessmentDays));
  setNodeText(document.getElementById("pvFreibetragYearly"), taxAllowance > 0 ? formatAmount(taxAllowance * 12) : "-");
  setNodeText(document.getElementById("pvUm"), "1");
  setNodeText(document.getElementById("pvMfb"), "Nein");
  setNodeText(document.getElementById("pvGz"), "0");
  setNodeText(document.getElementById("pvAnzU"), "-");
  setNodeText(document.getElementById("pvKkZPct"), payroll.healthPercent > 0 ? `${formatNumber(payroll.healthPercent)} / -` : "-");
  setNodeText(pvPersNr, employeeId);
  setNodeText(pvTaxId, employeeTaxIdInput.value.trim() || "-");
  setNodeText(pvBirthDate, formatDateForView(employeeBirthDateInput.value));
  setNodeText(pvEntryDate, formatDateForView(employeeEntryDateInput.value));
  setNodeText(pvExitDate, formatDateForView(employeeExitDateInput.value) || "-");
  setNodeText(pvInsuranceNo, employeeInsuranceNoInput?.value?.trim() || "-");
  setNodeText(pvHealthFund, (healthFundInput?.value || "AOK").trim());
  setNodeText(pvTaxAllowance, taxAllowance > 0 ? formatAmount(taxAllowance) : "0,00");
  setNodeText(document.getElementById("pvSvDays"), String(assessmentDays));
  setNodeText(document.getElementById("pvKonfession"), payroll.churchTaxRate > 0 ? "rk" : "/");
  setNodeText(document.getElementById("pvFactorDisplay"), taxClass === "IV" && factorMethodInput?.checked ? formatNumber(numberValue(factorValueInput)) : "-");
  setNodeText(document.getElementById("pvPersonGroup"), "1 0 1");
  setNodeText(document.getElementById("pvBgrs"), "1 1 1 1");
  const bgrsLabelEl = document.getElementById("pvBgrsLabel");
  if (bgrsLabelEl) bgrsLabelEl.textContent = isDatevLayout ? "PGRS/BGRS" : "B G R S";
  setNodeText(document.getElementById("pvDatevClientNo"), taxNumberInput?.value?.trim()?.slice(0, 12) || companyProfileNameInput?.value?.trim()?.slice(0, 8) || "-");
  setNodeText(document.getElementById("pvDatevConsultantNo"), vatIdInput?.value?.trim()?.replace(/\D/g, "").slice(0, 7) || "-");
  setNodeText(document.getElementById("pvDatevMonthMeta"), monthLabel);
  if (pvCompanyBlock) {
    const seller = sellerInput.value.trim();
    pvCompanyBlock.textContent = formatEmployerAgendaLine(seller);
  }
  const headerLine = payrollHeaderLineInput?.value?.trim() || "";
  if (pvLetterheadSub) {
    if (headerLine) {
      pvLetterheadSub.textContent = headerLine;
      pvLetterheadSub.classList.remove("hidden");
    } else {
      pvLetterheadSub.textContent = "";
      pvLetterheadSub.classList.add("hidden");
    }
  }
  const footerText = buildPayrollFooterText();
  if (pvFooterBlock) pvFooterBlock.textContent = footerText === "-" ? "" : footerText;
  const empMeta = document.getElementById("pvEmpMeta");
  const empName = document.getElementById("pvEmpName");
  const employeeAddress = getEmployeeAddressText();
  if (empMeta) {
    empMeta.textContent = isDatevLayout && employeeId !== "-"
      ? `*Pers.-Nr. ${employeeId}*`
      : (employeeId !== "-" ? `P.-Nr.: ${employeeId}` : "");
  }
  if (empName) empName.textContent = formatEmployeeSalutation(employeeName);
  const pvDatevSender = document.getElementById("pvDatevSender");
  if (pvDatevSender) {
    pvDatevSender.textContent = isDatevLayout ? formatEmployerDatevLine(sellerInput.value.trim()) : "";
  }
  if (pvAddress) {
    pvAddress.innerHTML = formatAddressBlockHtml(employeeAddress, "– Mitarbeiter-Adresse eintragen –");
  }
  const payrollMonth = payrollMonthInput.value || "";
  const payrollYear = payrollMonth.slice(0, 4) || String(new Date().getFullYear());
  const ytd = normalizeEmployeeName(employeeName) !== "-"
    ? getEmployeeYtdTotals(employeeName, payrollYear, payrollMonth)
    : null;

  setNodeText(document.getElementById("pvPaidUnpaidHours"), formatNumber(payroll.hours));
  setNodeText(document.getElementById("pvOvertimeHours"), "0,00");
  setNodeText(document.getElementById("pvUnpaidHours"), "0,00");
  setNodeText(document.getElementById("pvVacEntitlementAgenda"), "0,00");
  setNodeText(document.getElementById("pvDays"), formatNumber(payroll.days));
  setNodeText(document.getElementById("pvMissingDays"), "0,00");
  setNodeText(document.getElementById("pvSickDays"), "0,00");
  setNodeText(document.getElementById("pvVacPrevStat"), "0,00");
  setNodeText(document.getElementById("pvEmployerShareStat"), formatAmountAgendaEmployer(payroll.employerShare));
  setNodeText(document.getElementById("pvEmployerShareKum"), formatAmountAgendaEmployer(ytd?.employerShare ?? payroll.employerShare));
  setNodeText(document.getElementById("pvHourRateStat"), formatAmount(payroll.averageHourRate));
  setNodeText(document.getElementById("pvHourRate2"), "-");
  setNodeText(document.getElementById("pvHourRate3"), "-");
  setNodeText(document.getElementById("pvVacTakenStat"), "0,00");
  setNodeText(document.getElementById("pvTimeAcctHours"), "-");
  if (pvAverageHourRate) setNodeText(pvAverageHourRate, formatNumber(payroll.averageHourRate));
  setNodeText(document.getElementById("pvAverage2"), "-");
  setNodeText(document.getElementById("pvBasePay"), "-");
  setNodeText(document.getElementById("pvVacRemainStat"), "0,00");
  setNodeText(document.getElementById("pvTimeAcctAmount"), "-");
  const legalNote = payroll.legalRatesApplied
    ? `SV ${LEGAL_CONFIG.year}: RV ${formatNumber(payroll.pensionPercent)} · KV ${formatNumber(payroll.healthPercent)} · PV ${formatNumber(payroll.carePercent)} · AV ${formatNumber(payroll.unemploymentPercent)}`
    : "SV-Sätze gesetzt · Lohnsteuer: BMF-Modul wird geladen";
  const infoLine = `${buildTaxClassLabel(taxClass)}${factorNote} · ${legalNote} · Freibetrag ${formatAmount(taxAllowance)} · ZKF ${formatNumber(childAllowance)}`;
  pvInfoText.textContent = infoLine;
  const pvDatevHints = document.getElementById("pvDatevHints");
  if (pvDatevHints) {
    pvDatevHints.textContent = isDatevLayout
      ? buildDatevHintsText(payroll)
      : infoLine;
    pvDatevHints.style.whiteSpace = isDatevLayout ? "pre-wrap" : "";
  }
  if (isDatevLayout) syncDatevMasterFields(payroll, taxClass, taxAllowance, childAllowance, assessmentDays);
  setNodeText(document.getElementById("pvVacPrev"), "0,00");
  setNodeText(document.getElementById("pvVacEntitlement"), "0,00");
  setNodeText(document.getElementById("pvVacTaken"), "0,00");
  setNodeText(document.getElementById("pvVacRemain"), "0,00");
  const taxDeductionTotal = payroll.payrollTax + payroll.solidarity + payroll.churchTax;
  setNodeText(document.getElementById("pvDatevGrossTotal"), formatAmount(payroll.gross));
  setNodeText(document.getElementById("pvDatevTaxTotal"), formatAmount(taxDeductionTotal));
  setNodeText(document.getElementById("pvDatevSvTotal"), formatAmount(payroll.svTotal));
  setNodeText(document.getElementById("pvDatevNetTotal"), formatAmount(payroll.net));
  setNodeText(document.getElementById("pvDatevPayoutRail"), formatAmount(payroll.net));
  setNodeText(document.getElementById("pvDatevEmployerShare"), formatAmount(payroll.employerShare));
  setNodeText(document.getElementById("pvDatevBank"), bankNameInput.value.trim() || "-");
  const ibanRaw = bankIbanInput.value.trim();
  const ibanDisplay = useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? DATEV_REFERENCE_DISPLAY.bankIbanDisplay
    : ibanRaw;
  const ibanMasked = window.PayrollCore?.maskIbanForPayslip
    ? (window.PayrollCore.maskIbanForPayslip(ibanDisplay) || "")
    : ibanDisplay;
  setNodeText(document.getElementById("pvDatevKonto"), ibanMasked || "-");
  const extraCosts = useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? DATEV_REFERENCE_DISPLAY.extraCosts
    : Math.max(0, (payroll.wageItems || []).filter((w) => w.taxFlag === "P").reduce((s, w) => s + (Number(w.amount) || 0), 0));
  setNodeText(document.getElementById("pvDatevExtraCosts"), formatAmount(extraCosts));
  const totalCosts = useDatevReferenceDisplay && employeeIdInput.value.trim() === "02006"
    ? DATEV_REFERENCE_DISPLAY.totalCosts
    : payroll.gross + payroll.employerShare + extraCosts;
  setNodeText(document.getElementById("pvDatevTotalCosts"), formatAmount(totalCosts));
  if (!isDatevLayout) renderMonthCalendar(payrollMonthInput.value);
  renderWagePreviewRows(payroll.wageItems || [], payroll.gross);
  syncPayrollSheetEditorsFromForm(payroll);
  if (pvTotalGross) pvTotalGross.textContent = formatAmount(payroll.gross);
  if (pvTaxGross) pvTaxGross.textContent = formatAmount(payroll.taxGross ?? payroll.gross);
  if (pvTaxRow) pvTaxRow.textContent = formatAmount(payroll.payrollTax);
  if (pvChurchRow) pvChurchRow.textContent = formatAmount(payroll.churchTax);
  if (pvSoliRow) pvSoliRow.textContent = formatAmount(payroll.solidarity);
  if (pvNet) pvNet.textContent = formatAmount(payroll.net);
  if (pvNetBreakdown) {
    pvNetBreakdown.textContent = (payroll.wageItems || [])
      .map((item) => `${item.code} ${item.label}`)
      .join(" · ") || "2000 Gehalt";
  }
  if (pvBank) pvBank.textContent = bankNameInput.value.trim() || "-";
  if (pvBic) pvBic.textContent = bankBicInput.value.trim() || "-";
  if (pvIban) {
    const raw = bankIbanInput.value.trim();
    pvIban.textContent = raw
      ? (window.PayrollCore?.maskIbanForPayslip?.(raw) || raw)
      : "-";
  }
  if (pvPayout) pvPayout.textContent = formatAmount(payroll.net);
  if (pvTaxDeductionBox) pvTaxDeductionBox.textContent = formatAmount(payroll.payrollTax + payroll.solidarity + payroll.churchTax);
  if (pvSvDeductionBox) pvSvDeductionBox.textContent = formatAmount(payroll.svTotal);
  const timestamp = document.getElementById("pvAgendaTimestamp");
  if (timestamp) {
    timestamp.textContent = buildAgendaTimestampLine();
  }
  const pvLegendCalc = document.getElementById("pvLegendCalc");
  if (pvLegendCalc) {
    pvLegendCalc.textContent = payroll.legalRatesApplied
      ? `* Berechnung Lohnsteuer: BMF-Programmablaufplan ${LEGAL_CONFIG.year} · SV: Beitragsverordnung / SGB IV ${LEGAL_CONFIG.year}`
      : `* SV-Sätze ${LEGAL_CONFIG.year} · Lohnsteuer: BMF-Modul nicht geladen – Seite neu laden`;
  }
  const pvFooterLegal = document.getElementById("pvFooterLegal");
  if (pvFooterLegal) {
    pvFooterLegal.textContent = isDatevLayout
      ? "– Dies ist eine Entgeltbescheinigung nach § 108 Abs. 3 Satz 1 der Gewerbeordnung –"
      : `Entgeltabrechnung gem. § 108 Abs. 3 GewO · SV nach SGB IV / Beitragsverordnung ${LEGAL_CONFIG.year} · LSt nach BMF-PAP ${LEGAL_CONFIG.year}`;
  }
  if (isDatevLayout) {
    setDatevTaxRows(payroll);
    setDatevVerdienstSplit(payroll);
    updateDatevRefOverlay(payroll);
  } else {
    setAgendaTaxRows(payroll);
    setVerdienstRows(payroll, ytd);
  }
  setDeductionRows(payroll);
  syncVerdienstSheetMeta(payroll, employeeName, monthLabel);

  previewSubtotal.textContent = eur.format(payroll.gross);
  previewTax.textContent = eur.format(payroll.employeeDeductions);
  previewTotal.textContent = eur.format(payroll.net);
  if (isDatevLayout) updateDatevRefOverlay(payroll);
  applyPayrollBackgroundUI();
  updateDashboard();
}

function updateAnnualPreview() {
  const year = Number(taxYearInput?.value) || Number((payrollMonthInput.value || "").slice(0, 4)) || new Date().getFullYear();
  if (taxYearInput) taxYearInput.value = String(year);

  const employeeName = normalizeEmployeeName(employeeNameInput.value || employeeSearchInput?.value);
  const data = buildCurrentAnnualCertificateData();

  previewDocumentTitle.textContent = "Lohnsteuerbescheinigung";
  previewInvoiceNumber.textContent = `LStB ${year} · ${employeeIdInput.value.trim() || "-"}`;
  previewInvoiceDate.textContent = formatDateForView(invoiceDateInput.value);
  previewPayrollMonth.textContent = String(year);
  subtotalLabel.textContent = "Brutto Jahr:";
  taxLabel.textContent = "Lohnsteuer Jahr:";
  totalLabel.textContent = "Netto Jahr:";
  previewSubtotal.textContent = eur.format(data?.totals?.gross || 0);
  previewTax.textContent = eur.format(data?.totals?.payrollTax || 0);
  previewTotal.textContent = eur.format(data?.totals?.net || 0);

  setNodeText(document.getElementById("lstbYear"), String(year));
  setNodeText(document.getElementById("lstbYearTitle"), String(year));
  const kmId = window.ElsterExport?.generateKmId(data) || `FD${year}${String(data?.personnelNumber || data?.employeeTaxId || "0000").replace(/\W/g, "").slice(0, 8)}`;
  setNodeText(document.getElementById("lstbKmId"), kmId);
  setNodeText(document.getElementById("lstbFinanzamt"), taxNumberInput?.value?.trim() || "— bitte Steuernummer der Firma eintragen —");
  setNodeText(
    document.getElementById("lstbFinanzamtHint"),
    taxNumberInput?.value?.trim()
      ? "Steuernummer der Firma (Betriebsstättenfinanzamt) · nicht Wohnsitzfinanzamt des Mitarbeiters"
      : "Firma → Steuer-Nr. eintragen (z. B. 143/123/45678)"
  );
  const periodDates = data?.certPeriod || "-";
  const periodVonBis = data?.certPeriodLabel
    || window.AnnualCertificate?.formatCertPeriodVonBis?.(data?.periodStart, data?.periodEnd)
    || "";
  setNodeText(document.getElementById("lstbPersNr"), data?.personnelNumber || data?.employeeId || "—");
  const taxIdDisplay = window.AnnualCertificate?.displayEmployeeTaxId
    ? window.AnnualCertificate.displayEmployeeTaxId(data?.employeeTaxId)
    : (String(data?.employeeTaxId || "").replace(/\D/g, "").length === 11 ? String(data.employeeTaxId).replace(/\D/g, "") : "—");
  setNodeText(document.getElementById("lstbTaxId"), taxIdDisplay);
  const headerEmp = window.AnnualCertificate?.displayEmployeeName
    ? window.AnnualCertificate.displayEmployeeName(employeeName)
    : (employeeName && employeeName !== "-" ? employeeName : "—");
  setNodeText(document.getElementById("lstbHeaderEmployee"), headerEmp);
  setNodeText(document.getElementById("lstbInsuranceNo"), data?.employeeInsuranceNo || "-");
  setNodeText(document.getElementById("lstbBirthDate"), formatDateForView(data?.employeeBirthDate));
  setNodeText(document.getElementById("lstbTaxClass"), taxClassToDisplay(data?.taxClass || "I"));
  setNodeText(document.getElementById("lstbChildAllowance"), formatNumber(data?.childAllowanceFactor || 0));
  setNodeText(document.getElementById("lstbChurch"), data?.churchTaxRate > 0 ? `${data.churchTaxRate} %` : "keine");
  setNodeText(document.getElementById("lstbPeriod"), periodVonBis ? `${periodVonBis} (${periodDates})` : periodDates);

  const empEl = document.getElementById("lstbEmployee");
  const emplAddr = data?.employeeAddress || employeeName;
  if (empEl) empEl.textContent = employeeName !== "-" ? `${employeeName}\n${emplAddr}`.trim() : emplAddr;

  const emplrEl = document.getElementById("lstbEmployer");
  if (emplrEl) emplrEl.textContent = data?.seller || sellerInput.value.trim() || "-";

  const monthsSummary = document.getElementById("lstbMonthsSummary");
  if (monthsSummary) {
    monthsSummary.textContent = data?.hasData
      ? `Abgerechnete Monate ${year}: ${data.totals.months.join(", ")} (${data.totals.monthsCount} Monat(e))`
      : `Keine gespeicherten Monate für ${year}.`;
  }

  const warning = document.getElementById("lstbNoDataWarning");
  if (warning) warning.classList.toggle("hidden", Boolean(data?.hasData));

  const tbody = document.getElementById("lstbRowsBody");
  if (tbody) {
    tbody.innerHTML = "";
    (data?.rows || []).forEach((row) => {
      const tr = document.createElement("tr");
      const isReserved = String(row.key || "").startsWith("empty");
      if (isReserved) tr.className = "lstb-reserved lstb-empty";
      if (row.money) {
        const parts = splitMoneyParts(row.value);
        tr.innerHTML = `<td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${escapeHtml(row.label)}</td><td class="lstb-euro">${parts.euro}</td><td class="lstb-cent">${parts.cent}</td>`;
      } else if (row.key === "certPeriod") {
        tr.className = "lstb-text";
        tr.innerHTML = `<td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${escapeHtml(row.label)}</td><td class="lstb-euro" colspan="2">${escapeHtml(String(row.value || "-"))}</td>`;
      } else {
        tr.innerHTML = `<td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${escapeHtml(row.label)}</td><td class="lstb-euro">${escapeHtml(String(row.value ?? ""))}</td><td class="lstb-cent"></td>`;
      }
      tbody.appendChild(tr);
    });
  }

  const footerNote = document.getElementById("lstbFooterNote");
  if (footerNote) {
    footerNote.textContent = `Bescheinigung nach § 41b EStG für den Arbeitnehmer · nicht LStA der Firma (§ 41a EStG) · ${year} · ${data?.totals?.monthsCount || 0} Monat(e) · LSt BMF-PAP ${LEGAL_CONFIG.year} · SV SGB IV`;
  }
}

function isCompanyTabActive() {
  return document.querySelector(".form-tab.active")?.dataset.tab === "company";
}

function uiText(key, fallback) {
  const val = window.WorkPassI18n?.t?.(key);
  return val && val !== key ? val : fallback;
}

function syncPreviewChrome() {
  const preview = document.getElementById("invoicePreview");
  if (!preview) return;
  if (isCompanyTabActive()) {
    preview.dataset.previewLabel = uiText(
      "preview.companyLetterhead",
      "Vorschau · Firmenbriefkopf (nicht Mitarbeiter-LStB)"
    );
    return;
  }
  if (getCurrentMode() === "payroll-annual") {
    preview.dataset.previewLabel = uiText(
      "preview.lstbEmployee",
      "Vorschau · LStB für den Arbeitnehmer (nicht Firmen-LStA)"
    );
    return;
  }
  preview.dataset.previewLabel = uiText("preview.printBw", "Vorschau · Drucklayout Schwarz/Weiß");
}

function updatePreview() {
  toggleModeUI();
  updateDocumentLogos();
  const companyTab = isCompanyTabActive();
  document.body.classList.toggle("company-tab", companyTab);
  document.body.classList.toggle("letterhead-preview", companyTab);
  if (companyTab) {
    annualTaxSheet?.classList.add("hidden");
    invoiceOnlyElements.forEach((el) => el.classList.remove("hidden"));
    payrollOnlyElements.forEach((el) => el.classList.add("hidden"));
    annualOnlyElements.forEach((el) => el.classList.add("hidden"));
    updateInvoicePreview();
    updateDashboard();
    syncPreviewChrome();
    return;
  }
  if (getCurrentMode() === "payroll-annual") {
    updateAnnualPreview();
    updateDashboard();
    syncPreviewChrome();
    return;
  }
  if (getCurrentMode() === "payroll") {
    updatePayrollPreview();
    syncPreviewChrome();
    return;
  }
  updateInvoicePreview();
  updateDashboard();
  syncPreviewChrome();
}

function buildPdfFilename() {
  const mode = getCurrentMode();
  const num = (invoiceNumberInput.value.trim() || "Dokument").replace(/[^\w\-]+/g, "_");
  const date = invoiceDateInput.value || new Date().toISOString().slice(0, 10);
  if (mode === "payroll-annual") {
    const year = taxYearInput?.value || payrollMonthInput.value?.slice(0, 4) || "Jahr";
    const name = normalizeEmployeeName(employeeNameInput.value || "Mitarbeiter").replace(/\s+/g, "_");
    return `Lohnsteuerbescheinigung_${name}_${year}_${num}.pdf`;
  }
  if (mode === "payroll") {
    const month = (payrollMonthInput.value || "Monat").replace("-", "");
    const name = normalizeEmployeeName(employeeNameInput.value || "Mitarbeiter").replace(/\s+/g, "_");
    return `Lohnabrechnung_${name}_${month}_${num}.pdf`;
  }
  return `Rechnung_${num}_${date}.pdf`;
}

function unhideExportClone(root) {
  root.querySelectorAll(".hidden").forEach((el) => {
    el.classList.remove("hidden");
    el.style.removeProperty("display");
  });
  root.querySelectorAll("*").forEach((el) => {
    el.style.visibility = "visible";
  });
}

const PDF_A4_WIDTH_PX = 794;
const PDF_A4_HEIGHT_PX = 1123;

function fitPayrollExportNodeForPdf(node) {
  if (!node) return 0;
  if (node.classList.contains("datev-sheet-a4")) {
    return PDF_A4_HEIGHT_PX;
  }
  node.style.minHeight = "auto";
  node.style.height = "auto";
  const doc = node.querySelector(".payroll-document");
  if (doc) {
    doc.style.minHeight = "0";
    doc.style.height = "auto";
  }
  node.querySelectorAll(".ag-left, .ag-emp-block, .ag-info-box, .ag-employer, .ag-addr-section").forEach((el) => {
    el.style.minHeight = "0";
  });
  return Math.max(node.scrollHeight, doc?.scrollHeight || 0, 1);
}

function stylePdfExportRoot(node, isPayroll) {
  node.style.position = "fixed";
  node.style.left = "0";
  node.style.top = "0";
  node.style.width = isPayroll ? `${PDF_A4_WIDTH_PX}px` : "210mm";
  node.style.minHeight = "auto";
  node.style.height = "auto";
  node.style.maxWidth = isPayroll ? `${PDF_A4_WIDTH_PX}px` : "none";
  node.style.margin = "0";
  node.style.padding = "0";
  node.style.background = "#ffffff";
  node.style.color = "#000000";
  node.style.zIndex = "2147483647";
  node.style.opacity = "1";
  node.style.pointerEvents = "none";
  node.style.display = "block";
  node.style.visibility = "visible";
  node.style.boxShadow = "none";
  node.style.overflow = "visible";
  node.style.zoom = "1";
}

function prepareExportNode() {
  const mode = getCurrentMode();
  const isPayroll = mode === "payroll";
  const isAnnual = mode === "payroll-annual";

  if (isAnnual) {
    if (!annualTaxSheet) throw new Error("Lohnsteuerbescheinigung nicht gefunden.");
    const clone = annualTaxSheet.cloneNode(true);
    clone.id = "pdfExportClone";
    clone.classList.remove("hidden");
    clone.classList.add("pdf-export-clone", "pdf-export-annual");
    clone.removeAttribute("aria-hidden");
    unhideExportClone(clone);
    stylePdfExportRoot(clone, true);
    document.body.appendChild(clone);
    return clone;
  }

  if (isPayroll) {
    const sheet = window.DatevSheet?.getSheetElement();
    if (!sheet) throw new Error("Lohnabrechnung nicht gefunden.");
    const clone = sheet.cloneNode(true);
    clone.id = "pdfExportClone";
    clone.classList.add("pdf-export-clone", "pdf-export-payroll");
    const bg = clone.querySelector(".datev-sheet-bg");
    if (bg && window.DatevSheet?.BG_PATH) {
      bg.src = new URL(window.DatevSheet.BG_PATH, window.location.href).href;
    }
    unhideExportClone(clone);
    stylePdfExportRoot(clone, true);
    document.body.appendChild(clone);
    return clone;
  }

  const wrapper = document.createElement("div");
  wrapper.id = "pdfExportClone";
  wrapper.classList.add("pdf-export-clone");
  const clone = invoicePreviewEl.cloneNode(true);
  unhideExportClone(clone);
  clone.querySelectorAll(".hidden").forEach((el) => el.remove());
  clone.querySelectorAll(".sig-ui-chrome").forEach((el) => {
    if (el.id === "signatureSealBadge" || el.classList.contains("wp-sig-seal")) return;
    el.remove();
  });
  const tools = clone.querySelector(".preview-tools");
  if (tools) tools.remove();
  clone.querySelectorAll(".mode-payroll-only").forEach((el) => el.remove());
  const sig = clone.querySelector("#signaturePreviewBox, .wp-sig-layer");
  if (sig) {
    sig.classList.remove("is-selected", "is-dragging", "is-empty");
    sig.removeAttribute("tabindex");
    sig.hidden = signatureMode === "none";
  }
  const seal = clone.querySelector("#signatureSealBadge, .wp-sig-seal");
  if (seal && signatureAttestation) {
    seal.hidden = false;
    seal.classList.remove("sig-ui-chrome");
  } else if (seal) {
    seal.remove();
  }
  wrapper.appendChild(clone);
  stylePdfExportRoot(wrapper, false);
  document.body.appendChild(wrapper);
  return wrapper;
}

function isCanvasMostlyBlank(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const sampleWidth = Math.min(canvas.width, 240);
  const sampleHeight = Math.min(canvas.height, 240);
  const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) darkPixels += 1;
  }
  return darkPixels < 12;
}

function getHtml2CanvasFn() {
  return window.html2canvas || null;
}

function getJsPdfConstructor() {
  return window.jspdf?.jsPDF || window.jsPDF || null;
}

function trimCanvasToContent(canvas, paddingPx = 12) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const threshold = 248;
  let bottom = 0;

  rowScan: for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i] < threshold || data[i + 1] < threshold || data[i + 2] < threshold) {
        bottom = y;
        break rowScan;
      }
    }
  }

  const trimmedHeight = Math.min(height, bottom + 1 + paddingPx);
  if (trimmedHeight >= height - 4) return canvas;

  const trimmed = document.createElement("canvas");
  trimmed.width = width;
  trimmed.height = trimmedHeight;
  trimmed.getContext("2d").drawImage(canvas, 0, 0, width, trimmedHeight, 0, 0, width, trimmedHeight);
  return trimmed;
}

function applyA4ExportFrame(node) {
  if (!node) return;
  if (node.classList.contains("datev-sheet-a4")) {
    node.style.width = `${PDF_A4_WIDTH_PX}px`;
    node.style.height = `${PDF_A4_HEIGHT_PX}px`;
    node.style.minHeight = `${PDF_A4_HEIGHT_PX}px`;
    node.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
    node.style.overflow = "hidden";
    node.style.position = "relative";
    node.style.boxShadow = "none";
    const bg = node.querySelector(".datev-sheet-bg");
    if (bg) {
      bg.style.width = `${PDF_A4_WIDTH_PX}px`;
      bg.style.height = `${PDF_A4_HEIGHT_PX}px`;
    }
    return;
  }
  fitPayrollExportNodeForPdf(node);
  node.style.width = `${PDF_A4_WIDTH_PX}px`;
  node.style.minHeight = `${PDF_A4_HEIGHT_PX}px`;
  node.style.height = `${PDF_A4_HEIGHT_PX}px`;
  node.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
  node.style.overflow = "hidden";

  const doc = node.querySelector(".payroll-document");
  if (doc) {
    doc.style.minHeight = `${PDF_A4_HEIGHT_PX}px`;
    doc.style.height = `${PDF_A4_HEIGHT_PX}px`;
    doc.style.display = "flex";
    doc.style.flexDirection = "column";
    doc.style.boxSizing = "border-box";
    doc.style.overflow = "hidden";
  }

  const tpl = node.querySelector(".tpl-classic");
  if (tpl) {
    tpl.style.flex = "1";
    tpl.style.display = "flex";
    tpl.style.flexDirection = "column";
    tpl.style.height = "100%";
    tpl.style.minHeight = "0";
  }

  const sheetBody = node.querySelector(".ag-sheet-body");
  if (sheetBody) {
    sheetBody.style.flex = "1";
    sheetBody.style.display = "flex";
    sheetBody.style.flexDirection = "column";
    sheetBody.style.minHeight = "0";
  }

  const midGrid = node.querySelector(".ag-mid-grid");
  if (midGrid) midGrid.style.flex = "1";

  const bottom = node.querySelector(".ag-bottom");
  if (bottom) {
    bottom.style.marginTop = "auto";
    bottom.style.flexShrink = "0";
  }

  const footer = node.querySelector(".ag-footer-anchor");
  if (footer) {
    footer.style.marginTop = "0";
    footer.style.flexShrink = "0";
  }
}

async function renderPayrollCanvas(exportNode) {
  const html2canvasFn = getHtml2CanvasFn();
  if (!html2canvasFn) return null;

  applyA4ExportFrame(exportNode);
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const canvas = await html2canvasFn(exportNode, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: PDF_A4_WIDTH_PX,
    height: PDF_A4_HEIGHT_PX,
    windowWidth: PDF_A4_WIDTH_PX,
    windowHeight: PDF_A4_HEIGHT_PX,
    onclone: (clonedDoc) => {
      const clonedRoot = clonedDoc.getElementById("pdfExportClone");
      if (!clonedRoot) return;
      clonedRoot.classList.remove("hidden");
      clonedRoot.style.display = "block";
      clonedRoot.style.visibility = "visible";
      clonedRoot.style.opacity = "1";
      clonedRoot.style.position = "static";
      clonedRoot.style.background = "#ffffff";
      clonedRoot.style.color = "#000000";
      clonedRoot.style.zoom = "1";
      applyA4ExportFrame(clonedRoot);
      clonedRoot.querySelectorAll(".hidden").forEach((el) => {
        el.classList.remove("hidden");
        el.style.removeProperty("display");
      });
      clonedRoot.querySelectorAll("*").forEach((el) => {
        el.style.visibility = "visible";
      });
    },
  });

  return canvas;
}

function saveCanvasAsPdf(canvas, filename, mode = "a4") {
  const JsPDF = getJsPdfConstructor();
  if (!JsPDF) throw new Error("jsPDF nicht verfügbar.");

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  if (mode === "a4-payroll") {
    const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const drawHeight = Math.min(imgHeight, pageHeight);
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, drawHeight);
    pdf.save(filename);
    return;
  }

  const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

function prepareLivePayrollCaptureNode() {
  const sheet = window.DatevSheet?.getSheetElement();
  if (!sheet) return null;
  document.getElementById("datevSheetHost")?.classList.remove("hidden");
  sheet.id = "pdfExportClone";
  sheet.classList.add("pdf-export-clone", "pdf-export-payroll");
  const bg = sheet.querySelector(".datev-sheet-bg");
  if (bg && window.DatevSheet?.BG_PATH) {
    bg.src = new URL(window.DatevSheet.BG_PATH, window.location.href).href;
  }
  stylePdfExportRoot(sheet, true);
  unhideExportClone(sheet);
  return sheet;
}

function restoreLivePayrollCaptureNode(wasLiveCapture) {
  if (!wasLiveCapture) return;
  const sheet = document.getElementById("pdfExportClone") || document.getElementById("datevSheetA4");
  if (!sheet) return;
  sheet.id = "datevSheetA4";
  sheet.classList.remove("pdf-export-clone", "pdf-export-payroll");
  sheet.style.cssText = "";
}

function prepareLiveAnnualCaptureNode() {
  if (!annualTaxSheet) return null;
  annualTaxSheet.classList.remove("hidden");
  annualTaxSheet.id = "pdfExportClone";
  annualTaxSheet.classList.add("pdf-export-clone", "pdf-export-annual");
  stylePdfExportRoot(annualTaxSheet, true);
  unhideExportClone(annualTaxSheet);
  return annualTaxSheet;
}

function restoreLiveAnnualCaptureNode(wasLiveCapture) {
  if (!wasLiveCapture || !annualTaxSheet) return;
  annualTaxSheet.id = "annualTaxSheet";
  annualTaxSheet.classList.remove("pdf-export-clone", "pdf-export-annual");
  annualTaxSheet.style.cssText = "";
  if (getCurrentMode() === "payroll-annual") {
    annualTaxSheet.classList.remove("hidden");
  } else {
    annualTaxSheet.classList.add("hidden");
  }
}

async function exportPayrollPdfWithCanvas(exportNode, filename) {
  let canvas = await renderPayrollCanvas(exportNode);
  let usedLiveNode = false;

  if (!canvas || isCanvasMostlyBlank(canvas)) {
    exportNode.remove();
    const isAnnual = getCurrentMode() === "payroll-annual";
    const liveNode = isAnnual ? prepareLiveAnnualCaptureNode() : prepareLivePayrollCaptureNode();
    if (!liveNode) return false;
    usedLiveNode = true;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    canvas = await renderPayrollCanvas(liveNode);
    if (!canvas || isCanvasMostlyBlank(canvas)) {
      if (isAnnual) restoreLiveAnnualCaptureNode(true);
      else restoreLivePayrollCaptureNode(true);
      return false;
    }
  }

  saveCanvasAsPdf(canvas, filename, "a4-payroll");
  if (usedLiveNode) {
    if (getCurrentMode() === "payroll-annual") restoreLiveAnnualCaptureNode(true);
    else restoreLivePayrollCaptureNode(true);
  }
  return true;
}

async function exportPdf() {
  if (typeof html2pdf === "undefined") {
    window.alert("PDF-Bibliothek nicht geladen. Bitte Internetverbindung prüfen und Seite neu laden.");
    return;
  }

  const valid = isPayrollFamilyMode() ? validatePayrollDocumentBeforePrint() : validateInvoiceBeforePrint();
  if (!valid) return;
  if (getCurrentMode() === "payroll") {
    applyReferenzPngDirect();
    saveCurrentEmployeeMonth(false);
  }
  updatePreview();
  if (getCurrentMode() === "invoice") {
    await refreshActiveSignature({ save: false });
    if (!signatureAttestation && signatureMode !== "none" && signatureDataUrl) {
      await sealActiveSignature({ save: true });
    } else {
      await refreshSignatureSealUi();
    }
  }

  let exportNode = prepareExportNode();
  const mode = getCurrentMode();
  const isPayrollCanvas = mode === "payroll" || mode === "payroll-annual";
  const previousText = pdfExportBtn?.textContent;
  if (pdfExportBtn) {
    pdfExportBtn.disabled = true;
    pdfExportBtn.textContent = "PDF wird erstellt…";
  }

  try {
    document.body.classList.add("pdf-export-mode");
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const filename = buildPdfFilename();

    if (isPayrollCanvas) {
      const savedViaCanvas = await exportPayrollPdfWithCanvas(exportNode, filename);
      if (savedViaCanvas) {
        if (exportNode && document.body.contains(exportNode)) exportNode.remove();
        exportNode = null;
      }
      if (!savedViaCanvas) {
        if (!exportNode || !document.body.contains(exportNode)) {
          exportNode = prepareExportNode();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        const opt = {
          margin: [0, 0, 0, 0],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: PDF_A4_WIDTH_PX,
            windowWidth: PDF_A4_WIDTH_PX,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        };
        await html2pdf().set(opt).from(exportNode).save();
      }
    } else {
      const opt = {
        margin: [12, 12, 12, 12],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      await html2pdf().set(opt).from(exportNode).save();
    }
  } catch (error) {
    window.alert("PDF-Export fehlgeschlagen. Bitte erneut versuchen oder „Drucken“ → „Als PDF speichern“ nutzen.");
    console.error(error);
  } finally {
    document.body.classList.remove("pdf-export-mode");
    restoreLivePayrollCaptureNode(payrollSheet?.id === "pdfExportClone");
    restoreLiveAnnualCaptureNode(annualTaxSheet?.id === "pdfExportClone");
    if (exportNode && document.body.contains(exportNode)) exportNode.remove();
    if (pdfExportBtn) {
      pdfExportBtn.disabled = false;
      pdfExportBtn.textContent = previousText || "PDF herunterladen";
    }
  }
}

/* ── Defaults & Draft ── */

function setDefaultDates() {
  const now = new Date();
  const due = new Date(now);
  due.setDate(now.getDate() + LEGAL_CONFIG.invoice.defaultPaymentDays);
  const today = now.toISOString().slice(0, 10);
  invoiceDateInput.value = today;
  if (serviceDateInput && !serviceDateInput.value) serviceDateInput.value = today;
  dueDateInput.value = due.toISOString().slice(0, 10);
  if (!payrollMonthInput.value) payrollMonthInput.value = now.toISOString().slice(0, 7);
  if (taxYearInput && !taxYearInput.value) taxYearInput.value = String(now.getFullYear());
  if (employeeReferenceMonthInput && !employeeReferenceMonthInput.value) {
    employeeReferenceMonthInput.value = payrollMonthInput.value;
  }
}

function defaultVatRateFromEngine(date) {
  try {
    const r = window.TaxRulesEngine?.evaluate?.({
      kind: "vat",
      country: "DE",
      asOf: date || invoiceDateInput?.value || "",
    });
    if (r?.ok && r.result?.vatRate != null) return String(r.result.vatRate);
  } catch { /* ignore */ }
  return "19";
}

function setDefaultInvoiceNumber() {
  if (invoiceNumberInput.value.trim()) return;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const isPayroll = getCurrentMode() === "payroll";
  const key = `${isPayroll ? "payroll" : "invoice"}Counter-${y}${m}`;
  const prefix = isPayroll ? "LOHN" : "RE";
  const current = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(current));
  invoiceNumberInput.value = `${prefix}-${y}${m}-${String(current).padStart(4, "0")}`;
}

function setDraftSaveState(saved) {
  if (!draftSaveState) return;
  const tt = (k, fb) => (window.WorkPassI18n?.t?.(k) && window.WorkPassI18n.t(k) !== k)
    ? window.WorkPassI18n.t(k)
    : fb;
  draftSaveState.textContent = saved ? tt("status.saved", "Gespeichert") : tt("status.unsaved", "Nicht gespeichert");
  draftSaveState.classList.toggle("saved", saved);
  draftSaveState.classList.toggle("unsaved", !saved);
  if (lexStatusMessage) {
    lexStatusMessage.textContent = saved ? tt("status.draftSaved", "Entwurf gespeichert") : tt("status.readyShort", "Bereit");
  }
}

function applyPreviewZoom() {
  if (!previewZoomInput || !invoicePreviewEl) return;
  invoicePreviewEl.style.zoom = `${Number(previewZoomInput.value) || 100}%`;
}

function collectDraftData() {
  return {
    documentType: getCurrentMode(),
    taxYear: taxYearInput?.value || "",
    activeCompanyProfileId,
    invoiceNumber: invoiceNumberInput.value,
    invoiceDate: invoiceDateInput.value,
    serviceDate: serviceDateInput?.value || "",
    dueDate: dueDateInput.value,
    taxRate: taxRateInput.value,
    kleinunternehmer: kleinunternehmerInput?.checked || false,
    reverseCharge: reverseChargeInput?.checked || false,
    seller: sellerInput.value,
    customer: getEmployeeAddressText(),
    note: noteInput.value,
    signatureName: signatureNameInput.value,
    signatureDataUrl,
    signatureMode,
    signatureStyleId,
    signatureColorId,
    signatureLayout: getSignatureEngine()?.normalizeLayout?.(signatureLayout) || signatureLayout,
    signatureAttestation,
    signatureAudit,
    taxNumber: taxNumberInput?.value || "",
    vatId: vatIdInput?.value || "",
    commercialRegister: commercialRegisterInput?.value || "",
    managingDirector: managingDirectorInput?.value || "",
    companyBankName: companyBankNameInput?.value || "",
    companyIban: companyIbanInput?.value || "",
    companyBic: companyBicInput?.value || "",
    payrollLayout: getSelectedPayrollLayout(),
    logoDataUrl: activeLogoDataUrl,
    meta: {
      referenceDemo: useDatevReferenceDisplay ? "datev" : null,
      importedTotals: importedCsvTotals,
    },
    items: getRowsData(),
    payroll: {
      employeeName: employeeNameInput.value,
      employeeAddress: getEmployeeAddressText(),
      employeeId: employeeIdInput.value,
      employeeTaxId: employeeTaxIdInput.value,
      employeeInsuranceNo: employeeInsuranceNoInput?.value || "",
      employeeBirthDate: employeeBirthDateInput.value,
      employeeEntryDate: employeeEntryDateInput.value,
      employeeExitDate: employeeExitDateInput.value,
      payrollMonth: payrollMonthInput.value,
      employeeReferenceMonth: employeeReferenceMonthInput?.value || "",
      taxClass: taxClassInput.value,
      grossSalary: grossSalaryInput.value,
      taxAllowanceMonthly: taxAllowanceMonthlyInput?.value || "0",
      childAllowanceFactor: childAllowanceFactorInput?.value || "0",
      factorMethod: factorMethodInput?.checked || false,
      factorValue: factorValueInput?.value || "1",
      churchTaxRate: churchTaxRateInput?.value || "0",
      childlessPvSurcharge: childlessPvSurchargeInput?.checked || false,
      healthAdditionalPercent: healthAdditionalPercentInput?.value || "2.9",
      pensionPercent: pensionPercentInput.value,
      healthPercent: healthPercentInput.value,
      healthFund: healthFundInput?.value || "AOK",
      carePercent: carePercentInput.value,
      unemploymentPercent: unemploymentPercentInput.value,
      workHours: workHoursInput.value,
      workDays: workDaysInput.value,
      bankName: bankNameInput.value,
      bankBic: bankBicInput.value,
      bankIban: bankIbanInput.value,
      wageItems: getWageRowsData(),
    },
  };
}

function archiveCurrentInvoiceIfNeeded() {
  if (getCurrentMode() !== "invoice") return;
  const draft = collectDraftData();
  const number = String(draft.invoiceNumber || invoiceNumberInput?.value || "").trim();
  if (!number) return;
  const buyer = String(draft.customer || document.getElementById("customer")?.value || "").split("\n")[0];
  const totalEl = document.getElementById("previewTotal");
  window.WorkPassHub?.upsertInvoice?.({
    number,
    buyer,
    total: totalEl?.textContent?.trim() || "",
    date: draft.invoiceDate || "",
    draft,
  });
}

function saveDraft(showMessage = true) {
  if (appBootstrapping && !showMessage) {
    setDraftSaveState(false);
    return;
  }
  const profiles = readCompanyProfiles();
  profiles[activeCompanyProfileId] = collectCompanyProfileData();
  writeCompanyProfiles(profiles);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectDraftData()));
  archiveCurrentInvoiceIfNeeded();
  setDraftSaveState(true);
  if (showMessage) window.alert("Entwurf wurde gespeichert.");
}

function isDraftMeaningless(draft) {
  if (!draft || typeof draft !== "object") return true;
  const hasInvoiceMeta = Boolean(String(draft.invoiceNumber || "").trim() || String(draft.seller || "").trim());
  const items = Array.isArray(draft.items) ? draft.items : [];
  const hasItem = items.some((i) => String(i.description || "").trim() || Number(i.price) > 0);
  const hasPayroll = Boolean(draft.payroll?.employeeName || draft.payroll?.grossSalary > 0);
  return !hasInvoiceMeta && !hasItem && !hasPayroll;
}

function seedFreshInvoiceWorkspace() {
  noteInput.value = LEGAL_CONFIG?.invoice?.defaultNote || noteInput.value || "";
  documentTypeInput.value = "invoice";
  if (sellerInput && !sellerInput.value.trim()) {
    sellerInput.value = "Muster GmbH\nMusterstraße 1\n12345 Musterstadt";
  }
  if (customerInput && !customerInput.value.trim()) {
    customerInput.value = "Kunde GmbH\nBeispielweg 7\n54321 Ort";
  }
  itemsBody.innerHTML = "";
  createItemRow("Dienstleistung", 1, 100);
  if (!invoiceNumberInput.value.trim()) setDefaultInvoiceNumber();
  setDefaultDates();
  if (taxRateInput && !kleinunternehmerInput?.checked && !reverseChargeInput?.checked) {
    taxRateInput.value = defaultVatRateFromEngine(invoiceDateInput?.value);
  }
  toggleModeUI();
  updatePreview();
  setDraftSaveState(false);
}

function applyDraftFromObject(draft, options = {}) {
  const { saveToStorage = false, showMessage = false } = options;
  const payroll = draft.payroll || {};
  documentTypeInput.value = draft.documentType === "payroll-annual"
    ? "payroll-annual"
    : (draft.documentType === "payroll" ? "payroll" : "invoice");
  syncDocTypeCards(getCurrentMode());
  if (taxYearInput) taxYearInput.value = draft.taxYear || payroll.taxYear || taxYearInput.value || String(new Date().getFullYear());
  activeCompanyProfileId = draft.activeCompanyProfileId || "default";
  invoiceNumberInput.value = draft.invoiceNumber || "";
  invoiceDateInput.value = draft.invoiceDate || "";
  if (serviceDateInput) serviceDateInput.value = draft.serviceDate || draft.invoiceDate || "";
  dueDateInput.value = draft.dueDate || "";
  taxRateInput.value = draft.taxRate || "19";
  if (kleinunternehmerInput) kleinunternehmerInput.checked = Boolean(draft.kleinunternehmer);
  if (reverseChargeInput) reverseChargeInput.checked = Boolean(draft.reverseCharge);
  sellerInput.value = draft.seller || "";
  customerInput.value = draft.customer || "";
  if (employeeAddressInput) {
    employeeAddressInput.value = draft.payroll?.employeeAddress || draft.customer || "";
  }
  syncEmployeeAddressFields("auto");
  noteInput.value = draft.note || "";
  signatureNameInput.value = draft.signatureName || "";
  signatureMode = ["auto", "styled", "draw", "none"].includes(draft.signatureMode)
    ? draft.signatureMode
    : (draft.signatureDataUrl ? "draw" : "auto");
  signatureStyleId = draft.signatureStyleId || "formal";
  signatureColorId = draft.signatureColorId || "navy";
  signatureLayout = getSignatureEngine()?.normalizeLayout?.(draft.signatureLayout) || signatureLayout;
  signatureAttestation = draft.signatureAttestation || null;
  signatureAudit = Array.isArray(draft.signatureAudit) ? draft.signatureAudit : [];
  signatureDataUrl = draft.signatureDataUrl || "";
  renderSignatureControls();
  applySignatureLayoutToDom();
  if (signatureMode === "draw" && signatureDataUrl) drawSignatureImage(signatureDataUrl);
  else refreshActiveSignature({ save: false });
  refreshSignatureSealUi();
  if (taxNumberInput) taxNumberInput.value = draft.taxNumber || "";
  if (vatIdInput) vatIdInput.value = draft.vatId || "";
  if (commercialRegisterInput) commercialRegisterInput.value = draft.commercialRegister || "";
  if (managingDirectorInput) managingDirectorInput.value = draft.managingDirector || "";
  if (companyBankNameInput) companyBankNameInput.value = draft.companyBankName || "";
  if (companyIbanInput) companyIbanInput.value = draft.companyIban || "";
  if (companyBicInput) companyBicInput.value = draft.companyBic || "";
  if (payrollLayoutSelect) payrollLayoutSelect.value = normalizePayrollLayoutId(draft.payrollLayout);
  activeLogoDataUrl = draft.logoDataUrl || readCompanyProfiles()[activeCompanyProfileId]?.logoDataUrl || "";
  updateDocumentLogos();

  employeeNameInput.value = payroll.employeeName || "";
  if (employeeAddressInput) employeeAddressInput.value = payroll.employeeAddress || draft.customer || "";
  syncEmployeeAddressFields("auto");
  employeeIdInput.value = payroll.employeeId || "";
  employeeTaxIdInput.value = payroll.employeeTaxId || "";
  if (employeeInsuranceNoInput) employeeInsuranceNoInput.value = payroll.employeeInsuranceNo || "";
  employeeBirthDateInput.value = payroll.employeeBirthDate || "";
  employeeEntryDateInput.value = payroll.employeeEntryDate || "";
  employeeExitDateInput.value = payroll.employeeExitDate || "";
  payrollMonthInput.value = payroll.payrollMonth || "";
  if (taxYearInput && payroll.taxYear) taxYearInput.value = payroll.taxYear;
  if (employeeReferenceMonthInput) employeeReferenceMonthInput.value = payroll.employeeReferenceMonth || payroll.payrollMonth || "";
  taxClassInput.value = payroll.taxClass || "I";
  grossSalaryInput.value = payroll.grossSalary || "0";
  if (taxAllowanceMonthlyInput) taxAllowanceMonthlyInput.value = payroll.taxAllowanceMonthly || "0";
  if (childAllowanceFactorInput) childAllowanceFactorInput.value = payroll.childAllowanceFactor || "0";
  if (factorMethodInput) factorMethodInput.checked = Boolean(payroll.factorMethod);
  if (factorValueInput) factorValueInput.value = payroll.factorValue || "1";
  if (churchTaxRateInput) churchTaxRateInput.value = payroll.churchTaxRate || "0";
  if (childlessPvSurchargeInput) childlessPvSurchargeInput.checked = Boolean(payroll.childlessPvSurcharge);
  if (healthAdditionalPercentInput) healthAdditionalPercentInput.value = payroll.healthAdditionalPercent || "2.9";
  pensionPercentInput.value = payroll.pensionPercent || "9.3";
  healthPercentInput.value = payroll.healthPercent || "8.75";
  if (healthFundInput) healthFundInput.value = payroll.healthFund || "AOK";
  carePercentInput.value = payroll.carePercent || "1.8";
  unemploymentPercentInput.value = payroll.unemploymentPercent || "1.3";
  workHoursInput.value = payroll.workHours || "160";
  workDaysInput.value = payroll.workDays || "21";
  bankNameInput.value = payroll.bankName || "";
  bankBicInput.value = payroll.bankBic || "";
  bankIbanInput.value = payroll.bankIban || "";
  loadWageItems(payroll.wageItems, Number(payroll.grossSalary) || 0, payroll.wageTypeText || "Gehalt");
  if (employeeSearchInput) employeeSearchInput.value = payroll.employeeName || "";

  itemsBody.innerHTML = "";
  const items = Array.isArray(draft.items) && draft.items.length ? draft.items : [{ description: "", quantity: 1, price: 0 }];
  items.forEach((item) => createItemRow(item.description || "", Number(item.quantity) || 0, Number(item.price) || 0));

  refreshCompanyProfileSelect(false);
  if (companyProfileSelect) companyProfileSelect.value = activeCompanyProfileId;
  const activeProfile = readCompanyProfiles()[activeCompanyProfileId];
  if (activeProfile) {
    if (payrollHeaderLineInput) payrollHeaderLineInput.value = activeProfile.payrollHeaderLine || "";
    if (payrollFooterLineInput) payrollFooterLineInput.value = activeProfile.payrollFooterLine || "";
  }
  applyPayrollLayout(draft.payrollLayout || "datev");
  updateLayoutDescription();
  toggleTaxClassIvFields();
  toggleModeUI();

  updatePreview();
  if (saveToStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setDraftSaveState(true);
  } else {
    saveDraft(false);
  }
  if (showMessage) window.alert("Entwurf wurde geladen.");
}

function loadDraft(showMessage = true) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if (showMessage) window.alert("Kein gespeicherter Entwurf gefunden.");
    return;
  }
  applyDraftFromObject(JSON.parse(raw), { saveToStorage: true, showMessage });
}

function exportCurrentPayrollJson() {
  const draft = collectDraftData();
  draft.documentType = "payroll";
  const month = payrollMonthInput.value || "0000-00";
  const name = normalizeEmployeeName(employeeNameInput.value).replace(/[^\w\-]+/g, "_") || "Mitarbeiter";
  const payload = {
    app: "FinanzDokumentPro",
    kind: "payroll",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    draft,
  };
  downloadJson(payload, `Lohnabrechnung_${name}_${month}.json`);
  if (lexStatusMessage) lexStatusMessage.textContent = "Lohnabrechnung exportiert";
}

function stripBom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

function triggerFileInput(input) {
  if (!input) {
    window.alert("Datei-Import nicht verfügbar. Bitte Seite neu laden (F5).");
    return;
  }
  input.value = "";
  input.click();
}

function bindFileImportButton(buttonId, inputId, handler) {
  const btn = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!input) return;
  if (btn) btn.addEventListener("click", () => triggerFileInput(input));
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) handler(file);
    input.value = "";
  });
}

function coalescePayrollDraft(draft) {
  if (!draft || typeof draft !== "object") return draft;
  const payrollKeys = [
    "employeeName", "employeeId", "employeeAddress", "employeeTaxId", "employeeInsuranceNo",
    "employeeBirthDate", "employeeEntryDate", "employeeExitDate", "payrollMonth", "employeeReferenceMonth",
    "taxClass", "grossSalary", "taxAllowanceMonthly", "childAllowanceFactor", "factorMethod", "factorValue",
    "churchTaxRate", "childlessPvSurcharge", "healthAdditionalPercent", "pensionPercent", "healthPercent",
    "healthFund", "carePercent", "unemploymentPercent", "workHours", "workDays", "bankName", "bankBic",
    "bankIban", "wageItems", "wageTypeText", "taxYear",
  ];
  const payroll = { ...(draft.payroll || {}) };
  payrollKeys.forEach((key) => {
    if (draft[key] != null && draft[key] !== "" && (payroll[key] == null || payroll[key] === "")) {
      payroll[key] = draft[key];
    }
  });
  if (draft.documentType === "payroll" || Object.keys(payroll).length) {
    return { ...draft, payroll };
  }
  return draft;
}

function focusPayrollAfterImport() {
  if (documentTypeInput) documentTypeInput.value = "payroll";
  syncDocTypeCards("payroll");
  toggleModeUI();
  const payrollTab = document.querySelector('.form-tab[data-tab="payroll"]');
  if (payrollTab && !payrollTab.classList.contains("active")) payrollTab.click();
}

function normalizeImportPayload(data) {
  if (!data || typeof data !== "object") return null;

  if (data.app === "FinanzDokumentPro") {
    if (data.draft && typeof data.draft === "object") return coalescePayrollDraft(data.draft);
    if (data.kind === "template" && data.draft) return coalescePayrollDraft(data.draft);
  }

  if (data.kind === "template" && data.template) {
    return coalescePayrollDraft({
      ...data.template,
      documentType: data.template.documentType || "payroll",
      meta: { ...(data.template.meta || {}), templateName: data.name || data.template.name },
    });
  }

  if (data.draft && typeof data.draft === "object") return coalescePayrollDraft(data.draft);

  if (data.payroll || data.documentType === "payroll" || data.documentType === "payroll-annual") {
    return coalescePayrollDraft(data);
  }

  if (data.employeeName || data.wageItems || data.employeeId) {
    const { employeeName, employeeId, wageItems, payrollMonth, payrollLayout, ...rest } = data;
    return coalescePayrollDraft({
      documentType: "payroll",
      payrollLayout: payrollLayout || "datev",
      payroll: {
        employeeName,
        employeeId,
        wageItems: wageItems || [],
        payrollMonth,
        ...rest,
      },
    });
  }

  return null;
}

function applyImportedDraft(draft, options = {}) {
  const normalized = coalescePayrollDraft({ ...draft });
  importedCsvTotals = normalized.meta?.importedTotals || null;
  useDatevReferenceDisplay = normalized.meta?.referenceDemo === "datev";
  applyDraftFromObject(normalized, options);
  if (normalized.documentType === "payroll" || normalized.documentType === "payroll-annual") {
    focusPayrollAfterImport();
  } else {
    toggleModeUI();
  }
}

function importJsonFile(file, options = {}) {
  if (!file) return;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) {
    window.alert("Das ist eine CSV-Datei.\n\nBitte „DATEV CSV importieren“ verwenden (Tab Lohnabrechnung).");
    importDatevCsvFile(file);
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => window.alert("Datei konnte nicht gelesen werden.");
  reader.onload = () => {
    try {
      const data = JSON.parse(stripBom(reader.result));
      const draft = normalizeImportPayload(data);
      if (!draft) {
        window.alert("Keine gültigen Abrechnungs- oder Vorlagendaten.\n\nUnterstützt: JSON-Export aus dieser App (Lohnabrechnung, Vorlage oder Backup).");
        return;
      }
      applyImportedDraft(draft, { saveToStorage: false, showMessage: false });
      refreshEmployeeNameSuggestions();
      saveDraft(false);
      const kind = data.kind === "template" ? "Vorlage" : "Abrechnung";
      window.alert(`${kind} importiert. Alle Felder sind bearbeitbar – Netto wird neu berechnet.`);
      if (lexStatusMessage) lexStatusMessage.textContent = `${kind} importiert`;
    } catch (err) {
      window.alert(`Datei konnte nicht gelesen werden: ${err.message || "Ungültiges JSON"}\n\nTipp: Export aus „Als Vorlage exportieren“ oder „Abrechnung exportieren“ verwenden.`);
    }
  };
  reader.readAsText(file, "UTF-8");
}

function exportCurrentAsTemplate() {
  const name = window.prompt("Name der Vorlage:", "Meine Lohn-Vorlage");
  if (name === null) return;
  const draft = collectDraftData();
  draft.documentType = "payroll";
  const payload = {
    app: "FinanzDokumentPro",
    kind: "template",
    name: name.trim() || "Meine Lohn-Vorlage",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    draft,
  };
  const safeName = payload.name.replace(/[^\w\-äöüÄÖÜß]+/g, "_");
  downloadJson(payload, `Vorlage_${safeName}.json`);
  if (lexStatusMessage) lexStatusMessage.textContent = "Vorlage exportiert";
}

function initBuiltInTemplateSelect() {
  const select = document.getElementById("builtInTemplateSelect");
  if (!select || !window.PAYROLL_TEMPLATE_LIBRARY) return;
  Object.values(window.PAYROLL_TEMPLATE_LIBRARY)
    .filter((entry) => entry.draft?.payrollLayout === "datev" || entry.id === "datev_mustermann_juli2025")
    .forEach((entry) => {
      const opt = document.createElement("option");
      opt.value = entry.id;
      opt.textContent = entry.label;
      select.appendChild(opt);
    });
}

function loadBuiltInTemplate(templateId) {
  const entry = window.PAYROLL_TEMPLATE_LIBRARY?.[templateId];
  if (!entry?.draft) {
    window.alert("Vorlage nicht gefunden.");
    return;
  }
  datevReferenceLoading = true;
  applyImportedDraft(entry.draft, { saveToStorage: false, showMessage: false });
  saveDraft(false);
  datevReferenceLoading = false;
  if (lexStatusMessage) lexStatusMessage.textContent = entry.label;
}

function importPayrollFile(file) {
  importJsonFile(file);
}

function resetForm() {
  if (!window.confirm("Alle Eingaben wirklich zurücksetzen?")) return;
  documentTypeInput.value = "invoice";
  invoiceNumberInput.value = "";
  taxRateInput.value = defaultVatRateFromEngine(invoiceDateInput?.value);
  if (kleinunternehmerInput) kleinunternehmerInput.checked = false;
  if (reverseChargeInput) reverseChargeInput.checked = false;
  sellerInput.value = "";
  customerInput.value = "";
  if (employeeAddressInput) employeeAddressInput.value = "";
  noteInput.value = LEGAL_CONFIG.invoice.defaultNote;
  employeeNameInput.value = "";
  if (employeeSearchInput) employeeSearchInput.value = "";
  employeeIdInput.value = "";
  employeeTaxIdInput.value = "";
  if (employeeInsuranceNoInput) employeeInsuranceNoInput.value = "";
  employeeBirthDateInput.value = "";
  employeeEntryDateInput.value = "";
  employeeExitDateInput.value = "";
  payrollMonthInput.value = "";
  if (employeeReferenceMonthInput) employeeReferenceMonthInput.value = "";
  taxClassInput.value = "I";
  grossSalaryInput.value = "3500";
  if (churchTaxRateInput) churchTaxRateInput.value = "0";
  if (childlessPvSurchargeInput) childlessPvSurchargeInput.checked = false;
  applyLegalRatesToForm(false);
  ensurePayrollDefaultLayout();
  bankNameInput.value = "";
  bankBicInput.value = "";
  bankIbanInput.value = "";
  if (wageItemsBody) {
    wageItemsBody.innerHTML = "";
    createWageRow({ code: "2000", label: "Gehalt", quantity: 1, factor: 3500, amount: 3500 });
  }
  signatureNameInput.value = "";
  signatureMode = "auto";
  signatureStyleId = "formal";
  signatureColorId = "navy";
  signatureLayout = getSignatureEngine()?.defaultLayout?.() || signatureLayout;
  signatureAttestation = null;
  signatureAudit = [];
  signatureDataUrl = "";
  if (signatureCtx && signaturePad) signatureCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
  renderSignatureControls();
  applySignatureLayoutToDom();
  refreshActiveSignature({ save: false });
  refreshSignatureSealUi();
  setDefaultDates();
  setDefaultInvoiceNumber();
  itemsBody.innerHTML = "";
  createItemRow("", 1, 0);
  updatePreview();
}

/* ── Validation ── */

function validateInvoiceBeforePrint() {
  updateIncompleteFieldHighlights();
  if (!invoiceNumberInput.value.trim()) return window.alert("Bitte eine Rechnungsnummer eintragen."), false;
  if (!sellerInput.value.trim() || !customerInput.value.trim()) return window.alert("Bitte Absender und Empfänger ausfüllen."), false;
  const meaningfulItem = getRowsData().some((item) => item.description && item.quantity > 0 && item.price >= 0);
  if (!meaningfulItem) return window.alert("Bitte mindestens eine gültige Position anlegen."), false;
  return true;
}

function validateAnnualBeforePrint() {
  if (!invoiceNumberInput.value.trim()) setDefaultInvoiceNumber();
  const selectedName = normalizeEmployeeName(employeeNameInput.value || employeeSearchInput?.value);
  if (selectedName) {
    employeeNameInput.value = selectedName;
    if (employeeSearchInput) employeeSearchInput.value = selectedName;
  }
  if (taxYearInput && !taxYearInput.value) {
    taxYearInput.value = String(payrollMonthInput.value?.slice(0, 4) || new Date().getFullYear());
  }
  updateIncompleteFieldHighlights();
  if (!employeeNameInput.value.trim()) return window.alert("Bitte Mitarbeitername eintragen."), false;
  if (!taxYearInput?.value) return window.alert("Bitte Bescheinigungsjahr wählen."), false;
  if (!sellerInput.value.trim()) return window.alert("Bitte Arbeitgeber-Adresse eintragen."), false;
  if (!getEmployeeAddressText()) return window.alert("Bitte Mitarbeiter-Adresse eintragen."), false;
  if (!employeeTaxIdInput.value.trim()) return window.alert("Bitte Steuer-ID für die Jahresbescheinigung eintragen."), false;
  return true;
}

function validatePayrollDocumentBeforePrint() {
  if (getCurrentMode() === "payroll-annual") return validateAnnualBeforePrint();
  return validatePayrollBeforePrint();
}

function validatePayrollBeforePrint() {
  if (!invoiceNumberInput.value.trim()) setDefaultInvoiceNumber();

  const selectedName = normalizeEmployeeName(employeeNameInput.value || employeeSearchInput?.value);
  if (selectedName) {
    employeeNameInput.value = selectedName;
    if (employeeSearchInput) employeeSearchInput.value = selectedName;
  }
  if (!payrollMonthInput.value && employeeReferenceMonthInput?.value) {
    payrollMonthInput.value = employeeReferenceMonthInput.value;
  }

  updateIncompleteFieldHighlights();
  if (!invoiceNumberInput.value.trim()) return window.alert("Bitte eine Dokumentnummer eintragen."), false;
  if (!employeeNameInput.value.trim() || !payrollMonthInput.value) return window.alert("Bitte Mitarbeitername und Monat eintragen."), false;
  if (!sellerInput.value.trim()) return window.alert("Bitte die Adresse des Arbeitgebers unter „Absender / Arbeitgeber“ eintragen."), false;
  if (!getEmployeeAddressText()) return window.alert("Bitte die Mitarbeiter-Adresse im Lohn-Tab eintragen."), false;
  const wageTotal = summarizeWageRows(getWageRowsData()).gross;
  if (wageTotal <= 0) return window.alert("Bitte mindestens eine Lohnart mit Betrag > 0 eintragen."), false;
  if (!warnInsuranceNumberIfNeeded(true)) return false;
  if ((Number(grossSalaryInput.value) || 0) <= 0) {
    return window.confirm("Bruttolohn ist 0,00 EUR. Trotzdem drucken?");
  }
  return true;
}

function setFieldIncomplete(input, isIncomplete) {
  if (!input) return;
  input.classList.toggle("field-incomplete", isIncomplete);
  input.setAttribute("aria-invalid", isIncomplete ? "true" : "false");
}

function setInvoiceItemIncomplete(isIncomplete) {
  [".desc-input", ".qty-input", ".price-input"].forEach((selector) => {
    itemsBody.querySelectorAll(selector).forEach((input) => {
      input.classList.toggle("field-incomplete", isIncomplete);
      input.setAttribute("aria-invalid", isIncomplete ? "true" : "false");
    });
  });
}

function updateUiStatusBar() {
  const mode = getCurrentMode();
  const tt = (k, fb, vars) => {
    const v = window.WorkPassI18n?.t?.(k, vars);
    return (v && v !== k) ? v : fb;
  };
  const modeLabel = mode === "payroll-annual"
    ? tt("doc.annualTax", "Lohnsteuerbescheinigung")
    : (mode === "payroll" ? tt("nav.payrollFull", "Lohnabrechnung") : tt("doc.invoice", "Rechnung"));
  const visibleIncomplete = document.querySelectorAll(
    ".form-panel input.field-incomplete, .form-panel textarea.field-incomplete, .form-panel select.field-incomplete"
  ).length;

  if (modeChip) modeChip.textContent = tt("status.modeOf", "Modus: {mode}", { mode: modeLabel });
  if (completionChip) {
    completionChip.textContent = visibleIncomplete === 0
      ? tt("status.complete", "Status: Vollständig")
      : tt("status.fieldsOpen", "Status: {n} Feld(er) offen", { n: visibleIncomplete });
    completionChip.classList.toggle("ui-chip-ok", visibleIncomplete === 0);
    completionChip.classList.toggle("ui-chip-warn", visibleIncomplete > 0);
  }
}

function collectFullBackup() {
  return {
    app: "WorkPassLohn",
    product: "WorkPass Steuerprogramm",
    vendor: "Suppix AI",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    draft: collectDraftData(),
    profiles: readCompanyProfiles(),
    employeeHistory: readEmployeeHistory(),
    payrollArchive: (() => {
      try { return JSON.parse(localStorage.getItem("finanzDokumentPayrollArchiveV1") || "{}"); } catch { return {}; }
    })(),
    invoiceArchive: window.WorkPassHub?.readInvoiceArchive?.() || [],
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(";") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(lines, filename) {
  const content = `\ufeff${lines.join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadText(content, filename, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCurrentAnnualCertificateData() {
  const year = Number(taxYearInput?.value) || Number((payrollMonthInput.value || "").slice(0, 4)) || new Date().getFullYear();
  const employeeName = normalizeEmployeeName(employeeNameInput.value || employeeSearchInput?.value);
  return window.AnnualCertificate?.buildAnnualCertificateData({
    year,
    employeeName,
    employeeId: employeeIdInput.value.trim(),
    employeeTaxId: employeeTaxIdInput.value.trim(),
    employeeInsuranceNo: employeeInsuranceNoInput?.value?.trim() || "",
    employeeBirthDate: employeeBirthDateInput.value,
    employeeEntryDate: employeeEntryDateInput.value,
    employeeExitDate: employeeExitDateInput.value,
    employeeAddress: getEmployeeAddressText(),
    seller: sellerInput.value.trim(),
    taxClass: taxClassInput.value,
    churchTaxRate: numberValue(churchTaxRateInput),
    childAllowanceFactor: numberValue(childAllowanceFactorInput),
    history: readEmployeeHistory(),
    currentMonth: payrollMonthInput.value,
    currentProfile: collectPayrollProfile(),
    calculateMonthPayroll: (profile) => calculatePayrollFromProfile(profile),
  });
}

function exportElsterLstbXml() {
  if (!window.ElsterExport?.buildElsterLstbXml) {
    window.alert("ELSTER-Export-Modul nicht geladen. Bitte Seite neu laden.");
    return;
  }
  if (!validateAnnualBeforePrint()) return;

  const data = buildCurrentAnnualCertificateData();
  if (!data?.hasData) {
    window.alert(`Keine gespeicherten Monatsabrechnungen für ${data?.year || taxYearInput?.value}. Bitte zuerst monatliche Lohnabrechnungen speichern.`);
    return;
  }

  const idNr = window.ElsterExport.normalizeTaxId(data.employeeTaxId);
  if (idNr.length !== 11) {
    const proceed = window.confirm("Die Steuer-ID sollte 11 Ziffern haben. Trotzdem XML erstellen?");
    if (!proceed) return;
  }

  const xml = window.ElsterExport.buildElsterLstbXml(data, {
    employer: {
      name: sellerInput.value.trim(),
      taxNumber: taxNumberInput?.value?.trim() || "",
      address: sellerInput.value.trim(),
    },
    appVersion: APP_VERSION,
  });

  const safeName = (data.employeeName || "Mitarbeiter").replace(/[^\wäöüÄÖÜß.-]+/g, "_").slice(0, 40);
  downloadText(xml, `LStB_${data.year}_${safeName}.xml`, "application/xml;charset=utf-8");
  window.alert(`ELSTER-Vorbereitungs-XML für ${data.year} erstellt.\n\nHinweis: Die amtliche Übermittlung erfolgt über www.elster.de mit Authentifizierung.`);
}

function exportDatevLodasBundle() {
  if (!window.PayrollEngine?.ready) {
    window.alert("DATEV-Export benötigt die BMF-Berechnungsbibliothek. Bitte Internetverbindung prüfen und Seite neu laden.");
    return;
  }
  if (!employeeNameInput.value.trim() || !payrollMonthInput.value) {
    window.alert("Bitte Mitarbeitername und Abrechnungsmonat eintragen.");
    return;
  }

  const mandant = (companyProfileNameInput?.value?.trim() || "Mandant").replace(/\s+/g, "_");
  const month = payrollMonthInput.value;
  const profile = collectPayrollProfile();
  const movementHeader = "Personalnummer;Lohnart;Betrag;Abrechnungsmonat;Mitarbeitername";
  const movementLines = window.PayrollEngine.buildDatevMovementLines(profile, month, mandant);
  const stammHeader = "Personalnummer;Name;Steuer-ID;SV-Nummer;Steuerklasse;IBAN;BIC;Bank";
  const stammLine = window.PayrollEngine.buildDatevStammLine(profile);

  downloadText(window.PayrollEngine.buildDatevIni(), `FinanzDokument_${mandant}_DATEV_Import.ini`);
  downloadCsv([movementHeader, ...movementLines], `FinanzDokument_${mandant}_DATEV_Bewegungsdaten_${month}.csv`);
  downloadCsv([stammHeader, stammLine], `FinanzDokument_${mandant}_DATEV_Stammdaten.csv`);
  window.alert("DATEV LODAS Paket erstellt: INI + Bewegungsdaten + Stammdaten.");
}

function payrollNumbersFromProfile(profile) {
  const wageItems = Array.isArray(profile.wageItems) ? profile.wageItems : [];
  const wageTotals = wageItems.length
    ? summarizeWageRows(wageItems)
    : summarizeWageRows([]);
  const gross = wageItems.length
    ? wageTotals.gross
    : Number(profile.grossSalary) || 0;
  const taxGross = profile.taxGross ?? (wageItems.length ? wageTotals.taxGross : gross);
  const svGross = profile.svGross ?? (wageItems.length ? wageTotals.svGross : gross);
  const legal = calculateLegalPayroll(gross, buildPayrollOptions({
    taxClass: profile.taxClass || "I",
    churchTaxRate: Number(profile.churchTaxRate) || 0,
    childlessOver23: Boolean(profile.childlessPvSurcharge),
    healthAdditional: Number(profile.healthAdditionalPercent) || 2.9,
    privateHealth: profile.healthFund === "Private Krankenversicherung",
    taxAllowanceMonthly: Number(profile.taxAllowanceMonthly) || 0,
    childAllowanceFactor: Number(profile.childAllowanceFactor) || 0,
    factorMethod: Boolean(profile.factorMethod),
    factorValue: Number(profile.factorValue) || 1,
    pensionPercent: Number(profile.pensionPercent),
    healthPercent: Number(profile.healthPercent),
    carePercent: Number(profile.carePercent),
    unemploymentPercent: Number(profile.unemploymentPercent),
    taxGross,
    svGross,
    payrollMonth: profile.payrollMonth || "",
    asOf: profile.payrollMonth || "",
    period: profile.payrollMonth || "",
  }));
  return {
    gross,
    payrollTax: legal.payrollTax,
    churchTax: legal.churchTax,
    solidarity: legal.solidarity,
    pension: legal.pension,
    health: legal.health,
    care: legal.care,
    unemployment: legal.unemployment,
    net: legal.net,
  };
}

const DATEV_CSV_HEADER = [
  "Mandant",
  "Personalnummer",
  "Mitarbeiter",
  "Abrechnungsmonat",
  "Brutto",
  "Lohnsteuer",
  "Kirchensteuer",
  "Solidaritaetszuschlag",
  "KV",
  "RV",
  "PV",
  "AV",
  "Netto",
  "Steuerklasse",
  "SV-Nummer",
  "Krankenkasse",
  "Stunden",
  "Arbeitstage",
].join(";");

function buildPayrollCsvRow(mandantName, month, profile) {
  const nums = payrollNumbersFromProfile(profile);
  return [
    mandantName,
    profile.employeeId || "",
    profile.employeeName || "",
    month,
    nums.gross.toFixed(2).replace(".", ","),
    nums.payrollTax.toFixed(2).replace(".", ","),
    nums.churchTax.toFixed(2).replace(".", ","),
    nums.solidarity.toFixed(2).replace(".", ","),
    nums.health.toFixed(2).replace(".", ","),
    nums.pension.toFixed(2).replace(".", ","),
    nums.care.toFixed(2).replace(".", ","),
    nums.unemployment.toFixed(2).replace(".", ","),
    nums.net.toFixed(2).replace(".", ","),
    profile.taxClass || "I",
    profile.employeeInsuranceNo || "",
    profile.healthFund || "",
    profile.workHours || "",
    profile.workDays || "",
  ].map(csvEscape).join(";");
}

function exportCurrentPayrollDatevCsv() {
  if (!employeeNameInput.value.trim() || !payrollMonthInput.value) {
    window.alert("Bitte Mitarbeitername und Abrechnungsmonat eintragen.");
    return;
  }
  const mandant = companyProfileNameInput?.value?.trim() || "Mandant";
  const profile = collectPayrollProfile();
  const month = payrollMonthInput.value;
  const lines = [DATEV_CSV_HEADER, buildPayrollCsvRow(mandant, month, profile)];
  downloadCsv(lines, `DATEV_Lohn_${month}_${mandant.replace(/\s+/g, "_")}.csv`);
}

function exportAllEmployeesPayrollCsv() {
  const month = payrollMonthInput.value;
  if (!month) {
    window.alert("Bitte zuerst einen Abrechnungsmonat wählen.");
    return;
  }
  const mandant = companyProfileNameInput?.value?.trim() || "Mandant";
  const history = readEmployeeHistory();
  const lines = [DATEV_CSV_HEADER];
  let count = 0;

  Object.entries(history).forEach(([name, records]) => {
    const profile = records[month] || findBestEmployeeProfile(name, month);
    if (!profile) return;
    const rowProfile = { ...profile, employeeName: profile.employeeName || name };
    lines.push(buildPayrollCsvRow(mandant, month, rowProfile));
    count += 1;
  });

  if (count === 0) {
    window.alert(`Keine gespeicherten Mitarbeiterdaten für ${month} gefunden.`);
    return;
  }
  downloadCsv(lines, `DATEV_Lohn_alle_MA_${month}_${mandant.replace(/\s+/g, "_")}.csv`);
  window.alert(`${count} Mitarbeiter als DATEV-CSV exportiert.`);
}

function exportInvoiceCsv() {
  if (!validateInvoiceBeforePrint()) return;
  const rows = getRowsData().filter((item) => item.description && item.quantity > 0);
  const isReverse = reverseChargeInput?.checked;
  const taxRate = (kleinunternehmerInput?.checked || isReverse) ? 0 : (Number(taxRateInput.value) || 0);
  const subtotal = rows.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const header = [
    "Rechnungsnummer",
    "Rechnungsdatum",
    "Leistungsdatum",
    "Faelligkeitsdatum",
    "Absender",
    "Empfaenger",
    "Position",
    "Menge",
    "Einzelpreis_netto",
    "Gesamt_netto",
    "USt_Prozent",
    "USt_Betrag",
    "Gesamt_brutto",
    "Steuernummer",
    "USt-IdNr",
  ].join(";");

  const lines = [header];
  const base = [
    invoiceNumberInput.value.trim(),
    invoiceDateInput.value,
    serviceDateInput?.value || invoiceDateInput.value,
    dueDateInput.value,
    sellerInput.value.trim().replace(/\n/g, " "),
    customerInput.value.trim().replace(/\n/g, " "),
  ];

  rows.forEach((item, index) => {
    const lineTax = item.total * (taxRate / 100);
    lines.push([
      ...base,
      item.description,
      item.quantity,
      item.price.toFixed(2).replace(".", ","),
      item.total.toFixed(2).replace(".", ","),
      taxRate,
      lineTax.toFixed(2).replace(".", ","),
      (item.total + lineTax).toFixed(2).replace(".", ","),
      index === 0 ? (taxNumberInput?.value || "") : "",
      index === 0 ? (vatIdInput?.value || "") : "",
    ].map(csvEscape).join(";"));
  });

  if (!rows.length) {
    lines.push([
      ...base,
      "",
      "",
      "",
      "",
      taxRate,
      tax.toFixed(2).replace(".", ","),
      (subtotal + tax).toFixed(2).replace(".", ","),
      taxNumberInput?.value || "",
      vatIdInput?.value || "",
    ].map(csvEscape).join(";"));
  }

  const num = invoiceNumberInput.value.trim().replace(/[^\w\-]+/g, "_");
  downloadCsv(lines, `Rechnung_${num}.csv`);
}

function duplicateDocument() {
  invoiceNumberInput.value = "";
  setDefaultInvoiceNumber();

  if (getCurrentMode() === "payroll" && payrollMonthInput.value) {
    const [year, month] = payrollMonthInput.value.split("-").map(Number);
    const next = new Date(year, month - 1, 1);
    next.setMonth(next.getMonth() + 1);
    payrollMonthInput.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    if (employeeReferenceMonthInput) employeeReferenceMonthInput.value = payrollMonthInput.value;
  }

  updatePreview();
  saveDraft(false);
  window.alert("Vorlage dupliziert: neue Dokumentnummer" + (getCurrentMode() === "payroll" ? " und Folgemonat gesetzt." : " gesetzt."));
}

function exportAllData() {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(collectFullBackup(), `FinanzDokument_Backup_${stamp}.json`);
  window.alert("Backup wurde heruntergeladen.");
}

function importAllData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(stripBom(reader.result));
      if (!data || data.app !== "FinanzDokumentPro") {
        window.alert("Ungültige Backup-Datei.");
        return;
      }
      if (!window.confirm("Alle lokalen Daten mit dem Backup überschreiben?")) return;
      if (data.profiles) writeCompanyProfiles(data.profiles);
      if (data.employeeHistory) writeEmployeeHistory(data.employeeHistory);
      if (data.draft) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.draft));
      loadDraft(false);
      refreshEmployeeNameSuggestions();
      window.alert("Daten wurden importiert.");
    } catch {
      window.alert("Backup konnte nicht gelesen werden.");
    }
  };
  reader.readAsText(file);
}

function syncHubBannerVisibility() {
  const banner = document.getElementById("dashHubBanner");
  if (!banner) return;
  const onboardingVisible = Boolean(onboardingBanner && !onboardingBanner.classList.contains("hidden"));
  banner.hidden = onboardingVisible;
}

function initOnboarding() {
  if (!onboardingBanner) return;
  const dismissed = localStorage.getItem(ONBOARDING_KEY) === "1";
  onboardingBanner.classList.toggle("hidden", dismissed);
  syncHubBannerVisibility();
}

function dismissOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  if (onboardingBanner) onboardingBanner.classList.add("hidden");
  syncHubBannerVisibility();
}

function updateIncompleteFieldHighlights() {
  const isPayroll = getCurrentMode() === "payroll";

  if (isPayroll) {
    setFieldIncomplete(invoiceNumberInput, !invoiceNumberInput.value.trim());
    setFieldIncomplete(employeeNameInput, !employeeNameInput.value.trim());
    setFieldIncomplete(employeeAddressInput, !getEmployeeAddressText());
    setFieldIncomplete(payrollMonthInput, !payrollMonthInput.value);
    setFieldIncomplete(sellerInput, !sellerInput.value.trim());
    setInvoiceItemIncomplete(false);
    updateUiStatusBar();
    return;
  }

  setFieldIncomplete(invoiceNumberInput, !invoiceNumberInput.value.trim());
  setFieldIncomplete(sellerInput, !sellerInput.value.trim());
  setFieldIncomplete(customerInput, !customerInput.value.trim());
  setFieldIncomplete(employeeNameInput, false);
  setFieldIncomplete(payrollMonthInput, false);

  const meaningfulItem = getRowsData().some((item) => item.description && item.quantity > 0 && item.price >= 0);
  setInvoiceItemIncomplete(!meaningfulItem);
  updateUiStatusBar();
}

/* ── Event Listeners ── */

const watchedInputs = [
  invoiceNumberInput, invoiceDateInput, serviceDateInput, dueDateInput, taxRateInput,
  kleinunternehmerInput, reverseChargeInput,
  sellerInput, customerInput, noteInput, documentTypeInput,
  employeeNameInput, employeeAddressInput, employeeIdInput, employeeTaxIdInput, employeeInsuranceNoInput,
  employeeBirthDateInput, employeeEntryDateInput, employeeExitDateInput,
  payrollMonthInput, taxYearInput, taxClassInput, grossSalaryInput,
  taxAllowanceMonthlyInput, childAllowanceFactorInput, factorMethodInput, factorValueInput,
  churchTaxRateInput, childlessPvSurchargeInput, healthAdditionalPercentInput,
  pensionPercentInput, healthPercentInput, carePercentInput, unemploymentPercentInput,
  workHoursInput, workDaysInput, bankNameInput, bankBicInput, bankIbanInput,
  signatureNameInput,
  taxNumberInput, vatIdInput, commercialRegisterInput, managingDirectorInput,
  companyBankNameInput, companyIbanInput, companyBicInput, datevClientNoInput, datevConsultantNoInput, payrollLayoutSelect,
  payrollHeaderLineInput, payrollFooterLineInput,
];

watchedInputs.filter(Boolean).forEach((input) => {
  const onUpdate = () => {
    if (useDatevReferenceDisplay && !datevReferenceLoading) useDatevReferenceDisplay = false;
    if (importedCsvTotals && !datevReferenceLoading) importedCsvTotals = null;
    if (input === documentTypeInput) {
      if (documentTypeInput.value === "payroll") {
        window.location.href = "lohn.html";
        return;
      }
      if (!invoiceNumberInput.value.trim()) setDefaultInvoiceNumber();
    }
    if (input === taxClassInput) toggleTaxClassIvFields();
    if (input === healthAdditionalPercentInput) syncHealthPercentFromAdditional();
    if (input === childlessPvSurchargeInput) {
      const rates = getLegalEmployeeRates({ childlessOver23: childlessPvSurchargeInput.checked, healthAdditional: numberValue(healthAdditionalPercentInput) });
      carePercentInput.value = String(rates.carePercent);
    }
    if (input === payrollLayoutSelect) {
      applyPayrollLayout(payrollLayoutSelect.value);
    }
    if (input === kleinunternehmerInput && kleinunternehmerInput.checked) taxRateInput.value = "0";
    if (input === grossSalaryInput) {
      onGrossSalaryInput();
      updateIncompleteFieldHighlights();
      return;
    }
    if (input === employeeAddressInput) syncEmployeeAddressFields("employee");
    if (input === customerInput) syncEmployeeAddressFields("customer");
    updatePreview();
    saveDraft(false);
    updateIncompleteFieldHighlights();
    updateDashboardChecklist();
  };
  input.addEventListener("input", onUpdate);
  input.addEventListener("change", onUpdate);
});

if (companySellerInput) {
  companySellerInput.addEventListener("input", () => {
    syncSellerFields("company");
    updatePreview();
    saveDraft(false);
    updateDashboardChecklist();
  });
}
if (sellerInput) {
  sellerInput.addEventListener("input", () => {
    syncSellerFields("seller");
    updateDashboardChecklist();
  });
}

if (employeeNameInput && employeeSearchInput) {
  employeeNameInput.addEventListener("change", () => {
    employeeSearchInput.value = normalizeEmployeeName(employeeNameInput.value);
  });
}

if (payrollMonthInput) {
  payrollMonthInput.addEventListener("change", () => {
    if (employeeReferenceMonthInput && !employeeReferenceMonthInput.value) {
      employeeReferenceMonthInput.value = payrollMonthInput.value;
    }
    applyLegalRatesToForm(false);
  });
}

if (employeeSearchInput) {
  employeeSearchInput.addEventListener("change", () => {
    if (employeeSearchInput.value.trim()) {
      employeeNameInput.value = employeeSearchInput.value.trim();
      loadSelectedEmployeeData(true);
    }
  });
}

if (employeeInsuranceNoInput) {
  employeeInsuranceNoInput.addEventListener("blur", () => warnInsuranceNumberIfNeeded(false));
}

if (loadEmployeeDataBtn) loadEmployeeDataBtn.addEventListener("click", () => loadSelectedEmployeeData(true));
if (loadDatevRefBtn) loadDatevRefBtn.addEventListener("click", () => loadDatevReferenceDemo());
if (loadAgendaRefBtn) loadAgendaRefBtn.addEventListener("click", () => loadAgendaReferenceDemo("agenda"));
if (loadCurrentLayoutRefBtn) loadCurrentLayoutRefBtn.addEventListener("click", () => loadReferenceForCurrentLayout());
if (saveEmployeeDataBtn) saveEmployeeDataBtn.addEventListener("click", () => saveCurrentEmployeeMonth(true));
if (applyLegalRatesBtn) applyLegalRatesBtn.addEventListener("click", () => applyLegalRatesToForm(true));

if (companyProfileSelect) {
  companyProfileSelect.addEventListener("change", () => {
    activeCompanyProfileId = companyProfileSelect.value;
    applyCompanyProfile(readCompanyProfiles()[activeCompanyProfileId]);
    updatePreview();
    saveDraft(false);
    updateDashboardChecklist();
  });
}
if (saveCompanyProfileBtn) saveCompanyProfileBtn.addEventListener("click", () => saveCurrentCompanyProfile(true));
if (syncCompanyProfileBtn) {
  syncCompanyProfileBtn.addEventListener("click", async () => {
    const firm = Boolean(window.WorkPassAuth?.isCompanyPortalUser?.());
    if (!firm && !window.WorkPassAuth?.getSessionToken?.()) {
      window.alert("Firmen-Login nötig, um mit dem Server zu synchronisieren.");
      return;
    }
    await saveCurrentCompanyProfile(true);
    await pullCompanyProfileFromBridge({ force: false });
    saveDraft(false);
  });
}
if (newCompanyProfileBtn) newCompanyProfileBtn.addEventListener("click", createNewCompanyProfile);
if (deleteCompanyProfileBtn) deleteCompanyProfileBtn.addEventListener("click", deleteCurrentCompanyProfile);

addItemBtn.addEventListener("click", () => {
  createItemRow("", 1, 0);
  saveDraft(false);
});

if (addWageItemBtn) {
  addWageItemBtn.addEventListener("click", () => {
    createWageRow({ code: "2010", label: "Überstunden", quantity: 0, factor: 0 });
    saveDraft(false);
  });
}

if (previewZoomInput) previewZoomInput.addEventListener("change", applyPreviewZoom);

if (companyLogoInput) {
  companyLogoInput.addEventListener("change", () => {
    const file = companyLogoInput.files?.[0];
    if (file) handleLogoUpload(file);
  });
}
if (removeLogoBtn) removeLogoBtn.addEventListener("click", removeCompanyLogo);
if (pdfExportBtn) pdfExportBtn.addEventListener("click", exportPdf);
if (csvExportBtn) csvExportBtn.addEventListener("click", exportInvoiceCsv);
if (datevCsvExportBtn) datevCsvExportBtn.addEventListener("click", exportCurrentPayrollDatevCsv);
if (datevLodasExportBtn) datevLodasExportBtn.addEventListener("click", exportDatevLodasBundle);
if (elsterXmlExportBtn) elsterXmlExportBtn.addEventListener("click", exportElsterLstbXml);
if (duplicateDocBtn) duplicateDocBtn.addEventListener("click", duplicateDocument);
if (exportAllPayrollCsvBtn) exportAllPayrollCsvBtn.addEventListener("click", exportAllEmployeesPayrollCsv);
if (exportDataBtn) exportDataBtn.addEventListener("click", exportAllData);
bindFileImportButton("importDataBtn", "importDataInput", importAllData);
if (dismissOnboardingBtn) dismissOnboardingBtn.addEventListener("click", dismissOnboarding);

if (printVerdienstBtn) printVerdienstBtn.addEventListener("click", printVerdienstbescheinigung);
if (previewVerdienstBtn) {
  previewVerdienstBtn.addEventListener("click", () => {
    if (getCurrentMode() !== "payroll") return;
    updatePreview();
    setVerdienstPreviewMode(!verdienstPreviewMode);
    if (verdienstPreviewMode) {
      payrollSheet?.classList.add("hidden");
      document.getElementById("datevSheetHost")?.classList.add("hidden");
      verdienstSheet?.classList.remove("hidden");
    }
  });
}

if (printBtn) printBtn.addEventListener("click", async () => {
  try {
    const valid = isPayrollFamilyMode() ? validatePayrollDocumentBeforePrint() : validateInvoiceBeforePrint();
    if (!valid) return;
    if (getCurrentMode() === "payroll") {
      window.alert("Für Lohnabrechnungen bitte den Arbeitsplatz lohn.html nutzen – dort ist Druck & Empfang optimiert.");
      window.location.href = "lohn.html";
      return;
    }
    if (getCurrentMode() === "payroll") saveCurrentEmployeeMonth(false);
    updatePreview();
    if (getCurrentMode() === "invoice") {
      await refreshActiveSignature({ save: false });
      if (!signatureAttestation && signatureMode !== "none" && signatureDataUrl) {
        await sealActiveSignature({ save: true });
      } else {
        await refreshSignatureSealUi();
      }
    }
    archiveCurrentInvoiceIfNeeded();

    if (getCurrentMode() === "payroll") {
      if (window.DatevSheet?.printSheet()) return;
    }

    if (getCurrentMode() === "payroll-annual") {
      const annualEl = annualTaxSheet || document.getElementById("annualTaxSheet");
      if (annualEl && window.WorkPassHub?.printElement) {
        window.WorkPassHub.printElement(annualEl, "Lohnsteuerbescheinigung");
        return;
      }
      preparePayrollPrint();
      const clearPrintMode = () => {
        restoreAfterPrint();
        window.removeEventListener("afterprint", clearPrintMode);
      };
      window.addEventListener("afterprint", clearPrintMode);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.print());
      });
      return;
    }

    // Rechnung: zuverlässiger Iframe-Druck ohne leere Seite
    const preview = document.getElementById("invoicePreview") || invoicePreviewEl;
    if (preview && window.WorkPassHub?.printElement) {
      window.WorkPassHub.printElement(preview, `Rechnung ${invoiceNumberInput?.value || ""}`.trim());
      return;
    }
    window.print();
  } catch (error) {
    window.alert("Drucken fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.");
    console.error(error);
  }
});

window.addEventListener("workpass:load-invoice", (ev) => {
  const draft = ev.detail;
  if (!draft) return;
  applyDraftFromObject(draft, { saveToStorage: true, showMessage: true });
  document.querySelector('[data-tab="document"]')?.click();
});

if (saveDraftBtn) saveDraftBtn.addEventListener("click", () => saveDraft(true));
bindFileImportButton(null, "importPayrollInput", importPayrollFile);
if (importPayrollBtn) {
  importPayrollBtn.addEventListener("click", () => triggerFileInput(importPayrollInput));
}
const importPayrollSidebarBtn = document.getElementById("importPayrollSidebarBtn");
if (importPayrollSidebarBtn) {
  importPayrollSidebarBtn.addEventListener("click", () => triggerFileInput(importPayrollInput));
}
bindFileImportButton("importTemplateBtn", "importTemplateInput", importJsonFile);
const exportTemplateBtn = document.getElementById("exportTemplateBtn");
if (exportTemplateBtn) exportTemplateBtn.addEventListener("click", exportCurrentAsTemplate);
const loadBuiltInTemplateBtn = document.getElementById("loadBuiltInTemplateBtn");
const builtInTemplateSelect = document.getElementById("builtInTemplateSelect");
if (loadBuiltInTemplateBtn && builtInTemplateSelect) {
  loadBuiltInTemplateBtn.addEventListener("click", () => {
    if (!builtInTemplateSelect.value) {
      window.alert("Bitte zuerst eine eingebaute Vorlage wählen.");
      return;
    }
    loadBuiltInTemplate(builtInTemplateSelect.value);
  });
}
bindFileImportButton("importDatevCsvBtn", "importDatevCsvInput", importDatevCsvFile);
const exportDatevCsvSidebarBtn = document.getElementById("exportDatevCsvSidebarBtn");
if (exportDatevCsvSidebarBtn) exportDatevCsvSidebarBtn.addEventListener("click", exportCurrentPayrollDatevCsv);
bindFileImportButton("importPdfTemplateBtn", "importPdfTemplateInput", importPdfTemplateFile);
const loadReferenzPngBtn = document.getElementById("loadReferenzPngBtn");
if (loadReferenzPngBtn) loadReferenzPngBtn.addEventListener("click", () => loadReferenzPngBackground());
const clearPdfTemplateBtn = document.getElementById("clearPdfTemplateBtn");
if (clearPdfTemplateBtn) clearPdfTemplateBtn.addEventListener("click", clearPdfTemplateBackground);
const usePdfBackgroundInput = document.getElementById("usePdfBackgroundInput");
if (usePdfBackgroundInput) {
  usePdfBackgroundInput.addEventListener("change", () => {
    usePdfBackground = usePdfBackgroundInput.checked;
    if (usePdfBackground && !payrollBgDataUrl) {
      window.alert("Bitte zuerst ein Formular (PDF/PNG) hochladen oder Referenz-PNG laden.");
      usePdfBackground = false;
      usePdfBackgroundInput.checked = false;
      return;
    }
    savePayrollBackgroundSettings();
    applyPayrollBackgroundUI();
  });
}
const hidePdfChromeInput = document.getElementById("hidePdfChromeInput");
if (hidePdfChromeInput) {
  hidePdfChromeInput.addEventListener("change", () => {
    hidePdfChrome = hidePdfChromeInput.checked;
    savePayrollBackgroundSettings();
    applyPayrollBackgroundUI();
  });
}
if (exportPayrollJsonBtn) exportPayrollJsonBtn.addEventListener("click", exportCurrentPayrollJson);

if (loadDraftBtn) loadDraftBtn.addEventListener("click", () => loadDraft(true));
if (resetBtn) resetBtn.addEventListener("click", resetForm);

/* ── Init ── */

initTabs();
initLexShell();
initDashboardActions();
initDocTypeCards();
initSignaturePad();
initPayrollLayoutSelect();
initPayrollTemplatePicker();
readPayrollBackgroundSettings();
applyPayrollBackgroundUI();
initBuiltInTemplateSelect();
initOnboarding();
if (window.DatevSheet) window.DatevSheet.init();
window.addEventListener("beforeprint", () => {
  const mode = getCurrentMode();
  if (mode === "payroll" || mode === "payroll-annual") {
    preparePayrollPrint();
  }
});
window.addEventListener("afterprint", restoreAfterPrint);
if (appVersionLabel) appVersionLabel.textContent = `v${APP_VERSION}`;
if (sidebarVersionLabel) sidebarVersionLabel.textContent = `v${APP_VERSION}`;
if (lexStatusVersion) lexStatusVersion.textContent = `v${APP_VERSION}`;
refreshCompanyProfileSelect();
updateLayoutDescription();
ensurePayrollDefaultLayout();
applyLegalRatesToForm(false);
setDefaultDates();
documentTypeInput.value = "invoice";
setDefaultInvoiceNumber();
refreshEmployeeNameSuggestions();
syncHealthPercentFromAdditional();
toggleTaxClassIvFields();
initPayrollSheetEditors();
syncEmployeeAddressFields("auto");

window.addEventListener("payroll-engine-ready", () => {
  syncHubPapLabels(null);
  applyLegalRatesToForm(false);
  updatePreview();
});

appBootstrapping = false;

try {
  const rawDraft = localStorage.getItem(STORAGE_KEY);
  const parsedDraft = rawDraft ? JSON.parse(rawDraft) : null;
  if (parsedDraft && !isDraftMeaningless(parsedDraft)) {
    loadDraft(false);
    if (getCurrentMode() === "payroll" || getCurrentMode() === "payroll-annual") {
      documentTypeInput.value = "invoice";
      toggleModeUI();
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
    seedFreshInvoiceWorkspace();
  }
} catch {
  localStorage.removeItem(STORAGE_KEY);
  seedFreshInvoiceWorkspace();
}

if (window.PayrollEngine?.ready) {
  syncHubPapLabels(null);
  applyLegalRatesToForm(false);
  updatePreview();
}

updateIncompleteFieldHighlights();
updateInvoiceComplianceList();
applyPreviewZoom();
saveDraft(false);

window.addEventListener("workpass:locale", () => {
  window.WorkPassI18n?.applyDom?.(document);
  try { updateLexShellUI(); } catch { /* ignore */ }
  try { updateTopbarForMode(); } catch { /* ignore */ }
  try { updateUiStatusBar(); } catch { /* ignore */ }
  try { updateInvoiceComplianceList(); } catch { /* ignore */ }
  try { updateDashboard(); } catch { /* ignore */ }
  try { window.WorkPassHub?.renderSyncLog?.(); } catch { /* ignore */ }
});
