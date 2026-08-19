/**
 * Open local Lohn in Firmen-Portal via the running bridge (HTTP).
 * Usage: node scripts/open-firm-portal-local.mjs
 */
import { spawn } from "node:child_process";

const COMPANY_ID = process.env.WORKPASS_PREVIEW_COMPANY_ID || "cmp-cd3c66a0b71a";
const COMPANY_NAME = process.env.WORKPASS_PREVIEW_COMPANY_NAME || "Lufthansa";
const EMAIL = process.env.WORKPASS_PREVIEW_EMAIL || "luf@firma.de";
const PIN = process.env.WORKPASS_PREVIEW_PIN || "4821";
const BASE = process.env.WORKPASS_LOCAL_BASE || "http://127.0.0.1:8787";
const API_KEY = process.env.WORKPASS_API_KEY || "workpass-dev-key";

async function api(path, { method = "GET", body, key = false } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (key) headers["X-WorkPass-Key"] = API_KEY;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

const health = await api("/health");
if (!health.ok) {
  console.error("Local server not reachable on", BASE);
  process.exit(1);
}
console.log("bridge", health.data.version);

const act = await api("/v1/company/activate", {
  method: "POST",
  key: true,
  body: {
    kind: "platform.company.activate.v1",
    company: {
      id: COMPANY_ID,
      name: COMPANY_NAME,
      street: "Schwerter Str. 25",
      zip: "10619",
      city: "Berlin",
      taxNumber: "143/123/45678",
      vatId: "DE123456789",
      datevClientNo: "10001",
      datevConsultantNo: "12345",
    },
    login: { email: EMAIL, password: PIN },
    connection: { accountingEnabled: true },
  },
});

if (!act.data?.ok) {
  console.warn("activate", act.status, act.data?.error || act.data);
} else {
  console.log("company activated", COMPANY_ID);
}

const logged = await api("/v1/auth/login", {
  method: "POST",
  body: { email: EMAIL, password: PIN, audience: "lohn" },
});

if (!logged.data?.ok || !logged.data?.session) {
  console.error("login failed", logged.status, logged.data);
  process.exit(1);
}
console.log("session via", logged.data.via);

const sso = {
  token: logged.data.session,
  expiresAt: logged.data.expiresAt || null,
  user: {
    ...(logged.data.user || {}),
    companyId: COMPANY_ID,
    role: "accountant",
    name: COMPANY_NAME,
  },
  companyId: COMPANY_ID,
  via: logged.data.via || "company-login",
};

const url = `${BASE}/lohn.html?v=firmportal#suppix-sso=${encodeURIComponent(JSON.stringify(sso))}`;
console.log("opening Firmen-Portal", COMPANY_NAME);

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
} else {
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

console.log(`Manual login: ${EMAIL} / ${PIN}`);
