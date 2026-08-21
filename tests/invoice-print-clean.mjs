/**
 * Clean invoice print: one A4 sheet, no payroll hosts, standalone CSS (no blank pages from app CSS).
 * Run: node tests/invoice-print-clean.mjs
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(900);

const result = await page.evaluate(() => {
  document.body.classList.remove("auth-locked", "payroll-mode", "annual-mode");
  const preview = document.getElementById("invoicePreview");
  let stage = document.getElementById("invoiceDocStage");
  if (!stage && preview) {
    stage = document.createElement("div");
    stage.id = "invoiceDocStage";
    stage.className = "invoice-doc-stage mode-invoice-only";
    stage.dataset.ready = "1";
    preview.appendChild(stage);
    [
      ".invoice-top.mode-invoice-only",
      "#invoiceMetaBlock",
      ".addresses.mode-invoice-only",
      "table.preview-items.mode-invoice-only",
      ".totals.mode-invoice-only",
      "#invoiceBankBlock",
      ".note-box.mode-invoice-only",
      "#signaturePreviewBox",
    ].forEach((sel) => {
      const el = preview.querySelector(sel);
      if (el && el.parentElement !== stage) stage.appendChild(el);
    });
  }
  if (!stage || !window.WorkPassHub?.printInvoice) {
    return { ok: false, reason: "missing stage or printInvoice" };
  }

  document.getElementById("workpassPrintFrame")?.remove();
  window.WorkPassHub.printInvoice(stage, "Rechnung TEST");

  const frame = document.getElementById("workpassPrintFrame");
  const doc = frame?.contentDocument;
  const html = doc?.documentElement?.outerHTML || "";
  const bodyHtml = doc?.body?.innerHTML || "";
  const cssText = doc?.getElementById("workpassInvoicePrintCss")?.textContent || "";

  const hasPayroll = /payrollSheet|datevSheetHost|annualTaxSheet|verdienstSheet/i.test(bodyHtml);
  const hasStandaloneCss = cssText.includes("297mm") && cssText.includes("overflow: hidden");
  const hasExternalAppCss = /styles\.css|app-ui\.css|payroll-layouts/i.test(html);
  const sheet = doc?.querySelector(".invoice-print-sheet");
  const sheetCount = doc?.querySelectorAll(".invoice-print-sheet, .invoice-doc-stage")?.length || 0;

  return {
    ok: Boolean(sheet) && !hasPayroll && hasStandaloneCss && !hasExternalAppCss && sheetCount === 1,
    hasPayroll,
    hasStandaloneCss,
    hasExternalAppCss,
    sheetCount,
    bodyLen: bodyHtml.length,
  };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error("FAIL: clean invoice print");
  process.exit(1);
}
console.log("PASS: clean single-page invoice print");
