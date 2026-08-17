/**
 * Year LStB XML for the ELSTER sidecar (ElsterLohn / LStB).
 * Built from released payroll certificates — not a live ERiC schema dump.
 * The sidecar/ERiC maps this envelope to the official transfer.
 */
import crypto from "node:crypto";
import { loadCompany } from "../db/repository.mjs";
import { ACCOUNTING_VERSION } from "../version.mjs";
import {
  listCertificateSummary,
  buildEmployeeLstbCertificate,
} from "../certificates/employee-certificates.mjs";

const KENNZIFFERN = [
  { nr: "3", key: "gross", label: "Bruttoarbeitslohn" },
  { nr: "4", key: "payrollTax", label: "Einbehaltene Lohnsteuer" },
  { nr: "5", key: "solidarity", label: "Solidaritätszuschlag" },
  { nr: "6", key: "churchTax", label: "Kirchensteuer" },
  { nr: "15", key: "pension", label: "Rentenversicherung AN" },
  { nr: "16", key: "health", label: "Krankenversicherung AN" },
  { nr: "17", key: "care", label: "Pflegeversicherung AN" },
  { nr: "18", key: "unemployment", label: "Arbeitslosenversicherung AN" },
  { nr: "21", key: "employerShare", label: "Arbeitgeberanteil zur Sozialversicherung" },
];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function taxClassNr(taxClass) {
  const map = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6" };
  return map[String(taxClass || "I").trim()] || "1";
}

function isoDay(value) {
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

function testmerker() {
  return process.env.WORKPASS_ELSTER_TEST === "0" ? "0" : "700000004";
}

export function elsterTestMode() {
  return process.env.WORKPASS_ELSTER_TEST !== "0";
}

function employeeBlock(cert, company) {
  const t = cert.totals || {};
  const kenn = KENNZIFFERN.map(
    (k) => `          <Kennziffer nr="${k.nr}" bezeichnung="${esc(k.label)}">${money(t[k.key])}</Kennziffer>`
  ).join("\n");
  const taxId = String(cert.employeeTaxId || "").replace(/\D/g, "");
  const empId = String(cert.employeeId || "").trim();
  const persNrRaw = String(cert.personnelNumber || "").trim();
  const persNr = persNrRaw && persNrRaw !== empId ? persNrRaw : "";
  return `        <Lohnsteuerbescheinigung${persNr ? ` personalNr="${esc(persNr)}"` : ""}>
          <Arbeitnehmer>
            <Name>${esc(cert.employeeName || "")}</Name>
            <Identifikationsnummer>${esc(taxId)}</Identifikationsnummer>
            <Versicherungsnummer>${esc(cert.employeeInsuranceNo || "")}</Versicherungsnummer>
            <Anschrift>${esc(cert.employeeAddress || "")}</Anschrift>
            <Steuerklasse>${taxClassNr(cert.taxClass)}</Steuerklasse>
            <Kinderfreibetrag>${Number(cert.childAllowanceFactor) || 0}</Kinderfreibetrag>
            <Kirchensteuer>${Number(cert.churchTaxRate) > 0 ? "1" : "0"}</Kirchensteuer>
          </Arbeitnehmer>
          <Bescheinigungszeitraum von="${esc(isoDay(cert.periodStart))}" bis="${esc(isoDay(cert.periodEnd))}"/>
          <ZeitraumLabel>${esc(cert.certPeriodLabel || cert.certPeriod || "")}</ZeitraumLabel>
          <Betraege>
${kenn}
            <Kennziffer nr="22" bezeichnung="Abgerechnete Monate">${Number(t.monthsCount) || 0}</Kennziffer>
            <Netto>${money(t.net)}</Netto>
          </Betraege>
          <Arbeitgeber>
            <Name>${esc(company.name || "")}</Name>
            <Steuernummer>${esc(String(company.taxNumber || "").replace(/\s+/g, ""))}</Steuernummer>
          </Arbeitgeber>
        </Lohnsteuerbescheinigung>`;
}

export function buildYearLstbXml(companyId, year) {
  const y = String(year || new Date().getFullYear());
  const company = loadCompany(companyId) || {};
  const summary = listCertificateSummary(companyId, y);
  const employees = summary.employees || [];
  const blocks = [];
  const skipped = [];
  for (const emp of employees) {
    const cert = buildEmployeeLstbCertificate(companyId, emp.employeeId, y);
    if (!cert.ok) {
      skipped.push({ employeeId: emp.employeeId, error: cert.error });
      continue;
    }
    blocks.push(employeeBlock(cert, company));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>LStB</DatenArt>
    <Vorgang>send-Auth</Vorgang>
    <Testmerker>${testmerker()}</Testmerker>
    <HerstellerID>WorkPass Lohn ${ACCOUNTING_VERSION}</HerstellerID>
    <DatenLieferant>${esc(company.name || companyId)}</DatenLieferant>
    <Datei>
      <Verschluesselung>PKCS#12</Verschluesselung>
    </Datei>
  </TransferHeader>
  <DatenTeil>
    <Nutzdaten>
      <NutzdatenHeader>
        <NutzdatenTicket>${crypto.randomUUID()}</NutzdatenTicket>
        <Empfaenger id="F">${esc(String(company.taxNumber || "").replace(/\s+/g, ""))}</Empfaenger>
      </NutzdatenHeader>
      <NutzdatenBlock>
        <Lohnsteuerbescheinigungen jahr="${esc(y)}" firma="${esc(companyId)}" anzahl="${blocks.length}">
${blocks.join("\n")}
        </Lohnsteuerbescheinigungen>
      </NutzdatenBlock>
    </Nutzdaten>
  </DatenTeil>
</Elster>
`;
  return {
    xml,
    year: y,
    employeeCount: blocks.length,
    skipped,
    testMode: elsterTestMode(),
    taxNumber: String(company.taxNumber || "").trim(),
  };
}
