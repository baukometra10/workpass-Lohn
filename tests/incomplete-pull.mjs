/**
 * Pull accepts incomplete / oddly wrapped platform payloads.
 */
import {
  normalizePlatformBatch,
  pullPlatformPayrollBatch,
  requestEmployeeDataFromPlatform,
  runMonthClose,
} from "../server/month-close.mjs";
import { activateCompany, deleteCompany } from "../server/company-service.mjs";
import http from "node:http";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== normalize wrapped / incomplete shapes ===");
const wrapped = normalizePlatformBatch({
  ok: false,
  error: "incomplete",
  data: {
    period: "2026-07",
    company: { id: "c1" },
    workers: [{ employee: { id: "B1", name: "Nora" }, wageItems: [{ code: "2000", amount: 2000 }] }],
  },
}, { companyId: "c1", period: "2026-07" });
assert(wrapped?.employees?.length === 1, "workers[] accepted");
assert(wrapped.incomplete === true, "marked incomplete");

const nested = normalizePlatformBatch({
  result: { batch: { employees: [{ id: "X", name: "Tom", wageItems: [] }] } },
}, { companyId: "c1", period: "2026-07" });
assert(nested?.employees?.length === 1, "result.batch.employees accepted");

const prevUrl = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
const prevMethod = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", "http://127.0.0.1");
  // Simulate platform: HTTP 422 + ok:false but still returns partial employees
  res.writeHead(422, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: false,
    error: "incomplete",
    partial: true,
    companyId: u.searchParams.get("companyId"),
    period: u.searchParams.get("period"),
    payload: {
      employees: [{
        employee: {
          id: u.searchParams.get("employeeId") || "E-9",
          badgeId: u.searchParams.get("employeeId") || "E-9",
          name: "Partial Person",
          taxClass: "I",
        },
        wageItems: [{ code: "2000", label: "Gehalt", amount: 3100, taxFlag: "L", svFlag: "L" }],
        // IBAN missing on purpose
      }],
    },
  }));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address();
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = `http://127.0.0.1:${port}/export`;
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = "GET";

console.log("\n=== pull accepts incomplete HTTP 422 body ===");
const pull = await pullPlatformPayrollBatch({ companyId: "c1", period: "2026-07" });
assert(pull.ok === true, "pull ok despite 422");
assert(pull.batch?.employees?.length === 1, "got employee");
assert(pull.incomplete === true, "incomplete flag");

const id = `inc${Date.now().toString(36)}`;
activateCompany({
  company: { id, name: "Incomplete GmbH", taxNumber: "11/22/33333" },
  login: { password: "4821" },
  connection: { accountingEnabled: true },
});

console.log("\n=== month close with incomplete batch still works ===");
const close = await runMonthClose({
  companyId: id,
  period: "2026-07",
  pull: false,
  autoRelease: true,
  notify: false,
  tenantScope: id,
  batch: {
    kind: "platform.payroll.batch.v1",
    period: "2026-07",
    company: { id, name: "Incomplete GmbH", taxNumber: "11/22/33333" },
    employees: [
      {
        employee: { id: "OK1", badgeId: "OK1", name: "Complete User", taxClass: "I", healthFund: "TK", healthPercent: "14.6" },
        attendance: { days: 20, hours: 160 },
        wageItems: [{ code: "2000", label: "Gehalt", amount: 3000, taxFlag: "L", svFlag: "L" }],
        bank: { name: "Bank", iban: "DE89370400440532013000" },
      },
      {
        employee: { id: "GAP1", badgeId: "GAP1", name: "Gap User" },
        wageItems: [{ code: "2000", label: "Gehalt", amount: 2000, taxFlag: "L", svFlag: "L" }],
        // taxClass missing → hard error; bank missing → soft gap message
      },
    ],
  },
});
assert(close.ok === true, "month close ok with partial");
assert((close.newlyReleased?.length || 0) >= 1, "complete employee released");
assert(
  close.partial === true
  || (close.batch?.results || []).some((r) => (r.printHints || []).length > 0),
  "soft gaps tracked as partial or printHints"
);

console.log("\n=== request employee data asks platform ===");
const reqData = await requestEmployeeDataFromPlatform({
  companyId: id,
  companyName: "Incomplete GmbH",
  employeeId: "GAP1",
  badgeId: "GAP1",
  employeeName: "Gap User",
  period: "2026-07",
  gaps: ["IBAN fehlt", "Bank fehlt"],
  pull: true,
  forceNotify: true,
  tenantScope: id,
  notify: false,
});
assert(reqData.ok === true, "request ok");
assert(reqData.pull?.ok === true, "employee pull accepted incomplete");

server.close();
deleteCompany({ id });
if (prevUrl == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = prevUrl;
if (prevMethod == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = prevMethod;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
