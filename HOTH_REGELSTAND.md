# Hoth: Datenbasis und begonnene Regelimplementierung

Stand V2.15.40. Die Erweiterung ist **noch kein auswählbares Spielformat**. 162 Karten sind im Trainer-Katalog einsehbar, 0 Karten vollständig für Partien freigegeben. Premiere und Premiere + A New Hope bleiben die beiden spielbaren Formate.

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

## Bereits implementiert

- Typisierter, reproduzierbarer Hoth-Katalog einschließlich Creature und Epic Event, mit weiterhin geschlossener Deck-/Formatfreigabe.
- Hoth-Auswahl im V2-Kartenkatalog mit Suchfunktion, aktivem Text, Errata und ausdrücklichem Vorbereitungsstatus. Die vollständigen Hoth-Daten werden erst bei Auswahl geladen; der Start einer bisherigen Partie lädt sie nicht.
- Nummerische Marker-Anordnung in der gemeinsamen Standortlogik. Die Wampa Cave ist trotz Interior-Icon der siebte Marker und wird hinter die anderen Marker gelegt, statt bei den Echo-Base-Innenräumen zu erscheinen. Einfügepositionen richten sich nach der Nummer, nicht nach vorhandenen Speicherslots. Fehlende Marker lassen die tatsächlich benachbarten Sites weiterhin benachbart sein.
- Für später zulässige unnummerierte Hoth-Außenorte ist der vorgesehene Platz zwischen Marker 6 und 7 vorbereitet. Diese Sortierregel ist keine Ausspielgenehmigung für generische Sites.

Die Marker-Grundregel vervollständigt noch keinen individuellen Kartentext. Standortfähigkeiten, Schild, Spieleraktionen, Bot und Kartenfreigabe sind die nächsten Umsetzungsschritte.

## Noch umzusetzen

1. Generator-Ausspielung und Starting Locations mit Pflichtsuche, Rückabwicklung und Erhalt aller Karteninstanzen.
2. Schildstatus für Echo Base und Marker 1–3; Dark-Side-Deploy, Landen/Starten, Shuttle, Transit, Relocation und System-Power-Boni in sämtlichen Aktionswegen korrekt begrenzen. Zugehörige Fahrzeug-/Schiffsinnenräume einbeziehen.
3. Standorttexte, Konvertierung, Untergrund-Sites und Collapsing Corridor mit Zusatzkosten und Wiederaufbau.
4. Vermisste Charaktere, Suchgruppen und deren Aktionsbeschränkungen, Scouts sowie Wetter- und Suchkarten.
5. Kampffahrzeuge, Fahrer, Piloten, Kanoniere, AT-ATs, Snowspeeder und Creature Vehicles.
6. Artillerie, Energieversorgung, Reichweite, Fernsteuerung und Harpunen-/Absturzabläufe.
7. Wampa mit Habitat, Beute und den besonderen Verlust-/Missing-Folgen; vorhandene Creature-Abläufe wiederverwenden, soweit ihre Voraussetzungen übereinstimmen.
8. Target The Main Generator einschließlich erforderlicher Marker, Berechnung, Antwortfenster, Blown Away und Force-Verlust.
9. Übrige Charakter-, Interrupt-, Device-, Waffen- und Effect-Fähigkeiten mit klaren Kosten, Zielen und Antwortfenstern. Jede Karte erst nach nachgewiesener ausführbarer Regel freigeben.
10. Format Premiere + A New Hope + Hoth und validierte Themendecks für beide Seiten; bestehende Formate und historische Spielstände unverändert nutzbar halten.
11. Bot-Bewertung, deutsche Hilfen und Playmat-Markierungen; Mid-Action-Autosave, Replay, Szenarioimport und vollständige 120-Karten-Partien aller Formate prüfen.

## Prüfbefehle

```powershell
node scripts/import_premiere.mjs --edition hoth --check
node scripts/import_premiere.mjs --edition hoth --verify-source
node scripts/import_premiere.mjs --edition hoth --report
node --test
npm run test:browser
```

`--report` führt alle 162 noch nicht freigegebenen Karten mit ID, Name und Typ auf. Die bestehenden 308 privaten Premiere-Drucktexte bleiben ausschließlich auf dem Laptop.

Die Browserprüfung des lokalen Quellstands deaktiviert den privaten Drucktext-Endpunkt ausdrücklich. Sie liest dadurch keine private Prüfdatei; der regulär gestartete lokale Trainer kann seine bisherige private Anzeige weiterhin nutzen.
