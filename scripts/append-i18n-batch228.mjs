import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["lohn.netDeductions", L("Sonstige Netto-Abzüge €", "Other net deductions €", "Diğer net kesintiler €", "خصومات صافية أخرى €", "Autres retenues nettes €", "Otras deducciones netas €", "Altre trattenute nette €", "Inne potrącenia netto €")],
  ["lohn.pvChildless", L("PV-Zuschlag kinderlos (ab 23)", "Long-term care surcharge childless (from 23)", "PV zammı çocuksuz (23+)", "زيادة رعاية بدون أطفال (من 23)", "Majoration PV sans enfant (dès 23)", "Recargo PV sin hijos (desde 23)", "Maggiorazione PV senza figli (da 23)", "Dopłata PV bezdzietni (od 23)")],
  ["lohn.pvChildlessLong", L("PV-Zuschlag kinderlos (ab 23 J., +0,6 %)", "Long-term care surcharge childless (from age 23, +0.6%)", "PV zammı çocuksuz (23+, +%0,6)", "زيادة رعاية بدون أطفال (من 23 سنة، +0.6٪)", "Majoration PV sans enfant (dès 23 ans, +0,6 %)", "Recargo PV sin hijos (desde 23, +0,6 %)", "Maggiorazione PV senza figli (da 23 anni, +0,6 %)", "Dopłata PV bezdzietni (od 23 lat, +0,6 %)")],
  ["lohn.miniRvExempt", L("Minijob: RV-Befreiung (kein AN-Anteil RV)", "Minijob: pension exemption (no employee pension share)", "Minijob: RV muafiyeti (çalışan payı yok)", "Minijob: إعفاء تقاعد (بدون حصة الموظف)", "Minijob : exonération retraite (pas de part salarié)", "Minijob: exención pensión (sin parte empleado)", "Minijob: esenzione pensione (niente quota dipendente)", "Minijob: zwolnienie emerytalne (bez składki pracownika)")],
  ["lohn.miniTaxable", L("Minijob: individuelle Lohnsteuer (statt Pauschale)", "Minijob: individual wage tax (instead of flat rate)", "Minijob: bireysel gelir vergisi (sabit yerine)", "Minijob: ضريبة أجور فردية (بدل المقطوع)", "Minijob : impôt individuel (au lieu du forfait)", "Minijob: impuesto individual (en vez de tipo fijo)", "Minijob: imposta individuale (al posto del forfait)", "Minijob: indywidualny podatek (zamiast ryczałtu)")],
  ["lohn.factorMethod", L("Faktorverfahren (nur Steuerklasse IV)", "Factor method (tax class IV only)", "Faktör yöntemi (yalnızca vergi sınıfı IV)", "طريقة العامل (فئة ضريبية IV فقط)", "Méthode du facteur (classe IV uniquement)", "Método del factor (solo clase IV)", "Metodo del fattore (solo classe IV)", "Metoda współczynnika (tylko klasa IV)")],
  ["lohn.factorMethodIv", L("Faktorverfahren (Steuerklasse IV)", "Factor method (tax class IV)", "Faktör yöntemi (vergi sınıfı IV)", "طريقة العامل (فئة ضريبية IV)", "Méthode du facteur (classe IV)", "Método del factor (clase IV)", "Metodo del fattore (classe IV)", "Metoda współczynnika (klasa IV)")],
  ["lohn.factor", L("Faktor", "Factor", "Faktör", "العامل", "Facteur", "Factor", "Fattore", "Współczynnik")],
  ["lohn.brutto", L("Brutto", "Gross", "Brüt", "الإجمالي", "Brut", "Bruto", "Lordo", "Brutto")],
  ["lohn.netto", L("Netto", "Net", "Net", "الصافي", "Net", "Neto", "Netto", "Netto")],
  ["lohn.bankPayout", L("Bank (Auszahlung)", "Bank (payout)", "Banka (ödeme)", "البنك (الصرف)", "Banque (versement)", "Banco (pago)", "Banca (pagamento)", "Bank (wypłata)")],
  ["lohn.otherBank", L("Andere Bank", "Other bank", "Diğer banka", "بنك آخر", "Autre banque", "Otro banco", "Altra banca", "Inny bank")],
  ["lohn.kvExtra", L("KV-Zusatzbeitrag gesamt (%)", "Health fund extra contribution total (%)", "Sağlık ek katkı toplam (%)", "مساهمة التأمين الصحي الإضافية الإجمالية (%)", "Cotisation maladie additionnelle (%)", "Cotización extra salud total (%)", "Contributo aggiuntivo malattia (%)", "Dodatkowa składka zdrowotna (%)")],
  ["lohn.calcHintLegal", L(
    "Berechnung: BMF PAP 2026 · SV SGB IV 2026 (BBG, Mini-/Midijob, AG/AN getrennt)",
    "Calculation: BMF PAP 2026 · SS SGB IV 2026 (ceilings, mini/midi job, employer/employee split)",
    "Hesaplama: BMF PAP 2026 · SV SGB IV 2026 (BBG, Mini-/Midijob, AG/AN ayrı)",
    "الحساب: BMF PAP 2026 · SV SGB IV 2026 (BBG، Mini-/Midijob، فصل صاحب العمل/الموظف)",
    "Calcul : BMF PAP 2026 · SV SGB IV 2026 (plafonds, mini/midi, AG/AN séparés)",
    "Cálculo: BMF PAP 2026 · SV SGB IV 2026 (topes, mini/midi, AG/AN separados)",
    "Calcolo: BMF PAP 2026 · SV SGB IV 2026 (massimali, mini/midi, AG/AN separati)",
    "Obliczenie: BMF PAP 2026 · SV SGB IV 2026 (limity, mini/midi, AG/AN osobno)"
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
const lines = filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n");
if (lines) {
  s = s.replace(/\];\s*$/, `${lines}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length, "skipped", extra.length - filtered.length);
