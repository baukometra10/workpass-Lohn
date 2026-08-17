/**
 * WorkPass Lohn – sauberes A4-Abrechnungsblatt
 * Live-Werte · Druck/PDF = nur dieses Blatt
 */
(function () {
  let hostEl = null;
  let initialized = false;

  const cssText = () => `
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .datev-sheet-a4 {
      width: 210mm !important;
      height: 297mm !important;
      min-width: 210mm;
      max-width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      padding: 5.5mm 7.5mm 4mm;
      background: #fff; color: #151a22;
      font-family: "IBM Plex Mono", "Courier New", Courier, monospace;
      font-size: 7pt; line-height: 1.15;
      display: flex; flex-direction: column; overflow: hidden;
      flex-shrink: 0;
      justify-content: flex-start;
      gap: 2.2mm;
    }
    .datev-sheet-a4.is-empty .ds-val:empty::after,
    .datev-sheet-a4.is-empty .ds-hints:empty::after,
    .datev-sheet-a4.is-empty #dsv_sender:empty::after,
    .datev-sheet-a4.is-empty #dsv_empName:empty::after {
      content: "";
      display: block; min-height: 2mm;
      border-bottom: 0.35pt dotted #c5ced4;
    }
    .datev-sheet-a4.is-empty .ds-pay,
    .datev-sheet-a4.is-empty .ds-cost { opacity: 0.55; }

    /* Zonen: Lohnarten-Zone wächst und füllt die Seite */
    .ds-zone {
      display: flex; flex-direction: column; flex-shrink: 0; min-width: 0;
    }
    .ds-zone-head { gap: 1.2mm; }
    .ds-zone-master { gap: 1.6mm; }
    .ds-zone-wage {
      gap: 0; flex: 1 1 auto; min-height: 0;
      display: flex; flex-direction: column;
    }
    .ds-zone-calc { gap: 1.6mm; }
    .ds-zone-pay { gap: 1.4mm; margin-top: auto; }

    .ds-brandbar {
      display: flex; justify-content: space-between; align-items: center;
      margin: 0; padding: 0 0 0.85mm;
      border-bottom: 1.3pt solid #1d4ed8;
    }
    .ds-brand { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.03em; color: #1e3a5f; display: flex; align-items: center; gap: 2mm; }
    .ds-brand span { font-weight: 500; font-size: 6.3pt; color: #5a6a75; margin-left: 2mm; }
    .ds-brand-logo {
      max-height: 7.5mm; max-width: 28mm; width: auto; height: auto;
      object-fit: contain; display: block;
    }
    .ds-brand-text { display: flex; flex-direction: column; line-height: 1.1; }
    .ds-brand-company { font-size: 7.2pt; font-weight: 700; color: #0f172a; }
    .ds-brand-product { font-size: 5.6pt; font-weight: 500; color: #5a6a75; }
    .ds-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 5mm; margin: 0; }
    .ds-title { font-size: 9.5pt; font-weight: 700; letter-spacing: -0.01em; color: #0f172a; }
    .ds-title-sub { font-size: 7.2pt; margin-top: 0.35mm; min-height: 2.1mm; color: #334155; }
    .ds-meta { text-align: right; font-size: 6.4pt; min-width: 36mm; color: #334155; }
    .ds-meta div { margin-bottom: 0.22mm; min-height: 2mm; }
    .ds-grid {
      display: grid; grid-template-columns: repeat(8, 1fr); gap: 0;
      border: 0.4pt solid #1a2a33; margin: 0;
      background: #f8fafc;
    }
    .ds-cell {
      border-right: 0.2pt solid #b8c2c8; border-bottom: 0.2pt solid #b8c2c8;
      padding: 0.7mm 0.95mm; min-height: 5.3mm; background: #fff;
    }
    .ds-cell:nth-child(8n) { border-right: none; }
    .ds-lab { display: block; font-size: 4.7pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .ds-val { display: block; margin-top: 0.25mm; font-size: 6.85pt; min-height: 2.1mm; font-weight: 500; }
    .ds-mid-meta { margin-top: 0.7mm; font-size: 6.2pt; color: #475569; }
    .ds-span2 { grid-column: span 2; }
    .ds-span3 { grid-column: span 3; }
    .ds-mid {
      display: grid; grid-template-columns: 1.25fr 0.85fr; gap: 1.5mm;
      margin: 0; align-items: stretch;
    }
    .ds-mid > .ds-box {
      display: flex; flex-direction: column; min-height: 20mm;
    }
    .ds-mid .ds-addr,
    .ds-mid .ds-hints { flex: 1 1 auto; }
    .ds-box { border: 0.35pt solid #1a2a33; padding: 1.05mm 1.35mm; background: #fff; }
    .ds-box h3 {
      margin: 0 0 0.5mm; font-size: 5.3pt; text-transform: uppercase;
      letter-spacing: 0.06em; color: #1e3a5f; font-weight: 700;
      padding-bottom: 0.4mm; border-bottom: 0.25pt solid #d8e0e6;
    }
    .ds-addr { white-space: pre-wrap; font-size: 6.65pt; line-height: 1.22; min-height: 0; }
    .ds-hints { white-space: pre-wrap; font-size: 6.45pt; line-height: 1.22; min-height: 0; }
    .ds-wage-wrap {
      margin: 0;
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }
    .ds-table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      height: auto; background: #fff;
    }
    .ds-table th, .ds-table td {
      border: 0.35pt solid #c3ced6;
      padding: 0.7mm 1.4mm;
      font-size: 7pt;
      font-family: "IBM Plex Mono", "Courier New", Courier, monospace;
      vertical-align: middle;
      color: #151a22;
    }
    .ds-table th {
      background: #e8eef2;
      color: #151a22;
      font-size: 6.1pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      text-align: center;
      height: 6.2mm;
      padding: 1.1mm 1.2mm;
    }
    .ds-table col.ds-col-code { width: 13%; }
    .ds-table col.ds-col-label { width: 39%; }
    .ds-table col.ds-col-qty { width: 16%; }
    .ds-table col.ds-col-amount { width: 18%; }
    .ds-table col.ds-col-flags { width: 14%; }
    .ds-table td:nth-child(1) { text-align: left; white-space: nowrap; }
    .ds-table td:nth-child(2) {
      text-align: left;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ds-table tbody tr { height: 5.1mm; }
    .ds-table tbody td { height: 5.1mm; background: #fff; }
    .ds-table tbody tr.ds-pad td {
      color: transparent; border-color: #c3ced6;
      background: #fff;
    }
    .ds-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .ds-flags { text-align: center; font-size: 7pt; color: #151a22; }
    .ds-sum-row td {
      font-weight: 700;
      background: #e8eef2;
      height: 6.2mm;
      border-color: #c3ced6;
    }
    .ds-sum-row td:first-child { text-align: left; }
    .ds-two {
      display: grid; grid-template-columns: 1.2fr 0.9fr; gap: 1.5mm;
      margin: 0; align-items: stretch;
    }
    .ds-kv { width: 100%; border-collapse: collapse; }
    .ds-kv td { padding: 0.5mm 0; font-size: 6.55pt; border-bottom: 0.15pt solid #e2e8eb; }
    .ds-kv td:last-child { text-align: right; font-variant-numeric: tabular-nums; width: 22mm; }
    .ds-kv tr:last-child td { border-bottom: none; }
    .ds-net {
      border: 0.8pt solid #1e3a5f; padding: 1.7mm 1.7mm;
      background: #f3f8f9;
      display: flex; flex-direction: column; justify-content: center; gap: 1.2mm;
    }
    .ds-net-row { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; }
    .ds-net-row span { font-size: 6.4pt; color: #334155; }
    .ds-net-row strong { font-size: 8.2pt; color: #1e3a5f; }
    .ds-net-method { margin-top: 1.5mm; font-size: 5.8pt; color: #64748b; }
    .ds-verdienst { margin: 0; }
    .ds-verdienst .ds-two { margin: 0; gap: 3mm; }
    .ds-foot {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 2.4mm;
      align-items: stretch;
      border-top: 0.7pt solid #1a2a33;
      padding-top: 1.5mm;
      margin: 0;
    }
    .ds-foot-left,
    .ds-foot-right {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 1.3mm;
      min-width: 0;
    }
    .ds-bank { font-size: 6.45pt; line-height: 1.28; margin-bottom: auto; }
    .ds-bank .ds-meta-line { margin-top: 0.5mm; color: #334155; }
    .ds-bank .ds-meta-line strong { color: #1e3a5f; }
    .ds-ag-block { margin-bottom: auto; }
    .ds-ag { width: 100%; border-collapse: collapse; margin: 0; }
    .ds-ag td { padding: 0.45mm 0; font-size: 6.55pt; }
    .ds-ag td:last-child { text-align: right; width: 22mm; font-variant-numeric: tabular-nums; }
    .ds-sub { display: block; font-size: 4.8pt; font-weight: 400; font-style: normal; opacity: 0.78; letter-spacing: 0; text-transform: none; }
    .ag-cost-legend { margin: 0.6mm 0 0; font-size: 4.7pt; line-height: 1.25; color: #475569; }
    .ds-pay,
    .ds-cost {
      min-height: 13.5mm;
      padding: 1.8mm 1.9mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.5mm;
    }
    .ds-pay {
      border: 1pt solid #1d4ed8;
      background: linear-gradient(165deg, #1e3a5f 0%, #152a45 100%);
      color: #fff;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .ds-cost {
      border: 0.7pt solid #94a3b8;
      background: #e8eef2;
      color: #151a22;
    }
    .ds-pay span,
    .ds-cost span { font-size: 5.3pt; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.88; }
    .ds-pay .ds-sub,
    .ds-cost .ds-sub { font-size: 4.6pt; text-transform: none; letter-spacing: 0; opacity: 0.82; margin-top: 0.15mm; }
    .ds-pay strong { font-size: 11.5pt; text-align: right; min-height: 4.2mm; letter-spacing: 0.01em; }
    .ds-cost strong { font-size: 11.5pt; text-align: right; min-height: 4.2mm; letter-spacing: 0.01em; color: #0f172a; }
    .ds-legal {
      margin: 0; padding-top: 0.7mm;
      display: flex; justify-content: space-between; align-items: end;
      gap: 3mm; font-size: 5pt; color: #5a6a75;
      border-top: 0.3pt solid #c5ced4;
    }
    .ds-legal-center { text-align: center; flex: 1; }
    .ds-mark { font-weight: 700; font-size: 6.5pt; letter-spacing: 0.06em; color: #1e3a5f; }
  `;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function publicFooterNote(text) {
    const s = String(text || "").trim();
    if (!s) return "";
    if (/grossEstimate|platform hint|hourlyrate when hourly|WorkPass Lohn computes/i.test(s)) return "";
    if (/^Keine weiteren Bemerkungen$/i.test(s)) return "";
    return s;
  }

  function wagePadRowHtml() {
    return `<tr class="ds-pad"><td>&nbsp;</td><td></td><td class="ds-num"></td><td class="ds-num"></td><td class="ds-flags"></td></tr>`;
  }

  function wageRowsHtml(rows) {
    const MIN_ROWS = 5;
    const MAX_ROWS = 5;
    const list = (Array.isArray(rows) ? rows : [])
      .filter((r) => r && (r.code || r.label || r.amount))
      .slice(0, MAX_ROWS);
    while (list.length < MIN_ROWS) list.push({ code: "", label: "", amount: "", qty: "", taxFlag: "", svFlag: "" });
    return list
      .map((r) => {
        const empty = !(r.code || r.label || r.amount);
        const flags = empty ? "" : `${r.taxFlag || "L"}/${r.svFlag || "L"}`;
        const label = String(r.label || "").trim()
          || (window.PayrollCore?.resolveWageLabel?.(r) || "");
        return `<tr class="${empty ? "ds-pad" : ""}">
        <td>${esc(r.code || "")}${empty ? "&nbsp;" : ""}</td>
        <td>${esc(label)}</td>
        <td class="ds-num">${esc(r.qty || "")}</td>
        <td class="ds-num">${esc(r.amount || "")}</td>
        <td class="ds-flags">${esc(flags)}</td>
      </tr>`;
      })
      .join("");
  }

  /**
   * Leere Rasterzeilen füllen die Lohnarten-Zone bis Gesamt-Brutto – ohne Zeilen zu strecken.
   */
  function fillWageToPage(sheet) {
    if (!sheet) return;
    const tbody = sheet.querySelector("#datevWageRows");
    const zone = sheet.querySelector(".ds-zone-wage");
    const table = zone?.querySelector(".ds-table");
    if (!tbody || !zone || !table) return;

    tbody.querySelectorAll("tr.ds-pad").forEach((tr) => tr.remove());
    const dataCount = tbody.querySelectorAll("tr").length;
    const minRows = Math.max(5, dataCount);
    while (tbody.querySelectorAll("tr").length < minRows) {
      tbody.insertAdjacentHTML("beforeend", wagePadRowHtml());
    }

    const sample = tbody.querySelector("tr");
    const rowH = Math.max(14, Math.round(sample?.getBoundingClientRect().height || 19));
    let guard = 0;
    while (guard < 28) {
      const spare = zone.clientHeight - table.offsetHeight;
      if (spare < rowH - 0.5) break;
      tbody.insertAdjacentHTML("beforeend", wagePadRowHtml());
      guard += 1;
    }
    while (
      table.offsetHeight > zone.clientHeight + 1
      && tbody.querySelectorAll("tr.ds-pad").length > Math.max(1, 5 - dataCount)
    ) {
      tbody.querySelector("tr.ds-pad:last-child")?.remove();
    }
  }

  function sheetHtml(d) {
    const data = d || {};
    const filled = Boolean(
      data.empName || data.persNr || data.sender || data.grossTotal
      || (Array.isArray(data.wageRows) && data.wageRows.some((r) => r && (r.code || r.label || r.amount)))
    );
    const midMeta = filled
      ? `Eintritt: <span id="dsv_entry">${esc(data.entry || "")}</span>
         · Steuer-ID: <span id="dsv_taxIdMid">${esc(data.taxIdMid || "")}</span>`
      : `<span id="dsv_entry" hidden></span><span id="dsv_taxIdMid" hidden></span>`;
    const payHint = filled
      ? (data.payHint || "Überweisung auf das angegebene Konto")
      : "";
    const footerNote = filled
      ? publicFooterNote(data.footerNote || data.hints || "")
      : "";
    const logoSrc = String(data.logoDataUrl || data.logoUrl || "").trim();
    const brandCompany = String(data.companyName || "").trim();
    const brandLeft = logoSrc || brandCompany
      ? `<div class="ds-brand">
            ${logoSrc ? `<img class="ds-brand-logo" src="${esc(logoSrc)}" alt="" />` : ""}
            <div class="ds-brand-text">
              ${brandCompany ? `<span class="ds-brand-company">${esc(brandCompany)}</span>` : ""}
              <span class="ds-brand-product">WorkPass Lohn</span>
            </div>
          </div>`
      : `<div class="ds-brand">WorkPass Lohn<span>Suppix AI</span></div>`;
    return `
      <div class="datev-sheet-a4${filled ? "" : " is-empty"}" id="datevSheetA4" data-filled="${filled ? "1" : "0"}">
        <div class="ds-zone ds-zone-head">
          <div class="ds-brandbar">
            ${brandLeft}
            <div class="ds-mark">Entgeltabrechnung</div>
          </div>
          <div class="ds-head">
            <div>
              <div class="ds-title">Abrechnung der Brutto/Netto-Bezüge</div>
              <div class="ds-title-sub" id="dsv_titleMonth">${esc(data.titleMonth || (filled ? "" : "— Vorschau / Leerformular —"))}</div>
            </div>
            <div class="ds-meta">
              <div id="dsv_usa">${esc(data.usa || "")}</div>
              <div id="dsv_headDate">${esc(data.headDate || "")}</div>
              <div id="dsv_headPage">${esc(data.headPage || (filled ? "" : "Blatt: —"))}</div>
            </div>
          </div>
        </div>

        <div class="ds-zone ds-zone-master">
          <div class="ds-grid">
            <div class="ds-cell"><span class="ds-lab">Personal-Nr.</span><span class="ds-val" id="dsv_persNr">${esc(data.persNr || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">Geburtsdatum</span><span class="ds-val" id="dsv_birth">${esc(data.birth || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">StKl</span><span class="ds-val" id="dsv_stkl">${esc(data.stkl || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">Konf</span><span class="ds-val" id="dsv_konf">${esc(data.konf || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">St-Tg</span><span class="ds-val" id="dsv_stTg">${esc(data.stTg || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">PGRS</span><span class="ds-val" id="dsv_pgrs">${esc(data.pgrs || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">BGRS</span><span class="ds-val" id="dsv_bgrs">${esc(data.bgrs || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">SV-Tg</span><span class="ds-val" id="dsv_svTg">${esc(data.svTg || "")}</span></div>
            <div class="ds-cell ds-span2"><span class="ds-lab">SV-Nummer</span><span class="ds-val" id="dsv_svNr">${esc(data.svNr || "")}</span></div>
            <div class="ds-cell ds-span3"><span class="ds-lab">Krankenkasse</span><span class="ds-val" id="dsv_kkName">${esc(data.kkName || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">KK %</span><span class="ds-val" id="dsv_kkPct">${esc(data.kkPct || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">Arbeitstage</span><span class="ds-val" id="dsv_workDays">${esc(data.workDays || "")}</span></div>
            <div class="ds-cell"><span class="ds-lab">Stunden</span><span class="ds-val" id="dsv_workHours">${esc(data.workHours || "")}</span></div>
          </div>
          <div class="ds-mid">
            <div class="ds-box">
              <h3>Arbeitgeber / Mitarbeiter</h3>
              <div class="ds-addr">
                <div id="dsv_sender">${esc(data.sender || "")}</div>
                <div id="dsv_empMeta">${esc(data.empMeta || "")}</div>
                <div id="dsv_empName">${esc(data.empName || "")}</div>
                <div id="dsv_empAddr">${esc(data.empAddr || "")}</div>
                <div class="ds-mid-meta">${midMeta}</div>
              </div>
            </div>
            <div class="ds-box">
              <h3>Hinweise zur Abrechnung</h3>
              <div class="ds-hints" id="dsv_hints">${esc(data.hints || "")}</div>
            </div>
          </div>
        </div>

        <div class="ds-zone ds-zone-wage">
          <div class="ds-wage-wrap">
            <table class="ds-table">
              <colgroup>
                <col class="ds-col-code" />
                <col class="ds-col-label" />
                <col class="ds-col-qty" />
                <col class="ds-col-amount" />
                <col class="ds-col-flags" />
              </colgroup>
              <thead>
                <tr>
                  <th>Lohnart</th>
                  <th>Bezeichnung</th>
                  <th>Anzahl</th>
                  <th>Betrag</th>
                  <th>St/SV</th>
                </tr>
              </thead>
              <tbody id="datevWageRows">${wageRowsHtml(data.wageRows)}</tbody>
              <tfoot>
                <tr class="ds-sum-row">
                  <td colspan="3">Gesamt-Brutto</td>
                  <td class="ds-num" id="dsv_grossTotal">${esc(data.grossTotal || "")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="ds-zone ds-zone-calc">
          <div class="ds-two">
            <div class="ds-box">
              <h3>Steuer / Sozialversicherung</h3>
              <table class="ds-kv">
                <tr><td>Steuer-Brutto</td><td id="dsv_stBrutto">${esc(data.stBrutto || "")}</td></tr>
                <tr><td>Lohnsteuer</td><td id="dsv_lst">${esc(data.lst || "")}</td></tr>
                <tr><td>Kirchensteuer</td><td id="dsv_kist">${esc(data.kist || "")}</td></tr>
                <tr><td>Solidaritätszuschlag</td><td id="dsv_soliMini">${esc(data.vbSoli || "")}</td></tr>
                <tr><td>KV-/RV-Brutto</td><td id="dsv_kvB">${esc(data.kvB || "")}</td></tr>
                <tr><td>KV-Beitrag</td><td id="dsv_kvBeitrag">${esc(data.kvBeitrag || "")}</td></tr>
                <tr><td>RV-Beitrag</td><td id="dsv_rvBeitrag">${esc(data.rvBeitrag || "")}</td></tr>
                <tr><td>AV-Beitrag</td><td id="dsv_avBeitrag">${esc(data.avBeitrag || "")}</td></tr>
                <tr><td>PV-Beitrag</td><td id="dsv_pvBeitrag">${esc(data.pvBeitrag || "")}</td></tr>
              </table>
            </div>
            <div class="ds-net">
              <div class="ds-net-row"><span>Steuerabzüge</span><strong id="dsv_taxTotal">${esc(data.taxTotal || "")}</strong></div>
              <div class="ds-net-row"><span>SV-Abzüge</span><strong id="dsv_svTotal">${esc(data.svTotal || "")}</strong></div>
              <div class="ds-net-row"><span>Sonst. Netto-Abzüge</span><strong id="dsv_netAbzug">${esc(data.netAbzug || "")}</strong></div>
              <div class="ds-net-row"><span>Netto-Verdienst</span><strong id="dsv_netVerdienst">${esc(data.netVerdienst || data.netTotal || "")}</strong></div>
              ${data.calcMethod ? `<div class="ds-net-method">${esc(data.calcMethod)}</div>` : ""}
            </div>
          </div>
          <div class="ds-box ds-verdienst">
            <h3>Verdienstbescheinigung</h3>
            <div class="ds-two">
              <table class="ds-kv">
                <tr><td>Gesamt-Brutto</td><td id="dsv_vbGross">${esc(data.vbGross || data.grossTotal || "")}</td></tr>
                <tr><td>Steuer-Brutto</td><td id="dsv_vbTaxGross">${esc(data.vbTaxGross || data.stBrutto || "")}</td></tr>
                <tr><td>Lohnsteuer</td><td id="dsv_vbLst">${esc(data.vbLst || data.lst || "")}</td></tr>
                <tr><td>Kirchensteuer</td><td id="dsv_vbKist">${esc(data.vbKist || data.kist || "")}</td></tr>
                <tr><td>Solidaritätszuschlag</td><td id="dsv_vbSoli">${esc(data.vbSoli || "")}</td></tr>
              </table>
              <table class="ds-kv">
                <tr><td>SV-Brutto</td><td id="dsv_vbSvGross">${esc(data.vbSvGross || data.kvB || "")}</td></tr>
                <tr><td>KV-Beitrag</td><td id="dsv_vbKv">${esc(data.vbKv || data.kvBeitrag || "")}</td></tr>
                <tr><td>RV-Beitrag</td><td id="dsv_vbRv">${esc(data.vbRv || data.rvBeitrag || "")}</td></tr>
                <tr><td>AV-Beitrag</td><td id="dsv_vbAv">${esc(data.vbAv || data.avBeitrag || "")}</td></tr>
                <tr><td>PV-Beitrag</td><td id="dsv_vbPv">${esc(data.vbPv || data.pvBeitrag || "")}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <div class="ds-zone ds-zone-pay">
          <div class="ds-foot">
            <div class="ds-foot-left">
              <div class="ds-bank">
                <div id="dsv_bank">${esc(data.bank || "")}</div>
                <div id="dsv_konto">${esc(data.konto || "")}</div>
                <div class="ds-meta-line"><strong>Zahlungsweg:</strong> <span id="dsv_payHint">${esc(payHint)}</span></div>
                ${footerNote ? `<div class="ds-meta-line"><strong>Bemerkung:</strong> <span id="dsv_footerNote">${esc(footerNote)}</span></div>` : `<span id="dsv_footerNote" hidden></span>`}
              </div>
              <div class="ds-pay">
                <span>Auszahlungsbetrag <em class="ds-sub">an den Mitarbeiter</em></span>
                <strong id="dsv_payout">${esc(data.payout || "")}</strong>
              </div>
            </div>
            <div class="ds-foot-right">
              <div class="ds-ag-block">
                <table class="ds-ag">
                  <tr><td>SV-AG-Anteil <span class="ds-sub">Arbeitgeber</span></td><td id="dsv_agSv">${esc(data.agSv || "")}</td></tr>
                  <tr><td>Zus. AG-Kosten</td><td id="dsv_agExtra">${esc(data.agExtra || "")}</td></tr>
                </table>
                <p class="ag-cost-legend">Gesamtkosten = Brutto (Mitarbeiter) + SV-AG (Firma). Auszahlung = Netto.</p>
              </div>
              <div class="ds-cost">
                <span>Gesamtkosten <em class="ds-sub">für die Firma</em></span>
                <strong id="dsv_agTotal">${esc(data.agTotal || "")}</strong>
              </div>
            </div>
          </div>
          <div class="ds-legal">
            <div>WorkPass Lohn · Form LOHN</div>
            <div class="ds-legal-center">– Entgeltbescheinigung nach § 108 Abs. 3 Satz 1 GewO –</div>
            <div class="ds-mark">Suppix AI</div>
          </div>
        </div>
      </div>`;
  }

  function ensureStyles() {
    let style = document.getElementById("datevSheetRuntimeCss");
    if (!style) {
      style = document.createElement("style");
      style.id = "datevSheetRuntimeCss";
      document.head.appendChild(style);
    }
    style.textContent = `${cssText()}
      .datev-sheet-host .datev-sheet-a4 { box-shadow: 0 12px 36px rgba(15, 40, 50, 0.18); }
    `;
  }

  function init(hostId) {
    ensureStyles();
    hostEl = document.getElementById(hostId || "datevSheetHost");
    if (!hostEl) return null;
    if (!initialized) {
      hostEl.innerHTML = sheetHtml({});
      fillWageToPage(hostEl.querySelector("#datevSheetA4"));
      initialized = true;
    }
    return hostEl;
  }

  function render(data) {
    ensureStyles();
    const host = document.getElementById("datevSheetHost") || hostEl;
    if (!host) return;
    hostEl = host;
    host.innerHTML = sheetHtml(data || {});
    const sheet = host.querySelector("#datevSheetA4");
    // Zweimal: zuerst Basis-Zeilen, dann nach Layout freier Raum in der Zone
    fillWageToPage(sheet);
    requestAnimationFrame(() => {
      fillWageToPage(sheet);
      requestAnimationFrame(() => fillWageToPage(sheet));
    });
    initialized = true;
  }

  function setBackground() {}

  function getSheetElement() {
    init();
    return document.getElementById("datevSheetA4");
  }

  function buildPrintHtml() {
    const sheet = getSheetElement();
    if (!sheet) return "";
    fillWageToPage(sheet);
    return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>WorkPass Lohn</title>
<style>${cssText()}</style></head>
<body>${sheet.outerHTML}</body></html>`;
  }

  function printSheet() {
    const html = buildPrintHtml();
    if (!html) {
      window.alert("Abrechnungsblatt nicht gefunden. Seite neu laden (F5).");
      return false;
    }

    let frame = document.getElementById("datevPrintFrame");
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "datevPrintFrame";
      frame.title = "Druck";
      frame.setAttribute("aria-hidden", "true");
      Object.assign(frame.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(frame);
    }

    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      window.alert("Druckfenster nicht verfügbar.");
      return false;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const runPrint = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch (e) {
        window.alert("Druck fehlgeschlagen. Bitte erneut versuchen.");
      }
    };

    setTimeout(runPrint, 250);
    return true;
  }

  window.DatevSheet = {
    init,
    render,
    printSheet,
    buildPrintHtml,
    getSheetElement,
    fillWageToPage,
    setBackground,
    BG_BLANK: "assets/datev-lohn17-blank.png",
    BG_REFERENCE: "assets/referenz-datev-mustermann.png",
    FIELDS: Array.from({ length: 45 }, (_, i) => ({ key: `f${i}` })),
  };
})();
