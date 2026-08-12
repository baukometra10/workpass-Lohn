/**
 * Notify WorkPass Platform when accounting releases a document or needs action.
 *
 * Env:
 *   WORKPASS_PLATFORM_WEBHOOK_URL  e.g. https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
 *   WORKPASS_PLATFORM_WEBHOOK_KEY  shared secret (X-WorkPass-Webhook-Key) – must match platform
 *   WORKPASS_API_KEY               fallback only if WEBHOOK_KEY unset (often wrong → 401)
 *   WORKPASS_WEBHOOK_RETRIES       default 3
 *   WORKPASS_WEBHOOK_TIMEOUT_MS    default 8000
 *   WORKPASS_PLATFORM_WEBHOOK_AUTH header|bearer|both (default both)
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
  hint: null,
  keySource: null,
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

/** Resolve webhook shared secret + where it came from (never log the secret). */
export function resolveWebhookKey() {
  if (process.env.WORKPASS_PLATFORM_WEBHOOK_KEY) {
    return { key: String(process.env.WORKPASS_PLATFORM_WEBHOOK_KEY), source: "WORKPASS_PLATFORM_WEBHOOK_KEY" };
  }
  if (process.env.WORKPASS_API_KEY) {
    return { key: String(process.env.WORKPASS_API_KEY), source: "WORKPASS_API_KEY" };
  }
  return { key: "", source: "missing" };
}

export function webhookKeyConfigured() {
  return Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_KEY);
}

function buildWebhookHeaders({ event, idempotencyKey, attempt, companyId, webhookKey }) {
  const mode = String(process.env.WORKPASS_PLATFORM_WEBHOOK_AUTH || "both").toLowerCase();
  const headers = {
    "Content-Type": "application/json",
    "X-WorkPass-Event": String(event || ""),
    "X-WorkPass-Idempotency-Key": String(idempotencyKey || ""),
  };
  if (attempt != null) headers["X-WorkPass-Attempt"] = String(attempt);
  if (companyId) headers["X-WorkPass-Company-Id"] = String(companyId);
  if (webhookKey) {
    if (mode === "bearer") {
      headers.Authorization = `Bearer ${webhookKey}`;
    } else if (mode === "header") {
      headers["X-WorkPass-Webhook-Key"] = webhookKey;
    } else {
      headers["X-WorkPass-Webhook-Key"] = webhookKey;
      headers.Authorization = `Bearer ${webhookKey}`;
    }
  }
  return headers;
}

function hintForWebhookFailure(status, keySource) {
  if (status === 401 || status === 403) {
    if (keySource === "missing") {
      return "401/403: Kein Webhook-Key. Railway: WORKPASS_PLATFORM_WEBHOOK_KEY setzen (gleicher Wert wie auf der Plattform).";
    }
    if (keySource === "WORKPASS_API_KEY") {
      return "401/403: Es wurde WORKPASS_API_KEY als Webhook-Key genutzt. Setze WORKPASS_PLATFORM_WEBHOOK_KEY auf denselben Secret wie die Plattform (oft ein anderer Wert als der API-Key).";
    }
    return "401/403: Webhook-Key abgelehnt. Railway WORKPASS_PLATFORM_WEBHOOK_KEY und Plattform-Secret müssen exakt übereinstimmen.";
  }
  if (status === 404) {
    return "Webhook-URL auf der Plattform existiert nicht (404). Endpoint live schalten.";
  }
  return "Webhook fehlgeschlagen – Key/URL prüfen.";
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
  const { key: webhookKey, source: keySource } = resolveWebhookKey();
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
    preferInlineReply: true,
    company: company ? { id: company.id || "", name: company.name || "" } : null,
    delivery: event.delivery || null,
    message: event.message || null,
    monthClose: event.monthClose || null,
    meta: event.meta || null,
  };

  logDelivery({ direction: "out", webhook: webhook || null, envelope, keySource });

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
      hint: null,
      keySource,
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
        headers: buildWebhookHeaders({
          event: event.event,
          idempotencyKey,
          attempt,
          companyId: company?.id,
          webhookKey,
        }),
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
        keySource,
      });
      if (res.ok) {
        lastWebhookStatus = {
          ok: true,
          at: new Date().toISOString(),
          event: event.event,
          status: res.status,
          error: null,
          mode: "webhook",
          hint: null,
          keySource,
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
        keySource,
      });
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(250 * attempt);
  }

  const hint = hintForWebhookFailure(lastStatus, keySource);
  lastWebhookStatus = {
    ok: false,
    at: new Date().toISOString(),
    event: event.event,
    status: lastStatus,
    error: lastError,
    mode: "webhook",
    hint,
    keySource,
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
    hint,
    keySource,
  };
}

export function getLastWebhookStatus() {
  return { ...lastWebhookStatus };
}

/**
 * Lightweight connectivity check to the configured platform webhook URL.
 * Sends event "platform.ping" – platform should return 2xx (even if ignored).
 */
export async function probePlatformWebhook() {
  const webhook = process.env.WORKPASS_PLATFORM_WEBHOOK_URL || "";
  const { key: webhookKey, source: keySource } = resolveWebhookKey();
  if (!webhook) {
    const result = {
      ok: false,
      at: new Date().toISOString(),
      event: "platform.ping",
      status: null,
      error: "WORKPASS_PLATFORM_WEBHOOK_URL fehlt",
      mode: "unconfigured",
      hint: "Railway: WORKPASS_PLATFORM_WEBHOOK_URL setzen.",
      keySource,
    };
    lastWebhookStatus = result;
    return result;
  }

  const timeoutMs = Number(process.env.WORKPASS_WEBHOOK_TIMEOUT_MS || 8000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const envelope = {
    kind: "platform.accounting.event.v1",
    schemaVersion: 2,
    event: "platform.ping",
    occurredAt: new Date().toISOString(),
    source: "workpass-accounting-bridge",
    idempotencyKey: `ping:${Date.now()}`,
    company: null,
    meta: { probe: true },
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: buildWebhookHeaders({
        event: "platform.ping",
        idempotencyKey: envelope.idempotencyKey,
        webhookKey,
      }),
      body: JSON.stringify(envelope),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    const hint = res.ok ? null : hintForWebhookFailure(res.status, keySource);
    const result = {
      ok: res.ok,
      at: new Date().toISOString(),
      event: "platform.ping",
      status: res.status,
      error: res.ok ? null : (body?.error || `HTTP ${res.status}`),
      mode: "webhook",
      urlHost: (() => { try { return new URL(webhook).host; } catch { return null; } })(),
      hint,
      keySource,
      keyConfigured: webhookKeyConfigured(),
    };
    lastWebhookStatus = result;
    logDelivery({ direction: "webhook-probe", ...result, body });
    return result;
  } catch (e) {
    const result = {
      ok: false,
      at: new Date().toISOString(),
      event: "platform.ping",
      status: null,
      error: e.name === "AbortError" ? "Webhook-Timeout" : (e.message || String(e)),
      mode: "webhook",
      hint: "Plattform nicht erreichbar oder TLS/DNS-Fehler.",
      keySource,
      keyConfigured: webhookKeyConfigured(),
    };
    lastWebhookStatus = result;
    return result;
  } finally {
    clearTimeout(timer);
  }
}
