# Offene Funktionen für den Star Wars CCG Premiere Trainer

Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält den vorgesehenen Regelumfang fest.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

- [ ] Weitere individuelle Deploy-, Besatzungs- und React-Texte sowie Kontrollwechsel durch einzelne Karteneffekte umsetzen. Siehe Abschnitt 7.

## 5. Battle, Destiny und Schadensauflösung

- [ ] Weitere kartenspezifische Interrupt-Modi und Destiny- oder Immunitätseffekte ergänzen und prüfen. Siehe Abschnitte 6 und 7.

## 6. Premiere-Waffen vervollständigen

- [ ] Weitere Kombinationen zwischen Waffen und Kartentexten abdecken. Siehe Abschnitt 7.

## 7. Kartentexte für alle Kartentypen

Das [Kartenregelregister](engine/premiere-card-rules.js) verknüpft den aktiven Referenztext jeder Premiere-Karte mit ihrer Quelle. Central Core ermöglicht den kostenlosen Deploy von Wrong Turn. Bei Kontrolle hebt die Light-Seite der Central Core den Tractor Beam auf, und der Detention Block Control Room befreit auf dem Todesstern inhaftierte Figuren. Für die Tonnika Sisters ist der einfache Mos-Eisley-Bonus gemäß aktueller Kombikarten-Regel geprüft.

V2.15.2 führt 131 der 324 Premiere-Karten als vollständig, 31 als teilweise umgesetzt und 162 als offen. Die letzten Prüfungen decken unter anderem Piloten, Droiden, Wachen, Fahrzeuge, Waffen, Minen sowie Tisch-Effects und Deploy-Sonderfälle ab. Die aktuelle Abdeckung steht im Kartenregelregister und in V2 unter „Karten-Effekt-Abdeckung“.

- [ ] Pro Karten-ID einen Eintrag mit Regelquelle, gültigem Text, einzelnen Effekten, Ereignis, Kosten, Zielen, Dauer, Ablauf und Testreferenzen führen. Dieselbe Karte kann mehrere offene und bereits ausführbare Abschnitte haben.
- [ ] Die Abdeckungsanzeige aus den registrierten Effekten und ihren Tests ableiten. Eine Karte erst nach Prüfung aller ihrer spielrelevanten Abschnitte als vollständig markieren. Die übrigen im Code verstreuten Regeln in das Register überführen.
- [ ] Charakterfähigkeiten für Einsatzbeschränkungen, Merkmale, Droiden, Spione, Nachtbedingungen, Pilotboni, Zielwahl, Forfeit und passende Kombinationen vervollständigen. Häufige Karten der Starterdecks gezielt testen.
- [ ] Retract The Bridge und Death Star Tractor Beam aus A New Hope vollständig umsetzen. Weitere Gefangennahmekarten und Carbonit-Gefangene bleiben Teil künftiger Erweiterungen.
- [ ] Weitere Devices mit Ausspielen, Trägern, Einsatzkosten, Nutzungsgrenzen, automatischen Effekten und Zielwechseln abbilden. Offene Kombinationen umfassen Deploy-React über Comlink und den Kontrollwechsel mit einem bereits vorhandenen einzigartigen Droiden.
- [ ] Weitere Effects mit Aufstellungsziel, Dauer, laufenden Modifikatoren, Triggern, Aufheben und Ablauf umsetzen. Die Ziel- und Ortsverfolgung von Death Star Plans, Kessel Run und Our Most Desperate Hour auf weitere Utinni Effects ausweiten.
- [ ] Weitere Interrupts mit Used- und Lost-Verhalten, Auswahl zwischen gedruckten Optionen, Antwortfenstern, Zielbedingungen und Kosten implementieren. Alter und Sense für neue Effect- und Interrupt-Aktionen anbinden.
- [ ] Weitere Varianten von Suche und Offenlegen, gezieltem Stapelwechsel, Kartentausch, Retrieval, Verlust, Out of Play, Schutz, Kontrollwechsel und Aufheben als prüfbare Aktionen abbilden.
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
