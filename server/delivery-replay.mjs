/**
 * Replay pending employee deliveries to the platform webhook until acked.
 *
 * Env:
 *   WORKPASS_DELIVERY_REPLAY=0          disable scheduler
 *   WORKPASS_DELIVERY_REPLAY_MINUTES    default 2
 *   WORKPASS_DELIVERY_REPLAY_LIMIT      default 40 per tick
 */
import { listPendingDeliveries, ackDelivery } from "./delivery-queue.mjs";
import { notifyPlatform } from "./notify.mjs";

function eventForDelivery(delivery) {
  if (delivery?.type === "invoice") return "invoice.released";
  return "payslip.released";
}

/**
 * Push pending deliveries again. On webhook 2xx, mark delivered so the queue drains
 * even if the platform does not call /ack (document is already in their hands).
 */
export async function replayPendingDeliveries(options = {}) {
  const limit = Math.max(1, Number(options.limit || process.env.WORKPASS_DELIVERY_REPLAY_LIMIT || 40));
  const companyId = options.companyId ? String(options.companyId).trim().toLowerCase() : "";
  const pending = listPendingDeliveries(companyId ? { companyId } : {})
    .slice(0, limit);

  const results = [];
  let pushed = 0;
  let failed = 0;

  for (const delivery of pending) {
    if (!delivery?.deliveryId) continue;
    try {
      const notify = await notifyPlatform({
        event: eventForDelivery(delivery),
        delivery,
        company: delivery.company || null,
        idempotencyKey: `${delivery.deliveryId}:replay:${Date.now()}`,
        meta: { reason: options.reason || "delivery_replay" },
      });
      if (notify.ok && notify.mode === "webhook") {
        ackDelivery(delivery.deliveryId, {
          via: "webhook-replay",
          at: new Date().toISOString(),
          status: notify.status,
        });
        pushed += 1;
        results.push({ deliveryId: delivery.deliveryId, ok: true, mode: "webhook" });
      } else if (notify.ok && notify.mode === "local-log-only") {
        // No webhook URL – keep pending for platform pull of /v1/delivery/pending
        results.push({ deliveryId: delivery.deliveryId, ok: true, mode: "local-log-only", pendingPull: true });
      } else {
        failed += 1;
        results.push({
          deliveryId: delivery.deliveryId,
          ok: false,
          error: notify.error || "webhook failed",
          hint: notify.hint || null,
        });
      }
    } catch (e) {
      failed += 1;
      results.push({ deliveryId: delivery.deliveryId, ok: false, error: e.message || String(e) });
    }
  }

  return {
    ok: failed === 0,
    pendingBefore: pending.length,
    pushed,
    failed,
    remaining: listPendingDeliveries(companyId ? { companyId } : {}).length,
    results,
    message: pushed
      ? `${pushed} Abrechnung(en)/Dokument(e) erneut an die Plattform gesendet.`
      : (pending.length
        ? (failed
          ? "Lieferung an Plattform fehlgeschlagen – Webhook prüfen."
          : "Keine Webhook-URL – Plattform muss /v1/delivery/pending pollen.")
        : "Keine offenen Lieferungen."),
  };
}

let timer = null;

export function startDeliveryReplayScheduler() {
  if (process.env.WORKPASS_DELIVERY_REPLAY === "0") {
    console.log("[delivery-replay] off (WORKPASS_DELIVERY_REPLAY=0)");
    return { ok: false, reason: "disabled" };
  }
  const minutes = Math.max(1, Number(process.env.WORKPASS_DELIVERY_REPLAY_MINUTES || 2));
  if (timer) clearInterval(timer);
  const tick = () => {
    replayPendingDeliveries({ reason: "scheduler" }).catch((e) => {
      console.warn("[delivery-replay]", e?.message || e);
    });
  };
  setTimeout(tick, 8000);
  timer = setInterval(tick, minutes * 60_000);
  if (typeof timer.unref === "function") timer.unref();
  console.log(`[delivery-replay] on · every ${minutes} min`);
  return { ok: true, intervalMinutes: minutes };
}
