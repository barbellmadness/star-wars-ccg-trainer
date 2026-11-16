# Star Wars CCG – Premiere Trainer

Browserbasierter Lerntrainer für Star Wars CCG. Dieses Repository ist unabhängig von allen anderen Projekten.

## Aktueller Stand
- `index.html`: eigenständig lauffähige **Übungs-Alpha** mit einfacher Bot-Logik.
- `v2.html` lädt den lokalen Premiere-Datensatz mit 324 Karten. Die Lernpartie unterstützt unter anderem Force-Verwaltung, Charaktere, ausgewählte Blaster, Banthas und Raumschiffe mit permanenten Piloten.
- Die Lernpartie deckt einen Teil der Premiere-Regeln und Kartentexte ab. Die Kartenprüfung in V2 zeigt die Abdeckung. Kartenbilder werden von den im Datensatz hinterlegten URLs geladen.

## Lokal testen
Starte im Repository einen lokalen HTTP-Server und öffne [V2 im Browser](http://127.0.0.1:8000/v2.html).

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Die vollständige vorhandene Testsuite läuft in einem Terminal mit `node --test` (Node.js 22 oder neuer).

## Entwicklung

Entwickle und teste lokal. Ausgangspunkt ist `automation/multi-deploy-growing-sites-20261116-0740` oder ein darauf aufbauender Entwicklungsbranch. Prüfe den aktiven Branch und den Arbeitsbaum mit `git status --short --branch --untracked-files=all` vor Arbeitsbeginn und erneut vor einem Abruf oder Branchwechsel.

Lege einen separaten Branch für jede Änderung an. Führe nach Codeänderungen `node --test` aus und halte Commit, Testergebnis und offene Fehler im Pull Request fest. Pushe den Entwicklungsbranch ohne Force und verwende Pull Requests für Änderungen an der Basis.

## Nächste Arbeitsschritte
1. Verifizierten Premiere-Datensatz aus autorisierter Quelle importieren und auf 162 Karten pro Seite prüfen.
2. Originalwerte und Texte ohne erfundene Fallbacks anzeigen.
3. Regelengine auf Grundlage des Premiere-Regelbuchs aufbauen und testen.
4. Zwei regelkonforme 60-Karten-Decks und Bot implementieren.
5. Erst nach rechtlicher Prüfung Bilder öffentlich ausliefern.

## Veröffentlichung
GitHub Pages ist bei einem privaten Repository nicht in jedem GitHub-Tarif verfügbar. Wenn Pages in Settings > Pages nicht verfügbar ist, kann ein separater Hosting-Dienst verwendet werden. Eine Live-Webadresse ist aktuell noch nicht eingerichtet.
