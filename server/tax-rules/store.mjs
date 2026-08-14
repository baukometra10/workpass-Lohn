/**
 * Optional SQLite overlay for published tax packs (year 2027+ without a code change).
 * Built-in packs in tax-rules/packs.mjs always load; DB rows override same id.
 */
import { sqliteExec, sqliteGet, sqliteAll } from "../db/sqlite.mjs";
import { initDb } from "../db/repository.mjs";

let tableReady = false;

function ensureTable() {
  if (tableReady) return;
  initDb();
  sqliteExec(`
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
    )
  `);
  sqliteExec(`CREATE INDEX IF NOT EXISTS idx_tax_rules_country ON tax_rulesets(country, status)`);
  tableReady = true;
}

export function listStoredRulesets(filter = {}) {
  ensureTable();
  const country = String(filter.country || "").toUpperCase();
  const rows = country
    ? sqliteAll(`SELECT payload_json, status FROM tax_rulesets WHERE country = ?`, [country])
    : sqliteAll(`SELECT payload_json, status FROM tax_rulesets`);
  return rows.map((r) => {
    try {
      return JSON.parse(r.payload_json);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function getStoredRuleset(rulesetId) {
  ensureTable();
  const id = String(rulesetId || "").trim();
  if (!id) return null;
  const row = sqliteGet(`SELECT payload_json FROM tax_rulesets WHERE ruleset_id = ?`, [id]);
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json);
  } catch {
    return null;
  }
}

export function saveRuleset(pack, opts = {}) {
  ensureTable();
  if (!pack?.id || !pack?.effectiveFrom) {
    return { ok: false, error: "ruleset.id und effectiveFrom erforderlich" };
  }
  const status = String(opts.status || pack.status || "draft");
  if (!["draft", "reviewed", "published"].includes(status)) {
    return { ok: false, error: "status: draft | reviewed | published" };
  }
  const now = new Date().toISOString();
  const stored = {
    ...pack,
    status,
    country: String(pack.country || "DE").toUpperCase(),
    updatedAt: now,
  };
  const existing = sqliteGet(`SELECT ruleset_id FROM tax_rulesets WHERE ruleset_id = ?`, [pack.id]);
  const publishedAt = status === "published" ? (pack.publishedAt || now) : (pack.publishedAt || null);
  if (existing) {
    sqliteExec(
      `UPDATE tax_rulesets SET country=?, status=?, effective_from=?, effective_to=?, payload_json=?, published_at=?, updated_at=? WHERE ruleset_id=?`,
      [stored.country, status, pack.effectiveFrom, pack.effectiveTo || null, JSON.stringify(stored), publishedAt, now, pack.id]
    );
  } else {
    sqliteExec(
      `INSERT INTO tax_rulesets(ruleset_id, country, status, effective_from, effective_to, payload_json, published_at, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [pack.id, stored.country, status, pack.effectiveFrom, pack.effectiveTo || null, JSON.stringify(stored), publishedAt, now, now]
    );
  }
  return { ok: true, ruleset: stored };
}

export function loadPublishedOverlays() {
  ensureTable();
  return listStoredRulesets().filter((p) => p.status === "published");
}

export function deleteStoredRuleset(rulesetId) {
  ensureTable();
  const id = String(rulesetId || "").trim();
  if (!id) return { ok: false, error: "id fehlt" };
  sqliteExec(`DELETE FROM tax_rulesets WHERE ruleset_id = ?`, [id]);
  return { ok: true, deleted: id };
}
