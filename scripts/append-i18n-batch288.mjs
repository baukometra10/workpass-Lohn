import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.adminOpenContacts", L(
    "Hilfe-Kontakt & Admin öffnen",
    "Open help contact & Admin",
    "Yardım iletişimi ve Admin’i aç",
    "فتح جهة اتصال المساعدة وAdmin",
    "Ouvrir contact d’aide et Admin",
    "Abrir contacto de ayuda y Admin",
    "Apri contatto assistenza e Admin",
    "Otwórz kontakt pomocy i Admin"
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
