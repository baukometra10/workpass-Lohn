import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["doc.dataHint", L(
    "Klare Felder für Nummer, Daten und Steuer – alles erscheint so auf der Rechnung.",
    "Clear fields for number, dates and tax – shown as-is on the invoice.",
    "Numara, tarihler ve vergi için net alanlar – faturada aynen görünür.",
    "حقول واضحة للرقم والتواريخ والضريبة — تظهر كما هي على الفاتورة.",
    "Champs clairs pour numéro, dates et taxe – tels quels sur la facture.",
    "Campos claros para número, fechas e impuesto – tal cual en la factura.",
    "Campi chiari per numero, date e imposta – così in fattura.",
    "Czytelne pola numeru, dat i podatku – tak na fakturze."
  )],
  ["doc.sellerInvoice", L("Absender (Ihre Firma)", "Sender (your company)", "Gönderen (firmanız)", "المرسل (شركتك)", "Expéditeur (votre société)", "Remitente (su empresa)", "Mittente (la vostra azienda)", "Nadawca (Wasza firma)")],
  ["doc.customerInvoice", L("Empfänger (Kunde)", "Recipient (customer)", "Alıcı (müşteri)", "المستلم (العميل)", "Destinataire (client)", "Destinatario (cliente)", "Destinatario (cliente)", "Odbiorca (klient)")],
  ["doc.sellerHint", L("Name und Anschrift – wie auf dem Briefkopf.", "Name and address – as on the letterhead.", "Ad ve adres – antetteki gibi.", "الاسم والعنوان — كما في الترويسة.", "Nom et adresse – comme en-tête.", "Nombre y dirección – como en el membrete.", "Nome e indirizzo – come in intestazione.", "Nazwa i adres – jak w nagłówku.")],
  ["doc.customerHint", L("Rechnungsempfänger vollständig eintragen.", "Enter the invoice recipient completely.", "Fatura alıcısını eksiksiz girin.", "أدخل مستلم الفاتورة بالكامل.", "Saisir le destinataire complet.", "Indique el destinatario completo.", "Inserire il destinatario completo.", "Podaj pełnego odbiorcę faktury.")],
  ["doc.itemsHint", L("Beschreibung, Menge und Preis – jede Zeile wird klar auf der Rechnung ausgewiesen.", "Description, quantity and price – each line is shown clearly on the invoice.", "Açıklama, miktar ve fiyat – her satır faturada net görünür.", "الوصف والكمية والسعر — كل سطر يظهر بوضوح على الفاتورة.", "Description, quantité et prix – chaque ligne est claire.", "Descripción, cantidad y precio – cada línea queda clara.", "Descrizione, quantità e prezzo – ogni riga è chiara.", "Opis, ilość i cena – każdy wiersz jest czytelny.")],
  ["doc.noteHint", L("Leer lassen = kein Hinweis auf der Rechnung. Text vollständig löschbar.", "Leave empty = no note on the invoice. Text fully removable.", "Boş bırakın = faturada not olmaz. Metin tamamen silinebilir.", "اتركه فارغاً = لا ملاحظة على الفاتورة. يمكن مسح النص بالكامل.", "Laisser vide = aucune note. Texte entièrement effaçable.", "Dejar vacío = sin nota. Texto totalmente borrable.", "Lasciare vuoto = nessuna nota. Testo completamente cancellabile.", "Puste = brak uwagi. Tekst w pełni usuwalny.")],
  ["doc.noteInsertDefault", L("Vorschlag einfügen", "Insert suggestion", "Öneri ekle", "إدراج اقتراح", "Insérer suggestion", "Insertar sugerencia", "Inserisci suggerimento", "Wstaw sugestię")],
  ["doc.bankTitle", L("Bankverbindung", "Bank details", "Banka bilgileri", "بيانات البنك", "Coordonnées bancaires", "Datos bancarios", "Coordinate bancarie", "Dane bankowe")],
  ["doc.noteTitle", L("Hinweis", "Note", "Not", "ملاحظة", "Remarque", "Nota", "Nota", "Uwaga")],
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
