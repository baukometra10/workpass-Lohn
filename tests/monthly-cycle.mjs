/**
 * Monthly once-per-month cadence tests.
 * Run: node tests/monthly-cycle.mjs
 */
import {
  preferredPayrollDays,
  isInMonthlyPayrollWindow,
  shouldRunMonthlyAutoCycle,
  monthlyCycleConfig,
  markMonthlyPulled,
  markMonthlyCycleComplete,
  getMonthlyCycle,
} from "../server/monthly-cycle.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("\n=== Monthly cycle ===");

const cfg = monthlyCycleConfig();
assert(cfg.oncePerMonth === true, "oncePerMonth default on");
assert(cfg.preferredDays.includes(28) && cfg.preferredDays.includes(29), "preferred 28,29");

const feb = new Date(2026, 1, 28); // Feb 28 2026
assert(preferredPayrollDays(feb).includes(28), "feb preferred includes 28");
assert(isInMonthlyPayrollWindow(feb) === true, "feb 28 in window");

const early = new Date(2026, 7, 10); // Aug 10
assert(isInMonthlyPayrollWindow(early) === false, "aug 10 not in window");

const late = new Date(2026, 7, 30);
assert(isInMonthlyPayrollWindow(late) === true, "aug 30 catch-up in window");

const companyId = `cmp-monthly-test-${Date.now()}`;
const period = "2026-08";

const before = shouldRunMonthlyAutoCycle({
  companyId,
  period,
  now: early,
  source: "auto_pipeline",
});
assert(before.ok === false && before.reason === "before_payroll_day", "auto blocked before day 28");

const manual = shouldRunMonthlyAutoCycle({
  companyId,
  period,
  now: early,
  source: "portal_sync",
  force: true,
});
assert(manual.ok === true, "portal/manual allowed early");

const win = shouldRunMonthlyAutoCycle({
  companyId,
  period,
  now: new Date(2026, 7, 28),
  source: "auto_pipeline",
});
assert(win.ok === true && win.pull === true, "day 28 allows pull");

markMonthlyPulled(companyId, period, { source: "test" });
assert(Boolean(getMonthlyCycle(companyId, period)?.pulledAt), "pulledAt stored");

const again = shouldRunMonthlyAutoCycle({
  companyId,
  period,
  now: new Date(2026, 7, 29),
  source: "auto_pipeline",
});
assert(again.ok === true && again.pull === false && again.reason === "already_pulled_once", "second auto pull blocked");

markMonthlyCycleComplete(companyId, period);
const done = shouldRunMonthlyAutoCycle({
  companyId,
  period,
  now: new Date(2026, 7, 29),
  source: "auto_pipeline",
});
assert(done.ok === false && done.reason === "already_done_this_month", "complete blocks further auto");

console.log(`\n=== Monthly-cycle Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed ? 1 : 0);
