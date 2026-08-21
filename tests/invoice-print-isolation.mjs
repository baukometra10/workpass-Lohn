/**
 * Invoice print must not include payroll/LStB/VB hosts from the shared preview panel.
 * Run: node tests/invoice-print-isolation.mjs
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8787";

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(800);

const result = await page.evaluate(() => {
  const preview = document.getElementById("invoicePreview");
  if (!preview || !window.WorkPassHub?.printElement) {
    return { ok: false, reason: "missing preview or WorkPassHub.printElement" };
  }

  // Spy on printHtml path via iframe after printElement
  const before = document.getElementById("workpassPrintFrame");
  if (before) before.remove();

  window.WorkPassHub.printElement(preview, "Rechnung TEST", { invoiceOnly: true });

  const frame = document.getElementById("workpassPrintFrame");
  const doc = frame?.contentDocument;
  const html = doc?.body?.innerHTML || "";
  const text = doc?.body?.innerText || "";

  const hasPayroll = /id="payrollSheet"|id="datevSheetHost"|id="annualTaxSheet"|id="verdienstSheet"|class="[^"]*mode-payroll-only/i.test(html);
  const hasInvoiceBits = /previewDocumentTitle|previewItemsBody|invoice-top|preview-items/i.test(html)
    || /Rechnung/i.test(text);

  return {
    ok: !hasPayroll && Boolean(html),
    hasPayroll,
    hasInvoiceBits,
    htmlLen: html.length,
    snippet: html.slice(0, 240),
  };
});

await browser.close();

console.log(JSON.stringify(result, null, 2));
if (!result.ok || result.hasPayroll) {
  console.error("FAIL: invoice print still contains payroll hosts");
  process.exit(1);
}
if (!result.hasInvoiceBits && result.htmlLen < 50) {
  console.error("FAIL: invoice print body empty");
  process.exit(1);
}
console.log("PASS: invoice print isolation");
