/**
 * Tests für WorkPassSignature
 * node tests/signature-tests.mjs
 */
import { readFileSync, existsSync } from "fs";
import vm from "vm";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
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

const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
const path = `${root}/signature-engine.js`.replace(/\//g, "\\");
vm.runInContext(readFileSync(existsSync(path) ? path : `${root}/signature-engine.js`, "utf8"), sandbox);

const S = sandbox.window.WorkPassSignature;
console.log("\n=== Signatur-Engine ===");
assert(S != null, "WorkPassSignature geladen");
assert(S.STYLES.length >= 6, "≥6 Stile");
assert(S.COLORS.length >= 5, "≥5 Farben");
assert(S.MODES.map((m) => m.id).join(",") === "auto,styled,draw,none", "4 Modi");

assert(S.isPlatformName("WorkPass Lohn") === true, "Plattformname erkannt");
assert(S.isPlatformName("Suppix AI") === true, "Suppix erkannt");
assert(S.isPlatformName("Müller GmbH") === false, "Firmenname ok");

const company = S.resolveCompanyName({
  companyProfileName: "WorkPass",
  seller: "Adler Bau GmbH\nStraße 1",
});
assert(company === "Adler Bau GmbH", `Firma aus Absender (${company})`);

const company2 = S.resolveCompanyName({
  companyProfileName: "Nordwind AG",
  seller: "WorkPass\nx",
});
assert(company2 === "Nordwind AG", "Profilname vor Plattform-Absender");

const none = S.resolveSignaturePlan({ mode: "none" });
assert(none.showBlock === false && none.dataUrl === "", "Modus ohne Signatur");

const auto = S.resolveSignaturePlan({
  mode: "auto",
  seller: "Beta Soft GmbH\nBerlin",
  styleId: "elegant",
  colorId: "royal",
});
assert(auto.displayName === "Beta Soft GmbH", "Auto-Firmenname");
assert(auto.needsRender === true, "Auto braucht Render");
assert(auto.styleId === "elegant", "Stil übernommen");

const styled = S.resolveSignaturePlan({
  mode: "styled",
  signatureName: "Alex",
});
assert(styled.displayName === "Alex" && styled.showBlock === true, "Namens-Stil");

const svg = S.previewSvgMarkup("Jon", "formal", "navy");
assert(svg.includes("Jon") && svg.includes("<svg"), "SVG-Vorschau");

const lay = S.normalizeLayout({ xPct: 200, wPct: 5, showCaption: false, captionCustom: true, captionText: "" });
assert(lay.xPct <= 92 && lay.wPct >= 12, "Layout wird begrenzt");
assert(S.resolveCaption(lay, "Alex") === "", "Caption ausblendbar");
assert(S.resolveCaption({ showCaption: true, captionCustom: true, captionText: "GF" }, "Alex") === "GF", "Caption editierbar");
assert(S.resolveCaption({ showCaption: true, captionCustom: false }, "Firma GmbH") === "Firma GmbH", "Caption Auto");

console.log("\n=== Technisches Siegel ===");
const att = await S.buildAttestation({
  mode: "auto",
  styleId: "formal",
  colorId: "navy",
  displayName: "Adler Bau GmbH",
  signatureDataUrl: "data:image/png;base64,aaa",
  seller: "Adler Bau GmbH\nBerlin",
  document: {
    type: "invoice",
    number: "RE-1",
    date: "2026-07-28",
    seller: "Adler Bau GmbH",
    customer: "Kunde",
    total: "100.00",
    items: [{ description: "A", quantity: 1, price: 100, total: 100 }],
    note: "",
  },
});
assert(att.kind === "workpass.signature.attestation.v1", "Attestation Kind");
assert(Boolean(att.proof) && att.documentFingerprint && att.imageFingerprint, "Fingerprints vorhanden");
assert(att.companyName === "Adler Bau GmbH", "Firmenname im Siegel");
const ok = await S.verifyAttestation(att, {
  document: {
    type: "invoice",
    number: "RE-1",
    date: "2026-07-28",
    seller: "Adler Bau GmbH",
    customer: "Kunde",
    total: "100.00",
    items: [{ description: "A", quantity: 1, price: 100, total: 100 }],
    note: "",
  },
  signatureDataUrl: "data:image/png;base64,aaa",
});
assert(ok.ok === true, "Siegel gültig");
const broken = await S.verifyAttestation(att, {
  document: {
    type: "invoice",
    number: "RE-1",
    date: "2026-07-28",
    seller: "Adler Bau GmbH",
    customer: "Kunde",
    total: "999.00",
    items: [{ description: "A", quantity: 1, price: 100, total: 100 }],
    note: "",
  },
  signatureDataUrl: "data:image/png;base64,aaa",
});
assert(broken.ok === false && broken.reason === "document_changed", "Dokumentänderung erkannt");

const dataUrl = await S.renderSignatureDataUrl("Alex", { styleId: "classic", colorId: "ink", width: 400, height: 120 });
assert(String(dataUrl).startsWith("data:image/"), `Render Data-URL (${String(dataUrl).slice(0, 30)}…)`);

console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
