/**
 * Deliver LStB / Verdienstbescheinigung to the employee app — same channel as payslips:
 * enqueue → platform webhook (document.released) → require received + opened + seen.
 * Not ELSTER / Finanzamt.
 */
import { loadCompany } from "../db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "../tenant.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "../notify.mjs";
import { enqueueDelivery, getDelivery, markDeliveryWebhook, ackDelivery } from "../delivery-queue.mjs";
import { normalizeReceipt, receiptLabels } from "../receipt.mjs";
import {
  buildEmployeeLstbCertificate,
  buildEmployeeVerdienstCertificate,
  listCertificateSummary,
} from "./employee-certificates.mjs";

function companyRef(companyId) {
  const cid = normalizeCompanyId(companyId);
  const company = loadCompany(cid) || {};
  return { id: cid, name: company.name || "" };
}

function isDeliveryConfirmed(d) {
  if (!d) return false;
  const r = normalizeReceipt(d.receipt);
  if (r.complete) return true;
  // Legacy rows acked before receipt stages existed
  if ((d.ackedAt || d.queueStatus === "delivered") && !d.receipt) return true;
  return false;
}

function deliveryTrust(d) {
  if (isDeliveryConfirmed(d)) return "acked";
  const r = normalizeReceipt(d?.receipt);
  if (r.opened) return "opened";
  if (r.received || d?.webhookAccepted) return "received";
  if (d?.webhookLastError) return "push_failed";
  if (d?.webhookPushedAt || d?.webhookReached) return "pushed";
  if (d) return "queued";
  return "unknown";
}

async function waitForPlatformAck(deliveryId, timeoutMs) {
  const ms = Math.max(0, Number(timeoutMs) || 0);
  if (!ms || !deliveryId) return getDelivery(deliveryId);
  const step = 250;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const d = getDelivery(deliveryId);
    if (isDeliveryConfirmed(d)) return d;
    await new Promise((r) => setTimeout(r, step));
  }
  return getDelivery(deliveryId);
}

/**
 * Push certificate exactly like a payslip release:
 * buildEmployeeDelivery → enqueue → notifyPlatform → mark → ack when accepted.
 */
async function pushCertificateDelivery({ type, event, certificate, company, options = {} }) {
  const requireConfirm = options.requireConfirm !== false;
  const delivery = buildEmployeeDelivery(type, { certificate, company });
  if (!delivery) {
    return { ok: false, status: 422, confirmed: false, error: "Delivery konnte nicht gebaut werden" };
  }

  const prev = getDelivery(delivery.deliveryId);
  const prevConfirmed = isDeliveryConfirmed(prev);

  if (options.forceRedeliver || (prev?.webhookPushedAt && !prevConfirmed)) {
    delivery.webhookPushedAt = null;
    delivery.webhookReached = false;
    delivery.webhookAccepted = false;
    delivery.webhookPushCount = 0;
  } else if (prev?.webhookPushedAt) {
    delivery.webhookPushedAt = prev.webhookPushedAt;
    delivery.webhookReached = prev.webhookReached;
    delivery.webhookPushCount = prev.webhookPushCount;
    delivery.webhookAccepted = prev.webhookAccepted;
    if (prev.ackedAt) delivery.ackedAt = prev.ackedAt;
  }

  delivery.queueStatus = prevConfirmed && !options.forceRedeliver ? (prev.queueStatus || "delivered") : "pending";
  delivery.enqueuedAt = delivery.enqueuedAt || prev?.enqueuedAt || new Date().toISOString();
  enqueueDelivery(delivery);

  if (prevConfirmed && !options.forceRedeliver) {
    const current = getDelivery(delivery.deliveryId) || delivery;
    return {
      ok: true,
      alreadyDelivered: true,
      skippedNotify: true,
      confirmed: true,
      deliveredViaWebhook: true,
      webhookReached: true,
      pendingPull: false,
      trust: "acked",
      sameAsPayslip: true,
      certificate,
      delivery: current,
      platformDelivery: {
        deliveryId: current.deliveryId,
        type: current.type,
        event,
        trust: "acked",
        confirmed: true,
      },
      message: "Bereits von der Plattform bestätigt – wie die Lohnabrechnung zugestellt.",
    };
  }

  const platformNotify = await notifyPlatform({
    event,
    delivery,
    company,
    idempotencyKey: delivery.deliveryId,
    strictAck: true,
    meta: {
      reason: options.reason || (options.printed ? "print" : "send"),
      printed: Boolean(options.printed),
      forceRedeliver: Boolean(options.forceRedeliver),
      requireAck: true,
      channel: "employee_app",
      parity: "payslip",
      legal: type === "lstb" ? "§ 41b EStG" : "Verdienstbescheinigung",
    },
  });

  const localOnly = platformNotify?.mode === "local-log-only";
  const webhookReached = Boolean(platformNotify?.ok && (platformNotify.mode === "webhook" || localOnly));
  const transportAccepted = Boolean(
    platformNotify?.ok && platformNotify.mode === "webhook" && platformNotify.accepted === true
  );

  try {
    markDeliveryWebhook(delivery.deliveryId, {
      at: new Date().toISOString(),
      status: platformNotify?.status ?? null,
      error: platformNotify?.ok ? null : (platformNotify?.error || null),
      accepted: transportAccepted,
      reached: webhookReached,
      idempotencyKey: platformNotify?.idempotencyKey || delivery.deliveryId,
      body: platformNotify?.body || null,
    });
  } catch { /* ignore */ }

  // Full confirm only when platform proves received + opened + seen (webhook body or later /open+/ack).
  let deliveredConfirmed = false;
  try {
    const afterPush = getDelivery(delivery.deliveryId);
    const receipt = normalizeReceipt(afterPush?.receipt);
    if (receipt.complete) {
      const acked = ackDelivery(delivery.deliveryId, {
        stage: "seen",
        via: "webhook-full-receipt",
        at: new Date().toISOString(),
        status: platformNotify?.status,
        body: platformNotify?.body || null,
      });
      deliveredConfirmed = Boolean(acked?.confirmed || isDeliveryConfirmed(acked?.delivery || getDelivery(delivery.deliveryId)));
    } else if (transportAccepted) {
      // Empfangen – still waiting for Öffnen + Gesehen via POST .../open and .../ack
      const waitMs = Number(
        options.ackWaitMs != null
          ? options.ackWaitMs
          : (process.env.WORKPASS_CERT_ACK_WAIT_MS || 2500)
      );
      const afterWait = await waitForPlatformAck(delivery.deliveryId, waitMs);
      deliveredConfirmed = isDeliveryConfirmed(afterWait);
    }
  } catch { /* keep pending */ }

  const current = getDelivery(delivery.deliveryId) || delivery;
  const trust = deliveryTrust(current);
  const receipt = normalizeReceipt(current.receipt);
  const receiptView = receiptLabels(receipt);
  const confirmed = deliveredConfirmed || isDeliveryConfirmed(current);

  // Local (no webhook URL): queued for pull — cannot prove platform receipt.
  if (localOnly) {
    return {
      ok: true,
      confirmed: false,
      deliveredViaWebhook: false,
      webhookReached: true,
      pendingPull: true,
      trust: "queued",
      sameAsPayslip: true,
      certificate,
      delivery: current,
      platformNotify,
      platformDelivery: {
        deliveryId: current.deliveryId,
        type: current.type,
        event,
        trust: "queued",
        confirmed: false,
        mode: "local-log-only",
      },
      message: "Lokal bereitgestellt (wie Lohnabrechnung ohne Webhook). Plattform muss /v1/delivery/pending pollen und ack'en.",
    };
  }

  if (!confirmed && requireConfirm) {
    const partialHint = receipt.received
      ? (receipt.opened
        ? "Empfangen und geöffnet – warte noch auf „gesehen“ (POST /v1/delivery/:id/ack)."
        : "Empfangen – warte auf Öffnen und Gesehen (POST /v1/delivery/:id/open dann /ack).")
      : "Noch nicht empfangen – Plattform muss accepted melden oder pending pollen.";
    return {
      ok: false,
      status: 422,
      confirmed: false,
      deliveredViaWebhook: false,
      webhookReached,
      pendingPull: webhookReached,
      trust,
      receipt,
      receiptView,
      sameAsPayslip: true,
      certificate,
      delivery: current,
      platformNotify,
      platformDelivery: {
        deliveryId: current.deliveryId,
        type: current.type,
        event,
        trust,
        confirmed: false,
        receipt,
        receiptView,
      },
      error: webhookReached
        ? `Plattform-Bestätigung unvollständig (${receiptView.label}). ${partialHint}`
        : (platformNotify?.error || "Webhook zur Plattform fehlgeschlagen."),
      message: webhookReached
        ? `Nicht vollständig bestätigt: ${receiptView.label}. ${partialHint}`
        : `Nicht zugestellt: ${platformNotify?.error || platformNotify?.status || "Webhook fehlgeschlagen"}.`,
    };
  }

  return {
    ok: true,
    confirmed: true,
    deliveredViaWebhook: true,
    webhookReached: true,
    pendingPull: false,
    trust: "acked",
    receipt,
    receiptView,
    sameAsPayslip: true,
    certificate,
    delivery: current,
    platformNotify,
    platformDelivery: {
      deliveryId: current.deliveryId,
      type: current.type,
      event,
      trust: "acked",
      confirmed: true,
      receipt,
      receiptView,
    },
    message: type === "lstb"
      ? "LStB: Plattform hat empfangen · geöffnet · gesehen."
      : "Verdienstbescheinigung: Plattform hat empfangen · geöffnet · gesehen.",
  };
}

export async function deliverEmployeeLstb(companyId, employeeId, year, options = {}) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  if (!cid || !eid) return { ok: false, status: 422, confirmed: false, error: "companyId und employeeId fehlen" };
  const certificate = buildEmployeeLstbCertificate(cid, eid, year);
  if (!certificate.ok) return { ...certificate, confirmed: false };
  const company = companyRef(cid);
  return pushCertificateDelivery({
    type: "lstb",
    event: "lstb.released",
    certificate,
    company,
    options,
  });
}

export async function deliverEmployeeVerdienst(companyId, employeeId, year, period, options = {}) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  if (!cid || !eid) return { ok: false, status: 422, confirmed: false, error: "companyId und employeeId fehlen" };
  const certificate = buildEmployeeVerdienstCertificate(cid, eid, year, period);
  if (!certificate.ok) return { ...certificate, confirmed: false };
  const company = companyRef(cid);
  return pushCertificateDelivery({
    type: "verdienst",
    event: "verdienst.released",
    certificate,
    company,
    options,
  });
}

export async function deliverYearLstb(companyId, year, options = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, status: 422, confirmed: false, error: "companyId fehlt" };
  const summary = listCertificateSummary(cid, year);
  if (!summary.ok) return { ...summary, confirmed: false };
  const employees = summary.employees || [];
  if (!employees.length) {
    return { ok: false, status: 422, confirmed: false, error: `Keine freigegebenen Monate für ${year}` };
  }
  const results = [];
  for (const row of employees) {
    const one = await deliverEmployeeLstb(cid, row.employeeId, year, options);
    results.push({
      employeeId: row.employeeId,
      name: row.name,
      ok: Boolean(one.ok),
      confirmed: Boolean(one.confirmed),
      error: one.ok ? null : (one.error || one.message || null),
      deliveryId: one.delivery?.deliveryId || null,
      trust: one.trust || one.platformDelivery?.trust || null,
      alreadyDelivered: Boolean(one.alreadyDelivered),
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  const confirmedCount = results.filter((r) => r.confirmed).length;
  const allConfirmed = confirmedCount === results.length;
  return {
    ok: allConfirmed || (okCount > 0 && results.every((r) => r.ok && (r.confirmed || r.trust === "queued"))),
    confirmed: allConfirmed,
    kind: "portal.certificate.lstb.year.delivery.v1",
    companyId: cid,
    year: Number(year) || new Date().getFullYear(),
    count: results.length,
    okCount,
    confirmedCount,
    pendingCount: results.length - confirmedCount,
    results,
    sameAsPayslip: true,
    message: allConfirmed
      ? `${confirmedCount} Lohnsteuerbescheinigungen von der Plattform bestätigt (wie Lohnabrechnung).`
      : `${confirmedCount} von ${results.length} LStB bestätigt – ${results.length - confirmedCount} warten noch auf Plattform-Ack.`,
  };
}

/** Read-only check: has the platform confirmed this certificate delivery? */
export function verifyCertificateDelivery(deliveryId) {
  const d = getDelivery(String(deliveryId || "").trim());
  if (!d) {
    return { ok: false, confirmed: false, error: "Delivery nicht gefunden", trust: "unknown", receipt: null };
  }
  const confirmed = isDeliveryConfirmed(d);
  const receipt = normalizeReceipt(d.receipt);
  const receiptView = receiptLabels(receipt);
  return {
    ok: true,
    confirmed,
    trust: deliveryTrust(d),
    receipt,
    receiptView,
    delivery: d,
    deliveryId: d.deliveryId,
    type: d.type,
    pendingPull: !confirmed,
    message: confirmed
      ? "Plattform: empfangen · geöffnet · gesehen."
      : `Bestätigung unvollständig: ${receiptView.label}`,
  };
}
