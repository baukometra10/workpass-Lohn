/**
 * Firm-portal helpers: employees + month status overview.
 * Demo/example employees (Mustermann, Beispiel Anna, Demo-Seed) are excluded by default.
 */
import { listPayrollJobs, listInvoiceJobs } from "./db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { listEmployees as listRegisteredEmployees } from "./employee-registry.mjs";

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

function looksLikeIdOnly(name, id) {
  const n = String(name || "").trim();
  const i = String(id || "").trim();
  if (!n) return true;
  if (i && n.toLowerCase() === i.toLowerCase()) return true;
  return false;
}

function bestEmployeeName(job, fallbackId) {
  const candidates = [
    job?.employee?.name,
    job?.state?.employeeName,
    job?.payslip?.employee?.name,
    job?.state?.employee?.name,
  ];
  for (const c of candidates) {
    const n = String(c || "").trim();
    if (n && !looksLikeIdOnly(n, fallbackId)) return n;
  }
  return "";
}

function employeeSyncReadiness(job) {
  const state = job?.state || {};
  const hard = Array.isArray(job?.errors) ? job.errors : [];
  const soft = Array.isArray(job?.printHints) ? job.printHints : [];
  const hours = Number(state.workHours) || 0;
  const rate = Number(state.meta?.hourlyRate || state.hourlyRate) || 0;
  const hasGross = (Array.isArray(state.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0))
    || Number(state.grossSalary) > 0
    || (hours > 0 && rate > 0);
  const hasSv = Boolean(String(state.employeeInsuranceNo || "").trim());
  const hasKk = Boolean(String(state.healthFund || "").trim());
  const hasBank = Boolean(String(state.bankIban || state.bankName || "").trim());
  const ready = job?.status === "released"
    || (job?.status === "calculated" && hard.length === 0 && hasGross);
  const waitingHours = rate > 0 && hours <= 0 && !hasGross;
  return {
    hasHours: hours > 0,
    hasHourlyRate: rate > 0,
    hasGross,
    hasSv,
    hasKk,
    hasBank,
    ready,
    waitingHours,
    hardCount: hard.length,
    softCount: soft.length,
    status: job?.status || "empty",
  };
}

export function listCompanyEmployees(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", employees: [] };
  const period = opts.period || undefined;
  const jobs = realJobs(listPayrollJobs({ companyId: cid, period }), opts.includeDemo);
  const byEmp = new Map();
  for (const j of jobs) {
    const eid = normalizeEmployeeId(j.employee?.id || j.state?.employeeId || j.state?.badgeId || "");
    if (!eid) continue;
    const prev = byEmp.get(eid);
    const name = bestEmployeeName(j, eid);
    const sync = employeeSyncReadiness(j);
    const entry = {
      id: eid,
      badgeId: j.state?.badgeId || j.employee?.badgeId || eid,
      name: name || eid,
      hasName: Boolean(name),
      personnelNumber: j.state?.personnelNumber || j.employee?.personnelNumber || "",
      lastPeriod: j.period || "",
      lastStatus: j.status || "",
      lastJobId: j.jobId,
      net: j.payslip?.totals?.net ?? j.payroll?.net ?? null,
      gross: j.payslip?.totals?.gross ?? j.payroll?.gross ?? null,
      workHours: Number(j.state?.workHours) || null,
      hourlyRate: Number(j.state?.meta?.hourlyRate || j.state?.hourlyRate) || null,
      sync,
      updatedAt: j.updatedAt || j.releasedAt || "",
      jobCount: (prev?.jobCount || 0) + 1,
      source: "platform",
      demo: false,
    };
    if (!prev || String(j.updatedAt || "") > String(prev.updatedAt || "")) {
      byEmp.set(eid, entry);
    } else {
      prev.jobCount = entry.jobCount;
      if (!prev.hasName && entry.hasName) {
        prev.name = entry.name;
        prev.hasName = true;
      }
      byEmp.set(eid, prev);
    }
  }

  // Enrich / include registry employees (name + badge) even without a job yet
  try {
    for (const reg of listRegisteredEmployees(cid)) {
      const eid = normalizeEmployeeId(reg.badgeId || reg.id || "");
      if (!eid) continue;
      const regName = String(reg.name || "").trim();
      const prev = byEmp.get(eid);
      if (!prev) {
        byEmp.set(eid, {
          id: eid,
          badgeId: eid,
          name: regName || eid,
          hasName: Boolean(regName) && !looksLikeIdOnly(regName, eid),
          personnelNumber: reg.personnelNumber || "",
          lastPeriod: period || "",
          lastStatus: "empty",
          lastJobId: "",
          net: null,
          gross: null,
          workHours: null,
          hourlyRate: null,
          sync: {
            hasHours: false,
            hasHourlyRate: false,
            hasGross: false,
            hasSv: Boolean(reg.meta?.insuranceNo),
            hasKk: Boolean(reg.meta?.healthFund),
            hasBank: Boolean(reg.meta?.bankIban || reg.meta?.bankName),
            ready: false,
            waitingHours: false,
            hardCount: 0,
            softCount: 0,
            status: "empty",
          },
          updatedAt: reg.updatedAt || "",
          jobCount: 0,
          source: "registry",
          demo: false,
        });
        continue;
      }
      if ((!prev.hasName || looksLikeIdOnly(prev.name, eid)) && regName && !looksLikeIdOnly(regName, eid)) {
        prev.name = regName;
        prev.hasName = true;
        byEmp.set(eid, prev);
      }
      if (!prev.personnelNumber && reg.personnelNumber) {
        prev.personnelNumber = reg.personnelNumber;
        byEmp.set(eid, prev);
      }
    }
  } catch {
    /* registry optional */
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
    const syncStats = jobs.reduce((acc, j) => {
      const s = employeeSyncReadiness(j);
      if (s.ready) acc.ready += 1;
      if (s.waitingHours) acc.waitingHours += 1;
      if (!s.hasSv) acc.missingSv += 1;
      if (!s.hasKk) acc.missingKk += 1;
      return acc;
    }, { ready: 0, waitingHours: 0, missingSv: 0, missingKk: 0 });
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
      ...syncStats,
      employees: jobs.map((j) => ({
        id: j.employee?.id,
        name: j.employee?.name,
        status: j.status,
        jobId: j.jobId,
        net: j.payslip?.totals?.net ?? null,
        gross: j.payslip?.totals?.gross ?? null,
        sync: employeeSyncReadiness(j),
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
  let registry = [];
  try {
    registry = listRegisteredEmployees(cid);
  } catch {
    registry = [];
  }
  const byBadge = new Map(
    registry.map((r) => [normalizeEmployeeId(r.badgeId || r.id), r])
  );
  return {
    ok: true,
    companyId: cid,
    count: jobs.length,
    items: jobs.map((j) => {
      const eid = normalizeEmployeeId(j.employee?.id || j.employee?.badgeId || "");
      let emp = { ...(j.employee || {}) };
      if (looksLikeIdOnly(emp.name, eid) && eid) {
        const reg = byBadge.get(eid);
        if (reg?.name && !looksLikeIdOnly(reg.name, eid)) {
          emp = { ...emp, name: reg.name, badgeId: emp.badgeId || eid, id: emp.id || eid };
        }
      }
      return {
        jobId: j.jobId,
        period: j.period,
        employee: emp,
        status: j.status,
        net: j.payslip?.totals?.net ?? null,
        gross: j.payslip?.totals?.gross ?? null,
        releasedAt: j.releasedAt,
        updatedAt: j.updatedAt,
      };
    }),
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
