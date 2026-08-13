## One-click Buchhaltung (Firmen-Portal)

Die Plattform öffnet WorkPass Lohn **nicht** mit einem selbst erzeugten Token.

1. `POST /v1/auth/platform-handoff` mit `X-WorkPass-Key` und `{ "companyId": "cmp-…" }`
2. Antwort enthält `openUrl` (inkl. `#suppix-sso=…` mit von Accounting signierter Session)
3. Button „Buchhaltung“ → `window.open(openUrl)` oder Redirect

Ohne diesen Schritt bleibt die Anmeldeseite stehen (ungültige Hash-Tokens werden abgelehnt).


## Pull-first (Accounting holt Daten)

WorkPass versucht **zuerst GET** auf der Plattform:

- `GET /api/v1/company?companyId=…` (Branding/Logo)
- `GET /api/contracts` / `GET /api/contracts/:employeeId` (Vertrag → Stammdaten + Gehalt)
- `GET /api/employees` / `GET /api/companies/:id/employees`

Auth: `X-Api-Key` / `X-WorkPass-Key` / `Authorization: Bearer` mit `WORKPASS_PLATFORM_API_KEY` oder `WORKPASS_API_KEY`.

Logo/Branding werden **nie** per „Bitte senden“-Webhook angefordert, sondern nur per GET geholt.
Webhook-Events (`employee.data.requested` …) nur für Felder, die nach dem Pull wirklich fehlen.

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

**Aktueller Live-Stand (Probe):**  
`POST https://suppix-ai-workpass.com/api/workpass/webhooks/accounting` antwortet mit **HTTP 401** ohne gültigen Key (Endpoint ist live).  
Mit korrektem `WORKPASS_PLATFORM_WEBHOOK_KEY` muss die Plattform **2xx** und idealerweise `{ "ok": true, "accepted": true }` zurückgeben **und** `payslip.released` / `delivery` speichern.  
Sonst zeigt Accounting „freigegeben“, aber in der Mitarbeiter-App erscheint nichts. Fallback: `GET /v1/delivery/pending`.

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

**Stundenlohn-Modell (empfohlen):** Vertrag liefert `hourlyRate` / `stundenlohn`, Plattform liefert Monatsstunden:

```json
{
  "kind": "platform.payroll.batch.v1",
  "period": "2026-07",
  "company": { "id": "IHRE-FIRMA-ID", "name": "Firma GmbH", "taxNumber": "…" },
  "employees": [
    {
      "employee": {
        "badgeId": "BP-FA-Z2CIE",
        "name": "Feras Almohammad",
        "taxClass": "I",
        "healthFund": "TK",
        "insuranceNo": "12050855X123",
        "hourlyRate": 18.50,
        "bank": { "name": "Sparkasse", "iban": "DE89…" }
      },
      "attendance": { "days": 20, "hours": 160 }
    }
  ]
}
```

Alias akzeptiert: `insuranceNumber` (= SV-Nummer), `krankenkasse` / `healthInsurance.provider` (= KK), `stundenlohn` (= Stundenlohn).  
Brutto = `attendance.hours × hourlyRate`. Ohne Monatsstunden bleibt die Person im Portal mit Chip „Stunden“.

**Personal-Nr.:** optional. Fehlt `personnelNumber`, vergibt Accounting je Firma eine stabile Nummer (`1001`, `1002`, …) und druckt sie auf dem Blatt. Badge-IDs (`BP-…`) erscheinen nie auf dem Gehaltszettel. Wenn die Plattform später eine eigene Personal-Nr. sendet, hat diese Vorrang.

**Exports (Firma):**  
- `GET /v1/portal/month-export?period=YYYY-MM` → DATEV-CSV (Stunden, SV, KK, Mandant/Berater)  
- `GET /v1/portal/lodas-export?period=YYYY-MM` → LODAS-Paket (INI + Bewegungen + Stamm)  
- `GET /v1/portal/completeness?period=YYYY-MM` → Checkliste Logo/Firma/Stunden/SV/KK/Netto

WorkPass berechnet automatisch: **Brutto = hours × hourlyRate**, dann Steuern/SV, Freigabe → `payslip.released`.

Oder klassisch mit fertigem Brutto:

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
        "healthPercent": "14.6",
        "insuranceNo": "…"
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
