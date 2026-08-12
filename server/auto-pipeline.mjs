/**
 * WorkPass Steuerprogramm auto-pipeline:
 * 1) Ask platform for employees + month payroll + invoices
 * 2) When platform pushes data → calculate/ingest + release automatically
 *
 * Env:
 *   WORKPASS_AUTO_PIPELINE=1          (default ON; set 0 to disable)
 *   WORKPASS_AUTO_PIPELINE_MINUTES=15 (poll / ask interval)
 *   WORKPASS_AUTO_RELEASE=1           (default ON: release on inbound batch)
 */
import { listCompanies, listPayrollJobs, listInvoiceJobs } from "./db/repository.mjs";
import { notifyPlatform, getLastWebhookStatus, probePlatformWebhook } from "./notify.mjs";
import { listEmployees } from "./employee-registry.mjs";
import {
  runMonthClose,
  currentPeriod,
  pullPlatformPayrollBatch,
  requestEmployeeDataFromPlatform,
} from "./month-close.mjs";
import { ingestPayroll, ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { ingestInvoice, ingestInvoiceBatch, releaseInvoiceJob } from "./invoice-service.mjs";
import { upsertPlatformMessage, ackOpenRequests } from "./platform-messages.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { listAutomationCompanies } from "./automation-eligibility.mjs";
import { recordCompanyAutomation } from "./automation-status.mjs";

let timer = null;
let lastTickAt = null;
let lastResult = null;
let lastSuccessAt = null;
const companySyncState = new Map(); // companyId -> { period, askedAt, invoiceAskedAt, successAt, released }

export function autoPipelineConfig() {
  const disabled = process.env.WORKPASS_AUTO_PIPELINE === "0"
    || process.env.WORKPASS_AUTO_PIPELINE === "false";
  return {
    enabled: !disabled,
    intervalMinutes: Math.max(2, Number(process.env.WORKPASS_AUTO_PIPELINE_MINUTES || 15)),
    autoRelease: process.env.WORKPASS_AUTO_RELEASE !== "0",
    pull: process.env.WORKPASS_AUTO_PIPELINE_PULL !== "0",
    /** Minutes before re-asking platform when still waiting (default 30) */
    reaskMinutes: Math.max(5, Number(process.env.WORKPASS_AUTO_REASK_MINUTES || 30)),
  };
}

export function autoPipelineStatus() {
  const cfg = autoPipelineConfig();
  return {
    ...cfg,
    running: Boolean(timer),
    lastTickAt,
    lastSuccessAt,
    lastResult,
  };
}

function monthProgress(companyId, period) {
  const jobs = listPayrollJobs({ companyId, period }).filter((j) => !isDemoPayrollJob(j));
  const released = jobs.filter((j) => j.status === "released").length;
  const calculated = jobs.filter((j) => j.status === "calculated").length;
  const error = jobs.filter((j) => j.status === "error").length;
  const employees = listEmployees(companyId).length;
  return {
    jobs: jobs.length,
    released,
    calculated,
    error,
    employees,
    complete: jobs.length > 0 && released === jobs.length && error === 0,
    hasWork: jobs.length > 0,
  };
}

function invoiceProgress(companyId) {
  const jobs = listInvoiceJobs({ companyId });
  const released = jobs.filter((j) => j.status === "released").length;
  const received = jobs.filter((j) => j.status === "received").length;
  const error = jobs.filter((j) => j.status === "error").length;
  return {
    jobs: jobs.length,
    released,
    received,
    error,
    hasWork: jobs.length > 0,
    pendingRelease: received,
  };
}

/**
 * After platform pushes a single invoice: ingest + auto-release if ready.
 */
export async function processInboundInvoice(payload, options = {}) {
  const cfg = autoPipelineConfig();
  const autoRelease = options.autoRelease !== undefined
    ? options.autoRelease
    : cfg.autoRelease;

  const ingest = ingestInvoice(payload, {
    tenantScope: options.tenantScope,
  });

  let release = null;
  if (autoRelease && ingest.ok && ingest.job?.id) {
    release = await releaseInvoiceJob(ingest.job.id, {
      tenantScope: options.tenantScope || ingest.job.company?.id,
    });
  }

  const companyId = ingest.job?.company?.id || normalizeCompanyId(payload?.company?.id || "");
  const period = ingest.job?.period || payload?.period || "";
  if (companyId && (ingest.ok || release?.ok)) {
    ackOpenRequests({
      companyId,
      period: period || undefined,
      types: ["invoices.export.requested"],
      meta: { reason: "invoice_ingest", readBy: "accounting-auto" },
    });
    if (release?.ok) {
      lastSuccessAt = new Date().toISOString();
      const prev = companySyncState.get(companyId) || {};
      companySyncState.set(companyId, {
        ...prev,
        period: period || prev.period,
        successAt: lastSuccessAt,
        invoiceReleased: (prev.invoiceReleased || 0) + 1,
      });
    }
  }

  return {
    ...ingest,
    auto: true,
    autoRelease,
    released: Boolean(release?.ok),
    delivery: release?.delivery || null,
    platformNotify: release?.platformNotify || null,
    message: release?.ok
      ? "Auto: Rechnung übernommen und an die Plattform freigegeben."
      : (ingest.ok
        ? "Auto: Rechnung übernommen – Freigabe wartete oder war deaktiviert."
        : (ingest.errors?.join?.(" · ") || "Invoice-Ingest fehlgeschlagen")),
  };
}

/**
 * After platform pushes an invoice batch: ingest + auto-release.
 */
export async function processInboundInvoiceBatch(batch, options = {}) {
  const cfg = autoPipelineConfig();
  const autoRelease = options.autoRelease !== undefined
    ? options.autoRelease
    : cfg.autoRelease;

  const ingest = ingestInvoiceBatch(batch, {
    tenantScope: options.tenantScope,
  });

  const released = [];
  const releaseErrors = [];
  if (autoRelease && ingest.count > 0) {
    for (const row of ingest.results || []) {
      if (!row.ok || !row.id) continue;
      try {
        const r = await releaseInvoiceJob(row.id, {
          tenantScope: options.tenantScope || ingest.company?.id,
        });
        if (r.ok) {
          released.push({
            id: row.id,
            number: row.number,
            deliveryId: r.delivery?.deliveryId,
            gross: r.job?.draft?.totals?.gross,
          });
        } else {
          releaseErrors.push({ id: row.id, error: r.error });
        }
      } catch (e) {
        releaseErrors.push({ id: row.id, error: e.message });
      }
    }
  }

  const companyId = ingest.company?.id || normalizeCompanyId(batch?.company?.id || "");
  const period = ingest.period || batch?.period || "";
  if (companyId && ingest.count > 0) {
    ackOpenRequests({
      companyId,
      period: period || undefined,
      types: ["invoices.export.requested"],
      meta: { reason: "invoice_batch", readBy: "accounting-auto" },
    });
  }
  if (companyId && options.notify !== false) {
    await notifyPlatform({
      event: released.length ? "invoices.auto.processed" : "invoice.batch.received",
      company: ingest.company || { id: companyId },
      meta: {
        period,
        ingested: ingest.count,
        released: released.length,
        gaps: (ingest.results || []).filter((r) => !r.ok).length,
        auto: true,
      },
      idempotencyKey: `auto-inv-batch:${companyId}:${period || "x"}:${Date.now()}`,
    });
  }
  if (released.length) {
    lastSuccessAt = new Date().toISOString();
    const prev = companySyncState.get(companyId) || {};
    companySyncState.set(companyId, {
      ...prev,
      period: period || prev.period,
      successAt: lastSuccessAt,
      invoiceReleased: released.length,
    });
  }

  return {
    ...ingest,
    auto: true,
    autoRelease,
    released,
    releaseErrors,
    releasedCount: released.length,
    message: ingest.count
      ? `Auto: ${ingest.count} Rechnung(en) übernommen, ${released.length} freigegeben`
        + (releaseErrors.length ? `, ${releaseErrors.length} Fehler` : "")
        + "."
      : (ingest.errors?.join?.(" · ") || "Keine Rechnungen im Batch"),
  };
}

async function releasePendingInvoices(companyId, options = {}) {
  const cfg = autoPipelineConfig();
  const autoRelease = options.autoRelease !== undefined ? options.autoRelease : cfg.autoRelease;
  if (!autoRelease) return { releasedCount: 0, items: [] };
  const pending = listInvoiceJobs({ companyId, status: "received" });
  const items = [];
  for (const job of pending) {
    try {
      const r = await releaseInvoiceJob(job.id, { tenantScope: companyId });
      if (r.ok) items.push({ id: job.id, number: job.draft?.number });
    } catch { /* continue */ }
  }
  return { releasedCount: items.length, items };
}

async function askPlatformForInvoices(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.company?.id || "");
  if (!companyId) return { ok: false, skipped: true, error: "companyId fehlt" };
  const period = String(options.period || currentPeriod()).trim();
  const company = {
    id: companyId,
    name: options.companyName || options.company?.name || "",
  };
  const cfg = autoPipelineConfig();
  const forceAsk = options.forceAsk === true;
  const prev = companySyncState.get(companyId);
  const reaskMs = cfg.reaskMinutes * 60_000;
  const recentlyAsked = prev?.invoiceAskedAt
    && (Date.now() - new Date(prev.invoiceAskedAt).getTime()) < reaskMs;
  const shouldAsk = options.notify !== false && (forceAsk || !recentlyAsked);

  const release = await releasePendingInvoices(companyId, options);
  let invoiceNotify = { skipped: true };
  let invoiceMessage = null;

  if (shouldAsk) {
    companySyncState.set(companyId, {
      ...(prev || {}),
      period,
      invoiceAskedAt: new Date().toISOString(),
    });
    try {
      const invMsg = await upsertPlatformMessage({
        type: "invoices.export.requested",
        severity: "action_needed",
        company,
        period,
        code: "invoices_export_requested",
        dedupeKey: `invoices.export.requested::${companyId}::${period}`,
        title: `Rechnungen anfordern · ${period}`,
        body:
          `WorkPass Steuerprogramm braucht offene/exportierte Rechnungen für ${period}.\n\n`
          + `Bitte senden: POST ${process.env.WORKPASS_PUBLIC_URL || "https://workpass-lohn.up.railway.app"}/v1/invoice/batch\n`
          + `Body: { "kind": "platform.invoice.batch.v1", "company": { "id": "${companyId}" }, "period": "${period}", "invoices": [...] }\n`
          + `Einzelrechnung: POST /v1/invoice/ingest`,
        gaps: [{
          code: "invoices_export_requested",
          field: "invoices",
          label: "Rechnungen fehlen / Export ausstehend",
          severity: "action_needed",
        }],
        source: "auto-pipeline",
      }, { notify: false, forceNotify: false });
      invoiceMessage = invMsg.message;
    } catch { /* ignore */ }

    invoiceNotify = await notifyPlatform({
      event: "invoices.export.requested",
      company,
      message: invoiceMessage,
      meta: {
        period,
        reason: options.reason || "auto_pipeline",
        hint: "Bitte Rechnungen per POST /v1/invoice/batch oder /v1/invoice/ingest senden",
        replyPath: "/v1/invoice/batch",
      },
      idempotencyKey: `inv-export:${companyId}:${period}:${Math.floor(Date.now() / 600000)}`,
    });
  }

  const progress = invoiceProgress(companyId);
  if (release.releasedCount > 0) {
    lastSuccessAt = new Date().toISOString();
    ackOpenRequests({
      companyId,
      period,
      types: ["invoices.export.requested"],
      meta: { reason: "invoice_pending_release", readBy: "accounting-auto" },
    });
  }

  return {
    ok: true,
    skippedAsk: !shouldAsk,
    companyId,
    period,
    invoiceNotify,
    invoiceMessageId: invoiceMessage?.messageId || null,
    pendingReleased: release.releasedCount,
    invoices: progress,
  };
}

/**
 * After platform pushes a single payroll: calculate + auto-release if ready.
 */
export async function processInboundPayroll(payload, options = {}) {
  const cfg = autoPipelineConfig();
  const autoRelease = options.autoRelease !== undefined
    ? options.autoRelease
    : cfg.autoRelease;

  const ingest = await ingestPayroll(payload, {
    tenantScope: options.tenantScope,
    notifyGaps: options.notifyGaps !== false,
    autoRelease: false,
    demo: options.demo,
  });

  let release = null;
  if (autoRelease && ingest.ok && ingest.job?.jobId) {
    release = await releasePayrollJob(ingest.job.jobId, {
      tenantScope: options.tenantScope || ingest.job.company?.id,
    });
  }

  const companyId = ingest.job?.company?.id || normalizeCompanyId(payload?.company?.id || "");
  const period = ingest.job?.period || payload?.period || "";
  if (companyId && (ingest.ok || release?.ok)) {
    ackOpenRequests({
      companyId,
      period,
      types: ["payroll.month.requested", "employees.list.requested"],
      meta: { reason: "payroll_ingest", readBy: "accounting-auto" },
    });
    if (release?.ok) {
      lastSuccessAt = new Date().toISOString();
      companySyncState.set(companyId, {
        period,
        successAt: lastSuccessAt,
        released: 1,
      });
    }
  }

  return {
    ...ingest,
    auto: true,
    autoRelease,
    released: Boolean(release?.ok),
    delivery: release?.delivery || null,
    platformNotify: release?.platformNotify || null,
    message: release?.ok
      ? "Auto: Abrechnung berechnet und an Plattform/Mitarbeiter freigegeben."
      : (ingest.ok
        ? "Auto: berechnet – Freigabe wartete auf fehlende Pflichtfelder."
        : (ingest.errors?.join?.(" · ") || "Ingest fehlgeschlagen")),
  };
}

/**
 * After platform pushes a batch: calculate + auto-release ready payslips.
 */
export async function processInboundPayrollBatch(batch, options = {}) {
  const cfg = autoPipelineConfig();
  const autoRelease = options.autoRelease !== undefined
    ? options.autoRelease
    : cfg.autoRelease;

  const ingest = await ingestPayrollBatch(batch, {
    tenantScope: options.tenantScope,
    notifyGaps: options.notifyGaps !== false,
    autoRelease: false, // release explicitly below (delivery + webhook)
    demo: options.demo,
  });

  const released = [];
  const releaseErrors = [];
  if (autoRelease && ingest.count > 0) {
    for (const row of ingest.results || []) {
      if (!row.ok || !row.jobId) continue;
      try {
        const r = await releasePayrollJob(row.jobId, {
          tenantScope: options.tenantScope || ingest.company?.id,
        });
        if (r.ok) {
          released.push({
            jobId: row.jobId,
            deliveryId: r.delivery?.deliveryId,
            net: r.payslip?.totals?.net,
          });
        } else {
          releaseErrors.push({ jobId: row.jobId, error: r.error });
        }
      } catch (e) {
        releaseErrors.push({ jobId: row.jobId, error: e.message });
      }
    }
  }

  const companyId = ingest.company?.id || normalizeCompanyId(batch?.company?.id || "");
  const period = ingest.period || batch?.period || "";
  if (companyId && ingest.count > 0) {
    ackOpenRequests({
      companyId,
      period,
      types: ["payroll.month.requested", "employees.list.requested"],
      meta: { reason: "payroll_batch", readBy: "accounting-auto" },
    });
  }
  if (companyId && options.notify !== false) {
    await notifyPlatform({
      event: released.length ? "month.auto.processed" : "payroll.batch.received",
      company: ingest.company || { id: companyId },
      meta: {
        period,
        ingested: ingest.count,
        released: released.length,
        gaps: (ingest.results || []).filter((r) => !r.ok).length,
        auto: true,
      },
      idempotencyKey: `auto-batch:${companyId}:${period || "x"}:${Date.now()}`,
    });
  }
  if (released.length) {
    lastSuccessAt = new Date().toISOString();
    companySyncState.set(companyId, {
      period,
      successAt: lastSuccessAt,
      released: released.length,
    });
  }

  return {
    ...ingest,
    auto: true,
    autoRelease,
    released,
    releaseErrors,
    releasedCount: released.length,
    message: ingest.count
      ? `Auto: ${ingest.count} übernommen, ${released.length} freigegeben`
        + (releaseErrors.length ? `, ${releaseErrors.length} Lücken/Fehler` : "")
        + "."
      : (ingest.errors?.join?.(" · ") || "Keine Daten im Batch"),
  };
}

/**
 * Ask platform for employees + month data for one company, then pull/close if possible.
 */
export async function askPlatformAndSyncCompany(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.company?.id || "");
  if (!companyId) return { ok: false, error: "companyId fehlt" };
  const period = String(options.period || currentPeriod()).trim();
  const company = {
    id: companyId,
    name: options.companyName || options.company?.name || "",
  };
  const cfg = autoPipelineConfig();
  const progress = monthProgress(companyId, period);
  const forceAsk = options.forceAsk === true;

  // Smart skip: month already fully released → don't spam payroll asks (invoices still sync)
  if (!forceAsk && progress.complete) {
    ackOpenRequests({
      companyId,
      period,
      types: ["payroll.month.requested", "employees.list.requested"],
      meta: { reason: "month_complete", readBy: "accounting-auto" },
    });
    lastSuccessAt = new Date().toISOString();
    companySyncState.set(companyId, {
      ...(companySyncState.get(companyId) || {}),
      period,
      successAt: lastSuccessAt,
      released: progress.released,
    });
    const invoices = options.skipInvoices
      ? null
      : await askPlatformForInvoices({
        companyId,
        companyName: company.name,
        period,
        autoRelease: options.autoRelease,
        notify: options.notify,
        forceAsk: options.forceAsk,
        reason: options.reason || "auto_pipeline",
      });
    const message = `Monat ${period} ist fertig: ${progress.released} Abrechnung(en) freigegeben`
      + (invoices?.pendingReleased
        ? ` · ${invoices.pendingReleased} Rechnung(en) nachfreigegeben`
        : " – Lohn-Anfrage übersprungen, Rechnungen weiter synchronisiert")
      + ".";
    recordCompanyAutomation(companyId, period, {
      phase: "done",
      source: options.reason?.startsWith("portal") ? "manual" : "auto_pipeline",
      ok: true,
      waitingForPlatform: false,
      message,
    });
    return {
      ok: true,
      skipped: true,
      reason: "month_complete",
      waitingForPlatform: false,
      companyId,
      period,
      jobs: progress,
      invoices: invoices?.invoices || invoiceProgress(companyId),
      invoiceSync: invoices,
      webhook: getLastWebhookStatus(),
      webhookOk: getLastWebhookStatus()?.ok === true,
      webhookBroken: false,
      message,
      nextActions: [],
    };
  }

  // Release any leftover calculated jobs without re-asking
  if (progress.calculated > 0 && (options.autoRelease !== false && cfg.autoRelease)) {
    const calcJobs = listPayrollJobs({ companyId, period })
      .filter((j) => !isDemoPayrollJob(j) && j.status === "calculated");
    for (const job of calcJobs) {
      try {
        await releasePayrollJob(job.jobId, { tenantScope: companyId });
      } catch { /* continue */ }
    }
  }

  const prev = companySyncState.get(companyId);
  const reaskMs = cfg.reaskMinutes * 60_000;
  const recentlyAsked = prev?.askedAt && (Date.now() - new Date(prev.askedAt).getTime()) < reaskMs;
  const shouldAsk = forceAsk || !recentlyAsked || !progress.hasWork;

  let employeesNotify = { skipped: true };
  let monthNotify = { skipped: true };
  let employeesMessage = null;
  let monthMessage = null;
  let webhookProbe = getLastWebhookStatus();

  if (options.notify !== false && shouldAsk) {
    companySyncState.set(companyId, {
      ...(prev || {}),
      period,
      askedAt: new Date().toISOString(),
    });
    // Durable inbox entries so platform can POLL even if webhook URL is broken/404
    try {
      const empMsg = await upsertPlatformMessage({
        type: "employees.list.requested",
        severity: "action_needed",
        company,
        period,
        code: "employees_list_requested",
        dedupeKey: `employees.list.requested::${companyId}::${period}`,
        title: `Mitarbeiterliste anfordern · ${period}`,
        body:
          `WorkPass Lohn braucht die Mitarbeiterliste für ${period}.\n\n`
          + `Bitte senden: POST ${process.env.WORKPASS_PUBLIC_URL || "https://workpass-lohn.up.railway.app"}/v1/employees/import\n`
          + `Body: { "companyId": "${companyId}", "employees": [{ "badgeId", "name" }] }`,
        gaps: [{
          code: "employees_list_requested",
          field: "employees",
          label: "Mitarbeiterliste fehlt",
          severity: "action_needed",
        }],
        source: "auto-pipeline",
      }, { notify: false, forceNotify: false });
      employeesMessage = empMsg.message;
    } catch { /* ignore */ }

    try {
      const monMsg = await upsertPlatformMessage({
        type: "payroll.month.requested",
        severity: "action_needed",
        company,
        period,
        code: "payroll_month_requested",
        dedupeKey: `payroll.month.requested::${companyId}::${period}`,
        title: `Monatsdaten anfordern · ${period}`,
        body:
          `WorkPass Lohn braucht Lohn-/Stundendaten für ${period}.\n\n`
          + `Bitte senden: POST ${process.env.WORKPASS_PUBLIC_URL || "https://workpass-lohn.up.railway.app"}/v1/payroll/batch\n`
          + `Body: platform.payroll.batch.v1 mit company.id="${companyId}" und employees[]\n`
          + `(auch unvollständig OK – fehlende Felder werden nachgefragt).`,
        gaps: [{
          code: "payroll_month_requested",
          field: "payroll.batch",
          label: "Monatsdaten fehlen",
          severity: "action_needed",
        }],
        source: "auto-pipeline",
      }, { notify: false, forceNotify: false });
      monthMessage = monMsg.message;
    } catch { /* ignore */ }

    employeesNotify = await notifyPlatform({
      event: "employees.list.requested",
      company,
      message: employeesMessage,
      meta: {
        period,
        reason: options.reason || "auto_pipeline",
        hint: "Bitte Mitarbeiter (Name + badgeId) per POST /v1/employees/import senden",
        replyPath: "/v1/employees/import",
      },
      idempotencyKey: `emp-list:${companyId}:${period}:${Math.floor(Date.now() / 600000)}`,
    });

    monthNotify = await notifyPlatform({
      event: "payroll.month.requested",
      company,
      message: monthMessage,
      meta: {
        period,
        allowIncomplete: true,
        reason: options.reason || "auto_pipeline",
        hint: "Bitte Monatsdaten per POST /v1/payroll/batch senden (auch unvollständig)",
        replyPath: "/v1/payroll/batch",
      },
      idempotencyKey: `month-req:${companyId}:${period}:${Math.floor(Date.now() / 300000)}`,
    });

    webhookProbe = getLastWebhookStatus();
    if (options.probeWebhook) {
      webhookProbe = await probePlatformWebhook();
    }
  } else if (!shouldAsk) {
    employeesNotify = { skipped: true, reason: "recently_asked" };
    monthNotify = { skipped: true, reason: "recently_asked" };
  }

  // 3) Ask only for employees still missing/error this period (not every tick)
  const known = listEmployees(companyId).slice(0, 30);
  const perEmployee = [];
  if (options.notify !== false && shouldAsk) {
    const byBadge = new Map(
      listPayrollJobs({ companyId, period })
        .filter((j) => !isDemoPayrollJob(j))
        .map((j) => [String(j.employee?.badgeId || j.employee?.id || ""), j])
    );
    for (const emp of known) {
      const job = byBadge.get(String(emp.badgeId || ""));
      if (job && job.status === "released") continue;
      if (job && job.status === "calculated") continue;
      try {
        perEmployee.push(await requestEmployeeDataFromPlatform({
          companyId,
          companyName: company.name,
          employeeId: emp.badgeId,
          badgeId: emp.badgeId,
          employeeName: emp.name,
          period,
          gaps: job?.errors?.length ? job.errors : ["Brutto / Lohnarten fehlen"],
          pull: false,
          forceNotify: true,
          tenantScope: companyId,
          reason: "auto_pipeline",
        }));
      } catch { /* continue */ }
    }
  }

  // 4) Try pull + month close (calculate + release what we get)
  let pull = { skipped: true };
  let close = null;
  if (options.pull !== false && cfg.pull) {
    pull = await pullPlatformPayrollBatch({ companyId, period });
  }
  close = await runMonthClose({
    companyId,
    period,
    pull: !(pull.ok && pull.batch),
    batch: pull.ok && pull.batch ? pull.batch : null,
    autoRelease: options.autoRelease !== undefined ? options.autoRelease : cfg.autoRelease,
    tenantScope: companyId,
    notify: options.notify !== false,
    company,
  });

  const after = monthProgress(companyId, period);
  if (after.complete || (close?.newlyReleased?.length > 0)) {
    lastSuccessAt = new Date().toISOString();
    companySyncState.set(companyId, {
      ...(companySyncState.get(companyId) || {}),
      period,
      askedAt: companySyncState.get(companyId)?.askedAt,
      successAt: lastSuccessAt,
      released: after.released,
    });
    ackOpenRequests({
      companyId,
      period,
      types: ["payroll.month.requested", "employees.list.requested"],
      meta: { reason: "sync_success", readBy: "accounting-auto" },
    });
  }

  recordCompanyAutomation(companyId, period, {
    phase: after.complete
      ? "done"
      : (close?.waitingForPlatform || !after.hasWork ? "waiting" : (after.released < after.jobs ? "release" : "calc")),
    source: options.reason?.startsWith("portal") ? "manual" : "auto_pipeline",
    ok: Boolean(after.complete || close?.ok),
    waitingForPlatform: Boolean(close?.waitingForPlatform) && !after.hasWork,
    message: after.complete
      ? `Fertig: ${after.released} Abrechnung(en) für ${period} an die Plattform gesendet.`
      : (close?.message || null),
  });

  const invoices = options.skipInvoices
    ? null
    : await askPlatformForInvoices({
      companyId,
      companyName: company.name,
      period,
      autoRelease: options.autoRelease,
      notify: options.notify,
      forceAsk: options.forceAsk || shouldAsk,
      reason: options.reason || "auto_pipeline",
    });

  const jobs = listPayrollJobs({ companyId, period }).filter((j) => !isDemoPayrollJob(j));
  const webhookOk = webhookProbe?.ok === true;
  const webhookBroken = webhookProbe?.ok === false && Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL);
  return {
    ok: Boolean(close?.ok || after.hasWork || invoices?.pendingReleased || invoices?.invoices?.hasWork),
    skippedAsk: !shouldAsk,
    waitingForPlatform: Boolean(close?.waitingForPlatform) && !after.hasWork,
    companyId,
    period,
    employeesNotify,
    monthNotify,
    employeesMessageId: employeesMessage?.messageId || null,
    monthMessageId: monthMessage?.messageId || null,
    invoiceSync: invoices,
    invoices: invoices?.invoices || invoiceProgress(companyId),
    webhook: webhookProbe,
    webhookOk,
    webhookBroken,
    knownEmployees: known.length,
    perEmployeeAsked: perEmployee.length,
    pull: {
      ok: pull.ok,
      skipped: pull.skipped,
      incomplete: pull.incomplete,
      error: pull.error,
    },
    close,
    jobs: {
      total: after.jobs,
      released: after.released,
      calculated: after.calculated,
      error: after.error,
    },
    message: after.complete
      ? `Fertig: ${after.released} Abrechnung(en) für ${period} an die Plattform gesendet.`
      : (close?.ok
        ? `Auto-Sync ${period}: ${close.newlyReleased?.length || 0} freigegeben.`
        : (webhookBroken
          ? `Plattform-Webhook antwortet nicht (${webhookProbe?.status || webhookProbe?.error || "Fehler"}). `
            + `Anfragen liegen unter GET /v1/messages/pending – Plattform muss Endpoint reparieren und Daten pushen.`
          : (!shouldAsk
            ? `Zuletzt gefragt – warte auf Plattform-Antwort (erneut in ~${cfg.reaskMinutes} Min. oder „Jetzt synchronisieren“).`
            : (close?.message || "Plattform nach Mitarbeitern, Monatsdaten und Rechnungen gefragt.")))),
    nextActions: webhookBroken
      ? [
          "Auf der Plattform den Webhook-Endpoint live schalten (aktuell oft HTTP 404)",
          "Erwartete URL: WORKPASS_PLATFORM_WEBHOOK_URL",
          "Fallback: Plattform pollt GET /v1/messages/pending und sendet dann Import/Batch",
          "Danach: POST /v1/employees/import + POST /v1/payroll/batch + POST /v1/invoice/batch",
        ]
      : (close?.waitingForPlatform && !after.hasWork
        ? [
            "Plattform muss auf employees.list.requested / payroll.month.requested / invoices.export.requested reagieren",
            "Daten senden: POST /v1/employees/import, POST /v1/payroll/batch, POST /v1/invoice/batch",
          ]
        : []),
  };
}

export async function runAutoPipelineOnce(opts = {}) {
  const cfg = autoPipelineConfig();
  if (!cfg.enabled && !opts.force) {
    return { ok: false, skipped: true, reason: "WORKPASS_AUTO_PIPELINE=0" };
  }
  const period = opts.period || currentPeriod();
  const companies = listAutomationCompanies(opts.companies || listCompanies());
  const results = [];
  for (const c of companies) {
    try {
      recordCompanyAutomation(c.id, period, {
        phase: "ask",
        source: "auto_pipeline",
        message: `Automatik fragt Plattform für ${period}…`,
      });
      const r = await askPlatformAndSyncCompany({
        companyId: c.id,
        companyName: c.name,
        period,
        pull: opts.pull,
        autoRelease: opts.autoRelease,
        notify: opts.notify,
        reason: "auto_pipeline_tick",
      });
      results.push(r);
    } catch (e) {
      results.push({ ok: false, companyId: c.id, error: e.message });
    }
  }
  lastTickAt = new Date().toISOString();
  const primary = results.find((r) => r.waitingForPlatform || r.webhookBroken || !r.ok) || results[0] || null;
  lastResult = {
    ok: results.some((r) => r.ok) || results.every((r) => r.waitingForPlatform),
    waitingForPlatform: Boolean(primary?.waitingForPlatform),
    period,
    count: results.length,
    message: primary?.message || null,
    nextActions: Array.isArray(primary?.nextActions) ? primary.nextActions : [],
    results: results.map((r) => ({
      companyId: r.companyId,
      ok: r.ok,
      waitingForPlatform: r.waitingForPlatform,
      message: r.message,
      jobs: r.jobs,
    })),
  };
  return lastResult;
}

export function startAutoPipelineScheduler() {
  const cfg = autoPipelineConfig();
  if (!cfg.enabled) {
    console.log("[auto-pipeline] off (WORKPASS_AUTO_PIPELINE=0)");
    return { ok: false, enabled: false };
  }
  if (timer) clearInterval(timer);
  const ms = cfg.intervalMinutes * 60_000;
  console.log(`[auto-pipeline] on · every ${cfg.intervalMinutes} min · autoRelease=${cfg.autoRelease}`);
  // First tick shortly after boot (don't block listen)
  setTimeout(() => {
    runAutoPipelineOnce().catch((e) => console.error("[auto-pipeline] boot tick", e.message));
  }, 12_000);
  timer = setInterval(() => {
    runAutoPipelineOnce().catch((e) => console.error("[auto-pipeline] tick", e.message));
  }, ms);
  return { ok: true, enabled: true, ...cfg };
}
