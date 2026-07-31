/**
 * Month-close: pull payroll batch from platform (optional), calculate all employees,
 * auto-release payslips back to platform for employee delivery.
 */
import { listPayrollJobs } from "./db/repository.mjs";
import { ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { notifyPlatform } from "./notify.mjs";
import { upsertPlatformMessage } from "./platform-messages.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";

function currentPeriod(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isMissingPlatformData(pull) {
  const status = Number(pull?.status) || 0;
  const raw = String(pull?.error || pull?.body?.error || pull?.body?.code || "").toLowerCase();
  return status === 404
    || raw === "not_found"
    || raw.includes("not_found")
    || raw.includes("not found")
    || raw.includes("no data")
    || raw.includes("keine daten");
}

function humanizePullError(pull, period) {
  if (!pull || pull.skipped) {
    return `Keine Monatsdaten für ${period}. Die Plattform muss Stunden/Löhne per POST /v1/payroll/batch senden.`;
  }
  if (isMissingPlatformData(pull)) {
    return `Plattform meldet: keine Daten für ${period} (not_found). `
      + `Bitte in der Plattform den Monat freigeben und an die Buchhaltung senden – `
      + `oder den Export-Endpoint mit echten Mitarbeiterdaten befüllen.`;
  }
  const status = Number(pull.status) || 0;
  if (status === 405) {
    return `Plattform-Pull HTTP 405 – Methode nicht erlaubt. `
      + `Setze WORKPASS_PLATFORM_PAYROLL_PULL_METHOD=GET oder lass die Plattform per Batch pushen.`;
  }
  return pull.error || `Keine Daten für ${period}`;
}

function realPeriodJobs(companyId, period) {
  return listPayrollJobs({ companyId, period }).filter((j) => !isDemoPayrollJob(j));
}

/**
 * Pull month payroll export from the WorkPass platform.
 * Platform endpoint should return platform.payroll.batch.v1
 * (or { ok, batch } / { employees }).
 *
 * Env:
 *   WORKPASS_PLATFORM_PAYROLL_PULL_URL
 *   WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = auto | GET | POST  (default auto)
 *   On HTTP 405, auto retries with the other method.
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
  const methodPref = String(process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD || "auto")
    .trim()
    .toUpperCase();

  const methods = methodPref === "GET" || methodPref === "POST"
    ? [methodPref]
    : ["POST", "GET"]; // auto: POST first, then GET on 405

  let last = null;
  for (const method of methods) {
    const result = await fetchPullOnce({
      url,
      method,
      companyId,
      period,
      key,
      timeoutMs,
    });
    last = result;
    if (result.ok) return result;
    // Only auto-fallback on Method Not Allowed
    if (result.status !== 405) return result;
  }

  return {
    ...last,
    error:
      (last?.error || "Plattform-Pull fehlgeschlagen")
      + " – HTTP 405: Die Pull-URL erlaubt diese Methode nicht. "
      + "Setze WORKPASS_PLATFORM_PAYROLL_PULL_METHOD=GET (oder POST) passend zur Plattform, "
      + "oder lass die Plattform den Monat per POST /v1/payroll/batch an die Buchhaltung senden.",
  };
}

async function fetchPullOnce({ url, method, companyId, period, key, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = {
      "X-WorkPass-Key": key,
      "X-WorkPass-Company-Id": companyId,
      "X-WorkPass-Event": "payroll.month.pull",
      Accept: "application/json",
    };

    let requestUrl = url;
    const init = { method, headers, signal: ctrl.signal };

    if (method === "GET") {
      const u = new URL(url);
      u.searchParams.set("companyId", companyId);
      u.searchParams.set("period", period);
      u.searchParams.set("kind", "platform.payroll.pull.v1");
      requestUrl = u.toString();
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify({
        kind: "platform.payroll.pull.v1",
        event: "payroll.month.requested",
        companyId,
        period,
      });
    }

    const res = await fetch(requestUrl, init);
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    if (!res.ok) {
      const code = body?.error || body?.code || `HTTP ${res.status}`;
      return {
        ok: false,
        skipped: false,
        status: res.status,
        method,
        error: String(code),
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
        method,
        error: "Plattform-Antwort ohne employees[] / platform.payroll.batch.v1",
        body,
      };
    }

    if (!batch.company) batch.company = { id: companyId };
    if (!batch.company.id) batch.company.id = companyId;
    if (!batch.period) batch.period = period;
    if (!batch.kind) batch.kind = "platform.payroll.batch.v1";

    return { ok: true, skipped: false, status: res.status, method, batch };
  } catch (e) {
    return {
      ok: false,
      skipped: false,
      method,
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

  const jobs = realPeriodJobs(companyId, period);
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

  const after = realPeriodJobs(companyId, period);
  const hasWork = after.length > 0 || Boolean(batchIngest?.count);
  const missingOnPlatform = !pull.skipped && !pull.ok && isMissingPlatformData(pull);
  const waitingForPlatform = !hasWork && (pull.skipped || !pull.ok);
  const ok = hasWork && releaseErrors.length === 0 && (!batchIngest || batchIngest.ok);
  const pullHint = humanizePullError(pull, period);

  const result = {
    ok,
    waitingForPlatform,
    missingOnPlatform,
    error: ok
      ? undefined
      : (!hasWork
        ? pullHint
        : (releaseErrors[0]?.error || batchIngest?.errors?.join?.(" · ") || "Monatsabschluss unvollständig")),
    period,
    companyId,
    pull: {
      ...pull,
      humanError: pullHint,
    },
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
      ? (waitingForPlatform
        ? `Warte auf echte Plattform-Daten für ${period}. ${missingOnPlatform ? "Export meldet not_found / keine Daten." : "Noch keine Mitarbeiter-Stunden empfangen."}`
        : pullHint)
      : autoRelease
        ? `Monatsabschluss ${period}: ${released.length} Abrechnung(en) an Plattform/Mitarbeiter gesendet.`
        : `Monatsabschluss ${period}: ${calculated.length} Abrechnung(en) berechnet (noch nicht freigegeben).`,
  };

  const company = { id: companyId, name: options.company?.name || "" };
  const monthClosePayload = {
    companyId,
    company,
    period,
    waitingForPlatform,
    ok,
    jobs: result.jobs,
    newlyReleasedCount: released.length,
    message: result.message,
  };

  if (waitingForPlatform && options.notify !== false) {
    await upsertPlatformMessage({
      type: "payroll.waiting",
      severity: "action_needed",
      company,
      period,
      title: `Monatsdaten fehlen · ${period}`,
      body:
        `Die Buchhaltung wartet auf echte Lohn-/Stundendaten für ${period}.\n\n`
        + `${pullHint}\n\n`
        + `Bitte in der Plattform den Monat freigeben und per POST /v1/payroll/batch an die Buchhaltung senden.`,
      code: "payroll_waiting",
      gaps: [{
        code: "payroll_waiting",
        field: "payroll.batch",
        label: "Monatsdaten fehlen",
        severity: "action_needed",
      }],
      source: "month-close",
    }, { notify: true });
    result.platformNotify = await notifyPlatform({
      event: "payroll.waiting",
      company,
      monthClose: monthClosePayload,
      meta: { reason: pull.error || "no_data" },
    });
  } else if (options.notify !== false) {
    result.platformNotify = await notifyPlatform({
      event: ok ? "month.closed" : "month.close.failed",
      company,
      monthClose: monthClosePayload,
      meta: {
        released: released.map((r) => r.deliveryId).filter(Boolean),
        releaseErrors,
      },
    });
  }

  return result;
}

export { currentPeriod };
