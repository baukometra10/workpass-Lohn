/**
 * WorkPass Accounting Bridge – Platform SDK (multi-tenant)
 *
 * company.id is the isolation key. Pass companyId on the client to set
 * X-WorkPass-Company-Id on every request (recommended for platform backends).
 */
export class WorkPassAccountingClient {
  /**
   * @param {{ baseUrl?: string, apiKey?: string, companyId?: string, fetchImpl?: typeof fetch }} opts
   */
  constructor(opts = {}) {
    this.baseUrl = String(opts.baseUrl || "http://127.0.0.1:8787").replace(/\/+$/, "");
    this.apiKey = opts.apiKey || process.env.WORKPASS_API_KEY || "workpass-dev-key";
    this.companyId = opts.companyId || process.env.WORKPASS_COMPANY_ID || "";
    this.fetchImpl = opts.fetchImpl || globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("fetch is required (Node 18+ or pass fetchImpl)");
    }
  }

  /** Switch active tenant without recreating the client */
  setCompanyId(companyId) {
    this.companyId = companyId || "";
    return this;
  }

  async request(method, path, body, opts = {}) {
    const headers = {
      "Content-Type": "application/json",
      "X-WorkPass-Key": this.apiKey,
    };
    const companyId = opts.companyId !== undefined ? opts.companyId : this.companyId;
    if (companyId) headers["X-WorkPass-Company-Id"] = String(companyId);

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { ok: false, error: text || `HTTP ${res.status}` };
    }
    if (!res.ok && data && typeof data === "object" && data.ok === undefined) {
      data.ok = false;
      data.status = res.status;
    }
    if (data && typeof data === "object") data.httpStatus = res.status;
    return data;
  }

  health() {
    return this.request("GET", "/health");
  }

  /** @param {object} company platform.company.v1 */
  upsertCompany(company) {
    return this.request("POST", "/v1/company/upsert", company);
  }

  /**
   * Activate accounting for a company → creates account + workspace section immediately.
   * @param {object} payload platform.company.activate.v1 or company object
   */
  activateCompany(payload) {
    return this.request("POST", "/v1/company/activate", payload);
  }

  /** Soft-disable accounting link (data retained). */
  deactivateCompany(companyIdOrPayload) {
    const body = typeof companyIdOrPayload === "string"
      ? { id: companyIdOrPayload }
      : companyIdOrPayload;
    return this.request("POST", "/v1/company/deactivate", body);
  }

  getCompany(id) {
    return this.request("GET", `/v1/company/${encodeURIComponent(id)}`);
  }

  listCompanies() {
    return this.request("GET", "/v1/companies");
  }

  /** @param {object} payload platform.payroll.v1 – requires company.id */
  ingestPayroll(payload) {
    return this.request("POST", "/v1/payroll/ingest", payload);
  }

  ingestPayrollBatch(batch) {
    return this.request("POST", "/v1/payroll/batch", batch);
  }

  getPayroll(jobId) {
    return this.request("GET", `/v1/payroll/${encodeURIComponent(jobId)}`);
  }

  getPayslip(jobId) {
    return this.request("GET", `/v1/payroll/${encodeURIComponent(jobId)}/payslip`);
  }

  releasePayroll(jobId) {
    return this.request("POST", `/v1/payroll/${encodeURIComponent(jobId)}/release`);
  }

  /** @param {object} payload platform.invoice.v1 – requires company.id */
  ingestInvoice(payload) {
    return this.request("POST", "/v1/invoice/ingest", payload);
  }

  getInvoice(id) {
    return this.request("GET", `/v1/invoice/${encodeURIComponent(id)}`);
  }

  releaseInvoice(id) {
    return this.request("POST", `/v1/invoice/${encodeURIComponent(id)}/release`);
  }

  /**
   * @param {{ status?: string, period?: string, companyId?: string }} [query]
   */
  inbox(query = {}) {
    const q = new URLSearchParams();
    if (query.status) q.set("status", query.status);
    if (query.period) q.set("period", query.period);
    if (query.companyId) q.set("companyId", query.companyId);
    const qs = q.toString();
    return this.request("GET", `/v1/inbox${qs ? `?${qs}` : ""}`, undefined, {
      companyId: query.companyId !== undefined ? query.companyId : this.companyId,
    });
  }

  listPendingDeliveries(companyId) {
    const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    return this.request("GET", `/v1/delivery/pending${q}`, undefined, { companyId: companyId || this.companyId });
  }

  listDeliveries() {
    return this.request("GET", "/v1/delivery");
  }

  ackDelivery(deliveryId, meta = {}) {
    return this.request("POST", `/v1/delivery/${encodeURIComponent(deliveryId)}/ack`, meta);
  }
}

export default WorkPassAccountingClient;
