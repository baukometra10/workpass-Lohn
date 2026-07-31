/**
 * Notify WorkPass Platform when accounting releases a document or needs action.
 *
 * Env:
 *   WORKPASS_PLATFORM_WEBHOOK_URL  e.g. https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
 *   WORKPASS_PLATFORM_WEBHOOK_KEY  optional shared secret (X-WorkPass-Webhook-Key)
 *   WORKPASS_WEBHOOK_RETRIES       default 3
 *   WORKPASS_WEBHOOK_TIMEOUT_MS    default 8000
 */
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "data", "delivery-log");

let lastWebhookStatus = {
  ok: null,
  at: null,
  event: null,
  status: null,
  error: null,
  mode: null,
};

function ensureLog() {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
}

function logDelivery(entry) {
  ensureLog();
  const line = `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`;
  appendFileSync(path.join(logDir, "deliveries.jsonl"), line, "utf8");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
        payrollTax: p.totals?.payrollTax ?? null,
        svTotal: p.totals?.svTotal ?? null,
        currency: "EUR",
      },
      document: p,
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

function resolveCompany(event) {
  return (
    event.company
    || event.delivery?.company
    || event.message?.company
    || event.monthClose?.company
    || null
  );
}

function resolveIdempotencyKey(event) {
  if (event.idempotencyKey) return String(event.idempotencyKey);
  if (event.delivery?.deliveryId) return String(event.delivery.deliveryId);
  if (event.message?.messageId) return `msg:${event.message.messageId}`;
  if (event.monthClose?.companyId && event.monthClose?.period) {
    return `month:${event.monthClose.companyId}:${event.monthClose.period}:${event.event}`;
  }
  return `${event.event || "event"}:${Date.now()}`;
}

/**
 * Push event to platform webhook (retries + local queue fallback).
 * Always logs locally so the flow is auditable without platform.
 */
export async function notifyPlatform(event) {
  const webhook = process.env.WORKPASS_PLATFORM_WEBHOOK_URL || "";
  const webhookKey = process.env.WORKPASS_PLATFORM_WEBHOOK_KEY || process.env.WORKPASS_API_KEY || "workpass-dev-key";
  const retries = Math.max(1, Number(process.env.WORKPASS_WEBHOOK_RETRIES || 3));
  const timeoutMs = Number(process.env.WORKPASS_WEBHOOK_TIMEOUT_MS || 8000);
  const idempotencyKey = resolveIdempotencyKey(event);
  const company = resolveCompany(event);

  const envelope = {
    kind: "platform.accounting.event.v1",
    schemaVersion: 2,
    event: event.event,
    occurredAt: new Date().toISOString(),
    source: "workpass-accounting-bridge",
    idempotencyKey,
    company: company ? { id: company.id || "", name: company.name || "" } : null,
    delivery: event.delivery || null,
    message: event.message || null,
    monthClose: event.monthClose || null,
    meta: event.meta || null,
  };

  logDelivery({ direction: "out", webhook: webhook || null, envelope });

  if (!webhook) {
    const result = {
      ok: true,
      mode: "local-log-only",
      message: "Kein WORKPASS_PLATFORM_WEBHOOK_URL – Event lokal protokolliert. Plattform kann /v1/delivery/pending und /v1/messages/pending pollen.",
      delivery: event.delivery || null,
      idempotencyKey,
    };
    lastWebhookStatus = {
      ok: true,
      at: envelope.occurredAt,
      event: event.event,
      status: null,
      error: null,
      mode: "local-log-only",
    };
    return result;
  }

  let lastError = null;
  let lastStatus = null;
  let lastBody = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WorkPass-Webhook-Key": webhookKey,
          "X-WorkPass-Event": String(event.event || ""),
          "X-WorkPass-Idempotency-Key": idempotencyKey,
          "X-WorkPass-Attempt": String(attempt),
          ...(company?.id ? { "X-WorkPass-Company-Id": String(company.id) } : {}),
        },
        body: JSON.stringify(envelope),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
      lastStatus = res.status;
      lastBody = body;
      logDelivery({
        direction: "webhook-response",
        status: res.status,
        attempt,
        body,
        idempotencyKey,
      });
      if (res.ok) {
        lastWebhookStatus = {
          ok: true,
          at: new Date().toISOString(),
          event: event.event,
          status: res.status,
          error: null,
          mode: "webhook",
        };
        return {
          ok: true,
          mode: "webhook",
          status: res.status,
          attempt,
          body,
          delivery: event.delivery || null,
          idempotencyKey,
        };
      }
      lastError = body?.error || `HTTP ${res.status}`;
    } catch (e) {
      lastError = e.name === "AbortError" ? "Webhook-Timeout" : (e.message || String(e));
      logDelivery({
        direction: "webhook-error",
        attempt,
        error: lastError,
        idempotencyKey,
      });
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(250 * attempt);
  }

  lastWebhookStatus = {
    ok: false,
    at: new Date().toISOString(),
    event: event.event,
    status: lastStatus,
    error: lastError,
    mode: "webhook",
  };

  return {
    ok: false,
    mode: "webhook",
    status: lastStatus,
    error: lastError,
    body: lastBody,
    delivery: event.delivery || null,
    idempotencyKey,
    queuedForPull: Boolean(event.delivery?.deliveryId),
    hint: "Webhook fehlgeschlagen – Plattform: GET /v1/delivery/pending bzw. /v1/messages/pending.",
  };
}

export function getLastWebhookStatus() {
  return { ...lastWebhookStatus };
}
