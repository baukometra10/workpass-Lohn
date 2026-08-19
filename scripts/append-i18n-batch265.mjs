import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["lohn.previewEmptyNext", L(
    "Als Nächstes: „Jetzt synchronisieren“ – dann erscheint die Live-Vorschau hier rechts.",
    "Next: tap “Sync now” – the live preview appears on the right.",
    "Sonraki: „Jetzt synchronisieren“ – canlı önizleme sağda görünür.",
    "التالي: «Jetzt synchronisieren» — ثم تظهر المعاينة المباشرة على اليمين.",
    "Ensuite : « Jetzt synchronisieren » – l’aperçu live apparaît à droite.",
    "Siguiente: «Jetzt synchronisieren» – la vista previa en vivo aparece a la derecha.",
    "Poi: «Jetzt synchronisieren» – l’anteprima live compare a destra.",
    "Dalej: „Jetzt synchronisieren” – podgląd na żywo pojawi się po prawej."
  )],
  ["portal.syncNow", L(
    "Jetzt synchronisieren",
    "Sync now",
    "Şimdi senkronize et",
    "زامن الآن",
    "Synchroniser maintenant",
    "Sincronizar ahora",
    "Sincronizza ora",
    "Synchronizuj teraz"
  )],
  ["status.firmReady", L(
    "Firmen-Portal bereit – tippen Sie auf „Jetzt synchronisieren“, dann erscheinen Mitarbeiter und die A4-Vorschau.",
    "Firm portal ready – tap “Sync now” to load employees and the A4 preview.",
    "Firma portalı hazır – „Jetzt synchronisieren“ ile çalışanlar ve A4 önizleme gelir.",
    "بوابة الشركة جاهزة — اضغط «Jetzt synchronisieren» لظهور الموظفين ومعاينة A4.",
    "Portail entreprise prêt – touchez « Jetzt synchronisieren » pour les salariés et l’aperçu A4.",
    "Portal de empresa listo – pulse «Jetzt synchronisieren» para empleados y vista A4.",
    "Portale azienda pronto – tocca «Jetzt synchronisieren» per dipendenti e anteprima A4.",
    "Portal firmy gotowy – kliknij „Jetzt synchronisieren”, by wczytać pracowników i podgląd A4."
  )],
];

const existing = new Set(
  [...s.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]).concat(
    [...s.matchAll(/\["([^"]+)",/g)].map((m) => m[1])
  )
);
const toAdd = extra.filter(([key]) => !existing.has(key));
if (!toAdd.length) {
  console.log("Batch 265: nothing to append (keys already present)");
  process.exit(0);
}

const block = toAdd.map(([key, loc]) => {
  const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const inner = langs.map((lang) => `      ${lang}: ${JSON.stringify(loc[lang])}`).join(",\n");
  return `  {\n    key: ${JSON.stringify(key)},\n    locales: {\n${inner}\n    }\n  }`;
}).join(",\n");

s = s.replace(/\];\s*$/, `,\n${block}\n];\n`);
fs.writeFileSync(path, s);
console.log(`Appended ${toAdd.length} keys (batch 265)`);
