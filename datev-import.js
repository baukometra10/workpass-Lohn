/** DATEV CSV / LODAS Import für FinanzDokument Pro */
(function () {
  const CSV_HEADER_ALIASES = {
    mandant: ["mandant"],
    employeeId: ["personalnummer", "pers-nr", "persnr", "personal-nr"],
    employeeName: ["mitarbeiter", "mitarbeitername", "name"],
    payrollMonth: ["abrechnungsmonat", "monat", "periode"],
    gross: ["brutto", "gesamt-brutto", "gesamtbrutto"],
    payrollTax: ["lohnsteuer", "lst"],
    churchTax: ["kirchensteuer", "kist"],
    solidarity: ["solidaritaetszuschlag", "solidaritätszuschlag", "soli"],
    health: ["kv", "kv-beitrag", "krankenversicherung"],
    pension: ["rv", "rv-beitrag", "rentenversicherung"],
    care: ["pv", "pv-beitrag", "pflegeversicherung"],
    unemployment: ["av", "av-beitrag", "arbeitslosenversicherung"],
    net: ["netto", "netto-verdienst", "auszahlungsbetrag"],
    taxClass: ["steuerklasse", "stkl", "st.kl."],
    employeeInsuranceNo: ["sv-nummer", "sv nummer", "versicherungsnummer"],
    healthFund: ["krankenkasse", "kk"],
    workHours: ["stunden", "anw-std", "anw std"],
    workDays: ["arbeitstage", "anw-tage", "anw tage"],
  };

  const LODAS_HEADER = ["personal-nr", "lohnart-nr", "betrag", "abrechnungsmonat", "name"];

  function normHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "");
  }

  function parseGermanNumber(value) {
    if (value == null || value === "") return 0;
    const raw = String(value).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  function taxClassFromCsv(value) {
    const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };
    const raw = String(value || "").trim().toUpperCase();
    if (map[raw]) return map[raw];
    if (/^[IVX]+$/.test(raw)) return raw;
    const digit = raw.replace(/\D/g, "");
    return map[digit] || "I";
  }

  function parsePayrollMonth(value) {
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    if (/^\d{2}\.\d{4}$/.test(raw)) {
      const [mm, yyyy] = raw.split(".");
      return `${yyyy}-${mm}`;
    }
    if (/^\d{2}\/\d{4}$/.test(raw)) {
      const [mm, yyyy] = raw.split("/");
      return `${yyyy}-${mm}`;
    }
    if (/^\d{6}$/.test(raw)) {
      const mm = raw.slice(0, 2);
      const yyyy = raw.slice(2);
      return `${yyyy}-${mm}`;
    }
    if (/^\d{4}\d{2}$/.test(raw)) {
      return `${raw.slice(0, 4)}-${raw.slice(4)}`;
    }
    return raw;
  }

  function splitCsvLine(line, sep) {
    const parts = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if ((ch === sep || ch === "\t") && !inQuotes) {
        parts.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    parts.push(cur.trim());
    return parts;
  }

  function detectSeparator(firstLine) {
    const semi = (firstLine.match(/;/g) || []).length;
    const comma = (firstLine.match(/,/g) || []).length;
    return semi >= comma ? ";" : ",";
  }

  function mapHeaderIndex(headers) {
    const index = {};
    headers.forEach((h, i) => {
      const key = normHeader(h);
      Object.entries(CSV_HEADER_ALIASES).forEach(([field, aliases]) => {
        if (aliases.some((a) => key === normHeader(a) || key.includes(normHeader(a)))) {
          if (index[field] == null) index[field] = i;
        }
      });
    });
    return index;
  }

  function isLodasMovement(headers) {
    const norm = headers.map(normHeader);
    return LODAS_HEADER.every((need, i) => norm[i] === need || norm.includes(need));
  }

  function parseLodasCsv(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const sep = detectSeparator(lines[0]);
    const headers = splitCsvLine(lines[0], sep).map((h) => normHeader(h));
    const idx = {
      employeeId: headers.findIndex((h) => h.includes("personal")),
      wageCode: headers.findIndex((h) => h.includes("lohnart")),
      amount: headers.findIndex((h) => h.includes("betrag")),
      month: headers.findIndex((h) => h.includes("abrechnungsmonat") || h === "monat"),
      name: headers.findIndex((h) => h === "name" || h.includes("mitarbeiter")),
    };
    if (idx.wageCode < 0 || idx.amount < 0) return null;

    const wageItems = [];
    let employeeId = "";
    let employeeName = "";
    let payrollMonth = "";

    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i], sep);
      const code = String(cols[idx.wageCode] || "").trim();
      const amount = parseGermanNumber(cols[idx.amount]);
      if (!code || amount === 0) continue;
      if (!employeeId && idx.employeeId >= 0) employeeId = cols[idx.employeeId] || "";
      if (!employeeName && idx.name >= 0) employeeName = cols[idx.name] || "";
      if (!payrollMonth && idx.month >= 0) payrollMonth = parsePayrollMonth(cols[idx.month]);
      wageItems.push({
        code,
        label: code === "840" ? "Fahrgeld p. v. 25%" : code === "2000" ? "Gehalt" : `Lohnart ${code}`,
        quantity: 1,
        factor: amount,
        amount,
        taxFlag: code === "840" ? "P" : "L",
        svFlag: code === "840" ? "P" : "L",
      });
    }

    if (!wageItems.length) return null;
    const gross = wageItems.reduce((s, w) => s + w.amount, 0);
    return {
      documentType: "payroll",
      payrollLayout: "datev",
      payroll: {
        employeeId,
        employeeName,
        payrollMonth,
        grossSalary: String(gross),
        wageItems,
      },
    };
  }

  function parseStandardDatevCsv(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const sep = detectSeparator(lines[0]);
    const headers = splitCsvLine(lines[0], sep);
    const idx = mapHeaderIndex(headers);
    if (idx.employeeId == null && idx.employeeName == null && idx.gross == null) return null;

    const cols = splitCsvLine(lines[1], sep);
    const get = (field) => (idx[field] != null ? cols[idx[field]] : "");

    const gross = parseGermanNumber(get("gross"));
    const payroll = {
      employeeId: get("employeeId"),
      employeeName: get("employeeName"),
      payrollMonth: parsePayrollMonth(get("payrollMonth")),
      grossSalary: gross > 0 ? String(gross) : "",
      taxClass: taxClassFromCsv(get("taxClass")),
      employeeInsuranceNo: get("employeeInsuranceNo"),
      healthFund: get("healthFund"),
      workHours: get("workHours"),
      workDays: get("workDays"),
      wageItems: gross > 0
        ? [{ code: "2000", label: "Gehalt", quantity: 1, factor: gross, amount: gross, taxFlag: "L", svFlag: "L" }]
        : [],
    };

    const importedTotals = {
      payrollTax: parseGermanNumber(get("payrollTax")),
      churchTax: parseGermanNumber(get("churchTax")),
      solidarity: parseGermanNumber(get("solidarity")),
      health: parseGermanNumber(get("health")),
      pension: parseGermanNumber(get("pension")),
      care: parseGermanNumber(get("care")),
      unemployment: parseGermanNumber(get("unemployment")),
      net: parseGermanNumber(get("net")),
      gross,
    };

    return {
      documentType: "payroll",
      payrollLayout: "datev",
      payroll,
      meta: {
        importedFrom: "datev-csv",
        importedTotals,
      },
    };
  }

  function parseDatevCsvText(text) {
    const lodas = parseLodasCsv(text);
    if (lodas) return { draft: lodas, format: "LODAS-Bewegungsdaten", totals: lodas.meta?.importedTotals };
    const standard = parseStandardDatevCsv(text);
    if (standard) return { draft: standard, format: "DATEV-CSV", totals: standard.meta?.importedTotals };
    return null;
  }

  /** Plattform-JSON (platform.payroll.v1) oder Legacy-Draft */
  function parsePlatformJsonText(text) {
    if (!window.PayrollCore?.ingestPlatformPayload) {
      throw new Error("PayrollCore nicht geladen");
    }
    return window.PayrollCore.ingestPlatformPayload(text);
  }

  window.DatevImport = {
    parseDatevCsvText,
    parsePlatformJsonText,
    parseGermanNumber,
    parsePayrollMonth,
    taxClassFromCsv,
  };
})();
