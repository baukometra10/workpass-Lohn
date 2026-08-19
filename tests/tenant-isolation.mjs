/**
 * Multi-tenant isolation tests – company.id must never mix data.
 * Run: node tests/tenant-isolation.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDb = path.join(root, "server", "data", `tenant-isolation-${Date.now()}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "tenant-isolation-test-key-material-not-prod";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll, releasePayrollJob } = await import("../server/payroll-service.mjs");
const { ingestInvoice } = await import("../server/invoice-service.mjs");
const { listPayrollJobs, listInvoiceJobs } = await import("../server/store.mjs");
const { upsertCompany, listCompanies, loadCompany } = await import("../server/company-service.mjs");
const { listPendingDeliveries } = await import("../server/delivery-queue.mjs");
const { assertSameTenant, payrollJobId } = await import("../server/tenant.mjs");

const stamp = Date.now().toString(36);
const LH = `lh-${stamp}`;
const ACME = `acme-${stamp}`;

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

function employeePayload(companyId, companyName, employeeId, employeeName, amount = 3000) {
  return {
    kind: "platform.payroll.v1",
    company: { id: companyId, name: companyName },
    employee: {
      id: employeeId,
      name: employeeName,
      taxClass: "I",
      churchTaxRate: "0",
      healthPercent: "14.6",
    },
    period: "2025-07",
    attendance: { days: 20, hours: 160 },
    wageItems: [
      { code: "2000", label: "Gehalt", amount, taxFlag: "L", svFlag: "L" },
    ],
  };
}

console.log("\n=== Tenant: company registry ===");
const lh = upsertCompany({
  id: LH,
  name: "Deutsche Lufthansa AG",
  city: "Köln",
});
assert(lh.ok && lh.company.id === LH, "Lufthansa upsert");
const ac = upsertCompany({ id: ACME, name: "ACME Corp" });
assert(ac.ok && ac.company.id === ACME, "ACME upsert");
assert(loadCompany(LH)?.name.includes("Lufthansa"), "Load by id");
assert(listCompanies().some((c) => c.id === LH) && listCompanies().some((c) => c.id === ACME), "Both in registry");

console.log("\n=== Tenant: company.id Pflicht ===");
const noId = await ingestPayroll({
  kind: "platform.payroll.v1",
  company: { name: "Ohne ID GmbH" },
  employee: { id: "1", name: "X" },
  period: "2025-07",
  wageItems: [{ code: "2000", label: "G", amount: 1000, taxFlag: "L", svFlag: "L" }],
});
assert(!noId.ok && noId.errors.some((e) => /company\.id/i.test(e)), "Reject ohne company.id");

console.log("\n=== Tenant: gleiche PersNr, verschiedene Firmen ===");
const maxLh = await ingestPayroll(employeePayload(LH, "Lufthansa", "1001", "Max Pilot", 4500));
const maxAcme = await ingestPayroll(employeePayload(ACME, "ACME Corp", "1001", "Max Pilot", 2800));
assert(maxLh.ok && maxAcme.ok, "Beide Ingests ok");
assert(maxLh.job.jobId !== maxAcme.job.jobId, `Getrennte jobIds (${maxLh.job.jobId} ≠ ${maxAcme.job.jobId})`);
assert(maxLh.job.jobId === payrollJobId(LH, "1001", "2025-07"), "LH jobId kanonisch");
assert(maxAcme.job.company.id === ACME && maxLh.job.company.id === LH, "company.id auf Jobs");
assert(maxLh.payslip.totals.net !== maxAcme.payslip.totals.net, "Unterschiedliche Netto (keine Vermischung)");

console.log("\n=== Tenant: Inbox-Filter ===");
const lhJobs = listPayrollJobs({ companyId: LH });
const acmeJobs = listPayrollJobs({ companyId: ACME });
assert(lhJobs.every((j) => j.company.id === LH), "LH-Inbox nur LH");
assert(acmeJobs.every((j) => j.company.id === ACME), "ACME-Inbox nur ACME");
assert(lhJobs.some((j) => j.employee.id === "1001"), "Max in LH");
assert(acmeJobs.some((j) => j.employee.id === "1001"), "Max in ACME (andere Firma)");
assert(!lhJobs.some((j) => j.company.id === ACME), "Kein ACME-Leak in LH");

console.log("\n=== Tenant: Scope-Header Simulation ===");
const cross = await ingestPayroll(employeePayload(LH, "Lufthansa", "1002", "Ali Pilot"), {
  tenantScope: ACME,
});
assert(!cross.ok && /Tenant-Isolation|Scope/i.test(cross.errors.join(" ")), "Cross-tenant ingest blockiert");

const okScoped = await ingestPayroll(employeePayload(LH, "Lufthansa", "1003", "Josef Crew"), {
  tenantScope: LH,
});
assert(okScoped.ok, "Ingest mit passendem Scope ok");

const forbidden = await releasePayrollJob(maxLh.job.jobId, { tenantScope: ACME });
assert(!forbidden.ok && /Tenant-Isolation/i.test(forbidden.error || ""), "Cross-tenant release blockiert");

const allowed = await releasePayrollJob(maxLh.job.jobId, { tenantScope: LH });
assert(allowed.ok && allowed.delivery?.company?.id === LH, "Release nur im eigenen Tenant");

const pendingLh = listPendingDeliveries({ companyId: LH });
const pendingAcme = listPendingDeliveries({ companyId: ACME });
assert(pendingLh.every((d) => d.company?.id === LH), "Pending LH isoliert");
assert(!pendingAcme.some((d) => d.deliveryId === allowed.delivery.deliveryId), "LH-Delivery nicht in ACME-Queue");

console.log("\n=== Tenant: Invoice Isolation ===");
const invA = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: LH, name: "Lufthansa" },
  number: "RE-1",
  customer: "Kunde A",
  items: [{ description: "X", quantity: 1, unitPrice: 100 }],
});
const invB = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: ACME, name: "ACME" },
  number: "RE-1",
  customer: "Kunde B",
  items: [{ description: "Y", quantity: 1, unitPrice: 50 }],
});
assert(invA.ok && invB.ok, "Beide Rechnungen ok");
assert(invA.job.id !== invB.job.id, `Gleiche Nr, verschiedene IDs (${invA.job.id} ≠ ${invB.job.id})`);
assert(listInvoiceJobs({ companyId: LH }).every((j) => j.company.id === LH), "Invoice LH filter");
assert(listInvoiceJobs({ companyId: ACME }).every((j) => j.company.id === ACME), "Invoice ACME filter");

console.log("\n=== Tenant: assertSameTenant helper ===");
assert(assertSameTenant("", LH).ok, "Kein Scope = erlaubt (Buchhalter-Master)");
assert(assertSameTenant(LH, LH).ok, "Gleicher Tenant ok");
assert(!assertSameTenant(LH, ACME).ok, "Fremder Tenant verweigert");

console.log(`\n=== Isolation Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }
process.exit(failed > 0 ? 1 : 0);
