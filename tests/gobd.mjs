/**
 * GoBD: immutability, correction trail, business audit, export
 * Run: node tests/gobd.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync, readFileSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `gobd-test-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "gobd-test-key-material-not-for-prod";
process.env.WORKPASS_SESSION_SECRET = "gobd-test-session";
process.env.WORKPASS_API_KEY = "gobd-test-api-key";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();

const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll, releasePayrollJob, correctPayrollJob } = await import("../server/payroll-service.mjs");
const { listRevisions } = await import("../server/gobd/revisions.mjs");
const { listBusinessAudit } = await import("../server/gobd/business-audit.mjs");
const { buildGobdExport } = await import("../server/gobd/export.mjs");
const { createSession, isReadOnlyRole } = await import("../server/auth-session.mjs");
const { requireHumanConfirm } = await import("../server/policy/human-final.mjs");

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

console.log("\n=== GoBD pillars ===");
initDb();
const companyId = `cmp-gobd-${stamp}`;
saveCompany({ id: companyId, name: "GoBD Test GmbH", taxNumber: "11/22/33" });

const base = JSON.parse(readFileSync(path.join(root, "examples/platform-payroll.v1.json"), "utf8"));
base.company = { id: companyId, name: "GoBD Test GmbH", taxNumber: "11/22/33" };
base.employee = { ...(base.employee || {}), id: "E-GOBD-1", name: "GoBD Worker" };
base.period = "2026-08";
if (base.state) {
  base.state.mandantId = companyId;
  base.state.employeeId = "E-GOBD-1";
  base.state.payrollMonth = "2026-08";
}

const ingest1 = await ingestPayroll(base, { tenantScope: companyId });
assert(ingest1.ok && ingest1.job?.jobId, `ingest ok (${ingest1.errors?.join?.(" · ") || ""})`);

const rel = await releasePayrollJob(ingest1.job.jobId, { tenantScope: companyId });
assert(rel.ok && rel.job?.status === "released", "release ok");

const silent = JSON.parse(JSON.stringify(base));
silent.wageItems = (silent.wageItems || []).map((w, i) => (
  i === 0 ? { ...w, amount: Number(w.amount || 0) + 50 } : w
));
const blocked = await ingestPayroll(silent, { tenantScope: companyId, jobId: ingest1.job.jobId });
assert(blocked.immutable === true || blocked.code === "immutable_document", "silent change blocked after release");
assert(!blocked.ok, "blocked ingest not ok");

const gate = requireHumanConfirm({ confirm: true, reason: "Stundenkorrektur Prüfung" }, "payroll_correct");
assert(gate.ok, "human confirm for correct");

const corrected = await correctPayrollJob(ingest1.job.jobId, {
  tenantScope: companyId,
  reason: "Stundenkorrektur Prüfung",
  wageAmountDelta: 50,
  actor: "tester@gobd.de",
  source: "user",
  correlationId: `corr-gobd-${stamp}`,
});
assert(corrected.ok, `correct ok (${corrected.errors?.join?.(" · ") || corrected.error || ""})`);
assert(corrected.job?.status === "calculated" || corrected.job?.status === "error", "after correct not released");

const revs = listRevisions({ companyId, entityType: "payroll", entityId: ingest1.job.jobId });
assert(revs.length >= 1, `revision archived (${revs.length})`);
assert(String(revs[0].reason || "").includes("Stunden"), "revision has reason");

const auditRows = listBusinessAudit({ companyId, limit: 100 });
assert(auditRows.some((e) => e.op.includes("payroll")), "business audit has payroll ops");
assert(auditRows.some((e) => e.correlationId), "audit has correlationId");

const exp = buildGobdExport({
  companyId,
  actor: "tester@gobd.de",
  include: ["company", "payroll", "revisions", "businessAudit"],
});
assert(exp.ok && exp.manifest?.kind === "workpass.gobd.export.v1", "gobd export ok");
assert(exp.manifest.sha256 && Object.keys(exp.manifest.sha256).length >= 2, "export hashes present");
assert(existsSync(exp.path), "export file written");

const auditor = createSession({
  id: "aud-1",
  email: "auditor@test.de",
  name: "Auditor",
  role: "auditor",
  companyId,
});
assert(auditor.user.role === "auditor" && auditor.user.readOnly === true, "auditor session read-only");
assert(isReadOnlyRole("auditor") === true, "isReadOnlyRole");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== GoBD: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
