/**
 * Tax Rules Engine – deterministic, effective-dated, auditable.
 * Accounting never reads statutes; it calls evaluate() / resolveSv().
 *
 * AI may later extract draft packs from official sources. Drafts are never
 * applied until status === "published".
 */
import { builtinPacks } from "./packs.mjs";

const STATUS_LIVE = new Set(["published"]);

export function parseAsOf(asOf) {
  const raw = String(asOf || "").trim();
  if (!raw) {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const ym = raw.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1, last));
  }
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
  const t = Date.parse(raw);
  if (Number.isFinite(t)) {
    const d = new Date(t);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  return parseAsOf("");
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function inRange(asOfDate, from, to) {
  const a = ymd(asOfDate);
  if (from && a < String(from).slice(0, 10)) return false;
  if (to && a > String(to).slice(0, 10)) return false;
  return true;
}

/** Extra overlays (SQLite published packs). */
let extraPacks = [];

export function setExtraPacks(list) {
  extraPacks = Array.isArray(list) ? list.filter(Boolean) : [];
}

export function allPacks() {
  const byId = new Map();
  for (const p of builtinPacks) byId.set(p.id, p);
  for (const p of extraPacks) {
    if (p?.id) byId.set(p.id, p);
  }
  return [...byId.values()];
}

export function listRulesets(filter = {}) {
  const country = String(filter.country || "DE").toUpperCase();
  const includeDraft = Boolean(filter.includeDraft);
  return allPacks()
    .filter((p) => String(p.country || "DE").toUpperCase() === country)
    .filter((p) => includeDraft || STATUS_LIVE.has(p.status || "published"))
    .sort((a, b) => String(a.effectiveFrom).localeCompare(String(b.effectiveFrom)));
}

/**
 * Pick the published ruleset effective on asOf.
 * Overlapping packs: latest effectiveFrom wins (mid-year patch).
 */
export function resolveRuleset(ctx = {}) {
  const country = String(ctx.country || "DE").toUpperCase();
  const asOfDate = parseAsOf(ctx.asOf || ctx.period || ctx.payrollMonth);
  const asOf = ymd(asOfDate);
  const live = listRulesets({ country, includeDraft: Boolean(ctx.includeDraft) })
    .filter((p) => inRange(asOfDate, p.effectiveFrom, p.effectiveTo))
    .sort((a, b) => String(a.effectiveFrom).localeCompare(String(b.effectiveFrom)));
  const pack = live[live.length - 1] || null;
  return { ok: Boolean(pack), country, asOf, asOfDate, pack };
}

function citationsFor(pack, kinds = []) {
  const list = Array.isArray(pack?.citations) ? pack.citations : [];
  if (!kinds.length) return list.slice();
  const want = new Set(kinds);
  return list.filter((c) => !c.kind || want.has(c.kind));
}

export function resolveSv(ctx = {}) {
  const { ok, country, asOf, pack } = resolveRuleset(ctx);
  if (!ok || !pack?.sv) {
    return {
      ok: false,
      error: "Kein veröffentlichtes SV-Ruleset für dieses Datum",
      country,
      asOf,
      params: null,
      citations: [],
    };
  }
  return {
    ok: true,
    country,
    asOf,
    rulesetId: pack.id,
    version: pack.version,
    status: pack.status,
    papYear: pack.papYear || Number(String(pack.effectiveFrom).slice(0, 4)),
    params: pack.sv,
    citations: citationsFor(pack, ["sv", "payroll"]),
    source: pack.source || null,
  };
}

export function resolveVat(ctx = {}) {
  const { ok, country, asOf, pack } = resolveRuleset(ctx);
  const category = String(ctx.category || ctx.facts?.vatCategory || "standard").toLowerCase();
  if (!ok || !pack?.vat) {
    return { ok: false, error: "Kein USt-Ruleset", country, asOf, rate: null, citations: [] };
  }
  const rate = category === "reduced"
    ? pack.vat.reduced
    : (category === "zero" ? pack.vat.zero : pack.vat.standard);
  return {
    ok: true,
    country,
    asOf,
    rulesetId: pack.id,
    category,
    rate,
    params: pack.vat,
    citations: citationsFor(pack, ["vat"]),
    source: pack.source || null,
  };
}

export function legalConfig(ctx = {}) {
  const { pack, asOf, country } = resolveRuleset(ctx);
  const sv = pack?.sv;
  if (!sv) return null;
  return {
    year: pack.papYear || Number(asOf.slice(0, 4)),
    version: pack.version,
    rulesetId: pack.id,
    country,
    asOf,
    vat: pack.vat,
    socialSecurity: {
      pension: { total: sv.pension * 2, employee: sv.pension, label: "Rentenversicherung (RV)" },
      health: { total: sv.health * 2, employee: sv.health, label: "Krankenversicherung (KV)" },
      care: {
        total: sv.care * 2,
        employee: sv.care,
        employeeChildless: sv.careChildless,
        employer: sv.care,
        label: "Pflegeversicherung (PV)",
      },
      unemployment: { total: sv.unemployment * 2, employee: sv.unemployment, label: "Arbeitslosenversicherung (AV)" },
      healthAdditionalAvg: sv.healthAdditionalDefault,
      contributionCeiling: {
        pensionWest: sv.ceilings.pension,
        pensionEast: sv.ceilings.pensionEast || sv.ceilings.pension,
        health: sv.ceilings.health,
        care: sv.ceilings.care,
        unemployment: sv.ceilings.unemployment,
      },
      minijob: sv.minijob,
      midijob: sv.midijob,
      umlagen: sv.umlagen,
      regionDefault: sv.regionDefault || "west",
    },
    tax: {
      method: pack.taxMethod || `BMF-PAP-${pack.papYear}`,
      churchTaxRates: pack.churchTaxRates || [
        { value: 0, label: "Keine Kirchensteuer" },
        { value: 8, label: "8 % (BY, BW)" },
        { value: 9, label: "9 % (übrige Bundesländer)" },
      ],
    },
  };
}

/**
 * Accounting → Tax Rules Service.
 * kind: sv | vat | payroll-params | invoice
 */
export function evaluate(input = {}) {
  const kind = String(input.kind || input.taxType || "sv").toLowerCase();
  const ctx = {
    country: input.country || input.jurisdiction || "DE",
    asOf: input.asOf || input.date || input.period || input.payrollMonth,
    includeDraft: Boolean(input.includeDraft),
    category: input.facts?.vatCategory || input.vatCategory,
    facts: input.facts || {},
  };

  if (kind === "vat" || kind === "invoice") {
    const vat = resolveVat(ctx);
    return {
      ok: vat.ok,
      kind: "vat",
      country: vat.country,
      asOf: vat.asOf,
      rulesetId: vat.rulesetId || null,
      result: vat.ok ? { vatRate: vat.rate, category: vat.category } : null,
      citations: vat.citations || [],
      error: vat.error || null,
      engine: "tax-rules",
      deterministic: true,
    };
  }

  const sv = resolveSv(ctx);
  const vat = resolveVat(ctx);
  return {
    ok: sv.ok,
    kind: kind === "payroll-params" || kind === "payroll" ? "payroll-params" : "sv",
    country: sv.country,
    asOf: sv.asOf,
    rulesetId: sv.rulesetId || null,
    version: sv.version || null,
    papYear: sv.papYear || null,
    result: sv.ok
      ? {
        sv: sv.params,
        vat: vat.ok ? vat.params : null,
        papYear: sv.papYear,
        taxMethod: `BMF-PAP-${sv.papYear}`,
      }
      : null,
    citations: [...(sv.citations || []), ...(vat.citations || [])],
    error: sv.error || null,
    engine: "tax-rules",
    deterministic: true,
    note: "Lohnsteuerbetrag kommt aus dem BMF-PAP-Modul der Ruleset-Jahreszahl – nicht aus KI.",
  };
}
