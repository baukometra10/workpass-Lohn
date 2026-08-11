import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["admin.loading", L("Lädt…", "Loading…", "Yükleniyor…", "جارٍ التحميل…", "Chargement…", "Cargando…", "Caricamento…", "Ładowanie…")],
  ["admin.loaded", L("Admin-Übersicht geladen", "Admin overview loaded", "Yönetici özeti yüklendi", "تم تحميل نظرة المسؤول", "Aperçu admin chargé", "Resumen admin cargado", "Panoramica admin caricata", "Przegląd admina załadowany")],
  ["admin.whoApi", L("Angemeldet per API-Key / Session", "Signed in via API key / session", "API anahtarı / oturum ile giriş", "مسجّل عبر مفتاح API / الجلسة", "Connecté via clé API / session", "Sesión por clave API", "Accesso via chiave API / sessione", "Zalogowano kluczem API / sesją")],
  ["admin.whoRole", L("{name} · Rolle: {role}", "{name} · Role: {role}", "{name} · Rol: {role}", "{name} · الدور: {role}", "{name} · Rôle : {role}", "{name} · Rol: {role}", "{name} · Ruolo: {role}", "{name} · Rola: {role}")],
  ["admin.kpiCompanies", L("Firmen", "Companies", "Firmalar", "الشركات", "Entreprises", "Empresas", "Aziende", "Firmy")],
  ["admin.kpiActive", L("Aktiv", "Active", "Aktif", "نشط", "Actives", "Activas", "Attive", "Aktywne")],
  ["admin.kpiBackups", L("Backups", "Backups", "Yedekler", "النسخ الاحتياطية", "Sauvegardes", "Copias", "Backup", "Kopie")],
  ["admin.kpiVersion", L("Version", "Version", "Sürüm", "الإصدار", "Version", "Versión", "Versione", "Wersja")],
  ["admin.noRights", L("Keine Rechte geladen.", "No rights loaded.", "Hak yüklenmedi.", "لم تُحمَّل الصلاحيات.", "Aucun droit chargé.", "Sin derechos cargados.", "Nessun diritto caricato.", "Brak uprawnień.")],
  ["admin.warnNoAccounting", L("Kein Accounting", "No accounting", "Muhasebe yok", "لا محاسبة", "Pas de compta", "Sin contabilidad", "Nessuna contabilità", "Brak księgowości")],
  ["admin.warnNoHub", L("Kein Hub-Profil", "No Hub profile", "Hub profili yok", "لا ملف Hub", "Pas de profil Hub", "Sin perfil Hub", "Nessun profilo Hub", "Brak profilu Hub")],
  ["admin.warnNoPin", L("Kein PIN", "No PIN", "PIN yok", "لا PIN", "Pas de PIN", "Sin PIN", "Nessun PIN", "Brak PIN")],
  ["admin.hasPin", L("· PIN ✓", "· PIN ✓", "· PIN ✓", "· PIN ✓", "· PIN ✓", "· PIN ✓", "· PIN ✓", "· PIN ✓")],
  ["admin.noPinBadge", L("· kein PIN", "· no PIN", "· PIN yok", "· بلا PIN", "· pas de PIN", "· sin PIN", "· senza PIN", "· brak PIN")],
  ["admin.badgeActive", L("Aktiv", "Active", "Aktif", "نشط", "Actif", "Activa", "Attiva", "Aktywna")],
  ["admin.badgeInactive", L("Inaktiv", "Inactive", "Pasif", "غير نشط", "Inactif", "Inactiva", "Inattiva", "Nieaktywna")],
  ["admin.badgeHubOk", L("Hub ✓", "Hub ✓", "Hub ✓", "Hub ✓", "Hub ✓", "Hub ✓", "Hub ✓", "Hub ✓")],
  ["admin.badgeHubMissing", L("Hub ✗", "Hub ✗", "Hub ✗", "Hub ✗", "Hub ✗", "Hub ✗", "Hub ✗", "Hub ✗")],
  ["admin.delete", L("Löschen", "Delete", "Sil", "حذف", "Supprimer", "Eliminar", "Elimina", "Usuń")],
  ["admin.noCompanies", L("Noch keine Firmen – oben „Login-Sync“ nutzen oder Plattform syncen.", "No companies yet – use “Login sync” above or sync from the platform.", "Henüz firma yok – yukarıda “Login-Sync” veya platform senkronu.", "لا شركات بعد – استخدم «مزامنة الدخول» أعلاه أو مزامنة المنصة.", "Pas encore d’entreprises – utilisez « Login-Sync » ou sync plateforme.", "Aún no hay empresas – use «Login-Sync» o sync de plataforma.", "Ancora nessuna azienda – usa «Login-Sync» o sync piattaforma.", "Brak firm – użyj «Login-Sync» lub sync platformy.")],
  ["admin.noAudit", L("Noch keine Audit-Einträge.", "No audit entries yet.", "Henüz denetim kaydı yok.", "لا إدخالات تدقيق بعد.", "Pas encore d’entrées d’audit.", "Aún no hay entradas de auditoría.", "Ancora nessuna voce di audit.", "Brak wpisów audytu.")],
  ["admin.noBackups", L("Keine Backups gefunden.", "No backups found.", "Yedek bulunamadı.", "لم يُعثر على نسخ احتياطية.", "Aucune sauvegarde trouvée.", "No se encontraron copias.", "Nessun backup trovato.", "Nie znaleziono kopii.")],
  ["admin.restore", L("Wiederherstellen", "Restore", "Geri yükle", "استعادة", "Restaurer", "Restaurar", "Ripristina", "Przywróć")],
  ["admin.confirmDeleteCompany", L("Firma „{name}“ ({id}) wirklich aus WorkPass Lohn löschen?", "Really delete company “{name}” ({id}) from WorkPass Lohn?", "“{name}” ({id}) firmasını WorkPass Lohn’dan silmek istiyor musunuz?", "هل تريد حقًا حذف الشركة «{name}» ({id}) من WorkPass Lohn؟", "Supprimer vraiment l’entreprise « {name} » ({id}) de WorkPass Lohn ?", "¿Eliminar de verdad la empresa «{name}» ({id}) de WorkPass Lohn?", "Eliminare davvero l’azienda «{name}» ({id}) da WorkPass Lohn?", "Naprawdę usunąć firmę „{name}” ({id}) z WorkPass Lohn?")],
  ["admin.companyRemoved", L("Firma {id} entfernt", "Company {id} removed", "Firma {id} kaldırıldı", "تمت إزالة الشركة {id}", "Entreprise {id} supprimée", "Empresa {id} eliminada", "Azienda {id} rimossa", "Firma {id} usunięta")],
  ["admin.confirmRestore", L("Backup {file} wirklich wiederherstellen? Aktuelle DB wird überschrieben (Sicherheitskopie wird angelegt).", "Really restore backup {file}? Current DB will be overwritten (a safety copy is created).", "{file} yedeği gerçekten geri yüklensin mi? Mevcut DB üzerine yazılır (güvenlik kopyası alınır).", "هل تريد حقًا استعادة النسخة {file}؟ ستُستبدل قاعدة البيانات الحالية (مع نسخة أمان).", "Restaurer vraiment la sauvegarde {file} ? La DB actuelle sera écrasée (copie de sécurité créée).", "¿Restaurar de verdad la copia {file}? Se sobrescribirá la BD actual (se crea copia de seguridad).", "Ripristinare davvero il backup {file}? Il DB attuale verrà sovrascritto (copia di sicurezza creata).", "Naprawdę przywrócić kopię {file}? Bieżąca DB zostanie nadpisana (powstanie kopia bezpieczeństwa).")],
  ["admin.backupRestored", L("Backup {file} wiederhergestellt", "Backup {file} restored", "Yedek {file} geri yüklendi", "تمت استعادة النسخة {file}", "Sauvegarde {file} restaurée", "Copia {file} restaurada", "Backup {file} ripristinato", "Kopia {file} przywrócona")],
  ["admin.backupBusy", L("Backup…", "Backup…", "Yedek…", "نسخ…", "Sauvegarde…", "Copia…", "Backup…", "Kopia…")],
  ["admin.backupCreated", L("Backup erstellt", "Backup created", "Yedek oluşturuldu", "تم إنشاء النسخة الاحتياطية", "Sauvegarde créée", "Copia creada", "Backup creato", "Utworzono kopię")],
  ["admin.clearingRate", L("Löscht…", "Clearing…", "Temizleniyor…", "جارٍ المسح…", "Effacement…", "Borrando…", "Pulizia…", "Czyszczenie…")],
  ["admin.rateCleared", L("Rate-Limit geleert", "Rate limit cleared", "Rate limiti temizlendi", "تم مسح حد المعدّل", "Limite de débit effacée", "Límite de tasa borrado", "Rate limit azzerato", "Wyczyszczono limit zapytań")],
  ["admin.confirmMonthClose", L("Monatsabschluss für alle aktiven Firmen jetzt ausführen?", "Run month-end close for all active companies now?", "Tüm aktif firmalar için ay kapanışı şimdi çalıştırılsın mı?", "تشغيل إقفال الشهر لجميع الشركات النشطة الآن؟", "Exécuter la clôture mensuelle pour toutes les entreprises actives maintenant ?", "¿Ejecutar el cierre mensual para todas las empresas activas ahora?", "Eseguire la chiusura mensile per tutte le aziende attive ora?", "Uruchomić zamknięcie miesiąca dla wszystkich aktywnych firm teraz?")],
  ["admin.monthCloseBusy", L("Läuft…", "Running…", "Çalışıyor…", "جارٍ…", "En cours…", "En curso…", "In corso…", "Trwa…")],
  ["admin.monthCloseDone", L("Monatsabschluss: {count} Firmen · ok={ok}", "Month close: {count} companies · ok={ok}", "Ay kapanışı: {count} firma · ok={ok}", "إقفال الشهر: {count} شركات · ok={ok}", "Clôture : {count} entreprises · ok={ok}", "Cierre: {count} empresas · ok={ok}", "Chiusura: {count} aziende · ok={ok}", "Zamknięcie: {count} firm · ok={ok}")],
  ["admin.syncNeedFields", L("Firma-ID und Passwort/PIN (min. 4) sind Pflicht.", "Company ID and password/PIN (min. 4) are required.", "Firma ID ve şifre/PIN (min. 4) zorunlu.", "معرّف الشركة وكلمة المرور/PIN (حد أدنى 4) إلزاميان.", "ID entreprise et mot de passe/PIN (min. 4) obligatoires.", "ID de empresa y contraseña/PIN (mín. 4) obligatorios.", "ID azienda e password/PIN (min. 4) obbligatori.", "ID firmy i hasło/PIN (min. 4) są wymagane.")],
  ["admin.syncSaving", L("Speichert…", "Saving…", "Kaydediliyor…", "جارٍ الحفظ…", "Enregistrement…", "Guardando…", "Salvataggio…", "Zapisywanie…")],
  ["admin.syncSaved", L("Gespeichert: {who} – jetzt in Lohn anmelden.", "Saved: {who} – sign in to Payroll now.", "Kaydedildi: {who} – şimdi Bordroya giriş yapın.", "تم الحفظ: {who} – سجّل الدخول إلى الأجور الآن.", "Enregistré : {who} – connectez-vous à Paie.", "Guardado: {who} – inicie sesión en Nómina.", "Salvato: {who} – accedi a Paghe.", "Zapisano: {who} – zaloguj się do Płac.")],
  ["admin.firmNoAdmin", L("Firmen-Login hat keinen Admin-Zugang. Bitte Admin-Konto nutzen.", "Company login has no admin access. Please use an admin account.", "Firma girişi admin erişimi vermez. Lütfen admin hesabı kullanın.", "دخول الشركة بلا صلاحية مسؤول. يُرجى استخدام حساب مسؤول.", "La connexion entreprise n’a pas d’accès admin. Utilisez un compte admin.", "El acceso de empresa no tiene admin. Use una cuenta de administrador.", "Il login azienda non ha accesso admin. Usa un account admin.", "Login firmowy nie daje dostępu admina. Użyj konta administratora.")],
  ["pwa.installed", L("Als App geöffnet", "Running as app", "Uygulama olarak açık", "مفتوح كتطبيق", "Ouvert en application", "Abierta como app", "Aperta come app", "Otwarte jako aplikacja")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
