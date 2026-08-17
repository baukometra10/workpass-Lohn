/**
 * Engine tax apply (BMF PAP) + ELSTER cert queue
 * Run: node tests/engine-tax-elster.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `engine-elster-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "engine-elster-test-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "engine-elster-session";
process.env.WORKPASS_API_KEY = "engine-elster-api-key";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;
delete process.env.WORKPASS_ELSTER_SUBMIT_URL;
delete process.env.WORKPASS_ELSTER_ERIC_CMD;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll } = await import("../server/payroll-service.mjs");
const { applyEngineTax } = await import("../server/assistant/apply-engine.mjs");
const {
  saveElsterCert,
  elsterCertStatus,
  submitElsterYear,
  maybeAutoSubmitElster,
} = await import("../server/elster/submit.mjs");
const { periodsForAutoMonthClose, autoMonthCloseConfig } = await import("../server/month-scheduler.mjs");
const { autoPipelinePeriods } = await import("../server/auto-pipeline.mjs");
const { requireHumanConfirm } = await import("../server/policy/human-final.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Engine tax + ELSTER ===");
initDb();
const companyId = `cmp-eng-${stamp}`;
saveCompany({ id: companyId, name: "Engine GmbH", taxNumber: "11/22/33333" });

const ingest = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-08",
  company: { id: companyId, name: "Engine GmbH", taxNumber: "11/22/33333" },
  employee: {
    id: "E-ENG-1",
    badgeId: "E-ENG-1",
    name: "Engine Worker",
    taxClass: "I",
    healthFund: "TK",
    healthPercent: "14.6",
  },
  attendance: { days: 20, hours: 160 },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
  bank: { iban: "DE89370400440532013000" },
}, { tenantScope: companyId, autoRelease: false, notifyGaps: false });
assert(ingest.ok && ingest.job?.jobId, `ingest ${ingest.error || ingest.errors?.join?.(" · ") || "ok"}`);

const invented = await applyEngineTax({ companyId, period: "2026-08", taxOverride: 123.45 });
assert(invented.ok === false, "invented tax rejected");

const noConfirm = requireHumanConfirm({}, "apply_engine_tax");
assert(!noConfirm.ok, "engine tax needs confirm");

const applied = await applyEngineTax({ companyId, period: "2026-08" });
assert(applied.ok && applied.applied.length >= 1, `engine applied ${applied.applied?.length || 0}`);
assert(String(applied.engine || "").includes("BMF PAP"), "engine name");
assert(applied.applied[0].payrollTax != null, "payrollTax from engine");

const p12 = Buffer.alloc(80, 7).toString("base64");
const saved = saveElsterCert({ companyId, p12Base64: p12, pin: "1234", autoSubmit: true });
assert(saved.configured && saved.autoSubmit, "cert stored");
assert(elsterCertStatus(companyId).fingerprint, "fingerprint");

const sub = await submitElsterYear({ companyId, period: "2026-08", year: "2026", actor: "user" });
assert(sub.ok, `submit queued ${sub.error || ""}`);
assert(sub.status === "PENDING" || sub.mode === "queued-local", `queued without ERiC (${sub.status}/${sub.mode})`);

const again = await maybeAutoSubmitElster(companyId, "2026-08");
assert(again.skipped === true, "no duplicate auto submit");

const now = new Date(2026, 7, 17);
const periods = periodsForAutoMonthClose(now);
assert(periods.includes("2026-08") && periods.includes("2026-07"), `parallel periods ${periods}`);
assert(autoPipelinePeriods(now).length === 2, "pipeline two periods");
assert(autoMonthCloseConfig().parallelMonths === true, "parallel default");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Engine/ELSTER: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
