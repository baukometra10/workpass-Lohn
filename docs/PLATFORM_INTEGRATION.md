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
**Tax Rules Engine (Gesetze nach Datum, ohne Accounting-Rewrite):** [`TAX_RULES_ENGINE.md`](TAX_RULES_ENGINE.md)  
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

مع بيانات دخول الشركة (اختياري لكن موصى به):

```json
"login": { "email": "luf@firma.de", "password": "4821" }
```

إن لم يُرسل `email` يُستخدم `{company.id}@firma.de` (متغير `WORKPASS_COMPANY_LOGIN_DOMAIN`).  
كلمة السر/PIN من **4 أحرف/أرقام** فأكثر. تُخزَّن مشفّرة (scrypt).

بعدها تفتح المحاسبة بـ `luf@firma.de` + `4821` (دور accountant، معزول على نفس الشركة).

**مهم:** تفعيل الشركة داخل المنصة وحدها لا يكفي. المنصة يجب أن تستدعي Accounting مرة واحدة على الأقل:

`POST https://workpass-lohn.up.railway.app/v1/company/login-sync`

```json
{
  "companyId": "luf",
  "name": "Lufthansa",
  "login": { "email": "luf@firma.de", "password": "4821" }
}
```

Header: `X-WorkPass-Key: <WORKPASS_API_KEY>`

أو نفس البيانات مع `POST /v1/company/activate`.

مثال: `examples/platform-company.activate.v1.json`  
SDK: `client.activateCompany(payload)` / `client.syncCompanyLogin(payload)`

إعادة الاستدعاء آمنة (idempotent).  
- إلغاء ناعم (الربط فقط): `POST /v1/company/deactivate`  
- **حذف الشركة من المنصة → حذف فوري من المحاسبة:** `POST /v1/company/delete`  
  (مرادف: `POST /v1/company/purge` أو `DELETE /v1/company/:id`)

```json
{
  "kind": "platform.company.delete.v1",
  "event": "company.deleted",
  "company": { "id": "luf" },
  "deletedBy": "platform"
}
```

يحذف الـ Mandant + payroll/invoice/delivery المرتبطة. مثال: `examples/platform-company.delete.v1.json`  
SDK: `client.deleteCompany(idOrPayload)`

### Kommunikation Buchhaltung ↔ Plattform (fehlende Daten)

Wenn IBAN, Steuer-Nr., SV-Nummer usw. fehlen, erzeugt WorkPass Lohn eine Nachricht:

1. Webhook-Event `accounting.message` an `WORKPASS_PLATFORM_WEBHOOK_URL`  
   **oder** Plattform pollt `GET /v1/messages/pending`
2. Plattform zeigt die Meldung im Firmen-UI
3. Klick/Lesen → `POST /v1/messages/{messageId}/ack` → Nachricht verschwindet aus Pending  
4. Wenn die Daten nachgeliefert werden, werden erledigte Gaps automatisch `resolved`

Beispiel Ack:

```http
POST /v1/messages/msg:…/ack
X-WorkPass-Key: …
{ "readBy": "platform-user@…" }
```

احتياط: أول `payroll/invoice ingest` ينشئ الحساب أيضاً إن نُسي التفعيل.

### تسجيل الدخول (منصة / أدمن)

| Endpoint | وصف |
|----------|-----|
| `GET /v1/auth/config` | أوضاع الدخول المتاحة (عام) |
| `POST /v1/auth/login` | `{ email, password }` → Session |
| `POST /v1/auth/platform-handoff` | **زر واحد من المنصة** → `openUrl` بجلسة موقعة من المحاسبة |
| `GET /v1/auth/me` | المستخدم الحالي (`X-WorkPass-Session`) |
| `GET /v1/admin/overview` | لوحة أدمن المحاسبة |

#### دخول بزر واحد (Buchhaltung من المنصة)

المنصة **لا تصنع** توكن HMAC بنفسها. تستدعي المحاسبة ثم تفتح `openUrl`:

```http
POST https://workpass-lohn.up.railway.app/v1/auth/platform-handoff
X-WorkPass-Key: <WORKPASS_API_KEY>
Content-Type: application/json

{
  "companyId": "cmp-cd3c66a0b71a",
  "preferredLocale": "ar",
  "user": { "email": "luf@firma.de", "name": "Lufthansa" }
}
```

الجواب:

```json
{
  "ok": true,
  "openUrl": "https://workpass-lohn.up.railway.app/lohn.html#suppix-sso=…",
  "session": "…",
  "expiresAt": "…",
  "user": { "role": "accountant", "companyId": "cmp-…" }
}
```

زر المنصة يفتح `openUrl` (نافذة أو redirect). SDK: `client.platformHandoff({ companyId })`.

**مهم:** `WORKPASS_SESSION_SECRET` يبقى على المحاسبة فقط — لا تشاركه مع المنصة.

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
| POST | `/v1/company/deactivate` | Accounting-Link soft-off (Daten bleiben) |
| POST | `/v1/company/delete` | Firma hard-löschen (Plattform gelöscht) |
| POST | `/v1/company/purge` | Alias für delete |
| DELETE | `/v1/company/:id` | Alias für delete |
| POST | `/v1/company/upsert` | Firma anlegen/aktualisieren |
| GET | `/v1/companies` | Firmenliste (+ workspaces) |
| GET | `/v1/company/:id` | Eine Firma + workspace |
| POST | `/v1/payroll/ingest` | `platform.payroll.v1` → Berechnung |
| POST | `/v1/payroll/batch` | Monats-Batch |
| POST | `/v1/payroll/month-close` | Monatsabschluss: Pull → berechnen → Freigabe an Plattform |
| GET | `/v1/messages/pending` | Offene Meldungen Buchhaltung → Plattform (fehlende Daten) |
| POST | `/v1/messages/:id/ack` | Nachricht gelesen → verschwindet aus Pending |
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
| `platform.company.delete.v1` | Platform → Accounting (حذف فوري عند حذف الشركة) |
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

## Bescheinigungen (Portal)

Aus **freigegebenen** Monatsabrechnungen, tenant-scoped:

| API | Zweck |
|-----|--------|
| `GET /v1/portal/certificates/summary?year=` | Mitarbeiter mit freigegebenen Monaten |
| `GET /v1/portal/certificates/lstb?employeeId=&year=` | Lohnsteuerbescheinigung (Jahreswerte) |
| `GET /v1/portal/certificates/verdienst?employeeId=&year=&period=` | Verdienstbescheinigung (Monat + Jahressumme) |

Im Firmenportal: Karte **Bescheinigungen pro Mitarbeiter**, Buttons LStB / VB in der Mitarbeiterliste, **Alle LStB drucken** am Jahresende. Rechtsinhalt bleibt Deutsch.

---

## Firmenlogo

WorkPass Lohn **zieht das Logo zuerst** von der Plattform (GET), z. B.:

- `/api/v1/company/{id}/logo`
- `/api/companies/{id}/logo`
- `/api/v1/branding` / `…/branding` (JSON mit `logoUrl` oder `logoDataUrl`)

Wenn das Logo danach fehlt, geht Event **`company.logo.requested`** an die Plattform – mit klarer Frage in `meta.question` und Inbox-Text. Antwort: Logo per GET bereitstellen **oder** `POST /v1/company/activate` mit `hubProfile.logoUrl` / `logoDataUrl`.

Manuell im Portal: **Logo & Absender holen**.

---

## Checkliste für die Plattform-Seite

- [ ] Shared API-Key setzen
- [ ] Payroll-Payload gemäß `examples/platform-payroll.v1.json` senden
- [ ] Webhook-Endpoint implementieren **oder** Pending-Poll + Ack
- [ ] `document` / `appRoute` in Mitarbeiter-App rendern
- [ ] Nach Zustellung `ack` aufrufen
- [ ] `npm run demo:delivery` gegen Staging laufen lassen

## SUPPIX · Ein-Monats-Vertrag

Die Plattform sendet die Beschäftigungsart, WorkPass rät **nicht** Minijob aus einem niedrigen Monatsbrutto.

| Feld | Bedeutung |
|------|-----------|
| `employee.employmentType` | `regular` \| `mini` \| `midi` \| `auto` \| `one_month` / `kurzfristig` |
| `employee.contractMonths` | `1` = Monatsvertrag, bleibt SV-pflichtig `regular` |
| `employee.contractDuration` | `one_month` / `monatsvertrag` |

`meta.oneMonthContract` wird am Job gesetzt. Minijob nur bei explizit `employmentType=mini`.

Wenn du den Plattform-Pfad oder die Webhook-URL schickst, verdrahten wir den letzten Schritt direkt.
