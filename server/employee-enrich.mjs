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
import {
  pullPlatformPayrollBatch,
  resolvePlatformPullUrls,
} from "./month-close.mjs";
import {
  normalizeCompanyId,
  normalizeEmployeeId,
  assertSameTenant,
} from "./tenant.mjs";

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

function companyPatch(companyId) {
  const company = loadCompany(companyId);
  if (!company) return { filled: [], patch: {} };
  const hub = company.meta?.hubProfile && typeof company.meta.hubProfile === "object"
    ? company.meta.hubProfile
    : {};
  const patch = {
    companyName: pick(company.name, hub.companyName),
    taxNumber: pick(company.taxNumber, company.steuerNr, hub.taxNumber),
    vatId: pick(company.vatId, company.ustId, hub.vatId),
    datevClientNo: pick(company.datevClientNo, hub.datevClientNo),
    datevConsultantNo: pick(company.datevConsultantNo, hub.datevConsultantNo),
    seller: pick(hub.seller, company.address),
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

/**
 * Pull one employee (master + optional month wages) from platform endpoints.
 */
export async function pullPlatformEmployeeMaster({ companyId, period, employeeId } = {}) {
  const eid = normalizeEmployeeId(employeeId);
  if (!companyId || !eid) {
    return { ok: false, skipped: true, error: "companyId/employeeId fehlt" };
  }

  // Prefer payroll employee pull (may include contract + wages)
  const payrollPull = await pullPlatformPayrollBatch({
    companyId,
    period,
    employeeId: eid,
    maxAttempts: 4,
    timeoutMs: Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 8000),
  });
  if (payrollPull.ok && payrollPull.batch?.employees?.length) {
    const match = payrollPull.batch.employees.find((row) => {
      const id = normalizeEmployeeId(
        row?.employee?.badgeId || row?.employee?.id || row?.badgeId || row?.id || ""
      );
      return !id || id === eid;
    }) || payrollPull.batch.employees[0];
    return {
      ok: true,
      source: "payroll-pull",
      row: match,
      company: payrollPull.batch.company || null,
      pull: payrollPull,
    };
  }

  // Also try dedicated employee list/export URLs if configured via same host
  const urls = resolvePlatformPullUrls()
    .map((u) => u.replace(/\/payroll\/(export|pull).*$/i, "/employees/export"))
    .filter((u, i, arr) => u && arr.indexOf(u) === i);
  // If no dedicated URLs differ, skip – payroll pull already covered host candidates
  if (!urls.length || (payrollPull.attempts || []).length) {
    return {
      ok: false,
      skipped: false,
      error: payrollPull.error || "Plattform lieferte keine Mitarbeiterdaten",
      pull: payrollPull,
    };
  }

  return {
    ok: false,
    skipped: false,
    error: payrollPull.error || "Plattform lieferte keine Mitarbeiterdaten",
    pull: payrollPull,
  };
}

/**
 * Enrich job: local company + registry first, then platform pull, then ask only leftovers.
 */
export async function enrichPayrollJob(jobId, options = {}) {
  const job = loadPayrollJob(jobId);
  if (!job) return { ok: false, error: "Job nicht gefunden", job: null };

  const companyId = normalizeCompanyId(job.company?.id || job.state?.mandantId || "");
  const scopeCheck = assertSameTenant(options.tenantScope, companyId, "Payroll-Anreichern");
  if (!scopeCheck.ok) return { ok: false, error: scopeCheck.error, job: null };

  const state = { ...(job.state || {}) };
  state.meta = { ...(state.meta || {}), jobId, enrichedAt: new Date().toISOString() };
  const employeeId = normalizeEmployeeId(
    options.employeeId || state.badgeId || state.employeeId || job.employee?.badgeId || job.employee?.id || ""
  );
  const period = String(options.period || state.payrollMonth || job.period || "").trim();
  const filled = [];

  // 1) Company Stammdaten (Steuer-Nr., Name, …)
  const fromCompany = companyPatch(companyId);
  filled.push(...applyPatch(state, fromCompany.patch).map((k) => `company.${k}`));
  if (!String(state.seller || "").trim() && fromCompany.patch.seller) {
    fillEmpty(state, "seller", fromCompany.patch.seller);
  }

  // 2) Local employee registry (already imported contract data)
  const fromReg = registryPatch(companyId, employeeId);
  filled.push(...applyPatch(state, fromReg.patch).map((k) => `registry.${k}`));

  // 3) Platform pull – only if still missing soft/hard fields or forced
  const PC = getPayrollCore();
  let hard = PC.validate(state);
  let soft = PC.validatePrintHints?.(state) || [];
  let pull = { skipped: true };
  let platformRow = null;

  const needsPull = options.pull !== false && (hard.length > 0 || soft.length > 0 || options.forcePull);
  if (needsPull && employeeId) {
    pull = await pullPlatformEmployeeMaster({ companyId, period, employeeId });
    if (pull.ok && pull.row) {
      platformRow = pull.row;
      const mapped = employeeFromPlatformRow(pull.row);
      const patch = { ...mapped };
      delete patch.wageItems;
      delete patch.grossSalary;
      delete patch.workDays;
      delete patch.workHours;
      delete patch.companyTaxNumber;
      delete patch.companyVatId;
      delete patch.companyName;
      filled.push(...applyPatch(state, patch).map((k) => `platform.${k}`));

      if (mapped.companyTaxNumber) fillEmpty(state, "taxNumber", mapped.companyTaxNumber) && filled.push("platform.taxNumber");
      if (mapped.companyVatId) fillEmpty(state, "vatId", mapped.companyVatId) && filled.push("platform.vatId");
      if (mapped.companyName) fillEmpty(state, "companyName", mapped.companyName) && filled.push("platform.companyName");

      // Month wages / contract salary only if Brutto still empty
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
          filled.push("platform.wageItems");
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
          filled.push("platform.grossSalary");
        }
        if (mapped.workDays != null && mapped.workDays !== "") fillEmpty(state, "workDays", String(mapped.workDays));
        if (mapped.workHours != null && mapped.workHours !== "") fillEmpty(state, "workHours", String(mapped.workHours));
      }

      // Keep registry warm for next opens
      persistRegistryFromState(state, companyId, "platform-pull");
    }
  }

  hard = PC.validate(state);
  soft = PC.validatePrintHints?.(state) || [];
  const nextJob = rebuildJob(job, state);
  persistRegistryFromState(state, companyId, "enrich");

  // 4) Ask platform only for remaining gaps (not for data we already have)
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
    } catch (e) {
      platformAsk = { ok: false, error: e.message };
    }
  }

  const filledCount = filled.length;
  const stillMissing = [...hard, ...soft];
  return {
    ok: true,
    job: nextJob,
    filled,
    filledCount,
    remainingHard: hard,
    remainingSoft: soft,
    stillMissing,
    pull,
    platformAsk,
    askedPlatform: Boolean(platformAsk && (platformAsk.created || platformAsk.notified || platformAsk.ok)),
    message: filledCount && !stillMissing.length
      ? `Daten von Plattform/Register übernommen (${filledCount} Felder). Abrechnung bereit.`
      : filledCount
        ? `Teilweise ergänzt (${filledCount} Felder). Noch offen: ${stillMissing.slice(0, 4).join(" · ")}`
        : stillMissing.length
          ? (pull.ok === false
            ? `Lokal nichts Neues – Plattform nach fehlenden Daten gefragt.`
            : `Noch fehlend: ${stillMissing.slice(0, 4).join(" · ")}`)
          : "Stammdaten vollständig.",
  };
}
