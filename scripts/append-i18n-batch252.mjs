import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.monthHint", L(
    "Automatik rechnet nur den aktuellen Kalendermonat. Frühere Monate öffnen Sie manuell.",
    "Automation calculates only the current calendar month. Open earlier months manually.",
    "Otomasyon yalnızca geçerli takvim ayını hesaplar. Önceki ayları elle açın.",
    "الأتمتة تحسب الشهر التقويمي الحالي فقط. افتح الأشهر السابقة يدوياً.",
    "L’automatisation calcule uniquement le mois calendaire en cours. Ouvrez les mois précédents manuellement.",
    "La automatización calcula solo el mes calendario actual. Abra meses anteriores manualmente.",
    "L’automazione calcola solo il mese solare corrente. Aprite i mesi precedenti manualmente.",
    "Automatyzacja liczy tylko bieżący miesiąc kalendarzowy. Wcześniejsze miesiące otwórz ręcznie."
  )],
  ["portal.monthCurrent", L("Aktueller Monat", "Current month", "Geçerli ay", "الشهر الحالي", "Mois en cours", "Mes actual", "Mese corrente", "Bieżący miesiąc")],
  ["portal.monthManualOpen", L("Manuell öffnen", "Open manually", "Elle aç", "فتح يدوي", "Ouvrir manuellement", "Abrir manualmente", "Aprire manualmente", "Otwórz ręcznie")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
for (const [k, o] of extra) {
  if (!existing.has(k)) continue;
  const re = new RegExp(`(\\[\\s*${JSON.stringify(k)}\\s*,\\s*)(\\{[\\s\\S]*?\\})(\\s*\\])`);
  if (re.test(s)) s = s.replace(re, `$1${JSON.stringify(o)}$3`);
}
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
}
fs.writeFileSync(path, s);
console.log("added", filtered.length);
