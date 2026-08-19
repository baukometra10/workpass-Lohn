/**
 * Human-final policy v2:
 * - LLM may never invent tax amounts.
 * - Assistant may apply BMF PAP / SV gesetzlich via the payroll engine after confirm.
 * - ELSTER submit is allowed with a stored company certificate after confirm (or auto-submit flag).
 */
export const POLICY_VERSION = "2";

/** Actions that must never be attributed to an LLM / free-form assistant. */
export const AI_MAY_NEVER = Object.freeze([
  "invent_tax",
  "apply_invented_rates",
  "publish_tax_ruleset",
  "mutate_statutory_rates",
  "execute_unconfirmed_action",
]);

/** Engine-backed actions the assistant may trigger after human confirm. */
export const AI_MAY_WITH_ENGINE = Object.freeze([
  "apply_engine_tax",
  "elster_submit_with_cert",
  "elster_lsta_with_cert",
]);

/** Sensitive APIs that require body.confirm === true (human gate). */
export const CONFIRM_REQUIRED_ACTIONS = Object.freeze([
  "month_close",
  "release_payslip",
  "sepa_export",
  "datev_export",
  "lodas_export",
  "elster_prep_download",
  "elster_cert_save",
  "elster_submit",
  "lsta_submit",
  "apply_engine_tax",
  "backup_restore",
  "tax_ruleset_publish",
  "tax_ruleset_review",
  "delivery_replay",
  "payroll_correct",
  "gobd_export",
  "erechnung_export",
  "certificate_deliver",
  "export_import",
]);

const AI_ACTOR_RE = /^(ai|assistant|llm|bot|copilot|auto[_-]?ai)$/i;

export function isAiActor(actor) {
  if (actor == null || actor === "") return false;
  return AI_ACTOR_RE.test(String(actor).trim());
}

/**
 * Reject if client claims AI applied law / tax / execute.
 * @returns {{ ok: true } | { ok: false, status: number, error: string, code: string }}
 */
export function assertNotAiApplyingLaw(body = {}) {
  const appliedBy = body.appliedBy ?? body.actor ?? body.source;
  if (body.applyEngineTax === true) {
    return { ok: true, engineTax: true };
  }
  if (isAiActor(appliedBy)) {
    return {
      ok: false,
      status: 403,
      code: "human_final_required",
      error:
        "Policy: KI darf keine erfundenen Steuerwerte setzen. "
        + "Nur BMF PAP über applyEngineTax nach Bestätigung.",
    };
  }
  if (body.execute === true || body.applyTax === true || body.applyLegalRates === true) {
    return {
      ok: false,
      status: 403,
      code: "ai_execute_forbidden",
      error:
        "Policy: freie execute/applyTax-Beträge sind verboten. "
        + "Steuer nur über BMF PAP (applyEngineTax) nach Bestätigung.",
    };
  }
  if (body.appliedByAi === true || body.aiApplied === true) {
    return {
      ok: false,
      status: 403,
      code: "human_final_required",
      error: "Policy: KI darf keine erfundenen Steuerwerte setzen – nur die gesetzliche Engine.",
    };
  }
  return { ok: true };
}

/**
 * Require explicit human confirm: true on sensitive mutations/exports.
 */
export function requireHumanConfirm(body = {}, action = "action") {
  const gate = assertNotAiApplyingLaw(body);
  if (!gate.ok) return gate;
  if (body.confirm !== true) {
    return {
      ok: false,
      status: 422,
      code: "confirm_required",
      error: `Menschliche Bestätigung nötig: { confirm: true } für „${action}“.`,
      action,
    };
  }
  return { ok: true, action };
}

export function humanFinalPublicInfo() {
  return {
    policyVersion: POLICY_VERSION,
    humanFinal: true,
    aiMayNever: [...AI_MAY_NEVER],
    confirmRequiredActions: [...CONFIRM_REQUIRED_ACTIONS],
    aiMayWithEngine: [...AI_MAY_WITH_ENGINE],
    note:
      "WorkPass Lohn: KI setzt Steuer nur über BMF PAP / SV gesetzlich. "
      + "ELSTER-Versand mit hinterlegtem Zertifikat. Keine erfundenen LLM-Beträge.",
  };
}
