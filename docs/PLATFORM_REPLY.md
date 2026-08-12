# Platform: auf WorkPass-Anfragen antworten

WorkPass Lohn fragt die Plattform. Die Plattform **muss** Daten zurücksenden.
Ohne diesen Schritt bleibt der Monatsabschluss bei „Warte auf Plattform“.

## Was WorkPass sendet (an `WORKPASS_PLATFORM_WEBHOOK_URL`)

| Event | Plattform soll |
|-------|----------------|
| `employees.list.requested` | Mitarbeiterliste an Accounting pushen |
| `payroll.month.requested` | Monats-Lohnbatch an Accounting pushen |
| `invoices.export.requested` | Offene/exportierte Rechnungen an Accounting pushen |
| `employee.data.requested` | Fehlende Felder für **eine** Person nachliefern (nur was nach Pull noch fehlt) |
| `payslip.released` | Fertige Abrechnung dem Mitarbeiter zeigen |
| `invoice.released` | Fertige Rechnung in der App zeigen |
| `platform.ping` | nur `200 OK` zurückgeben (Connectivity) |

**Aktueller Live-Stand:**  
`https://suppix-ai-workpass.com/api/workpass/webhooks/accounting` antwortet mit **HTTP 404**.  
Solange das so ist, kommen Anfragen und fertige Abrechnungen nicht an.

## Was die Plattform zurücksenden muss

Base: `WORKPASS_ACCOUNTING_BASE_URL=https://workpass-lohn.up.railway.app`  
Header: `X-WorkPass-Key: <gleicher WORKPASS_API_KEY>`

### 1) Mitarbeiter

`POST /v1/employees/import`

```json
{
  "companyId": "IHRE-FIRMA-ID",
  "employees": [
    { "badgeId": "B-100", "name": "Schmidt Laura", "personnelNumber": "100" }
  ]
}
```

### 2) Monatsabrechnungen

`POST /v1/payroll/batch`

```json
{
  "kind": "platform.payroll.batch.v1",
  "period": "2026-08",
  "company": { "id": "IHRE-FIRMA-ID", "name": "Firma GmbH" },
  "employees": [
    {
      "employee": {
        "id": "B-100",
        "badgeId": "B-100",
        "name": "Schmidt Laura",
        "taxClass": "I",
        "healthFund": "TK",
        "healthPercent": "14.6"
      },
      "attendance": { "days": 20, "hours": 160 },
      "wageItems": [
        { "code": "2000", "label": "Gehalt", "amount": 3200, "taxFlag": "L", "svFlag": "L" }
      ],
      "bank": { "name": "Bank", "iban": "DE89370400440532013000" }
    }
  ]
}
```

Danach macht WorkPass **automatisch**: berechnen → freigeben → Event `payslip.released` zurück.

### 3) Rechnungen

`POST /v1/invoice/batch` (oder einzeln `POST /v1/invoice/ingest`)

```json
{
  "kind": "platform.invoice.batch.v1",
  "period": "2026-08",
  "company": { "id": "IHRE-FIRMA-ID", "name": "Firma GmbH" },
  "invoices": [
    {
      "number": "RE-2026-0001",
      "invoiceDate": "2026-08-01",
      "customer": "Kunde AG\nStraße 1\n10115 Berlin",
      "taxRate": 19,
      "items": [
        { "description": "Leistung", "quantity": 1, "unitPrice": 100, "unit": "Stk" }
      ]
    }
  ]
}
```

Danach macht WorkPass **automatisch**: übernehmen → freigeben → Event `invoice.released` zurück.

## Fallback ohne Webhook

Wenn der Webhook 404 ist, kann die Plattform pollen:

1. `GET {ACCOUNTING}/v1/messages/pending` (Header `X-WorkPass-Key`)
2. Offene Typen: `employees.list.requested`, `payroll.month.requested`, `invoices.export.requested`, `data.gap`
3. Daten pushen wie oben
4. Optional: `POST /v1/messages/:messageId/ack`

## Minimal-Handler (Plattform)

```js
app.post("/api/workpass/webhooks/accounting", async (req, res) => {
  if (req.get("X-WorkPass-Webhook-Key") !== process.env.WORKPASS_PLATFORM_WEBHOOK_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid webhook key" });
  }
  const { event, company, meta, message, delivery } = req.body || {};
  const accounting = process.env.WORKPASS_ACCOUNTING_BASE_URL;
  const key = process.env.WORKPASS_API_KEY;
  const headers = {
    "Content-Type": "application/json",
    "X-WorkPass-Key": key,
    "X-WorkPass-Company-Id": company?.id || "",
  };

  if (event === "platform.ping") {
    return res.status(200).json({ ok: true, accepted: true });
  }

  if (event === "employees.list.requested" && company?.id) {
    const employees = await loadCompanyEmployees(company.id); // eure DB
    await fetch(`${accounting}/v1/employees/import`, {
      method: "POST",
      headers,
      body: JSON.stringify({ companyId: company.id, employees }),
    });
  }

  if (event === "payroll.month.requested" && company?.id) {
    const period = meta?.period || message?.period;
    const batch = await buildPayrollBatch(company.id, period); // eure DB
    await fetch(`${accounting}/v1/payroll/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
    });
  }

  if (event === "invoices.export.requested" && company?.id) {
    const period = meta?.period || message?.period;
    const invoices = await loadCompanyInvoices(company.id, period); // eure DB
    await fetch(`${accounting}/v1/invoice/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "platform.invoice.batch.v1",
        period,
        company: { id: company.id },
        invoices,
      }),
    });
  }

  if (event === "payslip.released" && delivery) {
    await savePayslipForEmployee(delivery); // Mitarbeiter-App
  }

  if (event === "invoice.released" && delivery) {
    await saveInvoiceForCompany(delivery); // Firmen-/Beleg-App
  }

  return res.status(200).json({ ok: true, accepted: true });
});
```

## Check

Auf WorkPass Lohn (eingeloggt):

- Button **Webhook prüfen** → muss OK sein (nicht 404)
- Button **Jetzt synchronisieren** → danach erscheinen Mitarbeiter / Abrechnungen
