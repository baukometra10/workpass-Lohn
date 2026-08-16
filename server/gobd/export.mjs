/**
 * GoBD / tax-audit export – structured, machine-readable package for Prüfung.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "node:crypto";
import { normalizeCompanyId } from "../tenant.mjs";
import { listPayrollJobs, listInvoiceJobs, loadCompany } from "../db/repository.mjs";
import { listBusinessAudit, verifyBusinessAuditChain } from "./business-audit.mjs";
import { listRevisions } from "./revisions.mjs";
import { sha256Hex } from "../security/crypto.mjs";
import { ACCOUNTING_VERSION } from "../version.mjs";
import { readAuditTail, verifyAuditChain } from "../security/audit.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportRoot = path.join(rootDir, "data", "gobd-exports");

function summarizePayroll(job) {
  return {
    jobId: job.jobId,
    companyId: job.company?.id || "",
    employeeId: job.employee?.id || "",
    employeeName: job.employee?.name || "",
    period: job.period || "",
    status: job.status || "",
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    releasedAt: job.releasedAt || null,
    revisionNo: job.revisionNo || 1,
    correctionReason: job.correctionReason || null,
    correctedAt: job.correctedAt || null,
    correctedBy: job.correctedBy || null,
    materialHash: job.materialHash || null,
    totals: job.payroll || job.payslip?.totals || null,
    errors: job.errors || [],
  };
}

function summarizeInvoice(job) {
  return {
    id: job.id,
    companyId: job.company?.id || job.draft?.company?.id || "",
    number: job.draft?.number || "",
    status: job.status || "",
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    releasedAt: job.releasedAt || null,
    revisionNo: job.revisionNo || 1,
    totals: {
      net: job.draft?.net ?? null,
      gross: job.draft?.gross ?? job.draft?.total ?? null,
    },
  };
}

/**
 * Build a GoBD export package (JSON + manifest with hashes).
 * @param {{
 *   companyId: string,
 *   from?: string,
 *   to?: string,
 *   include?: string[],
 *   actor?: string,
 *   correlationId?: string,
 * }} opts
 */
export function buildGobdExport(opts = {}) {
  const companyId = normalizeCompanyId(opts.companyId || "");
  if (!companyId) {
    return { ok: false, status: 400, error: "companyId erforderlich" };
  }
  const include = new Set(
    (opts.include || [
      "company",
      "payroll",
      "invoices",
      "revisions",
      "businessAudit",
      "securityAudit",
    ]).map((s) => String(s))
  );
  const from = opts.from || null;
  const to = opts.to || null;
  const exportId = `gobd-${companyId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  const company = loadCompany(companyId);
  if (!company) {
    return { ok: false, status: 404, error: "Firma nicht gefunden" };
  }

  const files = {};

  if (include.has("company")) {
    files["01-company.json"] = {
      id: company.id,
      name: company.name,
      taxNumber: company.taxNumber || null,
      vatId: company.vatId || null,
      activatedAt: company.activatedAt || company.createdAt || null,
      kind: company.kind || null,
    };
  }

  let payrollJobs = [];
  if (include.has("payroll") || include.has("revisions")) {
    payrollJobs = listPayrollJobs({ companyId }).filter((j) => {
      if (from && String(j.period || j.createdAt || "") < from) return false;
      if (to && String(j.period || "") > to && String(j.createdAt || "") > to) return false;
      return true;
    });
  }
  if (include.has("payroll")) {
    files["02-payroll-jobs.json"] = payrollJobs.map(summarizePayroll);
    files["02b-payroll-full.json"] = payrollJobs.map((j) => ({
      ...summarizePayroll(j),
      payslip: j.payslip || null,
      state: j.state || null,
    }));
  }

  let invoices = [];
  if (include.has("invoices")) {
    invoices = listInvoiceJobs({ companyId }).filter((j) => {
      const t = j.createdAt || j.releasedAt || "";
      if (from && t && t < from) return false;
      if (to && t && t > to) return false;
      return true;
    });
    files["03-invoices.json"] = invoices.map(summarizeInvoice);
  }

  if (include.has("revisions")) {
    files["04-document-revisions.json"] = listRevisions({ companyId, from, to, limit: 5000 });
  }

  if (include.has("businessAudit")) {
    files["05-business-audit.json"] = listBusinessAudit({ companyId, from, to, limit: 5000 });
    files["05b-business-audit-verify.json"] = verifyBusinessAuditChain({ companyId, limit: 5000 });
  }

  if (include.has("securityAudit")) {
    const sec = readAuditTail(500).filter((e) => !e.companyId || e.companyId === companyId);
    files["06-security-audit-tail.json"] = sec;
    files["06b-security-audit-verify.json"] = verifyAuditChain(200);
  }

  const hashes = {};
  for (const [name, content] of Object.entries(files)) {
    hashes[name] = sha256Hex(JSON.stringify(content));
  }

  const manifest = {
    kind: "workpass.gobd.export.v1",
    exportId,
    createdAt,
    accountingVersion: ACCOUNTING_VERSION,
    companyId,
    periodFrom: from,
    periodTo: to,
    include: [...include],
    actor: opts.actor || "system",
    correlationId: opts.correlationId || exportId,
    counts: {
      payrollJobs: payrollJobs.length,
      invoices: invoices.length,
      revisions: files["04-document-revisions.json"]?.length || 0,
      businessAudit: files["05-business-audit.json"]?.length || 0,
    },
    files: Object.keys(files),
    sha256: hashes,
    note:
      "GoBD-Export für Prüfung. Keine stillen Änderungen an freigegebenen Belegen – "
      + "siehe document_revisions + business_audit.",
  };

  const packageJson = { manifest, ...files };
  if (!existsSync(exportRoot)) mkdirSync(exportRoot, { recursive: true });
  const fileName = `${exportId}.json`;
  const filePath = path.join(exportRoot, fileName);
  writeFileSync(filePath, JSON.stringify(packageJson, null, 2), "utf8");

  return {
    ok: true,
    exportId,
    fileName,
    path: filePath,
    manifest,
    package: packageJson,
  };
}

export function gobdExportDir() {
  return exportRoot;
}
