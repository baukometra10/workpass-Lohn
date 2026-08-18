import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["nav.document", L(
    "Rechnung", "Invoice", "Fatura", "فاتورة", "Facture", "Factura", "Fattura", "Faktura"
  )],
  ["nav.company", L(
    "Firma", "Company", "Firma", "الشركة", "Entreprise", "Empresa", "Azienda", "Firma"
  )],
  ["hub.docCreate", L(
    "Rechnung", "Invoice", "Fatura", "فاتورة", "Facture", "Factura", "Fattura", "Faktura"
  )],
  ["hub.docCreateSub", L(
    "Ausgangsrechnung nach § 14 UStG · Lohn im Lohn-Portal",
    "Outgoing invoice per § 14 UStG · payroll in the payroll portal",
    "Çıkış faturası § 14 UStG · bordro portalında ücret",
    "فاتورة صادرة وفق § 14 UStG · الأجور في بوابة الأجور",
    "Facture sortante selon § 14 UStG · paie dans le portail",
    "Factura emitida según § 14 UStG · nómina en el portal",
    "Fattura in uscita secondo § 14 UStG · paghe nel portale",
    "Faktura wychodząca wg § 14 UStG · płace w portalu"
  )],
  ["doc.payrollPortalHint", L(
    "Lohnabrechnung, LStB (Mitarbeiter) und LStA (Firma) nur im <a href=\"lohn.html\">Lohn-Portal</a> — hier nur Rechnungen.",
    "Payslips, LStB (employee) and LStA (company) only in the <a href=\"lohn.html\">payroll portal</a> — invoices here.",
    "Bordro, LStB (çalışan) ve LStA (firma) yalnızca <a href=\"lohn.html\">bordro portalında</a> — burada fatura.",
    "كشف الراتب و LStB (موظف) و LStA (شركة) فقط في <a href=\"lohn.html\">بوابة الأجور</a> — هنا الفواتير فقط.",
    "Paie, LStB (salarié) et LStA (entreprise) uniquement dans le <a href=\"lohn.html\">portail paie</a> — ici les factures.",
    "Nómina, LStB (empleado) y LStA (empresa) solo en el <a href=\"lohn.html\">portal de nómina</a> — aquí facturas.",
    "Cedolino, LStB (dipendente) e LStA (azienda) solo nel <a href=\"lohn.html\">portale paghe</a> — qui le fatture.",
    "Lista płac, LStB (pracownik) i LStA (firma) tylko w <a href=\"lohn.html\">portalu płac</a> — tutaj faktury."
  )],
  ["jump.steuer", L(
    "Steuer", "Tax", "Vergi", "الضريبة", "Impôt", "Impuesto", "Tasse", "Podatek"
  )],
  ["portal.exportBankFiles", L(
    "Dateien für Bank und Buchhaltung",
    "Files for bank and bookkeeping",
    "Banka ve muhasebe dosyaları",
    "ملفات للبنك والمحاسبة",
    "Fichiers banque et comptabilité",
    "Archivos para banco y contabilidad",
    "File per banca e contabilità",
    "Pliki dla banku i księgowości"
  )],
  ["portal.exportFirmMonth", L(
    "Firma · dieser Monat · LStA (§ 41a EStG)",
    "Company · this month · LStA (§ 41a EStG)",
    "Firma · bu ay · LStA (§ 41a EStG)",
    "الشركة · هذا الشهر · LStA (§ 41a EStG)",
    "Entreprise · ce mois · LStA (§ 41a EStG)",
    "Empresa · este mes · LStA (§ 41a EStG)",
    "Azienda · questo mese · LStA (§ 41a EStG)",
    "Firma · ten miesiąc · LStA (§ 41a EStG)"
  )],
  ["portal.exportEmployeeYear", L(
    "Mitarbeiter · Kalenderjahr · LStB (§ 41b EStG)",
    "Employee · calendar year · LStB (§ 41b EStG)",
    "Çalışan · takvim yılı · LStB (§ 41b EStG)",
    "الموظف · السنة التقويمية · LStB (§ 41b EStG)",
    "Salarié · année civile · LStB (§ 41b EStG)",
    "Empleado · año natural · LStB (§ 41b EStG)",
    "Dipendente · anno solare · LStB (§ 41b EStG)",
    "Pracownik · rok kalendarzowy · LStB (§ 41b EStG)"
  )],
  ["portal.certTitle", L(
    "LStB & Verdienst · Mitarbeiter",
    "LStB & earnings · employee",
    "LStB ve kazanç · çalışan",
    "LStB والأرباح · الموظف",
    "LStB et gains · salarié",
    "LStB y ganancias · empleado",
    "LStB e reddito · dipendente",
    "LStB i zarobki · pracownik"
  )],
  ["portal.certBadge", L(
    "Jahr / Monat", "Year / month", "Yıl / ay", "سنة / شهر", "Année / mois", "Año / mes", "Anno / mese", "Rok / miesiąc"
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
