/**
 * Platform receipt lifecycle for Aufträge + document deliveries.
 * Full confirmation only when all three are true:
 *   received (استُلم) → opened (فُتح) → seen (رُئي)
 */
export function emptyReceipt() {
  return {
    received: false,
    opened: false,
    seen: false,
    complete: false,
    receivedAt: null,
    openedAt: null,
    seenAt: null,
    receivedBy: null,
    openedBy: null,
    seenBy: null,
  };
}

export function normalizeReceipt(raw = {}) {
  const base = emptyReceipt();
  const r = { ...base, ...(raw && typeof raw === "object" ? raw : {}) };
  r.received = Boolean(r.received || r.receivedAt);
  r.opened = Boolean(r.opened || r.openedAt);
  r.seen = Boolean(r.seen || r.seenAt || r.readAt);
  if (r.seen) {
    r.opened = true;
    r.received = true;
  } else if (r.opened) {
    r.received = true;
  }
  r.complete = Boolean(r.received && r.opened && r.seen);
  return r;
}

function actorOf(meta = {}) {
  return String(meta.readBy || meta.actor || meta.seenBy || meta.openedBy || meta.receivedBy || "platform").trim() || "platform";
}

/**
 * Apply a receipt stage. Later stages imply earlier ones.
 * @param {"received"|"opened"|"seen"|string} stage
 */
export function applyReceiptStage(prev, stage, meta = {}) {
  const next = normalizeReceipt(prev);
  const ts = String(meta.at || new Date().toISOString());
  const who = actorOf(meta);
  const s = String(stage || meta.stage || "").toLowerCase().trim();

  const markReceived = s === "received" || s === "accepted" || s === "stored" || meta.received === true || meta.accepted === true;
  const markOpened = s === "opened" || s === "open" || meta.opened === true;
  const markSeen = s === "seen" || s === "read" || s === "viewed" || s === "ack" || meta.seen === true || meta.viewed === true || meta.read === true;

  if (markReceived || markOpened || markSeen) {
    if (!next.receivedAt) next.receivedAt = ts;
    next.received = true;
    next.receivedBy = next.receivedBy || who;
  }
  if (markOpened || markSeen) {
    if (!next.openedAt) next.openedAt = ts;
    next.opened = true;
    next.openedBy = next.openedBy || who;
  }
  if (markSeen) {
    if (!next.seenAt) next.seenAt = ts;
    next.seen = true;
    next.seenBy = who;
  }

  next.complete = Boolean(next.received && next.opened && next.seen);
  return next;
}

/** Parse platform webhook / ack JSON into receipt updates. */
export function receiptFromPlatformBody(body = {}, meta = {}) {
  if (!body || typeof body !== "object") return normalizeReceipt(meta.receipt || {});
  const status = String(body.employeeAppStatus || body.status || "").toLowerCase();
  let stage = null;
  if (body.seen === true || body.viewed === true || body.read === true || status === "viewed" || status === "seen" || status === "read") {
    stage = "seen";
  } else if (body.opened === true || status === "opened" || status === "open" || status === "visible") {
    stage = "opened";
  } else if (
    body.accepted === true
    || body.received === true
    || body.stored === true
    || body.deliveryAccepted === true
    || (body.queued === true && (body.deliveryId || body.idempotencyKey))
  ) {
    stage = "received";
  }
  if (!stage && meta.forceReceived) stage = "received";
  if (!stage) return normalizeReceipt(meta.receipt || {});
  return applyReceiptStage(meta.receipt || {}, stage, {
    ...meta,
    at: meta.at || new Date().toISOString(),
    actor: meta.actor || body.actor || body.readBy || "platform",
  });
}

export function receiptLabels(receipt) {
  const r = normalizeReceipt(receipt);
  return {
    received: r.received,
    opened: r.opened,
    seen: r.seen,
    complete: r.complete,
    label: r.complete
      ? "Plattform: empfangen · geöffnet · gesehen"
      : [
        r.received ? "empfangen" : "nicht empfangen",
        r.opened ? "geöffnet" : "nicht geöffnet",
        r.seen ? "gesehen" : "nicht gesehen",
      ].join(" · "),
    steps: [
      { id: "received", done: r.received, at: r.receivedAt, label: "Empfangen" },
      { id: "opened", done: r.opened, at: r.openedAt, label: "Geöffnet" },
      { id: "seen", done: r.seen, at: r.seenAt, label: "Gesehen" },
    ],
  };
}
