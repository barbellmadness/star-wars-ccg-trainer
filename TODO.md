# Offene Funktionen für den Star Wars CCG Premiere Trainer

Stand 16. November 2026, Entwicklungsstand `2ae7324` auf Basis von `automation/multi-deploy-growing-sites-20261116-0740`. Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält die Projektziele und den vorgesehenen Regelumfang fest.

V2 beherrscht bereits den Grundablauf mit Force, Deploy, Drain, Bewegung und Battle. Vier Blaster, der Bantha und acht Schiffe mit permanenten Piloten sind teilweise spielbar. Auf diesem Stand bestehen 91 lokale Tests. [Waffen-PR](https://github.com/barbellmadness/star-wars-ccg-trainer/pull/16) · [Fahrzeug- und Raumschiff-PR](https://github.com/barbellmadness/star-wars-ccg-trainer/pull/17)

## 1. Regelstand, Daten und Starterdecks

- [x] Premiere Limited von 1995 als Kartenbasis festgelegt. Angewandte Klarstellungen und die Trennung zwischen Druckfassung und aktivem Referenztext stehen im [Regelstand](PREMIERE-REGELSTAND.md).
- [x] Import an eine Quellrevision und SHA-256 gebunden. Edition, Seite, 162 Karten pro Seite, 324 eindeutige IDs und Decklisten werden vor dem atomaren Ersetzen geprüft. Der Importer erzeugt auf Anfrage einen Prüfbericht.
- [x] Kartentyp, Untertyp, Personas, Merkmale, Einzigartigkeit, Force-Icons, Innen- und Außenbereiche, Parsec, Pilot-, Warrior- und Nav-Computer-Icons sowie Spielwerte typisiert laden. Fehlende, unbekannte und gedruckte Sonderwerte unterscheiden.
- [x] Bei allen 139 Errata-Markierungen die Korrekturslips zuordnen und die Verwendung des aktiven Referenztexts dokumentieren. Printtext, Lore, Bildversion und deutsche Erklärung haben getrennte Felder. Die verknüpfte Vor-Errata-Fassung von Nevar Yalnal ist gesondert erfasst.
- [ ] Die Drucktexte anhand der 324 verlinkten Scans transkribieren und überprüfen. Der Wortlaut des Originaldrucks bleibt bis zur Prüfung ein eigenes offenes Feld.
- [x] Zwei feste, überprüfbare Premiere-Decklisten mit je 60 Karten und gültigen Starting Locations in [`data/premiere-starter-decks.json`](data/premiere-starter-decks.json) versionieren. V2 verwendet diese Listen für jede neue Lernpartie.
- [x] Decklisten bei Import, Start und Tests auf Kartenzahl, Seite, Edition, Stückzahlen und ausspielbare Kartentypen prüfen. Offene und teilweise umgesetzte Kartentexte erscheinen vor Spielbeginn.
- [x] Starting Locations verdeckt wählen und gleichzeitig aufdecken. Bei gleichem Ortsnamen erneut wählen und beiseitegelegte Karten vor dem Mischen zurücknehmen. Ohne verfügbare Auswahl startet die betroffene Seite ohne eigenen Startort. Acht Karten ziehen und Dark Side beginnen lassen.

## 2. Gemeinsame Spielengine und Aktionsreihenfolge

- [x] Der Zustand, Karteninstanzen und Zonenwechsel liegen in den Spielmodulen. V2 rendert über einen Rückruf, der Bot wählt angebotene Aktionen.
- [x] `legalActions(state, side)` deckt die sechs Phasen, Setup, Battle und Antwortfenster für den implementierten Kartenumfang ab. Die Ausführung prüft das Angebot mit aktuellem Zustand erneut.
- [x] Kosten, Ziele, Antworten und Auflösung über versionierte Aktionen verknüpfen. Tests decken Mehrfachklicks, veraltete Angebote, fehlende Ziele und unterbrochene Aktionen ab.
- [x] Priorität und Passen, optionale und verpflichtende Trigger sowie verschachtelte Antworten abbilden. Wolfman und Bantha können als React antworten. Sense und Alter sind für die entsprechenden Antworten im Stapel umgesetzt. Weitere Kartenfähigkeiten folgen in den Kartentyp-Abschnitten.
- [x] Zeitgrenzen für Phase, Turn, Battle und Partie zentral verwalten. Tests prüfen den Ablauf temporärer Effekte und die Reihenfolge gleichzeitiger Trigger.
- [x] Pro Seite öffentliche und verdeckte Informationen ableiten. Handkarten des Bots sind standardmäßig verdeckt, Life-Force-Stapel erscheinen mit Kartenzahl. Karten werden bei einer Regelaktion wie Destiny oder Force-Verlust sichtbar.
- [x] Ein Partie-Seed steuert die Startortwahl des Bots und beide Mischvorgänge. Ein Test spielt die protokollierten Aktionen erneut ab und vergleicht Zonenreihenfolge und Spielfeld.
- [x] Nach einem regulären Sieg weitere Regelaktionen sperren. Die Engine wertet Life Force nach vollständiger Verlustzahlung aus und erkennt gleichzeitige Erschöpfung.
- [ ] Für die gleichzeitige vollständige Erschöpfung beider Life Forces eine Premiere-Regelentscheidung zur Wertung belegen. V2 beendet und sperrt die Partie in diesem Fall mit einer eigenen Anzeige.

## 3. Locations, Presence und Force

- [x] Planetensysteme, Planetensites und mobile Sites des Premiere-Sets gruppieren. Sites regelgerecht einfügen und die Playmat in dieser Reihenfolge darstellen. Bereits ausgespielte Karten behalten ihren Standort.
- [x] Location-Deploy und Konvertieren gegnerischer Varianten. Der Platz auf der Playmat hält Einheiten und gültige Zieleffekte am Ort. Ältere Fassungen liegen unter der aktuellen Karte.
- [x] `at`, `present`, `aboard`, Presence, Occupy und Control als eigenständige Abfragen. Halbe Ability, Droiden, Undercover-Spione und eingeschlossene Einheiten sind geprüft. Aktionen zum Ein- und Aussteigen stehen in Abschnitt 4.
- [x] Force-Generierung aus effektiven Icons, persönlicher Force und Luke Skywalker. Tests unterscheiden unbekannte Icons und null und prüfen Aktivierung, Reserve-Grenze und Umlauf beider Used Piles.
- [x] Force Drains mit gedruckten Ortsboni, optionalen Lichtschwertboni, Modifikatoren, Undercover-Verbot und React-Fenstern. Assault-Interrupts ersetzen die Auflösung. Ein legaler Drain kann null betragen. Auch der Bot kann an mehreren Locations im selben Zug drainen.
- [x] Force Loss und Retrieval teilen Zonenregeln für Hand, Stapelspitze und ausgewählte Karten im Lost Pile. Zurückgeholte Karten gehen in die Used Pile. Die Lost-Funktion der benannten Rückhol-Interrupts nutzt das gemeinsame Aktionsangebot.
- [x] Ortsbedingungen für Nacht, Scomp Link, Docking Bay samt Kosten und Innen-/Außenbereiche abfragen. V2 verwendet unter anderem die gedruckten Deploy-Bedingungen für Jawas, Tusken Raider, Death Star Trooper, die Trash Compactor und die Rabatte an Lars’ Farm und Obi-Wans Hütte. Transit, weitere Kartentexte und Pile-Suche bleiben in den zugehörigen Abschnitten.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

- [x] Charakter-Deploy prüft Orts-, Persona-, Präsenz- und Einzigartigkeitsbedingungen, auch für Karten an Bord. Sonderkosten unterstützen unter anderem Motti und den Droiden-Aufpreis von 5D6-RA-7.
- [x] Karteninstanzen in Spielfeld, Träger, Besatzung und Anhänge gliedern. Trägerbewegung erhält die Verknüpfungen. Beim Verlust gehen Karten in den Lost Pile ihres Besitzers, Bantha-Passagiere steigen aus.
- [x] Pilot, Fahrer, Passagier, Astromech und Frachtraum belegen und wechseln. Kapazität und Piloten-Icons prüfen, offene und geschlossene Fahrzeuge für Presence und Present unterscheiden.
- [x] Sternjäger mit manuellem Piloten gemeinsam ausspielen. Sternjäger können unbemannt an Docking Bays und in passenden Hangars stehen. Power, Maneuver, Ability, Nav Computer und Hyperspeed aus aktiver Besatzung berechnen.
- [x] Ein- und Ausstieg, Fahrzeugtransport, einen Transfer beim Andocken und Shuttling mit Kapazität und Timing ausführen.
- [x] Lift Tubes beider Seiten auf mobilen Innen-Sites spielen. Landspeeder, Sandcrawler und Ubrikkian mit gedruckten Bewegungsgrenzen, Fahrer, freien Bewegungen und Reacts unterstützen.
- [x] Regulären Landspeed über die benachbarten Sites desselben Bereichs ausführen. Systeme zählen bei der Site-Nachbarschaft nicht mit.
- [x] Landspeed über mehrere Sites, freie Bewegung nach Kartentext und die Sonderwege zwischen Mos Eisley und Cantina sowie vom Level 4 Military Corridor ausführen.
- [x] Docking-Bay-Transit für einzelne Einheiten und alle gemeinsam berechtigten Einheiten ergänzen. Sternjäger landen und starten im verwandten System. TIEs nutzen Docking Bays.
- [x] Hyperspeed und Nav Computer beim Aktionsangebot aus Karte und Besatzung neu berechnen. Fehlender Hyperspeed, fehlender Pilot und ein deaktiviertes Schiff sperren die Bewegung.
- [x] Bewegungs- und Deploy-Reacts für Battle und Force Drain mit Kosten, Reichweite und Auswirkungen auf den Auslöser ausführen. CZ-3 eröffnet Deploy-Reacts, passende Fahrzeuge und Dantooine erlauben Bewegungs-Reacts.
- [ ] Freie Teilgruppen beim Docking-Bay-Transit und mehrere Transfers in einer Andockaktion anbieten. Weitere individuelle Deploy-, Besatzungs- und React-Texte sowie Kontrollwechsel durch einzelne Karteneffekte folgen mit den jeweiligen Kartenregeln.

## 5. Battle, Destiny und Schadensauflösung

- [ ] Battle-Initiierung gegen Occupy, Kartenbeschränkungen, beteiligte Einheiten, Force-Kosten und Limits pro Ort und Einheit prüfen. Reacts abwickeln, bevor das Waffen-Segment beginnt.
- [ ] Waffen-, Power- und Damage-Segment als eigenen Zustand modellieren. Ziele, Aktionen und Passmöglichkeiten pro Segment freigeben und Sonderfälle eines vorzeitig endenden Battles behandeln.
- [ ] Im Waffen-Segment auch zulässige Interrupts, Device- und Charakteraktionen anbieten. Die Grenze einer Waffe pro Träger, begründete Ausnahmen und die Trennung zwischen pro Battle und pro Zug abbilden.
- [ ] Eine gemeinsame Destiny-Aktion für Waffen, Battle, Power, Attrition und Karteneffekte einführen. Ziehen, Aufdecken, Antwortfenster, Neuziehen, Abbrechen, Ersetzen, Modifikatoren und Used Pile in Reihenfolge abwickeln.
- [ ] Gedruckte Destiny einschließlich Sonderzeichen und mehrerer tatsächlicher Draws verarbeiten. Abgebrochene oder unmögliche Draws, leerer Reserve-Stapel und die Untergrenze null bei Modifikatoren testen.
- [ ] Power-Destiny, Battle-Destiny, Attrition und Battle Damage getrennt berechnen. Bedingte Mindest-Ability, zusätzliche Draws, Limits, passagierbezogene Ability und Karten wie die War Rooms berücksichtigen.
- [ ] Kartentextbasierte Immunitäten vollständig abbilden. Grenzen, Bedingungen, übertragene Immunität und Verlust oder Änderung der Immunität während des Battles testen.
- [ ] Damage in der richtigen Reihenfolge auflösen. Pflicht-Forfeits getroffener Karten, veränderte Forfeit-Werte, verwendbare Attrition-Ziele, gleichzeitige Deckung von Attrition und Battle Damage und verbleibenden Force-Verlust prüfen.
- [ ] Forfeit- und Force-Loss-Entscheidungen beiden Seiten regelgerecht anbieten. In der Einzelspielerpartie trifft der Bot seine Auswahl selbst. Bei unvollständiger Zahlung bleiben die zulässigen nächsten Schritte und der Grund sichtbar.
- [ ] Manuelle Destiny- und Power-Regler nur in einer gekennzeichneten Lernübung zulassen. In der regulären Partie die Ergebnisse ausschließlich aus Aktionen und Kartentexten ableiten.

## 6. Premiere-Waffen vervollständigen

- [ ] Die vier vorhandenen Blaster auf alle einschlägigen Premiere-Fahrzeugziele erweitern. Verteidigung aus Ability, Armor oder Maneuver nach Zieltyp ermitteln. Prüfen, ob Träger und Ziel am Battle teilnehmen, zueinander `present` sind und die Waffe zwischen den beteiligten Bereichen eingesetzt werden darf.
- [ ] Han's Heavy Blaster Pistol und Leia's Sporting Blaster mit Namenszuordnung, alternativen Deploy-Kosten, Destiny-Modifikator und bedingtem Forfeit von null umsetzen.
- [ ] Jedi Lightsaber, Dark Jedi Lightsaber, Obi-Wan's Lightsaber und Vader's Lightsaber ergänzen. Gedruckte Trägerbedingungen, Deploy- und Einsatzkosten, zwei Destiny, Drain-Bonus und jeweilige Trefferfolge prüfen.
- [ ] Assault Rifle mit zulässiger Distanz und Regeln für Ziele außerhalb des eigenen Orts ergänzen. Light Repeating Blaster Rifle mit Generatorbedingung und wiederholtem Feuern umsetzen. Gaderffii Stick mit Timing und Waffenblockade abbilden.
- [ ] Die fünf Schiffsbewaffnungen umsetzen. Proton Torpedoes, Quad Laser Cannon, Boosted TIE Cannon, Ion Cannon und Turbolaser Battery erhalten eigene Träger, Ziele, Kosten, Destiny und Folgen. Ion Cannon muss auch Waffenverlust sowie geändertes Armor, Maneuver und Hyperspeed abwickeln.
- [ ] Die automatisierten Waffen implementieren. Vier Seeker mit Bewegung und Zielbedingungen, beide Timer Mines mit verzögertem Auslöser und der Laser Projector mit Aufstellung, Angriff und eigener Verwundbarkeit benötigen eigene Testfälle.
- [ ] Entwaffnung, Waffenverlust und andere Karteneffekte auf Anhänge in Deploy, Movement, Battle und außerhalb des Battles abbilden. Fehlversuche und Kosten bei fehlender Destiny regelgerecht protokollieren.

## 7. Kartentexte für alle Kartentypen

Die Zahlen geben die Anzeige von V2 auf `2ae7324` wieder. Die Anzeige erfasst einige bereits implementierte Fragmente wie die War-Room-Draws noch nicht. Jeder Kartentext wird deshalb in einzelne prüfbare Effekte zerlegt.

| Kartentyp | Gesamt | Teilweise | Offen laut Anzeige |
| --- | ---: | ---: | ---: |
| Character | 69 | 8 | 61 |
| Location | 37 | 3 | 34 |
| Vehicle | 8 | 1 | 7 |
| Starship | 16 | 8 | 8 |
| Weapon | 25 | 4 | 21 |
| Device | 17 | 0 | 17 |
| Effect | 54 | 0 | 54 |
| Interrupt | 98 | 0 | 98 |
| **Gesamt** | **324** | **24** | **300** |

- [ ] Pro Karten-ID einen Eintrag mit Regelquelle, gültigem Text, einzelnen Effekten, Ereignis, Kosten, Zielen, Dauer, Ablauf und Testreferenzen führen. Dieselbe Karte kann mehrere offene und bereits ausführbare Abschnitte haben.
- [ ] Die Abdeckungsanzeige aus den registrierten Effekten und ihren Tests ableiten. Eine Karte erst nach Prüfung aller ihrer spielrelevanten Abschnitte als vollständig markieren. War Rooms und andere im Code verstreute Regeln in das Register überführen.
- [ ] Charakterfähigkeiten für Einsatzbeschränkungen, Merkmale, Droiden, Spione, Nachtbedingungen, Pilotboni, Zielwahl, Forfeit und passende Kombinationen vervollständigen. Vader und Tarkin sowie weitere häufige Karten der Starterdecks gezielt testen.
- [ ] Location-Texte beider Seiten vollständig umsetzen. Force-Icons, generierte Force, Drain, Deploy, Presence, Power, Bewegung, Destiny, Kartentrigger und pauschale Einschränkungen durch den jeweiligen Ort verarbeiten.
- [ ] Devices mit Ausspielen, Trägern, Einsatzkosten, Nutzungsgrenzen, automatischen Effekten und Zielwechseln abbilden. Dazu gehören unter anderem Comlink, Caller, Restraining Bolt und Geräte, die Waffen oder Bewegung verändern.
- [ ] Effects mit Aufstellungsziel, Dauer, laufenden Modifikatoren, Triggern, Aufheben und Ablauf umsetzen. Utinni Effects brauchen verfolgte Ziele und Ortswechsel. Death Star Plans und Kessel Run als mehrstufige Fälle mit Rückgewinnung testen.
- [ ] Interrupts mit Used- und Lost-Verhalten, Auswahl zwischen gedruckten Optionen, Antwortfenstern, Zielbedingungen und Kosten implementieren. Sense und Alter einschließlich gegenseitiger Antworten als erste vollständige Aktionskette prüfen.
- [ ] Gemeinsame Karteneffekt-Operationen ergänzen. Suche und Offenlegen, gezielter Stapelwechsel, Mischen, Karten austauschen, Retrieval, Verlust, Out of Play, Schutz, Kontrollwechsel und Aufheben müssen als prüfbare Aktionen verfügbar sein.
- [ ] Kartensonderfälle mit eigenem Ablauf abdecken. Dazu zählen das Duell in The Circle Is Now Complete, das Aufheben einer Ausrüstung, das Sperren eines Wegs und die Behandlung vorübergehend geschützter Ziele.
- [ ] Die verbleibenden Karteneffekte pro Typ bearbeiten. Mit den Karten der beiden Starterdecks beginnen, dann die übrigen Karten und ihre Kombinationen vervollständigen. Für jede neue Kartenregel einen zulässigen und einen abgelehnten Fall prüfen.

## 8. Bot

- [ ] Eine verdeckte Spielersicht für den Bot erzwingen. Eigene Hand und öffentliche Informationen verwenden. Die vollständige gegnerische Hand oder die Reihenfolge verdeckter Stapel nur über erlaubte Kartenaktionen sehen.
- [ ] Jede Phase und jedes Antwortfenster über `legalActions` spielen. Die derzeitige Begrenzung auf einen Drain, eine Battle-Initiierung und einen regulären Move pro Bot-Zug aufheben. Nach jeder Auflösung den neuen Spielstand bewerten.
- [ ] Force über den Zug einplanen. Deploy, Waffen, Battle, Movement, mögliche Antworten und Nachziehen gegeneinander abwägen. Bezahlbare Aktionen in der passenden Reihenfolge wählen.
- [ ] Starting Location und Ziele nach Kontrolle, eigener Presence, entstehender Force, Karten in der eigenen Hand und bestehenden Einheiten gewichten. Kartenfähigkeiten, Piloten, Fahrzeuge und Transportschritte in die Planung einbeziehen.
- [ ] Ziele und Kosten für Blaster, Schiffsbewaffnung, Interrupts und Reacts bewerten. Trefferchance aus zulässigen Informationen schätzen. Forfeit und andere Verluste anhand von Pflicht, offener Schuld und Wert der Karten auswählen.
- [ ] Bot-Züge kurz erklären und dieselbe Partie mit festem Seed reproduzieren. Den Bot einzeln pro Aktion und zusammenhängend bis zum nächsten Spielerzug testen.
- [ ] Testpartien mit beiden Seiten und mehreren Seeds ausführen. Prüfen, ob Phasen, Antwortfenster und Spielende erreichbar bleiben und jeder Bot-Zug legal ist.

## 9. Bedienung und Lernfunktionen

- [ ] Sites und Systeme nach Spielregeln auf der Playmat darstellen. Karten an Bord, Anhänge, Treffer, aktivierte Bedingungen, Presence und Control am betroffenen Ort sichtbar machen.
- [ ] Am ausgewählten Objekt nur gültige Aktionen und Ziele anbieten. Kosten, Ursprung der Regel, ausstehende Auswahl und den Grund für eine gesperrte Aktion verständlich anzeigen.
- [ ] Stapel und verdeckte Karten regelgerecht darstellen. Optionale Offenlegung der Bot-Hand als ausdrückliche Lernoption mit eigener Anzeige führen. Inspektor und Protokoll nach derselben Sicht filtern.
- [ ] Karteninspektor für alle 324 Karten vervollständigen. Originalbild, englischer Spieltext, deutsche Erklärung, Auslösezeitpunkt, Beispiel und Stand der Umsetzung anzeigen. Bei Bildfehlern Kartennamen und Spieltext lesbar halten.
- [ ] Eine geführte Partie mit fester Starthand und erklärten Entscheidungen bauen. Drei Übungen für Force und Deploy, Boden-Battle mit Waffen sowie Fahrzeug- und Raumbewegung bereitstellen.
- [ ] Hinweise und Undo auf den Lernmodus beschränken. Undo muss auf bereits aufgedeckte Informationen, abgeschlossene Zufallsziehungen und die Speicherung des Seeds Rücksicht nehmen.
- [ ] Neustart, Spielende und Auswertung mit nachvollziehbarem Aktionsprotokoll gestalten. Wiederholbare Szenarien über Deckliste, Seed und Aktionen starten können.
- [ ] Desktop-Bedienung, schmale Fenster, Tastatursteuerung, Fokus, Beschriftungen und Kontraste im echten Browser prüfen.

## 10. Tests und lokale Abnahme

- [ ] Die 91 bestehenden Tests bei Änderungen erhalten oder bei nachgewiesener Regelkorrektur gezielt aktualisieren. `node --test` nach jeder Änderung lokal ausführen.
- [ ] Tests für Startkollisionen, Kartenverlust, Site-Reihenfolge, Angriffe beider Seiten, Antwortketten, Bewegung mit Insassen, Schiffsbewaffnung sowie ungewöhnliche Destiny und Force-Grenzfälle ergänzen.
- [ ] Zustandsinvarianten testen. Jede Karteninstanz belegt genau eine Zone oder einen Trägerplatz. Zahlungen, Verlust und Retrieval erhalten die Kartenbilanz. Verbotene Aktionen lassen den Zustand intakt.
- [ ] Für Starterdecks eine vollständige reproduzierbare Partie von der Starting Location bis zum Sieg abnehmen. Darin mindestens einen Boden-Battle, einen Raum-Battle und eine Antwortaktion auflösen.
- [ ] Browser-Tests für den lokalen Start mit `data/premiere.json`, Kartenwahl, korrekte Zielbuttons und Abschluss eines Bot-Zugs ergänzen. Tests bei fehlenden Kartenbildern und fehlerhaften Kartendaten ausführen.
- [ ] Die lokale Startanleitung und den Abdeckungsbericht mit dem ausführbaren Stand abgleichen. Die Kartendaten, Decklisten und Regelquellen zu einer reproduzierbaren Abnahme zusammenführen.

## Reihenfolge für die nächsten Entwicklungsbranches

1. **Starterdecks, Locations und Besatzung.** Zuerst feste Starterdecks, Karteninstanzen, Site-Reihenfolge und das Modell für Pilot, Fahrer und Passagier. Danach kann ein Schiff mit Pilot aus der Hand an ein System deployen und regelgerecht in einem Battle mitwirken.
2. **Antwortfenster und Kampf.** Einen durchgehenden Battle mit React, Waffen-Destiny, Battle-Destiny und Schaden abnehmen. Sense und Alter prüfen die Antwortkette für nachfolgende Karteneffekte.
3. **Karten der Lern-Decks.** Schiffsbewaffnung, übrige Waffen und die nötigen Effects, Devices und Interrupts ergänzen, bis beide versionierten Decks vollständig spielbar sind.
4. **Übriges Premiere-Set.** Alle restlichen Karteneffekte mit der gemeinsamen Engine umsetzen. Bot, Lernmissionen und Browser-Abnahme anhand der vollständigen Abdeckung abschließen.

Für jeden fertigen Schritt den Entwicklungsbranch der vereinbarten Basis verwenden, den Arbeitsbaum vor einem Abruf oder Wechsel prüfen und Commit, Testergebnis sowie offene Fehler im Pull Request angeben.
