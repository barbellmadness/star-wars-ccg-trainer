# Offene Funktionen für den Star Wars CCG Premiere Trainer

Ziel ist eine vollständige lokale Einzelspielerpartie mit Light Side gegen den Dark-Side-Bot, dem Premiere-Set und deutscher Lernführung. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält den vorgesehenen Regelumfang fest.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

In V2.15.15 abgeschlossen. Die Tests decken Deploy, Besatzung, Reacts, Bewegung und das erneute Ausspielen gestohlener Karten durch ihren neuen Besitzer ab.

## 5. Battle, Destiny und Schadensauflösung

In V2.15.15 abgeschlossen. Die Tests decken Antwortfenster, Destiny, Immunität und Schadensauflösung ab. Bei vorzeitigem Kampfende gehen bereits getroffene Karten verloren.

## 6. Premiere-Waffen vervollständigen

In V2.15.15 abgeschlossen. Die Tests prüfen die 25 Premiere-Waffen und Kombinationen mit Karteneffekten, darunter umgelenkte Treffer, Forfeit-Ersatz mit Talz und gestohlene Waffen.

## 7. Kartentexte für alle Kartentypen

V2.15.14 führt alle 324 Premiere-Karten im [Kartenregelregister](engine/premiere-card-rules.js). Die Testsuite prüft die Abdeckung des Katalogs und spielt Regel- und Kombinationsfälle nach. Das Deck Imperiale Garnison enthält außerdem den Todesstern, Retract The Bridge und Death Star Tractor Beam aus A New Hope für die Interaktionen mit Central Core.

## 8. Bot

In V2.15.16 abgeschlossen. Der Bot bewertet Startorte, Force-Ausgaben, Deploy, Besatzung, Bewegung, Battle, Antworten und Verluste mit einer eigenen Spielersicht. Die Tests prüfen verdeckte Karten, legale Entscheidungen und die Wiederholbarkeit vollständiger Partien.

## 9. Bedienung und Lernfunktionen

- [ ] Aktivierte Bedingungen direkt an der betroffenen Location auf der Playmat sichtbar machen.
- [ ] Am ausgewählten Objekt nur gültige Aktionen und Ziele anbieten. Kosten, Ursprung der Regel, ausstehende Auswahl und den Grund für eine gesperrte Aktion verständlich anzeigen.
- [ ] Vollständig prüfen, ob Stapel, verdeckte Karten, Inspektor und Protokoll dieselben Sichtbarkeitsregeln einhalten.
- [ ] Karteninspektor für alle 324 Karten vervollständigen. Originalbild, englischer Spieltext, deutsche Erklärung, Auslösezeitpunkt, Beispiel und Stand der Umsetzung anzeigen. Bei Bildfehlern Kartennamen und Spieltext lesbar halten.
- [ ] Eine geführte Partie mit fester Starthand und erklärten Entscheidungen bauen. Drei Übungen für Force und Deploy, Boden-Battle mit Waffen sowie Fahrzeug- und Raumbewegung bereitstellen.
- [ ] Hinweise und Undo auf den Lernmodus beschränken. Undo muss auf bereits aufgedeckte Informationen, abgeschlossene Zufallsziehungen und die Speicherung des Seeds Rücksicht nehmen.
- [ ] Neustart, Spielende und Auswertung mit nachvollziehbarem Aktionsprotokoll gestalten. Wiederholbare Szenarien über Deckliste, Seed und Aktionen starten können.

Für jeden fertigen Schritt den Entwicklungsbranch der vereinbarten Basis verwenden, den Arbeitsbaum vor einem Abruf oder Wechsel prüfen und Commit, Testergebnis sowie offene Fehler im Pull Request angeben.
