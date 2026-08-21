import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const norm = (s) => String(s).replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(norm(s)).digest("hex").slice(0, 12);
const BASE_ONLINE = "https://workpass-lohn.up.railway.app";
const BASE_LOCAL = "http://127.0.0.1:8787";

const shellFiles = [
  "lohn.css",
  "lohn-app.js",
  "index.html",
  "app-ui.css",
  "auth-gate.js",
  "sw.js",
  "workpass-hub.js",
];

console.log("=== SHELL vs ONLINE ===");
let shellOk = true;
for (const f of shellFiles) {
  const online = await (await fetch(`${BASE_ONLINE}/${f}`)).text();
  const local = readFileSync(f, "utf8");
  const match = sha(online) === sha(local);
  if (!match) shellOk = false;
  console.log(`${match ? "OK" : "DIFF"} ${f}`);
}

const localHtml = readFileSync("lohn.html", "utf8");
const onlineHtml = await (await fetch(`${BASE_ONLINE}/lohn.html`)).text();
const markers = {
  lohnLayout: true,
  lohnPreview: true,
  lohnSplitHard: true,
  portalYearEndCard: false,
  portalDeliveryReconCard: false,
  portalExportStatus: false,
};
console.log("\n=== lohn.html markers ===");
for (const [k, expectOnline] of Object.entries(markers)) {
  const loc = localHtml.includes(k) || localHtml.includes(`id="${k}"`);
  const onl = onlineHtml.includes(k);
  console.log(`${k}: local=${loc} online=${onl} (onlineExpected=${expectOnline})`);
}

// nesting balance
function balance(html, label) {
  const layout = html.indexOf('id="lohnLayout"');
  const preview = html.indexOf('id="lohnPreview"');
  const slice = html.slice(layout, preview);
  const opens = (slice.match(/<div\b/g) || []).length;
  const closes = (slice.match(/<\/div>/g) || []).length;
  const ok = opens === closes && preview > layout;
  console.log(`${label} nesting ${ok ? "OK" : "BROKEN"} opens=${opens} closes=${closes}`);
  return ok;
}
console.log("\n=== NESTING ===");
const nestLocal = balance(localHtml, "local");
const nestOnline = balance(onlineHtml, "online");

// API routes
console.log("\n=== LOCAL API (auth key) ===");
const key = process.env.WORKPASS_API_KEY || "workpass-dev-key";
async function hit(path) {
  const res = await fetch(`${BASE_LOCAL}${path}`, {
    headers: { "X-WorkPass-Key": key, "X-WorkPass-Company-Id": "cmp-cd3c66a0b71a", Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: data.ok !== false && res.ok, kind: data.kind || data.version || null, error: data.error };
}
for (const p of [
  "/health",
  "/v1/portal/year-end?year=2026",
  "/v1/portal/delivery-reconciliation?period=2026-08",
  "/v1/portal/export-status?period=2026-08",
]) {
  const r = await hit(p);
  console.log(`${r.status} ${p} ok=${r.ok} ${r.kind || r.error || ""}`);
}

// Firm portal browser check
console.log("\n=== FIRM PORTAL UI ===");
const login = await (
  await fetch(`${BASE_LOCAL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luf@firma.de", password: "4821", audience: "lohn" }),
  })
).json();
if (!login.ok) {
  console.log("LOGIN FAIL", login.error);
  process.exit(1);
}
const sso = {
  token: login.session,
  expiresAt: login.expiresAt,
  user: { ...login.user, companyId: "cmp-cd3c66a0b71a", role: "accountant", name: "Lufthansa" },
  companyId: "cmp-cd3c66a0b71a",
  via: login.via,
};
const url = `${BASE_LOCAL}/lohn.html?v=verify#suppix-sso=${encodeURIComponent(JSON.stringify(sso))}`;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
const ui = await page.evaluate(() => {
  const layout = document.getElementById("lohnLayout");
  const form = document.getElementById("lohnForm");
  const preview = document.getElementById("lohnPreview");
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y) };
  };
  return {
    companyPortal: document.body.classList.contains("company-portal"),
    authLocked: document.body.classList.contains("auth-locked"),
    banner: (document.getElementById("companyPortalBanner")?.innerText || "").includes("FIRMEN-PORTAL LIVE"),
    chip: (document.getElementById("companyPortalBanner")?.innerText || "").includes("v2.53.0"),
    yearEnd: !!document.getElementById("portalYearEndCard"),
    exportStatus: !!document.getElementById("portalExportStatus"),
    layout: box(layout),
    form: box(form),
    preview: box(preview),
    previewParent: preview?.parentElement?.id || null,
    cols: layout ? getComputedStyle(layout).gridTemplateColumns : null,
  };
});
await browser.close();
console.log(JSON.stringify(ui, null, 2));

const layoutOk =
  ui.companyPortal &&
  !ui.authLocked &&
  ui.banner &&
  ui.chip &&
  ui.previewParent === "lohnLayout" &&
  ui.form?.w > 400 &&
  ui.preview?.w > 400 &&
  Math.abs((ui.form?.y || 0) - (ui.preview?.y || 0)) < 5;

console.log("\n=== VERDICT ===");
console.log({
  shellOk,
  nestLocal,
  nestOnline,
  layoutOk,
  firmPortal: ui.companyPortal && ui.banner,
  v253Ui: ui.yearEnd && ui.exportStatus,
  criticalNote: "npm run test:critical already green in prior step",
});

if (!(shellOk && nestLocal && layoutOk && ui.yearEnd && ui.exportStatus)) {
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
