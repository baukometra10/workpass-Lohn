/**
 * Load repo-root .env into process.env (no dependency).
 * Existing env vars win — never overwrite.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

export function loadEnvFile(filePath = envPath) {
  if (!fs.existsSync(filePath)) return { ok: false, loaded: 0 };
  const text = fs.readFileSync(filePath, "utf8");
  let loaded = 0;
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key) && process.env[key] !== "") {
      continue;
    }
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
    loaded += 1;
  }
  return { ok: true, loaded, path: filePath };
}

loadEnvFile();
