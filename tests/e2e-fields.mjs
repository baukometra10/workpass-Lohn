/**
 * Smoke: alle Lohn-Felder beschreibbar + Live-Sync aufs A4-Blatt
 * Voraussetzung: Server auf http://127.0.0.1:8765
 */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8765";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let failed = 0;
  const ok = (c, m) => {
    if (c) console.log(`  ✓ ${m}`);
    else { console.error(`  ✗ ${m}`); failed += 1; }
  };

  console.log("\n=== E2E Felder: lohn.html ===");
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("workpassLohnE2E", "1");
  });
  await page.goto(`${BASE}/lohn.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("#datevSheetA4", { timeout: 10000 });

  const editable = await page.evaluate(() => {
    const ids = [
      "seller", "note", "taxNumber", "datevClientNo", "datevConsultantNo",
      "employeeName", "employeeAddress", "employeeId", "employeeTaxId",
      "employeeInsuranceNo", "employeeBirthDate", "employeeEntryDate",
      "payrollMonth", "taxClass", "churchTaxRate", "healthFund", "healthPercent",
      "workDays", "workHours", "bankName", "bankIban",
    ];
    const report = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) {
        report.push({ id, ok: false, reason: "missing" });
        continue;
      }
      const blocked = el.disabled || el.readOnly || getComputedStyle(el).pointerEvents === "none";
      report.push({ id, ok: !blocked, reason: blocked ? "blocked" : "ok" });
    }
    return report;
  });
  editable.forEach((r) => ok(r.ok, `Feld ${r.id} beschreibbar (${r.reason})`));

  await page.fill("#seller", "Test GmbH\nWeg 1\n10115 Berlin");
  await page.fill("#taxNumber", "29/123/45678");
  await page.fill("#datevClientNo", "10001");
  await page.fill("#datevConsultantNo", "12345");
  await page.fill("#employeeName", "Feld Test");
  await page.fill("#employeeAddress", "Musterweg 9\n80331 München");
  await page.fill("#employeeId", "99001");
  await page.fill("#employeeTaxId", "12345678901");
  await page.fill("#employeeInsuranceNo", "65170839J008");
  await page.fill("#employeeBirthDate", "1990-05-15");
  await page.fill("#employeeEntryDate", "2020-01-01");
  await page.selectOption("#taxClass", "III");
  await page.fill("#churchTaxRate", "9");
  await page.fill("#healthFund", "TK");
  await page.fill("#healthPercent", "14.9");
  await page.fill("#workDays", "21");
  await page.fill("#workHours", "168");
  await page.fill("#bankName", "Testbank");
  await page.fill("#bankIban", "DE89370400440532013000");
  await page.fill("#note", "Feld-Smoke");
  await page.fill("#payrollMonth", "2026-07");

  await page.evaluate(() => {
    const row = document.querySelector("#wageBody tr");
    row.querySelector(".w-code").value = "2000";
    row.querySelector(".w-label").value = "Gehalt";
    row.querySelector(".w-qty").value = "1";
    const amt = row.querySelector(".w-amount");
    amt.value = "3200";
    amt.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(500);

  const sheet = await page.evaluate(() => {
    const cell = (lab) => {
      const cells = [...document.querySelectorAll(".ds-cell")];
      const c = cells.find((x) => x.querySelector(".ds-lab")?.textContent?.includes(lab));
      return c?.querySelector(".ds-val")?.textContent?.trim() || "";
    };
    return {
      name: document.querySelector("#dsv_empName")?.textContent || "",
      pers: cell("Personal"),
      kk: cell("Krankenkasse"),
      kkPct: cell("KK %"),
      days: cell("Arbeitstage"),
      hours: cell("Stunden"),
      bank: document.querySelector("#dsv_bank")?.textContent || "",
      pay: document.querySelector("#dsv_payout")?.textContent || "",
      gross: document.querySelector("#dsv_grossTotal")?.textContent || "",
      wageQty: document.querySelector("#datevWageRows tr:not(.ds-pad) .ds-num")?.textContent || "",
      usa: document.querySelector("#dsv_usa")?.textContent || "",
      ariaHidden: document.getElementById("lohnApp")?.getAttribute("aria-hidden"),
      pointerOk: getComputedStyle(document.getElementById("employeeName")).pointerEvents !== "none",
    };
  });

  ok(sheet.ariaHidden === "false", "App entsperrt (aria-hidden=false)");
  ok(sheet.pointerOk, "Eingaben nicht durch pointer-events blockiert");
  ok(sheet.name.includes("Feld Test"), `Name auf Blatt: ${sheet.name}`);
  ok(sheet.pers === "99001", `Pers.-Nr. ${sheet.pers}`);
  ok(sheet.kk.includes("TK"), `Krankenkasse ${sheet.kk}`);
  ok(sheet.kkPct.includes("14,9") || sheet.kkPct.includes("14.9"), `KK % ${sheet.kkPct}`);
  ok(sheet.days === "21" || sheet.days === "21,00", `Arbeitstage ${sheet.days}`);
  ok(sheet.hours.includes("168"), `Stunden ${sheet.hours}`);
  ok(sheet.bank.includes("Testbank"), `Bank ${sheet.bank}`);
  ok(sheet.gross.includes("3.200"), `Brutto ${sheet.gross}`);
  ok(Boolean(sheet.pay.trim()), `Auszahlung ${sheet.pay}`);
  ok(sheet.usa.includes("10001") || sheet.usa.includes("12345") || sheet.usa.length > 0, `USA-Zeile ${sheet.usa}`);

  // Hub smoke
  console.log("\n=== E2E Felder: index.html (Hub) ===");
  await page.addInitScript(() => {
    sessionStorage.setItem("workpassLohnE2E", "1");
  });
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  const hub = await page.evaluate(() => {
    const app = document.getElementById("workpassApp");
    const inv = document.getElementById("invoiceNumber");
    const seller = document.getElementById("seller");
    return {
      unlocked: document.body.classList.contains("auth-locked") === false
        || app?.getAttribute("aria-hidden") === "false",
      hasInvoice: Boolean(inv),
      invBlocked: inv ? (inv.disabled || inv.readOnly) : true,
      hasSeller: Boolean(seller),
      sellerBlocked: seller ? (seller.disabled || seller.readOnly) : true,
      hasHub: typeof window.WorkPassHub !== "undefined",
      hasAuth: typeof window.WorkPassAuth !== "undefined",
    };
  });
  ok(hub.hasAuth, "WorkPassAuth geladen");
  ok(hub.hasHub, "WorkPassHub geladen");
  ok(hub.unlocked, "Hub entsperrt");
  ok(hub.hasInvoice && !hub.invBlocked, "Rechnungsnummer beschreibbar");
  ok(hub.hasSeller && !hub.sellerBlocked, "Seller beschreibbar");

  if (hub.hasInvoice) {
    await page.click('[data-tab="document"]');
    await page.waitForTimeout(200);
    await page.fill("#invoiceNumber", "RE-TEST-001");
    await page.waitForTimeout(200);
    const num = await page.inputValue("#invoiceNumber");
    ok(num === "RE-TEST-001", "Rechnungsnummer speichert Eingabe");
  }

  const lohnLink = await page.locator('a[href*="lohn.html"]').count();
  ok(lohnLink >= 1, "Link zu WorkPass Lohn vorhanden");

  console.log(`\n=== Felder-Ergebnis: ${failed === 0 ? "ALLE OK" : `${failed} FEHLER`} ===\n`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
