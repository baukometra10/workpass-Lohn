/**
 * Kill stale Service Worker / shell cache before Lohn CSS/JS load.
 * Must stay as an external file (CSP: no unsafe-inline scripts).
 */
(function () {
  var FLAG = "workpass.force.split.v233";
  try {
    if (sessionStorage.getItem(FLAG) === "1") return;
    sessionStorage.setItem(FLAG, "1");
  } catch (e) {
    return;
  }
  var touched = false;
  var done = function () {
    if (touched) location.reload();
  };
  var tasks = [];
  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        if (regs && regs.length) {
          touched = true;
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }
      })
    );
  }
  if ("caches" in window) {
    tasks.push(
      caches.keys().then(function (keys) {
        var shell = keys.filter(function (k) { return String(k).indexOf("workpass-shell-") === 0; });
        if (shell.length) {
          touched = true;
          return Promise.all(shell.map(function (k) { return caches.delete(k); }));
        }
      })
    );
  }
  if (!tasks.length) return;
  Promise.all(tasks).then(done).catch(done);
})();
