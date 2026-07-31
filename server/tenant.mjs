/**
 * Multi-tenant helpers – company.id is the primary isolation key.
 * Platform and accounting exchange company identity via API only (never by name alone).
 */
export function normalizeCompanyId(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "-")
    .replace(/[^\w.\-@]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 120);
}

export function normalizeEmployeeId(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/[^\w.\-@]+/g, "_").slice(0, 80);
}

/**
 * Extract company block from any platform payload.
 * Accepts: company.id | company.mandantId | companyId | mandantId | tenantId
 */
export function extractCompany(payload = {}) {
  const company = payload.company && typeof payload.company === "object" ? payload.company : {};
  const id = normalizeCompanyId(
    company.id
    || company.mandantId
    || company.tenantId
    || payload.companyId
    || payload.mandantId
    || payload.tenantId
    || payload.id
  );
  return {
    id,
    name: String(company.name || company.companyName || payload.companyName || payload.name || "").trim(),
    street: String(company.street || payload.street || "").trim(),
    zip: String(company.zip || payload.zip || "").trim(),
    city: String(company.city || payload.city || "").trim(),
    address: String(company.address || payload.address || "").trim(),
    taxNumber: String(company.taxNumber || company.steuerNr || payload.taxNumber || "").trim(),
    vatId: String(company.vatId || company.ustId || payload.vatId || "").trim(),
    datevClientNo: String(company.datevClientNo || payload.datevClientNo || "").trim(),
    datevConsultantNo: String(company.datevConsultantNo || payload.datevConsultantNo || "").trim(),
    email: String(company.email || payload.email || "").trim(),
    phone: String(company.phone || payload.phone || "").trim(),
    meta: company.meta && typeof company.meta === "object" ? company.meta : (payload.meta && typeof payload.meta === "object" ? payload.meta : {}),
  };
}

export function requireCompanyId(payload, label = "company.id") {
  const company = extractCompany(payload);
  if (!company.id) {
    return {
      ok: false,
      error: `${label} fehlt – Pflicht für Multi-Tenant (jede Firma braucht eine stabile Plattform-ID)`,
      company,
    };
  }
  return { ok: true, company };
}

/**
 * Request-scoped tenant from header or query.
 * Header: X-WorkPass-Company-Id
 * Query:  ?companyId=
 */
export function tenantFromRequest(req, url) {
  const header = normalizeCompanyId(
    req.headers["x-workpass-company-id"]
    || req.headers["x-workpass-tenant-id"]
    || ""
  );
  const query = normalizeCompanyId(url?.searchParams?.get("companyId") || url?.searchParams?.get("tenantId") || "");
  return header || query || "";
}

/**
 * If a scope is active, job/document must belong to that company.
 */
export function assertSameTenant(scopeCompanyId, resourceCompanyId, resourceLabel = "Ressource") {
  const scope = normalizeCompanyId(scopeCompanyId);
  if (!scope) return { ok: true };
  const resource = normalizeCompanyId(resourceCompanyId);
  if (!resource) {
    return { ok: false, error: `${resourceLabel} ohne company.id – Zugriff verweigert` };
  }
  if (scope !== resource) {
    return {
      ok: false,
      error: `Tenant-Isolation: ${resourceLabel} gehört zu company "${resource}", Scope ist "${scope}"`,
    };
  }
  return { ok: true };
}

export function payrollJobId(companyId, employeeId, period) {
  const c = normalizeCompanyId(companyId);
  const e = normalizeEmployeeId(employeeId) || "ohne-pers";
  const p = String(period || "ohne-monat").trim() || "ohne-monat";
  if (!c) throw new Error("payrollJobId: companyId fehlt");
  return `${c}::${e}::${p}`;
}

export function invoiceDocumentId(companyId, number) {
  const c = normalizeCompanyId(companyId);
  const n = String(number || "").trim().replace(/[^\w.\-]+/g, "_") || `inv-${Date.now()}`;
  if (!c) throw new Error("invoiceDocumentId: companyId fehlt");
  return `${c}::${n}`;
}

/**
 * Company users (role accountant + companyId) may only access their own tenant.
 * Admins / API-key callers keep optional header/query scope.
 */
export function resolveTenantScope(headerOrQueryScope, sessionUser = null) {
  const requested = normalizeCompanyId(headerOrQueryScope || "");
  const sessionCompanyId = normalizeCompanyId(sessionUser?.companyId || "");
  const isCompanyUser = Boolean(
    sessionUser
    && sessionCompanyId
    && sessionUser.role !== "admin"
  );

  if (isCompanyUser) {
    if (requested && requested !== sessionCompanyId) {
      return {
        ok: false,
        status: 403,
        error: "Nur Zugriff auf die eigene Firma",
        tenantScope: sessionCompanyId,
        locked: true,
      };
    }
    return {
      ok: true,
      tenantScope: sessionCompanyId,
      locked: true,
    };
  }

  return {
    ok: true,
    tenantScope: requested || "",
    locked: false,
  };
}
