import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.elsterReachFinanzamt", L(
    "Finanzamt (Sidecar)",
    "Finanzamt (sidecar)",
    "Finanzamt (sidecar)",
    "Finanzamt (Sidecar)",
    "Finanzamt (sidecar)",
    "Finanzamt (sidecar)",
    "Finanzamt (sidecar)",
    "Finanzamt (sidecar)"
  )],
  ["portal.elsterReachLocal", L(
    "Lokal — nicht Finanzamt",
    "Local — not Finanzamt",
    "Yerel — Finanzamt değil",
    "محلي — ليس Finanzamt",
    "Local — pas Finanzamt",
    "Local — no Finanzamt",
    "Locale — non Finanzamt",
    "Lokalnie — nie Finanzamt"
  )],
  ["portal.elsterReachChannel", L(
    "Kanal — nicht Finanzamt",
    "Channel — not Finanzamt",
    "Kanal — Finanzamt değil",
    "قناة — ليس Finanzamt",
    "Canal — pas Finanzamt",
    "Canal — no Finanzamt",
    "Canale — non Finanzamt",
    "Kanał — nie Finanzamt"
  )],
  ["portal.yearEndTitle", L("Jahresabschluss · Assistent", "Year-end wizard", "Yıl sonu sihirbazı", "مساعد إغلاق السنة", "Assistant fin d'année", "Asistente fin de año", "Assistente fine anno", "Kreator roku")],
  ["portal.yearEndBadge", L("Schritte", "Steps", "Adımlar", "خطوات", "Étapes", "Pasos", "Passi", "Kroki")],
  ["portal.yearEndHint", L(
    "Freigegebene Monate → LStB → Mitarbeiter → optional ELSTER → DATEV/SEPA/GoBD.",
    "Released months → LStB → employees → optional ELSTER → DATEV/SEPA/GoBD.",
    "Onaylı aylar → LStB → çalışanlar → isteğe bağlı ELSTER → DATEV/SEPA/GoBD.",
    "أشهر معتمدة → LStB → موظفون → ELSTER اختياري → DATEV/SEPA/GoBD.",
    "Mois validés → LStB → salariés → ELSTER optionnel → DATEV/SEPA/GoBD.",
    "Meses liberados → LStB → empleados → ELSTER opcional → DATEV/SEPA/GoBD.",
    "Mesi rilasciati → LStB → dipendenti → ELSTER opzionale → DATEV/SEPA/GoBD.",
    "Miesiące zatwierdzone → LStB → pracownicy → opcjonalnie ELSTER → DATEV/SEPA/GoBD."
  )],
  ["portal.yearEndYear", L("Kalenderjahr", "Calendar year", "Takvim yılı", "السنة", "Année civile", "Año natural", "Anno solare", "Rok kalendarzowy")],
  ["portal.yearEndDone", L("Erledigt", "Done", "Tamam", "منجز", "Terminé", "Hecho", "Fatto", "Gotowe")],
  ["portal.yearEndProgress", L("In Arbeit", "In progress", "Devam ediyor", "قيد التنفيذ", "En cours", "En curso", "In corso", "W toku")],
  ["portal.yearEndOpen", L("Offen", "Open", "Açık", "مفتوح", "Ouvert", "Abierto", "Aperto", "Otwarte")],
  ["portal.yearEndOptional", L("Optional", "Optional", "İsteğe bağlı", "اختياري", "Optionnel", "Opcional", "Opzionale", "Opcjonalne")],
  ["portal.yearEndReady", L("Bereit", "Ready", "Hazır", "جاهز", "Prêt", "Listo", "Pronto", "Gotowe")],
  ["portal.yearEndOpenCount", L("{n} offen", "{n} open", "{n} açık", "{n} مفتوح", "{n} ouvert(s)", "{n} abierto(s)", "{n} aperti", "{n} otwarte")],
  ["portal.yearEndFail", L("Jahresassistent nicht verfügbar.", "Year-end wizard unavailable.", "Yıl sonu sihirbazı yok.", "مساعد السنة غير متاح.", "Assistant indisponible.", "Asistente no disponible.", "Assistente non disponibile.", "Kreator niedostępny.")],
  ["portal.deliveryReconTitle", L("Zustellungen · Vertrauen", "Deliveries · trust", "Teslimat · güven", "التسليم · الثقة", "Livraisons · confiance", "Entregas · confianza", "Consegne · fiducia", "Dostawy · zaufanie")],
  ["portal.deliveryReconBadge", L("Plattform", "Platform", "Platform", "المنصة", "Plateforme", "Plataforma", "Piattaforma", "Platforma")],
  ["portal.deliveryReconHint", L(
    "Lohnabrechnung, LStB, VB und Rechnungen — ob die Plattform bestätigt hat (Ack/Pull).",
    "Payslip, LStB, VB and invoices — whether the platform confirmed (ack/pull).",
    "Bordro, LStB, VB ve faturalar — platform onayladı mı (Ack/Pull).",
    "كشف الراتب و LStB و VB والفواتير — هل أكدت المنصة (Ack/Pull).",
    "Bulletins, LStB, VB et factures — confirmation plateforme (ack/pull).",
    "Nóminas, LStB, VB y facturas — si la plataforma confirmó (ack/pull).",
    "Cedolini, LStB, VB e fatture — conferma piattaforma (ack/pull).",
    "Listy, LStB, VB i faktury — czy platforma potwierdziła (ack/pull)."
  )],
  ["portal.deliveryReconFail", L("Zustellungen konnten nicht geladen werden.", "Could not load deliveries.", "Teslimatlar yüklenemedi.", "تعذر تحميل التسليمات.", "Impossible de charger les livraisons.", "No se pudieron cargar entregas.", "Impossibile caricare consegne.", "Nie udało się wczytać dostaw.")],
  ["portal.deliveryReconPayroll", L("Lohnabrechnungen: {ready}/{total} bereit", "Payslips: {ready}/{total} ready", "Bordrolar: {ready}/{total} hazır", "كشوف: {ready}/{total} جاهزة", "Bulletins : {ready}/{total} prêts", "Nóminas: {ready}/{total} listas", "Cedolini: {ready}/{total} pronti", "Listy: {ready}/{total} gotowe")],
  ["portal.deliveryReconEmpty", L("Keine Dokument-Zustellungen für diesen Zeitraum.", "No document deliveries for this period.", "Bu dönem için belge teslimi yok.", "لا تسليمات مستندات لهذه الفترة.", "Aucune livraison de documents pour cette période.", "Sin entregas de documentos en este periodo.", "Nessuna consegna documenti per questo periodo.", "Brak dostaw dokumentów w tym okresie.")],
  ["portal.deliveryReconError", L("Fehler", "Error", "Hata", "خطأ", "Erreur", "Error", "Errore", "Błąd")],
  ["portal.deliveryReconPending", L("Offen", "Open", "Açık", "مفتوح", "Ouvert", "Abierto", "Aperto", "Otwarte")],
  ["portal.deliveryReconOk", L("OK", "OK", "OK", "OK", "OK", "OK", "OK", "OK")],
  ["portal.trustAcked", L("Bestätigt", "Confirmed", "Onaylandı", "مؤكد", "Confirmé", "Confirmado", "Confermato", "Potwierdzone")],
  ["portal.trustPushed", L("Gesendet", "Sent", "Gönderildi", "مُرسل", "Envoyé", "Enviado", "Inviato", "Wysłane")],
  ["portal.trustQueued", L("Wartet", "Waiting", "Bekliyor", "في الانتظار", "En attente", "En espera", "In attesa", "Oczekuje")],
  ["portal.trustFailed", L("Fehler", "Failed", "Başarısız", "فشل", "Échec", "Fallido", "Fallito", "Błąd")],
  ["portal.trustUnknown", L("Unbekannt", "Unknown", "Bilinmiyor", "غير معروف", "Inconnu", "Desconocido", "Sconosciuto", "Nieznany")],
  ["portal.exportStatusEmpty", L("Noch keine Exporte für diesen Monat.", "No exports for this month yet.", "Bu ay için export yok.", "لا صادرات لهذا الشهر بعد.", "Pas encore d'exports ce mois.", "Aún no hay exportaciones este mes.", "Nessun export per questo mese.", "Brak eksportów w tym miesiącu.")],
  ["portal.exportImportTitle", L("Bankstatus importieren (pain.002)", "Import bank status (pain.002)", "Bank durumu içe aktar (pain.002)", "استيراد حالة البنك (pain.002)", "Importer statut banque (pain.002)", "Importar estado banco (pain.002)", "Importa stato banca (pain.002)", "Import statusu banku (pain.002)")],
  ["portal.exportImportHint", L("SEPA-Rückmeldung einfügen — Stub-Parser, bitte XML prüfen.", "Paste SEPA feedback — stub parser, verify XML.", "SEPA yanıtını yapıştır — stub parser, XML'i kontrol edin.", "الصق رد SEPA — محلل stub، تحقق من XML.", "Coller retour SEPA — parseur stub, vérifiez le XML.", "Pegar respuesta SEPA — parser stub, revise XML.", "Incolla risposta SEPA — parser stub, verifica XML.", "Wklej odpowiedź SEPA — parser stub, sprawdź XML.")],
  ["portal.exportImportBtn", L("Status importieren", "Import status", "Durumu içe aktar", "استيراد الحالة", "Importer statut", "Importar estado", "Importa stato", "Importuj status")],
  ["portal.exportImportStatus", L("Bankstatus", "Bank status", "Bank durumu", "حالة البنك", "Statut banque", "Estado banco", "Stato banca", "Status banku")],
  ["portal.exportImportEmpty", L("Bitte pain.002 / camt Text einfügen.", "Please paste pain.002 / camt text.", "pain.002 / camt metnini yapıştırın.", "الصق نص pain.002 / camt.", "Collez le texte pain.002 / camt.", "Pegue texto pain.002 / camt.", "Incolla testo pain.002 / camt.", "Wklej tekst pain.002 / camt.")],
  ["portal.exportImportConfirmTitle", L("Bankstatus importieren", "Import bank status", "Bank durumu içe aktar", "استيراد حالة البنك", "Importer statut banque", "Importar estado banco", "Importa stato banca", "Importuj status banku")],
  ["portal.exportImportConfirmBody", L("Stub-Parser — bitte XML manuell prüfen.", "Stub parser — please verify XML manually.", "Stub parser — XML'i elle kontrol edin.", "محلل stub — تحقق من XML يدوياً.", "Parseur stub — vérifiez le XML manuellement.", "Parser stub — revise XML manualmente.", "Parser stub — verifica XML manualmente.", "Parser stub — sprawdź XML ręcznie.")],
  ["portal.exportImportDone", L("Bankstatus importiert.", "Bank status imported.", "Bank durumu içe aktarıldı.", "تم استيراد حالة البنك.", "Statut banque importé.", "Estado banco importado.", "Stato banca importato.", "Status banku zaimportowany.")],
];

const block = extra.map(([key, loc]) => {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
  return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
}).join(",\n");

s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
fs.writeFileSync(path, s);
console.log(`Appended ${extra.length} keys (batch 264)`);
