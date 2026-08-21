import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const out = path.resolve("scripts");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

async function shot(url, name) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const metrics = await page.evaluate(() => {
    const layout = document.getElementById("lohnLayout");
    const form = document.getElementById("lohnForm");
    const preview = document.getElementById("lohnPreview");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        w: Math.round(b.width),
        h: Math.round(b.height),
        x: Math.round(b.x),
        y: Math.round(b.y),
        display: getComputedStyle(el).display,
        cols: getComputedStyle(el).gridTemplateColumns,
      };
    };
    return {
      title: document.title,
      layout: r(layout),
      form: r(form),
      preview: r(preview),
      previewParent: preview?.parentElement?.id || preview?.parentElement?.className || null,
      yearEnd: !!document.getElementById("portalYearEndCard"),
      versionText: document.body.innerText.match(/v2\.\d+\.\d+/)?.[0] || null,
    };
  });
  const file = path.join(out, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(name, JSON.stringify(metrics, null, 2));
  await page.close();
  return metrics;
}

const local = await shot("http://127.0.0.1:8787/lohn.html?v=designcheck", "design-local-lohn.png");
const online = await shot("https://workpass-lohn.up.railway.app/lohn.html?v=designcheck", "design-online-lohn.png");

const localHub = await shot("http://127.0.0.1:8787/index.html?v=designcheck", "design-local-hub.png");
const onlineHub = await shot("https://workpass-lohn.up.railway.app/index.html?v=designcheck", "design-online-hub.png");

console.log("\nLOHN COMPARE");
console.log("form w", local.form?.w, "vs", online.form?.w);
console.log("preview w", local.preview?.w, "vs", online.preview?.w);
console.log("preview y", local.preview?.y, "vs", online.preview?.y);
console.log("cols local", local.layout?.cols);
console.log("cols online", online.layout?.cols);

await browser.close();
