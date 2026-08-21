import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["doc.surchargeLabel", L("Zusatzbetrag / Zuschlag (Bezeichnung)", "Surcharge / extra (label)", "Ek ücret / ek tutar (ad)", "مبلغ إضافي / رسم (التسمية)", "Montant additionnel (libellé)", "Importe adicional (etiqueta)", "Importo aggiuntivo (etichetta)", "Kwota dodatkowa (nazwa)")],
  ["doc.surchargeLabelPh", L("z. B. Expresszuschlag, Versand, Bearbeitung", "e.g. express fee, shipping, handling", "örn. ekspres, kargo, işlem", "مثال: رسوم مستعجلة، شحن، معالجة", "ex. express, envoi, traitement", "p. ej. urgente, envío, gestión", "es. espresso, spedizione, gestione", "np. ekspres, wysyłka, obsługa")],
  ["doc.surchargeAmount", L("Zusatzbetrag (EUR, netto)", "Surcharge (EUR, net)", "Ek tutar (EUR, net)", "المبلغ الإضافي (يورو، صافي)", "Montant additionnel (EUR, net)", "Importe adicional (EUR, neto)", "Importo aggiuntivo (EUR, netto)", "Kwota dodatkowa (EUR, netto)")],
  ["doc.invoiceWarning", L("Warnung / Hinweis auf der Rechnung", "Warning / notice on the invoice", "Uyarı / faturadaki not", "تحذير / ملاحظة على الفاتورة", "Avertissement / mention sur la facture", "Aviso / nota en la factura", "Avviso / nota sulla fattura", "Ostrzeżenie / uwaga na fakturze")],
  ["doc.invoiceWarningPh", L("z. B. Zahlungsverzug: 5 % Verzugszinsen · Mahnung folgt", "e.g. late payment: 5% interest · reminder follows", "örn. gecikme: %5 faiz · hatırlatma gelir", "مثال: تأخير الدفع: فائدة 5٪ · يتبع إنذار", "ex. retard: 5 % d’intérêts · rappel à suivre", "p. ej. retraso: 5 % intereses · aviso sigue", "es. ritardo: 5 % interessi · sollecito", "np. opóźnienie: 5 % odsetek · wezwanie")],
  ["doc.invoiceWarningHint", L("Erscheint deutlich auf dem Beleg – leer lassen = kein Warnhinweis.", "Shown clearly on the document – leave empty for no warning.", "Belgede belirgin görünür – boş = uyarı yok.", "تظهر بوضوح على المستند — اتركها فارغة بلا تحذير.", "Apparait clairement – laisser vide = pas d’avertissement.", "Aparece claramente – vacío = sin aviso.", "Compare chiaramente – vuoto = nessun avviso.", "Wyraźnie na dokumencie – puste = bez ostrzeżenia.")],
  ["doc.invoiceWarningTitle", L("Wichtig", "Important", "Önemli", "مهم", "Important", "Importante", "Importante", "Ważne")],
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
