-- WorkPass Accounting – optional external PostgreSQL
-- Same logical model as SQLite; company_id isolation everywhere

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payroll_jobs (
  job_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  employee_id TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'calculated',
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_jobs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_jobs(period);

CREATE TABLE IF NOT EXISTS invoice_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_invoice_company ON invoice_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice_jobs(status);

CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  queue_status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  enqueued_at TIMESTAMPTZ NOT NULL,
  acked_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_delivery_status ON deliveries(queue_status);
CREATE INDEX IF NOT EXISTS idx_delivery_company ON deliveries(company_id);
