/**
 * Multi-tenant isolation tests – company.id must never mix data.
 * Run: node tests/tenant-isolation.mjs
 */
import { ingestPayroll, releasePayrollJob } from "../server/payroll-service.mjs";
import { ingestInvoice } from "../server/invoice-service.mjs";
import { listPayrollJobs, listInvoiceJobs } from "../server/store.mjs";
import { upsertCompany, listCompanies, loadCompany } from "../server/company-service.mjs";
import { listPendingDeliveries } from "../server/delivery-queue.mjs";
import { assertSameTenant, payrollJobId } from "../server/tenant.mjs";

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
  id: "lufthansa",
  name: "Deutsche Lufthansa AG",
  city: "Köln",
});
assert(lh.ok && lh.company.id === "lufthansa", "Lufthansa upsert");
const ac = upsertCompany({ id: "acme-corp", name: "ACME Corp" });
assert(ac.ok && ac.company.id === "acme-corp", "ACME upsert");
assert(loadCompany("lufthansa")?.name.includes("Lufthansa"), "Load by id");
assert(listCompanies().some((c) => c.id === "lufthansa") && listCompanies().some((c) => c.id === "acme-corp"), "Both in registry");

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
const maxLh = await ingestPayroll(employeePayload("lufthansa", "Lufthansa", "1001", "Max Mustermann", 4500));
const maxAcme = await ingestPayroll(employeePayload("acme-corp", "ACME Corp", "1001", "Max Mustermann", 2800));
assert(maxLh.ok && maxAcme.ok, "Beide Ingests ok");
assert(maxLh.job.jobId !== maxAcme.job.jobId, `Getrennte jobIds (${maxLh.job.jobId} ≠ ${maxAcme.job.jobId})`);
assert(maxLh.job.jobId === payrollJobId("lufthansa", "1001", "2025-07"), "LH jobId kanonisch");
assert(maxAcme.job.company.id === "acme-corp" && maxLh.job.company.id === "lufthansa", "company.id auf Jobs");
assert(maxLh.payslip.totals.net !== maxAcme.payslip.totals.net, "Unterschiedliche Netto (keine Vermischung)");

console.log("\n=== Tenant: Inbox-Filter ===");
const lhJobs = listPayrollJobs({ companyId: "lufthansa" });
const acmeJobs = listPayrollJobs({ companyId: "acme-corp" });
assert(lhJobs.every((j) => j.company.id === "lufthansa"), "LH-Inbox nur LH");
assert(acmeJobs.every((j) => j.company.id === "acme-corp"), "ACME-Inbox nur ACME");
assert(lhJobs.some((j) => j.employee.id === "1001"), "Max in LH");
assert(acmeJobs.some((j) => j.employee.id === "1001"), "Max in ACME (andere Firma)");
assert(!lhJobs.some((j) => j.company.id === "acme-corp"), "Kein ACME-Leak in LH");

console.log("\n=== Tenant: Scope-Header Simulation ===");
const cross = await ingestPayroll(employeePayload("lufthansa", "Lufthansa", "1002", "Ali Pilot"), {
  tenantScope: "acme-corp",
});
assert(!cross.ok && /Tenant-Isolation|Scope/i.test(cross.errors.join(" ")), "Cross-tenant ingest blockiert");

const okScoped = await ingestPayroll(employeePayload("lufthansa", "Lufthansa", "1003", "Josef Crew"), {
  tenantScope: "lufthansa",
});
assert(okScoped.ok, "Ingest mit passendem Scope ok");

const forbidden = await releasePayrollJob(maxLh.job.jobId, { tenantScope: "acme-corp" });
assert(!forbidden.ok && /Tenant-Isolation/i.test(forbidden.error || ""), "Cross-tenant release blockiert");

const allowed = await releasePayrollJob(maxLh.job.jobId, { tenantScope: "lufthansa" });
assert(allowed.ok && allowed.delivery?.company?.id === "lufthansa", "Release nur im eigenen Tenant");

const pendingLh = listPendingDeliveries({ companyId: "lufthansa" });
const pendingAcme = listPendingDeliveries({ companyId: "acme-corp" });
assert(pendingLh.every((d) => d.company?.id === "lufthansa"), "Pending LH isoliert");
assert(!pendingAcme.some((d) => d.deliveryId === allowed.delivery.deliveryId), "LH-Delivery nicht in ACME-Queue");

console.log("\n=== Tenant: Invoice Isolation ===");
const invA = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: "lufthansa", name: "Lufthansa" },
  number: "RE-1",
  customer: "Kunde A",
  items: [{ description: "X", quantity: 1, unitPrice: 100 }],
});
const invB = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: "acme-corp", name: "ACME" },
  number: "RE-1",
  customer: "Kunde B",
  items: [{ description: "Y", quantity: 1, unitPrice: 50 }],
});
assert(invA.ok && invB.ok, "Beide Rechnungen ok");
assert(invA.job.id !== invB.job.id, `Gleiche Nr, verschiedene IDs (${invA.job.id} ≠ ${invB.job.id})`);
assert(listInvoiceJobs({ companyId: "lufthansa" }).every((j) => j.company.id === "lufthansa"), "Invoice LH filter");
assert(listInvoiceJobs({ companyId: "acme-corp" }).every((j) => j.company.id === "acme-corp"), "Invoice ACME filter");

console.log("\n=== Tenant: assertSameTenant helper ===");
assert(assertSameTenant("", "lufthansa").ok, "Kein Scope = erlaubt (Buchhalter-Master)");
assert(assertSameTenant("lufthansa", "lufthansa").ok, "Gleicher Tenant ok");
assert(!assertSameTenant("lufthansa", "acme-corp").ok, "Fremder Tenant verweigert");

console.log(`\n=== Isolation Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
