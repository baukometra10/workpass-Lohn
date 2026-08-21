import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

// Replace outdated banner that linked to admin.html (caused re-login UX)
s = s.replace(
  /\["hub\.adminBanner",\s*\{[^\}]+\}\]/,
  `["hub.adminBanner", ${JSON.stringify(L(
    "Sie sind als Accounting-Admin angemeldet. Hilfe-Kontakt links unter Admin bearbeiten — ohne erneutes Anmelden.",
    "You are signed in as Accounting Admin. Edit help contact under Admin on the left — no second login.",
    "Accounting Admin olarak giriş yaptınız. Yardım iletişimini soldaki Admin’den düzenleyin — tekrar giriş yok.",
    "أنت مسجّل كـ Accounting Admin. عدّل جهة اتصال المساعدة من Admin يساراً — بدون تسجيل دخول ثانٍ.",
    "Vous êtes connecté en Accounting Admin. Modifiez le contact d’aide sous Admin à gauche — sans nouvelle connexion.",
    "Ha iniciado sesión como Accounting Admin. Edite el contacto de ayuda en Admin a la izquierda — sin nuevo inicio de sesión.",
    "Sei connesso come Accounting Admin. Modifica il contatto assistenza da Admin a sinistra — senza nuovo accesso.",
    "Jesteś zalogowany jako Accounting Admin. Edytuj kontakt pomocy w Admin po lewej — bez ponownego logowania."
  ))}]`
);

s = s.replace(
  /\["hub\.adminOpenContacts",\s*\{[^\}]+\}\]/,
  `["hub.adminOpenContacts", ${JSON.stringify(L(
    "Hilfe-Kontakt öffnen",
    "Open help contact",
    "Yardım iletişimini aç",
    "فتح جهة اتصال المساعدة",
    "Ouvrir le contact d’aide",
    "Abrir contacto de ayuda",
    "Apri contatto assistenza",
    "Otwórz kontakt pomocy"
  ))}]`
);

const extra = [
  ["nav.adminSub", L(
    "Hilfe-Kontakt",
    "Help contact",
    "Yardım iletişimi",
    "جهة اتصال المساعدة",
    "Contact d’aide",
    "Contacto de ayuda",
    "Contatto assistenza",
    "Kontakt pomocy"
  )],
  ["hub.adminPanelTitle", L(
    "Admin · Hilfe-Kontakt",
    "Admin · Help contact",
    "Admin · Yardım iletişimi",
    "Admin · جهة اتصال المساعدة",
    "Admin · Contact d’aide",
    "Admin · Contacto de ayuda",
    "Admin · Contatto assistenza",
    "Admin · Kontakt pomocy"
  )],
  ["hub.adminPanelSub", L(
    "Nur für Accounting-Admin. Änderungen gelten für alle Firmen unter Hub → Hilfe — ohne erneutes Anmelden.",
    "Accounting Admin only. Changes apply for all firms under Hub → Help — no second login.",
    "Yalnızca Accounting Admin. Değişiklikler tüm firmalarda Hub → Yardım’da görünür — tekrar giriş yok.",
    "لـ Accounting Admin فقط. التغييرات تظهر لكل الشركات تحت Hub → مساعدة — بدون دخول ثانٍ.",
    "Réservé à Accounting Admin. Les changements s’appliquent à toutes les entreprises (Hub → Aide) — sans nouvelle connexion.",
    "Solo Accounting Admin. Los cambios valen para todas las empresas (Hub → Ayuda) — sin nuevo inicio de sesión.",
    "Solo Accounting Admin. Le modifiche valgono per tutte le aziende (Hub → Aiuto) — senza nuovo accesso.",
    "Tylko Accounting Admin. Zmiany dotyczą wszystkich firm (Hub → Pomoc) — bez ponownego logowania."
  )],
  ["hub.openFullAdmin", L(
    "Erweiterte Admin-Seite",
    "Full Admin page",
    "Gelişmiş Admin sayfası",
    "صفحة Admin المتقدمة",
    "Page Admin avancée",
    "Página Admin avanzada",
    "Pagina Admin avanzata",
    "Zaawansowana strona Admin"
  )],
];

const block = extra.map(([k, v]) => `  ${JSON.stringify([k, v])},`).join("\n");
s = s.replace(/\];\s*$/, `${block}\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys + updated hub.adminBanner/OpenContacts");
