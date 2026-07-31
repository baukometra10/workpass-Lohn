/**
 * Firm-portal helpers: employees + month status overview.
 */
import { listPayrollJobs } from "./db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";

function periodsAround(center, count = 6) {
  const [y0, m0] = String(center).split("-").map(Number);
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(y0, m0 - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function listCompanyEmployees(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", employees: [] };
  const period = opts.period || undefined;
  const jobs = listPayrollJobs({ companyId: cid, period });
  const byEmp = new Map();
  for (const j of jobs) {
    const eid = normalizeEmployeeId(j.employee?.id || j.state?.employeeId || "");
    if (!eid) continue;
    const prev = byEmp.get(eid);
    const entry = {
      id: eid,
      name: j.employee?.name || j.state?.employeeName || eid,
      lastPeriod: j.period || "",
      lastStatus: j.status || "",
      lastJobId: j.jobId,
      net: j.payslip?.totals?.net ?? j.payroll?.net ?? null,
      gross: j.payslip?.totals?.gross ?? j.payroll?.gross ?? null,
      updatedAt: j.updatedAt || j.releasedAt || "",
      jobCount: (prev?.jobCount || 0) + 1,
    };
    if (!prev || String(j.updatedAt || "") > String(prev.updatedAt || "")) {
      byEmp.set(eid, entry);
    } else {
      prev.jobCount = entry.jobCount;
      byEmp.set(eid, prev);
    }
  }
  const employees = [...byEmp.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "de")
  );
  return { ok: true, companyId: cid, period: period || null, count: employees.length, employees };
}

export function monthOverview(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", months: [] };
  const focus = String(opts.period || currentPeriod()).trim();
  const months = periodsAround(focus, Number(opts.months) || 6).map((period) => {
    const jobs = listPayrollJobs({ companyId: cid, period });
    const released = jobs.filter((j) => j.status === "released").length;
    const calculated = jobs.filter((j) => j.status === "calculated").length;
    const error = jobs.filter((j) => j.status === "error").length;
    let status = "empty";
    if (error) status = "error";
    else if (jobs.length && released === jobs.length) status = "released";
    else if (calculated || released) status = "partial";
    else if (jobs.length) status = "calculated";
    return {
      period,
      status,
      total: jobs.length,
      released,
      calculated,
      error,
      employees: jobs.map((j) => ({
        id: j.employee?.id,
        name: j.employee?.name,
        status: j.status,
        jobId: j.jobId,
        net: j.payslip?.totals?.net ?? null,
      })),
    };
  });
  return {
    ok: true,
    companyId: cid,
    focus,
    months,
    current: months.find((m) => m.period === focus) || null,
  };
}

export function listReleasedArchive(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", items: [] };
  const jobs = listPayrollJobs({ companyId: cid, period: opts.period || undefined })
    .filter((j) => j.status === "released" || opts.includeAll)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return {
    ok: true,
    companyId: cid,
    count: jobs.length,
    items: jobs.slice(0, Number(opts.limit) || 80).map((j) => ({
      jobId: j.jobId,
      period: j.period,
      status: j.status,
      employee: j.employee,
      net: j.payslip?.totals?.net ?? null,
      gross: j.payslip?.totals?.gross ?? null,
      releasedAt: j.releasedAt,
      updatedAt: j.updatedAt,
      hasPayslip: Boolean(j.payslip),
    })),
  };
}
