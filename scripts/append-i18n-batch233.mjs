import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["hub.openPayroll", L("Zur Lohnabrechnung", "Open payroll", "Bordroya git", "إلى كشوف الأجور", "Ouvrir la paie", "Ir a nómina", "Apri paghe", "Otwórz płace")],
  ["hub.openPayrollSub", L("Mitarbeiter · Sync · Freigabe · A4", "Employees · Sync · Release · A4", "Çalışan · Sync · Onay · A4", "موظفون · مزامنة · إصدار · A4", "Employés · Sync · Validation · A4", "Empleados · Sync · Liberación · A4", "Dipendenti · Sync · Rilascio · A4", "Pracownicy · Sync · Akceptacja · A4")],
  ["hub.firmQuickAccess", L("Was wollen Sie jetzt tun?", "What do you want to do now?", "Şimdi ne yapmak istersiniz?", "ماذا تريدون فعله الآن؟", "Que souhaitez-vous faire ?", "¿Qué desea hacer ahora?", "Cosa volete fare ora?", "Co chcesz teraz zrobić?")],
  ["hub.firmSyncSub", L("Plattform holen · automatisch berechnen", "Fetch platform · calculate automatically", "Platformdan al · otomatik hesapla", "جلب المنصة · حساب تلقائي", "Récupérer plateforme · calculer auto", "Traer plataforma · calcular auto", "Prendi piattaforma · calcola auto", "Pobierz platformę · licz automatycznie")],
  ["hub.firmProfile", L("Firmenprofil", "Company profile", "Firma profili", "ملف الشركة", "Profil entreprise", "Perfil de empresa", "Profilo azienda", "Profil firmy")],
  ["hub.firmProfileSub", L("Adresse, Bank, Logo", "Address, bank, logo", "Adres, banka, logo", "العنوان، البنك، الشعار", "Adresse, banque, logo", "Dirección, banco, logo", "Indirizzo, banca, logo", "Adres, bank, logo")],
  ["hub.firmHeadline", L("{name} · Lohn & Belege", "{name} · Payroll & documents", "{name} · Bordro & belgeler", "{name} · الأجور والمستندات", "{name} · Paie & pièces", "{name} · Nómina y documentos", "{name} · Paghe e documenti", "{name} · Płace i dokumenty")],
  ["hub.firmMetaQuiet", L("Monat {period} · ID {id}", "Month {period} · ID {id}", "Ay {period} · ID {id}", "الشهر {period} · المعرّف {id}", "Mois {period} · ID {id}", "Mes {period} · ID {id}", "Mese {period} · ID {id}", "Miesiąc {period} · ID {id}")],
  ["hub.outcome.platformBlocked", L("Plattform antwortet nicht", "Platform is not responding", "Platform yanıt vermiyor", "المنصة لا تستجيب", "La plateforme ne répond pas", "La plataforma no responde", "La piattaforma non risponde", "Platforma nie odpowiada")],
  ["hub.outcome.platformBlockedHint", L("Webhook auf der Plattform prüfen – danach Sync erneut starten.", "Check the webhook on the platform – then start sync again.", "Platformdaki webhook’u kontrol edin – sonra sync’i yeniden başlatın.", "افحص Webhook على المنصة – ثم أعد المزامنة.", "Vérifiez le webhook plateforme – puis relancez la sync.", "Revise el webhook en la plataforma – luego reinicie sync.", "Controlla il webhook sulla piattaforma – poi riavvia la sync.", "Sprawdź webhook na platformie – potem uruchom sync.")],
  ["hub.outcome.needsSync", L("Bereit für den ersten Sync", "Ready for the first sync", "İlk sync için hazır", "جاهز لأول مزامنة", "Prêt pour la première sync", "Listo para la primera sync", "Pronto per la prima sync", "Gotowe do pierwszego sync")],
  ["hub.outcome.needsSyncHint", L("Tippen Sie auf „Jetzt synchronisieren“ – WorkPass holt Ihre Mitarbeiter automatisch.", "Tap “Sync now” – WorkPass fetches your employees automatically.", "“Şimdi senkronize et”e dokunun – WorkPass çalışanlarınızı otomatik alır.", "اضغط «زامن الآن» – WorkPass يجلب موظفيكم تلقائياً.", "Appuyez sur « Synchroniser » – WorkPass récupère vos employés.", "Pulse «Sincronizar ahora» – WorkPass trae a sus empleados.", "Tocca «Sincronizza ora» – WorkPass recupera i dipendenti.", "Kliknij «Synchronizuj teraz» – WorkPass pobierze pracowników.")],
  ["hub.outcome.waiting", L("Wartet auf Plattformdaten", "Waiting for platform data", "Platform verisi bekleniyor", "بانتظار بيانات المنصة", "En attente des données plateforme", "Esperando datos de plataforma", "In attesa dei dati piattaforma", "Oczekiwanie na dane platformy")],
  ["hub.outcome.waitingHint", L("{n} offene Nachricht(en) · Monat {period} läuft weiter für vollständige Personen.", "{n} open message(s) · month {period} continues for complete people.", "{n} açık mesaj · {period} ayı eksiksiz kişiler için devam eder.", "{n} رسالة مفتوحة · الشهر {period} يستمر للأشخاص المكتملين.", "{n} message(s) ouvert(s) · le mois {period} continue pour les dossiers complets.", "{n} mensaje(s) abierto(s) · el mes {period} sigue para personas completas.", "{n} messaggio/i aperti · il mese {period} continua per le persone complete.", "{n} otwartych wiadomości · miesiąc {period} trwa dla kompletnych osób.")],
  ["hub.outcome.done", L("Alles bereit für diesen Monat", "Everything ready for this month", "Bu ay için her şey hazır", "كل شيء جاهز لهذا الشهر", "Tout est prêt pour ce mois", "Todo listo para este mes", "Tutto pronto per questo mese", "Wszystko gotowe na ten miesiąc")],
  ["hub.outcome.doneHint", L("{released} Abrechnung(en) freigegeben · Monat {period}", "{released} payslip(s) released · month {period}", "{released} bordro onaylandı · ay {period}", "{released} كشف/كشوف صادرة · الشهر {period}", "{released} bulletin(s) validé(s) · mois {period}", "{released} nómina(s) liberada(s) · mes {period}", "{released} cedolino/i rilasciati · mese {period}", "{released} rozliczeń zatwierdzonych · miesiąc {period}")],
  ["hub.outcome.active", L("Lohnlauf aktiv", "Payroll run active", "Bordro süreci aktif", "تشغيل الأجور نشط", "Paie en cours", "Nómina activa", "Ciclo paghe attivo", "Cykl płac aktywny")],
  ["hub.outcome.activeHint", L("{employees} Mitarbeiter · {released} freigegeben · Monat {period}", "{employees} employees · {released} released · month {period}", "{employees} çalışan · {released} onaylı · ay {period}", "{employees} موظف · {released} صادر · الشهر {period}", "{employees} employés · {released} validés · mois {period}", "{employees} empleados · {released} liberados · mes {period}", "{employees} dipendenti · {released} rilasciati · mese {period}", "{employees} pracowników · {released} zatwierdzonych · miesiąc {period}")],
  ["hub.outcome.offline", L("Verbindung wird geprüft", "Checking connection", "Bağlantı kontrol ediliyor", "جارٍ فحص الاتصال", "Vérification de la connexion", "Comprobando conexión", "Verifica connessione", "Sprawdzanie połączenia")],
  ["hub.outcome.offlineHint", L("Kurz warten oder später erneut öffnen.", "Please wait a moment or reopen later.", "Kısaca bekleyin veya sonra yeniden açın.", "انتظر قليلاً أو افتح لاحقاً.", "Patientez un instant ou rouvrez plus tard.", "Espere un momento o vuelva a abrir después.", "Attendi un momento o riapri più tardi.", "Poczekaj chwilę lub otwórz ponownie później.")],
  ["portal.statusEyebrow", L("Abrechnungsstatus", "Payroll status", "Bordro durumu", "حالة كشف الأجور", "Statut de paie", "Estado de nómina", "Stato paghe", "Status płac")],
  ["portal.outcome.gapsHint", L("{n} offene Punkte · WorkPass fragt die Plattform gezielt nach.", "{n} open items · WorkPass asks the platform specifically.", "{n} açık madde · WorkPass platformdan hedefli ister.", "{n} نقاط مفتوحة · WorkPass يطلب من المنصة بشكل موجّه.", "{n} points ouverts · WorkPass interroge la plateforme.", "{n} puntos abiertos · WorkPass pide a la plataforma.", "{n} punti aperti · WorkPass chiede alla piattaforma.", "{n} otwartych punktów · WorkPass pyta platformę.")],
  ["portal.openPeople", L("{n} brauchen Daten", "{n} need data", "{n} veri bekliyor", "{n} يحتاجون بيانات", "{n} ont besoin de données", "{n} necesitan datos", "{n} servono dati", "{n} potrzebuje danych")],
  ["portal.noOpenShort", L("Keine", "None", "Yok", "لا شيء", "Aucun", "Ninguno", "Nessuno", "Brak")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
