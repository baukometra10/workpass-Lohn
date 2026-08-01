/**
 * WorkPass Accounting Bridge API
 * Platform ↔ Buchhaltung – multi-tenant + hardened security
 *
 * Start: npm start
 * Auth: X-WorkPass-Key (timing-safe)
 * Tenant: X-WorkPass-Company-Id
 * Encryption at rest: AES-256-GCM (WORKPASS_DATA_KEY or local .data-key)
 */
import http from "node:http";
import { URL } from "node:url";
import { ingestPayroll, ingestPayrollBatch, releasePayrollJob } from "./payroll-service.mjs";
import { runMonthClose, currentPeriod, requestEmployeeDataFromPlatform, resolvePlatformPullUrls } from "./month-close.mjs";
import { startMonthCloseScheduler, runAutoMonthCloseOnce, autoMonthCloseConfig } from "./month-scheduler.mjs";
import {
  processInboundPayroll,
  processInboundPayrollBatch,
  askPlatformAndSyncCompany,
  runAutoPipelineOnce,
  startAutoPipelineScheduler,
  autoPipelineStatus,
  autoPipelineConfig,
} from "./auto-pipeline.mjs";
import { listCompanyEmployees, monthOverview, listReleasedArchive } from "./portal-service.mjs";
import { buildDemoPayrollBatch } from "./demo-payroll.mjs";
import { purgeDemoPayroll } from "./demo-purge.mjs";
import { importEmployees, listEmployees } from "./employee-registry.mjs";
import { isDemoEmployeeRecord } from "./demo-detect.mjs";
import {
  listMessages,
  listPendingMessagesForPlatform,
  ackMessage,
  upsertPlatformMessage,
  messageStats,
  loadMessage,
  listSeenConfirmations,
} from "./platform-messages.mjs";
import { ingestInvoice, releaseInvoiceJob } from "./invoice-service.mjs";
import { listPayrollJobs, loadPayrollJob, listInvoiceJobs, loadInvoiceJob } from "./store.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { listPendingDeliveries, listAllDeliveries, ackDelivery } from "./delivery-queue.mjs";
import { getLastWebhookStatus } from "./notify.mjs";
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
} from "./security/http.mjs";
import { assertProductionSecurity } from "./security/crypto.mjs";
import { audit } from "./security/audit.mjs";
import { clientIp } from "./security/rate-limit.mjs";
import { createBackup, listBackups, restoreBackup, startBackupScheduler } from "./backup/backup.mjs";
import { PLATFORM_DOMAIN, PLATFORM_ORIGINS, platformWebhookUrl } from "./platform-config.mjs";
import { tryServeStatic } from "./static.mjs";
import { logDataPaths } from "./paths.mjs";
import {
  authPublicConfig,
  loginWithPassword,
  sessionFromRequest,
  unlockAuthRateLimits,
} from "./auth-session.mjs";
import { clearRateLimitState } from "./security/rate-limit.mjs";

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
} catch (err) {
  console.error("[boot] FATAL:", err?.message || err);
  process.exit(1);
}

const backupSched = startBackupScheduler();
const monthCloseSched = startMonthCloseScheduler();
const autoPipeSched = startAutoPipelineScheduler();

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
    const db = syncHealth();
    return reply(200, {
      ok: true,
      service: "workpass-accounting-bridge",
      version: "2.6.0",
      multiTenant: true,
      monthCloseScheduler: monthCloseSched,
      autoMonthClose: autoMonthCloseConfig(),
      autoPipeline: autoPipelineStatus(),
      platform: {
        domain: PLATFORM_DOMAIN,
        corsOrigins: PLATFORM_ORIGINS,
        webhookUrlConfigured: Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL),
        webhookUrlSuggested: platformWebhookUrl(),
      },
      ui: {
        served: SERVE_UI,
        paths: ["/", "/index.html", "/lohn.html"],
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
    });
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

  if (req.method === "POST" && path === "/v1/auth/login") {
    const body = await readBodyLimited(req);
    const result = await loginWithPassword(body?.email, body?.password, req);
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
    const out = { ok: true, user: s.user };
    if (s.user?.companyId && s.user.role !== "admin") {
      const company = loadCompany(s.user.companyId);
      out.workspace = companyWorkspaceView(company);
      out.companyLocked = true;
      if (company) {
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
        };
      }
    }
    return reply(200, out);
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
      || path.startsWith("/v1/delivery/")
      || path.startsWith("/v1/messages")
      || path.startsWith("/v1/employees")
      || path.startsWith("/v1/platform")
      || path.startsWith("/v1/sync")
      || path.startsWith("/v1/portal/")
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
      const needsAdmin =
        path.startsWith("/v1/admin")
        || path === "/v1/company/activate"
        || path === "/v1/company/provision"
        || path === "/v1/company/deactivate"
        || path === "/v1/company/delete"
        || path === "/v1/company/purge"
        || path === "/v1/company/login-sync"
        || path === "/v1/company/ensure-login"
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
      if (body.confirm !== true) {
        return reply(422, {
          ok: false,
          error: "Bestätigung nötig: { confirm: true, fileName }",
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

    if (req.method === "GET" && path === "/v1/admin/overview") {
      const companies = listCompanies();
      return reply(200, {
        ok: true,
        admin: req._workpassSession || { via: "api-key" },
        health: {
          version: "2.6.0",
          ...syncHealth(),
        },
        monthCloseScheduler: monthCloseSched,
        autoMonthClose: autoMonthCloseConfig(),
        companies: {
          count: companies.length,
          active: companies.filter((c) => c.meta?.accountingEnabled).length,
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
        },
      });
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
        detail: { created: result.created },
      });
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
      && (path === "/v1/payroll/request-data" || path === "/v1/payroll/ask-platform")
    ) {
      const body = (await readBodyLimited(req)) || {};
      const companyId = normalizeCompanyId(
        body.companyId || body.company?.id || tenantScope || ""
      );
      const scopeCheck = assertSameTenant(tenantScope, companyId, "Daten-Anfrage");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      if (!companyId) return reply(422, { ok: false, error: "companyId fehlt" });
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

    if (req.method === "POST" && path.startsWith("/v1/payroll/") && path.endsWith("/release")) {
      const jobId = decodeURIComponent(path.slice("/v1/payroll/".length, -"/release".length));
      const result = await releasePayrollJob(jobId, { tenantScope });
      audit({
        type: "payroll.release",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id,
        detail: { jobId },
      });
      const status = result.ok ? 200 : (String(result.error || "").includes("Tenant-Isolation") ? 403 : 422);
      return reply( status, result);
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
      audit({
        type: "employees.import",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId,
        detail: { count: result.count },
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
          });
        } catch (e) {
          sync = { ok: false, error: e.message };
        }
      }
      return reply(result.ok ? 200 : 422, {
        ...result,
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
      return reply(200, {
        ok: true,
        kind: "platform.accounting.sync.v1",
        schemaVersion: 2,
        companyId: companyId || null,
        accountingVersion: "2.6.0",
        autoPipeline: autoPipelineStatus(),
        webhook: {
          configured: Boolean(process.env.WORKPASS_PLATFORM_WEBHOOK_URL),
          urlSuggested: platformWebhookUrl(),
          last: getLastWebhookStatus(),
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
          "Auto: WorkPass Lohn fragt die Plattform nach Mitarbeitern + Monat (employees.list.requested / payroll.month.requested)",
          "Plattform sendet → POST /v1/employees/import und/oder POST /v1/payroll/batch → Auto berechnen + freigeben",
          "Manuell: POST /v1/payroll/auto-sync { companyId, period }",
          "Railway: WORKPASS_AUTO_PIPELINE=1 (Standard) · WORKPASS_PLATFORM_BASE_URL oder PULL_URL",
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
      && (path.endsWith("/ack") || path.endsWith("/read"))
    ) {
      const messageId = decodeURIComponent(
        path.slice("/v1/messages/".length, path.endsWith("/ack") ? -"/ack".length : -"/read".length)
      );
      const existing = loadMessage(messageId);
      if (!existing) return reply(404, { ok: false, error: "Nachricht nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, existing.company?.id, "Message");
      if (!scopeCheck.ok) return reply(403, { ok: false, error: scopeCheck.error });
      const body = (await readBodyLimited(req)) || {};
      const result = ackMessage(messageId, {
        readBy: body.readBy || body.actor || "platform",
        note: body.note || "",
      });
      audit({
        type: "message.ack",
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
    if (req.method === "GET" && path === "/v1/delivery/pending") {
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const pending = listPendingDeliveries({ companyId });
      return reply( 200, {
        ok: true,
        kind: "platform.delivery.pending.v1",
        companyId: companyId || null,
        count: pending.length,
        deliveries: pending,
      });
    }

    if (req.method === "GET" && path === "/v1/delivery") {
      let all = listAllDeliveries();
      if (tenantScope) {
        all = all.filter((d) => normalizeCompanyId(d.company?.id) === tenantScope);
      }
      return reply( 200, { ok: true, count: all.length, deliveries: all });
    }

    if (req.method === "POST" && path.startsWith("/v1/delivery/") && path.endsWith("/ack")) {
      const deliveryId = decodeURIComponent(path.slice("/v1/delivery/".length, -"/ack".length));
      const body = (await readBodyLimited(req)) || {};
      const queued = listAllDeliveries().find((d) => d.deliveryId === deliveryId);
      if (queued) {
        const scopeCheck = assertSameTenant(tenantScope, queued.company?.id, "Delivery");
        if (!scopeCheck.ok) return reply( 403, { ok: false, error: scopeCheck.error });
      }
      const result = ackDelivery(deliveryId, body);
      audit({ type: "delivery.ack", outcome: result.ok ? "ok" : "error", ip, path, companyId: queued?.company?.id });
      return reply( result.ok ? 200 : 404, result);
    }

    // --- Invoices ---
    if (req.method === "POST" && path === "/v1/invoice/ingest") {
      const body = await readBodyLimited(req);
      const result = ingestInvoice(body, { tenantScope });
      audit({ type: "invoice.ingest", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.job?.company?.id });
      return reply( result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && path.startsWith("/v1/invoice/") && path.endsWith("/release")) {
      const id = decodeURIComponent(path.slice("/v1/invoice/".length, -"/release".length));
      const result = await releaseInvoiceJob(id, { tenantScope });
      audit({ type: "invoice.release", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.job?.company?.id });
      const status = result.ok ? 200 : (String(result.error || "").includes("Tenant-Isolation") ? 403 : 422);
      return reply( status, result);
    }

    if (req.method === "GET" && path.startsWith("/v1/invoice/")) {
      const id = decodeURIComponent(path.slice("/v1/invoice/".length));
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
  if (autoPipeSched.ok) console.log(`[auto-pipeline] every ${autoPipeSched.intervalMinutes} min · asks platform for employees + payroll`);
  else console.log("[auto-pipeline] off – WORKPASS_AUTO_PIPELINE=0");
  if (monthCloseSched.ok) console.log("[month-close] end-of-month scheduler on");
  console.log("Auth: X-WorkPass-Key (timing-safe) · Tenant: X-WorkPass-Company-Id");
});

server.on("error", (err) => {
  console.error("[boot] listen error:", err);
  process.exit(1);
});
