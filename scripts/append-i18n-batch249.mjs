import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.gobdExport", L("GoBD Export", "GoBD export", "GoBD dışa aktarım", "تصدير GoBD", "Export GoBD", "Exportación GoBD", "Export GoBD", "Eksport GoBD")],
  ["portal.gobdExportTitle", L("GoBD-Export bestätigen", "Confirm GoBD export", "GoBD dışa aktarımı onayla", "تأكيد تصدير GoBD", "Confirmer l’export GoBD", "Confirmar exportación GoBD", "Conferma export GoBD", "Potwierdź eksport GoBD")],
  ["portal.gobdExportBody", L("Erstellt ein Prüfungs-Paket (JSON) für diesen Mandanten. Keine Änderung an Belegen.", "Creates an audit package (JSON) for this tenant. No document changes.", "Bu kiracı için denetim paketi. Belge değişmez.", "ينشئ حزمة فحص لهذا المستأجر. بلا تغيير للمستندات.", "Crée un paquet d’audit. Aucune modification.", "Crea un paquete de auditoría. Sin cambios.", "Crea un pacchetto di audit. Nessuna modifica.", "Tworzy pakiet audytu. Bez zmian dokumentów.")],
  ["portal.gobdExportDone", L("GoBD-Export erstellt.", "GoBD export created.", "GoBD dışa aktarım hazır.", "تم إنشاء تصدير GoBD.", "Export GoBD créé.", "Exportación GoBD creada.", "Export GoBD creato.", "Eksport GoBD utworzony.")],
  ["portal.gobdTitle", L("GoBD · Prüfung & Korrektur", "GoBD · Audit & correction", "GoBD · Denetim & düzeltme", "GoBD · فحص وتصحيح", "GoBD · Contrôle & correction", "GoBD · Auditoría y corrección", "GoBD · Controllo e correzione", "GoBD · Kontrola i korekta")],
  ["portal.gobdHint", L("Freigegebene Abrechnungen sind unveränderlich. Korrektur nur mit Grund. Sync-Status und Audit einsehen.", "Released payslips are immutable. Correction needs a reason. View sync status and audit.", "Onaylı bordro değişmez. Düzeltme için gerekçe. Sync/audit görün.", "الكشوف المعتمدة غير قابلة للتغيير. التصحيح يحتاج سبباً. اعرض المزامنة والتدقيق.", "Bulletins validés immuables. Correction avec motif. Voir sync/audit.", "Nóminas liberadas inmutables. Corrección con motivo. Ver sync/auditoría.", "Cedolini rilasciati immutabili. Correzione con motivo. Vedi sync/audit.", "Zwolnione paski niezmienne. Korekta z powodem. Zobacz sync/audyt.")],
  ["portal.correctJob", L("Job-ID", "Job ID", "Job-ID", "معرّف المهمة", "Job-ID", "Job-ID", "Job-ID", "Job-ID")],
  ["portal.correctReason", L("Korrekturgrund", "Correction reason", "Düzeltme gerekçesi", "سبب التصحيح", "Motif de correction", "Motivo de corrección", "Motivo correzione", "Powód korekty")],
  ["portal.correctDelta", L("Lohnart ± € (erste Position)", "Wage type ± € (first line)", "Ücret kalemi ± € (ilk)", "بند الأجر ± € (الأول)", "Type de salaire ± € (1ère ligne)", "Concepto ± € (primera)", "Voce ± € (prima)", "Składnik ± € (pierwszy)")],
  ["portal.correctRun", L("Korrektur speichern", "Save correction", "Düzeltmeyi kaydet", "حفظ التصحيح", "Enregistrer la correction", "Guardar corrección", "Salva correzione", "Zapisz korektę")],
  ["portal.gobdAudit", L("Audit laden", "Load audit", "Denetimi yükle", "تحميل التدقيق", "Charger l’audit", "Cargar auditoría", "Carica audit", "Wczytaj audyt")],
  ["portal.gobdSync", L("Sync-Status", "Sync status", "Sync durumu", "حالة المزامنة", "Statut sync", "Estado sync", "Stato sync", "Status sync")],
  ["portal.correctNeedJob", L("Job-ID fehlt.", "Job ID missing.", "Job-ID eksik.", "معرّف المهمة ناقص.", "Job-ID manquant.", "Falta Job-ID.", "Manca Job-ID.", "Brak Job-ID.")],
  ["portal.correctNeedReason", L("Korrekturgrund fehlt.", "Correction reason missing.", "Gerekçe eksik.", "سبب التصحيح ناقص.", "Motif manquant.", "Falta el motivo.", "Manca il motivo.", "Brak powodu.")],
  ["portal.correctTitle", L("Korrektur bestätigen", "Confirm correction", "Düzeltmeyi onayla", "تأكيد التصحيح", "Confirmer la correction", "Confirmar corrección", "Conferma correzione", "Potwierdź korektę")],
  ["portal.correctBody", L("Original wird archiviert. Erneute Freigabe nötig. Keine stille Überschreibung.", "Original is archived. Re-release required. No silent overwrite.", "Orijinal arşivlenir. Yeniden onay gerekir. Sessiz üzerine yazma yok.", "يُأرشف الأصل. يلزم إعادة الإصدار. بلاOverwrite صامت.", "Original archivé. Nouvelle validation requise. Pas d’écrasement silencieux.", "Original archivado. Se requiere nueva liberación. Sin sobrescritura silenciosa.", "Originale archiviato. Nuovo rilascio richiesto. Nessuna sovrascrittura silenziosa.", "Oryginał archiwizowany. Wymagane ponowne zwolnienie. Bez cichego nadpisania.")],
  ["portal.correctDone", L("Korrektur gespeichert.", "Correction saved.", "Düzeltme kaydedildi.", "تم حفظ التصحيح.", "Correction enregistrée.", "Corrección guardada.", "Correzione salvata.", "Korekta zapisana.")],
  ["portal.gobdAuditDone", L("Audit geladen.", "Audit loaded.", "Denetim yüklendi.", "تم تحميل التدقيق.", "Audit chargé.", "Auditoría cargada.", "Audit caricato.", "Audyt wczytany.")],
  ["portal.gobdSyncDone", L("Sync-Status geladen.", "Sync status loaded.", "Sync durumu yüklendi.", "تم تحميل حالة المزامنة.", "Statut sync chargé.", "Estado sync cargado.", "Stato sync caricato.", "Status sync wczytany.")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
