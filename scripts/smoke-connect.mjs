#!/usr/bin/env node
/**
 * Smoke-test Accounting Bridge after Railway deploy
 *
 * Usage:
 *   node scripts/smoke-connect.mjs https://xxx.up.railway.app
 *   WORKPASS_API_KEY=... node scripts/smoke-connect.mjs https://xxx.up.railway.app
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = String(process.argv[2] || process.env.WORKPASS_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const apiKey = process.env.WORKPASS_API_KEY || "workpass-dev-key";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function get(urlPath, { auth = false } = {}) {
  const headers = {};
  if (auth) headers["X-WorkPass-Key"] = apiKey;
  const res = await fetch(`${base}${urlPath}`, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html or plain */ }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 200), type: res.headers.get("content-type") };
}

function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); process.exitCode = 1; }

console.log(`\nSmoke connect → ${base}\n`);

const health = await get("/health");
if (health.status === 200 && health.json?.ok) {
  pass(`GET /health (${health.json.version || "?"})`);
  if (health.json.ui?.served) pass("UI serving enabled");
  else fail("UI serving disabled (set WORKPASS_SERVE_UI=1)");
  if (health.json.https?.forceHttps) pass("FORCE_HTTPS on");
  if (health.json.storage?.encryptionAtRest) pass("encryption at rest");
  console.log(`    platform webhook suggested: ${health.json.platform?.webhookUrlSuggested || "—"}`);
} else {
  fail(`GET /health → HTTP ${health.status}`);
}

const ui = await get("/index.html");
if (ui.status === 200 && String(ui.type || "").includes("text/html")) pass("GET /index.html");
else fail(`GET /index.html → ${ui.status} ${ui.type}`);

const lohn = await get("/lohn.html");
if (lohn.status === 200 && String(lohn.type || "").includes("text/html")) pass("GET /lohn.html");
else fail(`GET /lohn.html → ${lohn.status}`);

const companies = await get("/v1/companies", { auth: true });
if (companies.status === 200 && companies.json?.ok) pass("GET /v1/companies (API key OK)");
else if (companies.status === 401) fail("API key rejected – set WORKPASS_API_KEY to production secret");
else fail(`GET /v1/companies → ${companies.status} ${companies.json?.error || ""}`);

const companyEx = path.join(root, "examples", "platform-company.v1.json");
if (existsSync(companyEx) && companies.status === 200) {
  const body = JSON.parse(readFileSync(companyEx, "utf8"));
  const res = await fetch(`${base}/v1/company/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-WorkPass-Key": apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.ok) pass(`POST /v1/company/upsert (${body.id || body.name})`);
  else fail(`company upsert → ${res.status} ${data.error || ""}`);
}

console.log(process.exitCode ? "\nFAILED – fix before go-live\n" : "\nOK – bridge ready for platform link\n");
process.exit(process.exitCode || 0);
