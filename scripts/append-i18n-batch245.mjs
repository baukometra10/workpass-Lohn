import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["admin.taxIngestLabel", L(
    "Entwurf einspielen (JSON, immer draft)",
    "Ingest draft (JSON, always draft)",
    "Taslak yükle (JSON, her zaman draft)",
    "إدخال مسودة (JSON، دائماً draft)",
    "Importer un brouillon (JSON, toujours draft)",
    "Importar borrador (JSON, siempre draft)",
    "Importa bozza (JSON, sempre draft)",
    "Wgraj szkic (JSON, zawsze draft)"
  )],
  ["admin.taxIngestFile", L(
    "JSON-Datei wählen",
    "Choose JSON file",
    "JSON dosyası seç",
    "اختيار ملف JSON",
    "Choisir un fichier JSON",
    "Elegir archivo JSON",
    "Scegli file JSON",
    "Wybierz plik JSON"
  )],
  ["admin.taxIngest", L(
    "Als Entwurf speichern",
    "Save as draft",
    "Taslak olarak kaydet",
    "حفظ كمسودة",
    "Enregistrer comme brouillon",
    "Guardar como borrador",
    "Salva come bozza",
    "Zapisz jako szkic"
  )],
  ["admin.taxIngestNeedJson", L(
    "Bitte JSON-Entwurf einfügen oder Datei wählen.",
    "Please paste a JSON draft or choose a file.",
    "JSON taslağı yapıştırın veya dosya seçin.",
    "ألصق مسودة JSON أو اختر ملفاً.",
    "Collez un brouillon JSON ou choisissez un fichier.",
    "Pegue un borrador JSON o elija un archivo.",
    "Incolla una bozza JSON o scegli un file.",
    "Wklej szkic JSON lub wybierz plik."
  )],
  ["admin.taxIngestBadJson", L(
    "JSON ungültig.",
    "Invalid JSON.",
    "JSON geçersiz.",
    "JSON غير صالح.",
    "JSON invalide.",
    "JSON no válido.",
    "JSON non valido.",
    "Nieprawidłowy JSON."
  )],
  ["admin.taxIngestBusy", L(
    "Speichert…",
    "Saving…",
    "Kaydediliyor…",
    "جارٍ الحفظ…",
    "Enregistrement…",
    "Guardando…",
    "Salvataggio…",
    "Zapisywanie…"
  )],
  ["admin.taxIngested", L(
    "Entwurf gespeichert: {id}",
    "Draft saved: {id}",
    "Taslak kaydedildi: {id}",
    "حُفظت المسودة: {id}",
    "Brouillon enregistré : {id}",
    "Borrador guardado: {id}",
    "Bozza salvata: {id}",
    "Szkic zapisany: {id}"
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length);
