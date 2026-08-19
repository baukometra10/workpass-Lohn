/**
 * Accurate Steuerprogramm i18n/version audit.
 * Run: node scripts/audit-steuerprogramm.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const langs = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
const strongTokens = ["DATEV", "LODAS", "ELSTER", "LStB", "IBAN", "BIC", "BMF PAP", "PAP 2026"];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const packsSrc = read("workpass-i18n-packs.js");
const keyMap = new Map();

function parseLocalesObject(body) {
  const loc = {};
  for (const lang of langs) {
    const lm = body.match(new RegExp(`${lang}\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`));
    if (lm) {
      try { loc[lang] = JSON.parse(lm[1]); } catch { /* skip */ }
    }
  }
  return loc;
}

for (const m of packsSrc.matchAll(/\[["']([^"']+)["']\s*,\s*(\{[\s\S]*?\})\s*\]/g)) {
  const key = m[1];
  if (key.includes(" ") || key.length > 80) continue;
  const loc = parseLocalesObject(m[2]);
  if (Object.keys(loc).length) keyMap.set(key, { ...keyMap.get(key), ...loc });
}
for (const m of packsSrc.matchAll(/key:\s*["']([^"']+)["']\s*,\s*locales:\s*(\{[\s\S]*?\n\s*\})/g)) {
  const key = m[1];
  const loc = parseLocalesObject(m[2]);
  keyMap.set(key, { ...keyMap.get(key), ...loc });
}

const uiFiles = ["lohn.html", "index.html", "lohn-app.js", "script.js", "auth-gate.js"];
const usedKeys = new Set();
const dataI18n = new Set();
const barePlaceholders = [];

for (const f of uiFiles) {
  const s = read(f);
  for (const m of s.matchAll(/data-i18n=["']([^"']+)["']/g)) {
    usedKeys.add(m[1]);
    dataI18n.add(m[1]);
  }
  for (const m of s.matchAll(/data-i18n-(?:placeholder|title|aria)=["']([^"']+)["']/g)) {
    usedKeys.add(m[1]);
  }
  // only first string arg of uiT/hubT/t(
  for (const m of s.matchAll(/(?:uiT|hubT|\.t)\(\s*["']([a-zA-Z][a-zA-Z0-9._-]{1,80})["']/g)) {
    usedKeys.add(m[1]);
  }
  if (f.endsWith(".html")) {
    for (const m of s.matchAll(/placeholder="([^"]{3,})"/g)) {
      const ph = m[1];
      const around = s.slice(Math.max(0, m.index - 120), m.index + 40);
      if (!around.includes("data-i18n-placeholder") && /[äöüÄÖÜßA-Za-z]/.test(ph)) {
        barePlaceholders.push({ file: f, placeholder: ph });
      }
    }
  }
}

const missingInPacks = [...usedKeys].filter((k) => !keyMap.has(k)).sort();
const incompleteLocales = [];
for (const [key, loc] of keyMap) {
  const miss = langs.filter((l) => loc[l] == null || String(loc[l]).trim() === "");
  if (miss.length) incompleteLocales.push({ key, miss });
}

const neverTranslateLeaks = [];
for (const [key, loc] of keyMap) {
  const de = String(loc.de || "");
  for (const token of strongTokens) {
    if (!de.includes(token)) continue;
    for (const lang of langs) {
      if (lang === "de") continue;
      const v = String(loc[lang] || "");
      if (v && !v.includes(token)) {
        neverTranslateLeaks.push({ key, lang, token });
      }
    }
  }
}

const pkg = JSON.parse(read("package.json"));
const verMatch = read("server/version.mjs").match(/ACCOUNTING_VERSION\s*=\s*"([^"]+)"/);
const scriptVer = read("script.js").match(/APP_VERSION\s*=\s*"([^"]+)"/);
const chip = read("lohn-app.js").match(/portal-version-chip">v([^<]+)</);

const report = {
  versions: {
    package: pkg.version,
    server: verMatch?.[1] || null,
    script: scriptVer?.[1] || null,
    lohnChip: chip?.[1] || null,
    synced: pkg.version === verMatch?.[1] && pkg.version === scriptVer?.[1],
  },
  i18n: {
    packKeys: keyMap.size,
    usedKeys: usedKeys.size,
    dataI18nAttrs: dataI18n.size,
    missingInPacks: missingInPacks.length,
    missingSample: missingInPacks.slice(0, 30),
    incompleteLocales: incompleteLocales.length,
    incompleteSample: incompleteLocales.slice(0, 10),
    neverTranslateLeaks: neverTranslateLeaks.length,
    neverTranslateSample: neverTranslateLeaks.slice(0, 15),
    barePlaceholders: barePlaceholders.length,
    barePlaceholderSample: barePlaceholders.slice(0, 15),
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.versions.synced) process.exitCode = 2;
