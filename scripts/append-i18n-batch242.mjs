import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.deliveredN", L(
    "{n} Abrechnung(en) an die Plattform geliefert.",
    "{n} payslip(s) delivered to the platform.",
    "{n} bordro platforma teslim edildi.",
    "تم تسليم {n} كشف/كشوف إلى المنصة.",
    "{n} bulletin(s) livré(s) à la plateforme.",
    "{n} nómina(s) entregada(s) a la plataforma.",
    "{n} cedolino/i consegnato/i alla piattaforma.",
    "Dostarczono {n} pasek/paski na platformę."
  )],
  ["portal.deliverFailed", L(
    "Lieferung an Plattform fehlgeschlagen – Sync erneut versuchen.",
    "Delivery to platform failed – try sync again.",
    "Platforma teslimi başarısız – sync’i tekrar deneyin.",
    "فشل التسليم إلى المنصة – أعد المزامنة.",
    "Échec de la livraison à la plateforme – relancez la sync.",
    "Falló la entrega a la plataforma – vuelva a sincronizar.",
    "Consegna alla piattaforma non riuscita – riprovare la sync.",
    "Dostawa na platformę nieudana – ponów sync."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
