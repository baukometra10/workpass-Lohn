/**
 * Human-final policy: AI / automation may never apply tax law or finalize sensitive actions.
 * Final confirmation is always a human operator on the accounting system.
 */
export const POLICY_VERSION = "1";

/** Actions that must never be attributed to AI / never executed by an assistant. */
export const AI_MAY_NEVER = Object.freeze([
  "apply_tax",
  "apply_legal_rates",
  "publish_tax_ruleset",
  "month_close",
  "release_payslip",
  "release_invoice",
  "elster_submit",
  "sepa_mark_paid",
  "datev_finalize",
  "mutate_statutory_rates",
  "execute_assistant_action",
]);

/** Sensitive APIs that require body.confirm === true (human gate). */
export const CONFIRM_REQUIRED_ACTIONS = Object.freeze([
  "month_close",
  "release_payslip",
  "sepa_export",
  "datev_export",
  "lodas_export",
  "elster_prep_download",
  "backup_restore",
  "tax_ruleset_publish",
  "tax_ruleset_review",
  "delivery_replay",
  "payroll_correct",
  "gobd_export",
  "erechnung_export",
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
  if (isAiActor(appliedBy)) {
    return {
      ok: false,
      status: 403,
      code: "human_final_required",
      error:
        "Policy: KI/Assistent darf Steuer- oder Gesetzeswerte nicht anwenden. "
        + "Nur ein Mensch darf bestätigen und ausführen.",
    };
  }
  if (body.execute === true || body.applyTax === true || body.applyLegalRates === true) {
    return {
      ok: false,
      status: 403,
      code: "ai_execute_forbidden",
      error:
        "Policy: execute/applyTax ist verboten. Der Assistent erklärt nur; "
        + "der Mensch führt Aktionen nach Bestätigung aus.",
    };
  }
  if (body.appliedByAi === true || body.aiApplied === true) {
    return {
      ok: false,
      status: 403,
      code: "human_final_required",
      error: "Policy: KI darf keine gesetzlichen Werte setzen.",
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
    note:
      "WorkPass Lohn: KI erklärt höchstens Lücken. Steuer, Freigabe, Export und ELSTER "
      + "bleiben beim Menschen.",
  };
}
