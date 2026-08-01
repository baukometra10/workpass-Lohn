/**
 * Auto-pipeline: inbound batch → calculate + release; ask platform for data.
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import {
  processInboundPayrollBatch,
  askPlatformAndSyncCompany,
  autoPipelineConfig,
} from "../server/auto-pipeline.mjs";
import { listPayrollJobs } from "../server/db/repository.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const prevAuto = process.env.WORKPASS_AUTO_PIPELINE;
process.env.WORKPASS_AUTO_PIPELINE = "1";

const id = `ap${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Auto Pipeline GmbH", taxNumber: "12/345/67890" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== config default on ===");
assert(autoPipelineConfig().enabled === true, "auto pipeline enabled");
assert(autoPipelineConfig().autoRelease === true, "auto release on");

console.log("\n=== inbound batch auto release ===");
const batch = await processInboundPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period: "2026-08",
  company: { id, name: "Auto Pipeline GmbH", taxNumber: "12/345/67890" },
  employees: [{
    employee: {
      id: "A-1",
      badgeId: "A-1",
      name: "Auto User",
      taxClass: "I",
      healthFund: "TK",
      healthPercent: "14.6",
    },
    attendance: { days: 20, hours: 160 },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3200, taxFlag: "L", svFlag: "L" }],
    bank: { name: "Bank", iban: "DE89370400440532013000" },
  }],
}, { tenantScope: id, notify: false });

assert(batch.count === 1, "ingested 1");
assert(batch.releasedCount === 1, `released 1 (got ${batch.releasedCount})`);
assert(listPayrollJobs({ companyId: id, period: "2026-08" })[0]?.status === "released", "job released");

console.log("\n=== ask platform sync (no pull data) ===");
const sync = await askPlatformAndSyncCompany({
  companyId: id,
  companyName: "Auto Pipeline GmbH",
  period: "2026-08",
  pull: false,
  autoRelease: true,
  notify: false,
  reason: "test",
});
assert(Boolean(sync.message), "sync message");
assert(sync.companyId === id, "company id");

deleteCompany({ id });
if (prevAuto == null) delete process.env.WORKPASS_AUTO_PIPELINE;
else process.env.WORKPASS_AUTO_PIPELINE = prevAuto;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
