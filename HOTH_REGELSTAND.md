# Hoth: freigegebene Karten und Regelstand

Stand V2.16.0, Regelversion 31. Alle **162 Hoth-Karten** sind für das zusätzliche Format **Premiere + A New Hope + Hoth** freigegeben. Je acht validierte Themendecks pro Seite machen alle Karten über die Deckauswahl erreichbar. Premiere und Premiere + A New Hope bleiben separat wählbar; historische Spielstände behalten ihren Regelsatz.

## Datenbasis

`data/hoth.json` enthält 81 Light-Side- und 81 Dark-Side-Karten aus der bereits verwendeten öffentlichen Revision `65cd150d20634447a5499d763ac324436158c7a8` von [swccgpc/swccg-card-json](https://github.com/swccgpc/swccg-card-json/tree/65cd150d20634447a5499d763ac324436158c7a8). Der Import reproduziert den Snapshot aus vier SHA-256-fixierten Quelldateien. Er verwendet keine privaten Drucktexte.

Aktiver Spieltext, verlinkter Druckscan, Errata und vorhandene historische Textfassung bleiben getrennt. 76 Karten haben einen Errata-Marker; bei zwei Karten stellt diese Revision zusätzlich eine verknüpfte Vor-Errata-Fassung bereit. Keine der Hoth-Karten wird als transkribierter und geprüfter Originaldruck ausgegeben.

Die Datenquelle führt bei **Artillery Remote (Light:135)** das Text-Erratum E1 vom 07.10.2023 samt Erläuterung und verknüpfter älterer Fassung 40034, aber keinen Korrekturslip. Diese exakte Ausnahme ist eng auf Edition, Karte, Datum, Notiz und historische Verknüpfung begrenzt. Die Ansicht nennt den fehlenden Slip ausdrücklich; sie erzeugt keine erfundene Bildadresse. Bei allen anderen Karten bleibt die bisherige strenge Slip-Prüfung erhalten.

## Regelquellen und Entscheidung

- [Hoth-Regelbeilage von 1996 (PDF)](https://res.starwarsccg.org/rules/hothrules.pdf): historischer Ursprung der zusätzlichen Mechaniken.
- [Advanced Rulebook 2023 (PDF)](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf): bereits vom Trainer verwendete Klarstellungen; insbesondere Marker Sites (Seite 85), Hoth Energy Shield (Seite 167), Main Power Generators (Seite 145) und Hoth-Anordnung (Seite 183).
- [Original-Kartenliste Hoth](https://res.starwarsccg.org/cardlists/HothType.html).

Die historische Beilage lässt den Schild bis zum äußersten Marker reichen und nimmt den äußersten Außen-Marker sowie die Wampa Cave aus. Der neuere Regelstand begrenzt ihn dagegen auf Echo-Base-Sites und die ersten drei Marker; er reicht niemals über Marker 3 hinaus. Für die weitere Implementierung gilt die spätere Klarstellung, passend zum bisherigen Projekt-Regelstand. Die ursprüngliche Formulierung wird nicht stillschweigend als aktuelle Regel übernommen.

Beim Ausspielen oder Starten mit Main Power Generators verlangt die neuere Klarstellung einen bereits vorhandenen Marker 4, 5 oder 6 oder das sofortige Ausspielen von North Ridge aus dem Reserve Deck. Ist das nicht möglich, darf der Generator nicht ausgespielt werden; beim Start muss ein anderer Startort gewählt werden. Die ältere Handkarten-Suchformulierung wird hierfür nicht ungeprüft übernommen.

## Implementierung und Prüfmatrix

| Bereich | Ausführbare Regeln und Prüfungen |
| --- | --- |
| Standorte und Start | Pflichtsuche nach North Ridge, gleichzeitige Startorte, Marker 1–7, Konvertierung, Anheben, eingestürzte Docking Bays und Wiederaufbau. |
| Energieschild | Echo Base und Marker 1–3 einschließlich zugehöriger Innenräume; Deploy, Luftbewegung, Shuttle, Transit und Relocation werden in den gemeinsamen Aktionswegen geprüft; Bodenbewegung bleibt erlaubt. |
| Missing und Wetter | Suchgruppen und Scouts, R-2 Sensor Array, Rogue 2, Ice Storm, Frostbite, Exposure, Schutz und vermisste Besatzung. Inaktive Karten belegen weiterhin Kapazität. |
| Fahrzeuge und Besatzung | AT-ATs, AT-ST, T-47, Tauntaun, Medium Transport; Piloten, Kanoniere, nicht kumulative Boni, Power, Armor, Maneuver und Attrition-Immunität. |
| Waffen und Devices | Alle Artillerien mit Energieversorgung, Warrior/Remote, Reichweite und Schussfenstern; Harpoon, Crash, Ionenschaden, Minen bei Deploy/Ankunft/Überquerung sowie Waffen- und Device-Nutzungslimits. |
| Creatures und Epic | Wampa-Habitat, Ferocity, zufällige Beute und gegnerische Wahl Fressen/Cave, Frozen Dinner und Disarming Creature; Target The Main Generator mit gewähltem Piloten, Reichweite, Generatorzerstörung und acht wählbaren Force-Verlusten. |
| Effects und Interrupts | Gedruckte Bedingungen, Kosten, Used/Lost-Modi, Gegenkarten und Antwortfenster; Utinni-Ziele, Rettungen, Rückgabe und kostenloser Folge-Deploy, Tauntaun Bones, Telemetry und verdeckte Prüfungen. Aktive Effects erscheinen anklickbar beim jeweiligen Spielerprotokoll. |
| Format und Bot | Je acht Decks mit 60 Karten und Strategie, Format-/Startortvalidierung, beide Spielseiten und Bot-Entscheidungen. Alle 162 Karten sind mindestens einmal enthalten. |

Die gemeinsamen Mechaniken werden in engine/hoth-rules.js und den Hoth-Sessionmodulen ausgeführt; engine/hoth-card-rules.js verknüpft jede der 162 Karten mit ihren Regeln ab Version 31. Die Freigabe hängt zusätzlich an der fixierten Katalogrevision und dem Hoth-Format.

### Automatisierte Prüfung

- tests/hoth-rules.test.mjs: reine Regeln für Schild, Generator, Marker, Wetter, Suche und Besatzungsboni.
- tests/hoth-session.test.mjs: tatsächliche Aktionsangebote und Auflösung, Ziele, Zahlungen, Gegenreaktionen, kontinuierliche Fähigkeiten und Kombinationen mit älteren Karten; zusätzlich vollständige Registerabdeckung.
- tests/hoth-data.test.mjs: alle 162 Datenzeilen, Formatgrenzen, Errata, Decklegalität und Kartenabdeckung.
- tests/hoth-autosave.test.mjs: sechs mehrstufige Abläufe mit frischer Instanz nach jeder Aktion. Suchgruppe, Reserve-Suche, private Handprüfung, Wampa, Minen-Transit und Harpoon-Antwort prüfen Zustand, Zufallsfolge, legale Optionen, beide Spielersichten, Szenarioimport und Erhalt aller 120 Karten.
- tests/hoth-matches.test.mjs: acht vollständige Hoth-Partien mit allen acht Deckpaaren, wechselnder menschlicher Spielseite und Bot-Entscheidungen; jede Aktion muss legal sein, alle 120 Karteninstanzen müssen erhalten bleiben und jede Partie muss enden.
- Beide Browserprüfungen prüfen den Quellstand und das gebaute Paket. Hoth wird beim bisherigen Spielstart nicht heruntergeladen; Auswahl, Hoth-Spielstart und Fortsetzen laden die Erweiterung bedarfsgerecht nach. Alle Anleitungen und öffentliche Datenschutzgrenzen werden geprüft.

### Bedingungen, die spätere Editionen benötigen

„You Will Go To The Dagobah System“ hat seine regelgerechte Aktion, findet in den drei freigegebenen Editionen jedoch keinen Dagobah-Zielort. Es wird kein erfundener Zielort angeboten. Hobbies spezieller Rogue-4-Bonus benötigt ebenfalls eine spätere Karte; seine übrigen Fähigkeiten funktionieren mit den aktuellen Karten. Auch namentlich genannte Gegenkarten späterer Editionen erzeugen erst bei einem passenden Ziel ein Angebot. Diese natürlichen Kartenbedingungen sind keine Freigabe weiterer Editionen.

Die Freigabe ist kein formaler Nachweis jeder denkbaren Kartenkombination. Gefundene Fehler werden weiterhin mit Regressionstests behoben. Die 308 privaten Premiere-Drucktexte bleiben ausschließlich auf dem Laptop.

## Prüfbefehle

```powershell
node scripts/import_premiere.mjs --edition hoth --check
node scripts/import_premiere.mjs --edition hoth --verify-source
node scripts/import_premiere.mjs --edition hoth --report
node --test
npm run test:browser
```

`--report` dokumentiert den Freigabestand; `--check` prüft alle 162 freigegebenen Karten und ihre Erreichbarkeit über die Decks. Die bestehenden 308 privaten Premiere-Drucktexte bleiben ausschließlich auf dem Laptop.

Die Browserprüfung des lokalen Quellstands deaktiviert den privaten Drucktext-Endpunkt ausdrücklich. Sie liest dadurch keine private Prüfdatei; der regulär gestartete lokale Trainer kann seine bisherige private Anzeige weiterhin nutzen.
