/**
 * Default support contacts for Hub → Hilfe.
 * Admin can override anytime via admin.html → Hilfe-Kontakt (server store).
 */
window.WorkPassHelpContactDefaults = Object.freeze({
  product: "WorkPass Steuerprogramm · Suppix AI",
  website: "https://suppix-ai-workpass.com",
  websiteLabel: "suppix-ai-workpass.com",
  email: "support@suppix-ai-workpass.com",
  phone: "",
  whatsapp: "",
  hoursDe: "Mo–Fr 9:00–17:00 (CET)",
});

window.WorkPassHelpContact = Object.assign({}, window.WorkPassHelpContactDefaults);
