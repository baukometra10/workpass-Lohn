/**
 * Immutable seal: document + PDF must not change after WorkPass Lohn freezes them.
 * Run: node tests/document-seal.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `doc-seal-${stamp}.sqlite`);

process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "doc-seal-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "doc-seal-session";
process.env.WORKPASS_API_KEY = "doc-seal-api";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;
delete process.env.WORKPASS_PLATFORM_WEBHOOK_URL;

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

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll } = await import("../server/payroll-service.mjs");
const { buildEmployeeLstbCertificate, buildEmployeeVerdienstCertificate } = await import("../server/certificates/employee-certificates.mjs");
const { buildEmployeeDelivery, notifyPlatform } = await import("../server/notify.mjs");
const { ensureCompleteDeliveryDocument, verifyDeliverySeal } = await import("../server/document-complete.mjs");
const { enqueueDelivery, getDelivery, markDeliveryWebhook, ackDelivery } = await import("../server/delivery-queue.mjs");
const { attachPdfToDelivery } = await import("../server/pdf/build-document-pdf.mjs");

console.log("\n=== Document seal (immutable in transit) ===");
initDb();
const companyId = `cmp-seal-${stamp}`;
saveCompany({ id: companyId, name: "Seal GmbH", taxNumber: "11/222/33333" });

const seed = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-03",
  company: { id: companyId, name: "Seal GmbH", taxNumber: "11/222/33333" },
  employee: {
    id: "EMP-SEAL-1",
    badgeId: "EMP-SEAL-1",
    name: "Seal Test",
    taxId: "12345678901",
    insuranceNo: "65190855A123",
    taxClass: "1",
    address: "Siegelweg 1",
    birthDate: "1990-01-01",
    healthFund: "TK",
    bankIban: "DE89370400440532013000",
    bankName: "Testbank",
  },
  wageItems: [{ code: "1000", label: "Gehalt", amount: 3000, taxFlag: "L", svFlag: "L" }],
  bank: { iban: "DE89370400440532013000" },
}, { tenantScope: companyId, autoRelease: true, notifyGaps: false });
assert(seed.ok && seed.job?.status === "released", `seed payslip (${seed.job?.status || seed.error || ""})`);

const payslip = buildEmployeeDelivery("payroll", seed.job);
assert(payslip?.immutable === true, "payslip sealed at build");
assert(verifyDeliverySeal(payslip).ok, "payslip seal ok");
const pdf0 = payslip.pdfBase64;
const sum0 = payslip.document.totals.net;

const again = ensureCompleteDeliveryDocument(payslip).delivery;
assert(again.pdfBase64 === pdf0, "second ensure keeps identical PDF");
assert(again.document.totals.net === sum0, "second ensure keeps net");
assert(attachPdfToDelivery({ ...again }).pdfBase64 === pdf0, "attachPdf never rebuilds sealed");

enqueueDelivery(payslip);
const loaded = getDelivery(payslip.deliveryId);
assert(loaded?.seal?.seal === payslip.seal.seal, "queue roundtrip keeps seal");
assert(loaded.pdfBase64 === pdf0, "queue roundtrip keeps PDF");
assert(JSON.stringify(loaded.document) === JSON.stringify(payslip.document), "queue keeps exact document JSON");

markDeliveryWebhook(payslip.deliveryId, { accepted: true, reached: true, status: 200, body: { ok: true, accepted: true, received: true } });
const afterMark = getDelivery(payslip.deliveryId);
assert(afterMark.pdfBase64 === pdf0, "webhook mark does not change PDF");
assert(afterMark.seal.seal === payslip.seal.seal, "webhook mark keeps seal");
assert(afterMark.document.totals.net === sum0, "webhook mark keeps document");

ackDelivery(payslip.deliveryId, { stage: "opened", opened: true });
ackDelivery(payslip.deliveryId, { stage: "seen", seen: true });
const afterAck = getDelivery(payslip.deliveryId);
assert(afterAck.pdfBase64 === pdf0, "ack does not change PDF");
assert(verifyDeliverySeal(afterAck).ok, "ack still verifies seal");

const notify = await notifyPlatform({ event: "document.released", delivery: afterAck, company: { id: companyId, name: "Seal GmbH" } });
assert(notify.ok, `notify ok (${notify.error || notify.mode})`);
assert(notify.delivery.pdfBase64 === pdf0, "notify sends original PDF");
assert(notify.delivery.seal.seal === payslip.seal.seal, "notify keeps seal");

const broken = { ...afterAck, document: { ...afterAck.document, totals: { ...afterAck.document.totals, net: 1 } } };
const blocked = await notifyPlatform({ event: "document.released", delivery: broken, company: { id: companyId, name: "Seal GmbH" } });
assert(blocked.ok === false && blocked.mode === "document-tampered", "notify blocks tampered document");

const lstb = buildEmployeeLstbCertificate(companyId, "EMP-SEAL-1", 2026);
const lstbDel = buildEmployeeDelivery("lstb", { certificate: lstb, company: { id: companyId, name: "Seal GmbH" } });
assert(lstbDel.immutable && verifyDeliverySeal(lstbDel).ok, "lstb sealed");

const vb = buildEmployeeVerdienstCertificate(companyId, "EMP-SEAL-1", 2026, "2026-03");
const vbDel = buildEmployeeDelivery("verdienst", { certificate: vb, company: { id: companyId, name: "Seal GmbH" } });
assert(vbDel.immutable && verifyDeliverySeal(vbDel).ok, "verdienst sealed");

closeSqlite();
try {
  if (existsSync(testDb)) unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Seal Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed ? 1 : 0);
