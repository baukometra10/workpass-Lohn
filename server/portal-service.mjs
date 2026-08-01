/**
 * Firm-portal helpers: employees + month status overview.
 * Demo/example employees (Mustermann, Beispiel Anna, Demo-Seed) are excluded by default.
 */
import { listPayrollJobs, listInvoiceJobs } from "./db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";

function periodsAround(center, count = 6) {
  const [y0, m0] = String(center).split("-").map(Number);
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(y0, m0 - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function realJobs(jobs, includeDemo = false) {
  if (includeDemo) return jobs || [];
  return (jobs || []).filter((j) => !isDemoPayrollJob(j));
}

export function listCompanyEmployees(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", employees: [] };
  const period = opts.period || undefined;
  const jobs = realJobs(listPayrollJobs({ companyId: cid, period }), opts.includeDemo);
  const byEmp = new Map();
  for (const j of jobs) {
    const eid = normalizeEmployeeId(j.employee?.id || j.state?.employeeId || "");
    if (!eid) continue;
    const prev = byEmp.get(eid);
    const entry = {
      id: eid,
      badgeId: j.state?.badgeId || j.employee?.badgeId || eid,
      name: j.employee?.name || j.state?.employeeName || eid,
      personnelNumber: j.state?.personnelNumber || j.employee?.personnelNumber || "",
      lastPeriod: j.period || "",
      lastStatus: j.status || "",
      lastJobId: j.jobId,
      net: j.payslip?.totals?.net ?? j.payroll?.net ?? null,
      gross: j.payslip?.totals?.gross ?? j.payroll?.gross ?? null,
      updatedAt: j.updatedAt || j.releasedAt || "",
      jobCount: (prev?.jobCount || 0) + 1,
      source: "platform",
      demo: false,
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
    const jobs = realJobs(listPayrollJobs({ companyId: cid, period }), opts.includeDemo);
    const released = jobs.filter((j) => j.status === "released").length;
    const calculated = jobs.filter((j) => j.status === "calculated").length;
    const error = jobs.filter((j) => j.status === "error").length;
    const grossSum = jobs.reduce((s, j) => s + Number(j.payslip?.totals?.gross || 0), 0);
    const netSum = jobs.reduce((s, j) => s + Number(j.payslip?.totals?.net || 0), 0);
    const taxSum = jobs.reduce((s, j) => {
      const t = j.payslip?.totals || {};
      return s + Number(t.payrollTax || 0) + Number(t.solidarity || 0) + Number(t.churchTax || 0);
    }, 0);
    const svAnSum = jobs.reduce((s, j) => s + Number(j.payslip?.totals?.svTotal || 0), 0);
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
      grossSum,
      netSum,
      taxSum,
      svAnSum,
      employees: jobs.map((j) => ({
        id: j.employee?.id,
        name: j.employee?.name,
        status: j.status,
        jobId: j.jobId,
        net: j.payslip?.totals?.net ?? null,
        gross: j.payslip?.totals?.gross ?? null,
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
  const jobs = realJobs(
    listPayrollJobs({ companyId: cid, period: opts.period || undefined }),
    opts.includeDemo
  )
    .filter((j) => j.status === "released" || opts.includeAll)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return {
    ok: true,
    companyId: cid,
    count: jobs.length,
    items: jobs.map((j) => ({
      jobId: j.jobId,
      period: j.period,
      employee: j.employee,
      status: j.status,
      net: j.payslip?.totals?.net ?? null,
      gross: j.payslip?.totals?.gross ?? null,
      releasedAt: j.releasedAt,
      updatedAt: j.updatedAt,
    })),
  };
}

/** Released (or filtered) invoices for firm portal / hub. */
export function listInvoiceArchive(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", items: [] };
  let jobs = listInvoiceJobs({
    companyId: cid,
    status: opts.status || undefined,
  });
  if (!opts.includeAll && !opts.status) {
    jobs = jobs.filter((j) => j.status === "released");
  }
  const period = opts.period && /^\d{4}-\d{2}$/.test(opts.period) ? opts.period : "";
  if (period) {
    jobs = jobs.filter((j) => {
      const p = j.period || String(j.draft?.invoiceDate || "").slice(0, 7);
      return p === period;
    });
  }
  jobs = jobs.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return {
    ok: true,
    kind: "portal.invoice.archive.v1",
    companyId: cid,
    count: jobs.length,
    items: jobs.map((j) => ({
      id: j.id,
      number: j.draft?.number || j.hubEntry?.number || "",
      customer: j.draft?.customer || j.hubEntry?.buyer || "",
      status: j.status,
      period: j.period || String(j.draft?.invoiceDate || "").slice(0, 7) || null,
      invoiceDate: j.draft?.invoiceDate || "",
      net: j.draft?.totals?.net ?? null,
      tax: j.draft?.totals?.tax ?? null,
      gross: j.draft?.totals?.gross ?? null,
      releasedAt: j.releasedAt || null,
      updatedAt: j.updatedAt || null,
      errors: j.errors || [],
    })),
  };
}
