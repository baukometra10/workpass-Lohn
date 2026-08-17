# Security-Audit-Checkliste (Selbstprüfung)

Kein Ersatz für einen unabhängigen Pentest / ISO 27001. Vor Go-Live intern abhaken.

## Zugang

- [ ] `WORKPASS_STRICT=1` in Produktion
- [ ] `WORKPASS_API_KEY` ≥ 24 Zeichen, nicht der Dev-Default
- [ ] `WORKPASS_DATA_KEY` gesetzt (Payload-Verschlüsselung AES-256-GCM)
- [ ] Firmen-PIN / Session-Secret rotiert
- [ ] Auditor-Konten nur in `WORKPASS_AUDITOR_EMAILS` (read-only)

## Mandantentrennung

- [ ] Jede API mit `X-WorkPass-Company-Id` / Session-Firma
- [ ] Tests: `npm run test:tenant`, `npm run test:tenant-scope`
- [ ] GoBD-Export-Pfad enthält Firmen-ID

## ELSTER-Zertifikat

- [ ] PKCS#12 + PIN nur verschlüsselt in `elster_certs`
- [ ] PIN nicht in Logs / Audit-Detail
- [ ] `WORKPASS_ELSTER_SUBMIT_URL` / `WORKPASS_ELSTER_ERIC_CMD` nur intern
- [ ] Ohne Sidecar: Status `PENDING`, kein gefälschter Finanzamt-OK

## Daten & Backup

- [ ] Backup `.wpbak` verschlüsselt, Restore-Phrase getestet
- [ ] Freigegebene Lohnblätter unveränderlich (Korrektur mit Grund)
- [ ] Audit-Hashkette `GET /v1/gobd/audit`

## Automatik

- [ ] `WORKPASS_AUTO_PARALLEL_MONTHS` bewusst (Default: zwei Monate)
- [ ] Auto-Release nur für echte Plattformdaten (keine Demo-MA)

Extern bleiben: Pentest, Steuerberater-Freigabe, ERiC-Produktionszulassung.
