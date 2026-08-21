/**
 * Rechnung split lock — document-tab ONLY.
 * ALWAYS two columns. No MutationObserver / ResizeObserver loops.
 * CSP: external file only (script-src 'self').
 */
(function () {
  var busy = false;
  var lastW = -1;
  var lastCols = "";
  var resizeTimer = null;

  function colsForWidth(w) {
    if (w >= 1800) return "minmax(420px, 1.05fr) minmax(0, 900px)";
    if (w >= 1400) return "minmax(360px, 1fr) minmax(0, 860px)";
    if (w >= 1100) return "minmax(300px, 0.95fr) minmax(0, 1.05fr)";
    if (w >= 800) return "minmax(0, 0.92fr) minmax(0, 1.08fr)";
    return "minmax(0, 1fr) minmax(0, 1fr)";
  }

  function lockSplit(forceFit) {
    if (busy) return;
    if (!document.body || !document.body.classList.contains("document-tab")) return;

    busy = true;
    try {
      var layout =
        document.getElementById("invoiceWorkspace") ||
        document.querySelector("main.layout.workspace");
      var form =
        document.getElementById("invoiceForm") ||
        (layout && layout.querySelector(".form-panel"));
      var preview =
        document.getElementById("invoicePreview") ||
        (layout && layout.querySelector(".preview-panel"));
      var stage =
        document.getElementById("invoicePreviewStage") ||
        (preview && preview.querySelector(".invoice-preview-stage"));

      var layoutW = layout && layout.clientWidth ? layout.clientWidth : 0;
      var winW = window.innerWidth || 1200;
      var w = layoutW > 40 ? layoutW : winW;
      var columns = colsForWidth(w);
      var narrow = w < 1100;
      var widthChanged = Math.abs(w - lastW) >= 4;
      var colsChanged = columns !== lastCols;

      if (!widthChanged && !colsChanged && !forceFit) {
        busy = false;
        return;
      }
      lastW = w;
      lastCols = columns;

      if (layout) {
        layout.style.setProperty("display", "grid", "important");
        layout.style.setProperty("grid-template-columns", columns, "important");
        layout.style.setProperty("grid-template-rows", "minmax(0, 1fr)", "important");
        layout.style.setProperty("min-height", "0", "important");
        layout.style.setProperty("overflow", "hidden", "important");
        layout.style.setProperty("gap", "0", "important");
        layout.style.setProperty("margin", "0", "important");
        layout.style.setProperty("width", "100%", "important");
        layout.style.setProperty("align-items", "stretch", "important");
      }
      if (form) {
        form.style.setProperty("grid-column", "1", "important");
        form.style.setProperty("grid-row", "1", "important");
        form.style.setProperty("width", "auto", "important");
        form.style.setProperty("max-width", "none", "important");
        form.style.setProperty("min-width", "0", "important");
        form.style.setProperty("height", "100%", "important");
        form.style.setProperty("min-height", "0", "important");
        form.style.setProperty("max-height", "100%", "important");
        form.style.setProperty("overflow-x", "hidden", "important");
        form.style.setProperty("overflow-y", "auto", "important");
        form.style.setProperty("overscroll-behavior", "contain", "important");
        form.style.setProperty("position", "relative", "important");
        form.style.setProperty("z-index", "5", "important");
        form.style.setProperty("border-right", "1px solid rgba(90, 140, 200, 0.28)", "important");
        form.style.setProperty("border-bottom", "none", "important");
        form.style.setProperty("padding", narrow ? "8px 10px 20px" : "8px 16px 28px", "important");
      }
      if (preview) {
        preview.style.setProperty("grid-column", "2", "important");
        preview.style.setProperty("grid-row", "1", "important");
        preview.style.setProperty("display", "flex", "important");
        preview.style.setProperty("flex-direction", "column", "important");
        preview.style.setProperty("align-items", "center", "important");
        preview.style.setProperty("min-width", "0", "important");
        preview.style.setProperty("width", "auto", "important");
        preview.style.setProperty("height", "100%", "important");
        preview.style.setProperty("min-height", "0", "important");
        preview.style.setProperty("max-height", "100%", "important");
        preview.style.setProperty("overflow", "hidden", "important");
        preview.style.setProperty("position", "relative", "important");
        preview.style.setProperty("z-index", "1", "important");
        preview.style.setProperty("zoom", "1", "important");
        preview.style.setProperty("transform", "none", "important");
        preview.style.setProperty("padding", narrow ? "8px 8px 10px" : "12px 14px 16px", "important");
        preview.style.setProperty("visibility", "visible", "important");
        preview.style.setProperty("opacity", "1", "important");
      }
      if (stage) {
        stage.style.setProperty("flex", "1 1 auto", "important");
        stage.style.setProperty("min-height", "0", "important");
        stage.style.setProperty("min-width", "0", "important");
        stage.style.setProperty("width", "100%", "important");
        stage.style.setProperty("max-width", "100%", "important");
        /* overflow hidden avoids scrollbar↔fit feedback freeze */
        stage.style.setProperty("overflow-x", "hidden", "important");
        stage.style.setProperty("overflow-y", "auto", "important");
        stage.style.setProperty("display", "flex", "important");
        stage.style.setProperty("flex-direction", "column", "important");
        stage.style.setProperty("align-items", "center", "important");
        stage.style.setProperty("justify-content", "flex-start", "important");
      }

      if (typeof window.__workpassFitInvoice === "function") {
        window.__workpassFitInvoice();
      }
    } finally {
      busy = false;
    }
  }

  window.__workpassLockRechnungSplit = lockSplit;

  function schedule() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      lockSplit(false);
    }, 120);
  }

  function boot() {
    lockSplit(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", function () {
    lockSplit(true);
  });
  window.addEventListener("resize", schedule);
  setTimeout(function () {
    lockSplit(true);
  }, 200);
})();
