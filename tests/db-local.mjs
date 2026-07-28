/**
 * Local-first SQLite persistence tests (no Postgres required).
 * Run: node tests/db-local.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync, rmSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDb = path.join(root, "server", "data", `test-local-${Date.now()}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

const { initDb, saveCompany, loadCompany, savePayrollJob, loadPayrollJob, listPayrollJobs, enqueueDeliveryRow, listPendingDeliveries, ackDeliveryRow, syncHealth, flushSyncOutbox } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== DB Local-First ===");
const health = initDb();
assert(health.local === true, "SQLite online");
assert(health.postgres?.configured === false, "Postgres optional (off)");

const company = saveCompany({
  id: "db-test-gmbh",
  name: "DB Test GmbH",
  kind: "platform.company.v1",
});
assert(loadCompany("db-test-gmbh")?.name === "DB Test GmbH", "Company roundtrip");

const job = savePayrollJob({
  jobId: "db-test-gmbh::e1::2025-07",
  company: { id: "db-test-gmbh", name: "DB Test GmbH" },
  employee: { id: "e1", name: "Eva" },
  period: "2025-07",
  status: "calculated",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  payslip: { totals: { net: 1000 } },
});
assert(loadPayrollJob(job.jobId)?.employee?.name === "Eva", "Payroll roundtrip");
assert(listPayrollJobs({ companyId: "db-test-gmbh" }).length >= 1, "List by company");
assert(listPayrollJobs({ companyId: "other" }).length === 0, "Isolation empty");

const delivery = enqueueDeliveryRow({
  deliveryId: "pay:db-test-gmbh::e1::2025-07",
  type: "payslip",
  company: { id: "db-test-gmbh" },
  queueStatus: "pending",
});
assert(listPendingDeliveries({ companyId: "db-test-gmbh" }).some((d) => d.deliveryId === delivery.deliveryId), "Pending delivery");
const ack = ackDeliveryRow(delivery.deliveryId, { test: true });
assert(ack.ok && ack.delivery.queueStatus === "delivered", "Ack delivery");

const flush = await flushSyncOutbox();
assert(flush.mode === "local-only", "Flush local-only without Postgres");
assert(syncHealth().outboxPending >= 0, "Outbox readable");

closeSqlite();
try {
  unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== DB Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
