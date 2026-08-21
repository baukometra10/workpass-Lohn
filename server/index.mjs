/**
 * WorkPass Accounting Bridge API
 * Platform ↔ Buchhaltung – multi-tenant + hardened security
 *
 * Start: npm start
 * Auth: X-WorkPass-Key (timing-safe)
 * Tenant: X-WorkPass-Company-Id
 * Encryption at rest: AES-256-GCM (WORKPASS_DATA_KEY or local .data-key)
 */
import "./load-env.mjs";
import http from "node:http";
import { URL } from "node:url";
import { ACCOUNTING_VERSION, SERVICE_NAME } from "./version.mjs";
import { ingestPayroll, ingestPayrollBatch, releasePayrollJob, deliverReleasedPayslips, correctPayrollJob } from "./payroll-service.mjs";
import { enrichPayrollJob, getLastEnrichStatus } from "./employee-enrich.mjs";
import { runMonthClose, currentPeriod, requestEmployeeDataFromPlatform, resolvePlatformPullUrls } from "./month-close.mjs";
import {
  startMonthCloseScheduler,
  runAutoMonthCloseOnce,
  autoMonthCloseStatus,
} from "./month-scheduler.mjs";
import { getCompanyAutomationStatus } from "./automation-status.mjs";
import {
  hydrateCompanyLogoFromUrl,
  pullAndSyncCompanyBranding,
} from "./company-branding.mjs";
import {
  processInboundPayroll,
  processInboundPayrollBatch,
  processInboundInvoice,
  processInboundInvoiceBatch,
  askPlatformAndSyncCompany,
  runAutoPipelineOnce,
  startAutoPipelineScheduler,
  autoPipelineStatus,
  autoPipelineConfig,
} from "./auto-pipeline.mjs";
import { startDeliveryReplayScheduler, replayPendingDeliveries } from "./delivery-replay.mjs";
import {
  hydrateTaxRulesFromStore,
  taxEvaluate,
  taxListRulesets,
  taxResolveRuleset,
  taxIngestDraft,
  taxReviewRuleset,
  taxPublishLifecycle,
  taxGetStoredRuleset,
  taxListStored,
  taxEngineInfo,
} from "./tax-rules/service.mjs";
import { listCompanyEmployees, monthOverview, listReleasedArchive, listInvoiceArchive, brandingHealth, buildMonthDatevExport, buildMonthLodasPackage, monthCompleteness } from "./portal-service.mjs";
import { buildDemoPayrollBatch } from "./demo-payroll.mjs";
import { purgeDemoPayroll } from "./demo-purge.mjs";
import { importEmployees, listEmployees } from "./employee-registry.mjs";
import { isDemoEmployeeRecord } from "./demo-detect.mjs";
import {
  listMessages,
  listPendingMessagesForPlatform,
  ackMessage,
  markMessageReceipt,
  upsertPlatformMessage,
  messageStats,
  loadMessage,
  listSeenConfirmations,
  ackOpenRequests,
} from "./platform-messages.mjs";
import { releaseInvoiceJob } from "./invoice-service.mjs";
import { resolveUiLocale } from "./document-labels-i18n.mjs";
import { listPayrollJobs, loadPayrollJob, listInvoiceJobs, loadInvoiceJob } from "./store.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { listPendingDeliveries, listAllDeliveries, ackDelivery } from "./delivery-queue.mjs";
import { getLastWebhookStatus, probePlatformWebhook, webhookKeyConfigured, resolveWebhookKey } from "./notify.mjs";
import {
  upsertCompany,
  activateCompany,
  deactivateCompany,
  deleteCompany,
  loadCompany,
  listCompanies,
  companyWorkspaceView,
  setCompanyLogin,
  syncCompanyLogin,
} from "./company-service.mjs";
import { tenantFromRequest, assertSameTenant, normalizeCompanyId, resolveTenantScope } from "./tenant.mjs";
import { initDb, syncHealth, flushSyncOutbox } from "./db/repository.mjs";
import { postgresConfigured } from "./db/postgres.mjs";
import {
  securityHeaders,
  uiSecurityHeaders,
  corsHeaders,
  authorizeRequest,
  readBodyLimited,
  publicSecurityInfo,
  getApiKey,
} from "./security/http.mjs";
import { assertProductionSecurity, secureCompare } from "./security/crypto.mjs";
import { audit, readAuditTail, verifyAuditChain } from "./security/audit.mjs";
import { clientIp } from "./security/rate-limit.mjs";
import { createBackup, listBackups, restoreBackup, startBackupScheduler } from "./backup/backup.mjs";
import {
  PLATFORM_DOMAIN,
  getCorsOrigins,
  mergeCorsOrigins,
  platformWebhookUrl,
} from "./platform-config.mjs";
import { tryServeStatic } from "./static.mjs";
import { logDataPaths } from "./paths.mjs";
import { readHelpContact, writeHelpContact } from "./help-contact-store.mjs";
import {
  authPublicConfig,
  loginWithPassword,
  sessionFromRequest,
  unlockAuthRateLimits,
  createPlatformHandoff,
  bootstrapPlatformSso,
  isReadOnlyRole,
  createAdminHandoffTicket,
  redeemAdminHandoffTicket,
} from "./auth-session.mjs";
import { clearRateLimitState } from "./security/rate-limit.mjs";
import {
  requireHumanConfirm,
  assertNotAiApplyingLaw,
  humanFinalPublicInfo,
} from "./policy/human-final.mjs";
import { buildComplianceCalendar } from "./compliance-calendar.mjs";
import { buildSepaCreditTransfer } from "./sepa-export.mjs";
import { explainPortalGaps } from "./assistant/explain.mjs";
import { applyEngineTax } from "./assistant/apply-engine.mjs";
import {
  elsterCertStatus,
  elsterChannelStatus,
  saveElsterCert,
  submitElsterYear,
  submitElsterLsta,
  listElsterSubmissions,
  buildMonthLsta,
} from "./elster/submit.mjs";
import {
  buildEmployeeLstbCertificate,
  buildEmployeeVerdienstCertificate,
  listCertificateSummary,
} from "./certificates/employee-certificates.mjs";
import {
  deliverEmployeeLstb,
  deliverEmployeeVerdienst,
  deliverYearLstb,
  verifyCertificateDelivery,
} from "./certificates/deliver.mjs";
import {
  buildDeliveryTrust,
  detectPayrollAnomalies,
  simulatePayroll,
  buildElsterPrepChecklist,
} from "./portal-trust.mjs";
import { buildOpsHealth } from "./ops-health.mjs";
import { buildGobdExport } from "./gobd/export.mjs";
import { platformCapabilities } from "./platform-contract.mjs";
import { recordExportRun, exportStatusSummary, importBankStatus } from "./export-status.mjs";
import { buildDeliveryReconciliation } from "./delivery-reconciliation.mjs";
import { buildYearEndWizard } from "./portal-year-end.mjs";
import { listBusinessAudit, verifyBusinessAuditChain, SYNC_STATUSES } from "./gobd/business-audit.mjs";
import { listRevisions, getRevision } from "./gobd/revisions.mjs";
import { summarizeSyncDeliveries, buildIdempotencyKey } from "./gobd/sync-lifecycle.mjs";
import { buildXRechnungUbl } from "./erechnung/xrechnung.mjs";

const PORT = Number(process.env.WORKPASS_API_PORT || process.env.PORT || 8787);
const HOST = process.env.WORKPASS_API_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const FORCE_HTTPS = process.env.WORKPASS_FORCE_HTTPS === "1" || process.env.NODE_ENV === "production";
const SERVE_UI = process.env.WORKPASS_SERVE_UI !== "0";

console.log(`[boot] node=${process.version} PORT=${PORT} HOST=${HOST}`);
console.log(`[boot] WORKPASS_API_KEY set=${Boolean(process.env.WORKPASS_API_KEY && process.env.WORKPASS_API_KEY !== "workpass-dev-key")}`);
console.log(`[boot] WORKPASS_STRICT=${process.env.WORKPASS_STRICT || ""} NODE_ENV=${process.env.NODE_ENV || ""}`);

let posture;
try {
  posture = assertProductionSecurity();
  logDataPaths();
  initDb();
  hydrateTaxRulesFromStore();
} catch (err) {
  console.error("[boot] FATAL:", err?.message || err);
  process.exit(1);
}

const backupSched = startBackupScheduler();
const monthCloseSched = startMonthCloseScheduler();
const autoPipeSched = startAutoPipelineScheduler();
const deliveryReplaySched = startDeliveryReplayScheduler();

let healthSnapshot = { at: 0, body: null };
const HEALTH_CACHE_MS = 15_000;

function buildHealthBody(req) {
  const db = syncHealth();
  return {
    ok: true,
    service: SERVICE_NAME,
    version: ACCOUNTING_VERSION,
    multiTenant: true,
    taxRules: taxEngineInfo(),
    humanFinal: humanFinalPublicInfo(),
    monthCloseScheduler: monthCloseSched,
    autoMonthClose: autoMonthCloseStatus(),
    autoPipeline: autoPipelineStatus(),
    platform: {
      domain: PLATFORM_DOMAIN,
      corsOrigins: getCorsOrigins(),
      webhookUrlConfigured: Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL),
      webhookUrlSuggested: platformWebhookUrl(),
    },
    ui: {
      served: SERVE_UI,
      paths: ["/", "/index.html", "/lohn.html", "/admin.html"],
    },
    https: {
      forceHttps: FORCE_HTTPS,
      forwardedProto: req.headers["x-forwarded-proto"] || null,
      note: "Railway provides TLS at the edge (https://*.up.railway.app)",
    },
    security: publicSecurityInfo(),
    storage: {
      local: "sqlite",
      encryptionAtRest: true,
      localAlwaysOn: true,
      postgres: db.postgres,
      outboxPending: db.outboxPending,
    },
    backup: {
      scheduler: backupSched,
      count: listBackups().length,
    },
    time: new Date().toISOString(),
    webhookConfigured: Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL),
    lastWebhook: getLastWebhookStatus(),
    lastEnrich: getLastEnrichStatus(),
  };
}

function sendJson(res, status, body, req) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders(),
    ...corsHeaders(req),
  });
  res.end(json);
}

async function handler(req, res) {
  const reply = (status, body) => sendJson(res, status, body, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, { ...securityHeaders(), ...corsHeaders(req) });
    return res.end();
  }

  // TLS termination is on Railway edge; reject plain HTTP when behind proxy
  if (FORCE_HTTPS) {
    const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    if (proto === "http") {
      const host = req.headers["x-forwarded-host"] || req.headers.host || "";
      const target = `https://${host}${req.url || "/"}`;
      res.writeHead(301, { Location: target, ...securityHeaders() });
      return res.end();
    }
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  let tenantScope = tenantFromRequest(req, url);
  const ip = clientIp(req);

  if (req.method === "GET" && path === "/health") {
    const now = Date.now();
    if (!healthSnapshot.body || now - healthSnapshot.at > HEALTH_CACHE_MS) {
      healthSnapshot = { at: now, body: buildHealthBody(req) };
    }
    return reply(200, { ...healthSnapshot.body, time: new Date().toISOString() });
  }

  // Public help contacts (Hilfe page) — no auth
  if (req.method === "GET" && path === "/v1/help/contact") {
    return reply(200, { ok: true, contact: readHelpContact() });
  }

  // UI (Rechnung / Lohn) – öffentlich, ohne API-Key
  if (SERVE_UI && tryServeStatic(req, res, path === "/" ? "/index.html" : path)) {
    return;
  }

  // Missing browser assets must NOT hit API auth (favicon was causing 401 → IP lockout → 429)
  if (
    SERVE_UI
    && (req.method === "GET" || req.method === "HEAD")
    && path !== "/health"
    && !path.startsWith("/v1")
  ) {
    if (path === "/favicon.ico") {
      res.writeHead(204, {
        "Cache-Control": "public, max-age=86400",
        ...uiSecurityHeaders(),
      });
      return res.end();
    }
    return reply(404, { ok: false, error: "Datei nicht gefunden" });
  }

  // --- Public auth (no API key) ---
  if (req.method === "GET" && path === "/v1/auth/config") {
    return reply(200, authPublicConfig());
  }

  if (req.method === "GET" && path === "/v1/tax/rulesets") {
    const country = url.searchParams.get("country") || "DE";
    // Public: published only (drafts never drive live calc / public list)
    const items = taxListRulesets({ country, includeDraft: false }).map((p) => ({
      id: p.id,
      country: p.country,
      status: p.status,
      version: p.version,
      papYear: p.papYear,
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo,
      source: p.source || null,
    }));
    return reply(200, { ok: true, country, items, engine: "tax-rules" });
  }

  if (req.method === "GET" && path === "/v1/tax/ruleset") {
    const resolved = taxResolveRuleset({
      country: url.searchParams.get("country") || "DE",
      asOf: url.searchParams.get("asOf") || url.searchParams.get("period") || "",
    });
    return reply(resolved.ok ? 200 : 404, {
      ok: resolved.ok,
      country: resolved.country,
      asOf: resolved.asOf,
      ruleset: resolved.pack
        ? {
          id: resolved.pack.id,
          version: resolved.pack.version,
          status: resolved.pack.status,
          papYear: resolved.pack.papYear,
          effectiveFrom: resolved.pack.effectiveFrom,
          effectiveTo: resolved.pack.effectiveTo,
          citations: resolved.pack.citations || [],
          source: resolved.pack.source || null,
        }
        : null,
    });
  }

  if (req.method === "POST" && path === "/v1/tax/evaluate") {
    const body = (await readBodyLimited(req)) || {};
    const result = taxEvaluate({ ...body, includeDraft: false });
    return reply(result.ok ? 200 : 422, result);
  }

  if (req.method === "POST" && path === "/v1/auth/login") {
    const body = await readBodyLimited(req);
    const result = await loginWithPassword(body?.email, body?.password, req, {
      locale: body?.locale || body?.language || body?.preferredLocale,
      audience: body?.audience || body?.page,
    });
    return reply(result.status || (result.ok ? 200 : 401), result);
  }

  if (req.method === "POST" && path === "/v1/auth/admin-handoff") {
    const result = createAdminHandoffTicket(req);
    return reply(result.status || (result.ok ? 200 : 401), result);
  }

  if (req.method === "GET" && path === "/v1/auth/admin-handoff") {
    const ticket = String(url.searchParams.get("ticket") || "").trim();
    const result = redeemAdminHandoffTicket(ticket);
    return reply(result.status || (result.ok ? 200 : 401), result);
  }

  if (req.method === "POST" && path === "/v1/auth/unlock") {
    const auth = authorizeRequest(req);
    if (!auth.ok) {
      if (auth.retryAfterMs) res.setHeader("Retry-After", String(Math.ceil(auth.retryAfterMs / 1000)));
      return reply(auth.status || 401, { ok: false, error: auth.error });
    }
    unlockAuthRateLimits();
    audit({ type: "auth.unlock", outcome: "ok", ip, path });
    return reply(200, { ok: true, cleared: true });
  }

  if (req.method === "GET" && path === "/v1/auth/me") {
    const s = sessionFromRequest(req);
    if (!s.ok) return reply(401, { ok: false, error: s.error });
    const out = {
      ok: true,
      user: s.user,
      preferredLocale: s.user?.locale || null,
    };
    if (s.user?.companyId && s.user.role !== "admin") {
      const company = loadCompany(s.user.companyId);
      out.workspace = companyWorkspaceView(company);
      out.companyLocked = true;
      if (company) {
        out.preferredLocale = out.preferredLocale
          || company.meta?.locale
          || company.meta?.language
          || null;
        out.company = {
          id: company.id,
          name: company.name,
          street: company.street,
          zip: company.zip,
          city: company.city,
          address: company.address,
          taxNumber: company.taxNumber,
          vatId: company.vatId,
          email: company.email,
          phone: company.phone,
          datevClientNo: company.datevClientNo,
          datevConsultantNo: company.datevConsultantNo,
          hubProfile: company.meta?.hubProfile || null,
          locale: company.meta?.locale || company.meta?.language || null,
        };
      }
    }
    return reply(200, out);
  }

  // Platform one-click → accounting: mint HMAC session + #suppix-sso= URL
  if (req.method === "POST" && path === "/v1/auth/platform-handoff") {
    const providedApi = String(req.headers["x-workpass-key"] || "");
    const apiOk = providedApi && secureCompare(providedApi, getApiKey());
    const { key: whKey } = resolveWebhookKey();
    const authHdr = String(req.headers.authorization || "");
    const bearer = authHdr.toLowerCase().startsWith("bearer ") ? authHdr.slice(7).trim() : "";
    const providedWh = String(req.headers["x-workpass-webhook-key"] || bearer || "");
    const whOk = Boolean(whKey && providedWh && secureCompare(providedWh, whKey));
    if (!apiOk && !whOk) {
      const auth = authorizeRequest(req);
      if (auth.retryAfterMs) res.setHeader("Retry-After", String(Math.ceil(auth.retryAfterMs / 1000)));
      return reply(auth.status || 401, {
        ok: false,
        error: auth.error || "Unauthorized – X-WorkPass-Key oder Webhook-Key erforderlich",
      });
    }
    const body = (await readBodyLimited(req)) || {};
    const fwdHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const fwdProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const publicBase = String(process.env.WORKPASS_PUBLIC_BASE_URL || "").trim()
      || (fwdHost ? `${fwdProto}://${fwdHost}` : "");
    const result = createPlatformHandoff(body, { publicBase });
    audit({
      type: "auth.platform-handoff",
      outcome: result.ok ? "ok" : "deny",
      ip,
      path,
      companyId: body.companyId || body.company?.id || null,
      detail: { status: result.status, via: apiOk ? "api-key" : "webhook-key" },
    });
    return reply(result.status || (result.ok ? 200 : 400), result);
  }

  // Browser upgrades platform #suppix-sso= into a real accounting session (no API key).
  if (req.method === "POST" && path === "/v1/auth/sso-bootstrap") {
    const body = (await readBodyLimited(req)) || {};
    const result = bootstrapPlatformSso(body, req);
    audit({
      type: "auth.sso-bootstrap",
      outcome: result.ok ? "ok" : "deny",
      ip,
      path,
      companyId: body.companyId || body.user?.companyId || result.companyId || null,
      detail: { status: result.status, via: result.via || null },
    });
    return reply(result.status || (result.ok ? 200 : 400), result);
  }

  // Browser-friendly one-click: GET → 302 to lohn.html#suppix-sso= (server-minted session)
  // Platform backend should redirect the user here (do not put the key in a public bookmark).
  if (req.method === "GET" && path === "/v1/auth/platform-open") {
    const q = url.searchParams;
    const providedApi = String(q.get("key") || req.headers["x-workpass-key"] || "");
    const apiOk = providedApi && secureCompare(providedApi, getApiKey());
    const { key: whKey } = resolveWebhookKey();
    const authHdr = String(req.headers.authorization || "");
    const bearer = authHdr.toLowerCase().startsWith("bearer ") ? authHdr.slice(7).trim() : "";
    const providedWh = String(req.headers["x-workpass-webhook-key"] || bearer || q.get("webhookKey") || "");
    const whOk = Boolean(whKey && providedWh && secureCompare(providedWh, whKey));
    if (!apiOk && !whOk) {
      return reply(401, {
        ok: false,
        error: "Unauthorized – key query/header erforderlich für platform-open",
      });
    }
    const fwdHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const fwdProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const publicBase = String(process.env.WORKPASS_PUBLIC_BASE_URL || "").trim()
      || (fwdHost ? `${fwdProto}://${fwdHost}` : "");
    const result = createPlatformHandoff({
      companyId: q.get("companyId") || q.get("company") || "",
      preferredLocale: q.get("locale") || q.get("lang") || q.get("preferredLocale") || "",
      email: q.get("email") || "",
      name: q.get("name") || "",
      user: {
        id: q.get("userId") || "",
        email: q.get("email") || "",
        name: q.get("name") || "",
      },
    }, { publicBase });
    audit({
      type: "auth.platform-open",
      outcome: result.ok ? "ok" : "deny",
      ip,
      path,
      companyId: q.get("companyId") || null,
      detail: { status: result.status },
    });
    if (!result.ok) return reply(result.status || 400, result);
    res.writeHead(302, {
      Location: result.openUrl,
      "Cache-Control": "no-store",
      ...securityHeaders(),
    });
    res.end();
    return;
  }

  if (path !== "/health") {
    const sess = sessionFromRequest(req);
    const sessionPathsOk =
      path.startsWith("/v1/admin")
      || path === "/v1/companies"
      || path.startsWith("/v1/company/")
      || path === "/v1/inbox"
      || path.startsWith("/v1/payroll/")
      || path.startsWith("/v1/invoice/")
      || path.startsWith("/v1/invoices")
      || path.startsWith("/v1/delivery/")
      || path.startsWith("/v1/messages")
      || path.startsWith("/v1/employees")
      || path.startsWith("/v1/platform")
      || path.startsWith("/v1/sync")
      || path.startsWith("/v1/portal/")
      || path.startsWith("/v1/tax")
      || path.startsWith("/v1/gobd")
      || path.startsWith("/v1/demo/");
    if (sess.ok && sessionPathsOk) {
      req._workpassSession = sess.user;
      const scoped = resolveTenantScope(tenantScope, sess.user);
      if (!scoped.ok) {
        audit({
          type: "tenant.deny",
          outcome: "deny",
          ip,
          path,
          companyId: sess.user.companyId,
          detail: { requested: tenantScope },
        });
        return reply(scoped.status || 403, { ok: false, error: scoped.error });
      }
      tenantScope = scoped.tenantScope;
      if (isReadOnlyRole(sess.user.role)) {
        const writeOk = req.method === "GET" || req.method === "HEAD"
          || (req.method === "POST" && (path === "/v1/gobd/export" || path.endsWith("/xrechnung")));
        if (!writeOk) {
          return reply(403, {
            ok: false,
            error: "Auditor: Nur Lesezugriff (Read-only). Änderungen sind gesperrt.",
            code: "auditor_readonly",
            role: "auditor",
          });
        }
      }
      const needsAdmin =
        path.startsWith("/v1/admin")
        || path === "/v1/company/activate"
        || path === "/v1/company/provision"
        || path === "/v1/company/deactivate"
        || path === "/v1/company/delete"
        || path === "/v1/company/purge"
        || path === "/v1/company/login-sync"
        || path === "/v1/company/ensure-login"
        || path === "/v1/tax/rulesets"
        || path.startsWith("/v1/tax/rulesets/")
        || path === "/v1/admin/tax/rulesets"
        || path.endsWith("/login-credentials");
      if (needsAdmin && sess.user.role !== "admin") {
        return reply(403, { ok: false, error: "Nur Accounting-Admin" });
      }
      // DELETE /v1/company/:id also admin-only for session users
      if (
        req.method === "DELETE"
        && path.startsWith("/v1/company/")
        && sess.user.role !== "admin"
      ) {
        return reply(403, { ok: false, error: "Nur Accounting-Admin" });
      }
    } else {
      const auth = authorizeRequest(req);
      if (!auth.ok) {
        if (auth.retryAfterMs) res.setHeader("Retry-After", String(Math.ceil(auth.retryAfterMs / 1000)));
        return reply(auth.status || 401, { ok: false, error: auth.error });
      }
      req._workpassSession = null;
    }
  }

  try {
    // --- Platform CORS allow-list (SUPPIX pushes tenant domains) ---
    if (req.method === "GET" && path === "/v1/platform/cors-origins") {
      return reply(200, { ok: true, origins: getCorsOrigins() });
    }
    if (req.method === "POST" && path === "/v1/platform/cors-origins") {
      const body = (await readBodyLimited(req)) || {};
      const list = Array.isArray(body?.origins) ? body.origins : [];
      const origins = mergeCorsOrigins(list);
      audit({ type: "platform.cors", outcome: "ok", ip, path, detail: { added: list.length } });
      return reply(200, { ok: true, origins });
    }

    if (req.method === "GET" && path === "/v1/admin/tax/rulesets") {
      const country = url.searchParams.get("country") || "DE";
      const builtin = taxListRulesets({ country, includeDraft: true });
      const stored = taxListStored({ country });
      const byId = new Map();
      for (const p of builtin) byId.set(p.id, { ...p, origin: "builtin" });
      for (const p of stored) {
        byId.set(p.id, { ...p, origin: "store" });
      }
      const items = [...byId.values()]
        .sort((a, b) => String(a.effectiveFrom).localeCompare(String(b.effectiveFrom)))
        .map((p) => ({
          id: p.id,
          country: p.country,
          status: p.status,
          version: p.version,
          papYear: p.papYear,
          effectiveFrom: p.effectiveFrom,
          effectiveTo: p.effectiveTo,
          origin: p.origin,
          source: p.source || null,
          extractedBy: p.extractedBy || null,
        }));
      return reply(200, { ok: true, country, items, engine: "tax-rules" });
    }

    if (req.method === "POST" && path === "/v1/tax/rulesets") {
      const body = (await readBodyLimited(req)) || {};
      const pack = body.ruleset || body.pack || body;
      // Ingest is always draft – AI / extractors never go live here
      const saved = taxIngestDraft(pack, {
        source: body.source || pack.extractedBy || undefined,
        ingestNote: body.ingestNote,
      });
      audit({
        type: "tax.ruleset.ingest",
        outcome: saved.ok ? "ok" : "deny",
        ip,
        path,
        detail: { id: pack?.id, status: "draft" },
      });
      return reply(saved.ok ? 200 : 422, saved);
    }

    if (req.method === "POST" && path.startsWith("/v1/tax/rulesets/") && path.endsWith("/review")) {
      const id = decodeURIComponent(path.slice("/v1/tax/rulesets/".length, -"/review".length));
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "tax_ruleset_review");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const saved = taxReviewRuleset(id);
      audit({
        type: "tax.ruleset.review",
        outcome: saved.ok ? "ok" : "deny",
        ip,
        path,
        detail: { id, humanConfirm: true },
      });
      return reply(saved.ok ? 200 : 422, saved);
    }

    if (req.method === "POST" && path.startsWith("/v1/tax/rulesets/") && path.endsWith("/publish")) {
      const id = decodeURIComponent(path.slice("/v1/tax/rulesets/".length, -"/publish".length));
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "tax_ruleset_publish");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const saved = taxPublishLifecycle(id);
      audit({
        type: "tax.ruleset.publish",
        outcome: saved.ok ? "ok" : "deny",
        ip,
        path,
        detail: { id },
      });
      return reply(saved.ok ? 200 : 422, saved);
    }

    if (req.method === "GET" && path.startsWith("/v1/tax/rulesets/") && path !== "/v1/tax/rulesets") {
      const id = decodeURIComponent(path.slice("/v1/tax/rulesets/".length));
      if (id && !id.includes("/")) {
        const pack = taxGetStoredRuleset(id);
        if (!pack) return reply(404, { ok: false, error: "Ruleset nicht gefunden" });
        return reply(200, { ok: true, ruleset: pack });
      }
    }

    // --- Sync admin ---
    if (req.method === "POST" && path === "/v1/admin/sync") {
      const result = await flushSyncOutbox(200);
      audit({ type: "admin.sync", outcome: "ok", ip, path });
      return reply( 200, { ok: true, ...result, postgresConfigured: postgresConfigured() });
    }

    if (req.method === "GET" && path === "/v1/admin/storage") {
      return reply( 200, {
        ok: true,
        ...syncHealth(),
        security: publicSecurityInfo(),
        postgresConfigured: postgresConfigured(),
        backup: { scheduler: backupSched, backups: listBackups().slice(0, 20) },
      });
    }

    if (req.method === "POST" && path === "/v1/admin/backup") {
      const result = createBackup();
      audit({ type: "admin.backup", outcome: "ok", ip, path, detail: { fileName: result.fileName } });
      return reply( 200, result);
    }

    if (req.method === "GET" && path === "/v1/admin/backups") {
      return reply(200, { ok: true, backups: listBackups() });
    }

    if (req.method === "POST" && path === "/v1/admin/backup/restore") {
      const body = (await readBodyLimited(req)) || {};
      const fileName = String(body.fileName || body.file || "").trim();
      if (!fileName) return reply(422, { ok: false, error: "fileName fehlt" });
      const gate = requireHumanConfirm(body, "backup_restore");
      if (!gate.ok) return reply(gate.status || 422, gate);
      if (String(body.confirmPhrase || "").trim().toUpperCase() !== "RESTORE") {
        return reply(422, {
          ok: false,
          code: "confirm_phrase_required",
          error: "Zusätzlich erforderlich: { confirmPhrase: \"RESTORE\" }",
        });
      }
      const match = listBackups().find((b) => b.fileName === fileName || b.path === fileName);
      if (!match) return reply(404, { ok: false, error: "Backup nicht gefunden" });
      try {
        const result = restoreBackup(match.path);
        audit({
          type: "admin.backup.restore",
          outcome: "ok",
          ip,
          path,
          detail: { fileName: match.fileName },
        });
        return reply(200, { ok: true, ...result, fileName: match.fileName });
      } catch (e) {
        audit({ type: "admin.backup.restore", outcome: "error", ip, path, detail: { error: e.message } });
        return reply(422, { ok: false, error: e.message });
      }
    }

    if (req.method === "POST" && path === "/v1/admin/month-close/run") {
      const body = (await readBodyLimited(req)) || {};
      const result = await runAutoMonthCloseOnce({
        force: true,
        period: body.period,
        pull: body.pull,
        autoRelease: body.autoRelease,
      });
      audit({ type: "admin.month_close", outcome: result.ok ? "ok" : "error", ip, path });
      return reply(200, result);
    }

    if (req.method === "POST" && path === "/v1/admin/rate-limit/clear") {
      clearRateLimitState();
      audit({ type: "admin.rateclear", outcome: "ok", ip, path });
      return reply(200, { ok: true, cleared: true });
    }

    if (req.method === "GET" && path === "/v1/admin/help-contact") {
      return reply(200, { ok: true, contact: readHelpContact() });
    }
    if (req.method === "PUT" && path === "/v1/admin/help-contact") {
      const body = (await readBodyLimited(req)) || {};
      const contact = writeHelpContact(body.contact || body, {
        updatedBy: req._workpassSession?.email || req._workpassSession?.name || "admin",
      });
      audit({
        type: "admin.help-contact",
        outcome: "ok",
        ip,
        path,
        detail: { email: contact.email, phone: contact.phone ? "set" : "" },
      });
      return reply(200, { ok: true, contact });
    }

    if (req.method === "GET" && path === "/v1/admin/overview") {
      const companies = listCompanies();
      return reply(200, {
        ok: true,
        admin: req._workpassSession || { via: "api-key" },
        health: {
          version: ACCOUNTING_VERSION,
          ...syncHealth(),
        },
        monthCloseScheduler: monthCloseSched,
        autoMonthClose: autoMonthCloseStatus(),
        companies: {
          count: companies.length,
          active: companies.filter((c) => c.meta?.accountingEnabled).length,
          withHubProfile: companies.filter((c) => c.meta?.hubProfile).length,
          items: companies.map(companyWorkspaceView),
        },
        backup: { scheduler: backupSched, backups: listBackups().slice(0, 10) },
        auth: authPublicConfig(),
        rights: {
          activateCompany: true,
          deactivateCompany: true,
          deleteCompany: true,
          backups: true,
          sync: true,
          clearRateLimit: true,
          viewAllCompanies: true,
          audit: true,
          helpContact: true,
        },
      });
    }

    if (req.method === "GET" && path === "/v1/admin/audit") {
      const limit = Number(url.searchParams.get("limit") || 80);
      const entries = readAuditTail(limit);
      const chain = verifyAuditChain(Math.min(200, Math.max(limit, 50)));
      return reply(200, {
        ok: true,
        count: entries.length,
        entries,
        chain,
        path: "server/data/audit/security-audit.jsonl",
        policy: humanFinalPublicInfo(),
      });
    }

    if (req.method === "GET" && path === "/v1/admin/ops-health") {
      const health = buildOpsHealth();
      return reply(health.ok ? 200 : 503, health);
    }

    if (req.method === "GET" && path === "/v1/policy/human-final") {
      return reply(200, { ok: true, ...humanFinalPublicInfo() });
    }

    // --- Companies ---
    if (req.method === "POST" && (path === "/v1/company/login-sync" || path === "/v1/company/ensure-login")) {
      const body = await readBodyLimited(req);
      const companyIdHint = body?.company?.id || body?.companyId || body?.id;
      const scopeCheck = assertSameTenant(tenantScope, companyIdHint, "Company-Login-Sync");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      const result = syncCompanyLogin(body || {});
      audit({
        type: "company.login.sync",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.company?.id || companyIdHint,
      });
      return reply(result.ok ? 200 : 422, result);
    }

    if (
      req.method === "POST"
      && (path === "/v1/company/activate" || path === "/v1/company/provision")
    ) {
      const body = await readBodyLimited(req);
      const companyIdHint = body?.company?.id || body?.id || body?.companyId;
      const scopeCheck = assertSameTenant(tenantScope, companyIdHint, "Company-Activate");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      const result = activateCompany(body || {});
      audit({
        type: "company.activate",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.company?.id,
        detail: { created: result.created, hubProfileSynced: result.hubProfileSynced },
      });
      if (result.ok && result.company?.id) {
        // Bootstrap Mandant branding asynchronously – login stays for review only
        const cid = result.company.id;
        setTimeout(() => {
          // Pull logo from platform; if missing, send a clear logo question
          pullAndSyncCompanyBranding(cid, {
            reason: "activate_bootstrap",
            source: "company-activate",
          }).catch(() => {});
          askPlatformAndSyncCompany({
            companyId: cid,
            companyName: result.company.name,
            period: currentPeriod(),
            pull: true,
            autoRelease: true,
            forceAsk: true,
            reason: "activate_bootstrap",
          }).catch(() => {});
        }, 50);
      }
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && path === "/v1/company/deactivate") {
      const body = await readBodyLimited(req);
      const id = normalizeCompanyId(body?.company?.id || body?.id || body?.companyId || "");
      const scopeCheck = assertSameTenant(tenantScope, id, "Company-Deactivate");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      // Platform may send hard:true on deactivate when the firm is fully removed
      if (body?.hard === true || body?.purge === true || body?.event === "company.deleted") {
        const result = deleteCompany(body || { id });
        audit({
          type: "company.delete",
          outcome: result.ok ? "ok" : "error",
          ip,
          path,
          companyId: id,
          detail: { via: "deactivate-hard", purged: result.purged },
        });
        return reply(result.ok ? 200 : 422, result);
      }
      const result = deactivateCompany(id, { deactivatedBy: body?.deactivatedBy || "platform" });
      audit({
        type: "company.deactivate",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: id,
      });
      return reply(result.ok ? 200 : 404, result);
    }

    if (
      (req.method === "POST" && (path === "/v1/company/delete" || path === "/v1/company/purge"))
      || (req.method === "DELETE" && /^\/v1\/company\/[^/]+$/.test(path)
        && !["/v1/company/upsert", "/v1/company/activate", "/v1/company/provision",
          "/v1/company/deactivate", "/v1/company/delete", "/v1/company/purge",
          "/v1/company/login-sync", "/v1/company/ensure-login"].includes(path))
    ) {
      let body = {};
      if (req.method === "POST") {
        body = (await readBodyLimited(req)) || {};
      }
      const idFromPath = req.method === "DELETE"
        ? normalizeCompanyId(decodeURIComponent(path.slice("/v1/company/".length)))
        : "";
      const id = normalizeCompanyId(
        body?.company?.id || body?.id || body?.companyId || idFromPath || ""
      );
      const scopeCheck = assertSameTenant(tenantScope, id, "Company-Delete");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      const result = deleteCompany({
        ...body,
        id,
        deletedBy: body?.deletedBy || body?.deactivatedBy || "platform",
      });
      audit({
        type: "company.delete",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: id,
        detail: { purged: result.purged, alreadyGone: result.alreadyGone },
      });
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && path.endsWith("/login-credentials") && path.startsWith("/v1/company/")) {
      const id = normalizeCompanyId(decodeURIComponent(path.slice("/v1/company/".length, -"/login-credentials".length)));
      const body = await readBodyLimited(req);
      const scopeCheck = assertSameTenant(tenantScope, id, "Company-Login");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = setCompanyLogin(id, body?.login || body || {});
      audit({
        type: "company.login.set",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: id,
      });
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && (path === "/v1/company/pull-branding" || path.endsWith("/pull-branding") && path.startsWith("/v1/company/"))) {
      const body = (await readBodyLimited(req)) || {};
      const id = normalizeCompanyId(
        body.companyId || body.company?.id || body.id
        || (path.endsWith("/pull-branding")
          ? decodeURIComponent(path.slice("/v1/company/".length, -"/pull-branding".length))
          : "")
        || tenantScope
        || ""
      );
      const scopeCheck = assertSameTenant(tenantScope, id, "Branding-Pull");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      if (!id) return reply(422, { ok: false, error: "companyId fehlt" });
      const result = await pullAndSyncCompanyBranding(id, {
        reason: "manual_pull_branding",
        source: "api",
      });
      await hydrateCompanyLogoFromUrl(id).catch(() => {});
      audit({
        type: "company.pull_branding",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: id,
        detail: { pulled: result.pulled, hasLogo: result.applied?.hasLogo },
      });
      return reply(result.ok || result.pulled ? 200 : 422, result);
    }

    if (req.method === "POST" && (path === "/v1/company" || path === "/v1/company/upsert")) {
      const body = await readBodyLimited(req);
      const scopeCheck = assertSameTenant(tenantScope, body?.id || body?.company?.id, "Company-Payload");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      const result = upsertCompany(body?.company ? body : { company: body });
      audit({ type: "company.upsert", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.company?.id });
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "GET" && path === "/v1/companies") {
      const companies = listCompanies({ companyId: tenantScope || undefined });
      const workspaces = companies.map(companyWorkspaceView);
      return reply(200, {
        ok: true,
        count: companies.length,
        companies,
        workspaces,
      });
    }

    if (
      req.method === "GET"
      && path.startsWith("/v1/company/")
      && ![
        "/v1/company/upsert",
        "/v1/company/activate",
        "/v1/company/provision",
        "/v1/company/deactivate",
        "/v1/company/delete",
        "/v1/company/purge",
        "/v1/company/login-sync",
        "/v1/company/ensure-login",
      ].includes(path)
    ) {
      const id = normalizeCompanyId(decodeURIComponent(path.slice("/v1/company/".length)));
      const scopeCheck = assertSameTenant(tenantScope, id, "Company");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const company = loadCompany(id);
      if (!company) return reply(404, { ok: false, error: "Firma nicht gefunden" });
      return reply(200, { ok: true, company, workspace: companyWorkspaceView(company) });
    }

    // --- Payroll ---
    if (req.method === "POST" && path === "/v1/payroll/ingest") {
      const body = await readBodyLimited(req);
      const result = await processInboundPayroll(body, {
        tenantScope,
        autoRelease: body?.autoRelease !== false,
      });
      audit({
        type: "payroll.ingest",
        outcome: result.ok || result.released ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id || body?.company?.id,
        detail: { auto: true, released: result.released },
      });
      return reply(result.ok || result.job ? 200 : 422, result);
    }

    if (req.method === "POST" && path === "/v1/payroll/batch") {
      const body = await readBodyLimited(req);
      const result = await processInboundPayrollBatch(body, {
        tenantScope,
        autoRelease: body?.autoRelease !== false,
      });
      audit({
        type: "payroll.batch",
        outcome: result.count > 0 ? "ok" : "error",
        ip,
        path,
        companyId: result.company?.id,
        detail: { auto: true, released: result.releasedCount },
      });
      const status = result.count > 0 ? 200 : (result.ok ? 200 : 422);
      return reply(status, {
        ...result,
        incompleteAccepted: result.count > 0 && !result.ok,
      });
    }

    if (
      req.method === "POST"
      && (path === "/v1/payroll/auto-sync" || path === "/v1/portal/auto-sync" || path === "/v1/sync/run")
    ) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(
        body.companyId || body.company?.id || tenantScope || ""
      );
      if (companyId) {
        const scopeCheck = assertSameTenant(tenantScope, companyId, "Auto-Sync");
        if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
        const result = await askPlatformAndSyncCompany({
          companyId,
          companyName: body.companyName || body.company?.name || loadCompany(companyId)?.name || "",
          period: body.period || currentPeriod(),
          pull: body.pull !== false,
          autoRelease: body.autoRelease !== false,
          reason: body.reason || "manual_auto_sync",
          forceAsk: body.forceAsk !== false,
          probeWebhook: body.probeWebhook === true,
        });
        audit({
          type: "payroll.auto_sync",
          outcome: result.ok ? "ok" : (result.waitingForPlatform ? "wait" : "error"),
          ip,
          path,
          companyId,
        });
        return reply(200, result);
      }
      const result = await runAutoPipelineOnce({ force: true, period: body.period });
      return reply(200, result);
    }

    if (
      req.method === "POST"
      && (path === "/v1/platform/ping" || path === "/v1/sync/ping")
    ) {
      const probe = await probePlatformWebhook();
      return reply(probe.ok ? 200 : 502, {
        ok: probe.ok,
        webhook: probe,
        message: probe.ok
          ? "Plattform-Webhook erreichbar."
          : (probe.hint || probe.error || "Webhook nicht erreichbar"),
        platformShould: {
          receiveEvents: [
            "document.released",
            "payslip.released",
            "lstb.released",
            "verdienst.released",
            "invoice.released",
            "platform.ping",
          ],
          thenSendToAccounting: [
            "POST /v1/employees/import",
            "POST /v1/payroll/batch",
            "POST /v1/invoice/batch",
            "POST /v1/invoice/ingest",
          ],
          pollFallback: [
            "GET /v1/messages/pending",
            "GET /v1/delivery/pending",
          ],
        },
      });
    }

    if (
      req.method === "POST"
      && (path === "/v1/payroll/request-data" || path === "/v1/payroll/ask-platform")
    ) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(
        body.companyId || body.company?.id || tenantScope || ""
      );
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Daten-Anfrage");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      if (!companyId) return reply(422, { ok: false, error: "companyId fehlt" });

      // Prefer enriching an existing job (pull first, ask only leftovers)
      const jobId = String(body.jobId || "").trim();
      if (jobId) {
        const enriched = await enrichPayrollJob(jobId, {
          tenantScope: tenantScope || companyId,
          employeeId: body.employeeId || body.badgeId,
          period: body.period || currentPeriod(),
          pull: body.pull !== false,
          ask: true,
          forceNotify: body.forceNotify === true || body.force === true,
          forcePull: true,
        });
        if (enriched.ok) {
          audit({
            type: "payroll.request_data",
            outcome: "ok",
            ip,
            path,
            companyId,
            detail: {
              employeeId: body.employeeId || body.badgeId,
              period: body.period,
              filledCount: enriched.filledCount,
              asked: enriched.askedPlatform,
            },
          });
          // Soft platform gaps are still HTTP 200 — firm portal must not see hard 422
          return reply(200, enriched);
        }
        // Job gone / thin — fall through and still ask the platform for this employee
        if (enriched.code !== "tenant_denied") {
          /* continue to requestEmployeeDataFromPlatform */
        } else {
          audit({
            type: "payroll.request_data",
            outcome: "error",
            ip,
            path,
            companyId,
            detail: { error: enriched.error, jobId },
          });
          return reply(403, enriched);
        }
      }

      const result = await requestEmployeeDataFromPlatform({
        companyId,
        companyName: body.companyName || body.company?.name || "",
        employeeId: body.employeeId || body.badgeId || body.employee?.id,
        badgeId: body.badgeId || body.employee?.badgeId || body.employeeId,
        employeeName: body.employeeName || body.employee?.name || "",
        period: body.period || currentPeriod(),
        gaps: body.gaps || body.errors || [],
        softGaps: body.softGaps || [],
        jobId: body.jobId,
        tenantScope: tenantScope || companyId,
        pull: body.pull !== false,
        forceNotify: true,
        reason: body.reason || "manual_request",
      });
      audit({
        type: "payroll.request_data",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { employeeId: result.employeeId, period: result.period },
      });
      // Asking the platform is success even when data is still incomplete
      return reply(result.ok ? 200 : 422, result);
    }

    if (
      req.method === "POST"
      && (path === "/v1/payroll/month-close" || path === "/v1/payroll/auto-close")
    ) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(
        body.companyId || body.company?.id || tenantScope || ""
      );
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Month-Close");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply(403, { ok: false, error: scopeCheck.error });
      }
      if (!companyId) {
        return reply(422, { ok: false, error: "companyId fehlt für Monatsabschluss" });
      }
      const gate = requireHumanConfirm(body, "month_close");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await runMonthClose({
        companyId,
        period: body.period || currentPeriod(),
        autoRelease: body.autoRelease !== false,
        pull: body.pull !== false,
        batch: body.batch || null,
        tenantScope: tenantScope || companyId,
      });
      audit({
        type: "payroll.month_close",
        outcome: result.ok ? "ok" : (result.waitingForPlatform ? "wait" : "error"),
        ip,
        path,
        companyId,
        detail: {
          period: result.period,
          released: result.newlyReleased?.length || 0,
          pullSkipped: result.pull?.skipped,
          waitingForPlatform: result.waitingForPlatform,
          humanConfirm: true,
        },
      });
      // Waiting for platform data is not a hard failure – UI shows guidance (HTTP 200)
      const status = result.ok || result.waitingForPlatform ? 200 : 422;
      return reply(status, result);
    }

    if (req.method === "GET" && path.startsWith("/v1/payroll/") && path.endsWith("/payslip")) {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length, -"/payslip".length));
      const job = loadPayrollJob(jobId);
      if (!job) return reply( 404, { ok: false, error: "Job nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, job.company?.id, "Payslip");
      if (!scopeCheck.ok) return reply( 403, { ok: false, error: scopeCheck.error });
      return reply( 200, { ok: true, payslip: job.payslip, status: job.status });
    }

    if (req.method === "POST" && path.startsWith("/v1/payroll/") && path.endsWith("/enrich")) {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length, -"/enrich".length));
      const body = (await readBodyLimited(req)) || {};
      let result;
      try {
        result = await enrichPayrollJob(jobId, {
          tenantScope,
          pull: body.pull !== false,
          ask: body.ask !== false,
          forceNotify: body.forceNotify === true,
          forcePull: body.forcePull !== false,
          period: body.period,
          employeeId: body.employeeId || body.badgeId,
        });
      } catch (e) {
        result = { ok: false, error: e.message || String(e), job: null, filledCount: 0 };
      }
      audit({
        type: "payroll.enrich",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id,
        detail: { jobId, filledCount: result.filledCount, asked: result.askedPlatform, error: result.error || null },
      });
      if (result.ok) return reply(200, result);
      if (String(result.error || "").includes("Tenant-Isolation") || result.code === "tenant_denied") {
        return reply(403, result);
      }
      if (String(result.error || "").includes("nicht gefunden") || result.code === "job_not_found") {
        return reply(404, result);
      }
      // Soft failure: return 200 so the firm portal can show the German message and keep working
      return reply(200, {
        ...result,
        ok: false,
        softFail: true,
        message: result.message || result.error || "Anreichern unvollständig – bitte Plattform-Daten prüfen.",
      });
    }

    if (req.method === "POST" && path === "/v1/payroll/deliver-period") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = tenantScope || body.companyId || "";
      const result = await deliverReleasedPayslips({
        companyId,
        period: body.period || currentPeriod(),
        reason: body.reason || "api_deliver_period",
      });
      // Also drain any leftover pending queue via webhook replay
      let replay = null;
      try {
        replay = await replayPendingDeliveries({
          companyId,
          reason: "after_deliver_period",
        });
      } catch { /* ignore */ }
      audit({
        type: "payroll.deliver_period",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { delivered: result.delivered, count: result.count },
      });
      return reply(200, { ...result, replay });
    }

    if (req.method === "POST" && path.startsWith("/v1/payroll/") && path.endsWith("/release")) {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length, -"/release".length));
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "release_payslip");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await releasePayrollJob(jobId, {
        tenantScope,
        actor: req._workpassSession?.email || req._workpassSession?.id || "user",
        source: "user",
        locale: resolveUiLocale(body, req.headers, body.locale, body.language, body.preferredLocale),
      });
      audit({
        type: "payroll.release",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id,
        detail: { jobId, humanConfirm: true },
      });
      const status = result.ok ? 200 : (String(result.error || "").includes("Tenant-Isolation") ? 403 : 422);
      return reply( status, result);
    }

    if (req.method === "POST" && path.startsWith("/v1/payroll/") && path.endsWith("/correct")) {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length, -"/correct".length));
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "payroll_correct");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await correctPayrollJob(jobId, {
        tenantScope,
        reason: body.reason,
        payload: body.payload,
        state: body.state,
        hours: body.hours,
        actor: req._workpassSession?.email || body.actor || "user",
        source: body.source || "user",
        correlationId: body.correlationId || body.eventId || "",
      });
      audit({
        type: "payroll.correct",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id,
        detail: { jobId, reason: body.reason || null },
      });
      const status = result.ok ? 200 : (result.status || (result.immutable ? 409 : 422));
      return reply(status, result);
    }

    if (req.method === "GET" && path === "/v1/gobd/info") {
      return reply(200, {
        ok: true,
        kind: "workpass.gobd.info.v1",
        features: {
          immutableReleased: true,
          documentRevisions: true,
          businessAudit: true,
          gobdExport: true,
          auditorReadOnly: true,
          syncLifecycle: true,
          erechnungXRechnung: true,
          syncStatuses: SYNC_STATUSES,
        },
        endpoints: {
          export: "POST /v1/gobd/export",
          audit: "GET /v1/gobd/audit",
          revisions: "GET /v1/gobd/revisions",
          sync: "GET /v1/gobd/sync",
          correct: "POST /v1/payroll/:jobId/correct",
          xrechnung: "POST /v1/invoice/:id/xrechnung",
        },
        idempotencyExample: buildIdempotencyKey({
          kind: "PAYROLL",
          period: "2026-08",
          companyId: "tenant123",
          employeeId: "employee456",
        }),
      });
    }

    if (req.method === "GET" && path === "/v1/gobd/sync") {
      const companyId = normalizeCompanyId(url.searchParams.get("companyId") || tenantScope || "");
      if (!companyId) return reply(400, { ok: false, error: "companyId erforderlich" });
      if (tenantScope && tenantScope !== companyId) {
        return reply(403, { ok: false, error: "Tenant-Isolation" });
      }
      const deliveries = listAllDeliveries({ companyId, limit: 2000 });
      const summary = summarizeSyncDeliveries(deliveries);
      return reply(200, { ok: true, companyId, ...summary });
    }

    if (req.method === "POST" && path === "/v1/gobd/export") {
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "gobd_export");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      if (tenantScope && companyId && tenantScope !== companyId) {
        return reply(403, { ok: false, error: "Tenant-Isolation: companyId passt nicht zur Session" });
      }
      const result = buildGobdExport({
        companyId,
        from: body.from || body.periodFrom || null,
        to: body.to || body.periodTo || null,
        include: body.include,
        actor: req._workpassSession?.email || body.actor || "user",
        correlationId: body.correlationId || body.eventId || "",
      });
      audit({
        type: "gobd.export",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { exportId: result.exportId || null },
      });
      if (!result.ok) return reply(result.status || 400, result);
      recordExportRun({
        companyId,
        period: body.period || currentPeriod(),
        kind: "gobd",
        fileName: result.fileName || "GoBD.zip",
        meta: { exportId: result.exportId || null },
      });
      return reply(200, {
        ok: true,
        exportId: result.exportId,
        fileName: result.fileName,
        manifest: result.manifest,
        package: body.includePackage === false ? undefined : result.package,
      });
    }

    if (req.method === "GET" && path === "/v1/gobd/audit") {
      const companyId = normalizeCompanyId(url.searchParams.get("companyId") || tenantScope || "");
      if (!companyId) return reply(400, { ok: false, error: "companyId erforderlich" });
      if (tenantScope && tenantScope !== companyId) {
        return reply(403, { ok: false, error: "Tenant-Isolation" });
      }
      const rows = listBusinessAudit({
        companyId,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
        employeeId: url.searchParams.get("employeeId") || undefined,
        entityId: url.searchParams.get("entityId") || undefined,
        correlationId: url.searchParams.get("correlationId") || undefined,
        limit: Number(url.searchParams.get("limit") || 200),
      });
      return reply(200, {
        ok: true,
        companyId,
        count: rows.length,
        verify: verifyBusinessAuditChain({ companyId, limit: 2000 }),
        events: rows,
      });
    }

    if (req.method === "GET" && path === "/v1/gobd/revisions") {
      const companyId = normalizeCompanyId(url.searchParams.get("companyId") || tenantScope || "");
      if (!companyId) return reply(400, { ok: false, error: "companyId erforderlich" });
      if (tenantScope && tenantScope !== companyId) {
        return reply(403, { ok: false, error: "Tenant-Isolation" });
      }
      const rows = listRevisions({
        companyId,
        entityType: url.searchParams.get("entityType") || undefined,
        entityId: url.searchParams.get("entityId") || undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
        limit: Number(url.searchParams.get("limit") || 200),
      });
      return reply(200, { ok: true, companyId, count: rows.length, revisions: rows });
    }

    if (req.method === "GET" && path.startsWith("/v1/gobd/revisions/")) {
      const revisionId = decodeURIComponent(path.slice("/v1/gobd/revisions/".length));
      const rev = getRevision(revisionId);
      if (!rev) return reply(404, { ok: false, error: "Revision nicht gefunden" });
      if (tenantScope && rev.companyId && tenantScope !== rev.companyId) {
        return reply(403, { ok: false, error: "Tenant-Isolation" });
      }
      return reply(200, { ok: true, revision: rev });
    }

    if (req.method === "GET" && path.startsWith("/v1/payroll/") && path !== "/v1/payroll") {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length));
      if (jobId.includes("/")) return reply(404, { ok: false, error: "Not found" });
      const job = loadPayrollJob(jobId);
      if (!job) return reply(404, { ok: false, error: "Job nicht gefunden", code: "job_not_found" });
      if (isDemoPayrollJob(job)) {
        return reply(404, {
          ok: false,
          error: "Beispieldaten-Job – nicht verfügbar. Bitte echte Plattform-Daten laden.",
          code: "demo_job_hidden",
        });
      }
      const scopeCheck = assertSameTenant(tenantScope, job.company?.id, "Payroll-Job");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, { ok: true, job });
    }

    if (req.method === "GET" && path === "/v1/inbox") {
      const status = url.searchParams.get("status") || undefined;
      const period = url.searchParams.get("period") || undefined;
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const payroll = listPayrollJobs({ status, period, companyId })
        .filter((j) => !isDemoPayrollJob(j))
        .map((j) => ({
        type: "payroll",
        jobId: j.jobId,
        status: j.status,
        period: j.period,
        company: j.company,
        employee: j.employee,
        net: j.payslip?.totals?.net,
        gross: j.payslip?.totals?.gross,
        updatedAt: j.updatedAt,
        releasedAt: j.releasedAt,
      }));
      const invoices = listInvoiceJobs({ status, companyId }).map((j) => ({
        type: "invoice",
        id: j.id,
        status: j.status,
        number: j.draft?.number,
        customer: j.draft?.customer,
        company: j.company,
        gross: j.draft?.totals?.gross,
        updatedAt: j.updatedAt,
        releasedAt: j.releasedAt,
      }));
      return reply( 200, { ok: true, companyId: companyId || null, payroll, invoices });
    }

    // --- Firm portal (employees / month / archive) ---
    if (req.method === "GET" && path === "/v1/portal/employees") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || undefined;
      const fromJobs = listCompanyEmployees(companyId, { period });
      if (!fromJobs.ok) return reply(422, fromJobs);
      const registered = listEmployees(companyId).filter((e) => !isDemoEmployeeRecord(e));
      const byBadge = new Map();
      for (const e of registered) {
        byBadge.set(e.badgeId, {
          id: e.badgeId,
          badgeId: e.badgeId,
          name: e.name,
          personnelNumber: e.personnelNumber || "",
          source: "registry",
          lastPeriod: null,
          lastStatus: null,
          net: null,
          gross: null,
        });
      }
      for (const e of (fromJobs.employees || [])) {
        const prev = byBadge.get(e.id) || {};
        byBadge.set(e.id, {
          ...prev,
          ...e,
          badgeId: prev.badgeId || e.badgeId || e.id,
          personnelNumber: prev.personnelNumber || e.personnelNumber || "",
          source: "platform",
        });
      }
      const employees = [...byBadge.values()].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "de")
      );
      return reply(200, {
        ok: true,
        companyId,
        period: period || null,
        count: employees.length,
        employees,
        onlyRealEmployees: true,
        hint: employees.length
          ? "Nur echte Mitarbeiter von der Plattform (keine Demo-/Beispieldaten)."
          : "Noch keine echten Mitarbeiter. Die Plattform muss Name + Badge-ID / Lohnbatch senden.",
      });
    }

    if (req.method === "POST" && (path === "/v1/employees/import" || path === "/v1/portal/employees/import")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Employee-Import");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const list = Array.isArray(body.employees) ? body.employees : (body.employee ? [body.employee] : []);
      const result = importEmployees(companyId, list, { source: body.source || "api" });
      let acked = null;
      if (result.count > 0) {
        acked = ackOpenRequests({
          companyId,
          period: body.period || currentPeriod(),
          types: ["employees.list.requested"],
          meta: { reason: "employees_import", readBy: "accounting-auto" },
        });
      }
      audit({
        type: "employees.import",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { count: result.count, acked: acked?.acked || 0 },
      });
      let sync = null;
      if (result.count > 0 && body.autoSync !== false) {
        try {
          sync = await askPlatformAndSyncCompany({
            companyId,
            companyName: body.company?.name || loadCompany(companyId)?.name || "",
            period: body.period || currentPeriod(),
            pull: body.pull !== false,
            autoRelease: body.autoRelease !== false,
            reason: "employees_import",
            forceAsk: body.forceAsk === true,
          });
        } catch (e) {
          sync = { ok: false, error: e.message };
        }
      }
      return reply(result.ok ? 200 : 422, {
        ...result,
        ackedRequests: acked,
        autoSync: sync,
        message: result.count
          ? `Mitarbeiter übernommen (${result.count}). WorkPass Lohn fragt automatisch nach Monats-/Lohndaten.`
          : (result.errors?.join?.(" · ") || "Import fehlgeschlagen"),
      });
    }

    if (req.method === "GET" && path === "/v1/portal/month") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const result = monthOverview(companyId, { period, months: Number(url.searchParams.get("months") || 6) });
      if (!result.ok) return reply(422, result);
      return reply(200, result);
    }

    if (req.method === "GET" && (path === "/v1/portal/automation-status" || path === "/v1/automation/status")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Automation");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = getCompanyAutomationStatus(companyId, period);
      if (!result.ok) return reply(422, result);
      const { monthlyCycleStatusSnapshot } = await import("./monthly-cycle.mjs");
      return reply(200, {
        ...result,
        kind: "portal.automation.status.v1",
        monthlyCycle: monthlyCycleStatusSnapshot(companyId, period),
        monthClose: autoMonthCloseStatus(),
        autoPipeline: autoPipelineStatus(),
      });
    }

    if (req.method === "GET" && path === "/v1/portal/archive") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || undefined;
      const result = listReleasedArchive(companyId, {
        period,
        includeAll: url.searchParams.get("all") === "1",
      });
      if (!result.ok) return reply(422, result);
      return reply(200, result);
    }

    if (req.method === "GET" && path === "/v1/portal/certificates/summary") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Bescheinigungen");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, listCertificateSummary(companyId, year));
    }

    if (req.method === "GET" && path === "/v1/portal/certificates/lstb") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const employeeId = url.searchParams.get("employeeId") || url.searchParams.get("badgeId") || "";
      const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LStB");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = buildEmployeeLstbCertificate(companyId, employeeId, year);
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "GET" && path === "/v1/portal/certificates/verdienst") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const employeeId = url.searchParams.get("employeeId") || url.searchParams.get("badgeId") || "";
      const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
      const period = url.searchParams.get("period") || undefined;
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Verdienstbescheinigung");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = buildEmployeeVerdienstCertificate(companyId, employeeId, year, period);
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "POST" && path === "/v1/portal/certificates/lstb/deliver") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const employeeId = body.employeeId || body.badgeId || "";
      const year = Number(body.year) || new Date().getFullYear();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LStB-Zustellung");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "certificate_deliver");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await deliverEmployeeLstb(companyId, employeeId, year, {
        printed: body.printed === true,
        forceRedeliver: body.forceRedeliver === true,
        reason: body.reason || (body.printed ? "print" : "send"),
        requireConfirm: body.requireConfirm !== false,
        locale: resolveUiLocale(body, req.headers, body.locale, body.language, body.preferredLocale),
      });
      audit({
        type: "portal.lstb_deliver",
        outcome: result.confirmed ? "ok" : (result.ok ? "pending" : "error"),
        ip,
        path,
        companyId,
        detail: {
          employeeId,
          year,
          printed: body.printed === true,
          humanConfirm: true,
          confirmed: Boolean(result.confirmed),
          trust: result.trust || null,
          deliveryId: result.delivery?.deliveryId || null,
        },
      });
      // 200 when queued (like payslip) so UI receives full payload; ok/confirmed tell the truth.
      const httpStatus = result.delivery || result.ok ? 200 : (result.status || 422);
      return reply(httpStatus, result);
    }

    if (req.method === "POST" && path === "/v1/portal/certificates/verdienst/deliver") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const employeeId = body.employeeId || body.badgeId || "";
      const year = Number(body.year) || new Date().getFullYear();
      const period = body.period || undefined;
      const scopeCheck = assertSameTenant(tenantScope, companyId, "VB-Zustellung");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "certificate_deliver");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await deliverEmployeeVerdienst(companyId, employeeId, year, period, {
        printed: body.printed === true,
        forceRedeliver: body.forceRedeliver === true,
        reason: body.reason || (body.printed ? "print" : "send"),
        requireConfirm: body.requireConfirm !== false,
        locale: resolveUiLocale(body, req.headers, body.locale, body.language, body.preferredLocale),
      });
      audit({
        type: "portal.verdienst_deliver",
        outcome: result.confirmed ? "ok" : (result.ok ? "pending" : "error"),
        ip,
        path,
        companyId,
        detail: {
          employeeId,
          year,
          period: period || null,
          printed: body.printed === true,
          humanConfirm: true,
          confirmed: Boolean(result.confirmed),
          trust: result.trust || null,
          deliveryId: result.delivery?.deliveryId || null,
        },
      });
      const httpStatus = result.delivery || result.ok ? 200 : (result.status || 422);
      return reply(httpStatus, result);
    }

    if (req.method === "POST" && (path === "/v1/portal/certificates/lstb/deliver-year" || path === "/v1/portal/certificates/lstb/deliver-all")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const year = Number(body.year) || new Date().getFullYear();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LStB-Jahr-Zustellung");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "certificate_deliver");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await deliverYearLstb(companyId, year, {
        printed: body.printed === true,
        forceRedeliver: body.forceRedeliver === true,
        reason: body.reason || (body.printed ? "print" : "send"),
        requireConfirm: body.requireConfirm !== false,
        locale: resolveUiLocale(body, req.headers, body.locale, body.language, body.preferredLocale),
      });
      audit({
        type: "portal.lstb_deliver_year",
        outcome: result.confirmed ? "ok" : (result.ok ? "pending" : "error"),
        ip,
        path,
        companyId,
        detail: {
          year,
          okCount: result.okCount,
          confirmedCount: result.confirmedCount,
          count: result.count,
          humanConfirm: true,
        },
      });
      return reply(200, result);
    }

    if (req.method === "GET" && path === "/v1/portal/certificates/delivery-status") {
      const deliveryId = url.searchParams.get("deliveryId") || "";
      const result = verifyCertificateDelivery(deliveryId);
      return reply(result.ok ? 200 : 404, result);
    }

    if (req.method === "GET" && path === "/v1/portal/branding") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Branding");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = brandingHealth(companyId);
      if (!result.ok) return reply(result.error === "Firma nicht gefunden" ? 404 : 422, result);
      return reply(200, { kind: "portal.branding.v1", ...result });
    }

    if (req.method === "GET" && (path === "/v1/portal/month-export" || path === "/v1/portal/datev-export")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Monats-Export");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = buildMonthDatevExport(companyId, {
        period,
        includeCalculated: url.searchParams.get("calculated") === "1",
      });
      if (!result.ok) return reply(422, result);
      return reply(200, { kind: "portal.datev.month.v1", ...result });
    }

    if (req.method === "GET" && (path === "/v1/portal/lodas-export" || path === "/v1/portal/month-lodas")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LODAS-Export");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = buildMonthLodasPackage(companyId, {
        period,
        includeCalculated: url.searchParams.get("calculated") === "1",
      });
      if (!result.ok) return reply(422, result);
      return reply(200, result);
    }

    if (req.method === "GET" && (path === "/v1/portal/completeness" || path === "/v1/portal/checklist")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Vollständigkeit");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = monthCompleteness(companyId, { period });
      if (!result.ok) return reply(422, result);
      return reply(200, result);
    }

    if (req.method === "GET" && path === "/v1/portal/compliance-calendar") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Compliance");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const dauerfrist = url.searchParams.get("dauerfrist") === "1";
      return reply(200, buildComplianceCalendar(period, { companyId, dauerfrist }));
    }

    if (req.method === "GET" && path === "/v1/portal/delivery-reconciliation") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Delivery-Reconciliation");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, buildDeliveryReconciliation(companyId, { period }));
    }

    if (req.method === "GET" && path === "/v1/portal/year-end") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const year = url.searchParams.get("year") || String(new Date().getFullYear());
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Jahresabschluss");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, buildYearEndWizard(companyId, year));
    }

    if (req.method === "GET" && path === "/v1/portal/export-status") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Export-Status");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, exportStatusSummary(companyId, period));
    }

    if (req.method === "POST" && path === "/v1/portal/export-import") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Export-Import");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "export_import");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = importBankStatus({
        companyId,
        period: body.period || currentPeriod(),
        kind: body.kind || "sepa",
        content: body.content || body.text || body.xml || "",
        source: body.source || "pain.002",
      });
      audit({
        type: "portal.export_import",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { bankStatus: result.bankStatus || null, kind: body.kind || "sepa" },
      });
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "GET" && path === "/v1/portal/delivery-trust") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Delivery-Trust");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, buildDeliveryTrust(companyId, { period }));
    }

    if (req.method === "POST" && path === "/v1/portal/delivery-trust/replay") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Delivery-Replay");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "delivery_replay");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const period = body.period || currentPeriod();
      let deliver = null;
      try {
        deliver = await deliverReleasedPayslips({
          companyId,
          period,
          reason: "portal_trust_replay",
        });
      } catch (e) {
        deliver = { ok: false, error: e.message };
      }
      const replay = await replayPendingDeliveries({
        companyId,
        reason: "portal_trust_replay",
      });
      const trust = buildDeliveryTrust(companyId, { period });
      audit({
        type: "portal.delivery_replay",
        outcome: replay?.ok !== false ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { period, humanConfirm: true },
      });
      return reply(200, {
        ok: true,
        humanFinal: true,
        deliver,
        replay,
        trust,
      });
    }

    if (req.method === "GET" && path === "/v1/portal/anomalies") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Anomalies");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, detectPayrollAnomalies(companyId, { period }));
    }

    if (req.method === "GET" && path === "/v1/portal/elster-prep") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "ELSTER-Prep");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, buildElsterPrepChecklist(companyId, { period }));
    }

    if (req.method === "POST" && path === "/v1/portal/payroll/simulate") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Simulate");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const aiGate = assertNotAiApplyingLaw(body);
      if (!aiGate.ok) return reply(aiGate.status || 403, aiGate);
      const result = simulatePayroll(body, { companyId });
      audit({
        type: "payroll.simulate",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { simulation: true, persisted: false },
      });
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && path === "/v1/portal/assistant/explain") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Assistant");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = explainPortalGaps({ ...body, companyId });
      if (!result.ok) return reply(result.status || 422, result);
      return reply(200, result);
    }

    if (req.method === "POST" && path === "/v1/portal/assistant/apply-engine-tax") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Assistant-Engine");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm({ ...body, applyEngineTax: true }, "apply_engine_tax");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await applyEngineTax({ ...body, companyId, applyEngineTax: true });
      audit({
        type: "assistant.apply_engine_tax",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { applied: result.applied?.length || 0, skipped: result.skipped?.length || 0 },
      });
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "GET" && path === "/v1/portal/elster-cert") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const scopeCheck = assertSameTenant(tenantScope, companyId, "ELSTER-Zertifikat");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, elsterCertStatus(companyId));
    }

    if (req.method === "POST" && path === "/v1/portal/elster-cert") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "ELSTER-Zertifikat");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "elster_cert_save");
      if (!gate.ok) return reply(gate.status || 422, gate);
      try {
        const saved = saveElsterCert({
          companyId,
          p12Base64: body.p12Base64 || body.p12 || body.certificate,
          pin: body.pin || body.password,
          autoSubmit: body.autoSubmit === true,
        });
        audit({ type: "elster.cert_save", outcome: "ok", ip, path, companyId, detail: { autoSubmit: saved.autoSubmit } });
        return reply(200, { ...saved, message: "ELSTER-Zertifikat verschlüsselt gespeichert." });
      } catch (e) {
        return reply(422, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === "GET" && path === "/v1/portal/elster-submissions") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const scopeCheck = assertSameTenant(tenantScope, companyId, "ELSTER");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, {
        ok: true,
        channel: elsterChannelStatus(),
        submissions: listElsterSubmissions(companyId),
      });
    }

    if (req.method === "GET" && path === "/v1/portal/lsta") {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const period = url.searchParams.get("period") || currentPeriod();
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LStA");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const draft = buildMonthLsta(companyId, period);
      if (!draft.ok) return reply(draft.status || 422, draft);
      return reply(200, { ...draft, xml: undefined, channel: elsterChannelStatus() });
    }

    if (req.method === "POST" && path === "/v1/portal/lsta-submit") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LStA");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "lsta_submit");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await submitElsterLsta({
        companyId,
        period: body.period || currentPeriod(),
        actor: "user",
      });
      audit({
        type: "elster.lsta",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { period: result.period, status: result.status, mode: result.mode },
      });
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "POST" && path === "/v1/portal/elster-submit") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "ELSTER");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "elster_submit");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = await submitElsterYear({
        companyId,
        period: body.period || currentPeriod(),
        year: body.year,
        actor: "user",
      });
      audit({
        type: "elster.submit",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { year: result.year, status: result.status, mode: result.mode },
      });
      return reply(result.ok ? 200 : (result.status || 422), result);
    }

    if (req.method === "POST" && (path === "/v1/portal/sepa-export" || path === "/v1/portal/sepa")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "SEPA");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "sepa_export");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = buildSepaCreditTransfer(companyId, {
        period: body.period || currentPeriod(),
        debtorIban: body.debtorIban,
        debtorBic: body.debtorBic,
        debtorName: body.debtorName,
        executionDate: body.executionDate,
      });
      audit({
        type: "portal.sepa_export",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { count: result.count, period: result.period, humanConfirm: true },
      });
      if (result.ok) {
        recordExportRun({
          companyId,
          period: result.period || body.period || currentPeriod(),
          kind: "sepa",
          fileName: "SEPA.xml",
          meta: { count: result.count },
        });
      }
      return reply(result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && (path === "/v1/portal/datev-export" || path === "/v1/portal/month-export")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "DATEV");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "datev_export");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = buildMonthDatevExport(companyId, {
        period: body.period || currentPeriod(),
        includeCalculated: body.includeCalculated === true,
      });
      audit({
        type: "portal.datev_export",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { humanConfirm: true },
      });
      if (!result.ok) return reply(422, result);
      recordExportRun({
        companyId,
        period: result.period || body.period || currentPeriod(),
        kind: "datev",
        fileName: "DATEV.csv",
      });
      return reply(200, { kind: "portal.datev.month.v1", humanFinal: true, ...result });
    }

    if (req.method === "POST" && (path === "/v1/portal/lodas-export" || path === "/v1/portal/month-lodas")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "LODAS");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const gate = requireHumanConfirm(body, "lodas_export");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const result = buildMonthLodasPackage(companyId, {
        period: body.period || currentPeriod(),
        includeCalculated: body.includeCalculated === true,
      });
      audit({
        type: "portal.lodas_export",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { humanConfirm: true },
      });
      if (!result.ok) return reply(422, result);
      recordExportRun({
        companyId,
        period: result.period || body.period || currentPeriod(),
        kind: "lodas",
        fileName: "LODAS.txt",
      });
      return reply(200, { humanFinal: true, ...result });
    }

    if (req.method === "GET" && (path === "/v1/portal/invoices" || path === "/v1/invoices")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || "";
      const result = listInvoiceArchive(companyId, {
        status: url.searchParams.get("status") || undefined,
        period: url.searchParams.get("period") || undefined,
        includeAll: url.searchParams.get("all") === "1",
      });
      if (!result.ok) return reply(422, result);
      return reply(200, result);
    }

    // Demo seed / pull without real platform (admin / explicit only – not firm portal default)
    if (req.method === "POST" && (path === "/v1/demo/seed-month" || path === "/v1/demo/payroll-export")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Demo");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      if (!companyId) return reply(422, { ok: false, error: "companyId fehlt" });
      const sess = req._workpassSession;
      if (sess && sess.role !== "admin" && !body.confirmDemo) {
        return reply(403, {
          ok: false,
          error: "Demo-Daten sind im Firmenportal deaktiviert. Nur echte Plattform-Mitarbeiter werden angezeigt.",
        });
      }
      const period = body.period || currentPeriod();
      const batch = buildDemoPayrollBatch({ companyId, period });
      if (!batch.ok) return reply(422, batch);
      if (path === "/v1/demo/payroll-export" || body.exportOnly) {
        return reply(200, batch);
      }
      const ingested = await ingestPayrollBatch(batch, {
        tenantScope: tenantScope || companyId,
        demo: true,
      });
      audit({
        type: "demo.seed_month",
        outcome: ingested.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { period, count: ingested.count },
      });
      return reply(ingested.ok ? 200 : 422, {
        ok: ingested.ok,
        period,
        companyId,
        batch,
        ingest: ingested,
        message: ingested.ok
          ? `Demo-Monat ${period}: ${ingested.count} Beispiel-Mitarbeiter (nicht in der echten Liste sichtbar)`
          : (ingested.errors?.join?.(" · ") || "Demo-Seed fehlgeschlagen"),
      });
    }

    if (req.method === "POST" && (path === "/v1/demo/purge" || path === "/v1/portal/purge-demo")) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.companyId || body.company?.id || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Demo-Purge");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      if (!companyId) return reply(422, { ok: false, error: "companyId fehlt" });
      const result = purgeDemoPayroll(companyId);
      audit({
        type: "demo.purge",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { purgedJobs: result.purgedJobs, purgedEmployees: result.purgedEmployees },
      });
      return reply(result.ok ? 200 : 422, result);
    }

    // --- Platform sync status (messages + deliveries + last webhook) ---
    if (req.method === "GET" && (path === "/v1/platform/status" || path === "/v1/sync/status")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const pendingMessages = listPendingMessagesForPlatform({ companyId, limit: 100 });
      const pendingDeliveries = listPendingDeliveries({ companyId });
      const auto = autoPipelineStatus();
      const last = auto.lastResult || {};
      const webhookConfigured = Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL);
      const wh = getLastWebhookStatus();
      const pendingCount = pendingMessages.length + pendingDeliveries.length;
      let status = "ready";
      let message = last.message || null;
      let nextActions = Array.isArray(last.nextActions) ? [...last.nextActions] : [];
      if (webhookConfigured && wh?.ok === false) {
        status = "error";
        const keyInfo = resolveWebhookKey();
        message = message
          || wh.hint
          || `Webhook-Fehler ${wh.status || ""} ${wh.error || ""}`.trim();
        if (wh.status === 401 || wh.status === 403) {
          nextActions = [
            wh.hint || "401: Webhook-Key stimmt nicht mit der Plattform überein",
            "Railway Variables: WORKPASS_PLATFORM_WEBHOOK_KEY = gleicher Secret wie auf der Plattform",
            keyInfo.source === "WORKPASS_API_KEY"
              ? "Hinweis: aktuell wird WORKPASS_API_KEY als Fallback genutzt – oft falsch"
              : (keyInfo.source === "missing"
                ? "WORKPASS_PLATFORM_WEBHOOK_KEY fehlt komplett"
                : "Key ist gesetzt – Wert mit Plattform abgleichen (Leerzeichen/Altes Secret)"),
            "Danach in Lohn „Webhook prüfen“ oder Hub „Sync prüfen“",
          ];
        } else if (!nextActions.length) {
          nextActions = [
            wh.hint || "Auf der Plattform den Webhook-Endpoint live schalten",
            "Erwartete URL: WORKPASS_PLATFORM_WEBHOOK_URL",
            "Danach Sync erneut prüfen",
          ];
        }
      } else if (last.waitingForPlatform || pendingCount > 0) {
        status = "waiting";
        const delN = pendingDeliveries.length;
        message = message || (delN > 0
          ? `${delN} Abrechnung(en) warten auf Plattform (Webhook ohne Bestätigung oder Pull von /v1/delivery/pending)`
          : (pendingCount > 0
            ? `Warte auf Plattform · ${pendingCount} offen`
            : "Warte auf Plattform-Antwort"));
        if (!nextActions.length) {
          nextActions = delN > 0
            ? [
              "Plattform muss Event document.released (documentType=payslip|lstb|verdienst) speichern und dem Mitarbeiter anzeigen",
              "Antwort JSON: { ok:true, accepted:true }",
              "Oder pollen: GET /v1/delivery/pending und danach POST /v1/delivery/:id/ack",
            ]
            : [
              "Plattform soll Import/Batch senden (Mitarbeiter, Monat, Rechnungen)",
              "In Lohn-Portal: Empfang → API-Bridge → Jetzt synchronisieren",
            ];
        }
      } else if (auto.enabled === false) {
        status = "manual";
        message = message || "Automatik aus · manuell synchronisieren";
        if (!nextActions.length) {
          nextActions = ["WORKPASS_AUTO_PIPELINE=1 setzen oder manuell syncen"];
        }
      } else if (last.ok || auto.lastSuccessAt) {
        status = "ok";
        message = message || (auto.lastSuccessAt
          ? `Automatik an · letzter Erfolg ${auto.lastSuccessAt}`
          : "Automatik an");
      }
      const automation = companyId
        ? getCompanyAutomationStatus(companyId, url.searchParams.get("period") || currentPeriod())
        : null;
      return reply(200, {
        ok: true,
        kind: "platform.accounting.sync.v1",
        schemaVersion: 4,
        companyId: companyId || null,
        accountingVersion: ACCOUNTING_VERSION,
        capabilities: platformCapabilities(),
        status,
        message,
        nextActions,
        autoPipeline: auto,
        autoMonthClose: autoMonthCloseStatus(),
        automation,
        webhook: {
          configured: webhookConfigured,
          keyConfigured: webhookKeyConfigured(),
          keySource: resolveWebhookKey().source,
          urlSuggested: platformWebhookUrl(),
          last: wh,
        },
        pullUrlConfigured: resolvePlatformPullUrls().length > 0,
        pullUrls: resolvePlatformPullUrls().slice(0, 5),
        pending: {
          messages: pendingMessages.length,
          deliveries: pendingDeliveries.length,
        },
        messages: pendingMessages,
        deliveries: pendingDeliveries,
        hints: [
          "Auto: WorkPass fragt nach Mitarbeitern + Monat + Rechnungen (employees.list.requested / payroll.month.requested / invoices.export.requested)",
          "Plattform sendet → POST /v1/employees/import, /v1/payroll/batch, /v1/invoice/batch → Auto berechnen/übernehmen + freigeben",
          "Manuell: POST /v1/payroll/auto-sync { companyId, period }",
          "Archiv: GET /v1/portal/invoices · Railway: WORKPASS_AUTO_PIPELINE=1",
        ],
      });
    }

    // --- Platform ↔ Accounting messages ---
    if (req.method === "GET" && path === "/v1/messages/pending") {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const messages = listPendingMessagesForPlatform({ companyId, limit: 100 });
      return reply(200, {
        ok: true,
        kind: "platform.accounting.messages.pending.v1",
        count: messages.length,
        messages,
        hint: "Nach Lesen/Klick: POST /v1/messages/:messageId/ack – dann verschwindet die Nachricht.",
      });
    }

    if (req.method === "GET" && path === "/v1/messages") {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const messages = listMessages({
        companyId,
        status: status || undefined,
        openOnly: !status,
        limit: 100,
      });
      const seen = listSeenConfirmations({ companyId, sinceHours: 72, limit: 40 });
      return reply(200, {
        ok: true,
        count: messages.length,
        stats: messageStats(companyId),
        messages,
        seenConfirmations: seen,
        hint: "seenConfirmations = Aufträge, die die Plattform bereits gelesen hat.",
      });
    }

    if (req.method === "GET" && (path === "/v1/messages/seen" || path === "/v1/platform/seen")) {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const seen = listSeenConfirmations({
        companyId,
        sinceHours: Number(url.searchParams.get("hours") || 72),
        limit: 50,
      });
      return reply(200, {
        ok: true,
        kind: "platform.accounting.seen.list.v1",
        count: seen.length,
        confirmations: seen,
      });
    }

    if (req.method === "POST" && path === "/v1/messages") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(body.company?.id || body.companyId || tenantScope || "");
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Message");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = await upsertPlatformMessage({
        ...body,
        companyId,
        company: { id: companyId, name: body.company?.name || body.companyName },
        direction: body.direction || "accounting_to_platform",
      });
      audit({
        type: "message.create",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
      });
      return reply(result.ok ? 200 : 422, result);
    }

    if (
      req.method === "POST"
      && path.startsWith("/v1/messages/")
      && (path.endsWith("/ack") || path.endsWith("/read") || path.endsWith("/open") || path.endsWith("/received"))
    ) {
      let stage = "seen";
      let cut = "/ack".length;
      if (path.endsWith("/read")) { stage = "seen"; cut = "/read".length; }
      else if (path.endsWith("/open")) { stage = "opened"; cut = "/open".length; }
      else if (path.endsWith("/received")) { stage = "received"; cut = "/received".length; }
      else if (path.endsWith("/ack")) { stage = "seen"; cut = "/ack".length; }
      const messageId = decodeURIComponent(path.slice("/v1/messages/".length, -cut));
      const existing = loadMessage(messageId);
      if (!existing) return reply(404, { ok: false, error: "Nachricht nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, existing.company?.id, "Message");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const body = (await readBodyLimited(req)) || {};
      const result = markMessageReceipt(messageId, body.stage || stage, {
        readBy: body.readBy || body.actor || "platform",
        note: body.note || "",
        opened: body.opened,
        seen: body.seen,
        received: body.received,
        viewed: body.viewed,
      });
      audit({
        type: `message.${stage}`,
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: existing.company?.id,
      });
      return reply(result.ok ? 200 : 404, result);
    }

    if (req.method === "GET" && path.startsWith("/v1/messages/") && path !== "/v1/messages/pending") {
      const messageId = decodeURIComponent(path.slice("/v1/messages/".length));
      const message = loadMessage(messageId);
      if (!message) return reply(404, { ok: false, error: "Nachricht nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, message.company?.id, "Message");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      return reply(200, { ok: true, message });
    }

    // --- Delivery ---
    if (req.method === "POST" && path === "/v1/delivery/replay") {
      const body = (await readBodyLimited(req)) || {};
      const companyId = tenantScope || body.companyId || undefined;
      const result = await replayPendingDeliveries({
        companyId,
        limit: body.limit,
        reason: body.reason || "api_replay",
      });
      audit({
        type: "delivery.replay",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { pushed: result.pushed, failed: result.failed },
      });
      return reply(200, result);
    }

    if (req.method === "GET" && path === "/v1/delivery/pending") {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const pending = listPendingDeliveries({ companyId });
      return reply(200, {
        ok: true,
        kind: "platform.delivery.pending.v1",
        companyId: companyId || null,
        count: pending.length,
        deliveries: pending,
        hint: "Jedes delivery.document ist vollständig. Einzelabruf: GET /v1/delivery/:deliveryId",
      });
    }

    if (
      req.method === "GET"
      && path.startsWith("/v1/delivery/")
      && path !== "/v1/delivery/pending"
      && path !== "/v1/delivery/replay"
      && !path.endsWith("/ack")
      && !path.endsWith("/open")
      && !path.endsWith("/received")
    ) {
      const deliveryId = decodeURIComponent(path.slice("/v1/delivery/".length));
      const queued = listAllDeliveries().find((d) => d.deliveryId === deliveryId) || null;
      if (!queued) return reply(404, { ok: false, error: "Delivery nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, queued.company?.id, "Delivery");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const { ensureCompleteDeliveryDocument, verifyDeliverySeal } = await import("./document-complete.mjs");
      const ensured = ensureCompleteDeliveryDocument(queued);
      if (ensured.assessment?.tampered) {
        return reply(409, {
          ok: false,
          error: ensured.assessment.label,
          reason: "document-tampered",
          assessment: ensured.assessment,
          hint: "Gesiegeltes Dokument wurde verändert – Original nicht ausliefern.",
        });
      }
      const sealCheck = ensured.delivery?.seal
        ? verifyDeliverySeal(ensured.delivery)
        : { ok: false, reason: "not_sealed" };
      return reply(200, {
        ok: true,
        kind: "platform.delivery.full.v1",
        delivery: ensured.delivery,
        contentComplete: ensured.assessment.complete,
        immutable: Boolean(ensured.delivery?.immutable),
        seal: ensured.delivery?.seal || null,
        sealOk: Boolean(sealCheck.ok),
        documentIntegrity: ensured.delivery?.documentIntegrity || null,
        assessment: ensured.assessment,
        hint: "Vollständiges, gesiegeltes Original – auf dem Weg nicht verändert. Speichern und dem Mitarbeiter anzeigen.",
      });
    }

    if (req.method === "GET" && path === "/v1/delivery") {
      let all = listAllDeliveries();
      if (tenantScope) {
        all = all.filter((d) => normalizeCompanyId(d.company?.id) === tenantScope);
      }
      return reply( 200, { ok: true, count: all.length, deliveries: all });
    }

    if (req.method === "POST" && path.startsWith("/v1/delivery/") && (path.endsWith("/ack") || path.endsWith("/open") || path.endsWith("/received"))) {
      let stage = "seen";
      let cut = "/ack".length;
      if (path.endsWith("/open")) { stage = "opened"; cut = "/open".length; }
      else if (path.endsWith("/received")) { stage = "received"; cut = "/received".length; }
      const deliveryId = decodeURIComponent(path.slice("/v1/delivery/".length, -cut));
      const body = (await readBodyLimited(req)) || {};
      const queued = listAllDeliveries().find((d) => d.deliveryId === deliveryId);
      if (queued) {
        const scopeCheck = assertSameTenant(tenantScope, queued.company?.id, "Delivery");
        if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      }
      const result = ackDelivery(deliveryId, {
        ...body,
        stage: body.stage || stage,
        via: body.via || `delivery.${stage}`,
      });
      audit({ type: `delivery.${stage}`, outcome: result.ok ? "ok" : "error", ip, path, companyId: queued?.company?.id });
      return reply(result.ok ? 200 : 404, result);
    }

    // --- Invoices ---
    if (req.method === "POST" && path === "/v1/invoice/ingest") {
      const body = await readBodyLimited(req);
      const result = await processInboundInvoice(body, {
        tenantScope,
        autoRelease: body?.autoRelease !== false,
      });
      audit({
        type: "invoice.ingest",
        outcome: result.ok || result.released ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id || body?.company?.id,
        detail: { auto: true, released: result.released },
      });
      return reply(result.ok || result.job ? 200 : 422, result);
    }

    if (req.method === "POST" && (path === "/v1/invoice/batch" || path === "/v1/invoices/batch")) {
      const body = await readBodyLimited(req);
      const result = await processInboundInvoiceBatch(body, {
        tenantScope,
        autoRelease: body?.autoRelease !== false,
        notify: body?.notify !== false,
      });
      audit({
        type: "invoice.batch",
        outcome: result.count > 0 ? "ok" : "error",
        ip,
        path,
        companyId: result.company?.id,
        detail: { auto: true, released: result.releasedCount },
      });
      const status = result.count > 0 ? 200 : (result.ok ? 200 : 422);
      return reply(status, result);
    }

    if (req.method === "POST" && path.startsWith("/v1/invoice/") && path.endsWith("/xrechnung")) {
      const id = decodeURIComponent(path.slice("/v1/invoice/".length, -"/xrechnung".length));
      const body = (await readBodyLimited(req)) || {};
      const gate = requireHumanConfirm(body, "erechnung_export");
      if (!gate.ok) return reply(gate.status || 422, gate);
      const job = loadInvoiceJob(id);
      if (!job) return reply(404, { ok: false, error: "Rechnung nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, job.company?.id || job.draft?.company?.id, "Rechnung");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const result = buildXRechnungUbl(job);
      audit({
        type: "invoice.xrechnung",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: job.company?.id,
        detail: { id, humanConfirm: true },
      });
      if (!result.ok) return reply(422, result);
      return reply(200, { ok: true, invoiceId: id, ...result });
    }

    if (req.method === "POST" && path.startsWith("/v1/invoice/") && path.endsWith("/release")) {
      const id = decodeURIComponent(path.slice("/v1/invoice/".length, -"/release".length));
      const result = await releaseInvoiceJob(id, { tenantScope });
      audit({ type: "invoice.release", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.job?.company?.id });
      const status = result.ok ? 200 : (String(result.error || "").includes("Tenant-Isolation") ? 403 : 422);
      return reply( status, result);
    }

    if (req.method === "GET" && path.startsWith("/v1/invoice/") && path !== "/v1/invoice/batch") {
      const id = decodeURIComponent(path.slice("/v1/invoice/".length));
      if (!id || id === "batch") return reply(404, { ok: false, error: "Not found", path });
      const job = loadInvoiceJob(id);
      if (!job) return reply( 404, { ok: false, error: "Rechnung nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, job.company?.id || job.draft?.company?.id, "Rechnung");
      if (!scopeCheck.ok) return reply( 403, { ok: false, error: scopeCheck.error });
      return reply( 200, { ok: true, job });
    }

    return reply( 404, { ok: false, error: "Not found", path });
  } catch (e) {
    const status = e.statusCode || 500;
    audit({ type: "server.error", outcome: "error", ip, path, detail: { message: e.message } });
    return reply( status, { ok: false, error: e.message || String(e) });
  }
}

const server = http.createServer(handler);
server.listen(PORT, HOST, () => {
  console.log(`WorkPass Accounting Bridge listening on http://${HOST}:${PORT}`);
  console.log(`Security: AES-256-GCM at rest · key=${posture.keySource} · strict=${posture.strict}`);
  if (posture.warnings.length) console.log(`Security warnings: ${posture.warnings.join(" | ")}`);
  console.log(`HTTPS: force=${FORCE_HTTPS} (Railway edge TLS for public HTTPS)`);
  if (backupSched.ok) console.log(`Backup scheduler: every ${backupSched.intervalHours}h`);
  else console.log("Backup scheduler: off – set WORKPASS_BACKUP_INTERVAL_HOURS=24");
  if (autoPipeSched.ok) console.log(`[auto-pipeline] every ${autoPipeSched.intervalMinutes} min · asks platform for employees + payroll + invoices`);
  else console.log("[auto-pipeline] off – WORKPASS_AUTO_PIPELINE=0");
  if (deliveryReplaySched.ok) console.log(`[delivery-replay] every ${deliveryReplaySched.intervalMinutes} min`);
  else console.log("[delivery-replay] off");
  if (monthCloseSched.ok) console.log("[month-close] end-of-month scheduler on");
  console.log("Auth: X-WorkPass-Key (timing-safe) · Tenant: X-WorkPass-Company-Id");
});

server.on("error", (err) => {
  console.error("[boot] listen error:", err);
  process.exit(1);
});
