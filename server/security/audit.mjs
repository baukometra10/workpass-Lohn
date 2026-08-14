/**
 * Append-only security audit log (tamper-evident chain via hash linking).
 */
import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sha256Hex } from "./crypto.mjs";

const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "audit");
const logFile = path.join(logDir, "security-audit.jsonl");

let lastHash = "genesis";

function ensure() {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  if (!existsSync(logFile)) return;
  try {
    const lines = readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
    if (lines.length) {
      const last = JSON.parse(lines[lines.length - 1]);
      lastHash = last.hash || lastHash;
    }
  } catch {
    /* keep genesis */
  }
}

let primed = false;
function prime() {
  if (!primed) {
    ensure();
    primed = true;
  }
}

/**
 * @param {{ type: string, outcome?: string, companyId?: string, actor?: string, ip?: string, detail?: object }} entry
 */
export function audit(entry) {
  prime();
  const record = {
    at: new Date().toISOString(),
    type: entry.type || "event",
    outcome: entry.outcome || "ok",
    companyId: entry.companyId || null,
    actor: entry.actor || "api",
    ip: entry.ip || null,
    path: entry.path || null,
    detail: entry.detail || null,
    prevHash: lastHash,
  };
  record.hash = sha256Hex(JSON.stringify({ ...record, hash: undefined }));
  lastHash = record.hash;
  appendFileSync(logFile, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function auditLogPath() {
  return logFile;
}

/** Read last N audit entries (newest first). Admin tooling only. */
export function readAuditTail(limit = 50) {
  prime();
  if (!existsSync(logFile)) return [];
  try {
    const lines = readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
    const take = Math.max(1, Math.min(500, Number(limit) || 50));
    return lines.slice(-take).reverse().map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { type: "parse.error", raw: line.slice(0, 200) };
      }
    });
  } catch {
    return [];
  }
}

/** Verify hash chain of the last N entries (oldest→newest among the window). */
export function verifyAuditChain(limit = 100) {
  prime();
  if (!existsSync(logFile)) {
    return { ok: true, checked: 0, brokenAt: null, message: "Kein Audit-Log" };
  }
  try {
    const lines = readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
    const take = Math.max(1, Math.min(2000, Number(limit) || 100));
    const slice = lines.slice(-take);
    let prev = null;
    let checked = 0;
    for (const line of slice) {
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        return { ok: false, checked, brokenAt: checked, message: "JSON parse error" };
      }
      const { hash, ...rest } = rec;
      const expected = sha256Hex(JSON.stringify({ ...rest, hash: undefined }));
      if (hash !== expected) {
        return { ok: false, checked, brokenAt: checked, message: "Hash stimmt nicht", type: rec.type };
      }
      if (prev != null && rec.prevHash && rec.prevHash !== prev) {
        return { ok: false, checked, brokenAt: checked, message: "prevHash-Kette unterbrochen", type: rec.type };
      }
      prev = hash;
      checked += 1;
    }
    return { ok: true, checked, brokenAt: null, message: `${checked} Einträge geprüft` };
  } catch (e) {
    return { ok: false, checked: 0, brokenAt: 0, message: e.message || String(e) };
  }
}
