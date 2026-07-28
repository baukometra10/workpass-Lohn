/**
 * Company / Mandant registry – local SQLite first, optional Postgres sync.
 */
import { saveCompany, loadCompany as repoLoad, listCompanies as repoList, initDb } from "./db/repository.mjs";
import { extractCompany, requireCompanyId } from "./tenant.mjs";

initDb();

export function upsertCompany(payload) {
  const check = requireCompanyId(payload);
  if (!check.ok) return { ok: false, errors: [check.error], company: null };

  const incoming = extractCompany(payload);
  const now = new Date().toISOString();
  const prev = repoLoad(incoming.id);
  const company = {
    kind: "platform.company.v1",
    id: incoming.id,
    name: incoming.name || prev?.name || incoming.id,
    street: incoming.street || prev?.street || "",
    zip: incoming.zip || prev?.zip || "",
    city: incoming.city || prev?.city || "",
    address: incoming.address || prev?.address || "",
    taxNumber: incoming.taxNumber || prev?.taxNumber || "",
    vatId: incoming.vatId || prev?.vatId || "",
    datevClientNo: incoming.datevClientNo || prev?.datevClientNo || "",
    datevConsultantNo: incoming.datevConsultantNo || prev?.datevConsultantNo || "",
    email: incoming.email || prev?.email || "",
    phone: incoming.phone || prev?.phone || "",
    meta: { ...(prev?.meta || {}), ...(incoming.meta || {}) },
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  saveCompany(company);
  return { ok: true, errors: [], company };
}

export function loadCompany(id) {
  return repoLoad(id);
}

export function listCompanies(filter = {}) {
  return repoList(filter);
}

export function ensureCompanyFromPayload(payload) {
  const check = requireCompanyId(payload);
  if (!check.ok) return check;
  return upsertCompany(payload.company ? { company: payload.company } : payload);
}
