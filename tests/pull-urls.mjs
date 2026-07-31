/**
 * Default pull URL discovery from platform base / webhook host.
 */
import { resolvePlatformPullUrls } from "../server/month-close.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const prev = {
  pull: process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL,
  base: process.env.WORKPASS_PLATFORM_BASE_URL,
  hook: process.env.WORKPASS_PLATFORM_WEBHOOK_URL,
};

delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
process.env.WORKPASS_PLATFORM_BASE_URL = "https://suppix-ai-workpass.com";
const urls = resolvePlatformPullUrls();
console.log("\n=== resolve pull URLs from base ===");
assert(urls.length >= 3, `got ${urls.length} candidates`);
assert(urls.some((u) => u.includes("/api/workpass/payroll/export")), "export candidate");

process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = "https://example.com/custom-export";
const one = resolvePlatformPullUrls();
assert(one[0] === "https://example.com/custom-export", "explicit first");

if (prev.pull == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = prev.pull;
if (prev.base == null) delete process.env.WORKPASS_PLATFORM_BASE_URL;
else process.env.WORKPASS_PLATFORM_BASE_URL = prev.base;
if (prev.hook == null) delete process.env.WORKPASS_PLATFORM_WEBHOOK_URL;
else process.env.WORKPASS_PLATFORM_WEBHOOK_URL = prev.hook;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
