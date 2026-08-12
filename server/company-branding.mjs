/**
 * Build Mandant/hub branding from platform activate payloads,
 * and ask the platform for missing logo / address / bank data.
 */
import { notifyPlatform } from "./notify.mjs";
import { upsertPlatformMessage } from "./platform-messages.mjs";
import { loadCompany, saveCompany } from "./db/repository.mjs";
import { normalizeCompanyId } from "./tenant.mjs";

function pickString(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function buildSellerBlock(company = {}, hub = {}, branding = {}) {
  if (pickString(hub.seller, branding.seller, company.address)) {
    return pickString(hub.seller, branding.seller, company.address);
  }
  const name = pickString(company.name, branding.name, hub.companyName);
  const street = pickString(company.street, branding.street, hub.street);
  const zipCity = [pickString(company.zip, branding.zip, hub.zip), pickString(company.city, branding.city, hub.city)]
    .filter(Boolean)
    .join(" ");
  return [name, street, zipCity].filter(Boolean).join("\n").trim();
}

/**
 * Collect hubProfile fields from any activate / company envelope.
 */
export function extractHubProfileFromPayload(payload = {}, companyBody = {}) {
  const branding = (payload.branding && typeof payload.branding === "object" ? payload.branding : null)
    || (payload.brand && typeof payload.brand === "object" ? payload.brand : null)
    || (companyBody.branding && typeof companyBody.branding === "object" ? companyBody.branding : null)
    || (companyBody.brand && typeof companyBody.brand === "object" ? companyBody.brand : null)
    || {};
  const hub = (payload.hubProfile && typeof payload.hubProfile === "object" ? payload.hubProfile : null)
    || (companyBody.hubProfile && typeof companyBody.hubProfile === "object" ? companyBody.hubProfile : null)
    || (companyBody.meta?.hubProfile && typeof companyBody.meta.hubProfile === "object" ? companyBody.meta.hubProfile : null)
    || (payload.profile && typeof payload.profile === "object" ? payload.profile : null)
    || {};
  const bank = (payload.bank && typeof payload.bank === "object" ? payload.bank : null)
    || (companyBody.bank && typeof companyBody.bank === "object" ? companyBody.bank : null)
    || (hub.bank && typeof hub.bank === "object" ? hub.bank : null)
    || (branding.bank && typeof branding.bank === "object" ? branding.bank : null)
    || {};

  const logoDataUrl = pickString(
    hub.logoDataUrl,
    branding.logoDataUrl,
    payload.logoDataUrl,
    companyBody.logoDataUrl,
    branding.logo?.dataUrl,
    hub.logo?.dataUrl
  );
  const logoUrl = pickString(
    hub.logoUrl,
    branding.logoUrl,
    payload.logoUrl,
    companyBody.logoUrl,
    branding.logo,
    hub.logo,
    branding.logoURL
  );
  // Avoid storing non-URL objects as logoUrl
  const logoUrlSafe = /^https?:\/\//i.test(logoUrl) ? logoUrl : "";

  const seller = buildSellerBlock(companyBody, hub, branding);
  const out = {
    seller: seller || undefined,
    logoDataUrl: logoDataUrl || undefined,
    logoUrl: logoUrlSafe || undefined,
    commercialRegister: pickString(hub.commercialRegister, branding.commercialRegister, companyBody.commercialRegister) || undefined,
    managingDirector: pickString(hub.managingDirector, branding.managingDirector, companyBody.managingDirector) || undefined,
    companyBankName: pickString(hub.companyBankName, bank.name, bank.bankName, branding.bankName) || undefined,
    companyIban: pickString(hub.companyIban, bank.iban, branding.iban) || undefined,
    companyBic: pickString(hub.companyBic, bank.bic, branding.bic) || undefined,
    datevClientNo: pickString(hub.datevClientNo, companyBody.datevClientNo) || undefined,
    datevConsultantNo: pickString(hub.datevConsultantNo, companyBody.datevConsultantNo) || undefined,
    payrollHeaderLine: pickString(hub.payrollHeaderLine, branding.headerLine, branding.payrollHeaderLine) || undefined,
    payrollFooterLine: pickString(hub.payrollFooterLine, branding.footerLine, branding.payrollFooterLine) || undefined,
    payrollLayout: pickString(hub.payrollLayout, branding.payrollLayout) || undefined,
    note: pickString(hub.note, branding.note) || undefined,
    source: "platform-activate",
  };

  // Drop empty keys
  for (const [k, v] of Object.entries(out)) {
    if (v === undefined || v === "") delete out[k];
  }
  return Object.keys(out).length ? out : null;
}

export function hubProfileNeedsEnrichment(hubProfile) {
  if (!hubProfile || typeof hubProfile !== "object") return true;
  const hasLogo = Boolean(hubProfile.logoDataUrl || hubProfile.logoUrl);
  const hasSeller = Boolean(String(hubProfile.seller || "").trim());
  return !hasLogo || !hasSeller;
}

/**
 * Ask platform for company branding / stammdaten (logo, address, bank).
 */
export async function requestCompanyBrandingFromPlatform(company, opts = {}) {
  const id = normalizeCompanyId(company?.id || "");
  if (!id) return { ok: false, error: "companyId fehlt" };
  const name = String(company?.name || id);
  const payload = {
    type: "company.profile.requested",
    severity: "action_needed",
    company: { id, name },
    code: "company_profile_requested",
    dedupeKey: `company.profile.requested::${id}`,
    title: `Firmenprofil / Branding anfordern · ${name}`,
    body:
      `WorkPass Lohn braucht Stammdaten und Branding für Mandant ${name} (${id}).\n\n`
      + "Bitte senden: POST /v1/company (oder erneut /v1/company/activate) mit:\n"
      + "- company.name, street, zip, city, address, taxNumber, vatId\n"
      + "- hubProfile.logoDataUrl oder logoUrl\n"
      + "- bank (name, iban, bic) / hubProfile.companyIban\n"
      + "Danach steht der Mandant inkl. Logo im Hub und auf Abrechnungen bereit.",
    gaps: [{
      code: "company_profile_requested",
      field: "hubProfile",
      label: "Firmenlogo / Adresse / Bank fehlen",
      severity: "action_needed",
    }],
    source: opts.source || "company-activate",
  };

  let message = null;
  try {
    const msg = await upsertPlatformMessage(payload, { notify: false });
    message = msg.message;
  } catch { /* ignore */ }

  const notify = opts.notify === false
    ? { skipped: true }
    : await notifyPlatform({
      event: "company.profile.requested",
      company: { id, name },
      message,
      meta: {
        reason: opts.reason || "branding_bootstrap",
        replyPath: "/v1/company/activate",
        hint: "Bitte hubProfile + Adresse + Logo an Accounting senden",
      },
      idempotencyKey: `company-profile:${id}:${Math.floor(Date.now() / 3_600_000)}`,
    });

  return { ok: true, message, notify };
}

/**
 * If hubProfile has logoUrl but no logoDataUrl, try to download once.
 */
export async function hydrateCompanyLogoFromUrl(companyId, opts = {}) {
  const id = normalizeCompanyId(companyId);
  const company = loadCompany(id);
  if (!company) return { ok: false, error: "Firma nicht gefunden" };
  const hub = company.meta?.hubProfile;
  if (!hub?.logoUrl || hub.logoDataUrl) {
    return { ok: true, skipped: true, reason: hub?.logoDataUrl ? "already_has_data" : "no_logo_url" };
  }
  const url = String(hub.logoUrl);
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "logoUrl ungültig" };

  const timeoutMs = Number(opts.timeoutMs || 8000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, error: `logo HTTP ${res.status}` };
    const ctype = String(res.headers.get("content-type") || "");
    if (!/^image\//i.test(ctype) && !/svg/i.test(ctype)) {
      return { ok: false, error: "logoUrl ist kein Bild" };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 280_000) return { ok: false, error: "logo zu groß" };
    const b64 = buf.toString("base64");
    const mime = ctype.split(";")[0].trim() || "image/png";
    const logoDataUrl = `data:${mime};base64,${b64}`;
    company.meta = {
      ...(company.meta || {}),
      hubProfile: {
        ...hub,
        logoDataUrl,
        logoUrl: url,
        updatedAt: new Date().toISOString(),
      },
    };
    company.updatedAt = new Date().toISOString();
    saveCompany(company);
    return { ok: true, hydrated: true, bytes: buf.length };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "logo timeout" : (e.message || String(e)) };
  } finally {
    clearTimeout(timer);
  }
}
