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

-- GoBD tables (mirror SQLite logical model; sync optional)
CREATE TABLE IF NOT EXISTS document_revisions (
  revision_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user',
  event_id TEXT NOT NULL DEFAULT '',
  correlation_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rev_entity ON document_revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_rev_company ON document_revisions(company_id, created_at);

CREATE TABLE IF NOT EXISTS business_audit (
  event_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  employee_id TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user',
  op TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  correlation_id TEXT NOT NULL DEFAULT '',
  old_json TEXT,
  new_json TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  prev_hash TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_baudit_company ON business_audit(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_baudit_entity ON business_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_baudit_corr ON business_audit(correlation_id);
