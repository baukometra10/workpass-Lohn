import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(900);

const result = await page.evaluate(() => {
  const invoicePreviewEl = document.getElementById("invoicePreview");
  let stage = document.getElementById("invoiceDocStage");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "invoiceDocStage";
    invoicePreviewEl.appendChild(stage);
  }
  stage.className = "invoice-doc-stage mode-invoice-only";
  stage.dataset.ready = "1";
  [
    ".invoice-top.mode-invoice-only",
    "#invoiceMetaBlock",
    ".addresses.mode-invoice-only",
    "table.preview-items.mode-invoice-only",
    ".totals.mode-invoice-only",
    "#invoiceBankBlock",
    ".note-box.mode-invoice-only",
    "#signaturePreviewBox",
    "#signatureSealBadge",
  ].forEach((sel) => {
    const el = invoicePreviewEl.querySelector(sel);
    if (el && el.parentElement !== stage) stage.appendChild(el);
  });

  const box = document.getElementById("signaturePreviewBox");
  box.hidden = false;
  box.style.position = "absolute";
  box.style.left = "60%";
  box.style.top = "85%";
  box.style.width = "30%";
  box.style.right = "auto";
  box.style.bottom = "auto";

  const cs = getComputedStyle(stage);
  return {
    stageH: stage.offsetHeight,
    minHeight: cs.minHeight,
    boxPos: getComputedStyle(box).position,
    boxOffsetTop: box.offsetTop,
    ratio: stage.offsetHeight ? box.offsetTop / stage.offsetHeight : 0,
  };
});

await browser.close();
console.log(result);

if (result.stageH < 1000) {
  console.error("FAIL: A4 stage too short", result.stageH);
  process.exit(1);
}
if (result.boxPos !== "absolute") {
  console.error("FAIL: signature not absolute");
  process.exit(1);
}
if (result.ratio < 0.7) {
  console.error("FAIL: signature not near bottom of page");
  process.exit(1);
}
console.log("PASS: signature free on full A4 stage");
