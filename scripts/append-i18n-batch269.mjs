import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["nav.sidebarCollapse", L(
    "Module einklappen",
    "Collapse modules",
    "Modülleri daralt",
    "طي الوحدات",
    "Réduire les modules",
    "Contraer módulos",
    "Comprimi moduli",
    "Zwiń moduły"
  )],
  ["nav.sidebarExpand", L(
    "Module ausklappen",
    "Expand modules",
    "Modülleri genişlet",
    "فتح الوحدات",
    "Développer les modules",
    "Expandir módulos",
    "Espandi moduli",
    "Rozwiń moduły"
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
console.log(`Appended ${toAdd.length} keys`);
