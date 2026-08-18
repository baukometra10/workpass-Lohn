/**
 * Monthly Lohnsteueranmeldung (LStA) for the employer — § 41a EStG.
 * Company totals only (LSt, SolZ, KiSt). Not an employee LStB.
 * Sidecar/ERiC maps this envelope to the official transfer.
 */
import crypto from "node:crypto";
import { listPayrollJobs, loadCompany } from "../db/repository.mjs";
import { isDemoPayrollJob } from "../demo-detect.mjs";
import { normalizeCompanyId } from "../tenant.mjs";
import { ACCOUNTING_VERSION } from "../version.mjs";
import { elsterTestMode } from "./lstb-xml.mjs";

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

function testmerker() {
  return process.env.WORKPASS_ELSTER_TEST === "0" ? "0" : "700000004";
}

function employeeKey(job) {
  return String(job?.employee?.id || job?.employee?.badgeId || job?.state?.employeeId || "").trim();
}

export function buildMonthLsta(companyId, period) {
  const cid = normalizeCompanyId(companyId);
  const p = String(period || "").trim();
  if (!cid) return { ok: false, status: 422, error: "companyId fehlt" };
  if (!/^\d{4}-\d{2}$/.test(p)) {
    return { ok: false, status: 422, error: "Zeitraum muss JJJJ-MM sein" };
  }
  const company = loadCompany(cid) || {};
  const jobs = (listPayrollJobs({ companyId: cid, period: p }) || []).filter(
    (j) => !isDemoPayrollJob(j) && j.status === "released"
  );
  const totals = {
    gross: 0,
    payrollTax: 0,
    solidarity: 0,
    churchTax: 0,
    net: 0,
  };
  const employees = new Set();
  for (const j of jobs) {
    const t = j.payslip?.totals || j.payroll || {};
    totals.gross += Number(t.gross) || 0;
    totals.payrollTax += Number(t.payrollTax) || 0;
    totals.solidarity += Number(t.solidarity) || 0;
    totals.churchTax += Number(t.churchTax) || 0;
    totals.net += Number(t.net) || 0;
    const eid = employeeKey(j);
    if (eid) employees.add(eid);
  }
  const rounded = {
    gross: Number(money(totals.gross)),
    payrollTax: Number(money(totals.payrollTax)),
    solidarity: Number(money(totals.solidarity)),
    churchTax: Number(money(totals.churchTax)),
    net: Number(money(totals.net)),
  };
  rounded.payable = Number(money(rounded.payrollTax + rounded.solidarity + rounded.churchTax));
  const year = p.slice(0, 4);
  const taxNumber = String(company.taxNumber || company.meta?.hubProfile?.taxNumber || "").replace(/\s+/g, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>LStA</DatenArt>
    <Vorgang>send-Auth</Vorgang>
    <Testmerker>${testmerker()}</Testmerker>
    <HerstellerID>WorkPass Lohn ${ACCOUNTING_VERSION}</HerstellerID>
    <DatenLieferant>${esc(company.name || cid)}</DatenLieferant>
    <Datei>
      <Verschluesselung>PKCS#12</Verschluesselung>
    </Datei>
  </TransferHeader>
  <DatenTeil>
    <Nutzdaten>
      <NutzdatenHeader>
        <NutzdatenTicket>${crypto.randomUUID()}</NutzdatenTicket>
        <Empfaenger id="F">${esc(taxNumber)}</Empfaenger>
      </NutzdatenHeader>
      <NutzdatenBlock>
        <Lohnsteueranmeldung periode="${esc(p)}" jahr="${esc(year)}" firma="${esc(cid)}" anzahl="${employees.size}">
          <Arbeitgeber>
            <Name>${esc(company.name || "")}</Name>
            <Steuernummer>${esc(taxNumber)}</Steuernummer>
          </Arbeitgeber>
          <Summen>
            <Lohnsteuer>${money(rounded.payrollTax)}</Lohnsteuer>
            <Solidaritaetszuschlag>${money(rounded.solidarity)}</Solidaritaetszuschlag>
            <Kirchensteuer>${money(rounded.churchTax)}</Kirchensteuer>
            <Anmeldungsbetrag>${money(rounded.payable)}</Anmeldungsbetrag>
            <Bruttoarbeitslohn>${money(rounded.gross)}</Bruttoarbeitslohn>
          </Summen>
        </Lohnsteueranmeldung>
      </NutzdatenBlock>
    </Nutzdaten>
  </DatenTeil>
</Elster>
`;
  return {
    ok: true,
    kind: "portal.lsta.draft.v1",
    companyId: cid,
    period: p,
    year,
    employeeCount: employees.size,
    releasedCount: jobs.length,
    totals: rounded,
    taxNumber,
    testMode: elsterTestMode(),
    xml,
    empty: jobs.length === 0,
    note: "LStA der Firma aus freigegebenen Monaten — nicht die LStB der Mitarbeiter.",
  };
}
