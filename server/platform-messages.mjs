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
import { applyReceiptStage, normalizeReceipt, receiptFromPlatformBody, receiptLabels } from "./receipt.mjs";
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
  { re: /logo|firmenlogo/i, code: "company_logo_missing", field: "hubProfile.logo", label: "Firmenlogo fehlt" },
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
  const shouldNotify = opts.notify !== false
    && direction === "accounting_to_platform"
    && (
      opts.forceNotify
      || (opts.notifyOnce ? !existing : true)
      || (!opts.notifyOnce && !existing)
    );
  // notifyOnce: only first create; never re-fire while same open bundle exists
  const notifyNow = opts.notifyOnce
    ? (!existing && opts.notify !== false && direction === "accounting_to_platform")
    : shouldNotify && !existing;

  if (notifyNow || (opts.forceNotify && direction === "accounting_to_platform")) {
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
        notifyOnce: Boolean(opts.notifyOnce),
      },
    });
    if (platformNotify && message) {
      const receipt = platformNotify.accepted
        ? receiptFromPlatformBody(platformNotify.body || { accepted: true }, {
          receipt: message.receipt,
          at: ts,
          actor: "platform-webhook",
          forceReceived: true,
        })
        : normalizeReceipt(message.receipt);
      const stamped = {
        ...message,
        notifiedAt: ts,
        notifiedOnce: true,
        receipt,
        receivedAt: receipt.receivedAt,
        openedAt: receipt.openedAt,
        seenAt: receipt.seenAt,
        platformReceived: Boolean(receipt.received),
      };
      sqliteExec(
        `UPDATE platform_messages SET payload_json = ?, updated_at = ? WHERE message_id = ?`,
        [pack(stamped), ts, payload.messageId]
      );
    }
  }

  return {
    ok: true,
    created: !existing,
    updated: Boolean(existing),
    notified: Boolean(platformNotify),
    message: loadMessage(payload.messageId),
    platformNotify,
  };
}

/**
 * From payroll state / validation texts → ONE bundled message per employee+period.
 * Webhook to platform fires only once (when the open message is first created),
 * unless forceNotify is set (manual "Plattform fragen").
 */
export async function notifyGapsForPayroll({
  state,
  hard = [],
  soft = [],
  jobId,
  companyName,
  forceNotify = false,
  requestEvent = false,
} = {}) {
  const companyId = normalizeCompanyId(state?.mandantId || state?.meta?.companyId || "");
  if (!companyId) return { ok: false, error: "company.id fehlt", messages: [] };

  const employeeId = normalizeEmployeeId(state?.employeeId || state?.badgeId || "");
  const employeeName = String(state?.employeeName || "").trim();
  const badgeId = String(state?.badgeId || state?.meta?.badgeId || employeeId).trim();
  const period = String(state?.payrollMonth || "").trim();

  const hardGaps = gapsFromTexts(hard, "action_needed");
  const softGaps = gapsFromTexts(soft, "warning");
  const gaps = [...hardGaps, ...softGaps.filter((g) => !hardGaps.some((h) => h.code === g.code))];

  if (!gaps.length) {
    const resolved = resolveOpenGaps({
      companyId,
      employeeId,
      period,
      remainingCodes: [],
    });
    return { ok: true, messages: [], resolved, skipped: true };
  }

  const gapLabels = gaps.map((g) => g.label);
  const severity = gaps.some((g) => g.severity === "action_needed") ? "action_needed" : "warning";
  const title = `Fehlende Daten · ${employeeName || badgeId || "Mitarbeiter"}`;
  const body =
    `Die Buchhaltung (WorkPass Lohn) braucht fehlende Angaben für diesen Mitarbeiter.\n\n`
    + `Mitarbeiter: ${employeeName || "—"}\n`
    + (badgeId ? `Badge-ID (intern): ${badgeId}\n` : "")
    + `Monat: ${period || "—"}\n\n`
    + `Es fehlt:\n• ${gapLabels.join("\n• ")}\n\n`
    + `Bitte in der Plattform ergänzen und die Lohn-/Stundendaten erneut senden `
    + `(auch teilweise Daten sind willkommen).\n`
    + `Sobald Sie diese Mitteilung geöffnet und gelesen haben, bestätigt das Steuerprogramm: empfangen · geöffnet · gesehen.`;

  const result = await upsertPlatformMessage({
    type: "data.gap",
    severity,
    company: { id: companyId, name: companyName || state?.companyName || "" },
    employee: {
      id: employeeId,
      name: employeeName,
      badgeId,
    },
    period,
    jobId,
    gaps,
    code: "employee_gaps_bundle",
    dedupeKey: dedupeKey({
      companyId,
      employeeId,
      period,
      code: "employee_gaps_bundle",
      type: "data.gap",
    }),
    title,
    body,
    source: forceNotify ? "payroll-request" : "payroll-validate",
  }, {
    // Push webhook on first create, or whenever the firm explicitly asks again
    notifyOnce: !forceNotify,
    forceNotify: Boolean(forceNotify),
  });

  // Close any legacy per-gap open messages for same employee/period
  resolveOpenGaps({
    companyId,
    employeeId,
    period,
    remainingCodes: ["employee_gaps_bundle"],
    keepDedupeSuffix: "employee_gaps_bundle",
  });

  let requestNotify = null;
  if (requestEvent || forceNotify || result.created) {
    requestNotify = await notifyPlatform({
      event: "employee.data.requested",
      company: { id: companyId, name: companyName || state?.companyName || "" },
      message: result.message,
      meta: {
        employeeId,
        badgeId,
        employeeName,
        period,
        jobId: jobId || null,
        gaps,
        reason: forceNotify ? "manual_request" : "payslip_create",
        allowIncomplete: true,
        preferInlineReply: true,
        replyRequired: true,
        reply: {
          pushEmployees: "POST /v1/employees/import",
          pushPayroll: "POST /v1/payroll/batch",
          includeAttendance: "attendance: { hours, days }",
          includeContract: "hourlyRate/stundenlohn, insuranceNo/svNr, healthFund/krankenkasse",
          orInline: "employees[] / employee / contract / attendance in webhook 200 body",
          accountingBase: process.env.WORKPASS_PUBLIC_URL || "https://workpass-lohn.up.railway.app",
          formula: "Brutto = attendance.hours × contract.hourlyRate (Stundenlohn)",
        },
      },
      idempotencyKey: forceNotify
        ? `emp-req:${companyId}:${employeeId}:${period}:${Date.now()}`
        : `emp-req:${companyId}:${employeeId}:${period}`,
    });
  }

  return {
    ok: true,
    messages: result.message ? [result.message] : [],
    created: result.created ? 1 : 0,
    updated: result.updated ? 1 : 0,
    notified: Boolean((result.platformNotify && result.created) || requestNotify?.ok),
    platformNotify: requestNotify || result.platformNotify,
    resolved: [],
  };
}

export function resolveOpenGaps({
  companyId,
  employeeId,
  period,
  remainingCodes = [],
  keepDedupeSuffix = null,
} = {}) {
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
    const code = msg?.gaps?.length > 1
      ? "employee_gaps_bundle"
      : (msg?.gaps?.[0]?.code || msg?.code || "other");
    const isBundle = String(row.dedupe_key || "").endsWith("::employee_gaps_bundle")
      || code === "employee_gaps_bundle";

    // Keep the bundled message if gaps remain
    if (isBundle && keep.has("employee_gaps_bundle")) continue;
    if (!isBundle && keep.has(code)) continue;
    // When resolving leftovers after bundling, drop legacy per-gap rows
    if (keepDedupeSuffix && isBundle) continue;

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
  const companyId = filter.companyId ? normalizeCompanyId(filter.companyId) : "";
  let sql = `SELECT * FROM platform_messages WHERE direction = 'accounting_to_platform' AND status IN ('open','opened')`;
  const params = [];
  if (companyId) {
    sql += ` AND company_id = ?`;
    params.push(companyId);
  }
  sql += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(Number(filter.limit) || 100);
  return sqliteAll(sql, params).map(rowToMessage).filter(Boolean);
}

/**
 * Close open request messages after platform delivered the data.
 * Types: employees.list.requested, payroll.month.requested (and optional extras).
 */
export function ackOpenRequests({ companyId, period, types = [], meta = {} } = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", acked: 0 };
  const wantTypes = (Array.isArray(types) && types.length
    ? types
    : ["employees.list.requested", "payroll.month.requested"]
  ).map(String);
  let sql = `SELECT * FROM platform_messages WHERE company_id = ? AND status IN ('open','opened')`;
  const params = [cid];
  if (period) {
    sql += ` AND (period = ? OR period = '' OR period IS NULL)`;
    params.push(String(period));
  }
  const rows = sqliteAll(sql, params);
  let acked = 0;
  const ids = [];
  for (const row of rows) {
    const msg = rowToMessage(row);
    if (!msg) continue;
    if (!wantTypes.includes(String(msg.type || ""))) continue;
    const r = ackMessage(msg.messageId, {
      readBy: meta.readBy || "accounting-auto",
      reason: meta.reason || "data_received",
      stage: "seen",
    });
    if (r.ok) {
      acked += 1;
      ids.push(msg.messageId);
    }
  }
  return { ok: true, acked, messageIds: ids };
}

/**
 * Platform marks message receipt stage: received | opened | seen.
 * Full „Auftrag gesehen“ only when all three are true.
 */
export function markMessageReceipt(messageId, stage, meta = {}) {
  const row = sqliteGet(`SELECT * FROM platform_messages WHERE message_id = ?`, [String(messageId || "")]);
  if (!row) return { ok: false, error: "Nachricht nicht gefunden" };
  const msg = rowToMessage(row);
  const receipt = applyReceiptStage(msg.receipt, stage, meta);
  const ts = receipt.seenAt || receipt.openedAt || receipt.receivedAt || now();
  const next = {
    ...msg,
    receipt,
    receivedAt: receipt.receivedAt,
    openedAt: receipt.openedAt,
    seenAt: receipt.seenAt,
    seenBy: receipt.seenBy,
    platformReceived: receipt.received,
    seenConfirmed: receipt.complete,
    updatedAt: ts,
    ackMeta: { ...(msg.ackMeta || {}), ...meta, stage, receipt },
  };
  if (receipt.complete) {
    next.status = "read";
    next.readAt = receipt.seenAt || ts;
    next.accountingConfirmation = {
      kind: "platform.accounting.seen.v1",
      messageId: msg.messageId,
      seen: true,
      opened: true,
      received: true,
      complete: true,
      seenAt: receipt.seenAt,
      openedAt: receipt.openedAt,
      receivedAt: receipt.receivedAt,
      seenBy: receipt.seenBy,
      label: "Auftrag: empfangen · geöffnet · gesehen",
      employee: msg.employee,
      period: msg.period,
      title: msg.title,
      receipt,
      receiptView: receiptLabels(receipt),
    };
  } else if (receipt.opened && msg.status === "open") {
    next.status = "opened";
  }
  sqliteExec(
    `UPDATE platform_messages SET status = ?, read_at = ?, updated_at = ?, payload_json = ? WHERE message_id = ?`,
    [
      next.status,
      next.readAt || null,
      ts,
      pack(next),
      row.message_id,
    ]
  );
  const message = loadMessage(row.message_id);
  return {
    ok: true,
    already: Boolean(msg.seenConfirmed && receipt.complete),
    message,
    receipt,
    receiptView: receiptLabels(receipt),
    confirmed: Boolean(receipt.complete),
    confirmation: message.accountingConfirmation || null,
    messageText: receiptLabels(receipt).label,
  };
}

/**
 * Platform marks message as read → disappears from pending inbox.
 * Accounting (Steuerprogramm) treats complete receipt as „Auftrag gesehen“.
 */
export function ackMessage(messageId, meta = {}) {
  return markMessageReceipt(messageId, meta.stage || "seen", meta);
}

/** Recently fully seen by platform – for Steuerprogramm confirmation panel */
export function listSeenConfirmations(filter = {}) {
  const sinceHours = Number(filter.sinceHours) || 72;
  const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
  let sql = `SELECT * FROM platform_messages WHERE status IN ('read','opened') AND (read_at IS NOT NULL OR updated_at >= ?)`;
  const params = [since];
  if (filter.companyId) {
    sql += ` AND company_id = ?`;
    params.push(normalizeCompanyId(filter.companyId));
  }
  sql += ` ORDER BY COALESCE(read_at, updated_at) DESC LIMIT ?`;
  params.push(Number(filter.limit) || 50);
  return sqliteAll(sql, params).map(rowToMessage).filter(Boolean).map((m) => {
    const receipt = normalizeReceipt(m.receipt || {
      received: Boolean(m.platformReceived || m.receivedAt || m.readAt),
      opened: Boolean(m.openedAt || m.readAt),
      seen: Boolean(m.readAt || m.seenAt),
      receivedAt: m.receivedAt,
      openedAt: m.openedAt,
      seenAt: m.readAt || m.seenAt,
    });
    // Legacy acked messages without receipt → treat as complete
    const complete = receipt.complete || (m.status === "read" && Boolean(m.readAt) && !m.receipt);
    if (!complete && !filter.includePartial) return null;
    return {
      kind: "platform.accounting.seen.v1",
      messageId: m.messageId,
      seen: complete,
      complete,
      received: receipt.received || complete,
      opened: receipt.opened || complete,
      seenAt: receipt.seenAt || m.readAt || m.seenAt,
      openedAt: receipt.openedAt,
      receivedAt: receipt.receivedAt,
      seenBy: receipt.seenBy || m.seenBy || m.ackMeta?.readBy || "platform",
      label: complete
        ? "Auftrag: empfangen · geöffnet · gesehen"
        : receiptLabels(receipt).label,
      title: m.title,
      employee: m.employee,
      period: m.period,
      gaps: m.gaps || [],
      company: m.company,
      receipt,
      receiptView: receiptLabels(receipt),
    };
  }).filter(Boolean);
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
