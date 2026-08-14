/**
 * Tax Rules Engine (browser). Same contract as tax-rules/engine.mjs.
 * Effective-dated published packs only – AI never applies tax here.
 */
(function initTaxRules() {
  const CHURCH = [
    { value: 0, label: "Keine Kirchensteuer" },
    { value: 8, label: "8 % (BY, BW)" },
    { value: 9, label: "9 % (übrige Bundesländer)" },
  ];

  const PACKS = [
    {
      id: "DE-SV-USt-2025.1",
      country: "DE",
      status: "published",
      version: "2025.1",
      papYear: 2025,
      taxMethod: "BMF-PAP-2025",
      effectiveFrom: "2025-01-01",
      effectiveTo: "2025-12-31",
      vat: { standard: 19, reduced: 7, zero: 0 },
      churchTaxRates: CHURCH,
      sv: {
        pension: 9.3, health: 7.3, care: 1.7, careChildless: 2.3, unemployment: 1.3,
        healthAdditionalDefault: 2.5,
        ceilings: { pension: 8050, pensionEast: 7450, health: 5512.5, care: 5512.5, unemployment: 8050 },
        minijob: { ceiling: 556, rvEmployee: 3.6, employerKvFlat: 13, employerRvFlat: 15 },
        midijob: { lower: 556.01, upper: 2000, factorF: 0.6683 },
        umlagen: { u1: 1.1, u2: 0.49, insolvency: 0.15 },
        regionDefault: "west",
      },
      citations: [
        { kind: "sv", ruleId: "de.sv.minijob.ceiling.2025", source: "SGB IV", article: "§ 8 Abs. 1 Nr. 1 SGB IV", value: 556, effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" },
        { kind: "sv", ruleId: "de.sv.kv.zusatz.2025", source: "BMF PAP", article: "KVZ 2025", value: 2.5, effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" },
        { kind: "vat", ruleId: "de.ust.standard", source: "UStG", article: "§ 12 Abs. 1 UStG", value: 19, effectiveFrom: "2007-01-01" },
      ],
    },
    {
      id: "DE-SV-USt-2026.1",
      country: "DE",
      status: "published",
      version: "2026.1",
      papYear: 2026,
      taxMethod: "BMF-PAP-2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      vat: { standard: 19, reduced: 7, zero: 0 },
      churchTaxRates: CHURCH,
      sv: {
        pension: 9.3, health: 7.3, care: 1.8, careChildless: 2.4, unemployment: 1.3,
        healthAdditionalDefault: 2.9,
        ceilings: { pension: 8050, pensionEast: 8050, health: 5512.5, care: 5512.5, unemployment: 8050 },
        minijob: { ceiling: 603, rvEmployee: 3.6, employerKvFlat: 13, employerRvFlat: 15 },
        midijob: {
          lower: 603.01, upper: 2000, factorF: 0.6619,
          beGesamtA: 1.145937223, beGesamtB: 291.8744452, beAnA: 1.431639227, beAnB: 863.2784538,
        },
        umlagen: { u1: 1.1, u2: 0.49, insolvency: 0.15 },
        regionDefault: "west",
      },
      citations: [
        { kind: "sv", ruleId: "de.sv.minijob.ceiling.2026", source: "SGB IV", article: "§ 8 Abs. 1 Nr. 1 SGB IV", value: 603, effectiveFrom: "2026-01-01" },
        { kind: "sv", ruleId: "de.sv.kv.zusatz.2026", source: "BMF PAP", article: "KVZ 2026", value: 2.9, effectiveFrom: "2026-01-01" },
        { kind: "vat", ruleId: "de.ust.standard", source: "UStG", article: "§ 12 Abs. 1 UStG", value: 19, effectiveFrom: "2007-01-01" },
      ],
    },
  ];

  function parseAsOf(asOf) {
    const raw = String(asOf || "").trim();
    if (!raw) {
      const d = new Date();
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    const ym = raw.match(/^(\d{4})-(\d{2})$/);
    if (ym) {
      const last = new Date(Date.UTC(Number(ym[1]), Number(ym[2]), 0)).getUTCDate();
      return new Date(Date.UTC(Number(ym[1]), Number(ym[2]) - 1, last));
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

  function listRulesets(filter) {
    const country = String(filter?.country || "DE").toUpperCase();
    return PACKS.filter((p) => String(p.country || "DE").toUpperCase() === country && (p.status || "published") === "published")
      .sort((a, b) => String(a.effectiveFrom).localeCompare(String(b.effectiveFrom)));
  }

  function resolveRuleset(ctx) {
    const country = String(ctx?.country || "DE").toUpperCase();
    const asOfDate = parseAsOf(ctx?.asOf || ctx?.period || ctx?.payrollMonth);
    const asOf = ymd(asOfDate);
    const live = listRulesets({ country })
      .filter((p) => inRange(asOfDate, p.effectiveFrom, p.effectiveTo));
    const pack = live[live.length - 1] || null;
    return { ok: Boolean(pack), country, asOf, pack };
  }

  function resolveSv(ctx) {
    const { ok, country, asOf, pack } = resolveRuleset(ctx || {});
    if (!ok) return { ok: false, country, asOf, params: null, citations: [] };
    return {
      ok: true,
      country,
      asOf,
      rulesetId: pack.id,
      version: pack.version,
      papYear: pack.papYear,
      params: pack.sv,
      citations: (pack.citations || []).filter((c) => !c.kind || c.kind === "sv" || c.kind === "payroll"),
    };
  }

function resolveVat(ctx) {
    const { ok, country, asOf, pack } = resolveRuleset(ctx || {});
    const category = String(ctx?.category || ctx?.facts?.vatCategory || "standard").toLowerCase();
    if (!ok || !pack?.vat) return { ok: false, country, asOf, rate: null, citations: [] };
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
      citations: (pack.citations || []).filter((c) => !c.kind || c.kind === "vat"),
    };
  }

  function legalConfig(ctx) {
    const { pack, asOf, country } = resolveRuleset(ctx || {});
    const sv = pack?.sv;
    if (!sv) return null;
    return {
      year: pack.papYear || Number(String(asOf).slice(0, 4)),
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
      tax: { method: pack.taxMethod || `BMF-PAP-${pack.papYear}` },
    };
  }

  function evaluate(input) {
    const kind = String(input?.kind || "sv").toLowerCase();
    const ctx = {
      country: input?.country || "DE",
      asOf: input?.asOf || input?.date || input?.period || input?.payrollMonth,
      category: input?.facts?.vatCategory || input?.vatCategory,
      facts: input?.facts || {},
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
        engine: "tax-rules",
        deterministic: true,
      };
    }
    const sv = resolveSv(ctx);
    return {
      ok: sv.ok,
      kind: "payroll-params",
      country: sv.country,
      asOf: sv.asOf,
      rulesetId: sv.rulesetId || null,
      papYear: sv.papYear,
      result: sv.ok ? { sv: sv.params, papYear: sv.papYear, taxMethod: `BMF-PAP-${sv.papYear}` } : null,
      citations: sv.citations || [],
      engine: "tax-rules",
      deterministic: true,
    };
  }

  window.TaxRulesEngine = {
    listRulesets,
    resolveRuleset,
    resolveSv,
    resolveVat,
    legalConfig,
    evaluate,
    packs: PACKS,
  };
})();
