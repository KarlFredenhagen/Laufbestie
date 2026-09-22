# Laufbestie

Persönlicher Laufplan bis zu deinem Event. Gemini erstellt den Plan aus
deinen Daten, du trägst deine echten Läufe ein, einmal pro Woche passt
Gemini den Plan an das an, was du wirklich gelaufen bist.

Eine statische PWA, kein Server, kein Backend. HTML, CSS und Vanilla
JavaScript — läuft direkt über GitHub Pages.

## Einrichten

1. **API-Key holen** — https://aistudio.google.com/apikey
   Mit Google-Konto anmelden, "Create API key" klicken, Schlüssel kopieren.
   Kostenloses Kontingent, keine Kreditkarte nötig.
2. `index.html` öffnen (lokal oder über GitHub Pages) und beim ersten Start
   durchs Onboarding gehen — dort trägst du den Key ein.
   Er wird nur im `localStorage` dieses Browsers gespeichert.

## Lokal starten

    python -m http.server 8321

Dann http://localhost:8321 öffnen. (Direkt per Doppelklick geht auch, aber
ohne Service Worker und je nach Browser ohne Speicherung.)

## Aufs Handy bringen

Beliebiges kostenloses Static-Hosting, z.B.:

- **GitHub Pages** — Push auf `master` genügt, der Workflow unter
  `.github/workflows/deploy.yml` deployt automatisch. Unter Settings →
  Pages einmal "GitHub Actions" als Quelle auswählen.
- **Netlify Drop** — https://app.netlify.com/drop, Ordner reinziehen, fertig.
- **Vercel** — `vercel` im Ordner ausführen.

Danach im Handy-Browser öffnen und "Zum Startbildschirm hinzufügen". Dann
verhält es sich wie eine installierte App.

Wichtig: Der API-Key steckt im Browser des jeweiligen Geräts. Wer die Seite
öffnet, muss seinen eigenen Key eintragen — teile die Seite also ruhig,
aber nie deinen Schlüssel.

## Was drin ist

- **Onboarding**: persönliche Daten, Bestzeiten, aktuelles Pensum,
  Herzfrequenz, verfügbare Trainingstage, Ziel/Event, Gemini API Key
- **Trainingsplan**: Gemini erstellt einen vollständigen Plan bis zum
  Event — Easy Runs, Long Runs, Tempo, Intervalle, Marathon Pace, Race
  Simulation, Rest, mit progressiver Belastung, Entlastungswochen und
  Tapering
- **In den Kalender exportieren**: lädt eine `.ics`-Datei mit allen
  geplanten Läufen — öffnen oder in Apple/Google/Outlook-Kalender
  importieren, kein eigener Kalender-Account nötig
- **Läufe erfassen**: Datum, Distanz, Zeit, Ø Herzfrequenz (Pflicht),
  optional Max-HF, Höhenmeter, RPE, Notiz — Pace wird automatisch berechnet
- **Wochenanalyse**: einmal pro Woche vergleicht Gemini geplante mit
  tatsächlichen Läufen und schlägt bei Bedarf eine Anpassung der
  kommenden Wochen vor — wird erst nach deiner Bestätigung übernommen
- **Fortschritt**: Kilometer pro Woche (geplant vs. tatsächlich), Pace,
  Herzfrequenz, Long-Run-Distanz — als einfache, abhängigkeitsfreie
  Canvas-Charts
- **Offline-fähig** per Service Worker; ohne Netz läuft alles außer der
  Gemini-Anfrage

## Kosten

0 Euro. Einzige Grenze ist das kostenlose Kontingent der Gemini-API
(Anfragen pro Minute und pro Tag). Für normalen Alltagsgebrauch reicht
es deutlich.

## Datenschutz

Alle Trainingsdaten liegen im `localStorage` deines Browsers — nichts wird
an einen eigenen Server geschickt, es gibt keinen. Nur wenn du Gemini für
die Trainingsplanung oder Wochenanalyse nutzt, gehen die dafür nötigen
Daten an die Google-Gemini-API. Kein Tracking, keine Analytics.

Beim Löschen der Browserdaten ist alles weg — also ab und zu unter
"Mehr → Daten" exportieren.

## Daten exportieren / importieren

Unter "Mehr → Daten":

- **Exportieren** legt eine Datei `laufbestie-backup-YYYY-MM-DD.json` an.
- **Importieren** liest so eine Datei wieder ein — die Datei wird geprüft,
  du musst den Import bestätigen, erst danach werden deine aktuellen Daten
  überschrieben.
- **Alle Daten löschen** setzt die App komplett zurück, inklusive API Key.

## Haftungsausschluss

Der Trainingsplan ist eine Einschätzung eines KI-Modells, keine
sportmedizinische Beratung. Bei Schmerzen, Verletzungen oder ernsthaften
Beschwerden: professionelle medizinische Beratung einholen, nicht die App
fragen.
