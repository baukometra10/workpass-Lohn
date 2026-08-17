/**
 * ELSTER sidecar contract: year LStB XML, mock HTTP, PENDING vs SENT.
 * Run: node tests/elster-channel.mjs
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `elster-channel-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "elster-channel-test-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "elster-channel-session";
process.env.WORKPASS_API_KEY = "elster-channel-api-key";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;
delete process.env.WORKPASS_ELSTER_SUBMIT_URL;
delete process.env.WORKPASS_ELSTER_ERIC_CMD;
delete process.env.WORKPASS_ELSTER_TEST;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll, releasePayrollJob } = await import("../server/payroll-service.mjs");
const { applyEngineTax } = await import("../server/assistant/apply-engine.mjs");
const { buildYearLstbXml, elsterTestMode } = await import("../server/elster/lstb-xml.mjs");
const {
  saveElsterCert,
  elsterCertStatus,
  elsterChannelStatus,
  submitElsterYear,
  listElsterSubmissions,
} = await import("../server/elster/submit.mjs");
const { createMockElsterServer, handleElsterSubmit } = await import("../mock-elster/server.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

console.log("\n=== ELSTER channel ===");
initDb();
const companyId = `cmp-elster-${stamp}`;
saveCompany({ id: companyId, name: "Elster Kanal GmbH", taxNumber: "11/22/33333" });

const ingest = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-08",
  company: { id: companyId, name: "Elster Kanal GmbH", taxNumber: "11/22/33333" },
  employee: {
    id: "E-ELSTER-1",
    badgeId: "E-ELSTER-1",
    name: "Kanal Worker",
    taxClass: "I",
    healthFund: "TK",
    healthPercent: "14.6",
  },
  attendance: { days: 20, hours: 160 },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
  bank: { iban: "DE89370400440532013000" },
}, { tenantScope: companyId, autoRelease: false, notifyGaps: false });
assert(ingest.ok && ingest.job?.jobId, `ingest ${ingest.error || "ok"}`);

const applied = await applyEngineTax({ companyId, period: "2026-08" });
assert(applied.ok, "engine tax");
const rel = await releasePayrollJob(ingest.job.jobId, { tenantScope: companyId });
assert(rel.ok, "released");

const built = buildYearLstbXml(companyId, 2026);
assert(built.employeeCount === 1, `one LStB (${built.employeeCount})`);
assert(built.xml.includes("<Verfahren>ElsterLohn</Verfahren>"), "TransferHeader Verfahren");
assert(built.xml.includes("<DatenArt>LStB</DatenArt>"), "DatenArt LStB");
assert(built.xml.includes("<Testmerker>700000004</Testmerker>"), "Testmerker default");
assert(built.xml.includes('Kennziffer nr="3"'), "Kennziffer 3 Brutto");
assert(built.xml.includes('Kennziffer nr="4"'), "Kennziffer 4 LSt");
assert(!built.xml.includes("E-ELSTER-1"), "no platform employee id in XML");
assert(!built.xml.includes("employeeId="), "no employeeId attribute");
assert(built.testMode === true && elsterTestMode() === true, "test mode default");

const off = elsterChannelStatus();
assert(off.connected === false && off.mode === "none", "channel off");
assert(elsterCertStatus(companyId).channel.connected === false, "cert status includes channel");

const p12 = Buffer.alloc(80, 9).toString("base64");
saveElsterCert({ companyId, p12Base64: p12, pin: "1234", autoSubmit: false });

const queued = await submitElsterYear({ companyId, period: "2026-08", year: "2026", actor: "user" });
assert(queued.ok && queued.status === "PENDING", `queued PENDING (${queued.status})`);
assert(queued.mode === "queued-local", "queued-local");
assert(queued.finanzamtReached === false, "queued is not Finanzamt");
assert(String(queued.message || "").includes("nicht beim Finanzamt"), "message says not at Finanzamt");

const handlerOk = handleElsterSubmit({
  kind: "workpass.elster.submit.v1",
  submissionId: "t1",
  xml: built.xml,
  p12,
  pin: "1234",
});
assert(handlerOk.status === 200 && handlerOk.body.accepted === true, "mock handler accepts");
assert(handlerOk.body.finanzamtReached === false, "mock is not Finanzamt");
assert(handleElsterSubmit({ kind: "nope" }).status === 400, "mock rejects wrong kind");

const mock = createMockElsterServer();
const mockPort = await listen(mock);
process.env.WORKPASS_ELSTER_SUBMIT_URL = `http://127.0.0.1:${mockPort}/v1/elster/submit`;
assert(elsterChannelStatus().connected === true && elsterChannelStatus().mode === "submit-url", "channel on");

const sent = await submitElsterYear({ companyId, period: "2026-08", year: "2026", actor: "user" });
assert(sent.ok && sent.status === "SENT", `SENT via sidecar (${sent.status} ${sent.error || ""})`);
assert(sent.mode === "submit-url" && sent.remoteId, `remoteId ${sent.remoteId}`);
assert(sent.finanzamtReached === false, "sidecar accept is not Finanzamt");
assert(String(sent.message || "").includes("Testkanal"), "test-channel wording");
await closeServer(mock);
delete process.env.WORKPASS_ELSTER_SUBMIT_URL;

const failServer = http.createServer((_req, res) => {
  res.writeHead(502, { "Content-Type": "application/json", Connection: "close" });
  res.end(JSON.stringify({ ok: false, accepted: false, error: "sidecar down" }));
});
const failPort = await listen(failServer);
process.env.WORKPASS_ELSTER_SUBMIT_URL = `http://127.0.0.1:${failPort}/v1/elster/submit`;
const failedSub = await submitElsterYear({ companyId, period: "2026-08", year: "2026", actor: "user" });
assert(failedSub.ok === false && failedSub.status === 502, "FAILED when sidecar errors");
await closeServer(failServer);
delete process.env.WORKPASS_ELSTER_SUBMIT_URL;

process.env.WORKPASS_ELSTER_TEST = "0";
const liveXml = buildYearLstbXml(companyId, 2026);
assert(liveXml.xml.includes("<Testmerker>0</Testmerker>"), "live Testmerker 0");
assert(liveXml.testMode === false, "testMode false when WORKPASS_ELSTER_TEST=0");
delete process.env.WORKPASS_ELSTER_TEST;

const rows = listElsterSubmissions(companyId);
assert(rows.length >= 3, `submissions listed (${rows.length})`);
assert(rows.some((r) => r.status === "PENDING"), "list has PENDING");
assert(rows.some((r) => r.status === "SENT"), "list has SENT");
assert(rows.some((r) => r.status === "FAILED"), "list has FAILED");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== ELSTER channel: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
