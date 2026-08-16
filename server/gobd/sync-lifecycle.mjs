/**
 * Platform ↔ Accounting sync lifecycle (GoBD / ops visibility).
 * Statuses: PENDING | PROCESSING | COMPLETED | FAILED | RETRYING | DEAD_LETTER
 */
import { SYNC_STATUSES } from "./business-audit.mjs";
import { appendBusinessAudit } from "./business-audit.mjs";
import { normalizeCompanyId } from "../tenant.mjs";

export { SYNC_STATUSES };

const MAX_ATTEMPTS = () => Math.max(1, Number(process.env.WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS || 3));

/**
 * Derive canonical sync status from a delivery payload.
 */
export function deriveDeliverySyncStatus(delivery) {
  if (!delivery) return "PENDING";
  if (delivery.syncStatus && SYNC_STATUSES.includes(String(delivery.syncStatus).toUpperCase())) {
    const s = String(delivery.syncStatus).toUpperCase();
    // Recompute if payload markers contradict a stale label
    if (s === "DEAD_LETTER") return "DEAD_LETTER";
    if (s === "COMPLETED" || delivery.queueStatus === "delivered" || delivery.ackedAt) return "COMPLETED";
  }
  if (delivery.queueStatus === "delivered" || delivery.ackedAt) return "COMPLETED";
  if (delivery.webhookAccepted) return "COMPLETED";
  if (delivery.webhookReached || delivery.webhookPushedAt) {
    // Transport once – waiting for platform ack/pull
    return "PROCESSING";
  }
  const attempts = Number(delivery.webhookPushCount || 0);
  if (attempts >= MAX_ATTEMPTS() && !delivery.webhookReached) return "DEAD_LETTER";
  if (attempts > 0 && delivery.webhookLastError) return "RETRYING";
  if (attempts > 0) return "RETRYING";
  return "PENDING";
}

/**
 * Apply syncStatus (+ event/correlation) onto delivery object (mutates).
 */
export function applySyncLifecycle(delivery, patch = {}) {
  if (!delivery || typeof delivery !== "object") return delivery;
  if (patch.syncStatus) delivery.syncStatus = String(patch.syncStatus).toUpperCase();
  else delivery.syncStatus = deriveDeliverySyncStatus(delivery);

  delivery.eventId = delivery.eventId
    || patch.eventId
    || delivery.webhookIdempotencyKey
    || delivery.deliveryId
    || null;
  delivery.correlationId = delivery.correlationId
    || patch.correlationId
    || delivery.eventId
    || delivery.deliveryId
    || null;
  delivery.idempotencyKey = delivery.idempotencyKey
    || patch.idempotencyKey
    || delivery.webhookIdempotencyKey
    || delivery.deliveryId
    || null;
  delivery.sourceSystem = delivery.sourceSystem || patch.sourceSystem || "workpass-accounting";
  if (patch.processedAt) delivery.processedAt = patch.processedAt;
  if (patch.lastError != null) delivery.lastSyncError = patch.lastError;
  return delivery;
}

/**
 * Stable idempotency / event key for platform↔accounting ops.
 * Example: PAYROLL-2026-08-cmp123-emp456
 */
export function buildIdempotencyKey({ kind = "PAYROLL", period = "", companyId = "", employeeId = "", entityId = "" }) {
  const parts = [
    String(kind || "EVT").toUpperCase().replace(/[^A-Z0-9]+/g, "-"),
    String(period || "NA").replace(/[^0-9A-Za-z-]+/g, ""),
    normalizeCompanyId(companyId) || "tenant",
    String(employeeId || entityId || "x").replace(/[^0-9A-Za-z._@-]+/g, "_").slice(0, 64),
  ];
  return parts.join("-");
}

export function summarizeSyncDeliveries(deliveries = []) {
  const counts = Object.fromEntries(SYNC_STATUSES.map((s) => [s, 0]));
  const items = [];
  for (const d of deliveries) {
    const status = deriveDeliverySyncStatus(d);
    counts[status] = (counts[status] || 0) + 1;
    items.push({
      deliveryId: d.deliveryId,
      companyId: d.company?.id || "",
      type: d.type || "",
      syncStatus: status,
      eventId: d.eventId || d.deliveryId,
      correlationId: d.correlationId || d.deliveryId,
      idempotencyKey: d.idempotencyKey || d.webhookIdempotencyKey || d.deliveryId,
      attempts: Number(d.webhookPushCount || 0),
      enqueuedAt: d.enqueuedAt || null,
      processedAt: d.processedAt || d.ackedAt || d.webhookPushedAt || null,
      lastError: d.lastSyncError || d.webhookLastError || null,
    });
  }
  return {
    kind: "portal.sync_lifecycle.v1",
    statuses: SYNC_STATUSES,
    counts,
    total: items.length,
    deadLetter: items.filter((i) => i.syncStatus === "DEAD_LETTER"),
    retrying: items.filter((i) => i.syncStatus === "RETRYING"),
    items,
  };
}

export function auditSyncTransition(delivery, fromStatus, toStatus, meta = {}) {
  try {
    appendBusinessAudit({
      companyId: delivery?.company?.id || meta.companyId || "",
      employeeId: delivery?.employee?.id || "",
      actor: meta.actor || "system",
      source: meta.source || "job",
      op: "sync.status",
      entityType: "delivery",
      entityId: delivery?.deliveryId || "",
      status: toStatus,
      correlationId: delivery?.correlationId || delivery?.deliveryId || "",
      eventId: meta.eventId,
      oldValue: { syncStatus: fromStatus },
      newValue: { syncStatus: toStatus },
      detail: {
        reason: meta.reason || null,
        attempts: delivery?.webhookPushCount || 0,
      },
    });
  } catch { /* non-blocking */ }
}
