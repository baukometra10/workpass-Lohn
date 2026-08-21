import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["help.heroSub", L(
    "Kurz erklärt: Firma, Rechnung, Lohn — und wie Sie uns erreichen.",
    "Quick guide: company, invoice, payroll — and how to reach us.",
    "Kısa özet: firma, fatura, bordro — ve bize nasıl ulaşılır.",
    "باختصار: الشركة والفاتورة والأجور — وكيف تتواصل معنا.",
    "En bref : entreprise, facture, paie — et comment nous joindre.",
    "En breve: empresa, factura, nómina — y cómo contactarnos.",
    "In breve: azienda, fattura, paghe — e come contattarci.",
    "Krótko: firma, faktura, płace — i jak się z nami skontaktować."
  )],
  ["help.contactTitle", L("Kontakt & Support", "Contact & support", "İletişim & destek", "الاتصال والدعم", "Contact & assistance", "Contacto y soporte", "Contatto e supporto", "Kontakt i wsparcie")],
  ["help.contactLead", L(
    "Fragen zu WorkPass Steuerprogramm, Login oder Belegen? Schreiben Sie uns — wir helfen weiter.",
    "Questions about WorkPass Steuerprogramm, login or documents? Write to us — we’re here to help.",
    "WorkPass Steuerprogramm, giriş veya belgeler hakkında sorular? Yazın — yardımcı oluruz.",
    "أسئلة عن WorkPass Steuerprogramm أو الدخول أو المستندات؟ راسلنا — سنساعد.",
    "Questions sur WorkPass Steuerprogramm, connexion ou documents ? Écrivez-nous.",
    "¿Preguntas sobre WorkPass Steuerprogramm, acceso o documentos? Escríbanos.",
    "Domande su WorkPass Steuerprogramm, accesso o documenti? Scriveteci.",
    "Pytania o WorkPass Steuerprogramm, logowanie lub dokumenty? Napisz do nas."
  )],
  ["help.contactHint", L(
    "Bitte Firmenname und Mandant-ID in der Nachricht angeben, damit wir schneller helfen können.",
    "Please include company name and client ID in your message so we can help faster.",
    "Mesajda firma adı ve Mandant-ID yazın — daha hızlı yardım ederiz.",
    "يرجى ذكر اسم الشركة ومعرّف العميل في الرسالة لنساعد بسرعة أكبر.",
    "Indiquez le nom de l’entreprise et l’ID mandant dans le message.",
    "Indique el nombre de la empresa y el ID de cliente en el mensaje.",
    "Indicate nome azienda e ID cliente nel messaggio.",
    "Podaj nazwę firmy i ID mandanta w wiadomości."
  )],
  ["help.contactProduct", L("Produkt", "Product", "Ürün", "المنتج", "Produit", "Producto", "Prodotto", "Produkt")],
  ["help.contactEmail", L("E-Mail", "Email", "E-posta", "البريد", "E-mail", "Correo", "E-mail", "E-mail")],
  ["help.contactPhone", L("Telefon", "Phone", "Telefon", "الهاتف", "Téléphone", "Teléfono", "Telefono", "Telefon")],
  ["help.contactWeb", L("Website", "Website", "Web sitesi", "الموقع", "Site web", "Sitio web", "Sito web", "Strona")],
  ["help.contactHours", L("Erreichbarkeit", "Availability", "Ulaşılabilirlik", "أوقات الرد", "Disponibilité", "Disponibilidad", "Disponibilità", "Dostępność")],
  ["help.contactEmpty", L("Kontaktdaten folgen in Kürze.", "Contact details coming soon.", "İletişim yakında.", "بيانات الاتصال قريبًا.", "Coordonnées bientôt.", "Contacto pronto.", "Contatti a breve.", "Kontakt wkrótce.")],
  ["help.modulesTitle", L("Module auf einen Blick", "Modules at a glance", "Modüllere bakış", "الوحدات بنظرة", "Modules en un coup d’œil", "Módulos de un vistazo", "Moduli in sintesi", "Moduły w skrócie")],
  ["help.modFirma", L(
    "<strong>Firma</strong> – Stammdaten einmal pflegen; Checkliste klicken öffnet das fehlende Feld; Profil speichern sichert lokal (und Server bei Firmen-Login).",
    "<strong>Company</strong> – maintain master data once; checklist click opens the missing field; save stores locally (and on the server with company login).",
    "<strong>Firma</strong> – ana veriyi bir kez tutun; kontrol listesine tıklayınca eksik alan açılır.",
    "<strong>الشركة</strong> – حدّث البيانات مرة واحدة؛ النقر على القائمة يفتح الحقل الناقص؛ الحفظ محليًا (والخادم مع دخول الشركة).",
    "<strong>Entreprise</strong> – données de base une fois ; clic checklist ouvre le champ manquant.",
    "<strong>Empresa</strong> – datos maestros una vez; clic en la lista abre el campo faltante.",
    "<strong>Azienda</strong> – anagrafica una volta; clic sulla checklist apre il campo mancante.",
    "<strong>Firma</strong> – dane podstawowe raz; klik na checklistę otwiera brakujące pole."
  )],
  ["help.modRechnung", L(
    "<strong>Rechnung</strong> – Jede Rechnung erhält eine eindeutige <strong>Nr. RE-</strong>. Suche nach Nummer oder Kundenname im Tab Rechnung und im Rechnungsarchiv (Übersicht).",
    "<strong>Invoice</strong> – each invoice gets a unique <strong>Nr. RE-</strong>. Search by number or customer in Invoice and in the archive (Overview).",
    "<strong>Fatura</strong> – her faturanın benzersiz <strong>Nr. RE-</strong> numarası vardır. Fatura sekmesinde veya arşivde arayın.",
    "<strong>الفاتورة</strong> – لكل فاتورة <strong>Nr. RE-</strong> فريد. ابحث بالرقم أو اسم العميل في الفاتورة أو الأرشيف.",
    "<strong>Facture</strong> – chaque facture a un <strong>Nr. RE-</strong> unique. Recherchez dans Facture ou Archives.",
    "<strong>Factura</strong> – cada factura tiene un <strong>Nr. RE-</strong> único. Busque en Factura o archivo.",
    "<strong>Fattura</strong> – ogni fattura ha un <strong>Nr. RE-</strong> univoco. Cerca in Fattura o archivio.",
    "<strong>Faktura</strong> – każda ma unikalny <strong>Nr. RE-</strong>. Szukaj w Fakturze lub archiwum."
  )],
  ["help.modLohn", L(
    "<strong>Lohn-Portal</strong> – Abrechnung, LStB und LStA nur unter <a href=\"lohn.html\">lohn.html</a> — nicht im Rechnungs-Tab.",
    "<strong>Payroll portal</strong> – payslip, LStB and LStA only under <a href=\"lohn.html\">lohn.html</a> — not in the invoice tab.",
    "<strong>Bordro portalı</strong> – bordro, LStB ve LStA yalnızca <a href=\"lohn.html\">lohn.html</a>.",
    "<strong>بوابة الأجور</strong> – الكشف وLStB وLStA فقط في <a href=\"lohn.html\">lohn.html</a> — وليس في تبويب الفاتورة.",
    "<strong>Portail paie</strong> – bulletin, LStB et LStA uniquement sous <a href=\"lohn.html\">lohn.html</a>.",
    "<strong>Portal de nómina</strong> – nómina, LStB y LStA solo en <a href=\"lohn.html\">lohn.html</a>.",
    "<strong>Portale paghe</strong> – cedolino, LStB e LStA solo in <a href=\"lohn.html\">lohn.html</a>.",
    "<strong>Portal płac</strong> – lista, LStB i LStA tylko w <a href=\"lohn.html\">lohn.html</a>."
  )],
  ["help.faqTitle", L("Häufige Fragen", "FAQ", "SSS", "أسئلة شائعة", "FAQ", "Preguntas frecuentes", "Domande frequenti", "Częste pytania")],
  ["help.faq1q", L("Wo finde ich eine Rechnung nach Kundenname?", "Where do I find an invoice by customer name?", "Müşteri adına göre faturayı nerede bulurum?", "أين أجد فاتورة باسم العميل؟", "Où trouver une facture par client ?", "¿Dónde encuentro una factura por cliente?", "Dove trovo una fattura per cliente?", "Gdzie znajdę fakturę po kliencie?")],
  ["help.faq1a", L(
    "Im Tab Rechnung oben suchen, oder in der Übersicht → Rechnungsarchiv. Tippen Sie den Kundennamen oder die Nr. RE-.",
    "Search at the top of the Invoice tab, or Overview → Invoice archive. Type the customer name or Nr. RE-.",
    "Fatura sekmesinin üstünden veya Genel bakış → Fatura arşivi. Müşteri adı veya Nr. RE- yazın.",
    "ابحث أعلى تبويب الفاتورة، أو النظرة العامة → أرشيف الفواتير. اكتب اسم العميل أو Nr. RE-.",
    "Recherchez en haut de Facture, ou Aperçu → Archives. Saisissez le client ou Nr. RE-.",
    "Busque arriba en Factura, o Resumen → Archivo. Escriba el cliente o Nr. RE-.",
    "Cerca in alto in Fattura, o Panoramica → Archivio. Digiti il cliente o Nr. RE-.",
    "Szukaj u góry w Fakturze lub Przegląd → Archiwum. Wpisz klienta lub Nr. RE-."
  )],
  ["help.faq2q", L("Warum ändert sich die Rechnungsnummer nicht manuell?", "Why can’t I change the invoice number manually?", "Fatura numarası neden elle değişmiyor?", "لماذا لا يمكن تغيير رقم الفاتورة يدويًا؟", "Pourquoi le n° de facture n’est pas modifiable ?", "¿Por qué no puedo cambiar el n.º de factura?", "Perché non posso cambiare il numero fattura?", "Dlaczego nie mogę zmienić numeru faktury?")],
  ["help.faq2a", L(
    "Nummern werden automatisch vergeben und nicht wiederholt (GoBD-freundlich). Neue Rechnung = neue Nr. RE-.",
    "Numbers are assigned automatically and never reused (GoBD-friendly). New invoice = new Nr. RE-.",
    "Numaralar otomatik verilir ve tekrar edilmez. Yeni fatura = yeni Nr. RE-.",
    "تُمنح الأرقام تلقائيًا ولا تُعاد. فاتورة جديدة = Nr. RE- جديد.",
    "Les numéros sont attribués automatiquement et non réutilisés. Nouvelle facture = nouveau Nr. RE-.",
    "Los números se asignan automáticamente y no se reutilizan. Nueva factura = nuevo Nr. RE-.",
    "I numeri sono assegnati automaticamente e non riutilizzati. Nuova fattura = nuovo Nr. RE-.",
    "Numery nadawane automatycznie i bez powtórzeń. Nowa faktura = nowy Nr. RE-."
  )],
  ["help.faq3q", L("Wo trage ich die Firmen-Telefonnummer ein?", "Where do I enter the company phone number?", "Firma telefon numarasını nereye yazarım?", "أين أُدخل هاتف الشركة؟", "Où saisir le téléphone de l’entreprise ?", "¿Dónde indico el teléfono de la empresa?", "Dove inserisco il telefono azienda?", "Gdzie wpisać telefon firmy?")],
  ["help.faq3a", L(
    "Unter Firma → Identität → Telefon (Firma). Sie erscheint auf der Rechnung als Tel.: …",
    "Under Company → Identity → Phone (company). It appears on the invoice as Tel.: …",
    "Firma → Kimlik → Telefon (firma). Faturada Tel.: … olarak görünür.",
    "تحت الشركة → الهوية → هاتف (الشركة). يظهر على الفاتورة كـ Tel.: …",
    "Sous Entreprise → Identité → Téléphone. Il apparaît sur la facture comme Tel. : …",
    "En Empresa → Identidad → Teléfono. Aparece en la factura como Tel.: …",
    "In Azienda → Identità → Telefono. Compare in fattura come Tel.: …",
    "W Firma → Tożsamość → Telefon. Na fakturze jako Tel.: …"
  )],
];

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);
const toAdd = extra.filter(([k]) => !existing.has(k));
if (toAdd.length) {
  const block = toAdd.map(([key, loc]) => {
    const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
    const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
    return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
  }).join(",\n");
  s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
}

const step2 = L(
  "<strong>Firma</strong> – Briefkopf, Steuer-Nr., Telefon, IBAN, Logo",
  "<strong>Company</strong> – letterhead, tax no., phone, IBAN, logo",
  "<strong>Firma</strong> – antet, vergi no., telefon, IBAN, logo",
  "<strong>الشركة</strong> – الترويسة، الرقم الضريبي، الهاتف، IBAN، الشعار",
  "<strong>Entreprise</strong> – en-tête, n° fiscal, téléphone, IBAN, logo",
  "<strong>Empresa</strong> – membrete, n.º fiscal, teléfono, IBAN, logo",
  "<strong>Azienda</strong> – intestazione, n. fiscale, telefono, IBAN, logo",
  "<strong>Firma</strong> – nagłówek, nr podatkowy, telefon, IBAN, logo"
);
const step2Tuple = `["help.step2",${JSON.stringify({
  de: step2.de, en: step2.en, tr: step2.tr, ar: step2.ar, fr: step2.fr, es: step2.es, it: step2.it, pl: step2.pl,
})}]`;
if (s.includes('["help.step2"')) {
  s = s.replace(/\["help\.step2",\{[^]*?\}\]/, step2Tuple);
} else if (s.includes('key: "help.step2"')) {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(step2[lang])}`).join(",\n");
  s = s.replace(
    /\{\s*key:\s*"help\.step2",\s*locales:\s*\{[^]*?\}\s*\}/,
    `{\n    key: "help.step2",\n    locales: {\n${inner}\n    }\n  }`
  );
}

const step3 = L(
  "<strong>Rechnung</strong> – Ausgangsrechnung nach § 14 UStG · Nr. RE- automatisch",
  "<strong>Invoice</strong> – outgoing invoice per § 14 UStG · Nr. RE- automatic",
  "<strong>Fatura</strong> – çıkış faturası § 14 UStG · Nr. RE- otomatik",
  "<strong>الفاتورة</strong> – فاتورة صادرة وفق § 14 UStG · Nr. RE- تلقائي",
  "<strong>Facture</strong> – facture sortante selon § 14 UStG · Nr. RE- auto",
  "<strong>Factura</strong> – factura emitida según § 14 UStG · Nr. RE- auto",
  "<strong>Fattura</strong> – fattura in uscita secondo § 14 UStG · Nr. RE- auto",
  "<strong>Faktura</strong> – faktura wychodząca wg § 14 UStG · Nr. RE- auto"
);
const step3Tuple = `["help.step3",${JSON.stringify({
  de: step3.de, en: step3.en, tr: step3.tr, ar: step3.ar, fr: step3.fr, es: step3.es, it: step3.it, pl: step3.pl,
})}]`;
if (s.includes('["help.step3"')) {
  s = s.replace(/\["help\.step3",\{[^]*?\}\]/, step3Tuple);
}

fs.writeFileSync(path, s);
console.log("added", toAdd.map(([k]) => k).join(", ") || "(none)", "+ refreshed help.step2/3");
