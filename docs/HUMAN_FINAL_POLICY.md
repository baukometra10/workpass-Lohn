# Human-final policy (v2)

WorkPass Lohn treats **invented tax amounts as forbidden**. Statutory tax is applied only by the **BMF PAP / SV gesetzlich** engine.

## Rules

- AI / assistants **explain gaps** (`POST /v1/portal/assistant/explain`) and may **apply engine tax** after `{ confirm: true }` (`POST /v1/portal/assistant/apply-engine-tax`).
- Free-form `applyTax` / invented rates / LLM amounts are rejected.
- Sensitive APIs still require `{ "confirm": true }` from a human session.
- Firm UI uses a **checkbox modal** (`humanConfirm`) for month-close, exports, engine tax, ELSTER cert, LStA, and LStB submit.
- Backup restore additionally requires `confirmPhrase: "RESTORE"`.
- **ELSTER:** PKCS#12 encrypted. **LStA** (company, month, § 41a) and **LStB** (employee, year, § 41b) via `WORKPASS_ELSTER_SUBMIT_URL` / `WORKPASS_ELSTER_ERIC_CMD`. Without a sidecar: `PENDING` (not Finanzamt). Auto-submit after month-close sends **LStA**. Live Testmerker only with `WORKPASS_ELSTER_TEST=0`.
- SEPA / DATEV / LODAS: generate files after confirm; bank/DATEV upload by the human.
- SEPA validates **IBAN mod-97**; invalid debtor IBAN blocks export.
- GoBD: released payslips are **immutable** without `POST /v1/payroll/:jobId/correct` (reason + confirm).
- Two months in parallel: current + previous (`WORKPASS_AUTO_PARALLEL_MONTHS=1`, default on).

## Code

- [`server/policy/human-final.mjs`](../server/policy/human-final.mjs)
- Public info: `GET /v1/policy/human-final`
