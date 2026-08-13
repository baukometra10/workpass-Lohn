import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.deliveryPendingTitle", L(
    "Abrechnungen warten auf die Plattform",
    "Payslips waiting for the platform",
    "Bordrolar platformu bekliyor",
    "كشوف الرواتب تنتظر المنصة",
    "Bulletins en attente de la plateforme",
    "Nóminas esperando a la plataforma",
    "Cedolini in attesa della piattaforma",
    "Paski czekają na platformę"
  )],
  ["portal.deliveryPendingHint", L(
    "{n} fertige Abrechnung(en) liegen bereit. Die Plattform muss Event payslip.released speichern (Antwort: accepted:true) oder GET /v1/delivery/pending pollen – sonst erscheint nichts in der Mitarbeiter-App.",
    "{n} finished payslip(s) are ready. Platform must store event payslip.released (reply: accepted:true) or poll GET /v1/delivery/pending – otherwise nothing shows in the employee app.",
    "{n} hazır bordro bekliyor. Platform payslip.released olayını kaydetmeli (yanıt: accepted:true) veya GET /v1/delivery/pending çekmeli – aksi halde çalışan uygulamasında görünmez.",
    "{n} كشف/كشوف جاهزة. يجب أن تحفظ المنصة حدث payslip.released (الرد: accepted:true) أو تسحب GET /v1/delivery/pending – وإلا لن يظهر شيء في تطبيق الموظف.",
    "{n} bulletin(s) prêt(s). La plateforme doit enregistrer payslip.released (réponse: accepted:true) ou interroger GET /v1/delivery/pending – sinon rien n’apparaît dans l’app salarié.",
    "{n} nómina(s) lista(s). La plataforma debe guardar payslip.released (respuesta: accepted:true) o consultar GET /v1/delivery/pending – si no, no aparece en la app del empleado.",
    "{n} cedolino/i pronti. La piattaforma deve salvare payslip.released (risposta: accepted:true) o fare poll di GET /v1/delivery/pending – altrimenti non compare nell’app dipendente.",
    "{n} gotowy/ch pasek/pasków czeka. Platforma musi zapisać payslip.released (odpowiedź: accepted:true) lub pobrać GET /v1/delivery/pending – inaczej nic nie widać w aplikacji pracownika."
  )],
  ["portal.deliverPendingPull", L(
    "Freigegeben und an Webhook gesendet – Plattform hat noch nicht bestätigt. Bitte Plattform: Event payslip.released speichern + pending pollen.",
    "Released and sent to webhook – platform has not confirmed yet. Platform must store payslip.released and poll pending.",
    "Onaylandı ve webhook’a gönderildi – platform henüz onaylamadı. Platform payslip.released kaydetmeli + pending çekmeli.",
    "تم التحرير والإرسال عبر Webhook – المنصة لم تؤكد بعد. يجب حفظ payslip.released وسحب pending.",
    "Publié et envoyé au webhook – la plateforme n’a pas encore confirmé. Enregistrer payslip.released + poll pending.",
    "Liberado y enviado al webhook – la plataforma aún no confirmó. Guardar payslip.released + poll pending.",
    "Rilasciato e inviato al webhook – la piattaforma non ha ancora confermato. Salvare payslip.released + poll pending.",
    "Zwolniono i wysłano webhook – platforma jeszcze nie potwierdziła. Zapisz payslip.released + poll pending."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
