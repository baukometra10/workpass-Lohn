/**
 * Export run log + bank import stub.
 * Run: node tests/export-status.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDb = path.join(root, "server", "data", `export-status-${Date.now()}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "export-status-test-key-material-not-prod";

const { recordExportRun, exportStatusSummary, importBankStatus } = await import("../server/export-status.mjs");
const { platformCapabilities } = await import("../server/platform-contract.mjs");
const { buildDeliveryReconciliation } = await import("../server/delivery-reconciliation.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Export status ===");
recordExportRun({ companyId: "cmp-exp", period: "2026-08", kind: "sepa", fileName: "SEPA.xml", meta: { count: 3 } });
recordExportRun({ companyId: "cmp-exp", period: "2026-08", kind: "datev", fileName: "DATEV.csv" });
const summary = exportStatusSummary("cmp-exp", "2026-08");
assert(summary.ok && summary.latestByKind?.sepa?.kind === "sepa", "latest sepa run");
assert(summary.latestByKind?.datev?.fileName === "DATEV.csv", "latest datev run");

const imp = importBankStatus({
  companyId: "cmp-exp",
  period: "2026-08",
  kind: "sepa",
  content: "<Document><Sts>RJCT rejected</Sts></Document>",
});
assert(imp.ok && imp.bankStatus === "rejected", "pain.002 rejected stub");

console.log("\n=== Platform contract v2 ===");
const caps = platformCapabilities();
assert(caps.contractVersion === 2, "contract v2");
assert((caps.outbound?.deliveryTypes || []).includes("lstb"), "lstb delivery type");

console.log("\n=== Delivery reconciliation ===");
const recon = buildDeliveryReconciliation("cmp-exp", { period: "2026-08" });
assert(recon.ok && recon.kind === "portal.delivery_reconciliation.v1", "reconciliation shape");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Export-status Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
