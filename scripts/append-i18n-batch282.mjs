import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["auth.adminOfflineHint", L(
    "Bridge offline – Admin mit Geräte-PIN entsperren. Hilfe-Kontakt lokal speichern; für Server-Aktionen Bridge starten und mit Admin-Konto anmelden.",
    "Bridge offline – unlock Admin with device PIN. Save help contact locally; start the bridge and sign in with the Admin account for server actions.",
    "Bridge çevrimdışı – Admin’i cihaz PIN’i ile açın. Yardım iletişimini yerel kaydedin; sunucu işlemleri için Bridge’i başlatıp Admin hesabıyla giriş yapın.",
    "الجسر غير متصل – افتح Admin برمز الجهاز. احفظ جهة اتصال المساعدة محليًا؛ لعمليات الخادم شغّل الجسر وسجّل بحساب Admin.",
    "Bridge hors ligne – déverrouillez Admin avec le code PIN. Enregistrez le contact d’aide en local ; démarrez le bridge et connectez-vous en Admin pour le serveur.",
    "Bridge sin conexión – desbloquee Admin con el PIN. Guarde el contacto de ayuda en local; inicie el bridge e inicie sesión Admin para el servidor.",
    "Bridge offline – sblocca Admin con PIN dispositivo. Salva il contatto assistenza in locale; avvia il bridge e accedi come Admin per il server.",
    "Bridge offline – odblokuj Admin kodem PIN. Zapisz kontakt pomocy lokalnie; uruchom bridge i zaloguj się jako Admin do serwera."
  )],
  ["auth.adminBridgeDown", L(
    "Bridge nicht erreichbar – Tab „Geräte-PIN“ nutzen.",
    "Bridge unreachable – use the Device PIN tab.",
    "Bridge’e ulaşılamıyor – Cihaz PIN sekmesini kullanın.",
    "الجسر غير متاح – استخدم تبويب رمز الجهاز.",
    "Bridge inaccessible – utilisez l’onglet code PIN.",
    "Bridge no disponible – use la pestaña PIN.",
    "Bridge non raggiungibile – usa la scheda PIN.",
    "Bridge niedostępny – użyj karty PIN."
  )],
  ["admin.offlineMode", L(
    "Offline-Admin (Geräte-PIN). Hilfe-Kontakt lokal speicherbar. Bridge starten + Admin-Konto für Server-Aktionen.",
    "Offline Admin (device PIN). Help contact can be saved locally. Start the bridge + Admin account for server actions.",
    "Çevrimdışı Admin (cihaz PIN). Yardım iletişimi yerel kaydedilebilir. Sunucu için Bridge + Admin hesabı.",
    "Admin دون اتصال (رمز الجهاز). يمكن حفظ جهة اتصال المساعدة محليًا. للخادم: شغّل الجسر + حساب Admin.",
    "Admin hors ligne (PIN). Contact d’aide enregistrable en local. Bridge + compte Admin pour le serveur.",
    "Admin sin conexión (PIN). Contacto de ayuda se guarda en local. Bridge + cuenta Admin para el servidor.",
    "Admin offline (PIN). Contatto assistenza salvabile in locale. Bridge + account Admin per il server.",
    "Admin offline (PIN). Kontakt pomocy można zapisać lokalnie. Bridge + konto Admin do serwera."
  )],
  ["admin.helpContactSavedOffline", L(
    "Hilfe-Kontakt lokal gespeichert (Bridge offline). Hub zeigt die Werte auf diesem Gerät.",
    "Help contact saved locally (bridge offline). Hub shows the values on this device.",
    "Yardım iletişimi yerel kaydedildi (Bridge çevrimdışı). Hub bu cihazdaki değerleri gösterir.",
    "تم حفظ جهة اتصال المساعدة محليًا (الجسر غير متصل). المركز يعرض القيم على هذا الجهاز.",
    "Contact d’aide enregistré en local (bridge hors ligne). Le Hub affiche les valeurs sur cet appareil.",
    "Contacto de ayuda guardado en local (bridge sin conexión). El Hub muestra los valores en este dispositivo.",
    "Contatto assistenza salvato in locale (bridge offline). L’Hub mostra i valori su questo dispositivo.",
    "Kontakt pomocy zapisany lokalnie (bridge offline). Hub pokazuje wartości na tym urządzeniu."
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
