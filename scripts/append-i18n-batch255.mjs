import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.certSummaryHead", L(
    "Jahresübersicht {year}: {n} Mitarbeiter mit freigegebenen Monaten",
    "Year overview {year}: {n} employees with released months",
    "Yıl özeti {year}: {n} onaylı aylı çalışan",
    "نظرة سنوية {year}: {n} موظف بشهور معتمدة",
    "Vue annuelle {year} : {n} employés avec mois validés",
    "Resumen {year}: {n} empleados con meses liberados",
    "Panoramica {year}: {n} dipendenti con mesi rilasciati",
    "Przegląd {year}: {n} pracowników z zatwierdzonymi miesiącami"
  )],
  ["portal.certSummaryLoading", L(
    "Jahresübersicht wird geladen…",
    "Loading year overview…",
    "Yıl özeti yükleniyor…",
    "جارٍ تحميل النظرة السنوية…",
    "Chargement de la vue annuelle…",
    "Cargando resumen anual…",
    "Caricamento panoramica annuale…",
    "Ładowanie przeglądu rocznego…"
  )],
  ["portal.certSummaryFail", L(
    "Jahresübersicht konnte nicht geladen werden.",
    "Could not load year overview.",
    "Yıl özeti yüklenemedi.",
    "تعذر تحميل النظرة السنوية.",
    "Impossible de charger la vue annuelle.",
    "No se pudo cargar el resumen anual.",
    "Impossibile caricare la panoramica annuale.",
    "Nie udało się wczytać przeglądu rocznego."
  )],
  ["portal.certSummaryOk", L(
    "Jahresübersicht: {n} Mitarbeiter",
    "Year overview: {n} employees",
    "Yıl özeti: {n} çalışan",
    "نظرة سنوية: {n} موظف",
    "Vue annuelle : {n} employés",
    "Resumen anual: {n} empleados",
    "Panoramica annuale: {n} dipendenti",
    "Przegląd roczny: {n} pracowników"
  )],
  ["portal.certSummaryMissing", L(
    "Jahresübersicht-Bereich nicht gefunden.",
    "Year overview section not found.",
    "Yıl özeti alanı bulunamadı.",
    "لم يُعثر على قسم النظرة السنوية.",
    "Section vue annuelle introuvable.",
    "No se encontró la sección de resumen anual.",
    "Sezione panoramica annuale non trovata.",
    "Nie znaleziono sekcji przeglądu rocznego."
  )],
  ["portal.needCompany", L(
    "Firmen-ID fehlt. Bitte anmelden oder Firma wählen.",
    "Company ID missing. Please sign in or select a company.",
    "Firma kimliği eksik. Lütfen giriş yapın veya firma seçin.",
    "معرّف الشركة ناقص. يُرجى تسجيل الدخول أو اختيار شركة.",
    "ID entreprise manquant. Connectez-vous ou choisissez une entreprise.",
    "Falta el ID de empresa. Inicie sesión o elija una empresa.",
    "Manca l’ID azienda. Accedi o seleziona un’azienda.",
    "Brak ID firmy. Zaloguj się lub wybierz firmę."
  )],
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
console.log("added", filtered.length, "updated", extra.length - filtered.length);
