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

Von den **162 Karten aus A New Hope** sind **13 freigegeben**. Zu den drei bereits eingebundenen Karten Death Star, Death Star Tractor Beam und Retract The Bridge kommen Tantive IV, SW-4 Ion Cannon, Rebel Commander, Enhanced TIE Laser Cannon, Imperial Commander, IT-O, Lt. Shann Childsen, Monnok, Mosep und Reserve Pilot. Der Katalog zeigt die Freigabe pro Karte. `node scripts/import_premiere.mjs --edition a-new-hope --report` listet die **149 offenen Karten** mit Karten-ID und Typ. [Offizielle Kartenliste](https://res.starwarsccg.org/cardlists/ANewHopeType.html)

### Formate, Daten und Regelstand

- [ ] Den Regelstand für die Erweiterung festhalten. Die Regelbeilage von 1996 mit dem im Trainer verwendeten Glossar, Errata und späteren Entscheidungen vergleichen. Abweichungen wie Pflichtbewegung und Zielwahl bei Creatures sowie die Behandlung von Gefangenen mit Quellen und Tests entscheiden. Aktiven Kartentext, Vor-Errata-Text und Druckscan getrennt halten. [Decipher-Regelbeilage](https://res.starwarsccg.org/rules/anewhoperules.pdf), [Regelarchiv des Players Committee](https://www.starwarsccg.org/rules/)
- [ ] Für die offenen 149 Karten Ziele, Kosten, Zeitfenster, Kartentext, Errata und Abhängigkeiten erfassen. Pro Karte den Prüfstand, den Regelbezug und die passenden Tests notieren. Die bereits freigegebenen Karten in Kombinationen mit den neu hinzukommenden Karten erneut prüfen.

### Neue Regelmechaniken

Die folgende Einteilung folgt Deciphers Regelbeilage und der offiziellen Liste nach Kartentyp. Sie trennt allgemeine Regeln der Erweiterung von der anschließenden Prüfung einzelner Kartentexte. [Decipher-Regelbeilage, S. 1–4](https://res.starwarsccg.org/rules/anewhoperules.pdf), [Kartenliste nach Typ](https://res.starwarsccg.org/cardlists/ANewHopeType.html)

- [ ] **Immediate Effects und weitere Used-or-Lost-Interrupts**. Offene Zeitfenster für Immediate Effects, ihre Dauer auf dem Tisch und ihre Immunität gegen Alter prüfen. Auf Monnoks geprüften Used- und Lost-Varianten aufbauen und bei Karten wie Blue Milk und Grimtaash die Voraussetzungen, Kosten und Ablage separat prüfen. Immunität gegen die Karte Control als eigene Eigenschaft behandeln. Tests für Sense, Alter, bereits bezahlte Kosten und beantwortete Aktionen ergänzen.
- [ ] **Destiny und neue Kosten**. Bei R2-D2 die Auswahl zwischen den beiden gedruckten Werten vor der Wertung verlangen. Brainiacs π in Schwellenvergleichen, Summen und Modifikatoren verwenden und seinen Handgrößen-Deploy separat prüfen. „Lose Force“ als Zahlung aus Hand oder Life Force mit Ablage auf die Lost Pile ausführen. Wahl, Abbruch, versteckte Verluste und Fortsetzen mitten in einer Destiny-Auswahl testen.
- [ ] **Kumulative und bedingte Boni**. Jeder Beitrag einer ausdrücklich kumulativen Karte wie Rebel Tech muss zählen. Vorhandene nicht kumulative Premiere-Boni bei mehreren Quellen prüfen. Kartenreferenzen wie URoRRuR’R’R als Tusken Raider sowie Mehrfachkopien und Limits anhand des aktiven Kartentextes testen.
- [ ] **Undercover**. U-3PO, Undercover-Karten und gebrochene Tarnung prüfen. Besitz und Position am Tisch getrennt führen. Ein getarnter Spion blockiert gegnerische Drains und ermöglicht eigenen Deploy. Presence, Battle-Teilnahme und Waffen-Zielbarkeit folgen dem Sonderstatus. Bewegung im gegnerischen Zug, Kapazität und Boarding gegnerischer Fahrzeuge und Schiffe sowie die erlaubte Pilotenrolle prüfen.
- [ ] **Gefangene und Befreiung**. Neue Fang-, Befreiungs- und Haftkarten mit vorhandener Eskorte und Haft auf dem Todesstern verbinden. Zielbarkeit, inaktive Ausrüstung, Gefangenenwechsel, Freilassung und die Sonderfälle von Spice Mines Of Kessel prüfen. Auslöser und Voraussetzungen per Karte und Regelfassung belegen.
- [ ] **Traktorstrahlen und Besieged**. Death Star Tractor Beam, den allgemeinen Tractor Beam und Besieged gemeinsam prüfen. Festgesetzte Schiffe, eingeschlossene Besatzung, Abgang über Docking Bay 327, Rückkehr oder Diebstahl abbilden. Prüfen, welche Gruppe in einem Besieged-Battle teilnehmen darf und was bei Verlust oder Aufheben eines Strahls mit Schiff und Ausrüstung passiert.
- [ ] **Creature und Dianoga**. Habitat, Deploy, Bewegung, Ferocity und den auf der Karte benannten Verteidigungswert erfassen. Ein eigenes Angriffsverfahren für automatische und angesagte Creature-Angriffe umsetzen. Regelgerechte Zielwahl bei Droiden, Fahrzeugen oder mehreren Kandidaten und passende Waffenziele prüfen. Angriffe und Battles mit ihren getrennten Verlustregeln sowie die Verbindung zu Dark Waters und Tentacle testen.
- [ ] **Squadrons**. Y-wing Assault Squadron und TIE Assault Squadron aus je drei passenden Jägern bilden. Verbrauchte Schiffe und übertragbare Besatzung, Waffen und Geräte korrekt verschieben. Kapazität, Voraussetzungen für Power und Hyperspeed, Waffen-/Gerätelimits, Zielbarkeit und die Sonderregel für Attack Run prüfen.
- [ ] **Vehicle Sites**. Sandcrawler: Loading Bay und Sandcrawler: Droid Junkheap an ein konkretes Fahrzeug binden. Nachbarschaft mit dem Fahrzeug mitführen, Presence im Innenraum getrennt berechnen und Fahrerplatz sowie Bewegungskosten prüfen. Beim Verlust des Fahrzeugs die Folge für Innenraum, Figuren und Ausrüstung abwickeln.
- [ ] **Holosites und Dejarik**. Dejarik Hologameboard und Imperial Holotable als eigenständige Orte führen. Nur erlaubte Dejarik- und Hologramm-Karten zulassen. Destiny als Deploy, Forfeit, Power und Ability abbilden. Normalen Kartentext am Holosite deaktivieren. Kämpfe, Force Drains, Rücknahme bei Kontrolle und Einzigartigkeit testen, auch mit passenden Premiere-Karten.
- [ ] **Tatooine: Bluffs**. Einen verdeckten Bluff pro Zug und den kumulativen Drain-Bonus bei Kontrolle umsetzen. Aufdecken, legalen kostenlosen Charakter-Deploy, illegalen Deploy und Nicht-Charakter mit Force-Verlust getrennt prüfen. Verdeckte Identitäten schützen. Revolution und die Nachbarwirkung von Expand The Empire samt Aufhebung testen.
- [ ] **Mobiles System und Trench**. Die vorhandene Todessternbewegung mit Trench ausbauen. Deep Space, Umlaufbahn und mehrere Planeten auf gleichem Parsec prüfen. Orbit und System getrennt halten. Die Lage der Trench, erlaubte Zugänge, Schiffe ohne Hyperdrive und Shuttle über Docking Bay 327 mit Bewegungs- und Zieltests absichern.
- [ ] **Epic Events und Blown Away**. Attack Run von Eintritt in die Trench über Führung und Deckung, Abwehrschüsse, Destiny und Ausflug abbilden. Proton Torpedoes, Targeting Computer, Dark-Side-TIEs und Turbolaser als Bedingungen oder Antworten prüfen. Commence Primary Ignition mit Superlaser, gültigem Ziel, Commence Recharging und Kartenkosten umsetzen. Zerstörung mit überlebenden Schiffen am System, Verlust zugehöriger Sites, Wegfall von Icons und Text, blockierter Konvertierung und erlaubter späterer Bewegung testen. Force-Verlust bei Zerstörung einer Rebellenbasis oder des Todessterns separat prüfen. [Decipher-Regelbeilage, S. 4](https://res.starwarsccg.org/rules/anewhoperules.pdf), [Players-Committee-Regelarchiv](https://www.starwarsccg.org/rules/)

### Einzelkarten, Trainer und Freigabe

- [ ] **Figuren und Orte**. 52 Characters und 17 Locations prüfen. Schwerpunkt sind Spione, Piloten, Droiden, Deploy-Voraussetzungen, ortsgebundene Fähigkeiten und neue Ortsgruppen. Zulässige Startorte und gleichnamige Orte beider Editionen testen.
- [ ] **Fahrzeuge, Schiffe, Waffen und Devices**. 4 Vehicles, 11 Starships, 10 Weapons und 10 Devices prüfen. Einbau, Kapazität, Energieversorgung, Pilot beziehungsweise Fahrer, Angriff, Schuss-Ziele und Verlustkaskaden testen. Die Squadron-, Traktorstrahl- und Superlaser-Fälle aus den Mechanik-Aufgaben mit den Einzelkarten abdecken.
- [ ] **Effects und Interrupts**. 26 Effects und 29 Interrupts prüfen. Typ, Ziele, Kosten, Antwortzeitpunkt, Dauer, Aufhebung, Varianten und mögliche Kombinationen mit Premiere abdecken. Die 1 Creature und 2 Epic Events über eigene Szenarien mit den oben genannten Mechaniken prüfen.
- [ ] Die neuen Aktionen und ihren Regelgrund auf der Playmat, im Karteninspektor und in Kampf-/Auswahlfenstern anzeigen. Karten unter Fahrzeugen, bei Gefangenen, im Traktorstrahl, in der Trench und als Bluff korrekt darstellen. Bei öffentlichen Protokollen und beim Fortsetzen nur freigegebene Karteninformationen anzeigen.
- [ ] Die Bot-Angebote für die neuen Aktionen beider Seiten bewerten. Defensiv, Ausgewogen und Offensiv müssen legale Aktionen nutzen. Entscheidungsgründe dürfen aus sichtbaren Fakten und der Bot-Spielersicht entstehen.
- [ ] Für beide Seiten ausgewogene Mischdecks samt Strategie-Einweisung erstellen. Nachweisen, dass alle freigegebenen Karten über die Deckauswahl oder einen dafür vorgesehenen, validierten Einstieg erreichbar sind. Beide Formate in vollständigen Partien mit unterschiedlichen Seeds testen.
- [ ] Für jede weitere Mechanik Regressionsfälle für verdeckte Karten, RNG, Autosave mitten in neuen Antwortfenstern und Szenarioimporte ergänzen. Die vollständige Node-Suite, Datenquellenprüfung und Browser-Tests auf Desktop und schmalem Bildschirm ausführen. Jede weitere Karte nach ihrer Einzelkarten- und Kombinationsprüfung für das Mischformat freigeben.

Für jeden fertigen Schritt den Entwicklungsbranch der vereinbarten Basis verwenden, den Arbeitsbaum vor einem Abruf oder Wechsel prüfen und Commit, Testergebnis sowie offene Fehler im Pull Request angeben.
