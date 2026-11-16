# Git-Workflow für den Star Wars CCG Trainer

1. Prüfe vor jeder Entwicklungsaufgabe den aktiven Branch mit `git branch --show-current` und den Arbeitsbaum mit `git status --short --branch --untracked-files=all`. Ein leerer Branchname bedeutet, dass `HEAD` von einem Branch gelöst ist.
2. Prüfe den Arbeitsbaum unmittelbar vor `git fetch`, `git pull` oder einem Branchwechsel erneut. Bei uncommitteten Änderungen, einschließlich vorgemerkter und unversionierter Dateien, halte den Abruf oder Wechsel an und kläre, wie die Änderungen erhalten bleiben. Verwirf oder verstecke sie nicht eigenmächtig.
3. Lege für jede neue Funktion oder unabhängige Änderung einen eigenen Branch an. Hole bei sauberem Arbeitsbaum mit `git fetch origin` den aktuellen Stand. Erstelle den Entwicklungsbranch normalerweise mit `git switch -c codex/<thema> origin/main`, ohne `main` auszuchecken. Änderungen gehen über einen Pull Request mit grünen Tests nach `main`. Direktes Entwickeln, Committen oder Pushen auf `main` ist tabu.
4. Führe nach Codeänderungen die vollständige vorhandene Testsuite mit `node --test` aus. GitHub Actions verwendet dafür Node.js 22. Prüfe vor dem Commit mit `git diff` und `git diff --staged`, welche Änderungen du übernimmst.
5. Halte im Abschlussbericht oder Pull Request die Commit-IDs mit Kurzbeschreibung, den Testbefehl mit Ergebnis und alle offenen Fehler oder ausstehenden Prüfungen fest. Pushe Entwicklungsbranches ohne Force und führe Pull Requests manuell zusammen.

Für einen Premiere-Kartenimport wähle den Entwicklungsbranch beim manuellen Start des Import-Workflows aus. Prüfe den erzeugten Daten-Commit im Pull Request.
