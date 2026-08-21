import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["preview.companyProfile", L(
    "Vorschau · Firmenprofil & Erscheinungsbild",
    "Preview · company profile & appearance",
    "Önizleme · firma profili & görünüm",
    "معاينة · ملف الشركة والمظهر",
    "Aperçu · profil société & apparence",
    "Vista previa · perfil e imagen de empresa",
    "Anteprima · profilo e aspetto aziendale",
    "Podgląd · profil firmy i wygląd"
  )],
  ["hub.companyIntro", L(
    "Rechts sehen Sie Ihr Firmenprofil und das Erscheinungsbild (Logo, Anschrift, Bank) — keine Rechnung. Die Lohnsteuerbescheinigung (LStB) liegt im <a href=\"lohn.html\">Lohn-Portal</a>.",
    "On the right: your company profile and appearance (logo, address, bank) — not an invoice. The LStB lives in the <a href=\"lohn.html\">payroll portal</a>.",
    "Sağda: firma profili ve görünüm (logo, adres, banka) — fatura değil. LStB <a href=\"lohn.html\">bordro portalındadır</a>.",
    "يمينًا: ملف شركتك والمظهر (الشعار، العنوان، البنك) — وليست فاتورة. شهادة LStB في <a href=\"lohn.html\">بوابة الأجور</a>.",
    "À droite : profil et apparence (logo, adresse, banque) — pas une facture. La LStB est dans le <a href=\"lohn.html\">portail paie</a>.",
    "A la derecha: perfil e imagen (logo, dirección, banco) — no una factura. La LStB está en el <a href=\"lohn.html\">portal de nómina</a>.",
    "A destra: profilo e aspetto (logo, indirizzo, banca) — non una fattura. La LStB è nel <a href=\"lohn.html\">portale paghe</a>.",
    "Po prawej: profil i wygląd (logo, adres, bank) — to nie faktura. LStB jest w <a href=\"lohn.html\">portalu płac</a>."
  )],
  ["co.previewKicker", L("Firmenprofil", "Company profile", "Firma profili", "ملف الشركة", "Profil société", "Perfil de empresa", "Profilo aziendale", "Profil firmy")],
  ["co.previewAddress", L("Anschrift", "Address", "Adres", "العنوان", "Adresse", "Dirección", "Indirizzo", "Adres")],
  ["co.previewBank", L("Bankverbindung", "Bank details", "Banka bilgileri", "بيانات البنك", "Coordonnées bancaires", "Datos bancarios", "Coordinate bancarie", "Dane bankowe")],
  ["co.previewLook", L("Erscheinungsbild", "Appearance", "Görünüm", "المظهر", "Apparence", "Apariencia", "Aspetto", "Wygląd")],
  ["co.previewLookHint", L(
    "So wirken Logo, Kopf- und Fußzeile auf Ihren Belegen — ohne Rechnungsinhalt.",
    "How logo, header and footer look on your documents — without invoice content.",
    "Logo, üst ve alt bilginin belgelerde görünümü — fatura içeriği olmadan.",
    "كيف يظهر الشعار والترويسة والتذييل على مستنداتك — دون محتوى فاتورة.",
    "Rendu du logo, en-tête et pied — sans contenu de facture.",
    "Así se ven logo, membrete y pie — sin contenido de factura.",
    "Come compaiono logo, intestazione e piè — senza contenuto fattura.",
    "Jak wyglądają logo, nagłówek i stopka — bez treści faktury."
  )],
  ["co.previewLookBody", L(
    "Hier erscheint später der Beleginhalt.",
    "Document content appears here later.",
    "Belge içeriği burada görünür.",
    "محتوى المستند يظهر هنا لاحقاً.",
    "Le contenu du document apparaît ici.",
    "Aquí aparece el contenido del documento.",
    "Qui compare il contenuto del documento.",
    "Tutaj pojawi się treść dokumentu."
  )],
  ["co.previewFallbackName", L("Ihre Firma", "Your company", "Firmanız", "شركتك", "Votre société", "Su empresa", "La vostra azienda", "Wasza firma")],
];

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);
const toAdd = extra.filter(([k]) => !existing.has(k));
// hub.companyIntro already exists as array tuple — update in place
const hubIdx = s.indexOf('["hub.companyIntro"');
if (hubIdx >= 0) {
  const end = s.indexOf("}],", hubIdx);
  if (end > hubIdx) {
    const loc = extra.find(([k]) => k === "hub.companyIntro")[1];
    const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
    const obj = langs.map((lang) => `"${lang}":${JSON.stringify(loc[lang])}`).join(",");
    s = `${s.slice(0, hubIdx)}["hub.companyIntro",{${obj}}${s.slice(end + 1)}`;
    console.log("Updated hub.companyIntro");
  }
}
const still = toAdd.filter(([k]) => k !== "hub.companyIntro");
if (still.length) {
  const block = still.map(([key, loc]) => {
    const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
    const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
    return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
  }).join(",\n");
  s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
  console.log(`Appended ${still.length} keys`);
}
fs.writeFileSync(path, s);
