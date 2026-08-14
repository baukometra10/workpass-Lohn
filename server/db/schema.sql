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

-- Bidirectional messages: Accounting ↔ Platform (gaps, requests, replies)
CREATE TABLE IF NOT EXISTS platform_messages (
  message_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  employee_id TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'accounting_to_platform',
  status TEXT NOT NULL DEFAULT 'open',
  type TEXT NOT NULL DEFAULT 'data.gap',
  dedupe_key TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  read_at TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_msg_status ON platform_messages(status);
CREATE INDEX IF NOT EXISTS idx_msg_company ON platform_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_msg_dedupe ON platform_messages(dedupe_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_open_dedupe
  ON platform_messages(dedupe_key) WHERE status = 'open' AND dedupe_key != '';

-- Firm employees (name + badge); badge is internal and must not print on payslips
CREATE TABLE IF NOT EXISTS company_employees (
  company_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  personnel_number TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_company ON company_employees(company_id);

-- Effective-dated tax rulesets (published overlays; built-in packs live in tax-rules/)
CREATE TABLE IF NOT EXISTS tax_rulesets (
  ruleset_id TEXT PRIMARY KEY,
  country TEXT NOT NULL DEFAULT 'DE',
  status TEXT NOT NULL DEFAULT 'draft',
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  payload_json TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tax_rules_country ON tax_rulesets(country, status);
