/**
 * Demo / seed payroll batch so month-close can be tested without the real platform.
 * Used by POST /v1/demo/seed-month and optional pull URL pointing here.
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeCompanyId } from "./tenant.mjs";
import { loadCompany } from "./company-service.mjs";
import { currentPeriod } from "./month-close.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildDemoPayrollBatch({ companyId, period, companyName } = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const per = String(period || currentPeriod()).trim();
  const company = loadCompany(cid);
  const name = companyName || company?.name || cid;

  let example;
  try {
    example = JSON.parse(
      readFileSync(path.join(root, "examples", "platform-payroll.batch.v1.json"), "utf8")
    );
  } catch {
    example = { employees: [] };
  }

  const employees = (example.employees || []).map((row, i) => ({
    ...row,
    employee: {
      ...(row.employee || {}),
      id: row.employee?.id || `demo-${i + 1}`,
      name: row.employee?.name || `Demo MA ${i + 1}`,
    },
  }));

  if (!employees.length) {
    employees.push({
      employee: {
        id: "demo-1",
        name: "Demo Mustermann",
        taxClass: "I",
        healthFund: "TK",
        healthPercent: "14.6",
      },
      attendance: { days: 21, hours: 168 },
      wageItems: [{ code: "2000", label: "Gehalt", amount: 3200, taxFlag: "L", svFlag: "L" }],
      bank: { name: "Demo Bank", iban: "DE89370400440532013000" },
    });
  }

  return {
    ok: true,
    kind: "platform.payroll.batch.v1",
    period: per,
    company: {
      id: cid,
      name,
      taxNumber: company?.taxNumber || "143/123/45678",
      street: company?.street || "",
      zip: company?.zip || "",
      city: company?.city || "",
    },
    note: "Demo-Batch aus WorkPass Lohn (ohne echte Plattform)",
    employees,
  };
}
