/**
 * Integration tests for Platform Bridge (no HTTP – direct service calls)
 * Run: node tests/api-bridge.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ingestPayroll, ingestPayrollBatch, releasePayrollJob } from "../server/payroll-service.mjs";
import { ingestInvoice, releaseInvoiceJob } from "../server/invoice-service.mjs";
import { listPayrollJobs } from "../server/store.mjs";
import { listPendingDeliveries, ackDelivery } from "../server/delivery-queue.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

console.log("\n=== API Bridge: Payroll ingest ===");
const payroll = JSON.parse(readFileSync(path.join(root, "examples/platform-payroll.v1.json"), "utf8"));
const one = await ingestPayroll(payroll);
assert(one.ok, "Einzel-Ingest ok");
assert(one.payslip?.kind === "platform.payslip.v1", "payslip.v1 Kind");
assert(one.payslip?.totals?.gross > 0, `Brutto ${one.payslip?.totals?.gross}`);
assert(one.payslip?.totals?.net > 0, `Netto ${one.payslip?.totals?.net}`);
assert(one.job?.status === "calculated", `Status ${one.job?.status}`);
assert(Boolean(one.job?.jobId), `jobId ${one.job?.jobId}`);

console.log("\n=== API Bridge: Batch ===");
const batch = JSON.parse(readFileSync(path.join(root, "examples/platform-payroll.batch.v1.json"), "utf8"));
const batchRes = await ingestPayrollBatch(batch);
assert(batchRes.ok, "Batch ok");
assert(batchRes.count === 2, `2 Mitarbeiter (${batchRes.count})`);
assert(batchRes.results.every((r) => r.payslip?.totals?.net > 0), "Beide Netto > 0");

console.log("\n=== API Bridge: Release (Plattform → Mitarbeiter-App) ===");
const rel = await releasePayrollJob(one.job.jobId);
assert(rel.ok, "Release ok");
assert(rel.job?.status === "released", "Status released");
assert(rel.payslip?.status === "released", "Payslip released für Plattform-Zustellung");
assert(rel.delivery?.kind === "platform.employee.delivery.v1", "Delivery-Paket vorhanden");
assert(rel.delivery?.type === "payslip", "Delivery type payslip");
assert(Boolean(rel.delivery?.deliveryId), `deliveryId ${rel.delivery?.deliveryId}`);
assert(rel.platformNotify?.ok, `Notify ok (mode ${rel.platformNotify?.mode})`);

console.log("\n=== API Bridge: Delivery Queue ===");
const pending = listPendingDeliveries();
assert(pending.some((d) => d.deliveryId === rel.delivery.deliveryId), "In Pending-Queue");
const ack = ackDelivery(rel.delivery.deliveryId, { test: true });
assert(ack.ok && ack.delivery?.queueStatus === "delivered", "Ack → delivered");

console.log("\n=== API Bridge: Invoice ===");
const invoice = JSON.parse(readFileSync(path.join(root, "examples/platform-invoice.v1.json"), "utf8"));
const inv = ingestInvoice(invoice);
assert(inv.ok, "Invoice ingest ok");
assert(inv.job?.draft?.totals?.gross > 0, `Invoice Brutto ${inv.job?.draft?.totals?.gross}`);
assert(inv.job?.company?.id === "muster-gmbh", `Invoice company.id ${inv.job?.company?.id}`);
assert(String(inv.job?.id || "").startsWith("muster-gmbh::"), `Invoice id tenant-scoped ${inv.job?.id}`);
const invRel = await releaseInvoiceJob(inv.job.id);
assert(invRel.ok, "Invoice release ok");
assert(invRel.job?.status === "released", "Invoice released");
assert(invRel.delivery?.type === "invoice", "Invoice delivery");
assert(invRel.delivery?.company?.id === "muster-gmbh", "Invoice delivery company.id");
assert(invRel.platformNotify?.ok, "Invoice notify ok");

console.log("\n=== API Bridge: company.id Pflicht ===");
const noCompany = await ingestPayroll({
  kind: "platform.payroll.v1",
  company: { name: "Nur Name" },
  employee: { id: "x", name: "X" },
  period: "2025-07",
  wageItems: [{ code: "2000", amount: 1000, taxFlag: "L", svFlag: "L" }],
});
assert(!noCompany.ok, "Ohne company.id abgelehnt");

console.log("\n=== API Bridge: Inbox ===");
const inbox = listPayrollJobs({ status: "released" });
assert(inbox.some((j) => j.jobId === one.job.jobId), "Released Job in Store");

console.log("\n=== API Bridge: Validierung ===");
const bad = await ingestPayroll({ kind: "platform.payroll.v1", company: {}, employee: {} });
assert(!bad.ok && bad.errors?.length, "Ungültige Nutzlast abgelehnt");

console.log(`\n=== API Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
