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
  border-bottom: 1.6pt solid #1e3a5f;
}
.invoice-doc-stage .invoice-top h2 { margin: 0; font-size: 18pt; color: #0f172a; }
.invoice-doc-stage .dates { text-align: right; font-size: 9pt; color: #334155; }
.invoice-doc-stage .invoice-meta { font-size: 8.5pt; color: #475569; margin: 6px 0 12px; }
.invoice-doc-stage .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
.invoice-doc-stage .addresses h3 {
  margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;
}
.invoice-doc-stage pre { margin: 0; font-family: inherit; white-space: pre-wrap; font-size: 10pt; line-height: 1.35; }
.preview-items { width: 100%; border-collapse: collapse; margin: 10px 0 6px; }
.preview-items th, .preview-items td {
  border-bottom: 0.6pt solid #cbd5e1; padding: 7px 5px; text-align: left; font-size: 9.5pt;
}
.preview-items th {
  background: #f1f5f9; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em;
}
.preview-items th:last-child, .preview-items td:last-child,
.preview-items td:nth-child(2), .preview-items td:nth-child(3) { text-align: right; }
.totals { margin: 16px 0 0 auto; width: 55%; font-size: 10pt; }
.totals p { display: flex; justify-content: space-between; gap: 10px; margin: 6px 0; }
.grand-total { border-top: 1.4pt solid #0f172a; padding-top: 8px; font-size: 12pt; font-weight: 700; }
.invoice-bank, .note-box {
  margin-top: 16px; padding: 8px 10px; border: 0.6pt solid #e2e8f0; border-radius: 4px; font-size: 9pt;
}
.note-box { border-style: dashed; }
.invoice-bank h3, .note-box h3 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; color: #64748b; }
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
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  margin: 0;
  padding: 14mm 16mm 14mm;
  overflow: hidden;
  background: #fff;
  color: #121518;
  border: none;
  box-shadow: none;
}
.invoice-print-sheet .invoice-top {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  padding-bottom: 8px; margin: 0 0 10px;
  border-bottom: 1.5pt solid #1e3a5f;
}
.invoice-print-sheet .invoice-top-left { display: flex; align-items: center; gap: 10px; }
.invoice-print-sheet .invoice-top h2 { margin: 0; font-size: 17pt; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
.invoice-print-sheet #previewInvoiceNumber { margin: 2px 0 0; font-size: 9.5pt; color: #334155; }
.invoice-print-sheet .dates { text-align: right; font-size: 8.5pt; color: #334155; line-height: 1.45; }
.invoice-print-sheet .dates p { margin: 0 0 2px; }
.invoice-print-sheet .dates span { color: #64748b; }
.invoice-print-sheet .status-badge {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  font-size: 7.5pt; font-weight: 600; background: #e2e8f0; color: #0f172a;
}
.invoice-print-sheet .invoice-meta {
  display: flex; flex-wrap: wrap; gap: 4px 14px;
  margin: 0 0 12px; font-size: 8pt; color: #475569;
}
.invoice-print-sheet .invoice-meta p { margin: 0; }
.invoice-print-sheet .addresses {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0 0 14px;
}
.invoice-print-sheet .addresses h3 {
  margin: 0 0 3px; font-size: 7.5pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;
}
.invoice-print-sheet pre {
  margin: 0; font-family: inherit; white-space: pre-wrap;
  font-size: 9.5pt; line-height: 1.35; color: #0f172a;
}
.invoice-print-sheet .preview-items {
  width: 100%; border-collapse: collapse; margin: 4px 0 8px; table-layout: fixed;
}
.invoice-print-sheet .preview-items th,
.invoice-print-sheet .preview-items td {
  border-bottom: 0.55pt solid #cbd5e1; padding: 6px 5px;
  text-align: left; font-size: 9pt; vertical-align: top;
}
.invoice-print-sheet .preview-items th {
  background: #f1f5f9; font-size: 7.5pt; text-transform: uppercase;
  letter-spacing: 0.04em; font-weight: 700; color: #334155;
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
  margin: 12px 0 0 auto; width: 52%; font-size: 9.5pt;
}
.invoice-print-sheet .totals p {
  display: flex; justify-content: space-between; gap: 10px; margin: 5px 0;
}
.invoice-print-sheet .grand-total {
  border-top: 1.3pt solid #0f172a; padding-top: 7px;
  font-size: 11pt; font-weight: 700;
}
.invoice-print-sheet .invoice-bank,
.invoice-print-sheet .note-box {
  margin-top: 12px; padding: 7px 9px;
  border: 0.55pt solid #e2e8f0; border-radius: 3px; font-size: 8.5pt;
}
.invoice-print-sheet .note-box { border-style: dashed; }
.invoice-print-sheet .invoice-bank h3,
.invoice-print-sheet .note-box h3 {
  margin: 0 0 3px; font-size: 7.5pt; text-transform: uppercase;
  letter-spacing: 0.05em; color: #64748b;
}
.invoice-print-sheet .invoice-bank p,
.invoice-print-sheet .note-box p { margin: 0; line-height: 1.35; }
.invoice-print-sheet .preview-company-logo {
  max-height: 16mm; max-width: 40mm; width: auto; height: auto; object-fit: contain;
}
.invoice-print-sheet .wp-sig-layer {
  position: absolute !important;
  z-index: 5 !important;
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
  border-bottom: 0.65pt solid #94a3b8; margin: 0 0 3px; min-height: 1px;
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

  function renderInvoiceArchive() {
    const host = document.getElementById("invoiceArchiveList");
    if (!host) return;
    const list = mergedArchiveList();
    if (!list.length) {
      const empty = (window.WorkPassI18n?.t?.("hub.invoiceArchiveEmpty") && window.WorkPassI18n.t("hub.invoiceArchiveEmpty") !== "hub.invoiceArchiveEmpty")
        ? window.WorkPassI18n.t("hub.invoiceArchiveEmpty")
        : "Noch keine gespeicherten oder freigegebenen Rechnungen.";
      host.innerHTML = `<p class="muted small">${empty}</p>`;
      return;
    }
    const openLabel = (window.WorkPassI18n?.t?.("lohn.open") && window.WorkPassI18n.t("lohn.open") !== "lohn.open")
      ? window.WorkPassI18n.t("lohn.open")
      : "Öffnen";
    host.innerHTML = list.slice(0, 16).map((item) => {
      const badge = item.source === "server"
        ? `<span class="inv-badge">${window.WorkPassI18n?.t?.("hub.badgeServer") || "Server"}</span>`
        : (item.source === "both"
          ? `<span class="inv-badge">${window.WorkPassI18n?.t?.("hub.badgeBoth") || "Lokal+Server"}</span>`
          : `<span class="inv-badge inv-badge-local">${window.WorkPassI18n?.t?.("hub.badgeLocal") || "Lokal"}</span>`);
      return `
      <div class="invoice-archive-item" data-number="${escapeAttr(item.number)}" data-server-id="${escapeAttr(item.serverId || "")}">
        <div>
          <strong>${escapeHtml(item.number)}</strong> ${badge}
          <div class="muted small">${escapeHtml(item.buyer || "—")} · ${escapeHtml(item.total || "")}${item.status ? ` · ${escapeHtml(item.status)}` : ""}</div>
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

  function boot() {
    document.body.classList.add("workpass-hub");
    document.documentElement.classList.add("hub-desktop");
    bootI18n();
    renderInvoiceArchive();
    renderSyncLog();
    bindPinChange();
    window.WorkPassAuth?.init({
      onUnlock: () => {
        document.body.classList.remove("auth-locked");
        const companyUser = window.WorkPassAuth?.isCompanyPortalUser?.();
        document.body.classList.toggle("company-portal", Boolean(companyUser));
        // Companies keep full Hub access (Rechnung + Mandant + Übersicht).
        // Only Admin stays hidden for firm logins.
        document.querySelectorAll('a[href="admin.html"]').forEach((a) => {
          a.hidden = Boolean(companyUser);
        });
        const user = window.WorkPassAuth?.getSessionUser?.();
        const badge = document.getElementById("hubCompanyBadge");
        if (badge) {
          if (companyUser) {
            badge.hidden = false;
            badge.textContent = t("hub.firmLine", "Firma · {id}", { id: user.companyId });
          } else {
            badge.hidden = true;
          }
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
    printInvoice,
    upsertInvoice,
    readInvoiceArchive,
    renderInvoiceArchive,
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
