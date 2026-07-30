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
    companyUpsert: "POST /v1/company/upsert",
    companiesList: "GET /v1/companies",
    companyGet: "GET /v1/company/:id",
    authConfig: "GET /v1/auth/config",
    authLogin: "POST /v1/auth/login",
    authMe: "GET /v1/auth/me",
    adminOverview: "GET /v1/admin/overview",
    payrollIngest: "POST /v1/payroll/ingest",
    payrollBatch: "POST /v1/payroll/batch",
    payrollRelease: "POST /v1/payroll/:jobId/release",
    invoiceIngest: "POST /v1/invoice/ingest",
    invoiceRelease: "POST /v1/invoice/:id/release",
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
    events: ["payslip.released", "invoice.released"],
  },
  sdk: "../sdk/workpass-accounting-client.mjs",
};

export default accountingConnect;
