import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.brandingLogoAsked", L(
    "Logo nicht gefunden – klare Anfrage an die Plattform gesendet.",
    "Logo not found – a clear request was sent to the platform.",
    "Logo bulunamadı – platforma açık bir istek gönderildi.",
    "لم يُعثر على الشعار – أُرسل طلب واضح إلى المنصة.",
    "Logo introuvable – une demande claire a été envoyée à la plateforme.",
    "Logo no encontrado – se envió una petición clara a la plataforma.",
    "Logo non trovato – richiesta chiara inviata alla piattaforma.",
    "Nie znaleziono logo – wysłano jasną prośbę do platformy."
  )],
  ["portal.brandingLogoHint", L(
    "WorkPass holt das Logo direkt von der Plattform. Fehlt es dort, geht eine klare Anfrage raus.",
    "WorkPass fetches the logo directly from the platform. If it is missing, a clear request is sent.",
    "WorkPass logoyu doğrudan platformdan alır. Orada yoksa açık bir istek gider.",
    "يسحب WorkPass الشعار مباشرة من المنصة. إن نقص هناك، تُرسل طلب واضح.",
    "WorkPass récupère le logo directement depuis la plateforme. S’il manque, une demande claire part.",
    "WorkPass obtiene el logo directamente de la plataforma. Si falta, se envía una petición clara.",
    "WorkPass prende il logo direttamente dalla piattaforma. Se manca, parte una richiesta chiara.",
    "WorkPass pobiera logo bezpośrednio z platformy. Jeśli go brak, idzie jasna prośba."
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
