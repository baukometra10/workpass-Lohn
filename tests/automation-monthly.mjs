/**
 * Monthly automation: eligibility + scheduler periods + status persistence.
 */
import { activateCompany, deactivateCompany, deleteCompany } from "../server/company-service.mjs";
import { isPayrollAutomationEnabled, listAutomationCompanies } from "../server/automation-eligibility.mjs";
import {
  autoMonthCloseConfig,
  periodsForAutoMonthClose,
  runAutoMonthCloseOnce,
} from "../server/month-scheduler.mjs";
import {
  getCompanyAutomationStatus,
  recordCompanyAutomation,
  liveMonthJobs,
} from "../server/automation-status.mjs";
import { processInboundPayrollBatch } from "../server/auto-pipeline.mjs";
import { listCompanies } from "../server/db/repository.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const prevMonthClose = process.env.WORKPASS_AUTO_MONTH_CLOSE;
const prevPipe = process.env.WORKPASS_AUTO_PIPELINE;
process.env.WORKPASS_AUTO_MONTH_CLOSE = "1";
process.env.WORKPASS_AUTO_PIPELINE = "1";

const activeId = `am${Date.now().toString(36)}`;
const inactiveId = `ami${Date.now().toString(36)}`;

console.log("\n=== activate eligible firm ===");
activateCompany({
  company: { id: activeId, name: "Auto Monat GmbH", taxNumber: "11/222/33344" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});
const active = listCompanies().find((c) => c.id === activeId);
assert(isPayrollAutomationEnabled(active) === true, "activated firm is automation-eligible");
assert(listAutomationCompanies(listCompanies()).some((c) => c.id === activeId), "listed in automation companies");

console.log("\n=== deactivated / not enabled ===");
activateCompany({
  company: { id: inactiveId, name: "Off Firma", taxNumber: "11/222/33345" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});
deactivateCompany(inactiveId);
const inactive = listCompanies().find((c) => c.id === inactiveId);
assert(isPayrollAutomationEnabled(inactive) === false, "deactivated firm not eligible");
assert(isPayrollAutomationEnabled({ id: "x", meta: {} }) === false, "missing accountingEnabled not eligible");
assert(isPayrollAutomationEnabled({ id: "y", meta: { accountingEnabled: false } }) === false, "false flag not eligible");

console.log("\n=== period window ===");
const lastDay = new Date(2026, 7, 31); // Aug 31 2026
const periodsLast = periodsForAutoMonthClose(lastDay);
assert(periodsLast.includes("2026-08"), `last day includes current (${periodsLast})`);
const early = new Date(2026, 8, 2); // Sep 2
const periodsEarly = periodsForAutoMonthClose(early);
assert(periodsEarly.includes("2026-09") || periodsEarly.length === 0, `default catch-up off (${periodsEarly})`);
assert(!periodsEarly.includes("2026-08"), "auto never closes previous+current together");
const mid = new Date(2026, 8, 15);
assert(periodsForAutoMonthClose(mid).length === 0, "mid-month outside close window");
const catchCfg = { ...autoMonthCloseConfig(), catchUpDays: 7 };
assert(periodsForAutoMonthClose(early, catchCfg).includes("2026-08"), "optional catch-up previous only");
assert(!periodsForAutoMonthClose(early, catchCfg).includes("2026-09"), "catch-up does not add current month");

console.log("\n=== config default on ===");
delete process.env.WORKPASS_AUTO_MONTH_CLOSE;
assert(autoMonthCloseConfig().enabled === true, "month close default enabled");
process.env.WORKPASS_AUTO_MONTH_CLOSE = "0";
assert(autoMonthCloseConfig().enabled === false, "month close disabled with 0");
process.env.WORKPASS_AUTO_MONTH_CLOSE = "1";

console.log("\n=== status + auto month close run ===");
const period = "2026-08";
recordCompanyAutomation(activeId, period, {
  phase: "ask",
  source: "test",
  message: "start",
});
let st = getCompanyAutomationStatus(activeId, period);
assert(st.ok && st.eligible === true, "status eligible");
assert(st.phase === "ask" || st.phase === "idle", `phase recorded (${st.phase})`);

await processInboundPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period,
  company: { id: activeId, name: "Auto Monat GmbH", taxNumber: "11/222/33344" },
  employees: [{
    employee: {
      id: "M-1",
      badgeId: "M-1",
      name: "Monat User",
      taxClass: "I",
      healthFund: "TK",
      healthPercent: "14.6",
    },
    attendance: { days: 20, hours: 160 },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3100, taxFlag: "L", svFlag: "L" }],
    bank: { name: "Bank", iban: "DE89370400440532013000" },
  }],
}, { tenantScope: activeId, notify: false });

const jobs = liveMonthJobs(activeId, period);
assert(jobs.complete === true, `batch auto-released (${jobs.released}/${jobs.jobs})`);

const close = await runAutoMonthCloseOnce({
  force: true,
  period,
  companies: [active],
  notify: false,
});
assert(close.ok === true, "month close once ok");
assert(close.results.some((r) => r.companyId === activeId), "active firm processed");
assert(!close.results.some((r) => r.companyId === inactiveId), "inactive firm skipped");

st = getCompanyAutomationStatus(activeId, period);
assert(st.phase === "done", `status done (${st.phase})`);
assert(st.percent === 100, "percent 100");

deleteCompany({ id: activeId });
deleteCompany({ id: inactiveId });
if (prevMonthClose == null) delete process.env.WORKPASS_AUTO_MONTH_CLOSE;
else process.env.WORKPASS_AUTO_MONTH_CLOSE = prevMonthClose;
if (prevPipe == null) delete process.env.WORKPASS_AUTO_PIPELINE;
else process.env.WORKPASS_AUTO_PIPELINE = prevPipe;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
