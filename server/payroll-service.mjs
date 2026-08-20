/**
 * Platform payroll ingest → calculate → payslip.v1
 * Isolation key: company.id (never company name alone)
 */
import { getPayrollCore } from "./engine.mjs";
import { loadPayrollJob, savePayrollJob, listPayrollJobs } from "./store.mjs";
import { GobdImmutableError } from "./gobd/revisions.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "./notify.mjs";
import { enqueueDelivery, ackDelivery, markDeliveryWebhook, getDelivery } from "./delivery-queue.mjs";
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
  const correction = options.correction && typeof options.correction === "object"
    ? options.correction
    : null;
  // Never mark released here – delivery must go through releasePayrollJob (enqueue + webhook).
  const job = {
    jobId: id,
    kind: "platform.payroll.job.v1",
    demo: isDemo,
    status,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    releasedAt: correction ? null : (prev?.releasedAt || null),
    revisionNo: prev?.revisionNo || 1,
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

  try {
    savePayrollJob(job, {
      correction: correction || undefined,
      actor: options.actor || correction?.actor || "api",
      source: options.source || correction?.source || "api",
      correlationId: options.correlationId || correction?.correlationId || id,
    });
  } catch (e) {
    if (e instanceof GobdImmutableError || e?.code === "immutable_document") {
      return {
        ok: false,
        code: e.code || "immutable_document",
        errors: [e.message],
        detail: e.detail || null,
        job: prev,
        payslip: prev?.payslip || null,
        immutable: true,
      };
    }
    throw e;
  }

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
      period: r.job?.period || period,
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
  if (alreadyReleased && !options.forceRedeliver) {
    const existing = getDelivery(`pay:${job.jobId}`);
    return {
      ok: true,
      job,
      payslip: job.payslip,
      delivery: existing || null,
      platformNotify: null,
      alreadyReleased: true,
      skippedNotify: true,
      deliveredViaWebhook: Boolean(existing?.webhookAccepted || existing?.queueStatus === "delivered"),
      webhookReached: Boolean(existing?.webhookReached || existing?.webhookPushedAt),
      pendingPull: !(existing?.webhookAccepted || existing?.queueStatus === "delivered"),
      message: "Bereits freigegeben – kein erneuter Webhook (einmalige Zustellung).",
    };
  }

  if (!alreadyReleased || options.forceRedeliver) {
    job.status = "released";
    job.releasedAt = job.releasedAt || new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    if (job.payslip) {
      job.payslip.status = "released";
      job.payslip.releasedAt = job.releasedAt;
    }
    savePayrollJob(job, { actor: options.actor || "user", source: options.source || "user", forceStatus: true });
  }

  const delivery = buildEmployeeDelivery("payroll", { ...job, locale: options.locale || options.language || job.locale });
  if (!delivery) {
    return { ok: false, error: "Delivery konnte nicht gebaut werden", job };
  }

  // Preserve prior push markers unless force redeliver
  const prev = getDelivery(delivery.deliveryId);
  if (options.forceRedeliver) {
    delivery.webhookPushedAt = null;
    delivery.webhookReached = false;
    delivery.webhookAccepted = false;
    delivery.webhookPushCount = 0;
  } else if (prev?.webhookPushedAt) {
    delivery.webhookPushedAt = prev.webhookPushedAt;
    delivery.webhookReached = prev.webhookReached;
    delivery.webhookPushCount = prev.webhookPushCount;
    delivery.webhookAccepted = prev.webhookAccepted;
  }

  delivery.queueStatus = "pending";
  delivery.enqueuedAt = delivery.enqueuedAt || prev?.enqueuedAt || new Date().toISOString();
  enqueueDelivery(delivery);

  // Already pushed successfully once → do not POST webhook again
  if (delivery.webhookPushedAt && !options.forceRedeliver) {
    return {
      ok: true,
      job,
      payslip: job.payslip,
      delivery,
      platformNotify: null,
      alreadyReleased: true,
      skippedNotify: true,
      deliveredViaWebhook: Boolean(delivery.webhookAccepted),
      webhookReached: true,
      pendingPull: !delivery.webhookAccepted,
      message: "Bereits an Plattform gesendet – warte auf Bestätigung / Pull (kein erneuter Webhook).",
    };
  }

  const platformNotify = await notifyPlatform({
    event: "payslip.released",
    delivery,
    company: job.company,
    locale: options.locale || options.language || delivery.locale || "de",
    idempotencyKey: delivery.deliveryId,
    meta: {
      reason: options.reason || (alreadyReleased ? "redeliver" : "release"),
      forceRedeliver: Boolean(options.forceRedeliver),
      locale: options.locale || delivery.locale || "de",
    },
  });

  const webhookReached = Boolean(platformNotify?.ok && platformNotify.mode === "webhook");
  const deliveredConfirmed = Boolean(webhookReached && platformNotify.accepted === true);

  try {
    markDeliveryWebhook(delivery.deliveryId, {
      at: new Date().toISOString(),
      status: platformNotify?.status ?? null,
      error: platformNotify?.ok ? null : (platformNotify?.error || null),
      accepted: deliveredConfirmed,
      reached: webhookReached,
      idempotencyKey: platformNotify?.idempotencyKey || delivery.deliveryId,
    });
  } catch { /* ignore */ }

  if (deliveredConfirmed) {
    try {
      ackDelivery(delivery.deliveryId, {
        via: "webhook-accepted",
        at: new Date().toISOString(),
        status: platformNotify.status,
        body: platformNotify.body || null,
      });
    } catch { /* keep pending for pull */ }
  }

  return {
    ok: true,
    job,
    payslip: job.payslip,
    delivery: getDelivery(delivery.deliveryId) || delivery,
    platformNotify,
    alreadyReleased,
    deliveredViaWebhook: deliveredConfirmed,
    webhookReached,
    pendingPull: !deliveredConfirmed,
    message: deliveredConfirmed
      ? "Freigegeben und von der Plattform bestätigt (accepted)."
      : (webhookReached
        ? "Freigegeben und einmal an Webhook gesendet – kein Auto-Resend. Plattform bestätigt oder pollt /v1/delivery/pending."
        : (platformNotify?.ok
          ? "Freigegeben. Kein Webhook – Plattform muss /v1/delivery/pending pollen."
          : `Freigegeben, aber Webhook fehlgeschlagen (${platformNotify?.status || platformNotify?.error || "Fehler"}). Begrenzter Retry mit Backoff.`)),
  };
}

/** Re-push released payslips only if not yet webhook-pushed (unless force). */
export async function deliverReleasedPayslips(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.tenantScope || "");
  const period = String(options.period || "").trim();
  if (!companyId) return { ok: false, error: "companyId fehlt", results: [] };
  const jobs = listPayrollJobs({ companyId, period: period || undefined })
    .filter((j) => j && j.status === "released" && !j.demo);
  const force = Boolean(options.force);
  const results = [];
  let delivered = 0;
  let skipped = 0;
  for (const job of jobs) {
    try {
      const existing = getDelivery(`pay:${job.jobId}`);
      const alreadyPushed = Boolean(existing?.webhookPushedAt || existing?.webhookReached);
      if (alreadyPushed && !force) {
        skipped += 1;
        results.push({
          jobId: job.jobId,
          ok: true,
          skippedNotify: true,
          deliveredViaWebhook: Boolean(existing?.webhookAccepted),
          pendingPull: !existing?.webhookAccepted,
        });
        continue;
      }
      const r = await releasePayrollJob(job.jobId, {
        tenantScope: companyId,
        forceRedeliver: force || !alreadyPushed,
        reason: options.reason || "deliver_period",
      });
      if (r.ok && r.deliveredViaWebhook) delivered += 1;
      results.push({
        jobId: job.jobId,
        ok: Boolean(r.ok),
        deliveredViaWebhook: Boolean(r.deliveredViaWebhook),
        skippedNotify: Boolean(r.skippedNotify),
        error: r.error || null,
      });
    } catch (e) {
      results.push({ jobId: job.jobId, ok: false, error: e.message || String(e) });
    }
  }
  return {
    ok: results.every((r) => r.ok !== false),
    companyId,
    period: period || null,
    count: jobs.length,
    delivered,
    skipped,
    results,
    message: delivered
      ? `${delivered}/${jobs.length} Abrechnung(en) an die Plattform geliefert.`
      : (skipped
        ? `${skipped} bereits einmal gesendet – kein erneuter Webhook.`
        : "Freigegebene Abrechnungen in Warteschlange – Plattform pollt /v1/delivery/pending."),
  };
}

/**
 * Explicit correction of a released payslip (GoBD): archives original, writes new values, requires reason.
 * Does not auto-release – human must release again.
 */
export async function correctPayrollJob(jobId, options = {}) {
  const prev = loadPayrollJob(jobId);
  if (!prev) return { ok: false, status: 404, error: "Job nicht gefunden" };
  const scopeCheck = assertSameTenant(options.tenantScope, prev.company?.id, "Payroll-Korrektur");
  if (!scopeCheck.ok) return { ok: false, status: 403, error: scopeCheck.error };

  const reason = String(options.reason || "").trim();
  if (reason.length < 3) {
    return { ok: false, status: 422, error: "Korrekturgrund (reason) mindestens 3 Zeichen" };
  }

  const inbound = options.payload && typeof options.payload === "object"
    ? options.payload
    : (prev.inbound || {
      kind: "platform.payroll.v1",
      company: prev.company,
      employee: prev.employee,
      period: prev.period,
      state: options.state || prev.state,
    });

  // Allow amount/hours overrides on top of previous inbound
  if (options.state && typeof options.state === "object") {
    inbound.state = { ...(inbound.state || prev.state || {}), ...options.state };
  }
  if (options.hours != null) {
    inbound.attendance = {
      ...(inbound.attendance || {}),
      hours: options.hours,
    };
    inbound.state = { ...(inbound.state || prev.state || {}), hours: options.hours, workedHours: options.hours };
  }
  if (Array.isArray(options.wageItems)) {
    inbound.wageItems = options.wageItems;
  } else if (options.wageAmountDelta != null && Array.isArray(inbound.wageItems)) {
    inbound.wageItems = inbound.wageItems.map((w, i) => (
      i === 0
        ? { ...w, amount: Number(w.amount || 0) + Number(options.wageAmountDelta) }
        : w
    ));
  }
  if (!inbound.company) inbound.company = prev.company;
  if (!inbound.employee) inbound.employee = prev.employee;
  if (!inbound.period) inbound.period = prev.period;

  const result = await ingestPayroll(inbound, {
    jobId: prev.jobId,
    tenantScope: options.tenantScope || prev.company?.id,
    autoRelease: false,
    notifyGaps: options.notifyGaps !== false,
    actor: options.actor || "user",
    source: options.source || "user",
    correlationId: options.correlationId || `correct:${prev.jobId}:${Date.now()}`,
    correction: {
      reason,
      actor: options.actor || "user",
      source: options.source || "user",
      correlationId: options.correlationId || `correct:${prev.jobId}`,
    },
  });

  return {
    ...result,
    corrected: Boolean(result.ok && !result.immutable),
    previousStatus: prev.status,
    message: result.ok
      ? "Korrektur gespeichert. Original archiviert. Erneute Freigabe erforderlich."
      : (result.errors || []).join(" · "),
  };
}

export { payrollJobId as jobIdFrom, buildPayslip };
