import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.exportHint", L(
    "SEPA / DATEV / LODAS / ELSTER – LStA monatlich (Firma), LStB jährlich (Mitarbeiter). Ohne Kanal nur lokal, nicht beim Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – monthly LStA (company), yearly LStB (employee). Without a channel jobs stay local, not at the tax office.",
    "SEPA / DATEV / LODAS / ELSTER – aylık LStA (firma), yıllık LStB (çalışan). Kanal yoksa yerel, Finanzamt’te değil.",
    "SEPA / DATEV / LODAS / ELSTER – LStA شهريًا (الشركة)، LStB سنويًا (الموظف). بدون قناة يبقى محليًا وليس عند Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStA mensuelle (entreprise), LStB annuelle (salarié). Sans canal, local, pas au Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStA mensual (empresa), LStB anual (empleado). Sin canal, local, no en el Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – LStA mensile (azienda), LStB annuale (dipendente). Senza canale resta locale, non al Finanzamt.",
    "SEPA / DATEV / LODAS / ELSTER – miesięczna LStA (firma), roczna LStB (pracownik). Bez kanału lokalnie, nie w Finanzamt."
  )],
  ["portal.elsterAuto", L(
    "LStA automatisch an den ELSTER-Kanal, sobald der Monat fertig ist (nicht das Finanzamt)",
    "Send LStA automatically to the ELSTER channel when the month is ready (not the tax office)",
    "Ay bitince LStA’yı otomatik ELSTER kanalına gönder (Finanzamt değil)",
    "أرسل LStA تلقائيًا إلى قناة ELSTER عند جاهزية الشهر (وليس Finanzamt)",
    "Envoyer la LStA automatiquement au canal ELSTER dès que le mois est prêt (pas le Finanzamt)",
    "Enviar LStA automáticamente al canal ELSTER cuando el mes esté listo (no el Finanzamt)",
    "Invia LStA automaticamente al canale ELSTER a mese pronto (non il Finanzamt)",
    "Automatycznie wyślij LStA na kanał ELSTER, gdy miesiąc jest gotowy (nie Finanzamt)"
  )],
  ["portal.elsterSubmit", L(
    "LStB (Jahr) senden",
    "Send LStB (year)",
    "LStB (yıl) gönder",
    "إرسال LStB (سنة)",
    "Envoyer LStB (année)",
    "Enviar LStB (año)",
    "Invia LStB (anno)",
    "Wyślij LStB (rok)"
  )],
  ["portal.elsterSubmitConfirm", L(
    "Jahres-LStB der Mitarbeiter mit hinterlegtem Zertifikat an den ELSTER-Kanal. Ohne Sidecar bleibt der Auftrag lokal — nicht beim Finanzamt.",
    "Send the employees’ annual LStB with the stored certificate to the ELSTER channel. Without a sidecar the job stays local — not at the tax office.",
    "Çalışanların yıllık LStB’sini kayıtlı sertifika ile ELSTER kanalına gönderin. Sidecar yoksa yerel kalır — Finanzamt’te değil.",
    "أرسل LStB السنوي للموظفين بالشهادة المخزّنة إلى قناة ELSTER. بدون Sidecar يبقى محليًا — ليس عند Finanzamt.",
    "Transmettre les LStB annuelles des salariés au canal ELSTER. Sans sidecar le dossier reste local — pas au Finanzamt.",
    "Enviar las LStB anuales de los empleados al canal ELSTER. Sin sidecar queda local — no en el Finanzamt.",
    "Invia le LStB annuali dei dipendenti al canale ELSTER. Senza sidecar resta locale — non al Finanzamt.",
    "Wyślij roczne LStB pracowników na kanał ELSTER. Bez sidecar zostaje lokalnie — nie w Finanzamt."
  )],
  ["portal.lstaSubmit", L(
    "LStA senden (dieser Monat)",
    "Send LStA (this month)",
    "LStA gönder (bu ay)",
    "إرسال LStA (هذا الشهر)",
    "Envoyer LStA (ce mois)",
    "Enviar LStA (este mes)",
    "Invia LStA (questo mese)",
    "Wyślij LStA (ten miesiąc)"
  )],
  ["portal.lstaSubmitConfirm", L(
    "Lohnsteueranmeldung der Firma (LSt, SolZ, KiSt) für diesen Monat an den ELSTER-Kanal. Das ist nicht die LStB der Mitarbeiter. Ohne Sidecar bleibt der Auftrag lokal — nicht beim Finanzamt.",
    "Company Lohnsteueranmeldung (LSt, SolZ, KiSt) for this month to the ELSTER channel. This is not the employee LStB. Without a sidecar the job stays local — not at the tax office.",
    "Firmanın bu ay LStA’sı (LSt, SolZ, KiSt) ELSTER kanalına. Çalışan LStB’si değil. Sidecar yoksa yerel — Finanzamt’te değil.",
    "إقرار ضريبة الأجور للشركة (LSt، SolZ، KiSt) لهذا الشهر إلى قناة ELSTER. ليست LStB الموظف. بدون Sidecar يبقى محليًا — ليس عند Finanzamt.",
    "LStA de l’entreprise (LSt, SolZ, KiSt) pour ce mois vers le canal ELSTER. Ce n’est pas la LStB du salarié. Sans sidecar : local — pas au Finanzamt.",
    "LStA de la empresa (LSt, SolZ, KiSt) de este mes al canal ELSTER. No es la LStB del empleado. Sin sidecar queda local — no en el Finanzamt.",
    "LStA aziendale (LSt, SolZ, KiSt) di questo mese al canale ELSTER. Non è la LStB del dipendente. Senza sidecar resta locale — non al Finanzamt.",
    "LStA firmy (LSt, SolZ, KiSt) za ten miesiąc na kanał ELSTER. To nie LStB pracownika. Bez sidecar zostaje lokalnie — nie w Finanzamt."
  )],
  ["portal.lstaDraft", L(
    "LStA {period} (Firma): {n} MA · LSt {lst} · SolZ {solz} · KiSt {kist} · Anmelden {sum}",
    "LStA {period} (company): {n} employees · LSt {lst} · SolZ {solz} · KiSt {kist} · file {sum}",
    "LStA {period} (firma): {n} çalışan · LSt {lst} · SolZ {solz} · KiSt {kist} · beyan {sum}",
    "LStA {period} (الشركة): {n} موظف · LSt {lst} · SolZ {solz} · KiSt {kist} · الإقرار {sum}",
    "LStA {period} (entreprise) : {n} salariés · LSt {lst} · SolZ {solz} · KiSt {kist} · à déclarer {sum}",
    "LStA {period} (empresa): {n} empleados · LSt {lst} · SolZ {solz} · KiSt {kist} · declarar {sum}",
    "LStA {period} (azienda): {n} dip. · LSt {lst} · SolZ {solz} · KiSt {kist} · da versare {sum}",
    "LStA {period} (firma): {n} prac. · LSt {lst} · SolZ {solz} · KiSt {kist} · zgłosić {sum}"
  )],
  ["portal.lstaEmpty", L(
    "LStA {period}: noch keine freigegebenen Abrechnungen.",
    "LStA {period}: no released payroll yet.",
    "LStA {period}: henüz onaylı bordro yok.",
    "LStA {period}: لا توجد كشوف معتمدة بعد.",
    "LStA {period} : pas encore de bulletins validés.",
    "LStA {period}: aún no hay nóminas liberadas.",
    "LStA {period}: nessun cedolino rilasciato.",
    "LStA {period}: brak zatwierdzonych list płac."
  )],
  ["portal.lstaFail", L(
    "LStA konnte nicht geladen werden.",
    "Could not load LStA.",
    "LStA yüklenemedi.",
    "تعذر تحميل LStA.",
    "Impossible de charger la LStA.",
    "No se pudo cargar la LStA.",
    "Impossibile caricare la LStA.",
    "Nie udało się wczytać LStA."
  )],
  ["portal.lstaKind", L("LStA", "LStA", "LStA", "LStA", "LStA", "LStA", "LStA", "LStA")],
  ["portal.lstbKind", L("LStB", "LStB", "LStB", "LStB", "LStB", "LStB", "LStB", "LStB")],
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
