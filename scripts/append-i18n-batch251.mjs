import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.confirmPingPlatform", L(
    "Plattform auffordern, Monatsdaten zu senden? Keine Steueränderung durch KI.",
    "Ask the platform to send month data? AI does not change tax.",
    "Platformdan ay verisi istenilsin mi? Yapay zeka vergi değiştirmez.",
    "طلب بيانات الشهر من المنصة؟ الذكاء الاصطناعي لا يغيّر الضريبة.",
    "Demander les données du mois à la plateforme ? L’IA ne change pas l’impôt.",
    "¿Pedir a la plataforma los datos del mes? La IA no cambia impuestos.",
    "Chiedere i dati del mese alla piattaforma? L’IA non cambia le tasse.",
    "Poprosić platformę o dane miesiąca? AI nie zmienia podatku."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
