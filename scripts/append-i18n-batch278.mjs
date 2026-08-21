import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.checkClickHint", L(
    "Klicken, um das Feld zu öffnen",
    "Click to open the field",
    "Alana gitmek için tıklayın",
    "انقر لفتح الحقل",
    "Cliquer pour ouvrir le champ",
    "Clic para abrir el campo",
    "Clic per aprire il campo",
    "Kliknij, aby otworzyć pole"
  )],
  ["co.saveLocalOnly", L(
    "Gespeichert · lokal auf diesem Gerät.",
    "Saved · locally on this device.",
    "Kaydedildi · bu cihazda yerel.",
    "تم الحفظ · محليًا على هذا الجهاز.",
    "Enregistré · localement sur cet appareil.",
    "Guardado · localmente en este dispositivo.",
    "Salvato · in locale su questo dispositivo.",
    "Zapisano · lokalnie na tym urządzeniu."
  )],
  ["co.saveLocalServer", L(
    "Gespeichert · lokal und auf dem Server.",
    "Saved · locally and on the server.",
    "Kaydedildi · yerel ve sunucuda.",
    "تم الحفظ · محليًا وعلى الخادم.",
    "Enregistré · en local et sur le serveur.",
    "Guardado · local y en el servidor.",
    "Salvato · in locale e sul server.",
    "Zapisano · lokalnie i na serwerze."
  )],
  ["co.saveLocalServerLogoLocal", L(
    "Gespeichert · lokal + Server (Logo nur lokal – zu groß).",
    "Saved · local + server (logo local only – too large).",
    "Kaydedildi · yerel + sunucu (logo yalnızca yerel – çok büyük).",
    "تم الحفظ · محلي + خادم (الشعار محلي فقط – كبير جدًا).",
    "Enregistré · local + serveur (logo local uniquement – trop volumineux).",
    "Guardado · local + servidor (logo solo local – demasiado grande).",
    "Salvato · locale + server (logo solo locale – troppo grande).",
    "Zapisano · lokalnie + serwer (logo tylko lokalnie – za duże)."
  )],
  ["co.saveLocalServerFail", L(
    "Lokal gespeichert · Server: {err}",
    "Saved locally · Server: {err}",
    "Yerel kaydedildi · Sunucu: {err}",
    "حُفظ محليًا · الخادم: {err}",
    "Enregistré en local · Serveur : {err}",
    "Guardado local · Servidor: {err}",
    "Salvato in locale · Server: {err}",
    "Zapisano lokalnie · Serwer: {err}"
  )],
  ["co.syncFailedShort", L(
    "Sync fehlgeschlagen",
    "Sync failed",
    "Sync başarısız",
    "فشلت المزامنة",
    "Échec de la sync",
    "Error de sync",
    "Sync non riuscita",
    "Sync nieudany"
  )],
  ["co.syncNeedsLogin", L(
    "Firmen-Login nötig, um mit dem Server zu synchronisieren.",
    "Company login required to sync with the server.",
    "Sunucuyla senkron için firma girişi gerekli.",
    "يلزم دخول الشركة للمزامنة مع الخادم.",
    "Connexion entreprise requise pour synchroniser.",
    "Se requiere acceso de empresa para sincronizar.",
    "Serve login aziendale per sincronizzare.",
    "Wymagane logowanie firmy do synchronizacji."
  )],
  ["co.syncDone", L(
    "Synchronisiert · Profil aktualisiert.",
    "Synced · profile updated.",
    "Senkronize · profil güncellendi.",
    "تمت المزامنة · تم تحديث الملف.",
    "Synchronisé · profil mis à jour.",
    "Sincronizado · perfil actualizado.",
    "Sincronizzato · profilo aggiornato.",
    "Zsynchronizowano · profil zaktualizowany."
  )],
];

const existing = new Set([
  ...[...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1]),
]);
const toAdd = extra.filter(([k]) => !existing.has(k));
if (!toAdd.length) {
  console.log("nothing to add");
  process.exit(0);
}
const block = toAdd.map(([key, loc]) => {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
  return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
}).join(",\n");
s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
fs.writeFileSync(path, s);
console.log("added", toAdd.map(([k]) => k).join(", "));
