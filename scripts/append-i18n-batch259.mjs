import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["hub.companyIntro", L(
    "Rechts: Firmenbriefkopf für Rechnung und PDF. Die Lohnsteuerbescheinigung (LStB) gilt für den Mitarbeiter und liegt im <a href=\"lohn.html\">Lohn-Portal</a> — nicht auf dieser Seite.",
    "Right: company letterhead for invoices and PDF. The wage tax certificate (LStB) is for the employee and lives in the <a href=\"lohn.html\">payroll portal</a> — not on this page.",
    "Sağda: fatura/PDF için firma anteti. LStB çalışan belgesidir ve <a href=\"lohn.html\">bordro portalındadır</a> — bu sayfada değil.",
    "يمينًا: ترويسة الشركة للفاتورة و PDF. شهادة LStB للموظف وفي <a href=\"lohn.html\">بوابة الأجور</a> — ليست في هذه الصفحة.",
    "À droite : en-tête société pour facture et PDF. La LStB est pour le salarié, dans le <a href=\"lohn.html\">portail paie</a> — pas ici.",
    "A la derecha: membrete de empresa para factura y PDF. La LStB es del empleado y está en el <a href=\"lohn.html\">portal de nómina</a> — no en esta página.",
    "A destra: intestazione aziendale per fattura e PDF. La LStB è del dipendente e sta nel <a href=\"lohn.html\">portale paghe</a> — non in questa pagina.",
    "Po prawej: nagłówek firmy na fakturę i PDF. LStB jest dokumentem pracownika w <a href=\"lohn.html\">portalu płac</a> — nie na tej stronie."
  )],
  ["hub.sub.company", L(
    "Firmenprofil · Briefkopf, Steuer-Nr., IBAN — nicht die LStB der Mitarbeiter",
    "Company profile · letterhead, tax no., IBAN — not the employee LStB",
    "Firma profili · antet, vergi no., IBAN — çalışan LStB’si değil",
    "ملف الشركة · الترويسة، الرقم الضريبي، IBAN — ليست LStB الموظف",
    "Profil société · en-tête, n° fiscal, IBAN — pas la LStB du salarié",
    "Perfil de empresa · membrete, n.º fiscal, IBAN — no la LStB del empleado",
    "Profilo azienda · intestazione, n. fiscale, IBAN — non la LStB del dipendente",
    "Profil firmy · nagłówek, nr podatkowy, IBAN — nie LStB pracownika"
  )],
  ["preview.companyLetterhead", L(
    "Vorschau · Firmenbriefkopf (nicht Mitarbeiter-LStB)",
    "Preview · company letterhead (not employee LStB)",
    "Önizleme · firma anteti (çalışan LStB değil)",
    "معاينة · ترويسة الشركة (ليست LStB الموظف)",
    "Aperçu · en-tête société (pas la LStB salarié)",
    "Vista previa · membrete de empresa (no LStB del empleado)",
    "Anteprima · intestazione aziendale (non LStB dipendente)",
    "Podgląd · nagłówek firmy (nie LStB pracownika)"
  )],
  ["preview.lstbEmployee", L(
    "Vorschau · LStB für den Arbeitnehmer (nicht Firmen-LStA)",
    "Preview · LStB for the employee (not company LStA)",
    "Önizleme · çalışan LStB (firma LStA değil)",
    "معاينة · LStB للموظف (ليست LStA الشركة)",
    "Aperçu · LStB du salarié (pas la LStA entreprise)",
    "Vista previa · LStB del empleado (no LStA de la empresa)",
    "Anteprima · LStB del dipendente (non LStA aziendale)",
    "Podgląd · LStB pracownika (nie LStA firmy)"
  )],
  ["preview.printBw", L(
    "Vorschau · Drucklayout Schwarz/Weiß",
    "Preview · black/white print layout",
    "Önizleme · siyah/beyaz baskı",
    "معاينة · تخطيط طباعة أبيض وأسود",
    "Aperçu · mise en page N/B",
    "Vista previa · diseño de impresión B/N",
    "Anteprima · layout stampa B/N",
    "Podgląd · układ druku czarno-biały"
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
for (const [k, o] of extra) {
  if (!existing.has(k)) continue;
  const re = new RegExp(`(\\[\\s*${JSON.stringify(k)}\\s*,\\s*)(\\{[\\s\\S]*?\\})(\\s*\\])`);
  if (re.test(s)) s = s.replace(re, `$1${JSON.stringify(o)}$3`);
}
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
}
fs.writeFileSync(path, s);
console.log("added", filtered.length, "updated", extra.length - filtered.length);
