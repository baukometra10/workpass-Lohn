/**
 * SEPA Credit Transfer pain.001.001.03 XML for released payslips.
 * Human downloads and submits to the bank – never auto-paid by AI.
 */
import { listPayrollJobs, loadCompany } from "./db/repository.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function compactIban(iban) {
  return String(iban || "").replace(/\s+/g, "").toUpperCase();
}

function validIbanShape(iban) {
  const s = compactIban(iban);
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s);
}

function fmtAmt(n) {
  return Number(n || 0).toFixed(2);
}

function msgId(companyId, period) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `WP${stamp}${String(companyId || "").replace(/\W/g, "").slice(0, 8)}`.slice(0, 35);
}

/**
 * @returns {{ ok, xml?, fileName?, count?, total?, warnings?, error? }}
 */
export function buildSepaCreditTransfer(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || currentPeriod()).trim();
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "period ungültig" };

  const company = loadCompany(cid);
  const debtorName = String(
    opts.debtorName || company?.name || company?.meta?.hubProfile?.name || cid
  ).trim();
  const debtorIban = compactIban(
    opts.debtorIban || company?.bankIban || company?.meta?.hubProfile?.iban || ""
  );
  const debtorBic = String(
    opts.debtorBic || company?.bankBic || company?.meta?.hubProfile?.bic || ""
  ).replace(/\s+/g, "").toUpperCase();

  const jobs = (listPayrollJobs({ companyId: cid, period }) || [])
    .filter((j) => !isDemoPayrollJob(j) && j.status === "released")
    .sort((a, b) => String(a.employee?.name || "").localeCompare(String(b.employee?.name || ""), "de"));

  const warnings = [];
  if (!debtorIban || !validIbanShape(debtorIban)) {
    warnings.push("Schuldner-IBAN der Firma fehlt oder ungültig – bitte vor Bank-Upload prüfen.");
  }

  const txs = [];
  for (const job of jobs) {
    const iban = compactIban(job.payslip?.bank?.iban || job.state?.bankIban || "");
    const name = String(job.employee?.name || job.payslip?.employee?.name || "Mitarbeiter").trim();
    const net = Number(job.payslip?.totals?.net || 0);
    if (!iban || !validIbanShape(iban)) {
      warnings.push(`Übersprungen (IBAN): ${name || job.jobId}`);
      continue;
    }
    if (!(net > 0)) {
      warnings.push(`Übersprungen (Netto ≤ 0): ${name || job.jobId}`);
      continue;
    }
    txs.push({
      endToEndId: String(job.jobId || `${cid}-${period}`).replace(/\W/g, "").slice(0, 35),
      name: name.slice(0, 70),
      iban,
      amount: net,
      remittance: `Lohn ${period} ${name}`.slice(0, 140),
    });
  }

  if (!txs.length) {
    return {
      ok: false,
      error: "Keine freigegebenen Abrechnungen mit gültiger IBAN/Netto für SEPA",
      warnings,
      period,
      companyId: cid,
    };
  }

  const ctrlSum = txs.reduce((s, t) => s + t.amount, 0);
  const nbOfTxs = txs.length;
  const id = msgId(cid, period);
  const creDtTm = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const reqdExctnDt = opts.executionDate
    || (() => {
      const [y, m] = period.split("-").map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      return `${ny}-${String(nm).padStart(2, "0")}-01`;
    })();

  const cdtTrfTxInf = txs.map((t) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${xmlEscape(t.endToEndId)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${fmtAmt(t.amount)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>${debtorBic ? `<BIC>${xmlEscape(debtorBic)}</BIC>` : "<Othr><Id>NOTPROVIDED</Id></Othr>"}</FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${xmlEscape(t.name)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>${xmlEscape(t.iban)}</IBAN></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${xmlEscape(t.remittance)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(id)}</MsgId>
      <CreDtTm>${xmlEscape(creDtTm)}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${fmtAmt(ctrlSum)}</CtrlSum>
      <InitgPty>
        <Nm>${xmlEscape(debtorName.slice(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEscape(`${id}-P1`.slice(0, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${fmtAmt(ctrlSum)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${xmlEscape(reqdExctnDt)}</ReqdExctnDt>
      <Dbtr>
        <Nm>${xmlEscape(debtorName.slice(0, 70))}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${xmlEscape(debtorIban || "DE00000000000000000000")}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>${debtorBic ? `<BIC>${xmlEscape(debtorBic)}</BIC>` : "<Othr><Id>NOTPROVIDED</Id></Othr>"}</FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${cdtTrfTxInf}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;

  return {
    ok: true,
    kind: "sepa.pain.001.001.03",
    humanFinal: true,
    note: "XML nur vorbereiten – Bank-Upload durch den Menschen. KI zahlt nichts.",
    companyId: cid,
    period,
    count: nbOfTxs,
    total: Math.round(ctrlSum * 100) / 100,
    warnings,
    fileName: `SEPA-${cid}-${period}.xml`,
    xml,
    contentType: "application/xml; charset=utf-8",
  };
}
