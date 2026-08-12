/**
 * Company employee registry: name + badge ID (internal).
 * Badge must never be printed on payslips – only optional personnelNumber.
 */
import {
  sqliteExec,
  sqliteGet,
  sqliteAll,
  openSqlite,
} from "./db/sqlite.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { encryptJson, decryptJson, isEncryptedBlob } from "./security/crypto.mjs";
import { normalizeEmployeeRecord, resolveEmployeeName } from "./employee-normalize.mjs";

openSqlite();

function now() {
  return new Date().toISOString();
}

function packMeta(obj) {
  return encryptJson(obj || {});
}

function unpackMeta(raw) {
  if (raw == null || raw === "{}") return {};
  if (isEncryptedBlob(raw)) return decryptJson(raw, {}) || {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function rowToEmployee(row) {
  if (!row) return null;
  const meta = unpackMeta(row.meta_json);
  return {
    companyId: row.company_id,
    badgeId: row.badge_id,
    name: row.name || "",
    personnelNumber: row.personnel_number || "",
    meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Alias for UI: never print badge as Pers.-Nr. on slips
    id: row.badge_id,
    displayPersNr: row.personnel_number || "",
  };
}

export function upsertEmployee(input = {}) {
  const normalized = normalizeEmployeeRecord(input);
  const companyId = normalizeCompanyId(input.companyId || input.company?.id || "");
  const badgeId = normalized.badgeId
    || normalizeEmployeeId(input.badgeId || input.badge || input.id || input.employeeId || "");
  const name = normalized.name || resolveEmployeeName(input);
  if (!companyId) return { ok: false, error: "company.id fehlt", employee: null };
  if (!badgeId) return { ok: false, error: "badgeId fehlt", employee: null };

  const personnelNumber = normalized.personnelNumber || String(
    input.personnelNumber || input.persNr || input.personnelNo || ""
  ).trim();
  const prevMeta = {};
  const existing = sqliteGet(
    `SELECT * FROM company_employees WHERE company_id = ? AND badge_id = ?`,
    [companyId, badgeId]
  );
  if (existing) Object.assign(prevMeta, unpackMeta(existing.meta_json));

  // Keep previous real name if incoming payload has only an ID
  const resolvedName = name
    || (prevMeta.needsName ? "" : String(existing?.name || "").trim())
    || "";

  const meta = {
    ...prevMeta,
    ...(input.meta || {}),
    source: input.source || "import",
    firstName: normalized.firstName || prevMeta.firstName || "",
    lastName: normalized.lastName || prevMeta.lastName || "",
    address: normalized.address || prevMeta.address || "",
    taxId: normalized.taxId || prevMeta.taxId || "",
    insuranceNo: normalized.insuranceNo || prevMeta.insuranceNo || "",
    birthDate: normalized.birthDate || prevMeta.birthDate || "",
    entryDate: normalized.entryDate || prevMeta.entryDate || "",
    taxClass: normalized.taxClass || prevMeta.taxClass || "",
    healthFund: normalized.healthFund || prevMeta.healthFund || "",
    healthPercent: normalized.healthPercent || prevMeta.healthPercent || "",
    churchTaxRate: normalized.churchTaxRate || prevMeta.churchTaxRate || "",
    bankName: normalized.bankName || prevMeta.bankName || "",
    bankIban: normalized.bankIban || prevMeta.bankIban || "",
    bankBic: normalized.bankBic || prevMeta.bankBic || "",
    email: normalized.email || prevMeta.email || "",
    phone: normalized.phone || prevMeta.phone || "",
    needsName: !resolvedName,
  };
  const ts = now();

  if (existing) {
    sqliteExec(
      `UPDATE company_employees SET name = ?, personnel_number = ?, meta_json = ?, updated_at = ?
       WHERE company_id = ? AND badge_id = ?`,
      [
        resolvedName || existing.name || "",
        personnelNumber || existing.personnel_number || "",
        packMeta(meta),
        ts,
        companyId,
        badgeId,
      ]
    );
  } else {
    sqliteExec(
      `INSERT INTO company_employees(company_id, badge_id, name, personnel_number, meta_json, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?)`,
      [companyId, badgeId, resolvedName, personnelNumber, packMeta(meta), ts, ts]
    );
  }

  const employee = getEmployee(companyId, badgeId);
  return {
    ok: true,
    created: !existing,
    needsName: !resolvedName,
    warning: resolvedName ? null : "name fehlt – Plattform liefert nur ID; Name wird nachgefragt",
    employee,
  };
}

export function importEmployees(companyId, employees = [], opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "company.id fehlt", results: [] };
  const list = Array.isArray(employees) ? employees : [];
  const results = [];
  for (const row of list) {
    const flat = normalizeEmployeeRecord(row);
    const r = upsertEmployee({
      ...row,
      ...flat,
      companyId: cid,
      company: { id: cid },
      source: opts.source || "platform-import",
    });
    results.push(r);
  }
  return {
    ok: results.every((r) => r.ok),
    count: results.filter((r) => r.ok).length,
    namedCount: results.filter((r) => r.ok && r.employee?.name).length,
    needsNameCount: results.filter((r) => r.needsName).length,
    errors: results.filter((r) => !r.ok).map((r) => r.error),
    warnings: results.map((r) => r.warning).filter(Boolean),
    results,
    employees: results.map((r) => r.employee).filter(Boolean),
  };
}

export function getEmployee(companyId, badgeId) {
  const row = sqliteGet(
    `SELECT * FROM company_employees WHERE company_id = ? AND badge_id = ?`,
    [normalizeCompanyId(companyId), normalizeEmployeeId(badgeId)]
  );
  return rowToEmployee(row);
}

export function listEmployees(companyId) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return [];
  return sqliteAll(
    `SELECT * FROM company_employees WHERE company_id = ? ORDER BY name COLLATE NOCASE`,
    [cid]
  ).map(rowToEmployee).filter(Boolean);
}
