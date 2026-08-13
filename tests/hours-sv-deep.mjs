/**
 * Deep-find SV/KK + hours×rate enrich helpers.
 */
import { deepFindByKey, deepFindNumberByKey, KEY_RE } from "../server/field-deep-find.mjs";
import { normalizeEmployeeRecord } from "../server/employee-normalize.mjs";
import { collectEmployeesFromPayload } from "../server/platform-pull.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== deep find SV/KK ===");
const sample = {
  personal: {
    stammdaten: {
      versicherungsnummer: "65170839J008",
      krankenkassenName: "AOK Bayern",
    },
  },
  pay: { stundenlohn: 19.75 },
};
assert(deepFindByKey(sample, KEY_RE.insuranceNo) === "65170839J008", "SV deep");
assert(deepFindByKey(sample, KEY_RE.healthFund) === "AOK Bayern", "KK deep");
assert(deepFindNumberByKey(sample, KEY_RE.hourlyRate) === 19.75, "hourly deep");

const norm = normalizeEmployeeRecord(sample);
assert(norm.insuranceNo === "65170839J008", "normalize SV");
assert(norm.healthFund === "AOK Bayern", "normalize KK");
assert(Number(norm.hourlyRate) === 19.75, "normalize hourly");

console.log("\n=== contract flatten hours rate ===");
const rows = collectEmployeesFromPayload({
  contract: {
    employeeId: "BP-1",
    firstName: "Ali",
    lastName: "Test",
    stundenlohn: 20,
    socialInsurance: { versicherungsnummer: "11111111A111" },
    healthInsurance: { provider: "TK" },
  },
});
assert(rows[0].insuranceNo?.includes("11111111"), "contract SV");
assert(rows[0].healthFund === "TK", "contract KK provider");
assert(Number(rows[0].hourlyRate) === 20, "contract hourly");

console.log("\n=== insuranceNumber alias ===");
const alias = normalizeEmployeeRecord({
  id: "BP-2",
  insuranceNumber: "22110839A001",
  healthFund: "DAK",
  hourlyRate: 13,
});
assert(alias.insuranceNo === "22110839A001", "insuranceNumber → insuranceNo");
assert(alias.healthFund === "DAK", "KK alias");
assert(Number(alias.hourlyRate) === 13, "rate alias");

const flatIns = collectEmployeesFromPayload({
  contract: {
    employeeId: "BP-3",
    firstName: "Sara",
    lastName: "Demo",
    insuranceNumber: "33001122B333",
    stundenlohn: 13,
  },
});
assert(String(flatIns[0].insuranceNo || "").includes("33001122"), "flatten insuranceNumber");

console.log(`\n${failed ? "FAILED" : "OK"} · passed=${passed} failed=${failed}`);
process.exit(failed ? 1 : 0);
