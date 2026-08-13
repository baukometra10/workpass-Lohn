import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.autoReleased", L(
    "Abrechnung sofort an die Plattform gesendet.",
    "Payslip sent to the platform immediately.",
    "Bordro hemen platforma gönderildi.",
    "تم إرسال كشف الراتب إلى المنصة فوراً.",
    "Bulletin envoyé immédiatement à la plateforme.",
    "Nómina enviada a la plataforma de inmediato.",
    "Cedolino inviato subito alla piattaforma.",
    "Pasek wysłany natychmiast na platformę."
  )],
  ["portal.autoReleasedN", L(
    "{n} Abrechnung(en) an die Plattform gesendet.",
    "{n} payslip(s) sent to the platform.",
    "{n} bordro platforma gönderildi.",
    "تم إرسال {n} كشف/كشوف إلى المنصة.",
    "{n} bulletin(s) envoyé(s) à la plateforme.",
    "{n} nómina(s) enviada(s) a la plataforma.",
    "{n} cedolino/i inviato/i alla piattaforma.",
    "Wysłano {n} pasek/paski na platformę."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
