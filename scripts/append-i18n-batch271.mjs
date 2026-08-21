import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["preview.hubShowcase", L("Übersicht · WorkPass", "Overview · WorkPass", "Genel bakış · WorkPass", "نظرة عامة · WorkPass", "Aperçu · WorkPass", "Resumen · WorkPass", "Panoramica · WorkPass", "Przegląd · WorkPass")],
  ["hub.showcaseKicker", L("WorkPass Steuerprogramm", "WorkPass Tax Suite", "WorkPass Steuerprogramm", "WorkPass Steuerprogramm", "WorkPass Steuerprogramm", "WorkPass Steuerprogramm", "WorkPass Steuerprogramm", "WorkPass Steuerprogramm")],
  ["hub.showcaseTitle", L(
    "Klar. Vertrauenswürdig. Für Ihre Firma.",
    "Clear. Trustworthy. For your firm.",
    "Net. Güvenilir. Firmanız için.",
    "واضح. موثوق. لشركتك.",
    "Clair. Digne de confiance. Pour votre entreprise.",
    "Claro. Confiable. Para su empresa.",
    "Chiaro. Affidabile. Per la vostra azienda.",
    "Przejrzyście. Wiarygodnie. Dla Waszej firmy."
  )],
  ["hub.showcaseLead", L(
    "Rechnung, Stammdaten und Lohn – ein ruhiger Arbeitsplatz ohne Demo-Ballast.",
    "Invoices, master data and payroll – a calm workspace without demo clutter.",
    "Fatura, cari bilgiler ve bordro – demo yükü olmadan sakin bir çalışma alanı.",
    "فاتورة وبيانات أساسية وأجور — مساحة عمل هادئة بلا بيانات تجريبية.",
    "Factures, données et paie – un espace calme, sans démos.",
    "Facturas, datos y nómina – un espacio calmado, sin demos.",
    "Fatture, anagrafica e paghe – uno spazio calmo, senza demo.",
    "Faktury, dane i płace – spokojne miejsce pracy bez demo."
  )],
  ["hub.showcaseInvoice", L("Ausgangsrechnungen nach § 14 UStG", "Outgoing invoices under § 14 UStG", "§ 14 UStG’ye göre giden faturalar", "فواتير صادرة وفق § 14 UStG", "Factures sortantes selon § 14 UStG", "Facturas emitidas según § 14 UStG", "Fatture in uscita secondo § 14 UStG", "Faktury wychodzące wg § 14 UStG")],
  ["hub.showcaseCompany", L("Profil, Logo, Bank und Briefkopf", "Profile, logo, bank and letterhead", "Profil, logo, banka ve antet", "الملف والشعار والبنك والترويسة", "Profil, logo, banque et en-tête", "Perfil, logo, banco y membrete", "Profilo, logo, banca e intestazione", "Profil, logo, bank i nagłówek")],
  ["hub.showcaseLohn", L("Monatsabrechnung im Lohn-Portal", "Monthly payroll in the payroll portal", "Aylık bordro bordro portalında", "كشف شهري في بوابة الأجور", "Bulletin mensuel dans le portail paie", "Nómina mensual en el portal", "Cedolino mensile nel portale paghe", "Lista miesięczna w portalu płac")],
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
