/**
 * Platform invoice ingest → accounting store
 * Isolation: company.id + invoice number → id = companyId::number
 */
import { loadInvoiceJob, saveInvoiceJob } from "./store.mjs";
import { buildEmployeeDelivery, notifyPlatform } from "./notify.mjs";
import { enqueueDelivery } from "./delivery-queue.mjs";
import { ensureCompanyFromPayload } from "./company-service.mjs";
import {
  extractCompany,
  requireCompanyId,
  invoiceDocumentId,
  assertSameTenant,
  normalizeCompanyId,
} from "./tenant.mjs";

function normalizeInvoice(payload, company) {
  const number = String(payload.number || payload.invoiceNumber || "").trim();
  const items = Array.isArray(payload.items || payload.lines)
    ? (payload.items || payload.lines).map((it) => ({
      description: String(it.description || it.label || it.name || ""),
      quantity: Number(it.quantity ?? it.qty ?? 1) || 1,
      unitPrice: Number(it.unitPrice ?? it.price ?? it.amount ?? 0) || 0,
      unit: String(it.unit || "Stk"),
    }))
    : [];

  const taxRate = Number(payload.taxRate ?? 19) || 0;
  const net = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const tax = Math.round(net * (taxRate / 100) * 100) / 100;
  const gross = Math.round((net + tax) * 100) / 100;

  const sellerFromCompany = [
    company.name,
    company.address || [company.street, [company.zip, company.city].filter(Boolean).join(" ")].filter(Boolean).join("\n"),
  ].filter(Boolean).join("\n");

  return {
    kind: "platform.invoice.v1",
    number,
    invoiceDate: String(payload.invoiceDate || payload.date || "").trim(),
    serviceDate: String(payload.serviceDate || payload.invoiceDate || payload.date || "").trim(),
    dueDate: String(payload.dueDate || "").trim(),
    seller: String(payload.seller || sellerFromCompany || "").trim(),
    customer: String(payload.customer || payload.buyer || "").trim(),
    taxRate,
    kleinunternehmer: Boolean(payload.kleinunternehmer),
    reverseCharge: Boolean(payload.reverseCharge),
    note: String(payload.note || "").trim(),
    taxNumber: String(payload.taxNumber || company.taxNumber || "").trim(),
    vatId: String(payload.vatId || company.vatId || "").trim(),
    company: {
      id: company.id,
      name: company.name,
      taxNumber: company.taxNumber || "",
      vatId: company.vatId || "",
    },
    items,
    totals: {
      net: Math.round(net * 100) / 100,
      tax,
      gross,
    },
  };
}

export function ingestInvoice(payload, options = {}) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["Invoice-Nutzlast fehlt"], job: null };
  }

  const companyCheck = requireCompanyId(payload);
  if (!companyCheck.ok) {
    return { ok: false, errors: [companyCheck.error], job: null };
  }
  const scopeCheck = assertSameTenant(options.tenantScope, companyCheck.company.id, "Invoice-Payload");
  if (!scopeCheck.ok) {
    return { ok: false, errors: [scopeCheck.error], job: null };
  }

  ensureCompanyFromPayload(payload);
  const company = extractCompany(payload);
  const draft = normalizeInvoice(payload, company);
  const errors = [];
  if (!draft.number) errors.push("Rechnungsnummer fehlt");
  if (!draft.seller) errors.push("Verkäufer (seller / company.name) fehlt");
  if (!draft.customer) errors.push("Kunde (customer) fehlt");
  if (!draft.items.length) errors.push("Positionen (items) fehlen");

  const id = invoiceDocumentId(company.id, draft.number);
  const now = new Date().toISOString();
  const prev = loadInvoiceJob(id);
  const period = String(payload.period || draft.invoiceDate || "").trim().slice(0, 7);
  const job = {
    id,
    kind: "platform.invoice.job.v1",
    status: errors.length ? "error" : "received",
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    period: /^\d{4}-\d{2}$/.test(period) ? period : (prev?.period || ""),
    company: {
      id: company.id,
      name: company.name || draft.company.name,
    },
    inbound: payload,
    draft,
    hubEntry: {
      number: draft.number,
      buyer: draft.customer.split("\n")[0],
      total: draft.totals.gross.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      date: draft.invoiceDate,
      savedAt: now,
      companyId: company.id,
      draft: {
        documentType: "invoice",
        invoiceNumber: draft.number,
        invoiceDate: draft.invoiceDate,
        serviceDate: draft.serviceDate,
        dueDate: draft.dueDate,
        seller: draft.seller,
        customer: draft.customer,
        taxRate: String(draft.taxRate),
        kleinunternehmer: draft.kleinunternehmer,
        reverseCharge: draft.reverseCharge,
        note: draft.note,
        taxNumber: draft.taxNumber,
        vatId: draft.vatId,
        companyId: company.id,
        items: draft.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      },
    },
    errors,
  };

  saveInvoiceJob(job);
  return { ok: errors.length === 0, errors, job };
}

/**
 * Platform batch: { kind, company, period?, invoices: [...] }
 */
export function ingestInvoiceBatch(batch, options = {}) {
  if (!batch || typeof batch !== "object") {
    return { ok: false, errors: ["Invoice-Batch fehlt"], count: 0, results: [], company: null };
  }
  const companyCheck = requireCompanyId(batch);
  if (!companyCheck.ok) {
    return { ok: false, errors: [companyCheck.error], count: 0, results: [], company: null };
  }
  const scopeCheck = assertSameTenant(options.tenantScope, companyCheck.company.id, "Invoice-Batch");
  if (!scopeCheck.ok) {
    return { ok: false, errors: [scopeCheck.error], count: 0, results: [], company: null };
  }

  ensureCompanyFromPayload(batch);
  const company = extractCompany(batch);
  const period = String(batch.period || "").trim();
  const rows = Array.isArray(batch.invoices)
    ? batch.invoices
    : (Array.isArray(batch.items) ? batch.items : []);
  const results = [];
  for (const row of rows) {
    const payload = {
      ...(row && typeof row === "object" ? row : {}),
      kind: row?.kind || "platform.invoice.v1",
      company: row?.company || company,
      period: row?.period || period || undefined,
    };
    const r = ingestInvoice(payload, { tenantScope: options.tenantScope || company.id });
    results.push({
      ok: r.ok,
      id: r.job?.id || null,
      number: r.job?.draft?.number || payload.number || null,
      errors: r.errors || [],
      status: r.job?.status || null,
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  return {
    ok: okCount > 0 && okCount === results.length,
    count: results.length,
    okCount,
    errors: results.flatMap((r) => r.errors || []),
    results,
    company: { id: company.id, name: company.name || "" },
    period: period || null,
  };
}

export async function releaseInvoiceJob(id, options = {}) {
  const job = loadInvoiceJob(id);
  if (!job) return { ok: false, error: "Rechnung nicht gefunden", job: null };

  const companyId = normalizeCompanyId(job.company?.id || job.draft?.company?.id || "");
  const scopeCheck = assertSameTenant(options.tenantScope, companyId, "Rechnung");
  if (!scopeCheck.ok) return { ok: false, error: scopeCheck.error, job: null };

  if (job.status === "error") return { ok: false, error: "Rechnung hat Fehler", job };
  job.status = "released";
  job.releasedAt = new Date().toISOString();
  job.updatedAt = job.releasedAt;
  saveInvoiceJob(job);

  const delivery = buildEmployeeDelivery("invoice", job);
  enqueueDelivery(delivery);
  const platformNotify = await notifyPlatform({ event: "invoice.released", delivery });
  if (platformNotify?.ok && platformNotify.mode === "webhook" && platformNotify.accepted === true) {
    try {
      const { ackDelivery } = await import("./delivery-queue.mjs");
      ackDelivery(delivery.deliveryId, { via: "webhook-accepted", at: new Date().toISOString() });
    } catch { /* keep pending */ }
  }

  return {
    ok: true,
    job,
    delivery,
    platformNotify,
    deliveredViaWebhook: Boolean(platformNotify?.ok && platformNotify.accepted === true),
    message: platformNotify?.ok && platformNotify.accepted === true
      ? "Freigegeben und von der Plattform bestätigt."
      : "Freigegeben. Plattform muss speichern und /v1/delivery/.../ack senden (oder pending pollen).",
  };
}
