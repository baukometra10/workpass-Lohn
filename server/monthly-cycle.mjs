/**
 * Monthly payroll cadence: pull employees + hours once per month
 * (preferred on day 28 or 29), calculate, release to platform — no repeats.
 *
 * Env:
 *   WORKPASS_MONTHLY_ONCE=1              default ON (set 0 to allow multi pulls)
 *   WORKPASS_MONTHLY_PAYROLL_DAYS=28,29  preferred calendar days
 *   WORKPASS_MONTHLY_CATCHUP=1           after preferred days, one catch-up until complete
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { resolveDataDir } from "./paths.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { liveMonthJobs } from "./automation-status.mjs";
import { currentPeriod } from "./month-close.mjs";

function storePath() {
  return path.join(resolveDataDir(), "monthly-cycle.json");
}

function loadStore() {
  try {
    const p = storePath();
    if (!existsSync(p)) return { cycles: {} };
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return { cycles: raw?.cycles && typeof raw.cycles === "object" ? raw.cycles : {} };
  } catch {
    return { cycles: {} };
  }
}

function saveStore(store) {
  const dir = resolveDataDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf8");
}

function keyOf(companyId, period) {
  return `${normalizeCompanyId(companyId)}::${String(period || "").slice(0, 7)}`;
}

export function monthlyCycleConfig() {
  const onceOff = process.env.WORKPASS_MONTHLY_ONCE === "0"
    || process.env.WORKPASS_MONTHLY_ONCE === "false";
  const daysRaw = String(process.env.WORKPASS_MONTHLY_PAYROLL_DAYS || "28,29");
  const preferredDays = daysRaw
    .split(/[,;\s]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
  return {
    oncePerMonth: !onceOff,
    preferredDays: preferredDays.length ? preferredDays : [28, 29],
    catchUp: process.env.WORKPASS_MONTHLY_CATCHUP !== "0",
  };
}

export function daysInMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/** Preferred run days for this calendar month (clamped to month length). */
export function preferredPayrollDays(now = new Date(), cfg = monthlyCycleConfig()) {
  const last = daysInMonth(now);
  const days = [...new Set(cfg.preferredDays.map((d) => Math.min(d, last)))].sort((a, b) => a - b);
  return days.length ? days : [Math.min(28, last)];
}

export function isInMonthlyPayrollWindow(now = new Date(), cfg = monthlyCycleConfig()) {
  const day = now.getDate();
  const preferred = preferredPayrollDays(now, cfg);
  const first = preferred[0];
  if (preferred.includes(day)) return true;
  // Catch-up after preferred days until month end (if not yet completed)
  if (cfg.catchUp && day > first) return true;
  return false;
}

export function getMonthlyCycle(companyId, period) {
  const store = loadStore();
  return store.cycles[keyOf(companyId, period)] || null;
}

export function patchMonthlyCycle(companyId, period, patch = {}) {
  const id = normalizeCompanyId(companyId);
  const p = String(period || "").slice(0, 7);
  if (!id || !/^\d{4}-\d{2}$/.test(p)) return null;
  const store = loadStore();
  const key = keyOf(id, p);
  const prev = store.cycles[key] || { companyId: id, period: p };
  const next = {
    ...prev,
    ...patch,
    companyId: id,
    period: p,
    updatedAt: new Date().toISOString(),
  };
  store.cycles[key] = next;
  saveStore(store);
  return next;
}

export function markMonthlyPulled(companyId, period, meta = {}) {
  return patchMonthlyCycle(companyId, period, {
    pulledAt: new Date().toISOString(),
    pullSource: meta.source || "auto",
    pullCount: Number(getMonthlyCycle(companyId, period)?.pullCount || 0) + 1,
  });
}

export function markMonthlyCalculated(companyId, period) {
  return patchMonthlyCycle(companyId, period, {
    calculatedAt: new Date().toISOString(),
  });
}

export function markMonthlyCycleComplete(companyId, period) {
  return patchMonthlyCycle(companyId, period, {
    completedAt: new Date().toISOString(),
    status: "done",
  });
}

/**
 * Decide whether auto pipeline may pull/calculate for this company+period.
 * Manual / portal force always allowed.
 */
export function shouldRunMonthlyAutoCycle({
  companyId,
  period,
  force = false,
  source = "auto",
  now = new Date(),
  allowPull = true,
} = {}) {
  const cfg = monthlyCycleConfig();
  const id = normalizeCompanyId(companyId);
  const p = String(period || currentPeriod(now)).slice(0, 7);
  const jobs = liveMonthJobs(id, p);
  const cycle = getMonthlyCycle(id, p);
  const manual = force
    || String(source || "").startsWith("portal")
    || source === "manual"
    || source === "api_force";

  if (manual) {
    return {
      ok: true,
      pull: true,
      calculate: true,
      reason: "manual",
      cfg,
      cycle,
      jobs,
      label: "Manuell / Portal – einmaliger Lauf erlaubt",
    };
  }

  if (jobs.complete || cycle?.completedAt) {
    if (jobs.complete && !cycle?.completedAt) markMonthlyCycleComplete(id, p);
    return {
      ok: false,
      pull: false,
      calculate: false,
      reason: "already_done_this_month",
      cfg,
      cycle: getMonthlyCycle(id, p),
      jobs,
      label: `Monat ${p} bereits einmal abgeschlossen – kein erneuter Abruf/Berechnung`,
    };
  }

  if (!cfg.oncePerMonth) {
    return {
      ok: true,
      pull: allowPull,
      calculate: true,
      reason: "once_disabled",
      cfg,
      cycle,
      jobs,
      label: "Monats-Einmal-Regel aus",
    };
  }

  const inWindow = isInMonthlyPayrollWindow(now, cfg);
  const preferred = preferredPayrollDays(now, cfg);

  // Period is previous month: allow catch-up anytime until complete (once)
  const cur = currentPeriod(now);
  const isPrevious = p < cur;
  if (!inWindow && !isPrevious) {
    return {
      ok: false,
      pull: false,
      calculate: false,
      reason: "before_payroll_day",
      cfg,
      cycle,
      jobs,
      preferredDays: preferred,
      label: `Warte auf Monats-Lauf (Tag ${preferred.join("/")}) – kein früher Abruf`,
    };
  }

  // Already pulled once this month → do not pull again; may still release leftover calculated
  if (cycle?.pulledAt) {
    return {
      ok: true,
      pull: false,
      calculate: jobs.calculated > 0 || jobs.error > 0 || !jobs.hasWork,
      reason: "already_pulled_once",
      cfg,
      cycle,
      jobs,
      preferredDays: preferred,
      label: `Mitarbeiterdaten für ${p} bereits einmal geholt (${String(cycle.pulledAt).slice(0, 10)}) – kein erneuter Abruf`,
    };
  }

  return {
    ok: true,
    pull: allowPull,
    calculate: true,
    reason: "payroll_window",
    cfg,
    cycle,
    jobs,
    preferredDays: preferred,
    label: `Monatsfenster Tag ${preferred.join("/")} – einmaliger Abruf + Berechnung`,
  };
}

export function monthlyCycleStatusSnapshot(companyId, period, now = new Date()) {
  const gate = shouldRunMonthlyAutoCycle({ companyId, period, now, source: "status" });
  return {
    kind: "platform.accounting.monthly_cycle.v1",
    companyId: normalizeCompanyId(companyId),
    period: String(period || "").slice(0, 7),
    oncePerMonth: gate.cfg.oncePerMonth,
    preferredDays: preferredPayrollDays(now, gate.cfg),
    inWindow: isInMonthlyPayrollWindow(now, gate.cfg),
    cycle: gate.cycle,
    jobs: gate.jobs,
    canAutoPull: Boolean(gate.ok && gate.pull),
    canAutoCalculate: Boolean(gate.ok && gate.calculate),
    reason: gate.reason,
    label: gate.label,
  };
}
