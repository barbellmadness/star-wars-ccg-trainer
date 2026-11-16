# Offene Funktionen für den Star Wars CCG Premiere Trainer

Stand 16. November 2026, Entwicklungsstand `2ae7324` auf Basis von `automation/multi-deploy-growing-sites-20261116-0740`. Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält die Projektziele und den vorgesehenen Regelumfang fest.

V2 beherrscht bereits den Grundablauf mit Force, Deploy, Drain, Bewegung und Battle. Vier Blaster, der Bantha und acht Schiffe mit permanenten Piloten sind teilweise spielbar. Auf diesem Stand bestehen 91 lokale Tests. [Waffen-PR](https://github.com/barbellmadness/star-wars-ccg-trainer/pull/16) · [Fahrzeug- und Raumschiff-PR](https://github.com/barbellmadness/star-wars-ccg-trainer/pull/17)

## 1. Regelstand, Daten und Starterdecks

- [ ] Die Premiere Limited von 1995 als Kartenbasis dokumentieren. Für jede später veröffentlichte Klarstellung und jede verwendete Errata festhalten, ob und warum sie in diesem Trainer gilt. Printtext und aktiven Regeltext getrennt erfassen. [Regelwerke des Players Committee](https://www.starwarsccg.org/rules/) · [Offizielle Premiere-Kartenliste](https://res.starwarsccg.org/cardlists/PremiereType.html)
- [ ] Den lokalen Import an eine nachvollziehbare Quellrevision binden und einen Prüfbericht erzeugen. 162 Karten pro Seite, 324 eindeutige IDs, Edition und Kartenseite prüfen. Den versionierten Snapshot erst nach erfolgreicher Validierung ersetzen.
- [ ] Kartentyp, Untertyp, Persona, Merkmale, Einzigartigkeit, Force-Icons, Innen- und Außenbereiche, Parsec, Pilot-, Warrior- und Nav-Computer-Icons sowie alle spielrelevanten Werte typisiert laden. Fehlende, unbekannte und gedruckte Sonderwerte unterscheiden.
- [ ] Die 139 im Snapshot als Errata markierten Einträge gegen den gewählten Regelstand prüfen. Originaltext, Lore, Bildversion und deutsche Erklärung als eigene Felder führen.
- [ ] Zwei feste, überprüfbare Premiere-Decklisten mit je 60 Karten und gültigen Starting Locations versionieren. Die aktuellen automatisch zusammengestellten Lern-Decks durch überprüfte Listen ersetzen.
- [ ] Decklisten auf Kartenzahl, Seite, Edition, regelrelevante Kopien und verfügbare Mechaniken prüfen. Für Lern-Decks mit noch offenen Effekten die betroffenen Karten vor Spielbeginn anzeigen.
- [ ] Starting Locations nach dem festgelegten Regelstand wählen und gleichzeitig aufdecken. Kollisionen, fehlende gültige Location und erneute Auswahl ohne Kartenverlust testen. Erst danach mischen, acht Karten ziehen und den Startspieler setzen.

## 2. Gemeinsame Spielengine und Aktionsreihenfolge

- [ ] Den Spielzustand aus `v2.html` in testbare Module extrahieren. Karteninstanzen eindeutig identifizieren und Zonenwechsel von Rendering, Lernhinweisen und Bot-Auswahl entkoppeln.
- [ ] `legalActions(state, side)` für alle sechs Phasen, Setup, Battle und Antwortfenster einführen. UI und Bot wählen aus demselben Angebot. Bei der Ausführung Ziele, Seite, Phase und Kosten erneut prüfen.
- [ ] Eine Aktion mit ihren Kosten, Zielwahlen, Antworten und der Auflösung als zusammenhängenden Zustandsübergang modellieren. Mehrfachklicks, veraltete Auswahl, fehlende Ziele und unterbrochene Aktionen testen.
- [ ] Aktionspriorität, Passen, optionale und verpflichtende Trigger sowie Antwortfenster abbilden. Das umfasst Aktionen im gegnerischen Zug, Reacts, Unterbrechen, Aufheben und die Reihenfolge bei mehreren gleichzeitigen Effekten.
- [ ] Zeitgrenzen wie einmal pro Zug, Battle oder Partie sowie Beginn und Ende einer Phase zentral verwalten. Ablauf und Rücksetzung temporärer Effekte testen.
- [ ] Pro Seite öffentliche und verdeckte Informationen aus dem Zustand ableiten. Kartenreihenfolge in Reserve Deck, Force Pile und Used Pile schützen und nur bei erlaubter Aktion aufdecken oder durchsuchen.
- [ ] Zufall und Mischen über einen Seed steuerbar machen. Gleiche Decklisten, Seed und Aktionen müssen denselben Partieverlauf ergeben.
- [ ] Nach Spielende weitere Regelaktionen sperren. Sieg, mögliche Gleichzeitigkeit von Verlusten sowie den Zeitpunkt der Life-Force-Prüfung am Ende mehrstufiger Aktionen nach Regelquelle absichern.

## 3. Locations, Presence und Force

- [ ] Beziehungen zwischen Planetensystemen, Planetensites und mobilen Sites mit stabilen IDs modellieren. Sites regelgerecht anordnen und neue Sites zwischen bestehende einfügen. Die Playmat aus diesen Beziehungen aufbauen.
- [ ] Location-Deploy und Konvertieren gegnerischer Varianten desselben Orts umsetzen. Die neue Kartenseite, bleibende Karten am Ort, beteiligte Effekte und den Referenzzustand prüfen.
- [ ] `at`, `present`, `aboard`, Presence, Occupy und Control als eigenständige Regelabfragen abbilden. Halbe Ability, Droiden, Spione, Passagiere und eingeschlossene Einheiten in den jeweils zutreffenden Abfragen berücksichtigen.
- [ ] Force-Generierung um Location- und Kartentextmodifikatoren ergänzen. Unbekannte Icon-Werte und Nullwerte unterscheiden. Optionale Aktivierung, Reserve-Grenze und Umlauf beider Used Piles am Zugende mit vollständigem Stapelverlauf prüfen.
- [ ] Force Drains mit Bonus, Malus, Verbot, Ersatz und React-Fenster umsetzen. Überprüfen, wann ein Drain mit Wert null angesagt werden darf. Mehrere unterschiedliche kontrollierte Locations pro Zug unterstützen.
- [ ] Force Loss und Retrieval als gemeinsame Aktionen modellieren. Zahlung aus Hand oder erlaubter Stapelspitze, Rückgewinnung aus Lost Pile, Umgang mit leerem Stapel und den Zielstapel für jede Karte prüfen.
- [ ] Ortsbezogene Bedingungen wie Nacht, Scomp Link, Docking Bay, Innen- und Außenbereich sowie die gedruckten Standort- und Seitenbeschränkungen aus den Karten ableiten.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

- [ ] Charakter-Deploy mit individuellen Orts-, Typ-, Persona- und Präsenzbedingungen vervollständigen. Eigene und gegnerische Merkmale, Kostenänderungen sowie Einzigartigkeit und Mehrfachpunkte gegen die Premiere-Karten prüfen.
- [ ] Charakter-, Fahrzeug- und Schiffsinstanzen mit eindeutigem Platz für Träger, Anhänge und Insassen modellieren. Besitzer, aktuelle Kontrolle und Standort nach Bewegung, Verlust oder Karteneffekt korrekt nachführen.
- [ ] Pilot, Fahrer, Passagier, Astromech und Frachtraum belegen und wechseln. Kapazitäten, Piloten-Icons, bedingte Pilotboni und den Unterschied zwischen offenem und geschlossenem Fahrzeug anwenden.
- [ ] Manuelle Piloten beim Deploy eines Schiffs mit ausspielen. Für passende Sternjäger den unbemannten Zustand an erlaubten Orten unterstützen. Power, Maneuver, Ability, Nav Computer und Hyperspeed aus aktiver Besatzung und Kartentext berechnen.
- [ ] Einstiege, Ausstiege, Fahrzeugtransport, Andocken, Transfers und Shuttling mit Kosten, Kapazität und Timing abbilden. Anhänge und Insassen beim Verlust des Trägers nach den Regeln behandeln, einschließlich der Bantha-Ausnahme für Passagiere.
- [ ] Lift Tubes beider Seiten mit den passenden mobilen Innen-Sites und Sonderregeln umsetzen. Landspeeder, Sandcrawler und Ubrikkian 9000 Z001 mit ihren gedruckten Einschränkungen, Fahrern und Bonus- oder React-Bedingungen ergänzen.
- [ ] Landspeed über echte Site-Nachbarschaft statt Playmat-Spalten ausführen. Reichweite, durchquerte Sites, verbotene Übergänge, gedruckte Mehrkosten und einmalige reguläre Bewegung testen.
- [ ] Docking-Bay-Transit ergänzen. Landen und Starten von Sternjägern mit verwandten Systemen, passenden Außen-Sites, TIE-Beschränkungen und Docking-Bay-Kosten implementieren.
- [ ] Hyperspeed um Kartentextänderungen, Nav Computer an Bord und fehlenden Hyperdrive ergänzen. Reichweite und Bewegungsberechtigung nach Besatzungs- oder Waffeneffekten neu bewerten.
- [ ] Reacts als Deploy oder Bewegung im Antwortfenster zu Battle und Force Drain implementieren. Alternative Kosten, Reichweite und Auswirkungen auf den laufenden Auslöser prüfen.

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
