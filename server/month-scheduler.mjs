/**
 * Automatic monthly payroll close for platform-activated firms.
 *
 * Default ON (like auto-pipeline). Disable with WORKPASS_AUTO_MONTH_CLOSE=0.
 *
 * Env:
 *   WORKPASS_AUTO_MONTH_CLOSE=0          (disable)
 *   WORKPASS_AUTO_MONTH_CLOSE_HOUR=6     (local server hour, default 6)
 *   WORKPASS_AUTO_MONTH_CLOSE_CONFIRM=1  (calculate only, no autoRelease)
 *   WORKPASS_AUTO_MONTH_CLOSE_PULL=0     (skip pull)
 *   WORKPASS_AUTO_MONTH_CLOSE_CATCHUP_DAYS=0
 *   WORKPASS_AUTO_PARALLEL_MONTHS=1  (opt-in: current + previous in one tick; default off)
 */
import { listCompanies } from "./db/repository.mjs";
import { runMonthClose, currentPeriod, previousPeriod } from "./month-close.mjs";
import { listAutomationCompanies } from "./automation-eligibility.mjs";
import { liveMonthJobs, recordCompanyAutomation } from "./automation-status.mjs";
import { maybeAutoSubmitElster } from "./elster/submit.mjs";

let timer = null;
let lastTickAt = null;
let lastResult = null;

function isLastDayOfMonth(d = new Date()) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getDate() === 1;
}

export function autoMonthCloseConfig() {
  const disabled = process.env.WORKPASS_AUTO_MONTH_CLOSE === "0"
    || process.env.WORKPASS_AUTO_MONTH_CLOSE === "false";
  const parallelMonths = process.env.WORKPASS_AUTO_PARALLEL_MONTHS === "1"
    || process.env.WORKPASS_AUTO_PARALLEL_MONTHS === "true";
  return {
    enabled: !disabled,
    hour: Number(process.env.WORKPASS_AUTO_MONTH_CLOSE_HOUR || 6),
    autoRelease: process.env.WORKPASS_AUTO_MONTH_CLOSE_CONFIRM !== "1",
    pull: process.env.WORKPASS_AUTO_MONTH_CLOSE_PULL !== "0",
    parallelMonths,
    catchUpDays: Math.max(0, Number(process.env.WORKPASS_AUTO_MONTH_CLOSE_CATCHUP_DAYS || 0)),
  };
}

/**
 * Default: only the current calendar month (never two months at once).
 * Opt in to previous+current with WORKPASS_AUTO_PARALLEL_MONTHS=1.
 */
export function periodsForAutoMonthClose(now = new Date(), cfg = autoMonthCloseConfig()) {
  if (cfg.parallelMonths) {
    return [...new Set([currentPeriod(now), previousPeriod(now)])];
  }
  const day = now.getDate();
  if (cfg.catchUpDays > 0 && day <= cfg.catchUpDays) {
    return [previousPeriod(now)];
  }
  if (isLastDayOfMonth(now) || day >= 25) {
    return [currentPeriod(now)];
  }
  return [];
}

export function autoMonthCloseStatus() {
  return {
    ...autoMonthCloseConfig(),
    running: Boolean(timer),
    lastTickAt,
    lastResult,
  };
}

export async function runAutoMonthCloseOnce(opts = {}) {
  const cfg = autoMonthCloseConfig();
  if (!cfg.enabled && !opts.force) {
    return { ok: false, skipped: true, reason: "WORKPASS_AUTO_MONTH_CLOSE=0" };
  }
  const now = opts.now || new Date();
  const periods = opts.period
    ? [opts.period]
    : (opts.periods || periodsForAutoMonthClose(now, cfg));
  if (!periods.length && !opts.force) {
    return { ok: false, skipped: true, reason: "outside monthly window", periods: [] };
  }
  const targetPeriods = periods.length ? periods : [opts.period || currentPeriod(now)];
  const companies = listAutomationCompanies(opts.companies || listCompanies());
  const results = [];

  for (const period of targetPeriods) {
    for (const c of companies) {
      const before = liveMonthJobs(c.id, period);
      if (before.complete && !opts.forceIncomplete) {
        results.push({
          companyId: c.id,
          period,
          ok: true,
          skipped: true,
          reason: "already_complete",
          jobs: before,
        });
        continue;
      }
      try {
        recordCompanyAutomation(c.id, period, {
          phase: "pull",
          source: "month_scheduler",
          message: `Monatsautomatik startet für ${period}…`,
        });
        const r = await runMonthClose({
          companyId: c.id,
          period,
          pull: opts.pull !== undefined ? opts.pull : cfg.pull,
          autoRelease: opts.autoRelease !== undefined ? opts.autoRelease : cfg.autoRelease,
          tenantScope: c.id,
        });
        const after = liveMonthJobs(c.id, period);
        recordCompanyAutomation(c.id, period, {
          phase: after.complete ? "done" : (r.waitingForPlatform ? "waiting" : (after.hasWork ? "release" : "ask")),
          source: "month_scheduler",
          ok: Boolean(r.ok || after.complete),
          waitingForPlatform: Boolean(r.waitingForPlatform),
          message: r.message || null,
        });
        let elster = null;
        if (after.complete || (after.released > 0 && after.error === 0)) {
          try {
            elster = await maybeAutoSubmitElster(c.id, period);
          } catch (e) {
            elster = { ok: false, error: e.message };
          }
        }
        results.push({
          companyId: c.id,
          period,
          ok: r.ok,
          waitingForPlatform: r.waitingForPlatform,
          message: r.message,
          jobs: after,
          elster: elster && !elster.skipped ? { ok: elster.ok, status: elster.status, mode: elster.mode } : undefined,
        });
      } catch (e) {
        recordCompanyAutomation(c.id, period, {
          phase: "error",
          source: "month_scheduler",
          ok: false,
          message: e.message,
        });
        results.push({ companyId: c.id, period, ok: false, error: e.message });
      }
    }
  }

  lastTickAt = new Date().toISOString();
  lastResult = {
    ok: results.every((r) => r.ok || r.waitingForPlatform || r.skipped),
    periods: targetPeriods,
    count: results.length,
    results,
    at: lastTickAt,
  };
  return lastResult;
}

export function startMonthCloseScheduler() {
  const cfg = autoMonthCloseConfig();
  if (!cfg.enabled) {
    console.log("[month-close] scheduler off (WORKPASS_AUTO_MONTH_CLOSE=0)");
    return { ok: false, enabled: false };
  }
  if (timer) clearInterval(timer);
  console.log(
    `[month-close] scheduler on · hour≥${cfg.hour} · parallel=${cfg.parallelMonths} · catchUpDays=${cfg.catchUpDays} · autoRelease=${cfg.autoRelease}`
  );
  // Boot tick: catch up previous month if we are in days 1–N
  setTimeout(() => {
    const now = new Date();
    const periods = periodsForAutoMonthClose(now, cfg);
    if (!periods.length) return;
    if (now.getHours() < cfg.hour && now.getDate() > cfg.catchUpDays && !isLastDayOfMonth(now)) {
      return;
    }
    runAutoMonthCloseOnce({ force: true, periods })
      .then((r) => console.log("[month-close] boot tick", JSON.stringify({ ok: r.ok, count: r.count, periods: r.periods })))
      .catch((e) => console.error("[month-close] boot tick failed", e.message));
  }, 20_000);

  timer = setInterval(async () => {
    const now = new Date();
    const periods = periodsForAutoMonthClose(now, cfg);
    if (!periods.length) return;
    if (now.getHours() < cfg.hour) return;
    console.log(`[month-close] auto tick periods=${periods.join(",")}`);
    try {
      const r = await runAutoMonthCloseOnce({ force: true, periods });
      console.log("[month-close] auto result", JSON.stringify({
        ok: r.ok,
        count: r.count,
        periods: r.periods,
      }));
    } catch (e) {
      console.error("[month-close] auto failed", e.message);
    }
  }, 15 * 60_000);
  return { ok: true, enabled: true, ...cfg };
}
