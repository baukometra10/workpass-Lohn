import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["admin.jumpHelpContact", L("→ Hilfe-Kontakt", "→ Help contact", "→ Yardım iletişimi", "→ جهة اتصال المساعدة", "→ Contact d’aide", "→ Contacto de ayuda", "→ Contatto assistenza", "→ Kontakt pomocy")],
  ["admin.openHelpHub", L("Hub → Hilfe öffnen", "Open Hub → Help", "Hub → Yardım’ı aç", "فتح المركز ← مساعدة", "Ouvrir Hub → Aide", "Abrir Hub → Ayuda", "Apri Hub → Aiuto", "Otwórz Hub → Pomoc")],
  ["admin.helpContactSavedPublic", L(
    "Gespeichert – sichtbar für alle Firmen unter Hub → Hilfe.",
    "Saved – visible to all firms under Hub → Help.",
    "Kaydedildi – tüm firmalar Hub → Yardım’da görür.",
    "تم الحفظ – يظهر لجميع الشركات في المركز ← مساعدة.",
    "Enregistré – visible pour toutes les entreprises sous Hub → Aide.",
    "Guardado – visible para todas las empresas en Hub → Ayuda.",
    "Salvato – visibile a tutte le aziende in Hub → Aiuto.",
    "Zapisano – widoczne dla wszystkich firm w Hub → Pomoc."
  )],
  ["admin.helpContactSavedOffline", L(
    "Nur auf diesem Gerät gespeichert. Für Firmen/Kunden: Bridge starten, mit Admin-Konto anmelden und erneut speichern.",
    "Saved only on this device. For firms/clients: start the bridge, sign in with the Admin account, and save again.",
    "Yalnızca bu cihazda kaydedildi. Firmalar için: Bridge’i başlatın, Admin hesabıyla girin ve tekrar kaydedin.",
    "حُفظ على هذا الجهاز فقط. للعملاء: شغّل الجسر، سجّل بحساب Admin، واحفظ مجددًا.",
    "Enregistré seulement sur cet appareil. Pour les clients : démarrez le bridge, connectez-vous en Admin, enregistrez à nouveau.",
    "Guardado solo en este dispositivo. Para clientes: inicie el bridge, entre como Admin y guarde de nuevo.",
    "Salvato solo su questo dispositivo. Per i clienti: avvia il bridge, accedi come Admin e salva di nuovo.",
    "Zapisano tylko na tym urządzeniu. Dla firm: uruchom bridge, zaloguj się jako Admin i zapisz ponownie."
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
