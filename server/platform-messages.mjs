/**
 * Platform ↔ Accounting communication session.
 * Missing data (IBAN, Steuer-Nr., …) creates messages for the platform inbox.
 * When the platform marks a message read/acked, it disappears from pending.
 */
import crypto from "node:crypto";
import {
  sqliteExec,
  sqliteGet,
  sqliteAll,
  openSqlite,
} from "./db/sqlite.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { notifyPlatform } from "./notify.mjs";
import { encryptJson, decryptJson, isEncryptedBlob } from "./security/crypto.mjs";

openSqlite();

function now() {
  return new Date().toISOString();
}

function pack(obj) {
  return encryptJson(obj);
}

function unpack(raw) {
  if (raw == null) return null;
  if (isEncryptedBlob(raw)) return decryptJson(raw, null);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Map German validation texts → stable gap codes for the platform UI */
const GAP_MAP = [
  { re: /iban/i, code: "iban_missing", field: "bank.iban", label: "IBAN fehlt" },
  { re: /bank fehlt/i, code: "bank_missing", field: "bank.name", label: "Bank fehlt" },
  { re: /steuer-?nr\.? der firma|steuernummer/i, code: "company_tax_number_missing", field: "company.taxNumber", label: "Steuer-Nr. der Firma fehlt" },
  { re: /sv-?nummer|versicherungs/i, code: "insurance_no_missing", field: "employee.insuranceNo", label: "SV-Nummer fehlt" },
  { re: /geburtsdatum/i, code: "birth_date_missing", field: "employee.birthDate", label: "Geburtsdatum fehlt" },
  { re: /krankenkasse/i, code: "health_fund_missing", field: "employee.healthFund", label: "Krankenkasse fehlt" },
  { re: /pers\.?-?nr|personal/i, code: "employee_id_missing", field: "employee.id", label: "Pers.-Nr. fehlt" },
  { re: /steuerklasse/i, code: "tax_class_missing", field: "employee.taxClass", label: "Steuerklasse fehlt" },
  { re: /mitarbeitername/i, code: "employee_name_missing", field: "employee.name", label: "Mitarbeitername fehlt" },
  { re: /brutto/i, code: "gross_missing", field: "wageItems", label: "Brutto / Lohnarten fehlen" },
  { re: /arbeitgeber|firma fehlt/i, code: "company_name_missing", field: "company.name", label: "Firma fehlt" },
  { re: /abrechnungsmonat|period/i, code: "period_missing", field: "period", label: "Abrechnungsmonat fehlt" },
];

export function classifyGapText(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  for (const g of GAP_MAP) {
    if (g.re.test(t)) {
      return { code: g.code, field: g.field, label: g.label, detail: t };
    }
  }
  return {
    code: "other",
    field: "unknown",
    label: t,
    detail: t,
  };
}

export function gapsFromTexts(texts = [], severity = "warning") {
  const out = [];
  const seen = new Set();
  for (const text of texts || []) {
    const g = classifyGapText(text);
    if (!g || seen.has(g.code)) continue;
    seen.add(g.code);
    out.push({ ...g, severity });
  }
  return out;
}

function messageId() {
  return `msg:${Date.now().toString(36)}:${crypto.randomBytes(4).toString("hex")}`;
}

function dedupeKey({ companyId, employeeId, period, code, type }) {
  return [
    normalizeCompanyId(companyId) || "-",
    normalizeEmployeeId(employeeId) || "-",
    String(period || "-"),
    String(type || "data.gap"),
    String(code || "other"),
  ].join("::");
}

function rowToMessage(row) {
  if (!row) return null;
  const payload = unpack(row.payload_json) || {};
  return {
    ...payload,
    messageId: row.message_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at || null,
    resolvedAt: row.resolved_at || null,
  };
}

/**
 * Create or refresh an open message (idempotent per dedupe key).
 * Notifies platform webhook when newly created or gaps change.
 */
export async function upsertPlatformMessage(input = {}, opts = {}) {
  const companyId = normalizeCompanyId(input.company?.id || input.companyId || "");
  if (!companyId) return { ok: false, error: "company.id fehlt", message: null };

  const employeeId = normalizeEmployeeId(input.employee?.id || input.employeeId || "");
  const period = String(input.period || "").trim();
  const type = String(input.type || "data.gap");
  const direction = input.direction === "platform_to_accounting"
    ? "platform_to_accounting"
    : "accounting_to_platform";
  const gaps = Array.isArray(input.gaps) ? input.gaps : [];
  const primaryCode = gaps[0]?.code || input.code || "info";
  const key = String(input.dedupeKey || dedupeKey({
    companyId,
    employeeId,
    period,
    code: primaryCode,
    type,
  }));

  const existing = key
    ? sqliteGet(
      `SELECT * FROM platform_messages WHERE dedupe_key = ? AND status = 'open' LIMIT 1`,
      [key]
    )
    : null;

  const ts = now();
  const title = String(input.title || (
    gaps.length
      ? `Fehlende Daten: ${gaps.map((g) => g.label).join(", ")}`
      : "Nachricht von der Buchhaltung"
  ));
  const body = String(input.body || (
    gaps.length
      ? `Bitte in der Plattform ergänzen und erneut an die Buchhaltung senden.\n• ${gaps.map((g) => g.label).join("\n• ")}`
      : ""
  ));

  const payload = {
    kind: "platform.accounting.message.v1",
    schemaVersion: 2,
    messageId: existing?.message_id || messageId(),
    direction,
    type,
    severity: input.severity || (gaps.some((g) => g.severity === "action_needed") ? "action_needed" : "warning"),
    status: "open",
    company: {
      id: companyId,
      name: String(input.company?.name || input.companyName || "").trim(),
    },
    employee: {
      id: employeeId,
      name: String(input.employee?.name || input.employeeName || "").trim(),
    },
    period,
    jobId: input.jobId || null,
    gaps,
    title,
    body,
    actions: [
      {
        id: "open_employee",
        label: "Mitarbeiter öffnen",
        route: employeeId
          ? `/company/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}`
          : `/company/${encodeURIComponent(companyId)}`,
      },
      {
        id: "resend_payroll",
        label: "Lohn erneut senden",
        method: "POST",
        path: "/v1/payroll/ingest",
      },
      {
        id: "mark_read",
        label: "Gelesen",
        method: "POST",
        path: `/v1/messages/${encodeURIComponent(existing?.message_id || "")}/ack`,
      },
    ],
    createdAt: existing?.created_at || ts,
    updatedAt: ts,
    source: input.source || "accounting",
  };
  // fix ack path with final id
  payload.actions = payload.actions.map((a) => (
    a.id === "mark_read"
      ? { ...a, path: `/v1/messages/${encodeURIComponent(payload.messageId)}/ack` }
      : a
  ));

  if (existing) {
    sqliteExec(
      `UPDATE platform_messages SET
         payload_json = ?, updated_at = ?, employee_id = ?, period = ?, type = ?
       WHERE message_id = ?`,
      [pack(payload), ts, employeeId, period, type, existing.message_id]
    );
  } else {
    sqliteExec(
      `INSERT INTO platform_messages(
         message_id, company_id, employee_id, period, direction, status, type,
         dedupe_key, payload_json, created_at, updated_at, read_at, resolved_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)`,
      [
        payload.messageId,
        companyId,
        employeeId,
        period,
        direction,
        "open",
        type,
        key,
        pack(payload),
        ts,
        ts,
      ]
    );
  }

  const message = loadMessage(payload.messageId);
  let platformNotify = null;
  if (opts.notify !== false && direction === "accounting_to_platform") {
    platformNotify = await notifyPlatform({
      event: "accounting.message",
      company: payload.company,
      message,
      delivery: {
        kind: "platform.employee.delivery.v1",
        type: "message",
        deliveryId: `msg:${payload.messageId}`,
        status: "action_needed",
        releasedAt: ts,
        company: payload.company,
        employee: payload.employee,
        period: payload.period,
        title: payload.title,
        document: message,
        appRoute: `/company/${encodeURIComponent(companyId)}/messages/${encodeURIComponent(payload.messageId)}`,
      },
      meta: {
        gapCodes: gaps.map((g) => g.code),
        severity: payload.severity,
      },
    });
  }

  return {
    ok: true,
    created: !existing,
    updated: Boolean(existing),
    message,
    platformNotify,
  };
}

/**
 * From payroll state / validation texts → open messages + notify platform.
 */
export async function notifyGapsForPayroll({ state, hard = [], soft = [], jobId, companyName } = {}) {
  const companyId = normalizeCompanyId(state?.mandantId || state?.meta?.companyId || "");
  if (!companyId) return { ok: false, error: "company.id fehlt", messages: [] };

  const hardGaps = gapsFromTexts(hard, "action_needed");
  const softGaps = gapsFromTexts(soft, "warning");
  const gaps = [...hardGaps, ...softGaps.filter((g) => !hardGaps.some((h) => h.code === g.code))];
  if (!gaps.length) {
    // resolve previous open gap messages for this employee/period when data is complete
    const resolved = resolveOpenGaps({
      companyId,
      employeeId: state?.employeeId,
      period: state?.payrollMonth,
      remainingCodes: [],
    });
    return { ok: true, messages: [], resolved, skipped: true };
  }

  const results = [];
  for (const gap of gaps) {
    const r = await upsertPlatformMessage({
      type: "data.gap",
      severity: gap.severity,
      company: { id: companyId, name: companyName || state?.companyName || "" },
      employee: { id: state?.employeeId, name: state?.employeeName },
      period: state?.payrollMonth,
      jobId,
      gaps: [gap],
      title: `${gap.label}${state?.employeeName ? ` · ${state.employeeName}` : ""}`,
      body:
        `Die Buchhaltung (WorkPass Lohn) braucht fehlende Angaben, um die Abrechnung fertigzustellen.\n\n`
        + `Feld: ${gap.field}\n`
        + `Mitarbeiter: ${state?.employeeName || "—"} (${state?.employeeId || "—"})\n`
        + `Monat: ${state?.payrollMonth || "—"}\n\n`
        + `Bitte in der Plattform ergänzen. Danach erneut an die Buchhaltung senden – die Meldung verschwindet nach dem Lesen bzw. wenn die Daten vollständig sind.`,
      source: "payroll-validate",
    });
    results.push(r);
  }

  // Resolve gaps that are no longer present
  const resolved = resolveOpenGaps({
    companyId,
    employeeId: state?.employeeId,
    period: state?.payrollMonth,
    remainingCodes: gaps.map((g) => g.code),
  });

  return {
    ok: true,
    messages: results.map((r) => r.message).filter(Boolean),
    created: results.filter((r) => r.created).length,
    resolved,
  };
}

export function resolveOpenGaps({ companyId, employeeId, period, remainingCodes = [] }) {
  const cid = normalizeCompanyId(companyId);
  const eid = normalizeEmployeeId(employeeId);
  const per = String(period || "").trim();
  if (!cid) return [];

  let sql = `SELECT * FROM platform_messages WHERE company_id = ? AND status = 'open' AND type = 'data.gap'`;
  const params = [cid];
  if (eid) {
    sql += ` AND employee_id = ?`;
    params.push(eid);
  }
  if (per) {
    sql += ` AND period = ?`;
    params.push(per);
  }
  const rows = sqliteAll(sql, params);
  const keep = new Set(remainingCodes);
  const resolved = [];
  const ts = now();
  for (const row of rows) {
    const msg = rowToMessage(row);
    const code = msg?.gaps?.[0]?.code || "other";
    if (keep.has(code)) continue;
    sqliteExec(
      `UPDATE platform_messages SET status = 'resolved', resolved_at = ?, updated_at = ?, payload_json = ? WHERE message_id = ?`,
      [
        ts,
        ts,
        pack({ ...msg, status: "resolved", resolvedAt: ts, updatedAt: ts }),
        row.message_id,
      ]
    );
    resolved.push(row.message_id);
  }
  return resolved;
}

export function loadMessage(messageId) {
  const row = sqliteGet(`SELECT * FROM platform_messages WHERE message_id = ?`, [String(messageId || "")]);
  return rowToMessage(row);
}

export function listMessages(filter = {}) {
  let sql = `SELECT * FROM platform_messages WHERE 1=1`;
  const params = [];
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  if (filter.status) {
    sql += ` AND status = ?`;
    params.push(String(filter.status));
  } else if (filter.openOnly) {
    sql += ` AND status = 'open'`;
  }
  if (filter.direction) {
    sql += ` AND direction = ?`;
    params.push(String(filter.direction));
  }
  sql += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(Number(filter.limit) || 100);
  return sqliteAll(sql, params).map(rowToMessage).filter(Boolean);
}

export function listPendingMessagesForPlatform(filter = {}) {
  return listMessages({
    companyId: filter.companyId,
    status: "open",
    direction: "accounting_to_platform",
    limit: filter.limit || 100,
  });
}

/**
 * Platform marks message as read → disappears from pending inbox.
 */
export function ackMessage(messageId, meta = {}) {
  const row = sqliteGet(`SELECT * FROM platform_messages WHERE message_id = ?`, [String(messageId || "")]);
  if (!row) return { ok: false, error: "Nachricht nicht gefunden" };
  const msg = rowToMessage(row);
  if (msg.status === "read" || msg.status === "resolved") {
    return { ok: true, already: true, message: msg };
  }
  const ts = now();
  const next = {
    ...msg,
    status: "read",
    readAt: ts,
    updatedAt: ts,
    ackMeta: meta,
  };
  sqliteExec(
    `UPDATE platform_messages SET status = 'read', read_at = ?, updated_at = ?, payload_json = ? WHERE message_id = ?`,
    [ts, ts, pack(next), row.message_id]
  );
  return { ok: true, already: false, message: loadMessage(row.message_id) };
}

export function messageStats(companyId) {
  const cid = normalizeCompanyId(companyId);
  const openCount = cid
    ? sqliteGet(
      `SELECT COUNT(*) AS c FROM platform_messages WHERE company_id = ? AND status = 'open'`,
      [cid]
    )?.c
    : sqliteGet(`SELECT COUNT(*) AS c FROM platform_messages WHERE status = 'open'`)?.c;
  return { open: Number(openCount || 0) };
}
