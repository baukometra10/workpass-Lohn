/**
 * Delivery queue – local SQLite first, optional Postgres sync.
 */
import {
  enqueueDeliveryRow,
  listPendingDeliveries as repoPending,
  listAllDeliveries as repoAll,
  ackDeliveryRow,
  markDeliveryWebhookRow,
  getDeliveryRow,
  initDb,
} from "./db/repository.mjs";

initDb();

export function enqueueDelivery(delivery) {
  return enqueueDeliveryRow(delivery);
}

export function listPendingDeliveries(filter = {}) {
  return repoPending(filter);
}

export function listAllDeliveries(filter = {}) {
  return repoAll(filter);
}

export function ackDelivery(deliveryId, meta = {}) {
  return ackDeliveryRow(deliveryId, meta);
}

export function markDeliveryWebhook(deliveryId, meta = {}) {
  return markDeliveryWebhookRow(deliveryId, meta);
}

export function getDelivery(deliveryId) {
  return getDeliveryRow(deliveryId);
}

/**
 * Pending items that still need a webhook push (never reached, or hard failure).
 * Already-pushed (HTTP 2xx) deliveries are NOT returned – platform polls pending instead.
 * DEAD_LETTER excluded until human force replay.
 */
export function listDeliveriesNeedingWebhookPush(filter = {}) {
  const pending = listPendingDeliveries(filter);
  const nowMs = Date.now();
  const backoffMs = Math.max(
    60_000,
    Number(process.env.WORKPASS_DELIVERY_RETRY_BACKOFF_MS || 15 * 60_000)
  );
  const maxAttempts = Math.max(1, Number(process.env.WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS || 3));

  return pending.filter((d) => {
    if (!d?.deliveryId) return false;
    const sync = String(d.syncStatus || "").toUpperCase();
    if (sync === "DEAD_LETTER" || sync === "COMPLETED") return false;
    // Already delivered to transport once → do not spam webhook again
    if (d.webhookPushedAt || d.webhookReached) return false;
    const attempts = Number(d.webhookPushCount || 0);
    if (attempts >= maxAttempts) return false;
    if (d.webhookLastAt) {
      const last = Date.parse(d.webhookLastAt);
      if (Number.isFinite(last) && nowMs - last < backoffMs) return false;
    }
    return true;
  });
}
