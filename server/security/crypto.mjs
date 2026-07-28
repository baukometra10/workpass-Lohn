/**
 * Cryptographic primitives for WorkPass Accounting.
 * - AES-256-GCM encryption at rest
 * - Constant-time secret compare
 * - Local key file auto-provisioned if WORKPASS_DATA_KEY unset
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createHmac,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ENC_PREFIX = "wpenc:v1:";
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const keyFile = path.join(dataDir, ".data-key");

let cachedKey = null;

export function isEncryptedBlob(value) {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export function secureCompare(a, b) {
  const aa = Buffer.from(String(a ?? ""), "utf8");
  const bb = Buffer.from(String(b ?? ""), "utf8");
  if (aa.length !== bb.length) {
    // Still do a compare to reduce timing oracle on length-only paths
    timingSafeEqual(aa.length ? aa : Buffer.alloc(1), aa.length ? aa : Buffer.alloc(1));
    return false;
  }
  if (aa.length === 0) return true;
  return timingSafeEqual(aa, bb);
}

function loadOrCreateLocalKeyMaterial() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (existsSync(keyFile)) {
    return readFileSync(keyFile, "utf8").trim();
  }
  const material = randomBytes(48).toString("base64url");
  writeFileSync(keyFile, material, { encoding: "utf8", flag: "wx" });
  try {
    chmodSync(keyFile, 0o600);
  } catch {
    /* Windows may ignore chmod */
  }
  return material;
}

/**
 * 32-byte AES key from env or local key file.
 */
export function getDataKey() {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env.WORKPASS_DATA_KEY || process.env.WORKPASS_ENCRYPTION_KEY || "";
  const material = fromEnv.trim() || loadOrCreateLocalKeyMaterial();
  cachedKey = scryptSync(material, "workpass-accounting-v1", 32, { N: 16384, r: 8, p: 1 });
  return cachedKey;
}

/** Reset key cache (tests) */
export function resetDataKeyCache() {
  cachedKey = null;
}

export function encryptString(plain) {
  if (plain == null) return plain;
  const text = String(plain);
  if (isEncryptedBlob(text)) return text;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getDataKey(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptString(blob) {
  if (blob == null) return blob;
  const text = String(blob);
  if (!isEncryptedBlob(text)) return text;
  const raw = text.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = raw.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Ungültiger Ciphertext");
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", getDataKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptJson(obj) {
  return encryptString(JSON.stringify(obj));
}

export function decryptJson(blob, fallback = null) {
  try {
    const plain = decryptString(blob);
    return JSON.parse(plain);
  } catch {
    return fallback;
  }
}

export function sha256Hex(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

export function hmacSha256Hex(secret, text) {
  return createHmac("sha256", String(secret)).update(String(text), "utf8").digest("hex");
}

/**
 * Production readiness checks – throw or return warnings.
 */
export function securityPosture() {
  const strict = process.env.WORKPASS_STRICT === "1" || process.env.NODE_ENV === "production";
  const apiKey = process.env.WORKPASS_API_KEY || "";
  const warnings = [];
  const blockers = [];

  if (!apiKey || apiKey === "workpass-dev-key") {
    const msg = "WORKPASS_API_KEY fehlt oder ist der Dev-Default";
    if (strict) blockers.push(msg);
    else warnings.push(msg);
  } else if (apiKey.length < 24) {
    const msg = "WORKPASS_API_KEY sollte ≥ 24 Zeichen sein";
    if (strict) blockers.push(msg);
    else warnings.push(msg);
  }

  if (!process.env.WORKPASS_DATA_KEY && !process.env.WORKPASS_ENCRYPTION_KEY) {
    warnings.push("Kein WORKPASS_DATA_KEY – lokaler Keyfile wird verwendet (.data-key)");
  }

  const host = process.env.WORKPASS_API_HOST || "";
  if (strict && (host === "0.0.0.0" || process.env.PORT) && apiKey === "workpass-dev-key") {
    blockers.push("Öffentlicher Bind + Dev-API-Key verboten");
  }

  return {
    strict,
    encryption: "aes-256-gcm",
    keySource: process.env.WORKPASS_DATA_KEY || process.env.WORKPASS_ENCRYPTION_KEY ? "env" : "local-file",
    warnings,
    blockers,
    ok: blockers.length === 0,
  };
}

export function assertProductionSecurity() {
  const posture = securityPosture();
  if (!posture.ok) {
    throw new Error(`Security-Blocker: ${posture.blockers.join(" · ")}`);
  }
  return posture;
}

export { ENC_PREFIX, keyFile, dataDir };
