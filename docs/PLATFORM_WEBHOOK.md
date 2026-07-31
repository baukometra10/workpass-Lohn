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

```json
{
  "kind": "platform.accounting.event.v1",
  "schemaVersion": 2,
  "event": "payslip.released",
  "occurredAt": "2026-07-28T10:00:00.000Z",
  "source": "workpass-accounting-bridge",
  "idempotencyKey": "pay:…",
  "company": { "id": "luf", "name": "…" },
  "delivery": { },
  "message": null,
  "monthClose": null,
  "meta": null
}
```

### Events

| Event | Example | Platform action |
|-------|---------|-----------------|
| `payslip.released` | `examples/webhook-payslip.released.json` | Show payslip in employee app |
| `invoice.released` | `examples/webhook-invoice.released.json` | Show invoice |
| `accounting.message` | `examples/webhook-accounting.message.json` | Inbox: missing IBAN / Steuer-Nr. … → fix → resend payroll → ack |
| `payroll.waiting` | `examples/webhook-payroll.waiting.json` | Prompt firm to send month batch |
| `month.closed` | `examples/webhook-month.closed.json` | Mark month done / notify HR |
| `month.close.failed` | — | Show errors / retry |

`delivery.kind` for documents: `platform.employee.delivery.v1`  
`message.kind` for gaps: `platform.accounting.message.v1`

---

## 3) What the platform should do

1. Verify `X-WorkPass-Webhook-Key`
2. Dedupe on `idempotencyKey` / `delivery.deliveryId` → return 200 if already processed
3. Route by `event`
4. Ack documents: `POST /v1/delivery/{deliveryId}/ack`
5. Ack messages after user read / data fixed: `POST /v1/messages/{messageId}/ack`
6. Poll fallback anytime: `GET /v1/platform/status` or `/v1/delivery/pending` + `/v1/messages/pending`

---

## 4) Expected response

```json
{ "ok": true, "accepted": true, "deliveryId": "pay:…", "employeeAppStatus": "queued" }
```

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
WORKPASS_PLATFORM_WEBHOOK_KEY=<long shared secret>
WORKPASS_API_KEY=<api key>
```

### Platform

```
WORKPASS_ACCOUNTING_BASE_URL=https://workpass-lohn.up.railway.app
WORKPASS_API_KEY=<same api key>
WORKPASS_PLATFORM_WEBHOOK_KEY=<same webhook secret>
```
