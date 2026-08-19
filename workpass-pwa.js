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

  function markStandalone() {
    if (!isStandalone()) return;
    document.documentElement.classList.add("wp-standalone");
    document.body?.classList.add("wp-standalone");
  }

  function ensureBtn() {
    let btn = document.getElementById("wpInstallApp");
    if (!btn) {
      const host = document.querySelector(".wp-appbar-actions")
        || document.querySelector(".lohn-actions")
        || document.getElementById("wpLangHost");
      if (!host) return null;
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "wpInstallApp";
      btn.className = "wp-install-btn";
      btn.hidden = true;
      btn.setAttribute("data-i18n", "pwa.install");
      const lang = document.getElementById("wpLangHost");
      if (lang && lang.parentElement === host) {
        lang.insertAdjacentElement("afterend", btn);
      } else {
        host.prepend(btn);
      }
      btn.addEventListener("click", onInstallClick);
    }
    btn.className = "wp-install-btn";
    btn.setAttribute("aria-label", t("pwa.install", "App installieren"));
    btn.title = t("pwa.install", "App installieren");
    btn.textContent = t("pwa.install", "App installieren");
    return btn;
  }

  async function onInstallClick() {
    const btn = document.getElementById("wpInstallApp");
    if (!deferred) {
      window.alert(t("pwa.manual", "Über den Browser: Menü → App installieren / Zum Desktop hinzufügen."));
      return;
    }
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    if (btn) btn.hidden = true;
    if (choice?.outcome === "dismissed") {
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    }
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
    if (btn) btn.textContent = t("pwa.install", "App installieren");
  });

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    // Lohn layout must never stick behind an old shell cache.
    const path = String(location.pathname || "");
    if (/lohn\.html$/i.test(path)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((k) => String(k).startsWith("workpass-shell-")).map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }
    const swUrl = new URL("sw.js?v=228", window.location.href).href;
    navigator.serviceWorker.register(swUrl).then((reg) => {
      try { reg.update(); } catch { /* ignore */ }
    }).catch(() => {});
  }

  function boot() {
    markStandalone();
    registerSw();
    const existing = document.getElementById("wpInstallApp");
    if (existing && !existing.dataset.bound) {
      existing.dataset.bound = "1";
      existing.addEventListener("click", onInstallClick);
    }
    if (isStandalone()) {
      if (existing) existing.hidden = true;
      return;
    }
    setTimeout(showInstall, 800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
