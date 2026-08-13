/**
 * Pull-first client for the live WorkPass platform APIs.
 *
 * Discovered live routes on suppix-ai-workpass.com
 * (not the fictional /api/workpass/.../export guesses):
 *   GET /api/v1/company          → X-Api-Key
 *   GET /api/companies           → auth required
 *   GET /api/contracts           → auth required
 *   GET /api/contracts/:id       → auth required
 *
 * Env:
 *   WORKPASS_PLATFORM_BASE_URL / WORKPASS_PLATFORM_URL / host from WEBHOOK_URL
 *   WORKPASS_PLATFORM_API_KEY (preferred) | WORKPASS_API_KEY | WORKPASS_PLATFORM_WEBHOOK_KEY
 *   WORKPASS_PLATFORM_PULL_TIMEOUT_MS
 */
import { PLATFORM_DOMAIN } from "./platform-config.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { normalizeEmployeeRecord } from "./employee-normalize.mjs";
import { deepFindByKey, deepFindNumberByKey, collectKeyPaths, KEY_RE } from "./field-deep-find.mjs";

function pick(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function lightHubFromPayload(data = {}, company = {}) {
  const branding = data.branding || company.branding || {};
  const hub = data.hubProfile || company.hubProfile || company.meta?.hubProfile || data.profile || {};
  const bank = data.bank || company.bank || hub.bank || branding.bank || {};
  const logoUrl = pick(hub.logoUrl, branding.logoUrl, data.logoUrl, company.logoUrl, branding.logo, hub.logo);
  const logoDataUrl = pick(hub.logoDataUrl, branding.logoDataUrl, data.logoDataUrl, company.logoDataUrl);
  const seller = pick(
    hub.seller,
    branding.seller,
    company.address,
    [pick(company.name, branding.name), pick(company.street), [pick(company.zip), pick(company.city)].filter(Boolean).join(" ")].filter(Boolean).join("\n")
  );
  const out = {
    seller: seller || undefined,
    logoUrl: /^https?:\/\//i.test(logoUrl) ? logoUrl : undefined,
    logoDataUrl: logoDataUrl || undefined,
    companyBankName: pick(hub.companyBankName, bank.name, bank.bankName) || undefined,
    companyIban: pick(hub.companyIban, bank.iban) || undefined,
    companyBic: pick(hub.companyBic, bank.bic) || undefined,
    commercialRegister: pick(hub.commercialRegister, company.commercialRegister) || undefined,
    managingDirector: pick(hub.managingDirector, company.managingDirector) || undefined,
    source: "platform-pull",
  };
  for (const [k, v] of Object.entries(out)) {
    if (v === undefined || v === "") delete out[k];
  }
  return Object.keys(out).length ? out : null;
}

export function platformBaseUrl() {
  const explicit = String(
    process.env.WORKPASS_PLATFORM_BASE_URL
    || process.env.WORKPASS_PLATFORM_URL
    || ""
  ).trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const webhook = String(process.env.WORKPASS_PLATFORM_WEBHOOK_URL || "").trim();
  if (webhook) {
    try {
      const u = new URL(webhook);
      return `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }
  }
  return `https://${PLATFORM_DOMAIN || "suppix-ai-workpass.com"}`;
}

export function resolvePlatformApiKeys() {
  const keys = [];
  const add = (value, source) => {
    const k = String(value || "").trim();
    if (!k || keys.some((x) => x.key === k)) return;
    keys.push({ key: k, source });
  };
  add(process.env.WORKPASS_PLATFORM_API_KEY, "WORKPASS_PLATFORM_API_KEY");
  add(process.env.WORKPASS_API_KEY, "WORKPASS_API_KEY");
  add(process.env.WORKPASS_PLATFORM_WEBHOOK_KEY, "WORKPASS_PLATFORM_WEBHOOK_KEY");
  return keys;
}

function authHeaderVariants(key) {
  return [
    { "X-Api-Key": key, "X-WorkPass-Key": key, Accept: "application/json" },
    { "X-Api-Key": key, Accept: "application/json" },
    { "X-WorkPass-Key": key, Accept: "application/json" },
    { Authorization: `Bearer ${key}`, Accept: "application/json" },
    {
      "X-WorkPass-Webhook-Key": key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  ];
}

async function fetchOnce(url, { method = "GET", headers = {}, body, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const init = { method, headers, signal: ctrl.signal };
    if (body != null) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return {
      ok: res.ok,
      status: res.status,
      json,
      text: text.slice(0, 400),
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e.name === "AbortError" ? "timeout" : (e.message || String(e)),
      json: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Try URL candidates × auth keys × header styles until JSON payload arrives.
 */
export async function platformGetJson(pathOrUrl, {
  query = {},
  timeoutMs = Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 8000),
  maxAttempts = 12,
} = {}) {
  const base = platformBaseUrl();
  const keys = resolvePlatformApiKeys();
  if (!keys.length) {
    return { ok: false, error: "Kein Plattform-API-Key (WORKPASS_PLATFORM_API_KEY / WORKPASS_API_KEY)" };
  }

  const path = String(pathOrUrl || "").trim();
  const absolute = /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const attempts = [];

  outer: for (const { key, source } of keys) {
    for (const headers of authHeaderVariants(key)) {
      const u = new URL(absolute);
      for (const [qk, qv] of Object.entries(query || {})) {
        if (qv == null || qv === "") continue;
        u.searchParams.set(qk, String(qv));
      }
      if (attempts.length >= maxAttempts) break outer;
      const result = await fetchOnce(u.toString(), {
        method: "GET",
        headers: {
          ...headers,
          "X-WorkPass-Company-Id": String(query.companyId || ""),
        },
        timeoutMs,
      });
      attempts.push({
        url: u.pathname,
        status: result.status,
        keySource: source,
        error: result.error || (result.json && result.json.error) || null,
      });
      if (result.ok && result.json) {
        return {
          ok: true,
          status: result.status,
          data: result.json,
          keySource: source,
          url: u.toString(),
          attempts,
        };
      }
      // Stop hammering on hard 404 for this path
      if (result.status === 404) break;
    }
  }

  return {
    ok: false,
    error: attempts.find((a) => a.error)?.error || "Plattform-GET ohne Daten",
    attempts,
  };
}

/** Collect employee-like objects from any platform JSON shape. */
export function collectEmployeesFromPayload(data) {
  if (!data || typeof data !== "object") return [];
  const bags = [
    data.employees,
    data.staff,
    data.mitarbeiter,
    data.batch?.employees,
    data.payroll?.employees,
    data.data?.employees,
    data.result?.employees,
    data.company?.employees,
  ];
  const list = [];
  for (const bag of bags) {
    if (Array.isArray(bag)) list.push(...bag);
  }
  if (data.employee && typeof data.employee === "object") list.push(data.employee);
  if (data.contract && typeof data.contract === "object") list.push(flattenContract(data.contract));
  if (Array.isArray(data.contracts)) {
    list.push(...data.contracts.map(flattenContract));
  }
  // Single employee document
  if (data.badgeId || data.employeeId || data.firstName || data.vorname) {
    list.push(data);
  }
  return list.filter(Boolean);
}

function flattenContract(contract = {}) {
  const emp = contract.employee && typeof contract.employee === "object" ? contract.employee : {};
  const bank = contract.bank || emp.bank || contract.payment || contract.bankAccount || contract.konto || {};
  const salary = contract.salary || contract.gehalt || contract.compensation || contract.payroll || {};
  const social = contract.socialInsurance || contract.sv || emp.socialInsurance || contract.insurance || {};
  const health = contract.healthInsurance || contract.krankenversicherung || emp.healthInsurance || {};
  const amount = Number(
    salary.amount
    ?? salary.brutto
    ?? salary.gross
    ?? salary.monthly
    ?? salary.base
    ?? contract.brutto
    ?? contract.grossSalary
    ?? contract.monthlySalary
    ?? contract.baseSalary
    ?? contract.gehalt
    ?? 0
  ) || 0;
  const hourlyRate = Number(
    salary.hourlyRate
    ?? salary.stundenlohn
    ?? salary.hourRate
    ?? contract.hourlyRate
    ?? contract.stundenlohn
    ?? emp.hourlyRate
    ?? emp.stundenlohn
    ?? deepFindNumberByKey(contract, KEY_RE.hourlyRate)
    ?? 0
  ) || 0;
  const merged = {
    ...emp,
    ...contract,
    badgeId: pick(emp.badgeId, emp.id, contract.badgeId, contract.employeeId, contract.workerId, contract.id),
    name: pick(emp.name, resolveName(emp), resolveName(contract)),
    firstName: pick(emp.firstName, emp.vorname, contract.firstName, contract.vorname),
    lastName: pick(emp.lastName, emp.nachname, contract.lastName, contract.nachname),
    taxClass: pick(emp.taxClass, contract.taxClass, contract.stkl, contract.steuerklasse),
    healthFund: pick(
      emp.healthFund,
      contract.healthFund,
      contract.krankenkasse,
      contract.krankenkassenName,
      contract.kk,
      health.name,
      health.fund,
      health.krankenkasse,
      health.provider,
      deepFindByKey(contract, KEY_RE.healthFund)
    ),
    insuranceNo: pick(
      emp.insuranceNo,
      contract.insuranceNo,
      contract.svNr,
      contract.svNummer,
      contract.socialSecurityNo,
      contract.socialSecurityNumber,
      contract.versicherungsnummer,
      social.number,
      social.nr,
      social.svNr,
      social.versicherungsnummer,
      deepFindByKey(contract, KEY_RE.insuranceNo)
    ),
    birthDate: pick(emp.birthDate, contract.birthDate, contract.geburtsdatum),
    entryDate: pick(emp.entryDate, contract.entryDate, contract.startDate, contract.eintritt),
    bankName: pick(bank.name, bank.bankName, bank.bank, bank.institut, contract.bankName),
    bankIban: pick(bank.iban, bank.bankIban, bank.IBAN, contract.iban, contract.bankIban),
    bank: bank,
    hourlyRate: hourlyRate || undefined,
    stundenlohn: hourlyRate || undefined,
    grossSalary: amount || undefined,
    wageItems: amount
      ? [{ code: "2000", label: pick(salary.label, "Gehalt laut Vertrag"), amount, taxFlag: "L", svFlag: "L" }]
      : (Array.isArray(contract.wageItems) ? contract.wageItems : undefined),
    source: "contract",
  };
  return merged;
}

function resolveName(obj = {}) {
  return pick(
    obj.name,
    obj.displayName,
    obj.fullName,
    [obj.firstName || obj.vorname, obj.lastName || obj.nachname || obj.surname].filter(Boolean).join(" ")
  );
}

/** Score how useful a pulled row is (prefer full contracts over id-only stubs). */
export function employeeRowRichness(row) {
  if (!row || typeof row !== "object") return 0;
  const n = normalizeEmployeeRecord(row);
  let score = 0;
  if (n.name) score += 2;
  if (n.insuranceNo) score += 3;
  if (n.healthFund) score += 3;
  if (n.bankIban || n.bankName) score += 3;
  if (n.taxClass) score += 1;
  if (n.grossSalary || (Array.isArray(row.wageItems) && row.wageItems.length)) score += 4;
  if (n.address) score += 1;
  if (row.source === "contract" || row.salary || row.gehalt || row.contract) score += 2;
  return score;
}

/** Prefer one employee matching badge/id; among matches, richest wins. */
export function pickEmployeeRow(rows, employeeId) {
  const eid = normalizeEmployeeId(employeeId);
  if (!rows?.length) return null;
  const scored = rows.map((row) => {
    const n = normalizeEmployeeRecord(row);
    const id = normalizeEmployeeId(n.badgeId || row.badgeId || row.id || row.employeeId || "");
    const idMatch = !eid || (id && id === eid);
    return { row, idMatch, richness: employeeRowRichness(row) };
  });
  const matches = scored.filter((s) => s.idMatch);
  const pool = matches.length ? matches : scored;
  pool.sort((a, b) => b.richness - a.richness);
  return pool[0]?.row || rows[0];
}

/** Snapshot of which master fields a row actually carries (no secret values). */
export function employeeRowFieldFlags(row) {
  const n = normalizeEmployeeRecord(row || {});
  const hourly = Number(n.hourlyRate || row?.hourlyRate || row?.stundenlohn) || 0;
  return {
    name: Boolean(n.name),
    insuranceNo: Boolean(n.insuranceNo),
    healthFund: Boolean(n.healthFund),
    bankName: Boolean(n.bankName),
    bankIban: Boolean(n.bankIban),
    taxClass: Boolean(n.taxClass),
    hourlyRate: hourly > 0,
    grossSalary: Boolean(n.grossSalary || (Array.isArray(row?.wageItems) && row.wageItems.some((w) => Number(w?.amount) > 0))),
    richness: employeeRowRichness(row),
    keyPaths: collectKeyPaths(row).slice(0, 40),
  };
}

/**
 * Pull company profile + branding/logo from platform (GET, never "ask").
 */
export async function pullCompanyProfile(companyId) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };

  const candidates = [
    "/api/v1/company",
    `/api/v1/company/${encodeURIComponent(cid)}`,
    "/api/companies",
    `/api/companies/${encodeURIComponent(cid)}`,
    "/api/company",
    `/api/company/${encodeURIComponent(cid)}`,
    "/api/v1/branding",
    `/api/companies/${encodeURIComponent(cid)}/branding`,
    `/api/companies/${encodeURIComponent(cid)}/logo`,
  ];

  const attempts = [];
  for (const path of candidates) {
    const result = await platformGetJson(path, {
      query: { companyId: cid, id: cid },
      maxAttempts: 6,
    });
    attempts.push(...(result.attempts || [{ path, error: result.error }]));
    if (!result.ok) continue;
    const data = result.data;
    const company =
      data.company
      || data.firm
      || data.profile
      || data.data?.company
      || (data.id || data.name ? data : null);
    if (!company && !data.hubProfile && !data.branding && !data.logoUrl) continue;
    const hub = lightHubFromPayload(data, company || {});
    return {
      ok: true,
      company: company || { id: cid },
      hubProfile: hub,
      raw: data,
      url: result.url,
      keySource: result.keySource,
      attempts,
    };
  }

  return { ok: false, error: "Firmenprofil/Branding nicht per GET erreichbar", attempts };
}

/**
 * Pull one employee including contract master data.
 */
export async function pullEmployeeBundle({ companyId, employeeId, period } = {}) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  if (!eid) return { ok: false, error: "employeeId fehlt" };

  const candidates = [
    `/api/contracts/${encodeURIComponent(eid)}`,
    "/api/contracts",
    `/api/companies/${encodeURIComponent(cid)}/contracts`,
    `/api/companies/${encodeURIComponent(cid)}/employees/${encodeURIComponent(eid)}`,
    `/api/companies/${encodeURIComponent(cid)}/employees`,
    "/api/employees",
    `/api/employees/${encodeURIComponent(eid)}`,
    "/api/v1/employees",
    `/api/v1/employees/${encodeURIComponent(eid)}`,
    "/api/v1/contracts",
    `/api/v1/contracts/${encodeURIComponent(eid)}`,
    "/api/workpass/employees/export",
    "/api/workpass/contracts/export",
    "/api/workpass/payroll/export",
  ];

  const attempts = [];
  const collected = [];
  let bestUrl = null;
  let bestKeySource = null;
  let bestRaw = null;

  // Collect from ALL reachable endpoints, then pick the richest matching row.
  // Returning on first thin list item was causing empty Stammdaten merges.
  for (const path of candidates) {
    const result = await platformGetJson(path, {
      query: {
        companyId: cid,
        id: eid,
        employeeId: eid,
        badgeId: eid,
        period: period || "",
        allowIncomplete: "1",
      },
      maxAttempts: 4,
    });
    attempts.push(...(result.attempts || [{ path, error: result.error }]));
    if (!result.ok) continue;
    const rows = collectEmployeesFromPayload(result.data);
    if (rows.length) {
      collected.push(...rows);
      bestUrl = result.url;
      bestKeySource = result.keySource;
      bestRaw = result.data;
    }
  }

  if (collected.length) {
    const match = pickEmployeeRow(collected, eid) || collected[0];
    return {
      ok: true,
      employee: normalizeEmployeeRecord(match),
      row: match,
      rows: collected,
      fieldFlags: employeeRowFieldFlags(match),
      raw: bestRaw,
      url: bestUrl,
      keySource: bestKeySource,
      attempts,
    };
  }

  const authOnly = attempts.length > 0 && attempts.every((a) => a.status === 401 || a.status === 403);
  return {
    ok: false,
    error: authOnly
      ? "unauthorized"
      : "Mitarbeiter/Vertrag nicht per GET gefunden",
    authDenied: authOnly,
    attempts,
  };
}

/**
 * Pull worked hours for one employee in a payroll period.
 */
export async function pullMonthAttendance({ companyId, employeeId, period } = {}) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  const per = String(period || "").trim();
  if (!cid || !eid || !per) {
    return { ok: false, skipped: true, error: "companyId/employeeId/period fehlt" };
  }

  const candidates = [
    `/api/companies/${encodeURIComponent(cid)}/employees/${encodeURIComponent(eid)}/hours`,
    `/api/companies/${encodeURIComponent(cid)}/employees/${encodeURIComponent(eid)}/attendance`,
    `/api/employees/${encodeURIComponent(eid)}/hours`,
    `/api/employees/${encodeURIComponent(eid)}/attendance`,
    "/api/attendance",
    "/api/timesheets",
    "/api/hours",
    "/api/v1/attendance",
    "/api/v1/hours",
    "/api/v1/timesheets",
    "/api/workpass/payroll/export",
  ];

  const attempts = [];
  for (const path of candidates) {
    const result = await platformGetJson(path, {
      query: {
        companyId: cid,
        employeeId: eid,
        badgeId: eid,
        id: eid,
        period: per,
        month: per,
        allowIncomplete: "1",
      },
      maxAttempts: 3,
    });
    attempts.push(...(result.attempts || [{ path, error: result.error }]));
    if (!result.ok) continue;
    const data = result.data || {};
    const attendance = data.attendance || data.timesheet || data.hours || data.data?.attendance || {};
    const hours = Number(
      attendance.hours
      ?? attendance.stunden
      ?? data.hours
      ?? data.stunden
      ?? data.workedHours
      ?? data.totalHours
      ?? deepFindNumberByKey(data, KEY_RE.monthHours)
      ?? 0
    ) || 0;
    const days = Number(
      attendance.days
      ?? attendance.arbeitstage
      ?? data.days
      ?? data.workDays
      ?? deepFindNumberByKey(data, KEY_RE.workDays)
      ?? 0
    ) || 0;

    // Also accept payroll batch shape with this employee
    const rows = collectEmployeesFromPayload(data);
    const match = pickEmployeeRow(rows, eid);
    const fromRowHours = Number(
      match?.attendance?.hours
      ?? match?.workHours
      ?? match?.hours
      ?? match?.stunden
      ?? 0
    ) || 0;
    const fromRowDays = Number(match?.attendance?.days ?? match?.workDays ?? match?.days ?? 0) || 0;
    const h = hours || fromRowHours;
    const d = days || fromRowDays;
    if (h > 0 || d > 0) {
      return {
        ok: true,
        hours: h,
        days: d,
        url: result.url,
        keySource: result.keySource,
        attempts,
      };
    }
  }

  return { ok: false, error: "Keine Monatsstunden von der Plattform", attempts };
}

/**
 * If webhook 200 body already contains company/employee payload, use it (no second round-trip).
 */
export function extractInlineReply(body) {
  if (!body || typeof body !== "object") return null;
  const nested = body.data && typeof body.data === "object" ? body.data : null;
  const src = nested || body;
  const company = src.company || src.firm || body.company || null;
  const hubProfile = lightHubFromPayload(src, company || {});
  const employees = collectEmployeesFromPayload(src);
  if (!company && !hubProfile && !employees.length) return null;
  return { company, hubProfile, employees, raw: body };
}
