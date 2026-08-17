/**
 * Sync lifecycle + XRechnung foundation tests
 * Run: node tests/sync-erechnung.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `sync-er-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "sync-er-test-key-material-not-for-prod";
process.env.WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS = "2";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany, enqueueDeliveryRow, markDeliveryWebhookRow, ackDeliveryRow } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { listDeliveriesNeedingWebhookPush } = await import("../server/delivery-queue.mjs");
const {
  deriveDeliverySyncStatus,
  summarizeSyncDeliveries,
  buildIdempotencyKey,
} = await import("../server/gobd/sync-lifecycle.mjs");
const { buildXRechnungUbl } = await import("../server/erechnung/xrechnung.mjs");
const { buildGobdExport } = await import("../server/gobd/export.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Sync + E-Rechnung ===");
initDb();
const companyId = `cmp-sync-${stamp}`;
saveCompany({ id: companyId, name: "Sync GmbH" });

const key = buildIdempotencyKey({
  kind: "PAYROLL",
  period: "2026-08",
  companyId,
  employeeId: "E1",
});
assert(key.includes("PAYROLL") && key.includes("2026-08"), `idempotency key ${key}`);

const delivery = enqueueDeliveryRow({
  deliveryId: `pay:${companyId}::E1::2026-08`,
  type: "payslip",
  company: { id: companyId },
  employee: { id: "E1" },
  period: "2026-08",
  queueStatus: "pending",
});
assert(deriveDeliverySyncStatus(delivery) === "PENDING", "initial PENDING");

markDeliveryWebhookRow(delivery.deliveryId, {
  at: new Date().toISOString(),
  status: 500,
  error: "fail1",
  accepted: false,
  reached: false,
  idempotencyKey: delivery.deliveryId,
});
let d1 = (await import("../server/delivery-queue.mjs")).getDelivery(delivery.deliveryId);
assert(deriveDeliverySyncStatus(d1) === "RETRYING", `after fail1: ${d1.syncStatus}`);

markDeliveryWebhookRow(delivery.deliveryId, {
  at: new Date().toISOString(),
  status: 500,
  error: "fail2",
  accepted: false,
  reached: false,
  idempotencyKey: delivery.deliveryId,
});
d1 = (await import("../server/delivery-queue.mjs")).getDelivery(delivery.deliveryId);
assert(deriveDeliverySyncStatus(d1) === "DEAD_LETTER", `dead letter: ${d1.syncStatus}`);
assert(!listDeliveriesNeedingWebhookPush({ companyId }).some((x) => x.deliveryId === delivery.deliveryId), "dead letter not auto-pushed");

const summary = summarizeSyncDeliveries([d1]);
assert(summary.counts.DEAD_LETTER === 1, "summary dead letter count");

ackDeliveryRow(delivery.deliveryId, { via: "test" });
d1 = (await import("../server/delivery-queue.mjs")).getDelivery(delivery.deliveryId);
assert(deriveDeliverySyncStatus(d1) === "COMPLETED", "acked COMPLETED");

const xr = buildXRechnungUbl({
  id: `${companyId}::RE-1`,
  company: { id: companyId, name: "Sync GmbH", vatId: "DE123456789", taxNumber: "11/22/33" },
  draft: {
    number: "RE-1",
    invoiceDate: "2026-08-01",
    seller: "Sync GmbH\nMusterstr. 1",
    customer: "Kunde AG\nKundenweg 2",
    taxRate: 19,
    leitwegId: "04011000-12345678-90",
    items: [{ description: "Leistung", quantity: 1, unitPrice: 100 }],
    net: 100,
    tax: 19,
    gross: 119,
  },
});
assert(xr.ok && xr.xml.includes("CustomizationID") && xr.xml.includes("RE-1"), "xrechnung xml");
assert(xr.xml.includes("04011000-12345678-90"), "leitweg in BuyerReference");
assert(xr.checklist.hasLeitwegId === true, "leitweg checklist");
assert(xr.checklist.readyForHumanSend === true, "xrechnung checklist ready");

const exp = buildGobdExport({ companyId, include: ["company", "businessAudit"] });
assert(exp.ok && String(exp.path).includes(companyId.replace(/[^\w.-]+/g, "_").slice(0, 80) || companyId), "tenant-scoped export path");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Sync/E-Rechnung: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
