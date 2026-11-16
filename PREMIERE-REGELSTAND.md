# Regelstand des Premiere Trainers

Der Kartenpool besteht aus den 324 Karten von Deciphers **Premiere Limited** vom Dezember 1995. Die beiden Decklisten verwenden jeweils 60 Karten einer Seite. Der Import übernimmt Karten mit `set: "1"`, `legacy: false` und einer Druckauflage in Set `1`. [Offizielle Premiere-Kartenliste](https://res.starwarsccg.org/cardlists/PremiereType.html) · [Set-Übersicht des Players Committee](https://www.starwarsccg.org/collecting/)

## Angewandte Regeln

- **Grundregeln und Premiere-Klarstellungen.** Deciphers Regelwerk, Glossar und Premiere-FAQ geben die Basis für Force, Phasen, Deployment, Kampf und Bewegung. Die Engine setzt die jeweils getesteten Regeln um. Lernhilfen und offene Karteneffekte sind in V2 gekennzeichnet. [Decipher-Regelwerk](https://res.starwarsccg.org/rules/rulebookv2.pdf) · [Premiere-FAQ vom 27. November 1996](https://res.starwarsccg.org/rules/premierefaq.pdf)
- **Starting Locations.** V2 verwendet Deciphers Neuwahl bei gleichem Titel. Die beiden Karten gehen nach der Auswahl zurück in ihre Decks. Ohne Alternative startet die betroffene Seite ohne eigenen Startort. Die neuere optionale Konvertierung beim Setup gehört zum späteren Regelstand. [Decipher-Glossar](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=124) · [Advanced Rulebook, Kapitel 2](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=31)
- **Site-Anordnung.** Das Advanced Rulebook konkretisiert für V2 die Gruppen aus Innen-Sites, Docking Bay, Außen-Sites und System sowie den zusammenhängenden Tatooine-Block. Diese Klarstellung funktioniert mit den Karten des Premiere-Sets. Weitere spätere Layouts werden erst übernommen, wenn dazu passende Karten und Regeln gebraucht werden. [Advanced Rulebook, Anhang E](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=181)
- **Deckkopien.** Einzigartigkeit und Mehrfachpunkte begrenzen gleichzeitig ausgespielte Exemplare. Die Deckprüfung akzeptiert mehrere Exemplare derselben Karte in einer Zeile mit einer gültigen Stückzahl. [Decipher-Regelwerk, Deploy Phase](https://res.starwarsccg.org/rules/rulebookv2.pdf)

## Spielengine und Aktionsreihenfolge

Die V2-Oberfläche und der Bot verwenden dasselbe Aktionsangebot. Neue Partien können einen Seed von `0` bis `4294967295` verwenden. V2 zeigt den verwendeten Seed an. Der Seed bestimmt die verdeckte Startortwahl des Bots und die Mischreihenfolge beider Decks. Das interne Aktionsprotokoll enthält die Auswahl beider Seiten. Reserve Deck, Force Pile und Used Pile bleiben in den Seitenansichten verdeckt. Die gegnerische Hand lässt sich ausdrücklich für den Lernmodus einblenden.

Bei Battle und Force Drain erhält die Gegenseite die erste optionale Antwort. Shistavanen Wolfman und Bantha können für 1 Force von einer zulässigen benachbarten Site reagieren. Ein erfolgreicher React mit Presence hebt einen Force Drain auf. Sense kann einen React aufheben, Alter kann das gerade gespielte Sense aufheben und Sense kann Alter kontern. Kosten für bereits angesagte Reacts bleiben bezahlt. Weitere Reacts mit Deploy, Besatzung oder Sonderbewegung bleiben in der TODO-Liste. [Advanced Rulebook, Kapitel 1](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=14) · [Advanced Rulebook, Reacts](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=170)

Die Engine prüft die drei Life-Force-Stapel nach der Auflösung einer Aktion. Ein mehrstufiger Force-Verlust wird vor der Entscheidung vollständig abgewickelt. Bei gleichzeitiger Erschöpfung beider Life Forces endet die Lernpartie mit einer eigenen Anzeige und ohne festgelegten Gewinner. Die Premiere-Quelle bestätigt die Erschöpfung als Verlustbedingung, für die gleichzeitige Erschöpfung bleibt die Wertung offen. [Decipher-Regelwerk, Life Force](https://res.starwarsccg.org/rules/rulebookv2.pdf#page=3)

## Locations, Presence und Force

Die gegnerische Fassung einer Location wird auf dieselbe Position gelegt. Einheiten und weiterhin gültige Effekte behalten ihre Referenz. Die frühere Location liegt unter der neuen. Revolution beeinflusst die aktiven Force-Icons und vertauscht die Seiten der bereits unterstützten Ortsregeln. Der Karteninspektor zeigt die wirksamen Icons, die Fassungen und die Ortsbedingungen. [Decipher-Glossar, Converting Locations](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=40) · [Advanced Rulebook, Locations](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=84)

Anwesende Figuren und Figuren in einem geschlossenen Fahrzeug können zur Presence am Ort beitragen. Ein Undercover-Spion trägt dort keine Presence bei und hindert die Gegenseite trotzdem am Force Drain. Eine kontrollierte Location mit bekannten Icons darf für null drainen und kann dabei Antworten auslösen. V2 berechnet den Betrag nach den Antworten neu. [Advanced Rulebook, Control, Presence und Force Drains](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=41)

Force-Verluste kommen aus der Hand oder von einer erlaubten Stapelspitze. Retrieval legt die oberste oder ausdrücklich gewählte Karte aus dem Lost Pile offen und verschiebt sie in die Used Pile. V2 unterstützt die Lost-Pile-Funktion von Han’s Back, Leia’s Back, Luke’s Back, Return Of A Jedi und The Empire’s Back. Die Suchfunktion dieser Karten und weitere Karteneffekte bleiben offen. Die festen Starterdecks verwenden weiterhin ihre bisherigen Listen. [Decipher-Glossar, Retrieve](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=113) · [Advanced Rulebook, Losing Force](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=10)

## Einheiten und Bewegung

Bei der Auswahl eines Sternjägers bietet die Playmat den gemeinsamen Deploy mit einem geeigneten Piloten an. An einer Docking Bay kann der Sternjäger auch ohne Pilot stehen. Besatzung und Fracht bleiben beim Wechsel des Ortes an Bord. Fahrer, Piloten und Astromechs werden aus den gedruckten Kapazitäten und Kandidaten geprüft. Bei Verlust eines Trägers werden Anhänge und Insassen separat abgelegt. Bantha-Passagiere steigen am Ort aus. [Advanced Rulebook, Starships und Vehicles](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=89)

Landspeed folgt der Site-Reihenfolge innerhalb derselben Gruppe. Lift Tubes bleiben auf mobilen Innen-Sites. Hyperspeed erfordert einen passenden Nav Computer oder Astromech, einen aktiven Piloten und ausreichende Reichweite. Landen und Starten sind an Docking Bays kostenlos. TIEs brauchen eine Docking Bay. Die Oberfläche bietet einzelne oder alle berechtigten Einheiten für Docking-Bay-Transit und jeweils eine Karte pro Andocktransfer an. Weitere Spezialfälle stehen in der TODO. [Advanced Rulebook, Movement](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=66)

## Battle, Destiny und Schadensauflösung

Nach der Ansage und möglichen Reacts beginnt die initiierende Seite das Waffen-Segment. Im Power-Segment entscheiden beide Seiten über ihre Battle-Destiny-Draws. V2 legt aufgedeckte Destiny-Karten nach der Auflösung in die Used Pile. Han Solo kann einen Draw neu ziehen, und Tarkin kann mit Vader einen gegnerischen Draw aufheben. Power Destiny verändert die Gesamt-Power, Attrition Destiny die Attrition. Ein tatsächlich gezogener Wert von null kann Attrition begründen. [Advanced Rulebook, Battle und Destiny](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=53)

V2 friert die Attrition-Immunität beim Beginn des Damage-Segments ein. Spieler und Bot wählen abwechselnd Forfeit, Force Loss oder Passen. Ein Forfeit kann gleichzeitig Attrition und Battle Damage decken. Ein Treffer macht den Forfeit verpflichtend, die Seite darf vorher andere legale Schadensaktionen ausführen. Nach zwei zulässigen aufeinanderfolgenden Pässen endet der Kampf. Manuelle Regler sind vor Spielbeginn über „Battle-Lernübung“ wählbar. [Advanced Rulebook, Damage und Immunität](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf#page=56)

## Premiere-Waffen

V2 prüft Träger, Ziel, physische Anwesenheit, Reichweite und Einsatzkosten der 25 Premiere-Waffen. Ein Fernschuss mit einem Assault Rifle darf von einer Nachbar-Site auf ein Ziel im laufenden Kampf erfolgen. Das Light Repeating Blaster Rifle benötigt eine anwesende Energiequelle und bezahlt jeden Folgeschuss separat, bevor der Gegner die Aktionspriorität erhält. Bei Waffen ohne Spezialeffekt bleibt der Treffer bis zum Damage-Segment bestehen. Ion Cannon entfernt Schiffswaffen sofort und setzt die wirksame Verteidigung und Hyperspeed auf null. [Decipher-Glossar, Waffen und Ion Weapons](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=76) · [Decipher-Glossar, Fernwaffen](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=88)

Bei vergrabenen Karten sehen beide Seiten nur die Zahl der Karten. Beim Betreten oder Kreuzen des Ortes werden sie aufgedeckt. Offene Timer Mines lösen zu Beginn des nächsten eigenen Zugs aus. Die Seite der betroffenen Charaktere wählt die Verluste. Für Seeker wählt ihre Seite das Ziel, wenn mehrere Charaktere passen. V2 bietet normale Waffenübertragungen, Blaster Rack, Disarmed, Overload und Entschärfen an. Die versionierten 60-Karten-Listen bleiben erhalten. Die Deckprüfung akzeptiert alle 25 Waffen, wenn sie in einer lokalen Deckliste stehen. [Decipher-Glossar, Mining Droids](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=91) · [Decipher-Glossar, Seekers](https://res.starwarsccg.org/rules/swccgglossary.pdf#page=118)

## Kartenfassungen und Errata

Die feste [Players-Committee-Revision `65cd150`](https://github.com/swccgpc/swccg-card-json/tree/65cd150d20634447a5499d763ac324436158c7a8) liefert den **aktiven Referenztext**. Ihre 324 aktiven Front-Datensätze entsprechen dem vorherigen Trainer-Snapshot. Für jede der 139 Markierungen (`E1` 138-mal, `D-E1` einmal) weist der Prüfbericht den Korrekturslip, den Druckscan und die Entscheidung aus. Der Trainer verwendet die korrigierte Fassung als Referenz, weil der Slip derselben Premiere-Karte und der festgeschriebenen Revision zugeordnet ist. Ein übernommener Referenztext wird erst mit einer konkreten Regel und einem Test automatisch gespielt.

Der Karteninspektor zeigt den aktiven Spieltext, den verlinkten Druckscan, Lore und vorhandene deutsche Erklärungen getrennt. Drucktranskriptionen brauchen im lokalen Notizdatensatz eine Zuordnung zum Scan. Der aktuelle Import enthält 324 Scan-Links und keine als Originaldruck verifizierte Volltexttranskription. Die offiziellen Vor-Errata-Dateien verknüpfen für Premiere eine frühere Textfassung mit **Nevar Yalnal** (`Dark:1767`, frühere Quell-ID `20016`). Der Katalog kennzeichnet die Änderung vom 1. Februar 2023 als Klarstellung. V2 zeigt die frühere Fassung als solche an. [DarkPreErrata.json in der fixierten Revision](https://github.com/swccgpc/swccg-card-json/blob/65cd150d20634447a5499d763ac324436158c7a8/DarkPreErrata.json)

Die Datenprüfung unterscheidet gedruckte Zahlen einschließlich `0`, fehlende Werte, unbekannte Werte und Sonderzeichen wie `*`. Kartendaten führen Typ, Untertyp, Personas, Merkmale, Einzigartigkeit, Icons, Parsec und die bekannten numerischen Werte als eigene Felder. Eine Regel kann einen Sonderwert explizit auflösen, etwa EG-6s Battle Destiny. [Datenmodell](engine/premiere-data.js)

## Lokaler Import und Prüfbericht

Der Import verifiziert SHA-256 für die vier Eingabedateien und prüft Edition, Kartenseiten, Karten-IDs, Errata-Quellen und beide Decks. Erst danach ersetzt er `data/premiere.json` atomar. Der Legacy-Aufruf über Python leitet an denselben Node-Importer weiter. GitHub überprüft Daten und Tests mit Leserechten.

```powershell
node scripts/import_premiere.mjs --check
node scripts/import_premiere.mjs --report
node scripts/import_premiere.mjs --verify-source
node scripts/import_premiere.mjs
node --test
```

`--check` validiert den lokalen Snapshot und die Decks. `--report` liefert den JSON-Prüfbericht für die lokale Revision. `--verify-source` baut den Snapshot aus den festgeschriebenen Quellen neu und vergleicht ihn mit der versionierten Datei. Der Aufruf ohne Option ersetzt die Datei nach erfolgreicher Prüfung. `--verify-source` und der Aufruf ohne Option laden die Quellen herunter.

Die [Decklisten](data/premiere-starter-decks.json) werden in V2 mit denselben Regeln wie im Import geprüft. Jede Liste enthält 60 Karten der richtigen Seite, prüfbare Startoptionen und aktuell ausspielbare Kartentypen. Der Startbildschirm kennzeichnet Karten mit offenen oder teilweise umgesetzten Texten.
