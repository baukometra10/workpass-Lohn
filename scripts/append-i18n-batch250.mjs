import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.gobdAudit", L("Prüfprotokoll anzeigen", "Show audit log", "Denetim kaydını göster", "عرض سجل الفحص", "Afficher le journal", "Mostrar registro", "Mostra registro", "Pokaż protokół")],
  ["portal.gobdSync", L("Zustell-Status", "Delivery status", "Teslim durumu", "حالة التسليم", "Statut livraison", "Estado de entrega", "Stato consegna", "Status dostawy")],
  ["portal.gobdAuditDone", L("Prüfprotokoll geladen.", "Audit log loaded.", "Denetim yüklendi.", "تم تحميل سجل الفحص.", "Journal chargé.", "Registro cargado.", "Registro caricato.", "Protokół wczytany.")],
  ["portal.gobdSyncDone", L("Zustell-Status geladen.", "Delivery status loaded.", "Teslim durumu yüklendi.", "تم تحميل حالة التسليم.", "Statut livraison chargé.", "Estado de entrega cargado.", "Stato consegna caricato.", "Status dostawy wczytany.")],
  ["portal.auditTitle", L("Prüfprotokoll", "Audit log", "Denetim kaydı", "سجل الفحص", "Journal d’audit", "Registro de auditoría", "Registro di audit", "Protokół kontroli")],
  ["portal.auditCount", L("{n} Einträge", "{n} entries", "{n} kayıt", "{n} إدخالات", "{n} entrées", "{n} entradas", "{n} voci", "{n} wpisów")],
  ["portal.auditChainOk", L("Protokollkette in Ordnung", "Log chain OK", "Kayıt zinciri tamam", "سلسلة السجل سليمة", "Chaîne OK", "Cadena OK", "Catena OK", "Łańcuch OK")],
  ["portal.auditChainBad", L("Protokollkette prüfen", "Check log chain", "Kayıt zincirini kontrol et", "تحقق من سلسلة السجل", "Vérifier la chaîne", "Revisar cadena", "Controllare catena", "Sprawdź łańcuch")],
  ["portal.auditEmpty", L("Noch keine Vorgänge für diese Firma.", "No events for this company yet.", "Bu firma için henüz işlem yok.", "لا أحداث لهذه الشركة بعد.", "Pas encore d’événements.", "Aún no hay eventos.", "Ancora nessun evento.", "Brak zdarzeń dla firmy.")],
  ["portal.auditBy", L("von", "by", "yapan", "بواسطة", "par", "por", "da", "przez")],
  ["portal.opPayrollCreated", L("Abrechnung erstellt", "Payslip created", "Bordro oluşturuldu", "تم إنشاء الكشف", "Bulletin créé", "Nómina creada", "Cedolino creato", "Pasek utworzony")],
  ["portal.opPayrollUpdated", L("Abrechnung aktualisiert", "Payslip updated", "Bordro güncellendi", "تم تحديث الكشف", "Bulletin mis à jour", "Nómina actualizada", "Cedolino aggiornato", "Pasek zaktualizowany")],
  ["portal.opPayrollCorrected", L("Abrechnung korrigiert", "Payslip corrected", "Bordro düzeltildi", "تم تصحيح الكشف", "Bulletin corrigé", "Nómina corregida", "Cedolino corretto", "Pasek skorygowany")],
  ["portal.opRevisionArchived", L("Original archiviert (vor Korrektur)", "Original archived (before correction)", "Orijinal arşivlendi", "أُرشف الأصل قبل التصحيح", "Original archivé", "Original archivado", "Originale archiviato", "Oryginał zarchiwizowany")],
  ["portal.opSyncStatus", L("Zustell-Status geändert", "Delivery status changed", "Teslim durumu değişti", "تغيرت حالة التسليم", "Statut livraison modifié", "Estado de entrega cambiado", "Stato consegna cambiato", "Zmieniono status dostawy")],
  ["portal.opInvoiceRevision", L("Rechnung archiviert (vor Korrektur)", "Invoice archived (before correction)", "Fatura arşivlendi", "أُرشفت الفاتورة قبل التصحيح", "Facture archivée", "Factura archivada", "Fattura archiviata", "Faktura zarchiwizowana")],
  ["portal.opGeneric", L("Vorgang", "Event", "İşlem", "عملية", "Opération", "Operación", "Operazione", "Operacja")],
  ["portal.srcUser", L("Mensch in WorkPass", "Human in WorkPass", "WorkPass’te insan", "إنسان في WorkPass", "Humain dans WorkPass", "Humano en WorkPass", "Umano in WorkPass", "Człowiek w WorkPass")],
  ["portal.srcApi", L("API / Schnittstelle", "API / interface", "API / arayüz", "API / واجهة", "API / interface", "API / interfaz", "API / interfaccia", "API / interfejs")],
  ["portal.srcJob", L("Hintergrund-Job", "Background job", "Arka plan işi", "مهمة خلفية", "Tâche d’arrière-plan", "Trabajo en segundo plano", "Job in background", "Zadanie w tle")],
  ["portal.srcPlatform", L("Plattform SUPPIX", "SUPPIX platform", "SUPPIX platformu", "منصة SUPPIX", "Plateforme SUPPIX", "Plataforma SUPPIX", "Piattaforma SUPPIX", "Platforma SUPPIX")],
  ["portal.srcSystem", L("System", "System", "Sistem", "النظام", "Système", "Sistema", "Sistema", "System")],
  ["portal.stPending", L("Wartend", "Pending", "Bekliyor", "قيد الانتظار", "En attente", "Pendiente", "In attesa", "Oczekuje")],
  ["portal.stProcessing", L("In Bearbeitung", "Processing", "İşleniyor", "قيد المعالجة", "En cours", "En proceso", "In elaborazione", "W toku")],
  ["portal.stCompleted", L("Erledigt", "Completed", "Tamam", "مكتمل", "Terminé", "Completado", "Completato", "Ukończono")],
  ["portal.stFailed", L("Fehlgeschlagen", "Failed", "Başarısız", "فشل", "Échoué", "Fallido", "Non riuscito", "Nieudane")],
  ["portal.stRetrying", L("Wird erneut versucht", "Retrying", "Yeniden deneniyor", "إعادة المحاولة", "Nouvel essai", "Reintentando", "Nuovo tentativo", "Ponawiane")],
  ["portal.stDeadLetter", L("Blockiert – manueller Eingriff", "Blocked – needs manual action", "Bloke – elle müdahale", "موقوف – تدخل يدوي", "Bloqué – action manuelle", "Bloqueado – acción manual", "Bloccato – intervento manuale", "Zablokowane – ręczna akcja")],
  ["portal.syncHumanTitle", L("Zustellung an die Plattform", "Delivery to the platform", "Platforma teslimi", "التسليم إلى المنصة", "Livraison à la plateforme", "Entrega a la plataforma", "Consegna alla piattaforma", "Dostawa na platformę")],
  ["portal.syncHumanTotal", L("{n} Lieferungen", "{n} deliveries", "{n} teslim", "{n} تسليمات", "{n} livraisons", "{n} entregas", "{n} consegne", "{n} dostaw")],
  ["portal.syncEmpty", L("Keine offenen Zustellungen.", "No open deliveries.", "Açık teslim yok.", "لا تسليمات مفتوحة.", "Aucune livraison ouverte.", "Sin entregas abiertas.", "Nessuna consegna aperta.", "Brak otwartych dostaw.")],
  ["portal.attempts", L("Versuche", "Attempts", "Deneme", "محاولات", "Tentatives", "Intentos", "Tentativi", "Próby")],
  ["portal.correctFailed", L("Korrektur fehlgeschlagen", "Correction failed", "Düzeltme başarısız", "فشل التصحيح", "Correction échouée", "Corrección fallida", "Correzione non riuscita", "Korekta nieudana")],
  ["portal.correctStatus", L("Neuer Status", "New status", "Yeni durum", "الحالة الجديدة", "Nouveau statut", "Nuevo estado", "Nuovo stato", "Nowy status")],
  ["portal.revision", L("Version", "Version", "Sürüm", "الإصدار", "Version", "Versión", "Versione", "Wersja")],
  ["portal.gobdExportHuman", L("Datei wurde heruntergeladen – für Steuerprüfung / Archiv.", "File downloaded – for tax audit / archive.", "Dosya indirildi – vergi denetimi/arşiv.", "تم تنزيل الملف – للفحص/الأرشيف.", "Fichier téléchargé – audit/archives.", "Archivo descargado – auditoría/archivo.", "File scaricato – audit/archivio.", "Plik pobrany – kontrola/archiwum.")],
  ["portal.syncHumanHint.PENDING", L("Wartet auf Versand an die Plattform.", "Waiting to send to the platform.", "Platforma gönderimi bekliyor.", "في انتظار الإرسال إلى المنصة.", "En attente d’envoi.", "Esperando envío.", "In attesa di invio.", "Oczekuje na wysyłkę.")],
  ["portal.syncHumanHint.PROCESSING", L("An Plattform gesendet – wartet auf Bestätigung.", "Sent to platform – awaiting confirmation.", "Platforma gönderildi – onay bekleniyor.", "أُرسل للمنصة – بانتظار التأكيد.", "Envoyé – en attente de confirmation.", "Enviado – esperando confirmación.", "Inviato – in attesa di conferma.", "Wysłano – czeka na potwierdzenie.")],
  ["portal.syncHumanHint.RETRYING", L("Fehler – erneuter Versuch geplant.", "Error – retry scheduled.", "Hata – yeniden denenecek.", "خطأ – ستُعاد المحاولة.", "Erreur – nouvel essai prévu.", "Error – reintento programado.", "Errore – nuovo tentativo.", "Błąd – ponowienie zaplanowane.")],
  ["portal.syncHumanHint.COMPLETED", L("Erfolgreich zugestellt / bestätigt.", "Successfully delivered / confirmed.", "Başarıyla teslim/onay.", "تم التسليم/التأكيد بنجاح.", "Livré / confirmé.", "Entregado / confirmado.", "Consegnato / confermato.", "Dostarczono / potwierdzono.")],
  ["portal.syncHumanHint.FAILED", L("Fehlgeschlagen.", "Failed.", "Başarısız.", "فشل.", "Échoué.", "Fallido.", "Non riuscito.", "Nieudane.")],
  ["portal.syncHumanHint.DEAD_LETTER", L("Nach mehreren Fehlern gestoppt – bitte manuell prüfen.", "Stopped after several failures – check manually.", "Birkaç hatadan sonra durdu – elle kontrol.", "توقف بعد عدة أخطاء – راجع يدوياً.", "Arrêté après plusieurs échecs – vérifier.", "Detenido tras varios fallos – revisar.", "Fermato dopo più errori – controllare.", "Zatrzymano po błędach – sprawdź ręcznie.")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
// Update existing gobdAudit / gobdSync labels if present
for (const [k, o] of extra) {
  if (!existing.has(k)) continue;
  const re = new RegExp(`(\\[\\s*${JSON.stringify(k)}\\s*,\\s*)(\\{[\\s\\S]*?\\})(\\s*\\])`);
  if (re.test(s)) {
    s = s.replace(re, `$1${JSON.stringify(o)}$3`);
  }
}
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
}
fs.writeFileSync(path, s);
console.log("added", filtered.length, "updated existing labels where matched");
