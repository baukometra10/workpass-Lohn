import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
const idx = s.indexOf('["admin.helpContactHint"');
if (idx < 0) throw new Error("not found");
const end = s.indexOf("}],", idx) + 2;
const next = `["admin.helpContactHint", ${JSON.stringify({
  de: "Diese Kontakte sehen alle Firmen und Nutzer im Hub unter Hilfe. Hier eintragen → Kontakt speichern. Bridge muss laufen, damit Kunden dieselben Werte sehen (nicht nur dieses Gerät).",
  en: "All firms and users see these contacts in Hub → Help. Enter them here → Save contact. The bridge must be running so clients see the same values (not only this device).",
  tr: "Tüm firmalar ve kullanıcılar bu iletişimleri Hub → Yardım’da görür. Buraya yazın → Kaydet. Müşterilerin aynı değerleri görmesi için Bridge çalışmalı.",
  ar: "ترى كل الشركات والمستخدمين جهات الاتصال هذه في المركز ← مساعدة. أدخلها هنا ← حفظ. يجب أن يعمل الجسر ليراها العملاء (وليس هذا الجهاز فقط).",
  fr: "Toutes les entreprises voient ces contacts dans Hub → Aide. Saisissez ici → Enregistrer. Le bridge doit tourner pour que les clients voient les mêmes valeurs.",
  es: "Todas las empresas ven estos contactos en Hub → Ayuda. Introdúzcalos aquí → Guardar. El bridge debe estar en marcha para que los clientes vean los mismos valores.",
  it: "Tutte le aziende vedono questi contatti in Hub → Aiuto. Inseriscili qui → Salva. Il bridge deve essere attivo perché i clienti vedano gli stessi valori.",
  pl: "Wszystkie firmy widzą te kontakty w Hub → Pomoc. Wpisz tutaj → Zapisz. Bridge musi działać, by klienci widzieli te same wartości.",
})}]`;
s = `${s.slice(0, idx)}${next}${s.slice(end)}`;
fs.writeFileSync(path, s);
console.log("updated admin.helpContactHint");
