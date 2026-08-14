# Tax Rules Engine

WorkPass Lohn **liest keine Gesetze selbst**. Die Buchhaltung schickt eine Transaktion an den Tax Rules Engine; der Engine wählt das **veröffentlichte Ruleset**, das am **Belegdatum** gilt, und gibt Sätze + Quellen zurück.

```
Offizielle Quellen (BMF PAP, SGB IV, UStG)
        ↓  (KI nur zum Extrahieren von Entwürfen)
   draft → reviewed → published
        ↓
 Tax Rules Engine  (deterministisch, testbar, zitierbar)
        ↓
 Buchhaltung  →  Bridge  →  Plattform
```

KI darf **nie** die Steuer einer Buchung berechnen. Nur Regeln extrahieren. Die Anwendung bleibt ein festes Ruleset.

## Effective dating

`asOf` / `period` (z. B. `2025-12-15` oder `2026-07`) wählt das Pack:

| Datum | Mini-Grenze | KV-Zusatz Ø | PV AN |
|-------|-------------|-------------|-------|
| 2025-12-15 | 556 € | 2,5 % | 1,7 % |
| 2026-07 | 603 € | 2,9 % | 1,8 % |

Mid-year: ein zweites Pack mit späterem `effectiveFrom` überschreibt das Jahres-Pack ab diesem Tag.

## Lifecycle API

```http
POST /v1/tax/rulesets
X-WorkPass-Key: …
{ "id": "DE-SV-USt-2027.1", "country": "DE", "effectiveFrom": "2027-01-01",
  "papYear": 2027, "sv": { … }, "vat": { "standard": 19 }, "citations": [ … ] }
```

Immer **draft**. Beispiel: [`examples/tax-ruleset.de-2027.draft.json`](../examples/tax-ruleset.de-2027.draft.json).

```http
POST /v1/tax/rulesets/DE-SV-USt-2027.1/review
POST /v1/tax/rulesets/DE-SV-USt-2027.1/publish
```

Vor `publish`: Schema-Validierung + Acceptance-Tests. Status: `draft` | `reviewed` | `published`. Nur `published` geht in die Berechnung.

Admin-UI: `admin.html` → Tax Rules Engine (`GET /v1/admin/tax/rulesets`). JSON-Entwurf einfügen oder Datei wählen → immer **draft**.

Hub: „Gesetzliche Sätze übernehmen“ füllt RV/KV/PV/AV aus dem Ruleset des **Abrechnungsmonats** (nicht fest 2026). Rechnungen ohne gesetzten Satz holen USt aus dem Engine (Rechnungsdatum).

## Evaluate / Ruleset lookup

```http
POST /v1/tax/evaluate
{ "country": "DE", "asOf": "2026-07-15", "kind": "payroll-params" }

GET /v1/tax/ruleset?country=DE&asOf=2026-07-15
GET /v1/tax/rulesets?country=DE
```

Rechnungen ohne `taxRate` im Payload holen den USt-Satz aus dem Engine (Rechnungsdatum).

## Audit

Jede Auswertung enthält `citations` (Quelle, Artikel, Gültigkeit). Payroll speichert `taxAudit` (rulesetId, asOf, papYear, citations). Invoice speichert `draft.taxAudit`.

Built-in Packs: `tax-rules/packs.mjs` (`DE-SV-USt-2025.1`, `DE-SV-USt-2026.1`). Lohnsteuerbetrag bleibt **BMF PAP**-Modul (`papYear` aus dem Pack) – nicht KI.
