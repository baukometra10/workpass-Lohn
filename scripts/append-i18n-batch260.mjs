import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["doc.payrollAnnualSub", L(
    "Nur im Lohn-Portal · für den Mitarbeiter",
    "Payroll portal only · for the employee",
    "Yalnızca bordro portalı · çalışan için",
    "فقط في بوابة الأجور · للموظف",
    "Uniquement portail paie · pour le salarié",
    "Solo portal de nómina · para el empleado",
    "Solo portale paghe · per il dipendente",
    "Tylko portal płac · dla pracownika"
  )],
  ["doc.payrollPortalHint", L(
    "Lohnabrechnung, LStB (Mitarbeiter) und LStA (Firma) nur im Lohn-Portal — hier nur Rechnungen.",
    "Payslips, LStB (employee) and LStA (company) only in the payroll portal — invoices here.",
    "Bordro, LStB (çalışan) ve LStA (firma) yalnızca bordro portalında — burada fatura.",
    "كشف الراتب و LStB (موظف) و LStA (شركة) فقط في بوابة الأجور — هنا الفواتير فقط.",
    "Paie, LStB (salarié) et LStA (entreprise) uniquement dans le portail paie — ici les factures.",
    "Nómina, LStB (empleado) y LStA (empresa) solo en el portal de nómina — aquí facturas.",
    "Cedolino, LStB (dipendente) e LStA (azienda) solo nel portale paghe — qui le fatture.",
    "Lista płac, LStB (pracownik) i LStA (firma) tylko w portalu płac — tutaj faktury."
  )],
  ["hub.annualBtn", L(
    "LStB im Lohn-Portal",
    "LStB in payroll portal",
    "LStB bordro portalında",
    "LStB في بوابة الأجور",
    "LStB dans le portail paie",
    "LStB en el portal de nómina",
    "LStB nel portale paghe",
    "LStB w portalu płac"
  )],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
for (const [k, o] of extra) {
  if (!existing.has(k)) continue;
  const re = new RegExp(`(\\[\\s*${JSON.stringify(k)}\\s*,\\s*)(\\{[\\s\\S]*?\\})(\\s*\\])`);
  if (re.test(s)) s = s.replace(re, `$1${JSON.stringify(o)}$3`);
}
if (filtered.length) {
  s = s.replace(/\];\s*$/, `${filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n")}\n];\n`);
}
fs.writeFileSync(path, s);
console.log("added", filtered.length, "updated", extra.length - filtered.length);
