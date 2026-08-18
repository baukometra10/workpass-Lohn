# ELSTER-Sidecar auf Windows (ERiC)

WorkPass Lohn auf Railway **sendet nicht selbst ans Finanzamt**. Ein Windows-Rechner mit **ERiC** nimmt XML + PKCS#12 entgegen und spricht mit ELSTER.

Ohne diesen Rechner bleibt jeder Auftrag `PENDING` (lokal). `SENT` heißt nur: der Sidecar hat angenommen. Beim Amt gilt es erst bei `finanzamtReached: true`.

## 0. Rollen

| Wer | Aufgabe |
|---|---|
| Firma / Steuerberater | Organisationszertifikat (PKCS#12 + PIN), Testsendung prüfen |
| Betrieb (dieser Rechner) | ERiC installieren, Sidecar betreiben, intern erreichbar machen |
| WorkPass (Railway) | `WORKPASS_ELSTER_SUBMIT_URL` auf den Sidecar zeigen |

## 1. Rechner

- [ ] Eigenes Windows 10/11 oder Windows Server (nicht der Firmen-Alltags-PC)
- [ ] Fest verdrahtet oder stabiles Netz, **kein** öffentliches WLAN
- [ ] Nur intern erreichbar (VPN / Firewall). Nicht ins Internet öffnen
- [ ] Datenträger verschlüsselt (BitLocker)
- [ ] Automatische Windows-Updates, aber ERiC-Update extra prüfen
- [ ] Kein ERiC auf Railway / Linux-Container (offizieller Client ist Windows)

## 2. ERiC beschaffen

- [ ] Beim **ELSTER-Hersteller-/Entwicklerzugang** ERiC (ELSTER Rich Client) beantragen — als Software, die Lohnsteuer übermittelt (LStA / LStB)
- [ ] Hersteller-ID / Verfahrenszulassung klären (Steuerberater / ELSTER-Support)
- [ ] Aktuelles ERiC-Paket installieren (Version zum Kalenderjahr)
- [ ] Testdatenannahme zuerst, **nicht** Produktivschnittstelle

WorkPass-XML ist ein **eigenes Envelope** (`DatenArt` `LStA` oder `LStB`). Der Sidecar muss es in das **offizielle ERiC-Schema** übersetzen. Roh ins Amt schieben geht nicht.

## 3. Zertifikat

- [ ] Organisationszertifikat `.p12` / `.pfx` von ElsterOnline
- [ ] PIN nur der Mensch / Passworttresor — nicht in Git, nicht in Logs
- [ ] In WorkPass: Portal → Exporte → Zertifikat speichern (Bestätigung)
- [ ] Dasselbe Zertifikat nutzt ERiC auf diesem Rechner (WorkPass schickt p12+PIN an den Sidecar)

## 4. Sidecar-Vertrag (HTTP)

WorkPass ruft `POST WORKPASS_ELSTER_SUBMIT_URL` auf:

```json
{
  "kind": "workpass.elster.submit.v1",
  "datenArt": "LStA",
  "submissionId": "lsta:firma:2026-08:ab12cd34",
  "xml": "<?xml ... Elster ...>",
  "p12": "<base64 PKCS#12>",
  "pin": "<PIN>"
}
```

`datenArt` ist `LStA` (Monat, Firma) oder `LStB` (Jahr, Mitarbeiter).

Antwort, die WorkPass versteht:

```json
{
  "ok": true,
  "id": "eric-transfer-id",
  "accepted": true,
  "finanzamtReached": false,
  "hint": "ERiC Testmerker, nicht Produktiv"
}
```

- [ ] Header `X-WorkPass-Elster-Key` prüfen (gleicher Wert wie `WORKPASS_ELSTER_SUBMIT_KEY`)
- [ ] `ok: false` bei Fehler + kurzer `error`-Text (kein PIN im Text)
- [ ] `accepted: true` nur wenn ERiC den Auftrag angenommen hat
- [ ] `finanzamtReached: true` **nur** wenn ERiC die Annahme durch das Finanzamt bestätigt — niemals raten
- [ ] p12/PIN nach dem Aufruf nicht speichern, nicht loggen

Lokal zum Üben ohne Amt: `npm run mock:elster` (Port 8791). Der Mock ist **nicht** ERiC.

## 5. Railway / WorkPass verbinden

Auf dem Windows-Rechner z. B. `https://elster-intern.firma.local/v1/elster/submit` (nur VPN).

In Railway:

- [ ] `WORKPASS_ELSTER_SUBMIT_URL` = diese interne URL (über VPN/Tunnel, nicht öffentlich)
- [ ] `WORKPASS_ELSTER_SUBMIT_KEY` = langer Zufallsschlüssel, nur Sidecar + Railway
- [ ] `WORKPASS_ELSTER_TEST=1` lassen (Testmerker `700000004`)
- [ ] `WORKPASS_ELSTER_AUTO_SUBMIT` erst an, wenn Tests stimmen (Auto = **LStA** nach Monatsabschluss)

Alternative ohne HTTP: `WORKPASS_ELSTER_ERIC_CMD` = Pfad zu einem Wrapper, der XML auf stdin bekommt. Dann weiter `finanzamtReached: false`, solange der Wrapper das nicht extra liefert.

## 6. Testlauf (noch nicht Produktiv)

- [ ] Monat freigeben, Portal zeigt LStA-Summen (LSt, SolZ, KiSt)
- [ ] **LStA senden** mit Bestätigung → Status `SENT` oder `PENDING`, **kein** „beim Amt“
- [ ] Auf dem Windows-Rechner: ERiC-Protokoll, Transfer-ID
- [ ] Testdatenannahme ELSTER: Rückmeldung gelesen
- [ ] Steuerberater: Summen gegen Lohnkonto

Jahres-LStB: extra Button **LStB (Jahr) senden** (nicht mit LStA verwechseln).

## 7. Produktiv — erst nach Test

- [ ] ERiC-Produktivzulassung / Verfahren freigegeben
- [ ] `WORKPASS_ELSTER_TEST=0` (kein Testmerker)
- [ ] Erste Live-LStA mit Steuerberater
- [ ] Rückmeldung Finanzamt archivieren (GoBD)

Wenn unsicher: `WORKPASS_ELSTER_TEST` auf `1` lassen und weiter über elster.de senden.

## 8. Betrieb

- [ ] Sidecar-Dienst startet automatisch nach Reboot
- [ ] Zertifikat-Ablaufdatum im Kalender (ElsterOnline)
- [ ] ERiC nach Jahreswechsel aktualisieren
- [ ] Firewall: nur WorkPass (Railway-Egress / VPN) darf POST
- [ ] Backup des Rechners ohne PIN im Klartext

## Kurz

1. Windows-Rechner intern  
2. ERiC installieren + XML mappen  
3. PKCS#12 in WorkPass  
4. URL + Key in Railway, **Test=1**  
5. Testdatenannahme  
6. Erst dann `WORKPASS_ELSTER_TEST=0`
