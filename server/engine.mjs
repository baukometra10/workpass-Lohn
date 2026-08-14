/**
 * Load browser payroll scripts into a Node VM (same engine as tests/UI).
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import vm from "vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const memoryStore = new Map();

function loadEngine() {
  const sandbox = {
    window: {},
    document: { getElementById: () => null },
    console,
    Intl,
    localStorage: {
      getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
      setItem: (k, v) => { memoryStore.set(k, String(v)); },
      removeItem: (k) => { memoryStore.delete(k); },
    },
    Event: class {},
    dispatchEvent: () => {},
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  const files = [
    "tax-rules.js",
    "legal-config.js",
    "vendor/pap-standalone.js",
    "payroll-bridge.js",
    "templates.js",
    "datev-import.js",
    "payroll-core.js",
  ];

  for (const file of files) {
    const full = path.join(root, file);
    if (!existsSync(full)) throw new Error(`Missing engine file: ${file}`);
    vm.runInContext(readFileSync(full, "utf8"), ctx, { filename: file });
  }

  if (!sandbox.window.PayrollCore) {
    throw new Error("PayrollCore failed to load");
  }
  return sandbox.window.PayrollCore;
}

let cached = null;

export function getPayrollCore() {
  if (!cached) cached = loadEngine();
  return cached;
}
