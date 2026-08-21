import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.sub.helpShort", L(
    "Dokumentation & Kontakt",
    "Documentation & contact",
    "Dokümantasyon ve iletişim",
    "التوثيق والاتصال",
    "Documentation et contact",
    "Documentación y contacto",
    "Documentazione e contatto",
    "Dokumentacja i kontakt"
  )],
  ["hub.sub.companyShort", L(
    "Stammdaten",
    "Master data",
    "Ana veriler",
    "البيانات الأساسية",
    "Données de base",
    "Datos maestros",
    "Anagrafica",
    "Dane podstawowe"
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
