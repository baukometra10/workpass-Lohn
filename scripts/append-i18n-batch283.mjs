import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["admin.bridgeOffline", L(
    "Bridge nicht erreichbar. Offline funktioniert: Geräte-PIN + Hilfe-Kontakt speichern. Andere Buttons brauchen die Bridge (npm start).",
    "Bridge unreachable. Offline works: device PIN + save help contact. Other buttons need the bridge (npm start).",
    "Bridge’e ulaşılamıyor. Çevrimdışı: cihaz PIN + yardım iletişimi. Diğer düğmeler Bridge ister (npm start).",
    "الجسر غير متاح. دون اتصال: رمز الجهاز + حفظ جهة الاتصال. الأزرار الأخرى تحتاج الجسر (npm start).",
    "Bridge inaccessible. Hors ligne : PIN + contact d’aide. Les autres boutons nécessitent le bridge (npm start).",
    "Bridge no disponible. Sin conexión: PIN + contacto de ayuda. Otros botones requieren el bridge (npm start).",
    "Bridge non raggiungibile. Offline: PIN + contatto assistenza. Gli altri pulsanti richiedono il bridge (npm start).",
    "Bridge niedostępny. Offline: PIN + kontakt pomocy. Inne przyciski wymagają bridge (npm start)."
  )],
  ["admin.needsBridge", L(
    "Benötigt laufende Bridge (npm start) und Online-Admin-Login.",
    "Requires a running bridge (npm start) and online Admin login.",
    "Çalışan Bridge (npm start) ve çevrimiçi Admin girişi gerekir.",
    "يتطلب جسراً شغّالاً (npm start) وتسجيل Admin متصل.",
    "Nécessite un bridge démarré (npm start) et une connexion Admin en ligne.",
    "Requiere bridge en marcha (npm start) e inicio de sesión Admin en línea.",
    "Richiede bridge avviato (npm start) e login Admin online.",
    "Wymaga uruchomionego bridge (npm start) i logowania Admin online."
  )],
  ["admin.rightsOffline", L(
    "Offline – Rechte erscheinen nach Bridge-Verbindung.",
    "Offline – rights appear after the bridge connects.",
    "Çevrimdışı – haklar Bridge bağlanınca görünür.",
    "دون اتصال – تظهر الصلاحيات بعد اتصال الجسر.",
    "Hors ligne – les droits apparaissent après connexion au bridge.",
    "Sin conexión – los derechos aparecen tras conectar el bridge.",
    "Offline – i diritti compaiono dopo il collegamento al bridge.",
    "Offline – uprawnienia pojawią się po połączeniu z bridge."
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
