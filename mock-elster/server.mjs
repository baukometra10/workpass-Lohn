/**
 * Mock ELSTER sidecar – accepts WorkPass LStB XML + PKCS#12, never talks to the Finanzamt.
 *
 * Contract:
 *   POST { kind: "workpass.elster.submit.v1", submissionId, xml, p12, pin }
 *   → { ok, id, accepted }
 *
 * Run:  node mock-elster/server.mjs
 * Port: MOCK_ELSTER_PORT (default 8791)
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { appendFileSync, mkdirSync, existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.MOCK_ELSTER_PORT || 8791);
const HOST = process.env.MOCK_ELSTER_HOST || "127.0.0.1";
const KEY = process.env.WORKPASS_ELSTER_SUBMIT_KEY || "";
const logFile = path.join(root, "data", "submit-log.jsonl");

function ensureLog() {
  const dir = path.join(root, "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function logSubmit(entry) {
  ensureLog();
  appendFileSync(logFile, `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`, "utf8");
}

export function handleElsterSubmit(body, { key = "" } = {}) {
  if (KEY && key !== KEY) {
    return { status: 401, body: { ok: false, accepted: false, error: "Ungültiger Sidecar-Schlüssel" } };
  }
  if (!body || typeof body !== "object") {
    return { status: 400, body: { ok: false, accepted: false, error: "JSON-Body fehlt" } };
  }
  if (body.kind !== "workpass.elster.submit.v1") {
    return { status: 400, body: { ok: false, accepted: false, error: "kind muss workpass.elster.submit.v1 sein" } };
  }
  const xml = String(body.xml || "");
  const p12 = String(body.p12 || "");
  const pin = String(body.pin || "");
  if (xml.length < 40 || !xml.includes("<Elster") || !(xml.includes("LStB") || xml.includes("LStA"))) {
    return { status: 422, body: { ok: false, accepted: false, error: "ELSTER-XML unvollständig (LStB oder LStA)" } };
  }
  if (p12.length < 40) {
    return { status: 422, body: { ok: false, accepted: false, error: "PKCS#12 fehlt" } };
  }
  if (pin.length < 4) {
    return { status: 422, body: { ok: false, accepted: false, error: "PIN fehlt" } };
  }
  const id = `mock-elster-${String(body.submissionId || "anon").replace(/[^\w:-]/g, "").slice(0, 48)}`;
  const reject = body.reject === true || String(body.forceReject || "") === "1";
  if (reject) {
    return { status: 502, body: { ok: false, accepted: false, id, error: "Mock-Sidecar lehnt ab" } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      id,
      accepted: true,
      finanzamtReached: false,
      hint: "Mock-Sidecar hat angenommen. Nicht das Finanzamt.",
    },
  };
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    Connection: "close",
  });
  res.end(JSON.stringify(body));
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

export function createMockElsterServer() {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-WorkPass-Elster-Key",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      res.end();
      return;
    }
    if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/health")) {
      send(res, 200, { ok: true, kind: "workpass.elster.mock.v1", finanzamt: false });
      return;
    }
    if (req.method === "POST" && (u.pathname === "/" || u.pathname === "/v1/elster/submit")) {
      try {
        const body = await readBody(req);
        const key = String(req.headers["x-workpass-elster-key"] || "");
        const result = handleElsterSubmit(body, { key });
        logSubmit({
          path: u.pathname,
          status: result.status,
          submissionId: body?.submissionId || null,
          accepted: result.body?.accepted,
        });
        send(res, result.status, result.body);
      } catch (e) {
        send(res, 400, { ok: false, accepted: false, error: e.message || String(e) });
      }
      return;
    }
    send(res, 404, { ok: false, error: "not_found" });
  });
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  const server = createMockElsterServer();
  server.listen(PORT, HOST, () => {
    console.log(`[mock-elster] ${HOST}:${PORT}  (not Finanzamt)`);
  });
}
