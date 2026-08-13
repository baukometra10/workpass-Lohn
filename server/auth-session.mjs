/**
 * Accounting UI session auth – platform password or local admin fallback.
 * Sessions are HMAC-signed (no server store required).
 */
import crypto from "node:crypto";
import { secureCompare } from "./security/crypto.mjs";
import { rateLimit, noteAuthFailure, noteAuthSuccess, clientIp, clearRateLimitState } from "./security/rate-limit.mjs";
import { audit } from "./security/audit.mjs";
import {
  verifyCompanyLogin,
  companyLoginDomain,
  loadCompany,
  activateCompany,
  defaultCompanyLoginEmail,
} from "./company-service.mjs";
import { normalizeCompanyId } from "./tenant.mjs";

const SESSION_TTL_MS = Number(process.env.WORKPASS_SESSION_TTL_MS || 8 * 60 * 60 * 1000); // 8h
const ADMIN_PASSWORD_MIN = 8;

function sessionSecret() {
  return (
    process.env.WORKPASS_SESSION_SECRET
    || process.env.WORKPASS_API_KEY
    || "workpass-dev-session"
  );
}

/** Secrets the platform may have used to mint SSO tokens historically. */
function sessionSecrets() {
  const out = [];
  for (const v of [
    process.env.WORKPASS_SESSION_SECRET,
    process.env.WORKPASS_PLATFORM_SSO_SECRET,
    process.env.WORKPASS_API_KEY,
    process.env.WORKPASS_PLATFORM_WEBHOOK_KEY,
  ]) {
    const s = String(v || "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  if (!out.length) out.push("workpass-dev-session");
  return out;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function fromB64url(s) {
  return Buffer.from(String(s || ""), "base64url");
}

function hasLocalAdminConfigured() {
  const wantEmail = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim();
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "").trim();
  return Boolean(wantEmail && wantPass.length >= ADMIN_PASSWORD_MIN);
}

function adminSetupGaps() {
  const email = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim();
  const pass = String(process.env.WORKPASS_ADMIN_PASSWORD || "").trim();
  const gaps = [];
  if (!email) gaps.push("WORKPASS_ADMIN_EMAIL fehlt");
  if (!pass) gaps.push("WORKPASS_ADMIN_PASSWORD fehlt");
  else if (pass.length < ADMIN_PASSWORD_MIN) {
    gaps.push(`WORKPASS_ADMIN_PASSWORD zu kurz (min. ${ADMIN_PASSWORD_MIN})`);
  }
  return gaps;
}

export function authPublicConfig() {
  const platformUrl = String(process.env.WORKPASS_PLATFORM_AUTH_URL || "").trim();
  const hasLocalAdmin = hasLocalAdminConfigured();
  const requirePlatformRaw = process.env.WORKPASS_REQUIRE_PLATFORM_AUTH === "1";
  // Until local admin OR working platform login exists, never block Geräte-PIN
  const setupIncomplete = !hasLocalAdmin;
  const requirePlatform = requirePlatformRaw && hasLocalAdmin;
  const gaps = adminSetupGaps();

  return {
    ok: true,
    platformAuthConfigured: Boolean(platformUrl),
    localAdminFallback: hasLocalAdmin,
    requirePlatformLogin: requirePlatform,
    devicePinAllowed: process.env.WORKPASS_DEVICE_PIN_ALLOWED !== "0",
    setupIncomplete,
    setupGaps: gaps,
    sessionTtlHours: Math.round(SESSION_TTL_MS / 3600000),
    hint: setupIncomplete
      ? "WORKPASS_ADMIN_EMAIL/PASSWORD setzen ODER Firmen-Login nach activate (name@firma.de + PIN)"
      : "Admin-Konto ODER Firmen-Login (z. B. luf@firma.de + 4-stellige PIN)",
    localAdminFirst: true,
    companyLoginDomain: companyLoginDomain(),
    companyPasswordMin: 4,
    platformAuthTimeoutMs: Number(process.env.WORKPASS_PLATFORM_AUTH_TIMEOUT_MS || 2500),
  };
}

export function createSession(user) {
  const now = Date.now();
  const locale = String(user.locale || user.language || user.preferredLocale || "")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const payload = {
    sub: String(user.id || user.email || "user"),
    email: String(user.email || "").toLowerCase(),
    name: String(user.name || user.email || ""),
    role: user.role === "admin" ? "admin" : "accountant",
    companyId: user.companyId ? String(user.companyId) : "",
    locale: locale || "",
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return {
    token: `${body}.${sig}`,
    expiresAt: new Date(payload.exp).toISOString(),
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      companyId: payload.companyId || null,
      locale: payload.locale || null,
    },
  };
}

export function verifySessionToken(token) {
  const raw = String(token || "").trim();
  if (!raw || !raw.includes(".")) return { ok: false, error: "Session fehlt" };
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return { ok: false, error: "Session ungültig" };

  let matched = false;
  for (const secret of sessionSecrets()) {
    const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    if (secureCompare(sig, expected)) {
      matched = true;
      break;
    }
  }
  if (!matched) return { ok: false, error: "Session ungültig" };

  let payload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    return { ok: false, error: "Session beschädigt" };
  }
  if (!payload?.exp || Date.now() > Number(payload.exp)) {
    return { ok: false, error: "Session abgelaufen" };
  }
  return {
    ok: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role === "admin" ? "admin" : "accountant",
      companyId: payload.companyId || null,
      locale: payload.locale || null,
    },
    payload,
  };
}

export function sessionFromRequest(req) {
  const header = req.headers["x-workpass-session"] || "";
  const auth = String(req.headers.authorization || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return verifySessionToken(header || bearer);
}

function adminEmails() {
  const primary = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim().toLowerCase();
  const list = String(process.env.WORKPASS_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (primary && !list.includes(primary)) list.unshift(primary);
  return list;
}

function resolveRole(email) {
  const e = String(email || "").toLowerCase();
  if (adminEmails().includes(e)) return "admin";
  if (process.env.WORKPASS_DEFAULT_ROLE === "admin") return "admin";
  return "accountant";
}

async function verifyWithPlatform(email, password) {
  const url = String(process.env.WORKPASS_PLATFORM_AUTH_URL || "").trim();
  if (!url) return null;
  const key = process.env.WORKPASS_PLATFORM_WEBHOOK_KEY || process.env.WORKPASS_API_KEY || "";
  const timeoutMs = Number(process.env.WORKPASS_PLATFORM_AUTH_TIMEOUT_MS || 2500);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-WorkPass-Webhook-Key": key, "X-WorkPass-Key": key } : {}),
      },
      body: JSON.stringify({
        kind: "platform.auth.verify.v1",
        email,
        password,
        audience: "accounting",
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error
          || `Platform-Auth HTTP ${res.status} – Endpoint auf der Plattform fehlt oder lehnt ab`,
      };
    }
    const user = data.user || {};
    const mail = String(user.email || email).toLowerCase();
    return {
      ok: true,
      user: {
        id: user.id || mail,
        email: mail,
        name: user.name || mail,
        role: user.role === "admin" || adminEmails().includes(mail) ? "admin" : (user.role || "accountant"),
      },
      via: "platform",
    };
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? `Platform-Auth Timeout (${timeoutMs}ms) – lokales Admin-Konto wird bevorzugt`
        : `Platform-Auth nicht erreichbar: ${e.message || e}`,
    };
  } finally {
    clearTimeout(t);
  }
}

function verifyLocalAdmin(email, password) {
  const wantEmail = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim().toLowerCase();
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "").trim();
  if (!wantEmail || wantPass.length < ADMIN_PASSWORD_MIN) {
    return {
      ok: false,
      error: `Admin-Konto fehlt in Railway (${adminSetupGaps().join(", ") || "prüfen"}).`,
    };
  }
  const mail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");
  if (!secureCompare(mail, wantEmail)) {
    return {
      ok: false,
      error: `E-Mail falsch. Bitte genau eingeben: ${wantEmail}`,
    };
  }
  if (!secureCompare(pass, wantPass)) {
    return {
      ok: false,
      error: "Passwort falsch – exakt WORKPASS_ADMIN_PASSWORD aus Railway Variables (ohne Leerzeichen).",
    };
  }
  return {
    ok: true,
    user: {
      id: mail,
      email: mail,
      name: process.env.WORKPASS_ADMIN_NAME || "Accounting Admin",
      role: "admin",
    },
    via: "local-admin",
  };
}

/**
 * Login order:
 * 1) Railway admin (fast)
 * 2) Company login from registry (name@firma.de + PIN 4+)
 * 3) Optional platform auth URL
 */
export async function loginWithPassword(email, password, req, opts = {}) {
  const ip = clientIp(req);
  const acceptLang = String(req?.headers?.["accept-language"] || "").split(",")[0] || "";
  const preferredLocale = String(opts.locale || opts.language || acceptLang || "")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const withLocale = (user) => ({
    ...user,
    locale: String(user.locale || user.language || user.preferredLocale || preferredLocale || "").slice(0, 2) || null,
  });
  const rl = rateLimit({
    ip,
    route: "auth-login",
    limit: Number(process.env.WORKPASS_AUTH_LOGIN_LIMIT || 30),
    windowMs: 15 * 60_000,
  });
  if (!rl.ok) {
    audit({ type: "auth.login.rate", outcome: "deny", ip });
    return {
      ok: false,
      status: 429,
      error: "Zu viele Login-Versuche – Railway Service neu starten ODER POST /v1/auth/unlock mit API-Key.",
    };
  }

  const mail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");
  if (!mail || !pass || pass.length < 4) {
    return {
      ok: false,
      status: 422,
      error: "E-Mail und Passwort/PIN erforderlich (Firmen-PIN ab 4 Zeichen).",
    };
  }

  // 1) Fast path: Railway admin account
  let local = null;
  if (hasLocalAdminConfigured()) {
    local = verifyLocalAdmin(mail, pass);
    if (local.ok) {
      const session = createSession(withLocale({ ...local.user, role: "admin" }));
      noteAuthSuccess(ip);
      audit({
        type: "auth.login.ok",
        outcome: "ok",
        ip,
        detail: { email: session.user.email, role: "admin", via: "local-admin-first", locale: session.user.locale },
      });
      return {
        ok: true,
        status: 200,
        session: session.token,
        expiresAt: session.expiresAt,
        user: session.user,
        via: "local-admin",
        preferredLocale: session.user.locale,
      };
    }
  }

  // 2) Company login (platform firm accounts synced via activate)
  const companyLogin = verifyCompanyLogin(mail, pass);
  if (companyLogin.ok) {
    const session = createSession(withLocale(companyLogin.user));
    noteAuthSuccess(ip);
    audit({
      type: "auth.login.ok",
      outcome: "ok",
      ip,
      detail: {
        email: session.user.email,
        role: session.user.role,
        companyId: session.user.companyId,
        via: "company-login",
        locale: session.user.locale,
      },
    });
    return {
      ok: true,
      status: 200,
      session: session.token,
      expiresAt: session.expiresAt,
      user: session.user,
      via: "company-login",
      companyId: session.user.companyId,
      preferredLocale: session.user.locale,
    };
  }

  // 3) Optional platform auth URL
  let result = await verifyWithPlatform(mail, pass);
  if (result === null) {
    result = {
      ok: false,
      error: companyLogin.error
        || local?.error
        || `Kein Login. Domain für Firmen: @${companyLoginDomain()}`,
    };
  } else if (!result.ok) {
    result = {
      ok: false,
      error: companyLogin.error || local?.error || result.error,
    };
  }

  if (!result?.ok) {
    noteAuthFailure(ip);
    audit({ type: "auth.login.fail", outcome: "deny", ip, detail: { email: mail } });
    return {
      ok: false,
      status: 401,
      error: result?.error || "Anmeldung fehlgeschlagen.",
      setupGaps: adminSetupGaps(),
    };
  }

  const role = result.user.role === "admin" ? "admin" : resolveRole(result.user.email);
  const session = createSession(withLocale({ ...result.user, role }));
  noteAuthSuccess(ip);
  audit({
    type: "auth.login.ok",
    outcome: "ok",
    ip,
    detail: { email: session.user.email, role: session.user.role, via: result.via, locale: session.user.locale },
  });
  return {
    ok: true,
    status: 200,
    session: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
    via: result.via,
    preferredLocale: session.user.locale,
  };
}

/** Clear login lockout – requires API key (handled by caller). */
export function unlockAuthRateLimits() {
  clearRateLimitState();
  return { ok: true, cleared: true };
}

export function requireAdminSession(req) {
  const s = sessionFromRequest(req);
  if (!s.ok) return { ok: false, status: 401, error: s.error || "Session erforderlich" };
  if (s.user.role !== "admin") {
    return { ok: false, status: 403, error: "Nur Accounting-Admin" };
  }
  return { ok: true, user: s.user };
}

/**
 * Platform one-click entry: mint an accounting-signed session + SSO open URL.
 * Platform must NOT forge HMAC tokens itself — call this with X-WorkPass-Key.
 *
 * @param {object} body
 * @param {{ publicBase?: string }} [opts]
 */
export function createPlatformHandoff(body = {}, opts = {}) {
  const companyId = normalizeCompanyId(
    body.companyId
    || body.company?.id
    || body.user?.companyId
    || body.tenantId
  );
  if (!companyId) {
    return { ok: false, status: 422, error: "companyId fehlt" };
  }

  let company = loadCompany(companyId);
  if (!company && body.autoProvision !== false) {
    const name = String(body.company?.name || body.companyName || body.name || companyId).trim() || companyId;
    const provisioned = activateCompany({
      kind: "platform.company.activate.v1",
      event: "company.accounting.handoff",
      company: {
        id: companyId,
        name,
        ...(body.company && typeof body.company === "object" ? body.company : {}),
      },
      login: body.login && typeof body.login === "object" ? body.login : undefined,
      connection: {
        accountingEnabled: true,
        activatedBy: "platform-handoff",
      },
    });
    if (!provisioned.ok) {
      return {
        ok: false,
        status: 422,
        error: provisioned.errors?.join?.(" · ")
          || provisioned.error
          || "Firma konnte nicht angelegt werden",
      };
    }
    company = provisioned.company;
  }
  if (!company) {
    return {
      ok: false,
      status: 404,
      error: "Firma nicht in WorkPass Lohn – zuerst POST /v1/company/login-sync oder activate",
    };
  }
  if (company.meta?.accountingEnabled === false) {
    return { ok: false, status: 403, error: "Firma ist in WorkPass Lohn deaktiviert" };
  }

  const locale = String(
    body.preferredLocale
    || body.locale
    || body.language
    || body.user?.locale
    || body.user?.language
    || company.meta?.locale
    || company.meta?.language
    || ""
  )
    .trim()
    .toLowerCase()
    .slice(0, 2);

  const email = String(
    body.email
    || body.login?.email
    || body.user?.email
    || company.meta?.auth?.email
    || company.email
    || defaultCompanyLoginEmail(company.id)
  )
    .trim()
    .toLowerCase();

  const name = String(
    body.user?.name
    || body.name
    || company.name
    || email
    || company.id
  ).trim();

  const session = createSession({
    id: body.user?.id || body.userId || `platform:${company.id}:${email || company.id}`,
    email: email || defaultCompanyLoginEmail(company.id),
    name,
    // Firm one-click always lands as accountant (tenant-locked). Never elevates to admin.
    role: "accountant",
    companyId: company.id,
    locale,
  });

  const ssoPayload = {
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
    via: "platform-handoff",
    preferredLocale: locale || session.user.locale || "",
  };
  const hash = encodeURIComponent(JSON.stringify(ssoPayload));
  const base = String(opts.publicBase || process.env.WORKPASS_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    || "https://workpass-lohn.up.railway.app";

  return {
    ok: true,
    status: 200,
    session: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
    companyId: company.id,
    openPath: `/lohn.html#suppix-sso=${hash}`,
    openUrl: `${base}/lohn.html#suppix-sso=${hash}`,
    preferredLocale: locale || null,
  };
}

/**
 * Browser SSO upgrade: accept #suppix-sso payload from the platform launch URL.
 * 1) Verify token with any known session secret
 * 2) Else remint a real accounting session for an active company (platform one-click)
 *
 * Set WORKPASS_TRUST_PLATFORM_SSO_HASH=0 to disable remint (verify-only).
 */
export function bootstrapPlatformSso(body = {}, req = null) {
  if (req) {
    const ip = clientIp(req);
    const rl = rateLimit({
      ip,
      route: "auth-sso-bootstrap",
      limit: Number(process.env.WORKPASS_SSO_BOOTSTRAP_LIMIT || 40),
      windowMs: 15 * 60_000,
    });
    if (!rl.ok) {
      return {
        ok: false,
        status: 429,
        error: "Zu viele SSO-Versuche – bitte kurz warten.",
      };
    }
  }

  const token = String(
    body.token || body.session || body.accessToken || body.sessionToken || ""
  ).trim();
  if (token) {
    const verified = verifySessionToken(token);
    if (verified.ok) {
      const session = createSession({
        id: verified.user.id,
        email: verified.user.email,
        name: verified.user.name,
        role: verified.user.companyId ? "accountant" : verified.user.role,
        companyId: verified.user.companyId || "",
        locale: verified.user.locale || body.preferredLocale || body.locale || "",
      });
      return {
        ok: true,
        status: 200,
        session: session.token,
        expiresAt: session.expiresAt,
        user: session.user,
        via: "sso-bootstrap-verified",
        preferredLocale: session.user.locale,
      };
    }
  }

  const trust = process.env.WORKPASS_TRUST_PLATFORM_SSO_HASH !== "0";
  if (!trust) {
    return { ok: false, status: 401, error: "SSO-Token ungültig" };
  }

  const companyId = normalizeCompanyId(
    body.companyId
    || body.company?.id
    || body.user?.companyId
    || body.tenantId
  );
  if (!companyId) {
    return { ok: false, status: 422, error: "companyId fehlt im SSO" };
  }

  const expMs = body.expiresAt ? Date.parse(body.expiresAt) : NaN;
  if (Number.isFinite(expMs) && expMs < Date.now() - 120_000) {
    return { ok: false, status: 401, error: "SSO abgelaufen" };
  }
  // Reject absurdly long-lived assertions (likely forged bookmarks)
  if (Number.isFinite(expMs) && expMs > Date.now() + 48 * 60 * 60 * 1000) {
    return { ok: false, status: 401, error: "SSO ungültig (Ablauf)" };
  }

  const handoff = createPlatformHandoff({
    companyId,
    preferredLocale: body.preferredLocale || body.locale || body.user?.locale || "",
    email: body.email || body.user?.email || "",
    name: body.name || body.user?.name || "",
    user: body.user && typeof body.user === "object" ? body.user : { companyId },
    company: body.company,
    autoProvision: body.autoProvision !== false,
  });
  if (!handoff.ok) return handoff;
  return {
    ...handoff,
    via: "sso-bootstrap-remint",
  };
}
