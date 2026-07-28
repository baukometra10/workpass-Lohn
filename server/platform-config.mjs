/**
 * Known WorkPass Platform identity – used for CORS defaults & docs.
 * Override via env without code changes.
 */
export const PLATFORM_DOMAIN = process.env.WORKPASS_PLATFORM_DOMAIN || "suppix-ai-workpass.com";

export const PLATFORM_ORIGINS = (
  process.env.WORKPASS_CORS_ORIGIN
  || [
    `https://${PLATFORM_DOMAIN}`,
    `https://www.${PLATFORM_DOMAIN}`,
    `https://app.${PLATFORM_DOMAIN}`,
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const PLATFORM_WEBHOOK_DEFAULT_PATH = "/api/workpass/webhooks/accounting";

export function platformWebhookUrl() {
  return (
    process.env.WORKPASS_PLATFORM_WEBHOOK_URL
    || `https://${PLATFORM_DOMAIN}${PLATFORM_WEBHOOK_DEFAULT_PATH}`
  );
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (PLATFORM_ORIGINS.includes("*")) return true;
  return PLATFORM_ORIGINS.some((o) => o === origin);
}
