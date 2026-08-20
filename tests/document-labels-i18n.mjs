/**
 * Localized document labels for platform Antrag.
 * Run: node tests/document-labels-i18n.mjs
 */
import {
  documentTitleForTypeLocalized,
  buildDocumentDisplayTitleLocalized,
  documentTitleDeForType,
  normalizeUiLocale,
  resolveUiLocale,
} from "../server/document-labels-i18n.mjs";
import { applyPlatformDocumentLabels, buildEmployeeDelivery } from "../server/notify.mjs";

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

console.log("\n=== Document labels i18n ===");

assert(normalizeUiLocale("en-US") === "en", "normalize en-US");
assert(normalizeUiLocale("ar") === "ar", "normalize ar");
assert(resolveUiLocale({ locale: "fr" }) === "fr", "resolve body locale");
assert(resolveUiLocale({ headers: { "x-workpass-locale": "tr" } }) === "tr", "resolve header");

assert(documentTitleDeForType("verdienst") === "Verdienstbescheinigung", "DE verdienst");
assert(documentTitleForTypeLocalized("verdienst", "en") === "Earnings certificate", "EN verdienst");
assert(documentTitleForTypeLocalized("payslip", "en") === "Payslip", "EN payslip");
assert(documentTitleForTypeLocalized("lstb", "fr").length > 3, "FR lstb");
assert(buildDocumentDisplayTitleLocalized("verdienst", "2026-08", "en") === "Earnings certificate 2026-08", "EN display");

const d = {
  documentType: "verdienst",
  period: "2026-08",
  deliveryId: "vb:test:1:2026-08",
  document: { kind: "portal.certificate.verdienst.v1", rows: [{ label: "x" }], monthly: {}, ytd: {}, employeeName: "A" },
};
applyPlatformDocumentLabels(d, "verdienst", { locale: "en" });
assert(d.description === "Earnings certificate 2026-08", `en description (${d.description})`);
assert(d.documentTitleDe === "Verdienstbescheinigung", "keeps DE alias");
assert(d.document.description === "Verdienstbescheinigung 2026-08", "document body stays DE");
assert(d.locale === "en", "locale en");

applyPlatformDocumentLabels(d, "verdienst", { locale: "de", topLevelOnly: true });
assert(d.description === "Verdienstbescheinigung 2026-08", "switch to DE top-level");
assert(d.document.description === "Verdienstbescheinigung 2026-08", "document unchanged DE");

console.log(`\n=== Labels i18n: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed ? 1 : 0);
