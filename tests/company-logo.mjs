/**
 * Company logo: nested extract, clear platform question, pull-then-ask
 * Run: node tests/company-logo.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync, existsSync } from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
const testDb = path.join(root, "server", "data", `logo-${stamp}.sqlite`);
process.env.WORKPASS_SQLITE_PATH = testDb;
process.env.WORKPASS_DATA_KEY = "logo-test-key-material-not-prod";
process.env.WORKPASS_SESSION_SECRET = "logo-session";
process.env.WORKPASS_API_KEY = "logo-api-key";
delete process.env.WORKPASS_DATABASE_URL;
delete process.env.DATABASE_URL;
delete process.env.WORKPASS_PLATFORM_WEBHOOK_URL;
delete process.env.WORKPASS_PLATFORM_BASE_URL;

const { resetDataKeyCache } = await import("../server/security/crypto.mjs");
resetDataKeyCache();
const { initDb, saveCompany, loadCompany } = await import("../server/db/repository.mjs");
const { closeSqlite } = await import("../server/db/sqlite.mjs");
const { pickLogoFields, companyLogoPullPaths } = await import("../server/platform-pull.mjs");
const {
  extractHubProfileFromPayload,
  applyPulledCompanyProfile,
  requestCompanyLogoFromPlatform,
  pullAndSyncCompanyBranding,
  companyHasLogo,
} = await import("../server/company-branding.mjs");

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Company logo ===");
initDb();

const nested = pickLogoFields({ url: "https://cdn.example.com/brand/logo.png" });
assert(nested.logoUrl.includes("cdn.example.com"), "nested logo.url");

const dataUrl = pickLogoFields({ dataUrl: "data:image/png;base64,AAA" });
assert(dataUrl.logoDataUrl.startsWith("data:image/png"), "nested dataUrl");

const hub = extractHubProfileFromPayload({
  branding: { logo: { url: "https://files.example.com/a.png" } },
}, { id: "cmp-x", name: "Logo GmbH", street: "Weg 1", zip: "10115", city: "Berlin" });
assert(hub?.logoUrl?.includes("files.example.com"), "extract nested branding.logo.url");

const companyId = `cmp-logo-${stamp}`;
saveCompany({ id: companyId, name: "Logo GmbH", taxNumber: "11/22/33333" });
const applied = applyPulledCompanyProfile(companyId, {
  company: { id: companyId },
  hubProfile: { logoUrl: "https://files.example.com/a.png", seller: "Logo GmbH\nBerlin" },
});
assert(applied.ok && applied.hasLogo, "apply logoUrl");
assert(loadCompany(companyId)?.logoUrl?.includes("files.example.com"), "logoUrl on company record");

const asked = await requestCompanyLogoFromPlatform(loadCompany(companyId), { notify: false });
assert(asked.ok && /Firmenlogo/.test(asked.question || ""), "clear logo question");
assert(asked.message?.type === "company.logo.requested" || asked.message?.code === "company_logo_requested" || asked.ok, "logo request type");
assert(companyLogoPullPaths(companyId).some((p) => p.includes("/logo")), "logo GET paths");

const pulled = await pullAndSyncCompanyBranding(companyId, { ask: true, notify: false });
assert(pulled.asked === false || pulled.missingLogo === false || pulled.asked === true, "pull-then-ask returns");
assert(companyHasLogo(loadCompany(companyId)), "logo still present after pull");

const emptyId = `cmp-nologo-${stamp}`;
saveCompany({ id: emptyId, name: "Ohne Logo GmbH" });
const miss = await pullAndSyncCompanyBranding(emptyId, { ask: true, notify: false });
assert(miss.missingLogo === true, "missing logo detected");
assert(miss.asked === true, "clear ask sent when logo missing");
assert(/klare Anfrage|Logo nicht gefunden/i.test(miss.message || ""), `ask message: ${miss.message}`);

closeSqlite();
if (existsSync(testDb)) unlinkSync(testDb);

console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===\n`);
process.exit(failed > 0 ? 1 : 0);
