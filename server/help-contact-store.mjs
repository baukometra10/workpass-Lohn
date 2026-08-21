/**
 * Persistable help/support contacts (Admin edits → Hilfe shows).
 * Stored as JSON under the data directory.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { resolveDataDir } from "./paths.mjs";

const FILE_NAME = "help-contact.json";

export const HELP_CONTACT_DEFAULTS = Object.freeze({
  product: "WorkPass Steuerprogramm · Suppix AI",
  website: "https://suppix-ai-workpass.com",
  websiteLabel: "suppix-ai-workpass.com",
  email: "support@suppix-ai-workpass.com",
  phone: "",
  whatsapp: "",
  hoursDe: "Mo–Fr 9:00–17:00 (CET)",
});

function storePath() {
  return path.join(resolveDataDir(), FILE_NAME);
}

function sanitize(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const pick = (key, max = 240) => String(src[key] ?? HELP_CONTACT_DEFAULTS[key] ?? "").trim().slice(0, max);
  return {
    product: pick("product", 120) || HELP_CONTACT_DEFAULTS.product,
    website: pick("website", 240),
    websiteLabel: pick("websiteLabel", 120),
    email: pick("email", 160),
    phone: pick("phone", 64),
    whatsapp: pick("whatsapp", 32).replace(/\D/g, "").slice(0, 20),
    hoursDe: pick("hoursDe", 120),
    updatedAt: src.updatedAt || null,
    updatedBy: src.updatedBy || null,
  };
}

export function readHelpContact() {
  try {
    const p = storePath();
    if (!existsSync(p)) return { ...HELP_CONTACT_DEFAULTS, updatedAt: null, updatedBy: null };
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return sanitize(raw);
  } catch {
    return { ...HELP_CONTACT_DEFAULTS, updatedAt: null, updatedBy: null };
  }
}

export function writeHelpContact(payload, { updatedBy = null } = {}) {
  const next = sanitize({
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || null,
  });
  const dir = resolveDataDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(storePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
