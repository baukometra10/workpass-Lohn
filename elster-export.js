/**
 * ELSTER-Vorbereitungs-XML für die elektronische Lohnsteuerbescheinigung.
 * Struktur orientiert sich am amtlichen Datensatz (Kennziffern Anhang 23 EStG).
 * Hinweis: Übermittlung an ELSTER erfordert authentifiziertes Zertifikat (www.elster.de).
 */

const ELSTER_LSTB_KENNZIFFERN = [
  { nr: "3", key: "grossWages", label: "Bruttoarbeitslohn" },
  { nr: "4", key: "payrollTax", label: "Einbehaltene Lohnsteuer" },
  { nr: "5", key: "solidarity", label: "Solidaritätszuschlag" },
  { nr: "6", key: "churchTax", label: "Kirchensteuer" },
  { nr: "15", key: "pension", label: "Rentenversicherung AN" },
  { nr: "16", key: "health", label: "Krankenversicherung AN" },
  { nr: "17", key: "care", label: "Pflegeversicherung AN" },
  { nr: "18", key: "unemployment", label: "Arbeitslosenversicherung AN" },
];

function normalizeTaxId(value) {
  return String(value || "").replace(/\D/g, "");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatElsterDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatElsterMoney(value) {
  const n = Number(value) || 0;
  return n.toFixed(2);
}

function generateKmId(certData) {
  const year = certData?.year || new Date().getFullYear();
  // Prefer payroll Pers.-Nr. / tax ID — never put platform employee IDs on the printed LStB.
  const pers = String(certData?.personnelNumber || certData?.employeeTaxId || "0000")
    .replace(/\W/g, "")
    .slice(0, 12);
  const stamp = Date.now().toString(36).toUpperCase();
  return `FD${year}${pers}${stamp}`.slice(0, 32);
}

function mapTaxClassToElster(taxClass) {
  const map = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6" };
  return map[taxClass] || String(taxClass || "1");
}

function buildElsterLstbXml(certData, options = {}) {
  if (!certData) throw new Error("Keine Bescheinigungsdaten.");

  const totals = certData.totals || {};
  const kmId = options.kmId || generateKmId(certData);
  const idNr = normalizeTaxId(certData.employeeTaxId);
  const employer = options.employer || {};
  const software = options.software || "FinanzDokument Pro";
  const version = options.appVersion || "2026.3";

  const kennziffern = ELSTER_LSTB_KENNZIFFERN.map((item) => {
    const amount = item.key === "grossWages" ? totals.gross : totals[item.key];
    return `    <Kennziffer nr="${item.nr}" bezeichnung="${xmlEscape(item.label)}">${formatElsterMoney(amount)}</Kennziffer>`;
  }).join("\n");

  const elstamBlock = `
    <ELStAM gueltigAb="${xmlEscape(formatElsterDate(certData.periodEnd || `${certData.year}-12-31`))}">
      <Steuerklasse>${mapTaxClassToElster(certData.taxClass)}</Steuerklasse>
      <Kinderfreibetrag>${Number(certData.childAllowanceFactor) || 0}</Kinderfreibetrag>
      <Kirchensteuer>${certData.churchTaxRate > 0 ? "1" : "0"}</Kirchensteuer>
    </ELStAM>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Lohnsteuerbescheinigung xmlns="http://www.elster.de/elsterxml/lstb/v1" version="${certData.year}">
  <DatenLieferant>
    <Software>${xmlEscape(software)}</Software>
    <SoftwareVersion>${xmlEscape(version)}</SoftwareVersion>
    <Erstellungszeitpunkt>${new Date().toISOString()}</Erstellungszeitpunkt>
    <Hinweis>Vorbereitungsdatei – Übermittlung via ELSTER erfordert Authentifizierung</Hinweis>
  </DatenLieferant>
  <KmId>${xmlEscape(kmId)}</KmId>
  <Bescheinigungsjahr>${certData.year}</Bescheinigungsjahr>
  <Bescheinigungszeitraum von="${xmlEscape(formatElsterDate(certData.periodStart))}" bis="${xmlEscape(formatElsterDate(certData.periodEnd))}"/>
  <Arbeitnehmer>
    <Identifikationsnummer>${xmlEscape(idNr)}</Identifikationsnummer>
    <Personalnummer>${xmlEscape(certData.personnelNumber || "")}</Personalnummer>
    <Name>${xmlEscape(certData.employeeName || "")}</Name>
    <Geburtsdatum>${xmlEscape(formatElsterDate(certData.employeeBirthDate))}</Geburtsdatum>
    <Versicherungsnummer>${xmlEscape(certData.employeeInsuranceNo || "")}</Versicherungsnummer>
    <Anschrift>${xmlEscape(certData.employeeAddress || "")}</Anschrift>
  </Arbeitnehmer>
  <Arbeitgeber>
    <Name>${xmlEscape(employer.name || certData.seller || "")}</Name>
    <Steuernummer>${xmlEscape(employer.taxNumber || "")}</Steuernummer>
    <Anschrift>${xmlEscape(employer.address || certData.seller || "")}</Anschrift>
  </Arbeitgeber>
  ${elstamBlock}
  <Beträge>
${kennziffern}
    <Kennziffer nr="22" bezeichnung="Abgerechnete Monate">${totals.monthsCount || 0}</Kennziffer>
  </Beträge>
  <Meta>
    <Monate>${xmlEscape((totals.months || []).join(","))}</Monate>
    <NettoGesamt>${formatElsterMoney(totals.net)}</NettoGesamt>
    <SteuerBruttoGesamt>${formatElsterMoney(totals.taxGross)}</SteuerBruttoGesamt>
    <SvBruttoGesamt>${formatElsterMoney(totals.svGross)}</SvBruttoGesamt>
  </Meta>
</Lohnsteuerbescheinigung>
`;
}

if (typeof window !== "undefined") {
  window.ElsterExport = {
    ELSTER_LSTB_KENNZIFFERN,
    buildElsterLstbXml,
    generateKmId,
    normalizeTaxId,
  };
}
