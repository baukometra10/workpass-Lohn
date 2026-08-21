import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["admin.helpContactTitle", L(
    "Hilfe-Kontakt (öffentlich)",
    "Help contact (public)",
    "Yardım iletişimi (herkese açık)",
    "جهة اتصال المساعدة (عامة)",
    "Contact d’aide (public)",
    "Contacto de ayuda (público)",
    "Contatto assistenza (pubblico)",
    "Kontakt pomocy (publiczny)"
  )],
  ["admin.helpContactHint", L(
    "E-Mail, Telefon und Website erscheinen im Hub unter Hilfe. Sie können die Angaben jederzeit ändern und speichern.",
    "Email, phone and website appear in the Hub under Help. You can change and save them anytime.",
    "E-posta, telefon ve web sitesi Hub → Yardım’da görünür. İstediğiniz zaman değiştirip kaydedebilirsiniz.",
    "البريد والهاتف والموقع تظهر في المركز تحت مساعدة. يمكنك تعديلها وحفظها في أي وقت.",
    "E-mail, téléphone et site apparaissent dans le Hub sous Aide. Modifiez et enregistrez à tout moment.",
    "El correo, teléfono y web aparecen en el Hub bajo Ayuda. Puede cambiarlos y guardarlos cuando quiera.",
    "Email, telefono e sito compaiono nell’Hub sotto Aiuto. Puoi modificarli e salvarli quando vuoi.",
    "E-mail, telefon i strona pojawiają się w Hubie w Pomocy. Możesz je zmieniać i zapisywać w dowolnej chwili."
  )],
  ["admin.helpProduct", L("Produktzeile", "Product line", "Ürün satırı", "سطر المنتج", "Ligne produit", "Línea de producto", "Riga prodotto", "Linia produktu")],
  ["admin.helpEmail", L("E-Mail", "Email", "E-posta", "البريد", "E-mail", "Correo", "E-mail", "E-mail")],
  ["admin.helpPhone", L("Telefon", "Phone", "Telefon", "الهاتف", "Téléphone", "Teléfono", "Telefono", "Telefon")],
  ["admin.helpWhatsapp", L(
    "WhatsApp (nur Ziffern, Ländervorwahl)",
    "WhatsApp (digits only, country code)",
    "WhatsApp (yalnızca rakam, ülke kodu)",
    "WhatsApp (أرقام فقط مع رمز الدولة)",
    "WhatsApp (chiffres seuls, indicatif)",
    "WhatsApp (solo dígitos, prefijo)",
    "WhatsApp (solo cifre, prefisso)",
    "WhatsApp (tylko cyfry, kod kraju)"
  )],
  ["admin.helpWebsite", L("Website-URL", "Website URL", "Web sitesi URL", "رابط الموقع", "URL du site", "URL del sitio", "URL del sito", "URL strony")],
  ["admin.helpWebsiteLabel", L("Website-Anzeige", "Website label", "Web sitesi etiketi", "تسمية الموقع", "Libellé du site", "Etiqueta del sitio", "Etichetta sito", "Etykieta strony")],
  ["admin.helpHours", L("Erreichbarkeit", "Availability", "Ulaşılabilirlik", "أوقات التواجد", "Disponibilité", "Disponibilidad", "Disponibilità", "Dostępność")],
  ["admin.helpContactSave", L("Kontakt speichern", "Save contact", "İletişimi kaydet", "حفظ جهة الاتصال", "Enregistrer le contact", "Guardar contacto", "Salva contatto", "Zapisz kontakt")],
  ["admin.helpContactReload", L("Neu laden", "Reload", "Yeniden yükle", "إعادة التحميل", "Recharger", "Recargar", "Ricarica", "Odśwież")],
  ["admin.helpContactSaved", L("Hilfe-Kontakt gespeichert.", "Help contact saved.", "Yardım iletişimi kaydedildi.", "تم حفظ جهة اتصال المساعدة.", "Contact d’aide enregistré.", "Contacto de ayuda guardado.", "Contatto assistenza salvato.", "Kontakt pomocy zapisany.")],
  ["admin.helpContactLoaded", L("Hilfe-Kontakt geladen.", "Help contact loaded.", "Yardım iletişimi yüklendi.", "تم تحميل جهة اتصال المساعدة.", "Contact d’aide chargé.", "Contacto de ayuda cargado.", "Contatto assistenza caricato.", "Kontakt pomocy wczytany.")],
  ["admin.helpContactMeta", L(
    "Zuletzt gespeichert: {when}{by}",
    "Last saved: {when}{by}",
    "Son kayıt: {when}{by}",
    "آخر حفظ: {when}{by}",
    "Dernier enregistrement : {when}{by}",
    "Último guardado: {when}{by}",
    "Ultimo salvataggio: {when}{by}",
    "Ostatni zapis: {when}{by}"
  )],
  ["admin.helpContactBy", L(" · von {who}", " · by {who}", " · {who}", " · بواسطة {who}", " · par {who}", " · por {who}", " · da {who}", " · przez {who}")],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
