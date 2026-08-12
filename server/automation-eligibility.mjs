/**
 * Firms that may run automatic monthly payroll:
 * - platform activated accounting (meta.accountingEnabled === true)
 * - not deactivated
 * - connection does not explicitly disable accounting
 *
 * Employer login remains available for review; it is not required for automation.
 */

export function isPayrollAutomationEnabled(company) {
  if (!company?.id) return false;
  const meta = company.meta && typeof company.meta === "object" ? company.meta : {};
  if (meta.accountingEnabled !== true) return false;
  if (String(meta.workspaceStatus || "").toLowerCase() === "inactive") return false;
  const conn = meta.connection && typeof meta.connection === "object" ? meta.connection : {};
  if (conn.accountingEnabled === false) return false;
  return true;
}

export function listAutomationCompanies(companies = []) {
  return (Array.isArray(companies) ? companies : []).filter(isPayrollAutomationEnabled);
}
