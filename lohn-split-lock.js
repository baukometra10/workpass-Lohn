/**
 * Keep form-left / A4-right split after paint.
 * Preview column width may change with viewport; the A4 sheet itself never reflows
 * (fixed px size + uniform scale via fitSheetPreview).
 * CSP: external file only (script-src 'self').
 */
(function () {
  function previewColForWidth(w) {
    if (w >= 1600) return "minmax(520px, 680px)";
    if (w >= 1200) return "minmax(480px, 620px)";
    if (w >= 900) return "minmax(400px, 540px)";
    if (w >= 720) return "minmax(320px, 48vw)";
    return "minmax(0, 1fr)";
  }

  function lockSplit() {
    var layout = document.getElementById("lohnLayout") || document.querySelector("#lohnApp .lohn-layout");
    var form = document.getElementById("lohnForm");
    var preview = document.getElementById("lohnPreview") || document.querySelector("#lohnApp .lohn-preview");
    var stage = preview && preview.querySelector(".preview-stage");
    var host = document.getElementById("datevSheetHost");
    var w = window.innerWidth || 1200;
    var previewCol = previewColForWidth(w);

    if (layout) {
      layout.style.setProperty("display", "grid", "important");
      layout.style.setProperty("grid-template-columns", "minmax(280px, 1fr) " + previewCol, "important");
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
