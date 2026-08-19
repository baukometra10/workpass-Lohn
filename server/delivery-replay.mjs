/**
 * Replay pending employee deliveries to the platform webhook – only when needed.
 *
 * Rules (anti-spam):
 * - Each delivery is POSTed at most once after HTTP 2xx (webhookReached / webhookPushedAt).
 * - Platform should ack or poll GET /v1/delivery/pending – we do NOT resend forever.
 * - Hard failures retry with backoff, capped by WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS (default 3).
 * - Idempotency key is always the stable deliveryId (never Date.now()).
 *
 * Env:
 *   WORKPASS_DELIVERY_REPLAY=0              disable scheduler
 *   WORKPASS_DELIVERY_REPLAY_MINUTES         default 30 (was 2)
 *   WORKPASS_DELIVERY_REPLAY_LIMIT          default 20 per tick
 *   WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS     default 3
 *   WORKPASS_DELIVERY_RETRY_BACKOFF_MS      default 900000 (15 min)
 */
import {
  listPendingDeliveries,
  listDeliveriesNeedingWebhookPush,
  ackDelivery,
  markDeliveryWebhook,
} from "./delivery-queue.mjs";
import { notifyPlatform } from "./notify.mjs";

/** Map queue delivery.type → platform webhook event (document.released + documentType). */
export function eventForDelivery(delivery) {
  const t = String(delivery?.documentType || delivery?.type || "").toLowerCase();
  if (["invoice", "lstb", "verdienst", "vb", "payslip", "payroll"].includes(t)) {
    return "document.released";
  }
  return "document.released";
}

export function documentTypeForDelivery(delivery) {
  const t = String(delivery?.documentType || delivery?.type || "").toLowerCase();
  if (t === "invoice") return "invoice";
  if (t === "lstb") return "lstb";
  if (t === "verdienst" || t === "vb") return "verdienst";
  return "payslip";
}

/**
 * Push only deliveries that never reached the webhook (or failed with backoff left).
 */
export async function replayPendingDeliveries(options = {}) {
  const limit = Math.max(1, Number(options.limit || process.env.WORKPASS_DELIVERY_REPLAY_LIMIT || 20));
  const companyId = options.companyId ? String(options.companyId).trim().toLowerCase() : "";
  const force = Boolean(options.force);
  const filter = companyId ? { companyId } : {};

  const pendingAll = listPendingDeliveries(filter);
  const candidates = force
    ? pendingAll.slice(0, limit)
    : listDeliveriesNeedingWebhookPush(filter).slice(0, limit);

  const results = [];
  let pushed = 0;
  let failed = 0;
  let skippedAlreadySent = 0;

  for (const delivery of pendingAll.slice(0, Math.max(limit, pendingAll.length))) {
    if (delivery?.webhookPushedAt || delivery?.webhookReached) {
      if (!force) skippedAlreadySent += 1;
    }
  }

  for (const delivery of candidates) {
    if (!delivery?.deliveryId) continue;
    try {
      const documentType = documentTypeForDelivery(delivery);
      const notify = await notifyPlatform({
        event: eventForDelivery(delivery),
        documentType,
        delivery,
        company: delivery.company || null,
        // Stable key so the platform can dedupe even if we retry a failure
        idempotencyKey: String(delivery.deliveryId),
        strictAck: documentType === "lstb" || documentType === "verdienst",
        meta: {
          reason: options.reason || "delivery_replay",
          force,
          documentType,
          legacyEvent: documentType === "lstb"
            ? "lstb.released"
            : (documentType === "verdienst"
              ? "verdienst.released"
              : (documentType === "invoice" ? "invoice.released" : "payslip.released")),
        },
      });

      const reached = Boolean(notify.ok && notify.mode === "webhook");
      const accepted = Boolean(reached && notify.accepted === true);

      markDeliveryWebhook(delivery.deliveryId, {
        at: new Date().toISOString(),
        status: notify.status ?? null,
        error: notify.ok ? null : (notify.error || null),
        accepted,
        reached,
        idempotencyKey: notify.idempotencyKey || delivery.deliveryId,
      });

      if (accepted) {
        ackDelivery(delivery.deliveryId, {
          via: "webhook-replay-accepted",
          at: new Date().toISOString(),
          status: notify.status,
        });
        pushed += 1;
        results.push({ deliveryId: delivery.deliveryId, ok: true, mode: "webhook", accepted: true });
      } else if (reached) {
        // Transport OK once – stop resending; platform polls pending
        pushed += 1;
        results.push({
          deliveryId: delivery.deliveryId,
          ok: true,
          mode: "webhook",
          accepted: false,
          pendingPull: true,
          sentOnce: true,
          hint: notify.hint || "Einmal gesendet – kein Auto-Resend.",
        });
      } else if (notify.ok && notify.mode === "local-log-only") {
        results.push({ deliveryId: delivery.deliveryId, ok: true, mode: "local-log-only", pendingPull: true });
      } else {
        failed += 1;
        results.push({
          deliveryId: delivery.deliveryId,
          ok: false,
          error: notify.error || "webhook failed",
          status: notify.status || null,
          hint: notify.hint || null,
        });
      }
    } catch (e) {
      failed += 1;
      try {
        markDeliveryWebhook(delivery.deliveryId, {
          at: new Date().toISOString(),
          status: null,
          error: e.message || String(e),
          accepted: false,
          reached: false,
          idempotencyKey: delivery.deliveryId,
        });
      } catch { /* ignore */ }
      results.push({ deliveryId: delivery.deliveryId, ok: false, error: e.message || String(e) });
    }
  }

  const remainingNeedPush = listDeliveriesNeedingWebhookPush(filter).length;
  const remainingPending = listPendingDeliveries(filter).length;

  return {
    ok: failed === 0,
    pendingBefore: pendingAll.length,
    candidates: candidates.length,
    pushed,
    failed,
    skippedAlreadySent,
    remaining: remainingPending,
    remainingNeedPush,
    results,
    message: pushed
      ? `${pushed} Lieferung(en) einmalig an die Plattform gesendet (kein Spam-Resend).`
      : (candidates.length === 0
        ? (pendingAll.length
          ? "Offene Lieferungen bereits einmal gesendet – warte auf Plattform-Ack/Pull (kein erneuter Webhook)."
          : "Keine offenen Lieferungen.")
        : (failed
          ? "Lieferung an Plattform fehlgeschlagen – begrenzter Retry mit Backoff."
          : "Keine Webhook-URL – Plattform muss /v1/delivery/pending pollen.")),
  };
}

let timer = null;
let legacyQuarantineDone = false;

/** Stop re-flooding deliveries that were already spammed before send-once fix. */
function quarantineLegacyPendingOnce() {
  if (legacyQuarantineDone) return { marked: 0 };
  legacyQuarantineDone = true;
  const minAgeMs = Math.max(30_000, Number(process.env.WORKPASS_DELIVERY_LEGACY_QUARANTINE_MS || 120_000));
  const nowMs = Date.now();
  let marked = 0;
  for (const d of listPendingDeliveries()) {
    if (!d?.deliveryId) continue;
    if (d.webhookPushedAt || d.webhookReached || d.webhookLastAt) continue;
    const enq = Date.parse(d.enqueuedAt || 0);
    if (!Number.isFinite(enq) || nowMs - enq < minAgeMs) continue;
    try {
      markDeliveryWebhook(d.deliveryId, {
        at: new Date().toISOString(),
        status: 200,
        accepted: false,
        reached: true,
        error: null,
        idempotencyKey: d.deliveryId,
      });
      marked += 1;
    } catch { /* ignore */ }
  }
  if (marked) {
    console.log(`[delivery-replay] anti-spam: marked ${marked} legacy pending as already-pushed (no resend)`);
  }
  return { marked };
}

export function startDeliveryReplayScheduler() {
  if (process.env.WORKPASS_DELIVERY_REPLAY === "0") {
    console.log("[delivery-replay] off (WORKPASS_DELIVERY_REPLAY=0)");
    return { ok: false, reason: "disabled" };
  }
  // Default 30 min – only retries hard failures; already-pushed items are skipped
  const minutes = Math.max(5, Number(process.env.WORKPASS_DELIVERY_REPLAY_MINUTES || 30));
  if (timer) clearInterval(timer);
  const tick = () => {
    try { quarantineLegacyPendingOnce(); } catch { /* ignore */ }
    replayPendingDeliveries({ reason: "scheduler" }).catch((e) => {
      console.warn("[delivery-replay]", e?.message || e);
    });
  };
  // First tick after 60s (not 8s) to avoid burst on every Railway restart
  setTimeout(tick, 60_000);
  timer = setInterval(tick, minutes * 60_000);
  if (typeof timer.unref === "function") timer.unref();
  console.log(`[delivery-replay] on · every ${minutes} min · send-once + failure backoff`);
  return { ok: true, intervalMinutes: minutes };
}
