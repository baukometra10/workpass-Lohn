/**
 * Month-close: pull payroll batch from platform (optional), calculate all employees,
 * auto-release payslips back to platform for employee delivery.
 */
import { listPayrollJobs } from "./db/repository.mjs";
import { ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { normalizeCompanyId } from "./tenant.mjs";

function currentPeriod(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Pull month payroll export from the WorkPass platform.
 * Platform endpoint should return platform.payroll.batch.v1
 * (or { ok, batch } / { employees }).
 */
export async function pullPlatformPayrollBatch({ companyId, period }) {
  const url = String(process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL || "").trim();
  if (!url) {
    return {
      ok: false,
      skipped: true,
      error:
        "Kein WORKPASS_PLATFORM_PAYROLL_PULL_URL – Plattform muss Monatsdaten per POST /v1/payroll/batch senden "
        + "oder diese Pull-URL setzen.",
    };
  }

  const key =
    process.env.WORKPASS_PLATFORM_WEBHOOK_KEY
    || process.env.WORKPASS_API_KEY
    || "";
  const timeoutMs = Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 12000);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WorkPass-Key": key,
        "X-WorkPass-Company-Id": companyId,
        "X-WorkPass-Event": "payroll.month.pull",
      },
      body: JSON.stringify({
        kind: "platform.payroll.pull.v1",
        event: "payroll.month.requested",
        companyId,
        period,
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        skipped: false,
        status: res.status,
        error: body?.error || `Plattform-Pull HTTP ${res.status}`,
        body,
      };
    }

    const batch =
      body?.batch
      || (body?.kind === "platform.payroll.batch.v1" ? body : null)
      || (Array.isArray(body?.employees) ? body : null);

    if (!batch || !Array.isArray(batch.employees || batch.items)) {
      return {
        ok: false,
        skipped: false,
        status: res.status,
        error: "Plattform-Antwort ohne employees[] / platform.payroll.batch.v1",
        body,
      };
    }

    if (!batch.company) batch.company = { id: companyId };
    if (!batch.company.id) batch.company.id = companyId;
    if (!batch.period) batch.period = period;
    if (!batch.kind) batch.kind = "platform.payroll.batch.v1";

    return { ok: true, skipped: false, status: res.status, batch };
  } catch (e) {
    return {
      ok: false,
      skipped: false,
      error: e.name === "AbortError" ? "Plattform-Pull Timeout" : (e.message || String(e)),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full month run for one company:
 * 1) optional pull from platform
 * 2) ingest/calculate each employee
 * 3) auto-release successful payslips → platform → employee app
 */
export async function runMonthClose(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.company?.id || "");
  if (!companyId) {
    return { ok: false, error: "companyId fehlt", period: options.period || currentPeriod() };
  }

  const period = String(options.period || currentPeriod()).trim();
  const autoRelease = options.autoRelease !== false;
  const doPull = options.pull !== false;
  const tenantScope = options.tenantScope || companyId;

  let pull = { ok: false, skipped: true };
  let batchIngest = null;

  if (options.batch && typeof options.batch === "object") {
    const batch = {
      ...options.batch,
      kind: options.batch.kind || "platform.payroll.batch.v1",
      period: options.batch.period || period,
      company: {
        ...(options.batch.company || {}),
        id: options.batch.company?.id || companyId,
      },
    };
    batchIngest = await ingestPayrollBatch(batch, { tenantScope });
    pull = { ok: true, skipped: true, mode: "body-batch" };
  } else if (doPull) {
    pull = await pullPlatformPayrollBatch({ companyId, period });
    if (pull.ok && pull.batch) {
      batchIngest = await ingestPayrollBatch(pull.batch, { tenantScope });
    }
  }

  const jobs = listPayrollJobs({ companyId, period });
  const calculated = jobs.filter((j) => j.status === "calculated");
  const alreadyReleased = jobs.filter((j) => j.status === "released");
  const errored = jobs.filter((j) => j.status === "error");

  const released = [];
  const releaseErrors = [];
  if (autoRelease) {
    for (const job of calculated) {
      const r = await releasePayrollJob(job.jobId, { tenantScope });
      if (r.ok) released.push({
        jobId: job.jobId,
        employee: job.employee,
        net: job.payslip?.totals?.net,
        deliveryId: r.delivery?.deliveryId,
        platformNotify: r.platformNotify?.mode,
      });
      else releaseErrors.push({ jobId: job.jobId, error: r.error });
    }
  }

  const after = listPayrollJobs({ companyId, period });
  const hasWork = after.length > 0 || Boolean(batchIngest?.count);
  const waitingForPlatform = !hasWork && (pull.skipped || !pull.ok);
  const ok = hasWork && releaseErrors.length === 0 && (!batchIngest || batchIngest.ok);

  return {
    ok,
    waitingForPlatform,
    error: ok
      ? undefined
      : (!hasWork
        ? (pull.skipped
          ? `Keine Monatsdaten für ${period}. Die Plattform muss zuerst Stunden/Löhne senden (POST /v1/payroll/batch) oder WORKPASS_PLATFORM_PAYROLL_PULL_URL setzen.`
          : (pull.error || `Keine Daten für ${period}`))
        : (releaseErrors[0]?.error || batchIngest?.errors?.join?.(" · ") || "Monatsabschluss unvollständig")),
    period,
    companyId,
    pull,
    batch: batchIngest
      ? {
          ok: batchIngest.ok,
          count: batchIngest.count,
          results: batchIngest.results,
          errors: batchIngest.errors,
        }
      : null,
    jobs: {
      total: after.length,
      calculated: after.filter((j) => j.status === "calculated").length,
      released: after.filter((j) => j.status === "released").length,
      error: after.filter((j) => j.status === "error").length,
    },
    newlyReleased: released,
    releaseErrors,
    alreadyReleased: alreadyReleased.map((j) => j.jobId),
    errored: errored.map((j) => ({ jobId: j.jobId, errors: j.errors })),
    message: !hasWork
      ? (pull.skipped
        ? `Warte auf Plattform-Daten für ${period}. Noch keine Mitarbeiter-Stunden empfangen.`
        : (pull.error || `Keine Daten für ${period}`))
      : autoRelease
        ? `Monatsabschluss ${period}: ${released.length} Abrechnung(en) an Plattform/Mitarbeiter gesendet.`
        : `Monatsabschluss ${period}: ${calculated.length} Abrechnung(en) berechnet (noch nicht freigegeben).`,
  };
}

export { currentPeriod };
