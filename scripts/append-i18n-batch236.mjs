import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["sync.chipReady", L("Bereit", "Ready", "Hazır", "جاهز", "Prêt", "Listo", "Pronto", "Gotowe")],
  ["sync.chipHours", L("Stunden", "Hours", "Saat", "ساعات", "Heures", "Horas", "Ore", "Godziny")],
  ["sync.chipSv", L("SV", "SV", "SV", "SV", "SV", "SV", "SV", "SV")],
  ["sync.chipKk", L("KK", "KK", "KK", "KK", "KK", "KK", "KK", "KK")],
  ["sync.chipWait", L("Wartet", "Waiting", "Bekliyor", "بانتظار", "En attente", "En espera", "In attesa", "Czeka")],
  ["sync.waitingHoursShort", L("warten auf Stunden", "waiting for hours", "saat bekleniyor", "بانتظار الساعات", "attendent les heures", "esperan horas", "attendono ore", "czekają na godziny")],
  ["sync.readyShort", L("bereit", "ready", "hazır", "جاهز", "prêts", "listos", "pronti", "gotowe")],
  ["portal.hoursWaitingHint", L("Stundenlohn ist da – die Plattform muss noch die Monatsstunden senden. Brutto = Stunden × Stundenlohn.", "Hourly rate is set – the platform still needs to send monthly hours. Gross = hours × rate.", "Saat ücreti var – platform aylık saatleri göndermeli. Brüt = saat × ücret.", "أجر الساعة موجود – يجب أن ترسل المنصة ساعات الشهر. الإجمالي = ساعات × الأجر.", "Le taux horaire est là – la plateforme doit encore envoyer les heures du mois. Brut = heures × taux.", "La tarifa horaria está – la plataforma aún debe enviar las horas del mes. Bruto = horas × tarifa.", "La tariffa oraria c’è – la piattaforma deve ancora inviare le ore del mese. Lordo = ore × tariffa.", "Stawka godzinowa jest – platforma musi jeszcze wysłać godziny miesiąca. Brutto = godziny × stawka.")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
