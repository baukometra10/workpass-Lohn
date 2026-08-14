/**
 * Tax Rules Service – accounting asks, engine answers (no statute parsing here).
 */
import {
  evaluate,
  listRulesets,
  resolveSv,
  resolveVat,
  resolveRuleset,
  setExtraPacks,
  legalConfig,
} from "../../tax-rules/engine.mjs";
import { validateRuleset } from "../../tax-rules/validate.mjs";
import { saveRuleset, loadPublishedOverlays, getStoredRuleset, listStoredRulesets, deleteStoredRuleset } from "./store.mjs";
import { ingestDraft, reviewRuleset, publishRuleset, listLifecycleRulesets } from "./lifecycle.mjs";

let hydrated = false;

export function hydrateTaxRulesFromStore() {
  try {
    setExtraPacks(loadPublishedOverlays());
    hydrated = true;
  } catch {
    hydrated = false;
  }
  return { ok: true, hydrated };
}

function ensureHydrated() {
  if (!hydrated) hydrateTaxRulesFromStore();
}

export function taxEvaluate(input) {
  ensureHydrated();
  return evaluate(input);
}

export function taxListRulesets(filter) {
  ensureHydrated();
  const live = listRulesets(filter);
  if (!filter?.includeDraft && !filter?.includeStored) return live;
  const stored = listStoredRulesets({ country: filter?.country || "DE" });
  const byId = new Map(live.map((p) => [p.id, p]));
  for (const p of stored) {
    if (!p?.id) continue;
    if (!filter.includeDraft && p.status !== "published") continue;
    byId.set(p.id, p);
  }
  return [...byId.values()].sort((a, b) =>
    String(a.effectiveFrom).localeCompare(String(b.effectiveFrom))
  );
}

export function taxResolveSv(ctx) {
  ensureHydrated();
  return resolveSv(ctx);
}

export function taxResolveVat(ctx) {
  ensureHydrated();
  return resolveVat(ctx);
}

export function taxResolveRuleset(ctx) {
  ensureHydrated();
  return resolveRuleset(ctx);
}

export function taxLegalConfig(ctx) {
  ensureHydrated();
  return legalConfig(ctx);
}

/** @deprecated Prefer taxIngestDraft / taxReview / taxPublishLifecycle */
export function taxPublishRuleset(pack, opts = {}) {
  const status = String(opts.status || pack?.status || "draft");
  if (status === "published") {
    const check = validateRuleset(pack, { strict: true });
    if (!check.ok) return { ok: false, error: check.errors.join("; "), errors: check.errors };
  }
  const saved = saveRuleset(pack, opts);
  if (saved.ok) hydrateTaxRulesFromStore();
  return saved;
}

export function taxIngestDraft(pack, opts) {
  ensureHydrated();
  return ingestDraft(pack, opts);
}

export function taxReviewRuleset(rulesetId) {
  ensureHydrated();
  return reviewRuleset(rulesetId);
}

export function taxPublishLifecycle(rulesetId, opts) {
  ensureHydrated();
  return publishRuleset(rulesetId, opts);
}

export function taxGetStoredRuleset(rulesetId) {
  ensureHydrated();
  return getStoredRuleset(rulesetId);
}

export function taxListStored(filter) {
  ensureHydrated();
  return listLifecycleRulesets(filter);
}

export function taxDeleteStored(rulesetId) {
  const r = deleteStoredRuleset(rulesetId);
  if (r.ok) hydrateTaxRulesFromStore();
  return r;
}

export function taxValidate(pack, opts) {
  return validateRuleset(pack, opts);
}

export function taxEngineInfo() {
  ensureHydrated();
  const sets = taxListRulesets({ country: "DE", includeDraft: true });
  return {
    engine: "tax-rules",
    countries: ["DE"],
    lifecycle: ["draft", "reviewed", "published"],
    rulesets: sets.map((p) => ({
      id: p.id,
      version: p.version,
      status: p.status,
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo,
      papYear: p.papYear,
    })),
  };
}

export { evaluate, resolveSv, legalConfig };
