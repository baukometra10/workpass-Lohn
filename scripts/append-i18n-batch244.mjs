import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["admin.taxRulesTitle", L(
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine",
    "Tax Rules Engine"
  )],
  ["admin.taxRulesHint", L(
    "Veröffentlicht: live in der Berechnung. Entwürfe (z. B. KI-Extrakt) müssen reviewt und veröffentlicht werden – die Buchhaltung liest keine Gesetze selbst.",
    "Published: live in calculation. Drafts (e.g. AI extract) must be reviewed and published – accounting never reads statutes itself.",
    "Yayınlanan: canlı hesaplama. Taslaklar (örn. yapay zeka) incelenip yayınlanmalı – muhasebe yasaları kendi okumaz.",
    "المنشور: حي في الحساب. المسودات (مثل استخراج بالذكاء الاصطناعي) يجب مراجعتها ونشرها – المحاسبة لا تقرأ القوانين بنفسها.",
    "Publié : actif en calcul. Les brouillons (ex. IA) doivent être revus et publiés – la compta ne lit pas les lois elle-même.",
    "Publicado: vivo en el cálculo. Los borradores (p. ej. IA) deben revisarse y publicarse – la contabilidad no lee las leyes.",
    "Pubblicato: live nel calcolo. Le bozze (es. IA) vanno revisionate e pubblicate – la contabilità non legge le leggi.",
    "Opublikowane: na żywo w kalkulacji. Szkice (np. AI) trzeba zrecenzować i opublikować – księgowość sama nie czyta ustaw."
  )],
  ["admin.taxRulesRefresh", L(
    "Rulesets laden",
    "Load rulesets",
    "Rulesetleri yükle",
    "تحميل القواعد",
    "Charger les rulesets",
    "Cargar rulesets",
    "Carica ruleset",
    "Wczytaj rulesety"
  )],
  ["admin.taxThId", L("ID", "ID", "ID", "المعرّف", "ID", "ID", "ID", "ID")],
  ["admin.taxThStatus", L("Status", "Status", "Durum", "الحالة", "Statut", "Estado", "Stato", "Status")],
  ["admin.taxThFrom", L(
    "Gültig ab",
    "Effective from",
    "Geçerlilik",
    "ساري من",
    "Valide à partir de",
    "Válido desde",
    "Valido da",
    "Obowiązuje od"
  )],
  ["admin.taxThPap", L(
    "BMF PAP",
    "BMF PAP",
    "BMF PAP",
    "BMF PAP",
    "BMF PAP",
    "BMF PAP",
    "BMF PAP",
    "BMF PAP"
  )],
  ["admin.taxThActions", L(
    "Aktion",
    "Action",
    "İşlem",
    "إجراء",
    "Action",
    "Acción",
    "Azione",
    "Akcja"
  )],
  ["admin.taxReview", L("Review", "Review", "İncele", "مراجعة", "Revue", "Revisar", "Revisione", "Recenzja")],
  ["admin.taxPublish", L(
    "Veröffentlichen",
    "Publish",
    "Yayınla",
    "نشر",
    "Publier",
    "Publicar",
    "Pubblica",
    "Opublikuj"
  )],
  ["admin.taxLive", L("Live", "Live", "Canlı", "مباشر", "Live", "En vivo", "Live", "Na żywo")],
  ["admin.taxEmpty", L(
    "Keine Rulesets.",
    "No rulesets.",
    "Ruleset yok.",
    "لا قواعد.",
    "Aucun ruleset.",
    "Sin rulesets.",
    "Nessun ruleset.",
    "Brak rulesetów."
  )],
  ["admin.taxReviewed", L(
    "Ruleset reviewt: {id}",
    "Ruleset reviewed: {id}",
    "Ruleset incelendi: {id}",
    "تمت مراجعة القاعدة: {id}",
    "Ruleset revu : {id}",
    "Ruleset revisado: {id}",
    "Ruleset revisionato: {id}",
    "Ruleset zrecenzowany: {id}"
  )],
  ["admin.taxPublished", L(
    "Ruleset veröffentlicht: {id}",
    "Ruleset published: {id}",
    "Ruleset yayınlandı: {id}",
    "نُشرت القاعدة: {id}",
    "Ruleset publié : {id}",
    "Ruleset publicado: {id}",
    "Ruleset pubblicato: {id}",
    "Ruleset opublikowany: {id}"
  )],
  ["admin.taxConfirmPublish", L(
    "Ruleset „{id}“ wirklich veröffentlichen? Danach gilt es live ab effectiveFrom.",
    "Really publish ruleset “{id}”? It then applies live from effectiveFrom.",
    "“{id}” ruleseti gerçekten yayınlansın mı? Sonra effectiveFrom’dan itibaren canlı olur.",
    "هل تنشر القاعدة «{id}» فعلاً؟ بعدها تُطبَّق مباشرة من effectiveFrom.",
    "Publier vraiment le ruleset « {id} » ? Il s’applique ensuite dès effectiveFrom.",
    "¿Publicar de verdad el ruleset “{id}”? Luego aplica en vivo desde effectiveFrom.",
    "Pubblicare davvero il ruleset “{id}”? Poi vale live da effectiveFrom.",
    "Naprawdę opublikować ruleset „{id}”? Potem obowiązuje na żywo od effectiveFrom."
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
