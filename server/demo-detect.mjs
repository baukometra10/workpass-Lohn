/**
 * Detect demo / example payroll (Mustermann, Beispiel Anna, Demo-Seed).
 * Real platform employees must never be mixed into the firm portal list.
 */
export function isDemoPayrollJob(job) {
  if (!job || typeof job !== "object") return false;
  if (job.demo === true || job.isDemo === true) return true;
  if (job.state?.meta?.demo === true || job.state?.meta?.source === "demo-seed") return true;
  if (job.payslip?.meta?.demo === true) return true;
  if (job.inbound?.demo === true || job.inbound?.meta?.demo === true) return true;

  const note = [
    job.inbound?.note,
    job.state?.note,
    job.payslip?.note,
    job.note,
  ].map((x) => String(x || "")).join(" ");
  if (/demo-batch|ohne echte plattform|demo-monat|workpass lohn \(ohne/i.test(note)) {
    return true;
  }

  const eid = String(job.employee?.id || job.state?.employeeId || job.state?.badgeId || "").trim();
  const name = String(job.employee?.name || job.state?.employeeName || "").trim();
  if (/^demo[-_]/i.test(eid)) return true;

  // Classic seed identities from examples/platform-payroll.batch.v1.json
  if (eid === "02006" && /mustermann/i.test(name)) return true;
  if (eid === "02007" && /beispiel/i.test(name)) return true;
  if (/^demo mustermann$/i.test(name)) return true;

  return false;
}

export function isDemoEmployeeRecord(emp) {
  if (!emp) return false;
  if (emp.demo || emp.source === "demo" || emp.source === "demo-seed" || emp.meta?.demo) return true;
  const eid = String(emp.badgeId || emp.id || "").trim();
  const name = String(emp.name || "").trim();
  if (/^demo[-_]/i.test(eid)) return true;
  if (eid === "02006" && /mustermann/i.test(name)) return true;
  if (eid === "02007" && /beispiel/i.test(name)) return true;
  return false;
}
