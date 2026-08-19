/**
 * Prove LStB/VB delivery confirmation rules against a real mock webhook.
 * Run: node tests/certificate-delivery-confirm.mjs
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `cert-confirm-${stamp}.sqlite`);

process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "cert-confirm-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "cert-confirm-session";
process.env.WORKPASS_API_KEY = "cert-confirm-api";
process.env.WORKPASS_CERT_ACK_WAIT_MS = "0";
process.env.WORKPASS_WEBHOOK_RETRIES = "1";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

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

const inbox = [];
let mode = "bare-ok"; // bare-ok | accepted | fail

const mock = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body = {};
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    body = {};
  }
  inbox.push({ url: req.url, headers: req.headers, body });
  if (mode === "fail") {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "mock fail" }));
    return;
  }
  if (mode === "accepted") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      accepted: true,
      ok: true,
      deliveryId: body?.delivery?.deliveryId || null,
    }));
    return;
  }
  // bare-ok: transport OK but NOT a delivery confirmation (common platform trap)
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
});

await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
const { port } = mock.address();
process.env.WORKPASS_PLATFORM_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
process.env.WORKPASS_PLATFORM_WEBHOOK_KEY = "mock-webhook-key";

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll } = await import("../server/payroll-service.mjs");
const {
  deliverEmployeeLstb,
  deliverEmployeeVerdienst,
  verifyCertificateDelivery,
} = await import("../server/certificates/deliver.mjs");
const { buildEmployeeDelivery } = await import("../server/notify.mjs");
const { eventForDelivery } = await import("../server/delivery-replay.mjs");

console.log("\n=== Certificate delivery confirmation ===");
initDb();
const companyId = `cmp-confirm-${stamp}`;
saveCompany({ id: companyId, name: "Confirm GmbH", taxNumber: "11/222/33333" });

async function seed(period) {
  const r = await ingestPayroll({
    kind: "platform.payroll.v1",
    period,
    company: { id: companyId, name: "Confirm GmbH", taxNumber: "11/222/33333" },
    employee: {
      id: "EMP-CONF-1",
      badgeId: "EMP-CONF-1",
      name: "Confirm Test",
      taxId: "12345678901",
      insuranceNo: "65190855A123",
      taxClass: "1",
      address: "Testweg 1",
      birthDate: "1990-01-01",
      healthFund: "TK",
      bankIban: "DE89370400440532013000",
      bankName: "Testbank",
    },
    wageItems: [{ code: "1000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
    bank: { iban: "DE89370400440532013000" },
  }, { tenantScope: companyId, autoRelease: true, notifyGaps: false });
  assert(r.ok && r.job?.status === "released", `seed ${period} released (${r.job?.status || r.error || ""})`);
}

await seed("2026-01");
await seed("2026-02");

const payShape = buildEmployeeDelivery("payroll", {
  jobId: "job-x",
  releasedAt: new Date().toISOString(),
  employee: { id: "E1", name: "A" },
  company: { id: companyId, name: "Confirm GmbH" },
  payslip: {
    employee: { id: "E1", name: "A" },
    company: { id: companyId, name: "Confirm GmbH" },
    period: "2026-02",
    totals: { gross: 1, net: 1 },
  },
});
const lstbShape = buildEmployeeDelivery("lstb", {
  certificate: {
    ok: true,
    companyId,
    employeeId: "emp-conf-1",
    employeeName: "Confirm Test",
    year: 2026,
    totals: { gross: 5600, net: 4000, payrollTax: 100 },
  },
  company: { id: companyId, name: "Confirm GmbH" },
});
assert(payShape.kind === lstbShape.kind, "same delivery kind as payslip");
assert(payShape.status === lstbShape.status, "same ready_for_employee status");
assert(typeof lstbShape.appRoute === "string" && lstbShape.appRoute.includes("/employee/certificates/lstb/"), "lstb appRoute");
assert(eventForDelivery({ type: "lstb" }) === "document.released", "replay event lstb");
assert(eventForDelivery({ type: "verdienst" }) === "document.released", "replay event verdienst");

mode = "bare-ok";
inbox.length = 0;
const bare = await deliverEmployeeLstb(companyId, "EMP-CONF-1", 2026, {
  forceRedeliver: true,
  requireConfirm: true,
  ackWaitMs: 0,
});
assert(bare.ok === false, "bare {ok:true} is NOT confirmation");
assert(bare.confirmed === false, "confirmed false on bare ok");
assert(bare.pendingPull === true, `stays pending for pull (pendingPull=${bare.pendingPull})`);
assert(inbox.length >= 1, `webhook was called (inbox=${inbox.length})`);
const last = inbox[inbox.length - 1] || {};
assert(last.body?.event === "document.released", `event document.released (got ${last.body?.event})`);
assert(last.body?.documentType === "lstb", `documentType lstb (got ${last.body?.documentType})`);
assert(last.body?.delivery?.type === "lstb", "delivery.type lstb");
assert(last.body?.delivery?.documentType === "lstb", "delivery.documentType lstb");
assert(last.body?.delivery?.kind === "platform.employee.delivery.v1", "envelope delivery kind");
assert(last.body?.meta?.requireAck === true, "meta.requireAck");
assert(last.body?.meta?.parity === "payslip", "meta.parity payslip");
assert(last.body?.meta?.legacyEvent === "lstb.released", "meta.legacyEvent");
assert(verifyCertificateDelivery(bare.delivery.deliveryId).confirmed === false, "verify still unconfirmed");

mode = "accepted";
inbox.length = 0;
const okLstb = await deliverEmployeeLstb(companyId, "EMP-CONF-1", 2026, {
  forceRedeliver: true,
  requireConfirm: true,
  ackWaitMs: 0,
});
assert(okLstb.ok === true && okLstb.confirmed === true, "accepted:true confirms lstb");
assert(okLstb.trust === "acked", "trust acked");
assert(inbox[inbox.length - 1]?.body?.event === "document.released", "accepted path event");
assert(inbox[inbox.length - 1]?.body?.documentType === "lstb", "accepted path documentType");
assert(verifyCertificateDelivery(okLstb.delivery.deliveryId).confirmed === true, "verify after accept");

mode = "accepted";
inbox.length = 0;
const okVb = await deliverEmployeeVerdienst(companyId, "EMP-CONF-1", 2026, "2026-02", {
  forceRedeliver: true,
  requireConfirm: true,
  ackWaitMs: 0,
});
assert(okVb.ok === true && okVb.confirmed === true, "accepted:true confirms vb");
assert(inbox[inbox.length - 1]?.body?.event === "document.released", `vb event (got ${inbox[inbox.length - 1]?.body?.event})`);
assert(inbox[inbox.length - 1]?.body?.documentType === "verdienst", "vb documentType");
assert(inbox[inbox.length - 1]?.body?.delivery?.type === "verdienst", "vb delivery type");

mode = "fail";
inbox.length = 0;
const fail = await deliverEmployeeLstb(companyId, "EMP-CONF-1", 2026, {
  forceRedeliver: true,
  requireConfirm: true,
  ackWaitMs: 0,
});
assert(fail.ok === false && fail.confirmed === false, "webhook 500 → not confirmed");
assert(fail.webhookReached === false, "webhookReached false on 500");

mock.close();
closeSqlite();
try {
  if (existsSync(testDb)) unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Confirm Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed ? 1 : 0);
