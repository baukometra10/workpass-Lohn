/**
 * Auto month-close on the last calendar day (optional).
 * Env:
 *   WORKPASS_AUTO_MONTH_CLOSE=1
 *   WORKPASS_AUTO_MONTH_CLOSE_HOUR=18   (local server hour, default 18)
 *   WORKPASS_AUTO_MONTH_CLOSE_CONFIRM=0  (if 1, only calculate, no autoRelease)
 */
import { listCompanies } from "./db/repository.mjs";
import { runMonthClose, currentPeriod } from "./month-close.mjs";

let timer = null;
let lastRunKey = "";

function isLastDayOfMonth(d = new Date()) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getDate() === 1;
}

export function autoMonthCloseConfig() {
  return {
    enabled: process.env.WORKPASS_AUTO_MONTH_CLOSE === "1",
    hour: Number(process.env.WORKPASS_AUTO_MONTH_CLOSE_HOUR || 18),
    autoRelease: process.env.WORKPASS_AUTO_MONTH_CLOSE_CONFIRM !== "1",
    pull: process.env.WORKPASS_AUTO_MONTH_CLOSE_PULL !== "0",
  };
}

export async function runAutoMonthCloseOnce(opts = {}) {
  const cfg = autoMonthCloseConfig();
  if (!cfg.enabled && !opts.force) {
    return { ok: false, skipped: true, reason: "WORKPASS_AUTO_MONTH_CLOSE not set" };
  }
  const now = opts.now || new Date();
  if (!opts.force && !isLastDayOfMonth(now)) {
    return { ok: false, skipped: true, reason: "not last day of month" };
  }
  const period = opts.period || currentPeriod(now);
  const companies = listCompanies().filter((c) => c.meta?.accountingEnabled !== false);
  const results = [];
  for (const c of companies) {
    try {
      const r = await runMonthClose({
        companyId: c.id,
        period,
        pull: opts.pull !== undefined ? opts.pull : cfg.pull,
        autoRelease: opts.autoRelease !== undefined ? opts.autoRelease : cfg.autoRelease,
        tenantScope: c.id,
      });
      results.push({ companyId: c.id, ok: r.ok, waitingForPlatform: r.waitingForPlatform, message: r.message });
    } catch (e) {
      results.push({ companyId: c.id, ok: false, error: e.message });
    }
  }
  return {
    ok: results.every((r) => r.ok || r.waitingForPlatform),
    period,
    count: results.length,
    results,
  };
}

export function startMonthCloseScheduler() {
  const cfg = autoMonthCloseConfig();
  if (!cfg.enabled) {
    console.log("[month-close] scheduler off (set WORKPASS_AUTO_MONTH_CLOSE=1 to enable)");
    return { ok: false, enabled: false };
  }
  if (timer) clearInterval(timer);
  console.log(`[month-close] scheduler on · hour≈${cfg.hour} · autoRelease=${cfg.autoRelease}`);
  timer = setInterval(async () => {
    const now = new Date();
    if (!isLastDayOfMonth(now)) return;
    if (now.getHours() < cfg.hour) return;
    const key = `${currentPeriod(now)}:${now.getDate()}`;
    if (lastRunKey === key) return;
    lastRunKey = key;
    console.log(`[month-close] auto run ${key}`);
    try {
      const r = await runAutoMonthCloseOnce({ force: true });
      console.log("[month-close] auto result", JSON.stringify({ ok: r.ok, count: r.count, period: r.period }));
    } catch (e) {
      console.error("[month-close] auto failed", e.message);
    }
  }, 15 * 60_000);
  return { ok: true, enabled: true, ...cfg };
}
