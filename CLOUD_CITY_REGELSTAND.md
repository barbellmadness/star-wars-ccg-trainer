# Cloud City – Regelstand 33

V2.18.0 ergänzt 180 physische Karten (90 je Seite) und das Format **Premiere + A New Hope + Hoth + Dagobah + Cloud City**. Acht neue 60-Karten-Themendecks je Seite decken alle 180 Karten ab. Die zusätzliche Hindsight-Lesehilfe Light:7294 teilt den Slot 5_26 mit Light:1145 und ist keine weitere physische Karte. Für dieses Format gelten ausschließlich die regulären Sets 1–5; spätere Premium-Veröffentlichungen sind nicht automatisch enthalten.

## Verwendete Quellen

- [Ursprüngliche Cloud-City-Regelbeilage](https://res.starwarsccg.org/rules/cloudcityrules.pdf)
- [Players Committee Advanced Rulebook 2023](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf)
- [Glossary Supplement mit Kartenklarstellungen](https://res.starwarsccg.org/rules/swccgglossarysupplement.pdf)
- [Offizielle Cloud-City-Kartenliste](https://res.starwarsccg.org/cardlists/CloudCityType.html)
- Öffentliche Katalogrevision 65cd150d20634447a5499d763ac324436158c7a8 des [Karten-JSON-Projekts](https://github.com/swccgpc/swccg-card-json/tree/65cd150d20634447a5499d763ac324436158c7a8). Aktive Texte, Vor-Errata-Fassungen und Scan-Links bleiben getrennt.

Spätere Regelklarstellungen haben Vorrang vor missverständlichen Kurztexten des fixierten Katalogs. Insbesondere ersetzen **All Too Easy** und **Chasm Walkway** einen bevorstehenden Treffer, bevor er eintritt. Das Popup zeigt diese Klarstellung zusätzlich zum unveränderten Katalogtext. Dash bezahlt den Interrupt mit 3 Force (für Scouts kostenlos); die dadurch erlaubte React-Bewegung ist kostenlos.

## Mechaniken und Prüfung

| Bereich | Umsetzung und gezielte Prüfungen |
| --- | --- |
| Wolkensektoren | Eigener Planetbezug, keine Asteroidengefahr. Stadtsektor unten, Clouds darüber; höchster Sektor zum System, niedrigster zur äußeren Site. Geeignete Fighter, Cloud Cars, Shuttle-/Patrol-Vehicles; gewöhnliche Capitals ausgeschlossen. Bis zu zwei Wolken für 1 Force, zusätzliche Shuttle-Kosten, bestehende Bewegungssperren. rules, space, layout, locations |
| Sites und Control | Docking Bays an den Enden der Interior-Sites, stabile Slot-IDs, Konvertierung, Corridor-Transfers, Scomp links, Tibanna und Bespin-Unterstützung. Standorte zählen auch für Präsenz, Kontrolle und Botenplanung. locations, units, layout |
| Sabacc | Normale Hand beiseite, mindestens zwei Reserve-Karten pro Seite, wechselnd ziehen/passen, maximal sechs, endgültiges Passen. Wild cards, Klone, Lando-Modifikator, perfekte erste Zweierhand und doppelte Einsätze. Sabacc-Hand bleibt Life Force; keine Destiny-Draws; Inserts werden aufgelöst. Gegnersicht und Speicherfortsetzung geprüft. sabacc, integrity, autosave |
| Gefangene | Binders-Mehrfacheskorte, Kapazität, Eskorte verloren/Device verloren, Frozen-Pickup/-Drop, Gefängnislieferung und Belohnung. Bounty verlangt denselben ursprünglichen Bounty Hunter; Boba-Bonus bei der Auszahlung. captives, combinations, captive-battle |
| Carbonit | Chamber, Console, kumulative Ugnaughts und Ugloste; Ergebnisse unter 5, 5–10, über 10. Gefrorene haben Power/Ability 0, keine Verhöre, Human Shield oder Captive Fury. Kontrolle befreit unbeaufsichtigte Gefangene. freezing, storage, combinations, autosave |
| Weather Vane | Eine hängende Figur, vorherige bei Neuankunft verloren, Treffer ersetzt, Ausrüstung abgelegt, Rettung/Kaperung mit geeignetem bemanntem Craft und Kapazität. weather, reactions |
| Kampf und Duell | Zusätzliche/gewählte Destiny, Smoke Screen pro Draw ohne Kartenverbrauch, Captain Han auf Falcon, Higher Ground statt Waffenfeuer, Power-Tausch, Treffer-/Attrition-Regeln, Captive Fury/Pursuit. Reguläres Circle-Duell und optionale Epic-Duel-Folgen. duels, destiny, weapons, interrupts, captive-battle |
| Kartenverwaltung | Cyborg-Speicher einmal pro Zug, max. 3/6 Karten, Spielen wie aus Hand, verdeckte Gegnersicht, Inhalt nach Verlust zu Used. Inserts, Scan-Antworten, Nabrun-Sofortdeployments und einmalige/mehrfache Unique-Limits. storage, integrity, information, nabrun |
| Force und Antworten | Frozen Assets sperrt nur die bezeichneten Force-Karten; spätere Aktivierung bleibt verfügbar. Imperial Decree und Great Warrior entfernen eigene Drain-Boni, erhalten negative Modifikatoren und Boni gegnerischer Karten. All My Urchins schützt den für die Initiierung benötigten Force-Anteil. effects, drains, destiny |
| Vollständige Partien | Acht unterschiedliche Deckpaarungen mit wechselnder Spielerseite, legalen Bot-Entscheidungen, Spielende und durchgängiger Bilanz von 120 eindeutigen Karteninstanzen. matches |

Die Testnamen in der letzten Spalte entsprechen Dateien unter tests/cloud-city-*.test.mjs. Die vollständige Node-Suite prüft zusätzlich Premiere, A New Hope, Hoth, Dagobah und ältere gespeicherte Regelversionen. Die Browserprüfung umfasst beide Seiten, sofortige Deckübersicht ohne Cloud-Downloads, Fehler/Wiederholen beim Nachladen, Strategie, Karten-Popup sowie neue und nach Reload fortgesetzte Partien. Das öffentliche Paket prüft ausdrücklich genau 16 Premiere-Drucktexte.

Autosave verwendet dieselben versionierten Aktionen wie der Rest des Spiels. Sabacc, Cyborg-Speicher, Carbon-Freezing samt Force-Verlust und Sense während einer R2-D2-Destiny-Wahl werden nach jedem einzelnen Schritt neu geladen, verglichen und weitergespielt; ungültige Szenariofortsetzungen dürfen den aktuellen Stand nicht verändern. Sense bleibt während der Auswahl ausdrücklich als laufender Interrupt im Zustand.

## Bedingte Ziele

Integration bedeutet, dass die gedruckten Bedingungen eingehalten werden. **Rendezvous Point On Tatooine** benötigt eine Jabba’s-Palace-Location, die in Sets 1–5 nicht vorkommt; die Bewegung wird erst mit einem passenden Ziel angeboten. Der Luke-Zweig von Epic Duel benötigt die in diesem Pool noch fehlende Vader’s Obsession; der bereits verfügbare Obi-Wan-Zweig funktioniert mit The Circle Is Now Complete. Es werden dafür keine beliebigen Ersatzkarten oder vereinfachten Standardaktionen verwendet. Die Luke-Übergangsabwicklung ist für passende künftige Ziele vorbereitet.

## Laden und Datenschutz

Die Übersicht zeigt 40 Decks je Spielseite, davon acht für Cloud City. Die erweiterte Metadatei für Hoth/Dagobah/Cloud City umfasst 2.259 Bytes gzip; Listen und Regeln laden erst nach Bedarf. Das öffentliche Cloud-City-Regelpaket verwendet eine einzige zusätzliche Skriptanfrage. Cloud-City-Katalog, Decks und Regeln umfassen zusammen 105.206 Bytes gzip. Der ursprüngliche Startbedarf bleibt unter dem bestehenden Budget von 600 KiB gzip. Keine Datenbank ist erforderlich.

**Die 308 privaten Premiere-Drucktexte werden weder gelesen noch kopiert oder veröffentlicht.** Genau 16 öffentliche Premiere-Drucktexte bleiben im Paket. Quellen und Kartenliste unten enthalten ausschließlich öffentliche Metadaten.

## Kartenregister

Das Register nennt die beteiligten Cloud-City-Module; gemeinsam genutzte Grundregeln, benannte Gegenkarten und Kartentyp-Regeln kommen hinzu. Es ist eine Zuordnung für die Codeprüfung, kein Beweis sämtlicher denkbaren Kartenkombinationen.

| ID | Karte | Typ | Regelmodule |
| --- | --- | --- | --- |
| Light:54 | Access Denied | Effect | effects |
| Light:66 | •Advantage | Effect | effects |
| Light:84 | •All My Urchins | Effect | answers, effects, timing |
| Light:104 | •Ambush | Interrupt | battle, interrupts |
| Light:133 | Armed And Dangerous | Interrupt | battle, duels, interrupts |
| Light:139 | •Artoo, Come Back At Once! | Interrupt | captive-battle, interrupts |
| Light:142 | As Good As Gone | Interrupt | interrupts, reactions |
| Light:217 | •Beldon's Eye | Effect | abilities, answers, effects, units |
| Light:226 | •Bespin | Location | locations |
| Light:229 | •Bespin: Cloud City | Location | gemeinsame Typregeln |
| Light:244 | Bionic Hand | Device | devices, effects, interrupts, limits |
| Light:261 | •Blaster Proficiency | Interrupt | interrupts |
| Light:332 | •Bright Hope | Starship | gemeinsame Typregeln |
| Light:360 | •Captain Han Solo | Character | units |
| Light:376 | •Captive Fury | Interrupt | captive-battle |
| Light:377 | Captive Pursuit | Interrupt | interrupts |
| Light:392 | Chasm | Effect | effects |
| Light:414 | •Civil Disorder | Effect | effects |
| Light:418 | •Clash Of Sabers | Interrupt | interrupts |
| Light:426 | Cloud Car | Vehicle | gemeinsame Typregeln |
| Light:428 | Cloud City Blaster | Weapon | weapons |
| Light:433 | •Cloud City Sabacc | Interrupt | sabacc |
| Light:434 | •••Cloud City Technician | Character | abilities |
| Light:436 | Cloud City Trooper | Character | units |
| Light:438 | •Cloud City: Carbonite Chamber | Location | answers, freezing, locations |
| Light:442 | •Cloud City: Chasm Walkway | Location | weapons, weather-vane |
| Light:448 | •Cloud City: Guest Quarters | Location | locations |
| Light:450 | •Cloud City: Incinerator | Location | locations |
| Light:453 | •Cloud City: Lower Corridor | Location | locations |
| Light:455 | •Cloud City: Platform 327 (Docking Bay) | Location | locations |
| Light:459 | •Cloud City: Upper Plaza Corridor | Location | locations |
| Light:464 | <><><>Clouds | Location | locations, space |
| Light:511 | Computer Interface | Interrupt | interrupts |
| Light:578 | •Courage Of A Skywalker | Interrupt | battle, duels |
| Light:583 | Crack Shot | Effect | effects, weapons |
| Light:592 | •Cyborg Construct | Device | abilities, devices, storage |
| Light:612 | •Dark Approach | Interrupt | interrupts |
| Light:640 | •Dash | Interrupt | interrupts, reactions |
| Light:717 | Desperate Reach | Interrupt | interrupts |
| Light:737 | •Dismantle On Sight | Effect | effects |
| Light:749 | •Dodge | Interrupt | interrupts, reactions |
| Light:922 | •Fall Of The Empire | Interrupt | reactions |
| Light:923 | •Fall Of The Legend | Interrupt | interrupts |
| Light:989 | •Frozen Assets | Effect | effects, session |
| Light:1006 | •Gambler's Luck | Interrupt | battle |
| Light:1042 | •Glancing Blow | Interrupt | battle, interrupts |
| Light:1112 | •Haven | Effect | effects, support |
| Light:1132 | Hero Of A Thousand Devices | Effect | abilities, effects, interrupts, support |
| Light:1143 | •Higher Ground | Interrupt | battle, interrupts |
| Light:1145 | •Hindsight | Effect | abilities, effects, interrupts |
| Light:1157 | •Hopping Mad | Effect | abilities, effects, interrupts |
| Light:1206 | •I Don't Need Their Scum, Either | Interrupt | battle, interrupts |
| Light:1293 | •Impressive, Most Impressive | Interrupt | interrupts |
| Light:1313 | •Innocent Scoundrel | Interrupt | interrupts |
| Light:1323 | Into The Ventilation Shaft, Lefty | Interrupt | interrupts, reactions |
| Light:1334 | •It's A Trap! | Interrupt | interrupts |
| Light:1419 | •Kebyc | Character | units |
| Light:1422 | Keep Your Eyes Open | Interrupt | interrupts, reactions |
| Light:1466 | •Lando Calrissian | Character | units |
| Light:1476 | •Lando's Wrist Comlink | Device | devices, reacts |
| Light:1493 | •Leia Of Alderaan | Effect | effects |
| Light:1549 | •Lift Tube Escape | Interrupt | interrupts, reactions |
| Light:1562 | •Lobot | Character | interrupts, reactions, reacts, storage, units |
| Light:1603 | •Luke's Blaster Pistol | Weapon | weapons |
| Light:1797 | •NOOOOOOOOOOOO! | Interrupt | interrupts, reactions |
| Light:1821 | •Off The Edge | Interrupt | interrupts |
| Light:1828 | •Old Pirates | Interrupt | interrupts |
| Light:1875 | •Out Of Somewhere | Interrupt | reactions |
| Light:1897 | •Path Of Least Resistance | Interrupt | interrupts |
| Light:1943 | •Princess Leia | Character | reacts, units |
| Light:1960 | •Protector | Interrupt | battle, captive-battle |
| Light:1966 | •Punch It! | Interrupt | battle |
| Light:1970 | •Put That Down | Interrupt | interrupts |
| Light:2073 | •Redemption | Starship | abilities, support |
| Light:2084 | Rendezvous Point On Tatooine | Interrupt | reactions |
| Light:2092 | •Rescue In The Clouds | Interrupt | interrupts, reactions |
| Light:2252 | •Shocking Information | Interrupt | information, interrupts |
| Light:2285 | •Smoke Screen | Interrupt | battle |
| Light:2301 | •Somersault | Interrupt | battle, reactions |
| Light:2387 | •Surreptitious Glance | Interrupt | interrupts, reactions |
| Light:2393 | •••Swing-And-A-Miss | Interrupt | interrupts |
| Light:2571 | •This Is Even Better | Interrupt | battle, captive-battle |
| Light:2592 | Tibanna Gas Miner | Character | abilities, units |
| Light:2631 | •Treva Horme | Character | abilities |
| Light:2640 | •Trooper Utris M'toc | Character | units |
| Light:2670 | •Uncontrollable Fury | Effect | battle, effects, interrupts |
| Light:2779 | •Weather Vane | Effect | interrupts, weather-vane |
| Light:2758 | •We'll Find Han | Interrupt | battle, reactions |
| Light:2810 | •Wiorkettle | Character | abilities, units |
| Light:2825 | •Wookiee Strangle | Interrupt | reactions |
| Dark:46 | •Ability, Ability, Ability | Effect | effects, locations, space |
| Dark:48 | Abyss | Effect | effects |
| Dark:73 | •Aiiii! Aaa! Agggggggggg! | Interrupt | interrupts |
| Dark:87 | •All Too Easy | Effect | duels, effects, freezing, session |
| Dark:162 | •Atmospheric Assault | Interrupt | battle, reactions |
| Dark:225 | •Bespin | Location | information, interrupts, locations |
| Dark:228 | •Bespin: Cloud City | Location | interrupts, reactions |
| Dark:243 | Binders | Device | abilities, captives, devices |
| Dark:257 | •Blasted Droid | Interrupt | answers, battle, interrupts |
| Dark:287 | •Boba Fett | Character | captives, interrupts, units |
| Dark:293 | •Boba Fett's Blaster Rifle | Weapon | battle, reacts, weapons |
| Dark:316 | Bounty | Effect | captives, effects, session |
| Dark:330 | •Brief Loss Of Control | Interrupt | reactions |
| Dark:355 | •Captain Bewil | Character | abilities |
| Dark:379 | Carbon-Freezing | Effect | abilities, answers, freezing, session |
| Dark:380 | •Carbonite Chamber Console | Device | abilities, devices, freezing |
| Dark:409 | •Chief Retwin | Character | abilities |
| Dark:425 | Cloud Car | Vehicle | gemeinsame Typregeln |
| Dark:427 | Cloud City Blaster | Weapon | weapons |
| Dark:430 | •••Cloud City Engineer | Character | abilities, units |
| Dark:432 | •Cloud City Sabacc | Interrupt | sabacc |
| Dark:435 | Cloud City Trooper | Character | units |
| Dark:437 | •Cloud City: Carbonite Chamber | Location | freezing |
| Dark:441 | •Cloud City: Chasm Walkway | Location | weapons, weather-vane |
| Dark:444 | •Cloud City: Dining Room | Location | reacts, support |
| Dark:447 | •Cloud City: East Platform (Docking Bay) | Location | locations |
| Dark:449 | •Cloud City: Incinerator | Location | locations |
| Dark:452 | •Cloud City: Lower Corridor | Location | locations |
| Dark:457 | •Cloud City: Security Tower | Location | locations |
| Dark:458 | •Cloud City: Upper Plaza Corridor | Location | locations |
| Dark:463 | <><><>Clouds | Location | locations, space |
| Dark:492 | •Commander Desanne | Character | abilities, space |
| Dark:614 | •Dark Deal | Effect | effects, reactions |
| Dark:625 | •Dark Strike | Interrupt | interrupts |
| Dark:714 | •Despair | Effect | effects, freezing |
| Dark:763 | Double Back | Interrupt | captive-battle, interrupts |
| Dark:765 | •Double-Crossing, No-Good Swindler | Interrupt | interrupts, reactions |
| Dark:800 | •E Chu Ta | Interrupt | interrupts, reactions |
| Dark:801 | •E-3PO | Character | abilities, units |
| Dark:841 | •End This Destructive Conflict | Interrupt | battle, interrupts |
| Dark:879 | •Epic Duel | Epic Event | duels, effects |
| Dark:960 | •Flight Escort | Interrupt | battle, reactions |
| Dark:964 | •Focused Attack | Interrupt | battle, duels |
| Dark:968 | •Force Field | Interrupt | interrupts |
| Dark:972 | •Forced Landing | Effect | answers, effects |
| Dark:1121 | Heart Of The Chasm | Interrupt | abilities, interrupts, layout |
| Dark:1116 | He's All Yours, Bounty Hunter | Interrupt | interrupts |
| Dark:1188 | Human Shield | Interrupt | abilities, captive-battle, interrupts |
| Dark:1201 | •I Am Your Father | Effect | effects, interrupts |
| Dark:1210 | •I Had No Choice | Effect | abilities, effects |
| Dark:1268 | Imperial Decree | Effect | effects |
| Dark:1287 | •Imperial Trooper Guard Dainsom | Character | units |
| Dark:1320 | •Interrogation Array | Device | abilities, devices |
| Dark:1465 | •Lando Calrissian | Character | abilities, units |
| Dark:1514 | •Levitation Attack | Interrupt | interrupts |
| Dark:1522 | •Lieutenant Cecius | Character | abilities, units |
| Dark:1537 | •Lieutenant Sheckil | Character | abilities, captives, units |
| Dark:1637 | •Mandalorian Armor | Device | abilities, devices |
| Dark:1701 | •Mostly Armless | Effect | devices, effects, interrupts |
| Dark:1817 | •Obsidian 7 | Starship | space |
| Dark:1818 | •Obsidian 8 | Starship | space |
| Dark:1919 | Point Man | Interrupt | card-rules (benannte Gegenkarten) |
| Dark:1937 | •Prepare The Chamber | Interrupt | abilities, battle, interrupts |
| Dark:1957 | •Projective Telepathy | Interrupt | information, interrupts |
| Dark:2079 | •Release Your Anger | Interrupt | interrupts |
| Dark:2101 | Restricted Access | Effect | effects |
| Dark:2114 | •Rite Of Passage | Interrupt | abilities, reactions |
| Dark:2248 | •Shattered Hope | Interrupt | reactions |
| Dark:2255 | •Shocking Revelation | Interrupt | information, interrupts |
| Dark:2278 | •Slave I | Starship | reacts, units |
| Dark:2283 | •Slip Sliding Away | Interrupt | interrupts, reactions |
| Dark:2306 | •Sonic Bombardment | Interrupt | interrupts |
| Dark:2323 | •Special Delivery | Effect | answers, captives, effects |
| Dark:2384 | Surprise | Interrupt | answers |
| Dark:2524 | •The Emperor's Prize | Effect | effects, freezing, timing |
| Dark:2578 | •This Is Still Wrong | Interrupt | battle, interrupts |
| Dark:2591 | Tibanna Gas Miner | Character | abilities, units |
| Dark:2603 | •TIE Sentry Ships | Interrupt | reactions |
| Dark:2633 | Trooper Assault | Interrupt | interrupts |
| Dark:2637 | •Trooper Jerrol Blendin | Character | abilities, units |
| Dark:2661 | •Ugloste | Character | abilities, freezing, units |
| Dark:2662 | Ugnaught | Character | abilities, freezing, units |
| Dark:2697 | •Vader's Bounty | Effect | captives, effects, session |
| Dark:2699 | •Vader's Cape | Effect | battle, effects |
| Dark:2770 | •Weapon Levitation | Interrupt | battle, interrupts |
| Dark:2775 | •Weapon Of An Ungrateful Son | Interrupt | interrupts, reactions |
| Dark:2778 | •Weather Vane | Effect | interrupts, weather-vane |
| Dark:2768 | •We're The Bait | Effect | effects, freezing, session, timing |
| Dark:2807 | •Why Didn't You Tell Me? | Interrupt | battle |
| Dark:2875 | •You Are Beaten | Interrupt | interrupts |

## Lokale Abnahme vom 19.11.2026

Alle fünf Karten-/Deckkataloge, die Sammlerprüfung und der Deckübersichtsabgleich sind bestanden. Der abschließende vollständige Node-Lauf besteht **886 von 886 Tests**; die vollständige Chrome-Suite besteht **fünf von fünf Browserprüfungen**, einschließlich Quellseite, gebautem Paket und beiden Cloud-City-Spielseiten. Auch die acht vollständigen Cloud-City-Deckpaarungen behalten jeweils 120 eindeutige Karteninstanzen und erreichen ein Spielende. Keine offenen lokalen Abnahmefehler bekannt. Veröffentlichung und öffentliche Abnahme werden in docs/ALL_INKL.md dokumentiert.

Öffentliche Abnahme: V2.18.0, Release 2ffd6c3c0a485a83, auf www.starwarsccg.de veröffentlicht. Alle fünf Formate und beide Seiten beginnen und setzen nach Reload identisch fort; alle 120 Release-Dateien sind per SHA-256 geprüft. [Veröffentlichungsprotokoll](docs/ALL_INKL.md#cloud-city-veröffentlichung).
