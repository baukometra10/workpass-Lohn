/**
 * Company activate → account + workspace section immediately.
 * Run: node tests/company-activate.mjs
 */
import {
  activateCompany,
  deactivateCompany,
  listCompanies,
  loadCompany,
  companyWorkspaceView,
  ensureCompanyFromPayload,
} from "../server/company-service.mjs";

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

const demoId = `demo-activate-${Date.now().toString(36)}`;

console.log("\n=== Company activate: create workspace ===");
const first = activateCompany({
  kind: "platform.company.activate.v1",
  event: "company.accounting.activated",
  company: {
    id: demoId,
    name: "Demo Activate GmbH",
    city: "Berlin",
  },
  connection: {
    accountingEnabled: true,
    sendPayslips: true,
    activatedBy: "test",
  },
});
assert(first.ok, "activate ok");
assert(first.created === true, "created on first activate");
assert(first.company?.id === demoId, "company id set");
assert(first.company?.meta?.accountingEnabled === true, "accountingEnabled");
assert(first.company?.meta?.workspaceStatus === "active", "workspace active");
assert(first.workspace?.section?.id === `ws:${demoId}`, "section id");
assert(first.workspace?.section?.title === "Demo Activate GmbH", "section title");

console.log("\n=== Company activate: idempotent ===");
const second = activateCompany({
  company: { id: demoId, name: "Demo Activate GmbH" },
  connection: { accountingEnabled: true },
});
assert(second.ok && second.created === false, "second activate not created");
assert(loadCompany(demoId)?.meta?.section?.id === `ws:${demoId}`, "section retained");

console.log("\n=== List workspaces ===");
const listed = listCompanies();
assert(listed.some((c) => c.id === demoId), "in registry");
const view = companyWorkspaceView(loadCompany(demoId));
assert(view?.accountingEnabled === true, "workspace view enabled");

console.log("\n=== Deactivate soft ===");
const off = deactivateCompany(demoId);
assert(off.ok && off.company?.meta?.accountingEnabled === false, "deactivated");
assert(off.workspace?.workspaceStatus === "inactive", "inactive status");
assert(loadCompany(demoId), "data retained");

console.log("\n=== Ensure from ingest fallback ===");
const ingestId = `ingest-fallback-${Date.now().toString(36)}`;
const ensured = ensureCompanyFromPayload({
  company: { id: ingestId, name: "Ingest Fallback AG" },
});
assert(ensured.ok && ensured.company?.meta?.accountingEnabled === true, "ingest ensure activates");
assert(ensured.company?.meta?.section?.id === `ws:${ingestId}`, "ingest section");

console.log("\n=== Reject without id ===");
const bad = activateCompany({ company: { name: "No Id GmbH" } });
assert(!bad.ok, "reject without company.id");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
