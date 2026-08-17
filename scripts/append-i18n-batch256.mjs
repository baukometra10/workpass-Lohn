import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.exportHint", L(
    "SEPA / DATEV / LODAS / ELSTER – LStB über Sidecar; ohne Kanal nur lokal bereit, nicht beim Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStB via sidecar; without a channel the job stays local, not at the tax office.",
    "SEPA / DATEV / LODAS / ELSTER – LStB sidecar ile; kanal yoksa iş yerel kalır, Finanzamt’te değil.",
    "SEPA / DATEV / LODAS / ELSTER – LStB عبر Sidecar؛ بدون قناة يبقى الطلب محليًا وليس عند Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStB via sidecar ; sans canal le dossier reste local, pas au Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStB vía sidecar; sin canal el encargo queda local, no en el Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStB via sidecar; senza canale resta locale, non al Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStB przez sidecar; bez kanału zlecenie zostaje lokalnie, nie w Finanzamt."
  )],
  ["portal.elsterAuto", L(
    "Automatisch an den ELSTER-Kanal senden, sobald der Monat fertig ist (nicht das Finanzamt)",
    "Automatically send to the ELSTER channel when the month is ready (not the tax office)",
    "Ay hazır olunca otomatik ELSTER kanalına gönder (Finanzamt değil)",
    "أرسل تلقائيًا إلى قناة ELSTER عند جاهزية الشهر (وليس Finanzamt)",
    "Envoyer automatiquement au canal ELSTER dès que le mois est prêt (pas le Finanzamt)",
    "Enviar automáticamente al canal ELSTER cuando el mes esté listo (no el Finanzamt)",
    "Invia automaticamente al canale ELSTER a mese pronto (non il Finanzamt)",
    "Automatycznie wyślij na kanał ELSTER, gdy miesiąc jest gotowy (nie Finanzamt)"
  )],
  ["portal.elsterSubmitConfirm", L(
    "LStB-XML mit hinterlegtem Zertifikat an den ELSTER-Kanal übermitteln. Ohne Sidecar bleibt der Auftrag lokal — nicht beim Finanzamt.",
    "Send LStB XML with the stored certificate to the ELSTER channel. Without a sidecar the job stays local — not at the tax office.",
    "Kayıtlı sertifika ile LStB-XML’i ELSTER kanalına gönderin. Sidecar yoksa iş yerel kalır — Finanzamt’te değil.",
    "أرسل LStB-XML بالشهادة المخزّنة إلى قناة ELSTER. بدون Sidecar يبقى الطلب محليًا — ليس عند Finanzamt.",
    "Transmettre le LStB-XML avec le certificat enregistré au canal ELSTER. Sans sidecar le dossier reste local — pas au Finanzamt.",
    "Enviar el LStB-XML con el certificado guardado al canal ELSTER. Sin sidecar el encargo queda local — no en el Finanzamt.",
    "Invia LStB-XML con il certificato salvato al canale ELSTER. Senza sidecar resta locale — non al Finanzamt.",
    "Wyślij LStB-XML z zapisanym certyfikatem na kanał ELSTER. Bez sidecar zlecenie zostaje lokalnie — nie w Finanzamt."
  )],
  ["portal.elsterChannelOff", L(
    "ELSTER-Kanal aus — Aufträge bleiben lokal (nicht beim Finanzamt).",
    "ELSTER channel off — jobs stay local (not at the tax office).",
    "ELSTER kanalı kapalı — işler yerel kalır (Finanzamt’te değil).",
    "قناة ELSTER متوقفة — تبقى الطلبات محلية (ليست عند Finanzamt).",
    "Canal ELSTER désactivé — les dossiers restent locaux (pas au Finanzamt).",
    "Canal ELSTER desactivado — los encargos quedan locales (no en el Finanzamt).",
    "Canale ELSTER spento — i lavori restano locali (non al Finanzamt).",
    "Kanał ELSTER wyłączony — zlecenia zostają lokalnie (nie w Finanzamt)."
  )],
  ["portal.elsterChannelOn", L(
    "ELSTER-Kanal verbunden ({mode}).",
    "ELSTER channel connected ({mode}).",
    "ELSTER kanalı bağlı ({mode}).",
    "قناة ELSTER متصلة ({mode}).",
    "Canal ELSTER connecté ({mode}).",
    "Canal ELSTER conectado ({mode}).",
    "Canale ELSTER collegato ({mode}).",
    "Kanał ELSTER połączony ({mode})."
  )],
  ["portal.elsterTestMode", L(
    "Testmodus (Testmerker 700000004) — nicht das Finanzamt.",
    "Test mode (Testmerker 700000004) — not the tax office.",
    "Test modu (Testmerker 700000004) — Finanzamt değil.",
    "وضع الاختبار (Testmerker 700000004) — ليس Finanzamt.",
    "Mode test (Testmerker 700000004) — pas le Finanzamt.",
    "Modo test (Testmerker 700000004) — no es el Finanzamt.",
    "Modalità test (Testmerker 700000004) — non il Finanzamt.",
    "Tryb testowy (Testmerker 700000004) — nie Finanzamt."
  )],
  ["portal.elsterLiveMode", L(
    "Produktivmodus (WORKPASS_ELSTER_TEST=0).",
    "Live mode (WORKPASS_ELSTER_TEST=0).",
    "Canlı mod (WORKPASS_ELSTER_TEST=0).",
    "وضع الإنتاج (WORKPASS_ELSTER_TEST=0).",
    "Mode productif (WORKPASS_ELSTER_TEST=0).",
    "Modo productivo (WORKPASS_ELSTER_TEST=0).",
    "Modalità produttiva (WORKPASS_ELSTER_TEST=0).",
    "Tryb produkcyjny (WORKPASS_ELSTER_TEST=0)."
  )],
  ["portal.elsterBadgeOn", L(
    "ELSTER-Kanal an",
    "ELSTER channel on",
    "ELSTER kanalı açık",
    "قناة ELSTER تعمل",
    "Canal ELSTER actif",
    "Canal ELSTER activo",
    "Canale ELSTER attivo",
    "Kanał ELSTER włączony"
  )],
  ["portal.elsterBadgeOff", L(
    "ELSTER-Kanal aus",
    "ELSTER channel off",
    "ELSTER kanalı kapalı",
    "قناة ELSTER متوقفة",
    "Canal ELSTER inactif",
    "Canal ELSTER inactivo",
    "Canale ELSTER spento",
    "Kanał ELSTER wyłączony"
  )],
  ["portal.elsterStatusPending", L(
    "Bereit lokal — nicht beim Finanzamt",
    "Ready locally — not at the tax office",
    "Yerelde hazır — Finanzamt’te değil",
    "جاهز محليًا — ليس عند Finanzamt",
    "Prêt en local — pas au Finanzamt",
    "Listo en local — no en el Finanzamt",
    "Pronto in locale — non al Finanzamt",
    "Gotowe lokalnie — nie w Finanzamt"
  )],
  ["portal.elsterStatusProcessing", L(
    "Wird an den Kanal gesendet",
    "Sending to the channel",
    "Kanala gönderiliyor",
    "جارٍ الإرسال إلى القناة",
    "Envoi vers le canal",
    "Enviando al canal",
    "Invio al canale",
    "Wysyłanie na kanał"
  )],
  ["portal.elsterStatusSent", L(
    "An ELSTER-Kanal übergeben",
    "Handed to the ELSTER channel",
    "ELSTER kanalına iletildi",
    "سُلِّم إلى قناة ELSTER",
    "Remis au canal ELSTER",
    "Entregado al canal ELSTER",
    "Consegnato al canale ELSTER",
    "Przekazano na kanał ELSTER"
  )],
  ["portal.elsterStatusCompleted", L(
    "An ELSTER-Kanal übergeben",
    "Handed to the ELSTER channel",
    "ELSTER kanalına iletildi",
    "سُلِّم إلى قناة ELSTER",
    "Remis au canal ELSTER",
    "Entregado al canal ELSTER",
    "Consegnato al canale ELSTER",
    "Przekazano na kanał ELSTER"
  )],
  ["portal.elsterStatusFailed", L(
    "Senden fehlgeschlagen",
    "Send failed",
    "Gönderim başarısız",
    "فشل الإرسال",
    "Échec de l’envoi",
    "Envío fallido",
    "Invio non riuscito",
    "Wysyłka nieudana"
  )],
  ["portal.elsterSubmissionsEmpty", L(
    "Noch keine ELSTER-Aufträge.",
    "No ELSTER jobs yet.",
    "Henüz ELSTER işi yok.",
    "لا توجد طلبات ELSTER بعد.",
    "Pas encore de dossiers ELSTER.",
    "Aún no hay encargos ELSTER.",
    "Nessun lavoro ELSTER ancora.",
    "Brak zleceń ELSTER."
  )],
  ["portal.elsterSubmissionsHead", L(
    "ELSTER-Aufträge",
    "ELSTER jobs",
    "ELSTER işleri",
    "طلبات ELSTER",
    "Dossiers ELSTER",
    "Encargos ELSTER",
    "Lavori ELSTER",
    "Zlecenia ELSTER"
  )],
  ["portal.elsterSubmissionsFail", L(
    "ELSTER-Aufträge konnten nicht geladen werden.",
    "Could not load ELSTER jobs.",
    "ELSTER işleri yüklenemedi.",
    "تعذر تحميل طلبات ELSTER.",
    "Impossible de charger les dossiers ELSTER.",
    "No se pudieron cargar los encargos ELSTER.",
    "Impossibile caricare i lavori ELSTER.",
    "Nie udało się wczytać zleceń ELSTER."
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
