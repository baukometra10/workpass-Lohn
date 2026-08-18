/**
 * Quick reference for the WorkPass platform backend.
 * Copy values after Accounting is live on Railway.
 */
export const accountingConnect = {
  /** Set after Railway gives you the public URL */
  baseUrl: process.env.WORKPASS_ACCOUNTING_BASE_URL || "https://YOUR-SERVICE.up.railway.app",
  apiKeyHeader: "X-WorkPass-Key",
  companyHeader: "X-WorkPass-Company-Id",
  apiKey: process.env.WORKPASS_API_KEY || "",
  endpoints: {
    health: "GET /health",
    companyActivate: "POST /v1/company/activate",
    companyProvision: "POST /v1/company/provision",
    companyLoginSync: "POST /v1/company/login-sync",
    companyDeactivate: "POST /v1/company/deactivate",
    companyDelete: "POST /v1/company/delete",
    companyPurge: "POST /v1/company/purge",
    companyDeleteById: "DELETE /v1/company/:id",
    companyUpsert: "POST /v1/company/upsert",
    companiesList: "GET /v1/companies",
    companyGet: "GET /v1/company/:id",
    authConfig: "GET /v1/auth/config",
    authLogin: "POST /v1/auth/login",
    authMe: "GET /v1/auth/me",
    adminOverview: "GET /v1/admin/overview",
    payrollIngest: "POST /v1/payroll/ingest",
    payrollBatch: "POST /v1/payroll/batch",
    payrollMonthClose: "POST /v1/payroll/month-close",
    payrollRelease: "POST /v1/payroll/:jobId/release",
    messagesPending: "GET /v1/messages/pending",
    messagesList: "GET /v1/messages",
    messageAck: "POST /v1/messages/:messageId/ack",
    messageCreate: "POST /v1/messages",
    employeesImport: "POST /v1/employees/import",
    messagesSeen: "GET /v1/messages/seen",
    platformStatus: "GET /v1/platform/status",
    syncStatus: "GET /v1/sync/status",
    invoiceIngest: "POST /v1/invoice/ingest",
    invoiceBatch: "POST /v1/invoice/batch",
    invoiceRelease: "POST /v1/invoice/:id/release",
    portalCertificatesLstb: "GET /v1/portal/certificates/lstb",
    portalCertificatesVerdienst: "GET /v1/portal/certificates/verdienst",
    portalCertificatesLstbDeliver: "POST /v1/portal/certificates/lstb/deliver",
    portalCertificatesVerdienstDeliver: "POST /v1/portal/certificates/verdienst/deliver",
    portalCertificatesLstbDeliverYear: "POST /v1/portal/certificates/lstb/deliver-year",
    inbox: "GET /v1/inbox",
    deliveryPending: "GET /v1/delivery/pending",
    deliveryAck: "POST /v1/delivery/:deliveryId/ack",
  },
  /**
   * Call activate when a company enables “send payslips/statements to accounting”.
   * Creates Mandant account + workspace section immediately (before first payroll).
   */
  companyActivation: {
    event: "company.accounting.activated",
    kind: "platform.company.activate.v1",
    example: "../examples/platform-company.activate.v1.json",
  },
  webhookReceive: {
    url: "https://suppix-ai-workpass.com/api/workpass/webhooks/accounting",
    keyHeader: "X-WorkPass-Webhook-Key",
    idempotencyHeader: "X-WorkPass-Idempotency-Key",
    events: [
      "platform.ping",
      "employees.list.requested",
      "payroll.month.requested",
      "invoices.export.requested",
      "employee.data.requested",
      "payslip.released",
      "lstb.released",
      "verdienst.released",
      "invoice.released",
      "invoice.batch.received",
      "invoices.auto.processed",
      "accounting.message",
      "payroll.waiting",
      "month.closed",
      "month.close.failed",
      "month.auto.processed",
    ],
    replyToAccounting: {
      employees: "POST /v1/employees/import",
      payrollBatch: "POST /v1/payroll/batch",
      invoiceBatch: "POST /v1/invoice/batch",
      invoiceIngest: "POST /v1/invoice/ingest",
      docs: "../docs/PLATFORM_REPLY.md",
    },
  },
  sdk: "../sdk/workpass-accounting-client.mjs",
};

export default accountingConnect;
