/**
 * German E-Rechnung foundation: XRechnung-oriented UBL 2.1 Invoice XML.
 * Not a full Peppol validator – generates a structured export for human/tooling review.
 */
import { normalizeCompanyId } from "../tenant.mjs";

function escXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function parseParty(block) {
  const lines = String(block || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return {
    name: lines[0] || "",
    line1: lines[1] || "",
    line2: lines[2] || "",
  };
}

/**
 * @param {object} job – invoice job from store
 * @returns {{ ok: boolean, profile: string, fileName?: string, xml?: string, error?: string, checklist?: object }}
 */
export function buildXRechnungUbl(job) {
  if (!job?.draft && !job?.id) {
    return { ok: false, error: "Rechnung fehlt" };
  }
  const draft = job.draft || {};
  const company = job.company || draft.company || {};
  const companyId = normalizeCompanyId(company.id || "");
  const number = String(draft.number || "").trim();
  if (!number) return { ok: false, error: "Rechnungsnummer fehlt" };

  const seller = parseParty(draft.seller || company.name);
  const buyer = parseParty(draft.customer);
  const items = Array.isArray(draft.items) ? draft.items : [];
  if (!items.length) return { ok: false, error: "Keine Positionen" };

  const net = Number(draft.net ?? items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0));
  const taxRate = Number(draft.taxRate ?? 19);
  const tax = Number(draft.tax ?? Math.round(net * (taxRate / 100) * 100) / 100);
  const gross = Number(draft.gross ?? Math.round((net + tax) * 100) / 100);
  const issueDate = String(draft.invoiceDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  const dueDate = String(draft.dueDate || "").slice(0, 10);
  const currency = "EUR";
  const vatId = String(draft.vatId || company.vatId || "").trim();
  const taxNumber = String(draft.taxNumber || company.taxNumber || "").trim();

  const checklist = {
    hasNumber: Boolean(number),
    hasIssueDate: Boolean(issueDate),
    hasSellerName: Boolean(seller.name),
    hasBuyerName: Boolean(buyer.name),
    hasLines: items.length > 0,
    hasVatOrTaxId: Boolean(vatId || taxNumber),
    kleinunternehmer: Boolean(draft.kleinunternehmer),
    reverseCharge: Boolean(draft.reverseCharge),
    readyForHumanSend: Boolean(number && issueDate && seller.name && buyer.name && items.length),
  };

  const lineXml = items.map((it, idx) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.unitPrice) || 0;
    const lineNet = Math.round(qty * price * 100) / 100;
    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${escXml(qty)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currency}">${money(lineNet)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escXml(it.description || it.label || `Position ${idx + 1}`)}</cbc:Description>
        <cbc:Name>${escXml(it.description || it.label || `Position ${idx + 1}`)}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currency}">${money(price)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escXml(number)}</cbc:ID>
  <cbc:IssueDate>${escXml(issueDate)}</cbc:IssueDate>
  ${dueDate ? `<cbc:DueDate>${escXml(dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escXml(companyId || "NA")}</cbc:BuyerReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escXml(seller.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(seller.line1)}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${escXml(vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(seller.name)}</cbc:RegistrationName>
        ${taxNumber ? `<cbc:CompanyID>${escXml(taxNumber)}</cbc:CompanyID>` : ""}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escXml(buyer.name || "Kunde")}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(buyer.line1)}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${money(tax)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${money(net)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${money(tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${draft.reverseCharge ? "AE" : (draft.kleinunternehmer ? "E" : "S")}</cbc:ID>
        <cbc:Percent>${money(draft.kleinunternehmer ? 0 : taxRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${money(net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${money(gross)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${money(gross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineXml}
</Invoice>
`;

  const safeNo = number.replace(/[^\w.-]+/g, "_").slice(0, 40);
  return {
    ok: true,
    profile: "XRechnung 3.0 (UBL 2.1 EN16931-oriented)",
    format: "ubl-xml",
    fileName: `xrechnung-${safeNo}.xml`,
    xml,
    checklist,
    totals: { net, tax, gross, taxRate, currency },
    note:
      "E-Rechnung-Export zur Prüfung/Weitergabe. Kein automatischer Versand. "
      + "Vollständige Peppol/Leitweg-ID-Validierung bleibt beim Menschen / Gateway.",
    humanFinal: true,
  };
}
