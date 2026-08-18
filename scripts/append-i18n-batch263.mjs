import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.certHint", L(
    "Aus freigegebenen Abrechnungen: LStB (Jahr, § 41b EStG) und Verdienstbescheinigung (Monat). Drucken stellt sie dem Mitarbeiter auf der Plattform zu – wie die Lohnabrechnung.",
    "From released payslips: LStB (year, § 41b EStG) and earnings certificate (month). Print also delivers them to the employee on the platform – like the payslip.",
    "Onaylı bordrolardan: LStB (yıl, § 41b EStG) ve kazanç belgesi (ay). Yazdırınca çalışana platformda da gider – bordro gibi.",
    "من كشوف معتمدة: LStB (سنة، § 41b EStG) وشهادة الدخل (شهر). الطباعة ترسلها للموظف على المنصة – مثل كشف الراتب.",
    "Depuis les bulletins validés : LStB (année, § 41b EStG) et attestation (mois). Imprimer les envoie aussi au salarié sur la plateforme – comme le bulletin.",
    "Desde nóminas liberadas: LStB (año, § 41b EStG) y certificado (mes). Imprimir también las entrega al empleado en la plataforma – como la nómina.",
    "Da cedolini rilasciati: LStB (anno, § 41b EStG) e attestato (mese). La stampa li invia anche al dipendente sulla piattaforma – come il cedolino.",
    "Z zatwierdzonych list: LStB (rok, § 41b EStG) i zaświadczenie (miesiąc). Druk wysyła je też pracownikowi na platformie – jak lista płac."
  )],
  ["portal.certSend", L("An Mitarbeiter senden", "Send to employee", "Çalışana gönder", "إرسال للموظف", "Envoyer au salarié", "Enviar al empleado", "Invia al dipendente", "Wyślij do pracownika")],
  ["portal.certSendShort", L("Senden", "Send", "Gönder", "إرسال", "Envoyer", "Enviar", "Invia", "Wyślij")],
  ["portal.certSendLstb", L("LStB an Mitarbeiter", "LStB to employee", "LStB çalışana", "LStB للموظف", "LStB au salarié", "LStB al empleado", "LStB al dipendente", "LStB do pracownika")],
  ["portal.certSendVb", L("VB an Mitarbeiter", "VB to employee", "VB çalışana", "VB للموظف", "VB au salarié", "VB al empleado", "VB al dipendente", "VB do pracownika")],
  ["portal.certSendLstbAll", L("Alle LStB an Mitarbeiter", "All LStB to employees", "Tüm LStB çalışanlara", "كل LStB للموظفين", "Toutes les LStB aux salariés", "Todas las LStB a empleados", "Tutte le LStB ai dipendenti", "Wszystkie LStB do pracowników")],
  ["portal.certSendConfirmLstb", L(
    "Lohnsteuerbescheinigung (LStB, § 41b EStG) an die Plattform, damit der Mitarbeiter sie in der App sieht – wie die Lohnabrechnung. Nicht an das Finanzamt.",
    "Send the LStB (§ 41b EStG) to the platform so the employee sees it in the app – like the payslip. Not to the tax office.",
    "LStB (§ 41b EStG) platforma: çalışan uygulamada görür – bordro gibi. Finanzamt’e değil.",
    "إرسال LStB (§ 41b EStG) إلى المنصة ليراه الموظف في التطبيق – مثل كشف الراتب. ليس إلى Finanzamt.",
    "Envoyer la LStB (§ 41b EStG) à la plateforme pour l’app salarié – comme le bulletin. Pas au Finanzamt.",
    "Enviar la LStB (§ 41b EStG) a la plataforma para la app del empleado – como la nómina. No al Finanzamt.",
    "Invia la LStB (§ 41b EStG) alla piattaforma per l’app del dipendente – come il cedolino. Non al Finanzamt.",
    "Wyślij LStB (§ 41b EStG) na platformę, by pracownik widział ją w aplikacji – jak listę płac. Nie do Finanzamt."
  )],
  ["portal.certSendConfirmVb", L(
    "Verdienstbescheinigung an die Plattform, damit der Mitarbeiter sie in der App sieht – wie die Lohnabrechnung.",
    "Send the earnings certificate to the platform so the employee sees it in the app – like the payslip.",
    "Kazanç belgesini platforma gönder: çalışan uygulamada görür – bordro gibi.",
    "إرسال شهادة الدخل إلى المنصة ليراها الموظف في التطبيق – مثل كشف الراتب.",
    "Envoyer l’attestation de salaire à la plateforme pour l’app salarié – comme le bulletin.",
    "Enviar el certificado de ingresos a la plataforma para la app – como la nómina.",
    "Invia l’attestato di retribuzione alla piattaforma per l’app – come il cedolino.",
    "Wyślij zaświadczenie o zarobkach na platformę – jak listę płac."
  )],
  ["portal.certSendConfirmAll", L(
    "Alle Lohnsteuerbescheinigungen dieses Jahres an die Plattform, damit jeder Mitarbeiter sie in der App sieht – wie die Lohnabrechnung. Nicht an das Finanzamt (das ist ELSTER).",
    "Send every LStB for this year to the platform so each employee sees it in the app – like the payslip. Not to the tax office (that is ELSTER).",
    "Bu yılın tüm LStB’sini platforma: her çalışan uygulamada görür. Finanzamt’e değil (o ELSTER).",
    "إرسال كل LStB لهذه السنة إلى المنصة ليراه كل موظف. ليس إلى Finanzamt (ذلك ELSTER).",
    "Envoyer toutes les LStB de l’année à la plateforme. Pas au Finanzamt (c’est ELSTER).",
    "Enviar todas las LStB del año a la plataforma. No al Finanzamt (eso es ELSTER).",
    "Invia tutte le LStB dell’anno alla piattaforma. Non al Finanzamt (quello è ELSTER).",
    "Wyślij wszystkie LStB roku na platformę. Nie do Finanzamt (to ELSTER)."
  )],
  ["portal.certPrintAndSend", L("Drucken und an Mitarbeiter", "Print and send to employee", "Yazdır ve çalışana gönder", "طباعة وإرسال للموظف", "Imprimer et envoyer", "Imprimir y enviar", "Stampa e invia", "Drukuj i wyślij")],
  ["portal.certPrintAndSendBody", L(
    "Zuerst an die Plattform (Mitarbeiter-App), dann drucken. Ohne Webhook bleibt die Zustellung in der Warteschlange.",
    "First to the platform (employee app), then print. Without a webhook the delivery stays in the queue.",
    "Önce platforma (çalışan uygulaması), sonra yazdır. Webhook yoksa kuyrukta kalır.",
    "أولاً إلى المنصة (تطبيق الموظف)، ثم الطباعة. بدون Webhook تبقى في قائمة الانتظار.",
    "D’abord la plateforme (app salarié), puis impression. Sans webhook, file d’attente.",
    "Primero la plataforma (app del empleado), luego imprimir. Sin webhook, queda en cola.",
    "Prima la piattaforma (app dipendente), poi stampa. Senza webhook resta in coda.",
    "Najpierw platforma (aplikacja pracownika), potem druk. Bez webhooka zostaje w kolejce."
  )],
  ["portal.certSent", L(
    "An die Plattform übergeben.",
    "Handed to the platform.",
    "Platforma iletildi.",
    "سُلِّم إلى المنصة.",
    "Remis à la plateforme.",
    "Entregado a la plataforma.",
    "Inoltrato alla piattaforma.",
    "Przekazano na platformę."
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
