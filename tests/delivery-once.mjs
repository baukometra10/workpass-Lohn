/**
 * Delivery send-once / anti-spam tests
 * Run: node tests/delivery-once.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

process.env.WORKPASS_SESSION_SECRET = "test-session-secret-delivery-once";
process.env.WORKPASS_API_KEY = "test-api-key-delivery-once";
process.env.WORKPASS_PLATFORM_WEBHOOK_URL = ""; // local-log-only
process.env.WORKPASS_DELIVERY_REPLAY = "0";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { activateCompany, deleteCompany } = await import("../server/company-service.mjs");
const { ingestPayroll, releasePayrollJob } = await import("../server/payroll-service.mjs");
const { getDelivery, listDeliveriesNeedingWebhookPush, markDeliveryWebhook } = await import("../server/delivery-queue.mjs");
const { replayPendingDeliveries } = await import("../server/delivery-replay.mjs");

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

const companyId = "cmp-delivery-once-001";
deleteCompany({ company: { id: companyId }, event: "company.deleted" });
activateCompany({
  kind: "platform.company.activate.v1",
  company: { id: companyId, name: "Delivery Once GmbH", taxNumber: "123" },
  login: { email: `${companyId}@firma.de`, password: "4821" },
});

const base = JSON.parse(readFileSync(path.join(root, "examples/platform-payroll.v1.json"), "utf8"));
base.company = { id: companyId, name: "Delivery Once GmbH", taxNumber: "123" };
base.employee = { ...(base.employee || {}), id: "E-ONCE-1", name: "Once Test" };
base.period = "2026-07";

const ingest = await ingestPayroll(base);
assert(ingest.ok && ingest.job?.jobId, `ingest ok (${ingest.errors?.join?.(" · ") || ""})`);

const rel1 = await releasePayrollJob(ingest.job.jobId, { tenantScope: companyId });
assert(rel1.ok, `first release ok (${rel1.error || ""})`);
const d1 = getDelivery(`pay:${ingest.job.jobId}`);
assert(Boolean(d1), "delivery enqueued");

markDeliveryWebhook(`pay:${ingest.job.jobId}`, {
  at: new Date().toISOString(),
  status: 200,
  accepted: false,
  reached: true,
  idempotencyKey: `pay:${ingest.job.jobId}`,
});
const afterMark = getDelivery(`pay:${ingest.job.jobId}`);
assert(afterMark?.webhookReached === true, "marked webhook reached");

const rel2 = await releasePayrollJob(ingest.job.jobId, { tenantScope: companyId });
assert(rel2.skippedNotify === true, "second release skips webhook");

const need = listDeliveriesNeedingWebhookPush({ companyId });
assert(!need.some((d) => d.deliveryId === `pay:${ingest.job.jobId}`), "replay candidates exclude already-pushed");

const replay = await replayPendingDeliveries({ companyId, reason: "test" });
assert(
  !replay.results.some((r) => r.deliveryId === `pay:${ingest.job.jobId}`),
  "replay does not re-push reached delivery"
);

deleteCompany({ company: { id: companyId }, event: "company.deleted" });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
