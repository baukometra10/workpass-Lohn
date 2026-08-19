# Webhook: Accounting → Platform

**Platform receives** at:

`POST https://suppix-ai-workpass.com/api/workpass/webhooks/accounting`

**Accounting sends** (Railway env):

```
WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
WORKPASS_PLATFORM_WEBHOOK_KEY=<shared secret>
WORKPASS_WEBHOOK_RETRIES=3
WORKPASS_WEBHOOK_TIMEOUT_MS=8000
```

Sync overview for the platform: `GET {ACCOUNTING}/v1/platform/status`

---

## 1) Incoming headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-WorkPass-Webhook-Key` | shared secret (required → 401 if wrong) |
| `X-WorkPass-Event` | see events below |
| `X-WorkPass-Idempotency-Key` | stable id for dedupe |
| `X-WorkPass-Company-Id` | tenant (when known) |
| `X-WorkPass-Attempt` | retry counter 1…n |

---

## 2) Envelope (`schemaVersion: 2`)

Employee documents (Lohnabrechnung, LStB, VB, Rechnung) use:

- `event`: **`document.released`**
- `documentType`: **`payslip` | `lstb` | `verdienst` | `invoice`**
- `documentTitle` / `title`: German display names for the employee inbox (never raw codes)
  - `payslip` → **Entgeltabrechnung** · title e.g. `Entgeltabrechnung 2026-08`
  - `lstb` → **Lohnsteuerbescheinigung** · title e.g. `Lohnsteuerbescheinigung 2026`
  - `verdienst` → **Verdienstbescheinigung** · title e.g. `Verdienstbescheinigung 2026-08`
  - `invoice` → **Rechnung** · title e.g. `Rechnung RE-2026-0042`
- `document` must be the **full** certificate/payslip/invoice body (rows, totals, monthDetails, wageItems) — never summary-only
- **`pdfBase64`** (required): original PDF file as Base64 (`%PDF…` → starts with `JVBER…`). Also mirrored on `document.pdfBase64`, plus `pdfFileName` / `pdfMimeType: application/pdf`
- Without `pdfBase64` the employee app cannot show the original — Accounting refuses incomplete deliveries
- `contentComplete: true` + `documentChecksum` prove integrity
- Fallback pull of one full item: `GET /v1/delivery/{deliveryId}`


```json
{
  "kind": "platform.accounting.event.v1",
  "schemaVersion": 2,
  "event": "document.released",
  "documentType": "payslip",
  "documentTitle": "Entgeltabrechnung",
  "title": "Entgeltabrechnung 2025-07",
  "occurredAt": "2026-07-28T10:00:00.000Z",
  "source": "workpass-accounting-bridge",
  "idempotencyKey": "pay:…",
  "company": { "id": "luf", "name": "…" },
  "delivery": {
    "type": "payslip",
    "documentType": "payslip",
    "documentTitle": "Entgeltabrechnung",
    "title": "Entgeltabrechnung 2025-07"
  },
  "message": null,
  "monthClose": null,
  "meta": {
    "legacyEvent": "payslip.released",
    "documentType": "payslip",
    "documentTitle": "Entgeltabrechnung",
    "title": "Entgeltabrechnung 2025-07"
  }
}
```

### Events

| Event | Example | Platform action |
|-------|---------|-----------------|
| `payslip.released` | `examples/webhook-payslip.released.json` | Show payslip in employee app |
| `invoice.released` | `examples/webhook-invoice.released.json` | Show invoice |
| `accounting.message` | `examples/webhook-accounting.message.json` | Inbox: **one** bundled gap message per employee → fix → resend → `POST /v1/messages/:id/ack` (accounting shows „Auftrag gesehen“) |
| Employees import | `POST /v1/employees/import` + `examples/platform-employees.import.v1.json` | Name + **badgeId** (badge never printed on payslip; optional `personnelNumber` may print) |
| `employee.data.requested` | — | Firm asked for missing fields of **one** employee; platform should fill gaps and resend (incomplete OK) |
| `employees.list.requested` | — | Accounting asks platform to send employees (POST /v1/employees/import) |
| `company.logo.requested` | — | Accounting pulled logo endpoints; still missing. Platform should expose GET `…/logo` or POST `/v1/company/activate` with `hubProfile.logoUrl` / `logoDataUrl`. `meta.question` is the human-readable ask. |
| `payroll.month.requested` | — | Accounting asks platform to push/export the month now |
| `invoices.export.requested` | — | Accounting asks platform to push invoices (POST /v1/invoice/batch or /v1/invoice/ingest) |
| `payroll.batch.received` / `month.auto.processed` | — | Inbound batch processed; payslips auto-released when complete |
| `invoice.batch.received` / `invoices.auto.processed` | — | Inbound invoices processed; invoices auto-released when valid |
| `payroll.waiting` | `examples/webhook-payroll.waiting.json` | Month still empty – prompt firm/platform to send batch |
| `month.closed` | `examples/webhook-month.closed.json` | Mark month done / notify HR |
| `month.close.partial` | — | Month closed with some employees incomplete; platform was asked for gaps |
| `month.close.failed` | — | Show errors / retry |

`delivery.kind` for documents: `platform.employee.delivery.v1`  
`message.kind` for gaps: `platform.accounting.message.v1`

---

## 3) What the platform should do

1. Verify `X-WorkPass-Webhook-Key`
2. Dedupe on `idempotencyKey` / `delivery.deliveryId` → return 200 if already processed
3. Route by `event`
4. Document receipt (required for full confirm):
   - webhook `{ accepted: true }` = **empfangen**
   - `POST /v1/delivery/{deliveryId}/open` = **geöffnet**
   - `POST /v1/delivery/{deliveryId}/ack` = **gesehen** (complete)
   - Or one webhook body: `{ accepted: true, opened: true, seen: true }` / `employeeAppStatus: "viewed"`
5. Message receipt: `POST /v1/messages/:id/received` → `/open` → `/ack` (same three stages)
6. Poll fallback anytime: `GET /v1/platform/status` or `/v1/delivery/pending` + `/v1/messages/pending`

---

## 4) Expected response

```json
{ "ok": true, "accepted": true, "received": true, "opened": true, "seen": true, "deliveryId": "pay:…", "employeeAppStatus": "viewed" }
```

**Wichtig:** Volle Bestätigung im Steuerprogramm nur bei **empfangen · geöffnet · gesehen**.  
Nur `{ accepted: true }` = empfangen, aber noch nicht vollständig. Bare `{ ok: true }` reicht nicht.

Non-2xx → accounting retries (default 3×). Items stay in `/v1/delivery/pending` for pull.

---

## 5) Recommended platform handler

```js
app.post("/api/workpass/webhooks/accounting", async (req, res) => {
  if (req.get("X-WorkPass-Webhook-Key") !== process.env.WORKPASS_PLATFORM_WEBHOOK_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid webhook key" });
  }
  const envelope = req.body;
  if (envelope?.kind !== "platform.accounting.event.v1") {
    return res.status(400).json({ ok: false, error: "Invalid envelope" });
  }
  const key = envelope.idempotencyKey || envelope.delivery?.deliveryId;
  if (await alreadyProcessed(key)) {
    return res.status(200).json({ ok: true, accepted: true, duplicate: true });
  }
  switch (envelope.event) {
    case "payslip.released":
    case "invoice.released":
      await saveEmployeeDelivery(envelope.delivery);
      break;
    case "accounting.message":
    case "payroll.waiting":
    case "company.logo.requested":
    case "employees.list.requested":
      await saveAccountingInbox(envelope.message || envelope);
      break;
    case "month.closed":
    case "month.close.failed":
      await saveMonthCloseStatus(envelope.monthClose);
      break;
  }
  return res.status(200).json({
    ok: true,
    accepted: true,
    deliveryId: envelope.delivery?.deliveryId || key,
  });
});
```

---

## 6) Env on both sides

### Accounting (Railway)

```
WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
WORKPASS_PLATFORM_WEBHOOK_KEY=<long shared secret – must match platform exactly>
WORKPASS_API_KEY=<api key for /v1 calls – often different from webhook key>
WORKPASS_PLATFORM_WEBHOOK_AUTH=both
```

`WORKPASS_PLATFORM_WEBHOOK_AUTH`: `header` (nur `X-WorkPass-Webhook-Key`), `bearer` (nur `Authorization: Bearer`), oder `both` (Standard).

### Monthly cadence (no duplicate pulls)

```
WORKPASS_MONTHLY_ONCE=1
WORKPASS_MONTHLY_PAYROLL_DAYS=28,29
WORKPASS_MONTHLY_CATCHUP=1
```

Accounting pulls employees/hours **once per month** (preferred on day 28/29), then calculates and releases payslips to the platform. Before day 28 the auto pipeline skips current-month pulls. Manual firm-portal sync remains allowed anytime.

### Platform

```
WORKPASS_ACCOUNTING_BASE_URL=https://workpass-lohn.up.railway.app
WORKPASS_API_KEY=<same api key>
WORKPASS_PLATFORM_WEBHOOK_KEY=<same webhook secret as accounting>
```

**401 unauthorized** heißt fast immer: Webhook-Key stimmt nicht. Nicht den API-Key und den Webhook-Key verwechseln.