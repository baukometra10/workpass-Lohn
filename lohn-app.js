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
  let companyPortalId = "";
  let inboxPollTimer = null;

  /** Promise-based human confirm modal (never AI). */
  function humanConfirm({ title, body, requireCheck = true } = {}) {
    return new Promise((resolve) => {
      const modal = $("humanConfirmModal");
      const titleEl = $("hfModalTitle");
      const bodyEl = $("hfModalBody");
      const check = $("hfModalCheck");
      const checkWrap = $("hfCheckWrap");
      const btnOk = $("hfModalOk");
      const btnCancel = $("hfModalCancel");
      if (!modal || !btnOk || !btnCancel) {
        resolve(window.confirm(`${title || ""}\n\n${body || ""}`));
        return;
      }
      if (titleEl) titleEl.textContent = title || uiT("hf.title", "Menschliche Bestätigung");
      if (bodyEl) bodyEl.textContent = body || "";
      if (check) check.checked = false;
      if (checkWrap) checkWrap.hidden = !requireCheck;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      const close = (val) => {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        btnOk.onclick = null;
        btnCancel.onclick = null;
        modal.querySelector(".hf-modal-backdrop")?.removeEventListener("click", onDismiss);
        resolve(val);
      };
      const onDismiss = () => close(false);
      btnCancel.onclick = () => close(false);
      modal.querySelector(".hf-modal-backdrop")?.addEventListener("click", onDismiss);
      btnOk.onclick = () => {
        if (requireCheck && check && !check.checked) {
          toast(uiT("hf.needCheck", "Bitte Bestätigung anklicken."), "error");
          return;
        }
        close(true);
      };
    });
  }

  function sessionCompanyId() {
    const u = window.WorkPassAuth?.getSessionUser?.();
    if (!u?.companyId) return "";
    if (u.role === "admin") return "";
    return String(u.companyId).trim().toLowerCase();
  }

  function isCompanyPortal() {
    return Boolean(sessionCompanyId());
  }

  const FIELD_IDS = [
    "seller", "note", "taxNumber", "vatId", "datevClientNo", "datevConsultantNo",
    "companyName", "mandantId", "managingDirector", "companyBankName", "companyIban",
    "employeeName", "employeeAddress", "employeeId", "personnelNumber",
    "employeeTaxId", "employeeInsuranceNo", "employeeBirthDate", "employeeEntryDate",
    "payrollMonth", "taxClass", "churchTaxRate", "churchConfession",
    "healthFund", "healthPercent", "healthAdditionalPercent",
    "employmentType",
    "taxAllowanceMonthly", "childAllowanceFactor", "factorValue",
    "netDeductions", "departmentNo",
    "workDays", "workHours", "bankName", "bankIban",
  ];

  const CHECKBOX_IDS = ["childlessPvSurcharge", "factorMethod", "minijobRvExempt", "minijobTaxable"];

  function toast(message, type = "info") {
    const host = $("wpToastHost");
    if (!host) {
      window.alert(message);
      return;
    }
    const title = type === "error"
      ? uiT("toast.error", "Bitte ergänzen")
      : type === "ok"
        ? uiT("toast.ok", "Erledigt")
        : uiT("toast.info", "Hinweis");
    const el = document.createElement("div");
    el.className = `wp-toast wp-toast-${type}`;
    el.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span><button type="button" class="wp-toast-x" aria-label="${esc(uiT("toast.close", "Schließen"))}">×</button>`;
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
    state.badgeId = String(state.employeeId || state.badgeId || "").trim();
    state.hideBadgeOnPayslip = true;
    state.meta = {
      ...(state.meta || {}),
      badgeId: state.badgeId,
      personnelNumber: String(state.personnelNumber || "").trim(),
      hideBadgeOnPayslip: true,
    };
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
    if (g) {
      g.textContent = payroll.gross > 0 ? PayrollCore.formatAmount(payroll.gross) : uiT("kpi.noData", "Keine Daten");
      g.classList.toggle("is-empty", !(payroll.gross > 0));
    }
    if (n) {
      n.textContent = payroll.net > 0 ? PayrollCore.formatAmount(payroll.net) : uiT("kpi.noData", "Keine Daten");
      n.classList.toggle("is-empty", !(payroll.net > 0));
    }
  }

  function setPrintHints(state, hardErrors) {
    const box = $("printHints");
    const panel = $("missingPanel");
    const soft = PayrollCore.validatePrintHints?.(state) || [];
    const portalIdle = Boolean(companyPortalId) && !isPortalEditingDraft(state);
    document.body.classList.toggle("portal-editing", Boolean(companyPortalId) && !portalIdle);
    if (portalIdle) {
      if (box) {
        box.hidden = true;
        box.textContent = "";
      }
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
      }
      highlightMissing([], []);
      return;
    }
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
        panel.classList.remove("is-open", "is-compact");
      } else {
        panel.hidden = false;
        const canAsk = Boolean(companyPortalId || apiConfig().companyId);
        const title = hardErrors?.length
          ? uiT("missing.hardTitle", "Pflichtfelder fehlen")
          : uiT("missing.softTitle", "Empfohlene Angaben");
        let open = false;
        try {
          open = sessionStorage.getItem("wpMissingOpen") === "1";
        } catch { /* ignore */ }
        // First appearance with hard errors: start compact so the workspace stays readable
        panel.classList.toggle("is-open", open);
        panel.classList.toggle("is-compact", !open);
        panel.innerHTML = `
          <button type="button" class="missing-toggle" id="btnMissingToggle" aria-expanded="${open ? "true" : "false"}">
            <span class="missing-toggle-main">
              <span class="missing-head">${esc(title)}</span>
              <span class="missing-count">${items.length}</span>
            </span>
            <span class="missing-toggle-hint">${esc(open
              ? uiT("missing.collapse", "Zuklappen")
              : uiT("missing.expand", "Details anzeigen"))}</span>
          </button>
          <div class="missing-body" ${open ? "" : "hidden"}>
            <ul>${items.map((i) => `<li class="missing-${i.level}">${esc(i.text)}</li>`).join("")}</ul>
            ${canAsk ? `
              <div class="btn-row missing-actions">
                <button type="button" class="primary" id="btnAskPlatformData">${esc(uiT("missing.askPlatform", "Vorhandene Daten holen / Lücken melden"))}</button>
              </div>
              <p class="section-hint" id="missingPlatformHint">${esc(uiT("missing.askHint", "Wir laden zuerst Stammdaten und Vertrag aus der Plattform. Nur was dort wirklich fehlt, wird nachgefragt."))}</p>
            ` : ""}
          </div>
        `;
        $("btnMissingToggle")?.addEventListener("click", () => {
          const next = !panel.classList.contains("is-open");
          panel.classList.toggle("is-open", next);
          panel.classList.toggle("is-compact", !next);
          const body = panel.querySelector(".missing-body");
          if (body) body.hidden = !next;
          const btn = $("btnMissingToggle");
          if (btn) {
            btn.setAttribute("aria-expanded", next ? "true" : "false");
            const hint = btn.querySelector(".missing-toggle-hint");
            if (hint) {
              hint.textContent = next
                ? uiT("missing.collapse", "Zuklappen")
                : uiT("missing.expand", "Details anzeigen");
            }
          }
          try {
            sessionStorage.setItem("wpMissingOpen", next ? "1" : "0");
          } catch { /* ignore */ }
        });
        $("btnAskPlatformData")?.addEventListener("click", () => askPlatformForCurrentEmployee(hardErrors || [], soft));
        if (state.meta?.platformBlockedHint) {
          const hint = $("missingPlatformHint");
          if (hint) hint.textContent = state.meta.platformBlockedHint;
        }
      }
    }
    highlightMissing(hardErrors || [], soft);
  }

  async function askPlatformForCurrentEmployee(hard = [], soft = []) {
    const companyId = companyPortalId || apiConfig().companyId || state.mandantId;
    const employeeId = state.badgeId || state.employeeId || state.meta?.badgeId;
    if (!companyId) {
      toast("Keine Firma – bitte anmelden.", "error");
      return;
    }
    if (!employeeId && !state.employeeName) {
      toast("Mitarbeiter / Badge fehlt noch.", "error");
      return;
    }
    try {
      setStatus("Hole Stammdaten von Plattform / Register…", true);
      const data = await apiFetch("/v1/payroll/request-data", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          companyName: state.companyName || "",
          employeeId,
          badgeId: state.badgeId || employeeId,
          employeeName: state.employeeName || "",
          period: state.payrollMonth || currentPayrollPeriod(),
          gaps: hard,
          softGaps: soft,
          jobId: state.meta?.jobId || undefined,
          pull: true,
          forcePull: true,
          reason: "payslip_create",
        }),
      });
      if (data.job?.jobId) {
        await openApiPayrollJob(data.job.jobId, { skipEnrich: true });
        toast(
          data.message || "Daten übernommen.",
          data.platformBlocked ? "error" : (data.remainingHard?.length ? "info" : "ok")
        );
      } else if (data.ingest?.count) {
        const first = data.ingest.results?.[0];
        if (first?.jobId) {
          await openApiPayrollJob(first.jobId, { skipEnrich: true });
        }
        toast(data.message || "Daten übernommen (auch unvollständig).", "ok");
      } else {
        toast(data.message || "Plattform wurde nach fehlenden Daten gefragt.", "info");
      }
      setStatus(data.message || "Anfrage gesendet", true);
      await loadPlatformMessages?.(true);
      await loadPortalDashboard?.(true);
    } catch (e) {
      toast(`Anfrage fehlgeschlagen: ${e.message || e}`, "error");
      setStatus(String(e.message || e), false);
    }
  }

  function isPortalEditingDraft(state) {
    const hasEmployee = Boolean(String(state?.employeeName || "").trim());
    const hasWage = Array.isArray(state?.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0);
    const hasGross = Number(state?.grossSalary) > 0;
    return hasEmployee || hasWage || hasGross || Boolean(state?.meta?.jobId);
  }

  function calendarPayrollPeriod() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function previousCalendarPeriod() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function isManualPeriodOverride() {
    try {
      return sessionStorage.getItem("wpManualPeriod") === "1";
    } catch {
      return false;
    }
  }

  function setManualPeriodOverride(on) {
    try {
      if (on) sessionStorage.setItem("wpManualPeriod", "1");
      else sessionStorage.removeItem("wpManualPeriod");
    } catch { /* ignore */ }
  }

  function currentPayrollPeriod() {
    const fromInput = String($("payrollMonth")?.value || $("portalPeriod")?.value || "").trim();
    if (/^\d{4}-\d{2}$/.test(fromInput) && isManualPeriodOverride()) return fromInput;
    return calendarPayrollPeriod();
  }

  function formatPeriodLabel(period) {
    const p = String(period || "").trim();
    if (!p) return "";
    return window.WorkPassI18n?.formatMonthYear?.(p) || p;
  }

  function messagePeriod(msg) {
    return String(msg?.period || msg?.payload?.period || "").trim();
  }

  function splitMessagesByPeriod(messages, period) {
    const list = Array.isArray(messages) ? messages : [];
    const p = String(period || "").trim();
    if (!p) return { inPeriod: list, other: [] };
    const inPeriod = [];
    const other = [];
    for (const m of list) {
      const mp = messagePeriod(m);
      if (!mp || mp === p) inPeriod.push(m);
      else other.push(m);
    }
    return { inPeriod, other };
  }

  function goToCalendarWorkspace() {
    const cal = calendarPayrollPeriod();
    setManualPeriodOverride(false);
    if ($("payrollMonth")) $("payrollMonth").value = cal;
    if ($("portalPeriod")) $("portalPeriod").value = cal;
    syncLocalizedMonthLabels();
    loadPortalDashboard(true);
    loadApiInbox(true);
    loadPlatformMessages(true);
  }

  function renderPortalWorkspaceBar(period) {
    const host = $("portalWorkspaceBar");
    if (!host) return;
    const working = String(period || currentPayrollPeriod()).trim();
    const cal = calendarPayrollPeriod();
    const manual = working !== cal || isManualPeriodOverride();
    host.hidden = false;
    host.dataset.mode = manual ? "manual" : "current";
    const monthLabel = formatPeriodLabel(working);
    const calLabel = formatPeriodLabel(cal);
    if ($("portalWorkspaceTitle")) {
      $("portalWorkspaceTitle").textContent = manual
        ? uiT("portal.workspaceManualTitle", "Manuell geöffnet: {month}").replace("{month}", monthLabel)
        : uiT("portal.workspaceAutoTitle", "Arbeitsmonat {month}").replace("{month}", monthLabel);
    }
    if ($("portalWorkspaceHint")) {
      $("portalWorkspaceHint").textContent = manual
        ? uiT(
          "portal.workspaceManualHint",
          "Automatik läuft nur für {current}. Dieser Monat ist Archiv – nichts wird automatisch berechnet."
        ).replace("{current}", calLabel)
        : uiT(
          "portal.workspaceAutoHint",
          "Nur dieser Monat wird automatisch berechnet. Frühere Monate öffnen Sie manuell."
        );
    }
    const back = $("btnWorkspaceCurrent");
    if (back) back.hidden = !manual;
  }

  async function loadPortalDashboard(silent = false) {
    const dash = $("portalDashboard");
    if (!companyPortalId) {
      if (dash) dash.hidden = true;
      return;
    }
    if (dash) dash.hidden = false;
    if (!demoPurgedOnce) {
      demoPurgedOnce = true;
      await purgeDemoData({ silent: true, skipReload: true });
    }
    const periodInput = $("portalPeriod");
    const calendarNow = calendarPayrollPeriod();
    if (periodInput && (!periodInput.value || !isManualPeriodOverride())) {
      periodInput.value = calendarNow;
    }
    const period = (isManualPeriodOverride() && periodInput?.value && /^\d{4}-\d{2}$/.test(periodInput.value))
      ? periodInput.value
      : calendarNow;
    if ($("payrollMonth") && (!isManualPeriodOverride() || !$("payrollMonth").value)) {
      $("payrollMonth").value = period;
    }
    if ($("portalPeriod")) $("portalPeriod").value = period;
    syncLocalizedMonthLabels();
    try {
      const [emps, month, arch, msgs, sync, automation, branding, completeness, trust, anomalies, calendar] = await Promise.all([
        apiFetch(`/v1/portal/employees?period=${encodeURIComponent(period)}`),
        apiFetch(`/v1/portal/month?period=${encodeURIComponent(period)}&months=6`),
        apiFetch(`/v1/portal/archive?period=${encodeURIComponent(period)}`),
        apiFetch("/v1/messages?status=open").catch(() => ({ messages: [] })),
        apiFetch(`/v1/platform/status?period=${encodeURIComponent(period)}`).catch(() => null),
        apiFetch(`/v1/portal/automation-status?period=${encodeURIComponent(period)}`).catch(() => null),
        apiFetch("/v1/portal/branding").catch(() => null),
        apiFetch(`/v1/portal/completeness?period=${encodeURIComponent(period)}`).catch(() => null),
        apiFetch(`/v1/portal/delivery-trust?period=${encodeURIComponent(period)}`).catch(() => null),
        apiFetch(`/v1/portal/anomalies?period=${encodeURIComponent(period)}`).catch(() => null),
        apiFetch(`/v1/portal/compliance-calendar?period=${encodeURIComponent(period)}`).catch(() => null),
      ]);

      const cur = month.current || {};
      const kpiRow = $("portalKpiRow");
      if (kpiRow) kpiRow.hidden = false;
      const kpiNote = $("portalKpiSumNote");
      if (kpiNote) kpiNote.hidden = false;
      if ($("portalKpiEmployees")) $("portalKpiEmployees").textContent = String(emps.count || 0);
      if ($("portalKpiReleased")) $("portalKpiReleased").textContent = String(cur.released || arch.count || 0);
      if ($("portalKpiGross")) {
        $("portalKpiGross").textContent = cur.total
          ? PayrollCore.formatAmount(cur.grossSum || 0)
          : "Keine Daten";
        $("portalKpiGross").classList.toggle("is-empty", !cur.total);
      }
      if ($("portalKpiNet")) {
        $("portalKpiNet").textContent = cur.total
          ? PayrollCore.formatAmount(cur.netSum || 0)
          : "Keine Daten";
        $("portalKpiNet").classList.toggle("is-empty", !cur.total);
      }
      const msgSplit = splitMessagesByPeriod(msgs.messages || [], period);
      if ($("portalKpiMessages")) $("portalKpiMessages").textContent = String(msgSplit.inPeriod.length);
      const pending = Number(sync?.pending?.messages || 0) + Number(sync?.pending?.deliveries || 0);
      const pendingDeliveries = Number(sync?.pending?.deliveries || 0);
      const wh = sync?.webhook?.last || null;
      const platformBlocked = Boolean(
        sync?.status === "error"
        || (wh && wh.ok === false && (Number(wh.status) === 401 || Number(wh.status) === 403 || Number(wh.status) === 404))
      );
      const firmFriendlySync = platformBlocked
        ? uiT("lohn.platformBlockedShort", "Plattform blockiert")
        : (pending
          ? `${pending} ${uiT("lohn.openStatus", "offen")}`
          : (Number(emps.count || 0) > 0 || cur.total
            ? uiT("lohn.connected", "Verbunden")
            : uiT("lohn.ready", "Bereit")));
      if ($("portalKpiSync")) $("portalKpiSync").textContent = firmFriendlySync;
      if ($("portalSyncBadge")) {
        $("portalSyncBadge").textContent = platformBlocked
          ? uiT("lohn.check", "Prüfen")
          : (pending
            ? uiT("lohn.openStatus", "Offen")
            : (Number(emps.count || 0) || cur.total ? uiT("lohn.active", "Aktiv") : uiT("lohn.ready", "Bereit")));
        $("portalSyncBadge").classList.toggle("is-error", platformBlocked);
        $("portalSyncBadge").classList.toggle("is-ok", !platformBlocked && !pending && Boolean(Number(emps.count || 0) || cur.total));
      }

      renderPortalWorkspaceBar(period);
      renderPortalReadiness(cur, emps, period);
      renderPortalCompleteness(completeness);
      renderPortalTrust(trust);
      renderPortalAnomalies(anomalies);
      renderPortalCalendar(calendar);
      const quiet = $("portalQuietCard");
      if (quiet) {
        const empty = !(Number(emps.count || 0) > 0 || cur.total > 0);
        quiet.hidden = !empty;
      }
      renderPortalBranding(branding);
      renderPortalDiagnosis(emps, cur);
      renderPortalHoursWait(cur, period);

      const empN = Number(emps.count || 0);
      const relN = Number(cur.released || arch.count || 0);
      const openN = Number(msgSplit.inPeriod.length);
      const auto = automation?.ok ? automation : (sync?.automation?.ok ? sync.automation : null);
      renderPortalCommandStatus({
        period,
        employees: empN,
        released: relN,
        openMessages: openN,
        pending,
        hasData: Boolean(cur.total),
        monthDone: Boolean(cur.total > 0 && relN === cur.total && cur.status === "released")
          || Boolean(auto?.phase === "done"),
        automation: auto,
        platformBlocked,
      });
      renderPortalPlatformAlert(platformBlocked, pending, empN, pendingDeliveries);
      applyAutomationProgress(auto, period);
      renderAuditOverview({
        period,
        employees: empN,
        released: relN,
        openMessages: openN,
        syncLabel: firmFriendlySync,
        hasData: Boolean(cur.total),
        companyName: $("companyName")?.value?.trim() || companyPortalId,
      });

      const totalsCard = $("portalTotalsCard");
      if (totalsCard) {
        totalsCard.hidden = false;
        if ($("portalTotalsPeriod")) {
          $("portalTotalsPeriod").textContent =
            window.WorkPassI18n?.formatMonthYear?.(period) || period;
        }
        if ($("portalTotalsHint")) {
          $("portalTotalsHint").textContent = cur.total
            ? uiT(
              "portal.totalsHintCount",
              "{count} Einzelabrechnung(en) · Summe Brutto/Netto · {status}"
            )
              .replace("{count}", String(cur.total))
              .replace("{status}", cur.status === "released"
                ? uiT("audit.released", "freigegeben")
                : firmStatusLabel(cur.status || "partial"))
            : uiT("portal.totalsHintEmpty", "Noch keine Abrechnungen in diesem Monat – Sync holt Daten von der Plattform.");
        }
        if ($("portalTotalsGrid")) {
          const empRows = (cur.employees || [])
            .filter((e) => e && (e.name || e.id))
            .map((e) => {
              const title = (() => {
                const n = String(e.name || "").trim();
                const id = String(e.id || "").trim();
                if (n && !looksLikeIdOnly(n, id)) return n;
                return id ? `${uiT("lohn.id", "ID")}: ${id}` : uiT("lohn.nameMissing", "Name fehlt");
              })();
              const g = e.gross != null ? PayrollCore.formatAmount(e.gross) : "—";
              const n = e.net != null ? PayrollCore.formatAmount(e.net) : "—";
              const st = firmStatusLabel(e.status || "");
              return `<button type="button" class="portal-emp-total" data-id="${esc(e.jobId || "")}">
                <span class="portal-emp-total-name">${esc(title)}</span>
                <span class="portal-emp-total-meta">${esc(st)}</span>
                <strong class="portal-emp-total-money">${esc(g)} → ${esc(n)}</strong>
              </button>`;
            })
            .join("");
          $("portalTotalsGrid").innerHTML = `
            <div class="kpi"><span>${esc(uiT("kpi.grossSum", "Brutto Summe"))}</span><strong>${esc(PayrollCore.formatAmount(cur.grossSum || 0))}</strong></div>
            <div class="kpi"><span>${esc(uiT("kpi.netSum", "Netto Summe"))}</span><strong>${esc(PayrollCore.formatAmount(cur.netSum || 0))}</strong></div>
            <div class="kpi"><span>${esc(uiT("kpi.lohnsteuer", "Lohnsteuer"))}</span><strong>${esc(PayrollCore.formatAmount(cur.taxSum || 0))}</strong></div>
            <div class="kpi"><span>${esc(uiT("kpi.svAn", "SV AN"))}</span><strong>${esc(PayrollCore.formatAmount(cur.svAnSum || 0))}</strong></div>
            ${empRows ? `<div class="portal-emp-totals">${empRows}</div>` : ""}
          `;
          $("portalTotalsGrid").querySelectorAll(".portal-emp-total[data-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
              if (btn.dataset.id) openApiPayrollJob(btn.dataset.id);
            });
          });
        }
      }

      const successCard = $("portalSuccessCard");
      if (successCard) {
        const released = Number(cur.released || arch.count || 0);
        const total = Number(cur.total || 0);
        const done = total > 0 && released === total && cur.status === "released";
        successCard.hidden = !done;
        successCard.classList.toggle("portal-success", done);
        if ($("portalSuccessTitle")) {
          $("portalSuccessTitle").textContent = done
            ? uiT("portal.monthCloseTitlePeriod", `Monatsabschluss ${period}`).replace("{period}", period)
            : uiT("portal.successTitle", "Alles erledigt");
        }
        if ($("portalSuccessHint")) {
          $("portalSuccessHint").textContent = done
            ? uiT("portal.successHint", "Abrechnungen wurden berechnet und an die Plattform gesendet.")
            : "";
        }
      }

      if ($("portalSyncHint")) {
        if (platformBlocked) {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintBlocked",
            "Die Plattform lehnt die Verbindung ab – deshalb fehlen Namen, Logo und Monatsdaten. Bitte Plattform-Admin: Webhook-Schlüssel mit Accounting abstimmen."
          );
        } else if (auto?.eligible && auto?.phase === "done") {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintAutoDone",
            "Monatsautomatik erledigt – Abrechnungen sind an die Plattform gesendet. Sie können jederzeit zur Prüfung einloggen."
          );
        } else if (auto?.eligible && (auto?.phase === "waiting" || pending)) {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintAutoWait",
            "Monatsautomatik aktiv – WorkPass wartet auf Plattformdaten und berechnet danach alle Abrechnungen."
          );
        } else if (auto?.eligible) {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintAutoOn",
            "Monatsautomatik aktiv – jeden Monat holt WorkPass Daten, berechnet alle Abrechnungen und sendet sie an die Plattform. Login bleibt zur Prüfung möglich."
          );
        } else if (Number(emps.count || 0) === 0 && !cur.total) {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintEmpty",
            "Noch keine Mitarbeiterdaten – tippen Sie auf „Jetzt synchronisieren“. WorkPass fragt die Plattform und berechnet automatisch."
          );
        } else if (pending) {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintPending",
            "Einige Angaben fehlen noch. WorkPass fragt die Plattform gezielt nach – der Monat läuft weiter für alle vollständigen Personen."
          );
        } else {
          $("portalSyncHint").textContent = uiT(
            "portal.syncHintOk",
            "Verbunden mit der Plattform. Neue Daten werden automatisch berechnet und freigegeben."
          );
        }
      }
      if ($("portalSyncDetail")) {
        // Technical webhook/API detail stays hidden for firm users (CSS); keep minimal for admins if ever shown.
        $("portalSyncDetail").innerHTML = "";
        const firmNext = pending
          ? [uiT("portal.nextPlatformGaps", "Plattform liefert fehlende Angaben nach"), uiT("portal.nextSyncAgain", "Danach erneut „Jetzt synchronisieren“")]
          : (Number(emps.count || 0) === 0
            ? [uiT("sync.now", "Jetzt synchronisieren"), uiT("portal.nextReleaseEmployees", "In der Plattform Mitarbeiter freigeben")]
            : []);
        renderPortalNextActions(
          sync?.autoPipeline?.lastResult?.nextActions?.length
            ? sync.autoPipeline.lastResult.nextActions.filter((a) => !/webhook|WORKPASS_|Endpoint|Pull-URL|batch/i.test(String(a)))
            : firmNext
        );
      }

      const empHost = $("portalEmployeeList");
      if (empHost) {
        const list = emps.employees || [];
        const shown = list.slice(0, 50);
        const syncChip = (e) => {
          const s = e.sync || {};
          const chips = [];
          if (s.ready) chips.push({ cls: "ok", label: uiT("sync.chipReady", "Bereit") });
          else {
            if (s.waitingHours || (s.hasHourlyRate && !s.hasHours && !s.hasGross)) {
              chips.push({ cls: "warn", label: uiT("sync.chipHours", "Stunden") });
            }
            if (!s.hasSv) chips.push({ cls: "warn", label: uiT("sync.chipSv", "SV") });
            if (!s.hasKk) chips.push({ cls: "warn", label: uiT("sync.chipKk", "KK") });
            if (!chips.length && s.hasGross) chips.push({ cls: "ok", label: uiT("sync.chipReady", "Bereit") });
            if (!chips.length) chips.push({ cls: "mute", label: uiT("sync.chipWait", "Wartet") });
          }
          return `<span class="portal-sync-chips">${chips.map((c) => `<span class="portal-sync-chip is-${c.cls}">${esc(c.label)}</span>`).join("")}</span>`;
        };
        empHost.innerHTML = list.length
          ? `<p class="portal-list-meta">${esc(uiT("portal.empMeta", "{count} Mitarbeiter · Anzeige {shown} (Mandantentrennung)")
              .replace("{count}", String(list.length))
              .replace("{shown}", String(shown.length)))}</p>`
            + shown.map((e) => {
              const title = employeeTitle(e);
              const idLine = employeeIdLine(e);
              const hoursLine = e.workHours != null || e.hourlyRate != null
                ? ` · ${e.workHours != null ? `${e.workHours} h` : "— h"}${e.hourlyRate != null ? ` × ${e.hourlyRate} €` : ""}`
                : "";
              return `
            <div class="api-inbox-item">
              <div>
                <strong>${esc(title)}</strong>
                <span class="portal-item-meta">${esc(idLine)}${e.hasName === false ? ` · ${esc(uiT("lohn.namePending", "Name von Plattform ausstehend"))}` : ""}${e.personnelNumber ? ` · ${esc(uiT("lohn.persNr", "Pers.-Nr."))} ${esc(e.personnelNumber)}` : ""} · ${esc(e.lastPeriod || "—")} · ${esc(firmStatusLabel(e.lastStatus))}${esc(hoursLine)}</span>
                ${syncChip(e)}
                <span>${esc(uiT("kpi.netShort", "Netto"))} ${e.net != null ? PayrollCore.formatAmount(e.net) : "—"}</span>
              </div>
              <div class="api-inbox-actions">
                <button type="button" class="api-cert-lstb" data-emp="${esc(e.id || e.badgeId || "")}" title="Lohnsteuerbescheinigung">LStB</button>
                <button type="button" class="api-cert-vb" data-emp="${esc(e.id || e.badgeId || "")}" title="Verdienstbescheinigung">VB</button>
                <button type="button" class="api-open-emp primary" data-id="${esc(e.lastJobId || "")}">${esc(uiT("lohn.open", "Öffnen"))}</button>
              </div>
            </div>`;
            }).join("")
            + (list.length > shown.length ? `<p class="portal-list-more">${esc(uiT("portal.moreEmployees", "+ {n} weitere – für große Firmen seitenweise").replace("{n}", String(list.length - shown.length)))}</p>` : "")
          : `<div class="company-empty-inbox"><strong>${esc(uiT("portal.noEmployees", "Noch keine Mitarbeiter"))}</strong><p>${esc(uiT("portal.noEmployeesHint", "Tippen Sie auf „Jetzt synchronisieren“. Sobald die Plattform Daten sendet, erscheinen Ihre Mitarbeiter hier."))}</p></div>`;
        empHost.querySelectorAll(".api-open-emp").forEach((btn) => {
          btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
        });
        empHost.querySelectorAll(".api-cert-lstb").forEach((btn) => {
          btn.addEventListener("click", () => showLstbCertificate(btn.dataset.emp, certYearValue()));
        });
        empHost.querySelectorAll(".api-cert-vb").forEach((btn) => {
          btn.addEventListener("click", () => showVerdienstCertificate(btn.dataset.emp, certYearValue(), currentPayrollPeriod()));
        });
      }
      const monthHost = $("portalMonthOverview");
      if (monthHost) {
        const calendarNow = month.calendarPeriod || calendarPayrollPeriod();
        monthHost.innerHTML = (month.months || []).map((m) => {
          const isCal = m.period === calendarNow || m.isCalendarCurrent;
          const isSel = m.period === period;
          const readyN = Number(m.ready || 0);
          const waitH = Number(m.waitingHours || 0);
          let line;
          if (isCal) {
            const extra = waitH
              ? ` · ${waitH} ${uiT("sync.waitingHoursShort", "warten auf Stunden")}`
              : (readyN ? ` · ${readyN} ${uiT("sync.readyShort", "bereit")}` : "");
            line = `${uiT("portal.monthCurrent", "Aktueller Monat")} · ${firmStatusLabel(m.status)} · ${m.released}/${m.total}${extra}`;
          } else if (m.period === previousCalendarPeriod()) {
            line = `${uiT("portal.monthParallel", "Parallel abrechnen")} · ${firmStatusLabel(m.status)} · ${m.released}/${m.total}`;
          } else if (!m.total) {
            line = uiT("audit.dataNo", "Keine Daten");
          } else if (m.status === "released") {
            line = `${uiT("audit.released", "Freigegeben")} · ${m.released}/${m.total}`;
          } else {
            line = `${uiT("portal.monthArchive", "Archiv")} · ${uiT("portal.monthManualOpen", "Manuell öffnen")} · ${m.released}/${m.total}`;
          }
          const cls = [
            "month-chip",
            `status-${m.status}`,
            isSel ? "active" : "",
            isCal ? "is-calendar" : "is-archive",
          ].filter(Boolean).join(" ");
          return `
          <button type="button" class="${cls}" data-period="${esc(m.period)}">
            <strong>${esc(m.period)}</strong>
            <span>${esc(line)}</span>
          </button>`;
        }).join("") || `<p class='section-hint'>${esc(uiT("portal.noMonths", "Keine Monate"))}</p>`;
        monthHost.querySelectorAll(".month-chip").forEach((btn) => {
          btn.addEventListener("click", () => {
            const picked = btn.dataset.period;
            const cal = calendarPayrollPeriod();
            setManualPeriodOverride(picked !== cal);
            if ($("payrollMonth")) $("payrollMonth").value = picked;
            if ($("portalPeriod")) $("portalPeriod").value = picked;
            syncLocalizedMonthLabels();
            loadPortalDashboard(true);
            loadApiInbox(true);
          });
        });
      }
      const archHost = $("portalArchiveList");
      if (archHost) {
        const items = arch.items || [];
        archHost.innerHTML = items.length
          ? items.map((it) => {
            const title = employeeTitle(it.employee);
            const idLine = employeeIdLine(it.employee);
            return `
            <div class="api-inbox-item">
              <div>
                <strong>${esc(title)}</strong>
                <span>${esc(idLine ? `${idLine} · ` : "")}${esc(it.period)} · ${esc(firmStatusLabel(it.status))} · ${esc(uiT("kpi.netShort", "Netto"))} ${it.net != null ? PayrollCore.formatAmount(it.net) : "—"}</span>
              </div>
              <div class="api-inbox-actions">
                <button type="button" class="api-arch-open" data-id="${esc(it.jobId)}">${esc(uiT("lohn.open", "Öffnen"))}</button>
                <button type="button" class="api-arch-pdf primary" data-id="${esc(it.jobId)}">PDF</button>
              </div>
            </div>`;
          }).join("")
          : `<div class="company-empty-inbox"><strong>${esc(uiT("portal.archiveEmpty", "Archiv leer"))}</strong><p>${esc(uiT("portal.archiveEmptyHint", "Nach Freigabe erscheinen hier die Abrechnungen."))}</p></div>`;
        archHost.querySelectorAll(".api-arch-open").forEach((btn) => {
          btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
        });
        archHost.querySelectorAll(".api-arch-pdf").forEach((btn) => {
          btn.addEventListener("click", async () => {
            await openApiPayrollJob(btn.dataset.id);
            setTimeout(() => exportPdf(), 400);
          });
        });
      }
      if (!silent) setStatus(`Portal · ${emps.count || 0} MA · Monat ${period}`, true);
      ensureCertDefaults(period);
      refreshElsterCertStatus().catch(() => {});
      loadElsterSubmissions().catch(() => {});
      loadCertificateSummary().catch(() => {});
    } catch (e) {
      if (!silent) setStatus(`Portal: ${e.message}`, false);
    }
  }

  async function seedDemoMonth() {
    toast("Demo-Mitarbeiter sind im Firmenportal deaktiviert. Bitte echte Daten von der Plattform senden.", "info");
  }

  let demoPurgedOnce = false;

  async function purgeDemoData(opts = {}) {
    if (!companyPortalId) return null;
    try {
      const data = await apiFetch("/v1/demo/purge", {
        method: "POST",
        body: JSON.stringify({ companyId: companyPortalId }),
      });
      if (!opts.silent) {
        toast(data.message || "Beispieldaten entfernt", data.ok ? "ok" : "error");
      }
      if (!opts.skipReload) {
        await loadPortalDashboard(true);
        await loadApiInbox(true);
      }
      return data;
    } catch (e) {
      if (!opts.silent) toast(e.message, "error");
      return null;
    }
  }

  function initThemeToggle() {
    const key = "workpass.lohn.theme";
    const apply = (mode) => {
      document.body.classList.toggle("theme-light", mode === "light");
      document.body.classList.toggle("theme-dark", mode !== "light");
      try { localStorage.setItem(key, mode); } catch { /* ignore */ }
      const btn = $("btnThemeToggle");
      if (btn) btn.textContent = mode === "light" ? "Dunkel" : "Hell";
    };
    let mode = "dark";
    try { mode = localStorage.getItem(key) || "dark"; } catch { /* ignore */ }
    apply(mode);
    $("btnThemeToggle")?.addEventListener("click", () => {
      apply(document.body.classList.contains("theme-light") ? "dark" : "light");
    });
  }

  function groupSeenConfirmations(seen) {
    const groups = new Map();
    for (const s of seen || []) {
      const title = String(s.title || s.type || s.label || "Auftrag").trim();
      const period = String(s.period || "—").trim();
      const key = `${title}::${period}`;
      const prev = groups.get(key) || {
        title,
        period,
        label: s.label || "Auftrag gesehen",
        count: 0,
        latestAt: "",
        employees: [],
      };
      prev.count += 1;
      const at = String(s.seenAt || "");
      if (!prev.latestAt || at > prev.latestAt) prev.latestAt = at;
      const who = s.employee?.name || s.employee?.badgeId || s.employee?.id || "";
      if (who && prev.employees.length < 4) prev.employees.push(who);
      groups.set(key, prev);
    }
    return [...groups.values()].sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt)));
  }

  function uiT(key, fallback) {
    const v = window.WorkPassI18n?.t?.(key);
    return (v && v !== key) ? v : (fallback || key);
  }

  function looksLikeIdOnly(name, id) {
    const n = String(name || "").trim();
    const i = String(id || "").trim();
    if (!n) return true;
    if (i && n.toLowerCase() === i.toLowerCase()) return true;
    return false;
  }

  /** Display name for lists; never treat bare ID as a personal name. */
  function employeeTitle(emp) {
    if (!emp) return uiT("lohn.nameMissing", "Name fehlt");
    const id = String(emp.badgeId || emp.id || emp.employeeId || "").trim();
    const name = String(emp.name || emp.employeeName || "").trim();
    if (emp.hasName === false || looksLikeIdOnly(name, id)) {
      return uiT("lohn.nameMissing", "Name fehlt");
    }
    return name;
  }

  function employeeIdLine(emp) {
    const id = String(emp?.badgeId || emp?.id || emp?.employeeId || "").trim();
    if (!id) return "";
    return `${uiT("lohn.id", "ID")}: ${id}`;
  }

  function localizeGapLabel(g) {
    if (!g) return "";
    const code = String(g.code || "").trim();
    if (code) {
      const keyed = uiT(`gap.${code}`, "");
      if (keyed && keyed !== `gap.${code}`) return keyed;
    }
    return String(g.label || g.detail || "")
      .replace(/\s*\([a-z0-9_.]+\)\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function localizeMessageTitle(m) {
    const period = m?.period || "";
    const type = String(m?.type || "");
    const title = String(m?.title || "");
    if (type.includes("invoice") || /^Rechnungen anfordern/i.test(title)) {
      return period
        ? uiT("msg.invoicesRequestPeriod", "Rechnungen anfordern · {period}").replace("{period}", period)
        : uiT("msg.invoicesRequest", "Rechnungen anfordern");
    }
    if (type === "data.gap" || /^Fehlende Daten/i.test(title)) {
      const who = employeeTitle(m.employee);
      const id = String(m.employee?.badgeId || m.employee?.id || "").trim();
      const suffix = looksLikeIdOnly(who, id) && id ? id : who;
      return `${uiT("msg.missingData", "Fehlende Daten")} · ${suffix}`;
    }
    return title || uiT("msg.message", "Nachricht");
  }

  function firmStatusLabel(status) {
    const s = String(status || "").toLowerCase();
    if (s === "released") return uiT("audit.released", "Freigegeben");
    if (s === "calculated" || s === "ready") return uiT("status.calculated", "Berechnet");
    if (s === "empty" || s === "none" || !s) return uiT("audit.dataNo", "Keine Daten");
    if (s === "waiting" || s === "pending" || s === "partial") return uiT("status.waiting", "Wartet");
    if (s === "error" || s === "failed") return uiT("status.check", "Bitte prüfen");
    if (s === "draft") return uiT("status.draft", "Entwurf");
    return status;
  }

  function applyPortalUiCopy() {
    if (!companyPortalId) return;
    const status = $("statusBar");
    if (status) {
      status.setAttribute("data-i18n", "status.firmReady");
      status.textContent = uiT("status.firmReady", "Firmen-Portal bereit – Sync holt Ihre Daten.");
    }
    const hint = $("recvSectionHint");
    if (hint) {
      hint.setAttribute("data-i18n", "empfang.firmHint");
      hint.textContent = uiT("empfang.firmHint", "Ihre Abrechnungen erscheinen automatisch.");
    }
    const title = document.querySelector("#secEmpfang .step-head h2");
    if (title) {
      title.setAttribute("data-i18n", "nav.overview");
      title.textContent = uiT("nav.overview", "Übersicht");
    }
    const flowHint = document.querySelector("#companyFlow .section-hint");
    if (flowHint) flowHint.textContent = uiT("portal.onlyFirm", "Nur Ihre Firma und Ihre Mitarbeiter.");
    const btnLoad = $("btnPortalApplyPeriod");
    if (btnLoad) btnLoad.textContent = uiT("portal.loadMonth", "Monat laden");
    const btnClose = $("btnMonthClose");
    if (btnClose) btnClose.textContent = uiT("portal.monthCloseNow", "Monatsabschluss jetzt");
    const btnPortalClose = $("btnPortalMonthClose");
    if (btnPortalClose) btnPortalClose.textContent = uiT("portal.monthClose", "Monatsabschluss");
    const printNote = document.querySelector(".preview-note");
    if (printNote) printNote.textContent = uiT("preview.printNote", "Druck & PDF = nur dieses Blatt");
    window.WorkPassI18n?.applyDom?.(document);
  }

  function applyAutomationProgress(auto, period) {
    if (!auto?.eligible || !auto.phase) return;
    const host = $("monthCloseProgress");
    if (!host) return;
    if (document.body.classList.contains("month-close-running")) return;
    const phase = String(auto.phase);
    if (phase === "idle" || phase === "off") {
      if (host.dataset.keep !== "1") host.hidden = true;
      return;
    }
    const stepId = phase === "done" ? "done"
      : (phase === "release" ? "release"
        : (phase === "calc" ? "calc" : "pull"));
    host.dataset.keep = phase === "done" ? "0" : "1";
    renderMonthProgress(stepId, {
      percent: Number(auto.percent) || 0,
      title: auto.message || uiT("portal.autoRunning", "Monatsautomatik läuft · {period}").replace("{period}", period || ""),
      states: auto.steps || undefined,
    });
    if (phase === "done") hideMonthProgressSoon(2400);
  }

  function renderPortalCompleteness(data) {
    const card = $("portalCompletenessCard");
    const grid = $("portalCompletenessGrid");
    if (!card || !grid) return;
    if (!data?.ok) {
      card.hidden = true;
      return;
    }
    const t = data.totals || {};
    card.hidden = false;
    const cells = [
      { label: uiT("portal.checkComplete", "Vollständig"), value: t.complete || 0, cls: "ok" },
      { label: uiT("sync.waitingHoursShort", "warten auf Stunden"), value: t.waitingHours || 0, cls: t.waitingHours ? "warn" : "mute" },
      { label: uiT("sync.chipSv", "SV"), value: t.missingSv || 0, cls: t.missingSv ? "warn" : "mute" },
      { label: uiT("sync.chipKk", "KK"), value: t.missingKk || 0, cls: t.missingKk ? "warn" : "mute" },
      { label: uiT("portal.checkLogo", "Logo"), value: data.branding?.hasLogo ? "✓" : "—", cls: data.branding?.hasLogo ? "ok" : "warn" },
      { label: uiT("audit.released", "Freigegeben"), value: t.released || 0, cls: t.released ? "ok" : "mute" },
    ];
    grid.innerHTML = cells.map((c) => `
      <div class="portal-ready-kpi is-${c.cls}">
        <span>${esc(c.label)}</span>
        <strong>${esc(String(c.value))}</strong>
      </div>`).join("");
    const badge = $("portalCompletenessBadge");
    if (badge) {
      badge.textContent = data.readyForMonthClose
        ? uiT("portal.checkReady", "Monatsbereit")
        : uiT("portal.checkOpen", "Noch Lücken");
      badge.classList.toggle("is-ok", Boolean(data.readyForMonthClose));
      badge.classList.toggle("is-error", !data.readyForMonthClose);
    }
  }

  function renderPortalTrust(data) {
    const card = $("portalTrustCard");
    const list = $("portalTrustList");
    if (!card || !list) return;
    if (!data?.ok) {
      card.hidden = true;
      return;
    }
    if (!(data.items || []).length && !(data.gaps || []).length) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    if ($("portalTrustBadge")) {
      $("portalTrustBadge").textContent = `${data.score ?? "—"}/100 ${data.grade || ""}`.trim();
      $("portalTrustBadge").classList.toggle("is-ok", Number(data.score) >= 70);
      $("portalTrustBadge").classList.toggle("is-error", Number(data.score) < 40);
    }
    if ($("portalTrustHint")) $("portalTrustHint").textContent = data.message || "";
    const gapHtml = (data.gaps || []).map((g) => `
      <div class="api-inbox-item">
        <div><strong>${esc(g.label || g.code)}</strong></div>
      </div>`).join("");
    const itemHtml = (data.items || []).slice(0, 15).map((it) => `
      <div class="api-inbox-item">
        <div>
          <strong>${esc(it.employee?.name || it.jobId)}</strong>
          <span class="portal-item-meta">${esc(it.trust)}${it.syncStatus ? (" · " + esc(it.syncStatus)) : ""}${it.webhookLastError ? (" · " + esc(it.webhookLastError)) : ""}</span>
        </div>
      </div>`).join("");
    const sync = data.syncLifecycle?.counts || {};
    const syncLine = Object.keys(sync).length
      ? `<p class="section-hint">Sync: PENDING ${sync.PENDING || 0} · RETRYING ${sync.RETRYING || 0} · PROCESSING ${sync.PROCESSING || 0} · COMPLETED ${sync.COMPLETED || 0} · DEAD_LETTER ${sync.DEAD_LETTER || 0}</p>`
      : "";
    const actions = (data.nextHumanActions || []).some((a) => a.id === "replay_deliveries" || a.id === "replay_dead_letter")
      ? `<div class="month-close-actions" style="margin-top:8px">
          <button type="button" id="btnTrustReplay">${esc(uiT("portal.trustReplay", "Zustellung erneut anstoßen"))}</button>
        </div>`
      : "";
    list.innerHTML = syncLine + gapHtml + itemHtml + actions;
    $("btnTrustReplay")?.addEventListener("click", () => {
      replayDeliveryTrust().catch((e) => toast(e.message, "error"));
    });
  }

  async function replayDeliveryTrust() {
    const companyId = companyPortalId || apiConfig().companyId;
    const period = currentPayrollPeriod();
    const ok = await humanConfirm({
      title: uiT("portal.trustReplayTitle", "Zustellung erneut?"),
      body: uiT("portal.trustReplayBody", "Webhook/Delivery erneut anstoßen. KI sendet keine Steuerwerte – nur Transport."),
      requireCheck: true,
    });
    if (!ok) return;
    const data = await apiFetch("/v1/portal/delivery-trust/replay", {
      method: "POST",
      body: JSON.stringify({ companyId, period, confirm: true }),
    });
    renderPortalTrust(data.trust || data);
    toast(uiT("portal.trustReplayDone", "Zustellung angestoßen."), "ok");
    await loadPortalDashboard(true);
  }

  function renderPortalAnomalies(data) {
    const card = $("portalAnomalyCard");
    const list = $("portalAnomalyList");
    if (!card || !list) return;
    const rows = data?.anomalies || [];
    card.hidden = !rows.length;
    if (!rows.length) return;
    if ($("portalAnomalyBadge")) $("portalAnomalyBadge").textContent = String(rows.length);
    list.innerHTML = rows.slice(0, 30).map((a) => `
      <div class="api-inbox-item">
        <div>
          <strong>${esc(a.employeeName || a.code)} · ${esc(a.severity || "warn")}</strong>
          <span class="portal-item-meta">${esc(a.message || "")}</span>
        </div>
        <div class="api-inbox-actions">
          ${a.jobId ? `<button type="button" class="api-anom-open" data-id="${esc(a.jobId)}">${esc(uiT("lohn.open", "Öffnen"))}</button>` : ""}
        </div>
      </div>`).join("");
    list.querySelectorAll(".api-anom-open").forEach((btn) => {
      btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
    });
  }

  function renderPortalCalendar(data) {
    const card = $("portalCalendarCard");
    const list = $("portalCalendarList");
    if (!card || !list) return;
    if (!data?.ok) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    if ($("portalCalendarBadge")) {
      const s = data.summary || {};
      $("portalCalendarBadge").textContent = s.overdue
        ? `${s.overdue} überfällig`
        : (s.soon ? `${s.soon} bald` : "OK");
      $("portalCalendarBadge").classList.toggle("is-error", Boolean(s.overdue));
    }
    const blockers = (data.blockers || []).map((b) => `
      <div class="api-inbox-item"><div><strong>${esc(b.label || b.code)}</strong>
      <span class="portal-item-meta">${esc(uiT("portal.calendarBlocker", "blockiert Abschluss"))}</span></div></div>`).join("");
    list.innerHTML = blockers + (data.items || []).map((it) => `
      <div class="api-inbox-item">
        <div>
          <strong>${esc(it.title)}</strong>
          <span class="portal-item-meta">${esc(it.dueBankingDay || it.dueDate || "—")}${it.overdue ? " · überfällig" : (it.urgency === "soon" ? " · bald" : "")} · ${esc(it.hint || "")}</span>
        </div>
      </div>`).join("");
  }

  function renderAssistantExplain(data) {
    const card = $("portalAssistantCard");
    const list = $("portalAssistantList");
    if (!card || !list) return;
    card.hidden = false;
    list.innerHTML = (data.explanations || []).map((ex) => `
      <div class="api-inbox-item">
        <div>
          <strong>${esc(ex.title || ex.code)}</strong>
          <span class="portal-item-meta">${esc(ex.body || "")}</span>
        </div>
      </div>`).join("")
      + ((data.suggestedHumanActions || []).length
        ? `<p class="section-hint">${esc(uiT("portal.assistantActions", "Vorschläge (Sie entscheiden):"))} `
          + (data.suggestedHumanActions || []).map((a) => esc(a.label)).join(" · ")
          + `</p>`
        : "");
  }

  async function refreshElsterCertStatus() {
    const host = $("portalElsterCertStatus");
    const channelHost = $("portalElsterChannelStatus");
    const badge = $("portalElsterChannelBadge");
    try {
      const data = await apiFetch("/v1/portal/elster-cert");
      const channel = data.channel || {};
      if (host) {
        if (!data.configured) {
          host.textContent = uiT("portal.elsterCertMissing", "Noch kein Zertifikat hinterlegt.");
        } else {
          host.textContent = uiT(
            "portal.elsterCertOk",
            "Zertifikat gespeichert · Auto-Versand {auto} · Fingerprint {fp}"
          ).replace("{auto}", data.autoSubmit ? "an" : "aus").replace("{fp}", data.fingerprint || "—");
        }
      }
      const modeLabel = channel.mode === "eric-cmd"
        ? "ERiC"
        : (channel.mode === "submit-url" ? "HTTP-Sidecar" : "aus");
      if (channelHost) {
        const line = channel.connected
          ? uiT("portal.elsterChannelOn", "ELSTER-Kanal verbunden ({mode}).").replace("{mode}", modeLabel)
          : uiT("portal.elsterChannelOff", "ELSTER-Kanal aus — Aufträge bleiben lokal (nicht beim Finanzamt).");
        const testLine = channel.testMode
          ? uiT("portal.elsterTestMode", "Testmodus (Testmerker 700000004) — nicht das Finanzamt.")
          : uiT("portal.elsterLiveMode", "Produktivmodus (WORKPASS_ELSTER_TEST=0).");
        channelHost.textContent = `${line} ${testLine}`;
      }
      if (badge) {
        badge.hidden = false;
        badge.textContent = channel.connected
          ? uiT("portal.elsterBadgeOn", "ELSTER-Kanal an")
          : uiT("portal.elsterBadgeOff", "ELSTER-Kanal aus");
        badge.classList.toggle("is-ok", Boolean(channel.connected));
        badge.classList.toggle("is-error", !channel.connected);
      }
    } catch {
      if (host) host.textContent = "";
      if (channelHost) channelHost.textContent = "";
    }
  }

  function elsterStatusLabel(status) {
    const map = {
      PENDING: uiT("portal.elsterStatusPending", "Bereit lokal — nicht beim Finanzamt"),
      PROCESSING: uiT("portal.elsterStatusProcessing", "Wird an den Kanal gesendet"),
      SENT: uiT("portal.elsterStatusSent", "An ELSTER-Kanal übergeben"),
      COMPLETED: uiT("portal.elsterStatusCompleted", "An ELSTER-Kanal übergeben"),
      FAILED: uiT("portal.elsterStatusFailed", "Senden fehlgeschlagen"),
    };
    return map[String(status || "").toUpperCase()] || String(status || "");
  }

  async function loadElsterSubmissions() {
    const host = $("portalElsterList");
    if (!host) return;
    try {
      const data = await apiFetch("/v1/portal/elster-submissions");
      const rows = data.submissions || [];
      if (!rows.length) {
        host.innerHTML = `<p class="section-hint">${esc(uiT("portal.elsterSubmissionsEmpty", "Noch keine ELSTER-Aufträge."))}</p>`;
        return;
      }
      host.innerHTML = `<p class="section-hint">${esc(uiT("portal.elsterSubmissionsHead", "ELSTER-Aufträge"))}</p>`
        + rows.map((r) => {
          const meta = [elsterStatusLabel(r.status), r.year, r.mode || "", r.testMode ? "Test" : ""]
            .filter(Boolean)
            .join(" · ");
          const extra = r.error ? `<p class="section-hint">${esc(r.error)}</p>` : "";
          return `<div class="api-inbox-item"><div><strong>${esc(r.submissionId)}</strong>
            <span class="portal-item-meta">${esc(meta)}</span></div>${extra}</div>`;
        }).join("");
    } catch (e) {
      host.innerHTML = `<p class="section-hint">${esc(e.message || uiT("portal.elsterSubmissionsFail", "ELSTER-Aufträge konnten nicht geladen werden."))}</p>`;
    }
  }

  function certYearValue() {
    const y = Number($("certYear")?.value);
    return y || new Date().getFullYear();
  }

  function certEmployeeIdValue(fallback = "") {
    return String($("certEmployeeId")?.value || fallback || "").trim();
  }

  function ensureCertDefaults(period) {
    const certYear = $("certYear");
    if (certYear && !certYear.value) {
      certYear.value = String(String(period || "").slice(0, 4) || new Date().getFullYear());
    }
    const certPeriod = $("certPeriod");
    if (certPeriod && !certPeriod.value) {
      certPeriod.value = period || calendarPayrollPeriod();
    }
  }

  function certSplitMoneyParts(value) {
    const n = Math.abs(Number(value) || 0);
    const fixed = n.toFixed(2);
    const [euroPart, centPart] = fixed.split(".");
    return { euro: Number(euroPart).toLocaleString("de-DE"), cent: centPart || "00" };
  }

  function certFormatDateDe(value) {
    if (!value) return "-";
    if (PayrollCore?.formatDateDE) return PayrollCore.formatDateDE(value, true);
    const s = String(value).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return s;
  }

  function certTaxClassDisplay(taxClass) {
    return String(taxClass || "I").trim() || "I";
  }

  function renderLstbRowsHtml(rows) {
    return (rows || []).map((row) => {
      const isReserved = String(row.key || "").startsWith("empty");
      if (row.money) {
        const parts = certSplitMoneyParts(row.value);
        return `<tr${isReserved ? ' class="lstb-reserved lstb-empty"' : ""}><td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${esc(row.label)}</td><td class="lstb-euro">${parts.euro}</td><td class="lstb-cent">${parts.cent}</td></tr>`;
      }
      if (row.key === "certPeriod") {
        return `<tr class="lstb-text"><td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${esc(row.label)}</td><td class="lstb-euro" colspan="2">${esc(String(row.value || "-"))}</td></tr>`;
      }
      return `<tr${isReserved ? ' class="lstb-reserved lstb-empty"' : ""}><td class="lstb-nr">${row.nr}</td><td class="lstb-desc">${esc(row.label)}</td><td class="lstb-euro">${esc(String(row.value ?? ""))}</td><td class="lstb-cent"></td></tr>`;
    }).join("");
  }

  function renderLstbPrintHtml(data) {
    const year = data.year || new Date().getFullYear();
    const kmId = window.ElsterExport?.generateKmId?.(data)
      || `FD${year}${String(data.personnelNumber || data.employeeTaxId || "0000").replace(/\W/g, "").slice(0, 8)}`;
    const finanzamt = data.taxNumber
      ? String(data.taxNumber).trim()
      : "— bitte Steuernummer der Firma eintragen —";
    const finanzamtHint = data.taxNumber
      ? "Steuernummer der Firma (Betriebsstättenfinanzamt) · nicht Wohnsitzfinanzamt des Mitarbeiters"
      : "Firma → Steuer-Nr. eintragen (z. B. 143/123/45678)";
    const periodDates = data.certPeriod || "-";
    const periodVonBis = data.certPeriodLabel
      || (window.AnnualCertificate?.formatCertPeriodVonBis?.(data.periodStart, data.periodEnd) || "")
      || (periodDates !== "-" ? `Zeitraum ${periodDates}` : "");
    const church = Number(data.churchTaxRate) > 0 ? `${data.churchTaxRate} %` : "keine";
    const empBlock = [data.employeeName, data.employeeAddress].filter(Boolean).join("\n").trim() || data.employeeName || "-";
    const monthsSummary = data.hasData
      ? `Abgerechnete Monate ${year}: ${(data.totals?.months || []).join(", ")} (${data.totals?.monthsCount || 0} Monat(e))`
      : `Keine freigegebenen Monate für ${year}.`;
    const footerNote = `Bescheinigung nach § 39 Abs. 1 EStG für ${year} · Summe aus ${data.totals?.monthsCount || 0} Monatsabrechnung(en) · LSt BMF PAP · SV SGB IV`;
    return `
      <article class="lstb-document">
        <header class="lstb-official-header">
          <div class="lstb-header-left">
            <p class="lstb-finanzamt">Finanzamt / Gemeinde</p>
            <p class="lstb-finanzamt-val">${esc(finanzamt)}</p>
            <p class="lstb-finanzamt-hint">${esc(finanzamtHint)}</p>
          </div>
          <div class="lstb-header-center">
            <h2>Lohnsteuerbescheinigung</h2>
            <p>für das Kalenderjahr <strong>${year}</strong></p>
            <p class="lstb-period-banner">${esc(periodVonBis)}</p>
            <p class="lstb-period-dates">${esc(periodDates)}</p>
            <p class="lstb-sub">Ausdruck der elektronischen Lohnsteuerbescheinigung nach § 39 Abs. 1 EStG</p>
          </div>
          <div class="lstb-header-right">
            <p>KmId</p>
            <p class="lstb-kmid">${esc(kmId)}</p>
          </div>
        </header>
        <header class="lstb-title-block lstb-title-block-secondary">
          <p>WorkPass Lohn · BMF PAP / SGB IV · Jahr <strong>${year}</strong></p>
        </header>
        <div class="lstb-grid">
          <div class="lstb-left">
            <table class="lstb-meta-table">
              <tbody>
                <tr><td class="lstb-lbl">Personal-Nr.</td><td>${esc(data.personnelNumber || data.employeeId || "-")}</td></tr>
                <tr><td class="lstb-lbl">Identifikationsnummer</td><td>${esc(data.employeeTaxId || "-")}</td></tr>
                <tr><td class="lstb-lbl">SV-Nummer</td><td>${esc(data.employeeInsuranceNo || "-")}</td></tr>
                <tr><td class="lstb-lbl">Geburtsdatum</td><td>${esc(certFormatDateDe(data.employeeBirthDate))}</td></tr>
                <tr><td class="lstb-lbl">Steuerklasse</td><td>${esc(certTaxClassDisplay(data.taxClass))}</td></tr>
                <tr><td class="lstb-lbl">Kinderfreibeträge (ZKF)</td><td>${esc(String(data.childAllowanceFactor ?? 0))}</td></tr>
                <tr><td class="lstb-lbl">Kirchensteuer</td><td>${esc(church)}</td></tr>
                <tr><td class="lstb-lbl">Zeitraum</td><td>${esc(periodVonBis ? `${periodVonBis} (${periodDates})` : periodDates)}</td></tr>
              </tbody>
            </table>
            <div class="lstb-address-block">
              <div class="lstb-block-h">Arbeitnehmer/in</div>
              <pre>${esc(empBlock)}</pre>
            </div>
            <div class="lstb-address-block">
              <div class="lstb-block-h">Arbeitgeber</div>
              <pre>${esc(data.seller || "-")}</pre>
            </div>
            <p class="lstb-months-summary">${esc(monthsSummary)}</p>
          </div>
          <div class="lstb-right">
            <table class="lstb-rows-table">
              <thead>
                <tr>
                  <th class="lstb-nr">Nr.</th>
                  <th class="lstb-desc">Bezeichnung</th>
                  <th class="lstb-euro">Euro</th>
                  <th class="lstb-cent">Cent</th>
                </tr>
              </thead>
              <tbody>${renderLstbRowsHtml(data.rows)}</tbody>
            </table>
          </div>
        </div>
        <footer class="lstb-footer-note">
          <p>${esc(footerNote)}</p>
        </footer>
      </article>`;
  }

  function renderVerdienstPrintHtml(data) {
    const year = data.year || new Date().getFullYear();
    const periodLabel = formatPeriodLabel(data.period) || data.period || "-";
    const months = Array.isArray(data.monthsInYear) ? data.monthsInYear : [];
    const monthsLabel = months.length
      ? months.map((m) => formatPeriodLabel(m) || m).join(", ")
      : "-";
    const persNr = String(data.personnelNumber || "").trim() || "—";
    const empBlock = [data.employeeName, data.employeeAddress].filter(Boolean).join("\n").trim() || data.employeeName || "-";
    const rows = (data.rows || []).map((row) => {
      const cls = row.deduction ? " class=\"vb-deduction\"" : "";
      return `
      <tr${cls}>
        <td>${esc(row.label)}</td>
        <td class="num">${esc(PayrollCore.formatAmount(row.monthly || 0))}</td>
        <td class="num">${esc(PayrollCore.formatAmount(row.yearly || 0))}</td>
      </tr>`;
    }).join("");
    return `
      <article class="verdienst-document vb-sheet-a4">
        <header class="vb-header">
          <div class="vb-header-top">
            <div>
              <p class="vb-kicker">WorkPass Lohn · Form VB</p>
              <h2 class="vb-title">Verdienstbescheinigung</h2>
            </div>
            <div class="vb-header-period">
              <span>Bezugsmonat</span>
              <strong>${esc(periodLabel)}</strong>
              <em>Jahr ${esc(String(year))}</em>
            </div>
          </div>
          <p class="vb-sub">Ausdruck für den Arbeitnehmer · Beträge aus freigegebenen Monatsabrechnungen</p>
        </header>
        <div class="vb-grid">
          <section class="vb-party">
            <h3>Arbeitnehmer/in</h3>
            <pre>${esc(empBlock)}</pre>
            <table class="vb-meta-table">
              <tr><td>Personal-Nr.</td><td>${esc(persNr)}</td></tr>
              <tr><td>Identifikationsnummer</td><td>${esc(data.employeeTaxId || "—")}</td></tr>
              <tr><td>SV-Nummer</td><td>${esc(data.employeeInsuranceNo || "—")}</td></tr>
              <tr><td>Geburtsdatum</td><td>${esc(certFormatDateDe(data.employeeBirthDate))}</td></tr>
              <tr><td>Steuerklasse</td><td>${esc(certTaxClassDisplay(data.taxClass))}</td></tr>
            </table>
          </section>
          <section class="vb-party">
            <h3>Arbeitgeber</h3>
            <pre>${esc(data.seller || "—")}</pre>
            <table class="vb-meta-table">
              <tr><td>Steuernummer</td><td>${esc(data.taxNumber || "—")}</td></tr>
              <tr><td>Abgerechnete Monate ${esc(String(year))}</td><td>${esc(String(data.monthsCount || months.length || 0))}</td></tr>
            </table>
            <p class="vb-months">${esc(monthsLabel)}</p>
          </section>
        </div>
        <table class="portal-vb-table vb-amounts">
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th class="num">mtl. (${esc(periodLabel)})</th>
              <th class="num">Jahr ${esc(String(year))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer class="vb-footer">
          <p>mtl. = Bezugsmonat · Jahr = Summe freigegebener Monate ${esc(String(year))}</p>
          <p class="vb-legal">Ausdruck für den Arbeitnehmer · nicht Bestandteil der Monatsabrechnung · ${esc(new Date().toLocaleString("de-DE"))}</p>
        </footer>
      </article>`;
  }

  let certPrintTitleRestore = "";

  function closeCertificatePrint() {
    const host = $("portalCertPrintHost");
    if (host) {
      host.hidden = true;
      host.innerHTML = "";
      host.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("portal-cert-printing");
    if (certPrintTitleRestore) document.title = certPrintTitleRestore;
    window.removeEventListener("afterprint", closeCertificatePrint);
  }

  function openCertificatePrint(contentHtml, title) {
    const host = $("portalCertPrintHost");
    if (!host) return;
    certPrintTitleRestore = document.title;
    host.innerHTML = `
      <div class="portal-cert-actions">
        <button type="button" class="portal-cta-primary" id="btnCertPrintNow">${esc(uiT("portal.certPrint", "Drucken"))}</button>
        <button type="button" class="portal-cta-secondary" id="btnCertPrintClose">${esc(uiT("portal.certClose", "Schließen"))}</button>
      </div>
      ${contentHtml}`;
    host.hidden = false;
    host.removeAttribute("aria-hidden");
    document.body.classList.add("portal-cert-printing");
    if (title) document.title = title;
    host.querySelector("#btnCertPrintClose")?.addEventListener("click", closeCertificatePrint);
    host.querySelector("#btnCertPrintNow")?.addEventListener("click", () => {
      window.addEventListener("afterprint", closeCertificatePrint, { once: true });
      requestAnimationFrame(() => window.print());
    });
  }

  async function fetchCertificateLstb(employeeId, year) {
    const companyId = companyPortalId || apiConfig().companyId;
    const params = new URLSearchParams({ companyId, employeeId, year: String(year) });
    return apiFetch(`/v1/portal/certificates/lstb?${params}`);
  }

  async function fetchCertificateVerdienst(employeeId, year, period) {
    const companyId = companyPortalId || apiConfig().companyId;
    const params = new URLSearchParams({ companyId, employeeId, year: String(year) });
    if (period) params.set("period", period);
    return apiFetch(`/v1/portal/certificates/verdienst?${params}`);
  }

  async function showLstbCertificate(employeeId, year) {
    const eid = String(employeeId || certEmployeeIdValue()).trim();
    const y = Number(year) || certYearValue();
    if (!eid) {
      toast(uiT("portal.certNeedEmployee", "Bitte Mitarbeiter-ID eingeben."), "error");
      return;
    }
    if ($("certEmployeeId")) $("certEmployeeId").value = eid;
    if ($("certYear")) $("certYear").value = String(y);
    try {
      const data = await fetchCertificateLstb(eid, y);
      if (!data.ok) throw new Error(data.error || uiT("portal.certLstbFail", "LStB konnte nicht erstellt werden."));
      openCertificatePrint(
        `<section class="portal-cert-page">${renderLstbPrintHtml(data)}</section>`,
        `Lohnsteuerbescheinigung ${y} · ${eid}`
      );
      toast(uiT("portal.certLstbReady", "Lohnsteuerbescheinigung bereit – Drucken."), "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function showAllLstbCertificates(year) {
    const y = Number(year) || certYearValue();
    if ($("certYear")) $("certYear").value = String(y);
    try {
      const companyId = companyPortalId || apiConfig().companyId;
      const summary = await apiFetch(`/v1/portal/certificates/summary?companyId=${encodeURIComponent(companyId)}&year=${y}`);
      const employees = summary.employees || [];
      if (!employees.length) {
        toast(uiT("portal.certEmpty", "Keine freigegebenen Monate für dieses Jahr."), "error");
        return;
      }
      const pages = [];
      const failed = [];
      for (const e of employees) {
        try {
          const data = await fetchCertificateLstb(e.employeeId, y);
          if (!data.ok) {
            failed.push(e.employeeId);
            continue;
          }
          pages.push(`<section class="portal-cert-page">${renderLstbPrintHtml(data)}</section>`);
        } catch {
          failed.push(e.employeeId);
        }
      }
      if (!pages.length) {
        toast(uiT("portal.certLstbFail", "LStB konnte nicht erstellt werden."), "error");
        return;
      }
      openCertificatePrint(pages.join(""), `Lohnsteuerbescheinigungen ${y}`);
      const msg = failed.length
        ? uiT("portal.certLstbAllPartial", "LStB bereit ({ok} von {n}) – Drucken.")
          .replace("{ok}", String(pages.length))
          .replace("{n}", String(employees.length))
        : uiT("portal.certLstbAllReady", "Alle Lohnsteuerbescheinigungen bereit – Drucken.")
          .replace("{n}", String(pages.length));
      toast(msg, failed.length ? "info" : "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function showVerdienstCertificate(employeeId, year, period) {
    const eid = String(employeeId || certEmployeeIdValue()).trim();
    const y = Number(year) || certYearValue();
    const p = String(period || $("certPeriod")?.value || currentPayrollPeriod() || "").trim();
    if (!eid) {
      toast(uiT("portal.certNeedEmployee", "Bitte Mitarbeiter-ID eingeben."), "error");
      return;
    }
    if ($("certEmployeeId")) $("certEmployeeId").value = eid;
    if ($("certYear")) $("certYear").value = String(y);
    if ($("certPeriod") && p) $("certPeriod").value = p;
    try {
      const data = await fetchCertificateVerdienst(eid, y, p || undefined);
      if (!data.ok) throw new Error(data.error || uiT("portal.certVerdienstFail", "Verdienstbescheinigung konnte nicht erstellt werden."));
      openCertificatePrint(
        `<section class="portal-cert-page">${renderVerdienstPrintHtml(data)}</section>`,
        `Verdienstbescheinigung ${formatPeriodLabel(data.period) || p} · ${eid}`
      );
      toast(uiT("portal.certVerdienstReady", "Verdienstbescheinigung bereit – Drucken."), "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function renderCertificateSummaryList(data) {
    const host = $("portalCertList");
    if (!host) return;
    const year = data.year || certYearValue();
    const employees = data.employees || [];
    host.innerHTML = employees.length
      ? `<p class="section-hint portal-cert-summary-head">${esc(uiT("portal.certSummaryHead", "Jahresübersicht {year}: {n} Mitarbeiter mit freigegebenen Monaten").replace("{year}", String(year)).replace("{n}", String(employees.length)))}</p>`
        + employees.map((e) => `
        <div class="api-inbox-item">
          <div>
            <strong>${esc(e.name)}</strong>
            <span class="portal-item-meta">${esc(e.employeeId)} · ${esc((e.months || []).join(", "))} · ${e.months?.length || 0} ${esc(uiT("portal.certMonths", "Monate"))}</span>
          </div>
          <div class="api-inbox-actions">
            <button type="button" class="api-cert-lstb" data-emp="${esc(e.employeeId)}" data-year="${year}">LStB</button>
            <button type="button" class="api-cert-vb" data-emp="${esc(e.employeeId)}" data-year="${year}">VB</button>
          </div>
        </div>`).join("")
      : `<p class="section-hint">${esc(uiT("portal.certEmpty", "Keine freigegebenen Monate für dieses Jahr."))}</p>`;
    host.querySelectorAll(".api-cert-lstb").forEach((btn) => {
      btn.addEventListener("click", () => showLstbCertificate(btn.dataset.emp, Number(btn.dataset.year)));
    });
    host.querySelectorAll(".api-cert-vb").forEach((btn) => {
      btn.addEventListener("click", () => showVerdienstCertificate(btn.dataset.emp, Number(btn.dataset.year)));
    });
    host.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadCertificateSummary() {
    const host = $("portalCertList");
    if (!host) {
      toast(uiT("portal.certSummaryMissing", "Jahresübersicht-Bereich nicht gefunden."), "error");
      return;
    }
    ensureCertDefaults(currentPayrollPeriod());
    const btn = $("btnCertSummary");
    if (btn) btn.disabled = true;
    host.innerHTML = `<p class="section-hint">${esc(uiT("portal.certSummaryLoading", "Jahresübersicht wird geladen…"))}</p>`;
    try {
      const companyId = companyPortalId || apiConfig().companyId;
      if (!companyId) {
        throw new Error(uiT("portal.needCompany", "Firmen-ID fehlt. Bitte anmelden oder Firma wählen."));
      }
      const year = certYearValue();
      const data = await apiFetch(`/v1/portal/certificates/summary?companyId=${encodeURIComponent(companyId)}&year=${year}`);
      if (!data.ok) {
        throw new Error(data.error || uiT("portal.certSummaryFail", "Jahresübersicht konnte nicht geladen werden."));
      }
      renderCertificateSummaryList(data);
      const n = (data.employees || []).length;
      toast(
        n
          ? uiT("portal.certSummaryOk", "Jahresübersicht: {n} Mitarbeiter").replace("{n}", String(n))
          : uiT("portal.certEmpty", "Keine freigegebenen Monate für dieses Jahr."),
        n ? "ok" : "error"
      );
    } catch (e) {
      host.innerHTML = `<p class="section-hint">${esc(e.message || uiT("portal.certSummaryFail", "Jahresübersicht konnte nicht geladen werden."))}</p>`;
      toast(e.message || uiT("portal.certSummaryFail", "Jahresübersicht konnte nicht geladen werden."), "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function downloadConfirmedExport(path, fileNameHint) {
    const companyId = companyPortalId || apiConfig().companyId;
    const period = currentPayrollPeriod();
    const ok = await humanConfirm({
      title: uiT("portal.exportConfirmTitle", "Export bestätigen"),
      body: uiT(
        "portal.confirmExport",
        "Export wirklich erzeugen? KI setzt nichts fest – Sie laden die Datei und reichen sie selbst ein."
      ),
      requireCheck: true,
    });
    if (!ok) return;
    const data = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify({ companyId, period, confirm: true }),
    });
    if (data.xml) {
      const blob = new Blob([data.xml], { type: data.contentType || "application/xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = data.fileName || fileNameHint || "export.xml";
      a.click();
      URL.revokeObjectURL(a.href);
      toast(uiT("portal.exportDone", "Export bereit – bitte selbst einreichen."), "ok");
      return;
    }
    if (data.csv || data.content || data.package || data.files) {
      const text = data.csv || data.content
        || (Array.isArray(data.files)
          ? data.files.map((f) => `=== ${f.name} ===\n${f.content || ""}`).join("\n\n")
          : null)
        || JSON.stringify(data.package || data, null, 2);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = data.fileName || data.filename || fileNameHint || "export.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      toast(uiT("portal.exportDone", "Export bereit – bitte selbst einreichen."), "ok");
      return;
    }
    toast(data.message || data.error || "Export", data.ok ? "ok" : "error");
  }

  function renderPortalReadiness(cur = {}, emps = {}, period = "") {
    const card = $("portalReadinessCard");
    const grid = $("portalReadinessGrid");
    if (!card || !grid) return;
    const ready = Number(cur.ready || 0);
    const waitingHours = Number(cur.waitingHours || 0);
    const missingSv = Number(cur.missingSv || 0);
    const missingKk = Number(cur.missingKk || 0);
    const released = Number(cur.released || 0);
    const total = Number(cur.total || emps.count || 0);
    const show = total > 0 || ready || waitingHours || missingSv || missingKk || released;
    card.hidden = !show;
    if (!show) return;
    const cells = [
      { label: uiT("sync.chipReady", "Bereit"), value: ready, cls: "ok" },
      { label: uiT("sync.waitingHoursShort", "warten auf Stunden"), value: waitingHours, cls: waitingHours ? "warn" : "mute" },
      { label: uiT("sync.chipSv", "SV"), value: missingSv, cls: missingSv ? "warn" : "mute" },
      { label: uiT("sync.chipKk", "KK"), value: missingKk, cls: missingKk ? "warn" : "mute" },
      { label: uiT("audit.released", "Freigegeben"), value: released, cls: released ? "ok" : "mute" },
    ];
    grid.innerHTML = cells.map((c) => `
      <div class="portal-ready-kpi is-${c.cls}">
        <span>${esc(c.label)}</span>
        <strong>${esc(String(c.value))}</strong>
      </div>`).join("");
    const badge = $("portalReadinessBadge");
    if (badge) {
      badge.textContent = waitingHours
        ? uiT("portal.waitHoursShort", "Stunden offen")
        : (missingSv || missingKk
          ? uiT("portal.stammdatenOpen", "Stammdaten offen")
          : (released === total && total > 0
            ? uiT("audit.released", "Freigegeben")
            : uiT("lohn.ready", "Bereit")));
      badge.classList.toggle("is-error", Boolean(waitingHours || missingSv || missingKk));
      badge.classList.toggle("is-ok", !waitingHours && !missingSv && !missingKk && total > 0);
    }
    const hint = $("portalReadinessHint");
    if (hint) {
      const monthLabel = formatPeriodLabel(period || currentPayrollPeriod());
      hint.textContent = uiT(
        "portal.readinessHintMonth",
        "Bereitschaft nur für {month}: wer fertig ist, wer noch auf Stunden oder Stammdaten wartet."
      ).replace("{month}", monthLabel);
    }
  }

  function renderPortalBranding(branding) {
    const card = $("portalBrandingCard");
    if (!card) return;
    if (!branding?.ok) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const badge = $("portalBrandingBadge");
    const hint = $("portalBrandingHint");
    const ready = Boolean(branding.ready);
    if (badge) {
      badge.textContent = ready
        ? uiT("portal.brandingOk", "Vollständig")
        : uiT("portal.brandingIncomplete", "Unvollständig");
      badge.classList.toggle("is-ok", ready);
      badge.classList.toggle("is-error", !ready);
    }
    if (hint) {
      const parts = [];
      parts.push(branding.hasLogo
        ? uiT("portal.brandingHasLogo", "Logo vorhanden")
        : uiT("portal.brandingNoLogo", "Logo fehlt"));
      parts.push(branding.hasSeller
        ? uiT("portal.brandingHasSeller", "Absender vorhanden")
        : uiT("portal.brandingNoSeller", "Absender fehlt"));
      parts.push(branding.hasTax
        ? uiT("portal.brandingHasTax", "Steuer-Nr. vorhanden")
        : uiT("portal.brandingNoTax", "Steuer-Nr. fehlt"));
      hint.textContent = parts.join(" · ");
      if (!branding.hasLogo) {
        hint.textContent += ` · ${uiT("portal.brandingLogoHint", "WorkPass holt das Logo direkt von der Plattform. Fehlt es dort, geht eine klare Anfrage raus.")}`;
      }
    }
  }

  function renderPortalDiagnosis(emps = {}, cur = {}) {
    const card = $("portalDiagCard");
    const list = $("portalDiagList");
    if (!card || !list) return;
    const rows = (emps.employees || []).filter((e) => {
      const s = e.sync || {};
      return s.waitingHours || !s.hasSv || !s.hasKk || (!s.ready && e.lastStatus !== "released");
    }).slice(0, 12);
    card.hidden = !rows.length;
    if (!rows.length) return;
    if ($("portalDiagBadge")) {
      $("portalDiagBadge").textContent = `${rows.length} ${uiT("portal.diagOpen", "offen")}`;
    }
    list.innerHTML = rows.map((e) => {
      const s = e.sync || {};
      const gaps = [];
      if (s.waitingHours || (s.hasHourlyRate && !s.hasHours && !s.hasGross)) {
        gaps.push(uiT("sync.chipHours", "Stunden"));
      }
      if (!s.hasSv) gaps.push(uiT("sync.chipSv", "SV"));
      if (!s.hasKk) gaps.push(uiT("sync.chipKk", "KK"));
      if (!gaps.length) gaps.push(uiT("sync.chipWait", "Wartet"));
      return `
        <div class="api-inbox-item">
          <div>
            <strong>${esc(employeeTitle(e))}</strong>
            <span class="portal-item-meta">${esc(employeeIdLine(e))} · ${esc(gaps.join(" · "))}</span>
          </div>
          <div class="api-inbox-actions">
            ${e.lastJobId ? `<button type="button" class="api-diag-open primary" data-id="${esc(e.lastJobId)}">${esc(uiT("lohn.open", "Öffnen"))}</button>` : ""}
          </div>
        </div>`;
    }).join("");
    list.querySelectorAll(".api-diag-open").forEach((btn) => {
      btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
    });
    void cur;
  }

  let hoursWaitTimer = null;
  function stopHoursWaitRefresh() {
    clearTimeout(hoursWaitTimer);
    hoursWaitTimer = null;
  }

  function renderPortalHoursWait(cur = {}, period = "") {
    const card = $("portalWaitCard");
    if (!card) return;
    const waiting = Number(cur.waitingHours || 0);
    card.hidden = waiting <= 0;
    if (waiting <= 0) {
      stopHoursWaitRefresh();
      return;
    }
    const monthLabel = formatPeriodLabel(period || currentPayrollPeriod());
    const isCurrent = (period || currentPayrollPeriod()) === calendarPayrollPeriod();
    if ($("portalWaitTitle")) {
      $("portalWaitTitle").textContent = uiT("portal.waitHoursTitleMonth", "Warte auf Stunden · {month}")
        .replace("{month}", monthLabel)
        + ` · ${waiting}`;
    }
    if ($("portalWaitHint")) {
      $("portalWaitHint").textContent = isCurrent
        ? uiT(
          "portal.waitHoursHint",
          "Stundenlohn ist da. Sobald die Plattform die Stunden sendet, berechnet WorkPass automatisch."
        )
        : uiT(
          "portal.waitHoursHintArchive",
          "Archivmonat {month}: Stunden fehlen. Automatik rechnet nur den aktuellen Kalendermonat – hier nur nach manueller Prüfung."
        ).replace("{month}", monthLabel);
    }
    if (!hoursWaitTimer && isCurrent) {
      hoursWaitTimer = setTimeout(async () => {
        hoursWaitTimer = null;
        try {
          await runAutoSyncNow({ quiet: true });
        } catch { /* ignore */ }
        await loadPortalDashboard(true);
      }, 20000);
    }
    if (!isCurrent) stopHoursWaitRefresh();
  }

  function renderPortalPlatformAlert(platformBlocked, pending = 0, employees = 0, pendingDeliveries = 0) {
    const host = $("portalPlatformAlert");
    if (!host) return;
    if (!platformBlocked && !(pendingDeliveries > 0)) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    if (platformBlocked) {
      host.innerHTML = `
        <strong>${esc(uiT("portal.blockedTitle", "Plattform-Verbindung blockiert"))}</strong>
        <span>${esc(uiT(
          "portal.blockedHint",
          "Accounting ist bereit (Monatsautomatik an), aber die Plattform lehnt die Verbindung ab. Ohne Antwort kommen keine Mitarbeiternamen, kein Logo und keine Monatsdaten an. Bitte Ihren Plattform-Administrator informieren: Verbindungsschlüssel zwischen Plattform und Accounting abstimmen – oder die Plattform liefert Mitarbeiter/Monat per Import."
        ))}</span>
        <span style="display:block;margin-top:6px;opacity:.85">${esc(
          uiT("portal.blockedMeta", "Offene Anfragen: {n} · Mitarbeiter bisher: {e}")
            .replace("{n}", String(pending))
            .replace("{e}", String(employees))
        )}</span>`;
      return;
    }
    host.innerHTML = `
      <strong>${esc(uiT("portal.deliveryPendingTitle", "Abrechnungen warten auf die Plattform"))}</strong>
      <span>${esc(uiT(
        "portal.deliveryPendingHint",
        "{n} fertige Abrechnung(en) liegen bereit. Die Plattform muss Event payslip.released speichern (Antwort: accepted:true) oder GET /v1/delivery/pending pollen – sonst erscheint nichts in der Mitarbeiter-App."
      ).replace("{n}", String(pendingDeliveries)))}</span>`;
  }

  function renderPortalCommandStatus({
    period,
    employees = 0,
    released = 0,
    openMessages = 0,
    pending = 0,
    hasData = false,
    monthDone = false,
    automation = null,
    platformBlocked = false,
  } = {}) {
    const host = $("portalCommandStatus");
    if (!host) return;
    host.hidden = false;
    let title = uiT("hub.outcome.active", "Lohnlauf aktiv");
    let hint = uiT("hub.outcome.activeHint", "{employees} Mitarbeiter · {released} freigegeben · Monat {period}")
      .replace("{employees}", String(employees))
      .replace("{released}", String(released))
      .replace("{period}", period || currentPayrollPeriod());
    let tone = "ok";
    const autoOn = Boolean(automation?.eligible);
    const autoDone = Boolean(automation?.phase === "done" || monthDone);
    const autoWait = Boolean(automation?.waitingForPlatform || automation?.phase === "waiting");
    if (platformBlocked) {
      title = uiT("portal.blockedTitle", "Plattform-Verbindung blockiert");
      hint = uiT(
        "portal.blockedShort",
        "Deshalb fehlen Namen, Branding und Abrechnungen – Accounting wartet auf die Plattform."
      );
      tone = "blocked";
    } else if (autoDone) {
      title = uiT("hub.outcome.done", "Alles bereit für diesen Monat");
      hint = uiT("hub.outcome.doneHint", "{released} Abrechnung(en) freigegeben · Monat {period}")
        .replace("{released}", String(automation?.jobs?.released ?? released))
        .replace("{period}", period || currentPayrollPeriod());
      tone = "ok";
    } else if (autoOn && (autoWait || pending > 0 || openMessages > 0)) {
      title = uiT("portal.autoWaiting", "Monatsautomatik wartet auf die Plattform");
      hint = uiT(
        "portal.autoWaitingHintMonth",
        "Nur {period}: WorkPass fragt nach, berechnet und sendet automatisch. Andere Monate bleiben unangetastet."
      ).replace("{period}", formatPeriodLabel(period || currentPayrollPeriod()));
      tone = "wait";
    } else if (autoOn && hasData) {
      title = uiT("portal.autoActive", "Monatsautomatik arbeitet");
      hint = uiT(
        "portal.autoActiveHint",
        "{released}/{total} freigegeben · Monat {period} · wird automatisch an die Plattform gesendet"
      )
        .replace("{released}", String(automation?.jobs?.released ?? released))
        .replace("{total}", String(automation?.jobs?.jobs || employees || "—"))
        .replace("{period}", period || currentPayrollPeriod());
      tone = "ok";
    } else if (autoOn && !hasData && employees === 0) {
      title = uiT("portal.autoReady", "Monatsautomatik bereit");
      hint = uiT(
        "portal.autoReadyHint",
        "Sobald die Plattform Daten liefert, berechnet WorkPass den ganzen Monat und sendet die Abrechnungen automatisch."
      );
      tone = "ready";
    } else if (!hasData && employees === 0) {
      title = uiT("hub.outcome.needsSync", "Bereit für den ersten Sync");
      hint = uiT("hub.outcome.needsSyncHint", "Tippen Sie auf „Jetzt synchronisieren“ – WorkPass holt Ihre Mitarbeiter automatisch.");
      tone = "ready";
    } else if (pending > 0 || openMessages > 0) {
      title = uiT("hub.outcome.waiting", "Wartet auf Plattformdaten");
      hint = uiT("portal.outcome.gapsHint", "{n} offene Punkte · WorkPass fragt die Plattform gezielt nach.")
        .replace("{n}", String(Math.max(pending, openMessages)));
      tone = "wait";
    }
    if ($("portalCommandTitle")) $("portalCommandTitle").textContent = title;
    if ($("portalCommandHint")) $("portalCommandHint").textContent = hint;
    if ($("portalCommandEyebrow")) {
      $("portalCommandEyebrow").textContent = platformBlocked
        ? uiT("portal.blockedEyebrow", "Verbindung")
        : (autoOn
          ? uiT("portal.autoEyebrow", "Monatsautomatik")
          : uiT("portal.statusEyebrow", "Abrechnungsstatus"));
    }
    host.dataset.tone = tone;
  }

  function renderAuditOverview({
    period,
    employees = 0,
    released = 0,
    openMessages = 0,
    syncLabel = "—",
    hasData = false,
    companyName = "",
  } = {}) {
    const host = $("auditOverview");
    const grid = $("auditOverviewGrid");
    if (!host || !grid) return;
    if (!companyPortalId) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const dataState = hasData ? uiT("audit.dataYes", "Daten vorhanden") : uiT("audit.dataNo", "Noch keine Monatsdaten");
    const openLabel = openMessages > 0
      ? uiT("portal.openPeople", "{n} brauchen Daten").replace("{n}", String(openMessages))
      : uiT("portal.noOpenShort", "Keine");
    const firmLabel = companyName && companyName !== companyPortalId
      ? `${companyName}`
      : companyPortalId;
    grid.innerHTML = `
      <div class="audit-chip"><span>${esc(uiT("audit.company", "Firma"))}</span><strong title="${esc(companyPortalId)}">${esc(firmLabel)}</strong></div>
      <div class="audit-chip"><span>${esc(uiT("audit.month", "Monat"))}</span><strong>${esc(period || currentPayrollPeriod())}</strong></div>
      <div class="audit-chip"><span>${esc(uiT("audit.employees", "Mitarbeiter"))}</span><strong>${esc(String(employees))}</strong></div>
      <div class="audit-chip"><span>${esc(uiT("audit.released", "Freigegeben"))}</span><strong>${esc(String(released))}</strong></div>
      <div class="audit-chip"><span>${esc(uiT("audit.open", "Offene Aufträge"))}</span><strong>${esc(openLabel)}</strong></div>
      <div class="audit-chip"><span>${esc(uiT("audit.sync", "Sync"))}</span><strong>${esc(syncLabel)}</strong></div>
      <div class="audit-chip audit-chip-wide"><span>${esc(uiT("audit.data", "Datenlage"))}</span><strong>${esc(dataState)}</strong></div>
      <div class="audit-chip audit-chip-wide"><span>${esc(uiT("audit.mandant", "Mandant"))}</span><strong>${esc(uiT("audit.isolation", "Nur diese Firma sichtbar (Isolation)"))}</strong></div>
    `;
  }

  async function loadPlatformMessages(silent = false) {
    const host = $("platformCommsList");
    const seenHost = $("platformSeenList");
    const card = $("platformCommsCard");
    const badge = $("platformCommsBadge");
    if (!companyPortalId) {
      if (card) card.hidden = true;
      return null;
    }
    if (card) card.hidden = false;
    try {
      const data = await apiFetch("/v1/messages?status=open");
      const period = currentPayrollPeriod();
      const split = splitMessagesByPeriod(data.messages || [], period);
      const messages = split.inPeriod;
      const otherMonth = split.other;
      const seen = data.seenConfirmations || [];
      const grouped = groupSeenConfirmations(seen);
      if (badge) {
        badge.textContent = otherMonth.length
          ? uiT("portal.openSeenBadgeMonth", "{open} offen · {month} · {other} andere Monate · {seen} gesehen")
            .replace("{open}", String(messages.length))
            .replace("{month}", formatPeriodLabel(period))
            .replace("{other}", String(otherMonth.length))
            .replace("{seen}", String(seen.length))
          : uiT("portal.openSeenBadge", "{open} offen · {seen} gesehen")
            .replace("{open}", String(messages.length))
            .replace("{seen}", String(seen.length));
      }
      if (seenHost) {
        if (!grouped.length) {
          seenHost.innerHTML = `<div class="company-empty-inbox"><strong>${esc(uiT("portal.noSeen", "Noch keine Lesebestätigung"))}</strong><p>${esc(uiT("portal.noSeenHint", "Sobald die Plattform eine Mitteilung öffnet, erscheint hier eine klare Bestätigung – gruppiert nach Vorgang."))}</p></div>`;
        } else {
          const shown = grouped.slice(0, 12);
          seenHost.innerHTML = `
            <p class="portal-list-meta">${esc(String(seen.length))} Bestätigung(en) · ${esc(String(grouped.length))} Vorgänge</p>
            ${shown.map((g) => `
              <div class="api-inbox-item api-seen-item">
                <div>
                  <strong>✓ ${esc(g.title)}</strong>
                  <span class="portal-item-meta">${esc(g.period)} · ${esc(String(g.count))}× gesehen · ${esc(String(g.latestAt || "").replace("T", " ").slice(0, 16))}</span>
                  <span>${esc(g.employees.length ? `Betroffen: ${g.employees.join(", ")}${g.count > g.employees.length ? " …" : ""}` : (g.label || "Auftrag gesehen"))}</span>
                </div>
              </div>`).join("")}
            ${grouped.length > shown.length ? `<p class="portal-list-more">+ ${grouped.length - shown.length} weitere Vorgänge (für Prüfung gekürzt)</p>` : ""}
          `;
        }
      }
      if (!host) return data;
      if (!messages.length) {
        const otherNote = otherMonth.length
          ? `<p class="section-hint">${esc(uiT("portal.openOtherMonths", "{n} offene Aufträge in anderen Monaten – Archiv, nicht dieser Arbeitsmonat.")
            .replace("{n}", String(otherMonth.length)))}</p>`
          : "";
        host.innerHTML = `<div class="company-empty-inbox"><strong>${esc(uiT("portal.noOpen", "Keine offenen Aufträge"))}</strong><p>${esc(uiT("portal.noOpenHint", "Fehlende Daten werden gebündelt pro Mitarbeiter gemeldet. Die Liste bleibt leer, wenn nichts offen ist."))}</p>${otherNote}</div>`;
        return data;
      }
      const shownMsg = messages.slice(0, 40);
      const otherNote = otherMonth.length
        ? `<p class="portal-list-meta">${esc(uiT("portal.openOtherMonths", "{n} offene Aufträge in anderen Monaten – Archiv, nicht dieser Arbeitsmonat.")
          .replace("{n}", String(otherMonth.length)))}</p>`
        : "";
      host.innerHTML = `
        <p class="portal-list-meta">${esc(uiT("portal.openDisplayMonth", "{open} offen in {month} · Anzeige {shown}")
          .replace("{open}", String(messages.length))
          .replace("{month}", formatPeriodLabel(period))
          .replace("{shown}", String(shownMsg.length)))}</p>
        ${otherNote}
        ${shownMsg.map((m) => {
          const gapsText = (m.gaps || []).map((g) => localizeGapLabel(g)).filter(Boolean).join(" · ")
            || (m.type?.includes("invoice")
              ? uiT("msg.invoicesMissing", "Rechnungen fehlen / Export ausstehend")
              : String(m.body || "").slice(0, 180));
          const idLine = employeeIdLine(m.employee);
          return `
        <div class="api-inbox-item" data-message-id="${esc(m.messageId)}">
          <div>
            <strong>${esc(localizeMessageTitle(m))}</strong>
            <span class="portal-item-meta">${esc(employeeTitle(m.employee))}${idLine ? ` · ${esc(idLine)}` : ""} · ${esc(m.period || "—")}</span>
            <span>${esc(gapsText)}</span>
          </div>
        </div>`;
        }).join("")}
        ${messages.length > shownMsg.length ? `<p class="portal-list-more">${esc(uiT("portal.moreMessages", "+ {n} weitere (Mandanten-Isolation aktiv)").replace("{n}", String(messages.length - shownMsg.length)))}</p>` : ""}
      `;
      if (!silent) setStatus(`Offene Plattform-Aufträge: ${messages.length} · Gesehen: ${seen.length}`, true);
      return data;
    } catch (e) {
      if (host) host.innerHTML = `<p class="section-hint">${esc(e.message)}</p>`;
      if (!silent) setStatus(`Nachrichten-Fehler: ${e.message}`, false);
      return null;
    }
  }

  const MONTH_STEPS = [
    { id: "pull", labelKey: "month.stepPull", label: "Daten von Plattform holen" },
    { id: "calc", labelKey: "month.stepCalc", label: "Abrechnungen berechnen" },
    { id: "release", labelKey: "month.stepRelease", label: "An Plattform / Mitarbeiter senden" },
    { id: "done", labelKey: "month.stepDone", label: "Abschluss" },
  ];

  function renderMonthProgress(activeId, opts = {}) {
    const host = $("monthCloseProgress");
    if (!host) return;
    const states = opts.states || {};
    host.hidden = false;
    const activeIdx = Math.max(0, MONTH_STEPS.findIndex((s) => s.id === activeId));
    const pct = opts.percent != null
      ? opts.percent
      : Math.round(((activeIdx + (opts.partial || 0)) / MONTH_STEPS.length) * 100);
    host.innerHTML = `
      <div class="month-progress-head">
        <span>${esc(opts.title || uiT("month.running", "Monatsabschluss läuft"))}</span>
        <strong>${pct}%</strong>
      </div>
      <div class="month-progress-track" aria-hidden="true">
        <div class="month-progress-bar" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
      </div>
      <ol class="month-progress-steps">
        ${MONTH_STEPS.map((step, i) => {
          const st = states[step.id] || (i < activeIdx ? "done" : (i === activeIdx ? "active" : "todo"));
          const mark = st === "done" ? "✓" : st === "active" ? "●" : st === "skip" ? "–" : "○";
          const label = uiT(step.labelKey, step.label);
          return `<li class="mp-step mp-${st}"><span class="mp-mark">${mark}</span><span>${esc(label)}</span></li>`;
        }).join("")}
      </ol>`;
  }

  function hideMonthProgressSoon(ms = 2200) {
    const host = $("monthCloseProgress");
    if (!host) return;
    clearTimeout(hideMonthProgressSoon._t);
    hideMonthProgressSoon._t = setTimeout(() => {
      if (host.dataset.keep !== "1") host.hidden = true;
    }, ms);
  }

  function renderMonthCloseStatus(data) {
    const host = $("monthCloseStatus");
    if (!host) return;
    if (!data) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    const tone = data.ok ? "ok" : (data.waitingForPlatform ? "wait" : "err");
    const jobs = data.jobs || {};
    const detail = data.pull?.humanError || data.error || "";
    const showDetail = detail && detail !== data.message;
    const actions = data.waitingForPlatform || data.canRetry
      ? `
        <div class="btn-row" style="margin-top:12px">
          <button type="button" class="primary" id="btnMonthRetryPull">Erneut versuchen</button>
          <button type="button" id="btnMonthPingPlatform">Plattform anstoßen</button>
        </div>
        ${(data.nextActions || []).length
          ? `<ul class="section-hint" style="margin-top:8px">${data.nextActions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
          : ""}
      `
      : "";
    host.innerHTML = `
      <div class="month-status month-status-${tone}">
        <strong>${esc(data.ok ? "Abschluss bereit" : data.waitingForPlatform ? "Warte auf Plattform" : "Noch nicht fertig")}</strong>
        <p>${esc(data.message || data.error || "")}</p>
        ${showDetail ? `<p class="section-hint">${esc(detail)}</p>` : ""}
        <div class="month-status-chips">
          <span>Monat ${esc(data.period || "—")}</span>
          <span>Jobs ${Number(jobs.total || 0)}</span>
          <span>Freigegeben ${Number(jobs.released || 0)}</span>
          <span>Offen ${Number(jobs.calculated || 0)}</span>
          <span>Fehler ${Number(jobs.error || 0)}</span>
          ${data.missingOnPlatform ? "<span>Plattform: keine Monatsdaten</span>" : ""}
          ${data.pull?.skipped ? "<span>Pull-URL fehlt/ungeklärt</span>" : ""}
        </div>
        ${actions}
      </div>`;
    $("btnMonthRetryPull")?.addEventListener("click", () => runMonthClose({ pull: true, autoRelease: true }));
    $("btnMonthPingPlatform")?.addEventListener("click", () => pingPlatformForMonth());
  }

  function renderPortalNextActions(actions) {
    const host = $("portalNextActions");
    if (!host) return;
    const list = Array.isArray(actions) ? actions.filter(Boolean).slice(0, 4) : [];
    if (!list.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    host.innerHTML = list.map((a) => `<li>${esc(a)}</li>`).join("");
  }

  async function pingPlatformWebhook() {
    const btn = $("btnPingPlatform");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
    }
    try {
      setStatus("Prüfe Plattform-Webhook…", true);
      const data = await apiFetch("/v1/platform/ping", { method: "POST", body: "{}" });
      toast(data.message || (data.ok ? "Webhook OK" : "Webhook Fehler"), data.ok ? "ok" : "error");
      setStatus(data.message || "", data.ok);
      await loadPortalDashboard(true);
    } catch (e) {
      toast(`Webhook: ${e.message || e}`, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.removeAttribute("aria-busy");
      }
    }
  }

  async function runAutoSyncNow(opts = {}) {
    const quiet = Boolean(opts.quiet);
    const companyId = companyPortalId || apiConfig().companyId;
    if (!companyId) {
      if (!quiet) toast(uiT("lohn.noCompany", "Keine Firma – bitte anmelden."), "error");
      return;
    }
    const period = currentPayrollPeriod();
    const btn = $("btnAutoSyncNow");
    const btnTop = $("btnPortalSyncTop");
    const busyButtons = [btn, btnTop].filter(Boolean);
    if (!quiet) {
      busyButtons.forEach((b) => {
        b.disabled = true;
        b.classList.add("is-busy");
        b.setAttribute("aria-busy", "true");
      });
      if (btn) btn.textContent = uiT("lohn.syncing", "Synchronisiert…");
      if (btnTop) btnTop.textContent = uiT("lohn.syncing", "Synchronisiert…");
    }
    const progressHost = $("monthCloseProgress");
    if (progressHost) progressHost.dataset.keep = "1";
    let stepTimer = null;
    let stepIdx = 0;
    if (!quiet) {
      renderMonthProgress("pull", {
        percent: 20,
        title: uiT("portal.syncProgress", "Sync · Monat {period}").replace("{period}", period),
        states: { pull: "active", calc: "todo", release: "todo", done: "todo" },
      });
      stepTimer = setInterval(() => {
        if (stepIdx < 2) {
          stepIdx += 1;
          renderMonthProgress(MONTH_STEPS[stepIdx].id, {
            percent: 30 + stepIdx * 20,
            title: uiT("portal.syncProgress", "Sync · Monat {period}").replace("{period}", period),
          });
        }
      }, 700);
    }
    try {
      if (!quiet) setStatus("Automatik: frage Plattform nach Mitarbeitern und Abrechnungen…", true);
      const data = await apiFetch("/v1/payroll/auto-sync", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          period,
          pull: true,
          autoRelease: true,
          forceAsk: true,
          reason: quiet ? "portal_boot_sync" : "portal_manual_sync",
        }),
      });
      if (stepTimer) clearInterval(stepTimer);
      const jobs = data.jobs || data.close?.jobs || {};
      const done = Boolean(data.ok && !data.waitingForPlatform && (jobs.released > 0 || data.skipped));
      if (!quiet || data.waitingForPlatform || done) {
        renderMonthProgress(done ? "done" : (data.waitingForPlatform ? "pull" : "release"), {
          percent: done ? 100 : (data.waitingForPlatform ? 40 : 75),
          title: data.message || uiT("portal.syncProgress", "Sync · Monat {period}").replace("{period}", period),
          states: {
            pull: data.waitingForPlatform ? "active" : "done",
            calc: done || jobs.total > 0 ? "done" : (data.waitingForPlatform ? "skip" : "active"),
            release: done ? "done" : (data.waitingForPlatform ? "skip" : "active"),
            done: done ? "done" : "todo",
          },
        });
      }
      renderMonthCloseStatus(data.close || data);
      await releasePendingCalculatedJobs(period);
      await loadPortalDashboard(true);
      await loadApiInbox(true);
      await loadPlatformMessages(true);
      const firmActions = (data.nextActions || []).filter(
        (a) => !/webhook|WORKPASS_|Endpoint|Pull-URL|batch|Import\/Batch/i.test(String(a))
      );
      if (!quiet) {
        toast(data.message || uiT("lohn.syncDone", "Sync fertig"), data.ok ? "ok" : "info");
        setStatus(data.message || uiT("lohn.syncDone", "Sync fertig"), Boolean(data.ok || data.waitingForPlatform));
      } else {
        setStatus(
          data.waitingForPlatform
            ? `Monat ${period}: warte auf Plattform-Daten`
            : (data.message || `Monat ${period}: aktualisiert`),
          Boolean(data.ok || data.waitingForPlatform)
        );
      }
      renderPortalNextActions(firmActions.length
        ? firmActions
        : (data.waitingForPlatform ? [
          uiT("portal.nextReleaseEmployees", "In der Plattform Mitarbeiter freigeben"),
          uiT("portal.nextAutoContinue", "Danach läuft die Monatsautomatik weiter"),
        ] : []));
      if (progressHost) progressHost.dataset.keep = done ? "0" : "1";
      if (done) hideMonthProgressSoon(1800);
      if (data.waitingForPlatform) startMonthWaitRetry(period);
    } catch (e) {
      if (stepTimer) clearInterval(stepTimer);
      if (!quiet) toast(String(e.message || e), "error");
      else setStatus("Sync später erneut – Übersicht ist geladen.", false);
    } finally {
      if (stepTimer) clearInterval(stepTimer);
      if (!quiet) {
        busyButtons.forEach((b) => {
          b.disabled = false;
          b.classList.remove("is-busy");
          b.removeAttribute("aria-busy");
        });
        const syncLabel = window.WorkPassI18n?.t?.("sync.now") || "Jetzt synchronisieren";
        if (btn) btn.textContent = syncLabel;
        if (btnTop) btnTop.textContent = syncLabel;
      }
    }
  }

  async function pingPlatformForMonth() {
    const companyId = companyPortalId || apiConfig().companyId;
    if (!companyId) return;
    const period = currentPayrollPeriod();
    try {
      const ok = await humanConfirm({
        title: uiT("portal.monthCloseTitle", "Monatsabschluss"),
        body: uiT(
          "portal.confirmPingPlatform",
          "Plattform auffordern, Monatsdaten zu senden? Keine Steueränderung durch KI."
        ),
        requireCheck: true,
      });
      if (!ok) return;
      setStatus("Plattform wird aufgefordert, Monatsdaten zu senden…", true);
      const data = await apiFetch("/v1/payroll/month-close", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          period,
          pull: true,
          autoRelease: false,
          confirm: true,
        }),
      });
      renderMonthCloseStatus(data);
      toast(data.message || "Plattform benachrichtigt", data.ok ? "ok" : "info");
      if (data.waitingForPlatform) startMonthWaitRetry(period);
    } catch (e) {
      toast(String(e.message || e), "error");
    }
  }

  let monthWaitRetryTimer = null;
  let monthWaitRetryLeft = 0;

  function stopMonthWaitRetry() {
    clearTimeout(monthWaitRetryTimer);
    monthWaitRetryTimer = null;
    monthWaitRetryLeft = 0;
  }

  function startMonthWaitRetry(period) {
    stopMonthWaitRetry();
    monthWaitRetryLeft = 5;
    const tick = async () => {
      if (monthWaitRetryLeft <= 0) {
        const host = $("monthCloseProgress");
        if (host) {
          host.dataset.keep = "1";
          renderMonthProgress("pull", {
            percent: 30,
            title: uiT("portal.waitEnded", "Warten beendet – bitte erneut synchronisieren oder Daten in der Plattform freigeben"),
            states: { pull: "active", calc: "todo", release: "todo", done: "todo" },
          });
        }
        return;
      }
      const left = monthWaitRetryLeft;
      monthWaitRetryLeft -= 1;
      renderMonthProgress("pull", {
        percent: 35 + (5 - left) * 8,
        title: uiT("portal.waitRetry", "Warte auf Plattform… Auto-Retry in 10s ({left}×)")
          .replace("{left}", String(left)),
        states: { pull: "active", calc: "skip", release: "skip", done: "todo" },
      });
      monthWaitRetryTimer = setTimeout(async () => {
        const data = await runMonthClose({ pull: true, autoRelease: true, fromAutoRetry: true });
        if (data?.ok && !data.waitingForPlatform) {
          stopMonthWaitRetry();
          return;
        }
        if (data?.waitingForPlatform || data?.ok === false) tick();
        else stopMonthWaitRetry();
      }, 10000);
    };
    tick();
  }

  async function runMonthClose({ pull = true, autoRelease = true, fromAutoRetry = false } = {}) {
    const companyId = companyPortalId || apiConfig().companyId;
    if (!companyId) {
      window.alert("Keine Firma-ID – bitte als Firma anmelden.");
      return null;
    }
    const period = currentPayrollPeriod();
    if (!fromAutoRetry) {
      const ok = await humanConfirm({
        title: uiT("portal.monthCloseTitle", "Monatsabschluss"),
        body: uiT(
          "portal.confirmMonthClose",
          "Monatsabschluss wirklich starten?\n\nBerechnung und Freigabe nur nach Ihrer Bestätigung. KI ändert keine Steuerwerte."
        ),
        requireCheck: true,
      });
      if (!ok) return null;
    }
    if (!fromAutoRetry) stopMonthWaitRetry();
    const btn = $("btnMonthClose");
    const btnPortal = $("btnPortalMonthClose");
    const busyButtons = [btn, btnPortal].filter(Boolean);
    busyButtons.forEach((b) => {
      b.disabled = true;
      b.classList.add("is-busy");
      b.setAttribute("aria-busy", "true");
      if (b.id === "btnMonthClose") b.textContent = uiT("lohn.running", "Läuft…");
      if (b.id === "btnPortalMonthClose") b.textContent = uiT("lohn.running", "Läuft…");
    });
    document.body.classList.add("month-close-running");

    const progressHost = $("monthCloseProgress");
    if (progressHost) progressHost.dataset.keep = "1";

    const tick = (id, partial = 0.35, title) => {
      renderMonthProgress(id, { partial, title: title || `Schritt ${period}` });
    };

    tick(pull ? "pull" : "calc", 0.2, `Start ${period}`);
    setStatus(`Monatsabschluss ${period} läuft…`, true);

    let stepTimer = null;
    let stepIdx = pull ? 0 : 1;
    stepTimer = setInterval(() => {
      if (stepIdx < 2) {
        stepIdx += 1;
        tick(MONTH_STEPS[stepIdx].id, 0.45);
      }
    }, 900);

    try {
      const data = await apiFetch("/v1/payroll/month-close", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          period,
          pull,
          autoRelease,
          confirm: true,
        }),
      });
      clearInterval(stepTimer);

      if (data.waitingForPlatform) {
        renderMonthProgress("pull", {
          percent: 40,
          title: "Keine Daten bisher – Plattform wurde gefragt",
          states: { pull: "active", calc: "skip", release: "skip", done: "todo" },
        });
      } else {
        const states = {
          pull: pull ? "done" : "skip",
          calc: data.jobs?.total > 0 || data.batch?.count > 0 ? "done" : "todo",
          release: data.ok ? "done" : (data.partial ? "active" : "todo"),
          done: data.ok && !data.partial ? "done" : "todo",
        };
        renderMonthProgress(data.ok && !data.partial ? "done" : "release", {
          percent: data.ok ? (data.partial ? 85 : 100) : 70,
          title: data.ok ? (data.partial ? "Teilweise fertig" : "Fertig") : "Noch nicht fertig",
          states,
        });
      }

      await loadApiInbox(true);
      await loadPlatformMessages(true);
      await loadPortalDashboard(true);
      renderMonthCloseStatus(data);
      const n = data.newlyReleased?.length || 0;
      const msg = data.message || data.error || `Monatsabschluss ${period}`;
      setStatus(msg, Boolean(data.ok || data.waitingForPlatform));
      toast(
        data.ok
          ? `${n} Abrechnung(en) → Plattform (${period})`
          : msg,
        data.ok ? "ok" : (data.waitingForPlatform ? "info" : "error")
      );
      if (progressHost) progressHost.dataset.keep = data.ok && !data.waitingForPlatform ? "0" : "1";
      if (data.ok && !data.waitingForPlatform) hideMonthProgressSoon(1800);
      if (data.waitingForPlatform && !fromAutoRetry) startMonthWaitRetry(period);
      if (data.ok) stopMonthWaitRetry();
      return data;
    } catch (e) {
      clearInterval(stepTimer);
      stopMonthWaitRetry();
      renderMonthProgress("pull", {
        percent: 20,
        title: "Fehler",
        states: { pull: "active", calc: "todo", release: "todo", done: "todo" },
      });
      renderMonthCloseStatus({
        ok: false,
        waitingForPlatform: false,
        canRetry: true,
        period,
        error: e.message,
        message: e.message,
        jobs: {},
        nextActions: ["Erneut versuchen", "API-URL / Anmeldung prüfen"],
      });
      setStatus(`Monatsabschluss: ${e.message}`, false);
      toast(e.message, "error");
      if (progressHost) progressHost.dataset.keep = "1";
      return null;
    } finally {
      clearInterval(stepTimer);
      document.body.classList.remove("month-close-running");
      busyButtons.forEach((b) => {
        b.disabled = false;
        b.classList.remove("is-busy");
        b.removeAttribute("aria-busy");
        if (b.id === "btnMonthClose") b.textContent = uiT("portal.monthCloseNow", "Monatsabschluss jetzt");
        if (b.id === "btnPortalMonthClose") b.textContent = uiT("portal.monthClose", "Monatsabschluss");
      });
    }
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

    // Nach Breite der Sektion skalieren – A4 nie über 100 % aufblasen (große Monitore)
    const scale = Math.min(1, availW / baseW);
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
    const MC = window.MandantChecklist;
    if (MC?.evaluate) {
      const stammdaten = MC.evaluate({
        seller: state.seller || state.companyName,
        taxNumber: state.taxNumber,
        vatId: state.vatId,
        companyIban: state.companyIban,
        managingDirector: state.managingDirector,
        datevClientNo: state.datevClientNo,
        datevConsultantNo: state.datevConsultantNo,
        payrollLayout: state.payrollLayout || "datev",
      });
      items.push(
        ["seller", stammdaten.seller, MC.LABELS.seller],
        ["tax", stammdaten.tax, MC.LABELS.tax],
        ["bank", stammdaten.bank, MC.LABELS.bank],
        ["register", stammdaten.register, MC.LABELS.register],
        ["datev", stammdaten.datev, MC.LABELS.datev],
      );
      const hint = $("lohnStammdatenHint");
      if (hint && MC.renderSummary) {
        // reuse text helper without requiring DOM id wiring on dash
        const sum = MC.summary(stammdaten);
        hint.textContent = sum.done >= sum.total
          ? sum.text
          : `${sum.text} · ${MC.nextHint(stammdaten)}`;
        hint.classList.toggle("is-ok", sum.done >= sum.total);
      }
      if (MC.wireClickToFocus) {
        MC.wireClickToFocus("liveCheckList", MC.LOHN_FIELD_MAP, { openCompanyTab: false });
      }
    }
    list.innerHTML = items.map(([key, ok, label]) => `
      <li data-check="${key}" class="${ok ? "done" : ""}">
        <strong>${ok ? "✓" : "○"}</strong> ${label}
      </li>`).join("");
    const hint = $("calcMethodHint");
    if (hint) {
      const audit = payroll?.taxAudit;
      const pap = audit?.papYear || "";
      const ruleset = audit?.rulesetId || "";
      const legal = payroll?.legalRatesApplied ? "aktiv" : "Fallback";
      const abzug = payroll?.netDeductions > 0 ? ` · Netto-Abzüge ${PayrollCore.formatAmount(payroll.netDeductions)}` : "";
      const papLabel = pap ? `BMF PAP ${pap}` : "BMF PAP";
      const svLabel = ruleset ? `SV SGB IV (${ruleset}, ${legal})` : `SV SGB IV (${legal})`;
      hint.textContent = `Berechnung: ${papLabel} + ${svLabel}${abzug}`;
    }
  }

  function renderArchiveBoard() {
    const board = $("archiveBoard");
    if (!board) return;
    const entries = PayrollCore.listArchiveEntries(
      companyPortalId ? { companyId: companyPortalId } : {}
    );
    const current = PayrollCore.archiveKey(state);
    if (!entries.length) {
      board.innerHTML = companyPortalId
        ? `<p class="section-hint">${esc(uiT("portal.archiveLocalEmptyFirm", "Noch keine Abrechnungen für Ihre Firma. Sobald die Plattform Daten sendet, erscheinen sie unter „Meine Abrechnungen“."))}</p>`
        : `<p class="section-hint">${esc(uiT("portal.archiveLocalEmpty", "Noch keine gespeicherten Abrechnungen."))}</p>`;
      return;
    }
    board.innerHTML = entries.slice(0, 24).map((e) => {
      const title = companyPortalId
        ? employeeTitle({ name: e.employeeName, id: e.employeeId, badgeId: e.employeeId })
        : (e.companyName || uiT("audit.company", "Firma"));
      const idLine = companyPortalId ? employeeIdLine({ id: e.employeeId, badgeId: e.employeeId }) : "";
      const sub = companyPortalId
        ? `${idLine ? `${idLine} · ` : ""}${e.payrollMonth || "—"}`
        : `${employeeTitle({ name: e.employeeName, id: e.employeeId })} · ${e.payrollMonth || "—"}`;
      return `
      <button type="button" class="archive-item${e.key === current ? " active" : ""}" data-key="${esc(e.key)}">
        <div>
          <strong>${esc(title)}</strong>
          <span>${esc(sub)}</span>
        </div>
      </button>`;
    }).join("");
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
    const entries = PayrollCore.listArchiveEntries(
      companyPortalId ? { companyId: companyPortalId } : {}
    );
    const currentKey = PayrollCore.archiveKey(state);
    const opts = ['<option value="">— aktuelle Abrechnung (jetzt bearbeiten) —</option>'];
    entries.forEach((e) => {
      const firma = e.companyName || e.mandantId || "Ohne Firmenname";
      const ma = e.employeeName || "ohne Mitarbeiter";
      const mon = e.payrollMonth || "ohne Monat";
      const label = companyPortalId
        ? `${ma} · ${mon}`
        : `${firma} · ${ma} · ${mon}`;
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
    requestAnimationFrame(() => {
      fitSheetPreview();
      window.DatevSheet?.fillWageToPage?.(window.DatevSheet.getSheetElement?.());
    });
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
    if (companyPortalId) {
      toast("Beispieldaten sind im Firmenportal deaktiviert.", "info");
      return;
    }
    toast("Demo-Beispiele sind deaktiviert. Bitte echte Plattform-Daten verwenden.", "info");
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
      setStatus("API-Bridge – Firmen & Inbox laden, prüfen, freigeben.", true);
      loadApiConfigIntoForm();
      if (String($("apiKey")?.value || "").trim() || window.WorkPassAuth?.getSessionToken?.()) {
        loadPlatformCompanies();
      }
    }
  }

  const API_CFG_KEY = "workpass.lohn.apiConfig.v1";

  function isLocalHostPage() {
    const h = String(location.hostname || "");
    return h === "localhost" || h === "127.0.0.1" || h === "" || location.protocol === "file:";
  }

  function isLocalBridgeUrl(url) {
    try {
      const u = new URL(String(url || ""), location.href);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
      return /127\.0\.0\.1|localhost/i.test(String(url || ""));
    }
  }

  /** Same origin on Railway/hosted UI; localhost only for local bridge. */
  function defaultApiBase() {
    if (isLocalHostPage()) return "http://127.0.0.1:8787";
    return String(location.origin || "").replace(/\/+$/, "");
  }

  function defaultApiKey() {
    return isLocalHostPage() ? "workpass-dev-key" : "";
  }

  /**
   * Resolve bridge base. On Railway always same-origin (relative ""),
   * so CSP connect-src 'self' works and localhost leftovers cannot break fetch.
   */
  function resolveApiBase() {
    const baseEl = $("apiBaseUrl");
    let raw = String(baseEl?.value || "").trim().replace(/\/+$/, "");
    if (!raw) raw = defaultApiBase();

    if (!isLocalHostPage()) {
      if (isLocalBridgeUrl(raw)) {
        raw = defaultApiBase();
        if (baseEl) baseEl.value = raw;
      }
      try {
        const u = new URL(raw, location.href);
        if (u.origin === location.origin) {
          if (baseEl && baseEl.value.trim() !== location.origin) baseEl.value = location.origin;
          return ""; // relative → /health, /v1/...
        }
      } catch {
        /* keep raw */
      }
    }
    return raw.replace(/\/+$/, "");
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

    let savedBase = saved?.base ? String(saved.base).trim().replace(/\/+$/, "") : "";
    if (!isLocalHostPage() && savedBase && isLocalBridgeUrl(savedBase)) {
      savedBase = "";
      try {
        localStorage.removeItem(API_CFG_KEY);
      } catch {
        /* ignore */
      }
    }

    if (baseEl) {
      const current = baseEl.value.trim();
      if (!current || (!isLocalHostPage() && isLocalBridgeUrl(current))) {
        baseEl.value = savedBase || defaultApiBase();
      }
    }
    if (keyEl && !keyEl.value.trim()) {
      keyEl.value = (saved?.key && String(saved.key).trim()) || defaultApiKey();
    }
    if (companyEl && !companyEl.value.trim() && saved?.companyId) {
      companyEl.value = String(saved.companyId);
    }
  }

  function persistApiConfig() {
    const base = resolveApiBase() || defaultApiBase();
    const key = String($("apiKey")?.value || defaultApiKey());
    const companyId = String($("apiCompanyId")?.value || "").trim();
    try {
      localStorage.setItem(API_CFG_KEY, JSON.stringify({ base, key, companyId }));
    } catch {
      /* ignore quota */
    }
  }

  function apiConfig() {
    const base = resolveApiBase();
    const key = String($("apiKey")?.value || defaultApiKey());
    const locked = sessionCompanyId();
    const companyId = locked || String($("apiCompanyId")?.value || "").trim();
    return { base, key, companyId };
  }

  async function apiFetch(path, options = {}) {
    const { base, key, companyId } = apiConfig();
    const sessionToken = window.WorkPassAuth?.getSessionToken?.() || "";
    if (!key && !sessionToken) {
      throw new Error("API-Key oder Plattform-Login erforderlich (WORKPASS_API_KEY oder Admin-Konto).");
    }
    persistApiConfig();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (key) headers["X-WorkPass-Key"] = key;
    if (sessionToken) headers["X-WorkPass-Session"] = sessionToken;
    const useTenant = options.skipTenant ? "" : companyId;
    if (useTenant) headers["X-WorkPass-Company-Id"] = useTenant;
    const { skipTenant: _skip, headers: _h, ...fetchOpts } = options;
    const res = await fetch(`${base}${path}`, {
      ...fetchOpts,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error(
          data.error
          || "Zu viele Fehlversuche – IP vorübergehend gesperrt. Railway-Service neu starten oder ~15 Min warten. API-Key prüfen."
        );
      }
      if (res.status === 401) {
        throw new Error("Nicht autorisiert – API-Key oder Plattform-Login prüfen.");
      }
      if (res.status === 422 && data.code === "confirm_required") {
        throw new Error(
          data.error
          || "Bitte die Aktion im Dialog bestätigen (Menschliche Bestätigung)."
        );
      }
      throw new Error(
        data.error
        || data.message
        || data.errors?.join?.(" · ")
        || `HTTP ${res.status}`
      );
    }
    return data;
  }

  async function checkApiHealth() {
    loadApiConfigIntoForm();
    const base = resolveApiBase();
    const probe = `${base || location.origin}/health`;
    persistApiConfig();
    try {
      const res = await fetch(`${base}/health`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error("Health fehlgeschlagen");
      setStatus(`Bridge online · ${data.service} ${data.version || ""}`, true);
      window.alert(`Server erreichbar:\n${probe}\n${data.service} ${data.version || ""}`);
    } catch (e) {
      setStatus(`Bridge offline: ${e.message}`, false);
      const tip = isLocalHostPage()
        ? "Bitte zuerst lokal starten: npm start"
        : `Geprüfte URL: ${probe}\nFeld API-URL leer lassen oder exakt ${location.origin} eintragen.\nDann Seite hart neu laden (Strg+F5).\nAPI-Key nur für Inbox nötig (WORKPASS_API_KEY).`;
      window.alert(`Bridge nicht erreichbar.\n${tip}\n\n${e.message}`);
    }
  }

  function renderApiInbox(payload) {
    const host = $("apiInboxList");
    if (!host) return;
    const payroll = payload?.payroll || [];
    const invoices = payload?.invoices || [];
    if (!payroll.length && !invoices.length) {
      host.innerHTML = companyPortalId
        ? `<div class="company-empty-inbox"><strong>${esc(uiT("portal.noPayslips", "Noch keine Abrechnungen"))}</strong><p>${esc(uiT("portal.noPayslipsHint", "Sobald die Plattform Lohn oder Rechnungen für Ihre Firma sendet, erscheinen sie hier automatisch."))}</p></div>`
        : `<p class="section-hint">${esc(uiT("portal.inboxEmpty", "Keine Jobs in der Inbox."))}</p>`;
      return;
    }
    const payHtml = payroll.slice(0, 30).map((j) => {
      const title = employeeTitle(j.employee);
      const idLine = employeeIdLine(j.employee);
      return `
      <div class="api-inbox-item" data-type="payroll" data-id="${esc(j.jobId)}">
        <div>
          <strong>${esc(title)}</strong>
          <span>${esc(idLine ? `${idLine} · ` : "")}${companyPortalId ? "" : `${esc(j.company?.id || "")} · ${esc(j.company?.name || "")} · `}${esc(j.period || "")} · ${esc(firmStatusLabel(j.status))}</span>
          <span>${esc(uiT("kpi.netShort", "Netto"))} ${j.net != null ? PayrollCore.formatAmount(j.net) : "—"}</span>
        </div>
        <div class="api-inbox-actions">
          <button type="button" class="api-open" data-id="${esc(j.jobId)}">${esc(uiT("lohn.open", "Öffnen"))}</button>
          <button type="button" class="api-release primary" data-id="${esc(j.jobId)}" ${j.status === "released" || j.status === "error" ? "disabled" : ""} title="${j.status === "error" ? esc(uiT("lohn.releaseBlocked", "Pflichtfelder fehlen – zuerst Daten ergänzen")) : ""}">${esc(j.status === "error" ? uiT("lohn.dataMissing", "Daten fehlen") : uiT("lohn.release", "Freigabe"))}</button>
        </div>
      </div>`;
    }).join("");
    const invHtml = invoices.slice(0, 20).map((j) => `
      <div class="api-inbox-item" data-type="invoice" data-id="${esc(j.id)}">
        <div>
          <strong>${esc(uiT("doc.invoiceShort", "RE"))} ${esc(j.number || j.id)}</strong>
          <span>${companyPortalId ? "" : `${esc(j.company?.id || "")} · `}${esc(j.customer || "")} · ${esc(firmStatusLabel(j.status))}</span>
          <span>${j.gross != null ? Number(j.gross).toLocaleString("de-DE", { minimumFractionDigits: 2 }) : ""}</span>
        </div>
        <div class="api-inbox-actions">
          <button type="button" class="api-inv-release primary" data-id="${esc(j.id)}" ${j.status === "released" ? "disabled" : ""}>${esc(uiT("lohn.releasePlatform", "Freigabe → Plattform"))}</button>
        </div>
      </div>`).join("");
    host.innerHTML = `
      ${payroll.length ? `<h3 class="api-inbox-title">${esc(companyPortalId ? uiT("portal.myPayslips", "Meine Lohnabrechnungen") : uiT("nav.lohn", "Lohn"))} (${payroll.length})</h3>${payHtml}` : ""}
      ${invoices.length ? `<h3 class="api-inbox-title">${esc(companyPortalId ? uiT("portal.myInvoices", "Meine Rechnungen") : uiT("doc.invoice", "Rechnungen"))} (${invoices.length})</h3>${invHtml}` : ""}
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

  async function loadApiInbox(silent = false) {
    try {
      loadApiConfigIntoForm();
      const { companyId } = apiConfig();
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const data = await apiFetch(`/v1/inbox${q}`);
      renderApiInbox(data);
      const scope = companyId ? ` · Firma ${companyId}` : " · alle Firmen (kein Filter)";
      if (!silent) {
        setStatus(`API-Inbox: ${data.payroll?.length || 0} Lohn · ${data.invoices?.length || 0} Rechnungen${scope}`, true);
      }
      return data;
    } catch (e) {
      if (!silent) {
        setStatus(`Inbox-Fehler: ${e.message}`, false);
        window.alert(`Inbox konnte nicht geladen werden.\n${e.message}`);
      }
      return null;
    }
  }

  function renderPlatformCompanies(payload) {
    const host = $("apiCompanyList");
    if (!host) return;
    const companies = payload?.companies || [];
    const workspaces = payload?.workspaces || [];
    const wsById = Object.fromEntries(workspaces.map((w) => [w.id, w]));
    if (!companies.length) {
      host.innerHTML = '<p class="section-hint">Keine Firmen im Bridge-Register. Plattform muss <code>POST /v1/company/activate</code> senden.</p>';
      return;
    }
    if (companyPortalId) {
      const c = companies.find((x) => String(x.id).toLowerCase() === companyPortalId) || companies[0];
      const ws = wsById[c.id] || {};
      host.innerHTML = `
        <div class="company-portal-card">
          <strong>${esc(c.name || c.id)}</strong>
          <span>Nur Ihre Firma · ${esc(c.id)}</span>
          <span>${ws.accountingEnabled || c.meta?.accountingEnabled ? "Accounting aktiv" : "Accounting inaktiv"}</span>
        </div>`;
      return;
    }
    const activeId = String($("apiCompanyId")?.value || "").trim().toLowerCase();
    host.innerHTML = `
      <p class="api-inbox-title">Firmen / Abteilungen (${companies.length})</p>
      ${companies.map((c) => {
        const ws = wsById[c.id] || {};
        const on = ws.accountingEnabled || c.meta?.accountingEnabled;
        const section = ws.section?.title || c.meta?.section?.title || c.name || c.id;
        const active = String(c.id).toLowerCase() === activeId ? " active" : "";
        return `
          <div class="api-company-item${active}${on ? " enabled" : ""}" data-company-id="${esc(c.id)}">
            <div>
              <strong>${esc(c.name || c.id)}</strong>
              <span>ID · ${esc(c.id)} · ${on ? "Aktiv" : "Inaktiv"}</span>
              <span>Abteilung · ${esc(section)}</span>
            </div>
            <div class="api-inbox-actions">
              <button type="button" class="api-select-company primary" data-id="${esc(c.id)}">Öffnen</button>
            </div>
          </div>`;
      }).join("")}
    `;
    host.querySelectorAll(".api-select-company").forEach((btn) => {
      btn.addEventListener("click", () => selectPlatformCompany(btn.dataset.id));
    });
  }

  function selectPlatformCompany(companyId) {
    if (!companyId) return;
    if (companyPortalId && String(companyId).toLowerCase() !== companyPortalId) {
      toast("Nur Ihre eigene Firma ist freigeschaltet.", "error");
      return;
    }
    loadApiConfigIntoForm();
    if ($("apiCompanyId")) $("apiCompanyId").value = companyId;
    if ($("mandantId")) $("mandantId").value = companyId;
    persistApiConfig();
    const nameHint = document.querySelector(`.api-company-item[data-company-id="${CSS.escape(companyId)}"] strong`)?.textContent;
    if (nameHint && $("companyName") && !$("companyName").value.trim()) {
      $("companyName").value = nameHint;
    }
    setModePill("Firma", nameHint || companyId);
    setStatus(`Abteilung aktiv: ${companyId}`, true);
    toast(`Firma gewählt: ${nameHint || companyId}`, "ok");
    document.querySelectorAll(".api-company-item").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-company-id") === companyId);
    });
    loadApiInbox();
  }

  let companiesLoadPromise = null;
  async function loadPlatformCompanies() {
    if (companiesLoadPromise) return companiesLoadPromise;
    companiesLoadPromise = (async () => {
      try {
        loadApiConfigIntoForm();
        // Company users must NOT skip tenant – server returns only their firm
        const data = await apiFetch("/v1/companies", {
          skipTenant: !isCompanyPortal(),
        });
        renderPlatformCompanies(data);
        const n = data.companies?.length || 0;
        const active = (data.workspaces || []).filter((w) => w.accountingEnabled).length;
        setStatus(
          companyPortalId
            ? uiT("portal.companyLoaded", "Ihre Firma geladen · {name}").replace("{name}", data.companies?.[0]?.name || companyPortalId)
            : `Firmenregister: ${n} · aktiv ${active}`,
          true
        );
      } catch (e) {
        setStatus(`Firmen-Fehler: ${e.message}`, false);
        const host = $("apiCompanyList");
        if (host) host.innerHTML = `<p class="section-hint">Firmen konnten nicht geladen werden: ${esc(e.message)}</p>`;
      } finally {
        companiesLoadPromise = null;
      }
    })();
    return companiesLoadPromise;
  }

  async function applyCompanyPortalMode() {
    companyPortalId = sessionCompanyId();
    document.body.classList.toggle("company-portal", Boolean(companyPortalId));
    window.__lohnApplyActionsLayout?.();
    document.querySelectorAll('a[href="admin.html"]').forEach((a) => {
      a.hidden = Boolean(companyPortalId);
    });
    document.querySelectorAll('a[href="index.html"]').forEach((a) => {
      a.hidden = false;
      a.classList.add("portal-hub-link");
      if (!a.dataset.i18n) a.setAttribute("data-i18n", "nav.hub");
    });

    const banner = $("companyPortalBanner");
    if (!companyPortalId) {
      if (banner) banner.hidden = true;
      if (inboxPollTimer) {
        clearInterval(inboxPollTimer);
        inboxPollTimer = null;
      }
      return;
    }

    loadApiConfigIntoForm();
    if ($("apiCompanyId")) {
      $("apiCompanyId").value = companyPortalId;
      $("apiCompanyId").readOnly = true;
    }
    if ($("mandantId")) {
      $("mandantId").value = companyPortalId;
      $("mandantId").readOnly = true;
    }
    if ($("apiKey")) {
      const wrap = $("apiKey")?.closest(".full") || $("apiKey")?.parentElement;
      if (wrap) wrap.hidden = true;
    }
    if ($("apiBaseUrl")) {
      const wrap = $("apiBaseUrl")?.closest(".full") || $("apiBaseUrl")?.parentElement;
      if (wrap) wrap.hidden = true;
    }
    $("btnApiCompanies")?.setAttribute("hidden", "hidden");
    $("btnNewCompany")?.setAttribute("hidden", "hidden");

    const t = (k, fallback) => {
      const v = window.WorkPassI18n?.t?.(k);
      return (v && v !== k) ? v : (fallback || k);
    };
    document.body.classList.add("portal-sync-friendly");
    document.querySelectorAll(".lohn-actions-group").forEach((group) => {
      if (group.querySelector("#importPlatformInput, #importCsvInput, #btnNew, #btnExportJson")) {
        group.hidden = true;
      }
    });
    const hint = $("recvSectionHint") || document.querySelector("#secEmpfang .section-hint");
    if (hint) {
      hint.textContent = t(
        "empfang.firmHint",
        "Ihre Abrechnungen erscheinen automatisch – Sync holt Mitarbeiter von der Plattform."
      );
    }
    const apiHint = $("apiBridgeHint");
    if (apiHint) {
      apiHint.hidden = true;
    }

    const flowHint = document.querySelector("#companyFlow .section-hint");
    if (flowHint) {
      flowHint.textContent = uiT("portal.onlyFirm", "Nur Ihre Firma und Ihre Mitarbeiter.");
    }

    const recvApiTab = $("recvApi");
    if (recvApiTab) {
      recvApiTab.setAttribute("data-i18n", "recv.apiFirm");
      recvApiTab.textContent = t("recv.apiFirm", "Meine Abrechnungen");
    }

    const empfangTitle = document.querySelector("#secEmpfang .step-head h2");
    if (empfangTitle) empfangTitle.textContent = uiT("nav.overview", "Übersicht");

    persistApiConfig();
    applyPortalUiCopy();

    let companyName = "";
    try {
      const me = await apiFetch("/v1/auth/me", { skipTenant: true });
      const c = me.company || {};
      companyName = c.name || me.workspace?.name || companyPortalId;
      if (banner) {
        banner.hidden = false;
        banner.innerHTML = `
          <div class="company-portal-banner-inner">
            <div class="portal-brand-block">
              <span class="eyebrow"><i class="pulse-dot" aria-hidden="true"></i> ${esc(t("portal.live", "Firmen-Portal live"))}</span>
              <strong>${esc(companyName)} <span class="portal-version-chip">v2.50.5</span></strong>
              <small>${esc(uiT("portal.bannerMonth", "{base} · {monthLabel} {period}")
                .replace("{base}", t("portal.onlyYourData", "Nur Ihre Daten · Mandantentrennung aktiv"))
                .replace("{monthLabel}", uiT("lohn.month", "Monat"))
                .replace("{period}", (window.WorkPassI18n?.formatMonthYear?.(currentPayrollPeriod()) || currentPayrollPeriod())))}</small>
            </div>
            <div class="month-close-actions portal-primary-actions">
              <button type="button" class="primary glossy portal-cta-sync" id="btnPortalSyncTop">${esc(t("sync.now", "Jetzt synchronisieren"))}</button>
              <button type="button" class="portal-cta-secondary" id="btnPortalMonthClose">${esc(t("portal.monthClose", "Monatsabschluss"))}</button>
              <a href="index.html" class="portal-cta-hub" id="btnPortalOpenHub">${esc(uiT("nav.hub", "Hub"))}</a>
            </div>
          </div>`;
        $("btnPortalMonthClose")?.addEventListener("click", () => runMonthClose({ pull: true, autoRelease: true }));
        $("btnPortalSyncTop")?.addEventListener("click", () => runAutoSyncNow());
      }
      if ($("companyName") && (!$("companyName").value.trim() || String(state.mandantId || "").toLowerCase() !== companyPortalId)) {
        $("companyName").value = companyName;
      }
      if (c.taxNumber && $("taxNumber") && !$("taxNumber").value.trim()) $("taxNumber").value = c.taxNumber;
      if ((c.street || c.city || c.address) && $("seller") && !$("seller").value.trim()) {
        $("seller").value = c.address || [c.name || companyName, c.street, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
      }
      const hub = c.hubProfile || c.meta?.hubProfile || me.company?.hubProfile || null;
      if (hub && typeof hub === "object") {
        if (hub.seller && $("seller") && !$("seller").value.trim()) $("seller").value = hub.seller;
        if (hub.datevClientNo && $("datevClientNo") && !$("datevClientNo").value.trim()) {
          $("datevClientNo").value = hub.datevClientNo;
        }
        if (hub.datevConsultantNo && $("datevConsultantNo") && !$("datevConsultantNo").value.trim()) {
          $("datevConsultantNo").value = hub.datevConsultantNo;
        }
        if (hub.note && $("note") && !$("note").value.trim()) $("note").value = hub.note;
        // Persist platform branding into current payroll state for A4 letterhead area
        if (hub.seller || c.name) {
          state.seller = $("seller")?.value || hub.seller || state.seller;
          state.companyName = companyName || state.companyName;
          state.meta = { ...(state.meta || {}), hubProfile: hub, companyId: companyPortalId };
        }
      }
      if (c.datevClientNo && $("datevClientNo") && !$("datevClientNo").value.trim()) {
        $("datevClientNo").value = c.datevClientNo;
      }
      if (c.datevConsultantNo && $("datevConsultantNo") && !$("datevConsultantNo").value.trim()) {
        $("datevConsultantNo").value = c.datevConsultantNo;
      }
    } catch {
      if (banner) {
        banner.hidden = false;
        banner.innerHTML = `
          <div class="company-portal-banner-inner">
            <div class="portal-brand-block">
              <span class="eyebrow">Verbindung prüfen</span>
              <strong>Bitte erneut über die Plattform öffnen</strong>
              <small>Die Sitzung konnte nicht geladen werden. Nutzen Sie den Button „Buchhaltung“ in der Plattform erneut.</small>
            </div>
          </div>`;
      }
      setStatus("Sitzung unvollständig – bitte über die Plattform erneut öffnen.", false);
      toast("Bitte erneut über die Plattform öffnen.", "error");
    }

    // Drop foreign draft left in this browser from another firm/admin session
    const currentMandant = String(state.mandantId || state.meta?.companyId || "").trim().toLowerCase();
    if (currentMandant && currentMandant !== companyPortalId) {
      withFreezeGuard(() => {
        state = PayrollCore.defaultState();
        state.mandantId = companyPortalId;
        state.companyName = companyName || companyPortalId;
        state.payrollMonth = currentMonth();
        useReferenceDisplay = false;
        writeForm();
        refreshNow();
      });
    } else if (!currentMandant) {
      if ($("mandantId")) $("mandantId").value = companyPortalId;
      state.mandantId = companyPortalId;
      if (companyName) state.companyName = companyName;
    }

    const period = currentPayrollPeriod();
    if ($("payrollMonth") && !$("payrollMonth").value) $("payrollMonth").value = period;
    const monthCard = $("monthCloseCard");
    if (monthCard) {
      monthCard.hidden = false;
      if ($("monthCloseTitle")) {
        $("monthCloseTitle").textContent = uiT("portal.monthCloseTitlePeriod", `Monatsabschluss ${period}`).replace("{period}", period);
      }
      if ($("monthCloseHint")) {
        $("monthCloseHint").textContent = uiT(
          "portal.monthCloseHintPeriod",
          `Ein Klick: vorhandene Daten für ${period} von der Plattform holen, berechnen und freigeben. Fehlen Angaben bei einer Person, fragt WorkPass die Plattform gezielt nach – der Rest läuft weiter.`
        ).replaceAll("{period}", period);
      }
    }

    setModePill("Firmen-Portal", companyName || companyPortalId);
    setRecvMode("api");
    setStatus(`Firmen-Portal · ${companyName || companyPortalId} · ${period}`, true);
    await loadPlatformCompanies();
    await loadApiInbox(true);
    await loadPlatformMessages(true);
    await loadPortalDashboard(true);
    refreshCompanySelect();
    renderArchiveBoard();

    // Quiet first sync after SSO / login – once per Monat/Firma in dieser Sitzung
    try {
      const bootKey = `workpass.portal.bootSync.${companyPortalId}.${period}`;
      if (!sessionStorage.getItem(bootKey)) {
        sessionStorage.setItem(bootKey, "1");
        await runAutoSyncNow({ quiet: true });
      }
    } catch {
      /* dashboard already loaded */
    }

    if (inboxPollTimer) clearInterval(inboxPollTimer);
    inboxPollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadApiInbox(true);
        loadPlatformMessages(true);
        loadPortalDashboard(true);
      }
    }, 45000);

    toast(uiT("toast.welcome", "Willkommen · {name}").replace("{name}", companyName || companyPortalId), "ok");
  }

  async function openApiPayrollJob(jobId, opts = {}) {
    if (!jobId) {
      toast("Kein Job – noch keine echte Abrechnung für diesen Mitarbeiter.", "info");
      return;
    }
    try {
      let job = null;
      if (!opts.skipEnrich) {
        setStatus("Lade Mitarbeiterdaten (Register + Plattform)…", true);
        try {
          const enriched = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}/enrich`, {
            method: "POST",
            body: JSON.stringify({ pull: true, ask: true, forcePull: true }),
          });
          job = enriched.job;
          if (enriched.job?.state) {
            enriched.job.state.meta = enriched.job.state.meta || {};
            if (enriched.platformBlocked && enriched.message) {
              enriched.job.state.meta.platformBlockedHint = enriched.message;
            } else {
              delete enriched.job.state.meta.platformBlockedHint;
            }
          }
          if (enriched.filledCount) {
            toast(
              enriched.message || `${enriched.filledCount} Felder ergänzt.`,
              (enriched.remainingHard || []).length ? "info" : "ok"
            );
          } else if (enriched.platformBlocked) {
            toast(enriched.message || "Plattform liefert keine Stammdaten.", "error");
          } else if (enriched.askedPlatform && (enriched.remainingHard || []).length) {
            toast(enriched.message || "Noch Lücken – Plattform wurde gefragt.", "info");
          }
        } catch {
          /* Fall back to plain job load if enrich fails */
        }
      }
      if (!job) {
        const data = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}`);
        job = data.job;
      }
      const jobState = job?.state;
      if (!jobState) throw new Error("Kein State im Job");
      jobState.meta = jobState.meta || {};
      jobState.meta.source = "api-bridge";
      jobState.meta.jobId = jobId;
      applyIngestResult(
        { ok: !(job?.errors || []).length, errors: job?.errors || [], state: jobState },
        `API-Job ${jobId}`,
        "platform"
      );
      setModePill("API-Job", "Vom Bridge-Server geöffnet – prüfen & freigeben");
      if (companyPortalId && job?.status === "calculated" && !(job?.errors || []).length) {
        await releaseApiPayrollJob(jobId, { silent: true });
      }
    } catch (e) {
      const msg = String(e.message || e);
      if (/not_found|nicht gefunden|demo_job/i.test(msg)) {
        toast("Datensatz nicht gefunden oder Beispieldaten – bitte echte Plattform-Daten laden.", "error");
      } else {
        toast(`Job öffnen: ${msg}`, "error");
      }
    }
  }

  async function releaseApiPayrollJob(jobId, opts = {}) {
    if (!jobId) return null;
    const silent = Boolean(opts.silent) || Boolean(companyPortalId);
    if (!silent) {
      const go = window.confirm("Freigabe an die Plattform?\nDie Plattform stellt dem Mitarbeiter die Abrechnung zu.");
      if (!go) return null;
    }
    try {
      const data = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}/release`, {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      if (!data.ok) throw new Error(data.error || "Freigabe fehlgeschlagen");
      if (!silent) setStatus(`Freigegeben → Plattform/Mitarbeiter-App · ${jobId}`, true);
      else setStatus(uiT("portal.autoReleased", "Abrechnung sofort an die Plattform gesendet."), true);
      await loadApiInbox(true).catch(() => {});
      return data;
    } catch (e) {
      if (!silent) window.alert(`Freigabe fehlgeschlagen:\n${e.message}`);
      else toast(e.message || uiT("toast.error", "Bitte ergänzen"), "error");
      return null;
    }
  }

  /** Firm portal: release calculated jobs AND deliver documents to the platform. */
  async function releasePendingCalculatedJobs(period) {
    if (!companyPortalId) return { released: 0, delivered: 0 };
    const p = period || currentPayrollPeriod();
    try {
      const data = await apiFetch("/v1/payroll/month-close", {
        method: "POST",
        body: JSON.stringify({
          companyId: companyPortalId,
          period: p,
          pull: false,
          autoRelease: true,
          notify: true,
          confirm: true,
        }),
      });
      const n = Array.isArray(data?.newlyReleased) ? data.newlyReleased.length : Number(data?.released || 0);
      let delivered = 0;
      try {
        const ship = await apiFetch("/v1/payroll/deliver-period", {
          method: "POST",
          body: JSON.stringify({
            companyId: companyPortalId,
            period: p,
            reason: "portal_after_create",
          }),
        });
        delivered = Number(ship?.delivered || 0);
        const whFail = Number(ship?.failed || ship?.replay?.failed || 0);
        if (delivered > 0) {
          toast(
            uiT("portal.deliveredN", "{n} Abrechnung(en) von der Plattform bestätigt.")
              .replace("{n}", String(delivered)),
            "ok"
          );
        } else if (whFail > 0) {
          toast(
            ship?.message
              || uiT("portal.deliverFailed", "Webhook zur Plattform fehlgeschlagen (Key/URL). Abrechnungen liegen unter /v1/delivery/pending."),
            "error"
          );
        } else if (n > 0 || (ship?.count || 0) > 0) {
          toast(
            uiT(
              "portal.deliverPendingPull",
              "Freigegeben und an Webhook gesendet – Plattform hat noch nicht bestätigt. Bitte Plattform: Event payslip.released speichern + pending pollen."
            ),
            "info"
          );
        }
      } catch (e) {
        if (n > 0) {
          toast(
            uiT("portal.autoReleasedN", "{n} Abrechnung(en) an die Plattform gesendet.")
              .replace("{n}", String(n)),
            "ok"
          );
        }
      }
      return { released: n || 0, delivered, data };
    } catch (e) {
      return { released: 0, delivered: 0, error: e.message };
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

  async function exportMonthDatevCsv() {
    const period = currentPayrollPeriod();
    try {
      const data = await apiFetch(`/v1/portal/month-export?period=${encodeURIComponent(period)}`);
      if (!data?.ok || !data.content) throw new Error(data?.error || "Kein Export");
      if (!data.lineCount) {
        toast(uiT("portal.monthDatevEmpty", "Noch keine freigegebenen Abrechnungen für diesen Monat."), "info");
        return;
      }
      const blob = new Blob([data.content], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = data.filename || `WorkPass_DATEV_${period}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      const warnN = (data.warnings || []).length;
      toast(
        uiT("portal.monthDatevOk", "DATEV-Monat exportiert ({n} Zeilen).").replace("{n}", String(data.lineCount))
          + (warnN ? ` · ${warnN} ${uiT("portal.exportWarnings", "Hinweise")}` : ""),
        warnN ? "info" : "ok"
      );
    } catch (e) {
      toast(`${uiT("portal.monthDatevFail", "DATEV-Export fehlgeschlagen")}: ${e.message || e}`, "error");
    }
  }

  async function exportMonthLodas() {
    const period = currentPayrollPeriod();
    try {
      const data = await apiFetch(`/v1/portal/lodas-export?period=${encodeURIComponent(period)}`);
      if (!data?.ok || !data.content) throw new Error(data?.error || "Kein Export");
      if (!data.count) {
        toast(uiT("portal.monthLodasEmpty", "Keine freigegebenen Abrechnungen für LODAS in diesem Monat."), "info");
        return;
      }
      const blob = new Blob([data.content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = data.filename || `WorkPass_LODAS_${period}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(uiT("portal.monthLodasOk", "LODAS-Paket exportiert ({n} MA).").replace("{n}", String(data.count)), "ok");
    } catch (e) {
      toast(`${uiT("portal.monthLodasFail", "LODAS-Export fehlgeschlagen")}: ${e.message || e}`, "error");
    }
  }

  async function captureSheetPdfPage(pdf, isFirst) {
    const sheet = window.DatevSheet?.getSheetElement();
    const host = $("datevSheetHost");
    if (!sheet || !window.html2canvas) throw new Error("PDF nicht verfügbar");
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
      const img = canvas.toDataURL("image/jpeg", 0.92);
      if (!isFirst) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 210, 297);
    } finally {
      sheet.style.transform = prev.transform;
      sheet.style.transformOrigin = prev.origin;
      sheet.style.width = prev.width;
      sheet.style.height = prev.height;
      if (host) {
        host.style.width = prev.hostW;
        host.style.height = prev.hostH;
      }
    }
  }

  async function exportArchiveBatchPdf() {
    const period = currentPayrollPeriod();
    const btn = $("btnArchiveBatchPdf");
    try {
      if (btn) {
        btn.disabled = true;
        btn.classList.add("is-busy");
      }
      const arch = await apiFetch(`/v1/portal/archive?period=${encodeURIComponent(period)}`);
      const items = (arch.items || []).filter((it) => it.jobId).slice(0, 40);
      if (!items.length) {
        toast(uiT("portal.archiveBatchEmpty", "Keine freigegebenen Abrechnungen in diesem Monat."), "info");
        return;
      }
      const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
      if (!JsPDF || !window.html2canvas) {
        toast(uiT("portal.archiveBatchNoLib", "PDF-Bibliothek fehlt – Seite neu laden (F5)."), "error");
        return;
      }
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      toast(uiT("portal.archiveBatchStart", "Erzeuge Sammel-PDF ({n})…").replace("{n}", String(items.length)), "info");
      for (let i = 0; i < items.length; i += 1) {
        await openApiPayrollJob(items[i].jobId, { skipEnrich: true });
        await new Promise((r) => setTimeout(r, 180));
        await captureSheetPdfPage(pdf, i === 0);
        setStatus(`Sammel-PDF ${i + 1}/${items.length}`, true);
      }
      pdf.save(`WorkPass-Lohn-${period}-Archiv.pdf`);
      toast(uiT("portal.archiveBatchOk", "Sammel-PDF gespeichert ({n} Seiten).").replace("{n}", String(items.length)), "ok");
      requestAnimationFrame(() => fitSheetPreview());
    } catch (e) {
      toast(`${uiT("portal.archiveBatchFail", "Sammel-PDF fehlgeschlagen")}: ${e.message || e}`, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-busy");
      }
    }
  }

  async function pullBrandingNow() {
    const companyId = companyPortalId || apiConfig().companyId;
    if (!companyId) {
      toast(uiT("lohn.noCompany", "Keine Firma – bitte anmelden."), "error");
      return;
    }
    const btn = $("btnPullBranding");
    try {
      if (btn) btn.disabled = true;
      const data = await apiFetch("/v1/company/pull-branding", {
        method: "POST",
        body: JSON.stringify({ companyId }),
      });
      toast(
        data.asked
          ? uiT("portal.brandingLogoAsked", "Logo nicht gefunden – klare Anfrage an die Plattform gesendet.")
          : (data.hasLogo || data.applied?.hasLogo || !data.missingLogo
            ? uiT("portal.brandingPulled", "Firmenauftritt aktualisiert.")
            : (data.message || uiT("portal.brandingPullPartial", "Branding geprüft – Logo ggf. noch nicht auf der Plattform."))),
        data.asked ? "info" : (data.ok || data.pulled ? "ok" : "info")
      );
      await loadPortalDashboard(true);
    } catch (e) {
      toast(String(e.message || e), "error");
    } finally {
      if (btn) btn.disabled = false;
    }
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
    $("btnReference")?.addEventListener("click", () => {
      toast("Demo-Beispiele sind deaktiviert. Bitte echte Plattform-Daten verwenden.", "info");
    });
    $("btnPreviewDemo")?.addEventListener("click", () => {
      toast("Demo-Beispiele sind deaktiviert. Bitte echte Plattform-Daten verwenden.", "info");
    });
    $("btnWorkspaceCurrent")?.addEventListener("click", () => goToCalendarWorkspace());
    $("btnPortalApplyPeriod")?.addEventListener("click", () => {
      if ($("portalPeriod")?.value && $("payrollMonth")) {
        $("payrollMonth").value = $("portalPeriod").value;
      }
      syncLocalizedMonthLabels();
      loadPortalDashboard();
      loadApiInbox(true);
      loadPlatformMessages(true);
    });
    function applyRulesetDefaultsForMonth(period) {
      const cfg = window.getLegalConfigForDate?.(period || currentPayrollPeriod());
      const ss = cfg?.socialSecurity;
      if (!ss) return;
      const addEl = $("healthAdditionalPercent");
      const known = new Set(["", "2.5", "2.50", "2.9", "2.90"]);
      if (addEl && known.has(String(addEl.value).trim().replace(",", "."))) {
        addEl.value = String(ss.healthAdditionalAvg);
        state.healthAdditionalPercent = ss.healthAdditionalAvg;
      }
    }
    $("payrollMonth")?.addEventListener("change", () => {
      if ($("portalPeriod") && $("payrollMonth").value) {
        $("portalPeriod").value = $("payrollMonth").value;
      }
      setManualPeriodOverride($("payrollMonth").value !== calendarPayrollPeriod());
      applyRulesetDefaultsForMonth($("payrollMonth").value);
      // keep labels in sync without rebuilding options mid-interaction
      const bannerMonth = document.querySelector("#companyPortalBanner .portal-brand-block small");
      const fmt = window.WorkPassI18n?.formatMonthYear;
      const period = currentPayrollPeriod();
      if (bannerMonth) {
        bannerMonth.textContent = uiT("portal.bannerMonth", "{base} · {monthLabel} {period}")
          .replace("{base}", uiT("portal.onlyYourData", "Nur Ihre Daten · Mandantentrennung aktiv"))
          .replace("{monthLabel}", uiT("lohn.month", "Monat"))
          .replace("{period}", (fmt ? fmt(period) : period));
      }
      onUserEdit();
    });
    $("portalPeriod")?.addEventListener("change", () => {
      if ($("payrollMonth") && $("portalPeriod").value) {
        $("payrollMonth").value = $("portalPeriod").value;
      }
      setManualPeriodOverride($("portalPeriod").value !== calendarPayrollPeriod());
      applyRulesetDefaultsForMonth($("portalPeriod").value);
    });
    // remove obsolete input listeners for native month overlay
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
    $("btnMonthDatevExport")?.addEventListener("click", exportMonthDatevCsv);
    $("btnMonthLodasExport")?.addEventListener("click", exportMonthLodas);
    $("btnArchiveBatchPdf")?.addEventListener("click", exportArchiveBatchPdf);
    $("btnPullBranding")?.addEventListener("click", pullBrandingNow);
    $("btnChangePin")?.addEventListener("click", changePin);
    $("btnPasteApply")?.addEventListener("click", applyPasteInbox);
    loadApiConfigIntoForm();
    ["apiBaseUrl", "apiKey", "apiCompanyId"].forEach((id) => {
      $(id)?.addEventListener("change", persistApiConfig);
    });
    $("btnApiInbox")?.addEventListener("click", loadApiInbox);
    $("btnMonthClose")?.addEventListener("click", () => runMonthClose({ pull: true, autoRelease: true }));
    $("btnMonthReleaseOnly")?.addEventListener("click", () => runMonthClose({ pull: false, autoRelease: true }));
    $("btnSepaExport")?.addEventListener("click", () => {
      downloadConfirmedExport("/v1/portal/sepa-export", "SEPA.xml").catch((e) => toast(e.message, "error"));
    });
    $("btnDatevExportConfirm")?.addEventListener("click", () => {
      downloadConfirmedExport("/v1/portal/datev-export", "DATEV.csv").catch((e) => toast(e.message, "error"));
    });
    $("btnLodasExportConfirm")?.addEventListener("click", () => {
      downloadConfirmedExport("/v1/portal/lodas-export", "LODAS.txt").catch((e) => toast(e.message, "error"));
    });
    $("btnElsterPrep")?.addEventListener("click", async () => {
      try {
        const period = currentPayrollPeriod();
        const data = await apiFetch(`/v1/portal/elster-prep?period=${encodeURIComponent(period)}`);
        const host = $("portalElsterPrepList");
        if (host) {
          host.innerHTML = (data.steps || []).map((s) => `
            <div class="api-inbox-item">
              <div><strong>${esc(s.label)}</strong>
              <span class="portal-item-meta">${s.ok ? "✓" : (s.humanOnly ? "Mensch" : "—")}</span></div>
            </div>`).join("")
            + `<p class="section-hint">${esc(data.note || "")}</p>`;
        }
        toast(uiT("portal.elsterPrepDone", "ELSTER-Checkliste geladen – Upload nur durch den Menschen."), "info");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    function euroDe(n) {
      if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
      return Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    }

    function formatWhen(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function gobdOpLabel(op) {
      const map = {
        "payroll.engine_tax_applied": uiT("portal.opEngineTax", "Steuer mit BMF PAP gesetzt"),
        "elster.submit": uiT("portal.opElsterSubmit", "ELSTER-Übermittlung"),
        "payroll.upsert": uiT("portal.opPayrollUpdated", "Abrechnung aktualisiert"),
        "payroll.corrected": uiT("portal.opPayrollCorrected", "Abrechnung korrigiert"),
        "payroll.revision_archived": uiT("portal.opRevisionArchived", "Original archiviert (vor Korrektur)"),
        "sync.status": uiT("portal.opSyncStatus", "Zustell-Status geändert"),
        "invoice.revision_archived": uiT("portal.opInvoiceRevision", "Rechnung archiviert (vor Korrektur)"),
      };
      return map[String(op || "")] || uiT("portal.opGeneric", "Vorgang") + (op ? `: ${op}` : "");
    }

    function gobdSourceLabel(src) {
      const map = {
        user: uiT("portal.srcUser", "Mensch in WorkPass"),
        api: uiT("portal.srcApi", "API / Schnittstelle"),
        job: uiT("portal.srcJob", "Hintergrund-Job"),
        platform: uiT("portal.srcPlatform", "Plattform SUPPIX"),
        system: uiT("portal.srcSystem", "System"),
      };
      return map[String(src || "").toLowerCase()] || (src || "—");
    }

    function gobdStatusLabel(st) {
      const map = {
        PENDING: uiT("portal.stPending", "Wartend"),
        PROCESSING: uiT("portal.stProcessing", "In Bearbeitung"),
        COMPLETED: uiT("portal.stCompleted", "Erledigt"),
        FAILED: uiT("portal.stFailed", "Fehlgeschlagen"),
        RETRYING: uiT("portal.stRetrying", "Wird erneut versucht"),
        DEAD_LETTER: uiT("portal.stDeadLetter", "Blockiert – manueller Eingriff"),
      };
      return map[String(st || "").toUpperCase()] || (st || "—");
    }

    function gobdStatusClass(st) {
      const s = String(st || "").toUpperCase();
      if (s === "COMPLETED") return "is-ok";
      if (s === "RETRYING" || s === "PENDING" || s === "PROCESSING") return "is-warn";
      if (s === "FAILED" || s === "DEAD_LETTER") return "is-bad";
      return "";
    }

    function showGobdPanel(summaryHtml, itemsHtml) {
      const sum = $("portalGobdSummary");
      const list = $("portalGobdList");
      if (sum) {
        sum.hidden = !summaryHtml;
        sum.innerHTML = summaryHtml || "";
      }
      if (list) {
        list.hidden = !itemsHtml;
        list.innerHTML = itemsHtml || "";
      }
    }

    function renderGobdAuditHuman(data) {
      const events = (data.events || []).slice().reverse().slice(0, 25);
      const verifyOk = data.verify?.ok !== false;
      const summary = `
        <strong>${esc(uiT("portal.auditTitle", "Prüfprotokoll"))}</strong><br/>
        ${esc(uiT("portal.auditCount", "{n} Einträge").replace("{n}", String(data.count ?? events.length)))}
        · ${verifyOk
          ? esc(uiT("portal.auditChainOk", "Protokollkette in Ordnung"))
          : esc(uiT("portal.auditChainBad", "Protokollkette prüfen"))}
      `;
      if (!events.length) {
        showGobdPanel(summary, `<div class="api-inbox-item"><div><strong>${esc(uiT("portal.auditEmpty", "Noch keine Vorgänge für diese Firma."))}</strong></div></div>`);
        return;
      }
      const items = events.map((ev) => {
        const oldNet = ev.oldValue?.payroll?.net ?? ev.oldValue?.payroll?.netto;
        const newNet = ev.newValue?.payroll?.net ?? ev.newValue?.payroll?.netto;
        const oldGross = ev.oldValue?.payroll?.gross ?? ev.oldValue?.payroll?.brutto;
        const newGross = ev.newValue?.payroll?.gross ?? ev.newValue?.payroll?.brutto;
        const reason = ev.detail?.reason || "";
        const moneyBits = [];
        if (oldGross != null || newGross != null) {
          moneyBits.push(`${uiT("lohn.brutto", "Brutto")}: ${euroDe(oldGross)} → ${euroDe(newGross)}`);
        }
        if (oldNet != null || newNet != null) {
          moneyBits.push(`${uiT("lohn.netto", "Netto")}: ${euroDe(oldNet)} → ${euroDe(newNet)}`);
        }
        const who = ev.actor && ev.actor !== "system" && ev.actor !== "api"
          ? ev.actor
          : gobdSourceLabel(ev.source);
        const meta = [
          formatWhen(ev.createdAt),
          who ? `${uiT("portal.auditBy", "von")}: ${who}` : "",
          ev.employeeId ? `${uiT("lohn.id", "ID")}: ${ev.employeeId}` : "",
          reason ? `${uiT("portal.correctReason", "Korrekturgrund")}: ${reason}` : "",
          ...moneyBits,
        ].filter(Boolean).join(" · ");
        return `
          <div class="api-inbox-item">
            <div>
              <strong>${esc(gobdOpLabel(ev.op))}</strong>
              <span class="portal-gobd-op ${gobdStatusClass(ev.status)}">${esc(gobdStatusLabel(ev.status))}</span>
              <div class="portal-gobd-meta">${esc(meta)}</div>
            </div>
          </div>`;
      }).join("");
      showGobdPanel(summary, items);
    }

    function renderGobdSyncHuman(data) {
      const c = data.counts || {};
      const summary = `
        <strong>${esc(uiT("portal.syncHumanTitle", "Zustellung an die Plattform"))}</strong><br/>
        ${esc(uiT("portal.syncHumanTotal", "{n} Lieferungen").replace("{n}", String(data.total || 0)))}
      `;
      const rows = [
        ["PENDING", c.PENDING],
        ["PROCESSING", c.PROCESSING],
        ["RETRYING", c.RETRYING],
        ["COMPLETED", c.COMPLETED],
        ["FAILED", c.FAILED],
        ["DEAD_LETTER", c.DEAD_LETTER],
      ].filter(([, n]) => Number(n) > 0);

      const statusItems = rows.map(([st, n]) => `
        <div class="api-inbox-item">
          <div>
            <strong>${esc(gobdStatusLabel(st))}</strong>
            <span class="portal-gobd-op ${gobdStatusClass(st)}">${esc(String(n))}</span>
            <div class="portal-gobd-meta">${esc(uiT("portal.syncHumanHint." + st, syncHintFallback(st)))}</div>
          </div>
        </div>`).join("");

      const dead = (data.deadLetter || []).slice(0, 8).map((d) => `
        <div class="api-inbox-item">
          <div>
            <strong>${esc(uiT("portal.stDeadLetter", "Blockiert – manueller Eingriff"))}</strong>
            <div class="portal-gobd-meta">${esc([
              d.deliveryId || "",
              d.lastError || "",
              d.attempts != null ? `${uiT("portal.attempts", "Versuche")}: ${d.attempts}` : "",
            ].filter(Boolean).join(" · "))}</div>
          </div>
        </div>`).join("");

      const empty = !rows.length
        ? `<div class="api-inbox-item"><div><strong>${esc(uiT("portal.syncEmpty", "Keine offenen Zustellungen."))}</strong></div></div>`
        : "";

      showGobdPanel(summary, statusItems + dead + empty);
    }

    function syncHintFallback(st) {
      const map = {
        PENDING: "Wartet auf Versand an die Plattform.",
        PROCESSING: "An Plattform gesendet – wartet auf Bestätigung.",
        RETRYING: "Fehler – erneuter Versuch geplant.",
        COMPLETED: "Erfolgreich zugestellt / bestätigt.",
        FAILED: "Fehlgeschlagen.",
        DEAD_LETTER: "Nach mehreren Fehlern gestoppt – bitte manuell prüfen.",
      };
      return map[st] || "";
    }

    function renderGobdCorrectHuman(data) {
      const summary = data.ok
        ? `<strong>${esc(uiT("portal.correctDone", "Korrektur gespeichert."))}</strong><br/>${esc(data.message || uiT("portal.correctBody", "Original archiviert. Erneute Freigabe nötig."))}`
        : `<strong>${esc(uiT("portal.correctFailed", "Korrektur fehlgeschlagen"))}</strong><br/>${esc((data.errors || []).join(" · ") || data.error || data.message || "")}`;
      const items = `
        <div class="api-inbox-item">
          <div>
            <strong>${esc(uiT("portal.correctStatus", "Neuer Status"))}: ${esc(data.job?.status || "—")}</strong>
            <div class="portal-gobd-meta">${esc([
              data.job?.revisionNo != null ? `${uiT("portal.revision", "Version")}: ${data.job.revisionNo}` : "",
              data.job?.correctionReason || "",
            ].filter(Boolean).join(" · "))}</div>
          </div>
        </div>`;
      showGobdPanel(summary, items);
    }

    $("btnGobdExport")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const period = currentPayrollPeriod();
        const ok = await humanConfirm({
          title: uiT("portal.gobdExportTitle", "GoBD-Export bestätigen"),
          body: uiT("portal.gobdExportBody", "Erstellt ein Prüfungs-Paket (JSON) für diesen Mandanten. Keine Änderung an Belegen."),
          requireCheck: true,
        });
        if (!ok) return;
        const data = await apiFetch("/v1/gobd/export", {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
            companyId,
            from: period,
            to: period,
            includePackage: true,
          }),
        });
        const blob = new Blob([JSON.stringify(data.package || data.manifest, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = data.fileName || `gobd-${companyId}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showGobdPanel(
          `<strong>${esc(uiT("portal.gobdExportDone", "GoBD-Export erstellt."))}</strong><br/>${esc(uiT("portal.gobdExportHuman", "Datei wurde heruntergeladen – für Steuerprüfung / Archiv."))}`,
          ""
        );
        toast(uiT("portal.gobdExportDone", "GoBD-Export erstellt."), "ok");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnPayrollCorrect")?.addEventListener("click", async () => {
      try {
        const jobId = String($("correctJobId")?.value || "").trim();
        const reason = String($("correctReason")?.value || "").trim();
        const delta = Number($("correctWageDelta")?.value || 0);
        if (!jobId) {
          toast(uiT("portal.correctNeedJob", "Job-ID fehlt."), "error");
          return;
        }
        if (reason.length < 3) {
          toast(uiT("portal.correctNeedReason", "Korrekturgrund fehlt."), "error");
          return;
        }
        const ok = await humanConfirm({
          title: uiT("portal.correctTitle", "Korrektur bestätigen"),
          body: uiT("portal.correctBody", "Original wird archiviert. Erneute Freigabe nötig. Keine stille Überschreibung."),
          requireCheck: true,
        });
        if (!ok) return;
        const data = await apiFetch(`/v1/payroll/${encodeURIComponent(jobId)}/correct`, {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
            reason,
            wageAmountDelta: delta || undefined,
            actor: "portal-user",
            source: "user",
          }),
        });
        renderGobdCorrectHuman(data);
        toast(data.message || uiT("portal.correctDone", "Korrektur gespeichert."), data.ok ? "ok" : "error");
        await loadPortalDashboard(true);
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnGobdAudit")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const data = await apiFetch(`/v1/gobd/audit?companyId=${encodeURIComponent(companyId)}&limit=50`);
        renderGobdAuditHuman(data);
        toast(uiT("portal.gobdAuditDone", "Prüfprotokoll geladen."), "ok");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnGobdSync")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const data = await apiFetch(`/v1/gobd/sync?companyId=${encodeURIComponent(companyId)}`);
        renderGobdSyncHuman(data);
        toast(uiT("portal.gobdSyncDone", "Zustell-Status geladen."), "ok");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnAssistantExplain")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const period = currentPayrollPeriod();
        const data = await apiFetch("/v1/portal/assistant/explain", {
          method: "POST",
          body: JSON.stringify({ companyId, period }),
        });
        renderAssistantExplain(data);
        toast(uiT("portal.assistantDone", "Erklärung bereit – Steuer nur über BMF PAP."), "ok");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnAssistantApplyTax")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const period = currentPayrollPeriod();
        const ok = await humanConfirm({
          title: uiT("portal.assistantApplyTax", "Steuer mit BMF PAP setzen"),
          body: uiT(
            "portal.assistantApplyTaxConfirm",
            "Lohnsteuer und SV werden mit der gesetzlichen Engine (BMF PAP / SV) neu berechnet. Keine geschätzten KI-Beträge."
          ),
          requireCheck: true,
        });
        if (!ok) return;
        const data = await apiFetch("/v1/portal/assistant/apply-engine-tax", {
          method: "POST",
          body: JSON.stringify({ companyId, period, confirm: true, applyEngineTax: true }),
        });
        renderAssistantExplain({
          explanations: [{
            title: uiT("portal.assistantApplyTax", "Steuer mit BMF PAP setzen"),
            body: data.message || "",
          }],
          suggestedHumanActions: [],
        });
        toast(data.message || uiT("portal.assistantApplyTaxDone", "Steuer über BMF PAP gesetzt."), data.ok ? "ok" : "error");
        await loadPortalDashboard(true);
      } catch (e) {
        toast(e.message, "error");
      }
    });

    async function fileToBase64(file) {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }

    $("btnElsterCertSave")?.addEventListener("click", async () => {
      try {
        const file = $("elsterP12")?.files?.[0];
        const pin = String($("elsterPin")?.value || "");
        if (!file) {
          toast(uiT("portal.elsterCertNeedFile", "Bitte PKCS#12-Datei wählen."), "error");
          return;
        }
        const ok = await humanConfirm({
          title: uiT("portal.elsterCertSave", "Zertifikat speichern"),
          body: uiT("portal.elsterCertConfirm", "Zertifikat und PIN werden verschlüsselt gespeichert."),
          requireCheck: true,
        });
        if (!ok) return;
        const p12Base64 = await fileToBase64(file);
        const data = await apiFetch("/v1/portal/elster-cert", {
          method: "POST",
          body: JSON.stringify({
            companyId: companyPortalId || apiConfig().companyId,
            p12Base64,
            pin,
            autoSubmit: Boolean($("elsterAutoSubmit")?.checked),
            confirm: true,
          }),
        });
        toast(data.message || uiT("portal.elsterCertSaved", "Zertifikat gespeichert."), data.ok === false ? "error" : "ok");
        await refreshElsterCertStatus();
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnElsterSubmit")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const period = currentPayrollPeriod();
        const ok = await humanConfirm({
          title: uiT("portal.elsterSubmit", "ELSTER jetzt senden"),
          body: uiT("portal.elsterSubmitConfirm", "LStB-XML mit hinterlegtem Zertifikat an den ELSTER-Kanal übermitteln. Ohne Sidecar bleibt der Auftrag lokal — nicht beim Finanzamt."),
          requireCheck: true,
        });
        if (!ok) return;
        const data = await apiFetch("/v1/portal/elster-submit", {
          method: "POST",
          body: JSON.stringify({ companyId, period, confirm: true }),
        });
        toast(data.message || data.error || "ELSTER", data.ok ? "ok" : "error");
        await loadElsterSubmissions();
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnCertLstb")?.addEventListener("click", () => showLstbCertificate());
    $("btnCertVerdienst")?.addEventListener("click", () => showVerdienstCertificate());
    $("btnCertLstbAll")?.addEventListener("click", () => showAllLstbCertificates());
    $("btnCertSummary")?.addEventListener("click", () => loadCertificateSummary());
    $("certYear")?.addEventListener("change", () => loadCertificateSummary());
    $("btnSimulatePayroll")?.addEventListener("click", async () => {
      try {
        const companyId = companyPortalId || apiConfig().companyId;
        const period = currentPayrollPeriod();
        const hours = Number($("simHours")?.value || 0);
        const jobId = String($("simJobId")?.value || "").trim() || undefined;
        const data = await apiFetch("/v1/portal/payroll/simulate", {
          method: "POST",
          body: JSON.stringify({
            companyId,
            period,
            jobId,
            workHours: hours,
            attendance: { hours },
          }),
        });
        const out = $("portalSimulateOut");
        if (out) {
          out.style.display = "block";
          out.textContent = JSON.stringify({
            simulation: data.simulation,
            persisted: data.persisted,
            totals: data.totals,
            errors: data.errors,
            note: data.note,
          }, null, 2);
        }
        toast(uiT("portal.simulateDone", "Simulation fertig – nichts gespeichert."), "ok");
      } catch (e) {
        toast(e.message, "error");
      }
    });
    $("btnAutoSyncNow")?.addEventListener("click", () => runAutoSyncNow());
    $("btnPingPlatform")?.addEventListener("click", () => pingPlatformWebhook());
    $("btnRefreshMessages")?.addEventListener("click", () => loadPlatformMessages());
    $("btnSeedDemoMonth")?.addEventListener("click", () => seedDemoMonth());
    $("btnPurgeDemo")?.addEventListener("click", () => purgeDemoData());
    $("btnRefreshPortal")?.addEventListener("click", async () => {
      const btn = $("btnRefreshPortal");
      if (btn) {
        btn.disabled = true;
        btn.classList.add("is-busy");
        btn.setAttribute("aria-busy", "true");
      }
      try {
        await loadPortalDashboard();
        await loadPlatformMessages(true);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove("is-busy");
          btn.removeAttribute("aria-busy");
        }
      }
    });
    $("btnApiCompanies")?.addEventListener("click", loadPlatformCompanies);
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
    initSectionNav();
  }

  function initSectionNav() {
    const links = [...document.querySelectorAll(".form-jump a[href^='#']")];
    if (!links.length) return;
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);
    const setActive = (id) => {
      links.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
      });
      sections.forEach((sec) => {
        sec.classList.toggle("is-focused", sec.id === id);
      });
    };
    links.forEach((a) => {
      a.addEventListener("click", () => {
        const id = (a.getAttribute("href") || "").slice(1);
        if (id) setActive(id);
      });
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] });
      sections.forEach((sec) => io.observe(sec));
    }
    setActive(sections[0]?.id || "secEmpfang");
  }

  function startApp() {
    try {
      if (appReady) {
        refreshNow();
        applyCompanyPortalMode();
        return;
      }
      initThemeToggle();
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
      setRecvMode(isCompanyPortal() ? "api" : "file");
      renderArchiveBoard();
      applyCompanyPortalMode();
      window.WorkPassI18n?.applyDom?.(document);
      applyPortalUiCopy();
      window.__lohnApplyActionsLayout?.();
    } catch (err) {
      console.error("WorkPass Lohn startApp failed", err);
      const bar = $("statusBar");
      if (bar) {
        bar.hidden = false;
        bar.className = "lohn-status warn";
        bar.textContent = uiT("toast.error", "Bitte ergänzen") + ": " + (err?.message || String(err));
      }
      document.getElementById("lohnApp")?.style.setProperty("opacity", "1");
    }
  }

  function syncLocalizedMonthLabels() {
    const fmt = window.WorkPassI18n?.formatMonthYear;
    const build = window.WorkPassI18n?.buildMonthOptions;
    const fillSelect = (sel) => {
      if (!sel) return;
      const current = String(sel.value || "").trim()
        || String(sel.dataset.period || "").trim()
        || currentPayrollPeriod();
      const opts = build ? build(current) : [];
      if (!opts.length) return;
      const seen = new Set(opts.map((o) => o.value));
      if (current && !seen.has(current)) {
        opts.unshift({ value: current, label: fmt ? fmt(current) : current });
      }
      const html = opts.map((o) =>
        `<option value="${esc(o.value)}"${o.value === current ? " selected" : ""}>${esc(o.label)}</option>`
      ).join("");
      sel.innerHTML = html;
      if (current) sel.value = current;
    };
    fillSelect($("payrollMonth"));
    fillSelect($("portalPeriod"));
    const bannerMonth = document.querySelector("#companyPortalBanner .portal-brand-block small");
    if (bannerMonth && !bannerMonth.closest(".company-portal-banner")?.hidden) {
      const period = currentPayrollPeriod();
      bannerMonth.textContent = uiT("portal.bannerMonth", "{base} · {monthLabel} {period}")
        .replace("{base}", uiT("portal.onlyYourData", "Nur Ihre Daten · Mandantentrennung aktiv"))
        .replace("{monthLabel}", uiT("lohn.month", "Monat"))
        .replace("{period}", (fmt ? fmt(period) : period));
    }
  }

  function bootI18n() {
    document.body.classList.add("lohn-desktop");
    if (!window.WorkPassI18n) return;
    window.WorkPassI18n.init();
    const host = document.getElementById("wpLangHost")
      || document.querySelector(".lohn-actions");
    window.WorkPassI18n.mountSelect(host, "wpLangSelectLohn");
    window.WorkPassI18n.applyDom(document);
    applyPortalUiCopy();
    syncLocalizedMonthLabels();
    window.addEventListener("workpass:locale", () => {
      applyPortalUiCopy();
      window.WorkPassI18n?.applyDom?.(document);
      syncLocalizedMonthLabels();
      if (companyPortalId) {
        loadPortalDashboard(true).catch(() => {});
      }
    });
  }

  function initLohnActionsResponsive() {
    const compact = document.getElementById("lohnActionsCompact");
    const full = document.getElementById("lohnActionsFull");
    const more = document.getElementById("lohnActionsMore");
    if (!compact || !full) return;
    let menuEl = document.getElementById("lohnCompactMenu");
    if (!menuEl) {
      menuEl = document.createElement("div");
      menuEl.id = "lohnCompactMenu";
      menuEl.className = "lohn-compact-menu";
      menuEl.hidden = true;
      document.body.appendChild(menuEl);
    }
    // Always compact command bar — one calm row at every width (no dual layout path).
    const apply = () => {
      document.body.classList.add("lohn-actions-compact");
      compact.removeAttribute("hidden");
      full.setAttribute("hidden", "");
      menuEl.hidden = true;
      more?.setAttribute("aria-expanded", "false");
    };
    window.__lohnApplyActionsLayout = apply;
    compact.querySelectorAll("[data-lohn-cmd]").forEach((btn) => {
      if (btn.dataset.boundCmd) return;
      btn.dataset.boundCmd = "1";
      btn.addEventListener("click", () => document.getElementById(btn.dataset.lohnCmd)?.click());
    });
    if (more && !more.dataset.boundMore) {
      more.dataset.boundMore = "1";
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!menuEl.hidden) {
          menuEl.hidden = true;
          more.setAttribute("aria-expanded", "false");
          return;
        }
        const portal = document.body.classList.contains("company-portal");
        const entries = [
          !portal && { id: "new", label: uiT("common.new", "Neu"), run: () => $("btnNew")?.click() },
          !portal && { id: "export", label: uiT("common.export", "Export"), run: () => $("btnExportJson")?.click() },
          !portal && { id: "csv", label: uiT("common.csv", "CSV"), run: () => $("btnExportCsv")?.click() },
          { id: "lock", label: uiT("nav.lock", "Sperren"), run: () => $("btnLock")?.click() },
          { id: "theme", label: uiT("common.theme", "Theme"), run: () => $("btnThemeToggle")?.click() },
          !portal && { id: "hub", label: uiT("nav.hub", "Hub"), run: () => { window.location.href = "index.html"; } },
          !portal && { id: "admin", label: uiT("nav.admin", "Admin"), run: () => { window.location.href = "admin.html"; } },
        ].filter(Boolean);
        menuEl.innerHTML = entries.map((it, i) => `<button type="button" data-i="${i}">${it.label}</button>`).join("");
        menuEl.querySelectorAll("button").forEach((b) => {
          b.addEventListener("click", () => {
            menuEl.hidden = true;
            more.setAttribute("aria-expanded", "false");
            entries[Number(b.dataset.i)]?.run?.();
          });
        });
        const rect = more.getBoundingClientRect();
        menuEl.style.left = `${Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - 220))}px`;
        menuEl.style.top = `${rect.bottom + 4}px`;
        menuEl.hidden = false;
        more.setAttribute("aria-expanded", "true");
      });
    }
    if (!document.documentElement.dataset.lohnCompactDocClick) {
      document.documentElement.dataset.lohnCompactDocClick = "1";
      document.addEventListener("click", () => {
        menuEl.hidden = true;
        more?.setAttribute("aria-expanded", "false");
      });
    }
    apply();
  }

  function init() {
    bootI18n();
    initLohnActionsResponsive();
    // onUnlock startet die App nach PIN; bei aktiver Sitzung/E2E sofort
    if (!window.WorkPassAuth) {
      startApp();
      return;
    }
    window.WorkPassAuth.init({
      onUnlock: () => {
        window.WorkPassI18n?.syncFromSession?.();
        startApp();
      },
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
