# Veröffentlichung auf www.starwarsccg.de

## Architekturentscheidung

Der Einzelspieler-Trainer bleibt zunächst eine statische Website. HTML, CSS, JavaScript und geprüfte JSON-Kataloge genügen für das Spiel gegen den Bot. Die Regeln, Zufallsfolge und Entscheidungen laufen im Browser; Autosaves liegen im Browserprofil des Spielers. Auf dem Webspace werden weder PHP noch ein laufender Node-Server für den Trainer benötigt.

**Eine Datenbank ist für weitere Editionen keine Voraussetzung.** Die jetzigen Kataloge umfassen zusammen etwa 807 KB unkomprimiert. Das vollständige erste Veröffentlichungspaket einschließlich Engine und Anleitungen liegt bei etwa 403 KiB gzip (ohne externe Kartenbilder). Die genaue Größe steht im Buildbericht und in `release.json`; sie ist kein gemessener Netzwerk- oder Ladezeitwert.

Für spätere Editionen:

1. Jede Edition erhält ihren eigenen Katalog, ihre Regeln, Deckdefinitionen und Prüfungen.
2. Vor größerem Ausbau den Startbildschirm von den vollständigen Katalogen entkoppeln: kleine Deck-/Cover-Metadaten zuerst, benötigte Kataloge und Regelmodule beim Wählen eines Formats laden. Aktuell lädt V2 noch beide vorhandenen Kataloge beim Start.
3. Große Listen virtualisieren bzw. seitenweise anzeigen; Bilder bei Bedarf laden. Die Deck-Cover werden bereits verzögert geladen.
4. Bot- und Replay-Rechenzeit messen. Bei belegten längeren Blockierungen die Ausführung unter Beibehaltung der deterministischen Reihenfolge aufteilen oder in einen Web Worker verlagern.
5. Neue Editionen nur mit versionierten Regeln, Legalitätsprüfung und Autosave-/Replay-Tests freigeben. Bestehende Spielstände behalten ihren Regelstand.

Eine serverseitige API mit Datenbank wird sinnvoll, wenn Benutzerkonten, geräteübergreifende Spielstände/Sammlungen oder Online-Mehrspieler hinzukommen. Eine spätere Sammler-Kartenliste kann zunächst ebenfalls aus statischen Katalogen bestehen; persönliche Bestände könnten lokal gespeichert werden. Eine Datenbank allein beschleunigt weder Bot-Entscheidungen noch den Bildaufbau im Browser.

## Paket bauen und prüfen

Aus einem sauberen Entwicklungsbranch, niemals direkt aus main:

```powershell
node scripts/import_premiere.mjs --check
node scripts/import_premiere.mjs --edition a-new-hope --check
node --test
npm run test:browser
node scripts/build-web.mjs --output dist/all-inkl-release
```

Das Ausgabeverzeichnis muss leer sein. Für ein weiteres Release einen neuen Verzeichnisnamen verwenden. Der Builder kopiert ausschließlich freigegebene Dateien, kompaktiert JSON, vereinheitlicht Zeilenenden und versieht CSS, Engine und Daten mit einem Inhalts-Hash. HTML verweist auf genau diese Dateien. `release.json` enthält Version, Releasekennung, Prüfsummen und Größen. Keine privaten Berichte, Schlüssel, Repository-Metadaten oder Testdateien werden übernommen.

GitHub Actions prüft zusätzlich beide Browserabläufe und stellt dasselbe Paket als Artefakt **all-inkl-web-release** bereit. Die bisherige GitHub-Pages-Vorschau verwendet ebenfalls den Paket-Builder. Ein Push löst keinen Upload zu ALL-INKL aus; der ALL-INKL-Zugang muss dafür separat eingerichtet sein. Kein direkter main-Push, Force-Push oder automatischer Merge.

## ALL-INKL einrichten

Domain und HTTPS sind laut Betreiber bereits eingerichtet. Das bestätigte SSH-Webverzeichnis ist `/www/htdocs/w01d94d2/starwarsccg.de/`; im KAS ist das Domainziel `/starwarsccg.de/`. Vor jedem weiteren Upload das Ziel erneut lesend prüfen. Keine Dateien in andere Domain-Verzeichnisse hochladen.

Im KAS müssen `starwarsccg.de` und `www.starwarsccg.de` auf dasselbe dedizierte Webverzeichnis zeigen. Für beide Hostnamen ein gültiges Zertifikat aktivieren. Die mitgelieferte `.htaccess` leitet auf `https://www.starwarsccg.de` um. Mail- und andere DNS-Einträge nicht verändern.

### SSH-Schlüssel

Auf dem Laptop einen eigenen Schlüssel erstellen; einen vorhandenen Schlüssel nicht überschreiben:

```powershell
ssh-keygen -t ed25519 -a 100 -f "$env:USERPROFILE\.ssh\starwarsccg_allinkl"
Get-Content "$env:USERPROFILE\.ssh\starwarsccg_allinkl.pub" | Set-Clipboard
```

Den öffentlichen Schlüssel unter **KAS → Tools → SSH-Zugänge → Benutzer bearbeiten → SSH-Schlüssel** als eigene Zeile hinzufügen, vorhandene Schlüssel erhalten und SSH aktivieren. Der private Schlüssel bleibt außerhalb des Repositorys auf dem Laptop. Eine gesetzte Passphrase beim lokalen Verbindungsaufbau eingeben oder den Schlüssel in einen bereits eingerichteten lokalen SSH-Agent laden. Zugangsdaten nicht im Chat, Repository oder Buildpaket speichern.

### Upload und Rollback

1. Verbindung und absolutes Zielverzeichnis lesend prüfen. Vorhandene Website-Dateien vor dem ersten Überschreiben außerhalb des öffentlichen Verzeichnisses sichern; eine bestehende `.htaccess` prüfen.
2. Nur den **Inhalt des gebauten Release-Verzeichnisses** per SFTP hochladen. Nie den Repository-Ordner hochladen und keine Synchronisation mit Löschen aktivieren.
3. Zuerst die versionierten Dateien unter `assets/`, `engine/` und `data/` sowie die Datenlizenz übertragen. Alle Transfers auf Erfolg prüfen.
4. Danach Anleitungsseiten und `v2.html`, zuletzt `index.html` sowie `release.json` aktualisieren. `.htaccess` beim ersten Deployment nach Prüfung übernehmen. Alte Hash-Dateien zunächst erhalten: offene Browser-Tabs können sie noch benötigen. Der Upload ist kein atomarer Austausch der gesamten Website; die versionierten Referenzen verhindern vermischte Engine-/Datenstände.
5. Bei Fehlern vor dem HTML-Schritt die bisherigen Seiten erhalten. Nach dem HTML-Schritt gegebenenfalls die gesicherten HTML-Dateien und die vorherige Releasekennung zurückspielen. Alte Assets nicht löschen, solange ein Rückgriff noch nötig ist.

### Nach der Veröffentlichung

- Startseite, alle Anleitungen und V2 unter HTTPS prüfen; auch die Weiterleitung von HTTP und der Domain ohne www.
- Einen neuen Premiere- und einen Mischformat-Start sowie Speichern und Fortsetzen ausprobieren.
- `release.json` mit dem gebauten Paket vergleichen. Im Netzwerk prüfen: HTML wird revalidiert, Hash-Dateien tragen `Cache-Control: public, max-age=31536000, immutable`; Textdateien werden bei passender Browser-Anfrage komprimiert.
- Eine typische Erstladung und Wiederholung auf Laptop und Mobilgerät messen. Externe Kartenbilder separat betrachten; deren Verfügbarkeit und Übertragungszeit hängen weiterhin vom Bildserver ab. Eigene Bildkopien erst nach geklärter öffentlicher Nutzung ergänzen.
- `/local-print-texts.json`, private Prüfdateien und Repository-Metadaten dürfen nicht öffentlich abrufbar sein. Der öffentliche Pakettest verlangt genau 16 Premiere-Drucktexte. Die übrigen 308 bleiben unverändert privat auf dem Laptop.

## Browser-Spielstände beim Domainwechsel

Browser-Speicher ist an die Origin gebunden. Ein auf GitHub Pages gespeicherter Spielstand erscheint auf der neuen Domain nicht automatisch. Die alte Adresse daher als Übergang erhalten. Der bereits geplante Export laufender Partien wäre eine bequeme spätere Umzugshilfe; vorhandene Szenario-Dateien lassen sich über „Szenario laden“ öffnen. Nicht behaupten, dass die Domainumstellung bestehende Autosaves überträgt.

## Quellen

- [ALL-INKL: öffentlichen SSH-Schlüssel im KAS hinterlegen](https://all-inkl.com/wichtig/anleitungen/kas/ssh/dateiverwaltung/verbindung-mit-terminal-auf-mac-aufbauen-public-key-verfahren_432.html)
- [ALL-INKL: Let's-Encrypt-Zertifikat einbinden](https://all-inkl.com/wichtig/anleitungen/kas/ssl-protection/ssl-certificate/how-to-install-a-lets-encrypt-certificate_470.html)
- [Apache: Komprimierung mit mod_deflate](https://httpd.apache.org/docs/2.4/mod/mod_deflate.html)
- [MDN: HTTP-Caching und versionierte Ressourcen](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

## Erste Veröffentlichung

Am 18.11.2026 wurde **V2.15.38**, Release **6d55720487d2ea1a**, auf [www.starwarsccg.de](https://www.starwarsccg.de/) veröffentlicht. Der KAS-Redirect auf GitHub Pages wurde durch das Domainziel `/starwarsccg.de/` ersetzt. Die zugehörige ältere WordPress-Installation wurde auf ausdrücklichen Wunsch nach einer geprüften privaten Sicherung außerhalb des öffentlichen Webverzeichnisses gelöscht. Das Zertifikatsverzeichnis `.well-known` blieb erhalten. Es wurde keine Datenbank gelöscht.

Abnahme:

- 605 Node-Tests, beide Daten-/Deckprüfungen und beide lokalen Chrome-Browserprüfungen bestanden. Auch die neuen GitHub-Push- und PR-Workflows mit Chromium waren erfolgreich.
- Alle 28 per SFTP übertragenen Dateien stimmen auf dem Server per SHA-256 mit dem geprüften Paket überein. Das öffentliche `release.json` nennt dieselbe Releasekennung.
- Öffentliche Startseite, alle fünf Anleitungsseiten und beide Spielformate funktionieren. Neue Light-Side-Premiere- und Dark-Side-Mischpartien wurden bis zur Starthand begonnen und nach Browser-Neuladen mit identischen Seed-, Aktions- und Revisionsdaten fortgesetzt.
- Die beiden V2-Aufrufe waren in dieser Abnahme nach rund 1,0 Sekunden startbereit. Das ist eine Messung aus dieser Verbindung und kein allgemeines Ladezeitversprechen; weitere Geräte- und Netzbedingungen bleiben separat zu messen.
- Hash-Ressourcen werden mit einem Jahr Cache-Laufzeit und `immutable` ausgeliefert, HTML mit `no-cache`; gzip wurde auf dem öffentlichen Server nachgewiesen.
- Private Drucktext-Dateien, Git-Metadaten und die alten WordPress-Einstiege waren im öffentlichen Abruf nicht verfügbar. Genau 16 Drucktexte stehen im Paket; die übrigen 308 bleiben privat.
