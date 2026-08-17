/**
 * Rule-based assistant: explains gaps and may suggest engine-backed tax (BMF PAP).
 */
import { assertNotAiApplyingLaw } from "../policy/human-final.mjs";
import { monthCompleteness, employeeSyncReadiness } from "../portal-service.mjs";
import { listPayrollJobs } from "../db/repository.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { currentPeriod } from "../month-close.mjs";
import { isDemoPayrollJob } from "../demo-detect.mjs";

const ACTION_CATALOG = {
  sync_platform: {
    id: "sync_platform",
    label: "Plattform synchronisieren",
    requiresConfirm: false,
  },
  request_person_data: {
    id: "request_person_data",
    label: "Fehlende Personendaten anfordern",
    requiresConfirm: false,
  },
  open_employee: {
    id: "open_employee",
    label: "Mitarbeiter öffnen und prüfen",
    requiresConfirm: false,
  },
  month_close: {
    id: "month_close",
    label: "Monatsabschluss (Mensch bestätigt)",
    requiresConfirm: true,
  },
  sepa_export: {
    id: "sepa_export",
    label: "SEPA-XML erzeugen (Mensch lädt hoch)",
    requiresConfirm: true,
  },
  datev_export: {
    id: "datev_export",
    label: "DATEV-Export (Mensch bestätigt)",
    requiresConfirm: true,
  },
  apply_engine_tax: {
    id: "apply_engine_tax",
    label: "Steuer mit BMF PAP setzen (bestätigen)",
    requiresConfirm: true,
  },
  elster_submit: {
    id: "elster_submit",
    label: "ELSTER mit Zertifikat senden (bestätigen)",
    requiresConfirm: true,
  },
};

/**
 * Explain gaps for a company/period. Input may include jobId or gaps[].
 */
export function explainPortalGaps(input = {}) {
  const forbidden = assertNotAiApplyingLaw(input);
  if (!forbidden.ok) return forbidden;

  if (input.execute === true) {
    return {
      ok: false,
      status: 403,
      code: "ai_execute_forbidden",
      error: "Assistent darf nicht ausführen – nur erklären.",
    };
  }

  const companyId = normalizeCompanyId(input.companyId || input.company?.id || "");
  if (!companyId) {
    return { ok: false, status: 422, error: "companyId fehlt" };
  }
  const period = String(input.period || currentPeriod()).trim();

  const explanations = [];
  const suggestedHumanActions = [];
  const pushAction = (id, meta = {}) => {
    const base = ACTION_CATALOG[id];
    if (!base) return;
    if (suggestedHumanActions.some((a) => a.id === id && a.jobId === meta.jobId)) return;
    suggestedHumanActions.push({ ...base, ...meta });
  };

  const completeness = monthCompleteness(companyId, { period });
  const jobs = (listPayrollJobs({ companyId, period }) || []).filter((j) => !isDemoPayrollJob(j));

  if (!jobs.length) {
    explanations.push({
      code: "no_jobs",
      severity: "info",
      title: "Noch keine Abrechnungen",
      body:
        "Für diesen Monat liegen keine Mitarbeiter-/Stundendaten vor. "
        + "Das System schaut bei der Plattform nach und sendet keine leeren Anfragen. "
        + "Wenn Daten da sind: synchronisieren, dann Personen mit Lücken prüfen.",
    });
    pushAction("sync_platform");
  }

  for (const item of completeness.items || completeness.employees || []) {
    const sync = item.sync || employeeSyncReadiness(item);
    const name = item.name || item.employee?.name || item.badgeId || "Mitarbeiter";
    const jobId = item.jobId;
    if (sync?.waitingHours) {
      explanations.push({
        code: "waiting_hours",
        severity: "action_needed",
        title: `Stunden fehlen · ${name}`,
        body:
          "Ohne Monatsstunden kann Brutto/Netto nicht zuverlässig berechnet werden. "
          + "Bitte Stunden in der Plattform nachziehen oder manuell prüfen – KI setzt keine Werte.",
        jobId,
        employeeName: name,
      });
      pushAction("request_person_data", { jobId, employeeName: name });
      pushAction("open_employee", { jobId, employeeName: name });
    }
    if (sync && sync.hasSv === false) {
      explanations.push({
        code: "missing_sv",
        severity: "action_needed",
        title: `SV-Nummer fehlt · ${name}`,
        body: "Sozialversicherungsnummer fehlt. Der Mensch ergänzt Stammdaten; KI ändert keine Pflichtfelder.",
        jobId,
        employeeName: name,
      });
      pushAction("open_employee", { jobId, employeeName: name });
    }
    if (sync && sync.hasKk === false) {
      explanations.push({
        code: "missing_kk",
        severity: "action_needed",
        title: `Krankenkasse fehlt · ${name}`,
        body: "Krankenkasse/Beitragssatz fehlt für die gesetzliche Berechnung – Mensch prüft und bestätigt.",
        jobId,
        employeeName: name,
      });
      pushAction("open_employee", { jobId, employeeName: name });
    }
  }

  for (const job of jobs) {
    if (job.status === "error" || (job.errors || []).length) {
      explanations.push({
        code: "job_error",
        severity: "error",
        title: `Fehler · ${job.employee?.name || job.jobId}`,
        body: (job.errors || ["Unvollständige Daten"]).join(" · "),
        jobId: job.jobId,
      });
      pushAction("open_employee", { jobId: job.jobId, employeeName: job.employee?.name });
      pushAction("request_person_data", { jobId: job.jobId });
    }
  }

  const calculatedOpen = jobs.filter((j) => j.status === "calculated");
  if (calculatedOpen.length) {
    explanations.push({
      code: "apply_engine_tax",
      severity: "info",
      title: "Steuer mit BMF PAP setzen",
      body:
        `${calculatedOpen.length} Abrechnung(en) können mit der gesetzlichen Engine (BMF PAP / SV) neu berechnet werden. `
        + "Keine LLM-Beträge – nur amtliche Berechnung nach Ihrer Bestätigung.",
    });
    pushAction("apply_engine_tax");
  }

  const readyCount = jobs.filter((j) => j.status === "calculated" || j.status === "released").length;
  const released = jobs.filter((j) => j.status === "released").length;
  if (jobs.length && readyCount === jobs.length && released < jobs.length) {
    explanations.push({
      code: "ready_to_close",
      severity: "info",
      title: "Bereit zur Freigabe",
      body:
        "Berechnungen liegen vor. Monatsabschluss und Freigabe nur nach menschlicher Bestätigung – "
        + "der Assistent schließt nichts automatisch.",
    });
    pushAction("month_close");
  }
  if (released > 0) {
    pushAction("sepa_export");
    pushAction("datev_export");
  }

  if (Array.isArray(input.gaps)) {
    for (const g of input.gaps) {
      const text = typeof g === "string" ? g : (g?.label || g?.code || JSON.stringify(g));
      explanations.push({
        code: "client_gap",
        severity: "action_needed",
        title: "Gemeldete Lücke",
        body: `${text} – bitte manuell prüfen. Keine automatische Steueranpassung.`,
      });
    }
  }

  if (!explanations.length) {
    explanations.push({
      code: "all_clear",
      severity: "ok",
      title: "Keine offenen Lücken erkannt",
      body: "Checkliste wirkt vollständig. Trotzdem prüft der Mensch vor Freigabe und Export.",
    });
  }

  return {
    ok: true,
    kind: "assistant.explain.v1",
    humanFinal: true,
    execute: false,
    companyId,
    period,
    explanations,
    suggestedHumanActions,
    disclaimer:
      "KI setzt Steuer nur über BMF PAP / SV gesetzlich. Keine erfundenen Beträge. ELSTER braucht Zertifikat.",
  };
}
