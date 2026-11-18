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

In V2.15.26 abgeschlossen. Die Playmat zeigt bei ausgewählten Hand- und Tischkarten legale Aktionen mit Zielen und Force-Kosten. Sie markiert die Zielorte und führt auch durch Antwortfenster und mehrstufige Kartenaktionen. Die Tests prüfen unter anderem ortsabhängige Deploy-Kosten, fehlende Ziele, verbrauchte Bewegung sowie Effects, Interrupts und Reacts für beide Spielseiten. Ausführbare Aktionen und Kostenhinweise basieren auf denselben Regelangeboten der Engine.

## 11. Kampfvorschau und Ablauflogik im Popup

In V2.15.27 abgeschlossen. Die Kampfvorschau zeigt vor der Zahlung die sichtbare Power, mögliche Destiny-Ziehungen, einsatzbereite Waffen und Attrition-Immunität beider Seiten. Das Kampf-Popup zeigt die Priorität im aktuellen Segment, offene oder aufgedeckte Destiny-Ziehungen, Waffenergebnisse und die Berechnung von Power, Battle Damage und Attrition. Im Schadenssegment stehen anstehende Pflicht-Forfeits und die verbleibenden Verluste.

## 12. Spielstile für den Bot

In V2.15.28 abgeschlossen. Beim Start einer freien Partie stehen Defensiv, Ausgewogen und Offensiv zur Wahl. Der defensive Bot sichert kontrollierte Orte und spart Force für Antworten. Der offensive Bot sucht günstige Kämpfe. Der Spielstil gilt für beide Bot-Seiten und wird im Spielstand und beim Szenarioexport gespeichert. Kurze Gründe für wichtige Entscheidungen werden aus derselben regelgerechten Spielersicht wie die Bot-Planung abgeleitet.

## 13. Geführte Dark-Side-Übung

In V2.15.29 abgeschlossen. Die Dark-Side-Übung startet mit festem Seed, festen Starthänden und kontrollierten Starting Locations. Sie führt von Presence und Kontrolle bei Jundland Wastes zum Force Drain und anschließend zum Battle mit Vader und Tarkin bei Docking Bay 94. Das Übungsziel schließt mit Tarkins Aufhebung einer gegnerischen Destiny ab. Fortsetzen und Neustart verwenden denselben Startzustand.

## 14. A New Hope integrieren

Neue freie Partien starten standardmäßig mit **Premiere** und den 324 Karten aus Set 1. **Premiere + A New Hope** erweitert die Deckauswahl auf beide Seiten um die bereits freigegebenen Karten aus Set 2. Beide Formate prüfen Spieler- und Bot-Decks einschließlich Startorten. Autosave, Szenarioexport und Neustart führen Format, Datenrevision und Regelversion mit. Historische Spielstände mit der alten „Imperialen Garnison“ behalten ihr Deck und ihren Regelsatz.

V2.15.34 gibt alle **162 Karten aus A New Hope** frei. Die letzten 74 Karten besitzen ausführbare Regelangebote und Einzelkarten-/Kombinationstests. Die [Regeldokumentation](A_NEW_HOPE_REGELSTAND.md) hält Quellen, die verwendete Fassung und die Prüfzuordnung fest.

- [x] Regelstand und Abweichungen gegenüber der Beilage von 1996 dokumentieren; aktive Texte, Errata und Druckscans getrennt halten.
- [x] Verbleibende 74 Karten in das versionierte Regelregister aufnehmen und für neue Mischpartien freigeben; historische Spielstände weiter mit ihrer Regelversion validieren.
- [x] Immediate Effects, festgehaltene Interrupts, eindeutige Interrupt-Limits und zusätzliche Kosten abwickeln.
- [x] R2-D2s Destiny-Wahl, Brainiacs exakte Werte, kumulative Boni und unterschiedliche Use-/Lose-Force-Zahlungen umsetzen.
- [x] Undercover, Eskorte, Gefangennahme und Haft mit den neuen Fang-, Befreiungs- und Missionskarten verbinden.
- [x] Tractor Beam, festgehaltene Schiffe, Besieged und eingeschlossene Besatzung abwickeln.
- [x] Dianogas Habitat, Bewegung, Pflicht- und freiwillige Creature-Angriffe sowie Waffen und Mahlzeiten getrennt von Battles abwickeln.
- [x] Squadrons, Fahrzeug-Innenräume, Holosites, Bluffs, Laser Gate und neue Devices integrieren.
- [x] Trench, Attack Run, Superlaser, Commence Primary Ignition, Recharging und Blown Away integrieren.
- [x] Neue legale Aktionen auf der Playmat und in Entscheidungsfenstern anbieten und durch den Bot bewerten.
- [x] Drei zusätzliche Mischdeck-Varianten je Seite mit Strategiehinweisen erstellen; sämtliche 162 ANH-Karten über die validierte Deckauswahl erreichbar machen.
- [x] Vollständige Partien beider Formate und beider Spielseiten mit verschiedenen Seeds auf legale Entscheidungen und Erhalt aller 120 Karteninstanzen prüfen.

### Absicherung

- [x] Gezielt mitten in den neuen Antwortfenstern speichern, in einer frischen Instanz fortsetzen und als JSON-Szenario importieren. 43 zusätzliche Fälle prüfen Epic Events, Creatures, Gefangene, Traktorstrahlen, Destiny-Folgen, Spione, verdeckte Karten, Transfers und automatische Bot-Antworten. Verglichen werden Zustand, Zufallsfolge, legale Optionen und beide Spielersichten; ungültige Folgeaktionen müssen den bisherigen Stand erhalten. Regelversion 29 bleibt reproduzierbar. [Prüfmatrix](A_NEW_HOPE_REGELSTAND.md#autosave-und-szenarioprüfung)

Die 308 privaten Premiere-Drucktexte bleiben ausschließlich lokal. Ein vollständig freigegebener Kartenkatalog ist kein formaler Nachweis sämtlicher denkbarer Kartenkombinationen. Neue gefundene Kombinationen werden weiterhin als Regressionstests ergänzt.

Für fertige Schritte Entwicklungsbranches verwenden und Commit, Testergebnis sowie offene Fehler im Pull Request dokumentieren. Kein direkter Push auf main, kein Force-Push und kein automatischer Merge.
