/**
 * Platform ↔ Accounting messages (gaps → notify → ack/read).
 * Run: node tests/platform-messages.mjs
 */
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import { ingestPayroll } from "../server/payroll-service.mjs";
import {
  listPendingMessagesForPlatform,
  ackMessage,
  classifyGapText,
} from "../server/platform-messages.mjs";

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

const id = `msg${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Comms Test GmbH" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== Classify gaps ===");
assert(classifyGapText("IBAN fehlt")?.code === "iban_missing", "iban code");
assert(classifyGapText("Steuer-Nr. der Firma fehlt")?.code === "company_tax_number_missing", "tax code");

console.log("\n=== Ingest incomplete payroll → messages ===");
const result = await ingestPayroll({
  kind: "platform.payroll.v1",
  period: "2026-07",
  company: { id, name: "Comms Test GmbH" },
  employee: { id: "e1", name: "Max Test", taxClass: "I" },
  wageItems: [{ code: "2000", label: "Gehalt", amount: 3000 }],
  // no bank / tax number → soft gaps
}, { tenantScope: id });

assert(result.ok, "payroll ok without hard errors");
assert((result.printHints || []).length > 0, "print hints present");
assert((result.platformMessages?.messages || []).length > 0, "messages created");

const pending = listPendingMessagesForPlatform({ companyId: id });
assert(pending.length > 0, "pending for platform");
const first = pending[0];
assert(first.status === "open", "open status");

console.log("\n=== Ack / read → disappears ===");
const acked = ackMessage(first.messageId, { readBy: "platform-test" });
assert(acked.ok && acked.message.status === "read", "acked read");
const after = listPendingMessagesForPlatform({ companyId: id });
assert(!after.some((m) => m.messageId === first.messageId), "gone from pending");

deleteCompany({ id });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
