/**
 * Accounting UI session auth – platform password or local admin fallback.
 * Sessions are HMAC-signed (no server store required).
 */
import crypto from "node:crypto";
import { secureCompare } from "./security/crypto.mjs";
import { rateLimit, noteAuthFailure, noteAuthSuccess, clientIp, clearRateLimitState } from "./security/rate-limit.mjs";
import { audit } from "./security/audit.mjs";

const SESSION_TTL_MS = Number(process.env.WORKPASS_SESSION_TTL_MS || 8 * 60 * 60 * 1000); // 8h
const ADMIN_PASSWORD_MIN = 8;

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

function hasLocalAdminConfigured() {
  const wantEmail = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim();
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "");
  return Boolean(wantEmail && wantPass.length >= ADMIN_PASSWORD_MIN);
}

function adminSetupGaps() {
  const email = String(process.env.WORKPASS_ADMIN_EMAIL || "").trim();
  const pass = String(process.env.WORKPASS_ADMIN_PASSWORD || "");
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
      ? (platformUrl
        ? "Platform-Auth optional – Geräte-PIN ODER WORKPASS_ADMIN_EMAIL/PASSWORD in Railway"
        : "In Railway WORKPASS_ADMIN_EMAIL + WORKPASS_ADMIN_PASSWORD setzen (min. 8 Zeichen), sonst Geräte-PIN")
      : "Ein Login reicht – Admin-Konto wird zuerst geprüft (auch wenn Platform-Auth URL gesetzt ist)",
    localAdminFirst: true,
    platformAuthTimeoutMs: Number(process.env.WORKPASS_PLATFORM_AUTH_TIMEOUT_MS || 2500),
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
  const wantPass = String(process.env.WORKPASS_ADMIN_PASSWORD || "");
  if (!wantEmail || wantPass.length < ADMIN_PASSWORD_MIN) {
    return {
      ok: false,
      error: `Admin-Konto fehlt in Railway (${adminSetupGaps().join(", ") || "prüfen"}).`,
    };
  }
  const mail = String(email || "").trim().toLowerCase();
  if (!secureCompare(mail, wantEmail) || !secureCompare(password, wantPass)) {
    return {
      ok: false,
      error: `E-Mail/Passwort falsch. Erwartet genau WORKPASS_ADMIN_EMAIL (${wantEmail}).`,
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
 * Login: local admin first (fast), then optional platform auth.
 * Platform URL may stay configured without blocking accounting login.
 */
export async function loginWithPassword(email, password, req) {
  const ip = clientIp(req);
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
  if (!mail || !pass || pass.length < 8) {
    return { ok: false, status: 422, error: "E-Mail und Passwort (min. 8 Zeichen) erforderlich." };
  }

  // 1) Fast path: Railway admin account (even if platform URL is set)
  let local = null;
  if (hasLocalAdminConfigured()) {
    local = verifyLocalAdmin(mail, pass);
    if (local.ok) {
      const role = "admin";
      const session = createSession({ ...local.user, role });
      noteAuthSuccess(ip);
      audit({
        type: "auth.login.ok",
        outcome: "ok",
        ip,
        detail: { email: session.user.email, role, via: "local-admin-first" },
      });
      return {
        ok: true,
        status: 200,
        session: session.token,
        expiresAt: session.expiresAt,
        user: session.user,
        via: "local-admin",
      };
    }
  }

  // 2) Platform auth (short timeout) – optional enhancement
  let result = await verifyWithPlatform(mail, pass);
  if (result === null) {
    result = local || verifyLocalAdmin(mail, pass);
  } else if (!result.ok) {
    result = {
      ok: false,
      error: local?.error
        ? `${result.error} | ${local.error}`
        : result.error,
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
