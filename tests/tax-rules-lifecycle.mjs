/**
 * Invoice VAT from Tax Rules Engine + lifecycle draft→reviewed→published
 * Run: node tests/tax-rules-lifecycle.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ingestInvoice } from "../server/invoice-service.mjs";
import {
  taxIngestDraft,
  taxReviewRuleset,
  taxPublishLifecycle,
  taxResolveSv,
  taxEvaluate,
  taxDeleteStored,
  hydrateTaxRulesFromStore,
} from "../server/tax-rules/service.mjs";
import { validateRuleset } from "../tax-rules/validate.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
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

console.log("\n=== Invoice VAT from engine ===");
const invEngine = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: "tax-vat-test", name: "VAT Test GmbH" },
  number: "RE-VAT-001",
  invoiceDate: "2026-03-15",
  customer: "Kunde AG\nBerlin",
  // no taxRate → engine
  items: [{ description: "Leistung", quantity: 1, unitPrice: 100 }],
});
assert(invEngine.ok, "invoice ingest ok");
assert(invEngine.job?.draft?.taxRate === 19, `taxRate 19 from engine (got ${invEngine.job?.draft?.taxRate})`);
assert(invEngine.job?.draft?.taxAudit?.source === "tax-rules", "taxAudit.source tax-rules");
assert(invEngine.job?.draft?.taxAudit?.rulesetId?.includes("2026"), "ruleset 2026 for March 2026");

const invExplicit = ingestInvoice({
  kind: "platform.invoice.v1",
  company: { id: "tax-vat-test", name: "VAT Test GmbH" },
  number: "RE-VAT-002",
  invoiceDate: "2026-03-15",
  customer: "Kunde AG\nBerlin",
  taxRate: 7,
  items: [{ description: "ermäßigt", quantity: 1, unitPrice: 100 }],
});
assert(invExplicit.job?.draft?.taxRate === 7, "explicit taxRate wins");
assert(invExplicit.job?.draft?.taxAudit?.source === "payload", "taxAudit.source payload");

console.log("\n=== Lifecycle draft → reviewed → published ===");
hydrateTaxRulesFromStore();
const draftPath = path.join(root, "../examples/tax-ruleset.de-2027.draft.json");
const draftPack = JSON.parse(readFileSync(draftPath, "utf8"));
// unique id per run so re-runs don't clash with already-published state
const runId = `DE-SV-USt-2027.test-${Date.now()}`;
draftPack.id = runId;

const schema = validateRuleset(draftPack, { strict: true });
assert(schema.ok, `draft schema valid: ${schema.errors?.join("; ") || "ok"}`);

const ingested = taxIngestDraft(draftPack, { source: "ai" });
assert(ingested.ok && ingested.ruleset?.status === "draft", "ingest → draft");

const liveBefore = taxResolveSv({ country: "DE", asOf: "2027-06-15" });
assert(
  liveBefore.params?.minijob?.ceiling === 603,
  `draft not live yet (mini still 603, got ${liveBefore.params?.minijob?.ceiling})`
);

const tooSoon = taxPublishLifecycle(runId);
assert(!tooSoon.ok, "cannot publish draft without review");

const reviewed = taxReviewRuleset(runId);
assert(reviewed.ok && reviewed.ruleset?.status === "reviewed", `review ok: ${reviewed.error || ""}`);

const skipPublish = taxPublishLifecycle("no-such-id");
assert(!skipPublish.ok, "publish unknown id fails");

const published = taxPublishLifecycle(runId);
assert(published.ok && published.ruleset?.status === "published", `publish ok: ${published.error || ""}`);

const liveAfter = taxResolveSv({ country: "DE", asOf: "2027-06-15" });
assert(
  liveAfter.params?.minijob?.ceiling === 620 && liveAfter.rulesetId === runId,
  `2027 pack live after publish (mini ${liveAfter.params?.minijob?.ceiling})`
);

const vat2027 = taxEvaluate({ kind: "vat", country: "DE", asOf: "2027-02-01" });
assert(vat2027.ok && vat2027.result?.vatRate === 19, "vat still 19 after 2027 publish");

taxDeleteStored(runId);
hydrateTaxRulesFromStore();
const cleaned = taxResolveSv({ country: "DE", asOf: "2027-06-15" });
assert(
  cleaned.params?.minijob?.ceiling === 603,
  "cleanup restores open-ended 2026 for 2027"
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
