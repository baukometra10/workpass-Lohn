/**
 * Platform payroll ingest → calculate → payslip.v1
 * Isolation key: company.id (never company name alone)
 */
import { getPayrollCore } from "./engine.mjs";
import { loadPayrollJob, savePayrollJob } from "./store.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "./notify.mjs";
import { enqueueDelivery } from "./delivery-queue.mjs";
import { ensureCompanyFromPayload } from "./company-service.mjs";
import { notifyGapsForPayroll } from "./platform-messages.mjs";
import {
  normalizeCompanyId,
  normalizeEmployeeId,
  payrollJobId,
  requireCompanyId,
  assertSameTenant,
} from "./tenant.mjs";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function buildPayslip(state, payroll, status, errors = []) {
  const companyId = normalizeCompanyId(state.mandantId || state.meta?.companyId || "");
  return {
    kind: "platform.payslip.v1",
    employee: {
      id: String(state.employeeId || ""),
      name: String(state.employeeName || ""),
      address: String(state.employeeAddress || ""),
      taxId: String(state.employeeTaxId || ""),
      insuranceNo: String(state.employeeInsuranceNo || ""),
      taxClass: String(state.taxClass || ""),
    },
    company: {
      id: companyId,
      name: String(state.companyName || ""),
      taxNumber: String(state.taxNumber || ""),
      vatId: String(state.vatId || ""),
      datevClientNo: String(state.datevClientNo || ""),
      datevConsultantNo: String(state.datevConsultantNo || ""),
    },
    period: String(state.payrollMonth || ""),
    status,
    errors: errors || [],
    calculatedAt: new Date().toISOString(),
    totals: {
      gross: round2(payroll.gross),
      net: round2(payroll.net),
      taxGross: round2(payroll.taxGross),
      svGross: round2(payroll.svGross),
      payrollTax: round2(payroll.payrollTax),
      churchTax: round2(payroll.churchTax),
      solidarity: round2(payroll.solidarity),
      health: round2(payroll.health),
      pension: round2(payroll.pension),
      care: round2(payroll.care),
      unemployment: round2(payroll.unemployment),
      svTotal: round2(payroll.svTotal),
      employerShare: round2(payroll.employerShare),
      employerPension: round2(payroll.employerPension),
      employerHealth: round2(payroll.employerHealth),
      employerCare: round2(payroll.employerCare),
      employerUnemployment: round2(payroll.employerUnemployment),
      umlageU1: round2(payroll.umlageU1),
      umlageU2: round2(payroll.umlageU2),
      umlageInsolvency: round2(payroll.umlageInsolvency),
      umlagenTotal: round2(payroll.umlagenTotal),
      employmentType: payroll.employmentType || "regular",
    },
    attendance: {
      days: Number(state.workDays) || 0,
      hours: Number(state.workHours) || 0,
    },
    wageItems: Array.isArray(state.wageItems) ? state.wageItems : [],
    bank: {
      name: String(state.bankName || ""),
      iban: String(state.bankIban || ""),
    },
    note: String(state.note || ""),
    legalRatesApplied: Boolean(payroll.legalRatesApplied),
  };
}

export async function ingestPayroll(payload, options = {}) {
  const companyCheck = requireCompanyId(payload);
  if (!companyCheck.ok) {
    return { ok: false, errors: [companyCheck.error], job: null, payslip: null };
  }

  const scope = options.tenantScope || "";
  const scopeCheck = assertSameTenant(scope, companyCheck.company.id, "Payroll-Payload");
  if (!scopeCheck.ok) {
    return { ok: false, errors: [scopeCheck.error], job: null, payslip: null };
  }

  ensureCompanyFromPayload(payload);

  const PC = getPayrollCore();
  const ingested = PC.ingestPlatformPayload(payload);
  if (!ingested?.state) {
    return {
      ok: false,
      errors: ingested?.errors || ["Ingest fehlgeschlagen"],
      job: null,
      payslip: null,
    };
  }

  const state = ingested.state;
  const companyId = normalizeCompanyId(state.mandantId || state.meta?.companyId || companyCheck.company.id);
  state.mandantId = companyId;
  state.meta = { ...(state.meta || {}), companyId };

  const hard = [...(ingested.errors || []), ...PC.validate(state)];
  if (!companyId) hard.push("Firma-ID (company.id) fehlt");
  const soft = PC.validatePrintHints?.(state) || [];

  const payroll = PC.calculate(state);
  const employeeId = normalizeEmployeeId(state.employeeId);
  const id = options.jobId || payrollJobId(companyId, employeeId, state.payrollMonth);
  const status = hard.length ? "error" : "calculated";
  const payslip = buildPayslip(state, payroll, status, hard);
  payslip.jobId = id;

  const now = new Date().toISOString();
  const prev = loadPayrollJob(id);
  const job = {
    jobId: id,
    kind: "platform.payroll.job.v1",
    status: status === "error" ? "error" : (options.autoRelease && !hard.length ? "released" : "calculated"),
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    releasedAt: options.autoRelease && !hard.length ? now : (prev?.releasedAt || null),
    company: {
      id: companyId,
      name: payslip.company.name,
      taxNumber: payslip.company.taxNumber,
      vatId: payslip.company.vatId,
    },
    employee: {
      id: payslip.employee.id,
      name: payslip.employee.name,
    },
    period: payslip.period,
    inbound: payload,
    state,
    payroll: payslip.totals,
    payslip: { ...payslip, status: options.autoRelease && !hard.length ? "released" : payslip.status },
    errors: hard,
    printHints: soft,
  };

  if (job.status === "released") {
    job.payslip.status = "released";
  }

  savePayrollJob(job);

  let platformMessages = null;
  if (options.notifyGaps !== false) {
    try {
      platformMessages = await notifyGapsForPayroll({
        state,
        hard,
        soft,
        jobId: id,
        companyName: payslip.company.name,
      });
    } catch (e) {
      platformMessages = { ok: false, error: e.message };
    }
  }

  return {
    ok: hard.length === 0,
    errors: hard,
    printHints: soft,
    job,
    payslip: job.payslip,
    platformMessages,
  };
}

export async function ingestPayrollBatch(batch, options = {}) {
  if (!batch || typeof batch !== "object") {
    return { ok: false, errors: ["Batch-Nutzlast fehlt"], results: [] };
  }
  const companyCheck = requireCompanyId(batch);
  if (!companyCheck.ok) {
    return { ok: false, errors: [companyCheck.error], results: [] };
  }
  const scopeCheck = assertSameTenant(options.tenantScope, companyCheck.company.id, "Batch");
  if (!scopeCheck.ok) {
    return { ok: false, errors: [scopeCheck.error], results: [] };
  }

  const company = batch.company || {};
  const period = batch.period || "";
  const list = Array.isArray(batch.employees) ? batch.employees
    : (Array.isArray(batch.items) ? batch.items : []);
  if (!list.length) {
    return { ok: false, errors: ["Keine employees[] im Batch"], results: [] };
  }

  ensureCompanyFromPayload(batch);

  const results = [];
  for (const empPayload of list) {
    const one = {
      kind: "platform.payroll.v1",
      company: empPayload.company || company,
      period: empPayload.period || period,
      employee: empPayload.employee || empPayload,
      attendance: empPayload.attendance,
      wageItems: empPayload.wageItems,
      bank: empPayload.bank,
      note: empPayload.note || batch.note,
      totals: empPayload.totals,
    };
    if (!one.employee?.id && empPayload.id) {
      one.employee = {
        id: empPayload.id,
        name: empPayload.name,
        ...empPayload,
      };
    }
    results.push(await ingestPayroll(one, {
      tenantScope: options.tenantScope,
      notifyGaps: options.notifyGaps,
      autoRelease: options.autoRelease,
    }));
  }

  const ok = results.every((r) => r.ok);
  return {
    ok,
    kind: "platform.payroll.batch.result.v1",
    period,
    company: {
      id: companyCheck.company.id,
      name: company.name || company.companyName || "",
    },
    count: results.length,
    results: results.map((r) => ({
      ok: r.ok,
      errors: r.errors,
      printHints: r.printHints,
      jobId: r.job?.jobId,
      payslip: r.payslip,
      messages: r.platformMessages?.messages?.map((m) => m.messageId) || [],
    })),
  };
}

export async function releasePayrollJob(jobId, options = {}) {
  const PC = getPayrollCore();
  const job = loadPayrollJob(jobId);
  if (!job) return { ok: false, error: "Job nicht gefunden", job: null };

  const scopeCheck = assertSameTenant(options.tenantScope, job.company?.id, "Payroll-Job");
  if (!scopeCheck.ok) return { ok: false, error: scopeCheck.error, job: null };

  if (job.status === "error") {
    return { ok: false, error: "Job hat Fehler – nicht freigabefähig", job };
  }
  const errors = PC.validate(job.state || {});
  if (errors.length) {
    return { ok: false, error: errors.join(" · "), job };
  }
  job.status = "released";
  job.releasedAt = new Date().toISOString();
  job.updatedAt = job.releasedAt;
  if (job.payslip) {
    job.payslip.status = "released";
    job.payslip.releasedAt = job.releasedAt;
  }
  savePayrollJob(job);

  const delivery = buildEmployeeDelivery("payroll", job);
  enqueueDelivery(delivery);
  const platformNotify = await notifyPlatform({ event: "payslip.released", delivery });

  return {
    ok: true,
    job,
    payslip: job.payslip,
    delivery,
    platformNotify,
    message: "Freigegeben. Plattform stellt dem Mitarbeiter die Abrechnung zu.",
  };
}

export { payrollJobId as jobIdFrom, buildPayslip };
