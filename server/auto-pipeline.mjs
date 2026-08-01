/**
 * WorkPass Lohn auto-pipeline:
 * 1) Ask platform for employees + month payroll
 * 2) When platform pushes data → calculate + release automatically
 *
 * Env:
 *   WORKPASS_AUTO_PIPELINE=1          (default ON; set 0 to disable)
 *   WORKPASS_AUTO_PIPELINE_MINUTES=15 (poll / ask interval)
 *   WORKPASS_AUTO_RELEASE=1           (default ON: release on inbound batch)
 */
import { listCompanies, listPayrollJobs } from "./db/repository.mjs";
import { notifyPlatform, getLastWebhookStatus, probePlatformWebhook } from "./notify.mjs";
import { listEmployees } from "./employee-registry.mjs";
import {
  runMonthClose,
  currentPeriod,
  pullPlatformPayrollBatch,
  requestEmployeeDataFromPlatform,
} from "./month-close.mjs";
import { ingestPayroll, ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { upsertPlatformMessage } from "./platform-messages.mjs";
import { normalizeCompanyId } from "./tenant.mjs";

let timer = null;
let lastTickAt = null;
let lastResult = null;

export function autoPipelineConfig() {
  const disabled = process.env.WORKPASS_AUTO_PIPELINE === "0"
    || process.env.WORKPASS_AUTO_PIPELINE === "false";
  return {
    enabled: !disabled,
    intervalMinutes: Math.max(2, Number(process.env.WORKPASS_AUTO_PIPELINE_MINUTES || 15)),
    autoRelease: process.env.WORKPASS_AUTO_RELEASE !== "0",
    pull: process.env.WORKPASS_AUTO_PIPELINE_PULL !== "0",
  };
}

export function autoPipelineStatus() {
  const cfg = autoPipelineConfig();
  return {
    ...cfg,
    running: Boolean(timer),
    lastTickAt,
    lastResult,
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
  if (companyId && options.notify !== false) {
    await notifyPlatform({
      event: released.length ? "month.auto.processed" : "payroll.batch.received",
      company: ingest.company || { id: companyId },
      meta: {
        period: ingest.period || batch?.period,
        ingested: ingest.count,
        released: released.length,
        gaps: (ingest.results || []).filter((r) => !r.ok).length,
        auto: true,
      },
      idempotencyKey: `auto-batch:${companyId}:${ingest.period || "x"}:${Date.now()}`,
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

  let employeesNotify = { skipped: true };
  let monthNotify = { skipped: true };
  let employeesMessage = null;
  let monthMessage = null;
  let webhookProbe = getLastWebhookStatus();

  if (options.notify !== false) {
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
  }

  // 3) Also ask per known employee (gaps / missing wages)
  const known = listEmployees(companyId).slice(0, 30);
  const perEmployee = [];
  if (options.notify !== false) {
    for (const emp of known) {
      try {
        perEmployee.push(await requestEmployeeDataFromPlatform({
          companyId,
          companyName: company.name,
          employeeId: emp.badgeId,
          badgeId: emp.badgeId,
          employeeName: emp.name,
          period,
          gaps: ["Brutto / Lohnarten fehlen"],
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

  const jobs = listPayrollJobs({ companyId, period });
  const webhookOk = webhookProbe?.ok === true;
  const webhookBroken = webhookProbe?.ok === false && Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL);
  return {
    ok: Boolean(close?.ok || (close?.jobs?.total > 0)),
    waitingForPlatform: Boolean(close?.waitingForPlatform),
    companyId,
    period,
    employeesNotify,
    monthNotify,
    employeesMessageId: employeesMessage?.messageId || null,
    monthMessageId: monthMessage?.messageId || null,
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
      total: jobs.length,
      released: jobs.filter((j) => j.status === "released").length,
      calculated: jobs.filter((j) => j.status === "calculated").length,
      error: jobs.filter((j) => j.status === "error").length,
    },
    message: close?.ok
      ? `Auto-Sync ${period}: ${close.newlyReleased?.length || 0} freigegeben.`
      : (webhookBroken
        ? `Plattform-Webhook antwortet nicht (${webhookProbe?.status || webhookProbe?.error || "Fehler"}). `
          + `Anfragen liegen unter GET /v1/messages/pending – Plattform muss Endpoint reparieren und Daten pushen.`
        : (close?.message || "Plattform nach Mitarbeitern und Monatsdaten gefragt.")),
    nextActions: webhookBroken
      ? [
          "Auf der Plattform den Webhook-Endpoint live schalten (aktuell oft HTTP 404)",
          "Erwartete URL: WORKPASS_PLATFORM_WEBHOOK_URL",
          "Fallback: Plattform pollt GET /v1/messages/pending und sendet dann Import/Batch",
          "Danach: POST /v1/employees/import + POST /v1/payroll/batch an WorkPass Lohn",
        ]
      : (close?.waitingForPlatform
        ? [
            "Plattform muss auf employees.list.requested / payroll.month.requested reagieren",
            "Daten senden: POST /v1/employees/import und POST /v1/payroll/batch",
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
  const companies = (opts.companies || listCompanies())
    .filter((c) => c.meta?.accountingEnabled !== false);
  const results = [];
  for (const c of companies) {
    try {
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
  lastResult = {
    ok: results.some((r) => r.ok) || results.every((r) => r.waitingForPlatform),
    period,
    count: results.length,
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
