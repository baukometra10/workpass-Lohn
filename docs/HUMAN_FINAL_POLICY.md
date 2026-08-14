# Human-final policy

WorkPass Lohn treats **tax and statutory decisions as human-only**.

## Rules

- AI / assistants may **explain gaps** only (`POST /v1/portal/assistant/explain`).
- AI must **never** apply tax rates, publish tax rulesets, close a month, release payslips, mark SEPA paid, or submit ELSTER.
- Sensitive APIs require `{ "confirm": true }` from a human session.
- Backup restore additionally requires `confirmPhrase: "RESTORE"`.
- ELSTER: preparation/checklist only – upload on elster.de by the human.
- SEPA / DATEV / LODAS: generate files after confirm; bank/DATEV upload by the human.

## Code

- [`server/policy/human-final.mjs`](../server/policy/human-final.mjs)
- Public info: `GET /v1/policy/human-final`
