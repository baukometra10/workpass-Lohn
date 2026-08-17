# Verfahrensdokumentation – WorkPass Lohn (Accounting)

Stand: Version siehe `package.json` / `server/version.mjs`.  
Geltungsbereich: elektronische Lohn-/Rechnungsverarbeitung im Accounting-Bridge (SQLite local-first), Anbindung an SUPPIX/WorkPass-Plattform.

> Diese Dokumentation beschreibt den **Ist-Zustand der Software**. Sie ersetzt keine steuerliche Beratung. GoBD-Konformität im Einzelfall ist mit Steuerberater/Wirtschaftsprüfer abzustimmen.

## 1. Systemübersicht

- **Produkt:** WorkPass Lohn / Accounting Bridge  
- **Rolle:** berechnet und speichert Lohnabrechnungen/Rechnungen lokal, liefert Ergebnisse an die Plattform (Webhook/Pull), exportiert DATEV/SEPA/ELSTER (Zertifikat optional).  
- **Human-final v2:** KI setzt Steuer nur über BMF PAP / SV gesetzlich nach `{ confirm: true }`. Keine erfundenen LLM-Beträge (siehe `docs/HUMAN_FINAL_POLICY.md`).  
- **Zwei Monate parallel:** Automatik rechnet aktuellen und vorherigen Monat (`WORKPASS_AUTO_PARALLEL_MONTHS`).

```
SUPPIX / Plattform  ←→  Accounting Bridge (dieses Repo)  ←→  Exporte (DATEV, SEPA, GoBD-Paket)
                              │
                         SQLite (source of truth)
                         + verschlüsselte Payloads
```

## 2. Architektur & Speicherung

| Komponente | Ort | Inhalt |
|---|---|---|
| SQLite | `WORKPASS_SQLITE_PATH` / `server/data/workpass-local.sqlite` | Firmen, Payroll-Jobs, Rechnungen, Deliveries, Outbox, Messages, **document_revisions**, **business_audit** |
| Payload-Verschlüsselung | AES-256-GCM | `WORKPASS_DATA_KEY` oder lokale `.data-key` |
| Security-Audit | `server/data/audit/security-audit.jsonl` | Append-only, Hash-Kette |
| Backups | `.wpbak` | Verschlüsselt, SHA-256, Restore mit Phrase |

Schema: `server/db/schema.sql`. Isolation-Schlüssel: `company_id` auf allen Fachzeilen.

## 3. Mandantentrennung (Tenant)

- Jede Anfrage kann `X-WorkPass-Company-Id` / Session-`companyId` tragen.  
- APIs prüfen Tenant-Scope (`server/tenant.mjs`).  
- Firmensessions sind auf eine `companyId` gesperrt.  
- Tests: `tests/tenant-isolation.mjs`, `tests/tenant-scope.mjs`.

## 4. Authentifizierung & Berechtigungen

| Rolle | Rechte |
|---|---|
| `admin` | Vollzugriff inkl. Admin-/Tax-Lifecycle |
| `accountant` | Operative Buchhaltung (Freigabe, Export nach Confirm) |
| `auditor` | **Read-only** – GET erlaubt; Schreib-POSTs gesperrt; GoBD-Export erlaubt |

Konfiguration Auditor: `WORKPASS_AUDITOR_EMAILS` (Komma-getrennt).  
Sessions: HMAC (`WORKPASS_SESSION_SECRET`), Plattform-SSO möglich.

## 5. Entstehung von Lohndaten

1. Plattform sendet Mitarbeiter/Stunden → `POST /v1/payroll/ingest` oder Batch / Auto-Pipeline.  
2. Engine berechnet (BMF PAP / SV-Regeln) → Status `calculated` oder `error`.  
3. Mensch gibt frei → `POST /v1/payroll/:jobId/release` mit `{ confirm: true }`.  
4. Delivery an Plattform (Idempotency-Key = stabile `deliveryId`, Send-once).

## 6. Unveränderlichkeit & Korrekturen (GoBD)

- **Freigegebene** Abrechnungen (`released`) dürfen **nicht still** überschrieben werden.  
- Material-Fingerprint (`payrollMaterialHash`) vergleicht Beträge/Stunden/Steuerklasse.  
- Identischer Re-Push (gleiche Beträge) ist idempotent und behält `released`.  
- Korrektur: `POST /v1/payroll/:jobId/correct` mit `{ confirm: true, reason }`  
  - archiviert Original in `document_revisions`  
  - schreibt neue Werte, Status wieder `calculated`  
  - erfordert **erneute Freigabe**  
  - Business-Audit: Original → Grund → Neu → Actor → Zeit

## 7. Audit Trail

### Security-Audit
Admin-Ereignisse, Login, Backup – Hash-Kette (`server/security/audit.mjs`).

### Business-Audit
Fachliche Ereignisse in SQLite `business_audit`:

- Tenant (`company_id`), Employee, Actor, Source (`user`/`api`/`job`/`platform`)  
- Op, Entity, Status (`PENDING`…`DEAD_LETTER` wo genutzt)  
- `event_id`, `correlation_id`, old/new (verschlüsselt), Hash-Kette  

API: `GET /v1/gobd/audit?companyId=…`

## 8. GoBD / Tax-Audit Export

`POST /v1/gobd/export` `{ confirm: true, companyId, from?, to?, include? }`

Erzeugt JSON-Paket unter `server/data/gobd-exports/` mit Manifest + SHA-256 je Datei:

- Stammdaten Firma  
- Payroll-Jobs (Summary + Full)  
- Rechnungen  
- Document Revisions  
- Business Audit (+ Verify)  
- Security-Audit-Tail (optional)

## 9. Plattform-Synchronisation

- Outbox + Delivery-Queue; Webhook mit `X-WorkPass-Idempotency-Key`.  
- Sync-Statusmaschine: `PENDING` → `RETRYING` → `PROCESSING` → `COMPLETED` | `FAILED` | `DEAD_LETTER`.  
- API: `GET /v1/gobd/sync?companyId=…`  
- Kein Endlos-Resend nach Reach; Dead-Letter erst nach max. Versuchen (env `WORKPASS_DELIVERY_MAX_PUSH_ATTEMPTS`).  
- Idempotency-Beispiel: `PAYROLL-2026-08-tenant-employee` (`buildIdempotencyKey`).

## 9b. E-Rechnung

- Foundation: `POST /v1/invoice/:id/xrechnung` erzeugt UBL 2.1 / XRechnung-orientiertes XML (Mensch bestätigt).  
- Kein automatischer Peppol-Versand; Checkliste `readyForHumanSend` im Response.  
- ZUGFeRD/PDF-A3 Embedding: Roadmap.

## 10. Fehlerbehandlung

- Validierungsfehler → Job `error`, Gap-Messages an Plattform.  
- SQLite-Korruption → Auto-Restore aus Backup (`backup.mjs`).  
- Immutable-Konflikt → HTTP 409 `immutable_document`.  
- Sync Dead-Letter → kein Auto-Push; Mensch kann Replay mit Confirm anstoßen.

## 11. Backup → Restore → Verification

Siehe `docs/BACKUP.md`. Periodische Backups, Integritätscheck, Restore nur mit Confirm + Phrase `RESTORE`, Tests in `tests/backup.mjs`.

## 12. Exporte für Prüfung / Steuerberater

| Export | Zweck |
|---|---|
| GoBD-Paket | Digitale Betriebsprüfung / Nachvollziehbarkeit |
| DATEV / LODAS | Übergabe an Kanzlei-Software |
| SEPA | Zahlungsdatei (nach Confirm) |
| ELSTER | LStB-XML aus Jahresbescheinigungen; Sidecar `WORKPASS_ELSTER_SUBMIT_URL` / ERiC. Ohne Kanal: `PENDING` lokal, nicht Finanzamt. Sidecar angenommen: `SENT`. Testmerker 700000004 bis `WORKPASS_ELSTER_TEST=0`. |
| LStB / VB | Pro Mitarbeiter aus **freigegebenen** Monaten: Jahres-Lohnsteuerbescheinigung und druckbare Verdienstbescheinigung |

## 13. E-Rechnung / ISO 27001

- E-Rechnung: XRechnung-UBL-Export vorhanden; ZUGFeRD/Peppol-Gateway und Leitweg-ID-Vollprüfung Roadmap.  
- ISO 27001: organisatorisch später; technisch Security-Audit/Pentest empfohlen vor Enterprise.

## 14. Verantwortlichkeiten

| Thema | Verantwortung |
|---|---|
| Fachliche Freigabe / Korrekturgrund | Mensch (Accountant) |
| Plattform-Stammdaten / Stunden | SUPPIX |
| Systembetrieb / Keys / Backup | Betreiber (Railway/Ops) |
| Steuerliche Würdigung | Steuerberater der Firma |

## 15. Änderungshistorie dieser Doku

- 2.51.4: ELSTER-Kanal (Sidecar/Mock): LStB-XML aus Jahresbescheinigungen, PENDING lokal vs SENT an Kanal, Portal-Status auf Deutsch; kein Fake-Finanzamt.  
- 2.51.3: Lohnarten-Tabelle A4-stabil (keine Dehnung auf großen Bildschirmen); leere Bezeichnung STD → Stundenlohn.  
- 2.51.2: Firmenlogo per GET von der Plattform; sonst klare Anfrage `company.logo.requested`.  
- 2.51.1: Portal-Bescheinigungen pro Mitarbeiter (LStB Jahresende, Verdienstbescheinigung druckbar).  
- 2.51.0: Steuer nur über BMF PAP; ELSTER mit Zertifikat; zwei Monate parallel.  
- 2.50.0: Sync-Lifecycle (DEAD_LETTER), Portal GoBD/Korrektur-UI, XRechnung-Export, tenant-scoped GoBD-Dateien.  
- 2.49.0: Erstfassung Verfahrensdokumentation + GoBD-Module (Revisionen, Business-Audit, Export, Auditor).
