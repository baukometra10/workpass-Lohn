import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.companyIntro", L(
    'Lokales Profil für Rechnung &amp; PDF. Bei Firmen-Login zeigt der Status die Plattform-Buchhaltung; Lohn-Stammdaten (DATEV-Nr.) liegen im <a href="lohn.html">Lohn-Portal</a>.',
    'Local profile for invoices &amp; PDF. With company login the status shows platform accounting; payroll master data is in the <a href="lohn.html">payroll portal</a>.',
    'Yerel profil · bordro portalında ana veriler.',
    'ملف محلي للفواتير و PDF. مع دخول الشركة يظهر حالة محاسبة المنصة؛ بيانات الأجور في <a href="lohn.html">بوابة الأجور</a>.',
    'Profil local pour factures &amp; PDF.',
    'Perfil local para facturas y PDF.',
    'Profilo locale per fatture e PDF.',
    'Lokalny profil faktur i PDF.'
  )],
  ["hub.masterChecklist", L("Stammdaten-Checkliste", "Master data checklist", "Ana veri listesi", "قائمة تحقق البيانات الأساسية", "Liste données de base", "Lista de datos maestros", "Checklist anagrafica", "Checklista danych podstawowych")],
  ["hub.checkNextFocus", L("Nächstes offenes Feld fokussieren", "Focus next incomplete field", "Sonraki açık alana odaklan", "التركيز على الحقل الناقص التالي", "Focus sur le prochain champ", "Enfocar el siguiente campo", "Metti a fuoco il prossimo campo", "Ustaw fokus na następnym polu")],
  ["hub.invoiceArchiveEmpty", L("Noch keine gespeicherten oder freigegebenen Rechnungen.", "No saved or released invoices yet.", "Kayıtlı/onaylı fatura yok.", "لا فواتير محفوظة أو معتمدة بعد.", "Pas encore de factures enregistrées ou validées.", "Aún no hay facturas guardadas o liberadas.", "Ancora nessuna fattura salvata o rilasciata.", "Brak zapisanych lub zatwierdzonych faktur.")],
  ["hub.badgeServer", L("Server", "Server", "Sunucu", "الخادم", "Serveur", "Servidor", "Server", "Serwer")],
  ["hub.badgeBoth", L("Lokal+Server", "Local+Server", "Yerel+Sunucu", "محلي+خادم", "Local+Serveur", "Local+Servidor", "Locale+Server", "Lokal+Serwer")],
  ["hub.badgeLocal", L("Lokal", "Local", "Yerel", "محلي", "Local", "Local", "Locale", "Lokal")],
];
const lines = extra.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n");
s = s.replace(/\];\s*$/, `${lines}\n];\n`);
fs.writeFileSync(path, s);
console.log("added", extra.length);
