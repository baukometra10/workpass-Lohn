import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.invoiceArchiveSearch", L(
    "Kunde oder Nr. RE- suchen",
    "Search customer or Nr. RE-",
    "Müşteri veya Nr. RE- ara",
    "ابحث عن العميل أو Nr. RE-",
    "Rechercher client ou Nr. RE-",
    "Buscar cliente o Nr. RE-",
    "Cerca cliente o Nr. RE-",
    "Szukaj klienta lub Nr. RE-"
  )],
  ["hub.invoiceArchiveSearchPh", L(
    "Kunde oder Nr. RE-…",
    "Customer or Nr. RE-…",
    "Müşteri veya Nr. RE-…",
    "العميل أو Nr. RE-…",
    "Client ou Nr. RE-…",
    "Cliente o Nr. RE-…",
    "Cliente o Nr. RE-…",
    "Klient lub Nr. RE-…"
  )],
  ["hub.invoiceArchiveCustomer", L(
    "Kunde",
    "Customer",
    "Müşteri",
    "العميل",
    "Client",
    "Cliente",
    "Cliente",
    "Klient"
  )],
  ["hub.invoiceArchiveNoMatch", L(
    "Keine Rechnung zu diesem Kunden oder dieser Nr. RE- gefunden.",
    "No invoice found for this customer or Nr. RE-.",
    "Bu müşteri veya Nr. RE- için fatura yok.",
    "لا فاتورة لهذا العميل أو لهذا Nr. RE-.",
    "Aucune facture pour ce client ou ce Nr. RE-.",
    "No hay factura para este cliente o Nr. RE-.",
    "Nessuna fattura per questo cliente o Nr. RE-.",
    "Brak faktury dla tego klienta lub Nr. RE-."
  )],
  ["hub.invoiceArchiveHint", L(
    "Jede Rechnung hat eine Nr. RE-…. Tippen Sie den Kundennamen, um die passende Rechnung zu finden (Nummernkreis bleibt unverändert).",
    "Every invoice has a Nr. RE-…. Type the customer name to find the matching invoice (number sequence unchanged).",
    "Her faturanın Nr. RE-… numarası vardır. Müşteri adını yazın (numara sırası değişmez).",
    "لكل فاتورة Nr. RE-…. اكتب اسم العميل للعثور على الفاتورة (تسلسل الأرقام دون تغيير).",
    "Chaque facture a un Nr. RE-…. Saisissez le client (séquence de numéros inchangée).",
    "Cada factura tiene un Nr. RE-…. Escriba el cliente (secuencia de números sin cambiar).",
    "Ogni fattura ha un Nr. RE-…. Digiti il cliente (sequenza numeri invariata).",
    "Każda faktura ma Nr. RE-…. Wpisz klienta (kolejność numerów bez zmian)."
  )],
];

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);
const toAdd = extra.filter(([k]) => !existing.has(k));
// hub.invoiceArchiveHint already exists as tuple — update locales via replace if present in object form only;
// for tuple form we still add new keys; hint update handled separately below.
const onlyNew = toAdd.filter(([k]) => k !== "hub.invoiceArchiveHint");
if (!onlyNew.length && !existing.has("hub.invoiceArchiveSearch")) {
  console.log("unexpected: search keys missing but nothing to add");
}

if (onlyNew.length) {
  const block = onlyNew.map(([key, loc]) => {
    const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
    const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
    return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
  }).join(",\n");
  s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
}

// Refresh existing hint copy (tuple or object) carefully — German source of truth.
const hint = extra.find(([k]) => k === "hub.invoiceArchiveHint")[1];
const hintTuple = `["hub.invoiceArchiveHint",${JSON.stringify({
  de: hint.de, en: hint.en, tr: hint.tr, ar: hint.ar, fr: hint.fr, es: hint.es, it: hint.it, pl: hint.pl,
})}]`;
if (s.includes('["hub.invoiceArchiveHint"')) {
  s = s.replace(/\["hub\.invoiceArchiveHint",\{[^]*?\}\]/, hintTuple);
} else if (s.includes('key: "hub.invoiceArchiveHint"')) {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(hint[lang])}`).join(",\n");
  s = s.replace(
    /\{\s*key:\s*"hub\.invoiceArchiveHint",\s*locales:\s*\{[^]*?\}\s*\}/,
    `{\n    key: "hub.invoiceArchiveHint",\n    locales: {\n${inner}\n    }\n  }`
  );
} else if (!existing.has("hub.invoiceArchiveHint")) {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(hint[lang])}`).join(",\n");
  s = s.replace(/\];\s*$/, `,\n  {\n    key: "hub.invoiceArchiveHint",\n    locales: {\n${inner}\n    }\n  }\n];\n`);
}

fs.writeFileSync(path, s);
console.log("added", onlyNew.map(([k]) => k).join(", ") || "(none new)", "+ refreshed hub.invoiceArchiveHint");
