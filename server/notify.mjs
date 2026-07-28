/**
 * Notify WorkPass Platform when accounting releases a document.
 * Platform then delivers payslip/invoice to the employee app.
 *
 * Env:
 *   WORKPASS_PLATFORM_WEBHOOK_URL  e.g. https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
 *   WORKPASS_PLATFORM_WEBHOOK_KEY  optional shared secret (X-WorkPass-Webhook-Key)
 */
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "data", "delivery-log");

function ensureLog() {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
}

function logDelivery(entry) {
  ensureLog();
  const line = `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`;
  appendFileSync(path.join(logDir, "deliveries.jsonl"), line, "utf8");
}

/**
 * Build the package the platform needs to show in the employee app.
 */
export function buildEmployeeDelivery(type, job) {
  if (type === "payroll") {
    const p = job.payslip || {};
    return {
      kind: "platform.employee.delivery.v1",
      type: "payslip",
      deliveryId: `pay:${job.jobId}`,
      jobId: job.jobId,
      status: "ready_for_employee",
      releasedAt: job.releasedAt || new Date().toISOString(),
      employee: {
        id: p.employee?.id || job.employee?.id || "",
        name: p.employee?.name || job.employee?.name || "",
      },
      company: {
        id: p.company?.id || job.company?.id || "",
        name: p.company?.name || job.company?.name || "",
      },
      period: p.period || job.period || "",
      summary: {
        gross: p.totals?.gross ?? null,
        net: p.totals?.net ?? null,
        currency: "EUR",
      },
      document: p,
      // Platform uses this to open in-app payslip screen
      appRoute: `/employee/payslips/${encodeURIComponent(job.jobId)}`,
      title: `Entgeltabrechnung ${p.period || ""}`.trim(),
    };
  }

  if (type === "invoice") {
    const d = job.draft || {};
    const companyId = job.company?.id || d.company?.id || "";
    return {
      kind: "platform.employee.delivery.v1",
      type: "invoice",
      deliveryId: `inv:${job.id}`,
      invoiceId: job.id,
      status: "ready_for_employee",
      releasedAt: job.releasedAt || new Date().toISOString(),
      company: {
        id: companyId,
        name: job.company?.name || d.company?.name || "",
      },
      customer: d.customer || "",
      number: d.number || job.id,
      summary: {
        gross: d.totals?.gross ?? null,
        net: d.totals?.net ?? null,
        tax: d.totals?.tax ?? null,
        currency: "EUR",
      },
      document: d,
      appRoute: `/invoices/${encodeURIComponent(job.id)}`,
      title: `Rechnung ${d.number || job.id}`,
    };
  }

  return null;
}

/**
 * Push release event to platform webhook (if configured).
 * Always logs locally so the flow is auditable without platform.
 */
export async function notifyPlatform(event) {
  const webhook = process.env.WORKPASS_PLATFORM_WEBHOOK_URL || "";
  const webhookKey = process.env.WORKPASS_PLATFORM_WEBHOOK_KEY || process.env.WORKPASS_API_KEY || "workpass-dev-key";

  const envelope = {
    kind: "platform.accounting.event.v1",
    event: event.event, // payslip.released | invoice.released
    occurredAt: new Date().toISOString(),
    delivery: event.delivery,
    source: "workpass-accounting-bridge",
  };

  logDelivery({ direction: "out", webhook: webhook || null, envelope });

  if (!webhook) {
    return {
      ok: true,
      mode: "local-log-only",
      message: "Kein WORKPASS_PLATFORM_WEBHOOK_URL – Event lokal protokolliert. Plattform kann /v1/delivery/pending pollen.",
      delivery: event.delivery,
    };
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WorkPass-Webhook-Key": webhookKey,
        "X-WorkPass-Event": event.event,
      },
      body: JSON.stringify(envelope),
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    logDelivery({ direction: "webhook-response", status: res.status, body });
    return {
      ok: res.ok,
      mode: "webhook",
      status: res.status,
      body,
      delivery: event.delivery,
    };
  } catch (e) {
    logDelivery({ direction: "webhook-error", error: e.message });
    return {
      ok: false,
      mode: "webhook",
      error: e.message,
      delivery: event.delivery,
    };
  }
}
