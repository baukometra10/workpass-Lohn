/**
 * Tax Rules Engine – effective dating + citations
 * Run: node tests/tax-rules.mjs
 */
import { evaluate, resolveSv, listRulesets, setExtraPacks } from "../tax-rules/engine.mjs";

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

console.log("\n=== Tax Rules Engine ===");
const sets = listRulesets({ country: "DE" });
assert(sets.some((p) => p.id.includes("2025")), "2025 pack published");
assert(sets.some((p) => p.id.includes("2026")), "2026 pack published");

const y25 = resolveSv({ country: "DE", asOf: "2025-12-15" });
assert(y25.ok && y25.params.minijob.ceiling === 556, `2025-12-15 Mini = 556 (got ${y25.params?.minijob?.ceiling})`);
assert(y25.params.healthAdditionalDefault === 2.5, "2025 KV-Zusatz 2,5 %");
assert(y25.params.care === 1.7, "2025 PV AN 1,7 %");
assert(y25.citations.some((c) => c.article && String(c.article).includes("SGB")), "citations include SGB");

const y26 = resolveSv({ country: "DE", asOf: "2026-07" });
assert(y26.ok && y26.params.minijob.ceiling === 603, `2026-07 Mini = 603 (got ${y26.params?.minijob?.ceiling})`);
assert(y26.params.healthAdditionalDefault === 2.9, "2026 KV-Zusatz 2,9 %");
assert(y26.params.care === 1.8, "2026 PV AN 1,8 %");
assert(y26.rulesetId !== y25.rulesetId, "different ruleset ids across years");

const vat = evaluate({ kind: "vat", country: "DE", asOf: "2026-03-01", facts: { vatCategory: "standard" } });
assert(vat.ok && vat.result.vatRate === 19, "USt 19 % from engine");
assert(vat.citations.some((c) => c.article && String(c.article).includes("UStG")), "USt citation § 12 UStG");

const midYear = evaluate({
  kind: "payroll-params",
  country: "DE",
  asOf: "2026-01-01",
});
assert(midYear.ok && midYear.result.sv.minijob.ceiling === 603, "Jan 2026 uses 2026 pack (effective-dated)");

setExtraPacks([
  {
    id: "DE-SV-USt-2026.2-patch",
    country: "DE",
    status: "published",
    version: "2026.2",
    papYear: 2026,
    effectiveFrom: "2026-07-01",
    effectiveTo: null,
    sv: { ...y26.params, care: 1.9, careChildless: 2.5 },
    vat: { standard: 19, reduced: 7, zero: 0 },
    citations: [
      {
        kind: "sv",
        ruleId: "de.sv.pv.2026.midyear",
        source: "SGB XI",
        article: "§ 55 SGB XI (Beispiel-Patch)",
        effectiveFrom: "2026-07-01",
        value: 1.9,
      },
    ],
  },
]);
const beforePatch = resolveSv({ country: "DE", asOf: "2026-06-15" });
const afterPatch = resolveSv({ country: "DE", asOf: "2026-07-15" });
assert(beforePatch.params.care === 1.8, "before mid-year patch: PV 1,8");
assert(afterPatch.params.care === 1.9, "after mid-year patch: PV 1,9");
assert(afterPatch.rulesetId.includes("2026.2"), "latest effectiveFrom wins");
setExtraPacks([]);

const draftIgnored = evaluate({ country: "DE", asOf: "2027-01-15", kind: "sv" });
assert(draftIgnored.ok && draftIgnored.result.sv.minijob.ceiling === 603, "open-ended 2026 pack still applies in 2027 until a 2027 pack is published");

setExtraPacks([
  {
    id: "DE-DRAFT-ONLY",
    country: "DE",
    status: "draft",
    papYear: 2028,
    effectiveFrom: "2028-01-01",
    sv: { ...y26.params, minijob: { ...y26.params.minijob, ceiling: 999 } },
    vat: { standard: 19, reduced: 7, zero: 0 },
  },
]);
const draftNotLive = resolveSv({ country: "DE", asOf: "2028-06-01" });
assert(draftNotLive.params?.minijob?.ceiling !== 999, "draft extra pack is never applied");
setExtraPacks([]);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
