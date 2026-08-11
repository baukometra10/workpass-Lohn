/**
 * Shared Mandanten Stammdaten checklist (Hub + Lohn).
 * Window export: MandantChecklist
 */
(function () {
  function truthy(v) {
    return Boolean(String(v ?? "").trim());
  }

  /**
   * @param {object} ctx
   * @param {string} [ctx.seller]
   * @param {string} [ctx.taxNumber]
   * @param {string} [ctx.vatId]
   * @param {string} [ctx.companyIban]
   * @param {string} [ctx.logoDataUrl]
   * @param {string} [ctx.commercialRegister]
   * @param {string} [ctx.managingDirector]
   * @param {string} [ctx.payrollLayout]
   * @param {string} [ctx.datevClientNo]
   * @param {string} [ctx.datevConsultantNo]
   * @param {object} [ctx.server] – bridge company slice
   */
  function evaluate(ctx = {}) {
    const server = ctx.server && typeof ctx.server === "object" ? ctx.server : {};
    const hub = (server.hubProfile && typeof server.hubProfile === "object")
      ? server.hubProfile
      : ((server.meta?.hubProfile && typeof server.meta.hubProfile === "object")
        ? server.meta.hubProfile
        : {});
    const seller = truthy(ctx.seller)
      || truthy(server.name)
      || truthy(server.address)
      || truthy(hub.seller)
      || truthy([server.street, server.zip, server.city].filter(Boolean).join(" "));
    const tax = truthy(ctx.taxNumber) || truthy(ctx.vatId)
      || truthy(server.taxNumber) || truthy(server.vatId)
      || truthy(hub.taxNumber) || truthy(hub.vatId);
    const bank = truthy(ctx.companyIban)
      || truthy(hub.companyIban)
      || truthy(server.companyIban);
    const logo = truthy(ctx.logoDataUrl) || truthy(hub.logoDataUrl);
    const register = truthy(ctx.commercialRegister) || truthy(ctx.managingDirector)
      || truthy(hub.commercialRegister) || truthy(hub.managingDirector);
    const layout = truthy(ctx.payrollLayout || hub.payrollLayout || "datev");
    const datev = truthy(ctx.datevClientNo) || truthy(ctx.datevConsultantNo)
      || truthy(server.datevClientNo) || truthy(server.datevConsultantNo)
      || truthy(hub.datevClientNo) || truthy(hub.datevConsultantNo);
    return { seller, tax, bank, logo, register, layout, datev };
  }

  const LABEL_KEYS = {
    seller: "hub.checkSeller",
    tax: "hub.checkTax",
    bank: "hub.checkBank",
    logo: "hub.checkLogo",
    register: "hub.checkRegister",
    layout: "hub.checkLayout",
    datev: "hub.checkDatev",
  };

  const LABELS_DE = {
    seller: "Firma / Arbeitgeber hinterlegt",
    tax: "Steuernummer oder USt-IdNr.",
    bank: "Bankverbindung Firma (IBAN)",
    logo: "Firmenlogo",
    register: "Handelsregister oder Geschäftsführer",
    layout: "Lohn-Vorlage gewählt",
    datev: "DATEV-Mandant- oder Berater-Nr.",
  };

  function tt(key, fb, vars) {
    const v = window.WorkPassI18n?.t?.(key, vars);
    return (v && v !== key) ? v : fb;
  }

  function localizedLabels() {
    const out = {};
    for (const key of Object.keys(LABELS_DE)) {
      out[key] = tt(LABEL_KEYS[key], LABELS_DE[key]);
    }
    return out;
  }

  /** @deprecated use localizedLabels(); kept for callers expecting LABELS */
  const LABELS = LABELS_DE;

  /** Hub company-tab field ids for each checklist key */
  const HUB_FIELD_MAP = {
    seller: "companySeller",
    tax: "taxNumber",
    bank: "companyIban",
    logo: "companyLogoInput",
    register: "commercialRegister",
    layout: "payrollLayout",
    datev: "datevClientNo",
  };

  /** Lohn portal field ids */
  const LOHN_FIELD_MAP = {
    seller: "seller",
    tax: "taxNumber",
    bank: "companyIban",
    logo: null,
    register: "managingDirector",
    layout: null,
    datev: "datevClientNo",
  };

  const ORDER = ["seller", "tax", "bank", "logo", "register", "layout", "datev"];

  function applyToDom(rootId, checks, labels) {
    const resolved = labels || localizedLabels();
    const checklist = document.getElementById(rootId);
    if (!checklist) return;
    const items = checklist.querySelectorAll("li[data-check]");
    if (items.length) {
      items.forEach((li) => {
        const key = li.dataset.check;
        const done = Boolean(checks[key]);
        li.classList.toggle("done", done);
        li.classList.toggle("is-next", false);
        li.setAttribute("aria-checked", done ? "true" : "false");
        const span = li.querySelector("[data-check-label]");
        if (span && resolved[key]) span.textContent = resolved[key];
        else if (!span && resolved[key] && !li.querySelector("[data-i18n]")) {
          /* keep data-i18n spans for applyDom; only rewrite plain text nodes */
        }
      });
      const next = nextOpen(checks);
      if (next) {
        const nextLi = checklist.querySelector(`li[data-check="${next}"]`);
        if (nextLi) nextLi.classList.add("is-next");
      }
      return;
    }
    checklist.innerHTML = Object.keys(resolved).map((key) => `
      <li data-check="${key}" class="${checks[key] ? "done" : ""}${!checks[key] && key === nextOpen(checks) ? " is-next" : ""}" role="checkbox" aria-checked="${checks[key] ? "true" : "false"}">${resolved[key]}</li>
    `).join("");
  }

  function summary(checks) {
    const keys = ORDER.filter((k) => Object.prototype.hasOwnProperty.call(checks, k));
    const list = keys.length ? keys : Object.keys(checks);
    const done = list.filter((k) => checks[k]).length;
    return {
      done,
      total: list.length,
      text: tt("hub.checkSummary", "{done}/{total} Stammdaten erledigt", { done, total: list.length }),
    };
  }

  function nextOpen(checks) {
    for (const key of ORDER) {
      if (Object.prototype.hasOwnProperty.call(checks, key) && !checks[key]) return key;
    }
    return null;
  }

  function nextHint(checks, labels) {
    const resolved = labels || localizedLabels();
    const key = nextOpen(checks);
    if (!key) return tt("hub.checkAllDone", "Alle Stammdaten sind vollständig.");
    return tt("hub.checkNextHint", "Als Nächstes: {item}", { item: resolved[key] || key });
  }

  function focusField(fieldId, { openCompanyTab } = {}) {
    if (!fieldId) return false;
    if (openCompanyTab) {
      document.querySelector('.form-tab[data-tab="company"]')?.click();
    }
    const el = document.getElementById(fieldId);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    try { el.focus({ preventScroll: true }); } catch { el.focus?.(); }
    el.classList?.add("field-pulse");
    setTimeout(() => el.classList?.remove("field-pulse"), 1200);
    return true;
  }

  function wireClickToFocus(rootId, fieldMap, options = {}) {
    const checklist = document.getElementById(rootId);
    if (!checklist || checklist.dataset.mcWired === "1") return;
    checklist.dataset.mcWired = "1";
    checklist.addEventListener("click", (event) => {
      const li = event.target.closest("li[data-check]");
      if (!li || li.classList.contains("done")) return;
      const key = li.dataset.check;
      const fieldId = fieldMap[key];
      if (!fieldId) {
        if (options.openCompanyTab) {
          document.querySelector('.form-tab[data-tab="company"]')?.click();
        }
        return;
      }
      focusField(fieldId, options);
    });
  }

  function renderSummary(elId, checks) {
    const el = document.getElementById(elId);
    if (!el) return summary(checks);
    const s = summary(checks);
    const hint = nextHint(checks);
    el.hidden = false;
    el.textContent = s.done >= s.total ? s.text : `${s.text} · ${hint}`;
    el.classList.toggle("is-ok", s.done >= s.total);
    el.classList.toggle("is-warn", s.done < s.total);
    return s;
  }

  window.MandantChecklist = {
    evaluate,
    applyToDom,
    summary,
    nextOpen,
    nextHint,
    focusField,
    wireClickToFocus,
    renderSummary,
    LABELS,
    HUB_FIELD_MAP,
    LOHN_FIELD_MAP,
    ORDER,
  };
})();
