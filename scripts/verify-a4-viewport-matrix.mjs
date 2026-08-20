/**
 * Multi-viewport matrix: A4 Blatt must stay identical; UI chrome may flex.
 * Run: node scripts/verify-a4-viewport-matrix.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
const OUT = path.resolve("scripts/viewport-matrix");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "small-laptop", width: 1280, height: 800 },
  { name: "desk-1440", width: 1440, height: 900 },
  { name: "desk-1680", width: 1680, height: 1050 },
  { name: "fullhd", width: 1920, height: 1080 },
  { name: "ultrawide", width: 2560, height: 1440 },
  { name: "narrow", width: 1024, height: 768 },
];

const A4_W = 794;
const A4_H = 1123;
const FIXED_WAGE_ROWS = 16;

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lohn.html?v=matrix-${vp.name}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("#datevSheetHost", { timeout: 15000 });
  await page.waitForTimeout(800);

  // Unlock shell if auth gate is present (local demo)
  await page.evaluate(() => {
    document.body?.classList?.add("lohn-desktop");
    document.body?.classList?.remove("auth-locked");
    const app = document.getElementById("lohnApp");
    if (app) {
      app.removeAttribute("aria-hidden");
      app.style.visibility = "visible";
      app.style.pointerEvents = "auto";
    }
    window.DatevSheet?.init?.("datevSheetHost");
    window.DatevSheet?.setBackground?.("blank");
    window.DatevSheet?.fillWageToPage?.(window.DatevSheet.getSheetElement?.());
    if (typeof window.__workpassFitSheet === "function") window.__workpassFitSheet();
  });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(({ A4_W, A4_H, FIXED_WAGE_ROWS }) => {
    const host = document.getElementById("datevSheetHost");
    const sheet = host?.querySelector(".datev-sheet-a4") || document.getElementById("datevSheetA4");
    const form = document.getElementById("lohnForm");
    const preview = document.getElementById("lohnPreview");
    const layout = document.getElementById("lohnLayout");
    const wageRows = sheet?.querySelectorAll("#datevWageRows tr")?.length || 0;
    const cs = sheet ? getComputedStyle(sheet) : null;
    const hostCs = host ? getComputedStyle(host) : null;
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      scale: host?.dataset?.scale || null,
      a4Lock: host?.dataset?.a4Lock || null,
      sheetW: sheet ? Math.round(sheet.offsetWidth) : null,
      sheetH: sheet ? Math.round(sheet.offsetHeight) : null,
      transform: cs?.transform || null,
      zoom: hostCs?.zoom || host?.style?.zoom || "",
      wageRows,
      form: box(form),
      preview: box(preview),
      layoutCols: layout ? getComputedStyle(layout).gridTemplateColumns : null,
      expected: { A4_W, A4_H, FIXED_WAGE_ROWS },
    };
  }, { A4_W, A4_H, FIXED_WAGE_ROWS });

  const shot = path.join(OUT, `${vp.name}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  const row = { viewport: vp, ...metrics, shot };
  results.push(row);

  console.log(
    `\n[${vp.name} ${vp.width}×${vp.height}]`,
    `sheet=${metrics.sheetW}×${metrics.sheetH}`,
    `scale=${metrics.scale}`,
    `wageRows=${metrics.wageRows}`,
    `formW=${metrics.form?.w}`,
    `previewW=${metrics.preview?.w}`
  );

  if (Number(metrics.scale) !== 1) fail(`${vp.name}: scale must be 1, got ${metrics.scale}`);
  if (metrics.sheetW !== A4_W) fail(`${vp.name}: sheet width ${metrics.sheetW} ≠ ${A4_W}`);
  if (metrics.sheetH !== A4_H) fail(`${vp.name}: sheet height ${metrics.sheetH} ≠ ${A4_H}`);
  if (metrics.transform && metrics.transform !== "none") {
    fail(`${vp.name}: transform must be none, got ${metrics.transform}`);
  }
  const zoomNum = parseFloat(String(metrics.zoom || "1").replace("%", "")) || 1;
  if (Math.abs(zoomNum - 1) > 0.001 && String(metrics.zoom) !== "" && String(metrics.zoom) !== "normal") {
    // empty / normal = 1
    if (String(metrics.zoom) !== "1" && metrics.zoom !== 1) {
      fail(`${vp.name}: zoom must be 1, got ${metrics.zoom}`);
    }
  }
  if (metrics.wageRows > 0 && metrics.wageRows !== FIXED_WAGE_ROWS) {
    fail(`${vp.name}: wage rows ${metrics.wageRows} ≠ ${FIXED_WAGE_ROWS}`);
  }

  await ctx.close();
}

// Cross-viewport: Blatt geometry must be identical everywhere
const sheets = results.map((r) => `${r.sheetW}x${r.sheetH}@${r.scale}`);
const unique = [...new Set(sheets)];
console.log("\n--- Blatt identity across viewports ---");
console.log(unique.join(" | "));
if (unique.length !== 1 || unique[0] !== `${A4_W}x${A4_H}@1`) {
  fail(`Blatt not identical across viewports: ${unique.join(", ")}`);
}

// Flexibility: form should grow from narrow → ultrawide (when both measured)
const narrow = results.find((r) => r.viewport.name === "narrow");
const ultra = results.find((r) => r.viewport.name === "ultrawide");
if (narrow?.form?.w && ultra?.form?.w) {
  console.log(`\n--- Workspace flex ---`);
  console.log(`form width narrow ${narrow.form.w} → ultrawide ${ultra.form.w}`);
  if (ultra.form.w <= narrow.form.w) {
    fail("Form should be wider on ultrawide than on narrow (flexible accounting UI)");
  } else {
    console.log("OK: form grows on large desk");
  }
  if (ultra.preview?.w && narrow.preview?.w && ultra.preview.w < narrow.preview.w - 20) {
    fail("Preview column unexpectedly shrunk on ultrawide");
  }
}

const summaryPath = path.join(OUT, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
console.log(`\nWrote ${summaryPath}`);
console.log(process.exitCode ? "\nMATRIX FAILED" : "\nMATRIX PASSED");

await browser.close();
