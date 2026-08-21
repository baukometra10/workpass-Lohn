import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["preview.invoiceLive", L(
    "Live-Vorschau · A4 · Rechnung",
    "Live preview · A4 · Invoice",
    "Canlı önizleme · A4 · Fatura",
    "معاينة مباشرة · A4 · فاتورة",
    "Aperçu live · A4 · Facture",
    "Vista previa · A4 · Factura",
    "Anteprima · A4 · Fattura",
    "Podgląd na żywo · A4 · Faktura"
  )],
  ["preview.payrollLive", L(
    "Live-Vorschau · A4 · Entgeltabrechnung",
    "Live preview · A4 · Payslip",
    "Canlı önizleme · A4 · Bordro",
    "معاينة مباشرة · A4 · كشف الراتب",
    "Aperçu live · A4 · Bulletin",
    "Vista previa · A4 · Nómina",
    "Anteprima · A4 · Cedolino",
    "Podgląd na żywo · A4 · Lista"
  )],
];

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);
const toAdd = extra.filter(([k]) => !existing.has(k));
if (!toAdd.length) {
  console.log("nothing to add");
  process.exit(0);
}
const block = toAdd.map(([key, loc]) => {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
  return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
}).join(",\n");
s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
fs.writeFileSync(path, s);
console.log("added", toAdd.map(([k]) => k).join(", "));
