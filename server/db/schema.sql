-- WorkPass Accounting – local SQLite schema (source of truth)
-- Isolation key: company_id on every business row

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payroll_jobs (
  job_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'calculated',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  released_at TEXT,
  synced_at TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_jobs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_jobs(period);

CREATE TABLE IF NOT EXISTS invoice_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  released_at TEXT,
  synced_at TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_company ON invoice_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice_jobs(status);

CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  queue_status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  enqueued_at TEXT NOT NULL,
  acked_at TEXT,
  synced_at TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_delivery_status ON deliveries(queue_status);
CREATE INDEX IF NOT EXISTS idx_delivery_company ON deliveries(company_id);

-- Outbox: local writes waiting to reach external Postgres
CREATE TABLE IF NOT EXISTS sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL DEFAULT 'upsert',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  UNIQUE(entity, entity_id, op)
);

CREATE INDEX IF NOT EXISTS idx_outbox_created ON sync_outbox(created_at);
