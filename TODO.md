# Offene Funktionen für den Star Wars CCG Premiere Trainer

Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält den vorgesehenen Regelumfang fest.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

- [ ] Weitere individuelle Deploy-, Besatzungs- und React-Texte sowie Kontrollwechsel durch einzelne Karteneffekte umsetzen. Siehe Abschnitt 7.

## 5. Battle, Destiny und Schadensauflösung

- [ ] Weitere kartenspezifische Interrupt-Modi und Destiny- oder Immunitätseffekte ergänzen und prüfen. Siehe Abschnitte 6 und 7.

## 6. Premiere-Waffen vervollständigen

- [ ] Weitere Kombinationen zwischen Waffen und Kartentexten abdecken. Siehe Abschnitt 7.

## 7. Kartentexte für alle Kartentypen

Das [Kartenregelregister](engine/premiere-card-rules.js) verknüpft den aktiven Referenztext jeder Premiere-Karte mit ihrer Quelle. Erste registrierte Regeln betreffen freie Deploys, Ortswerte, Flottenboni, Ausrüstung, Presence Of The Force und Death Star Plans. Die Abdeckungsanzeige führt die übrigen Regeln weiter als offen oder teilweise umgesetzt.

- [ ] Pro Karten-ID einen Eintrag mit Regelquelle, gültigem Text, einzelnen Effekten, Ereignis, Kosten, Zielen, Dauer, Ablauf und Testreferenzen führen. Dieselbe Karte kann mehrere offene und bereits ausführbare Abschnitte haben.
- [ ] Die Abdeckungsanzeige aus den registrierten Effekten und ihren Tests ableiten. Eine Karte erst nach Prüfung aller ihrer spielrelevanten Abschnitte als vollständig markieren. War Rooms und andere im Code verstreute Regeln in das Register überführen.
- [ ] Charakterfähigkeiten für Einsatzbeschränkungen, Merkmale, Droiden, Spione, Nachtbedingungen, Pilotboni, Zielwahl, Forfeit und passende Kombinationen vervollständigen. Vader und Tarkin sowie weitere häufige Karten der Starterdecks gezielt testen.
- [ ] Location-Texte beider Seiten vollständig umsetzen. Force-Icons, generierte Force, Drain, Deploy, Presence, Power, Bewegung, Destiny, Kartentrigger und pauschale Einschränkungen durch den jeweiligen Ort verarbeiten.
- [ ] Devices mit Ausspielen, Trägern, Einsatzkosten, Nutzungsgrenzen, automatischen Effekten und Zielwechseln abbilden. Dazu gehören unter anderem Comlink, Caller, Restraining Bolt und Geräte, die Waffen oder Bewegung verändern.
- [ ] Effects mit Aufstellungsziel, Dauer, laufenden Modifikatoren, Triggern, Aufheben und Ablauf umsetzen. Utinni Effects brauchen verfolgte Ziele und Ortswechsel. Death Star Plans und Kessel Run als mehrstufige Fälle mit Rückgewinnung testen.
- [ ] Interrupts mit Used- und Lost-Verhalten, Auswahl zwischen gedruckten Optionen, Antwortfenstern, Zielbedingungen und Kosten implementieren. Sense und Alter einschließlich gegenseitiger Antworten als erste vollständige Aktionskette prüfen.
- [ ] Gemeinsame Karteneffekt-Operationen ergänzen. Suche und Offenlegen, gezielter Stapelwechsel, Mischen, Karten austauschen, Retrieval, Verlust, Out of Play, Schutz, Kontrollwechsel und Aufheben müssen als prüfbare Aktionen verfügbar sein.
- [ ] Weitere Kartensonderfälle mit eigenem Ablauf abdecken, etwa Ausrüstung aufheben, einen Weg sperren und geschützte Ziele behandeln.
- [ ] Die verbleibenden Karteneffekte pro Typ bearbeiten. Mit den Karten der beiden Starterdecks beginnen, dann die übrigen Karten und ihre Kombinationen vervollständigen. Für jede neue Kartenregel einen zulässigen und einen abgelehnten Fall prüfen.

## 8. Bot

- [ ] Eine verdeckte Spielersicht für den Bot erzwingen. Eigene Hand und öffentliche Informationen verwenden. Die vollständige gegnerische Hand oder die Reihenfolge verdeckter Stapel nur über erlaubte Kartenaktionen sehen.
- [ ] Force über den Zug einplanen. Deploy, Waffen, Battle, Movement, mögliche Antworten und Nachziehen gegeneinander abwägen. Bezahlbare Aktionen in der passenden Reihenfolge wählen.
- [ ] Starting Location und Ziele nach Kontrolle, eigener Presence, entstehender Force, Karten in der eigenen Hand und bestehenden Einheiten gewichten. Kartenfähigkeiten, Piloten, Fahrzeuge und Transportschritte in die Planung einbeziehen.
- [ ] Ziele und Kosten für Blaster, Schiffsbewaffnung, Interrupts und Reacts bewerten. Trefferchance aus zulässigen Informationen schätzen. Forfeit und andere Verluste anhand von Pflicht, offener Schuld und Wert der Karten auswählen.

## 9. Bedienung und Lernfunktionen

- [ ] Aktivierte Bedingungen direkt an der betroffenen Location auf der Playmat sichtbar machen.
- [ ] Am ausgewählten Objekt nur gültige Aktionen und Ziele anbieten. Kosten, Ursprung der Regel, ausstehende Auswahl und den Grund für eine gesperrte Aktion verständlich anzeigen.
- [ ] Vollständig prüfen, ob Stapel, verdeckte Karten, Inspektor und Protokoll dieselben Sichtbarkeitsregeln einhalten.
- [ ] Karteninspektor für alle 324 Karten vervollständigen. Originalbild, englischer Spieltext, deutsche Erklärung, Auslösezeitpunkt, Beispiel und Stand der Umsetzung anzeigen. Bei Bildfehlern Kartennamen und Spieltext lesbar halten.
- [ ] Eine geführte Partie mit fester Starthand und erklärten Entscheidungen bauen. Drei Übungen für Force und Deploy, Boden-Battle mit Waffen sowie Fahrzeug- und Raumbewegung bereitstellen.
- [ ] Hinweise und Undo auf den Lernmodus beschränken. Undo muss auf bereits aufgedeckte Informationen, abgeschlossene Zufallsziehungen und die Speicherung des Seeds Rücksicht nehmen.
- [ ] Neustart, Spielende und Auswertung mit nachvollziehbarem Aktionsprotokoll gestalten. Wiederholbare Szenarien über Deckliste, Seed und Aktionen starten können.

Für jeden fertigen Schritt den Entwicklungsbranch der vereinbarten Basis verwenden, den Arbeitsbaum vor einem Abruf oder Wechsel prüfen und Commit, Testergebnis sowie offene Fehler im Pull Request angeben.
