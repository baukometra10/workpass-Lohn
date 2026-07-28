/**
 * Compatibility facade – persistence is SQLite local-first (see server/db/).
 * Optional Postgres via WORKPASS_DATABASE_URL / DATABASE_URL.
 */
import {
  savePayrollJob as repoSavePayroll,
  loadPayrollJob as repoLoadPayroll,
  listPayrollJobs as repoListPayroll,
  saveInvoiceJob as repoSaveInvoice,
  loadInvoiceJob as repoLoadInvoice,
  listInvoiceJobs as repoListInvoice,
} from "./db/repository.mjs";
import path from "path";
import { fileURLToPath } from "url";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "data");
const payrollDir = path.join(dataDir, "payroll");
const invoiceDir = path.join(dataDir, "invoices");

/** Persistence is opened via initDb() in server/index.mjs */

export function savePayrollJob(job) {
  return repoSavePayroll(job);
}

export function loadPayrollJob(jobId) {
  return repoLoadPayroll(jobId);
}

export function listPayrollJobs(filter = {}) {
  return repoListPayroll(filter);
}

export function saveInvoiceJob(job) {
  return repoSaveInvoice(job);
}

export function loadInvoiceJob(id) {
  return repoLoadInvoice(id);
}

export function listInvoiceJobs(filter = {}) {
  return repoListInvoice(filter);
}

/** @deprecated path helpers kept for scripts */
export function payrollPath(jobId) {
  const safe = String(jobId || "").replace(/:/g, "__").replace(/[^\w.\-@]+/g, "_").slice(0, 180);
  return path.join(payrollDir, `${safe}.json`);
}

export function invoicePath(id) {
  const safe = String(id || "").replace(/:/g, "__").replace(/[^\w.\-@]+/g, "_").slice(0, 180);
  return path.join(invoiceDir, `${safe}.json`);
}

export { dataDir, payrollDir, invoiceDir };
