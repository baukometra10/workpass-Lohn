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
 *   WORKPASS_AUTO_MONTH_CLOSE_CATCHUP_DAYS=7
 *   WORKPASS_AUTO_PARALLEL_MONTHS=1  (current + previous in one tick; set 0 to disable)
 */
import { listCompanies } from "./db/repository.mjs";
import { runMonthClose, currentPeriod, previousPeriod } from "./month-close.mjs";
import { listAutomationCompanies } from "./automation-eligibility.mjs";
import { liveMonthJobs, recordCompanyAutomation } from "./automation-status.mjs";
import { maybeAutoSubmitElster, maybeAutoSubmitLsta } from "./elster/submit.mjs";
import {
  shouldRunMonthlyAutoCycle,
  markMonthlyPulled,
  markMonthlyCycleComplete,
  preferredPayrollDays,
  monthlyCycleConfig,
} from "./monthly-cycle.mjs";

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
  const parallelMonths = process.env.WORKPASS_AUTO_PARALLEL_MONTHS !== "0"
    && process.env.WORKPASS_AUTO_PARALLEL_MONTHS !== "false";
  const monthly = monthlyCycleConfig();
  return {
    enabled: !disabled,
    hour: Number(process.env.WORKPASS_AUTO_MONTH_CLOSE_HOUR || 6),
    autoRelease: process.env.WORKPASS_AUTO_MONTH_CLOSE_CONFIRM !== "1",
    pull: process.env.WORKPASS_AUTO_MONTH_CLOSE_PULL !== "0",
    parallelMonths,
    catchUpDays: Math.max(0, Number(process.env.WORKPASS_AUTO_MONTH_CLOSE_CATCHUP_DAYS || 7)),
    monthlyOnce: monthly.oncePerMonth,
    monthlyPayrollDays: monthly.preferredDays,
  };
}

/**
 * Prefer days 28/29 (monthly cycle). Parallel months still allowed for previous month catch-up.
 */
export function periodsForAutoMonthClose(now = new Date(), cfg = autoMonthCloseConfig()) {
  const day = now.getDate();
  const preferred = preferredPayrollDays(now, monthlyCycleConfig());
  const inPreferred = preferred.includes(day) || (cfg.monthlyOnce && day >= preferred[0]);

  if (cfg.parallelMonths) {
    // Only run inside monthly window (or catch-up after day 28)
    if (!inPreferred && !optsForceWindow(cfg, day)) {
      // Early month: only finish previous month if still open (once)
      if (day < preferred[0]) return [previousPeriod(now)];
    }
    return [...new Set([currentPeriod(now), previousPeriod(now)])];
  }
  if (cfg.catchUpDays > 0 && day <= cfg.catchUpDays) {
    return [previousPeriod(now)];
  }
  if (inPreferred || isLastDayOfMonth(now) || day >= preferred[0]) {
    return [currentPeriod(now)];
  }
  return [];
}

function optsForceWindow(cfg, day) {
  return !cfg.monthlyOnce;
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
        markMonthlyCycleComplete(c.id, period);
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

      const gate = shouldRunMonthlyAutoCycle({
        companyId: c.id,
        period,
        force: Boolean(opts.force),
        source: opts.force ? "api_force" : "month_scheduler",
        now,
        allowPull: opts.pull !== undefined ? opts.pull !== false : cfg.pull,
      });
      if (!gate.ok && !opts.force) {
        results.push({
          companyId: c.id,
          period,
          ok: true,
          skipped: true,
          reason: gate.reason,
          message: gate.label,
          jobs: before,
        });
        continue;
      }
      if (gate.reason === "already_pulled_once" && !opts.force && !before.calculated) {
        results.push({
          companyId: c.id,
          period,
          ok: true,
          skipped: true,
          reason: "already_pulled_once",
          message: gate.label,
          jobs: before,
        });
        continue;
      }

      try {
        recordCompanyAutomation(c.id, period, {
          phase: "pull",
          source: "month_scheduler",
          message: `Monatsautomatik (Tag ${preferredPayrollDays(now).join("/")}) für ${period}…`,
        });
        const doPull = gate.pull && (opts.pull !== undefined ? opts.pull : cfg.pull);
        if (doPull) {
          markMonthlyPulled(c.id, period, { source: "month_scheduler" });
        }
        const r = await runMonthClose({
          companyId: c.id,
          period,
          pull: doPull,
          autoRelease: opts.autoRelease !== undefined ? opts.autoRelease : cfg.autoRelease,
          tenantScope: c.id,
        });
        const after = liveMonthJobs(c.id, period);
        if (after.complete) markMonthlyCycleComplete(c.id, period);
        recordCompanyAutomation(c.id, period, {
          phase: after.complete ? "done" : (r.waitingForPlatform ? "waiting" : (after.hasWork ? "release" : "ask")),
          source: "month_scheduler",
          ok: Boolean(r.ok || after.complete),
          waitingForPlatform: Boolean(r.waitingForPlatform),
          message: r.message || null,
        });
        let elster = null;
        let lsta = null;
        if (after.complete || (after.released > 0 && after.error === 0)) {
          try {
            lsta = await maybeAutoSubmitLsta(c.id, period);
          } catch (e) {
            lsta = { ok: false, error: e.message };
          }
          if (String(period || "").endsWith("-12")) {
            try {
              elster = await maybeAutoSubmitElster(c.id, period);
            } catch (e) {
              elster = { ok: false, error: e.message };
            }
          }
        }
        results.push({
          companyId: c.id,
          period,
          ok: r.ok,
          waitingForPlatform: r.waitingForPlatform,
          message: r.message,
          jobs: after,
          monthlyCycle: { reason: gate.reason, pull: doPull },
          lsta: lsta && !lsta.skipped ? { ok: lsta.ok, status: lsta.status, mode: lsta.mode } : undefined,
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
