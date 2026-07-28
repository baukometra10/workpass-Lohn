#!/usr/bin/env node
/**
 * Generate production secrets for Railway / .env
 * Usage: node scripts/gen-secrets.mjs
 */
import { randomBytes } from "node:crypto";

function secret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

const apiKey = secret(36);
const dataKey = secret(36);
const webhookKey = secret(32);
const backupKey = secret(32);

const block = `# --- Generated ${new Date().toISOString()} – paste into Railway Variables ---
WORKPASS_STRICT=1
WORKPASS_FORCE_HTTPS=1
WORKPASS_SERVE_UI=1
WORKPASS_API_KEY=${apiKey}
WORKPASS_DATA_KEY=${dataKey}
WORKPASS_BACKUP_KEY=${backupKey}
WORKPASS_PLATFORM_WEBHOOK_KEY=${webhookKey}
WORKPASS_PLATFORM_DOMAIN=suppix-ai-workpass.com
WORKPASS_CORS_ORIGIN=https://suppix-ai-workpass.com,https://www.suppix-ai-workpass.com,https://app.suppix-ai-workpass.com
WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
WORKPASS_SQLITE_PATH=/data/workpass-local.sqlite
WORKPASS_BACKUP_DIR=/data/backups
WORKPASS_BACKUP_INTERVAL_HOURS=24
WORKPASS_BACKUP_KEEP=30
`;

console.log(block);
console.log("# Share with platform team (webhook only):");
console.log(`# WORKPASS_PLATFORM_WEBHOOK_KEY=${webhookKey}`);
console.log(`# Accounting base URL after deploy: https://<your-service>.up.railway.app`);
