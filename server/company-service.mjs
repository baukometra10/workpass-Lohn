/**
 * Company / Mandant registry – local SQLite first, optional Postgres sync.
 * Activation from platform creates account + workspace section immediately.
 */
import crypto from "node:crypto";
import { saveCompany, loadCompany as repoLoad, listCompanies as repoList, deleteCompany as repoDelete, initDb } from "./db/repository.mjs";
import { extractCompany, requireCompanyId, normalizeCompanyId } from "./tenant.mjs";
import { secureCompare } from "./security/crypto.mjs";

initDb();

const COMPANY_PASSWORD_MIN = 4;

export function companyLoginDomain() {
  return String(process.env.WORKPASS_COMPANY_LOGIN_DOMAIN || "firma.de").trim().toLowerCase() || "firma.de";
}

export function defaultCompanyLoginEmail(companyId) {
  const id = normalizeCompanyId(companyId);
  if (!id) return "";
  return `${id}@${companyLoginDomain()}`;
}

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

function hashCompanyPassword(password, saltB64) {
  const salt = saltB64
    ? Buffer.from(saltB64, "base64url")
    : crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return {
    algo: "scrypt",
    salt: salt.toString("base64url"),
    hash: Buffer.from(hash).toString("base64url"),
  };
}

function verifyCompanyPassword(password, auth) {
  if (!auth?.hash || !auth?.salt) return false;
  const next = hashCompanyPassword(password, auth.salt);
  return secureCompare(next.hash, auth.hash);
}

/**
 * Normalize activate/upsert body: accepts flat company, { company }, or activate envelope.
 */
export function normalizeCompanyPayload(payload = {}) {
  if (payload?.company && typeof payload.company === "object") {
    return {
      company: payload.company,
      connection: payload.connection && typeof payload.connection === "object" ? payload.connection : {},
      login: payload.login || payload.credentials || payload.company?.login || null,
      event: payload.event || "",
      kind: payload.kind || "",
    };
  }
  return {
    company: payload,
    connection: payload.connection && typeof payload.connection === "object" ? payload.connection : {},
    login: payload.login || payload.credentials || null,
    event: payload.event || "",
    kind: payload.kind || "",
  };
}

export function companyWorkspaceView(company) {
  if (!company) return null;
  const meta = company.meta && typeof company.meta === "object" ? company.meta : {};
  const auth = meta.auth && typeof meta.auth === "object" ? meta.auth : null;
  return {
    id: company.id,
    name: company.name,
    accountingEnabled: meta.accountingEnabled === true,
    workspaceStatus: meta.workspaceStatus || (meta.accountingEnabled ? "active" : "inactive"),
    section: meta.section || null,
    connection: meta.connection || null,
    loginEmail: auth?.email || defaultCompanyLoginEmail(company.id),
    hasLoginPassword: Boolean(auth?.hash),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

/**
 * Attach/update firm login (email + password from platform). Password min 4 chars/digits.
 */
export function setCompanyLogin(companyId, login = {}) {
  const id = normalizeCompanyId(companyId);
  if (!id) return { ok: false, error: "company.id fehlt" };
  const company = repoLoad(id);
  if (!company) return { ok: false, error: "Firma nicht gefunden" };

  const password = String(login.password ?? login.pin ?? login.passwort ?? "");
  if (password.length < COMPANY_PASSWORD_MIN) {
    return {
      ok: false,
      error: `Firmen-Passwort min. ${COMPANY_PASSWORD_MIN} Zeichen (auch 4 Ziffern erlaubt)`,
    };
  }

  let email = String(login.email || login.username || "").trim().toLowerCase();
  if (!email) email = defaultCompanyLoginEmail(id);
  if (!email.includes("@")) email = `${email}@${companyLoginDomain()}`;

  const hashed = hashCompanyPassword(password);
  const now = new Date().toISOString();
  company.meta = {
    ...(company.meta || {}),
    auth: {
      email,
      ...hashed,
      updatedAt: now,
      source: login.source || "platform",
    },
  };
  company.updatedAt = now;
  saveCompany(company);
  return {
    ok: true,
    companyId: id,
    loginEmail: email,
    workspace: companyWorkspaceView(company),
  };
}

/**
 * Find company by login email (auth.email, company.email, {id}@domain, name slug).
 */
export function findCompanyByLoginEmail(email) {
  const mail = String(email || "").trim().toLowerCase();
  if (!mail) return null;
  const domain = companyLoginDomain();
  const local = mail.split("@")[0] || "";
  const mailDomain = mail.split("@")[1] || "";
  const localNorm = normalizeCompanyId(local);
  const companies = repoList();

  for (const c of companies) {
    if (c.meta?.accountingEnabled === false) continue;
    const authEmail = String(c.meta?.auth?.email || "").trim().toLowerCase();
    const companyEmail = String(c.email || "").trim().toLowerCase();
    const nameSlug = normalizeCompanyId(c.name || "");

    if (authEmail && authEmail === mail) return c;
    if (companyEmail && companyEmail === mail) return c;
    if (defaultCompanyLoginEmail(c.id) === mail) return c;
    if (mailDomain === domain && localNorm && localNorm === c.id) return c;
    if (mailDomain === domain && nameSlug && localNorm === nameSlug) return c;
  }

  // Also search inactive last (clearer error later)
  for (const c of companies) {
    const authEmail = String(c.meta?.auth?.email || "").trim().toLowerCase();
    if (authEmail === mail || defaultCompanyLoginEmail(c.id) === mail) return c;
  }
  return null;
}

/**
 * Verify firm portal login (platform company email + PIN/password).
 */
export function verifyCompanyLogin(email, password) {
  const company = findCompanyByLoginEmail(email);
  if (!company) {
    return {
      ok: false,
      error:
        "Keine Firma in der Buchhaltung für diese E-Mail. "
        + "Die Plattform muss einmal POST /v1/company/login-sync (oder activate inkl. login) an die Accounting-URL senden – "
        + "Aktivierung nur in der Plattform reicht nicht.",
      code: "company_not_synced",
    };
  }
  if (company.meta?.accountingEnabled === false) {
    return { ok: false, error: "Firma ist deaktiviert.", code: "company_inactive" };
  }
  const auth = company.meta?.auth;
  if (!auth?.hash) {
    return {
      ok: false,
      error:
        `Firma „${company.name || company.id}“ ist in der Buchhaltung, hat aber noch kein Passwort. `
        + "Plattform muss login.password per /v1/company/login-sync senden.",
      code: "company_password_missing",
      companyId: company.id,
      suggestedEmail: defaultCompanyLoginEmail(company.id),
    };
  }
  if (!verifyCompanyPassword(password, auth)) {
    return { ok: false, error: "Firmen-Passwort falsch.", code: "bad_password" };
  }
  const loginEmail = auth.email || defaultCompanyLoginEmail(company.id);
  return {
    ok: true,
    user: {
      id: `company:${company.id}`,
      email: loginEmail,
      name: company.name || company.id,
      role: "accountant",
      companyId: company.id,
    },
    company,
    via: "company-login",
  };
}

/**
 * Platform sync: ensure company exists + set login email/password in one call.
 * Use when company is already active on the platform but accounting has no login yet.
 */
export function syncCompanyLogin(payload = {}) {
  const companyPart = payload.company && typeof payload.company === "object"
    ? payload.company
    : {
        id: payload.companyId || payload.id,
        name: payload.name || payload.companyName || payload.companyId || payload.id,
        email: payload.email,
      };
  const loginPart = payload.login || payload.credentials || {
    email: payload.loginEmail || payload.email,
    password: payload.password ?? payload.pin,
  };

  const id = normalizeCompanyId(companyPart.id || payload.companyId || "");
  if (!id) return { ok: false, error: "company.id / companyId fehlt", errors: ["company.id fehlt"] };

  const password = String(loginPart.password ?? loginPart.pin ?? "");
  if (password.length < COMPANY_PASSWORD_MIN) {
    return {
      ok: false,
      error: `Passwort/PIN min. ${COMPANY_PASSWORD_MIN} Zeichen`,
      errors: [`Passwort min. ${COMPANY_PASSWORD_MIN}`],
    };
  }

  const existing = repoLoad(id);
  const activated = activateCompany({
    kind: "platform.company.activate.v1",
    event: existing ? "company.login.synced" : "company.accounting.activated",
    company: {
      ...companyPart,
      id,
      name: companyPart.name || existing?.name || id,
      email: companyPart.email || loginPart.email || existing?.email || "",
    },
    login: {
      email: loginPart.email || companyPart.email || defaultCompanyLoginEmail(id),
      password,
      source: "platform-login-sync",
    },
    connection: {
      accountingEnabled: true,
      activatedBy: "platform-login-sync",
      ...(payload.connection || {}),
    },
  });

  if (!activated.ok) return activated;
  return {
    ok: true,
    created: activated.created,
    company: activated.company,
    workspace: activated.workspace,
    login: activated.login,
    message: "Firma + Login in Buchhaltung synchronisiert – Anmeldung jetzt möglich",
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
  const { company: companyBody, connection: connIn, login: loginIn } = normalizeCompanyPayload(rawPayload);
  const check = requireCompanyId(companyBody?.id ? companyBody : rawPayload);
  if (!check.ok) {
    return { ok: false, errors: [check.error], company: null, workspace: null, created: false };
  }

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
  const now = new Date().toISOString();
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

  let loginResult = null;
  const loginPayload = loginIn || rawPayload.login || rawPayload.credentials || null;
  const password = loginPayload
    ? String(loginPayload.password ?? loginPayload.pin ?? loginPayload.passwort ?? "")
    : "";
  if (password) {
    loginResult = setCompanyLogin(company.id, {
      email: loginPayload.email || loginPayload.username || defaultCompanyLoginEmail(company.id),
      password,
      source: "platform-activate",
    });
  } else if (!company.meta?.auth?.hash) {
    company.meta.auth = {
      ...(company.meta.auth || {}),
      email: defaultCompanyLoginEmail(company.id),
      pendingPassword: true,
    };
    saveCompany(company);
  }

  const fresh = repoLoad(company.id) || company;
  return {
    ok: true,
    errors: loginResult && !loginResult.ok ? [loginResult.error] : [],
    created: created || upsert.created,
    company: fresh,
    workspace: companyWorkspaceView(fresh),
    login: loginResult?.ok
      ? { email: loginResult.loginEmail, ready: true }
      : {
          email: fresh.meta?.auth?.email || defaultCompanyLoginEmail(fresh.id),
          ready: Boolean(fresh.meta?.auth?.hash),
          hint: fresh.meta?.auth?.hash
            ? undefined
            : "Passwort/PIN bei activate unter login.password mitsenden",
        },
  };
}

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

/**
 * Hard-delete when platform removes the company.
 * Removes Mandant + related payroll/invoice/delivery rows from accounting.
 */
export function deleteCompany(companyIdOrPayload = {}, opts = {}) {
  const payload = typeof companyIdOrPayload === "string"
    ? { id: companyIdOrPayload }
    : (companyIdOrPayload || {});
  const id = normalizeCompanyId(
    payload.company?.id || payload.id || payload.companyId || ""
  );
  if (!id) {
    return { ok: false, deleted: false, errors: ["company.id fehlt"], companyId: null };
  }

  const hard = opts.hard !== false
    && payload.hard !== false
    && payload.purge !== false;

  if (!hard) {
    return deactivateCompany(id, {
      deactivatedBy: payload.deletedBy || payload.deactivatedBy || opts.deletedBy || "platform",
    });
  }

  const result = repoDelete(id, {});
  return {
    ok: true,
    deleted: Boolean(result.deleted),
    alreadyGone: Boolean(result.alreadyGone),
    errors: [],
    companyId: result.companyId,
    name: result.name || id,
    purged: result.purged,
    message: result.deleted
      ? "Firma aus WorkPass Lohn entfernt"
      : "Firma war bereits nicht mehr in WorkPass Lohn",
  };
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
