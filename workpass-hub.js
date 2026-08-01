/**
 * WorkPass Hub – Auth-Boot, Druck-Helfer, Rechnungsarchiv, PIN ändern
 */
(function () {
  const INVOICE_ARCHIVE_KEY = "workpassInvoiceArchiveV1";

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
    });
    saveInvoiceArchive(list);
    renderInvoiceArchive();
  }

  function renderInvoiceArchive() {
    const host = document.getElementById("invoiceArchiveList");
    if (!host) return;
    const list = readInvoiceArchive();
    if (!list.length) {
      host.innerHTML = '<p class="muted small">Noch keine gespeicherten Rechnungen.</p>';
      return;
    }
    host.innerHTML = list.slice(0, 12).map((item) => `
      <div class="invoice-archive-item" data-number="${escapeAttr(item.number)}">
        <div>
          <strong>${escapeHtml(item.number)}</strong>
          <div class="muted small">${escapeHtml(item.buyer || "—")} · ${escapeHtml(item.total || "")}</div>
        </div>
        <button type="button" class="inv-open">Öffnen</button>
      </div>`).join("");
    host.querySelectorAll(".inv-open").forEach((btn) => {
      btn.addEventListener("click", () => {
        const num = btn.closest("[data-number]")?.getAttribute("data-number");
        const item = readInvoiceArchive().find((x) => x.number === num);
        if (!item?.draft) {
          window.alert("Kein Entwurf für diese Rechnung gespeichert.");
          return;
        }
        window.dispatchEvent(new CustomEvent("workpass:load-invoice", { detail: item.draft }));
      });
    });
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
    INVOICE_ARCHIVE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
