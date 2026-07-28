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
    companyUpsert: "POST /v1/company/upsert",
    payrollIngest: "POST /v1/payroll/ingest",
    payrollBatch: "POST /v1/payroll/batch",
    payrollRelease: "POST /v1/payroll/:jobId/release",
    invoiceIngest: "POST /v1/invoice/ingest",
    invoiceRelease: "POST /v1/invoice/:id/release",
    inbox: "GET /v1/inbox",
    deliveryPending: "GET /v1/delivery/pending",
    deliveryAck: "POST /v1/delivery/:deliveryId/ack",
  },
  webhookReceive: {
    url: "https://suppix-ai-workpass.com/api/workpass/webhooks/accounting",
    keyHeader: "X-WorkPass-Webhook-Key",
    events: ["payslip.released", "invoice.released"],
  },
  sdk: "../sdk/workpass-accounting-client.mjs",
};

export default accountingConnect;
