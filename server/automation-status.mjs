/**
 * Persist per-company / per-period automation progress for the firm portal.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { resolveDataDir } from "./paths.mjs";
import { listPayrollJobs, loadCompany } from "./db/repository.mjs";
import { listEmployees } from "./employee-registry.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { isPayrollAutomationEnabled } from "./automation-eligibility.mjs";

function statusPath() {
  return path.join(resolveDataDir(), "automation-status.json");
}

function emptyStore() {
  return { byCompanyPeriod: {}, lastGlobal: null };
}

function loadStore() {
  try {
    const p = statusPath();
    if (!existsSync(p)) return emptyStore();
    const raw = JSON.parse(readFileSync(p, "utf8"));
    if (!raw || typeof raw !== "object") return emptyStore();
    return {
      byCompanyPeriod: raw.byCompanyPeriod && typeof raw.byCompanyPeriod === "object"
        ? raw.byCompanyPeriod
        : {},
      lastGlobal: raw.lastGlobal || null,
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  const dir = resolveDataDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(statusPath(), JSON.stringify(store, null, 2), "utf8");
}

function keyOf(companyId, period) {
  return `${normalizeCompanyId(companyId)}::${period}`;
}

export function liveMonthJobs(companyId, period) {
  const id = normalizeCompanyId(companyId);
  const jobs = listPayrollJobs({ companyId: id, period }).filter((j) => !isDemoPayrollJob(j));
  const released = jobs.filter((j) => j.status === "released").length;
  const calculated = jobs.filter((j) => j.status === "calculated").length;
  const error = jobs.filter((j) => j.status === "error").length;
  const employees = listEmployees(id).length;
  const complete = jobs.length > 0 && released === jobs.length && error === 0;
  return {
    jobs: jobs.length,
    released,
    calculated,
    error,
    employees,
    complete,
    hasWork: jobs.length > 0,
  };
}

/**
 * @param {object} patch
 * @param {string} [patch.phase] ask|pull|calc|release|done|waiting|error|idle
 * @param {string} [patch.source] auto_pipeline|month_scheduler|manual
 * @param {string} [patch.message]
 * @param {boolean} [patch.ok]
 * @param {boolean} [patch.waitingForPlatform]
 */
export function recordCompanyAutomation(companyId, period, patch = {}) {
  const id = normalizeCompanyId(companyId);
  if (!id || !period) return null;
  const store = loadStore();
  const key = keyOf(id, period);
  const jobs = liveMonthJobs(id, period);
  const prev = store.byCompanyPeriod[key] || {};
  const phase = patch.phase
    || (jobs.complete ? "done" : (patch.waitingForPlatform ? "waiting" : (jobs.hasWork ? "release" : prev.phase || "ask")));
  const entry = {
    ...prev,
    companyId: id,
    period,
    updatedAt: new Date().toISOString(),
    phase,
    source: patch.source || prev.source || "auto",
    ok: patch.ok != null ? Boolean(patch.ok) : (jobs.complete || Boolean(prev.ok)),
    waitingForPlatform: Boolean(patch.waitingForPlatform),
    message: patch.message != null ? String(patch.message) : (prev.message || null),
    jobs,
    lastRunAt: new Date().toISOString(),
  };
  if (jobs.complete) {
    entry.phase = "done";
    entry.ok = true;
    entry.waitingForPlatform = false;
    entry.completedAt = entry.completedAt || entry.updatedAt;
  }
  store.byCompanyPeriod[key] = entry;
  store.lastGlobal = {
    companyId: id,
    period,
    at: entry.updatedAt,
    phase: entry.phase,
    source: entry.source,
  };
  saveStore(store);
  return entry;
}

export function getCompanyAutomationStatus(companyId, period) {
  const id = normalizeCompanyId(companyId);
  if (!id) {
    return { ok: false, error: "companyId fehlt" };
  }
  const company = loadCompany(id);
  const eligible = isPayrollAutomationEnabled(company);
  const jobs = liveMonthJobs(id, period);
  const store = loadStore();
  const saved = store.byCompanyPeriod[keyOf(id, period)] || null;
  const phase = jobs.complete
    ? "done"
    : (saved?.phase || (jobs.hasWork ? "calc" : (eligible ? "idle" : "off")));
  let percent = 0;
  if (phase === "done" || jobs.complete) percent = 100;
  else if (phase === "release") percent = jobs.jobs ? Math.round((jobs.released / jobs.jobs) * 90) + 10 : 70;
  else if (phase === "calc") percent = 55;
  else if (phase === "pull" || phase === "ask") percent = 35;
  else if (phase === "waiting") percent = 40;
  else if (phase === "error") percent = 20;
  else if (eligible) percent = 10;

  const message = jobs.complete
    ? `Automatik fertig: ${jobs.released} Abrechnung(en) für ${period} an die Plattform gesendet.`
    : (saved?.message
      || (eligible
        ? (jobs.hasWork
          ? `Automatik aktiv · ${jobs.released}/${jobs.jobs} freigegeben · Monat ${period}`
          : `Automatik aktiv · WorkPass holt und berechnet Monat ${period} automatisch.`)
        : "Automatik aus – Buchhaltung nicht von der Plattform freigeschaltet."));

  return {
    ok: true,
    companyId: id,
    period,
    eligible,
    automationEnabled: eligible,
    phase,
    percent,
    message,
    waitingForPlatform: Boolean(saved?.waitingForPlatform) && !jobs.complete,
    source: saved?.source || null,
    lastRunAt: saved?.lastRunAt || null,
    completedAt: saved?.completedAt || (jobs.complete ? saved?.updatedAt : null) || null,
    jobs,
    steps: {
      pull: phase === "done" || ["calc", "release", "done"].includes(phase) ? "done" : (phase === "pull" || phase === "ask" || phase === "waiting" ? "active" : "todo"),
      calc: phase === "done" || phase === "release" ? "done" : (phase === "calc" ? "active" : "todo"),
      release: phase === "done" ? "done" : (phase === "release" ? "active" : "todo"),
      done: phase === "done" || jobs.complete ? "done" : "todo",
    },
  };
}
