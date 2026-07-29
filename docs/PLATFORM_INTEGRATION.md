# WorkPass Platform ↔ Accounting Bridge

دليل الربط بين منصة WorkPass وتطبيق المحاسبة (الرواتب + الفواتير).

---

## منصة WorkPass

**Domain:** [https://suppix-ai-workpass.com](https://suppix-ai-workpass.com)

| إعداد | قيمة افتراضية |
|--------|----------------|
| CORS | `https://suppix-ai-workpass.com` (+ www / app) |
| Webhook المقترح | `https://suppix-ai-workpass.com/api/workpass/webhooks/accounting` |

**عقد الاستقبال في المنصة (Headers + JSON + Ack):** [`PLATFORM_WEBHOOK.md`](PLATFORM_WEBHOOK.md)  
أمثلة: `examples/webhook-payslip.released.json`, `examples/webhook-invoice.released.json`

ضبط عبر `.env` / Railway – انظر `.env.example`.

---

## Multi-Tenant (Firma-Isolation)

Siehe auch: Speicherung local-first + Postgres in [`docs/STORAGE.md`](STORAGE.md).

**قاعدة ذهبية:** `company.id` من المنصة هو مفتاح العزل الوحيد. الاسم وحده غير كافٍ.

| Regel | Umsetzung |
|-------|-----------|
| Pflichtfeld | Jede Payroll-/Invoice-/Company-Nutzlast braucht `company.id` |
| Job-Schlüssel | `companyId::employeeId::period` |
| Rechnungs-ID | `companyId::Rechnungsnummer` |
| Scope-Header | `X-WorkPass-Company-Id` → Inbox/GET/Release nur eigene Firma |
| Registry | `POST /v1/company/upsert`, `GET /v1/companies`, `GET /v1/company/:id` |
| Delivery | Enthält immer `company.id` – Plattform routet an richtige Firma |

Beispiel Lufthansa vs. andere Firma: gleiche Personalnummer `1001` erzeugt **zwei getrennte Jobs** – keine Datenvermischung.

```bash
npm run test:tenant
```

### Company via API

```json
{
  "kind": "platform.company.v1",
  "id": "lufthansa",
  "name": "Deutsche Lufthansa AG",
  "street": "…",
  "zip": "…",
  "city": "…",
  "taxNumber": "…",
  "vatId": "…"
}
```

Alle Firmenfelder (Adresse, Steuernummer, DATEV-Nrn., …) werden über die API ausgetauscht – siehe `examples/platform-company.v1.json`.

### تفعيل الشركة → حساب + قسم فوري

عندما تفعّل المنصة شركة لإرسال الكشوف للمحاسبة، استدعِ **فوراً**:

`POST /v1/company/activate`  
(مرادف: `POST /v1/company/provision`)

```json
{
  "kind": "platform.company.activate.v1",
  "event": "company.accounting.activated",
  "company": { "id": "lufthansa", "name": "Deutsche Lufthansa AG", "…": "…" },
  "connection": {
    "accountingEnabled": true,
    "sendPayslips": true,
    "sendInvoices": true,
    "activatedBy": "platform"
  }
}
```

النتيجة: سجل Mandant + مساحة عمل (`meta.section`) مع `accountingEnabled: true` — تظهر في واجهة Lohn حتى قبل أول كشف.

مثال: `examples/platform-company.activate.v1.json`  
SDK: `client.activateCompany(payload)`

إعادة الاستدعاء آمنة (idempotent). إلغاء ناعم: `POST /v1/company/deactivate`.

احتياط: أول `payroll/invoice ingest` ينشئ الحساب أيضاً إن نُسي التفعيل.

### تسجيل الدخول (منصة / أدمن)

| Endpoint | وصف |
|----------|-----|
| `GET /v1/auth/config` | أوضاع الدخول المتاحة (عام) |
| `POST /v1/auth/login` | `{ email, password }` → Session |
| `GET /v1/auth/me` | المستخدم الحالي (`X-WorkPass-Session`) |
| `GET /v1/admin/overview` | لوحة أدمن المحاسبة |

**المفضّل:** `WORKPASS_PLATFORM_AUTH_URL` على المنصة يتحقق من نفس كلمة سر WorkPass.  
**احتياط حتى تجهز المنصة:** `WORKPASS_ADMIN_EMAIL` + `WORKPASS_ADMIN_PASSWORD` على Railway.

عقد المنصة المقترح:

`POST WORKPASS_PLATFORM_AUTH_URL`  
Body: `{ "kind":"platform.auth.verify.v1", "email", "password", "audience":"accounting" }`  
Response: `{ "ok": true, "user": { "id", "email", "name", "role": "admin"|"accountant" } }`

واجهة الأدمن: `/admin.html`

---

## العربية — ما الذي اكتمل من جهة المحاسبة؟

جسر المحاسبة جاهز للربط. المنصة نفسها لم تُعدَّل بعد؛ عندما تجهّز المنصة تربطها عبر العقود أدناه.

### التدفق المتفق عليه

```
المنصة → POST ساعات/أجور (أو فاتورة)
المحاسبة تحسب الضرائب + قسيمة الراتب
المحاسب يراجع في lohn → Freigabe
المحاسبة تُرجع حزمة تسليم + Webhook (أو قائمة انتظار)
المنصة → تطبيق الموظف
```

### ما تحتاجه منك لاحقاً

1. مسار مستودع المنصة (أو URL الـ webhook)
2. `WORKPASS_API_KEY` مشترك
3. (اختياري) `WORKPASS_PLATFORM_WEBHOOK_URL` لاستقبال أحداث الإصدار فوراً

بدون webhook: المنصة تسحب عبر `GET /v1/delivery/pending` ثم `POST .../ack`.

---

## Deutsch – Schnellstart

### 1. Bridge starten

```bash
npm start
# http://127.0.0.1:8787
# Header: X-WorkPass-Key: workpass-dev-key
```

### 2. Env (Produktion)

| Variable | Bedeutung |
|----------|-----------|
| `WORKPASS_API_KEY` | Auth für Bridge |
| `WORKPASS_API_PORT` | Default `8787` |
| `WORKPASS_PLATFORM_WEBHOOK_URL` | Push nach Freigabe |
| `WORKPASS_PLATFORM_WEBHOOK_KEY` | Shared secret am Webhook |

### 3. Demo End-to-End

```bash
npm run demo:delivery
```

Startet Bridge + Mock-Platform, ingest → Freigabe → Employee-Inbox → Ack.

### 4. SDK (in Plattform-Backend kopieren)

```js
import { WorkPassAccountingClient } from "./sdk/workpass-accounting-client.mjs";

const client = new WorkPassAccountingClient({
  baseUrl: "http://127.0.0.1:8787",
  apiKey: process.env.WORKPASS_API_KEY,
});

const { ok, payslip, job } = await client.ingestPayroll({
  kind: "platform.payroll.v1",
  // … siehe examples/platform-payroll.v1.json
});

// Nach Buchhalter-Freigabe (UI oder API):
const rel = await client.releasePayroll(job.jobId);
// rel.delivery  → an Mitarbeiter-App
// rel.platformNotify → Webhook-Ergebnis
```

---

## API-Übersicht

| Method | Path | Rolle |
|--------|------|-------|
| GET | `/health` | Liveness |
| POST | `/v1/company/activate` | Firma aktivieren → Konto + Workspace sofort |
| POST | `/v1/company/provision` | Alias für activate |
| POST | `/v1/company/deactivate` | Accounting-Link soft-off |
| POST | `/v1/company/upsert` | Firma anlegen/aktualisieren |
| GET | `/v1/companies` | Firmenliste (+ workspaces) |
| GET | `/v1/company/:id` | Eine Firma + workspace |
| POST | `/v1/payroll/ingest` | `platform.payroll.v1` → Berechnung |
| POST | `/v1/payroll/batch` | Monats-Batch |
| GET | `/v1/payroll/:jobId` | Job |
| GET | `/v1/payroll/:jobId/payslip` | Payslip |
| POST | `/v1/payroll/:jobId/release` | Freigabe + Delivery |
| POST | `/v1/invoice/ingest` | `platform.invoice.v1` |
| POST | `/v1/invoice/:id/release` | Rechnungs-Freigabe |
| GET | `/v1/inbox` | UI-Inbox |
| GET | `/v1/delivery/pending` | Pull: bereit für Mitarbeiter-App |
| POST | `/v1/delivery/:deliveryId/ack` | Zustellung bestätigt |

Auth: Header `X-WorkPass-Key`.

---

## Verträge (Kinds)

| Kind | Richtung |
|------|----------|
| `platform.payroll.v1` | Platform → Accounting |
| `platform.company.activate.v1` | Platform → Accounting (تفعيل فوري) |
| `platform.payslip.v1` | Accounting → Platform |
| `platform.invoice.v1` | Platform ↔ Accounting |
| `platform.employee.delivery.v1` | Accounting → Platform (nach Freigabe) |
| `platform.accounting.event.v1` | Webhook-Envelope |

Beispiele: `examples/platform-*.json`

### Delivery-Payload (Kern)

```json
{
  "kind": "platform.employee.delivery.v1",
  "type": "payslip",
  "deliveryId": "pay:…",
  "employee": { "id": "…", "name": "…" },
  "period": "2026-07",
  "summary": { "gross": 3200, "net": 2100, "currency": "EUR" },
  "document": { /* platform.payslip.v1 */ },
  "appRoute": "/employee/payslips/…"
}
```

### Webhook (Push)

`POST WORKPASS_PLATFORM_WEBHOOK_URL`

Headers:

- `Content-Type: application/json`
- `X-WorkPass-Webhook-Key`
- `X-WorkPass-Event: payslip.released | invoice.released`

Body: `platform.accounting.event.v1` mit `delivery`.

Mock zum Testen:

```bash
npm run mock:platform
# POST http://127.0.0.1:8790/api/workpass/webhooks/accounting
# GET  http://127.0.0.1:8790/employee/inbox
```

---

## Buchhalter-UI

In `lohn.html` → Tab **Empfang** → **API-Bridge**:

1. Bridge-URL + Key
2. Inbox laden
3. Öffnen / Freigabe

Nach Freigabe: Delivery-Queue + optional Webhook.

---

## Checkliste für die Plattform-Seite

- [ ] Shared API-Key setzen
- [ ] Payroll-Payload gemäß `examples/platform-payroll.v1.json` senden
- [ ] Webhook-Endpoint implementieren **oder** Pending-Poll + Ack
- [ ] `document` / `appRoute` in Mitarbeiter-App rendern
- [ ] Nach Zustellung `ack` aufrufen
- [ ] `npm run demo:delivery` gegen Staging laufen lassen

Wenn du den Plattform-Pfad oder die Webhook-URL schickst, verdrahten wir den letzten Schritt direkt.
