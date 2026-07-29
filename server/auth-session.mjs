/**
 * Accounting UI session auth – platform password or local admin fallback.
 * Sessions are HMAC-signed (no server store required).
 */
import crypto from "node:crypto";
import { secureCompare } from "./security/crypto.mjs";
import { rateLimit, noteAuthFailure, noteAuthSuccess, clientIp } from "./security/rate-limit.mjs";
import { audit } from "./security/audit.mjs";

const SESSION_TTL_MS = Number(process.env.WORKPASS_SESSION_TTL_MS || 8 * 60 * 60 * 1000); // 8h

function sessionSecret() {
  return (
    process.env.WORKPASS_SESSION_SECRET
    || process.env.WORKPASS_API_KEY
    || "workpass-dev-session"
  );
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function fromB64url(s) {
  return Buffer.from(String(s || ""), "base64url");
}

export function authPublicConfig() {
  const platformUrl = String(process.env.WORKPASS_PLATFORM_AUTH_URL || "").trim();
  const hasLocalAdmin = hasLocalAdminConfigured();
  const requirePlatform = process.env.WORKPASS_REQUIRE_PLATFORM_AUTH === "1";
  return {
    ok: true,
    platformAuthConfigured: Boolean(platformUrl),
    localAdminFallback: hasLocalAdmin,
    requirePlatformLogin: requirePlatform,
    devicePinAllowed: process.env.WORKPASS_DEVICE_PIN_ALLOWED !== "0",
    sessionTtlHours: Math.round(SESSION_TTL_MS / 3600000),
    hint: platformUrl && !hasLocalAdmin
      ? "Anmeldung mit WorkPass-Plattform-Konto"
      : hasLocalAdmin
        ? (platformUrl
          ? "Plattform-Konto oder Admin-E-Mail aus Railway Variables"
          : "Anmeldung mit Admin-Konto (Bridge-Env)")
        : "Nur Geräte-PIN (Platform-Auth / Admin noch nicht konfiguriert)",
  };
}

export function createSession(user) {
  const now = Date.now();
  const payload = {
    sub: String(user.id || user.email || "user"),
    email: String(user.email || "").toLowerCase(),
    name: String(user.name || user.email || ""),
    role: user.role === "admin" ? "admin" : "accountant",
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
    },
  };
}

export function verifySessionToken(token) {
  const raw = String(token || "").trim();
  if (!raw || !raw.includes(".")) return { ok: false, error: "Session fehlt" };
  const [body, sig] = raw.split(".");
  if (!body || !sig) return { ok: false, error: "Session ungültig" };
  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  if (!secureCompare(sig, expected)) return { ok: false, error: "Session ungültig" };
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
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
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
      return { ok: false, error: data?.error || `Platform-Auth HTTP ${res.status}` };
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
    return { ok: false, error: `Platform-Auth nicht erreichbar: ${e.message || e}` };
  } finally {
    clearTimeout(t);
  }
}

function hasLocalAdminConfigured() {
  const wantEmail = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim();
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "");
  return Boolean(wantEmail && wantPass.length >= 10);
}

function verifyLocalAdmin(email, password) {
  const wantEmail = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim().toLowerCase();
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "");
  if (!wantEmail || wantPass.length < 10) {
    return { ok: false, error: "Kein lokales Admin-Konto konfiguriert (WORKPASS_ADMIN_EMAIL/PASSWORD)." };
  }
  const mail = String(email || "").trim().toLowerCase();
  if (!secureCompare(mail, wantEmail) || !secureCompare(password, wantPass)) {
    return { ok: false, error: "E-Mail oder Passwort falsch (Admin-Konto)." };
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
 * Login with platform password (preferred) or local admin fallback.
 */
export async function loginWithPassword(email, password, req) {
  const ip = clientIp(req);
  const rl = rateLimit({
    ip,
    route: "auth-login",
    limit: Number(process.env.WORKPASS_AUTH_LOGIN_LIMIT || 20),
    windowMs: 15 * 60_000,
  });
  if (!rl.ok) {
    audit({ type: "auth.login.rate", outcome: "deny", ip });
    return { ok: false, status: 429, error: "Zu viele Login-Versuche – bitte warten." };
  }

  const mail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");
  if (!mail || !pass || pass.length < 8) {
    return { ok: false, status: 422, error: "E-Mail und Passwort (min. 8 Zeichen) erforderlich." };
  }

  let result = await verifyWithPlatform(mail, pass);
  const allowLocalFallback = process.env.WORKPASS_AUTH_FALLBACK_LOCAL !== "0";

  if (result === null) {
    // No platform URL configured
    result = verifyLocalAdmin(mail, pass);
  } else if (!result.ok && allowLocalFallback && hasLocalAdminConfigured()) {
    // Platform URL exists but rejected/unreachable → try Railway admin account
    const local = verifyLocalAdmin(mail, pass);
    if (local.ok) {
      result = local;
    } else {
      result = {
        ok: false,
        error: `${result.error || "Platform-Login fehlgeschlagen"} · Local: ${local.error}`,
      };
    }
  }

  if (!result?.ok) {
    noteAuthFailure(ip);
    audit({ type: "auth.login.fail", outcome: "deny", ip, detail: { email: mail } });
    return {
      ok: false,
      status: 401,
      error: result?.error
        || "Anmeldung fehlgeschlagen. Prüfen: WORKPASS_ADMIN_EMAIL/PASSWORD oder Platform-Auth.",
    };
  }

  const role = result.user.role === "admin" ? "admin" : resolveRole(result.user.email);
  const session = createSession({ ...result.user, role });
  noteAuthSuccess(ip);
  audit({
    type: "auth.login.ok",
    outcome: "ok",
    ip,
    detail: { email: session.user.email, role: session.user.role, via: result.via },
  });
  return {
    ok: true,
    status: 200,
    session: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
    via: result.via,
  };
}

export function requireAdminSession(req) {
  const s = sessionFromRequest(req);
  if (!s.ok) return { ok: false, status: 401, error: s.error || "Session erforderlich" };
  if (s.user.role !== "admin") {
    return { ok: false, status: 403, error: "Nur Accounting-Admin" };
  }
  return { ok: true, user: s.user };
}
