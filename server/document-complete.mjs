/**
 * Ensure employee documents sent to the platform are complete and immutable.
 * Once sealed, document + pdfBase64 are never rebuilt — only verified.
 */
import { createHash } from "node:crypto";
import { attachPdfToDelivery } from "./pdf/build-document-pdf.mjs";
import {
  sealDelivery,
  verifyDeliverySeal,
  documentContentWithoutPdf,
  computeDeliverySeal,
} from "./document-seal.mjs";

export { verifyDeliverySeal, computeDeliverySeal, sealDelivery } from "./document-seal.mjs";

const LSTB_REQUIRED_ROW_COUNT = 27;

function deepClone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function documentChecksum(document) {
  const raw = stableStringify(documentContentWithoutPdf(document) ?? null);
  return createHash("sha256").update(raw).digest("hex");
}

function missing(list, cond, field) {
  if (!cond) list.push(field);
}

/**
 * Validate that delivery.document carries everything the employee app needs.
 */
export function assessDocumentCompleteness(delivery) {
  const gaps = [];
  const type = String(delivery?.documentType || delivery?.type || "").toLowerCase();
  const doc = delivery?.document;
  const pdf = String(delivery?.pdfBase64 || doc?.pdfBase64 || "").trim();

  missing(gaps, Boolean(delivery?.deliveryId), "deliveryId");
  missing(gaps, Boolean(delivery?.title || delivery?.documentTitle), "title");
  missing(gaps, Boolean(delivery?.description || delivery?.title || delivery?.documentTitle), "description");
  missing(gaps, doc && typeof doc === "object", "document");
  missing(gaps, pdf.length > 100 && pdf.startsWith("JVBER"), "pdfBase64");

  if (!doc || typeof doc !== "object") {
    return {
      ok: false,
      complete: false,
      documentType: type || null,
      gaps,
      bytes: 0,
      checksum: null,
      label: "Dokument fehlt im Webhook-Payload",
    };
  }

  if (type === "payslip" || type === "payroll") {
    missing(gaps, doc.kind === "platform.payslip.v1" || Boolean(doc.totals), "document.totals");
    missing(gaps, doc.employee && (doc.employee.name || doc.employee.id), "document.employee");
    missing(gaps, Boolean(doc.period || delivery.period), "document.period");
    missing(gaps, doc.totals && doc.totals.gross != null, "document.totals.gross");
    missing(gaps, doc.totals && doc.totals.net != null, "document.totals.net");
    missing(gaps, Array.isArray(doc.wageItems), "document.wageItems");
  } else if (type === "lstb") {
    missing(gaps, doc.kind === "portal.certificate.lstb.v1" || Boolean(doc.rows), "document.kind/rows");
    missing(gaps, Array.isArray(doc.rows) && doc.rows.length >= LSTB_REQUIRED_ROW_COUNT, `document.rows(${LSTB_REQUIRED_ROW_COUNT})`);
    missing(gaps, Boolean(doc.employeeName || delivery.employee?.name), "document.employeeName");
    missing(gaps, Boolean(doc.year || delivery.year), "document.year");
    missing(gaps, doc.totals && typeof doc.totals === "object", "document.totals");
    missing(gaps, Array.isArray(doc.monthDetails), "document.monthDetails");
    missing(gaps, Boolean(doc.seller || doc.taxNumber != null), "document.seller");
  } else if (type === "verdienst" || type === "vb") {
    missing(gaps, doc.kind === "portal.certificate.verdienst.v1" || Boolean(doc.rows), "document.kind/rows");
    missing(gaps, Array.isArray(doc.rows) && doc.rows.length > 0, "document.rows");
    missing(gaps, Boolean(doc.employeeName || delivery.employee?.name), "document.employeeName");
    missing(gaps, Boolean(doc.period || delivery.period), "document.period");
    missing(gaps, doc.monthly && typeof doc.monthly === "object", "document.monthly");
    missing(gaps, doc.ytd && typeof doc.ytd === "object", "document.ytd");
  } else if (type === "invoice") {
    missing(gaps, Boolean(doc.number || delivery.number), "document.number");
    missing(gaps, doc.totals && typeof doc.totals === "object", "document.totals");
  }

  if (delivery.immutable || delivery.seal?.seal) {
    const v = verifyDeliverySeal(delivery);
    if (!v.ok) missing(gaps, false, `seal:${v.reason}`);
  }

  const bytes = Buffer.byteLength(JSON.stringify(documentContentWithoutPdf(doc)), "utf8");
  const checksum = documentChecksum(doc);
  const complete = gaps.length === 0;
  return {
    ok: complete,
    complete,
    documentType: type || null,
    gaps,
    bytes,
    checksum,
    pdfBytes: delivery?.pdfBytes || null,
    rowCount: Array.isArray(doc.rows) ? doc.rows.length : (Array.isArray(doc.wageItems) ? doc.wageItems.length : null),
    label: complete
      ? "Dokument + PDF versiegelt und vollständig (unveränderlich)"
      : `Dokument unvollständig: ${gaps.join(", ")}`,
  };
}

/**
 * Prepare delivery once: PDF + seal. If already sealed and intact → return unchanged.
 */
export function ensureCompleteDeliveryDocument(delivery) {
  if (!delivery || typeof delivery !== "object") {
    return {
      delivery: null,
      assessment: {
        ok: false,
        complete: false,
        gaps: ["delivery"],
        label: "Keine Delivery",
        bytes: 0,
        checksum: null,
      },
    };
  }

  // Already frozen → verify only, never rebuild document/PDF
  if (delivery.immutable && delivery.seal?.seal) {
    const verify = verifyDeliverySeal(delivery);
    if (!verify.ok) {
      return {
        delivery,
        assessment: {
          ok: false,
          complete: false,
          gaps: [`seal:${verify.reason}`],
          bytes: 0,
          checksum: delivery.seal?.contentHash || null,
          label: verify.label,
          tampered: true,
        },
      };
    }
    const assessment = assessDocumentCompleteness(delivery);
    return { delivery, assessment };
  }

  let next = { ...delivery };
  if (delivery.document != null) {
    next.document = deepClone(delivery.document);
  }
  // Ensure German Antrag labels exist before PDF + seal (description must never be empty)
  const type = String(next.documentType || next.type || "").toLowerCase();
  const documentTitle = String(next.documentTitle || (
    type === "lstb" ? "Lohnsteuerbescheinigung"
      : (type === "verdienst" || type === "vb") ? "Verdienstbescheinigung"
        : type === "invoice" ? "Rechnung"
          : "Lohnabrechnung"
  )).trim();
  const title = String(next.title || `${documentTitle}${next.period || next.year || next.number ? ` ${next.period || next.year || next.number}` : ""}`).trim();
  next.documentTitle = documentTitle;
  next.title = title;
  next.description = String(next.description || title).trim();
  next.label = String(next.label || documentTitle).trim();
  next.name = String(next.name || documentTitle).trim();
  next.subject = String(next.subject || title).trim();
  if (next.document && typeof next.document === "object") {
    next.document = {
      ...next.document,
      documentTitle,
      title,
      description: next.description,
      label: next.label,
      name: documentTitle,
    };
  }
  next = attachPdfToDelivery(next);
  next = sealDelivery(next);

  const assessment = assessDocumentCompleteness(next);
  next.contentComplete = assessment.complete;
  next.documentBytes = assessment.bytes;
  next.documentChecksum = assessment.checksum;
  next.documentIntegrity = {
    complete: assessment.complete,
    checksum: assessment.checksum,
    bytes: assessment.bytes,
    gaps: assessment.gaps,
    rowCount: assessment.rowCount,
    hasPdf: Boolean(next.pdfBase64),
    pdfBytes: next.pdfBytes || null,
    immutable: true,
    seal: next.seal?.seal || null,
    checkedAt: new Date().toISOString(),
  };
  next.pullUrl = `/v1/delivery/${encodeURIComponent(String(next.deliveryId || ""))}`;
  next.meta = {
    ...(next.meta || {}),
    contentComplete: assessment.complete,
    documentChecksum: assessment.checksum,
    documentBytes: assessment.bytes,
    hasPdf: Boolean(next.pdfBase64),
    immutable: true,
    seal: next.seal?.seal || null,
  };

  return { delivery: next, assessment };
}
