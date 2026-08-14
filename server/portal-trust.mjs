/**
 * Portal delivery trust + rule-based anomalies + payroll simulation (no persist/release).
 */
import { listPayrollJobs, loadCompany } from "./db/repository.mjs";
import { listAllDeliveries } from "./delivery-queue.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { getPayrollCore } from "./engine.mjs";
import { employeeSyncReadiness, monthOverview } from "./portal-service.mjs";
import { assertNotAiApplyingLaw } from "./policy/human-final.mjs";

function realJobs(companyId, period) {
  return (listPayrollJobs({ companyId, period }) || []).filter((j) => !isDemoPayrollJob(j));
}

export function buildDeliveryTrust(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || currentPeriod()).trim();
  const jobs = realJobs(cid, period).filter((j) => j.status === "released");
  const deliveries = listAllDeliveries().filter(
    (d) => normalizeCompanyId(d.company?.id) === cid
      && (!period || String(d.period || d.payload?.period || "").slice(0, 7) === period
        || String(d.payslip?.period || "").slice(0, 7) === period)
  );

  const byJob = new Map();
  for (const d of deliveries) {
    const jid = d.jobId || d.payslip?.jobId || d.payload?.jobId;
    if (jid) byJob.set(String(jid), d);
  }

  const items = jobs.map((j) => {
    const d = byJob.get(String(j.jobId)) || null;
    let trust = "released_local";
    if (d?.ackedAt || d?.ackAt) trust = "acked";
    else if (d?.webhookPushedAt || d?.webhookReached) trust = "pushed";
    else if (d) trust = "queued";
    return {
      jobId: j.jobId,
      employee: j.employee,
      net: j.payslip?.totals?.net ?? null,
      releasedAt: j.releasedAt || null,
      deliveryId: d?.deliveryId || null,
      trust,
      webhookPushedAt: d?.webhookPushedAt || null,
      ackedAt: d?.ackedAt || d?.ackAt || null,
    };
  });

  const counts = items.reduce((acc, it) => {
    acc[it.trust] = (acc[it.trust] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, acked: 0, pushed: 0, queued: 0, released_local: 0 });

  return {
    ok: true,
    kind: "portal.delivery_trust.v1",
    companyId: cid,
    period,
    counts,
    items,
    humanFinal: true,
    message: counts.total === 0
      ? "Keine freigegebenen Abrechnungen in diesem Monat."
      : `${counts.acked || 0} bestätigt · ${counts.pushed || 0} an Plattform · ${counts.queued || 0} in Warteschlange`,
  };
}

/**
 * Heuristic anomalies (rules only – not AI).
 */
export function detectPayrollAnomalies(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", anomalies: [] };
  const period = String(opts.period || currentPeriod()).trim();
  const jobs = realJobs(cid, period);
  const anomalies = [];

  const hoursList = jobs
    .map((j) => Number(j.state?.workHours || j.payslip?.attendance?.hours || 0))
    .filter((h) => h > 0);
  const avgHours = hoursList.length
    ? hoursList.reduce((a, b) => a + b, 0) / hoursList.length
    : 0;

  const overview = monthOverview(cid, { period, months: 2 });
  const prevPeriod = overview.months?.find((m) => m.period !== period)?.period;
  const prevJobs = prevPeriod ? realJobs(cid, prevPeriod) : [];
  const prevNetByEmp = new Map(
    prevJobs.map((j) => [
      normalizeEmployeeId(j.employee?.id || j.employee?.badgeId),
      Number(j.payslip?.totals?.net || 0),
    ])
  );

  for (const j of jobs) {
    const sync = employeeSyncReadiness(j);
    const name = j.employee?.name || j.jobId;
    const hours = Number(j.state?.workHours || j.payslip?.attendance?.hours || 0);
    const net = Number(j.payslip?.totals?.net || 0);
    const eid = normalizeEmployeeId(j.employee?.id || j.employee?.badgeId);

    if (avgHours > 0 && hours > 0 && (hours > avgHours * 1.6 || hours < avgHours * 0.4)) {
      anomalies.push({
        code: "hours_outlier",
        severity: "warn",
        jobId: j.jobId,
        employeeName: name,
        message: `Stunden ${hours} weichen stark vom Firmenschnitt (${avgHours.toFixed(1)}) ab.`,
      });
    }
    const prevNet = prevNetByEmp.get(eid);
    if (prevNet > 0 && net > 0) {
      const delta = Math.abs(net - prevNet) / prevNet;
      if (delta >= 0.25) {
        anomalies.push({
          code: "net_swing",
          severity: "warn",
          jobId: j.jobId,
          employeeName: name,
          message: `Netto ${net.toFixed(2)} € weicht >25% vom Vormonat (${prevNet.toFixed(2)} €) ab.`,
        });
      }
    }
    if (sync.waitingHours) {
      anomalies.push({
        code: "missing_hours",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "Monatsstunden fehlen.",
      });
    }
    if (!sync.hasSv) {
      anomalies.push({
        code: "missing_sv",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "SV-Nummer fehlt.",
      });
    }
    if (!sync.hasKk) {
      anomalies.push({
        code: "missing_kk",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "Krankenkasse fehlt.",
      });
    }
  }

  return {
    ok: true,
    kind: "portal.anomalies.v1",
    companyId: cid,
    period,
    count: anomalies.length,
    anomalies,
    note: "Regelbasierte Hinweise – keine KI-Steuerentscheidung.",
    humanFinal: true,
  };
}

/**
 * What-if payroll calculation – never saves / never releases.
 */
export function simulatePayroll(payload = {}, options = {}) {
  const gate = assertNotAiApplyingLaw(payload);
  if (!gate.ok) return gate;

  const companyId = normalizeCompanyId(
    payload.company?.id || payload.companyId || options.companyId || ""
  );
  if (!companyId) {
    return { ok: false, status: 422, error: "companyId fehlt" };
  }

  const company = loadCompany(companyId);
  const enriched = {
    ...payload,
    kind: payload.kind || "platform.payroll.v1",
    company: {
      ...(payload.company || {}),
      id: companyId,
      name: payload.company?.name || company?.name || "",
      taxNumber: payload.company?.taxNumber || company?.taxNumber || "",
    },
  };

  try {
    const PC = getPayrollCore();
    const ingested = PC.ingestPlatformPayload(enriched);
    if (!ingested?.state) {
      return {
        ok: false,
        simulation: true,
        errors: ingested?.errors || ["Simulation: Ingest fehlgeschlagen"],
      };
    }
    const state = ingested.state;
    state.mandantId = companyId;
    state.meta = { ...(state.meta || {}), companyId, simulation: true };
    if (payload.workHours != null) state.workHours = payload.workHours;
    if (payload.hours != null) state.workHours = payload.hours;
    if (payload.attendance?.hours != null) state.workHours = payload.attendance.hours;
    if (payload.grossSalary != null) state.grossSalary = payload.grossSalary;

    const hard = [...(ingested.errors || []), ...PC.validate(state)];
    const soft = PC.validatePrintHints?.(state) || [];
    const payroll = PC.calculate(state);

    return {
      ok: hard.length === 0,
      simulation: true,
      persisted: false,
      released: false,
      humanFinal: true,
      companyId,
      period: state.payrollMonth || payload.period || null,
      errors: hard,
      printHints: soft,
      totals: {
        gross: payroll.gross,
        net: payroll.net,
        payrollTax: payroll.payrollTax,
        solidarity: payroll.solidarity,
        churchTax: payroll.churchTax,
        svTotal: payroll.svTotal,
        employerShare: payroll.employerShare,
      },
      note:
        "Nur Vorschau. Nicht gespeichert, nicht freigegeben. KI darf Werte nicht übernehmen – Mensch entscheidet.",
    };
  } catch (e) {
    return {
      ok: false,
      simulation: true,
      error: e.message || String(e),
    };
  }
}

export function buildElsterPrepChecklist(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  const period = String(opts.period || currentPeriod()).trim();
  const year = period.slice(0, 4);
  const jobs = realJobs(cid, period);
  const yearJobs = (listPayrollJobs({ companyId: cid }) || [])
    .filter((j) => !isDemoPayrollJob(j) && String(j.period || "").startsWith(year) && j.status === "released");

  const steps = [
    {
      id: "released",
      ok: yearJobs.length > 0,
      label: "Freigegebene Abrechnungen im Jahr vorhanden",
    },
    {
      id: "tax_ids",
      ok: yearJobs.every((j) => String(j.state?.employeeTaxId || j.payslip?.employee?.taxId || "").trim()),
      label: "Steuer-IDs der Mitarbeiter geprüft",
    },
    {
      id: "human_review",
      ok: false,
      label: "Mensch hat Summen gegen LStB geprüft (manuell abhaken)",
      humanOnly: true,
    },
    {
      id: "elster_upload",
      ok: false,
      label: "Übermittlung auf elster.de durch den Menschen (kein Auto-Send)",
      humanOnly: true,
    },
  ];

  return {
    ok: true,
    kind: "portal.elster_prep.v1",
    companyId: cid,
    period,
    year,
    releasedInYear: yearJobs.length,
    jobsInFocusMonth: jobs.length,
    steps,
    humanFinal: true,
    note:
      "Nur Vorbereitung. WorkPass sendet nichts an ELSTER – Zertifikat und Upload bleiben beim Menschen.",
  };
}
