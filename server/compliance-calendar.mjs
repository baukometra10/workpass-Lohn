/**
 * Indicative DE compliance calendar for a payroll month.
 * Guidance only – not legal advice; human decides filing/payment.
 */
export function buildComplianceCalendar(period, opts = {}) {
  const p = String(period || "").trim();
  if (!/^\d{4}-\d{2}$/.test(p)) {
    return { ok: false, error: "period ungültig (YYYY-MM)" };
  }
  const [ys, ms] = p.split("-");
  const year = Number(ys);
  const month = Number(ms); // 1–12
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

  // Approximate common DE payroll deadlines (orientierend)
  const items = [
    {
      id: "payroll_run",
      kind: "payroll",
      title: "Lohnlauf / Abrechnung erstellen",
      dueDate: iso(year, month, 25),
      severity: "info",
      hint: "Stunden und Stammdaten prüfen, dann Monat schließen (Mensch bestätigt).",
    },
    {
      id: "wage_payment",
      kind: "payment",
      title: "Auszahlung Löhne (SEPA)",
      dueDate: iso(nextYear, nextMonth, 1),
      severity: "action",
      hint: "SEPA-XML erzeugen und von einem Menschen bei der Bank einreichen.",
    },
    {
      id: "lst_anmeldung",
      kind: "tax",
      title: "Lohnsteuer-Anmeldung (orientierend)",
      dueDate: iso(nextYear, nextMonth, 10),
      severity: "action",
      hint: "Frist kann je Betriebsstätte abweichen – Mensch prüft Finanzamt.",
    },
    {
      id: "sv_beitraege",
      kind: "sv",
      title: "SV-Beiträge melden/zahlen (orientierend)",
      dueDate: iso(nextYear, nextMonth, 25),
      severity: "action",
      hint: "Krankenkasse / Beitragsnachweis – Mensch bestätigt Zahlen.",
    },
    {
      id: "lstb_elster",
      kind: "elster",
      title: "LStB / ELSTER-Vorbereitung (Jahresende)",
      dueDate: month === 12 ? iso(nextYear, 2, 28) : null,
      severity: month === 12 ? "action" : "info",
      hint:
        month === 12
          ? "Nur Vorbereitungs-XML – Übermittlung auf elster.de durch den Menschen."
          : "Relevant zum Jahreswechsel; monatlich optional prüfen.",
      seasonal: month === 12,
    },
  ].filter((x) => x.dueDate || x.id === "lstb_elster");

  const today = opts.asOf ? new Date(opts.asOf) : new Date();
  const enriched = items.map((it) => {
    if (!it.dueDate) return { ...it, overdue: false, daysUntil: null };
    const due = new Date(`${it.dueDate}T12:00:00`);
    const daysUntil = Math.round((due - today) / 86400000);
    return {
      ...it,
      overdue: daysUntil < 0,
      daysUntil,
    };
  });

  return {
    ok: true,
    period: p,
    disclaimer:
      "Orientierende Termine – keine Rechtsberatung. Fristen und Zuständigkeit prüft der Mensch.",
    humanFinal: true,
    items: enriched,
  };
}
