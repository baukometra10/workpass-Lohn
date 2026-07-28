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
import { ingestInvoice, releaseInvoiceJob } from "./invoice-service.mjs";
import { listPayrollJobs, loadPayrollJob, listInvoiceJobs, loadInvoiceJob } from "./store.mjs";
import { listPendingDeliveries, listAllDeliveries, ackDelivery } from "./delivery-queue.mjs";
import { upsertCompany, loadCompany, listCompanies } from "./company-service.mjs";
import { tenantFromRequest, assertSameTenant, normalizeCompanyId } from "./tenant.mjs";
import { initDb, syncHealth, flushSyncOutbox } from "./db/repository.mjs";
import { postgresConfigured } from "./db/postgres.mjs";
import {
  securityHeaders,
  corsHeaders,
  authorizeRequest,
  readBodyLimited,
  publicSecurityInfo,
} from "./security/http.mjs";
import { assertProductionSecurity } from "./security/crypto.mjs";
import { audit } from "./security/audit.mjs";
import { clientIp } from "./security/rate-limit.mjs";
import { createBackup, listBackups, startBackupScheduler } from "./backup/backup.mjs";
import { PLATFORM_DOMAIN, PLATFORM_ORIGINS, platformWebhookUrl } from "./platform-config.mjs";
import { tryServeStatic } from "./static.mjs";

const PORT = Number(process.env.WORKPASS_API_PORT || process.env.PORT || 8787);
const HOST = process.env.WORKPASS_API_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const FORCE_HTTPS = process.env.WORKPASS_FORCE_HTTPS === "1" || process.env.NODE_ENV === "production";
const SERVE_UI = process.env.WORKPASS_SERVE_UI !== "0";

const posture = assertProductionSecurity();
initDb();
const backupSched = startBackupScheduler();

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
  const tenantScope = tenantFromRequest(req, url);
  const ip = clientIp(req);

  if (req.method === "GET" && path === "/health") {
    const db = syncHealth();
    return reply(200, {
      ok: true,
      service: "workpass-accounting-bridge",
      version: "1.6.0",
      multiTenant: true,
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

  if (path !== "/health") {
    const auth = authorizeRequest(req);
    if (!auth.ok) {
      if (auth.retryAfterMs) res.setHeader("Retry-After", String(Math.ceil(auth.retryAfterMs / 1000)));
      return reply(auth.status || 401, { ok: false, error: auth.error });
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
      return reply( 200, { ok: true, backups: listBackups() });
    }

    // --- Companies ---
    if (req.method === "POST" && (path === "/v1/company" || path === "/v1/company/upsert")) {
      const body = await readBodyLimited(req);
      const scopeCheck = assertSameTenant(tenantScope, body?.id || body?.company?.id, "Company-Payload");
      if (!scopeCheck.ok) {
        audit({ type: "tenant.deny", outcome: "deny", ip, path, companyId: tenantScope });
        return reply( 403, { ok: false, error: scopeCheck.error });
      }
      const result = upsertCompany(body?.company ? body : { company: body });
      audit({ type: "company.upsert", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.company?.id });
      return reply( result.ok ? 200 : 422, result);
    }

    if (req.method === "GET" && path === "/v1/companies") {
      const companies = listCompanies({ companyId: tenantScope || undefined });
      return reply( 200, { ok: true, count: companies.length, companies });
    }

    if (req.method === "GET" && path.startsWith("/v1/company/") && path !== "/v1/company/upsert") {
      const id = normalizeCompanyId(decodeURIComponent(path.slice("/v1/company/".length)));
      const scopeCheck = assertSameTenant(tenantScope, id, "Company");
      if (!scopeCheck.ok) return reply( 403, { ok: false, error: scopeCheck.error });
      const company = loadCompany(id);
      if (!company) return reply( 404, { ok: false, error: "Firma nicht gefunden" });
      return reply( 200, { ok: true, company });
    }

    // --- Payroll ---
    if (req.method === "POST" && path === "/v1/payroll/ingest") {
      const body = await readBodyLimited(req);
      const result = ingestPayroll(body, { tenantScope });
      audit({
        type: "payroll.ingest",
        outcome: result.ok ? "ok" : "error",
        ip,
        path,
        companyId: result.job?.company?.id || body?.company?.id,
      });
      return reply( result.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && path === "/v1/payroll/batch") {
      const body = await readBodyLimited(req);
      const result = ingestPayrollBatch(body, { tenantScope });
      audit({ type: "payroll.batch", outcome: result.ok ? "ok" : "error", ip, path, companyId: result.company?.id });
      return reply( result.ok ? 200 : 422, result);
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
      if (jobId.includes("/")) return reply( 404, { ok: false, error: "Not found" });
      const job = loadPayrollJob(jobId);
      if (!job) return reply( 404, { ok: false, error: "Job nicht gefunden" });
      const scopeCheck = assertSameTenant(tenantScope, job.company?.id, "Payroll-Job");
      if (!scopeCheck.ok) return reply( 403, { ok: false, error: scopeCheck.error });
      return reply( 200, { ok: true, job });
    }

    if (req.method === "GET" && path === "/v1/inbox") {
      const status = url.searchParams.get("status") || undefined;
      const period = url.searchParams.get("period") || undefined;
      const companyId = tenantScope || url.searchParams.get("companyId") || undefined;
      const payroll = listPayrollJobs({ status, period, companyId }).map((j) => ({
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
  console.log("Auth: X-WorkPass-Key (timing-safe) · Tenant: X-WorkPass-Company-Id");
});
