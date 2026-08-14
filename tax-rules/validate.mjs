/**
 * Schema + acceptance checks for tax rulesets.
 * Drafts may be incomplete; publish requires a full valid pack.
 */

const STATUSES = new Set(["draft", "reviewed", "published"]);

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").slice(0, 10));
}

function numOk(n, min = 0, max = 100) {
  const v = Number(n);
  return Number.isFinite(v) && v >= min && v <= max;
}

/**
 * @param {object} pack
 * @param {{ strict?: boolean }} [opts] strict=true for review/publish
 */
export function validateRuleset(pack, opts = {}) {
  const strict = Boolean(opts.strict);
  const errors = [];
  if (!pack || typeof pack !== "object") {
    return { ok: false, errors: ["Ruleset-Objekt fehlt"] };
  }
  if (!String(pack.id || "").trim()) errors.push("id fehlt");
  if (!String(pack.country || "").trim()) errors.push("country fehlt");
  if (!isYmd(pack.effectiveFrom)) errors.push("effectiveFrom muss YYYY-MM-DD sein");
  if (pack.effectiveTo != null && pack.effectiveTo !== "" && !isYmd(pack.effectiveTo)) {
    errors.push("effectiveTo muss YYYY-MM-DD oder null sein");
  }
  if (pack.status != null && !STATUSES.has(String(pack.status))) {
    errors.push("status: draft | reviewed | published");
  }

  const vat = pack.vat;
  if (!vat || typeof vat !== "object") {
    if (strict) errors.push("vat fehlt");
  } else {
    if (!numOk(vat.standard, 0, 30)) errors.push("vat.standard ungültig");
    if (vat.reduced != null && !numOk(vat.reduced, 0, 30)) errors.push("vat.reduced ungültig");
  }

  const sv = pack.sv;
  if (!sv || typeof sv !== "object") {
    if (strict) errors.push("sv fehlt");
  } else if (strict) {
    for (const k of ["pension", "health", "care", "unemployment"]) {
      if (!numOk(sv[k], 0, 20)) errors.push(`sv.${k} ungültig`);
    }
    if (!numOk(sv.healthAdditionalDefault, 0, 10)) errors.push("sv.healthAdditionalDefault ungültig");
    if (!sv.minijob || !numOk(sv.minijob.ceiling, 1, 5000)) errors.push("sv.minijob.ceiling ungültig");
    if (!sv.midijob || !numOk(sv.midijob.upper, 1, 10000)) errors.push("sv.midijob.upper ungültig");
    if (!sv.ceilings || !numOk(sv.ceilings.pension, 100, 50000)) errors.push("sv.ceilings.pension ungültig");
  }

  if (strict) {
    const pap = Number(pack.papYear);
    if (!Number.isInteger(pap) || pap < 2020 || pap > 2100) errors.push("papYear ungültig");
    if (!Array.isArray(pack.citations) || pack.citations.length < 1) {
      errors.push("citations: mindestens eine Quelle erforderlich");
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Deterministic smoke checks before publish (no AI).
 * Uses evaluate against the candidate pack as a temporary overlay.
 */
export function runAcceptanceTests(pack, { evaluate, setExtraPacks, resolveSv } = {}) {
  const errors = [];
  if (!pack?.id || !pack?.effectiveFrom) {
    return { ok: false, errors: ["Pack unvollständig für Acceptance"], results: [] };
  }
  const results = [];
  const asOf = String(pack.effectiveFrom).slice(0, 10);

  try {
    if (typeof setExtraPacks === "function") {
      setExtraPacks([{ ...pack, status: "published" }]);
    }
    if (typeof resolveSv === "function") {
      const sv = resolveSv({ country: pack.country || "DE", asOf, includeDraft: false });
      const okId = sv.ok && sv.rulesetId === pack.id;
      results.push({ name: "resolveSv picks pack", ok: okId });
      if (!okId) errors.push("Acceptance: resolveSv wählt Pack nicht");
      if (sv.ok && pack.sv?.minijob?.ceiling != null) {
        const match = Number(sv.params?.minijob?.ceiling) === Number(pack.sv.minijob.ceiling);
        results.push({ name: "minijob ceiling", ok: match });
        if (!match) errors.push("Acceptance: Mini-Grenze weicht ab");
      }
    }
    if (typeof evaluate === "function") {
      const vat = evaluate({
        kind: "vat",
        country: pack.country || "DE",
        asOf,
        facts: { vatCategory: "standard" },
      });
      const rateOk = vat.ok && Number(vat.result?.vatRate) === Number(pack.vat?.standard);
      results.push({ name: "vat standard rate", ok: rateOk });
      if (!rateOk) errors.push("Acceptance: USt-Satz weicht ab");
    }
  } finally {
    if (typeof setExtraPacks === "function") setExtraPacks([]);
  }

  return { ok: errors.length === 0, errors, results };
}
