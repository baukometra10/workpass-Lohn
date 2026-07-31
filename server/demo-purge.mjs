/**
 * Remove demo / example payroll (Mustermann, Beispiel Anna, Demo-Seed) for a company.
 */
import { listPayrollJobs, deletePayrollJob } from "./db/repository.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { isDemoPayrollJob, isDemoEmployeeRecord } from "./demo-detect.mjs";
import { sqliteExec, sqliteAll, openSqlite } from "./db/sqlite.mjs";

openSqlite();

export function purgeDemoPayroll(companyId) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", purgedJobs: 0, purgedEmployees: 0 };

  const jobs = listPayrollJobs({ companyId: cid });
  const demoJobs = jobs.filter((j) => isDemoPayrollJob(j));
  for (const j of demoJobs) {
    deletePayrollJob(j.jobId);
  }

  const empRows = sqliteAll(
    `SELECT company_id, badge_id, name, meta_json FROM company_employees WHERE company_id = ?`,
    [cid]
  );
  let purgedEmployees = 0;
  for (const row of empRows) {
    let meta = {};
    try {
      meta = typeof row.meta_json === "string" && row.meta_json.startsWith("{")
        ? JSON.parse(row.meta_json)
        : {};
    } catch { /* encrypted or invalid – treat via name/id */ }
    const emp = {
      badgeId: row.badge_id,
      id: row.badge_id,
      name: row.name,
      source: meta.source,
      meta,
      demo: meta.demo,
    };
    if (isDemoEmployeeRecord(emp)) {
      sqliteExec(
        `DELETE FROM company_employees WHERE company_id = ? AND badge_id = ?`,
        [cid, row.badge_id]
      );
      purgedEmployees += 1;
    }
  }

  return {
    ok: true,
    companyId: cid,
    purgedJobs: demoJobs.length,
    purgedEmployees,
    message: purgedJobsMessage(demoJobs.length, purgedEmployees),
  };
}

function purgedJobsMessage(jobs, emps) {
  if (!jobs && !emps) {
    return "Keine Beispieldaten gefunden – Liste zeigt nur echte Plattform-Mitarbeiter.";
  }
  return `Beispieldaten entfernt: ${jobs} Abrechnung(en), ${emps} Mitarbeiter-Eintrag(e).`;
}
