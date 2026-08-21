import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["help.contactAdminNote", L(
    "Kontaktdaten pflegt der Accounting-Admin unter Admin → Hilfe-Kontakt.",
    "Contact details are managed by the Accounting Admin under Admin → Help contact.",
    "İletişim bilgilerini Accounting-Admin, Admin → Yardım iletişimi altında yönetir.",
    "يدير مسؤول المحاسبة جهات الاتصال من Admin ← جهة اتصال المساعدة.",
    "Les contacts sont gérés par l’Admin comptable sous Admin → Contact d’aide.",
    "Los contactos los gestiona el Admin contable en Admin → Contacto de ayuda.",
    "I contatti li gestisce l’Admin contabile in Admin → Contatto assistenza.",
    "Dane kontaktowe ustawia Admin księgowy w Admin → Kontakt pomocy."
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
