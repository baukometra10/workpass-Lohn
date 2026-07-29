/**
 * HTTP security helpers for the accounting bridge.
 */
import { secureCompare, securityPosture } from "./crypto.mjs";
import { audit } from "./audit.mjs";
import { rateLimit, noteAuthFailure, noteAuthSuccess, isAuthLocked, clientIp } from "./rate-limit.mjs";
import { PLATFORM_ORIGINS, isAllowedOrigin, PLATFORM_DOMAIN } from "../platform-config.mjs";

const MAX_BODY = Number(process.env.WORKPASS_MAX_BODY_BYTES || 1_500_000); // ~1.5 MB

/** Strict CSP for JSON/API responses (no HTML assets). */
export function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  };
}

/**
 * CSP for Accounting UI (HTML/CSS/JS).
 * Must NOT use default-src 'none' – that blanks the page in the browser
 * even when the server returns 200.
 */
export function uiSecurityHeaders(extra = {}) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://cdnjs.cloudflare.com",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": csp,
    ...extra,
  };
}

/**
 * Reflect Origin only when it matches the WorkPass platform allow-list.
 */
export function corsHeaders(req) {
  const origin = req?.headers?.origin || "";
  let allow = PLATFORM_ORIGINS[0] || `https://${PLATFORM_DOMAIN}`;
  if (origin && isAllowedOrigin(origin)) allow = origin;
  else if (PLATFORM_ORIGINS.includes("*")) allow = origin || "*";

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "Content-Type, X-WorkPass-Key, X-WorkPass-Company-Id, X-WorkPass-Tenant-Id, X-WorkPass-Request-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function getApiKey() {
  return process.env.WORKPASS_API_KEY || "workpass-dev-key";
}

export function authorizeRequest(req) {
  const ip = clientIp(req);
  if (isAuthLocked(ip)) {
    audit({ type: "auth.lockout", outcome: "deny", ip, path: req.url });
    return { ok: false, status: 429, error: "Zu viele Fehlversuche – zeitweise gesperrt" };
  }

  const rl = rateLimit({
    ip,
    route: "api",
    limit: Number(process.env.WORKPASS_RATE_LIMIT || 180),
    windowMs: 60_000,
  });
  if (!rl.ok) {
    audit({ type: "rate.limit", outcome: "deny", ip, path: req.url, detail: { retryAfterMs: rl.retryAfterMs } });
    return { ok: false, status: 429, error: "Rate limit", retryAfterMs: rl.retryAfterMs };
  }

  const provided = req.headers["x-workpass-key"];
  const expected = getApiKey();
  if (!secureCompare(provided, expected)) {
    const fail = noteAuthFailure(ip);
    audit({
      type: "auth.fail",
      outcome: "deny",
      ip,
      path: req.url,
      detail: { failures: fail.failures },
    });
    return { ok: false, status: 401, error: "Unauthorized – Header X-WorkPass-Key erforderlich (API-Key prüfen)" };
  }

  noteAuthSuccess(ip);
  return { ok: true, ip };
}

export function readBodyLimited(req, maxBytes = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Request body zu groß"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error(`JSON ungültig: ${e.message}`));
      }
    });
    req.on("error", reject);
  });
}

export function publicSecurityInfo() {
  const p = securityPosture();
  return {
    encryptionAtRest: "aes-256-gcm",
    keySource: p.keySource,
    strict: p.strict,
    warnings: p.warnings.length,
    rateLimit: true,
    auditLog: true,
  };
}
