/**
 * End-to-end delivery demo:
 *   payroll ingest → Freigabe → webhook/pull → mock employee inbox → ack
 *
 * Usage:
 *   1. Terminal A: npm start
 *   2. Terminal B: npm run mock:platform
 *   3. This script with webhook env pointing at mock:
 *        set WORKPASS_PLATFORM_WEBHOOK_URL=http://127.0.0.1:8790/api/workpass/webhooks/accounting
 *        npm run demo:delivery
 *
 * Or all-in-one (starts mock inline + uses accounting HTTP):
 *   npm run demo:delivery
 */
import { spawn } from "node:child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WorkPassAccountingClient } from "../sdk/workpass-accounting-client.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.WORKPASS_API_KEY || "workpass-dev-key";
const MOCK_PORT = Number(process.env.MOCK_PLATFORM_PORT || 8790);
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const WEBHOOK = process.env.WORKPASS_PLATFORM_WEBHOOK_URL
  || `${MOCK_URL}/api/workpass/webhooks/accounting`;
/** Own demo bridge uses 8788 by default to avoid clashing with a running npm start on 8787 */
const BRIDGE_PORT = Number(process.env.WORKPASS_API_PORT || (process.env.WORKPASS_API_URL ? 8787 : 8788));
const API = process.env.WORKPASS_API_URL || `http://127.0.0.1:${BRIDGE_PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealth(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return true;
    } catch { /* retry */ }
    await sleep(250);
  }
  return false;
}

async function main() {
  console.log("\n=== WorkPass Delivery Demo ===\n");

  let mockProc = null;
  let bridgeProc = null;
  const ownBridge = process.env.DEMO_OWN_BRIDGE !== "0";
  const ownMock = process.env.DEMO_OWN_MOCK !== "0";

  try {
    if (ownMock) {
      mockProc = spawn(process.execPath, [path.join(root, "mock-platform/server.mjs")], {
        cwd: root,
        env: { ...process.env, MOCK_PLATFORM_PORT: String(MOCK_PORT) },
        stdio: ["ignore", "pipe", "pipe"],
      });
      mockProc.stdout.on("data", (d) => process.stdout.write(`[mock] ${d}`));
      mockProc.stderr.on("data", (d) => process.stderr.write(`[mock] ${d}`));
    }

    if (ownBridge) {
      bridgeProc = spawn(process.execPath, [path.join(root, "server/index.mjs")], {
        cwd: root,
        env: {
          ...process.env,
          WORKPASS_API_KEY: KEY,
          WORKPASS_API_PORT: String(BRIDGE_PORT),
          WORKPASS_PLATFORM_WEBHOOK_URL: WEBHOOK,
          WORKPASS_PLATFORM_WEBHOOK_KEY: KEY,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      bridgeProc.stdout.on("data", (d) => process.stdout.write(`[bridge] ${d}`));
      bridgeProc.stderr.on("data", (d) => process.stderr.write(`[bridge] ${d}`));
    }

    const bridgeOk = await waitHealth(API);
    const mockOk = await waitHealth(MOCK_URL);
    if (!bridgeOk) throw new Error(`Accounting Bridge nicht erreichbar: ${API}`);
    if (!mockOk) throw new Error(`Mock Platform nicht erreichbar: ${MOCK_URL}`);

    const client = new WorkPassAccountingClient({ baseUrl: API, apiKey: KEY });
    const payroll = JSON.parse(readFileSync(path.join(root, "examples/platform-payroll.v1.json"), "utf8"));

    console.log("1) Ingest payroll…");
    const ingested = await client.ingestPayroll(payroll);
    if (!ingested.ok) throw new Error(`Ingest failed: ${JSON.stringify(ingested.errors)}`);
    console.log(`   jobId=${ingested.job.jobId} net=${ingested.payslip.totals.net}`);

    console.log("2) Freigabe (release)…");
    const released = await client.releasePayroll(ingested.job.jobId);
    if (!released.ok) throw new Error(`Release failed: ${released.error || JSON.stringify(released)}`);
    if (!released.delivery?.deliveryId) {
      throw new Error("Release ohne delivery – Bridge-Version zu alt? npm start neu starten.");
    }
    console.log(`   deliveryId=${released.delivery.deliveryId}`);
    console.log(`   notify mode=${released.platformNotify?.mode} ok=${released.platformNotify?.ok}`);

    await sleep(400);

    console.log("3) Employee inbox (mock platform)…");
    const inboxRes = await fetch(`${MOCK_URL}/employee/inbox`);
    const inbox = await inboxRes.json();
    const found = (inbox.items || []).find((i) => i.deliveryId === released.delivery?.deliveryId);
    if (!found) {
      console.log("   Webhook missed – falling back to pull /v1/delivery/pending");
      const pending = await client.listPendingDeliveries();
      console.log(`   pending count=${pending.count}`);
      if (!pending.deliveries?.length) throw new Error("Keine Delivery in Queue");
    } else {
      console.log(`   ✓ sichtbar: ${found.title} (net ${found.summary?.net})`);
    }

    console.log("4) Ack delivery…");
    const ack = await client.ackDelivery(released.delivery.deliveryId, {
      employeeApp: "mock",
      deliveredAt: new Date().toISOString(),
    });
    if (!ack.ok) throw new Error(`Ack failed: ${ack.error}`);
    console.log(`   queueStatus=${ack.delivery?.queueStatus}`);

    console.log("\n=== Demo OK – Freigabe → Plattform → Mitarbeiter-App ===\n");
  } finally {
    if (bridgeProc) bridgeProc.kill("SIGTERM");
    if (mockProc) mockProc.kill("SIGTERM");
    await sleep(200);
  }
}

main().catch((e) => {
  console.error("\nDemo fehlgeschlagen:", e.message);
  process.exit(1);
});
