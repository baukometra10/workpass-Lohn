/**
 * draft → reviewed → published
 * AI / extractors may only create drafts. Live calc uses published only.
 */
import { validateRuleset, runAcceptanceTests } from "../../tax-rules/validate.mjs";
import { evaluate, setExtraPacks, resolveSv } from "../../tax-rules/engine.mjs";
import {
  saveRuleset,
  getStoredRuleset,
  listStoredRulesets,
  loadPublishedOverlays,
} from "./store.mjs";

function hydratePublished() {
  setExtraPacks(loadPublishedOverlays());
}

export function ingestDraft(pack, opts = {}) {
  const base = { ...(pack || {}), status: "draft" };
  const check = validateRuleset(base, { strict: false });
  if (!check.ok) return { ok: false, error: check.errors.join("; "), errors: check.errors };
  const note = String(opts.ingestNote || pack?.ingestNote || "").trim();
  if (note) base.ingestNote = note;
  base.ingestedAt = new Date().toISOString();
  if (opts.source === "ai" || pack?.extractedBy === "ai") {
    base.extractedBy = "ai";
    base.note = (base.note || "") + (base.note ? " · " : "") + "KI-Entwurf – nicht live bis published";
  }
  const saved = saveRuleset(base, { status: "draft" });
  return saved;
}

export function reviewRuleset(rulesetId) {
  const pack = getStoredRuleset(rulesetId);
  if (!pack) return { ok: false, error: "Ruleset nicht gefunden" };
  if (pack.status === "published") {
    return { ok: false, error: "Bereits veröffentlicht – Review nicht nötig" };
  }
  const check = validateRuleset(pack, { strict: true });
  if (!check.ok) return { ok: false, error: check.errors.join("; "), errors: check.errors };
  const next = { ...pack, status: "reviewed", reviewedAt: new Date().toISOString() };
  const saved = saveRuleset(next, { status: "reviewed" });
  return saved;
}

export function publishRuleset(rulesetId, opts = {}) {
  const pack = getStoredRuleset(rulesetId);
  if (!pack) return { ok: false, error: "Ruleset nicht gefunden" };
  if (pack.status === "draft" && !opts.allowDraftPublish) {
    return { ok: false, error: "Zuerst reviewen (draft → reviewed), dann publish" };
  }
  if (pack.status !== "reviewed" && pack.status !== "published" && !opts.allowDraftPublish) {
    return { ok: false, error: `Status ${pack.status} kann nicht veröffentlicht werden` };
  }
  const check = validateRuleset(pack, { strict: true });
  if (!check.ok) return { ok: false, error: check.errors.join("; "), errors: check.errors };

  const acceptance = runAcceptanceTests(
    { ...pack, status: "published" },
    { evaluate, setExtraPacks, resolveSv }
  );
  // Restore live overlays after acceptance temporarily swapped extras
  hydratePublished();
  if (!acceptance.ok) {
    return {
      ok: false,
      error: acceptance.errors.join("; "),
      errors: acceptance.errors,
      acceptance,
    };
  }

  const next = {
    ...pack,
    status: "published",
    publishedAt: new Date().toISOString(),
    acceptanceResults: acceptance.results,
  };
  const saved = saveRuleset(next, { status: "published" });
  if (saved.ok) hydratePublished();
  return { ...saved, acceptance };
}

export function listLifecycleRulesets(filter = {}) {
  return listStoredRulesets(filter);
}
