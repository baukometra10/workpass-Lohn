/**
 * WorkPass Lohn – lokaler Zugangsschutz (PIN)
 * Schützt vor Fremdzugriff am offenen Rechner. Kein Server-Login.
 */
(function () {
  const STORE_KEY = "workpassLohnAuthV1";
  const SESSION_KEY = "workpassLohnSessionV1";
  const IDLE_MS = 12 * 60 * 1000; // 12 Minuten
  const TEST_BYPASS = "workpassLohnE2E";

  let idleTimer = null;
  let onUnlockCb = null;
  let pinFails = 0;
  let pinLockedUntil = 0;

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

  /** PBKDF2-SHA-256 PIN hash (v2). Legacy sha256 still accepted once then upgraded. */
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
    // Legacy
    const legacy = await sha256(`workpass-lohn:${pin}`);
    return legacy === store.pinHash;
  }

  function sessionActive() {
    if (sessionStorage.getItem(TEST_BYPASS) === "1") return true;
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!s?.until) return false;
      return Date.now() < s.until;
    } catch {
      return false;
    }
  }

  function touchSession() {
    const until = Date.now() + IDLE_MS;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ until }));
    resetIdleWatch();
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function resetIdleWatch() {
    clearTimeout(idleTimer);
    if (!sessionActive()) return;
    idleTimer = setTimeout(() => {
      clearSession();
      showGate("Sitzung abgelaufen – bitte erneut entsperren.");
    }, IDLE_MS);
  }

  function bindActivity() {
    ["pointerdown", "keydown", "mousemove", "scroll"].forEach((ev) => {
      window.addEventListener(ev, () => {
        if (sessionActive()) touchSession();
      }, { passive: true });
    });
  }

  function gateEl() {
    return document.getElementById("authGate");
  }

  function setMode(setup) {
    const title = document.getElementById("authTitle");
    const hint = document.getElementById("authHint");
    const confirmWrap = document.getElementById("authConfirmWrap");
    const btn = document.getElementById("authSubmit");
    if (!title) return;
    if (setup) {
      title.textContent = "Zugang einrichten";
      hint.textContent = "Legen Sie eine PIN fest (4–8 Ziffern). Sie schützt die Abrechnungen auf diesem Rechner.";
      confirmWrap.hidden = false;
      btn.textContent = "PIN speichern & öffnen";
    } else {
      title.textContent = "WorkPass Lohn entsperren";
      hint.textContent = "Geschützter Buchhaltungszugang · Suppix AI";
      confirmWrap.hidden = true;
      btn.textContent = "Anmelden";
    }
  }

  function appEl() {
    return document.getElementById("workpassApp") || document.getElementById("lohnApp");
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
    const store = loadStore();
    setMode(!store?.pinHash);
    const pin = document.getElementById("authPin");
    if (pin) {
      pin.value = "";
      pin.focus();
    }
    const conf = document.getElementById("authPinConfirm");
    if (conf) conf.value = "";
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

  async function submit() {
    const err = document.getElementById("authError");
    if (Date.now() < pinLockedUntil) {
      const sec = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      if (err) err.textContent = `Zu viele Fehlversuche – ${sec}s warten.`;
      return false;
    }
    const pin = String(document.getElementById("authPin")?.value || "").trim();
    const conf = String(document.getElementById("authPinConfirm")?.value || "").trim();
    if (!/^\d{4,8}$/.test(pin)) {
      if (err) err.textContent = "PIN: 4 bis 8 Ziffern erforderlich.";
      return false;
    }
    const store = loadStore();
    if (!store?.pinHash) {
      if (pin !== conf) {
        if (err) err.textContent = "PIN-Bestätigung stimmt nicht überein.";
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
        if (err) err.textContent = "Zu viele Fehlversuche – 2 Minuten Sperre.";
      } else if (err) {
        err.textContent = `Falsche PIN. (${pinFails}/5)`;
      }
      return false;
    }
    pinFails = 0;
    // Upgrade legacy hash on successful login
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

  function lock() {
    clearSession();
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

  function init(options) {
    onUnlockCb = options?.onUnlock || null;
    bindActivity();
    const form = document.getElementById("authForm");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
    document.getElementById("btnLock")?.addEventListener("click", lock);

    if (sessionActive()) {
      hideGate();
      touchSession();
      onUnlockCb?.();
      return true;
    }
    showGate("");
    return false;
  }

  window.WorkPassAuth = {
    init,
    lock,
    unlock: submit,
    changePin,
    isUnlocked: sessionActive,
    STORE_KEY,
    SESSION_KEY,
    TEST_BYPASS,
  };
})();
