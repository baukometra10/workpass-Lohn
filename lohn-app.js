/**
 * WorkPass Lohn – Empfang (Standalone + Plattform) + Live-A4
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const wageBody = $("wageBody");
  const statusBar = $("statusBar");
  const companySelect = $("companySelect");
  const dropTarget = $("dropTarget");

  let state = PayrollCore.defaultState();
  let useReferenceDisplay = false;
  let saveTimer = null;
  let refreshingArchive = false;
  let appReady = false;
  let recvMode = "file";
  /** Während Laden (Demo/Import/Archiv) keine Frozen-Werte verwerfen */
  let suppressExitFreeze = false;

  const FIELD_IDS = [
    "seller", "note", "taxNumber", "datevClientNo", "datevConsultantNo",
    "companyName", "mandantId",
    "employeeName", "employeeAddress", "employeeId",
    "employeeTaxId", "employeeInsuranceNo", "employeeBirthDate", "employeeEntryDate",
    "payrollMonth", "taxClass", "churchTaxRate", "churchConfession",
    "healthFund", "healthPercent", "healthAdditionalPercent",
    "taxAllowanceMonthly", "childAllowanceFactor", "factorValue",
    "netDeductions", "departmentNo",
    "workDays", "workHours", "bankName", "bankIban",
  ];

  const CHECKBOX_IDS = ["childlessPvSurcharge", "factorMethod"];

  function toast(message, type = "info") {
    const host = $("wpToastHost");
    if (!host) {
      window.alert(message);
      return;
    }
    const el = document.createElement("div");
    el.className = `wp-toast wp-toast-${type}`;
    el.innerHTML = `<strong>${type === "error" ? "Bitte ergänzen" : type === "ok" ? "Erledigt" : "Hinweis"}</strong><span>${esc(message)}</span><button type="button" class="wp-toast-x" aria-label="Schließen">×</button>`;
    el.querySelector(".wp-toast-x")?.addEventListener("click", () => el.remove());
    host.appendChild(el);
    setTimeout(() => el.classList.add("show"), 20);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 320);
    }, type === "error" ? 7000 : 4500);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureSelectValue(select, value) {
    if (!select || value == null) return;
    const v = String(value);
    if (!v) {
      select.value = "";
      return;
    }
    const exists = [...select.options].some((o) => o.value === v);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
    select.value = v;
  }

  function fillCatalogs() {
    const cat = window.WorkPassCatalogs;
    if (!cat) return;
    const kk = $("healthFund");
    if (kk && kk.tagName === "SELECT" && kk.options.length <= 1) {
      cat.HEALTH_FUNDS.forEach((h) => {
        const opt = document.createElement("option");
        opt.value = h.name;
        opt.textContent = h.name;
        opt.dataset.zusatz = String(h.zusatz);
        kk.appendChild(opt);
      });
    }
    const bank = $("bankName");
    if (bank && bank.tagName === "SELECT" && bank.options.length <= 1) {
      cat.BANKS.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        bank.appendChild(opt);
      });
    }
    const presets = $("wagePresets");
    if (presets && !presets.dataset.ready) {
      presets.dataset.ready = "1";
      presets.innerHTML = cat.WAGE_PRESETS.map((p) =>
        `<button type="button" class="wage-preset" data-code="${esc(p.code)}" data-label="${esc(p.label)}" data-st="${esc(p.taxFlag)}" data-sv="${esc(p.svFlag)}">${esc(p.label)}</button>`
      ).join("");
      presets.addEventListener("click", (e) => {
        const btn = e.target.closest(".wage-preset");
        if (!btn) return;
        const rows = readWageRows();
        rows.push({
          code: btn.dataset.code || "",
          label: btn.dataset.label || "",
          amount: 0,
          quantity: 0,
          taxFlag: btn.dataset.st || "L",
          svFlag: btn.dataset.sv || "L",
        });
        renderWageRows(rows);
        onUserEdit();
        toast(`Lohnart „${btn.dataset.label}“ hinzugefügt – Betrag eintragen.`, "ok");
      });
    }
  }

  function currentMonth() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  }

  function setModePill(label, title) {
    const pill = $("modePill");
    if (!pill) return;
    pill.textContent = label;
    if (title) pill.title = title;
  }

  function readForm() {
    FIELD_IDS.forEach((id) => {
      const el = $(id);
      if (el) state[id] = el.value;
    });
    CHECKBOX_IDS.forEach((id) => {
      const el = $(id);
      if (el) state[id] = Boolean(el.checked);
    });
    state.wageItems = readWageRows();
    state.meta = state.meta || {};
    const named = String(state.companyName || "").trim();
    if (named) {
      const lines = String(state.seller || "").split(/\n/);
      if (!lines[0]?.trim() || lines[0].trim() !== named) {
        const rest = lines.slice(1).join("\n").trim();
        state.seller = rest ? `${named}\n${rest}` : named;
        if ($("seller") && !$("seller").matches(":focus")) $("seller").value = state.seller;
      }
    }
    state.companyName = PayrollCore.companyDisplayName(state);
    if (useReferenceDisplay) state.meta.referenceDemo = "datev";
    else delete state.meta.referenceDemo;
    return state;
  }

  function writeForm() {
    FIELD_IDS.forEach((id) => {
      const el = $(id);
      if (!el) return;
      const val = state[id] != null ? String(state[id]) : "";
      if ((id === "healthFund" || id === "bankName") && el.tagName === "SELECT") {
        ensureSelectValue(el, val);
      } else {
        el.value = val;
      }
      el.readOnly = false;
      el.disabled = false;
    });
    CHECKBOX_IDS.forEach((id) => {
      const el = $(id);
      if (el) el.checked = Boolean(state[id]);
    });
    renderWageRows(state.wageItems || []);
    useReferenceDisplay = state.meta?.referenceDemo === "datev";
    toggleTaxIvBox();
    refreshCompanySelect();
  }

  function toggleTaxIvBox() {
    const box = $("taxIvBox");
    if (!box) return;
    const iv = String($("taxClass")?.value || state.taxClass || "") === "IV";
    box.hidden = !iv;
  }

  function highlightMissing(errors, soft) {
    document.querySelectorAll(".field-invalid").forEach((el) => el.classList.remove("field-invalid"));
    const map = {
      "Arbeitgeber / Firma fehlt": ["companyName", "seller"],
      "Mitarbeitername fehlt": ["employeeName"],
      "Abrechnungsmonat fehlt": ["payrollMonth"],
      "Steuerklasse fehlt": ["taxClass"],
      "Brutto fehlt (Lohnarten oder Brutto-Feld)": ["wageBody"],
      "Pers.-Nr. fehlt": ["employeeId"],
      "Geburtsdatum fehlt": ["employeeBirthDate"],
      "SV-Nummer fehlt": ["employeeInsuranceNo"],
      "Krankenkasse fehlt": ["healthFund"],
      "Bank fehlt": ["bankName"],
      "IBAN fehlt": ["bankIban"],
      "Steuer-Nr. der Firma fehlt": ["taxNumber"],
    };
    [...(errors || []), ...(soft || [])].forEach((msg) => {
      (map[msg] || []).forEach((id) => $(id)?.classList.add("field-invalid"));
    });
  }

  function readWageRows() {
    return [...wageBody.querySelectorAll("tr")].map((row) => {
      const amount = Number(row.querySelector(".w-amount")?.value) || 0;
      const qtyEl = row.querySelector(".w-qty");
      const qtyRaw = qtyEl ? String(qtyEl.value).trim() : "";
      const quantity = qtyRaw === "" ? 0 : (Number(qtyRaw) || 0);
      return {
        code: row.querySelector(".w-code")?.value.trim() || "",
        label: row.querySelector(".w-label")?.value.trim() || "",
        amount,
        taxFlag: row.querySelector(".w-tax")?.value || "L",
        svFlag: row.querySelector(".w-sv")?.value || "L",
        quantity,
        factor: amount,
      };
    });
  }

  function wageRowHtml(item) {
    const qty = Number(item.quantity) || 0;
    return `<tr>
      <td><input class="w-code" value="${esc(item.code)}" placeholder="2000" /></td>
      <td><input class="w-label" value="${esc(item.label)}" placeholder="Gehalt" /></td>
      <td><input class="w-qty" type="number" step="0.01" min="0" value="${qty > 0 ? qty : ""}" placeholder="—" title="Anzahl / Stunden" /></td>
      <td><input class="w-amount" type="number" step="0.01" min="0" value="${item.amount > 0 ? item.amount : ""}" placeholder="0,00" /></td>
      <td><select class="w-tax"><option value="L"${item.taxFlag === "L" ? " selected" : ""}>L</option><option value="P"${item.taxFlag === "P" ? " selected" : ""}>P</option><option value="F"${item.taxFlag === "F" ? " selected" : ""}>F</option></select></td>
      <td><select class="w-sv"><option value="L"${item.svFlag === "L" ? " selected" : ""}>L</option><option value="P"${item.svFlag === "P" ? " selected" : ""}>P</option><option value="N"${item.svFlag === "N" ? " selected" : ""}>N</option></select></td>
      <td><button type="button" class="w-del" title="Entfernen">×</button></td>
    </tr>`;
  }

  function renderWageRows(items) {
    const rows = items.length ? items : [{ code: "", label: "", amount: 0, taxFlag: "L", svFlag: "L" }];
    wageBody.innerHTML = rows.map(wageRowHtml).join("");
  }

  function setStatus(msg, ok) {
    statusBar.textContent = msg;
    statusBar.classList.toggle("ok", Boolean(ok));
    statusBar.classList.toggle("warn", !ok);
  }

  function setKpis(payroll) {
    const g = $("kpiGross");
    const n = $("kpiNet");
    if (g) g.textContent = payroll.gross > 0 ? PayrollCore.formatAmount(payroll.gross) : "—";
    if (n) n.textContent = payroll.net > 0 ? PayrollCore.formatAmount(payroll.net) : "—";
  }

  function setPrintHints(state, hardErrors) {
    const box = $("printHints");
    const panel = $("missingPanel");
    const soft = PayrollCore.validatePrintHints?.(state) || [];
    if (box) {
      if (hardErrors?.length) {
        box.hidden = true;
        box.textContent = "";
      } else if (!soft.length) {
        box.hidden = true;
        box.textContent = "";
      } else {
        box.hidden = false;
        box.textContent = `Vor Druck prüfen: ${soft.join(" · ")}`;
      }
    }
    if (panel) {
      const items = [...(hardErrors || []).map((e) => ({ level: "hard", text: e })), ...soft.map((e) => ({ level: "soft", text: e }))];
      if (!items.length) {
        panel.hidden = true;
        panel.innerHTML = "";
      } else {
        panel.hidden = false;
        panel.innerHTML = `
          <div class="missing-head">${hardErrors?.length ? "Pflichtfelder fehlen" : "Empfohlene Angaben"}</div>
          <ul>${items.map((i) => `<li class="missing-${i.level}">${esc(i.text)}</li>`).join("")}</ul>
        `;
      }
    }
    highlightMissing(hardErrors || [], soft);
  }

  function showMissingAlert(errors, soft = []) {
    const all = [...errors, ...soft];
    if (!all.length) return;
    toast(all.slice(0, 4).join(" · ") + (all.length > 4 ? ` · +${all.length - 4}` : ""), errors.length ? "error" : "info");
  }

  function fitSheetPreview() {
    const host = $("datevSheetHost");
    const preview = document.querySelector(".lohn-preview");
    const stage = document.querySelector(".preview-stage");
    const toolbar = preview?.querySelector(".preview-toolbar");
    const sheet = host?.querySelector(".datev-sheet-a4") || window.DatevSheet?.getSheetElement();
    if (!host || !preview || !sheet) return;

    // Echtes A4 (210×297mm) – Proportionen nie verzerren
    sheet.style.transform = "none";
    sheet.style.width = "210mm";
    sheet.style.height = "297mm";
    sheet.style.minWidth = "210mm";
    sheet.style.maxWidth = "210mm";
    host.style.width = "210mm";
    host.style.height = "297mm";

    const box = stage || preview;
    // Breite der Vorschau-Sektion füllen (kleiner Rand), A4-Proportion behalten
    const sidePad = 28;
    const availW = Math.max(280, box.clientWidth - sidePad);

    const sw = Math.round(sheet.getBoundingClientRect().width) || 794;
    const sh = Math.round(sheet.getBoundingClientRect().height) || 1123;
    const a4Ratio = 210 / 297;
    const baseW = Math.abs(sw / sh - a4Ratio) > 0.02 ? Math.round(sh * a4Ratio) : sw;
    const baseH = sh;

    // Nach Breite der Sektion skalieren – füllt die Vorschau, bleibt A4 (Höhe scrollbar)
    const scale = availW / baseW;
    const outW = Math.round(baseW * scale);
    const outH = Math.round(baseH * scale);

    sheet.style.transformOrigin = "top left";
    sheet.style.transform = `scale(${scale})`;
    host.style.width = `${outW}px`;
    host.style.height = `${outH}px`;
    host.dataset.scale = String(Number(scale.toFixed(4)));
    host.dataset.ratio = String(Number((baseW / baseH).toFixed(4)));

    if (toolbar) toolbar.style.width = `${outW}px`;
  }

  function setPreviewEmptyState(state, payroll) {
    const stage = document.querySelector(".preview-stage");
    const empty = $("previewEmpty");
    if (!stage || !empty) return;
    const hasContent = Boolean(
      String(state.employeeName || "").trim()
      || String(state.seller || "").trim()
      || (payroll?.gross || 0) > 0
    );
    empty.hidden = hasContent;
    stage.classList.toggle("is-empty", !hasContent);
  }

  function setLiveCheck(state, payroll, errors) {
    const list = $("liveCheckList");
    if (!list) return;
    const hasName = Boolean(String(state.employeeName || "").trim());
    const hasSeller = Boolean(String(state.seller || state.companyName || "").trim());
    const hasGross = (payroll?.gross || 0) > 0;
    const hasData = hasName || hasSeller || hasGross;
    const masterOk = hasName && hasSeller && Boolean(String(state.payrollMonth || "").trim()) && Boolean(String(state.taxClass || "").trim());
    const sheetOk = hasGross && (payroll?.net || 0) !== 0;
    const printOk = !(errors || []).length && sheetOk;
    const items = [
      ["data", hasData, "Daten empfangen / erfasst"],
      ["master", masterOk, "Firma · Mitarbeiter · Steuerklasse"],
      ["sheet", sheetOk, `Live-Berechnung (Netto ${payroll?.net != null ? PayrollCore.formatAmount(payroll.net) : "—"})`],
      ["print", printOk, "Druckbereit (A4)"],
    ];
    list.innerHTML = items.map(([key, ok, label]) => `
      <li data-check="${key}" class="${ok ? "done" : ""}">
        <strong>${ok ? "✓" : "○"}</strong> ${label}
      </li>`).join("");
    const hint = $("calcMethodHint");
    if (hint) {
      const legal = payroll?.legalRatesApplied ? "aktiv" : "Fallback";
      const abzug = payroll?.netDeductions > 0 ? ` · Netto-Abzüge ${PayrollCore.formatAmount(payroll.netDeductions)}` : "";
      hint.textContent = `Berechnung: BMF PAP 2026 + SGB IV (${legal})${abzug}`;
    }
  }

  function renderArchiveBoard() {
    const board = $("archiveBoard");
    if (!board) return;
    const entries = PayrollCore.listArchiveEntries();
    const current = PayrollCore.archiveKey(state);
    if (!entries.length) {
      board.innerHTML = '<p class="section-hint">Noch keine gespeicherten Abrechnungen.</p>';
      return;
    }
    board.innerHTML = entries.slice(0, 24).map((e) => `
      <button type="button" class="archive-item${e.key === current ? " active" : ""}" data-key="${esc(e.key)}">
        <div>
          <strong>${esc(e.companyName || "Firma")}</strong>
          <span>${esc(e.employeeName || "MA")} · ${esc(e.payrollMonth || "—")}</span>
        </div>
      </button>`).join("");
    board.querySelectorAll(".archive-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const loaded = PayrollCore.loadArchiveEntry(btn.dataset.key);
        if (!loaded) return;
        withFreezeGuard(() => {
          state = loaded;
          useReferenceDisplay = state.meta?.referenceDemo === "datev";
          writeForm();
          refreshNow();
        });
        setStatus(`Archiv: ${PayrollCore.companyDisplayName(state)} · ${state.payrollMonth || ""}`, true);
      });
    });
  }

  function refreshCompanySelect() {
    if (!companySelect) return;
    refreshingArchive = true;
    const entries = PayrollCore.listArchiveEntries();
    const currentKey = PayrollCore.archiveKey(state);
    const opts = ['<option value="">— aktuelle Abrechnung —</option>'];
    entries.forEach((e) => {
      const label = `${e.companyName || "Firma"} · ${e.employeeName || "MA"} · ${e.payrollMonth || "—"}`;
      opts.push(`<option value="${esc(e.key)}"${e.key === currentKey ? " selected" : ""}>${esc(label)}</option>`);
    });
    companySelect.innerHTML = opts.join("");
    refreshingArchive = false;
  }

  function applyIngestResult(result, label, source) {
    if (!result?.state) {
      setStatus(`${label}: ${(result?.errors || ["fehlgeschlagen"]).join(" · ")}`, false);
      toast(`${label}: ${(result?.errors || ["fehlgeschlagen"]).join(" · ")}`, "error");
      return;
    }
    withFreezeGuard(() => {
      state = result.state;
      useReferenceDisplay = state.meta?.referenceDemo === "datev";
      writeForm();
      refreshNow();
    });
    const warn = result.errors?.length ? ` · Hinweis: ${result.errors.join(", ")}` : "";
    setStatus(`${label} übernommen · ${PayrollCore.companyDisplayName(state)}${warn}`, result.ok);
    if (source === "platform" || source === "paste") {
      setModePill("Plattform-Empfang", "Daten empfangen – bei Bearbeitung Live-Berechnung");
    } else if (source === "csv") {
      setModePill("CSV-Import", "Importiert – bei Bearbeitung Live-Berechnung");
    }
  }

  function refreshNow() {
    if (!appReady) return;
    readForm();
    window.DatevSheet?.setBackground("blank");
    const errors = PayrollCore.validate(state);
    const { payroll } = PayrollCore.render(state, { useReferenceDisplay, blankTemplate: true });
    $("calcGross").value = payroll.gross > 0 ? PayrollCore.formatAmount(payroll.gross) : "";
    $("calcNet").value = payroll.net > 0 ? PayrollCore.formatAmount(payroll.net) : "";
    setKpis(payroll);
    setPrintHints(state, errors);
    setLiveCheck(state, payroll, errors);
    setPreviewEmptyState(state, payroll);
    requestAnimationFrame(() => fitSheetPreview());
    const company = PayrollCore.companyDisplayName(state);
    if (errors.length) {
      setStatus(`${company} · ${errors.join(" · ")}`, false);
    } else {
      setStatus(`${company} · Brutto ${PayrollCore.formatAmount(payroll.gross)} · Netto ${PayrollCore.formatAmount(payroll.net)}`, true);
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      PayrollCore.saveState(state);
      refreshCompanySelect();
      renderArchiveBoard();
    }, 350);
  }

  function refresh() {
    refreshNow();
  }

  function exitFrozenModes() {
    if (suppressExitFreeze) return false;
    let changed = false;
    if (useReferenceDisplay) {
      useReferenceDisplay = false;
      changed = true;
    }
    if (state.meta?.referenceDemo) {
      delete state.meta.referenceDemo;
      changed = true;
    }
    if (state.meta?.importedTotals) {
      delete state.meta.importedTotals;
      changed = true;
    }
    if (changed) {
      setModePill("Standalone", "Bearbeitet – Live-Berechnung aktiv");
    }
    return changed;
  }

  function onUserEdit() {
    exitFrozenModes();
    refreshNow();
  }

  function bindLiveInput(el) {
    if (!el) return;
    el.addEventListener("input", onUserEdit);
    el.addEventListener("change", onUserEdit);
  }

  function withFreezeGuard(fn) {
    suppressExitFreeze = true;
    try {
      fn();
    } finally {
      suppressExitFreeze = false;
    }
  }

  function resetNew(clearStorage) {
    if (clearStorage) {
      localStorage.removeItem(PayrollCore.STORAGE_KEY);
    }
    withFreezeGuard(() => {
      state = PayrollCore.defaultState();
      state.payrollMonth = currentMonth();
      useReferenceDisplay = false;
      writeForm();
      window.DatevSheet?.setBackground("blank");
      refreshNow();
    });
    setModePill("Standalone", "Arbeitet unabhängig von der Plattform");
    setStatus("Leere Abrechnung – manuell, Datei oder Inbox.", true);
  }

  function loadReference() {
    const ref = PayrollCore.referenceMustermannState();
    if (!ref) {
      window.alert("Referenz-Vorlage nicht gefunden.");
      return;
    }
    withFreezeGuard(() => {
      state = ref;
      useReferenceDisplay = true;
      writeForm();
      window.DatevSheet?.setBackground("blank");
      refreshNow();
    });
    setModePill("Demo", "Referenzwerte Mustermann – bei Bearbeitung wechselt die App auf Live-Berechnung");
    setStatus("Demo Mustermann geladen – Live auf dem A4-Blatt.", true);
  }

  function importPlatformFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = PayrollCore.ingestPlatformPayload(reader.result.replace(/^\uFEFF/, ""));
        applyIngestResult(result, `Datei: ${file.name}`, "platform");
      } catch (e) {
        window.alert(`Import-Fehler: ${e.message}`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function importCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = window.DatevImport?.parseDatevCsvText(reader.result.replace(/^\uFEFF/, ""));
        if (!parsed?.draft) throw new Error("Keine gültige DATEV-CSV");
        const result = PayrollCore.ingestPlatformPayload(parsed.draft);
        if (parsed.totals && result.state) result.state.meta.importedTotals = parsed.totals;
        applyIngestResult(result, `CSV: ${file.name}`, "csv");
      } catch (e) {
        window.alert(`CSV-Fehler: ${e.message}`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function applyPasteInbox() {
    const raw = String($("pasteInbox")?.value || "").trim();
    if (!raw) {
      window.alert("Bitte JSON in die Inbox einfügen.");
      return;
    }
    try {
      const result = PayrollCore.ingestPlatformPayload(raw.replace(/^\uFEFF/, ""));
      applyIngestResult(result, "Inbox / Paste", "paste");
    } catch (e) {
      window.alert(`Inbox-Fehler: ${e.message}`);
    }
  }

  function setRecvMode(mode) {
    recvMode = mode;
    document.querySelectorAll(".recv-mode").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.recv === mode);
    });
    $("panelFile").hidden = mode !== "file";
    $("panelPaste").hidden = mode !== "paste";
    if ($("panelApi")) $("panelApi").hidden = mode !== "api";
    $("panelManual").hidden = mode !== "manual";
    if (mode === "manual") {
      setModePill("Standalone", "Manuelle Erfassung ohne Plattform");
      setStatus("Manueller Modus – Felder ausfüllen, Blatt aktualisiert live.", true);
    }
    if (mode === "api") {
      setModePill("API-Bridge", "Empfang vom Platform-Bridge-Server");
      setStatus("API-Bridge – Inbox laden, prüfen, freigeben.", true);
    }
  }

  const API_CFG_KEY = "workpass.lohn.apiConfig.v1";

  function isLocalHostPage() {
    const h = String(location.hostname || "");
    return h === "localhost" || h === "127.0.0.1" || h === "" || location.protocol === "file:";
  }

  /** Same origin on Railway/hosted UI; localhost only for local bridge. */
  function defaultApiBase() {
    if (isLocalHostPage()) return "http://127.0.0.1:8787";
    return String(location.origin || "").replace(/\/+$/, "");
  }

  function defaultApiKey() {
    return isLocalHostPage() ? "workpass-dev-key" : "";
  }

  function loadApiConfigIntoForm() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(API_CFG_KEY) || "null");
    } catch {
      saved = null;
    }
    const baseEl = $("apiBaseUrl");
    const keyEl = $("apiKey");
    const companyEl = $("apiCompanyId");
    if (baseEl && !baseEl.value.trim()) {
      baseEl.value = (saved?.base && String(saved.base).trim()) || defaultApiBase();
    }
    if (keyEl && !keyEl.value.trim()) {
      keyEl.value = (saved?.key && String(saved.key).trim()) || defaultApiKey();
    }
    if (companyEl && !companyEl.value.trim() && saved?.companyId) {
      companyEl.value = String(saved.companyId);
    }
  }

  function persistApiConfig() {
    const { base, key, companyId } = apiConfig();
    try {
      localStorage.setItem(API_CFG_KEY, JSON.stringify({ base, key, companyId }));
    } catch {
      /* ignore quota */
    }
  }

  function apiConfig() {
    const base = String($("apiBaseUrl")?.value || defaultApiBase()).replace(/\/+$/, "");
    const key = String($("apiKey")?.value || defaultApiKey());
    const companyId = String($("apiCompanyId")?.value || "").trim();
    return { base, key, companyId };
  }

  async function apiFetch(path, options = {}) {
    const { base, key, companyId } = apiConfig();
    if (!key) {
      throw new Error("API-Key fehlt – in den API-Einstellungen den Railway-Key (WORKPASS_API_KEY) eintragen.");
    }
    persistApiConfig();
    const headers = {
      "Content-Type": "application/json",
      "X-WorkPass-Key": key,
      ...(options.headers || {}),
    };
    if (companyId) headers["X-WorkPass-Company-Id"] = companyId;
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.errors?.join?.(" · ") || `HTTP ${res.status}`);
    }
    return data;
  }

  async function checkApiHealth() {
    loadApiConfigIntoForm();
    persistApiConfig();
    try {
      const { base } = apiConfig();
      const res = await fetch(`${base}/health`);
      const data = await res.json();
      if (!data.ok) throw new Error("Health fehlgeschlagen");
      setStatus(`Bridge online · ${data.service} ${data.version || ""}`, true);
      window.alert(`Server erreichbar:\n${base}\n${data.service} ${data.version || ""}`);
    } catch (e) {
      setStatus(`Bridge offline: ${e.message}`, false);
      const tip = isLocalHostPage()
        ? "Bitte zuerst lokal starten: npm start"
        : "API-URL sollte die Railway-Adresse sein (gleiche Seite, ohne /lohn.html).\nAPI-Key = WORKPASS_API_KEY aus Railway Variables.";
      window.alert(`Bridge nicht erreichbar.\n${tip}\n\n${e.message}`);
    }
  }

  function renderApiInbox(payload) {
    const host = $("apiInboxList");
    if (!host) return;
    const payroll = payload?.payroll || [];
    const invoices = payload?.invoices || [];
    if (!payroll.length && !invoices.length) {
      host.innerHTML = '<p class="section-hint">Keine Jobs in der Inbox.</p>';
      return;
    }
    const payHtml = payroll.slice(0, 30).map((j) => `
      <div class="api-inbox-item" data-type="payroll" data-id="${esc(j.jobId)}">
        <div>
          <strong>${esc(j.employee?.name || j.employee?.id || "MA")}</strong>
          <span>${esc(j.company?.id || "")} · ${esc(j.company?.name || "")} · ${esc(j.period || "")} · ${esc(j.status || "")}</span>
          <span>Netto ${j.net != null ? PayrollCore.formatAmount(j.net) : "—"}</span>
        </div>
        <div class="api-inbox-actions">
          <button type="button" class="api-open" data-id="${esc(j.jobId)}">Öffnen</button>
          <button type="button" class="api-release primary" data-id="${esc(j.jobId)}" ${j.status === "released" ? "disabled" : ""}>Freigabe</button>
        </div>
      </div>`).join("");
    const invHtml = invoices.slice(0, 20).map((j) => `
      <div class="api-inbox-item" data-type="invoice" data-id="${esc(j.id)}">
        <div>
          <strong>RE ${esc(j.number || j.id)}</strong>
          <span>${esc(j.company?.id || "")} · ${esc(j.customer || "")} · ${esc(j.status || "")}</span>
          <span>${j.gross != null ? Number(j.gross).toLocaleString("de-DE", { minimumFractionDigits: 2 }) : ""}</span>
        </div>
        <div class="api-inbox-actions">
          <button type="button" class="api-inv-release primary" data-id="${esc(j.id)}" ${j.status === "released" ? "disabled" : ""}>Freigabe → Plattform</button>
        </div>
      </div>`).join("");
    host.innerHTML = `
      ${payroll.length ? `<h3 class="api-inbox-title">Lohn (${payroll.length})</h3>${payHtml}` : ""}
      ${invoices.length ? `<h3 class="api-inbox-title">Rechnungen (${invoices.length})</h3>${invHtml}` : ""}
    `;

    host.querySelectorAll(".api-open").forEach((btn) => {
      btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
    });
    host.querySelectorAll(".api-release").forEach((btn) => {
      btn.addEventListener("click", () => releaseApiPayrollJob(btn.dataset.id));
    });
    host.querySelectorAll(".api-inv-release").forEach((btn) => {
      btn.addEventListener("click", () => releaseApiInvoiceJob(btn.dataset.id));
    });
  }

  async function loadApiInbox() {
    try {
      loadApiConfigIntoForm();
      const { companyId } = apiConfig();
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const data = await apiFetch(`/v1/inbox${q}`);
      renderApiInbox(data);
      const scope = companyId ? ` · Firma ${companyId}` : " · alle Firmen (kein Filter)";
      setStatus(`API-Inbox: ${data.payroll?.length || 0} Lohn · ${data.invoices?.length || 0} Rechnungen${scope}`, true);
    } catch (e) {
      setStatus(`Inbox-Fehler: ${e.message}`, false);
      window.alert(`Inbox konnte nicht geladen werden.\n${e.message}`);
    }
  }

  async function openApiPayrollJob(jobId) {
    if (!jobId) return;
    try {
      const data = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}`);
      const jobState = data.job?.state;
      if (!jobState) throw new Error("Kein State im Job");
      jobState.meta = jobState.meta || {};
      jobState.meta.source = "api-bridge";
      jobState.meta.jobId = jobId;
      applyIngestResult(
        { ok: !(data.job?.errors || []).length, errors: data.job?.errors || [], state: jobState },
        `API-Job ${jobId}`,
        "platform"
      );
      setModePill("API-Job", "Vom Bridge-Server geöffnet – prüfen & freigeben");
    } catch (e) {
      window.alert(`Job öffnen fehlgeschlagen:\n${e.message}`);
    }
  }

  async function releaseApiPayrollJob(jobId) {
    if (!jobId) return;
    const go = window.confirm("Freigabe an die Plattform?\nDie Plattform stellt dem Mitarbeiter die Abrechnung zu.");
    if (!go) return;
    try {
      const data = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}/release`, { method: "POST", body: "{}" });
      if (!data.ok) throw new Error(data.error || "Freigabe fehlgeschlagen");
      setStatus(`Freigegeben → Plattform/Mitarbeiter-App · ${jobId}`, true);
      await loadApiInbox();
    } catch (e) {
      window.alert(`Freigabe fehlgeschlagen:\n${e.message}`);
    }
  }

  async function releaseApiInvoiceJob(id) {
    if (!id) return;
    const go = window.confirm("Rechnungs-Freigabe an die Plattform?");
    if (!go) return;
    try {
      const data = await apiFetch(`/v1/invoice/${encodeURIComponent(id)}/release`, { method: "POST", body: "{}" });
      if (!data.ok) throw new Error(data.error || "Freigabe fehlgeschlagen");
      setStatus(`Rechnung freigegeben → Plattform · ${id}`, true);
      await loadApiInbox();
    } catch (e) {
      window.alert(`Freigabe fehlgeschlagen:\n${e.message}`);
    }
  }

  function exportJson() {
    readForm();
    const payload = {
      kind: PayrollCore.PLATFORM_KIND,
      exportedAt: new Date().toISOString(),
      draft: state,
      company: {
        id: state.mandantId || state.meta?.companyId || "",
        name: PayrollCore.companyDisplayName(state),
      },
      employee: {
        id: state.employeeId,
        name: state.employeeName,
      },
      period: state.payrollMonth,
      wageItems: state.wageItems,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `workpass-lohn-${state.employeeId || "export"}-${state.payrollMonth || "monat"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportPdf() {
    readForm();
    refreshNow();
    const sheet = window.DatevSheet?.getSheetElement();
    const host = $("datevSheetHost");
    if (!sheet || !window.html2canvas) {
      window.alert("PDF nicht verfügbar. Seite neu laden (F5) und erneut versuchen.");
      return;
    }
    const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!JsPDF) {
      window.alert("PDF-Bibliothek nicht geladen. Seite neu laden (F5).");
      return;
    }

    // Vorschau-Skalierung entfernen – sonst unvollständige/verzerrte PDFs
    const prev = {
      transform: sheet.style.transform,
      origin: sheet.style.transformOrigin,
      width: sheet.style.width,
      height: sheet.style.height,
      hostW: host?.style.width || "",
      hostH: host?.style.height || "",
    };
    sheet.style.transform = "none";
    sheet.style.transformOrigin = "top left";
    sheet.style.width = "210mm";
    sheet.style.height = "297mm";
    if (host) {
      host.style.width = "210mm";
      host.style.height = "297mm";
    }

    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: Math.round(sheet.getBoundingClientRect().width) || 794,
        height: Math.round(sheet.getBoundingClientRect().height) || 1123,
      });
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
      pdf.save(`WorkPass-Lohn-${state.payrollMonth || "export"}.pdf`);
      setStatus("PDF gespeichert – nur die A4-Abrechnung.", true);
    } catch (e) {
      window.alert(`PDF-Export fehlgeschlagen: ${e?.message || e}`);
      setStatus("PDF-Export fehlgeschlagen.", false);
    } finally {
      sheet.style.transform = prev.transform;
      sheet.style.transformOrigin = prev.origin;
      sheet.style.width = prev.width;
      sheet.style.height = prev.height;
      if (host) {
        host.style.width = prev.hostW;
        host.style.height = prev.hostH;
      }
      requestAnimationFrame(() => fitSheetPreview());
    }
  }

  function printSheet() {
    readForm();
    const errors = PayrollCore.validate(state);
    if (errors.length) {
      showMissingAlert(errors, PayrollCore.validatePrintHints?.(state) || []);
      setStatus(`Druck gestoppt: ${errors.join(" · ")}`, false);
      refreshNow();
      $("missingPanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const hints = PayrollCore.validatePrintHints?.(state) || [];
    if (hints.length) {
      showMissingAlert([], hints);
      const go = window.confirm(`Hinweise vor dem Druck:\n• ${hints.join("\n• ")}\n\nTrotzdem drucken?`);
      if (!go) {
        refreshNow();
        return;
      }
    }
    refreshNow();
    const ok = window.DatevSheet?.printSheet();
    if (ok) setStatus("Druckdialog geöffnet – nur A4-Abrechnung.", true);
  }

  function exportCsv() {
    readForm();
    const payroll = PayrollCore.calculate(state);
    const built = PayrollCore.buildDatevCsv?.(state, payroll);
    if (!built?.content) {
      window.alert("CSV-Export nicht verfügbar.");
      return;
    }
    const blob = new Blob([built.content], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = built.filename;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus(`CSV exportiert: ${built.filename}`, true);
  }

  async function changePin() {
    const oldPin = String($("pinOld")?.value || "").trim();
    const newPin = String($("pinNew")?.value || "").trim();
    const conf = String($("pinNewConfirm")?.value || "").trim();
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
    ["pinOld", "pinNew", "pinNewConfirm"].forEach((id) => { if ($(id)) $(id).value = ""; });
  }

  function bindDropZone() {
    if (!dropTarget) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
      dropTarget.addEventListener(ev, prevent);
    });
    dropTarget.addEventListener("dragenter", () => dropTarget.classList.add("dragover"));
    dropTarget.addEventListener("dragover", () => dropTarget.classList.add("dragover"));
    dropTarget.addEventListener("dragleave", () => dropTarget.classList.remove("dragover"));
    dropTarget.addEventListener("drop", (e) => {
      dropTarget.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (/\.csv$/i.test(file.name) || /text\/csv|plain/.test(file.type)) importCsvFile(file);
      else importPlatformFile(file);
    });
  }

  function bindEvents() {
    FIELD_IDS.forEach((id) => bindLiveInput($(id)));
    CHECKBOX_IDS.forEach((id) => {
      $(id)?.addEventListener("change", onUserEdit);
    });

    $("taxClass")?.addEventListener("change", () => {
      toggleTaxIvBox();
      onUserEdit();
    });

    $("churchConfession")?.addEventListener("change", () => {
      const conf = $("churchConfession")?.value;
      const rateEl = $("churchTaxRate");
      if (conf && rateEl && (Number(rateEl.value) || 0) <= 0) {
        rateEl.value = "9";
        toast("Kirchensteuer auf 9 % gesetzt (üblich). Bei Bedarf anpassen.", "info");
      }
      if (!conf && rateEl && Number(rateEl.value) > 0) {
        /* keep rate – user may still want KiSt without label */
      }
      onUserEdit();
    });

    wageBody.addEventListener("input", onUserEdit);
    wageBody.addEventListener("change", onUserEdit);
    wageBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("w-del")) {
        e.target.closest("tr")?.remove();
        if (!wageBody.querySelector("tr")) renderWageRows([]);
        onUserEdit();
      }
    });

    $("btnAddWage").addEventListener("click", () => {
      const rows = readWageRows();
      rows.push({ code: "", label: "", amount: 0, quantity: 0, taxFlag: "L", svFlag: "L" });
      renderWageRows(rows);
      onUserEdit();
    });

    $("healthFund")?.addEventListener("change", () => {
      const sel = $("healthFund");
      const opt = sel?.selectedOptions?.[0];
      const zusatz = Number(opt?.dataset?.zusatz);
      if (!Number.isNaN(zusatz) && $("healthAdditionalPercent")) {
        $("healthAdditionalPercent").value = String(zusatz);
        state.healthAdditionalPercent = zusatz;
      }
      if (sel?.value === "Private Krankenversicherung") {
        toast("Private KV: Sozialversicherung KV wird angepasst (PAP).", "info");
      }
      onUserEdit();
    });

    $("btnNewCompany")?.addEventListener("click", () => {
      const go = window.confirm("Neue Firma anlegen?\nAktuelle Eingaben werden geleert (Archiv bleibt erhalten).");
      if (!go) return;
      withFreezeGuard(() => {
        state = PayrollCore.defaultState();
        state.payrollMonth = currentMonth();
        useReferenceDisplay = false;
        writeForm();
        refreshNow();
      });
      setRecvMode("manual");
      $("companyName")?.focus();
      $("secFirma")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Neue Firma: Firmenname, Adresse, dann Mitarbeiter & Lohnarten.", "ok");
      setModePill("Neue Firma", "Standalone – Firma erfassen");
    });

    $("btnFocusEmployee")?.addEventListener("click", () => {
      $("employeeName")?.focus();
      $("employeeBlock")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("companyName")?.addEventListener("change", () => {
      const name = String($("companyName")?.value || "").trim();
      if (name && !$("mandantId")?.value) {
        const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w.\-@]+/g, "_").slice(0, 60);
        if ($("mandantId")) $("mandantId").value = id;
      }
      onUserEdit();
    });

    $("btnNew").addEventListener("click", () => {
      if (window.confirm("Neue leere Abrechnung starten?")) resetNew(true);
    });
    $("btnReference").addEventListener("click", loadReference);
    $("btnPreviewDemo")?.addEventListener("click", loadReference);
    $("btnPreviewEmpfang")?.addEventListener("click", () => {
      setRecvMode("file");
      $("secEmpfang")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("btnPrint").addEventListener("click", printSheet);
    $("btnPdf").addEventListener("click", exportPdf);
    $("btnPrintSide")?.addEventListener("click", printSheet);
    $("btnPdfSide")?.addEventListener("click", exportPdf);
    $("btnExportJson").addEventListener("click", exportJson);
    $("btnExportCsv")?.addEventListener("click", exportCsv);
    $("btnChangePin")?.addEventListener("click", changePin);
    $("btnPasteApply")?.addEventListener("click", applyPasteInbox);
    loadApiConfigIntoForm();
    ["apiBaseUrl", "apiKey", "apiCompanyId"].forEach((id) => {
      $(id)?.addEventListener("change", persistApiConfig);
    });
    $("btnApiInbox")?.addEventListener("click", loadApiInbox);
    $("btnApiHealth")?.addEventListener("click", checkApiHealth);
    $("importPlatformInput").addEventListener("change", (e) => {
      importPlatformFile(e.target.files?.[0]);
      e.target.value = "";
    });
    $("importCsvInput").addEventListener("change", (e) => {
      importCsvFile(e.target.files?.[0]);
      e.target.value = "";
    });

    document.querySelectorAll(".recv-mode").forEach((btn) => {
      btn.addEventListener("click", () => setRecvMode(btn.dataset.recv));
    });

    if (companySelect) {
      companySelect.addEventListener("change", () => {
        if (refreshingArchive) return;
        const key = companySelect.value;
        if (!key) return;
        const loaded = PayrollCore.loadArchiveEntry(key);
        if (!loaded) return;
        withFreezeGuard(() => {
          state = loaded;
          useReferenceDisplay = state.meta?.referenceDemo === "datev";
          writeForm();
          refreshNow();
        });
        setStatus(`Geladen: ${PayrollCore.companyDisplayName(state)} · ${state.payrollMonth || ""}`, true);
      });
    }

    bindDropZone();
    window.addEventListener("resize", () => requestAnimationFrame(() => fitSheetPreview()));
  }

  function startApp() {
    if (appReady) {
      refreshNow();
      return;
    }
    fillCatalogs();
    window.DatevSheet?.init("datevSheetHost");
    window.DatevSheet?.setBackground("blank");
    const saved = PayrollCore.loadState();
    if (saved) {
      withFreezeGuard(() => {
        state = saved;
        useReferenceDisplay = state.meta?.referenceDemo === "datev";
        writeForm();
        bindEvents();
        appReady = true;
        refreshNow();
      });
    } else {
      bindEvents();
      appReady = true;
      resetNew(false);
    }
    setRecvMode("file");
    renderArchiveBoard();
  }

  function init() {
    // onUnlock startet die App nach PIN; bei aktiver Sitzung/E2E sofort
    if (!window.WorkPassAuth) {
      startApp();
      return;
    }
    window.WorkPassAuth.init({ onUnlock: startApp });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
