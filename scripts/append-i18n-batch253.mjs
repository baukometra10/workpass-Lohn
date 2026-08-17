import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.workspaceBack", L(
    "Zum aktuellen Monat",
    "Back to current month",
    "Geçerli aya dön",
    "العودة إلى الشهر الحالي",
    "Revenir au mois en cours",
    "Volver al mes actual",
    "Torna al mese corrente",
    "Wróć do bieżącego miesiąca"
  )],
  ["portal.workspaceAutoTitle", L(
    "Arbeitsmonat {month}",
    "Working month {month}",
    "Çalışma ayı {month}",
    "شهر العمل {month}",
    "Mois de travail {month}",
    "Mes de trabajo {month}",
    "Mese di lavoro {month}",
    "Miesiąc roboczy {month}"
  )],
  ["portal.workspaceManualTitle", L(
    "Manuell geöffnet: {month}",
    "Opened manually: {month}",
    "Elle açıldı: {month}",
    "فُتح يدوياً: {month}",
    "Ouvert manuellement : {month}",
    "Abierto manualmente: {month}",
    "Aperto manualmente: {month}",
    "Otwarto ręcznie: {month}"
  )],
  ["portal.workspaceAutoHint", L(
    "Nur dieser Monat wird automatisch berechnet. Frühere Monate öffnen Sie manuell.",
    "Only this month is calculated automatically. Open earlier months manually.",
    "Yalnızca bu ay otomatik hesaplanır. Önceki ayları elle açın.",
    "يُحسب هذا الشهر فقط تلقائياً. افتح الأشهر السابقة يدوياً.",
    "Seul ce mois est calculé automatiquement. Ouvrez les mois précédents manuellement.",
    "Solo este mes se calcula automáticamente. Abra meses anteriores manualmente.",
    "Solo questo mese viene calcolato automaticamente. Aprite i mesi precedenti manualmente.",
    "Tylko ten miesiąc liczy się automatycznie. Wcześniejsze otwórz ręcznie."
  )],
  ["portal.workspaceManualHint", L(
    "Automatik läuft nur für {current}. Dieser Monat ist Archiv – nichts wird automatisch berechnet.",
    "Automation runs only for {current}. This month is archive – nothing is calculated automatically.",
    "Otomasyon yalnızca {current} için çalışır. Bu ay arşivdir – otomatik hesaplama yok.",
    "الأتمتة تعمل فقط لـ {current}. هذا الشهر أرشيف – لا يُحسب تلقائياً.",
    "L’automatisation ne tourne que pour {current}. Ce mois est une archive – aucun calcul automatique.",
    "La automatización solo corre para {current}. Este mes es archivo – no se calcula automáticamente.",
    "L’automazione gira solo per {current}. Questo mese è archivio – nessun calcolo automatico.",
    "Automatyzacja działa tylko dla {current}. Ten miesiąc to archiwum – bez automatycznego liczenia."
  )],
  ["portal.monthArchive", L("Archiv", "Archive", "Arşiv", "أرشيف", "Archive", "Archivo", "Archivio", "Archiwum")],
  ["portal.readinessHintMonth", L(
    "Bereitschaft nur für {month}: wer fertig ist, wer noch auf Stunden oder Stammdaten wartet.",
    "Readiness for {month} only: who is ready, who still waits for hours or master data.",
    "Hazırlık yalnızca {month} için: kim hazır, kim hâlâ saat veya ana veri bekliyor.",
    "الجاهزية لشهر {month} فقط: من جاهز، ومن ينتظر الساعات أو البيانات الأساسية.",
    "Préparation uniquement pour {month} : qui est prêt, qui attend encore les heures ou les données de base.",
    "Preparación solo para {month}: quién está listo, quién espera horas o datos maestros.",
    "Prontezza solo per {month}: chi è pronto, chi attende ancora ore o anagrafica.",
    "Gotowość tylko dla {month}: kto jest gotowy, kto czeka na godziny lub dane podstawowe."
  )],
  ["portal.waitHoursTitleMonth", L(
    "Warte auf Stunden · {month}",
    "Waiting for hours · {month}",
    "Saat bekleniyor · {month}",
    "بانتظار الساعات · {month}",
    "En attente des heures · {month}",
    "Esperando horas · {month}",
    "In attesa delle ore · {month}",
    "Czekam na godziny · {month}"
  )],
  ["portal.waitHoursHintArchive", L(
    "Archivmonat {month}: Stunden fehlen. Automatik rechnet nur den aktuellen Kalendermonat – hier nur nach manueller Prüfung.",
    "Archive month {month}: hours are missing. Automation only calculates the current calendar month – here only after manual review.",
    "Arşiv ayı {month}: saatler eksik. Otomasyon yalnızca geçerli takvim ayını hesaplar – burada yalnızca elle kontrol sonrası.",
    "شهر الأرشيف {month}: الساعات ناقصة. الأتمتة تحسب الشهر التقويمي الحالي فقط – هنا بعد المراجعة اليدوية فقط.",
    "Mois d’archive {month} : heures manquantes. L’automatisation ne calcule que le mois calendaire en cours – ici uniquement après contrôle manuel.",
    "Mes de archivo {month}: faltan horas. La automatización solo calcula el mes calendario actual – aquí solo tras revisión manual.",
    "Mese di archivio {month}: ore mancanti. L’automazione calcola solo il mese solare corrente – qui solo dopo controllo manuale.",
    "Miesiąc archiwalny {month}: brak godzin. Automatyzacja liczy tylko bieżący miesiąc – tutaj tylko po ręcznej kontroli."
  )],
  ["portal.autoWaitingHintMonth", L(
    "Nur {period}: WorkPass fragt nach, berechnet und sendet automatisch. Andere Monate bleiben unangetastet.",
    "Only {period}: WorkPass requests, calculates and sends automatically. Other months stay untouched.",
    "Yalnızca {period}: WorkPass sorar, hesaplar ve otomatik gönderir. Diğer aylara dokunulmaz.",
    "فقط {period}: يطلب WorkPass ويحسب ويرسل تلقائياً. الأشهر الأخرى تبقى دون تغيير.",
    "Uniquement {period} : WorkPass demande, calcule et envoie automatiquement. Les autres mois restent inchangés.",
    "Solo {period}: WorkPass pide, calcula y envía automáticamente. Los demás meses no se tocan.",
    "Solo {period}: WorkPass chiede, calcola e invia automaticamente. Gli altri mesi restano intatti.",
    "Tylko {period}: WorkPass pyta, liczy i wysyła automatycznie. Inne miesiące zostają nietknięte."
  )],
  ["portal.openSeenBadgeMonth", L(
    "{open} offen · {month} · {other} andere Monate · {seen} gesehen",
    "{open} open · {month} · {other} other months · {seen} seen",
    "{open} açık · {month} · {other} diğer ay · {seen} görüldü",
    "{open} مفتوح · {month} · {other} أشهر أخرى · {seen} تمت المشاهدة",
    "{open} ouverts · {month} · {other} autres mois · {seen} vus",
    "{open} abiertos · {month} · {other} otros meses · {seen} vistos",
    "{open} aperti · {month} · {other} altri mesi · {seen} visti",
    "{open} otwarte · {month} · {other} inne miesiące · {seen} zobaczone"
  )],
  ["portal.openOtherMonths", L(
    "{n} offene Aufträge in anderen Monaten – Archiv, nicht dieser Arbeitsmonat.",
    "{n} open requests in other months – archive, not this working month.",
    "{n} açık talep diğer aylarda – arşiv, bu çalışma ayı değil.",
    "{n} طلبات مفتوحة في أشهر أخرى – أرشيف، وليست شهر العمل هذا.",
    "{n} demandes ouvertes dans d’autres mois – archive, pas ce mois de travail.",
    "{n} solicitudes abiertas en otros meses – archivo, no este mes de trabajo.",
    "{n} richieste aperte in altri mesi – archivio, non questo mese di lavoro.",
    "{n} otwarte zlecenia w innych miesiącach – archiwum, nie ten miesiąc roboczy."
  )],
  ["portal.openDisplayMonth", L(
    "{open} offen in {month} · Anzeige {shown}",
    "{open} open in {month} · showing {shown}",
    "{open} açık · {month} · gösterilen {shown}",
    "{open} مفتوح في {month} · عرض {shown}",
    "{open} ouverts en {month} · affichage {shown}",
    "{open} abiertos en {month} · mostrando {shown}",
    "{open} aperti in {month} · visualizzati {shown}",
    "{open} otwarte w {month} · pokazano {shown}"
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
console.log("added", filtered.length);
