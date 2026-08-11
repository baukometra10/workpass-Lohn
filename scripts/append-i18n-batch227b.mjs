import fs from "node:fs";
const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.loadedFromServer", L("Vom Server geladen · {name}", "Loaded from server · {name}", "Sunucudan yüklendi · {name}", "حُمِّل من الخادم · {name}", "Chargé depuis le serveur · {name}", "Cargado del servidor · {name}", "Caricato dal server · {name}", "Wczytano z serwera · {name}")],
  ["hub.loadServerFail", L("Laden vom Server fehlgeschlagen.", "Loading from server failed.", "Sunucudan yükleme başarısız.", "فشل التحميل من الخادم.", "Échec du chargement serveur.", "Falló la carga del servidor.", "Caricamento dal server non riuscito.", "Wczytywanie z serwera nie powiodło się.")],
];
const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
