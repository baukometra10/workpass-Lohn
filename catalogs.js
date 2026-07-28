/**
 * Stammdaten-Kataloge für Standalone-Buchhaltung
 */
(function () {
  const HEALTH_FUNDS = [
    { name: "AOK Bayern", zusatz: 2.90 },
    { name: "AOK Baden-Württemberg", zusatz: 2.65 },
    { name: "AOK Nordost", zusatz: 2.70 },
    { name: "AOK PLUS", zusatz: 3.10 },
    { name: "Techniker Krankenkasse (TK)", zusatz: 2.45 },
    { name: "BARMER", zusatz: 3.29 },
    { name: "DAK-Gesundheit", zusatz: 2.80 },
    { name: "KKH Kaufmännische Krankenkasse", zusatz: 3.28 },
    { name: "hkk", zusatz: 0.98 },
    { name: "HEK – Hanseatische Krankenkasse", zusatz: 2.50 },
    { name: "IKK classic", zusatz: 2.90 },
    { name: "IKK gesund plus", zusatz: 3.40 },
    { name: "SBK Siemens-Betriebskrankenkasse", zusatz: 2.50 },
    { name: "BKK VBU", zusatz: 2.49 },
    { name: "BKK Firmus", zusatz: 2.38 },
    { name: "Knappschaft", zusatz: 3.58 },
    { name: "Mobil Krankenkasse", zusatz: 2.69 },
    { name: "Private Krankenversicherung", zusatz: 0 },
    { name: "Sonstige / manuell", zusatz: 2.50 },
  ];

  const BANKS = [
    "Sparkasse",
    "Stadtsparkasse München",
    "Berliner Sparkasse",
    "Commerzbank",
    "Deutsche Bank",
    "Postbank",
    "ING",
    "DKB",
    "Comdirect",
    "Consorsbank",
    "Volkswagen Bank",
    "Targobank",
    "HypoVereinsbank (UniCredit)",
    "VR-Bank",
    "Volksbank",
    "Raiffeisenbank",
    "Santander",
    "N26",
    "Andere Bank",
  ];

  /** Häufige Lohnarten inkl. VWL / Abzüge */
  const WAGE_PRESETS = [
    { code: "2000", label: "Gehalt", taxFlag: "L", svFlag: "L" },
    { code: "2100", label: "Stundenlohn", taxFlag: "L", svFlag: "L" },
    { code: "840", label: "Fahrgeld pauschal", taxFlag: "P", svFlag: "P" },
    { code: "2260", label: "Vermögenswirksame Leistungen (VWL)", taxFlag: "L", svFlag: "L" },
    { code: "9000", label: "Sonstiger Bezug", taxFlag: "L", svFlag: "L" },
    { code: "9900", label: "Abzug / Einbehalt (netto)", taxFlag: "F", svFlag: "N" },
  ];

  window.WorkPassCatalogs = {
    HEALTH_FUNDS,
    BANKS,
    WAGE_PRESETS,
    findHealthFund(name) {
      const n = String(name || "").trim().toLowerCase();
      return HEALTH_FUNDS.find((h) => h.name.toLowerCase() === n)
        || HEALTH_FUNDS.find((h) => h.name.toLowerCase().includes(n));
    },
  };
})();
