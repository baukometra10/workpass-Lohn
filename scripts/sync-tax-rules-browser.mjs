/**
 * Copy built-in packs from tax-rules/packs.mjs into tax-rules.js (browser IIFE).
 * Source of truth: tax-rules/packs.mjs
 * Run: node scripts/sync-tax-rules-browser.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { builtinPacks } from "../tax-rules/packs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "tax-rules.js");
const START = "/* TAX_RULES_PACKS_START */";
const END = "/* TAX_RULES_PACKS_END */";

let src = fs.readFileSync(target, "utf8");
const i0 = src.indexOf(START);
const i1 = src.indexOf(END);
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  throw new Error(`markers missing in tax-rules.js (${START} … ${END})`);
}

const json = JSON.stringify(builtinPacks, null, 2)
  .split("\n")
  .map((line, idx) => (idx === 0 ? line : `  ${line}`))
  .join("\n");

const block = `${START}\n  const PACKS = ${json};\n  ${END}`;
src = src.slice(0, i0) + block + src.slice(i1 + END.length);
fs.writeFileSync(target, src);
console.log("synced tax-rules.js packs:", builtinPacks.map((p) => p.id).join(", "));
