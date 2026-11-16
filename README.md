# Star Wars CCG – Premiere Trainer

Browserbasierter Lerntrainer für Star Wars CCG. Dieses Repository ist unabhängig von allen anderen Projekten.

## Aktueller Stand
- `index.html`: eigenständig lauffähige **Übungs-Alpha** mit einfacher Bot-Logik.
- `v2.html` lädt den lokalen Premiere-Datensatz mit 324 Karten. Die Lernpartie unterstützt unter anderem Force-Verwaltung, Charaktere, ausgewählte Blaster, Banthas und Raumschiffe mit permanenten Piloten.
- [`data/premiere-starter-decks.json`](data/premiere-starter-decks.json) enthält die beiden festen Lern-Decks mit je 60 Karten und jeweils drei Starting Locations. Im Startbildschirm lassen sich Stückzahlen und Karteneffekte ansehen. Beide Seiten wählen verdeckt und decken gemeinsam auf. Bei gleichem Ortsnamen wählen beide erneut und die beiseitegelegten Karten kommen vor dem Mischen zurück ins jeweilige Deck. Wer keine Alternative mehr hat, startet ohne eigenen Startort. Beide Seiten ziehen je acht Karten. [Decipher-Glossar zu Starting Locations](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=124)
- Die Lernpartie deckt einen Teil der Premiere-Regeln und Kartentexte ab. Die Kartenprüfung in V2 zeigt die Abdeckung. Kartenbilder werden von den im Datensatz hinterlegten URLs geladen.
- Die Playmat gruppiert Sites und Systeme. Wähle beim Ausspielen einer Location einen angebotenen Einfügeplatz. Regulärer Landspeed folgt den benachbarten Sites innerhalb derselben Gruppe. [Spielregeln zur Location-Anordnung, Anhang E](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=181)

## Lokal testen
Starte im Repository den lokalen V2-Server und öffne [V2 im Browser](http://127.0.0.1:8000/v2.html).

```powershell
node scripts/serve-v2-local.mjs
```

Die vollständige vorhandene Testsuite läuft in einem Terminal mit `node --test` (Node.js 22 oder neuer).

Der Server liest die private Prüfdatei aus dem benachbarten Ordner `Star Wars CCG Premiere - Drucktexte lokal`. Bei einem anderen Speicherort gib den vollständigen Pfad zu `premiere-drucktexte-lokal.json` als Argument an. Die Datei bleibt außerhalb des Repositorys. Das Karten-Popup zeigt sichtgeprüfte Drucktexte getrennt vom aktiven Spieltext. Ohne Prüfdatei verwendet V2 die im Katalog vorhandenen Drucktexte.

Für die lokale Abnahme prüft `node scripts/import_premiere.mjs --check` den fixierten Kartensatz und beide Decks. `node --test` spielt die Seeds 3, 4 und 9 bis zum Spielende und prüft Boden- und Raumbattles sowie Antwortaktionen. Die Suite spielt Seed 4 auch mit dem Regelstand und Bot älterer Spielstände durch. Für den Browser-Test mit installiertem Google Chrome führst du einmal `npm ci` und dann `npm run test:browser` aus. Mit `$env:SWCCG_CHROMIUM_CHANNEL = 'msedge'` kannst du Microsoft Edge verwenden.

In V2 zeigt „Kartenfähigkeiten: Vollständigkeitsprüfung“ die aktuellen Abdeckungszahlen und die offenen Karten. Die herangezogenen Regelquellen stehen im [Regelstand](PREMIERE-REGELSTAND.md).

## Premiere Kartenbasis

Der [Regelstand](PREMIERE-REGELSTAND.md) dokumentiert die fixierte Kartenrevision, die behandelten Klarstellungen und die Herkunft der Errata. `node scripts/import_premiere.mjs --check` prüft Karten und Decks offline. `--report` gibt den Prüfbericht aus. `--verify-source` reproduziert den Snapshot aus den Originalquellen, um ihn mit der versionierten Datei zu vergleichen.

## Entwicklung

Entwickle und teste lokal. Ausgangspunkt ist `automation/multi-deploy-growing-sites-20261116-0740` oder ein darauf aufbauender Entwicklungsbranch. Prüfe den aktiven Branch und den Arbeitsbaum mit `git status --short --branch --untracked-files=all` vor Arbeitsbeginn und erneut vor einem Abruf oder Branchwechsel.

Lege einen separaten Branch für jede Änderung an. Führe nach Codeänderungen `node --test` aus und halte Commit, Testergebnis und offene Fehler im Pull Request fest. Pushe den Entwicklungsbranch ohne Force und verwende Pull Requests für Änderungen an der Basis.

## Nächste Arbeitsschritte
1. Drucktranskriptionen anhand der Kartenbilder prüfen und ergänzen.
2. Regelengine auf Grundlage des Premiere-Regelstands weiter ausbauen und testen.
3. Die Karteneffekte der beiden festen Starterdecks und die zugehörigen Bot-Entscheidungen vervollständigen.
4. Erst nach rechtlicher Prüfung Bilder öffentlich ausliefern.

## Veröffentlichung

GitHub Actions aktualisiert die [öffentliche V2-Seite](https://barbellmadness.github.io/star-wars-ccg-trainer/v2.html) bei Pushes auf Entwicklungsbranches mit dem Präfix `codex/`. Lege neue Branches von einem Entwicklungsstand an, der den Veröffentlichungsworkflow bereits enthält.

Vor jeder Veröffentlichung prüft der Workflow die Premiere-Kartendaten und führt `node --test` aus. Für Pull Requests laufen dieselben Prüfungen. Das Deployment wird durch den erfolgreichen Push ausgelöst und folgt dem Stand des getesteten Commits.
