# Offene Funktionen für den Star Wars CCG Premiere Trainer

Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält den vorgesehenen Regelumfang fest.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

- [ ] Weitere individuelle Deploy-, Besatzungs- und React-Texte sowie Kontrollwechsel durch einzelne Karteneffekte umsetzen. Siehe Abschnitt 7.

## 5. Battle, Destiny und Schadensauflösung

- [ ] Weitere kartenspezifische Interrupt-Modi und Destiny- oder Immunitätseffekte ergänzen und prüfen. Siehe Abschnitte 6 und 7.

## 6. Premiere-Waffen vervollständigen

- [ ] Weitere Kombinationen zwischen Waffen und Kartentexten abdecken. Siehe Abschnitt 7.

## 7. Kartentexte für alle Kartentypen

V2.15.14 führt alle 324 Premiere-Karten im [Kartenregelregister](engine/premiere-card-rules.js). Die Testsuite prüft die Abdeckung des Katalogs und spielt Regel- und Kombinationsfälle nach. Das Deck Imperiale Garnison enthält außerdem den Todesstern, Retract The Bridge und Death Star Tractor Beam aus A New Hope für die Interaktionen mit Central Core.

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
