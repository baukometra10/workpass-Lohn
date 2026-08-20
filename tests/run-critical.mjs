/**
 * Critical CI runner — security, ELSTER honesty, certificates, tenant isolation.
 * Run: npm run test:critical
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

const suites = [
  "tests/security.mjs",
  "tests/elster-channel.mjs",
  "tests/employee-certificates.mjs",
  "tests/certificate-delivery-confirm.mjs",
  "tests/document-complete.mjs",
  "tests/document-seal.mjs",
  "tests/monthly-cycle.mjs",
  "tests/human-final-pillars.mjs",
  "tests/tenant-isolation.mjs",
  "tests/export-status.mjs",
];

let failed = 0;
console.log("\n=== WorkPass critical test runner ===\n");

for (const suite of suites) {
  console.log(`--- ${suite} ---`);
  const run = spawnSync(node, [path.join(root, suite)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
  });
  if (run.status !== 0) failed += 1;
  console.log("");
}

if (failed) {
  console.error(`Critical runner: ${failed} suite(s) failed.\n`);
  process.exit(1);
}
console.log("Critical runner: all suites passed.\n");
