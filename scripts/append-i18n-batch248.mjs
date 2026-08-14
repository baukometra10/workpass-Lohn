import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["hf.title", L("Menschliche Bestätigung", "Human confirmation", "İnsan onayı", "تأكيد بشري", "Confirmation humaine", "Confirmación humana", "Conferma umana", "Potwierdzenie człowieka")],
  ["hf.policy", L("KI setzt keine Steuerwerte. Sie bestätigen die Aktion.", "AI sets no tax values. You confirm the action.", "Yapay zeka vergi koymaz. Eylemi siz onaylarsınız.", "الذكاء الاصطناعي لا يضع قيماً ضريبية. أنت تؤكد الإجراء.", "L’IA ne fixe pas l’impôt. Vous confirmez.", "La IA no fija impuestos. Usted confirma.", "L’IA non imposta tasse. Confermate voi.", "AI nie ustala podatku. Ty potwierdzasz.")],
  ["hf.check", L("Ich habe geprüft und bestätige als Mensch.", "I reviewed and confirm as a human.", "Kontrol ettim, insan olarak onaylıyorum.", "راجعتُ وأؤكد كإنسان.", "J’ai vérifié et confirme en tant qu’humain.", "Revisé y confirmo como humano.", "Ho verificato e confermo come umano.", "Sprawdziłem i potwierdzam jako człowiek.")],
  ["hf.cancel", L("Abbrechen", "Cancel", "İptal", "إلغاء", "Annuler", "Cancelar", "Annulla", "Anuluj")],
  ["hf.confirm", L("Bestätigen", "Confirm", "Onayla", "تأكيد", "Confirmer", "Confirmar", "Conferma", "Potwierdź")],
  ["hf.needCheck", L("Bitte Bestätigung anklicken.", "Please tick the confirmation.", "Lütfen onayı işaretleyin.", "يرجى وضع علامة التأكيد.", "Cochez la confirmation.", "Marque la confirmación.", "Spuntate la conferma.", "Zaznacz potwierdzenie.")],
  ["portal.trustReplay", L("Zustellung erneut anstoßen", "Retry delivery", "Teslimi yeniden dene", "إعادة التسليم", "Relancer la livraison", "Reintentar entrega", "Rilanciare consegna", "Ponów dostawę")],
  ["portal.trustReplayTitle", L("Zustellung erneut?", "Retry delivery?", "Teslim yeniden?", "إعادة التسليم؟", "Relancer la livraison ?", "¿Reintentar entrega?", "Rilanciare consegna?", "Ponowić dostawę?")],
  ["portal.trustReplayBody", L("Webhook/Delivery erneut anstoßen. KI sendet keine Steuerwerte – nur Transport.", "Retry webhook/delivery. AI sends no tax – transport only.", "Webhook/teslim yeniden. Yapay zeka vergi göndermez.", "إعادة الويب هوك. الذكاء الاصطناعي لا يرسل ضريبة.", "Relancer webhook. L’IA n’envoie pas d’impôt.", "Reintentar webhook. La IA no envía impuestos.", "Rilanciare webhook. L’IA non invia tasse.", "Ponów webhook. AI nie wysyła podatku.")],
  ["portal.trustReplayDone", L("Zustellung angestoßen.", "Delivery triggered.", "Teslim tetiklendi.", "تم تشغيل التسليم.", "Livraison déclenchée.", "Entrega disparada.", "Consegna avviata.", "Dostawa uruchomiona.")],
  ["portal.calendarBlocker", L("blockiert Abschluss", "blocks close", "kapanışı engeller", "يعطل الإقفال", "bloque la clôture", "bloquea el cierre", "blocca la chiusura", "blokuje zamknięcie")],
  ["portal.simulateTitle", L("What-if · Simulation", "What-if · Simulation", "What-if · Simülasyon", "ماذا لو · محاكاة", "What-if · Simulation", "What-if · Simulación", "What-if · Simulazione", "What-if · Symulacja")],
  ["portal.simulateBadge", L("Nicht speichern", "Not saved", "Kaydedilmez", "بدون حفظ", "Non enregistré", "No se guarda", "Non salvato", "Bez zapisu")],
  ["portal.simulateHint", L("Stunden ändern → Netto-Vorschau. Keine Freigabe, keine Steuerübernahme durch KI.", "Change hours → net preview. No release, no AI tax apply.", "Saat değiştir → net önizleme. Onay/yapay zeka vergi yok.", "غيّر الساعات → معاينة الصافي. بلا إصدار وبلا ضريبة من الذكاء الاصطناعي.", "Changer les heures → aperçu net. Pas de libération ni d’impôt IA.", "Cambiar horas → vista neta. Sin liberación ni impuesto IA.", "Cambia ore → anteprima netto. Niente rilascio né tasse IA.", "Zmień godziny → podgląd netto. Bez zwolnienia i podatku AI.")],
  ["portal.simulateJob", L("Job-ID (optional)", "Job ID (optional)", "Job-ID (opsiyonel)", "معرّف المهمة (اختياري)", "Job-ID (optionnel)", "Job-ID (opcional)", "Job-ID (opzionale)", "Job-ID (opcjonalnie)")],
  ["portal.simulateHours", L("Stunden", "Hours", "Saat", "ساعات", "Heures", "Horas", "Ore", "Godziny")],
  ["portal.simulateRun", L("Simulieren", "Simulate", "Simüle et", "محاكاة", "Simuler", "Simular", "Simula", "Symuluj")],
  ["portal.simulateDone", L("Simulation fertig – nichts gespeichert.", "Simulation done – nothing saved.", "Simülasyon bitti – kaydedilmedi.", "انتهت المحاكاة – لم يُحفظ شيء.", "Simulation terminée – rien enregistré.", "Simulación lista – nada guardado.", "Simulazione finita – niente salvato.", "Symulacja gotowa – nic nie zapisano.")],
  ["portal.exportConfirmTitle", L("Export bestätigen", "Confirm export", "Dışa aktarımı onayla", "تأكيد التصدير", "Confirmer l’export", "Confirmar exportación", "Conferma export", "Potwierdź eksport")],
  ["portal.monthCloseTitle", L("Monatsabschluss", "Month close", "Ay kapanışı", "إقفال الشهر", "Clôture du mois", "Cierre de mes", "Chiusura mese", "Zamknięcie miesiąca")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
