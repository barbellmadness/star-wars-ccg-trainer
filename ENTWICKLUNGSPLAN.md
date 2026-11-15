# Technischer Entwicklungsplan – Star Wars CCG Premiere Trainer

Stand: 2026-11-15. Ziel: Browser-Spiel mit einem Bot und deutschsprachiger Lernführung, nach den ursprünglichen Premiere-Regeln. Nur Premiere (1995), keine Virtual Cards.

## Grundsätze
- Spielregeln sind keine frei interpretierbaren Designentscheidungen. Bei Konflikten das originale Premiere-Regelbuch und die für Premiere relevanten offiziellen Klarstellungen heranziehen. Ungeprüfte Regeln ausdrücklich als Übungsmodus kennzeichnen.
- Originalkartenbilder und Kartentexte aus den vorhandenen Players-Committee-Datensätzen; Bild-/Text-Nutzungsrechte vor öffentlicher Distribution klären.
- Kein gefälschter Kartentext, keine erfundenen Kartenwerte.
- Spielengine, Kartendaten, Bot und UI strikt trennen.
- Das bestehende `index.html` ist ein **vereinfachter, nicht originalgetreuer Prototyp**. Nicht als fertiges Premiere-Spiel bezeichnen.

## Architektur
- Vite + TypeScript + React
- `src/data/`: Premiere-Import, Schema-Validierung, eindeutige Karten-IDs, Karten-/Bildprüfung
- `src/engine/`: reine Zustandsübergänge, Legal-Action-Generator, Phasen und Timing, Force-Stapel, Locations, Battles, Damage, Destiny, Movement, Win/Loss
- `src/cards/`: registrierte individuelle Karteneffekte, explizite Abdeckung und Unsupported-Status
- `src/bot/`: regelbasierter Bot, verwendet ausschließlich erlaubte Informationen und Legal Actions
- `src/tutorial/`: deutsche Schrittanweisungen, Phasen-/Aktionshinweise, Kartenerklärungen mit Referenz zum englischen Originaltext
- `src/ui/`: Spielfeld, Stapel, Kartenviewer, History, Tutor
- `tests/`: Vitest, deterministische Seed-RNG und Regressionstests

## Etappe A – Daten & Reproduzierbarkeit
1. Beide JSON-Quellen importieren, nach `set === '1'` filtern.
2. Genau 162 Light + 162 Dark Datensätze, eindeutige IDs, Bilder und Werte prüfen.
3. Fehlende/mehrdeutige Texte und Bilder protokollieren. Originaltext und Lore unterscheiden.
4. Zwei explizite 60-Karten-Premiere-Starterdecks versionieren; Kartentypen und Kopien prüfen.
**Akzeptanz:** reproduzierbarer Import und 324 Datensätze mit Prüfbericht; keine zufälligen Fantasie-Decks.

## Etappe B – Regelengine
1. Turn-Struktur, Reserve/Force/Used/Lost, Force-Aktivierung und Umlauf nach Originalregel.
2. Location-Deployment, Force-Icons, Kontrolle/Besetzung und Force-Drain.
3. Character-Deployment und Einsatzbeschränkungen.
4. Battles: Initiierung, Power, Destiny, Attrition, Forfeit, Battle Damage.
5. Movement, Interaktion von Karten und Siegbedingung.
6. Interrupt/Effect/Weapon-Karten und Sonderfähigkeiten nur nach nachgewiesener Spezifikation.
**Akzeptanz:** jede Aktion über `legalActions(state,player)`; keine UI-seitige Regelentscheidung; getestete Beispielzüge aus Regelbuch.

## Etappe C – Lernspiel & Bot
1. Erstes Tutorial mit festgelegter Starterhand, Locations, Force und erklärten Aktionen.
2. Bot mit Legal Actions und sichtbarem Entscheidungsprotokoll; kein Zugriff auf verdeckte Spielerhand.
3. Pro Karte Originalbild, englischer Spieltext, deutsche verständliche Erklärung, Timing und Beispiel.
4. Drei Anfänger-Missionen, optionaler Hinweis-Modus, Undo nur in Tutorial.
**Akzeptanz:** eine komplette Partie mit reproduzierbarem Seed, Sieg/Niederlage, keine unerlaubten Aktionen.

## Etappe D – Browser-Release
- Desktop zuerst; mobile responsive ohne native App oder PWA.
- Automatisierte Tests, Browser-Smoke-Test, Accessibility, GitHub Pages Build.
- Release-Checkliste mit Liste unterstützter und nicht unterstützter Karten.

## Sofort nutzbarer Zwischenstand
`index.html` bietet eine **vereinfachte** Bot-Übung mit Kartenbildern, Decks, Phasen und geführter Demo. Sie erfüllt die obigen Akzeptanzkriterien noch nicht. Entwicklungspriorität: zuerst reproduzierbare Starterdecks und korrektes Force-System statt kosmetischer Erweiterungen.
