import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["admin.right.activate", L("Firma aktivieren", "Activate company", "Firmayı etkinleştir", "تفعيل الشركة", "Activer l’entreprise", "Activar empresa", "Attiva azienda", "Aktywuj firmę")],
  ["admin.right.deactivate", L("Firma deaktivieren", "Deactivate company", "Firmayı pasifleştir", "تعطيل الشركة", "Désactiver l’entreprise", "Desactivar empresa", "Disattiva azienda", "Dezaktywuj firmę")],
  ["admin.right.delete", L("Firma löschen", "Delete company", "Firmayı sil", "حذف الشركة", "Supprimer l’entreprise", "Eliminar empresa", "Elimina azienda", "Usuń firmę")],
  ["admin.right.backups", L("Backups erstellen & wiederherstellen", "Create & restore backups", "Yedek oluştur ve geri yükle", "إنشاء النسخ واستعادتها", "Créer et restaurer des sauvegardes", "Crear y restaurar copias", "Crea e ripristina backup", "Twórz i przywracaj kopie")],
  ["admin.right.sync", L("Login-Sync / Plattform-Sync", "Login sync / platform sync", "Login-Sync / Platform senkronu", "مزامنة الدخول / المنصة", "Sync login / plateforme", "Sync de acceso / plataforma", "Sync login / piattaforma", "Sync logowania / platformy")],
  ["admin.right.rateLimit", L("Rate-Limit löschen", "Clear rate limit", "Rate-Limit temizle", "مسح حد المعدل", "Effacer le rate-limit", "Borrar rate-limit", "Cancella rate-limit", "Wyczyść rate-limit")],
  ["admin.right.viewAll", L("Alle Firmen einsehen", "View all companies", "Tüm firmaları gör", "عرض كل الشركات", "Voir toutes les entreprises", "Ver todas las empresas", "Vedi tutte le aziende", "Zobacz wszystkie firmy")],
  ["admin.right.audit", L("Audit-Log lesen", "Read audit log", "Audit kaydını oku", "قراءة سجل التدقيق", "Lire le journal d’audit", "Leer registro de auditoría", "Leggi audit log", "Czytaj dziennik audytu")],
  ["admin.right.helpContact", L("Hilfe-Kontakt öffentlich pflegen", "Manage public help contact", "Herkese açık yardım iletişimini yönet", "إدارة جهة اتصال المساعدة العامة", "Gérer le contact d’aide public", "Gestionar contacto de ayuda público", "Gestisci contatto assistenza pubblico", "Zarządzaj publicznym kontaktem pomocy")],
  ["admin.rightsNeedOnline", L(
    "Vollständige Rechte erscheinen nach erfolgreicher Bridge-Verbindung (Admin-Konto, nicht nur PIN).",
    "Full rights appear after a successful bridge connection (Admin account, not PIN only).",
    "Tam haklar Bridge bağlantısından sonra görünür (Admin hesabı, yalnızca PIN değil).",
    "تظهر الصلاحيات الكاملة بعد اتصال الجسر (حساب Admin وليس الرمز فقط).",
    "Les droits complets apparaissent après connexion au bridge (compte Admin, pas seulement le PIN).",
    "Los derechos completos aparecen tras conectar el bridge (cuenta Admin, no solo PIN).",
    "I diritti completi compaiono dopo il collegamento al bridge (account Admin, non solo PIN).",
    "Pełne uprawnienia pojawią się po połączeniu z bridge (konto Admin, nie tylko PIN)."
  )],
  ["hub.adminLine", L(
    "Accounting Admin · kein Firmen-Portal",
    "Accounting Admin · not firm portal",
    "Accounting Admin · firma portalı değil",
    "Accounting Admin · ليس بوابة شركة",
    "Accounting Admin · pas un portail entreprise",
    "Accounting Admin · no es portal de empresa",
    "Accounting Admin · non è portale azienda",
    "Accounting Admin · to nie portal firmy"
  )],
  ["hub.adminBanner", L(
    "Sie sind als Accounting-Admin angemeldet. Das Firmen-Portal-Design erscheint nur mit Firmen-Login. Admin-Rechte und Hilfe-Kontakt: <a href=\"admin.html\">admin.html</a>.",
    "You are signed in as Accounting Admin. Firm portal design appears only with a company login. Admin rights and help contact: <a href=\"admin.html\">admin.html</a>.",
    "Accounting Admin olarak giriş yaptınız. Firma portalı tasarımı yalnızca firma girişi ile görünür. Admin hakları: <a href=\"admin.html\">admin.html</a>.",
    "أنت مسجّل كـ Accounting Admin. تصميم بوابة الشركة يظهر فقط بدخول الشركة. صلاحيات Admin: <a href=\"admin.html\">admin.html</a>.",
    "Vous êtes connecté en tant qu’Accounting Admin. Le design portail entreprise n’apparaît qu’avec un login entreprise. Droits Admin : <a href=\"admin.html\">admin.html</a>.",
    "Ha iniciado sesión como Accounting Admin. El diseño del portal de empresa solo aparece con login de empresa. Derechos Admin: <a href=\"admin.html\">admin.html</a>.",
    "Sei connesso come Accounting Admin. Il design del portale azienda compare solo con login azienda. Diritti Admin: <a href=\"admin.html\">admin.html</a>.",
    "Jesteś zalogowany jako Accounting Admin. Wygląd portalu firmy pojawia się tylko przy logowaniu firmy. Uprawnienia Admin: <a href=\"admin.html\">admin.html</a>."
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
