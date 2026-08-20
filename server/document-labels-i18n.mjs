/**
 * Localized document titles for platform Antrag / inbox (UI languages).
 * Legal PDF body stays German; these strings are display labels only.
 * Locales: de, en, tr, ar, fr, es, it, pl
 */

export const SUPPORTED_LOCALES = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];

/** German source of truth (always sent as *De aliases). */
const TITLES_DE = {
  payslip: "Lohnabrechnung",
  payroll: "Lohnabrechnung",
  lstb: "Lohnsteuerbescheinigung",
  verdienst: "Verdienstbescheinigung",
  vb: "Verdienstbescheinigung",
  invoice: "Rechnung",
};

const TITLES = {
  de: { ...TITLES_DE },
  en: {
    payslip: "Payslip",
    payroll: "Payslip",
    lstb: "Wage tax certificate",
    verdienst: "Earnings certificate",
    vb: "Earnings certificate",
    invoice: "Invoice",
  },
  tr: {
    payslip: "Maaş bordrosu",
    payroll: "Maaş bordrosu",
    lstb: "Ücret vergisi belgesi",
    verdienst: "Kazanç belgesi",
    vb: "Kazanç belgesi",
    invoice: "Fatura",
  },
  ar: {
    payslip: "كشف الراتب",
    payroll: "كشف الراتب",
    lstb: "شهادة ضريبة الأجور",
    verdienst: "شهادة الدخل",
    vb: "شهادة الدخل",
    invoice: "فاتورة",
  },
  fr: {
    payslip: "Bulletin de paie",
    payroll: "Bulletin de paie",
    lstb: "Attestation d'impôt sur les salaires",
    verdienst: "Attestation de revenus",
    vb: "Attestation de revenus",
    invoice: "Facture",
  },
  es: {
    payslip: "Nómina",
    payroll: "Nómina",
    lstb: "Certificado de impuesto salarial",
    verdienst: "Certificado de ingresos",
    vb: "Certificado de ingresos",
    invoice: "Factura",
  },
  it: {
    payslip: "Cedolino",
    payroll: "Cedolino",
    lstb: "Certificato di imposta sul lavoro",
    verdienst: "Attestato di reddito",
    vb: "Attestato di reddito",
    invoice: "Fattura",
  },
  pl: {
    payslip: "Lista płac",
    payroll: "Lista płac",
    lstb: "Zaświadczenie o podatku od wynagrodzeń",
    verdienst: "Zaświadczenie o zarobkach",
    vb: "Zaświadczenie o zarobkach",
    invoice: "Faktura",
  },
};

export function normalizeUiLocale(raw) {
  const s = String(raw || "").trim().toLowerCase().replace("_", "-");
  if (!s) return "de";
  const two = s.slice(0, 2);
  if (SUPPORTED_LOCALES.includes(two)) return two;
  if (s.startsWith("de")) return "de";
  return "de";
}

/** Resolve locale from request-ish sources (body, headers, session, company). */
export function resolveUiLocale(...sources) {
  for (const src of sources) {
    if (src == null || src === "") continue;
    if (typeof src === "object") {
      const headers = src.headers && typeof src.headers === "object" ? src.headers : src;
      const cand = src.locale || src.language || src.preferredLocale || src.lang
        || headers["x-workpass-locale"]
        || headers["X-WorkPass-Locale"]
        || headers["accept-language"]
        || headers["Accept-Language"];
      if (cand) {
        const first = String(cand).split(",")[0].trim();
        return normalizeUiLocale(first);
      }
      continue;
    }
    const first = String(src).split(",")[0].trim();
    if (first) return normalizeUiLocale(first);
  }
  return "de";
}

export function documentTitleForTypeLocalized(documentType, locale = "de") {
  const t = String(documentType || "").toLowerCase();
  const loc = normalizeUiLocale(locale);
  const table = TITLES[loc] || TITLES.de;
  if (t === "lstb") return table.lstb;
  if (t === "verdienst" || t === "vb" || t === "vordienst") return table.verdienst;
  if (t === "invoice") return table.invoice;
  if (t === "payslip" || t === "payroll") return table.payslip;
  return loc === "de" ? "Dokument" : (TITLES.en.payslip ? "Document" : "Dokument");
}

export function documentTitleDeForType(documentType) {
  const t = String(documentType || "").toLowerCase();
  if (t === "lstb") return TITLES_DE.lstb;
  if (t === "verdienst" || t === "vb" || t === "vordienst") return TITLES_DE.verdienst;
  if (t === "invoice") return TITLES_DE.invoice;
  if (t === "payslip" || t === "payroll") return TITLES_DE.payslip;
  return "Dokument";
}

export function buildDocumentDisplayTitleLocalized(documentType, periodOrRef = "", locale = "de") {
  const base = documentTitleForTypeLocalized(documentType, locale);
  const ref = String(periodOrRef || "").trim();
  return ref ? `${base} ${ref}` : base;
}
