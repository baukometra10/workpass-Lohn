/**
 * Company / Mandant registry – local SQLite first, optional Postgres sync.
 * Activation from platform creates account + workspace section immediately.
 */
import { saveCompany, loadCompany as repoLoad, listCompanies as repoList, initDb } from "./db/repository.mjs";
import { extractCompany, requireCompanyId, normalizeCompanyId } from "./tenant.mjs";

initDb();

function buildWorkspace(companyId, companyName, prevWorkspace, activatedAt) {
  const id = `ws:${normalizeCompanyId(companyId)}`;
  return {
    id,
    title: String(companyName || companyId || "Firma").trim() || companyId,
    status: "active",
    createdAt: prevWorkspace?.createdAt || activatedAt,
    activatedAt,
  };
}

function mergeConnection(prev = {}, incoming = {}, activatedAt) {
  return {
    ...(typeof prev === "object" ? prev : {}),
    ...(typeof incoming === "object" ? incoming : {}),
    accountingEnabled: incoming.accountingEnabled !== false,
    sendPayslips: incoming.sendPayslips !== false,
    sendInvoices: incoming.sendInvoices !== false,
    activatedAt: incoming.activatedAt || prev.activatedAt || activatedAt,
    activatedBy: incoming.activatedBy || prev.activatedBy || "platform",
  };
}

/**
 * Normalize activate/upsert body: accepts flat company, { company }, or activate envelope.
 */
export function normalizeCompanyPayload(payload = {}) {
  if (payload?.company && typeof payload.company === "object") {
    return {
      company: payload.company,
      connection: payload.connection && typeof payload.connection === "object" ? payload.connection : {},
      event: payload.event || "",
      kind: payload.kind || "",
    };
  }
  return {
    company: payload,
    connection: payload.connection && typeof payload.connection === "object" ? payload.connection : {},
    event: payload.event || "",
    kind: payload.kind || "",
  };
}

export function companyWorkspaceView(company) {
  if (!company) return null;
  const meta = company.meta && typeof company.meta === "object" ? company.meta : {};
  return {
    id: company.id,
    name: company.name,
    accountingEnabled: meta.accountingEnabled === true,
    workspaceStatus: meta.workspaceStatus || (meta.accountingEnabled ? "active" : "inactive"),
    section: meta.section || null,
    connection: meta.connection || null,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export function upsertCompany(payload) {
  const check = requireCompanyId(payload);
  if (!check.ok) return { ok: false, errors: [check.error], company: null, created: false };

  const incoming = extractCompany(payload);
  const now = new Date().toISOString();
  const prev = repoLoad(incoming.id);
  const created = !prev;
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
  return { ok: true, errors: [], company, created };
}

/**
 * Platform activates accounting for a company → create account + section immediately.
 */
export function activateCompany(rawPayload = {}) {
  const { company: companyBody, connection: connIn } = normalizeCompanyPayload(rawPayload);
  const check = requireCompanyId(companyBody?.id ? companyBody : rawPayload);
  if (!check.ok) {
    return { ok: false, errors: [check.error], company: null, workspace: null, created: false };
  }

  const now = new Date().toISOString();
  const prev = repoLoad(check.company.id);
  const created = !prev;

  const upsert = upsertCompany({
    company: {
      ...companyBody,
      id: check.company.id,
      name: companyBody.name || check.company.name || prev?.name || check.company.id,
      meta: {
        ...(companyBody.meta || {}),
      },
    },
  });
  if (!upsert.ok) return { ...upsert, workspace: null };

  const company = upsert.company;
  const activatedAt = connIn.activatedAt || now;
  const connection = mergeConnection(company.meta?.connection, connIn, activatedAt);
  const section = buildWorkspace(
    company.id,
    company.name,
    company.meta?.section,
    activatedAt
  );

  company.meta = {
    ...(company.meta || {}),
    accountingEnabled: true,
    workspaceStatus: "active",
    section,
    connection,
    activatedAt,
  };
  company.updatedAt = now;
  if (rawPayload.kind) company.meta.activateKind = String(rawPayload.kind);
  if (rawPayload.event) company.meta.activateEvent = String(rawPayload.event);

  saveCompany(company);

  return {
    ok: true,
    errors: [],
    created: created || upsert.created,
    company,
    workspace: companyWorkspaceView(company),
  };
}

/**
 * Soft-disable accounting link without deleting company data.
 */
export function deactivateCompany(companyId, opts = {}) {
  const id = normalizeCompanyId(companyId);
  if (!id) return { ok: false, errors: ["company.id fehlt"], company: null };
  const prev = repoLoad(id);
  if (!prev) return { ok: false, errors: ["Firma nicht gefunden"], company: null };
  const now = new Date().toISOString();
  const company = {
    ...prev,
    meta: {
      ...(prev.meta || {}),
      accountingEnabled: false,
      workspaceStatus: "inactive",
      connection: {
        ...(prev.meta?.connection || {}),
        accountingEnabled: false,
        deactivatedAt: now,
        deactivatedBy: opts.deactivatedBy || "platform",
      },
    },
    updatedAt: now,
  };
  saveCompany(company);
  return { ok: true, errors: [], company, workspace: companyWorkspaceView(company) };
}

export function loadCompany(id) {
  return repoLoad(id);
}

export function listCompanies(filter = {}) {
  return repoList(filter);
}

/**
 * Ensure company exists from payroll/invoice payload.
 * First sighting also provisions an active workspace (fallback if platform skipped activate).
 */
export function ensureCompanyFromPayload(payload) {
  const check = requireCompanyId(payload);
  if (!check.ok) return check;
  const existing = repoLoad(check.company.id);
  if (existing?.meta?.accountingEnabled && existing?.meta?.section) {
    return upsertCompany(payload.company ? { company: payload.company } : payload);
  }
  return activateCompany({
    kind: "platform.company.activate.v1",
    event: existing ? "company.accounting.ensured" : "company.accounting.activated",
    company: payload.company && typeof payload.company === "object"
      ? payload.company
      : check.company,
    connection: {
      accountingEnabled: true,
      activatedBy: existing ? "ingest-ensure" : "ingest-first",
    },
  });
}
