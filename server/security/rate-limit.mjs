/**
 * In-memory rate limiter + brute-force lockout for API keys / IPs.
 */
const buckets = new Map();

function keyFor(ip, route) {
  return `${ip || "unknown"}::${route || "*"}`;
}

/**
 * @returns {{ ok: boolean, retryAfterMs?: number, remaining?: number }}
 */
export function rateLimit({ ip, route = "api", limit = 120, windowMs = 60_000 }) {
  const k = keyFor(ip, route);
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.windowStart >= windowMs) {
    b = { windowStart: now, count: 0, lockedUntil: 0 };
    buckets.set(k, b);
  }
  if (b.lockedUntil && now < b.lockedUntil) {
    return { ok: false, retryAfterMs: b.lockedUntil - now, remaining: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    // progressive lockout
    b.lockedUntil = now + Math.min(15 * 60_000, 5_000 * Math.ceil(b.count / limit));
    return { ok: false, retryAfterMs: b.lockedUntil - now, remaining: 0 };
  }
  return { ok: true, remaining: Math.max(0, limit - b.count) };
}

/** Stricter limiter for auth failures */
export function noteAuthFailure(ip) {
  const k = keyFor(ip, "auth-fail");
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.windowStart >= 15 * 60_000) {
    b = { windowStart: now, count: 0, lockedUntil: 0 };
  }
  b.count += 1;
  if (b.count >= 8) {
    b.lockedUntil = now + 15 * 60_000;
  }
  buckets.set(k, b);
  return { failures: b.count, lockedUntil: b.lockedUntil || 0 };
}

export function isAuthLocked(ip) {
  const b = buckets.get(keyFor(ip, "auth-fail"));
  if (!b?.lockedUntil) return false;
  return Date.now() < b.lockedUntil;
}

export function clearRateLimitState() {
  buckets.clear();
}

export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
