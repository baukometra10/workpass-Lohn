/**
 * Platform payroll ingest → calculate → payslip.v1
 * Isolation key: company.id (never company name alone)
 */
import { getPayrollCore } from "./engine.mjs";
import { loadPayrollJob, savePayrollJob, listPayrollJobs } from "./store.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "./notify.mjs";
import { enqueueDelivery, ackDelivery } from "./delivery-queue.mjs";
import { ensureCompanyFromPayload } from "./company-service.mjs";
import { notifyGapsForPayroll } from "./platform-messages.mjs";
import { upsertEmployee } from "./employee-registry.mjs";
import { normalizeEmployeeRecord } from "./employee-normalize.mjs";
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
      id: String(state.employeeId || state.badgeId || ""),
      badgeId: String(state.badgeId || state.meta?.badgeId || state.employeeId || ""),
      name: String(state.employeeName || ""),
      address: String(state.employeeAddress || ""),
      taxId: String(state.employeeTaxId || ""),
      insuranceNo: String(state.employeeInsuranceNo || ""),
      taxClass: String(state.taxClass || ""),
      // personnelNumber may appear on slip; badgeId must not
      personnelNumber: String(state.personnelNumber || state.meta?.personnelNumber || ""),
      printPersNr: String(state.personnelNumber || state.meta?.personnelNumber || ""),
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

  // Enrich employee master data (names from first/last, address, …) before core ingest
  const rawEmp = payload.employee && typeof payload.employee === "object"
    ? payload.employee
    : payload;
  const normEmp = normalizeEmployeeRecord(rawEmp);
  if (normEmp.badgeId || normEmp.name) {
    payload = {
      ...payload,
      employee: {
        ...(typeof payload.employee === "object" ? payload.employee : {}),
        ...normEmp,
        id: normEmp.badgeId || payload.employee?.id,
        badgeId: normEmp.badgeId || payload.employee?.badgeId,
        name: normEmp.name || payload.employee?.name || "",
        employeeName: normEmp.name || payload.employee?.employeeName || "",
        address: normEmp.address || payload.employee?.address || "",
        personnelNumber: normEmp.personnelNumber || payload.employee?.personnelNumber || "",
      },
    };
  }

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
  const isDemo = Boolean(
    options.demo
    || payload?.demo
    || payload?.meta?.demo
    || /demo-batch|ohne echte plattform/i.test(String(payload?.note || ""))
  );
  state.mandantId = companyId;
  if (!String(state.companyName || "").trim() && companyCheck.company?.name) {
    state.companyName = companyCheck.company.name;
  }
  if (!String(state.seller || "").trim() && String(state.companyName || "").trim()) {
    state.seller = state.companyName;
  }
  state.meta = {
    ...(state.meta || {}),
    companyId,
    ...(isDemo ? { demo: true, source: "demo-seed" } : {}),
  };
  if (!isDemo && (state.badgeId || state.employeeId)) {
    try {
      const reg = upsertEmployee({
        companyId,
        badgeId: state.badgeId || state.employeeId,
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
        source: "payroll-ingest",
      });
      if (!String(state.personnelNumber || "").trim() && reg.employee?.personnelNumber) {
        state.personnelNumber = reg.employee.personnelNumber;
        state.meta = {
          ...(state.meta || {}),
          personnelNumberAuto: reg.personnelNumberAuto === true,
        };
      }
    } catch { /* ignore registry errors */ }
  }

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
  // Never mark released here – delivery must go through releasePayrollJob (enqueue + webhook).
  const job = {
    jobId: id,
    kind: "platform.payroll.job.v1",
    demo: isDemo,
    status,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    releasedAt: prev?.releasedAt || null,
    company: {
      id: companyId,
      name: payslip.company.name,
      taxNumber: payslip.company.taxNumber,
      vatId: payslip.company.vatId,
    },
    employee: {
      id: payslip.employee.id,
      name: payslip.employee.name,
      badgeId: payslip.employee.badgeId || payslip.employee.id,
    },
    period: payslip.period,
    inbound: payload,
    state,
    payroll: payslip.totals,
    payslip: { ...payslip, status },
    errors: hard,
    printHints: soft,
  };

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

  let release = null;
  if (options.autoRelease && hard.length === 0) {
    try {
      release = await releasePayrollJob(id, {
        tenantScope: options.tenantScope || companyId,
      });
    } catch (e) {
      release = { ok: false, error: e.message || String(e) };
    }
  }

  return {
    ok: hard.length === 0,
    errors: hard,
    printHints: soft,
    job: release?.job || job,
    payslip: release?.payslip || job.payslip,
    platformMessages,
    released: Boolean(release?.ok),
    delivery: release?.delivery || null,
    platformNotify: release?.platformNotify || null,
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
    const flat = normalizeEmployeeRecord(empPayload.employee || empPayload);
    const one = {
      kind: "platform.payroll.v1",
      company: empPayload.company || company,
      period: empPayload.period || period,
      employee: {
        ...(empPayload.employee && typeof empPayload.employee === "object" ? empPayload.employee : {}),
        ...flat,
        id: flat.badgeId || empPayload.id,
        badgeId: flat.badgeId,
        name: flat.name,
        employeeName: flat.name,
      },
      attendance: empPayload.attendance,
      wageItems: empPayload.wageItems,
      bank: empPayload.bank,
      note: empPayload.note || batch.note,
      totals: empPayload.totals,
    };
    if (!one.employee?.id && empPayload.id) {
      one.employee = {
        ...one.employee,
        id: empPayload.id,
        name: flat.name || empPayload.name,
        ...empPayload,
      };
    }
    results.push(await ingestPayroll(one, {
      tenantScope: options.tenantScope,
      notifyGaps: options.notifyGaps,
      autoRelease: options.autoRelease,
      demo: Boolean(options.demo || batch.demo || batch.meta?.demo),
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

  const alreadyReleased = job.status === "released";
  if (!alreadyReleased || options.forceRedeliver) {
    job.status = "released";
    job.releasedAt = job.releasedAt || new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    if (job.payslip) {
      job.payslip.status = "released";
      job.payslip.releasedAt = job.releasedAt;
    }
    savePayrollJob(job);
  }

  const delivery = buildEmployeeDelivery("payroll", job);
  if (!delivery) {
    return { ok: false, error: "Delivery konnte nicht gebaut werden", job };
  }
  // Reset to pending so replay / platform pull see a fresh package
  delivery.queueStatus = "pending";
  delivery.enqueuedAt = new Date().toISOString();
  enqueueDelivery(delivery);
  const platformNotify = await notifyPlatform({
    event: "payslip.released",
    delivery,
    company: job.company,
    meta: {
      reason: options.reason || (alreadyReleased ? "redeliver" : "release"),
      forceRedeliver: Boolean(options.forceRedeliver),
    },
  });

  if (platformNotify?.ok && platformNotify.mode === "webhook") {
    try {
      ackDelivery(delivery.deliveryId, {
        via: "webhook-push",
        at: new Date().toISOString(),
        status: platformNotify.status,
      });
    } catch { /* keep pending for pull */ }
  }

  return {
    ok: true,
    job,
    payslip: job.payslip,
    delivery,
    platformNotify,
    alreadyReleased,
    deliveredViaWebhook: Boolean(platformNotify?.ok && platformNotify.mode === "webhook"),
    message: platformNotify?.ok && platformNotify.mode === "webhook"
      ? "Freigegeben und an die Plattform geliefert."
      : (platformNotify?.ok
        ? "Freigegeben. Kein Webhook – Plattform holt über /v1/delivery/pending."
        : "Freigegeben und in Lieferwarteschlange – Webhook fehlgeschlagen, erneuter Versuch läuft automatisch."),
  };
}

/** Re-push all released payslips for a company/period to the platform. */
export async function deliverReleasedPayslips(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.tenantScope || "");
  const period = String(options.period || "").trim();
  if (!companyId) return { ok: false, error: "companyId fehlt", results: [] };
  const jobs = listPayrollJobs({ companyId, period: period || undefined })
    .filter((j) => j && j.status === "released" && !j.demo);
  const results = [];
  let delivered = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const r = await releasePayrollJob(job.jobId, {
        tenantScope: companyId,
        forceRedeliver: true,
        reason: options.reason || "deliver_period",
      });
      if (r.ok && r.deliveredViaWebhook) delivered += 1;
      else if (!r.ok) failed += 1;
      results.push({
        jobId: job.jobId,
        ok: Boolean(r.ok),
        deliveredViaWebhook: Boolean(r.deliveredViaWebhook),
        error: r.error || null,
        notifyMode: r.platformNotify?.mode || null,
      });
    } catch (e) {
      failed += 1;
      results.push({ jobId: job.jobId, ok: false, error: e.message || String(e) });
    }
  }
  return {
    ok: failed === 0,
    companyId,
    period: period || null,
    count: jobs.length,
    delivered,
    failed,
    results,
    message: delivered
      ? `${delivered}/${jobs.length} Abrechnung(en) an die Plattform geliefert.`
      : (jobs.length
        ? "Freigegebene Abrechnungen in Warteschlange – Webhook prüfen oder Plattform pollt /v1/delivery/pending."
        : "Keine freigegebenen Abrechnungen in diesem Monat."),
  };
}

export { payrollJobId as jobIdFrom, buildPayslip };
