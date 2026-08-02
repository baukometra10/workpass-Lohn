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
    const seller = truthy(ctx.seller)
      || truthy(server.name)
      || truthy(server.address)
      || truthy([server.street, server.zip, server.city].filter(Boolean).join(" "));
    const tax = truthy(ctx.taxNumber) || truthy(ctx.vatId)
      || truthy(server.taxNumber) || truthy(server.vatId);
    const bank = truthy(ctx.companyIban);
    const logo = truthy(ctx.logoDataUrl);
    const register = truthy(ctx.commercialRegister) || truthy(ctx.managingDirector);
    const layout = truthy(ctx.payrollLayout || "datev");
    const datev = truthy(ctx.datevClientNo) || truthy(ctx.datevConsultantNo)
      || truthy(server.datevClientNo) || truthy(server.datevConsultantNo);
    return { seller, tax, bank, logo, register, layout, datev };
  }

  const LABELS = {
    seller: "Firma / Arbeitgeber hinterlegt",
    tax: "Steuernummer oder USt-IdNr.",
    bank: "Bankverbindung Firma (IBAN)",
    logo: "Firmenlogo",
    register: "Handelsregister oder Geschäftsführer",
    layout: "Lohn-Vorlage gewählt",
    datev: "DATEV-Mandant- oder Berater-Nr.",
  };

  function applyToDom(rootId, checks, labels = LABELS) {
    const checklist = document.getElementById(rootId);
    if (!checklist) return;
    const items = checklist.querySelectorAll("li[data-check]");
    if (items.length) {
      items.forEach((li) => {
        const key = li.dataset.check;
        li.classList.toggle("done", Boolean(checks[key]));
      });
      return;
    }
    checklist.innerHTML = Object.keys(labels).map((key) => `
      <li data-check="${key}" class="${checks[key] ? "done" : ""}">${labels[key]}</li>
    `).join("");
  }

  function summary(checks) {
    const keys = Object.keys(checks);
    const done = keys.filter((k) => checks[k]).length;
    return { done, total: keys.length, text: `${done}/${keys.length} Stammdaten erledigt` };
  }

  window.MandantChecklist = { evaluate, applyToDom, summary, LABELS };
})();
