import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["nav.documentSub", L("erstellen & senden", "create & send", "oluştur & gönder", "إنشاء وإرسال", "créer & envoyer", "crear y enviar", "crea e invia", "utwórz i wyślij")],
  ["nav.companySub", L("Stammdaten & Briefkopf", "master data & letterhead", "cari bilgiler & antet", "بيانات أساسية وترويسة", "données & en-tête", "datos y membrete", "anagrafica e intestazione", "dane i nagłówek")],
  ["doc.moduleSub", L(
    "Ausgangsrechnung nach § 14 UStG – klar für den Empfänger, bereit zum Drucken.",
    "Outgoing invoice under § 14 UStG – clear for the recipient, ready to print.",
    "§ 14 UStG’ye göre giden fatura – alıcı için net, baskıya hazır.",
    "فاتورة صادرة وفق § 14 UStG — واضحة للمستلم وجاهزة للطباعة.",
    "Facture sortante selon § 14 UStG – claire pour le destinataire, prête à imprimer.",
    "Factura emitida según § 14 UStG – clara para el destinatario, lista para imprimir.",
    "Fattura in uscita secondo § 14 UStG – chiara per il destinatario, pronta per la stampa.",
    "Faktura wychodząca wg § 14 UStG – jasna dla odbiorcy, gotowa do druku."
  )],
  ["co.moduleSub", L(
    "Stammdaten, Briefkopf und Bank – einmal pflegen, überall korrekt auf dem Beleg.",
    "Master data, letterhead and bank – maintain once, correct on every document.",
    "Cari bilgiler, antet ve banka – bir kez girin, belgede her yerde doğru.",
    "البيانات الأساسية والترويسة والبنك — أدخِلها مرة وتظهر صحيحة على كل مستند.",
    "Données, en-tête et banque – saisis une fois, corrects sur chaque document.",
    "Datos, membrete y banco – una vez, correctos en cada documento.",
    "Anagrafica, intestazione e banca – una volta, corretti su ogni documento.",
    "Dane, nagłówek i bank – raz uzupełnij, poprawnie na każdym dokumencie."
  )],
  ["doc.purpose", L(
    "Beschreibung / Zweck der Rechnung",
    "Description / purpose of the invoice",
    "Fatura açıklaması / amacı",
    "وصف / غرض الفاتورة",
    "Description / objet de la facture",
    "Descripción / motivo de la factura",
    "Descrizione / scopo della fattura",
    "Opis / cel faktury"
  )],
  ["doc.purposeHint", L(
    "Für den Empfänger: warum diese Rechnung gestellt wird – Anlass, Auftrag, Projekt oder Kurzbeschreibung.",
    "For the recipient: why this invoice is issued – reason, order, project or short description.",
    "Alıcı için: bu faturanın neden kesildiği – sebep, sipariş, proje veya kısa açıklama.",
    "للمستلم: لماذا تُصدر هذه الفاتورة — السبب أو الطلب أو المشروع أو وصف مختصر.",
    "Pour le destinataire : pourquoi cette facture – motif, commande, projet ou courte description.",
    "Para el destinatario: por qué se emite – motivo, pedido, proyecto o descripción breve.",
    "Per il destinatario: perché si emette – motivo, ordine, progetto o breve descrizione.",
    "Dla odbiorcy: dlaczego wystawiono – powód, zlecenie, projekt lub krótki opis."
  )],
  ["doc.purposeTitle", L("Beschreibung", "Description", "Açıklama", "الوصف", "Description", "Descripción", "Descrizione", "Opis")],
  ["doc.purposePh", L(
    "z. B. Beratung März 2026 · Auftrag 4821 · Projekt Website-Relaunch",
    "e.g. Consulting March 2026 · Order 4821 · Website relaunch project",
    "örn. Danışmanlık Mart 2026 · Sipariş 4821 · Web sitesi yenileme",
    "مثال: استشارة مارس 2026 · طلب 4821 · مشروع إعادة إطلاق الموقع",
    "ex. Conseil mars 2026 · Commande 4821 · Refonte du site",
    "p. ej. Consultoría marzo 2026 · Pedido 4821 · Relanzamiento web",
    "es. Consulenza marzo 2026 · Ordine 4821 · Rilancio sito",
    "np. Doradztwo marzec 2026 · Zlecenie 4821 · Relaunch strony"
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
