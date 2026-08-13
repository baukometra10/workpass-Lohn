/**
 * WorkPass Lohn – Zugangsschutz
 * 1) Plattform-Konto (E-Mail + Passwort) → Bridge-Session
 * 2) Geräte-PIN (lokal) als zweiter Schutz / Offline-Fallback
 */
/* SUPPIX SSO hash handoff: #suppix-sso=<urlencoded JSON {token,expiresAt,user,via}> */
(function consumeSuppixSsoHash() {
  function parseSsoPayload(raw) {
    const attempts = [raw];
    try { attempts.push(decodeURIComponent(raw)); } catch { /* ignore */ }
    try { attempts.push(decodeURIComponent(decodeURIComponent(raw))); } catch { /* ignore */ }
    for (const a of attempts) {
      try {
        const data = JSON.parse(a);
        if (data && typeof data === "object") return data;
      } catch { /* try next */ }
    }
    return null;
  }

  try {
    const hash = String(location.hash || "");
    const search = String(location.search || "");
    const m = hash.match(/#suppix-sso=([^&]+)/)
      || search.match(/[?&]suppix-sso=([^&]+)/)
      || search.match(/[?&]sso=([^&]+)/);
    if (!m) return;
    const data = parseSsoPayload(m[1]);
    if (!data) {
      try { sessionStorage.setItem("workpassSsoError", "invalid"); } catch { /* ignore */ }
      history.replaceState(null, "", location.pathname);
      return;
    }
    const token = String(
      data.token || data.session || data.accessToken || data.sessionToken || ""
    ).trim();
    const companyId = String(
      data.user?.companyId || data.companyId || data.company?.id || ""
    ).trim();
    const user = data.user && typeof data.user === "object"
      ? { ...data.user, companyId: data.user.companyId || companyId || undefined }
      : (companyId ? { companyId, role: "accountant" } : null);
    if (!token && !companyId) {
      try { sessionStorage.setItem("workpassSsoError", "invalid"); } catch { /* ignore */ }
      history.replaceState(null, "", location.pathname);
      return;
    }
    const expMs = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
    if (Number.isFinite(expMs) && expMs < Date.now() - 30_000) {
      try { sessionStorage.setItem("workpassSsoError", "expired"); } catch { /* ignore */ }
      history.replaceState(null, "", location.pathname);
      return;
    }
    try {
      sessionStorage.removeItem("workpassSsoError");
      sessionStorage.setItem("workpassSsoPending", "1");
    } catch { /* ignore */ }
    localStorage.setItem(
      "workpassPlatformSessionV2",
      JSON.stringify({
        token: token || `pending:${companyId}`,
        expiresAt: data.expiresAt || null,
        user,
        via: data.via || "suppix",
        preferredLocale: data.preferredLocale || data.locale || user?.locale || "",
        rawCompanyId: companyId || null,
      }),
    );
    const ttlMs = Number.isFinite(expMs)
      ? Math.max(expMs - Date.now(), 60 * 60 * 1000)
      : 8 * 60 * 60 * 1000;
    localStorage.setItem(
      "workpassLohnSessionV2",
      JSON.stringify({
        until: Date.now() + ttlMs,
        touchedAt: new Date().toISOString(),
      }),
    );
    if (companyId) {
      try {
        const prev = JSON.parse(localStorage.getItem("workpass.lohn.apiConfig.v1") || "{}");
        localStorage.setItem(
          "workpass.lohn.apiConfig.v1",
          JSON.stringify({ ...(prev && typeof prev === "object" ? prev : {}), companyId }),
        );
      } catch {
        try {
          localStorage.setItem(
            "workpass.lohn.apiConfig.v1",
            JSON.stringify({ companyId }),
          );
        } catch { /* ignore */ }
      }
      document.body.classList.add("company-portal");
    }
    const locale = String(data.preferredLocale || data.locale || user?.locale || user?.language || "")
      .trim()
      .toLowerCase()
      .slice(0, 2);
    if (locale) {
      try {
        localStorage.setItem("workpass.ui.locale", locale);
        localStorage.removeItem("workpass.ui.locale.manual");
      } catch { /* ignore */ }
    }
    const path = String(location.pathname || "").toLowerCase();
    const isFirm = Boolean(companyId && user?.role !== "admin");
    history.replaceState(null, "", location.pathname);
    if (isFirm) {
      const isLohnEntry = /lohn\.html$/i.test(path);
      if (!isLohnEntry) {
        location.replace(`${location.origin}/lohn.html`);
        return;
      }
    }
    location.reload();
  } catch (e) {
    try { sessionStorage.setItem("workpassSsoError", "invalid"); } catch { /* ignore */ }
  }
})();
(function () {
  const STORE_KEY = "workpassLohnAuthV1";
  const SESSION_KEY = "workpassLohnSessionV2"; // localStorage – login once
  const PLATFORM_SESSION_KEY = "workpassPlatformSessionV2";
  const LEGACY_SESSION_KEY = "workpassLohnSessionV1";
  const LEGACY_PLATFORM_KEY = "workpassPlatformSessionV1";
  // Long-lived UI session (default 8h, aligned with bridge token TTL)
  let IDLE_MS = 8 * 60 * 60 * 1000;
  const TEST_BYPASS = "workpassLohnE2E";

  let idleTimer = null;
  let onUnlockCb = null;
  let pinFails = 0;
  let pinLockedUntil = 0;
  let authConfig = null;
  let loginMode = "platform"; // platform | pin

  function apiOrigin() {
    const h = String(location.hostname || "");
    if (h === "localhost" || h === "127.0.0.1" || location.protocol === "file:") {
      return "http://127.0.0.1:8787";
    }
    return String(location.origin || "").replace(/\/+$/, "");
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
    }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveStore(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function loadPlatformSession() {
    try {
      const raw = storageGet(PLATFORM_SESSION_KEY) || storageGet(LEGACY_PLATFORM_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePlatformSession(data) {
    storageSet(PLATFORM_SESSION_KEY, JSON.stringify(data));
    try { sessionStorage.removeItem(LEGACY_PLATFORM_KEY); } catch { /* ignore */ }
  }

  function clearPlatformSession() {
    storageRemove(PLATFORM_SESSION_KEY);
    storageRemove(LEGACY_PLATFORM_KEY);
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(String(text));
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function fromB64(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function hashPin(pin, saltB64) {
    const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    return { hash: b64(bits), salt: b64(salt), algo: "pbkdf2-sha256", iterations: 120000 };
  }

  async function verifyPin(pin, store) {
    if (store.algo === "pbkdf2-sha256" && store.salt && store.pinHash) {
      const next = await hashPin(pin, store.salt);
      return next.hash === store.pinHash;
    }
    const legacy = await sha256(`workpass-lohn:${pin}`);
    return legacy === store.pinHash;
  }

  function sessionActive() {
    if (storageGet(TEST_BYPASS) === "1" || sessionStorage.getItem(TEST_BYPASS) === "1") return true;
    try {
      const raw = storageGet(SESSION_KEY) || storageGet(LEGACY_SESSION_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (!s?.until) return false;
      return Date.now() < s.until;
    } catch {
      return false;
    }
  }

  function platformSessionActive() {
    const s = loadPlatformSession();
    if (!s?.token) return false;
    if (s.expiresAt) {
      const exp = Date.parse(s.expiresAt);
      if (Number.isFinite(exp) && Date.now() >= exp) return false;
    }
    return true;
  }

  /** One successful login (Konto oder PIN) keeps the app open. */
  function isUnlocked() {
    if (storageGet(TEST_BYPASS) === "1" || sessionStorage.getItem(TEST_BYPASS) === "1") return true;
    return sessionActive() || platformSessionActive();
  }

  function touchSession(extraMs) {
    const ttl = Number(extraMs) > 0 ? Number(extraMs) : IDLE_MS;
    const until = Date.now() + ttl;
    storageSet(SESSION_KEY, JSON.stringify({ until, touchedAt: new Date().toISOString() }));
    try { sessionStorage.removeItem(LEGACY_SESSION_KEY); } catch { /* ignore */ }
    resetIdleWatch();
  }

  function clearSession() {
    storageRemove(SESSION_KEY);
    storageRemove(LEGACY_SESSION_KEY);
  }

  function resetIdleWatch() {
    clearTimeout(idleTimer);
    if (!isUnlocked()) return;
    const s = (() => {
      try {
        const raw = storageGet(SESSION_KEY) || storageGet(LEGACY_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const remaining = s?.until ? Math.max(1000, s.until - Date.now()) : IDLE_MS;
    idleTimer = setTimeout(() => {
      clearSession();
      clearPlatformSession();
      showGate("Sitzung abgelaufen – bitte einmal erneut anmelden.");
    }, remaining);
  }

  function bindActivity() {
    ["pointerdown", "keydown", "mousemove", "scroll"].forEach((ev) => {
      window.addEventListener(ev, () => {
        // Keep session alive while working – do not force re-login
        if (isUnlocked()) touchSession();
      }, { passive: true });
    });
  }

  function gateEl() {
    return document.getElementById("authGate");
  }

  function appEl() {
    return document.getElementById("workpassApp") || document.getElementById("lohnApp");
  }

  function tt(key, fallback) {
    const v = window.WorkPassI18n?.t?.(key);
    return (v && v !== key) ? v : (fallback || key);
  }

  function setLoginMode(mode) {
    loginMode = mode;
    const platformBox = document.getElementById("authPlatformFields");
    const pinBox = document.getElementById("authPinFields");
    const tabPlat = document.getElementById("authTabPlatform");
    const tabPin = document.getElementById("authTabPin");
    if (platformBox) platformBox.hidden = mode !== "platform";
    if (pinBox) pinBox.hidden = mode !== "pin";
    tabPlat?.classList.toggle("active", mode === "platform");
    tabPin?.classList.toggle("active", mode === "pin");
    const title = document.getElementById("authTitle");
    const hint = document.getElementById("authHint");
    const btn = document.getElementById("authSubmit");
    if (mode === "platform") {
      if (title) title.textContent = tt("auth.account", "WorkPass Konto");
      if (hint) hint.textContent = authConfig?.hint || tt("auth.hint", "Mit Plattform-Passwort anmelden");
      if (btn) btn.textContent = tt("auth.submit", "Anmelden");
      document.getElementById("authEmail")?.focus();
    } else {
      const store = loadStore();
      setPinMode(!store?.pinHash);
    }
  }

  function setPinMode(setup) {
    const title = document.getElementById("authTitle");
    const hint = document.getElementById("authHint");
    const confirmWrap = document.getElementById("authConfirmWrap");
    const btn = document.getElementById("authSubmit");
    if (!title) return;
    if (setup) {
      title.textContent = tt("auth.setupPin", "Geräte-PIN einrichten");
      hint.textContent = tt("auth.setupPinHint", "Zusätzlicher Schutz auf diesem Rechner (4–8 Ziffern).");
      if (confirmWrap) confirmWrap.hidden = false;
      if (btn) btn.textContent = tt("auth.savePin", "PIN speichern & öffnen");
    } else {
      title.textContent = tt("auth.devicePin", "Geräte-PIN");
      hint.textContent = tt("auth.devicePinHint", "Lokaler Schutz · Sitzung sperrt bei Inaktivität");
      if (confirmWrap) confirmWrap.hidden = true;
      if (btn) btn.textContent = tt("auth.unlockPin", "Entsperren");
    }
  }

  function applyConfigToGate() {
    const tabs = document.getElementById("authModeTabs");
    const preferPlatform = authConfig?.platformAuthConfigured || authConfig?.localAdminFallback;
    const pinOk = authConfig?.devicePinAllowed !== false;
    const setupIncomplete = Boolean(authConfig?.setupIncomplete);
    const requirePlat = Boolean(authConfig?.requirePlatformLogin) && !setupIncomplete;
    if (tabs) {
      tabs.hidden = !(preferPlatform && pinOk && !requirePlat) && !(setupIncomplete && pinOk && preferPlatform);
      // Always show tabs when both platform attempt and PIN are available
      if (pinOk && (preferPlatform || setupIncomplete)) tabs.hidden = false;
      if (requirePlat && !pinOk) tabs.hidden = true;
    }
    const tabPin = document.getElementById("authTabPin");
    if (tabPin) tabPin.hidden = !pinOk || (requirePlat && !setupIncomplete);
    const hint = document.getElementById("authHint");
    if (hint && authConfig?.hint) hint.textContent = authConfig.hint;
    if (hint && authConfig?.setupGaps?.length) {
      hint.textContent = `${authConfig.hint} · Fehlt: ${authConfig.setupGaps.join(", ")}`;
    }
  }

  function showGate(msg) {
    const gate = gateEl();
    const app = appEl();
    if (gate) {
      gate.hidden = false;
      gate.setAttribute("aria-hidden", "false");
    }
    if (app) app.setAttribute("aria-hidden", "true");
    document.body.classList.add("auth-locked");
    const err = document.getElementById("authError");
    if (err) err.textContent = msg || "";
    applyConfigToGate();
    const preferPlatform = authConfig?.platformAuthConfigured || authConfig?.localAdminFallback;
    const setupIncomplete = Boolean(authConfig?.setupIncomplete);
    // If admin/platform setup incomplete → prefer PIN so the app stays usable
    if (setupIncomplete && authConfig?.devicePinAllowed !== false) {
      setLoginMode("pin");
      setPinMode(!loadStore()?.pinHash);
    } else if (authConfig?.requirePlatformLogin || (preferPlatform && !authConfig?.devicePinAllowed)) {
      setLoginMode("platform");
    } else if (preferPlatform) {
      setLoginMode(loginMode === "pin" ? "pin" : "platform");
    } else {
      setLoginMode("pin");
      setPinMode(!loadStore()?.pinHash);
    }
  }

  function hideGate() {
    const gate = gateEl();
    const app = appEl();
    if (gate) {
      gate.hidden = true;
      gate.setAttribute("aria-hidden", "true");
    }
    if (app) app.setAttribute("aria-hidden", "false");
    document.body.classList.remove("auth-locked");
    const err = document.getElementById("authError");
    if (err) err.textContent = "";
  }

  async function fetchAuthConfig() {
    try {
      const res = await fetch(`${apiOrigin()}/v1/auth/config`, { cache: "no-store" });
      authConfig = await res.json();
      const hours = Number(authConfig?.sessionTtlHours);
      if (hours > 0) IDLE_MS = Math.round(hours * 60 * 60 * 1000);
    } catch {
      authConfig = {
        ok: false,
        platformAuthConfigured: false,
        localAdminFallback: false,
        requirePlatformLogin: false,
        devicePinAllowed: true,
        setupIncomplete: true,
        hint: "Bridge offline – Geräte-PIN nutzen",
      };
    }
    return authConfig;
  }

  async function submitPlatform() {
    const err = document.getElementById("authError");
    const email = String(document.getElementById("authEmail")?.value || "").trim();
    const password = String(document.getElementById("authPassword")?.value || "");
    if (!email || password.length < 4) {
      if (err) err.textContent = tt("auth.needCreds", "E-Mail und Passwort/PIN (min. 4 Zeichen) erforderlich.");
      return false;
    }
    if (err) err.textContent = tt("auth.signingIn", "Anmelden…");
    try {
      const localeHint = window.WorkPassI18n?.getLocale?.()
        || (navigator.language || "").slice(0, 2)
        || "de";
      const res = await fetch(`${apiOrigin()}/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": localeHint,
        },
        body: JSON.stringify({ email, password, locale: localeHint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (err) err.textContent = data.error || `Login fehlgeschlagen (${res.status})`;
        return false;
      }
      savePlatformSession({
        token: data.session,
        expiresAt: data.expiresAt,
        user: data.user,
        via: data.via,
      });
      document.body.classList.toggle(
        "company-portal",
        Boolean(data.user?.companyId && data.user?.role !== "admin")
      );
      try {
        if (data.user?.companyId && typeof localStorage !== "undefined") {
          const prev = JSON.parse(localStorage.getItem("workpass.lohn.apiConfig.v1") || "{}");
          localStorage.setItem("workpass.lohn.apiConfig.v1", JSON.stringify({
            ...prev,
            companyId: data.user.companyId,
          }));
        }
      } catch { /* ignore */ }
      // Align UI session with server token lifetime (login once)
      const expMs = data.expiresAt ? Date.parse(data.expiresAt) - Date.now() : IDLE_MS;
      touchSession(Math.max(expMs, 60 * 60 * 1000));
      const preferred = data.preferredLocale || data.user?.locale || data.user?.language;
      if (preferred && window.WorkPassI18n && !window.WorkPassI18n.isManual?.()) {
        window.WorkPassI18n.setLocale(preferred, { manual: false, persist: true });
      } else {
        await window.WorkPassI18n?.syncFromSession?.();
      }
      hideGate();
      onUnlockCb?.();
      return true;
    } catch (e) {
      if (err) err.textContent = `Bridge nicht erreichbar: ${e.message}`;
      return false;
    }
  }

  async function submitPin() {
    const err = document.getElementById("authError");
    if (Date.now() < pinLockedUntil) {
      const sec = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      if (err) err.textContent = `Zu viele Fehlversuche – ${sec}s warten.`;
      return false;
    }
    const pin = String(document.getElementById("authPin")?.value || "").trim();
    const conf = String(document.getElementById("authPinConfirm")?.value || "").trim();
    if (!/^\d{4,8}$/.test(pin)) {
      if (err) err.textContent = tt("auth.pinLen", "PIN: 4 bis 8 Ziffern erforderlich.");
      return false;
    }
    const store = loadStore();
    if (!store?.pinHash) {
      if (pin !== conf) {
        if (err) err.textContent = tt("auth.pinMismatch", "PIN-Bestätigung stimmt nicht überein.");
        return false;
      }
      const hashed = await hashPin(pin);
      saveStore({
        pinHash: hashed.hash,
        salt: hashed.salt,
        algo: hashed.algo,
        iterations: hashed.iterations,
        createdAt: new Date().toISOString(),
      });
      pinFails = 0;
      touchSession();
      hideGate();
      onUnlockCb?.();
      return true;
    }
    const ok = await verifyPin(pin, store);
    if (!ok) {
      pinFails += 1;
      if (pinFails >= 5) {
        pinLockedUntil = Date.now() + 2 * 60 * 1000;
        pinFails = 0;
        if (err) err.textContent = tt("auth.pinLockout", "Zu viele Fehlversuche – 2 Minuten Sperre.");
      } else if (err) {
        err.textContent = `Falsche PIN. (${pinFails}/5)`;
      }
      return false;
    }
    pinFails = 0;
    if (store.algo !== "pbkdf2-sha256") {
      const hashed = await hashPin(pin);
      saveStore({
        ...store,
        pinHash: hashed.hash,
        salt: hashed.salt,
        algo: hashed.algo,
        iterations: hashed.iterations,
        updatedAt: new Date().toISOString(),
      });
    }
    touchSession();
    hideGate();
    onUnlockCb?.();
    return true;
  }

  async function submit() {
    if (loginMode === "platform") return submitPlatform();
    return submitPin();
  }

  function lock() {
    clearSession();
    clearPlatformSession();
    showGate("");
  }

  async function changePin(oldPin, newPin) {
    const store = loadStore();
    if (!store?.pinHash) return { ok: false, error: "Keine PIN gesetzt." };
    if (!(await verifyPin(oldPin, store))) return { ok: false, error: "Alte PIN falsch." };
    if (!/^\d{4,8}$/.test(newPin)) return { ok: false, error: "Neue PIN: 4–8 Ziffern." };
    const hashed = await hashPin(newPin);
    saveStore({
      pinHash: hashed.hash,
      salt: hashed.salt,
      algo: hashed.algo,
      iterations: hashed.iterations,
      createdAt: store.createdAt,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  function getSessionToken() {
    return loadPlatformSession()?.token || "";
  }

  function getSessionUser() {
    return loadPlatformSession()?.user || null;
  }

  function isCompanyPortalUser() {
    const u = getSessionUser();
    return Boolean(u?.companyId && u.role !== "admin");
  }

  async function verifyPlatformSessionOrClear() {
    const plat = loadPlatformSession();
    if (!plat?.token) return { ok: true, skipped: true };
    const companyId = String(
      plat.user?.companyId || plat.rawCompanyId || ""
    ).trim();
    let pendingSso = false;
    try { pendingSso = sessionStorage.getItem("workpassSsoPending") === "1"; } catch { /* ignore */ }

    async function applySession(token, expiresAt, user, via) {
      savePlatformSession({
        token,
        expiresAt: expiresAt || null,
        user: user || plat.user || null,
        via: via || plat.via || "suppix",
      });
      document.body.classList.toggle(
        "company-portal",
        Boolean(user?.companyId && user?.role !== "admin")
      );
      try {
        if (user?.companyId) {
          const prev = JSON.parse(localStorage.getItem("workpass.lohn.apiConfig.v1") || "{}");
          localStorage.setItem(
            "workpass.lohn.apiConfig.v1",
            JSON.stringify({ ...(prev && typeof prev === "object" ? prev : {}), companyId: user.companyId }),
          );
        }
      } catch { /* ignore */ }
      try { sessionStorage.removeItem("workpassSsoPending"); } catch { /* ignore */ }
      return { ok: true, user };
    }

    async function tryBootstrap() {
      try {
        const res = await fetch(`${apiOrigin()}/v1/auth/sso-bootstrap`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            token: String(plat.token || "").startsWith("pending:") ? "" : plat.token,
            expiresAt: plat.expiresAt,
            user: plat.user,
            via: plat.via,
            companyId,
            preferredLocale: plat.preferredLocale || plat.user?.locale || "",
          }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.session) {
          return applySession(data.session, data.expiresAt, data.user, data.via || "sso-bootstrap");
        }
        return { ok: false, error: data.error || "" };
      } catch {
        return { ok: false, error: "bootstrap-offline" };
      }
    }

    try {
      const looksPending = String(plat.token || "").startsWith("pending:");
      if (!looksPending) {
        const res = await fetch(`${apiOrigin()}/v1/auth/me`, {
          headers: {
            "X-WorkPass-Session": plat.token,
            Accept: "application/json",
          },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.user) {
          return applySession(plat.token, plat.expiresAt || data.expiresAt, data.user, plat.via);
        }
      }

      // Platform launch URL often sends a non-accounting token → upgrade to real session.
      const boot = await tryBootstrap();
      if (boot.ok) return boot;

      // Last resort: keep firm portal unlocked (pre-v2.45 behavior) when company is known.
      if (companyId || pendingSso || sessionActive()) {
        document.body.classList.toggle(
          "company-portal",
          Boolean(companyId && plat.user?.role !== "admin")
        );
        try { sessionStorage.removeItem("workpassSsoPending"); } catch { /* ignore */ }
        return { ok: true, legacy: true, user: plat.user || (companyId ? { companyId, role: "accountant" } : null) };
      }

      clearPlatformSession();
      clearSession();
      return {
        ok: false,
        error: tt(
          "auth.ssoInvalid",
          "Anmeldung von der Plattform ungültig – bitte erneut über die Plattform öffnen oder mit Firmen-Login anmelden."
        ),
      };
    } catch (e) {
      if (sessionActive() || companyId || pendingSso) {
        return { ok: true, offline: true, user: plat.user || null };
      }
      return {
        ok: false,
        error: tt("auth.bridgeOffline", "Bridge nicht erreichbar – bitte Verbindung prüfen und erneut öffnen."),
      };
    }
  }

  function takeSsoErrorMessage() {
    let code = "";
    try {
      code = sessionStorage.getItem("workpassSsoError") || "";
      sessionStorage.removeItem("workpassSsoError");
    } catch { /* ignore */ }
    if (code === "expired") {
      return tt("auth.ssoExpired", "Der Plattform-Link ist abgelaufen – bitte erneut über die Plattform öffnen.");
    }
    if (code === "invalid") {
      return tt(
        "auth.ssoInvalid",
        "Anmeldung von der Plattform ungültig – bitte erneut über die Plattform öffnen oder mit Firmen-Login anmelden."
      );
    }
    return "";
  }

  async function init(options) {
    onUnlockCb = options?.onUnlock || null;
    bindActivity();
    await fetchAuthConfig();

    document.getElementById("authTabPlatform")?.addEventListener("click", () => setLoginMode("platform"));
    document.getElementById("authTabPin")?.addEventListener("click", () => setLoginMode("pin"));

    const form = document.getElementById("authForm");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
    document.getElementById("btnLock")?.addEventListener("click", lock);

    // One unlock is enough across Hub / Lohn / Admin (localStorage)
    if (isUnlocked()) {
      const verified = await verifyPlatformSessionOrClear();
      if (!verified.ok) {
        showGate(verified.error || takeSsoErrorMessage());
        window.WorkPassI18n?.applyDom?.(document.getElementById("authGate") || document);
        return false;
      }
      hideGate();
      touchSession();
      document.body.classList.toggle("company-portal", isCompanyPortalUser());
      await window.WorkPassI18n?.syncFromSession?.();
      onUnlockCb?.();
      return true;
    }
    showGate(takeSsoErrorMessage());
    window.WorkPassI18n?.applyDom?.(document.getElementById("authGate") || document);
    return false;
  }

  window.WorkPassAuth = {
    init,
    lock,
    unlock: submit,
    changePin,
    isUnlocked,
    getSessionToken,
    getSessionUser,
    isCompanyPortalUser,
    getAuthConfig: () => authConfig,
    STORE_KEY,
    SESSION_KEY,
    PLATFORM_SESSION_KEY,
    TEST_BYPASS,
  };
})();