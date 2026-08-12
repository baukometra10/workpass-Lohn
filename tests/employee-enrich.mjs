/**
 * Payroll job enrichment: registry + company + platform pull, ask only leftovers.
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { upsertEmployee } from "../server/employee-registry.mjs";
import { ingestPayrollBatch } from "../server/payroll-service.mjs";
import { enrichPayrollJob } from "../server/employee-enrich.mjs";
import { loadPayrollJob } from "../server/store.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const cid = `er${Date.now().toString(36)}`;
activateCompany({
  company: {
    id: cid,
    name: "Enrich GmbH",
    taxNumber: "99/888/77777",
    vatId: "DE999888777",
  },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
  hubProfile: {
    seller: "Enrich GmbH\nWeg 1\n10115 Berlin",
  },
});

// Incomplete payroll (missing bank, SV, KK, tax already on company)
const batch = await ingestPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period: "2026-07",
  company: { id: cid, name: "Enrich GmbH" },
  employees: [{
    employee: {
      id: "BP-FA-Z2CIE",
      badgeId: "BP-FA-Z2CIE",
      name: "Feras Almohammad",
      taxClass: "I",
    },
    attendance: { days: 20, hours: 160 },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3200, taxFlag: "L", svFlag: "L" }],
  }],
}, { tenantScope: cid, notifyGaps: false });

const jobId = batch.results?.[0]?.jobId;
assert(Boolean(jobId), "job created");

const before = loadPayrollJob(jobId);
assert(before?.errors?.length || before?.printHints?.length, "gaps before enrich");
assert(!String(before?.state?.taxNumber || "").trim(), "taxNumber empty before enrich");

// Registry already has master data (as if earlier platform import)
upsertEmployee({
  companyId: cid,
  badgeId: "BP-FA-Z2CIE",
  name: "Feras Almohammad",
  insuranceNo: "12050855X123",
  healthFund: "TK",
  bankName: "Sparkasse",
  bankIban: "DE89370400440532013000",
  source: "test-registry",
});

const enriched = await enrichPayrollJob(jobId, {
  tenantScope: cid,
  pull: false, // unit test without live platform
  ask: false,
});

assert(enriched.ok, "enrich ok");
assert(String(enriched.job?.state?.taxNumber || "").includes("99/888"), `tax from company (${enriched.job?.state?.taxNumber})`);
assert(String(enriched.job?.state?.bankIban || "").startsWith("DE89"), "iban from registry");
assert(String(enriched.job?.state?.healthFund || "") === "TK", "KK from registry");
assert(String(enriched.job?.state?.employeeInsuranceNo || "").includes("12050855"), "SV from registry");
assert(!(enriched.remainingSoft || []).some((s) => /IBAN|Bank|Krankenkasse|SV-Nummer|Steuer-Nr/i.test(s)), `core soft gaps cleared (${(enriched.remainingSoft || []).join(",")})`);
assert(enriched.filledCount >= 3, `filled fields (${enriched.filledCount})`);

deleteCompany(cid);
console.log(`\n${failed ? "FAILED" : "OK"} · passed=${passed} failed=${failed}`);
process.exit(failed ? 1 : 0);
