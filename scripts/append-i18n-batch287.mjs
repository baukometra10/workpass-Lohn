import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

s = s.replace(
  /\["hub\.openFullAdmin",\{[^\}]+\}\]/,
  `["hub.openFullAdmin",${JSON.stringify(L(
    "Erweiterte Admin-Tools",
    "Advanced Admin tools",
    "Gelişmiş Admin araçları",
    "أدوات Admin المتقدمة",
    "Outils Admin avancés",
    "Herramientas Admin avanzadas",
    "Strumenti Admin avanzati",
    "Zaawansowane narzędzia Admin"
  ))}]`
);

const extra = [
  ["hub.adminAdvancedTitle", L(
    "Erweiterte Admin-Tools",
    "Advanced Admin tools",
    "Gelişmiş Admin araçları",
    "أدوات Admin المتقدمة",
    "Outils Admin avancés",
    "Herramientas Admin avanzadas",
    "Strumenti Admin avanzati",
    "Zaawansowane narzędzia Admin"
  )],
  ["hub.adminAdvancedSub", L(
    "Direkt im Hub – gleiche Sitzung, kein erneutes Anmelden.",
    "Directly in Hub – same session, no second login.",
    "Doğrudan Hub’da – aynı oturum, tekrar giriş yok.",
    "مباشرة في الـ Hub – نفس الجلسة، بدون تسجيل دخول ثانٍ.",
    "Directement dans le Hub – même session, sans nouvelle connexion.",
    "Directo en el Hub – misma sesión, sin nuevo inicio de sesión.",
    "Direttamente nell’Hub – stessa sessione, senza nuovo accesso.",
    "Bezpośrednio w Hub – ta sama sesja, bez ponownego logowania."
  )],
  ["hub.adminAdvancedReady", L(
    "Admin-Tools bereit – gleiche Hub-Sitzung.",
    "Admin tools ready – same Hub session.",
    "Admin araçları hazır – aynı Hub oturumu.",
    "أدوات Admin جاهزة – نفس جلسة الـ Hub.",
    "Outils Admin prêts – même session Hub.",
    "Herramientas Admin listas – misma sesión Hub.",
    "Strumenti Admin pronti – stessa sessione Hub.",
    "Narzędzia Admin gotowe – ta sama sesja Hub."
  )],
  ["hub.adminNoCompanies", L(
    "Keine Firmen geladen.",
    "No companies loaded.",
    "Firma yüklenmedi.",
    "لم تُحمَّل شركات.",
    "Aucune entreprise chargée.",
    "No hay empresas cargadas.",
    "Nessuna azienda caricata.",
    "Brak załadowanych firm."
  )],
  ["admin.backupBusy", L(
    "Backup läuft…",
    "Backup running…",
    "Yedek alınıyor…",
    "جاري النسخ الاحتياطي…",
    "Sauvegarde en cours…",
    "Copia en curso…",
    "Backup in corso…",
    "Tworzenie kopii…"
  )],
  ["admin.backupDone", L(
    "Backup erstellt.",
    "Backup created.",
    "Yedek oluşturuldu.",
    "تم إنشاء النسخة الاحتياطية.",
    "Sauvegarde créée.",
    "Copia creada.",
    "Backup creato.",
    "Utworzono kopię."
  )],
  ["admin.rateCleared", L(
    "Rate-Limit geleert.",
    "Rate limit cleared.",
    "Rate limit temizlendi.",
    "تم مسح حد المعدل.",
    "Limite de débit effacée.",
    "Límite de tasa borrado.",
    "Rate limit azzerato.",
    "Wyczyszczono limit."
  )],
  ["admin.syncNeed", L(
    "Firma-ID und PIN/Passwort (min. 4) erforderlich.",
    "Company ID and PIN/password (min. 4) required.",
    "Firma-ID ve PIN/şifre (min. 4) gerekli.",
    "معرّف الشركة وPIN/كلمة المرور (حد أدنى 4) مطلوبان.",
    "ID entreprise et PIN/mot de passe (min. 4) requis.",
    "ID de empresa y PIN/contraseña (mín. 4) obligatorios.",
    "ID azienda e PIN/password (min. 4) obbligatori.",
    "Wymagane ID firmy i PIN/hasło (min. 4)."
  )],
  ["admin.companies", L(
    "Firmen",
    "Companies",
    "Firmalar",
    "الشركات",
    "Entreprises",
    "Empresas",
    "Aziende",
    "Firmy"
  )],
];

const block = extra.map(([k, v]) => `  ${JSON.stringify([k, v])},`).join("\n");
s = s.replace(/\];\s*$/, `${block}\n];\n`);
fs.writeFileSync(path, s);
console.log("ok", extra.length);
