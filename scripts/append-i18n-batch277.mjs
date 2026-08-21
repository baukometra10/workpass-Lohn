import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const clean = [
  ["co.identityReady", L("Stammdaten", "Master data", "Ana veri", "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629", "Donn\u00e9es de base", "Datos maestros", "Anagrafica", "Dane podstawowe")],
  ["co.identityMetaEmpty", L("Anschrift und Telefon erg\u00e4nzen", "Add address and phone", "Adres ve telefon ekleyin", "\u0623\u0643\u0645\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0647\u0627\u062a\u0641", "Compl\u00e9ter adresse et t\u00e9l\u00e9phone", "Complete direcci\u00f3n y tel\u00e9fono", "Completare indirizzo e telefono", "Uzupe\u0142nij adres i telefon")],
  ["co.secIdentity", L("Identit\u00e4t", "Identity", "Kimlik", "\u0627\u0644\u0647\u0648\u064a\u0629", "Identit\u00e9", "Identidad", "Identit\u00e0", "To\u017csamo\u015b\u0107")],
  ["co.secIdentityHint", L(
    "Profil, Logo, Anschrift und Telefon f\u00fcr Briefkopf und Rechnung.",
    "Profile, logo, address and phone for letterhead and invoice.",
    "Profil, logo, adres ve telefon (antet ve fatura).",
    "\u0627\u0644\u0645\u0644\u0641 \u0648\u0627\u0644\u0634\u0639\u0627\u0631 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0647\u0627\u062a\u0641 \u0644\u0644\u062a\u0631\u0648\u064a\u0633\u0629 \u0648\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629.",
    "Profil, logo, adresse et t\u00e9l\u00e9phone pour en-t\u00eate et facture.",
    "Perfil, logo, direcci\u00f3n y tel\u00e9fono para membrete y factura.",
    "Profilo, logo, indirizzo e telefono per intestazione e fattura.",
    "Profil, logo, adres i telefon na nag\u0142\u00f3wek i faktur\u0119."
  )],
  ["co.secTax", L("Steuern & Recht", "Tax & legal", "Vergi & hukuk", "\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646", "Fiscalit\u00e9 & droit", "Impuestos y legal", "Fisco e legale", "Podatki i prawo")],
  ["co.secTaxHint", L(
    "Steuernummer, USt-IdNr. und rechtliche Angaben auf dem Beleg.",
    "Tax number, USt-IdNr. and legal details on the document.",
    "Vergi no., USt-IdNr. ve yasal bilgiler belgede.",
    "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064a\u0628\u064a \u0648USt-IdNr. \u0648\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062a\u0646\u062f.",
    "N\u00b0 fiscal, USt-IdNr. et mentions l\u00e9gales sur le document.",
    "N.\u00ba fiscal, USt-IdNr. y datos legales en el documento.",
    "N. fiscale, USt-IdNr. e dati legali sul documento.",
    "Nr podatkowy, USt-IdNr. i dane prawne na dokumencie."
  )],
  ["co.secBank", L("Bank", "Bank", "Banka", "\u0627\u0644\u0628\u0646\u0643", "Banque", "Banco", "Banca", "Bank")],
  ["co.secBankHint", L(
    "Zahlungsdaten der Firma f\u00fcr Rechnungen und Fu\u00dfzeile.",
    "Company payment details for invoices and footer.",
    "Firma \u00f6deme bilgileri (fatura ve altbilgi).",
    "\u0628\u064a\u0627\u0646\u0627\u062a \u062f\u0641\u0639 \u0627\u0644\u0634\u0631\u0643\u0629 \u0644\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u062a\u0630\u064a\u064a\u0644.",
    "Coordonn\u00e9es de paiement pour factures et pied de page.",
    "Datos de pago para facturas y pie de p\u00e1gina.",
    "Dati di pagamento per fatture e pi\u00e8 di pagina.",
    "Dane p\u0142atnicze firmy na faktury i stopk\u0119."
  )],
  ["co.secPayroll", L("Lohn & DATEV", "Payroll & DATEV", "Bordro & DATEV", "\u0627\u0644\u0623\u062c\u0648\u0631 \u0648 DATEV", "Paie & DATEV", "N\u00f3mina y DATEV", "Paghe e DATEV", "P\u0142ace i DATEV")],
  ["co.secPayrollHint", L(
    "Vorlage, Mandant-/Berater-Nr. und Briefkopf f\u00fcr Abrechnungen.",
    "Template, client/consultant no. and letterhead for payslips.",
    "\u015eablon, m\u00fc\u015fteri/dan\u0131\u015fman no. ve antet (bordro).",
    "\u0627\u0644\u0642\u0627\u0644\u0628 \u0648\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064a\u0644/\u0627\u0644\u0645\u0633\u062a\u0634\u0627\u0631 \u0648\u0627\u0644\u062a\u0631\u0648\u064a\u0633\u0629 \u0644\u0644\u0643\u0634\u0648\u0641.",
    "Mod\u00e8le, n\u00b0 client/conseiller et en-t\u00eate pour bulletins.",
    "Plantilla, n.\u00ba cliente/asesor y membrete para n\u00f3minas.",
    "Modello, n. cliente/consulente e intestazione per cedolini.",
    "Szablon, nr klienta/doradcy i nag\u0142\u00f3wek na listy p\u0142ac."
  )],
  ["co.secSecurity", L("Sicherheit & Backup", "Security & backup", "G\u00fcvenlik & yedek", "\u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u0646\u0633\u062e \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a", "S\u00e9curit\u00e9 & sauvegarde", "Seguridad y copia", "Sicurezza e backup", "Bezpiecze\u0144stwo i kopia")],
  ["co.secSecurityHint", L(
    "PIN auf diesem Ger\u00e4t und lokales JSON-Backup.",
    "PIN on this device and local JSON backup.",
    "Bu cihazda PIN ve yerel JSON yedek.",
    "\u0631\u0645\u0632 PIN \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632 \u0648\u0646\u0633\u062e\u0629 JSON \u0645\u062d\u0644\u064a\u0629.",
    "PIN sur cet appareil et sauvegarde JSON locale.",
    "PIN en este dispositivo y copia JSON local.",
    "PIN su questo dispositivo e backup JSON locale.",
    "PIN na tym urz\u0105dzeniu i lokalna kopia JSON."
  )],
  ["co.backupTitle", L("Datensicherung", "Data backup", "Veri yedekleme", "\u0627\u0644\u0646\u0633\u062e \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a", "Sauvegarde", "Copia de seguridad", "Backup dati", "Kopia zapasowa")],
  ["co.backupHint", L(
    "Browser-Backup: alle lokalen Mandanten, Mitarbeiter und Einstellungen als JSON. Server-Backups (SQLite, verschl\u00fcsselt) liegen im <a href=\"admin.html\">Admin</a> unter Backup \u2013 dort auch Wiederherstellen.",
    "Browser backup: all local clients, employees and settings as JSON. Server backups (encrypted SQLite) are in <a href=\"admin.html\">Admin</a> under Backup \u2014 restore there too.",
    "Taray\u0131c\u0131 yede\u011fi: yerel m\u00fc\u015fteriler, \u00e7al\u0131\u015fanlar ve ayarlar JSON. Sunucu yedekleri (\u015fifreli SQLite) <a href=\"admin.html\">Admin</a> \u2192 Backup.",
    "\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062a\u0635\u0641\u062d: \u0643\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u0648\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062d\u0644\u064a\u0629 \u0643\u0640 JSON. \u0646\u0633\u062e \u0627\u0644\u062e\u0627\u062f\u0645 (SQLite \u0645\u0634\u0641\u0651\u0631) \u0641\u064a <a href=\"admin.html\">Admin</a> \u062a\u062d\u062a Backup.",
    "Sauvegarde navigateur : clients, employ\u00e9s et r\u00e9glages locaux en JSON. Sauvegardes serveur (SQLite chiffr\u00e9) dans <a href=\"admin.html\">Admin</a>.",
    "Copia del navegador: clientes, empleados y ajustes locales en JSON. Copias del servidor (SQLite cifrado) en <a href=\"admin.html\">Admin</a>.",
    "Backup browser: clienti, dipendenti e impostazioni locali in JSON. Backup server (SQLite cifrato) in <a href=\"admin.html\">Admin</a>.",
    "Kopia przegl\u0105darki: lokalni klienci, pracownicy i ustawienia jako JSON. Kopie serwera (SQLite szyfrowany) w <a href=\"admin.html\">Admin</a>."
  )],
  ["co.exportAll", L("Alles exportieren", "Export all", "T\u00fcm\u00fcn\u00fc d\u0131\u015fa aktar", "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0643\u0644", "Tout exporter", "Exportar todo", "Esporta tutto", "Eksportuj wszystko")],
  ["co.importAll", L("Daten importieren", "Import data", "Veri i\u00e7e aktar", "\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "Importer les donn\u00e9es", "Importar datos", "Importa dati", "Importuj dane")],
  ["co.pinTitle", L("Zugangsschutz (PIN)", "Access protection (PIN)", "Eri\u015fim korumas\u0131 (PIN)", "\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u062f\u062e\u0648\u0644 (PIN)", "Protection d\u2019acc\u00e8s (PIN)", "Protecci\u00f3n de acceso (PIN)", "Protezione accesso (PIN)", "Ochrona dost\u0119pu (PIN)")],
  ["co.pinHint", L(
    "PIN \u00e4ndern \u2013 sch\u00fctzt Hub und Lohnarbeitsplatz auf diesem Ger\u00e4t.",
    "Change PIN \u2013 protects hub and payroll workspace on this device.",
    "PIN de\u011fi\u015ftir \u2013 bu cihazda hub ve bordroyu korur.",
    "\u063a\u064a\u0651\u0631 PIN \u2013 \u064a\u062d\u0645\u064a \u0627\u0644\u0645\u0631\u0643\u0632 \u0648\u0645\u0643\u0627\u0646 \u0639\u0645\u0644 \u0627\u0644\u0623\u062c\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632.",
    "Changer le PIN \u2013 prot\u00e8ge le hub et l\u2019espace paie sur cet appareil.",
    "Cambiar PIN \u2013 protege el hub y la n\u00f3mina en este dispositivo.",
    "Cambia PIN \u2013 protegge hub e area paghe su questo dispositivo.",
    "Zmie\u0144 PIN \u2013 chroni hub i stanowisko p\u0142ac na tym urz\u0105dzeniu."
  )],
  ["co.pinOld", L("Alte PIN", "Old PIN", "Eski PIN", "PIN \u0627\u0644\u0633\u0627\u0628\u0642", "Ancien PIN", "PIN anterior", "PIN precedente", "Stary PIN")],
  ["co.pinNew", L("Neue PIN", "New PIN", "Yeni PIN", "PIN \u062c\u062f\u064a\u062f", "Nouveau PIN", "PIN nuevo", "Nuovo PIN", "Nowy PIN")],
  ["co.pinConfirm", L("Best\u00e4tigen", "Confirm", "Onayla", "\u062a\u0623\u0643\u064a\u062f", "Confirmer", "Confirmar", "Conferma", "Potwierd\u017a")],
  ["co.pinSave", L("PIN speichern", "Save PIN", "PIN kaydet", "\u062d\u0641\u0638 PIN", "Enregistrer le PIN", "Guardar PIN", "Salva PIN", "Zapisz PIN")],
];

const intro = L(
  "Hier pflegen Sie Logo, Anschrift, Steuer, Telefon und Bank \u2014 einmal korrekt, \u00fcberall auf dem Beleg. Die Lohnsteuerbescheinigung (LStB) liegt im <a href=\"lohn.html\">Lohn-Portal</a>.",
  "Maintain logo, address, tax, phone and bank here \u2014 once correct, everywhere on the document. The LStB lives in the <a href=\"lohn.html\">payroll portal</a>.",
  "Logo, adres, vergi, telefon ve banka burada \u2014 bir kez do\u011fru, belgede her yerde. LStB <a href=\"lohn.html\">bordro portal\u0131ndad\u0131r</a>.",
  "\u0647\u0646\u0627 \u062a\u064f\u062f\u0627\u0631 \u0627\u0644\u0634\u0639\u0627\u0631 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0627\u0644\u0628\u0646\u0643 \u2014 \u0645\u0631\u0629 \u0635\u062d\u064a\u062d\u0629\u060c \u0641\u064a \u0643\u0644 \u0627\u0644\u0645\u0633\u062a\u0646\u062f. LStB \u0641\u064a <a href=\"lohn.html\">\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0623\u062c\u0648\u0631</a>.",
  "Logo, adresse, fiscalit\u00e9, t\u00e9l\u00e9phone et banque ici \u2014 une fois correct, partout sur le document. La LStB est dans le <a href=\"lohn.html\">portail paie</a>.",
  "Logo, direcci\u00f3n, impuestos, tel\u00e9fono y banco aqu\u00ed \u2014 una vez correcto, en todo el documento. La LStB est\u00e1 en el <a href=\"lohn.html\">portal de n\u00f3mina</a>.",
  "Logo, indirizzo, fisco, telefono e banca qui \u2014 una volta corretto, ovunque sul documento. La LStB \u00e8 nel <a href=\"lohn.html\">portale paghe</a>.",
  "Logo, adres, podatki, telefon i bank tutaj \u2014 raz poprawnie, wsz\u0119dzie na dokumencie. LStB jest w <a href=\"lohn.html\">portalu p\u0142ac</a>."
);

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);

const toAdd = clean.filter(([k]) => !existing.has(k));
if (toAdd.length) {
  const block = toAdd.map(([key, loc]) => {
    const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
    const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
    return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
  }).join(",\n");
  s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
}

const hintTuple = `["hub.companyIntro",${JSON.stringify({
  de: intro.de, en: intro.en, tr: intro.tr, ar: intro.ar, fr: intro.fr, es: intro.es, it: intro.it, pl: intro.pl,
})}]`;
if (s.includes('["hub.companyIntro"')) {
  s = s.replace(/\["hub\.companyIntro",\{[^]*?\}\]/, hintTuple);
} else if (s.includes('key: "hub.companyIntro"')) {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(intro[lang])}`).join(",\n");
  s = s.replace(
    /\{\s*key:\s*"hub\.companyIntro",\s*locales:\s*\{[^]*?\}\s*\}/,
    `{\n    key: "hub.companyIntro",\n    locales: {\n${inner}\n    }\n  }`
  );
}

fs.writeFileSync(path, s);
console.log("added", toAdd.map(([k]) => k).join(", ") || "(none new)", "+ refreshed hub.companyIntro");
