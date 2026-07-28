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
