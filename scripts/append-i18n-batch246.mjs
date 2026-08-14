import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["auth.adminHint", L(
    "Admin ist getrennt vom Firmen-Zugang. E-Mail + Passwort aus Railway (WORKPASS_ADMIN_EMAIL). Der Plattform-Knopf öffnet Lohn, nicht Admin.",
    "Admin is separate from firm access. Use Railway WORKPASS_ADMIN_EMAIL + password. The platform button opens payroll, not Admin.",
    "Admin, firma erişiminden ayrıdır. Railway WORKPASS_ADMIN_EMAIL + şifre kullanın. Platform düğmesi bordroyu açar, Admin’i değil.",
    "المسؤول منفصل عن دخول الشركة. استخدم WORKPASS_ADMIN_EMAIL وكلمة المرور من Railway. زر المنصة يفتح الأجور وليس Admin.",
    "L’admin est séparé de l’accès entreprise. Utilisez WORKPASS_ADMIN_EMAIL + mot de passe Railway. Le bouton plateforme ouvre la paie, pas l’admin.",
    "El admin es independiente del acceso de empresa. Use WORKPASS_ADMIN_EMAIL + contraseña de Railway. El botón de la plataforma abre nómina, no Admin.",
    "L’admin è separato dall’accesso aziendale. Usa WORKPASS_ADMIN_EMAIL + password Railway. Il pulsante piattaforma apre le paghe, non Admin.",
    "Admin jest oddzielny od logowania firmy. Użyj WORKPASS_ADMIN_EMAIL + hasła z Railway. Przycisk platformy otwiera płace, nie Admin."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
