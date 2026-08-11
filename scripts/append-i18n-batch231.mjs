import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["admin.metaProduct", L("Produkt", "Product", "Ürün", "المنتج", "Produit", "Producto", "Prodotto", "Produkt")],
  ["admin.metaAccess", L("Zugang", "Access", "Erişim", "الوصول", "Accès", "Acceso", "Accesso", "Dostęp")],
  ["admin.subBrand", L("Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin", "Suppix AI · Accounting Admin")],
  ["admin.syncHint", L(
    "Wenn in der Plattform „Abrechnungen an WorkPass Lohn senden“ aktiv ist, die Firma aber beim Login fehlt: hier einmal anlegen. Später soll die Plattform das automatisch per POST /v1/company/login-sync machen.",
    "If the platform has “send payroll to WorkPass Lohn” enabled but the company is missing at login: create it here once. Later the platform should do this via POST /v1/company/login-sync.",
    "Platformda bordro gönderimi açık ama firma girişte yoksa: bir kez burada oluşturun. Sonra platform POST /v1/company/login-sync ile yapmalı.",
    "إذا كانت المنصة ترسل الأجور إلى WorkPass Lohn لكن الشركة ناقصة عند الدخول: أنشئها هنا مرة. لاحقاً يجب أن تفعل المنصة ذلك عبر POST /v1/company/login-sync.",
    "Si la plateforme envoie la paie vers WorkPass Lohn mais l’entreprise manque à la connexion : créez-la ici une fois. Ensuite via POST /v1/company/login-sync.",
    "Si la plataforma envía nómina a WorkPass Lohn pero falta la empresa al iniciar: créela aquí una vez. Luego vía POST /v1/company/login-sync.",
    "Se la piattaforma invia le paghe a WorkPass Lohn ma manca l’azienda al login: creala qui una volta. Poi via POST /v1/company/login-sync.",
    "Jeśli platforma wysyła płace do WorkPass Lohn, a firmy brak przy logowaniu: utwórz ją tu raz. Potem POST /v1/company/login-sync."
  )],
  ["admin.fieldCompanyId", L("Firma-ID (company.id)", "Company ID (company.id)", "Firma ID (company.id)", "معرّف الشركة (company.id)", "ID entreprise (company.id)", "ID empresa (company.id)", "ID azienda (company.id)", "ID firmy (company.id)")],
  ["admin.fieldCompanyName", L("Firmenname", "Company name", "Firma adı", "اسم الشركة", "Nom de l'entreprise", "Nombre de empresa", "Nome azienda", "Nazwa firmy")],
  ["admin.fieldLoginEmail", L("Login-E-Mail", "Login email", "Giriş e-postası", "بريد الدخول", "E-mail de connexion", "Correo de acceso", "Email di accesso", "E-mail logowania")],
  ["admin.fieldLoginPin", L("Passwort / PIN (min. 4)", "Password / PIN (min. 4)", "Şifre / PIN (min. 4)", "كلمة المرور / PIN (حد أدنى 4)", "Mot de passe / PIN (min. 4)", "Contraseña / PIN (mín. 4)", "Password / PIN (min. 4)", "Hasło / PIN (min. 4)")],
  ["admin.thCompany", L("Firma", "Company", "Firma", "الشركة", "Entreprise", "Empresa", "Azienda", "Firma")],
  ["admin.thId", L("ID", "ID", "ID", "ID", "ID", "ID", "ID", "ID")],
  ["admin.thLogin", L("Login", "Login", "Giriş", "تسجيل الدخول", "Connexion", "Acceso", "Accesso", "Logowanie")],
  ["admin.thStatus", L("Status", "Status", "Durum", "الحالة", "Statut", "Estado", "Stato", "Status")],
  ["admin.auditEmpty", L("Wird beim Laden der Übersicht gefüllt.", "Filled when the overview loads.", "Özet yüklenince doldurulur.", "يُملأ عند تحميل النظرة العامة.", "Rempli au chargement de l’aperçu.", "Se rellena al cargar el resumen.", "Compilato al caricamento della panoramica.", "Wypełniane przy ładowaniu przeglądu.")],
  ["admin.foot", L("WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Tax Suite · Bridge Admin", "WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Steuerprogramm · Bridge-Admin", "WorkPass Steuerprogramm · Bridge-Admin")],
  ["hub.webhook401Firm", L(
    "Die Plattform antwortet nicht (401). Bitte den Webhook auf der Plattform prüfen und Daten erneut senden.",
    "The platform is not responding (401). Please check the webhook on the platform and send data again.",
    "Platform yanıt vermiyor (401). Platformdaki webhook’u kontrol edip veriyi yeniden gönderin.",
    "المنصة لا تستجيب (401). يُرجى فحص Webhook على المنصة وإعادة إرسال البيانات.",
    "La plateforme ne répond pas (401). Vérifiez le webhook côté plateforme et renvoyez les données.",
    "La plataforma no responde (401). Revise el webhook en la plataforma y vuelva a enviar datos.",
    "La piattaforma non risponde (401). Controlla il webhook sulla piattaforma e reinvia i dati.",
    "Platforma nie odpowiada (401). Sprawdź webhook na platformie i wyślij dane ponownie."
  )],
  ["hub.webhook401Next1", L("Auf der Plattform: Webhook-URL und Secret prüfen", "On the platform: check webhook URL and secret", "Platformda: webhook URL ve secret kontrol", "على المنصة: تحقق من رابط Webhook والسر", "Sur la plateforme : vérifier URL et secret webhook", "En la plataforma: revisar URL y secreto webhook", "Sulla piattaforma: verifica URL e secret webhook", "Na platformie: sprawdź URL i secret webhook")],
  ["hub.webhook401Next2", L("Secret muss mit WORKPASS_PLATFORM_WEBHOOK_KEY übereinstimmen", "Secret must match WORKPASS_PLATFORM_WEBHOOK_KEY", "Secret WORKPASS_PLATFORM_WEBHOOK_KEY ile aynı olmalı", "يجب أن يطابق السر WORKPASS_PLATFORM_WEBHOOK_KEY", "Le secret doit correspondre à WORKPASS_PLATFORM_WEBHOOK_KEY", "El secreto debe coincidir con WORKPASS_PLATFORM_WEBHOOK_KEY", "Il secret deve coincidere con WORKPASS_PLATFORM_WEBHOOK_KEY", "Secret musi zgadzać się z WORKPASS_PLATFORM_WEBHOOK_KEY")],
  ["hub.webhook401Next3", L("Danach Sync erneut prüfen oder in Lohn „Jetzt synchronisieren“", "Then check Sync again or use “Sync now” in Payroll", "Ardından Sync’i tekrar kontrol edin veya Bordroda senkronize edin", "بعدها أعد فحص المزامنة أو «زامن الآن» في الأجور", "Puis revérifier Sync ou « Synchroniser » dans Paie", "Luego vuelva a comprobar Sync o «Sincronizar» en Nómina", "Poi ricontrolla Sync o «Sincronizza» in Paghe", "Potem sprawdź Sync lub «Synchronizuj» w Płacach")],
  ["nav.moreActions", L("Weitere Aktionen", "More actions", "Diğer işlemler", "المزيد من الإجراءات", "Plus d’actions", "Más acciones", "Altre azioni", "Więcej działań")],
  ["common.csv", L("CSV", "CSV", "CSV", "CSV", "CSV", "CSV", "CSV", "CSV")],
  ["app.versionLabel", L("Version {v}", "Version {v}", "Sürüm {v}", "الإصدار {v}", "Version {v}", "Versión {v}", "Versione {v}", "Wersja {v}")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
