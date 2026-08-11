/**
 * PWA install / desktop-app prompt for WorkPass.
 */
(function () {
  const KEY = "workpass.pwa.dismissed";
  let deferred = null;

  function t(key, fb) {
    const v = window.WorkPassI18n?.t?.(key);
    return v && v !== key ? v : fb;
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
  }

  function ensureBtn() {
    let btn = document.getElementById("wpInstallApp");
    if (btn) return btn;
    const hosts = [
      document.getElementById("wpLangHost"),
      document.querySelector(".lohn-actions"),
      document.querySelector(".lex-appbar-actions"),
      document.querySelector(".app-topbar"),
    ].filter(Boolean);
    const host = hosts[0];
    if (!host) return null;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "wpInstallApp";
    btn.className = "btn btn-link wp-install-btn";
    btn.hidden = true;
    btn.setAttribute("data-i18n", "pwa.install");
    btn.textContent = t("pwa.install", "App installieren");
    host.prepend(btn);
    btn.addEventListener("click", async () => {
      if (!deferred) {
        window.alert(t("pwa.manual", "Über den Browser: Menü → App installieren / Zum Desktop hinzufügen."));
        return;
      }
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      btn.hidden = true;
      if (choice?.outcome === "dismissed") {
        try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
      }
    });
    return btn;
  }

  function showInstall() {
    if (isStandalone()) return;
    const btn = ensureBtn();
    if (!btn) return;
    try {
      const dismissed = Number(localStorage.getItem(KEY) || 0);
      if (dismissed && Date.now() - dismissed < 7 * 24 * 3600 * 1000 && !deferred) return;
    } catch { /* ignore */ }
    btn.hidden = false;
    btn.textContent = t("pwa.install", "App installieren");
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    showInstall();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    const btn = document.getElementById("wpInstallApp");
    if (btn) btn.hidden = true;
  });

  window.addEventListener("workpass:locale", () => {
    const btn = document.getElementById("wpInstallApp");
    if (btn && !btn.hidden) btn.textContent = t("pwa.install", "App installieren");
  });

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = new URL("sw.js", window.location.href).href;
    navigator.serviceWorker.register(swUrl).catch(() => {});
  }

  function boot() {
    registerSw();
    if (!isStandalone()) {
      // Show manual install affordance even if beforeinstallprompt is delayed
      setTimeout(showInstall, 1200);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
