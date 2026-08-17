import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.monthHint", L(
    "Automatik rechnet aktuellen Monat und Vormonat parallel. Ältere Monate öffnen Sie manuell.",
    "Automation calculates the current and previous month in parallel. Open older months manually.",
    "Otomasyon geçerli ve önceki ayı paralel hesaplar. Daha eski ayları elle açın.",
    "الأتمتة تحسب الشهر الحالي والسابق بالتوازي. افتح الأشهر الأقدم يدوياً.",
    "L’automatisation calcule le mois en cours et le précédent en parallèle. Ouvrez les mois plus anciens manuellement.",
    "La automatización calcula el mes actual y el anterior en paralelo. Abra meses anteriores manualmente.",
    "L’automazione calcola il mese corrente e il precedente in parallelo. Aprite i mesi più vecchi manualmente.",
    "Automatyzacja liczy bieżący i poprzedni miesiąc równolegle. Starsze miesiące otwórz ręcznie."
  )],
  ["portal.monthParallel", L("Parallel abrechnen", "Parallel payroll", "Paralel bordro", "كشف موازٍ", "Paie parallèle", "Nómina paralela", "Cedolino parallelo", "Równoległa lista")],
  ["portal.assistantTitle", L("Assistent · BMF PAP", "Assistant · BMF PAP", "Asistan · BMF PAP", "المساعد · BMF PAP", "Assistant · BMF PAP", "Asistente · BMF PAP", "Assistente · BMF PAP", "Asystent · BMF PAP")],
  ["portal.assistantBadge", L("Engine setzt Steuer", "Engine sets tax", "Motor vergiyi yazar", "المحرك يضع الضريبة", "Le moteur pose l’impôt", "El motor aplica el impuesto", "Il motore imposta l’imposta", "Silnik ustawia podatek")],
  ["portal.assistantHint", L(
    "Erklärt Lücken. Steuer nur über BMF PAP / SV gesetzlich – nach Ihrer Bestätigung. Keine erfundenen Beträge.",
    "Explains gaps. Tax only via BMF PAP / statutory SV after your confirmation. No invented amounts.",
    "Boşlukları açıklar. Vergi yalnızca BMF PAP / yasal SV – onayınızla. Uydurma tutar yok.",
    "يشرح الفجوات. الضريبة فقط عبر BMF PAP / SV gesetzlich بعد تأكيدك. بلا مبالغ مخترعة.",
    "Explique les écarts. Impôt uniquement via BMF PAP / SV gesetzlich après confirmation. Aucun montant inventé.",
    "Explica huecos. Impuesto solo vía BMF PAP / SV gesetzlich tras confirmar. Sin importes inventados.",
    "Spiega le lacune. Imposta solo via BMF PAP / SV gesetzlich dopo conferma. Nessun importo inventato.",
    "Wyjaśnia luki. Podatek tylko przez BMF PAP / SV gesetzlich po potwierdzeniu. Bez wymyślonych kwot."
  )],
  ["portal.assistantApplyTax", L("Steuer mit BMF PAP setzen", "Set tax with BMF PAP", "BMF PAP ile vergi yaz", "تعيين الضريبة عبر BMF PAP", "Appliquer l’impôt BMF PAP", "Aplicar impuesto BMF PAP", "Imposta con BMF PAP", "Ustaw podatek BMF PAP")],
  ["portal.assistantApplyTaxConfirm", L(
    "Lohnsteuer und SV werden mit der gesetzlichen Engine (BMF PAP / SV) neu berechnet. Keine geschätzten KI-Beträge.",
    "Payroll tax and SV are recalculated with the statutory engine (BMF PAP / SV). No estimated AI amounts.",
    "Lohnsteuer ve SV yasal motorla (BMF PAP / SV) yeniden hesaplanır. Tahmini KI tutarı yok.",
    "يُعاد حساب LSt و SV بالمحرك القانوني (BMF PAP / SV). بلا مبالغ تقديرية من الذكاء الاصطناعي.",
    "LSt et SV sont recalculés par le moteur légal (BMF PAP / SV). Aucun montant IA estimé.",
    "LSt y SV se recalculan con el motor legal (BMF PAP / SV). Sin importes estimados de IA.",
    "LSt e SV sono ricalcolati dal motore legale (BMF PAP / SV). Nessun importo stimato dall’IA.",
    "LSt i SV są przeliczane silnikiem ustawowym (BMF PAP / SV). Bez szacunków AI."
  )],
  ["portal.assistantApplyTaxDone", L("Steuer über BMF PAP gesetzt.", "Tax set via BMF PAP.", "Vergi BMF PAP ile yazıldı.", "تم تعيين الضريبة عبر BMF PAP.", "Impôt appliqué via BMF PAP.", "Impuesto aplicado vía BMF PAP.", "Imposta applicata via BMF PAP.", "Podatek ustawiony przez BMF PAP.")],
  ["portal.assistantDone", L("Erklärung bereit – Steuer nur über BMF PAP.", "Explanation ready – tax only via BMF PAP.", "Açıklama hazır – vergi yalnızca BMF PAP.", "الشرح جاهز – الضريبة فقط عبر BMF PAP.", "Explication prête – impôt uniquement via BMF PAP.", "Explicación lista – impuesto solo vía BMF PAP.", "Spiegazione pronta – imposta solo via BMF PAP.", "Wyjaśnienie gotowe – podatek tylko przez BMF PAP.")],
  ["portal.exportHint", L(
    "SEPA / DATEV / LODAS / ELSTER – Versand mit hinterlegtem Zertifikat möglich.",
    "SEPA / DATEV / LODAS / ELSTER – submit possible with stored certificate.",
    "SEPA / DATEV / LODAS / ELSTER – kayıtlı sertifika ile gönderim mümkün.",
    "SEPA / DATEV / LODAS / ELSTER – الإرسال ممكن بشهادة محفوظة.",
    "SEPA / DATEV / LODAS / ELSTER – envoi possible avec certificat enregistré.",
    "SEPA / DATEV / LODAS / ELSTER – envío posible con certificado guardado.",
    "SEPA / DATEV / LODAS / ELSTER – invio possibile con certificato salvato.",
    "SEPA / DATEV / LODAS / ELSTER – wysyłka możliwa z zapisanym certyfikatem."
  )],
  ["portal.elsterCert", L("ELSTER-Zertifikat (PKCS#12)", "ELSTER certificate (PKCS#12)", "ELSTER sertifikası (PKCS#12)", "شهادة ELSTER (PKCS#12)", "Certificat ELSTER (PKCS#12)", "Certificado ELSTER (PKCS#12)", "Certificato ELSTER (PKCS#12)", "Certyfikat ELSTER (PKCS#12)")],
  ["portal.elsterPin", L("Zertifikat-PIN", "Certificate PIN", "Sertifika PIN", "رمز الشهادة", "PIN du certificat", "PIN del certificado", "PIN del certificato", "PIN certyfikatu")],
  ["portal.elsterAuto", L(
    "Automatisch senden, sobald der Monat fertig ist",
    "Send automatically when the month is complete",
    "Ay tamamlanınca otomatik gönder",
    "أرسل تلقائياً عند اكتمال الشهر",
    "Envoyer automatiquement dès que le mois est clos",
    "Enviar automáticamente al cerrar el mes",
    "Invia automaticamente a mese completato",
    "Wyślij automatycznie po zamknięciu miesiąca"
  )],
  ["portal.elsterCertSave", L("Zertifikat speichern", "Save certificate", "Sertifikayı kaydet", "حفظ الشهادة", "Enregistrer le certificat", "Guardar certificado", "Salva certificato", "Zapisz certyfikat")],
  ["portal.elsterSubmit", L("ELSTER jetzt senden", "Submit ELSTER now", "ELSTER şimdi gönder", "إرسال ELSTER الآن", "Envoyer ELSTER maintenant", "Enviar ELSTER ahora", "Invia ELSTER ora", "Wyślij ELSTER teraz")],
  ["portal.elsterCertMissing", L("Noch kein Zertifikat hinterlegt.", "No certificate stored yet.", "Henüz sertifika yok.", "لا شهادة محفوظة بعد.", "Aucun certificat enregistré.", "Aún no hay certificado.", "Nessun certificato salvato.", "Brak zapisanego certyfikatu.")],
  ["portal.elsterCertOk", L(
    "Zertifikat gespeichert · Auto-Versand {auto} · Fingerprint {fp}",
    "Certificate stored · auto-submit {auto} · fingerprint {fp}",
    "Sertifika kayıtlı · otomatik {auto} · parmak izi {fp}",
    "الشهادة محفوظة · إرسال تلقائي {auto} · بصمة {fp}",
    "Certificat enregistré · envoi auto {auto} · empreinte {fp}",
    "Certificado guardado · envío auto {auto} · huella {fp}",
    "Certificato salvato · invio auto {auto} · impronta {fp}",
    "Certyfikat zapisany · auto {auto} · odcisk {fp}"
  )],
  ["portal.elsterCertNeedFile", L("Bitte PKCS#12-Datei wählen.", "Please choose a PKCS#12 file.", "Lütfen PKCS#12 dosyası seçin.", "يرجى اختيار ملف PKCS#12.", "Veuillez choisir un fichier PKCS#12.", "Elija un archivo PKCS#12.", "Scegliere un file PKCS#12.", "Wybierz plik PKCS#12.")],
  ["portal.elsterCertConfirm", L("Zertifikat und PIN werden verschlüsselt gespeichert.", "Certificate and PIN are stored encrypted.", "Sertifika ve PIN şifreli saklanır.", "الشهادة ورمز PIN يُحفظان مشفّرين.", "Le certificat et le PIN sont stockés chiffrés.", "El certificado y el PIN se guardan cifrados.", "Certificato e PIN sono salvati cifrati.", "Certyfikat i PIN są przechowywane zaszyfrowane.")],
  ["portal.elsterCertSaved", L("Zertifikat gespeichert.", "Certificate saved.", "Sertifika kaydedildi.", "تم حفظ الشهادة.", "Certificat enregistré.", "Certificado guardado.", "Certificato salvato.", "Certyfikat zapisany.")],
  ["portal.elsterSubmitConfirm", L(
    "LStB-XML mit hinterlegtem Zertifikat an den ELSTER-Kanal übermitteln.",
    "Submit LStB XML with the stored certificate to the ELSTER channel.",
    "Kayıtlı sertifika ile LStB-XML’i ELSTER kanalına gönder.",
    "إرسال LStB-XML بالشهادة المحفوظة إلى قناة ELSTER.",
    "Transmettre le XML LStB avec le certificat au canal ELSTER.",
    "Enviar el XML LStB con el certificado al canal ELSTER.",
    "Inviare l’XML LStB con il certificato al canale ELSTER.",
    "Wyślij XML LStB z certyfikatem do kanału ELSTER."
  )],
  ["portal.elsterPrepDone", L(
    "ELSTER-Checkliste geladen.",
    "ELSTER checklist loaded.",
    "ELSTER listesi yüklendi.",
    "تم تحميل قائمة ELSTER.",
    "Checklist ELSTER chargée.",
    "Lista ELSTER cargada.",
    "Checklist ELSTER caricata.",
    "Checklist ELSTER załadowana."
  )],
  ["portal.opEngineTax", L("Steuer mit BMF PAP gesetzt", "Tax set with BMF PAP", "Vergi BMF PAP ile yazıldı", "تم تعيين الضريبة عبر BMF PAP", "Impôt via BMF PAP", "Impuesto vía BMF PAP", "Imposta via BMF PAP", "Podatek przez BMF PAP")],
  ["portal.opElsterSubmit", L("ELSTER-Übermittlung", "ELSTER submission", "ELSTER gönderimi", "إرسال ELSTER", "Transmission ELSTER", "Envío ELSTER", "Invio ELSTER", "Wysyłka ELSTER")],
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
