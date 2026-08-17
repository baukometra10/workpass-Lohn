/**
 * Per-employee LStB + Verdienstbescheinigung from released jobs
 * Run: node tests/employee-certificates.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `cert-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "cert-test-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "cert-session";
process.env.WORKPASS_API_KEY = "cert-api-key";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll } = await import("../server/payroll-service.mjs");
const {
  listCertificateSummary,
  buildEmployeeLstbCertificate,
  buildEmployeeVerdienstCertificate,
} = await import("../server/certificates/employee-certificates.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Employee certificates ===");
initDb();
const companyId = `cmp-cert-${stamp}`;
saveCompany({ id: companyId, name: "Cert GmbH", taxNumber: "12/345/67890" });

async function ingestMonth(period, hours) {
  return ingestPayroll({
    kind: "platform.payroll.v1",
    period,
    company: { id: companyId, name: "Cert GmbH", taxNumber: "12/345/67890" },
    employee: {
      id: "EMP-CERT-1",
      badgeId: "EMP-CERT-1",
      name: "Cert Worker",
      taxClass: "I",
      healthFund: "TK",
      healthPercent: "14.6",
      taxId: "12345678901",
      insuranceNo: "12345678C901",
    },
    attendance: { days: 20, hours },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
    bank: { iban: "DE89370400440532013000" },
  }, { tenantScope: companyId, autoRelease: true, notifyGaps: false });
}

const jan = await ingestMonth("2026-01", 160);
assert(jan.ok, `ingest jan ${jan.error || "ok"}`);
const feb = await ingestMonth("2026-02", 168);
assert(feb.ok, `ingest feb ${feb.error || "ok"}`);

const summary = listCertificateSummary(companyId, 2026);
assert(summary.ok && summary.count === 1, `summary count ${summary.count}`);
assert(summary.employees[0].employeeId === "EMP-CERT-1", "employee in summary");
assert(summary.employees[0].months.length === 2, "two released months");

const lstb = buildEmployeeLstbCertificate(companyId, "EMP-CERT-1", 2026);
assert(lstb.ok && lstb.kind === "portal.certificate.lstb.v1", "lstb built");
assert(lstb.totals.monthsCount === 2, `lstb months ${lstb.totals.monthsCount}`);
assert(lstb.totals.gross > 0, `lstb gross ${lstb.totals.gross}`);
assert(lstb.rows.some((r) => r.nr === 3 && r.value > 0), "lstb row 3 gross");

const missing = buildEmployeeLstbCertificate(companyId, "UNKNOWN", 2026);
assert(!missing.ok, "missing employee rejected");

const vb = buildEmployeeVerdienstCertificate(companyId, "EMP-CERT-1", 2026, "2026-02");
assert(vb.ok && vb.kind === "portal.certificate.verdienst.v1", "vb built");
assert(vb.period === "2026-02", `vb period ${vb.period}`);
assert(vb.rows.length >= 10, `vb rows ${vb.rows.length}`);
assert(vb.ytd.gross > vb.monthly.gross, "ytd gross > monthly gross");

closeSqlite();
if (existsSync(testDb)) unlinkSync(testDb);

console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
