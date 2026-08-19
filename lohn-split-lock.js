/**
 * Force form-left / A4-right split after paint.
 * External file required by CSP (script-src 'self').
 */
(function () {
  function lockSplit() {
    var layout = document.getElementById("lohnLayout") || document.querySelector("#lohnApp .lohn-layout");
    var form = document.getElementById("lohnForm");
    var preview = document.getElementById("lohnPreview") || document.querySelector("#lohnApp .lohn-preview");
    if (layout) {
      layout.style.setProperty("display", "grid", "important");
      layout.style.setProperty("grid-template-columns", "minmax(460px, 1fr) minmax(520px, 620px)", "important");
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
      preview.style.setProperty("align-items", "flex-end", "important");
      preview.style.setProperty("min-width", "0", "important");
      preview.style.setProperty("height", "100%", "important");
      preview.style.setProperty("visibility", "visible", "important");
      preview.style.setProperty("opacity", "1", "important");
      preview.style.setProperty("padding", "12px 14px 16px 8px", "important");
    }
  }
  lockSplit();
  document.addEventListener("DOMContentLoaded", lockSplit);
  window.addEventListener("load", lockSplit);
  setTimeout(lockSplit, 50);
  setTimeout(lockSplit, 500);
  setTimeout(lockSplit, 1500);
})();
