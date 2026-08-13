import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["portal.completenessTitle", L("Abrechnungs-Checkliste", "Payslip checklist", "Bordro kontrol listesi", "قائمة فحص كشف الراتب", "Liste de contrôle bulletin", "Lista de nómina", "Checklist cedolino", "Lista kontrolna paska")],
  ["portal.completenessHint", L("Logo, Firma, Personal-Nr., Stunden, SV, KK und Netto auf einen Blick.", "Logo, company, personnel no., hours, SV, KK and net at a glance.", "Logo, firma, personel no., saat, SV, KK ve net bir bakışta.", "الشعار والشركة ورقم الموظف والساعات وSV وKK والصافي بنظرة واحدة.", "Logo, société, n° personnel, heures, SV, KK et net d’un coup d’œil.", "Logo, empresa, n.º personal, horas, SV, KK y neto de un vistazo.", "Logo, azienda, matrcola, ore, SV, KK e netto a colpo d’occhio.", "Logo, firma, nr personalny, godziny, SV, KK i netto w skrócie.")],
  ["portal.checkComplete", L("Vollständig", "Complete", "Tam", "مكتمل", "Complet", "Completo", "Completo", "Kompletne")],
  ["portal.checkLogo", L("Logo", "Logo", "Logo", "الشعار", "Logo", "Logo", "Logo", "Logo")],
  ["portal.checkReady", L("Monatsbereit", "Month-ready", "Aya hazır", "جاهز للشهر", "Prêt pour le mois", "Listo para el mes", "Pronto per il mese", "Gotowe na miesiąc")],
  ["portal.checkOpen", L("Noch Lücken", "Still gaps", "Hâlâ eksikler", "ما زالت هناك نواقص", "Encore des lacunes", "Aún hay huecos", "Ancora lacune", "Jeszcze braki")],
  ["portal.monthLodas", L("LODAS-Monat exportieren", "Export LODAS month", "LODAS ayını dışa aktar", "تصدير شهر LODAS", "Exporter le mois LODAS", "Exportar mes LODAS", "Esporta mese LODAS", "Eksportuj miesiąc LODAS")],
  ["portal.monthLodasEmpty", L("Keine freigegebenen Abrechnungen für LODAS in diesem Monat.", "No released payslips for LODAS this month.", "Bu ay LODAS için onaylı bordro yok.", "لا كشوف معتمدة لـ LODAS هذا الشهر.", "Aucun bulletin publié pour LODAS ce mois-ci.", "No hay nóminas liberadas para LODAS este mes.", "Nessun cedolino rilasciato per LODAS questo mese.", "Brak zwolnionych pasków LODAS w tym miesiącu.")],
  ["portal.monthLodasOk", L("LODAS-Paket exportiert ({n} MA).", "LODAS package exported ({n} employees).", "LODAS paketi dışa aktarıldı ({n} çalışan).", "تم تصدير حزمة LODAS ({n} موظف).", "Pack LODAS exporté ({n} employés).", "Paquete LODAS exportado ({n} empleados).", "Pacchetto LODAS esportato ({n} dipendenti).", "Wyeksportowano pakiet LODAS ({n} pracowników).")],
  ["portal.monthLodasFail", L("LODAS-Export fehlgeschlagen", "LODAS export failed", "LODAS dışa aktarma başarısız", "فشل تصدير LODAS", "Échec export LODAS", "Falló exportación LODAS", "Esportazione LODAS non riuscita", "Eksport LODAS nieudany")],
  ["portal.exportWarnings", L("Hinweise", "warnings", "uyarı", "تنبيهات", "avertissements", "avisos", "avvisi", "ostrzeżenia")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
