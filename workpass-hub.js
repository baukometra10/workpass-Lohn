/**
 * WorkPass Hub – Auth-Boot, Druck-Helfer, Rechnungsarchiv, PIN ändern
 */
(function () {
  const INVOICE_ARCHIVE_KEY = "workpassInvoiceArchiveV1";
  const SYNC_LOG_KEY = "workpassHubSyncLogV1";
  let serverInvoiceItems = [];

  function printHtml(html, title) {
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
    const full = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${title || "WorkPass"}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { margin: 0; font-family: "Barlow", "Segoe UI", sans-serif; color: #121518; }
</style></head><body>${html}</body></html>`;
    doc.open();
    doc.write(full);
    doc.close();
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.alert("Druck fehlgeschlagen.");
      }
    }, 250);
    return true;
  }

  function printElement(el, title) {
    if (!el) return false;
    return printHtml(el.outerHTML, title);
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
      host.innerHTML = '<p class="muted small">Noch keine gespeicherten oder freigegebenen Rechnungen.</p>';
      return;
    }
    host.innerHTML = list.slice(0, 16).map((item) => {
      const badge = item.source === "server"
        ? '<span class="inv-badge">Server</span>'
        : (item.source === "both" ? '<span class="inv-badge">Lokal+Server</span>' : '<span class="inv-badge inv-badge-local">Lokal</span>');
      return `
      <div class="invoice-archive-item" data-number="${escapeAttr(item.number)}" data-server-id="${escapeAttr(item.serverId || "")}">
        <div>
          <strong>${escapeHtml(item.number)}</strong> ${badge}
          <div class="muted small">${escapeHtml(item.buyer || "—")} · ${escapeHtml(item.total || "")}${item.status ? ` · ${escapeHtml(item.status)}` : ""}</div>
        </div>
        <button type="button" class="inv-open">Öffnen</button>
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

  function renderSyncLog() {
    const host = document.getElementById("hubSyncLogList");
    if (!host) return;
    const list = readSyncLog();
    if (!list.length) {
      host.innerHTML = '<p class="muted small">Noch keine Sync-Einträge.</p>';
      return;
    }
    host.innerHTML = `<ul class="hub-sync-log">${list.slice(0, 12).map((e) => `
      <li><strong>${escapeHtml(String(e.at || "").replace("T", " ").slice(0, 19))}</strong>
        · ${escapeHtml(e.message || "Sync")}
        · Lohn ${e.payrollReleased || 0} · Rechnungen ${e.invoicesReleased || 0}
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
        window.alert("Neue PIN und Bestätigung stimmen nicht überein.");
        return;
      }
      const res = await window.WorkPassAuth?.changePin(oldPin, newPin);
      if (!res?.ok) {
        window.alert(res?.error || "PIN konnte nicht geändert werden.");
        return;
      }
      window.alert("PIN wurde geändert.");
      ["pinOld", "pinNew", "pinNewConfirm"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    });
  }

  function boot() {
    document.body.classList.add("workpass-hub");
    renderInvoiceArchive();
    renderSyncLog();
    bindPinChange();
    window.WorkPassAuth?.init({
      onUnlock: () => {
        document.body.classList.remove("auth-locked");
        const companyUser = window.WorkPassAuth?.isCompanyPortalUser?.();
        document.body.classList.toggle("company-portal", Boolean(companyUser));
        document.querySelectorAll('a[href="admin.html"]').forEach((a) => {
          a.hidden = Boolean(companyUser);
        });
        const user = window.WorkPassAuth?.getSessionUser?.();
        const badge = document.getElementById("hubCompanyBadge");
        if (badge) {
          if (companyUser) {
            badge.hidden = false;
            badge.textContent = `Firma · ${user.companyId}`;
          } else {
            badge.hidden = true;
          }
        }
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
