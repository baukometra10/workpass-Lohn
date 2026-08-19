import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");

const fixes = {
  tr: "WorkPass Steuerprogramm (Suppix AI) muhasebe çalışma alanıdır; sertifikalı tam bordro yazılımı veya bireysel vergi danışmanlığı yerine geçmez. ELSTER dışa aktarımları manuel kontrol için hazırlık dosyalarıdır.",
  fr: "WorkPass Steuerprogramm (Suppix AI) est un poste comptable. Il ne remplace pas un logiciel de paie certifié ni un conseil fiscal individuel. Les exports ELSTER sont des fichiers de préparation à vérifier manuellement.",
  es: "WorkPass Steuerprogramm (Suppix AI) es un puesto contable. No sustituye un software de nómina certificado ni un asesoramiento fiscal individual. Las exportaciones ELSTER son archivos de preparación para revisión manual.",
  it: "WorkPass Steuerprogramm (Suppix AI) è una postazione contabile. Non sostituisce un software paghe certificato né una consulenza fiscale individuale. Gli export ELSTER sono file di preparazione da verificare manualmente.",
  pl: "WorkPass Steuerprogramm (Suppix AI) to stanowisko księgowe. Nie zastępuje certyfikowanego oprogramowania płacowego ani indywidualnego doradztwa podatkowego. Eksporty ELSTER to pliki przygotowawcze do ręcznej weryfikacji.",
};

const start = s.indexOf('["help.legalText"');
if (start < 0) throw new Error("help.legalText not found");
const end = s.indexOf("}],", start);
if (end < 0) throw new Error("help.legalText end not found");
let block = s.slice(start, end + 2);
for (const [lang, text] of Object.entries(fixes)) {
  const re = new RegExp(`${lang}:\\s*"(?:\\\\.|[^"\\\\])*"`);
  if (!re.test(block)) throw new Error(`no ${lang}`);
  block = block.replace(re, `${lang}: ${JSON.stringify(text)}`);
  console.log("fixed", lang);
}
s = s.slice(0, start) + block + s.slice(end + 2);
fs.writeFileSync(path, s);
console.log("done");
