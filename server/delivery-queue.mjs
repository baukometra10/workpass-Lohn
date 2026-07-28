/**
 * Delivery queue – local SQLite first, optional Postgres sync.
 */
import {
  enqueueDeliveryRow,
  listPendingDeliveries as repoPending,
  listAllDeliveries as repoAll,
  ackDeliveryRow,
  initDb,
} from "./db/repository.mjs";

initDb();

export function enqueueDelivery(delivery) {
  return enqueueDeliveryRow(delivery);
}

export function listPendingDeliveries(filter = {}) {
  return repoPending(filter);
}

export function listAllDeliveries() {
  return repoAll();
}

export function ackDelivery(deliveryId, meta = {}) {
  return ackDeliveryRow(deliveryId, meta);
}
