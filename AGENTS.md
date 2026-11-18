# Projektregeln

- Vor jeder Entwicklung sowie vor Fetch oder Branchwechsel `git status --short --branch --untracked-files=all` prüfen. Ungesicherte Änderungen erhalten.
- Neue Änderungen auf einem eigenen `codex/`-Branch vom aktuellen Entwicklungsstand entwickeln. Den älteren main-Stand nicht als Basis verwenden. Niemals direkt auf main pushen, keine Force-Pushes und keine automatischen Merges.
- Nach Codeänderungen beide Katalogprüfungen, `node --test` und `npm run test:browser` ausführen. Fertige Schritte committen, pushen und per Pull Request gegen den bisherigen Entwicklungsstand dokumentieren. Commits, Testergebnisse und offene Fehler festhalten.
- Nach bestandenen Tests die Änderungen ohne erneute Veröffentlichungsfrage direkt auf **https://www.starwarsccg.de/** bei ALL-INKL veröffentlichen und die öffentliche Funktion prüfen. GitHub Pages ist eine zusätzliche Vorschau und ersetzt die Veröffentlichung auf der eigenen Domain nicht.
- Den statischen Builder und die Upload-Reihenfolge aus `docs/ALL_INKL.md` verwenden. Nur das geprüfte Release übertragen, Zielverzeichnis vorher kontrollieren, bestehende Hash-Dateien für offene Partien erhalten. Keine fremden Domain-Verzeichnisse ändern.
- SSH-Zugang: `ssh-w01d94d2@w01d94d2.kasserver.com`, Schlüssel auf dem Laptop unter `~/.ssh/starwarsccg_allinkl`. Privaten Schlüssel niemals lesen, ausgeben, ins Repository übernehmen oder als GitHub-Secret übertragen. Der öffentliche Upload benötigt keine Datenbank.
- Genau 16 geprüfte Premiere-Drucktexte sind öffentlich. Die übrigen **308 bleiben privat außerhalb des Repositorys auf dem Laptop**. Keine privaten Prüfdateien lesen, kopieren oder veröffentlichen.
- Stabilität und flüssiges Spielen haben Vorrang. Sammlerlisten und künftige Editionen dürfen keine zusätzlichen Downloads beim Spielstart verursachen. Eine Sammlerliste ist keine Freigabe ihrer Kartenregeln für den Trainer.
- Temporäre eigene Prozesse und Recherche-Tabs nach Verwendung schließen. Nutzer-Tabs und andere Chats erhalten.
