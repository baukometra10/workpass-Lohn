/**
 * Serve Accounting UI (index.html, lohn.html, assets) from the same Railway process.
 * Only safe relative paths under the project root – no auth required for GET.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiSecurityHeaders, corsHeaders } from "./security/http.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const BLOCKED_PREFIXES = [
  "server/data",
  "server/.data-key",
  "node_modules",
  ".git",
  ".env",
  "backups",
];

function isBlocked(relPosix) {
  const lower = relPosix.toLowerCase();
  if (lower.includes("..")) return true;
  return BLOCKED_PREFIXES.some((p) => lower === p || lower.startsWith(`${p}/`));
}

function resolveSafe(urlPath) {
  let rel = decodeURIComponent(String(urlPath || "/")).split("?")[0].split("#")[0];
  if (!rel || rel === "/") rel = "/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  rel = rel.replace(/^\/+/, "");
  const posix = rel.replace(/\\/g, "/");
  if (isBlocked(posix)) return null;
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) return null;
  return abs;
}

/**
 * @returns {boolean} true if response was sent
 */
export function tryServeStatic(req, res, urlPath) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  // API paths are never static
  if (String(urlPath || "").startsWith("/v1")) return false;
  if (urlPath === "/health") return false;

  const abs = resolveSafe(urlPath);
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false;

  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
    ...uiSecurityHeaders(),
    ...corsHeaders(req),
  };

  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    res.end();
    return true;
  }

  const data = fs.readFileSync(abs);
  headers["Content-Length"] = String(data.length);
  res.writeHead(200, headers);
  res.end(data);
  return true;
}

export function staticRoot() {
  return ROOT;
}
