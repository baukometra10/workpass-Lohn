/**
 * Monthly LStA (employer Lohnsteueranmeldung) from released payroll.
 * Run: node tests/lsta.mjs
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `lsta-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "lsta-test-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "lsta-session";
process.env.WORKPASS_API_KEY = "lsta-api-key";
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
const { buildMonthLsta } = await import("../server/elster/lsta-xml.mjs");
const {
  saveElsterCert,
  submitElsterLsta,
  maybeAutoSubmitLsta,
  listElsterSubmissions,
} = await import("../server/elster/submit.mjs");
const { requireHumanConfirm } = await import("../server/policy/human-final.mjs");
const { createMockElsterServer } = await import("../mock-elster/server.mjs");

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

console.log("\n=== LStA (Firma) ===");
assert(!requireHumanConfirm({}, "lsta_submit").ok, "LStA needs human confirm");
initDb();
const companyId = `cmp-lsta-${stamp}`;
saveCompany({ id: companyId, name: "LStA GmbH", taxNumber: "11/22/33333" });

const ingest = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-08",
  company: { id: companyId, name: "LStA GmbH", taxNumber: "11/22/33333" },
  employee: {
    id: "E-LSTA-1",
    badgeId: "E-LSTA-1",
    name: "Lsta Worker",
    taxClass: "I",
    healthFund: "TK",
    healthPercent: "14.6",
  },
  attendance: { days: 20, hours: 160 },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
  bank: { iban: "DE89370400440532013000" },
}, { tenantScope: companyId, autoRelease: false, notifyGaps: false });
assert(ingest.ok, `ingest ${ingest.error || "ok"}`);
await applyEngineTax({ companyId, period: "2026-08" });
const rel = await releasePayrollJob(ingest.job.jobId, { tenantScope: companyId });
assert(rel.ok, "released");

const draft = buildMonthLsta(companyId, "2026-08");
assert(draft.ok && draft.empty === false, "draft from released month");
assert(draft.xml.includes("<DatenArt>LStA</DatenArt>"), "DatenArt LStA");
assert(draft.xml.includes("<Lohnsteueranmeldung"), "LStA envelope");
assert(!draft.xml.includes("E-LSTA-1"), "no platform employee id");
assert(draft.totals.payrollTax >= 0 && draft.totals.payable >= 0, "sums present");
assert(draft.employeeCount === 1, `one employee (${draft.employeeCount})`);
assert(draft.note.includes("nicht die LStB"), "note distinguishes LStB");

const empty = buildMonthLsta(companyId, "2026-01");
assert(empty.ok && empty.empty === true, "empty month is draft not error");

const p12 = Buffer.alloc(80, 3).toString("base64");
saveElsterCert({ companyId, p12Base64: p12, pin: "1234", autoSubmit: true });

const queued = await submitElsterLsta({ companyId, period: "2026-08", actor: "user" });
assert(queued.ok && queued.status === "PENDING", `queued ${queued.status} ${queued.error || ""}`);
assert(queued.kind === "lsta", "kind lsta");
assert(String(queued.message || "").includes("nicht beim Finanzamt"), "not Finanzamt");

const again = await maybeAutoSubmitLsta(companyId, "2026-08");
assert(again.skipped === true, "no duplicate LStA");

const mock = createMockElsterServer();
const mockPort = await listen(mock);
process.env.WORKPASS_ELSTER_SUBMIT_URL = `http://127.0.0.1:${mockPort}/v1/elster/submit`;
const sent = await submitElsterLsta({ companyId, period: "2026-08", actor: "user" });
assert(sent.ok && sent.status === "SENT", `SENT ${sent.status} ${sent.error || ""}`);
assert(sent.finanzamtReached === false, "sidecar is not Finanzamt");
await closeServer(mock);
delete process.env.WORKPASS_ELSTER_SUBMIT_URL;

const rows = listElsterSubmissions(companyId);
assert(rows.some((r) => r.kind === "lsta" && r.status === "PENDING"), "list PENDING LStA");
assert(rows.some((r) => r.kind === "lsta" && r.status === "SENT"), "list SENT LStA");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== LStA: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
