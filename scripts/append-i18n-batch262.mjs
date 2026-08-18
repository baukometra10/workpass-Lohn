import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["jump.monat", L("Monat", "Month", "Ay", "الشهر", "Mois", "Mes", "Mese", "Miesiąc")],
  ["jump.dateien", L("Dateien", "Files", "Dosyalar", "الملفات", "Fichiers", "Archivos", "File", "Pliki")],
  ["portal.filesHint", L(
    "SEPA, DATEV, LODAS und GoBD — nach Ihrer Bestätigung. Nicht die LStA/LStB.",
    "SEPA, DATEV, LODAS and GoBD — after you confirm. Not LStA/LStB.",
    "SEPA, DATEV, LODAS ve GoBD — onayınızdan sonra. LStA/LStB değil.",
    "SEPA و DATEV و LODAS و GoBD — بعد تأكيدك. ليست LStA/LStB.",
    "SEPA, DATEV, LODAS et GoBD — après confirmation. Pas LStA/LStB.",
    "SEPA, DATEV, LODAS y GoBD — tras confirmar. No LStA/LStB.",
    "SEPA, DATEV, LODAS e GoBD — dopo conferma. Non LStA/LStB.",
    "SEPA, DATEV, LODAS i GoBD — po potwierdzeniu. To nie LStA/LStB."
  )],
  ["hub.lohnPortalSub", L(
    "Monat · Steuer · Dateien",
    "Month · tax · files",
    "Ay · vergi · dosyalar",
    "شهر · ضريبة · ملفات",
    "Mois · impôt · fichiers",
    "Mes · impuesto · archivos",
    "Mese · tasse · file",
    "Miesiąc · podatek · pliki"
  )],
  ["hub.manageClient", L("Firma", "Company", "Firma", "الشركة", "Entreprise", "Empresa", "Azienda", "Firma")],
  ["hub.manageClientSub", L(
    "Briefkopf, Steuer-Nr., IBAN",
    "Letterhead, tax no., IBAN",
    "Antet, vergi no., IBAN",
    "الترويسة، الرقم الضريبي، IBAN",
    "En-tête, n° fiscal, IBAN",
    "Membrete, n.º fiscal, IBAN",
    "Intestazione, n. fiscale, IBAN",
    "Nagłówek, nr podatkowy, IBAN"
  )],
  ["help.step1", L(
    "<strong>Übersicht</strong> – Rechnung, Firma oder Lohn wählen",
    "<strong>Overview</strong> – choose invoice, company or payroll",
    "<strong>Özet</strong> – fatura, firma veya bordro",
    "<strong>نظرة عامة</strong> – فاتورة أو شركة أو أجور",
    "<strong>Aperçu</strong> – facture, entreprise ou paie",
    "<strong>Resumen</strong> – factura, empresa o nómina",
    "<strong>Panoramica</strong> – fattura, azienda o paghe",
    "<strong>Przegląd</strong> – faktura, firma lub płace"
  )],
  ["help.step2", L(
    "<strong>Firma</strong> – Briefkopf, Steuer-Nr., IBAN, Logo",
    "<strong>Company</strong> – letterhead, tax no., IBAN, logo",
    "<strong>Firma</strong> – antet, vergi no., IBAN, logo",
    "<strong>الشركة</strong> – الترويسة، الرقم الضريبي، IBAN، الشعار",
    "<strong>Entreprise</strong> – en-tête, n° fiscal, IBAN, logo",
    "<strong>Empresa</strong> – membrete, n.º fiscal, IBAN, logo",
    "<strong>Azienda</strong> – intestazione, n. fiscale, IBAN, logo",
    "<strong>Firma</strong> – nagłówek, nr podatkowy, IBAN, logo"
  )],
  ["help.step3", L(
    "<strong>Rechnung</strong> – Ausgangsrechnung nach § 14 UStG",
    "<strong>Invoice</strong> – outgoing invoice per § 14 UStG",
    "<strong>Fatura</strong> – çıkış faturası § 14 UStG",
    "<strong>فاتورة</strong> – فاتورة صادرة وفق § 14 UStG",
    "<strong>Facture</strong> – facture sortante selon § 14 UStG",
    "<strong>Factura</strong> – factura emitida según § 14 UStG",
    "<strong>Fattura</strong> – fattura in uscita secondo § 14 UStG",
    "<strong>Faktura</strong> – faktura wychodząca wg § 14 UStG"
  )],
  ["help.step4", L(
    "<strong>Lohn</strong> – Monat (Abrechnung), Steuer (LStA / LStB), Dateien",
    "<strong>Payroll</strong> – month (payslip), tax (LStA / LStB), files",
    "<strong>Bordro</strong> – ay, vergi (LStA / LStB), dosyalar",
    "<strong>الأجور</strong> – الشهر، الضريبة (LStA / LStB)، الملفات",
    "<strong>Paie</strong> – mois, impôt (LStA / LStB), fichiers",
    "<strong>Nómina</strong> – mes, impuesto (LStA / LStB), archivos",
    "<strong>Paghe</strong> – mese, tasse (LStA / LStB), file",
    "<strong>Płace</strong> – miesiąc, podatek (LStA / LStB), pliki"
  )],
  ["hub.banner", L(
    "<strong>Hub:</strong> Rechnung · Firma · Lohn (Monat, Steuer, Dateien) · <a href=\"lohn.html\">Zum Lohn-Portal</a>",
    "<strong>Hub:</strong> Invoice · company · payroll (month, tax, files) · <a href=\"lohn.html\">To payroll portal</a>",
    "<strong>Hub:</strong> Fatura · firma · bordro (ay, vergi, dosyalar) · <a href=\"lohn.html\">Bordro portalına</a>",
    "<strong>المركز:</strong> فاتورة · شركة · أجور (شهر، ضريبة، ملفات) · <a href=\"lohn.html\">إلى بوابة الأجور</a>",
    "<strong>Hub:</strong> Facture · entreprise · paie (mois, impôt, fichiers) · <a href=\"lohn.html\">Vers le portail paie</a>",
    "<strong>Hub:</strong> Factura · empresa · nómina (mes, impuesto, archivos) · <a href=\"lohn.html\">Al portal de nómina</a>",
    "<strong>Hub:</strong> Fattura · azienda · paghe (mese, tasse, file) · <a href=\"lohn.html\">Al portale paghe</a>",
    "<strong>Hub:</strong> Faktura · firma · płace (miesiąc, podatek, pliki) · <a href=\"lohn.html\">Do portalu płac</a>"
  )],
  ["hub.onboardingSub", L(
    "Rechnung · Firma · Lohn – Loslegen oder Lohn-Portal öffnen",
    "Invoice · company · payroll – get started or open the payroll portal",
    "Fatura · firma · bordro – başlayın veya bordro portalını açın",
    "فاتورة · شركة · أجور – ابدأ أو افتح بوابة الأجور",
    "Facture · entreprise · paie – démarrer ou ouvrir le portail paie",
    "Factura · empresa · nómina – empezar o abrir el portal",
    "Fattura · azienda · paghe – inizia o apri il portale paghe",
    "Faktura · firma · płace – zacznij lub otwórz portal płac"
  )],
  ["help.exportBackup", L(
    "<strong>Datensicherung</strong> – JSON unter Firma",
    "<strong>Backup</strong> – JSON under Company",
    "<strong>Yedek</strong> – Firma altında JSON",
    "<strong>نسخ احتياطي</strong> – JSON ضمن الشركة",
    "<strong>Sauvegarde</strong> – JSON sous Entreprise",
    "<strong>Copia</strong> – JSON en Empresa",
    "<strong>Backup</strong> – JSON in Azienda",
    "<strong>Kopia</strong> – JSON w Firma"
  )],
  ["portal.exportHint", L(
    "LStA monatlich (Firma, § 41a EStG). LStB jährlich (Mitarbeiter, § 41b EStG). Ohne Kanal nur lokal, nicht beim Finanzamt.",
    "Monthly LStA (company, § 41a EStG). Yearly LStB (employee, § 41b EStG). Without a channel jobs stay local, not at the tax office.",
    "Aylık LStA (firma, § 41a EStG). Yıllık LStB (çalışan, § 41b EStG). Kanal yoksa yerel, Finanzamt’te değil.",
    "LStA شهريًا (الشركة، § 41a EStG). LStB سنويًا (الموظف، § 41b EStG). بدون قناة يبقى محليًا وليس عند Finanzamt.",
    "LStA mensuelle (entreprise, § 41a EStG). LStB annuelle (salarié, § 41b EStG). Sans canal, local, pas au Finanzamt.",
    "LStA mensual (empresa, § 41a EStG). LStB anual (empleado, § 41b EStG). Sin canal, local, no en el Finanzamt.",
    "LStA mensile (azienda, § 41a EStG). LStB annuale (dipendente, § 41b EStG). Senza canale resta locale, non al Finanzamt.",
    "Miesięczna LStA (firma, § 41a EStG). Roczna LStB (pracownik, § 41b EStG). Bez kanału lokalnie, nie w Finanzamt."
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
