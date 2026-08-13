import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.readinessTitle", L("Monats-Bereitschaft", "Month readiness", "Ay hazırlığı", "جاهزية الشهر", "Préparation du mois", "Preparación del mes", "Prontezza del mese", "Gotowość miesiąca")],
  ["portal.readinessHint", L("Wer ist fertig, wer wartet noch auf Stunden oder Stammdaten.", "Who is ready, who still waits for hours or master data.", "Kim hazır, kim hâlâ saat veya ana veri bekliyor.", "من جاهز، ومن ينتظر الساعات أو البيانات الأساسية.", "Qui est prêt, qui attend encore les heures ou les données de base.", "Quién está listo, quién espera horas o datos maestros.", "Chi è pronto, chi attende ancora ore o anagrafica.", "Kto gotowy, kto czeka na godziny lub dane podstawowe.")],
  ["portal.waitHoursTitle", L("Warte auf Monatsstunden", "Waiting for monthly hours", "Aylık saatler bekleniyor", "بانتظار ساعات الشهر", "En attente des heures du mois", "Esperando horas del mes", "In attesa delle ore del mese", "Oczekiwanie na godziny miesiąca")],
  ["portal.waitHoursHint", L("Stundenlohn ist da. Sobald die Plattform die Stunden sendet, berechnet WorkPass automatisch.", "Hourly rate is set. As soon as the platform sends hours, WorkPass calculates automatically.", "Saat ücreti hazır. Platform saatleri gönderince WorkPass otomatik hesaplar.", "أجر الساعة جاهز. عند إرسال المنصة للساعات يحسب WorkPass تلقائياً.", "Le taux horaire est prêt. Dès que la plateforme envoie les heures, WorkPass calcule.", "La tarifa horaria está lista. Cuando la plataforma envíe las horas, WorkPass calcula.", "La tariffa oraria c’è. Quando la piattaforma invia le ore, WorkPass calcola.", "Stawka godzinowa jest. Gdy platforma wyśle godziny, WorkPass policzy automatycznie.")],
  ["portal.waitHoursShort", L("Stunden offen", "Hours open", "Saat açık", "ساعات مفتوحة", "Heures ouvertes", "Horas abiertas", "Ore aperte", "Godziny otwarte")],
  ["portal.stammdatenOpen", L("Stammdaten offen", "Master data open", "Ana veri açık", "بيانات أساسية ناقصة", "Données de base ouvertes", "Datos maestros abiertos", "Anagrafica aperta", "Dane podstawowe otwarte")],
  ["portal.diagTitle", L("Live-Diagnose", "Live diagnosis", "Canlı teşhis", "تشخيص مباشر", "Diagnostic live", "Diagnóstico en vivo", "Diagnosi live", "Diagnoza na żywo")],
  ["portal.diagBadge", L("Offen", "Open", "Açık", "مفتوح", "Ouvert", "Abierto", "Aperto", "Otwarte")],
  ["portal.diagHint", L("Was von der Plattform noch fehlt – klar und ohne Technikcodes.", "What is still missing from the platform – clear, without technical codes.", "Platformdan hâlâ eksik olanlar – teknik kod olmadan net.", "ما زال ناقصاً من المنصة – بوضوح وبدون رموز تقنية.", "Ce qui manque encore côté plateforme – clair, sans codes techniques.", "Lo que aún falta de la plataforma – claro, sin códigos técnicos.", "Cosa manca ancora dalla piattaforma – chiaro, senza codici tecnici.", "Czego jeszcze brakuje z platformy – jasno, bez kodów technicznych.")],
  ["portal.diagOpen", L("offen", "open", "açık", "مفتوح", "ouverts", "abiertos", "aperti", "otwarte")],
  ["portal.brandingTitle", L("Firmenauftritt", "Company branding", "Firma görünümü", "هوية الشركة", "Identité entreprise", "Imagen de empresa", "Identità aziendale", "Wizerunek firmy")],
  ["portal.brandingOk", L("Vollständig", "Complete", "Tam", "مكتمل", "Complet", "Completo", "Completo", "Kompletne")],
  ["portal.brandingIncomplete", L("Unvollständig", "Incomplete", "Eksik", "غير مكتمل", "Incomplet", "Incompleto", "Incompleto", "Niekompletne")],
  ["portal.brandingPull", L("Logo & Absender holen", "Fetch logo & letterhead", "Logo ve gönderen al", "جلب الشعار والمرسل", "Récupérer logo et en-tête", "Obtener logo y remitente", "Recupera logo e mittente", "Pobierz logo i nadawcę")],
  ["portal.brandingHasLogo", L("Logo vorhanden", "Logo present", "Logo var", "الشعار موجود", "Logo présent", "Logo presente", "Logo presente", "Logo obecne")],
  ["portal.brandingNoLogo", L("Logo fehlt", "Logo missing", "Logo eksik", "الشعار ناقص", "Logo manquant", "Falta el logo", "Logo mancante", "Brak logo")],
  ["portal.brandingHasSeller", L("Absender vorhanden", "Letterhead present", "Gönderen var", "المرسل موجود", "En-tête présent", "Remitente presente", "Mittente presente", "Nadawca obecny")],
  ["portal.brandingNoSeller", L("Absender fehlt", "Letterhead missing", "Gönderen eksik", "المرسل ناقص", "En-tête manquant", "Falta el remitente", "Mittente mancante", "Brak nadawcy")],
  ["portal.brandingHasTax", L("Steuer-Nr. vorhanden", "Tax number present", "Vergi no. var", "الرقم الضريبي موجود", "N° fiscal présent", "NIF presente", "Partita IVA presente", "NIP obecny")],
  ["portal.brandingNoTax", L("Steuer-Nr. fehlt", "Tax number missing", "Vergi no. eksik", "الرقم الضريبي ناقص", "N° fiscal manquant", "Falta el NIF", "Partita IVA mancante", "Brak NIP")],
  ["portal.brandingPulled", L("Firmenauftritt aktualisiert.", "Company branding updated.", "Firma görünümü güncellendi.", "تم تحديث هوية الشركة.", "Identité entreprise mise à jour.", "Imagen de empresa actualizada.", "Identità aziendale aggiornata.", "Wizerunek firmy zaktualizowany.")],
  ["portal.brandingPullPartial", L("Branding geprüft – Logo ggf. noch nicht auf der Plattform.", "Branding checked – logo may not be on the platform yet.", "Marka kontrol edildi – logo henüz platformda olmayabilir.", "تم فحص الهوية – قد لا يكون الشعار على المنصة بعد.", "Branding vérifié – le logo peut encore manquer sur la plateforme.", "Marca revisada – el logo puede no estar aún en la plataforma.", "Branding verificato – il logo potrebbe non essere ancora sulla piattaforma.", "Sprawdzono branding – logo może jeszcze nie być na platformie.")],
  ["portal.archiveBatchPdf", L("Alle PDFs (Monat)", "All PDFs (month)", "Tüm PDF’ler (ay)", "كل ملفات PDF (الشهر)", "Tous les PDF (mois)", "Todos los PDF (mes)", "Tutti i PDF (mese)", "Wszystkie PDF (miesiąc)")],
  ["portal.monthDatev", L("DATEV-Monat exportieren", "Export DATEV month", "DATEV ayını dışa aktar", "تصدير شهر DATEV", "Exporter le mois DATEV", "Exportar mes DATEV", "Esporta mese DATEV", "Eksportuj miesiąc DATEV")],
  ["portal.monthDatevEmpty", L("Noch keine freigegebenen Abrechnungen für diesen Monat.", "No released payslips for this month yet.", "Bu ay için henüz onaylı bordro yok.", "لا كشوف أجور معتمدة لهذا الشهر بعد.", "Aucun bulletin publié pour ce mois.", "Aún no hay nóminas liberadas este mes.", "Nessun cedolino rilasciato per questo mese.", "Brak zwolnionych pasków za ten miesiąc.")],
  ["portal.monthDatevOk", L("DATEV-Monat exportiert ({n} Zeilen).", "DATEV month exported ({n} lines).", "DATEV ayı dışa aktarıldı ({n} satır).", "تم تصدير شهر DATEV ({n} سطر).", "Mois DATEV exporté ({n} lignes).", "Mes DATEV exportado ({n} líneas).", "Mese DATEV esportato ({n} righe).", "Wyeksportowano miesiąc DATEV ({n} wierszy).")],
  ["portal.monthDatevFail", L("DATEV-Export fehlgeschlagen", "DATEV export failed", "DATEV dışa aktarma başarısız", "فشل تصدير DATEV", "Échec export DATEV", "Falló exportación DATEV", "Esportazione DATEV non riuscita", "Eksport DATEV nieudany")],
  ["portal.archiveBatchEmpty", L("Keine freigegebenen Abrechnungen in diesem Monat.", "No released payslips in this month.", "Bu ay onaylı bordro yok.", "لا كشوف معتمدة في هذا الشهر.", "Aucun bulletin publié ce mois-ci.", "No hay nóminas liberadas este mes.", "Nessun cedolino rilasciato in questo mese.", "Brak zwolnionych pasków w tym miesiącu.")],
  ["portal.archiveBatchNoLib", L("PDF-Bibliothek fehlt – Seite neu laden (F5).", "PDF library missing – reload the page (F5).", "PDF kitaplığı yok – sayfayı yenileyin (F5).", "مكتبة PDF ناقصة – أعد تحميل الصفحة (F5).", "Bibliothèque PDF manquante – rechargez (F5).", "Falta la biblioteca PDF – recargue (F5).", "Libreria PDF mancante – ricaricare (F5).", "Brak biblioteki PDF – odśwież (F5).")],
  ["portal.archiveBatchStart", L("Erzeuge Sammel-PDF ({n})…", "Building combined PDF ({n})…", "Toplu PDF oluşturuluyor ({n})…", "جارٍ إنشاء PDF مجمّع ({n})…", "Création du PDF groupé ({n})…", "Creando PDF combinado ({n})…", "Creazione PDF collettivo ({n})…", "Tworzenie zbiorczego PDF ({n})…")],
  ["portal.archiveBatchOk", L("Sammel-PDF gespeichert ({n} Seiten).", "Combined PDF saved ({n} pages).", "Toplu PDF kaydedildi ({n} sayfa).", "تم حفظ PDF المجمّع ({n} صفحات).", "PDF groupé enregistré ({n} pages).", "PDF combinado guardado ({n} páginas).", "PDF collettivo salvato ({n} pagine).", "Zapisano zbiorczy PDF ({n} stron).")],
  ["portal.archiveBatchFail", L("Sammel-PDF fehlgeschlagen", "Combined PDF failed", "Toplu PDF başarısız", "فشل PDF المجمّع", "Échec du PDF groupé", "Falló el PDF combinado", "PDF collettivo non riuscito", "Zbiorczy PDF nieudany")],
  ["portal.waitEnded", L("Warten beendet – bitte erneut synchronisieren oder Daten in der Plattform freigeben", "Waiting ended – please sync again or release data in the platform", "Bekleme bitti – tekrar senkronize edin veya platformda veriyi açın", "انتهى الانتظار – زامن مجدداً أو حرّر البيانات في المنصة", "Attente terminée – resynchronisez ou libérez les données", "Espera terminada – sincronice de nuevo o libere datos", "Attesa terminata – sincronizzare di nuovo o liberare i dati", "Koniec oczekiwania – zsynchronizuj ponownie lub udostępnij dane")],
  ["portal.waitRetry", L("Warte auf Plattform… Auto-Retry in 10s ({left}×)", "Waiting for platform… auto-retry in 10s ({left}×)", "Platform bekleniyor… 10 sn sonra otomatik ({left}×)", "بانتظار المنصة… إعادة تلقائية خلال 10ث ({left}×)", "Attente plateforme… nouvel essai dans 10s ({left}×)", "Esperando plataforma… reintento en 10s ({left}×)", "Attesa piattaforma… nuovo tentativo tra 10s ({left}×)", "Oczekiwanie na platformę… ponów za 10s ({left}×)")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
