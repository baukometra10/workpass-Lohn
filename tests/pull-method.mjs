/**
 * Pull method auto-fallback: POST → GET on HTTP 405
 */
import { pullPlatformPayrollBatch } from "../server/month-close.mjs";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

const prevUrl = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
const prevMethod = process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;

const server = await new Promise((resolve) => {
  import("node:http").then(({ createServer }) => {
    const s = createServer(async (req, res) => {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      if (u.pathname !== "/export") {
        res.writeHead(404); res.end("no"); return;
      }
      // Only GET allowed → POST gets 405
      if (req.method === "POST") {
        res.writeHead(405, { Allow: "GET" });
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
        return;
      }
      if (req.method === "GET") {
        const companyId = u.searchParams.get("companyId") || "c1";
        const period = u.searchParams.get("period") || "2026-07";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          kind: "platform.payroll.batch.v1",
          period,
          company: { id: companyId, name: "Pull Test" },
          employees: [{
            employee: { badgeId: "B-1", name: "Pull MA", taxClass: "I" },
            wageItems: [{ code: "2000", label: "Gehalt", amount: 2500 }],
          }],
        }));
        return;
      }
      res.writeHead(405); res.end("{}");
    });
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
});

const { port } = server.address();
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = `http://127.0.0.1:${port}/export`;
process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = "auto";

console.log("\n=== Pull auto: POST 405 → GET ok ===");
const r = await pullPlatformPayrollBatch({ companyId: "c1", period: "2026-07" });
assert(r.ok, "pull ok");
assert(r.method === "GET", `used GET (got ${r.method})`);
assert(r.batch?.employees?.length === 1, "employees from GET");

process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = "POST";
const onlyPost = await pullPlatformPayrollBatch({ companyId: "c1", period: "2026-07" });
assert(!onlyPost.ok && onlyPost.status === 405, "forced POST stays 405");
assert(/405|GET|METHOD/i.test(onlyPost.error || ""), "helpful 405 hint");

server.close();
if (prevUrl == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_URL = prevUrl;
if (prevMethod == null) delete process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD;
else process.env.WORKPASS_PLATFORM_PAYROLL_PULL_METHOD = prevMethod;

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
