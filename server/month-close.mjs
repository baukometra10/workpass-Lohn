/**
 * Month-close: pull payroll batch from platform (optional), calculate all employees,
 * auto-release payslips back to platform for employee delivery.
 *
 * Incomplete platform data is accepted: we ingest what exists and ask the platform
 * for missing fields per employee.
 */
import { listPayrollJobs } from "./db/repository.mjs";
import { ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { notifyPlatform } from "./notify.mjs";
import { upsertPlatformMessage, gapsFromTexts, notifyGapsForPayroll } from "./platform-messages.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { listEmployees } from "./employee-registry.mjs";

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
 * Accept many platform shapes – including incomplete employee rows.
 * Returns null only when no employee-like payload is present at all.
 */
export function normalizePlatformBatch(body, { companyId, period } = {}) {
  if (body == null) return null;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return null; }
  }
  if (typeof body !== "object") return null;

  const roots = [
    body.batch,
    body.data?.batch,
    body.payload?.batch,
    body.result?.batch,
    body.export?.batch,
    body.data,
    body.payload,
    body.result,
    body.export,
    body.payroll,
    body.month,
    body,
  ].filter((x) => x && typeof x === "object");

  const pickList = (obj) => {
    if (Array.isArray(obj)) return obj;
    const keys = ["employees", "items", "workers", "staff", "payrolls", "entries", "list", "rows", "records"];
    for (const k of keys) {
      if (Array.isArray(obj[k]) && obj[k].length) return obj[k];
    }
    // single employee object
    if (obj.employee || obj.badgeId || obj.wageItems || (obj.name && (obj.id || obj.personnelNumber))) {
      return [obj];
    }
    return null;
  };

  for (const root of roots) {
    const list = pickList(root);
    if (!list || !list.length) continue;
    const company = root.company || body.company || { id: companyId };
    if (!company.id && companyId) company.id = companyId;
    return {
      kind: "platform.payroll.batch.v1",
      period: String(root.period || body.period || period || "").trim(),
      company,
      employees: list,
      note: root.note || body.note || "",
      incomplete: Boolean(
        root.incomplete
        || root.partial
        || body.incomplete
        || body.partial
        || body.ok === false
      ),
      meta: {
        ...(typeof root.meta === "object" ? root.meta : {}),
        ...(typeof body.meta === "object" ? body.meta : {}),
        source: "platform-pull",
        acceptedIncomplete: true,
      },
    };
  }
  return null;
}

/**
 * Pull month payroll export from the WorkPass platform.
 * Accepts incomplete batches (missing fields per employee are OK).
 * Tries several URL candidates and both GET+POST until data is found.
 *
 * Env:
 *   WORKPASS_PLATFORM_PAYROLL_PULL_URL   (optional; otherwise derived)
 *   WORKPASS_PLATFORM_BASE_URL           e.g. https://suppix-ai-workpass.com
 *   WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = auto | GET | POST  (default auto)
 */
export function resolvePlatformPullUrls() {
  const explicit = String(process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL || "").trim();
  const base = String(
    process.env.WORKPASS_PLATFORM_BASE_URL
    || process.env.WORKPASS_PLATFORM_URL
    || ""
  ).trim().replace(/\/$/, "");
  const webhook = String(process.env.WORKPASS_PLATFORM_WEBHOOK_URL || "").trim();
  let hostBase = base;
  if (!hostBase && webhook) {
    try {
      const u = new URL(webhook);
      hostBase = `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }
  }

  const urls = [];
  const add = (u) => {
    const s = String(u || "").trim();
    if (s && !urls.includes(s)) urls.push(s);
  };
  add(explicit);
  if (hostBase) {
    add(`${hostBase}/api/workpass/payroll/export`);
    add(`${hostBase}/api/workpass/payroll/pull`);
    add(`${hostBase}/api/workpass/accounting/payroll/export`);
    add(`${hostBase}/api/workpass/accounting/payroll/pull`);
    add(`${hostBase}/api/workpass/lohn/export`);
    add(`${hostBase}/api/workpass/employees/export`);
    add(`${hostBase}/api/workpass/employee/export`);
    add(`${hostBase}/api/workpass/contracts/export`);
  }
  return urls;
}

export async function pullPlatformPayrollBatch({ companyId, period, employeeId, maxAttempts, timeoutMs: timeoutOverride } = {}) {
  const urls = resolvePlatformPullUrls();
  if (!urls.length) {
    return {
      ok: false,
      skipped: true,
      error:
        "Kein Pull-Endpoint – setze WORKPASS_PLATFORM_PAYROLL_PULL_URL oder WORKPASS_PLATFORM_BASE_URL, "
        + "oder lass die Plattform Monatsdaten per POST /v1/payroll/batch senden.",
    };
  }

  const key =
    process.env.WORKPASS_PLATFORM_WEBHOOK_KEY
    || process.env.WORKPASS_API_KEY
    || "";
  const timeoutMs = Number(timeoutOverride ?? process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS ?? 12000);
  const methodPref = String(process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD || "auto")
    .trim()
    .toUpperCase();

  const methods = methodPref === "GET" || methodPref === "POST"
    ? [methodPref]
    : ["GET", "POST"]; // prefer GET first – many platforms only expose export via GET

  let last = null;
  const attempts = [];
  const attemptLimit = Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : Infinity;
  outer: for (const url of urls) {
    for (const method of methods) {
      if (attempts.length >= attemptLimit) break outer;
      const result = await fetchPullOnce({
        url,
        method,
        companyId,
        period,
        employeeId,
        key,
        timeoutMs,
      });
      attempts.push({
        url,
        method,
        ok: result.ok,
        status: result.status || null,
        error: result.error || null,
      });
      last = { ...result, url, attempts };
      if (result.ok) return last;
    }
  }

  // Prefer a human not_found message if that was the dominant answer
  const notFound = attempts.find((a) => /not_found|404/i.test(String(a.error || a.status || "")));
  return {
    ...last,
    skipped: false,
    attempts,
    error: notFound
      ? String(notFound.error || "not_found")
      : (last?.error || "Plattform-Pull ohne Mitarbeiterdaten"),
  };
}

async function fetchPullOnce({ url, method, companyId, period, employeeId, key, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = {
      "X-WorkPass-Key": key,
      "X-WorkPass-Company-Id": companyId,
      "X-WorkPass-Event": employeeId ? "payroll.employee.pull" : "payroll.month.pull",
      Accept: "application/json",
    };

    let requestUrl = url;
    const init = { method, headers, signal: ctrl.signal };
    const eid = normalizeEmployeeId(employeeId || "");

    if (method === "GET") {
      const u = new URL(url);
      u.searchParams.set("companyId", companyId);
      u.searchParams.set("period", period);
      u.searchParams.set("kind", eid ? "platform.payroll.employee.pull.v1" : "platform.payroll.pull.v1");
      u.searchParams.set("allowIncomplete", "1");
      if (eid) {
        u.searchParams.set("employeeId", eid);
        u.searchParams.set("badgeId", eid);
      }
      requestUrl = u.toString();
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify({
        kind: eid ? "platform.payroll.employee.pull.v1" : "platform.payroll.pull.v1",
        event: eid ? "payroll.employee.requested" : "payroll.month.requested",
        companyId,
        period,
        employeeId: eid || undefined,
        badgeId: eid || undefined,
        allowIncomplete: true,
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

    // Prefer any employee payload even on non-2xx / ok:false / incomplete
    const batch = normalizePlatformBatch(body, { companyId, period });
    if (batch?.employees?.length) {
      if (!batch.company) batch.company = { id: companyId };
      if (!batch.company.id) batch.company.id = companyId;
      if (!batch.period) batch.period = period;
      if (!batch.kind) batch.kind = "platform.payroll.batch.v1";
      return {
        ok: true,
        skipped: false,
        status: res.status,
        method,
        batch,
        incomplete: Boolean(batch.incomplete || !res.ok),
        httpOk: res.ok,
      };
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

    return {
      ok: false,
      skipped: false,
      status: res.status,
      method,
      error: "Plattform-Antwort ohne Mitarbeiterdaten – auch unvollständige employees[] wären ok",
      body,
    };
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
 * Ask the platform for missing fields of one employee (and optionally re-pull).
 */
export async function requestEmployeeDataFromPlatform(options = {}) {
  const companyId = normalizeCompanyId(options.companyId || options.company?.id || "");
  const employeeId = normalizeEmployeeId(options.employeeId || options.badgeId || "");
  const period = String(options.period || currentPeriod()).trim();
  const company = {
    id: companyId,
    name: options.companyName || options.company?.name || "",
  };
  if (!companyId) return { ok: false, error: "companyId fehlt" };
  if (!employeeId && !options.employeeName) {
    return { ok: false, error: "employeeId / Badge fehlt" };
  }

  const hard = Array.isArray(options.gaps) ? options.gaps.map((g) => (typeof g === "string" ? g : g.label)).filter(Boolean) : [];
  const soft = Array.isArray(options.softGaps) ? options.softGaps : [];
  const gapObjs = hard.length || soft.length
    ? [...gapsFromTexts(hard, "action_needed"), ...gapsFromTexts(soft, "warning")]
    : (options.gapObjects || [{
      code: "employee_data_requested",
      field: "employee",
      label: "Mitarbeiterdaten unvollständig / nachfordern",
      severity: "action_needed",
    }]);

  const state = {
    mandantId: companyId,
    companyName: company.name,
    employeeId,
    badgeId: options.badgeId || employeeId,
    employeeName: options.employeeName || "",
    payrollMonth: period,
  };

  const gaps = await notifyGapsForPayroll({
    state,
    hard: gapObjs.map((g) => g.label),
    soft: [],
    jobId: options.jobId,
    companyName: company.name,
    forceNotify: options.forceNotify !== false,
    requestEvent: true,
  });

  let pull = { skipped: true };
  if (options.pull !== false) {
    // Manual firm requests: webhook first; cap pull so Railway does not 502 (~60s gateway).
    const pullOpts = options.forceNotify
      ? { maxAttempts: 2, timeoutMs: Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 5000) }
      : {};
    pull = await pullPlatformPayrollBatch({ companyId, period, employeeId, ...pullOpts });
  }

  let ingest = null;
  if (pull.ok && pull.batch) {
    ingest = await ingestPayrollBatch(pull.batch, {
      tenantScope: options.tenantScope || companyId,
      notifyGaps: true,
    });
  }

  return {
    ok: true,
    companyId,
    employeeId,
    period,
    gaps,
    pull,
    ingest,
    platformNotify: gaps?.platformNotify || null,
    message: ingest?.count
      ? `Plattform geliefert: ${ingest.count} Datensatz/Datensätze (auch unvollständig übernommen).`
      : `Plattform nach Daten für ${options.employeeName || employeeId} gefragt.`,
  };
}

/**
 * Full month run for one company:
 * 1) optional pull from platform (accepts incomplete)
 * 2) ingest/calculate each employee (gaps → ask platform)
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

  // If month pull empty: notify platform for known employees (no N× pull storm)
  if ((!batchIngest || !batchIngest.count) && options.notify !== false) {
    const known = listEmployees(companyId).filter((e) => e?.badgeId && e?.name);
    for (const emp of known.slice(0, 25)) {
      try {
        await requestEmployeeDataFromPlatform({
          companyId,
          companyName: options.company?.name || "",
          employeeId: emp.badgeId,
          badgeId: emp.badgeId,
          employeeName: emp.name,
          period,
          gaps: ["Brutto / Lohnarten fehlen"],
          tenantScope,
          pull: false,
          forceNotify: true,
          reason: "month_close_registry_fallback",
        });
      } catch { /* continue */ }
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

  // Ask platform again only for hard-error employees (soft gaps already notified on ingest)
  const dataRequests = [];
  if (options.notify !== false) {
    const needAsk = jobs.filter((j) => j.status === "error" || (Array.isArray(j.errors) && j.errors.length));
    for (const job of needAsk) {
      try {
        dataRequests.push(await requestEmployeeDataFromPlatform({
          companyId,
          companyName: job.company?.name || options.company?.name || "",
          employeeId: job.employee?.id || job.employee?.badgeId,
          badgeId: job.employee?.badgeId || job.employee?.id,
          employeeName: job.employee?.name || "",
          period,
          gaps: [...(job.errors || []), ...(job.printHints || [])],
          jobId: job.jobId,
          tenantScope,
          pull: false, // already pulled month; avoid N+1
          forceNotify: true,
          reason: "month_close_incomplete",
        }));
      } catch {
        /* continue */
      }
    }
  }

  const after = realPeriodJobs(companyId, period);
  const hasWork = after.length > 0 || Boolean(batchIngest?.count);
  const softGapJobs = after.filter((j) => (j.printHints || []).length > 0).length;
  const partial = Boolean(
    (batchIngest && batchIngest.count > 0 && !batchIngest.ok)
    || after.some((j) => j.status === "error")
    || softGapJobs > 0
    || (batchIngest?.results || []).some((r) => (r.printHints || []).length > 0)
  );
  const missingOnPlatform = !pull.skipped && !pull.ok && isMissingPlatformData(pull);
  const waitingForPlatform = !hasWork && (pull.skipped || !pull.ok);
  // Partial success is OK: incomplete employees stay as error + platform asked
  const ok = hasWork && releaseErrors.length === 0 && (!batchIngest || batchIngest.count > 0);
  const pullHint = humanizePullError(pull, period);

  const result = {
    ok,
    partial,
    waitingForPlatform,
    missingOnPlatform,
    incompleteAccepted: Boolean(pull.incomplete || partial),
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
    dataRequests: dataRequests.map((r) => ({
      employeeId: r.employeeId,
      message: r.message,
      notified: Boolean(r.platformNotify?.ok),
    })),
    alreadyReleased: alreadyReleased.map((j) => j.jobId),
    errored: errored.map((j) => ({ jobId: j.jobId, errors: j.errors })),
    message: !hasWork
      ? (waitingForPlatform
        ? `Noch keine Monatsdaten für ${period}. Die Plattform wurde aufgefordert zu senden – bitte „Erneut versuchen“ oder in der Plattform den Monat an die Buchhaltung pushen.`
        : pullHint)
      : partial
        ? `Teilweise übernommen (${period}): ${released.length} freigegeben, ${after.filter((j) => j.status === "error").length} mit Lücken – Plattform nach fehlenden Daten gefragt.`
        : autoRelease
          ? `Monatsabschluss ${period}: ${released.length} Abrechnung(en) an Plattform/Mitarbeiter gesendet.`
          : `Monatsabschluss ${period}: ${calculated.length} Abrechnung(en) berechnet (noch nicht freigegeben).`,
    canRetry: Boolean(waitingForPlatform || !ok),
    nextActions: waitingForPlatform
      ? [
          "Erneut versuchen (Pull)",
          "In der Plattform Monat freigeben / an Buchhaltung senden (POST /v1/payroll/batch)",
          "Railway: WORKPASS_PLATFORM_PAYROLL_PULL_URL oder WORKPASS_PLATFORM_BASE_URL prüfen",
        ]
      : [],
  };

  const company = { id: companyId, name: options.company?.name || "" };
  const monthClosePayload = {
    companyId,
    company,
    period,
    waitingForPlatform,
    ok,
    partial,
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
        + `Bitte in der Plattform den Monat freigeben und per POST /v1/payroll/batch an die Buchhaltung senden `
        + `(auch unvollständige Daten sind willkommen – fehlende Felder werden nachgefragt).`,
      code: "payroll_waiting",
      gaps: [{
        code: "payroll_waiting",
        field: "payroll.batch",
        label: "Monatsdaten fehlen",
        severity: "action_needed",
      }],
      source: "month-close",
    }, { notify: true, forceNotify: true });
    result.platformNotify = await notifyPlatform({
      event: "payroll.month.requested",
      company,
      monthClose: monthClosePayload,
      meta: {
        reason: pull.error || "no_data",
        allowIncomplete: true,
        pullAttempts: pull.attempts || [],
      },
      idempotencyKey: `month-req:${companyId}:${period}:${Date.now()}`,
    });
    await notifyPlatform({
      event: "payroll.waiting",
      company,
      monthClose: monthClosePayload,
      meta: { reason: pull.error || "no_data" },
    });
  } else if (options.notify !== false) {
    result.platformNotify = await notifyPlatform({
      event: ok ? (partial ? "month.close.partial" : "month.closed") : "month.close.failed",
      company,
      monthClose: monthClosePayload,
      meta: {
        released: released.map((r) => r.deliveryId).filter(Boolean),
        releaseErrors,
        dataRequests: result.dataRequests,
      },
    });
  }

  return result;
}

export { currentPeriod };
