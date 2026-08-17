/**
 * KI darf Steuer nur über die gesetzliche Engine setzen (BMF PAP / SV) – keine freien LLM-Beträge.
 */
import { getPayrollCore } from "../engine.mjs";
import { loadPayrollJob, savePayrollJob, listPayrollJobs } from "../store.mjs";
import { isDemoPayrollJob } from "../demo-detect.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { currentPeriod } from "../month-close.mjs";
import { isLockedStatus } from "../gobd/revisions.mjs";
import { appendBusinessAudit } from "../gobd/business-audit.mjs";

export async function applyEngineTax(input = {}) {
  if (input.taxOverride != null || input.inventedPayrollTax != null) {
    return {
      ok: false,
      status: 403,
      error: "Keine freien Steuerbeträge. Nur BMF PAP / SV gesetzlich.",
    };
  }
  const companyId = normalizeCompanyId(input.companyId || input.company?.id || "");
  if (!companyId) return { ok: false, status: 422, error: "companyId fehlt" };
  const period = String(input.period || currentPeriod()).trim();
  const PC = getPayrollCore();
  const jobs = input.jobId
    ? [loadPayrollJob(input.jobId)].filter(Boolean)
    : (listPayrollJobs({ companyId, period }) || []).filter((j) => !isDemoPayrollJob(j));

  const applied = [];
  const skipped = [];
  for (const job of jobs) {
    if (!job?.state) {
      skipped.push({ jobId: job?.jobId, reason: "kein Lohn-Zustand" });
      continue;
    }
    if (isLockedStatus(job.status) && !input.correctReleased) {
      skipped.push({ jobId: job.jobId, reason: "freigegeben – Korrektur nötig" });
      continue;
    }
    let payroll;
    try {
      payroll = PC.calculate(job.state);
    } catch (e) {
      skipped.push({ jobId: job.jobId, reason: e.message || "Engine-Fehler" });
      continue;
    }
    job.payroll = payroll;
    job.payslip = {
      ...(job.payslip || {}),
      totals: payroll,
      status: job.status,
    };
    job.updatedAt = new Date().toISOString();
    job.taxMethod = payroll.taxMethod || "BMF-PAP";
    job.engineAppliedAt = job.updatedAt;
    job.engineAppliedBy = "assistant-engine";
    const opts = {
      actor: "assistant-engine",
      source: "assistant",
      correlationId: input.correlationId || `engine-tax:${job.jobId}`,
    };
    if (isLockedStatus(job.status) && input.correctReleased) {
      opts.correction = {
        reason: String(input.reason || "Neuberechnung BMF PAP / SV gesetzlich"),
        actor: "assistant-engine",
        source: "assistant",
      };
    }
    savePayrollJob(job, opts);
    applied.push({
      jobId: job.jobId,
      employee: job.employee?.name || job.employee?.id,
      gross: payroll.gross,
      net: payroll.net,
      payrollTax: payroll.payrollTax,
      taxMethod: job.taxMethod,
    });
  }

  try {
    appendBusinessAudit({
      companyId,
      actor: "assistant-engine",
      source: "assistant",
      op: "payroll.engine_tax_applied",
      entityType: "payroll",
      entityId: period,
      status: "COMPLETED",
      detail: { applied: applied.length, skipped: skipped.length, engine: "BMF PAP + SV gesetzlich" },
    });
  } catch { /* ignore */ }

  return {
    ok: true,
    kind: "assistant.apply_engine_tax.v1",
    companyId,
    period,
    engine: "BMF PAP + SV gesetzlich",
    applied,
    skipped,
    message: applied.length
      ? `Steuer/SV über gesetzliche Engine gesetzt (${applied.length}). Keine LLM-Beträge.`
      : "Keine Abrechnung zum Setzen (frei gegeben oder leer).",
    note: "KI schreibt nur Ergebnisse der amtlichen Berechnung, keine geschätzten Steuersätze.",
  };
}
