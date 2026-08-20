/**
 * Build original PDF bytes for platform delivery (pdfBase64).
 * Zero dependency — simple A4 text PDF (Helvetica / Latin-1 friendly).
 */
function latin1(str) {
  return String(str ?? "")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/€/g, "EUR")
    .replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

function pdfEscape(str) {
  return latin1(str)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function linesForPayslip(doc, delivery) {
  const d = doc || {};
  const emp = d.employee || delivery?.employee || {};
  const co = d.company || delivery?.company || {};
  const t = d.totals || {};
  const lines = [
    "Entgeltabrechnung",
    `Firma: ${co.name || ""}`,
    `Mitarbeiter: ${emp.name || ""}`,
    `ID: ${emp.badgeId || emp.id || ""}`,
    `Zeitraum: ${d.period || delivery?.period || ""}`,
    "",
    `Brutto: ${money(t.gross)} EUR`,
    `Steuer-Brutto: ${money(t.taxGross)} EUR`,
    `Lohnsteuer: ${money(t.payrollTax)} EUR`,
    `SolZ: ${money(t.solidarity)} EUR`,
    `KiSt: ${money(t.churchTax)} EUR`,
    `KV: ${money(t.health)} EUR`,
    `RV: ${money(t.pension)} EUR`,
    `PV: ${money(t.care)} EUR`,
    `AV: ${money(t.unemployment)} EUR`,
    `Netto: ${money(t.net)} EUR`,
    "",
  ];
  for (const w of (d.wageItems || []).slice(0, 40)) {
    lines.push(`${w.code || ""} ${w.label || ""}  ${money(w.amount ?? w.betrag)} EUR`);
  }
  lines.push("", "WorkPass Lohn · Original-PDF fuer Mitarbeiter-App");
  return lines;
}

function linesForLstb(doc, delivery) {
  const d = doc || {};
  const lines = [
    "Lohnsteuerbescheinigung",
    `Jahr: ${d.year || delivery?.year || ""}`,
    `Mitarbeiter: ${d.employeeName || delivery?.employee?.name || ""}`,
    `ID: ${d.employeeId || delivery?.employee?.id || ""}`,
    `Zeitraum: ${d.certPeriodLabel || d.certPeriod || ""}`,
    `Arbeitgeber: ${String(d.seller || "").split("\n")[0] || ""}`,
    `Steuernummer: ${d.taxNumber || ""}`,
    "",
  ];
  for (const row of (d.rows || [])) {
    if (!row?.label && (row?.value === "" || row?.value == null)) continue;
    const val = row.money ? `${money(row.value)} EUR` : String(row.value ?? "");
    if (row.nr) lines.push(`${row.nr}. ${row.label || ""}: ${val}`);
    else if (row.label) lines.push(`${row.label}: ${val}`);
  }
  lines.push("", "§ 41b EStG · WorkPass Lohn · Original-PDF");
  return lines;
}

function linesForVerdienst(doc, delivery) {
  const d = doc || {};
  const lines = [
    "Verdienstbescheinigung",
    `Monat: ${d.period || delivery?.period || ""}`,
    `Jahr: ${d.year || delivery?.year || ""}`,
    `Mitarbeiter: ${d.employeeName || delivery?.employee?.name || ""}`,
    `ID: ${d.employeeId || delivery?.employee?.id || ""}`,
    `Arbeitgeber: ${String(d.seller || "").split("\n")[0] || ""}`,
    "",
    "Bezeichnung | mtl. | Jahr",
  ];
  for (const row of (d.rows || [])) {
    lines.push(`${row.label || ""} | ${money(row.monthly)} | ${money(row.yearly)}`);
  }
  lines.push("", "WorkPass Lohn · Original-PDF fuer Mitarbeiter-App");
  return lines;
}

function linesForInvoice(doc, delivery) {
  const d = doc || {};
  const t = d.totals || {};
  return [
    "Rechnung",
    `Nummer: ${d.number || delivery?.number || ""}`,
    `Kunde: ${String(d.customer || "").split("\n")[0] || ""}`,
    "",
    `Netto: ${money(t.net)} EUR`,
    `USt: ${money(t.tax)} EUR`,
    `Brutto: ${money(t.gross)} EUR`,
    "",
    "WorkPass Lohn · Original-PDF",
  ];
}

function buildContentStream(lines) {
  const startY = 800;
  const leading = 14;
  const parts = ["BT /F1 11 Tf 50 " + startY + " Td"];
  lines.forEach((line, i) => {
    if (i === 0) {
      parts.push(`/F1 16 Tf (${pdfEscape(line)}) Tj`);
      parts.push(`/F1 11 Tf 0 -${leading + 4} Td`);
    } else {
      parts.push(`(${pdfEscape(line)}) Tj`);
      parts.push(`0 -${leading} Td`);
    }
  });
  parts.push("ET");
  return parts.join("\n");
}

function assemblePdf(contentStream) {
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
    + "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

function fileNameFor(type, delivery, doc) {
  const safe = (s) => String(s || "dokument").replace(/[^\w.\-]+/g, "_").slice(0, 80);
  if (type === "lstb") return safe(`Lohnsteuerbescheinigung_${doc?.year || delivery?.year || ""}.pdf`);
  if (type === "verdienst") return safe(`Verdienstbescheinigung_${doc?.period || delivery?.period || ""}.pdf`);
  if (type === "invoice") return safe(`Rechnung_${doc?.number || delivery?.number || ""}.pdf`);
  return safe(`Entgeltabrechnung_${doc?.period || delivery?.period || ""}.pdf`);
}

/**
 * @returns {{ pdfBase64: string, pdfFileName: string, pdfMimeType: string, pdfBytes: number }}
 */
export function buildDocumentPdf(delivery) {
  const type = String(delivery?.documentType || delivery?.type || "payslip").toLowerCase();
  const doc = delivery?.document || {};
  let lines;
  if (type === "lstb") lines = linesForLstb(doc, delivery);
  else if (type === "verdienst" || type === "vb") lines = linesForVerdienst(doc, delivery);
  else if (type === "invoice") lines = linesForInvoice(doc, delivery);
  else lines = linesForPayslip(doc, delivery);

  const buf = assemblePdf(buildContentStream(lines));
  const pdfBase64 = buf.toString("base64");
  const pdfFileName = fileNameFor(type, delivery, doc);
  return {
    pdfBase64,
    pdfFileName,
    pdfMimeType: "application/pdf",
    pdfBytes: buf.length,
    // aliases platforms often accept
    fileName: pdfFileName,
    mimeType: "application/pdf",
  };
}

/**
 * Attach original PDF onto delivery (+ nested document) for platform employee app.
 * Never rebuilds once sealed or when pdfBase64 already present.
 */
export function attachPdfToDelivery(delivery) {
  if (!delivery || typeof delivery !== "object") return delivery;
  // Sealed = frozen: do not touch document or PDF again
  if (delivery.immutable || delivery.seal?.seal) {
    return delivery;
  }
  if (delivery.pdfBase64 && String(delivery.pdfBase64).length > 100) {
    delivery.pdfMimeType = delivery.pdfMimeType || "application/pdf";
    delivery.mimeType = delivery.mimeType || "application/pdf";
    return delivery;
  }
  const pdf = buildDocumentPdf(delivery);
  delivery.pdfBase64 = pdf.pdfBase64;
  delivery.pdfFileName = pdf.pdfFileName;
  delivery.pdfMimeType = pdf.pdfMimeType;
  delivery.pdfBytes = pdf.pdfBytes;
  delivery.fileName = pdf.fileName;
  delivery.mimeType = pdf.mimeType;
  if (delivery.document && typeof delivery.document === "object") {
    delivery.document = {
      ...delivery.document,
      pdfBase64: pdf.pdfBase64,
      pdfFileName: pdf.pdfFileName,
      pdfMimeType: pdf.pdfMimeType,
      fileName: pdf.fileName,
      mimeType: pdf.mimeType,
    };
  }
  return delivery;
}
