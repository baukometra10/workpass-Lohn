# Human-final policy

WorkPass Lohn treats **tax and statutory decisions as human-only**.

## Rules

- AI / assistants may **explain gaps** only (`POST /v1/portal/assistant/explain`).
- AI must **never** apply tax rates, publish tax rulesets, close a month, release payslips, mark SEPA paid, or submit ELSTER.
- Sensitive APIs require `{ "confirm: true" }` from a human session.
- Firm UI uses a **checkbox modal** (`humanConfirm`) for month-close, exports, and delivery replay.
- Backup restore additionally requires `confirmPhrase: "RESTORE"`.
- ELSTER: preparation/checklist only – upload on elster.de by the human.
- SEPA / DATEV / LODAS: generate files after confirm; bank/DATEV upload by the human.
- SEPA validates **IBAN mod-97**; invalid debtor IBAN blocks export.
- Compliance calendar v2 uses **German banking days** (weekends + federal holidays + Easter) and links readiness blockers.
- Delivery trust v2 exposes a **0–100 score**, gaps, and human replay (`POST /v1/portal/delivery-trust/replay`).

## Code

- [`server/policy/human-final.mjs`](../server/policy/human-final.mjs)
- Public info: `GET /v1/policy/human-final`
