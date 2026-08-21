import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["doc.dataHint", L(
    "Nummer, Daten und Adressen erscheinen so auf der Rechnung.",
    "Number, dates and addresses appear as entered on the invoice.",
    "Numara, tarihler ve adresler faturada böyle görünür.",
    "الرقم والتواريخ والعناوين تظهر كما هي على الفاتورة.",
    "Le numéro, les dates et adresses apparaissent tels quels sur la facture.",
    "El número, las fechas y las direcciones aparecen así en la factura.",
    "Numero, date e indirizzi appaiono così in fattura.",
    "Numer, daty i adresy pojawiają się tak na fakturze."
  )],
  ["doc.noteHint", L(
    "Leer lassen = kein Hinweis auf der Rechnung. Text vollständig löschbar.",
    "Leave empty = no note on the invoice. Text fully removable.",
    "Boş bırakın = faturada not olmaz. Metin tamamen silinebilir.",
    "اتركه فارغاً = لا ملاحظة على الفاتورة. يمكن مسح النص بالكامل.",
    "Laisser vide = aucune note. Texte entièrement effaçable.",
    "Dejar vacío = sin nota. Texto totalmente borrable.",
    "Lasciare vuoto = nessuna nota. Testo completamente cancellabile.",
    "Puste = brak uwagi. Tekst w pełni usuwalny."
  )],
  ["doc.noteInsertDefault", L(
    "Vorschlag einfügen",
    "Insert suggestion",
    "Öneri ekle",
    "إدراج اقتراح",
    "Insérer suggestion",
    "Insertar sugerencia",
    "Inserisci suggerimento",
    "Wstaw sugestię"
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
console.log(`Appended ${toAdd.length} keys`);
