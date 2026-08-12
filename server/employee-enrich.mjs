/**
 * Enrich a payroll job from local registry + company Stammdaten + platform pull.
 * Ask the platform only for fields that remain missing after fetch.
 */
import { getPayrollCore } from "./engine.mjs";
import { loadPayrollJob, savePayrollJob } from "./store.mjs";
import { loadCompany } from "./company-service.mjs";
import { getEmployee, upsertEmployee } from "./employee-registry.mjs";
import { normalizeEmployeeRecord } from "./employee-normalize.mjs";
import { notifyGapsForPayroll } from "./platform-messages.mjs";
import { pullAndSyncCompanyBranding } from "./company-branding.mjs";
import {
  pullEmployeeBundle,
  extractInlineReply,
  pickEmployeeRow,
} from "./platform-pull.mjs";
import { pullPlatformPayrollBatch } from "./month-close.mjs";
import {
  normalizeCompanyId,
  normalizeEmployeeId,
  assertSameTenant,
} from "./tenant.mjs";

/** Last enrich attempt – exposed via /health for ops. */
let lastEnrichStatus = null;
export function getLastEnrichStatus() {
  return lastEnrichStatus ? { ...lastEnrichStatus } : null;
}

function pick(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function fillEmpty(target, key, value) {
  if (!target || !key) return false;
  const next = String(value ?? "").trim();
  if (!next) return false;
  const cur = String(target[key] ?? "").trim();
  if (cur) return false;
  target[key] = next;
  return true;
}

function companyPatch(companyId, jobCompany = null) {
  const company = loadCompany(companyId);
  const hub = company?.meta?.hubProfile && typeof company.meta.hubProfile === "object"
    ? company.meta.hubProfile
    : {};
  const jc = jobCompany && typeof jobCompany === "object" ? jobCompany : {};
  const companyName = pick(company?.name, hub.companyName, jc.name, hub.seller?.split?.("\n")?.[0]);
  const seller = pick(
    hub.seller,
    company?.address,
    [companyName, pick(company?.street, jc.street), [pick(company?.zip, jc.zip), pick(company?.city, jc.city)].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n")
  );
  const patch = {
    companyName,
    taxNumber: pick(company?.taxNumber, company?.steuerNr, hub.taxNumber, jc.taxNumber),
    vatId: pick(company?.vatId, company?.ustId, hub.vatId, jc.vatId),
    datevClientNo: pick(company?.datevClientNo, hub.datevClientNo),
    datevConsultantNo: pick(company?.datevConsultantNo, hub.datevConsultantNo),
    seller,
  };
  return { company, hub, patch, filled: Object.keys(patch).filter((k) => patch[k]) };
}

function registryPatch(companyId, employeeId) {
  const emp = getEmployee(companyId, employeeId);
  if (!emp) return { filled: [], patch: {} };
  const meta = emp.meta || {};
  const patch = {
    employeeName: pick(emp.name, meta.name),
    personnelNumber: pick(emp.personnelNumber, meta.personnelNumber),
    employeeAddress: pick(meta.address, emp.address),
    employeeTaxId: pick(meta.taxId),
    employeeInsuranceNo: pick(meta.insuranceNo, meta.svNr),
    employeeBirthDate: pick(meta.birthDate),
    employeeEntryDate: pick(meta.entryDate),
    taxClass: pick(meta.taxClass),
    healthFund: pick(meta.healthFund, meta.kk),
    healthPercent: pick(meta.healthPercent),
    bankName: pick(meta.bankName, meta.bank?.name),
    bankIban: pick(meta.bankIban, meta.iban, meta.bank?.iban),
    churchTaxRate: pick(meta.churchTaxRate),
  };
  return { employee: emp, patch, filled: Object.keys(patch).filter((k) => patch[k]) };
}

function applyPatch(state, patch) {
  const filled = [];
  for (const [key, value] of Object.entries(patch || {})) {
    if (fillEmpty(state, key, value)) filled.push(key);
  }
  return filled;
}

function employeeFromPlatformRow(row = {}) {
  const norm = normalizeEmployeeRecord(row);
  const bank = (row.bank && typeof row.bank === "object" ? row.bank : null)
    || (row.employee?.bank && typeof row.employee.bank === "object" ? row.employee.bank : null)
    || {};
  const wages = Array.isArray(row.wageItems)
    ? row.wageItems
    : (Array.isArray(row.wages) ? row.wages : []);
  return {
    employeeName: norm.name,
    personnelNumber: norm.personnelNumber,
    employeeAddress: norm.address,
    employeeTaxId: norm.taxId,
    employeeInsuranceNo: norm.insuranceNo,
    employeeBirthDate: norm.birthDate,
    employeeEntryDate: norm.entryDate,
    taxClass: norm.taxClass,
    healthFund: norm.healthFund,
    healthPercent: norm.healthPercent,
    churchTaxRate: norm.churchTaxRate,
    bankName: pick(norm.bankName, bank.name, bank.bankName, row.bankName),
    bankIban: pick(norm.bankIban, bank.iban, bank.bankIban, row.bankIban, row.iban),
    wageItems: wages,
    grossSalary: pick(row.gross, row.grossSalary, row.contractSalary, row.gehalt),
    workDays: row.attendance?.days ?? row.workDays,
    workHours: row.attendance?.hours ?? row.workHours,
    companyTaxNumber: pick(row.company?.taxNumber, row.taxNumber),
    companyVatId: pick(row.company?.vatId, row.vatId),
    companyName: pick(row.company?.name, row.companyName),
  };
}

function persistRegistryFromState(state, companyId, source = "enrich") {
  const badgeId = normalizeEmployeeId(state.badgeId || state.employeeId || "");
  if (!companyId || !badgeId) return;
  try {
    upsertEmployee({
      companyId,
      badgeId,
      name: state.employeeName || "",
      personnelNumber: state.personnelNumber || "",
      address: state.employeeAddress || "",
      taxId: state.employeeTaxId || "",
      insuranceNo: state.employeeInsuranceNo || "",
      birthDate: state.employeeBirthDate || "",
      entryDate: state.employeeEntryDate || "",
      taxClass: state.taxClass || "",
      healthFund: state.healthFund || "",
      healthPercent: state.healthPercent || "",
      bankName: state.bankName || "",
      bankIban: state.bankIban || "",
      churchTaxRate: state.churchTaxRate || "",
      source,
    });
  } catch { /* ignore */ }
}

function rebuildJob(job, state) {
  const PC = getPayrollCore();
  const hard = PC.validate(state);
  const soft = PC.validatePrintHints?.(state) || [];
  const payroll = PC.calculate(state);
  const status = hard.length
    ? "error"
    : (job.status === "released" ? "released" : "calculated");
  const payslip = {
    ...(job.payslip || {}),
    kind: "platform.payslip.v1",
    employee: {
      id: String(state.employeeId || state.badgeId || ""),
      badgeId: String(state.badgeId || state.employeeId || ""),
      name: String(state.employeeName || ""),
      address: String(state.employeeAddress || ""),
      taxId: String(state.employeeTaxId || ""),
      insuranceNo: String(state.employeeInsuranceNo || ""),
      taxClass: String(state.taxClass || ""),
      personnelNumber: String(state.personnelNumber || ""),
      printPersNr: String(state.personnelNumber || ""),
    },
    company: {
      id: normalizeCompanyId(state.mandantId || job.company?.id || ""),
      name: String(state.companyName || ""),
      taxNumber: String(state.taxNumber || ""),
      vatId: String(state.vatId || ""),
    },
    period: String(state.payrollMonth || job.period || ""),
    status,
    errors: hard,
    totals: {
      gross: payroll.gross,
      net: payroll.net,
      taxGross: payroll.taxGross,
      svGross: payroll.svGross,
      payrollTax: payroll.payrollTax,
      churchTax: payroll.churchTax,
      solidarity: payroll.solidarity,
      health: payroll.health,
      pension: payroll.pension,
      care: payroll.care,
      unemployment: payroll.unemployment,
      svTotal: payroll.svTotal,
      employerShare: payroll.employerShare,
    },
    wageItems: Array.isArray(state.wageItems) ? state.wageItems : [],
    bank: {
      name: String(state.bankName || ""),
      iban: String(state.bankIban || ""),
    },
    calculatedAt: new Date().toISOString(),
  };

  const next = {
    ...job,
    status,
    updatedAt: new Date().toISOString(),
    company: {
      ...(job.company || {}),
      id: payslip.company.id,
      name: payslip.company.name,
      taxNumber: payslip.company.taxNumber,
      vatId: payslip.company.vatId,
    },
    employee: {
      id: payslip.employee.id,
      name: payslip.employee.name,
      badgeId: payslip.employee.badgeId,
    },
    period: payslip.period,
    state,
    payroll: payslip.totals,
    payslip,
    errors: hard,
    printHints: soft,
  };
  savePayrollJob(next);
  return next;
}

function mergePlatformRowIntoState(state, row, filled, tag = "platform") {
  if (!row) return;
  const mapped = employeeFromPlatformRow(row);
  const patch = { ...mapped };
  delete patch.wageItems;
  delete patch.grossSalary;
  delete patch.workDays;
  delete patch.workHours;
  delete patch.companyTaxNumber;
  delete patch.companyVatId;
  delete patch.companyName;
  filled.push(...applyPatch(state, patch).map((k) => `${tag}.${k}`));

  if (mapped.companyTaxNumber) fillEmpty(state, "taxNumber", mapped.companyTaxNumber) && filled.push(`${tag}.taxNumber`);
  if (mapped.companyVatId) fillEmpty(state, "vatId", mapped.companyVatId) && filled.push(`${tag}.vatId`);
  if (mapped.companyName) fillEmpty(state, "companyName", mapped.companyName) && filled.push(`${tag}.companyName`);

  const hasGross = (Array.isArray(state.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0))
    || Number(state.grossSalary) > 0;
  if (!hasGross) {
    if (Array.isArray(mapped.wageItems) && mapped.wageItems.length) {
      state.wageItems = mapped.wageItems.map((w) => ({
        code: String(w.code || w.lohnart || "2000"),
        label: String(w.label || w.bezeichnung || "Gehalt"),
        amount: Number(w.amount ?? w.betrag) || 0,
        taxFlag: String(w.taxFlag || w.st || "L"),
        svFlag: String(w.svFlag || w.sv || "L"),
      }));
      filled.push(`${tag}.wageItems`);
    } else if (mapped.grossSalary) {
      fillEmpty(state, "grossSalary", mapped.grossSalary);
      if (!Array.isArray(state.wageItems) || !state.wageItems.length) {
        state.wageItems = [{
          code: "2000",
          label: "Gehalt",
          amount: Number(mapped.grossSalary) || 0,
          taxFlag: "L",
          svFlag: "L",
        }];
      }
      filled.push(`${tag}.grossSalary`);
    }
    if (mapped.workDays != null && mapped.workDays !== "") fillEmpty(state, "workDays", String(mapped.workDays));
    if (mapped.workHours != null && mapped.workHours !== "") fillEmpty(state, "workHours", String(mapped.workHours));
  }
}

/**
 * Enrich job: pull company branding + employee/contract from platform, then ask only leftovers.
 */
export async function enrichPayrollJob(jobId, options = {}) {
  const job = loadPayrollJob(jobId);
  if (!job) return { ok: false, error: "Job nicht gefunden", job: null };

  const companyId = normalizeCompanyId(job.company?.id || job.state?.mandantId || "");
  const scopeCheck = assertSameTenant(options.tenantScope, companyId, "Payroll-Anreichern");
  if (!scopeCheck.ok) return { ok: false, error: scopeCheck.error, job: null };

  const state = { ...(job.state || {}) };
  state.meta = { ...(state.meta || {}), jobId, enrichedAt: new Date().toISOString() };
  state.mandantId = state.mandantId || companyId;
  if (companyId) {
    state.meta.companyId = companyId;
    fillEmpty(state, "companyName", job.company?.name);
    fillEmpty(state, "taxNumber", job.company?.taxNumber);
    fillEmpty(state, "vatId", job.company?.vatId);
  }
  const employeeId = normalizeEmployeeId(
    options.employeeId || state.badgeId || state.employeeId || job.employee?.badgeId || job.employee?.id || ""
  );
  const period = String(options.period || state.payrollMonth || job.period || "").trim();
  const filled = [];

  // 0) Always try to pull company branding/logo (never ask here)
  let branding = null;
  if (options.pullBrand !== false && companyId) {
    try {
      branding = await pullAndSyncCompanyBranding(companyId, {
        ask: false,
        reason: "payroll_enrich",
        source: "employee-enrich",
      });
      if (branding?.pulled) filled.push("branding.pulled");
    } catch { /* ignore */ }
  }

  // 1) Company Stammdaten (Steuer-Nr., Name, …) after branding pull
  const fromCompany = companyPatch(companyId, job.company);
  filled.push(...applyPatch(state, fromCompany.patch).map((k) => `company.${k}`));
  if (!String(state.seller || "").trim() && state.companyName) {
    fillEmpty(state, "seller", state.companyName);
  }

  // 2) Local employee registry
  const fromReg = registryPatch(companyId, employeeId);
  filled.push(...applyPatch(state, fromReg.patch).map((k) => `registry.${k}`));

  const PC = getPayrollCore();
  let hard = PC.validate(state);
  let soft = PC.validatePrintHints?.(state) || [];
  let pull = { skipped: true };
  let employeePull = { skipped: true };

  const needsPull = options.pull !== false && (hard.length > 0 || soft.length > 0 || options.forcePull);
  if (needsPull && employeeId) {
    // 3a) Real platform employee + contract GET
    employeePull = await pullEmployeeBundle({ companyId, period, employeeId });
    if (employeePull.ok && employeePull.row) {
      mergePlatformRowIntoState(state, employeePull.row, filled, "contract");
      persistRegistryFromState(state, companyId, "platform-contract-pull");
      pull = { ok: true, source: "employee-bundle", url: employeePull.url };
    }

    // 3b) Payroll month/employee export as secondary source
    hard = PC.validate(state);
    soft = PC.validatePrintHints?.(state) || [];
    if (hard.length || soft.length || options.forcePull) {
      const payrollPull = await pullPlatformPayrollBatch({
        companyId,
        period,
        employeeId,
        maxAttempts: 4,
        timeoutMs: Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 8000),
      });
      if (payrollPull.ok && payrollPull.batch?.employees?.length) {
        const match = pickEmployeeRow(payrollPull.batch.employees, employeeId)
          || payrollPull.batch.employees[0];
        mergePlatformRowIntoState(state, match, filled, "payroll");
        if (payrollPull.batch.company) {
          fillEmpty(state, "companyName", payrollPull.batch.company.name);
          fillEmpty(state, "taxNumber", payrollPull.batch.company.taxNumber);
          fillEmpty(state, "vatId", payrollPull.batch.company.vatId);
        }
        persistRegistryFromState(state, companyId, "platform-payroll-pull");
        pull = { ok: true, source: "payroll-pull", ...payrollPull };
      } else if (!pull.ok) {
        pull = payrollPull;
      }
    }
  }

  hard = PC.validate(state);
  soft = PC.validatePrintHints?.(state) || [];
  const nextJob = rebuildJob(job, state);
  persistRegistryFromState(state, companyId, "enrich");

  // 4) Ask platform only for remaining employee gaps (never for branding/logo)
  let platformAsk = null;
  const shouldAsk = options.ask !== false && (hard.length > 0 || soft.length > 0);
  if (shouldAsk) {
    try {
      platformAsk = await notifyGapsForPayroll({
        state,
        hard,
        soft,
        jobId,
        companyName: state.companyName || nextJob.company?.name || "",
        forceNotify: options.forceNotify === true,
        requestEvent: true,
      });
      // If webhook body already contains the employee, merge immediately
      const inline = extractInlineReply(platformAsk?.platformNotify?.body);
      if (inline?.employees?.length) {
        const match = pickEmployeeRow(inline.employees, employeeId) || inline.employees[0];
        mergePlatformRowIntoState(state, match, filled, "webhook-inline");
        persistRegistryFromState(state, companyId, "webhook-inline");
        const rebuilt = rebuildJob(nextJob, state);
        hard = rebuilt.errors || [];
        soft = rebuilt.printHints || [];
        return {
          ok: true,
          job: rebuilt,
          filled,
          filledCount: filled.length,
          remainingHard: hard,
          remainingSoft: soft,
          stillMissing: [...hard, ...soft],
          pull,
          employeePull,
          branding,
          platformAsk,
          askedPlatform: true,
          message: `Daten aus Plattform-Antwort übernommen (${filled.length} Felder).`,
        };
      }
    } catch (e) {
      platformAsk = { ok: false, error: e.message };
    }
  }

  const filledCount = filled.length;
  const stillMissing = [...hard, ...soft];
  const pullDenied = Boolean(
    (employeePull?.attempts || []).some((a) => a.status === 401 || a.status === 403)
    || (pull?.attempts || []).some((a) => a.status === 401 || a.status === 403)
    || /unauthorized|invalid_api_key|401|403/i.test(String(employeePull?.error || pull?.error || ""))
  );
  const webhookOkNoData = Boolean(
    platformAsk?.platformNotify?.ok
    && stillMissing.length
    && !extractInlineReply(platformAsk?.platformNotify?.body)?.employees?.length
  );
  let message = filledCount && !stillMissing.length
    ? `Daten von Plattform/Vertrag/Register übernommen (${filledCount} Felder). Abrechnung bereit.`
    : filledCount
      ? `Teilweise ergänzt (${filledCount} Felder). Noch offen: ${stillMissing.slice(0, 4).join(" · ")}`
      : stillMissing.length
        ? (pull.ok === false && employeePull.ok === false
          ? `Plattform-GET ohne Treffer – fehlende Felder nachgefragt.`
          : `Noch fehlend: ${stillMissing.slice(0, 4).join(" · ")}`)
        : "Stammdaten vollständig.";

  if (stillMissing.length && (pullDenied || webhookOkNoData)) {
    message = pullDenied
      ? "Plattform blockiert den Datenabruf (401). Bitte WORKPASS_API_KEY / WORKPASS_PLATFORM_API_KEY freigeben für GET /api/contracts und /api/v1/company – oder Stammdaten per POST /v1/payroll/batch senden."
      : "Plattform hat die Anfrage bestätigt, sendet aber keine Mitarbeiterdaten. Bitte Vertrag/Stammdaten an die Buchhaltung pushen: POST /v1/employees/import und POST /v1/payroll/batch.";
  }

  const result = {
    ok: true,
    job: nextJob,
    filled,
    filledCount,
    remainingHard: hard,
    remainingSoft: soft,
    stillMissing,
    pull,
    employeePull,
    branding,
    platformAsk,
    askedPlatform: Boolean(platformAsk && (platformAsk.created || platformAsk.notified || platformAsk.ok)),
    platformBlocked: Boolean(pullDenied || webhookOkNoData),
    platformBlockedReason: pullDenied
      ? "pull_unauthorized"
      : (webhookOkNoData ? "webhook_ok_no_payload" : null),
    message,
  };
  lastEnrichStatus = {
    at: new Date().toISOString(),
    jobId,
    companyId,
    employeeId,
    filledCount,
    stillMissing,
    platformBlocked: result.platformBlocked,
    platformBlockedReason: result.platformBlockedReason,
    employeePullOk: employeePull?.ok === true,
    brandingPulled: branding?.pulled === true,
    message,
  };
  return result;
}
