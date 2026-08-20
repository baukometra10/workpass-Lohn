/**
 * Keep form-left / A4-right split after paint.
 *
 * Flexibility: form column grows with the desk (large monitors get more workspace).
 * Preview column also gains stage room on ultrawide — but the Blatt itself is always
 * 794×1123 at scale 1 (fitSheetPreview). Same technique on every screen.
 * CSP: external file only (script-src 'self').
 */
(function () {
  function previewColForWidth(w) {
    // Roomier preview stage on big desks; never force the sheet to rescale.
    if (w >= 2200) return "minmax(840px, 1040px)";
    if (w >= 1800) return "minmax(840px, 960px)";
    if (w >= 1500) return "minmax(840px, 900px)";
    if (w >= 1200) return "840px";
    if (w >= 1000) return "minmax(700px, 840px)";
    if (w >= 800) return "minmax(0, 840px)";
    return "minmax(0, 1fr)";
  }

  function formColForWidth(w) {
    // Accounting workspace flexes: more form width on larger screens.
    if (w >= 1800) return "minmax(560px, 1.35fr)";
    if (w >= 1400) return "minmax(480px, 1.15fr)";
    if (w >= 1100) return "minmax(420px, 1fr)";
    return "minmax(280px, 1fr)";
  }

  function lockSplit() {
    var layout = document.getElementById("lohnLayout") || document.querySelector("#lohnApp .lohn-layout");
    var form = document.getElementById("lohnForm");
    var preview = document.getElementById("lohnPreview") || document.querySelector("#lohnApp .lohn-preview");
    var stage = preview && preview.querySelector(".preview-stage");
    var host = document.getElementById("datevSheetHost");
    var w = window.innerWidth || 1200;
    var previewCol = previewColForWidth(w);
    var formCol = formColForWidth(w);

    if (layout) {
      layout.style.setProperty("display", "grid", "important");
      layout.style.setProperty("grid-template-columns", formCol + " " + previewCol, "important");
      layout.style.setProperty("grid-template-rows", "minmax(0, 1fr)", "important");
      layout.style.setProperty("min-height", "0", "important");
      layout.style.setProperty("overflow", "hidden", "important");
    }
    if (form) {
      form.style.setProperty("grid-column", "1", "important");
      form.style.setProperty("width", "auto", "important");
      form.style.setProperty("max-width", "none", "important");
      form.style.setProperty("height", "100%", "important");
      form.style.setProperty("min-height", "0", "important");
      form.style.setProperty("overflow-y", "auto", "important");
      form.style.setProperty("padding", "0 20px 28px", "important");
    }
    if (preview) {
      preview.style.setProperty("grid-column", "2", "important");
      preview.style.setProperty("display", "flex", "important");
      preview.style.setProperty("flex-direction", "column", "important");
      preview.style.setProperty("align-items", "center", "important");
      preview.style.setProperty("min-width", "0", "important");
      preview.style.setProperty("height", "100%", "important");
      preview.style.setProperty("visibility", "visible", "important");
      preview.style.setProperty("opacity", "1", "important");
      preview.style.setProperty("padding", "12px 14px 16px", "important");
    }
    if (stage) {
      stage.style.setProperty("justify-content", "center", "important");
      stage.style.setProperty("align-items", "flex-start", "important");
    }
    if (host) {
      host.style.setProperty("margin-left", "auto", "important");
      host.style.setProperty("margin-right", "auto", "important");
    }
    if (typeof window.__workpassFitSheet === "function") {
      window.__workpassFitSheet();
    }
  }

  lockSplit();
  document.addEventListener("DOMContentLoaded", lockSplit);
  window.addEventListener("load", lockSplit);
  window.addEventListener("resize", function () {
    lockSplit();
  });
  setTimeout(lockSplit, 50);
  setTimeout(lockSplit, 500);
  setTimeout(lockSplit, 1500);
})();
