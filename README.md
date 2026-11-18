# Star Wars CCG – Premiere Trainer

Browserbasierter Lerntrainer für Star Wars CCG. Dieses Repository ist unabhängig von allen anderen Projekten.

## Aktueller Stand
- `index.html`: eigenständig lauffähige **Übungs-Alpha** mit einfacher Bot-Logik.
- In V2.15.37 wählst du auf der Startseite Light Side oder Dark Side und anschließend dein Deck in zwei kompakten Bereichen: „Premiere: Decks“ und „A New Hope: Deckauswahl“. Beide Bereiche bieten acht Decks je Spielseite. Das gewählte Deck legt das Spielformat automatisch fest. **Premiere** ist voreingestellt und bietet Decks aus den 324 Premiere-Karten. **Premiere + A New Hope** ergänzt die freigegebenen Erweiterungskarten in „Korvette und Jäger“, „Tatooine-Verbündete“, „Imperiale Garnison“ und „Tusken-Überfall“ sowie sechs weitere Varianten für Trench, Sandcrawler, Hologame, Todesstern, Gefangene und Bluffs. Über „Strategie & Karten“ liest du Tipps zum Startort und zu Schlüsselzügen. Ein Klick auf eine Karte in der Deckliste öffnet ihren Inspektor. Der Bot wählt anhand des Partie-Seeds ein Themendeck aus demselben Format. Unter „Partieoptionen“ kannst du ihm ein Deck zuweisen. Spielseite, Spielformat und beide Decks werden beim Speichern und beim Szenarioexport festgehalten.
- Unter „Trainer-Optionen und Kartenprüfung“ zeigt der Kartenkatalog alle 162 Karten aus **A New Hope** mit Typ, Scan-Link und aktivem Spieltext. Alle 162 Karten sind für das Mischformat freigegeben. Dazu gehören Undercover, Gefangene und Traktorstrahlen, Squadrons, mobile Sites, Dianoga, Attack Run und Commence Primary Ignition. Die ANH-Auswahl umfasst acht Mischdecks je Seite. Neu sind „Rettungsteam 2187“, „Corellianische Eskorte“, „Bith-Ensemble“, „Imperiales Spionagenetz“, „Schwarze Eskorte“ und „Jawa-Schrottmarkt“. Der [ANH-Regelstand](A_NEW_HOPE_REGELSTAND.md) erläutert Quellen, Abweichungen zur Beilage von 1996 und die Prüfzuordnung. Der Umsetzungsstand steht in [Abschnitt 14 der TODO.md](TODO.md#14-a-new-hope-integrieren). [Offizielle Kartenliste](https://res.starwarsccg.org/cardlists/ANewHopeType.html)
- Wähle vor den Startorten den Bot-Spielstil „Defensiv“, „Ausgewogen“ oder „Offensiv“. „Ausgewogen“ ist voreingestellt. Das Bot-Protokoll gibt kurze Gründe für wichtige Entscheidungen an. Der gewählte Spielstil bleibt beim Fortsetzen und beim Szenarioexport erhalten.
- Klick auf eine Handkarte oder auf „Aktionen“ bei einer Karte auf dem Tisch. Die Playmat zeigt die möglichen Aktionen mit Force-Kosten und hebt ihre Zielorte hervor. Klick auf einen Zielort in der Liste, um ihn auf der Playmat zu finden. Antwortfenster zeigen die Priorität und deine verfügbaren Interrupts und Reacts. Die Anzeige erklärt beispielsweise fehlende Force oder eine bereits genutzte Bewegung.
- Über „Kampfvorschau“ siehst du vor der Zahlung die sichtbare Power, mögliche Destiny-Ziehungen, einsatzbereite Waffen und Attrition-Immunität beider Seiten. Erst „Kampf beginnen“ zahlt die angezeigten Force-Kosten. Im Kampf-Popup siehst du die Priorität, Destiny und Treffer sowie die Berechnung und Abwicklung der Verluste.
- [`data/premiere-starter-decks.json`](data/premiere-starter-decks.json) enthält die beiden festen Lern-Decks mit je 60 Karten und jeweils drei Starting Locations. Im Startbildschirm lassen sich Stückzahlen und Karteneffekte ansehen. Beide Seiten wählen verdeckt und decken gemeinsam auf. Bei gleichem Ortsnamen wählen beide erneut und die beiseitegelegten Karten kommen vor dem Mischen zurück ins jeweilige Deck. Wer keine Alternative mehr hat, startet ohne eigenen Startort. Beide Seiten ziehen je acht Karten. [Decipher-Glossar zu Starting Locations](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=124)
- Zusätzlich stehen pro Seite sieben Themendecks zur Auswahl. Zusammen decken die sechzehn Decks alle 324 Premiere-Karten ab. Neu sind „Jedi auf Tatooine“, „Droidenstützpunkt“, „Vaders Jagd“ und „Sturmtruppen-Offensive“, jeweils mit 60 Karten aus Premiere. Der „Massassi-Widerstand“ hat mehr günstige Rebellen. Die „Blockade von Kessel“ hat mehr Jäger und weniger doppelte Locations und Schiffswaffen. [Themendecks](data/premiere-themed-decks.json)
- Der Kartenkatalog bietet einen Inspektor für alle 324 Karten. Die erledigten Premiere-Aufgaben sind in der [TODO.md](TODO.md) dokumentiert.
- Die Playmat gruppiert Sites und Systeme. Wähle beim Ausspielen einer Location einen angebotenen Einfügeplatz. Regulärer Landspeed folgt den benachbarten Sites innerhalb derselben Gruppe. [Spielregeln zur Location-Anordnung, Anhang E](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=181)

Neue Partien verwenden Regelversion 30: Starfighter im Trench bleiben flugfähig und können Abwehrschüsse ausführen; Krayt Dragon Bones bietet auch eine einzelne gültige kostenlose Ausspielung an. Gespeicherte Partien behalten ihren bisherigen Regelsatz. Die [Autosave-Prüfmatrix](A_NEW_HOPE_REGELSTAND.md#autosave-und-szenarioprüfung) dokumentiert die zusätzlichen Speicher- und Importfälle.

## Lokal testen
Starte im Repository den lokalen V2-Server und öffne [V2 im Browser](http://127.0.0.1:8000/v2.html).

```powershell
node scripts/serve-v2-local.mjs
```

Die vollständige vorhandene Testsuite läuft in einem Terminal mit `node --test` (Node.js 22 oder neuer).

Alle 324 Premiere-Drucktexte wurden anhand der verlinkten Scans geprüft. 16 Transkriptionen stehen im Repository. Die übrigen 308 bleiben in der privaten Prüfdatei auf dem Laptop außerhalb des Repositorys.

Der lokale Server liest die Prüfdatei aus dem benachbarten Ordner `Star Wars CCG Premiere - Drucktexte lokal`. Bei einem anderen Speicherort gib den vollständigen Pfad zu `premiere-drucktexte-lokal.json` als Argument an. Das Karten-Popup zeigt die geprüften Drucktexte getrennt vom aktiven Spieltext. Ohne Prüfdatei verwendet V2 die 16 im Katalog hinterlegten Drucktexte.

Für die lokale Abnahme prüft `node scripts/import_premiere.mjs --check` den fixierten Kartensatz, alle Decks und die Abdeckung der 324 Karten in der Deckauswahl. `node --test` prüft mit vollständigen Partien alle Starter- und Themendecks, den Erhalt der Karteninstanzen sowie Boden- und Raumbattles. Die Suite spielt Seed 4 auch mit dem Regelstand und Bot älterer Spielstände durch. Für den Browser-Test mit installiertem Google Chrome führst du einmal `npm ci` und dann `npm run test:browser` aus. Mit `$env:SWCCG_CHROMIUM_CHANNEL = 'msedge'` kannst du Microsoft Edge verwenden.

In V2 zeigt „Kartenfähigkeiten: Vollständigkeitsprüfung“ den Umsetzungsstand der Karten.

## Geführte Übungen und Szenarien

Wähle unter „Partieoptionen“ einen Lernmodus und starte die Übung. Force und Deploy, Bodenkampf mit Blaster sowie Fahrzeug- und Raumbewegung verwenden feste Ausgangslagen und eine feste Light-Side-Starthand. In „Dark Side: Kontrolle und Kampf“ führst du einen Force Drain bei Jundland Wastes aus, spielst Vader und Tarkin bei Docking Bay 94 und hebst mit Tarkin eine gegnerische Battle Destiny auf. Unter der Spielübersicht steht das nächste Ziel. Rückgängig ist für geführte Übungen und die Battle-Lernübung verfügbar, wenn eine Aktivierung, ein Phasenwechsel oder eine Bewegung keine neuen Informationen aufgedeckt hat. Nach einem Blick auf die Bot-Hand ist ein weiterer sicherer Schritt nötig.

„Szenario neu starten“ setzt die Partie auf den Anfang mit denselben Decks und demselben Seed. Nach Spielende zeigt „Partie auswerten“ die öffentlichen Ereignisse in ihrer Reihenfolge. Aus dieser Ansicht kannst du ein Szenario als JSON speichern. „Szenario laden“ spielt dessen Aktionsfolge mit den gespeicherten Decks und dem Seed nach.

## Premiere Kartenbasis

Der [Regelstand](PREMIERE-REGELSTAND.md) dokumentiert die fixierte Kartenrevision, die behandelten Klarstellungen und die Herkunft der Errata. `node scripts/import_premiere.mjs --check` prüft Karten und Decks offline. `--report` gibt den Prüfbericht aus. `--verify-source` reproduziert den Snapshot aus den Originalquellen, um ihn mit der versionierten Datei zu vergleichen.

Für A New Hope prüft `node scripts/import_premiere.mjs --edition a-new-hope --verify-source` die Reproduzierbarkeit des separaten Katalogs. Mit `--report` anstelle von `--verify-source` erhältst du die Kartenliste für die ausstehende Regelprüfung.

## Entwicklung

Entwickle und teste lokal. Ausgangspunkt ist `automation/multi-deploy-growing-sites-20261116-0740` oder ein darauf aufbauender Entwicklungsbranch. Prüfe den aktiven Branch und den Arbeitsbaum mit `git status --short --branch --untracked-files=all` vor Arbeitsbeginn und erneut vor einem Abruf oder Branchwechsel.

Lege einen separaten Branch für jede Änderung an. Führe nach Codeänderungen `node --test` aus und halte Commit, Testergebnis und offene Fehler im Pull Request fest. Pushe den Entwicklungsbranch ohne Force und verwende Pull Requests für Änderungen an der Basis.

## Veröffentlichung

GitHub Actions aktualisiert die [öffentliche V2-Seite](https://barbellmadness.github.io/star-wars-ccg-trainer/v2.html) bei Pushes auf Entwicklungsbranches mit dem Präfix `codex/`. Lege neue Branches von einem Entwicklungsstand an, der den Veröffentlichungsworkflow bereits enthält.

Vor jeder Veröffentlichung prüft der Workflow die Premiere-Kartendaten und führt `node --test` aus. Für Pull Requests laufen dieselben Prüfungen. Das Deployment wird durch den erfolgreichen Push ausgelöst und folgt dem Stand des getesteten Commits.

V2 lädt Kartenbilder von den im Datensatz hinterlegten URLs. Für die öffentliche Auslieferung eigener Bilddateien steht die rechtliche Prüfung aus.
