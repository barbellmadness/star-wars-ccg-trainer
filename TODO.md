# Offene Funktionen für den Star Wars CCG Premiere Trainer

Ziel ist eine vollständige lokale Einzelspielerpartie mit dem Premiere-Set und deutscher Lernführung. In freien Partien spielt der Bot die jeweils andere Seite. Der [Entwicklungsplan](ENTWICKLUNGSPLAN.md) hält den vorgesehenen Regelumfang fest.

## 4. Charaktere, Fahrzeuge, Schiffe und Bewegung

In V2.15.15 abgeschlossen. Die Tests decken Deploy, Besatzung, Reacts, Bewegung und das erneute Ausspielen gestohlener Karten durch ihren neuen Besitzer ab.

## 5. Battle, Destiny und Schadensauflösung

In V2.15.15 abgeschlossen. Die Tests decken Antwortfenster, Destiny, Immunität und Schadensauflösung ab. Bei vorzeitigem Kampfende gehen bereits getroffene Karten verloren.

## 6. Premiere-Waffen vervollständigen

In V2.15.15 abgeschlossen. Die Tests prüfen die 25 Premiere-Waffen und Kombinationen mit Karteneffekten, darunter umgelenkte Treffer, Forfeit-Ersatz mit Talz und gestohlene Waffen.

## 7. Kartentexte für alle Kartentypen

V2.15.14 führt alle 324 Premiere-Karten im [Kartenregelregister](engine/premiere-card-rules.js). Die Testsuite prüft die Abdeckung des Katalogs und spielt Regel- und Kombinationsfälle nach. Das Deck Imperiale Garnison enthält außerdem den Todesstern, Retract The Bridge und Death Star Tractor Beam aus A New Hope für die Interaktionen mit Central Core.

V2.15.18 nimmt die neun zuvor vom Deckvalidator abgelehnten Premiere-Karten auf. „Rebellen-Spezialeinsatz“ und „Imperiale Sondereinheit“ ergänzen die 71 bisher fehlenden Karten in der Deckauswahl. Die Datenprüfung testet die Abdeckung aller 324 Karten.

V2.15.19 prüft alle zwölf Decks in vollständigen Partien. Neue Regelfälle decken Beggar, Beru Stew, die Zeitgrenze von Scomp Link Access beim Fortsetzen und die Kampfwerte geschlossener oder unbemannter Fahrzeuge und Raumschiffe ab.

## 8. Bot

In V2.15.16 abgeschlossen. Der Bot bewertet Startorte, Force-Ausgaben, Deploy, Besatzung, Bewegung, Battle, Antworten und Verluste mit einer eigenen Spielersicht. Die Tests prüfen verdeckte Karten, legale Entscheidungen und die Wiederholbarkeit vollständiger Partien.

## 9. Bedienung und Lernfunktionen

In V2.15.17 abgeschlossen. Aktive Standortbedingungen und legale Aktionen erscheinen am Ort und im Inspektor. Alle 324 Premiere-Karten haben eine deutsche Erklärung, einen Auslösezeitpunkt und ein Beispiel. Drei Übungen zeigen Force und Deploy, Bodenkampf mit Blaster sowie Fahrzeug- und Raumbewegung. Der Lernmodus bietet Rückgängig für überprüfte Schritte ohne neue Karteninformationen. Beendete Partien lassen sich auswerten und mit Decklisten, Seed und Aktionen als Szenario speichern, laden und neu starten.

## 10. Aktionen und Ziele auf der Playmat

- [ ] Bei ausgewählten Karten aus der Hand und auf dem Tisch die aktuell legalen Aktionen, Ziele und Force-Kosten direkt auf der Playmat anzeigen. Das gilt auch für Effects, Interrupts und Reacts beider Seiten.
- [ ] Für gesperrte Aktionen den konkreten Grund anzeigen, etwa fehlende Force, ein fehlendes Ziel oder eine bereits verbrauchte Bewegung. Die Anzeige aus denselben Regelprüfungen ableiten, die die Engine beim Ausführen verwendet.

## 11. Kampfvorschau und Ablauflogik im Popup

- [ ] Vor dem Bezahlen eines Battles die aktuelle Power, mögliche Battle-Destiny-Ziehungen, einsatzbereite Waffen und Attrition-Immunität beider Seiten anzeigen. Sichtbare Werte und ausstehende Destiny-Ziehungen klar kennzeichnen.
- [ ] Im Kampf-Popup pro Segment die Seite mit Priorität anzeigen und nachvollziehbar machen, wie Treffer und Destiny das Ergebnis sowie die Pflichtverluste verändern.

## 12. Spielstile für den Bot

- [ ] Beim Start einer freien Partie zwischen defensivem, ausgewogenem und offensivem Bot wählen können. Der defensive Bot sichert kontrollierte Locations und hält Force für Antworten zurück. Der offensive Bot sucht vorteilhafte Kämpfe. Die Auswahl gilt für beide Bot-Seiten und bleibt beim Fortsetzen erhalten.
- [ ] Im Bot-Protokoll wichtige Entscheidungen mit einem kurzen Grund erklären. Die Erklärung verwendet nur Informationen, die der Bot regelgerecht kennen darf.

## 13. Geführte Dark-Side-Übung

- [ ] Eine kurze Dark-Side-Übung mit festem Startzustand ergänzen. Die Übung führt von Presence und Kontrolle zum Force Drain und bereitet anschließend einen Kampf mit Vader und Tarkin vor.

Für jeden fertigen Schritt den Entwicklungsbranch der vereinbarten Basis verwenden, den Arbeitsbaum vor einem Abruf oder Wechsel prüfen und Commit, Testergebnis sowie offene Fehler im Pull Request angeben.
