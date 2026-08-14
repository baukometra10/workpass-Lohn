/**
 * Built-in published tax packs (Germany).
 * New years are added as new packs (or POST /v1/tax/rulesets) – not by rewriting payroll code.
 *
 * status: draft | reviewed | published
 * Only published packs are used for live calculation.
 */

const CHURCH = [
  { value: 0, label: "Keine Kirchensteuer" },
  { value: 8, label: "8 % (BY, BW)" },
  { value: 9, label: "9 % (übrige Bundesländer)" },
];

/** Geringfügigkeit 2025: 556 € (Mindestlohn-Kopplung). Zusatzbeitrag Ø 2,5 %. PV 3,4 %. */
export const DE_2025 = {
  id: "DE-SV-USt-2025.1",
  country: "DE",
  status: "published",
  version: "2025.1",
  papYear: 2025,
  taxMethod: "BMF-PAP-2025",
  effectiveFrom: "2025-01-01",
  effectiveTo: "2025-12-31",
  publishedAt: "2024-12-01",
  source: {
    sv: "SGB IV / Beitragsverordnung 2025",
    tax: "BMF Programmablaufplan 2025",
    vat: "§ 12 UStG",
  },
  vat: { standard: 19, reduced: 7, zero: 0 },
  churchTaxRates: CHURCH,
  sv: {
    pension: 9.3,
    health: 7.3,
    care: 1.7,
    careChildless: 2.3,
    unemployment: 1.3,
    healthAdditionalDefault: 2.5,
    ceilings: {
      pension: 8050,
      pensionEast: 7450,
      health: 5512.5,
      care: 5512.5,
      unemployment: 8050,
    },
    minijob: {
      ceiling: 556,
      rvEmployee: 3.6,
      employerKvFlat: 13,
      employerRvFlat: 15,
    },
    midijob: {
      lower: 556.01,
      upper: 2000,
      factorF: 0.6683,
    },
    umlagen: { u1: 1.1, u2: 0.49, insolvency: 0.15 },
    regionDefault: "west",
  },
  citations: [
    {
      kind: "sv",
      ruleId: "de.sv.minijob.ceiling.2025",
      title: "Geringfügigkeitsgrenze",
      source: "SGB IV",
      article: "§ 8 Abs. 1 Nr. 1 SGB IV",
      effectiveFrom: "2025-01-01",
      effectiveTo: "2025-12-31",
      value: 556,
    },
    {
      kind: "sv",
      ruleId: "de.sv.kv.zusatz.2025",
      title: "Durchschnittlicher Zusatzbeitrag KV",
      source: "GKV-Schätzerkreis / BMF PAP",
      article: "KVZ 2025",
      effectiveFrom: "2025-01-01",
      effectiveTo: "2025-12-31",
      value: 2.5,
    },
    {
      kind: "sv",
      ruleId: "de.sv.pv.2025",
      title: "Pflegeversicherung AN",
      source: "SGB XI",
      article: "§ 55 SGB XI",
      effectiveFrom: "2025-01-01",
      effectiveTo: "2025-12-31",
      value: 1.7,
    },
    {
      kind: "vat",
      ruleId: "de.ust.standard",
      title: "Regelsteuersatz",
      source: "UStG",
      article: "§ 12 Abs. 1 UStG",
      effectiveFrom: "2007-01-01",
      effectiveTo: null,
      value: 19,
    },
  ],
};

/** 2026: Mini 603 €, KV-Zusatz Ø 2,9 %, PV 3,6 %, BBG West/Ost RV angeglichen. */
export const DE_2026 = {
  id: "DE-SV-USt-2026.1",
  country: "DE",
  status: "published",
  version: "2026.1",
  papYear: 2026,
  taxMethod: "BMF-PAP-2026",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  publishedAt: "2025-12-01",
  source: {
    sv: "SGB IV / Beitragsverordnung 2026",
    tax: "BMF Programmablaufplan 2026",
    vat: "§ 12 UStG",
  },
  vat: { standard: 19, reduced: 7, zero: 0 },
  churchTaxRates: CHURCH,
  sv: {
    pension: 9.3,
    health: 7.3,
    care: 1.8,
    careChildless: 2.4,
    unemployment: 1.3,
    healthAdditionalDefault: 2.9,
    ceilings: {
      pension: 8050,
      pensionEast: 8050,
      health: 5512.5,
      care: 5512.5,
      unemployment: 8050,
    },
    minijob: {
      ceiling: 603,
      rvEmployee: 3.6,
      employerKvFlat: 13,
      employerRvFlat: 15,
    },
    midijob: {
      lower: 603.01,
      upper: 2000,
      factorF: 0.6619,
      beGesamtA: 1.145937223,
      beGesamtB: 291.8744452,
      beAnA: 1.431639227,
      beAnB: 863.2784538,
    },
    umlagen: { u1: 1.1, u2: 0.49, insolvency: 0.15 },
    regionDefault: "west",
  },
  citations: [
    {
      kind: "sv",
      ruleId: "de.sv.minijob.ceiling.2026",
      title: "Geringfügigkeitsgrenze",
      source: "SGB IV",
      article: "§ 8 Abs. 1 Nr. 1 SGB IV",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      value: 603,
    },
    {
      kind: "sv",
      ruleId: "de.sv.kv.zusatz.2026",
      title: "Durchschnittlicher Zusatzbeitrag KV",
      source: "GKV-Schätzerkreis / BMF PAP",
      article: "KVZ 2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      value: 2.9,
    },
    {
      kind: "sv",
      ruleId: "de.sv.pv.2026",
      title: "Pflegeversicherung AN",
      source: "SGB XI",
      article: "§ 55 SGB XI",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      value: 1.8,
    },
    {
      kind: "sv",
      ruleId: "de.sv.bbg.rv.2026",
      title: "Beitragsbemessungsgrenze RV/AV",
      source: "Sozialversicherungs-Rechengrößenverordnung",
      article: "BBG 2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      value: 8050,
    },
    {
      kind: "vat",
      ruleId: "de.ust.standard",
      title: "Regelsteuersatz",
      source: "UStG",
      article: "§ 12 Abs. 1 UStG",
      effectiveFrom: "2007-01-01",
      effectiveTo: null,
      value: 19,
    },
  ],
};

export const builtinPacks = [DE_2025, DE_2026];
