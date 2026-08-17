/**
 * Human-final policy, SEPA, simulate, assistant explain-only
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { processInboundPayrollBatch } from "../server/auto-pipeline.mjs";
import {
  requireHumanConfirm,
  assertNotAiApplyingLaw,
  humanFinalPublicInfo,
} from "../server/policy/human-final.mjs";
import { buildComplianceCalendar } from "../server/compliance-calendar.mjs";
import { buildSepaCreditTransfer } from "../server/sepa-export.mjs";
import { explainPortalGaps } from "../server/assistant/explain.mjs";
import {
  simulatePayroll,
  detectPayrollAnomalies,
  buildDeliveryTrust,
  buildElsterPrepChecklist,
} from "../server/portal-trust.mjs";
import { buildOpsHealth } from "../server/ops-health.mjs";
import { verifyAuditChain, audit } from "../server/security/audit.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Human-final policy ===");
assert(humanFinalPublicInfo().humanFinal === true, "policy public");
assert(humanFinalPublicInfo().policyVersion === "2", "policy v2");
assert(!requireHumanConfirm({}, "month_close").ok, "confirm required");
assert(requireHumanConfirm({ confirm: true }, "month_close").ok, "confirm ok");
assert(!assertNotAiApplyingLaw({ appliedBy: "ai" }).ok, "reject ai actor");
assert(!assertNotAiApplyingLaw({ execute: true }).ok, "reject execute");
assert(assertNotAiApplyingLaw({ confirm: true }).ok, "human ok");
assert(assertNotAiApplyingLaw({ applyEngineTax: true, appliedBy: "assistant" }).ok, "engine tax allowed");
assert(!assertNotAiApplyingLaw({ applyTax: true }).ok, "invented applyTax blocked");

const id = `hf${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Human Final GmbH", taxNumber: "11/22/33333", bankIban: "DE89370400440532013000" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== Seed released payslip ===");
const batch = await processInboundPayrollBatch({
  kind: "platform.payroll.batch.v1",
  period: "2026-08",
  company: { id, name: "Human Final GmbH", taxNumber: "11/22/33333" },
  employees: [{
    employee: {
      id: "HF-1",
      badgeId: "HF-1",
      name: "Final User",
      taxClass: "I",
      healthFund: "TK",
      healthPercent: "14.6",
    },
    attendance: { days: 20, hours: 160 },
    wageItems: [{ code: "2000", label: "Gehalt", amount: 3200, taxFlag: "L", svFlag: "L" }],
    bank: { name: "Bank", iban: "DE89370400440532013000" },
  }],
}, { tenantScope: id, notify: false, autoRelease: true });
assert(batch.releasedCount >= 1, `released ${batch.releasedCount}`);

console.log("\n=== SEPA ===");
const sepa = buildSepaCreditTransfer(id, { period: "2026-08", debtorIban: "DE89370400440532013000" });
assert(sepa.ok, `sepa ok: ${sepa.error || ""}`);
assert(String(sepa.xml || "").includes("pain.001.001.03") || String(sepa.xml || "").includes("CstmrCdtTrfInitn"), "sepa xml");
assert(sepa.humanFinal === true, "sepa humanFinal");

console.log("\n=== Simulate (no persist) ===");
const sim = simulatePayroll({
  company: { id },
  period: "2026-08",
  employee: { id: "S1", badgeId: "S1", name: "Sim", taxClass: "I", healthFund: "TK", healthPercent: "14.6" },
  attendance: { hours: 100 },
  wageItems: [{ code: "2000", amount: 2000, taxFlag: "L", svFlag: "L" }],
  bank: { iban: "DE89370400440532013000" },
});
assert(sim.simulation === true && sim.persisted === false, "simulation flags");
assert(sim.released === false, "not released");

const simAi = simulatePayroll({ appliedBy: "ai", company: { id } });
assert(simAi.ok === false, "simulate rejects ai");

console.log("\n=== Assistant explain-only ===");
const explained = explainPortalGaps({ companyId: id, period: "2026-08" });
assert(explained.ok && explained.execute === false, "explain ok");
const execBlocked = explainPortalGaps({ companyId: id, execute: true });
assert(execBlocked.ok === false, "execute blocked");

console.log("\n=== Calendar / anomalies / trust / elster ===");
assert(buildComplianceCalendar("2026-08").ok, "calendar");
const cal = buildComplianceCalendar("2026-08", { companyId: id, asOf: "2026-08-15" });
assert(cal.kind === "portal.compliance_calendar.v2", "calendar v2");
assert(cal.items.some((i) => i.dueBankingDay), "banking day enrichment");
assert(detectPayrollAnomalies(id, { period: "2026-08" }).ok, "anomalies");
const anom = detectPayrollAnomalies(id, { period: "2026-08" });
assert(anom.kind === "portal.anomalies.v2", "anomalies v2");
assert(buildDeliveryTrust(id, { period: "2026-08" }).ok, "trust");
const trust = buildDeliveryTrust(id, { period: "2026-08" });
assert(typeof trust.score === "number", "trust score");
assert(buildElsterPrepChecklist(id, { period: "2026-08" }).humanFinal === true, "elster prep");

console.log("\n=== IBAN mod97 ===");
const { ibanMod97Ok } = await import("../server/sepa-export.mjs");
assert(ibanMod97Ok("DE89370400440532013000") === true, "valid test IBAN");
assert(ibanMod97Ok("DE00370400440532013000") === false, "bad IBAN rejected");

console.log("\n=== Ops + audit chain ===");
audit({ type: "test.human_final", outcome: "ok", detail: { t: 1 } });
const chain = verifyAuditChain(20);
assert(chain.ok, `audit chain: ${chain.message}`);
const ops = buildOpsHealth();
assert(ops.kind === "admin.ops_health.v1", "ops health shape");
assert(ops.policy?.humanFinal === true, "ops includes policy");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
