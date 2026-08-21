/**
 * WorkPass Hub – Auth-Boot, Druck-Helfer, Rechnungsarchiv, PIN ändern
 */
(function () {
  const INVOICE_ARCHIVE_KEY = "workpassInvoiceArchiveV1";
  const SYNC_LOG_KEY = "workpassHubSyncLogV1";
  let serverInvoiceItems = [];

  function collectPrintStyles() {
    const chunks = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      try {
        chunks.push(`<link rel="stylesheet" href="${new URL(href, window.location.href).href}" />`);
      } catch {
        chunks.push(link.outerHTML);
      }
    });
    // Critical fallbacks if linked CSS fails to load in the iframe
    chunks.push(`<style id="workpassPrintFallback">
@page { size: A4 portrait; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; color: #121518;
  font-family: "Barlow", "Segoe UI", Arial, sans-serif; }
.hidden, [hidden] { display: none !important; }
.preview-tools, .sig-ui-chrome, .wp-sig-chrome, .signature-mode-badge,
.wp-sig-seal, #signatureSealBadge { display: none !important; }
.mode-payroll-only, #payrollSheet, #verdienstSheet, #annualTaxSheet, #datevSheetHost { display: none !important; }
#invoicePreview, .pdf-export-clone, .invoice-print-root {
  width: 210mm; max-width: 210mm; margin: 0 auto; background: #fff; color: #000;
  box-shadow: none !important; border: none !important; padding: 0 !important;
}
.invoice-doc-stage {
  position: relative !important;
  display: block !important;
  box-sizing: border-box !important;
  width: 210mm !important;
  min-height: 297mm !important;
  max-width: 210mm !important;
  margin: 0 !important;
  padding: 14mm 16mm 16mm !important;
  background: #fff !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}
.invoice-doc-stage .invoice-top {
  display: flex; justify-content: space-between; gap: 12px;
  padding-bottom: 8px; margin-bottom: 10px;
  border-bottom: 1.6pt solid #0e7490;
}
.invoice-doc-stage .invoice-top h2 { margin: 0; font-size: 18pt; color: #0f172a; }
.invoice-doc-stage .dates { text-align: right; font-size: 9pt; color: #334155; }
.invoice-doc-stage .invoice-meta { font-size: 8.5pt; color: #475569; margin: 6px 0 12px; }
.invoice-doc-stage .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
.invoice-doc-stage .addresses h3 {
  margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #0e7490;
}
.invoice-doc-stage pre { margin: 0; font-family: inherit; white-space: pre-wrap; font-size: 10pt; line-height: 1.35; }
.preview-items { width: 100%; border-collapse: collapse; margin: 10px 0 6px; }
.preview-items th, .preview-items td {
  border-bottom: 0.6pt solid #cbd5e1; padding: 7px 5px; text-align: left; font-size: 9.5pt;
}
.preview-items th {
  background: #eef6f9; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #155e75;
}
.preview-items th:last-child, .preview-items td:last-child,
.preview-items td:nth-child(2), .preview-items td:nth-child(3) { text-align: right; }
.totals { margin: 16px 0 0 auto; width: 55%; font-size: 10pt; }
.totals p, .totals-line { display: flex; justify-content: space-between; gap: 10px; margin: 6px 0; }
.grand-total, .grand-total-plaque {
  border-top: 1.4pt solid #0e7490; padding-top: 8px; font-size: 12pt; font-weight: 700;
}
.grand-total-plaque {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 10px; border: none; border-radius: 6px;
  background: #0e7490; color: #fff;
}
.grand-total-kicker { font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; color: #a5f3fc; }
.grand-total-amount, #previewTotal { font-size: 14pt; color: #fff; font-weight: 800; }
.invoice-warning { margin-top: 10px; padding: 8px 10px; border: 0.7pt solid #f59e0b; border-radius: 4px; background: #fffbeb; font-size: 9pt; }
.invoice-warning.is-empty { display: none !important; }
.invoice-bank, .note-box {
  margin-top: 16px; padding: 8px 10px; border: 0.6pt solid #d5e4ec; border-radius: 4px; font-size: 9pt;
}
.note-box { border-style: dashed; }
.invoice-bank h3, .note-box h3 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; color: #0e7490; }
.invoice-closing { display: block; margin-top: 12px; padding: 0; border: none; background: transparent; box-shadow: none; }
.invoice-closing-main { display: block; }
.invoice-sig-plate { display: none !important; }
.wp-sig-layer {
  position: absolute !important;
  z-index: 20 !important;
  right: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  transform-origin: top left !important;
}
.wp-sig-layer #signaturePreview { max-width: 100%; height: auto; display: block; }
.wp-sig-line { border-bottom: 0.7pt solid #94a3b8; margin: 0 0 4px; min-height: 1px; }
.status-badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 8pt; }
.preview-company-logo { max-height: 18mm; max-width: 42mm; object-fit: contain; }
</style>`);
    return chunks.join("\n");
  }

  function invoicePrintCss() {
    return `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  width: 210mm; height: 297mm;
  overflow: hidden !important;
  background: #fff;
  color: #121518;
  font-family: "Barlow", "Segoe UI", Arial, Helvetica, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.invoice-print-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  min-height: 297mm;
  margin: 0;
  padding: 12mm 14mm 10mm;
  padding-bottom: 40mm;
  overflow: hidden;
  background: #fff;
  color: #121518;
  border: none;
  box-shadow: none;
}
.invoice-print-sheet::before {
  content: "";
  position: absolute; left: 0; top: 0; right: 0; height: 3.2mm;
  background: linear-gradient(90deg, #134e4a, #0e7490 35%, #0891b2 70%, #22d3ee);
}
.invoice-print-sheet .invoice-top {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  padding: 2mm 0 3mm; margin: 0 0 3.5mm;
  border-bottom: 1.4pt solid #0e7490;
}
.invoice-print-sheet .invoice-top-left { display: flex; align-items: center; gap: 10px; }
.invoice-print-sheet .invoice-top h2 {
  margin: 0; font-size: 18pt; font-weight: 750; color: #0f172a; letter-spacing: -0.02em;
}
.invoice-print-sheet #previewInvoiceNumber {
  margin: 2px 0 0; font-size: 9pt; font-weight: 650; color: #0e7490; letter-spacing: 0.03em;
}
.invoice-print-sheet .dates {
  text-align: right; font-size: 8pt; color: #334155; line-height: 1.45;
  min-width: 38mm; padding: 2mm 2.4mm; border: 0.5pt solid #cfe3ea; border-radius: 2.5mm;
  background: #f5fafc;
}
.invoice-print-sheet .dates p { margin: 0 0 1.5px; display: flex; justify-content: space-between; gap: 6px; }
.invoice-print-sheet .dates span { color: #64748b; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.04em; }
.invoice-print-sheet .status-badge {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  font-size: 7.5pt; font-weight: 700; background: #ccfbf1; color: #0f766e;
}
.invoice-print-sheet .invoice-meta {
  display: flex; flex-wrap: wrap; gap: 3px 6px; margin: 0 0 3.5mm;
}
.invoice-print-sheet .invoice-meta p {
  margin: 0; padding: 1.5px 7px; border-radius: 999px;
  background: #f0f9ff; border: 0.4pt solid #cfe3ea; color: #155e75; font-size: 7.5pt; font-weight: 600;
}
.invoice-print-sheet .invoice-meta p:empty { display: none; }
.invoice-print-sheet .addresses {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 0 0 3.5mm; flex: 0 0 auto;
}
.invoice-print-sheet .addresses > div {
  padding: 2.4mm 2.8mm; border: 0.55pt solid #cfe3ea; border-radius: 2.5mm;
  background: #f8fbfd; box-shadow: inset 2.2mm 0 0 #0e7490; min-height: 17mm;
}
.invoice-print-sheet .addresses h3 {
  margin: 0 0 2px; font-size: 7pt; font-weight: 750;
  text-transform: uppercase; letter-spacing: 0.08em; color: #0e7490;
}
.invoice-print-sheet pre {
  margin: 0; font-family: inherit; white-space: pre-wrap;
  font-size: 9.5pt; line-height: 1.35; color: #0f172a;
}
.invoice-print-sheet .invoice-purpose {
  margin: 0 0 3mm; padding: 2.2mm 2.8mm;
  border: 0.55pt solid #cfe3ea; border-radius: 2.5mm; background: #f5fafc;
  box-shadow: inset 2mm 0 0 #0e7490; flex: 0 0 auto;
}
.invoice-print-sheet .invoice-purpose h3 {
  margin: 0 0 2px; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.08em; color: #0e7490;
}
.invoice-print-sheet .invoice-purpose p {
  margin: 0; white-space: pre-wrap; font-size: 9.5pt; line-height: 1.4;
}
.invoice-print-sheet .invoice-purpose.is-empty { display: none !important; }
.invoice-print-sheet .preview-items {
  width: 100%; border-collapse: collapse; margin: 1mm 0 3mm; table-layout: fixed;
  flex: 1 1 auto; min-height: 0; border: 0.5pt solid #cfe3ea; border-radius: 2mm; overflow: hidden;
}
.invoice-print-sheet .preview-items th,
.invoice-print-sheet .preview-items td {
  border-bottom: 0.45pt solid #dbeaf0; padding: 5.5px 5px;
  text-align: left; font-size: 9pt; vertical-align: top;
}
.invoice-print-sheet .preview-items th {
  background: #0e7490; color: #ecfeff; font-size: 7.2pt; text-transform: uppercase;
  letter-spacing: 0.05em; font-weight: 700; border-bottom: none;
}
.invoice-print-sheet .preview-items th:nth-child(2),
.invoice-print-sheet .preview-items td:nth-child(2),
.invoice-print-sheet .preview-items th:nth-child(3),
.invoice-print-sheet .preview-items td:nth-child(3),
.invoice-print-sheet .preview-items th:nth-child(4),
.invoice-print-sheet .preview-items td:nth-child(4) { text-align: right; width: 18%; }
.invoice-print-sheet .preview-items th:nth-child(1),
.invoice-print-sheet .preview-items td:nth-child(1) { width: 46%; }
.invoice-print-sheet .totals {
  margin: 2mm 0 0 auto; width: 58%; font-size: 9.5pt;
  padding: 0; border: none; background: transparent; flex: 0 0 auto;
}
.invoice-print-sheet .totals-lines {
  padding: 2mm 2.6mm; border: 0.55pt solid #cfe3ea; border-radius: 2.5mm 2.5mm 0 0;
  background: #f5fafc;
}
.invoice-print-sheet .totals-line,
.invoice-print-sheet .totals p {
  display: flex; justify-content: space-between; gap: 10px; margin: 3px 0;
}
.invoice-print-sheet .totals-line.hidden,
.invoice-print-sheet .totals-line[hidden] { display: none !important; }
.invoice-print-sheet .grand-total-plaque {
  display: flex; flex-direction: column; gap: 1mm;
  padding: 2.6mm 3mm; border-radius: 0 0 2.5mm 2.5mm;
  background: linear-gradient(135deg, #0e7490, #134e4a);
  color: #ffffff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.invoice-print-sheet .grand-total-kicker {
  font-size: 7.5pt; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: #a5f3fc; opacity: 0.95;
}
.invoice-print-sheet .grand-total-amount,
.invoice-print-sheet #previewTotal {
  font-size: 16pt; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; line-height: 1.1;
}
.invoice-print-sheet .grand-total {
  border-top: none; padding-top: 0; font-size: 16pt; font-weight: 800; color: #fff;
}
.invoice-print-sheet .invoice-warning {
  margin: 3mm 0 0; padding: 2.2mm 2.8mm;
  border: 0.7pt solid #f59e0b; border-radius: 2.5mm; background: #fffbeb;
  flex: 0 0 auto;
}
.invoice-print-sheet .invoice-warning.is-empty { display: none !important; }
.invoice-print-sheet .invoice-warning h3 {
  margin: 0 0 2px; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; color: #b45309;
}
.invoice-print-sheet .invoice-warning p {
  margin: 0; white-space: pre-wrap; font-size: 9pt; line-height: 1.35; color: #7c2d12;
}
.invoice-print-sheet .invoice-closing {
  display: grid; grid-template-columns: 1fr; gap: 2mm;
  margin-top: auto; padding-top: 2mm; flex: 0 0 auto;
}
.invoice-print-sheet .invoice-closing-main { display: grid; gap: 2mm; }
.invoice-print-sheet .invoice-sig-plate { display: none !important; }
.invoice-print-sheet .invoice-bank,
.invoice-print-sheet .note-box {
  margin-top: 0; padding: 2mm 2.4mm;
  border: 0.55pt solid #cfe3ea; border-radius: 2.2mm; font-size: 8.5pt;
  flex: 0 0 auto; box-sizing: border-box; width: 100%; max-width: 118mm; background: #f8fbfd;
}
.invoice-print-sheet .note-box { border-style: dashed; background: #fff; }
.invoice-print-sheet .invoice-bank.is-empty,
.invoice-print-sheet .note-box.is-empty { display: none !important; }
.invoice-print-sheet .invoice-bank h3,
.invoice-print-sheet .note-box h3 {
  margin: 0 0 2px; font-size: 7pt; text-transform: uppercase;
  letter-spacing: 0.08em; color: #0e7490; font-weight: 750;
}
.invoice-print-sheet .invoice-bank p,
.invoice-print-sheet .note-box p { margin: 0; line-height: 1.35; }
.invoice-print-sheet .preview-company-logo {
  max-height: 15mm; max-width: 38mm; width: auto; height: auto; object-fit: contain;
}
.invoice-print-sheet .wp-sig-layer {
  position: absolute !important;
  z-index: 8 !important;
  right: auto !important; bottom: auto !important;
  margin: 0 !important; padding: 0 !important;
  border: none !important; background: transparent !important;
  box-shadow: none !important; outline: none !important;
  transform-origin: top left !important;
}
.invoice-print-sheet .wp-sig-layer #signaturePreview {
  max-width: 100%; height: auto; display: block;
}
.invoice-print-sheet .wp-sig-line {
  border-bottom: 0.7pt solid #0e7490; margin: 0 0 3px; min-height: 1px; opacity: 0.55;
}
.invoice-print-sheet .signature-name {
  margin: 2px 0 0; font-size: 8.5pt; color: #0f172a;
}
.invoice-print-sheet .signature-name.is-hidden,
.invoice-print-sheet .wp-sig-line.is-hidden,
.invoice-print-sheet .hidden,
.invoice-print-sheet [hidden],
.invoice-print-sheet .sig-ui-chrome,
.invoice-print-sheet .wp-sig-chrome,
.invoice-print-sheet .signature-mode-badge,
.invoice-print-sheet .wp-sig-seal,
.invoice-print-sheet #signatureSealBadge {
  display: none !important;
}
`;
  }

  function printHtml(html, title, opts = {}) {
    let frame = document.getElementById("workpassPrintFrame");
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "workpassPrintFrame";
      frame.title = "Druck";
      frame.setAttribute("aria-hidden", "true");
      Object.assign(frame.style, {
        position: "fixed", right: "0", bottom: "0", width: "0", height: "0",
        border: "0", opacity: "0", pointerEvents: "none",
      });
      document.body.appendChild(frame);
    }
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      window.alert("Druckfenster nicht verfügbar.");
      return false;
    }
    const safeTitle = String(title || "WorkPass")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const styleBlock = opts.standalone
      ? `<style id="workpassInvoicePrintCss">${opts.css || invoicePrintCss()}</style>`
      : collectPrintStyles();
    const full = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${safeTitle}</title>
${styleBlock}
</head><body class="${opts.bodyClass || "invoice-print-root"}">${html}</body></html>`;
    doc.open();
    doc.write(full);
    doc.close();

    const runPrint = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.alert("Druck fehlgeschlagen.");
      }
    };

    const waitImages = () => {
      const imgs = Array.from(doc.images || []);
      if (!imgs.length) {
        setTimeout(runPrint, 120);
        return;
      }
      Promise.all(imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 1500);
        });
      })).then(() => setTimeout(runPrint, 80));
    };
    setTimeout(waitImages, 60);
    return true;
  }

  /**
   * Clean single-page invoice print — only the A4 Blatt, no app chrome, no blank pages.
   */
  function printInvoice(sourceEl, title) {
    if (!sourceEl) return false;
    const liveStage = sourceEl.id === "invoiceDocStage" || sourceEl.classList?.contains("invoice-doc-stage")
      ? sourceEl
      : sourceEl.querySelector?.("#invoiceDocStage, .invoice-doc-stage");
    const root = (liveStage || sourceEl).cloneNode(true);

    [
      ".preview-tools",
      ".sig-ui-chrome",
      ".wp-sig-chrome",
      ".signature-mode-badge",
      ".wp-sig-seal",
      "#signatureSealBadge",
      ".mode-payroll-only",
      "#payrollSheet",
      "#verdienstSheet",
      "#annualTaxSheet",
      "#datevSheetHost",
      "#portalCertPrintHost",
    ].forEach((sel) => root.querySelectorAll(sel).forEach((n) => n.remove()));

    root.querySelectorAll(".hidden, [hidden]").forEach((node) => {
      if (node.id === "signaturePreviewBox" || node.classList.contains("wp-sig-layer")) {
        // keep signature box; only hide if mode none left it hidden
        return;
      }
      node.remove();
    });
    root.querySelectorAll("#invoiceNoteBlock.is-empty, #invoiceBankBlock.is-empty, #invoicePurposeBlock.is-empty, #invoiceWarningBlock.is-empty, .note-box.is-empty, .invoice-bank.is-empty, .invoice-purpose.is-empty, .invoice-warning.is-empty, .invoice-sig-plate")
      .forEach((n) => n.remove());

    root.id = "invoicePrintSheet";
    root.className = "invoice-print-sheet";
    root.removeAttribute("style");
    root.style.cssText = "";

    const sig = root.querySelector("#signaturePreviewBox, .wp-sig-layer");
    if (sig) {
      sig.classList.remove("is-selected", "is-dragging", "is-empty", "hidden");
      sig.removeAttribute("hidden");
      sig.removeAttribute("tabindex");
      // Keep left/top/width/transform from the live clone (already on attributes/style)
      const liveSig = (liveStage || sourceEl).querySelector?.("#signaturePreviewBox, .wp-sig-layer");
      if (liveSig) {
        sig.style.position = "absolute";
        sig.style.left = liveSig.style.left || "58%";
        sig.style.top = liveSig.style.top || "78%";
        sig.style.width = liveSig.style.width || "34%";
        sig.style.right = "auto";
        sig.style.bottom = "auto";
        sig.style.opacity = liveSig.style.opacity || "1";
        sig.style.transform = liveSig.style.transform || "none";
        sig.style.transformOrigin = "top left";
        sig.style.margin = "0";
        sig.style.border = "none";
        sig.style.background = "transparent";
        if (liveSig.hidden || liveSig.classList.contains("hidden")) {
          sig.remove();
        }
      }
    }

    return printHtml(root.outerHTML, title || "Rechnung", {
      standalone: true,
      css: invoicePrintCss(),
      bodyClass: "invoice-print-root",
    });
  }

  /**
   * Print one element. For #invoicePreview, strip payroll/annual hosts so only the Rechnung prints.
   * @param {Element} el
   * @param {string} title
   * @param {{ invoiceOnly?: boolean, strip?: string[], standalone?: boolean }} [opts]
   */
  function printElement(el, title, opts = {}) {
    if (!el) return false;
    if (opts.invoiceOnly || el.id === "invoicePreview" || el.classList?.contains("pdf-export-clone")
      || el.id === "invoiceDocStage" || el.classList?.contains("invoice-doc-stage")) {
      return printInvoice(el, title);
    }

    const clone = el.cloneNode(true);
    const stripSelectors = [
      ...(opts.strip || []),
      ".preview-tools",
      ".sig-ui-chrome",
      ".wp-sig-chrome",
      ".signature-mode-badge",
    ];
    stripSelectors.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((node) => node.remove());
    });
    clone.querySelectorAll(".hidden, [hidden]").forEach((node) => node.remove());

    const html = clone.outerHTML;
    return printHtml(html, title, { standalone: Boolean(opts.standalone) });
  }

  function readInvoiceArchive() {
    try {
      const raw = JSON.parse(localStorage.getItem(INVOICE_ARCHIVE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveInvoiceArchive(list) {
    localStorage.setItem(INVOICE_ARCHIVE_KEY, JSON.stringify((list || []).slice(0, 80)));
  }

  function upsertInvoice(entry) {
    if (!entry?.number) return;
    const list = readInvoiceArchive().filter((x) => x.number !== entry.number);
    list.unshift({
      number: entry.number,
      buyer: entry.buyer || "",
      total: entry.total || "",
      date: entry.date || "",
      savedAt: new Date().toISOString(),
      draft: entry.draft || null,
      source: "local",
    });
    saveInvoiceArchive(list);
    renderInvoiceArchive();
  }

  function setServerInvoices(items) {
    serverInvoiceItems = Array.isArray(items) ? items : [];
    renderInvoiceArchive();
  }

  function mergedArchiveList() {
    const local = readInvoiceArchive().map((x) => ({ ...x, source: x.source || "local" }));
    const byNumber = new Map();
    local.forEach((x) => {
      if (x.number) byNumber.set(String(x.number), x);
    });
    serverInvoiceItems.forEach((s) => {
      const number = String(s.number || "");
      if (!number) return;
      const prev = byNumber.get(number);
      const total = s.gross != null
        ? Number(s.gross).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (prev?.total || "");
      byNumber.set(number, {
        number,
        buyer: (s.customer || "").split("\n")[0] || prev?.buyer || "",
        total: total || prev?.total || "",
        date: s.invoiceDate || prev?.date || "",
        savedAt: s.releasedAt || s.updatedAt || prev?.savedAt || "",
        draft: prev?.draft || null,
        serverId: s.id || null,
        status: s.status || "released",
        source: prev?.draft ? "both" : "server",
      });
    });
    return Array.from(byNumber.values()).sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  }

  function formatInvoiceNrLabel(number) {
    const n = String(number || "").trim();
    if (!n) return "Nr. —";
    return /^nr\.?\s*/i.test(n) ? n : `Nr. ${n}`;
  }

  function archiveSearchQuery() {
    const el = document.getElementById("invoiceArchiveSearch");
    return String(el?.value || "").trim().toLowerCase();
  }

  function filterArchiveList(list) {
    const q = archiveSearchQuery();
    if (!q) return list;
    return list.filter((item) => {
      const number = String(item.number || "").toLowerCase();
      const buyer = String(item.buyer || "").toLowerCase();
      const total = String(item.total || "").toLowerCase();
      const date = String(item.date || "").toLowerCase();
      return number.includes(q)
        || buyer.includes(q)
        || total.includes(q)
        || date.includes(q)
        || formatInvoiceNrLabel(item.number).toLowerCase().includes(q);
    });
  }

  function renderInvoiceArchive() {
    const host = document.getElementById("invoiceArchiveList");
    if (!host) return;
    const all = mergedArchiveList();
    const list = filterArchiveList(all);
    const tt = (k, fb) => {
      const v = window.WorkPassI18n?.t?.(k);
      return (v && v !== k) ? v : fb;
    };
    if (!all.length) {
      host.innerHTML = `<p class="muted small">${tt("hub.invoiceArchiveEmpty", "Noch keine gespeicherten oder freigegebenen Rechnungen.")}</p>`;
      return;
    }
    if (!list.length) {
      host.innerHTML = `<p class="muted small">${tt("hub.invoiceArchiveNoMatch", "Keine Rechnung zu diesem Kunden oder dieser Nr. RE- gefunden.")}</p>`;
      return;
    }
    const openLabel = tt("lohn.open", "Öffnen");
    const customerLabel = tt("hub.invoiceArchiveCustomer", "Kunde");
    // Keep full filtered list (archive capped at 80). Without search, show recent 40.
    const visible = archiveSearchQuery() ? list : list.slice(0, 40);
    host.innerHTML = visible.map((item) => {
      const badge = item.source === "server"
        ? `<span class="inv-badge">${tt("hub.badgeServer", "Server")}</span>`
        : (item.source === "both"
          ? `<span class="inv-badge">${tt("hub.badgeBoth", "Lokal+Server")}</span>`
          : `<span class="inv-badge inv-badge-local">${tt("hub.badgeLocal", "Lokal")}</span>`);
      const buyer = String(item.buyer || "").trim() || "—";
      const metaParts = [item.total, item.date, item.status].filter(Boolean);
      return `
      <div class="invoice-archive-item" role="listitem" data-number="${escapeAttr(item.number)}" data-server-id="${escapeAttr(item.serverId || "")}" data-buyer="${escapeAttr(buyer)}">
        <div class="invoice-archive-item-main">
          <div class="invoice-archive-nr"><strong>${escapeHtml(formatInvoiceNrLabel(item.number))}</strong> ${badge}</div>
          <div class="invoice-archive-buyer"><span class="invoice-archive-buyer-lab">${escapeHtml(customerLabel)}:</span> ${escapeHtml(buyer)}</div>
          ${metaParts.length ? `<div class="muted small invoice-archive-meta">${escapeHtml(metaParts.join(" · "))}</div>` : ""}
        </div>
        <button type="button" class="inv-open">${openLabel}</button>
      </div>`;
    }).join("");
    host.querySelectorAll(".inv-open").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest("[data-number]");
        const num = row?.getAttribute("data-number");
        const serverId = row?.getAttribute("data-server-id") || "";
        const item = mergedArchiveList().find((x) => x.number === num);
        if (item?.draft) {
          window.dispatchEvent(new CustomEvent("workpass:load-invoice", { detail: item.draft }));
          return;
        }
        if (serverId && typeof window.hubApiFetch === "function") {
          try {
            const data = await window.hubApiFetch(`/v1/invoice/${encodeURIComponent(serverId)}`);
            const draft = data?.job?.hubEntry?.draft || data?.job?.draft;
            if (draft?.invoiceNumber || draft?.number || data?.job?.hubEntry?.draft) {
              const payload = data.job.hubEntry?.draft || {
                documentType: "invoice",
                invoiceNumber: data.job.draft?.number,
                invoiceDate: data.job.draft?.invoiceDate,
                seller: data.job.draft?.seller,
                customer: data.job.draft?.customer,
                taxRate: String(data.job.draft?.taxRate ?? 19),
                items: (data.job.draft?.items || []).map((it) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                })),
              };
              window.dispatchEvent(new CustomEvent("workpass:load-invoice", { detail: payload }));
              return;
            }
          } catch (e) {
            window.alert(e?.message || "Rechnung vom Server konnte nicht geladen werden.");
            return;
          }
        }
        window.alert("Kein Entwurf für diese Rechnung gespeichert.");
      });
    });
  }

  function readSyncLog() {
    try {
      const raw = JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function pushSyncLog(entry) {
    const list = readSyncLog();
    list.unshift({
      at: new Date().toISOString(),
      message: entry.message || "",
      payrollReleased: Number(entry.payrollReleased || 0),
      invoicesReleased: Number(entry.invoicesReleased || 0),
      pending: Number(entry.pending || 0),
    });
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(list.slice(0, 40)));
    renderSyncLog();
  }

  function t(key, fb, vars) {
    const v = window.WorkPassI18n?.t?.(key, vars);
    return (v && v !== key) ? v : (fb || key);
  }

  function localizeStoredSyncMessage(msg) {
    const raw = String(msg || "").trim();
    if (!raw) return t("hub.syncChecked", "Sync geprüft");
    if (/Webhook-Key abgelehnt/i.test(raw) || /webhook.?key.*(abgelehnt|rejected)/i.test(raw)) {
      return t(
        "hub.webhookKeyRejected",
        "Webhook-Key abgelehnt. Railway WORKPASS_PLATFORM_WEBHOOK_KEY und Plattform-Secret müssen exakt übereinstimmen."
      );
    }
    if (/Kein Webhook-Key/i.test(raw)) {
      return t(
        "hub.webhookKeyMissing",
        "Kein Webhook-Key. Railway: WORKPASS_PLATFORM_WEBHOOK_KEY setzen (gleicher Wert wie auf der Plattform)."
      );
    }
    if (/WORKPASS_API_KEY als Webhook-Key/i.test(raw)) {
      return t(
        "hub.webhookKeyWrongSecret",
        "Es wurde WORKPASS_API_KEY als Webhook-Key genutzt. Setze WORKPASS_PLATFORM_WEBHOOK_KEY auf denselben Secret wie die Plattform."
      );
    }
    if (/Sync geprüft/i.test(raw)) return t("hub.syncChecked", "Sync geprüft");
    return raw;
  }

  function renderSyncLog() {
    const host = document.getElementById("hubSyncLogList");
    if (!host) return;
    const list = readSyncLog();
    if (!list.length) {
      host.innerHTML = `<p class="muted small">${escapeHtml(t("hub.syncEmpty", "Noch keine Sync-Einträge."))}</p>`;
      return;
    }
    host.innerHTML = `<ul class="hub-sync-log">${list.slice(0, 12).map((e) => `
      <li><strong>${escapeHtml(String(e.at || "").replace("T", " ").slice(0, 19))}</strong>
        · ${escapeHtml(localizeStoredSyncMessage(e.message))}
        · ${escapeHtml(t("hub.syncLogCounts", "Lohn {p} · Rechnungen {i}", {
          p: e.payrollReleased || 0,
          i: e.invoicesReleased || 0,
        }))}
      </li>`).join("")}</ul>`;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  async function bindPinChange() {
    const btn = document.getElementById("btnChangePin");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const oldPin = String(document.getElementById("pinOld")?.value || "").trim();
      const newPin = String(document.getElementById("pinNew")?.value || "").trim();
      const conf = String(document.getElementById("pinNewConfirm")?.value || "").trim();
      if (newPin !== conf) {
        window.alert(t("hub.pinMismatch", "Neue PIN und Bestätigung stimmen nicht überein."));
        return;
      }
      const res = await window.WorkPassAuth?.changePin(oldPin, newPin);
      if (!res?.ok) {
        window.alert(res?.error || t("hub.pinChangeFail", "PIN konnte nicht geändert werden."));
        return;
      }
      window.alert(t("hub.pinChanged", "PIN wurde geändert."));
      ["pinOld", "pinNew", "pinNewConfirm"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    });
  }

  function bootI18n() {
    if (!window.WorkPassI18n) return;
    window.WorkPassI18n.init();
    const host = document.getElementById("wpLangHost")
      || document.querySelector(".lex-appbar-right")
      || document.querySelector(".wp-appbar-actions");
    window.WorkPassI18n.mountSelect(host, "wpLangSelectHub");
    window.WorkPassI18n.applyDom(document);
    window.addEventListener("workpass:locale", () => {
      window.WorkPassI18n?.applyDom?.(document);
      renderSyncLog();
      renderInvoiceArchive();
    });
  }

  function listInvoices() {
    return mergedArchiveList();
  }

  function findInvoices(query) {
    const q = String(query || "").trim().toLowerCase();
    const list = mergedArchiveList();
    if (!q) return list.slice(0, 12);
    return list.filter((item) => {
      const number = String(item.number || "").toLowerCase();
      const buyer = String(item.buyer || "").toLowerCase();
      const label = formatInvoiceNrLabel(item.number).toLowerCase();
      return number.includes(q) || buyer.includes(q) || label.includes(q);
    }).slice(0, 20);
  }

  function bindArchiveSearch() {
    const input = document.getElementById("invoiceArchiveSearch");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    let timer = 0;
    const refresh = () => renderInvoiceArchive();
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 120);
    });
    input.addEventListener("search", refresh);
  }

  function apiOrigin() {
    const h = String(location.hostname || "");
    if (h === "localhost" || h === "127.0.0.1" || location.protocol === "file:") {
      return "http://127.0.0.1:8787";
    }
    return String(location.origin || "").replace(/\/+$/, "");
  }

  function openHubAdminTab() {
    const tab = document.getElementById("sidebarAdminTab")
      || document.querySelector('.form-tab[data-tab="admin"]');
    if (tab) {
      tab.hidden = false;
      tab.click();
      return true;
    }
    return false;
  }

  function openFullAdminPage(ev) {
    if (ev) ev.preventDefault();
    try {
      const raw =
        localStorage.getItem("workpassPlatformSessionV2")
        || sessionStorage.getItem("workpassPlatformSessionV2")
        || localStorage.getItem("workpassPlatformSessionV1");
      if (!raw) {
        location.assign("admin.html#adminHelpContactPanel");
        return;
      }
      const s = JSON.parse(raw);
      if (!(s?.token && s?.user?.role === "admin")) {
        location.assign("admin.html#adminHelpContactPanel");
        return;
      }
      localStorage.setItem("workpassAdminSessionV2", raw);
      try { sessionStorage.setItem("workpassAdminHash", "adminHelpContactPanel"); } catch { /* ignore */ }
      const payload = encodeURIComponent(JSON.stringify({
        token: s.token,
        expiresAt: s.expiresAt || null,
        user: s.user,
        via: "hub-admin-handoff",
        preferredLocale: s.preferredLocale || s.user?.locale || "",
      }));
      location.assign(`admin.html#suppix-sso=${payload}`);
    } catch {
      location.assign("admin.html#adminHelpContactPanel");
    }
  }

  async function hubAdminFetch(path, opts = {}) {
    const token = window.WorkPassAuth?.getSessionToken?.() || "";
    const res = await fetch(`${apiOrigin()}${path}`, {
      ...opts,
      headers: {
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-WorkPass-Session": token } : {}),
        ...(opts.headers || {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  function fillHubHelpContactForm(contact) {
    const c = contact || {};
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val == null ? "" : String(val);
    };
    set("hubHelpContactProduct", c.product);
    set("hubHelpContactEmail", c.email);
    set("hubHelpContactPhone", c.phone);
    set("hubHelpContactWhatsapp", c.whatsapp);
    set("hubHelpContactWebsite", c.website);
    set("hubHelpContactWebsiteLabel", c.websiteLabel);
    set("hubHelpContactHours", c.hoursDe);
    const meta = document.getElementById("hubHelpContactMeta");
    if (meta) {
      if (c.updatedAt) {
        meta.hidden = false;
        meta.textContent = t("admin.helpContactMeta", "Zuletzt gespeichert: {when}{by}", {
          when: new Date(c.updatedAt).toLocaleString(),
          by: c.updatedBy ? t("admin.helpContactBy", " · von {who}", { who: c.updatedBy }) : "",
        });
      } else {
        meta.hidden = true;
        meta.textContent = "";
      }
    }
  }

  function readHubHelpContactForm() {
    return {
      product: document.getElementById("hubHelpContactProduct")?.value || "",
      email: document.getElementById("hubHelpContactEmail")?.value || "",
      phone: document.getElementById("hubHelpContactPhone")?.value || "",
      whatsapp: document.getElementById("hubHelpContactWhatsapp")?.value || "",
      website: document.getElementById("hubHelpContactWebsite")?.value || "",
      websiteLabel: document.getElementById("hubHelpContactWebsiteLabel")?.value || "",
      hoursDe: document.getElementById("hubHelpContactHours")?.value || "",
    };
  }

  async function loadHubHelpContactForm() {
    const status = document.getElementById("hubHelpContactStatus");
    try {
      const data = await hubAdminFetch("/v1/admin/help-contact");
      fillHubHelpContactForm(data.contact || data);
      if (status) status.textContent = "";
    } catch (e) {
      if (status) status.textContent = e.message || String(e);
    }
  }

  function bindHubAdminPanel() {
    const saveBtn = document.getElementById("btnHubHelpContactSave");
    const reloadBtn = document.getElementById("btnHubHelpContactReload");
    const fullBtn = document.getElementById("btnHubOpenFullAdmin");
    if (saveBtn && saveBtn.dataset.bound !== "1") {
      saveBtn.dataset.bound = "1";
      saveBtn.addEventListener("click", async () => {
        const status = document.getElementById("hubHelpContactStatus");
        saveBtn.disabled = true;
        try {
          const data = await hubAdminFetch("/v1/admin/help-contact", {
            method: "PUT",
            body: JSON.stringify(readHubHelpContactForm()),
          });
          fillHubHelpContactForm(data.contact || data);
          if (status) {
            status.textContent = t(
              "admin.helpContactSavedPublic",
              "Gespeichert – sichtbar für alle Firmen unter Hub → Hilfe."
            );
            status.style.color = "#86efac";
          }
          if (typeof window.loadHelpContactFromServer === "function") {
            window.loadHelpContactFromServer();
          }
        } catch (e) {
          if (status) {
            status.textContent = e.message || String(e);
            status.style.color = "";
          }
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
    if (reloadBtn && reloadBtn.dataset.bound !== "1") {
      reloadBtn.dataset.bound = "1";
      reloadBtn.addEventListener("click", () => loadHubHelpContactForm());
    }
    if (fullBtn && fullBtn.dataset.bound !== "1") {
      fullBtn.dataset.bound = "1";
      fullBtn.addEventListener("click", openFullAdminPage);
    }
    const top = document.getElementById("hubTopAdminLink");
    if (top && top.dataset.bound !== "1") {
      top.dataset.bound = "1";
      top.addEventListener("click", (ev) => {
        ev.preventDefault();
        openHubAdminTab();
      });
    }
  }

  function boot() {
    document.body.classList.add("workpass-hub");
    document.documentElement.classList.add("hub-desktop");
    bootI18n();
    bindArchiveSearch();
    renderInvoiceArchive();
    renderSyncLog();
    bindPinChange();
    bindHubAdminPanel();
    window.WorkPassAuth?.init({
      onUnlock: () => {
        document.body.classList.remove("auth-locked");
        const companyUser = window.WorkPassAuth?.isCompanyPortalUser?.();
        const user = window.WorkPassAuth?.getSessionUser?.();
        const isAdminUser = user?.role === "admin";
        document.body.classList.toggle("company-portal", Boolean(companyUser));
        document.body.classList.toggle("hub-admin-session", Boolean(isAdminUser && !companyUser));
        document.querySelectorAll(".hub-admin-only").forEach((el) => {
          el.hidden = !(isAdminUser && !companyUser);
        });
        const badge = document.getElementById("hubCompanyBadge");
        if (badge) {
          if (companyUser) {
            badge.hidden = false;
            badge.textContent = t("hub.firmLine", "Firma · {id}", { id: user.companyId });
          } else if (isAdminUser) {
            badge.hidden = false;
            badge.textContent = t("hub.adminLine", "Accounting Admin · kein Firmen-Portal");
          } else {
            badge.hidden = true;
          }
        }
        let adminBanner = document.getElementById("hubAdminSessionBanner");
        if (isAdminUser && !companyUser) {
          if (!adminBanner) {
            adminBanner = document.createElement("p");
            adminBanner.id = "hubAdminSessionBanner";
            adminBanner.className = "wp-hub-banner";
            adminBanner.setAttribute("role", "status");
            const host = document.querySelector(".app-main") || document.getElementById("invoiceForm") || document.body;
            host.prepend(adminBanner);
          }
          adminBanner.hidden = false;
          adminBanner.innerHTML =
            `<span>${t(
              "hub.adminBanner",
              "Sie sind als Accounting-Admin angemeldet. Hilfe-Kontakt links unter Admin bearbeiten — ohne erneutes Anmelden."
            )}</span> ` +
            `<button type="button" class="hub-admin-cta" id="hubAdminOpenPanelBtn">${t(
              "hub.adminOpenContacts",
              "Hilfe-Kontakt öffnen"
            )}</button>`;
          document.getElementById("hubAdminOpenPanelBtn")?.addEventListener("click", () => {
            openHubAdminTab();
            loadHubHelpContactForm();
          });
          // Pre-mirror session so optional full Admin page opens without gate
          try {
            const raw = localStorage.getItem("workpassPlatformSessionV2");
            if (raw) {
              const s = JSON.parse(raw);
              if (s?.token && s?.user?.role === "admin") {
                localStorage.setItem("workpassAdminSessionV2", raw);
              }
            }
          } catch { /* ignore */ }
        } else if (adminBanner) {
          adminBanner.hidden = true;
        }
        window.WorkPassI18n?.syncFromSession?.();
        renderInvoiceArchive();
        renderSyncLog();
        if (typeof window.updateDashboard === "function") {
          window.updateDashboard();
        } else {
          window.addEventListener("load", () => window.updateDashboard?.(), { once: true });
        }
      },
    });
  }

  window.WorkPassHub = {
    printHtml,
    printElement,
    openHubAdminTab,
    openFullAdminPage,
    loadHubHelpContactForm,
    printInvoice,
    upsertInvoice,
    readInvoiceArchive,
    renderInvoiceArchive,
    listInvoices,
    findInvoices,
    setServerInvoices,
    pushSyncLog,
    readSyncLog,
    renderSyncLog,
    INVOICE_ARCHIVE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
