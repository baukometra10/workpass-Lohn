/**
 * Deliver LStB / Verdienstbescheinigung to the employee app (same queue as payslips).
 * Not ELSTER / Finanzamt — platform webhook + /v1/delivery/pending.
 */
import { loadCompany } from "../db/repository.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "../tenant.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "../notify.mjs";
import { enqueueDelivery, getDelivery, markDeliveryWebhook, ackDelivery } from "../delivery-queue.mjs";
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

async function pushCertificateDelivery({ type, event, certificate, company, options = {} }) {
  const delivery = buildEmployeeDelivery(type, { certificate, company });
  if (!delivery) {
    return { ok: false, status: 422, error: "Delivery konnte nicht gebaut werden" };
  }

  const prev = getDelivery(delivery.deliveryId);
  const prevAccepted = Boolean(prev?.webhookAccepted || prev?.queueStatus === "delivered");
  // Human send / force: always re-push. Auto path: skip only when platform confirmed.
  const mustPush = Boolean(options.forceRedeliver) || !prevAccepted;
  if (options.forceRedeliver || (prev?.webhookPushedAt && !prevAccepted)) {
    delivery.webhookPushedAt = null;
    delivery.webhookReached = false;
    delivery.webhookAccepted = false;
    delivery.webhookPushCount = 0;
  } else if (prev?.webhookPushedAt) {
    delivery.webhookPushedAt = prev.webhookPushedAt;
    delivery.webhookReached = prev.webhookReached;
    delivery.webhookPushCount = prev.webhookPushCount;
    delivery.webhookAccepted = prev.webhookAccepted;
  }

  delivery.queueStatus = "pending";
  delivery.enqueuedAt = delivery.enqueuedAt || prev?.enqueuedAt || new Date().toISOString();
  enqueueDelivery(delivery);

  if (delivery.webhookPushedAt && prevAccepted && !mustPush) {
    return {
      ok: true,
      alreadyDelivered: true,
      skippedNotify: true,
      delivery,
      deliveredViaWebhook: true,
      webhookReached: true,
      pendingPull: false,
      message: "Bereits bestätigt – der Mitarbeiter sollte das Dokument in der App sehen.",
    };
  }

  const platformNotify = await notifyPlatform({
    event,
    delivery,
    company,
    idempotencyKey: delivery.deliveryId,
    meta: {
      reason: options.reason || (options.printed ? "print" : "send"),
      printed: Boolean(options.printed),
      forceRedeliver: Boolean(options.forceRedeliver),
      legal: type === "lstb" ? "§ 41b EStG" : "Verdienstbescheinigung",
    },
  });

  const localOnly = platformNotify?.mode === "local-log-only";
  const webhookReached = Boolean(platformNotify?.ok && (platformNotify.mode === "webhook" || localOnly));
  const deliveredConfirmed = Boolean(platformNotify?.ok && platformNotify.mode === "webhook" && platformNotify.accepted === true);

  try {
    markDeliveryWebhook(delivery.deliveryId, {
      at: new Date().toISOString(),
      status: platformNotify?.status ?? null,
      error: platformNotify?.ok ? null : (platformNotify?.error || null),
      accepted: deliveredConfirmed,
      reached: webhookReached,
      idempotencyKey: platformNotify?.idempotencyKey || delivery.deliveryId,
    });
  } catch { /* ignore */ }

  if (deliveredConfirmed) {
    try {
      ackDelivery(delivery.deliveryId, {
        via: "webhook-accepted",
        at: new Date().toISOString(),
        status: platformNotify.status,
        body: platformNotify.body || null,
      });
    } catch { /* keep pending for pull */ }
  }

  return {
    ok: true,
    certificate,
    delivery,
    platformNotify,
    deliveredViaWebhook: deliveredConfirmed,
    webhookReached,
    pendingPull: !deliveredConfirmed,
    message: deliveredConfirmed
      ? "An die Plattform gesendet – der Mitarbeiter sieht das Dokument in der App."
      : localOnly
        ? "Lokal bereitgestellt. Ohne Webhook holt die Plattform /v1/delivery/pending."
        : webhookReached
          ? "Webhook erreicht, aber Plattform hat noch nicht bestätigt (accepted). Dokument liegt in /v1/delivery/pending – Mitarbeiter-App zeigt es erst nach Speicherung auf der Plattform."
          : "Zustellung fehlgeschlagen oder Webhook nicht erreichbar. Bitte erneut senden oder Zustellungen · Vertrauen prüfen.",
  };
}

export async function deliverEmployeeLstb(companyId, employeeId, year, options = {}) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  if (!cid || !eid) return { ok: false, status: 422, error: "companyId und employeeId fehlen" };
  const certificate = buildEmployeeLstbCertificate(cid, eid, year);
  if (!certificate.ok) return certificate;
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
  if (!cid || !eid) return { ok: false, status: 422, error: "companyId und employeeId fehlen" };
  const certificate = buildEmployeeVerdienstCertificate(cid, eid, year, period);
  if (!certificate.ok) return certificate;
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
  if (!cid) return { ok: false, status: 422, error: "companyId fehlt" };
  const summary = listCertificateSummary(cid, year);
  if (!summary.ok) return summary;
  const employees = summary.employees || [];
  if (!employees.length) {
    return { ok: false, status: 422, error: `Keine freigegebenen Monate für ${year}` };
  }
  const results = [];
  for (const row of employees) {
    const one = await deliverEmployeeLstb(cid, row.employeeId, year, options);
    results.push({
      employeeId: row.employeeId,
      name: row.name,
      ok: Boolean(one.ok),
      error: one.ok ? null : (one.error || null),
      deliveryId: one.delivery?.deliveryId || null,
      alreadyDelivered: Boolean(one.alreadyDelivered),
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  return {
    ok: okCount > 0,
    kind: "portal.certificate.lstb.year.delivery.v1",
    companyId: cid,
    year: Number(year) || new Date().getFullYear(),
    count: results.length,
    okCount,
    results,
    message: okCount === results.length
      ? `${okCount} Lohnsteuerbescheinigungen an die Plattform übergeben.`
      : `${okCount} von ${results.length} LStB übergeben.`,
  };
}
