# Steuerberater-Review-Pack

Stand: Version siehe `package.json`. Keine steuerliche Beratung – zur Abstimmung mit Steuerberater / WP.

## Was WorkPass Lohn berechnet

| Bereich | Engine | Quelle |
|---|---|---|
| Lohnsteuer, SolZ, KiSt | BMF PAP | `vendor/pap-standalone.js`, PAP-Jahr aus Abrechnungsmonat |
| SV gesetzlich (KV/RV/PV/AV, Midi/Mini) | SGB IV Parameter | `legal-config.js` / Tax Rules |
| Minijob | nur bei `employmentType=mini` | nie automatisch aus niedrigem Brutto |
| Monatsvertrag (1 Monat) | `contractMonths=1` / `employmentType=one_month` | bleibt `regular`, kein Mini-Schluss |

## Was der Steuerberater prüfen sollte

1. Stichprobe PAP-Jahr vs. BMF-Veröffentlichung (aktuelles Kalenderjahr).
2. SV-Sätze (Zusatzbeitrag KK, PV-Zuschlag kinderlos) gegen Firmenstammdaten.
3. Kirchensteuer-Hebesatz (8/9) je Bundesland.
4. Freigegebene Abrechnungen: GoBD-Unveränderbarkeit + Korrekturpfad mit Grund.
5. ELSTER: LStB-XML gegen Jahressummen; Zertifikat/PIN-Prozess.
6. Portal: Lohnsteuerbescheinigung und Verdienstbescheinigung je Mitarbeiter aus freigegebenen Monaten (Druck).
7. DATEV/LODAS-Export vs. Blatt.

## API für die Prüfung

- `GET /v1/gobd/audit` – fachliches Prüfprotokoll
- `POST /v1/gobd/export` `{ confirm: true }` – GoBD-Paket
- `GET /v1/policy/human-final` – Policy-Version
- `POST /v1/portal/assistant/apply-engine-tax` – nur Engine, keine LLM-Beträge
- `GET /v1/portal/certificates/lstb` / `verdienst` – Jahres-LStB und VB pro Mitarbeiter

## Verfahrensdokumentation

Siehe `docs/VERFAHRENSDOKUMENTATION.md`.
