/**
 * Document completeness for platform delivery.
 * Run: node tests/document-complete.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `doc-complete-${stamp}.sqlite`);

process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "doc-complete-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "doc-complete-session";
process.env.WORKPASS_API_KEY = "doc-complete-api";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;

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

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { ingestPayroll } = await import("../server/payroll-service.mjs");
const { buildEmployeeLstbCertificate, buildEmployeeVerdienstCertificate } = await import("../server/certificates/employee-certificates.mjs");
const { buildEmployeeDelivery, assessDocumentCompleteness } = await import("../server/notify.mjs");

console.log("\n=== Document complete to platform ===");
initDb();
const companyId = `cmp-doc-${stamp}`;
saveCompany({ id: companyId, name: "Doc GmbH", taxNumber: "11/222/33333" });

async function seed(period) {
  const r = await ingestPayroll({
    kind: "platform.payroll.v1",
    period,
    company: { id: companyId, name: "Doc GmbH", taxNumber: "11/222/33333" },
    employee: {
      id: "EMP-DOC-1",
      badgeId: "EMP-DOC-1",
      name: "Doc Test",
      taxId: "12345678901",
      insuranceNo: "65190855A123",
      taxClass: "1",
      address: "Testweg 1",
      birthDate: "1990-01-01",
      healthFund: "TK",
      bankIban: "DE89370400440532013000",
      bankName: "Testbank",
    },
    wageItems: [{ code: "1000", label: "Gehalt", amount: 2800, taxFlag: "L", svFlag: "L" }],
    bank: { iban: "DE89370400440532013000" },
  }, { tenantScope: companyId, autoRelease: true, notifyGaps: false });
  assert(r.ok && r.job?.status === "released", `seed ${period} (${r.job?.status || r.error || JSON.stringify(r.errors || "")})`);
}

await seed("2026-01");
await seed("2026-02");

const lstb = buildEmployeeLstbCertificate(companyId, "EMP-DOC-1", 2026);
assert(lstb.ok, `lstb cert ok (${lstb.error || ""})`);
const lstbDel = buildEmployeeDelivery("lstb", { certificate: lstb, company: { id: companyId, name: "Doc GmbH" } });
assert(lstbDel?.document?.rows?.length >= 27, `lstb rows ${lstbDel?.document?.rows?.length}`);
assert(Array.isArray(lstbDel?.document?.monthDetails) && lstbDel.document.monthDetails.length === 2, "lstb monthDetails");
assert(lstbDel.contentComplete === true, "lstb contentComplete");
assert(Boolean(lstbDel.documentChecksum), "lstb checksum");
assert(lstbDel.immutable === true, "lstb immutable");
assert(Boolean(lstbDel.seal?.seal), "lstb seal");
assert(Boolean(lstbDel.pdfBase64) && lstbDel.pdfBase64.startsWith("JVBER"), "lstb pdfBase64");
assert(lstbDel.pdfMimeType === "application/pdf", "lstb pdf mime");
assert(Boolean(lstbDel.document?.pdfBase64), "lstb document.pdfBase64");
assert(assessDocumentCompleteness(lstbDel).complete === true, "lstb assess complete");
assert(Boolean(lstbDel.document?.seller != null || lstbDel.document?.taxNumber != null), "lstb employer block");

const { ensureCompleteDeliveryDocument, verifyDeliverySeal } = await import("../server/document-complete.mjs");
const again = ensureCompleteDeliveryDocument(lstbDel);
assert(again.delivery.pdfBase64 === lstbDel.pdfBase64, "lstb ensure again keeps same PDF");
assert(again.delivery.documentChecksum === lstbDel.documentChecksum, "lstb ensure again keeps checksum");
assert(verifyDeliverySeal(again.delivery).ok === true, "lstb seal verifies");

const vb = buildEmployeeVerdienstCertificate(companyId, "EMP-DOC-1", 2026, "2026-02");
assert(vb.ok, `vb cert ok (${vb.error || ""})`);
const vbDel = buildEmployeeDelivery("verdienst", { certificate: vb, company: { id: companyId, name: "Doc GmbH" } });
assert(vbDel?.document?.rows?.length > 0, "vb rows");
assert(vbDel?.document?.monthly && vbDel?.document?.ytd, "vb monthly+ytd");
assert(vbDel.contentComplete === true, "vb contentComplete");
assert(Boolean(vbDel.documentChecksum), "vb checksum");
assert(vbDel.immutable === true && Boolean(vbDel.seal?.seal), "vb sealed");
assert(Boolean(vbDel.pdfBase64) && vbDel.pdfBase64.startsWith("JVBER"), "vb pdfBase64");

const truncated = {
  ...lstbDel,
  document: { kind: "portal.certificate.lstb.v1", year: 2026 },
  pdfBase64: undefined,
  seal: undefined,
  immutable: false,
};
assert(assessDocumentCompleteness(truncated).complete === false, "truncated lstb rejected");
assert(assessDocumentCompleteness(truncated).gaps.includes("pdfBase64") || assessDocumentCompleteness(truncated).gaps.length > 0, "truncated has gaps");

const noPdf = {
  ...lstbDel,
  pdfBase64: "",
  document: { ...lstbDel.document, pdfBase64: "" },
  seal: undefined,
  immutable: false,
};
assert(assessDocumentCompleteness(noPdf).gaps.includes("pdfBase64"), "missing pdfBase64 flagged");

const tampered = {
  ...lstbDel,
  document: { ...lstbDel.document, employeeName: "GEÄNDERT" },
};
assert(verifyDeliverySeal(tampered).ok === false, "tampered document fails seal");
assert(ensureCompleteDeliveryDocument(tampered).assessment.tampered === true, "ensure blocks tampered");
assert(assessDocumentCompleteness(tampered).complete === false, "tampered not complete");

const pdfTampered = { ...lstbDel, pdfBase64: `${lstbDel.pdfBase64}XX` };
assert(verifyDeliverySeal(pdfTampered).ok === false, "tampered PDF fails seal");

closeSqlite();
try {
  if (existsSync(testDb)) unlinkSync(testDb);
  if (existsSync(`${testDb}-wal`)) unlinkSync(`${testDb}-wal`);
  if (existsSync(`${testDb}-shm`)) unlinkSync(`${testDb}-shm`);
} catch { /* ignore */ }

console.log(`\n=== Doc-complete Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed ? 1 : 0);
