/**
 * Mock WorkPass Platform – receives accounting webhooks + polls delivery queue.
 *
 * Simulates: accounting Freigabe → platform → employee app inbox.
 *
 * Run alone:  node mock-platform/server.mjs
 * Full demo:  npm run demo:delivery
 */
import http from "node:http";
import { appendFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.MOCK_PLATFORM_PORT || 8790);
const HOST = process.env.MOCK_PLATFORM_HOST || "127.0.0.1";
const WEBHOOK_KEY = process.env.WORKPASS_PLATFORM_WEBHOOK_KEY || process.env.WORKPASS_API_KEY || "workpass-dev-key";
const inboxFile = path.join(root, "data", "employee-inbox.json");
const logFile = path.join(root, "data", "webhook-log.jsonl");

function ensure() {
  const dir = path.join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(inboxFile)) writeFileSync(inboxFile, "[]", "utf8");
}

function loadInbox() {
  ensure();
  try {
    const raw = JSON.parse(readFileSync(inboxFile, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveInbox(list) {
  ensure();
  writeFileSync(inboxFile, JSON.stringify(list, null, 2), "utf8");
}

function logWebhook(entry) {
  ensure();
  appendFileSync(logFile, `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`, "utf8");
}

function deliverToEmployeeApp(delivery) {
  const inbox = loadInbox().filter((d) => d.deliveryId !== delivery.deliveryId);
  inbox.unshift({
    ...delivery,
    receivedAt: new Date().toISOString(),
    employeeAppStatus: "visible",
  });
  saveInbox(inbox.slice(0, 200));
  return inbox[0];
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error(e.message));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const pathName = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "GET" && pathName === "/health") {
    return send(res, 200, { ok: true, service: "workpass-mock-platform", time: new Date().toISOString() });
  }

  // Accounting → Platform webhook
  if (req.method === "POST" && pathName === "/api/workpass/webhooks/accounting") {
    const key = req.headers["x-workpass-webhook-key"];
    if (key !== WEBHOOK_KEY) {
      return send(res, 401, { ok: false, error: "Invalid webhook key" });
    }
    try {
      const envelope = await readBody(req);
      logWebhook({ direction: "in", envelope });
      const delivery = envelope?.delivery;
      if (!delivery) {
        return send(res, 400, { ok: false, error: "delivery missing" });
      }
      const item = deliverToEmployeeApp(delivery);
      console.log(`[mock-platform] ${envelope.event} → employee app: ${item.title || item.deliveryId}`);
      return send(res, 200, {
        ok: true,
        accepted: true,
        deliveryId: item.deliveryId,
        employeeAppStatus: "visible",
      });
    } catch (e) {
      return send(res, 400, { ok: false, error: e.message });
    }
  }

  if (req.method === "GET" && pathName === "/employee/inbox") {
    const inbox = loadInbox();
    return send(res, 200, { ok: true, count: inbox.length, items: inbox });
  }

  return send(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock WorkPass Platform on http://${HOST}:${PORT}`);
  console.log(`Webhook: POST /api/workpass/webhooks/accounting`);
  console.log(`Employee inbox: GET /employee/inbox`);
});
