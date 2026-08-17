import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.certTitle", L(
    "Bescheinigungen pro Mitarbeiter",
    "Certificates per employee",
    "Çalışan başına belgeler",
    "شهادات لكل موظف",
    "Certificats par employé",
    "Certificados por empleado",
    "Certificati per dipendente",
    "Zaświadczenia na pracownika"
  )],
  ["portal.certBadge", L("Jahresende", "Year-end", "Yıl sonu", "نهاية السنة", "Fin d’année", "Fin de año", "Fine anno", "Koniec roku")],
  ["portal.certHint", L(
    "Aus freigegebenen Abrechnungen: Lohnsteuerbescheinigung (Jahr) und Verdienstbescheinigung (Monat + Summe).",
    "From released payroll: annual wage tax certificate (year) and earnings certificate (month + YTD).",
    "Onaylı bordrolardan: yıllık LStB ve kazanç belgesi (ay + yıl toplamı).",
    "من كشوف الرواتب المعتمدة: شهادة ضريبة الأجور السنوية وشهادة الأرباح (شهر + مجموع).",
    "Depuis les paies validées : certificat fiscal annuel et certificat de gains (mois + cumul).",
    "Desde nóminas liberadas: certificado fiscal anual y certificado de ingresos (mes + acumulado).",
    "Da cedolini rilasciati: certificato fiscale annuale e certificato di reddito (mese + cumulo).",
    "Z zatwierdzonych list płac: roczne LStB i zaświadczenie o zarobkach (miesiąc + suma)."
  )],
  ["portal.certYear", L("Jahr", "Year", "Yıl", "السنة", "Année", "Año", "Anno", "Rok")],
  ["portal.certEmployee", L("Mitarbeiter-ID", "Employee ID", "Çalışan kimliği", "معرّف الموظف", "ID employé", "ID empleado", "ID dipendente", "ID pracownika")],
  ["portal.certPeriod", L("Monat (VB, optional)", "Month (VB, optional)", "Ay (VB, isteğe bağlı)", "الشهر (VB، اختياري)", "Mois (VB, optionnel)", "Mes (VB, opcional)", "Mese (VB, opzionale)", "Miesiąc (VB, opcjonalnie)")],
  ["portal.certLstb", L("Lohnsteuerbescheinigung", "Wage tax certificate", "Lohnsteuerbescheinigung", "شهادة ضريبة الأجور", "Certificat fiscal", "Certificado fiscal", "Certificato fiscale", "Zaświadczenie podatkowe")],
  ["portal.certVerdienst", L("Verdienstbescheinigung", "Earnings certificate", "Verdienstbescheinigung", "شهادة الأرباح", "Certificat de gains", "Certificado de ingresos", "Certificato di reddito", "Zaświadczenie o zarobkach")],
  ["portal.certSummary", L("Jahresübersicht", "Year overview", "Yıl özeti", "نظرة سنوية", "Vue annuelle", "Resumen anual", "Panoramica annuale", "Przegląd roczny")],
  ["portal.certPrint", L("Drucken", "Print", "Yazdır", "طباعة", "Imprimer", "Imprimir", "Stampa", "Drukuj")],
  ["portal.certClose", L("Schließen", "Close", "Kapat", "إغلاق", "Fermer", "Cerrar", "Chiudi", "Zamknij")],
  ["portal.certNeedEmployee", L("Bitte Mitarbeiter-ID eingeben.", "Please enter an employee ID.", "Lütfen çalışan kimliği girin.", "يرجى إدخال معرّف الموظف.", "Veuillez saisir l’ID employé.", "Introduzca el ID del empleado.", "Inserire l’ID dipendente.", "Wprowadź ID pracownika.")],
  ["portal.certLstbFail", L("LStB konnte nicht erstellt werden.", "Could not create wage tax certificate.", "LStB oluşturulamadı.", "تعذر إنشاء LStB.", "Impossible de créer le certificat fiscal.", "No se pudo crear el certificado fiscal.", "Impossibile creare il certificato fiscale.", "Nie udało się utworzyć LStB.")],
  ["portal.certVerdienstFail", L("Verdienstbescheinigung konnte nicht erstellt werden.", "Could not create earnings certificate.", "Verdienstbescheinigung oluşturulamadı.", "تعذر إنشاء شهادة الأرباح.", "Impossible de créer le certificat de gains.", "No se pudo crear el certificado de ingresos.", "Impossibile creare il certificato di reddito.", "Nie udało się utworzyć zaświadczenia o zarobkach.")],
  ["portal.certLstbReady", L("Lohnsteuerbescheinigung bereit – Drucken.", "Wage tax certificate ready – print.", "LStB hazır – yazdırın.", "شهادة ضريبة الأجور جاهزة – اطبع.", "Certificat fiscal prêt – imprimer.", "Certificado fiscal listo – imprimir.", "Certificato fiscale pronto – stampa.", "LStB gotowe – drukuj.")],
  ["portal.certVerdienstReady", L("Verdienstbescheinigung bereit – Drucken.", "Earnings certificate ready – print.", "Verdienstbescheinigung hazır – yazdırın.", "شهادة الأرباح جاهزة – اطبع.", "Certificat de gains prêt – imprimer.", "Certificado de ingresos listo – imprimir.", "Certificato di reddito pronto – stampa.", "Zaświadczenie gotowe – drukuj.")],
  ["portal.certMonths", L("Monate", "Months", "Aylar", "أشهر", "Mois", "Meses", "Mesi", "Miesiące")],
  ["portal.certEmpty", L("Keine freigegebenen Monate für dieses Jahr.", "No released months for this year.", "Bu yıl için onaylı ay yok.", "لا أشهر معتمدة لهذه السنة.", "Aucun mois validé pour cette année.", "No hay meses liberados este año.", "Nessun mese rilasciato per quest’anno.", "Brak zatwierdzonych miesięcy w tym roku.")],
  ["portal.certLstbAll", L("Alle LStB drucken", "Print all LStB", "Tüm LStB yazdır", "طباعة كل LStB", "Imprimer toutes les LStB", "Imprimir todas las LStB", "Stampa tutte le LStB", "Drukuj wszystkie LStB")],
  ["portal.certLstbAllReady", L("Alle Lohnsteuerbescheinigungen bereit – Drucken.", "All wage tax certificates ready – print.", "Tüm LStB hazır – yazdırın.", "جميع شهادات ضريبة الأجور جاهزة – اطبع.", "Tous les certificats fiscaux sont prêts – imprimer.", "Todos los certificados fiscales listos – imprimir.", "Tutti i certificati fiscali pronti – stampa.", "Wszystkie LStB gotowe – drukuj.")],
  ["portal.certLstbAllPartial", L("LStB bereit ({ok} von {n}) – Drucken.", "LStB ready ({ok} of {n}) – print.", "LStB hazır ({ok}/{n}) – yazdırın.", "LStB جاهزة ({ok} من {n}) – اطبع.", "LStB prêt ({ok} sur {n}) – imprimer.", "LStB listo ({ok} de {n}) – imprimir.", "LStB pronto ({ok} di {n}) – stampa.", "LStB gotowe ({ok} z {n}) – drukuj.")],
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
