/**
 * Delivery reconciliation: payslip + LStB + VB + invoice in one trust view.
 */
import { listAllDeliveries } from "./delivery-queue.mjs";
import { normalizeCompanyId } from "./tenant.mjs";
import { buildDeliveryTrust } from "./portal-trust.mjs";
import { deriveDeliverySyncStatus } from "./gobd/sync-lifecycle.mjs";

const TYPE_LABELS = {
  payslip: "Lohnabrechnung",
  lstb: "LStB",
  verdienst: "Verdienstbescheinigung",
  invoice: "Rechnung",
};

function trustFromDelivery(d) {
  if (d?.ackedAt || d?.ackAt) return { trust: "acked", trustRank: 4 };
  if (d?.webhookAccepted) return { trust: "acked", trustRank: 4 };
  if (d?.webhookPushedAt || d?.webhookReached) return { trust: "pushed", trustRank: 3 };
  if (d?.webhookLastError) return { trust: "push_failed", trustRank: 0 };
  if (d) return { trust: "queued", trustRank: 2 };
  return { trust: "unknown", trustRank: 0 };
}

export function buildDeliveryReconciliation(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || "").trim();
  const payrollTrust = buildDeliveryTrust(cid, { period });

  const all = listAllDeliveries({ companyId: cid });
  const certAndInvoice = all.filter((d) => {
    const t = String(d.type || "").toLowerCase();
    if (!["lstb", "verdienst", "invoice"].includes(t)) return false;
    if (!period) return true;
    const dp = String(d.period || d.year || d.document?.period || "").slice(0, 7);
    const dy = String(d.period || d.year || d.document?.year || "").slice(0, 4);
    return dp === period || dy === period.slice(0, 4) || !dp;
  }).map((d) => {
    const t = trustFromDelivery(d);
    return {
      deliveryId: d.deliveryId,
      type: d.type,
      typeLabel: TYPE_LABELS[d.type] || d.type,
      employee: d.employee || null,
      period: d.period || d.year || null,
      title: d.title || null,
      trust: t.trust,
      trustRank: t.trustRank,
      syncStatus: deriveDeliverySyncStatus(d),
      webhookPushedAt: d.webhookPushedAt || null,
      ackedAt: d.ackedAt || d.ackAt || null,
      needsHuman: t.trust !== "acked",
    };
  });

  const counts = certAndInvoice.reduce((acc, it) => {
    acc[it.trust] = (acc[it.trust] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, acked: 0, pushed: 0, queued: 0, push_failed: 0, unknown: 0 });

  return {
    ok: true,
    kind: "portal.delivery_reconciliation.v1",
    companyId: cid,
    period: period || null,
    payroll: payrollTrust.ok ? payrollTrust : null,
    documents: certAndInvoice,
    documentCounts: counts,
    nextActions: buildNextActions(payrollTrust, certAndInvoice),
  };
}

function buildNextActions(payrollTrust, docs) {
  const actions = [];
  if (payrollTrust?.nextActions?.length) actions.push(...payrollTrust.nextActions.slice(0, 3));
  const pending = docs.filter((d) => d.needsHuman);
  if (pending.length) {
    actions.push(`${pending.length} Dokument(e) warten auf Plattform-Bestätigung (Ack oder Pull).`);
  }
  if (!actions.length) {
    actions.push("Zustellungen wirken vollständig — Stichprobe in der Mitarbeiter-App.");
  }
  return [...new Set(actions)].slice(0, 6);
}
