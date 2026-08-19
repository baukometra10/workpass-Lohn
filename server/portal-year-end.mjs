/**
 * Year-end wizard — one guided path from released months → employee docs → optional ELSTER/exports.
 */
import { normalizeCompanyId } from "./tenant.mjs";
import { listCertificateSummary } from "./certificates/employee-certificates.mjs";
import { listElsterSubmissions } from "./elster/submit.mjs";
import { listExportRuns } from "./export-status.mjs";
import { listAllDeliveries } from "./delivery-queue.mjs";
import { monthOverview } from "./portal-service.mjs";

export function buildYearEndWizard(companyId, year) {
  const cid = normalizeCompanyId(companyId);
  const y = Number(year) || new Date().getFullYear();
  if (!cid) return { ok: false, error: "companyId fehlt" };

  const summary = listCertificateSummary(cid, y);
  const employees = summary.employees || [];
  const monthsOk = employees.length > 0 && employees.every((e) => (e.months?.length || 0) > 0);

  const lstbDeliveries = listAllDeliveries({ companyId: cid }).filter((d) => d.type === "lstb" && String(d.period || d.year || "") === String(y));
  const lstbAcked = lstbDeliveries.filter((d) => d.ackedAt || d.webhookAccepted).length;

  const elster = listElsterSubmissions(cid, 50).filter((s) => s.kind === "lstb" && String(s.year) === String(y));
  const elsterSent = elster.some((s) => s.status === "SENT" || s.status === "COMPLETED");
  const elsterFinanzamt = elster.some((s) => s.finanzamtReached);

  const exports = listExportRuns(cid, { limit: 30 }).filter((r) => String(r.period || "").startsWith(String(y)) || r.kind === "gobd");
  const hasDatev = exports.some((r) => r.kind === "datev");
  const hasSepa = exports.some((r) => r.kind === "sepa");
  const hasGobd = exports.some((r) => r.kind === "gobd");

  const ov = monthOverview(cid, { year: y });

  const steps = [
    {
      id: "months",
      title: "Freigegebene Monate",
      status: monthsOk ? "done" : "open",
      hint: monthsOk
        ? `${employees.length} Mitarbeiter · ${employees.reduce((n, e) => n + (e.months?.length || 0), 0)} Monatsabrechnungen`
        : "Jahres-LStB braucht freigegebene Monatsabrechnungen.",
      action: "monat",
    },
    {
      id: "lstb",
      title: "LStB vorbereiten",
      status: employees.length ? "done" : "open",
      hint: employees.length
        ? `${employees.length} LStB aus freigegebenen Daten`
        : "Keine freigegebenen Monate für dieses Jahr.",
      action: "steuer",
    },
    {
      id: "employee",
      title: "An Mitarbeiter (Plattform)",
      status: lstbAcked >= employees.length && employees.length > 0 ? "done" : (lstbDeliveries.length ? "progress" : "open"),
      hint: lstbAcked
        ? `${lstbAcked} LStB bestätigt · ${employees.length} Mitarbeiter`
        : "LStB/ VB senden — wie die Lohnabrechnung.",
      action: "steuer",
    },
    {
      id: "elster",
      title: "ELSTER (optional)",
      status: elsterFinanzamt ? "done" : (elsterSent ? "progress" : "optional"),
      hint: elsterFinanzamt
        ? "Sidecar meldet Finanzamt-Eingang."
        : elsterSent
          ? "An Kanal übergeben — nicht automatisch Finanzamt."
          : "Nur wenn ELSTER-Kanal konfiguriert ist.",
      action: "steuer",
    },
    {
      id: "files",
      title: "DATEV · SEPA · GoBD",
      status: hasDatev && hasSepa ? "done" : (hasDatev || hasSepa || hasGobd ? "progress" : "open"),
      hint: [hasDatev && "DATEV", hasSepa && "SEPA", hasGobd && "GoBD"].filter(Boolean).join(" · ") || "Exporte unter Dateien.",
      action: "dateien",
    },
  ];

  const openCount = steps.filter((s) => s.status === "open").length;
  return {
    ok: true,
    kind: "portal.year_end_wizard.v1",
    companyId: cid,
    year: y,
    employeeCount: employees.length,
    monthOverview: ov.ok ? ov : null,
    steps,
    ready: openCount === 0 || (monthsOk && employees.length > 0 && lstbAcked >= employees.length),
    openCount,
  };
}
