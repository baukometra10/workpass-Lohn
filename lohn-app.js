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
    "seller", "note", "taxNumber", "datevClientNo", "datevConsultantNo",
    "companyName", "mandantId",
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
    if (g) g.textContent = payroll.gross > 0 ? PayrollCore.formatAmount(payroll.gross) : "—";
    if (n) n.textContent = payroll.net > 0 ? PayrollCore.formatAmount(payroll.net) : "—";
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

  function isPortalEditingDraft(state) {
    const hasEmployee = Boolean(String(state?.employeeName || "").trim());
    const hasWage = Array.isArray(state?.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0);
    const hasGross = Number(state?.grossSalary) > 0;
    return hasEmployee || hasWage || hasGross || Boolean(state?.meta?.jobId);
  }

  function currentPayrollPeriod() {
    const fromInput = String($("payrollMonth")?.value || "").trim();
    if (/^\d{4}-\d{2}$/.test(fromInput)) return fromInput;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    const period = currentPayrollPeriod();
    try {
      const [emps, month, arch] = await Promise.all([
        apiFetch(`/v1/portal/employees?period=${encodeURIComponent(period)}`),
        apiFetch(`/v1/portal/month?period=${encodeURIComponent(period)}&months=6`),
        apiFetch(`/v1/portal/archive?period=${encodeURIComponent(period)}`),
      ]);
      const empHost = $("portalEmployeeList");
      if (empHost) {
        const list = emps.employees || [];
        empHost.innerHTML = list.length
          ? list.map((e) => `
            <div class="api-inbox-item">
              <div>
                <strong>${esc(e.name || e.id)}</strong>
                <span>Badge ${esc(e.badgeId || e.id)}${e.personnelNumber ? ` · Pers.-Nr. ${esc(e.personnelNumber)}` : ""} · ${esc(e.lastPeriod || "—")} · ${esc(e.lastStatus || "—")}</span>
                <span>Netto ${e.net != null ? PayrollCore.formatAmount(e.net) : "—"}</span>
              </div>
              <div class="api-inbox-actions">
                <button type="button" class="api-open-emp primary" data-id="${esc(e.lastJobId || "")}">Öffnen</button>
              </div>
            </div>`).join("")
          : '<div class="company-empty-inbox"><strong>Noch keine echten Mitarbeiter</strong><p>Die Plattform muss Mitarbeiter (Name + Badge-ID) bzw. den Monats-Lohnbatch senden. Beispieldaten wie Mustermann werden nicht angezeigt.</p></div>';
        empHost.querySelectorAll(".api-open-emp").forEach((btn) => {
          btn.addEventListener("click", () => openApiPayrollJob(btn.dataset.id));
        });
      }
      const monthHost = $("portalMonthOverview");
      if (monthHost) {
        monthHost.innerHTML = (month.months || []).map((m) => `
          <button type="button" class="month-chip status-${esc(m.status)}${m.period === period ? " active" : ""}" data-period="${esc(m.period)}">
            <strong>${esc(m.period)}</strong>
            <span>${esc(m.status)} · ${m.released}/${m.total}</span>
          </button>`).join("") || "<p class='section-hint'>Keine Monate</p>";
        monthHost.querySelectorAll(".month-chip").forEach((btn) => {
          btn.addEventListener("click", () => {
            if ($("payrollMonth")) $("payrollMonth").value = btn.dataset.period;
            loadPortalDashboard(true);
            loadApiInbox(true);
          });
        });
      }
      const archHost = $("portalArchiveList");
      if (archHost) {
        const items = arch.items || [];
        archHost.innerHTML = items.length
          ? items.map((it) => `
            <div class="api-inbox-item">
              <div>
                <strong>${esc(it.employee?.name || it.employee?.id || "MA")}</strong>
                <span>${esc(it.period)} · ${esc(it.status)} · Netto ${it.net != null ? PayrollCore.formatAmount(it.net) : "—"}</span>
              </div>
              <div class="api-inbox-actions">
                <button type="button" class="api-arch-open" data-id="${esc(it.jobId)}">Öffnen</button>
                <button type="button" class="api-arch-pdf primary" data-id="${esc(it.jobId)}">PDF</button>
              </div>
            </div>`).join("")
          : '<div class="company-empty-inbox"><strong>Archiv leer</strong><p>Nach Freigabe erscheinen hier die Abrechnungen.</p></div>';
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

  async function loadPlatformMessages(silent = false) {
    const host = $("platformCommsList");
    const seenHost = $("platformSeenList");
    const card = $("platformCommsCard");
    if (!companyPortalId) {
      if (card) card.hidden = true;
      return null;
    }
    if (card) card.hidden = false;
    try {
      const data = await apiFetch("/v1/messages?status=open");
      const messages = data.messages || [];
      const seen = data.seenConfirmations || [];
      if (seenHost) {
        seenHost.innerHTML = seen.length
          ? `<strong style="display:block;margin-bottom:8px">Von Plattform gesehen</strong>`
            + seen.slice(0, 15).map((s) => `
            <div class="api-inbox-item api-seen-item">
              <div>
                <strong>✓ ${esc(s.label || "Auftrag gesehen")}</strong>
                <span>${esc(s.employee?.name || s.employee?.badgeId || s.employee?.id || "—")} · ${esc(s.period || "—")} · ${esc(s.seenAt || "").replace("T", " ").slice(0, 16)}</span>
                <span>${esc(s.title || "")}</span>
              </div>
            </div>`).join("")
          : `<div class="company-empty-inbox"><strong>Noch keine Lesebestätigung</strong><p>Sobald die Plattform eine Mitteilung öffnet, erscheint hier „Auftrag gesehen“.</p></div>`;
      }
      if (!host) return data;
      if (!messages.length) {
        host.innerHTML = '<div class="company-empty-inbox"><strong>Keine offenen Aufträge an die Plattform</strong><p>Fehlende Daten (z. B. IBAN) werden einmal gebündelt pro Mitarbeiter gemeldet.</p></div>';
        return data;
      }
      host.innerHTML = `<strong style="display:block;margin-bottom:8px">Offen – wartend auf Plattform</strong>`
        + messages.slice(0, 40).map((m) => `
        <div class="api-inbox-item" data-message-id="${esc(m.messageId)}">
          <div>
            <strong>${esc(m.title || "Nachricht")}</strong>
            <span>${esc(m.employee?.name || m.employee?.id || "—")} · Badge ${esc(m.employee?.badgeId || m.employee?.id || "—")} · ${esc(m.period || "—")}</span>
            <span>${esc((m.gaps || []).map((g) => g.label).join(" · ") || m.body || "").slice(0, 180)}</span>
          </div>
        </div>`).join("");
      if (!silent) setStatus(`Offene Plattform-Aufträge: ${messages.length} · Gesehen: ${seen.length}`, true);
      return data;
    } catch (e) {
      if (host) host.innerHTML = `<p class="section-hint">${esc(e.message)}</p>`;
      if (!silent) setStatus(`Nachrichten-Fehler: ${e.message}`, false);
      return null;
    }
  }

  const MONTH_STEPS = [
    { id: "pull", label: "Daten von Plattform holen" },
    { id: "calc", label: "Abrechnungen berechnen" },
    { id: "release", label: "An Plattform / Mitarbeiter senden" },
    { id: "done", label: "Abschluss" },
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
        <span>${esc(opts.title || "Monatsabschluss läuft")}</span>
        <strong>${pct}%</strong>
      </div>
      <div class="month-progress-track" aria-hidden="true">
        <div class="month-progress-bar" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
      </div>
      <ol class="month-progress-steps">
        ${MONTH_STEPS.map((step, i) => {
          const st = states[step.id] || (i < activeIdx ? "done" : (i === activeIdx ? "active" : "todo"));
          const mark = st === "done" ? "✓" : st === "active" ? "●" : st === "skip" ? "–" : "○";
          return `<li class="mp-step mp-${st}"><span class="mp-mark">${mark}</span><span>${esc(step.label)}</span></li>`;
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
    host.innerHTML = `
      <div class="month-status month-status-${tone}">
        <strong>${esc(data.ok ? "Abschluss bereit" : data.waitingForPlatform ? "Warte auf Plattform" : "Noch nicht fertig")}</strong>
        <p>${esc(data.message || data.error || "")}</p>
        <div class="month-status-chips">
          <span>Monat ${esc(data.period || "—")}</span>
          <span>Jobs ${Number(jobs.total || 0)}</span>
          <span>Freigegeben ${Number(jobs.released || 0)}</span>
          <span>Offen ${Number(jobs.calculated || 0)}</span>
          <span>Fehler ${Number(jobs.error || 0)}</span>
        </div>
      </div>`;
  }

  async function runMonthClose({ pull = true, autoRelease = true } = {}) {
    const companyId = companyPortalId || apiConfig().companyId;
    if (!companyId) {
      window.alert("Keine Firma-ID – bitte als Firma anmelden.");
      return null;
    }
    const period = currentPayrollPeriod();
    const btn = $("btnMonthClose");
    const btnPortal = $("btnPortalMonthClose");
    const busyButtons = [btn, btnPortal].filter(Boolean);
    busyButtons.forEach((b) => {
      b.disabled = true;
      b.classList.add("is-busy");
      if (b.id === "btnMonthClose") b.textContent = "Läuft…";
      if (b.id === "btnPortalMonthClose") b.textContent = "Läuft…";
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
        }),
      });
      clearInterval(stepTimer);

      const states = {
        pull: pull ? (data.waitingForPlatform && data.pull?.skipped ? "skip" : "done") : "skip",
        calc: data.jobs?.total > 0 || data.batch?.count > 0 ? "done" : (data.waitingForPlatform ? "skip" : "done"),
        release: data.ok ? "done" : (data.waitingForPlatform ? "skip" : "todo"),
        done: data.ok ? "done" : (data.waitingForPlatform ? "active" : "todo"),
      };
      renderMonthProgress(data.ok ? "done" : (data.waitingForPlatform ? "done" : "release"), {
        percent: data.ok ? 100 : (data.waitingForPlatform ? 55 : 70),
        title: data.ok ? "Fertig" : (data.waitingForPlatform ? "Warte auf Plattform-Daten" : "Teilweise"),
        states,
      });

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
      if (progressHost) progressHost.dataset.keep = data.ok ? "0" : "1";
      if (data.ok) hideMonthProgressSoon(1800);
      return data;
    } catch (e) {
      clearInterval(stepTimer);
      renderMonthProgress("release", {
        percent: 40,
        title: "Fehler",
        states: { pull: "done", calc: "todo", release: "todo", done: "todo" },
      });
      renderMonthCloseStatus({
        ok: false,
        waitingForPlatform: false,
        period,
        error: e.message,
        message: e.message,
        jobs: {},
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
        if (b.id === "btnMonthClose") b.textContent = "Monatsabschluss jetzt";
        if (b.id === "btnPortalMonthClose") b.textContent = "Monatsabschluss";
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
    const entries = PayrollCore.listArchiveEntries(
      companyPortalId ? { companyId: companyPortalId } : {}
    );
    const current = PayrollCore.archiveKey(state);
    if (!entries.length) {
      board.innerHTML = companyPortalId
        ? '<p class="section-hint">Noch keine Abrechnungen für Ihre Firma. Sobald die Plattform Daten sendet, erscheinen sie unter „Meine Abrechnungen“.</p>'
        : '<p class="section-hint">Noch keine gespeicherten Abrechnungen.</p>';
      return;
    }
    board.innerHTML = entries.slice(0, 24).map((e) => `
      <button type="button" class="archive-item${e.key === current ? " active" : ""}" data-key="${esc(e.key)}">
        <div>
          <strong>${esc(companyPortalId ? (e.employeeName || "Mitarbeiter") : (e.companyName || "Firma"))}</strong>
          <span>${esc(companyPortalId ? (e.payrollMonth || "—") : `${e.employeeName || "MA"} · ${e.payrollMonth || "—"}`)}</span>
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
        ? '<div class="company-empty-inbox"><strong>Noch keine Abrechnungen</strong><p>Sobald die Plattform Lohn oder Rechnungen für Ihre Firma sendet, erscheinen sie hier automatisch.</p></div>'
        : '<p class="section-hint">Keine Jobs in der Inbox.</p>';
      return;
    }
    const payHtml = payroll.slice(0, 30).map((j) => `
      <div class="api-inbox-item" data-type="payroll" data-id="${esc(j.jobId)}">
        <div>
          <strong>${esc(j.employee?.name || j.employee?.id || "MA")}</strong>
          <span>${companyPortalId ? "" : `${esc(j.company?.id || "")} · ${esc(j.company?.name || "")} · `}${esc(j.period || "")} · ${esc(j.status || "")}</span>
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
          <span>${companyPortalId ? "" : `${esc(j.company?.id || "")} · `}${esc(j.customer || "")} · ${esc(j.status || "")}</span>
          <span>${j.gross != null ? Number(j.gross).toLocaleString("de-DE", { minimumFractionDigits: 2 }) : ""}</span>
        </div>
        <div class="api-inbox-actions">
          <button type="button" class="api-inv-release primary" data-id="${esc(j.id)}" ${j.status === "released" ? "disabled" : ""}>Freigabe → Plattform</button>
        </div>
      </div>`).join("");
    host.innerHTML = `
      ${payroll.length ? `<h3 class="api-inbox-title">${companyPortalId ? "Meine Lohnabrechnungen" : "Lohn"} (${payroll.length})</h3>${payHtml}` : ""}
      ${invoices.length ? `<h3 class="api-inbox-title">${companyPortalId ? "Meine Rechnungen" : "Rechnungen"} (${invoices.length})</h3>${invHtml}` : ""}
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
            ? `Ihre Firma geladen · ${data.companies?.[0]?.name || companyPortalId}`
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
    document.querySelectorAll('a[href="admin.html"]').forEach((a) => {
      a.hidden = Boolean(companyPortalId);
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

    const hint = $("recvSectionHint") || document.querySelector("#secEmpfang .section-hint");
    if (hint) {
      hint.innerHTML = "<strong>Firmen-Portal:</strong> Automatische Abrechnungen Ihrer Mitarbeiter erscheinen hier.";
    }
    const apiHint = $("apiBridgeHint");
    if (apiHint) {
      apiHint.textContent = "Hier sehen Sie nur Abrechnungen Ihrer Firma. Öffnen → prüfen → freigeben an die Plattform.";
    }

    const flowHint = document.querySelector("#companyFlow .section-hint");
    if (flowHint) {
      flowHint.innerHTML = "<strong>Firmen-Portal:</strong> Nur Ihre Firma und Ihre Mitarbeiter. Automatische Abrechnungen von der Plattform erscheinen unter „Meine Abrechnungen“.";
    }

    const recvApiTab = $("recvApi");
    if (recvApiTab) {
      recvApiTab.textContent = "Meine Abrechnungen";
    }

    persistApiConfig();

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
              <span class="eyebrow"><i class="pulse-dot" aria-hidden="true"></i> Firmen-Portal live</span>
              <strong>${esc(companyName)}</strong>
              <small>Nur Ihre Daten · ${esc(me.user?.email || "")} · Monat ${esc(currentPayrollPeriod())}</small>
            </div>
            <div class="month-close-actions">
              <button type="button" class="primary glossy" id="btnPortalMonthClose">Monatsabschluss</button>
              <button type="button" id="btnPortalRefreshInbox">Inbox</button>
            </div>
          </div>`;
        $("btnPortalMonthClose")?.addEventListener("click", () => runMonthClose({ pull: true, autoRelease: true }));
        $("btnPortalRefreshInbox")?.addEventListener("click", () => {
          loadApiInbox();
          loadPlatformMessages();
        });
      }
      if ($("companyName") && (!$("companyName").value.trim() || String(state.mandantId || "").toLowerCase() !== companyPortalId)) {
        $("companyName").value = companyName;
      }
      if (c.taxNumber && $("taxNumber") && !$("taxNumber").value.trim()) $("taxNumber").value = c.taxNumber;
      if ((c.street || c.city || c.address) && $("seller") && !$("seller").value.trim()) {
        $("seller").value = c.address || [c.name || companyName, c.street, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
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
            <div>
              <span class="eyebrow">Firmen-Portal</span>
              <strong>${esc(companyPortalId)}</strong>
              <small>Nur Ihre Firmen-Daten</small>
            </div>
          </div>`;
      }
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
        $("monthCloseTitle").textContent = `Monatsabschluss ${period}`;
      }
      if ($("monthCloseHint")) {
        $("monthCloseHint").textContent =
          `Zieht die Mitarbeiter-Daten für ${period} von der Plattform, erstellt je eine Abrechnung und sendet sie zurück – damit die Plattform sie an die Mitarbeiter zustellen kann.`;
      }
    }

    setModePill("Firmen-Portal", companyName || companyPortalId);
    setRecvMode("api");
    await loadPlatformCompanies();
    await loadApiInbox(true);
    await loadPlatformMessages(true);
    await loadPortalDashboard(true);
    refreshCompanySelect();
    renderArchiveBoard();

    if (inboxPollTimer) clearInterval(inboxPollTimer);
    inboxPollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadApiInbox(true);
        loadPlatformMessages(true);
        loadPortalDashboard(true);
      }
    }, 45000);

    toast(`Angemeldet als Firma · ${companyName || companyPortalId}`, "ok");
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
    $("btnMonthClose")?.addEventListener("click", () => runMonthClose({ pull: true, autoRelease: true }));
    $("btnMonthReleaseOnly")?.addEventListener("click", () => runMonthClose({ pull: false, autoRelease: true }));
    $("btnRefreshMessages")?.addEventListener("click", () => loadPlatformMessages());
    $("btnSeedDemoMonth")?.addEventListener("click", () => seedDemoMonth());
    $("btnPurgeDemo")?.addEventListener("click", () => purgeDemoData());
    $("btnRefreshPortal")?.addEventListener("click", () => {
      loadPortalDashboard();
      loadPlatformMessages(true);
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
  }

  function startApp() {
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
