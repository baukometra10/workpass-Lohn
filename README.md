# WorkPass Lohn · Suppix AI

Professioneller **Buchhaltungs-Arbeitsplatz**: Rechnungen (§ 14 UStG) und Lohnabrechnungen – standalone nutzbar, mit **Platform-Bridge-API** für den Datenaustausch.

## Einstieg

| Datei | Rolle |
|-------|--------|
| **`index.html`** | Hub: PIN-Schutz, Übersicht, Rechnungen, Mandant, Datensicherung |
| **`lohn.html`** | Lohnarbeitsplatz: Empfang · Bearbeitung · Live-A4 · Druck/PDF · API-Inbox |
| **`server/`** | Bridge-API: Plattform ↔ Buchhaltung |

1. UI: `npm run serve:ui` → http://127.0.0.1:8765
2. Bridge: `npm start` → http://127.0.0.1:8787
3. PIN (4–8 Ziffern) festlegen

## Speicherung (Local-First + optional Postgres)

- **Lokal immer an:** SQLite unter `server/data/workpass-local.sqlite` (**AES-256-GCM** verschlüsselt)
- **Extern optional:** `WORKPASS_DATABASE_URL` → Sync über Outbox
- Security: [`docs/SECURITY.md`](docs/SECURITY.md) · Storage: [`docs/STORAGE.md`](docs/STORAGE.md)
- Backups: [`docs/BACKUP.md`](docs/BACKUP.md) · Railway/TLS: [`docs/RAILWAY.md`](docs/RAILWAY.md)

```bash
npm run test:db
npm run test:security
npm run test:backup
npm run backup:create
```

## Platform-Bridge (Kommunikation)

Die **Plattform** sendet Monatsdaten / Rechnungen an die Buchhaltung. Nach Prüfung freigibt die Buchhaltung – die **Plattform stellt Abrechnungen und Rechnungen dem Mitarbeiter-App zu**.

```bash
npm start
# Header: X-WorkPass-Key: workpass-dev-key
```

| Methode | Pfad | Zweck |
|---------|------|--------|
| GET | `/health` | Status |
| POST | `/v1/payroll/ingest` | 1 Mitarbeiter-Monat (`platform.payroll.v1`) → berechnet `platform.payslip.v1` |
| POST | `/v1/payroll/batch` | Firmen-Monat (`platform.payroll.batch.v1`) |
| GET | `/v1/payroll/:jobId` | Job laden |
| POST | `/v1/payroll/:jobId/release` | Freigabe → Plattform → Mitarbeiter-App |
| POST | `/v1/invoice/ingest` | Rechnung empfangen (`platform.invoice.v1`) |
| POST | `/v1/invoice/:id/release` | Rechnungs-Freigabe an Plattform |
| GET | `/v1/inbox` | Offene Jobs für die Buchhaltungs-UI |
| GET | `/v1/delivery/pending` | Pull: freigegebene Docs für Mitarbeiter-App |
| POST | `/v1/delivery/:id/ack` | Zustellung durch Plattform bestätigt |
| POST | `/v1/company/activate` | Firma aktivieren → Konto + Workspace sofort |
| POST | `/v1/company/upsert` | Firma anlegen/aktualisieren (`company.id`) |
| GET | `/v1/companies` | Firmenliste (+ workspaces) |
| GET | `/v1/company/:id` | Eine Firma |

**Multi-Tenant:** Pflichtfeld `company.id` auf allen Payloads. Header `X-WorkPass-Company-Id` begrenzt jeden Zugriff auf genau diese Firma. Tests: `npm run test:tenant`

```bash
npm run mock:platform   # Mock-Plattform :8790
npm run demo:delivery   # ingest → Freigabe → Inbox → Ack
```

SDK: `sdk/workpass-accounting-client.mjs`

Beispiele: `examples/platform-payroll.v1.json`, `platform-payroll.batch.v1.json`, `platform-invoice.v1.json`, `platform-payslip.v1.json`

```bash
curl -s -X POST http://127.0.0.1:8787/v1/payroll/ingest \
  -H "Content-Type: application/json" \
  -H "X-WorkPass-Key: workpass-dev-key" \
  -d @examples/platform-payroll.v1.json
```

In `lohn.html` → Empfang → **API-Bridge**: Inbox laden, öffnen, freigeben.

## Lohn: Empfang (auch ohne Plattform)

- **Datei** – JSON / CSV
- **Inbox / Paste** – JSON einfügen
- **API-Bridge** – vom Server
- **Manuell** – Felder ausfüllen

## Funktionen

- PIN + Idle-Sperre
- Live-A4-Entgeltabrechnung
- Druck/PDF = nur A4
- Archiv je Firma/Mitarbeiter/Monat
- Export JSON/CSV, Rechnungs-PDF
- Steuer/SV: BMF PAP 2026 + SGB IV

## Tests

```bash
npm test
npm run test:api
npm run test:e2e
```

## Hinweise

- Bridge-Daten lokal unter `server/data/`
- Ersetzt keine zertifizierte Voll-Lohnsoftware
- ELSTER-XML = Vorbereitung zur manuellen Prüfung

## Marke

**WorkPass Lohn** by **Suppix AI**
# workpass-Lohn
