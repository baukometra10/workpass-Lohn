/**
 * DE compliance calendar – business-day aware (orientierend, keine Rechtsberatung).
 * Human decides all filings/payments.
 */
import { loadCompany } from "./db/repository.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { monthCompleteness } from "./portal-service.mjs";

function pad(n) {
  return String(n).padStart(2, "0");
}

function iso(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseIso(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function toIso(d) {
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Gregorian Easter Sunday for year */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

function fixedHolidays(year) {
  return new Set([
    iso(year, 1, 1),
    iso(year, 5, 1),
    iso(year, 10, 3),
    iso(year, 12, 25),
    iso(year, 12, 26),
  ]);
}

function movableHolidays(year) {
  const e = easterSunday(year);
  const add = (days) => {
    const d = new Date(e);
    d.setDate(d.getDate() + days);
    return toIso(d);
  };
  // Federal-ish: Karfreitag, Ostermontag, Christi Himmelfahrt, Pfingstmontag
  return new Set([add(-2), add(1), add(39), add(50)]);
}

function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

function isHoliday(d, yearHolidays) {
  return yearHolidays.has(toIso(d));
}

function holidaySetForYears(...years) {
  const set = new Set();
  for (const y of years) {
    for (const h of fixedHolidays(y)) set.add(h);
    for (const h of movableHolidays(y)) set.add(h);
  }
  return set;
}

/** Next banking day on/after date (skip weekend + DE federal holidays). */
export function nextBankingDay(dateIso, opts = {}) {
  const d = parseIso(dateIso);
  const years = [d.getFullYear(), d.getFullYear() + 1, d.getFullYear() - 1];
  const hol = opts.holidays || holidaySetForYears(...years);
  let guard = 0;
  while ((isWeekend(d) || isHoliday(d, hol)) && guard < 20) {
    d.setDate(d.getDate() + 1);
    guard += 1;
  }
  return toIso(d);
}

/** Previous banking day on/before date. */
export function prevBankingDay(dateIso, opts = {}) {
  const d = parseIso(dateIso);
  const years = [d.getFullYear(), d.getFullYear() + 1, d.getFullYear() - 1];
  const hol = opts.holidays || holidaySetForYears(...years);
  let guard = 0;
  while ((isWeekend(d) || isHoliday(d, hol)) && guard < 20) {
    d.setDate(d.getDate() - 1);
    guard += 1;
  }
  return toIso(d);
}

/** N-th last banking day of calendar month (1 = last banking day). */
export function nthLastBankingDay(year, month, n = 3) {
  const hol = holidaySetForYears(year, year + 1, year - 1);
  const d = new Date(year, month, 0, 12, 0, 0); // last calendar day of month
  let found = 0;
  let guard = 0;
  while (guard < 40) {
    if (!isWeekend(d) && !isHoliday(d, hol)) {
      found += 1;
      if (found === n) return toIso(d);
    }
    d.setDate(d.getDate() - 1);
    guard += 1;
  }
  return toIso(new Date(year, month, 0, 12, 0, 0));
}

function enrichItem(it, today) {
  if (!it.dueDate) {
    return { ...it, overdue: false, daysUntil: null, dueBankingDay: null };
  }
  const banking = nextBankingDay(it.dueDate);
  const due = parseIso(banking);
  const daysUntil = Math.round((due - today) / 86400000);
  return {
    ...it,
    dueDate: it.dueDate,
    dueBankingDay: banking,
    overdue: daysUntil < 0,
    daysUntil,
    urgency: daysUntil < 0 ? "overdue" : daysUntil <= 3 ? "soon" : daysUntil <= 10 ? "upcoming" : "ok",
  };
}

/**
 * @param {string} period YYYY-MM
 * @param {{ asOf?: string, companyId?: string, dauerfrist?: boolean }} opts
 */
export function buildComplianceCalendar(period, opts = {}) {
  const p = String(period || "").trim();
  if (!/^\d{4}-\d{2}$/.test(p)) {
    return { ok: false, error: "period ungültig (YYYY-MM)" };
  }
  const [ys, ms] = p.split("-");
  const year = Number(ys);
  const month = Number(ms);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthAfterNext = nextMonth === 12 ? 1 : nextMonth + 1;
  const yearAfterNext = nextMonth === 12 ? nextYear + 1 : nextYear;

  const companyId = normalizeCompanyId(opts.companyId || "");
  const company = companyId ? loadCompany(companyId) : null;
  const dauerfrist = opts.dauerfrist === true
    || company?.meta?.dauerfristverlaengerung === true
    || company?.meta?.hubProfile?.dauerfristverlaengerung === true;

  // LSt-Anmeldung: 10. des Folgemonats; mit Dauerfrist oft +1 Monat
  const lstRaw = dauerfrist
    ? iso(yearAfterNext, monthAfterNext, 10)
    : iso(nextYear, nextMonth, 10);

  // SV: oft drittletzter Bankarbeitstag des laufenden Monats (Beitragsmonat)
  const svDue = nthLastBankingDay(year, month, 3);

  // Lohnzahlung: üblich Monatsultimo / 1. Banktag Folgemonat – wir nehmen 1. Banktag Folgemonat
  const wagePay = nextBankingDay(iso(nextYear, nextMonth, 1));

  // Interner Lohnlauf: 5 Banktage vor Ultimo
  const monthEnd = iso(year, month, new Date(year, month, 0).getDate());
  const payrollRun = (() => {
    const d = parseIso(prevBankingDay(monthEnd));
    let n = 0;
    while (n < 4) {
      d.setDate(d.getDate() - 1);
      const hol = holidaySetForYears(year);
      if (!isWeekend(d) && !isHoliday(d, hol)) n += 1;
    }
    return toIso(d);
  })();

  const items = [
    {
      id: "payroll_run",
      kind: "payroll",
      title: "Interner Lohnlauf / Prüfung",
      dueDate: payrollRun,
      severity: "info",
      hint: "Stunden & Stammdaten prüfen, dann Monatsabschluss (Mensch bestätigt).",
      humanAction: "month_close",
    },
    {
      id: "wage_payment",
      kind: "payment",
      title: "Auszahlung Löhne (SEPA)",
      dueDate: wagePay,
      severity: "action",
      hint: "SEPA-XML erzeugen und von einem Menschen bei der Bank einreichen.",
      humanAction: "sepa_export",
    },
    {
      id: "lst_anmeldung",
      kind: "tax",
      title: dauerfrist
        ? "Lohnsteuer-Anmeldung (Dauerfristverlängerung)"
        : "Lohnsteuer-Anmeldung",
      dueDate: lstRaw,
      severity: "action",
      hint: dauerfrist
        ? "Dauerfrist hinterlegt – Termin +1 Monat. Mensch prüft Finanzamt/ELSTER."
        : "Regelfrist 10. des Folgemonats (Banktag). Mensch meldet / zahlt.",
      humanAction: "elster_prep",
      dauerfrist,
    },
    {
      id: "sv_beitraege",
      kind: "sv",
      title: "SV-Beiträge (drittletzter Bankarbeitstag)",
      dueDate: svDue,
      severity: "action",
      hint: "Beitragsnachweis / Zahlung – Krankenkasse. Mensch bestätigt Beträge.",
      humanAction: "open_checklist",
    },
    {
      id: "u1_u2",
      kind: "umlage",
      title: "Umlagen U1/U2 prüfen",
      dueDate: svDue,
      severity: "info",
      hint: "Mit SV-Abrechnung mitlaufen – Abweichungen manuell klären.",
    },
  ];

  if (month === 12 || month === 1) {
    items.push({
      id: "lstb_elster",
      kind: "elster",
      title: "LStB / ELSTER-Vorbereitung",
      dueDate: iso(year + (month === 12 ? 1 : 0), 2, 28),
      severity: "action",
      hint: "ELSTER mit hinterlegtem Zertifikat oder Upload auf elster.de.",
      humanAction: "elster_prep",
      seasonal: true,
    });
  }

  const today = opts.asOf ? parseIso(String(opts.asOf).slice(0, 10)) : new Date();
  const enriched = items.map((it) => enrichItem(it, today));

  // Link readiness blockers if company known
  let blockers = [];
  if (companyId) {
    try {
      const c = monthCompleteness(companyId, { period: p });
      if (c?.ok) {
        if (c.totals?.waitingHours) {
          blockers.push({
            code: "waiting_hours",
            label: `${c.totals.waitingHours} warten auf Stunden`,
            blocks: ["payroll_run", "wage_payment"],
          });
        }
        if (c.totals?.missingSv) {
          blockers.push({
            code: "missing_sv",
            label: `${c.totals.missingSv} ohne SV`,
            blocks: ["sv_beitraege", "lst_anmeldung"],
          });
        }
        if (c.totals?.missingKk) {
          blockers.push({
            code: "missing_kk",
            label: `${c.totals.missingKk} ohne KK`,
            blocks: ["sv_beitraege"],
          });
        }
        if (!c.readyForMonthClose) {
          blockers.push({
            code: "not_month_ready",
            label: "Monat noch nicht abschlussbereit",
            blocks: ["payroll_run", "wage_payment"],
          });
        }
      }
    } catch { /* ignore */ }
  }

  const overdue = enriched.filter((x) => x.overdue).length;
  const soon = enriched.filter((x) => x.urgency === "soon").length;

  return {
    ok: true,
    kind: "portal.compliance_calendar.v2",
    period: p,
    companyId: companyId || null,
    dauerfrist,
    summary: {
      overdue,
      soon,
      next: enriched
        .filter((x) => x.dueBankingDay)
        .sort((a, b) => String(a.dueBankingDay).localeCompare(String(b.dueBankingDay)))
        .find((x) => !x.overdue) || enriched.find((x) => x.overdue) || null,
    },
    blockers,
    disclaimer:
      "Orientierende Bankarbeitstage (bundesweite Feiertage) – keine Rechtsberatung. "
      + "Länder-Feiertage und Betriebsstätten kann der Mensch abweichen prüfen.",
    humanFinal: true,
    items: enriched,
  };
}
