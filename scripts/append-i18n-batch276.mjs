import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["doc.findInvoice", L(
    "Rechnung finden",
    "Find invoice",
    "Fatura bul",
    "البحث عن فاتورة",
    "Trouver une facture",
    "Buscar factura",
    "Trova fattura",
    "Znajdź fakturę"
  )],
  ["doc.findInvoiceHint", L(
    "Nach Nr. RE- oder Kundenname suchen (auch in der Übersicht → Rechnungsarchiv).",
    "Search by Nr. RE- or customer (also Overview → Invoice archive).",
    "Nr. RE- veya müşteri adı (ayrıca Genel bakış → Fatura arşivi).",
    "ابحث بـ Nr. RE- أو اسم العميل (أيضاً النظرة العامة → أرشيف الفواتير).",
    "Recherchez par Nr. RE- ou client (aussi Aperçu → Archives).",
    "Busque por Nr. RE- o cliente (también Resumen → Archivo).",
    "Cerca per Nr. RE- o cliente (anche Panoramica → Archivio).",
    "Szukaj po Nr. RE- lub kliencie (także Przegląd → Archiwum)."
  )],
  ["doc.findInvoicePh", L(
    "Nr. RE-… oder Kundenname",
    "Nr. RE-… or customer name",
    "Nr. RE-… veya müşteri adı",
    "Nr. RE-… أو اسم العميل",
    "Nr. RE-… ou nom du client",
    "Nr. RE-… o nombre del cliente",
    "Nr. RE-… o nome cliente",
    "Nr. RE-… lub nazwa klienta"
  )],
  ["doc.findInvoiceNoDraft", L(
    "Diese Rechnung ist ohne lokalen Entwurf – bitte in der Übersicht → Rechnungsarchiv öffnen.",
    "This invoice has no local draft – open it in Overview → Invoice archive.",
    "Bu faturanın yerel taslağı yok – Genel bakış → Fatura arşivi.",
    "هذه الفاتورة بلا مسودة محلية – افتحها من النظرة العامة → أرشيف الفواتير.",
    "Pas de brouillon local – ouvrez-la dans Aperçu → Archives.",
    "Sin borrador local – ábrala en Resumen → Archivo.",
    "Senza bozza locale – aprila in Panoramica → Archivio.",
    "Brak lokalnego szkicu – otwórz w Przegląd → Archiwum."
  )],
  ["doc.numberAutoHint", L(
    "Automatisch vergeben · eindeutig · wird nicht wiederholt",
    "Assigned automatically · unique · never reused",
    "Otomatik · benzersiz · tekrar edilmez",
    "تُمنح تلقائياً · فريدة · لا تُعاد",
    "Attribué automatiquement · unique · jamais réutilisé",
    "Asignado automáticamente · único · no se reutiliza",
    "Assegnato automaticamente · unico · non riutilizzato",
    "Nadawany automatycznie · unikalny · bez powtórzeń"
  )],
  ["co.phone", L(
    "Telefon (Firma)",
    "Phone (company)",
    "Telefon (firma)",
    "هاتف (الشركة)",
    "Téléphone (entreprise)",
    "Teléfono (empresa)",
    "Telefono (azienda)",
    "Telefon (firma)"
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
