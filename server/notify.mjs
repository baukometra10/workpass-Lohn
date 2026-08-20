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
import { ensureCompleteDeliveryDocument, assessDocumentCompleteness } from "./document-complete.mjs";

export { assessDocumentCompleteness, ensureCompleteDeliveryDocument } from "./document-complete.mjs";
export { documentChecksum } from "./document-complete.mjs";

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

function buildWebhookHeaders({ event, idempotencyKey, attempt, companyId, webhookKey, documentType }) {
  const mode = String(process.env.WORKPASS_PLATFORM_WEBHOOK_AUTH || "both").toLowerCase();
  const headers = {
    "Content-Type": "application/json",
    "X-WorkPass-Event": String(event || ""),
    "X-WorkPass-Idempotency-Key": String(idempotencyKey || ""),
  };
  if (documentType) headers["X-WorkPass-Document-Type"] = String(documentType);
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

/**
 * Platform expects document.released + documentType (payslip|lstb|verdienst|invoice).
 * Legacy event names (payslip.released, …) are normalized here and kept as meta.legacyEvent.
 */
export function resolveDocumentRelease(event = {}) {
  const rawEvent = String(event.event || "").trim();
  const rawType = String(
    event.documentType
    || event.delivery?.documentType
    || event.delivery?.type
    || ""
  ).trim().toLowerCase();

  let documentType = rawType;
  let legacyEvent = rawEvent;

  if (rawEvent === "payslip.released" || rawEvent === "payroll.released") {
    documentType = documentType || "payslip";
    legacyEvent = "payslip.released";
  } else if (rawEvent === "lstb.released") {
    documentType = "lstb";
    legacyEvent = "lstb.released";
  } else if (rawEvent === "verdienst.released") {
    documentType = "verdienst";
    legacyEvent = "verdienst.released";
  } else if (rawEvent === "invoice.released") {
    documentType = "invoice";
    legacyEvent = "invoice.released";
  } else if (rawEvent === "document.released") {
    documentType = documentType || "payslip";
    legacyEvent = event.meta?.legacyEvent || legacyEventForDocumentType(documentType);
  }

  if (documentType === "payroll") documentType = "payslip";
  if (documentType === "vb") documentType = "verdienst";

  const isDocumentRelease = ["payslip", "lstb", "verdienst", "invoice"].includes(documentType);
  return {
    isDocumentRelease,
    documentType: isDocumentRelease ? documentType : (documentType || null),
    legacyEvent: isDocumentRelease ? (legacyEvent || legacyEventForDocumentType(documentType)) : rawEvent,
    eventName: isDocumentRelease ? "document.released" : rawEvent,
  };
}

export function legacyEventForDocumentType(documentType) {
  const t = String(documentType || "").toLowerCase();
  if (t === "lstb") return "lstb.released";
  if (t === "verdienst" || t === "vb") return "verdienst.released";
  if (t === "invoice") return "invoice.released";
  return "payslip.released";
}

/**
 * Canonical German document title for the employee app / platform inbox.
 * Platform must show this title (not raw documentType / event codes).
 */
export function documentTitleForType(documentType) {
  const t = String(documentType || "").toLowerCase();
  if (t === "lstb") return "Lohnsteuerbescheinigung";
  if (t === "verdienst" || t === "vb" || t === "vordienst") return "Verdienstbescheinigung";
  if (t === "invoice") return "Rechnung";
  if (t === "payslip" || t === "payroll") return "Entgeltabrechnung";
  return "Dokument";
}

/** Human inbox title: "Verdienstbescheinigung 2026-08" / "Lohnsteuerbescheinigung 2026". */
export function buildDocumentDisplayTitle(documentType, periodOrRef = "") {
  const base = documentTitleForType(documentType);
  const ref = String(periodOrRef || "").trim();
  return ref ? `${base} ${ref}` : base;
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
 * Always includes the full document body (no summary-only payload).
 */
export function buildEmployeeDelivery(type, job) {
  let built = null;
  if (type === "payroll" || type === "payslip") {
    const p = job.payslip || {};
    built = {
      kind: "platform.employee.delivery.v1",
      type: "payslip",
      documentType: "payslip",
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
      documentTitle: documentTitleForType("payslip"),
      title: buildDocumentDisplayTitle("payslip", p.period || job.period || ""),
    };
  } else if (type === "lstb") {
    const cert = job.certificate || job;
    const companyId = cert.companyId || job.company?.id || "";
    const employeeId = cert.employeeId || "";
    const year = cert.year || "";
    built = {
      kind: "platform.employee.delivery.v1",
      type: "lstb",
      documentType: "lstb",
      deliveryId: `lstb:${companyId}:${employeeId}:${year}`,
      status: "ready_for_employee",
      releasedAt: new Date().toISOString(),
      employee: {
        id: employeeId,
        badgeId: employeeId,
        name: cert.employeeName || "",
      },
      company: {
        id: companyId,
        name: job.company?.name || "",
      },
      period: String(year),
      year,
      legal: "§ 41b EStG",
      summary: {
        gross: cert.totals?.gross ?? null,
        net: cert.totals?.net ?? null,
        payrollTax: cert.totals?.payrollTax ?? null,
        solidarity: cert.totals?.solidarity ?? null,
        churchTax: cert.totals?.churchTax ?? null,
        currency: "EUR",
      },
      document: cert,
      appRoute: `/employee/certificates/lstb/${encodeURIComponent(String(year))}/${encodeURIComponent(employeeId)}`,
      documentTitle: documentTitleForType("lstb"),
      title: buildDocumentDisplayTitle("lstb", year),
    };
  } else if (type === "verdienst") {
    const cert = job.certificate || job;
    const companyId = cert.companyId || job.company?.id || "";
    const employeeId = cert.employeeId || "";
    const period = cert.period || "";
    const year = cert.year || "";
    built = {
      kind: "platform.employee.delivery.v1",
      type: "verdienst",
      documentType: "verdienst",
      deliveryId: `vb:${companyId}:${employeeId}:${period || year}`,
      status: "ready_for_employee",
      releasedAt: new Date().toISOString(),
      employee: {
        id: employeeId,
        badgeId: employeeId,
        name: cert.employeeName || "",
      },
      company: {
        id: companyId,
        name: job.company?.name || "",
      },
      period,
      year,
      summary: {
        gross: cert.monthly?.gross ?? cert.ytd?.gross ?? null,
        net: cert.monthly?.net ?? cert.ytd?.net ?? null,
        ytdGross: cert.ytd?.gross ?? null,
        ytdNet: cert.ytd?.net ?? null,
        currency: "EUR",
      },
      document: cert,
      appRoute: `/employee/certificates/verdienst/${encodeURIComponent(period || String(year))}/${encodeURIComponent(employeeId)}`,
      documentTitle: documentTitleForType("verdienst"),
      title: buildDocumentDisplayTitle("verdienst", period || year),
    };
  } else if (type === "invoice") {
    const d = job.draft || {};
    const companyId = job.company?.id || d.company?.id || "";
    built = {
      kind: "platform.employee.delivery.v1",
      type: "invoice",
      documentType: "invoice",
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
      documentTitle: documentTitleForType("invoice"),
      title: buildDocumentDisplayTitle("invoice", d.number || job.id),
    };
  }

  if (!built) return null;
  const { delivery, assessment } = ensureCompleteDeliveryDocument(built);
  if (!assessment.complete) {
    delivery.contentComplete = false;
    delivery.documentGaps = assessment.gaps;
  }
  return delivery;
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
  const release = resolveDocumentRelease(event);

  let delivery = event.delivery || null;
  let contentAssessment = null;
  if (delivery && release.isDocumentRelease) {
    const documentTitle = delivery.documentTitle || documentTitleForType(release.documentType);
    const title = delivery.title
      || buildDocumentDisplayTitle(
        release.documentType,
        delivery.period || delivery.year || delivery.number || delivery.invoiceId || ""
      );
    // Prefer already-sealed delivery as-is (titles frozen at build). Never rebuild after seal.
    const ensured = delivery.immutable && delivery.seal?.seal
      ? ensureCompleteDeliveryDocument(delivery)
      : ensureCompleteDeliveryDocument({
        ...delivery,
        type: release.documentType || delivery.type,
        documentType: release.documentType,
        documentTitle,
        title,
      });
    delivery = ensured.delivery;
    contentAssessment = ensured.assessment;
    if (ensured.assessment?.tampered) {
      const result = {
        ok: false,
        mode: "document-tampered",
        error: ensured.assessment.label,
        gaps: ensured.assessment.gaps,
        delivery,
        idempotencyKey,
        event: release.eventName,
        documentType: release.documentType,
        accepted: false,
      };
      lastWebhookStatus = {
        ok: false,
        at: new Date().toISOString(),
        event: release.eventName,
        documentType: release.documentType,
        status: null,
        error: result.error,
        mode: "document-tampered",
        hint: "Dokument/PDF Siegel gebrochen – Versand blockiert. Original unverändert lassen.",
        keySource,
        accepted: false,
      };
      return result;
    }
    if (!ensured.assessment.complete && event.requireCompleteDocument !== false) {
      const result = {
        ok: false,
        mode: "incomplete-document",
        error: ensured.assessment.label,
        gaps: ensured.assessment.gaps,
        delivery,
        idempotencyKey,
        event: release.eventName,
        documentType: release.documentType,
        accepted: false,
      };
      lastWebhookStatus = {
        ok: false,
        at: new Date().toISOString(),
        event: release.eventName,
        documentType: release.documentType,
        status: null,
        error: result.error,
        mode: "incomplete-document",
        hint: "Dokument unvollständig – Webhook nicht gesendet. Fehlende Felder prüfen.",
        keySource,
        accepted: false,
      };
      return result;
    }
  }

  const documentTitle = release.isDocumentRelease
    ? (delivery?.documentTitle || documentTitleForType(release.documentType))
    : null;
  const title = release.isDocumentRelease
    ? (delivery?.title || event.title || documentTitle)
    : (event.title || event.message?.title || null);

  const envelope = {
    kind: "platform.accounting.event.v1",
    schemaVersion: 2,
    event: release.eventName,
    documentType: release.isDocumentRelease ? release.documentType : (event.documentType || null),
    documentTitle,
    title,
    occurredAt: new Date().toISOString(),
    source: "workpass-accounting-bridge",
    idempotencyKey,
    preferInlineReply: true,
    company: company ? { id: company.id || "", name: company.name || "" } : null,
    delivery,
    message: event.message || null,
    monthClose: event.monthClose || null,
    meta: {
      ...(event.meta || {}),
      ...(release.isDocumentRelease
        ? {
          legacyEvent: release.legacyEvent,
          documentType: release.documentType,
          documentTitle,
          title,
          contentComplete: Boolean(contentAssessment?.complete ?? delivery?.contentComplete),
          documentChecksum: delivery?.documentChecksum || delivery?.contentHash || null,
          documentBytes: delivery?.documentBytes || null,
          immutable: Boolean(delivery?.immutable),
          seal: delivery?.seal?.seal || null,
          pdfHash: delivery?.pdfHash || delivery?.seal?.pdfHash || null,
        }
        : {}),
    },
  };

  logDelivery({ direction: "out", webhook: webhook || null, envelope, keySource });

  if (!webhook) {
    const result = {
      ok: true,
      mode: "local-log-only",
      message: "Kein WORKPASS_PLATFORM_WEBHOOK_URL – Event lokal protokolliert. Plattform kann /v1/delivery/pending und /v1/messages/pending pollen.",
      delivery,
      idempotencyKey,
      event: envelope.event,
      documentType: envelope.documentType,
    };
    lastWebhookStatus = {
      ok: true,
      at: envelope.occurredAt,
      event: envelope.event,
      documentType: envelope.documentType,
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
          event: envelope.event,
          documentType: envelope.documentType,
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
        event: envelope.event,
        documentType: envelope.documentType,
      });
      if (res.ok) {
        const looseAccepted = Boolean(
          body
          && typeof body === "object"
          && (body.accepted === true || body.ok === true || body.received === true || body.queued === true)
        );
        // Certificates (and callers with strictAck) must not treat bare { ok: true } as delivery proof.
        const strictAccepted = Boolean(
          body
          && typeof body === "object"
          && (
            body.accepted === true
            || body.deliveryAccepted === true
            || body.stored === true
            || (body.queued === true && (body.deliveryId || body.idempotencyKey))
          )
        );
        const accepted = event.strictAck === true ? strictAccepted : looseAccepted;
        // Bare 2xx without acceptance flag: transport OK, but platform may not have stored the payslip.
        lastWebhookStatus = {
          ok: true,
          at: new Date().toISOString(),
          event: envelope.event,
          documentType: envelope.documentType,
          status: res.status,
          error: null,
          mode: "webhook",
          hint: accepted
            ? null
            : (event.strictAck
              ? "Webhook 2xx ohne accepted/stored – LStB/VB gilt nicht als zugestellt. Lieferung bleibt in /v1/delivery/pending."
              : "Webhook HTTP 2xx ohne accepted/ok – Plattform speichert ggf. noch nicht. Lieferung bleibt in /v1/delivery/pending."),
          keySource,
          accepted,
          strictAck: Boolean(event.strictAck),
        };
        return {
          ok: true,
          mode: "webhook",
          status: res.status,
          attempt,
          body,
          accepted,
          delivery,
          idempotencyKey,
          event: envelope.event,
          documentType: envelope.documentType,
          hint: lastWebhookStatus.hint,
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
        event: envelope.event,
        documentType: envelope.documentType,
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
    event: envelope.event,
    documentType: envelope.documentType,
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
    delivery,
    idempotencyKey,
    event: envelope.event,
    documentType: envelope.documentType,
    queuedForPull: Boolean(delivery?.deliveryId),
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
