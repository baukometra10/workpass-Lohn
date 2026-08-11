/**
 * Known WorkPass Platform identity – used for CORS defaults & docs.
 * Override via env without code changes.
 * Extra tenant origins can be merged via POST /v1/platform/cors-origins (persisted).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { resolveDataDir } from "./paths.mjs";

export const PLATFORM_DOMAIN = process.env.WORKPASS_PLATFORM_DOMAIN || "suppix-ai-workpass.com";

const ENV_ORIGINS = (
  process.env.WORKPASS_CORS_ORIGIN
  || [
    `https://${PLATFORM_DOMAIN}`,
    `https://www.${PLATFORM_DOMAIN}`,
    `https://app.${PLATFORM_DOMAIN}`,
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsExtraPath() {
  return path.join(resolveDataDir(), "cors-extra-origins.json");
}

function loadPersistedOrigins() {
  try {
    const file = corsExtraPath();
    if (!existsSync(file)) return [];
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const list = Array.isArray(raw?.origins) ? raw.origins : Array.isArray(raw) ? raw : [];
    return list.map((s) => String(s || "").trim().replace(/\/+$/, "")).filter(Boolean);
  } catch {
    return [];
  }
}

let _extraCache = null;
let _extraCacheAt = 0;

function extraOrigins() {
  const now = Date.now();
  if (!_extraCache || now - _extraCacheAt > 5_000) {
    _extraCache = loadPersistedOrigins();
    _extraCacheAt = now;
  }
  return _extraCache;
}

/** Env + persisted extras (unique, order preserved). */
export function getCorsOrigins() {
  const seen = new Set();
  const out = [];
  for (const o of [...ENV_ORIGINS, ...extraOrigins()]) {
    const n = String(o || "").trim().replace(/\/+$/, "");
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** @deprecated use getCorsOrigins() — kept for existing imports */
export const PLATFORM_ORIGINS = ENV_ORIGINS;

export const PLATFORM_WEBHOOK_DEFAULT_PATH = "/api/workpass/webhooks/accounting";

export function platformWebhookUrl() {
  return (
    process.env.WORKPASS_PLATFORM_WEBHOOK_URL
    || `https://${PLATFORM_DOMAIN}${PLATFORM_WEBHOOK_DEFAULT_PATH}`
  );
}

function normalizeOrigin(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.origin;
  } catch {
    return "";
  }
}

/**
 * Merge tenant / white-label origins into persisted allow-list.
 * Returns the full effective list.
 */
export function mergeCorsOrigins(origins = []) {
  const incoming = (Array.isArray(origins) ? origins : [])
    .map(normalizeOrigin)
    .filter(Boolean);
  const merged = [];
  const seen = new Set();
  for (const o of [...loadPersistedOrigins(), ...incoming]) {
    if (seen.has(o)) continue;
    seen.add(o);
    merged.push(o);
  }
  const dir = resolveDataDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    corsExtraPath(),
    JSON.stringify({ origins: merged, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
  _extraCache = merged;
  _extraCacheAt = Date.now();
  return getCorsOrigins();
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  const list = getCorsOrigins();
  if (list.includes("*")) return true;
  if (list.includes(origin)) return true;
  try {
    const u = new URL(origin);
    const host = String(u.hostname || "").toLowerCase();
    const base = String(PLATFORM_DOMAIN || "").toLowerCase();
    if (base && (host === base || host.endsWith(`.${base}`))) return true;
  } catch {
    /* ignore */
  }
  return false;
}
