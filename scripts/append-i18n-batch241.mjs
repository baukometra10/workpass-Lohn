import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["kpi.grossMonth", L(
    "Brutto · Summe aller MA",
    "Gross · all employees sum",
    "Brüt · tüm çalışanların toplamı",
    "الإجمالي · مجموع كل الموظفين",
    "Brut · somme de tous les MA",
    "Bruto · suma de todos los empleados",
    "Lordo · somma di tutti i dipendenti",
    "Brutto · suma wszystkich pracowników"
  )],
  ["kpi.netMonth", L(
    "Netto · Summe aller MA",
    "Net · all employees sum",
    "Net · tüm çalışanların toplamı",
    "الصافي · مجموع كل الموظفين",
    "Net · somme de tous les MA",
    "Neto · suma de todos los empleados",
    "Netto · somma di tutti i dipendenti",
    "Netto · suma wszystkich pracowników"
  )],
  ["portal.kpiSumNote", L(
    "Brutto/Netto oben = Summe der Einzelabrechnungen (nicht ein Gesamtgehalt). Jeder Mitarbeiter hat ein eigenes Blatt.",
    "Gross/net above = sum of individual payslips (not one combined salary). Each employee has their own slip.",
    "Yukarıdaki brüt/net = tek tek bordroların toplamı (tek maaş değil). Her çalışanın kendi bordrosu vardır.",
    "الإجمالي/الصافي أعلاه = مجموع كشوف الأفراد (وليس راتباً واحداً مجمّعاً). لكل موظف كشف خاص.",
    "Brut/net ci-dessus = somme des bulletins individuels (pas un seul salaire). Chaque salarié a sa propre fiche.",
    "Bruto/neto arriba = suma de nóminas individuales (no un sueldo único). Cada empleado tiene su hoja.",
    "Lordo/netto sopra = somma dei cedolini singoli (non un solo stipendio). Ogni dipendente ha il proprio foglio.",
    "Brutto/netto powyżej = suma pojedynczych pasków (nie jedna pensja). Każdy pracownik ma własny pasek."
  )],
  ["portal.totalsHintCount", L(
    "{count} Einzelabrechnung(en) · Summe Brutto/Netto · {status}",
    "{count} individual payslip(s) · gross/net sum · {status}",
    "{count} tek bordro · brüt/net toplam · {status}",
    "{count} كشف فردي · مجموع الإجمالي/الصافي · {status}",
    "{count} bulletin(s) individuel(s) · somme brut/net · {status}",
    "{count} nómina(s) individual(es) · suma bruto/neto · {status}",
    "{count} cedolino/i singolo/i · somma lordo/netto · {status}",
    "{count} pojedynczy/ch pasek/pasków · suma brutto/netto · {status}"
  )],
  ["kpi.grossSum", L("Brutto Summe", "Gross sum", "Brüt toplam", "مجموع الإجمالي", "Somme brut", "Suma bruto", "Somma lordo", "Suma brutto")],
  ["kpi.netSum", L("Netto Summe", "Net sum", "Net toplam", "مجموع الصافي", "Somme net", "Suma neto", "Somma netto", "Suma netto")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
// Allow overwrite for keys we intentionally update
const overwrite = new Set(["kpi.grossMonth", "kpi.netMonth", "portal.totalsHintCount"]);
let added = 0;
let updated = 0;
for (const [k, o] of extra) {
  if (overwrite.has(k) && existing.has(k)) {
    const re = new RegExp(`\\[\\"${k.replace(/\./g, "\\.")}\\",\\s*\\{[\\s\\S]*?\\}\\],`);
    const next = `  ${JSON.stringify([k, o])},`;
    if (re.test(s)) {
      s = s.replace(re, next);
      updated += 1;
      continue;
    }
  }
  if (!existing.has(k)) {
    s = s.replace(/\];\s*$/, `  ${JSON.stringify([k, o])},\n];\n`);
    existing.add(k);
    added += 1;
  }
}
fs.writeFileSync(path, s);
console.log("added", added, "updated", updated);
