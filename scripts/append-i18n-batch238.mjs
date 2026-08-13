import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["missing.hardTitle", L("Pflichtfelder fehlen", "Required fields missing", "Zorunlu alanlar eksik", "حقول إلزامية ناقصة", "Champs obligatoires manquants", "Faltan campos obligatorios", "Campi obbligatori mancanti", "Brakuje wymaganych pól")],
  ["missing.softTitle", L("Empfohlene Angaben", "Recommended details", "Önerilen bilgiler", "بيانات مستحسنة", "Informations recommandées", "Datos recomendados", "Dati consigliati", "Zalecane dane")],
  ["missing.expand", L("Details anzeigen", "Show details", "Detayları göster", "عرض التفاصيل", "Afficher les détails", "Mostrar detalles", "Mostra dettagli", "Pokaż szczegóły")],
  ["missing.collapse", L("Zuklappen", "Collapse", "Daralt", "طيّ", "Réduire", "Contraer", "Comprimi", "Zwiń")],
  ["missing.askPlatform", L("Vorhandene Daten holen / Lücken melden", "Fetch existing data / report gaps", "Mevcut verileri al / eksikleri bildir", "جلب البيانات الموجودة / إبلاغ النواقص", "Récupérer les données / signaler les lacunes", "Obtener datos / informar huecos", "Recupera dati / segnala lacune", "Pobierz dane / zgłoś braki")],
  ["missing.askHint", L("Wir laden zuerst Stammdaten und Vertrag aus der Plattform. Nur was dort wirklich fehlt, wird nachgefragt.", "We first load master data and contract from the platform. Only real gaps are requested.", "Önce platformdan ana veri ve sözleşme yüklenir. Yalnızca gerçek eksikler sorulur.", "نحمّل أولاً البيانات الأساسية والعقد من المنصة. يُطلب فقط ما ينقص فعلاً.", "Nous chargeons d’abord les données et le contrat depuis la plateforme. Seuls les vrais manques sont demandés.", "Primero cargamos datos y contrato desde la plataforma. Solo se piden huecos reales.", "Carichiamo prima anagrafica e contratto dalla piattaforma. Si chiedono solo le lacune reali.", "Najpierw ładujemy dane i umowę z platformy. Prosimy tylko o realne braki.")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
