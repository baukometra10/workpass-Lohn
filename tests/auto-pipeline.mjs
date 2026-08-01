/**
 * Auto-pipeline: inbound batch → calculate + release; ask platform for data.
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import {
  processInboundPayrollBatch,
  processInboundInvoiceBatch,
  askPlatformAndSyncCompany,
  autoPipelineConfig,
} from "../server/auto-pipeline.mjs";
import { listPayrollJobs, listInvoiceJobs } from "../server/db/repository.mjs";
import { listInvoiceArchive } from "../server/portal-service.mjs";

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

console.log("\n=== smart skip when month complete ===");
const skip = await askPlatformAndSyncCompany({
  companyId: id,
  companyName: "Auto Pipeline GmbH",
  period: "2026-08",
  pull: false,
  autoRelease: true,
  notify: false,
  reason: "test",
});
assert(skip.skipped === true || skip.ok === true, "skip or ok");
assert(/fertig|freigegeben/i.test(skip.message || ""), `complete message: ${skip.message}`);

console.log("\n=== ask platform sync (no pull data) ===");
const idle = `ap2${Date.now().toString(36)}`;
activateCompany({
  company: { id: idle, name: "Idle Auto GmbH", taxNumber: "12/345/67891" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});
const sync = await askPlatformAndSyncCompany({
  companyId: idle,
  companyName: "Idle Auto GmbH",
  period: "2026-08",
  pull: false,
  autoRelease: true,
  notify: false,
  forceAsk: true,
  reason: "test",
});
assert(Boolean(sync.message), "sync message");
assert(sync.companyId === idle, "company id");

console.log("\n=== inbound invoice batch auto release ===");
const invBatch = await processInboundInvoiceBatch({
  kind: "platform.invoice.batch.v1",
  period: "2026-08",
  company: { id, name: "Auto Pipeline GmbH", taxNumber: "12/345/67890" },
  invoices: [{
    number: `RE-AP-${Date.now().toString(36)}`,
    invoiceDate: "2026-08-10",
    customer: "Kunde Test\nWeg 1\n10115 Berlin",
    taxRate: 19,
    items: [{ description: "Leistung", quantity: 1, unitPrice: 119, unit: "Stk" }],
  }],
}, { tenantScope: id, notify: false });

assert(invBatch.count === 1, "invoice ingested 1");
assert(invBatch.releasedCount === 1, `invoice released 1 (got ${invBatch.releasedCount})`);
assert(listInvoiceJobs({ companyId: id }).some((j) => j.status === "released"), "invoice job released");
const arch = listInvoiceArchive(id, { includeAll: true });
assert(arch.ok && arch.count >= 1, "invoice archive lists jobs");

deleteCompany({ id });
deleteCompany({ id: idle });
if (prevAuto == null) delete process.env.WORKPASS_AUTO_PIPELINE;
else process.env.WORKPASS_AUTO_PIPELINE = prevAuto;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
