/**
 * Immutable document seal — LStB / VB / Entgeltabrechnung must not change in transit.
 * After seal, WorkPass Lohn never rebuilds document or pdfBase64; it only verifies.
 */
import { createHash } from "node:crypto";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function sha256(text) {
  return createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

/** Document body without PDF aliases (PDF has its own hash). */
export function documentContentWithoutPdf(document) {
  if (!document || typeof document !== "object") return null;
  const {
    pdfBase64,
    pdfFileName,
    pdfMimeType,
    pdfBytes,
    fileName,
    mimeType,
    ...rest
  } = document;
  void pdfBase64;
  void pdfFileName;
  void pdfMimeType;
  void pdfBytes;
  void fileName;
  void mimeType;
  return rest;
}

export function computeDeliverySeal(delivery) {
  const content = documentContentWithoutPdf(delivery?.document);
  const contentHash = sha256(stableStringify(content));
  const pdfHash = sha256(String(delivery?.pdfBase64 || ""));
  const seal = sha256([
    contentHash,
    pdfHash,
    String(delivery?.documentType || delivery?.type || ""),
    String(delivery?.deliveryId || ""),
    String(delivery?.title || ""),
  ].join("|"));
  return {
    kind: "platform.delivery.seal.v1",
    algorithm: "sha256",
    contentHash,
    pdfHash,
    seal,
    sealedAt: new Date().toISOString(),
    immutable: true,
  };
}

export function verifyDeliverySeal(delivery) {
  if (!delivery?.seal?.seal) {
    return { ok: false, reason: "not_sealed", label: "Kein Siegel – Dokument noch nicht eingefroren" };
  }
  const expected = computeDeliverySeal(delivery);
  const matchContent = expected.contentHash === delivery.seal.contentHash;
  const matchPdf = expected.pdfHash === delivery.seal.pdfHash;
  const matchSeal = expected.seal === delivery.seal.seal;
  if (matchContent && matchPdf && matchSeal) {
    return {
      ok: true,
      reason: "intact",
      label: "Unverändert: Inhalt + PDF Siegel OK",
      seal: delivery.seal,
    };
  }
  return {
    ok: false,
    reason: "tampered",
    label: "Dokument oder PDF wurde verändert – Versand blockiert",
    expected: {
      contentHash: expected.contentHash,
      pdfHash: expected.pdfHash,
      seal: expected.seal,
    },
    actual: {
      contentHash: delivery.seal.contentHash,
      pdfHash: delivery.seal.pdfHash,
      seal: delivery.seal.seal,
    },
  };
}

/** Freeze delivery after PDF attach — further ensure steps must not rebuild. */
export function sealDelivery(delivery) {
  if (!delivery || typeof delivery !== "object") return delivery;
  const seal = computeDeliverySeal(delivery);
  delivery.seal = seal;
  delivery.immutable = true;
  delivery.contentHash = seal.contentHash;
  delivery.pdfHash = seal.pdfHash;
  delivery.meta = {
    ...(delivery.meta || {}),
    seal: seal.seal,
    contentHash: seal.contentHash,
    pdfHash: seal.pdfHash,
    immutable: true,
  };
  return delivery;
}
