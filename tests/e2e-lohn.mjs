/**
 * E2E: leeres HTML-Blatt, Live-Eingabe, Plattform-Import, Demo, Druck
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = "http://127.0.0.1:8765";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  let failed = 0;
  const ok = (c, m) => {
    if (c) console.log(`  ✓ ${m}`);
    else { console.error(`  ✗ ${m}`); failed += 1; }
  };

  console.log("\n=== E2E: lohn.html ===");

  await page.addInitScript(() => {
    localStorage.removeItem("finanzDokumentPayrollV1");
    localStorage.removeItem("finanzDokumentPayrollArchiveV1");
    sessionStorage.setItem("workpassLohnE2E", "1");
  });

  await page.goto(`${BASE}/lohn.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("#datevSheetA4", { timeout: 10000 });
  ok(await page.locator("#btnLock").count() === 1, "Sperren-Button vorhanden");
  ok(await page.locator("#pasteInbox").count() === 1, "Inbox/Paste Empfang vorhanden");
  ok(await page.locator("#archiveBoard").count() === 1, "Archiv-Board vorhanden");
  ok(await page.locator("#btnExportCsv").count() === 1, "CSV-Export vorhanden");

  ok(await page.locator("#datevSheetA4").count() === 1, "HTML-A4-Blatt vorhanden");
  ok(!(await page.locator(".datev-sheet-bg").count()), "Kein PNG-Overlay mehr");

  let payout = await page.locator("#dsv_payout").textContent();
  ok(!payout?.trim(), "Start: Blatt ohne Auszahlungsbetrag");

  await page.fill("#employeeName", "Test Mitarbeiter");
  await page.waitForTimeout(200);
  const empName = await page.locator("#dsv_empName").textContent();
  ok(empName?.includes("Test Mitarbeiter"), `Live: Name auf Blatt (${empName})`);

  const platformFile = path.join(root, "examples", "platform-payroll.v1.json");
  await page.setInputFiles("#importPlatformInput", platformFile);
  await page.waitForTimeout(600);
  const company = await page.locator("#seller").inputValue();
  ok(company.includes("Muster GmbH"), `Plattform-Import Firma (${company.split("\n")[0]})`);
  const persImport = await page.locator("#dsv_persNr").textContent();
  // persNr is inside grid cell now - may be in .ds-val without id on value only - check grid
  const persText = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".ds-cell")];
    const pers = cells.find((c) => c.querySelector(".ds-lab")?.textContent?.includes("Personal"));
    return pers?.querySelector(".ds-val")?.textContent?.trim() || document.getElementById("dsv_persNr")?.textContent?.trim() || "";
  });
  ok(persText === "02006" || persImport?.trim() === "02006", `Plattform Pers.-Nr. ${persText || persImport}`);

  await page.click("#btnReference");
  await page.waitForTimeout(500);
  payout = await page.locator("#dsv_payout").textContent();
  ok(payout?.trim() === "2.454,36", `Demo Mustermann Netto ${payout?.trim()}`);

  const gross = await page.locator("#dsv_grossTotal").textContent();
  ok(gross?.trim() === "3.620,00", `Gesamt-Brutto ${gross?.trim()}`);

  // Demo-Freeze muss bei Bearbeitung enden (sonst „hängende“ Referenzwerte)
  await page.fill("#employeeName", "Mustermann Geändert");
  await page.waitForTimeout(400);
  const afterDemoEdit = await page.evaluate(() => ({
    pill: document.querySelector("#modePill")?.textContent || "",
    pay: document.querySelector("#dsv_payout")?.textContent?.trim() || "",
    name: document.querySelector("#dsv_empName")?.textContent || "",
  }));
  ok(afterDemoEdit.pill.includes("Standalone"), `Nach Demo-Edit Modus Live (${afterDemoEdit.pill})`);
  ok(afterDemoEdit.name.includes("Geändert"), `Name aktualisiert (${afterDemoEdit.name})`);
  ok(afterDemoEdit.pay !== "", "Nach Demo-Edit weiterhin Auszahlung berechnet");

  page.once("dialog", (d) => d.accept());
  await page.click("#btnNew");
  await page.waitForTimeout(400);
  payout = await page.locator("#dsv_payout").textContent();
  ok(!payout?.trim(), "Neue Abrechnung: Blatt wieder leer");

  await page.fill("#employeeName", "Live Test");
  await page.fill("#employeeId", "12345");
  await page.waitForTimeout(200);
  const persCell = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".ds-cell")];
    const pers = cells.find((c) => c.querySelector(".ds-lab")?.textContent?.includes("Personal"));
    return pers?.querySelector(".ds-val")?.textContent?.trim() || "";
  });
  ok(persCell === "12345", `Live Pers.-Nr. ${persCell}`);

  const printHtml = await page.evaluate(() => window.DatevSheet?.buildPrintHtml?.() || "");
  ok(printHtml.includes("datev-sheet-a4"), "Druck-HTML enthält A4-Blatt");
  ok(!printHtml.includes("lex-appbar"), "Druck-HTML ohne App-Chrome");
  ok(printHtml.includes("Gesamt-Brutto"), "Druck-HTML mit Tabellenstruktur");

  await page.evaluate(() => {
    const w = window;
    w.__printCalled = false;
    const orig = HTMLIFrameElement.prototype;
    // Druck über iframe – Dialog im Headless abfangen
    w.DatevSheet.printSheet();
  });
  await page.waitForTimeout(400);
  const printFrame = await page.locator("#datevPrintFrame").count();
  ok(printFrame === 1, "Druck-iframe erzeugt (keine leere Browserseite)");
  const frameHasSheet = await page.evaluate(() => {
    const f = document.getElementById("datevPrintFrame");
    return Boolean(f?.contentDocument?.querySelector(".datev-sheet-a4"));
  });
  ok(frameHasSheet, "Druck-iframe enthält A4-Blatt");

  ok(await page.locator("#companySelect").count() === 1, "Firmen-Umschalter vorhanden");
  ok(await page.locator("#dropTarget").count() === 1, "Drop-Zone Plattform vorhanden");

  readFileSync(platformFile, "utf8");

  console.log(`\n=== E2E Ergebnis: ${failed === 0 ? "ALLE OK" : `${failed} FEHLER`} ===\n`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
