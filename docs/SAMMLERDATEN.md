# Editionen und Kartenlisten

Die öffentliche Seite `editionen.html` umfasst **27 klassische Decipher-Veröffentlichungen (1995–2001)** mit Erstveröffentlichung, Kategorie, Standardkartenanzahl, alternativen Bildern und zusätzlichen Foils. **26 Kartenlisten mit 2.557 Einträgen** sind lokal durchsuchbar. Vorschaudrucke können erneut unter ihrer späteren Erweiterung erscheinen; die Summe bezeichnet Listeneinträge, nicht 2.557 unterschiedliche Spielkarten.

Nur Premiere und A New Hope sind im Trainer freigegeben. Das Anzeigen anderer Editionen im Sammlerarchiv schaltet weder deren Spielregeln noch neue Deckformate frei. Bestandsverwaltung, Preise, japanische Auflagen und eine vollständige Variantenverwaltung sind nicht Bestandteil dieser Änderung.

## Quellen und Genauigkeit

- Erscheinungsdaten, Veröffentlichungsumfang und Grundzahlen: [Sammlerübersicht des Players Committee](https://www.starwarsccg.org/collecting/), geprüft am 18.11.2026.
- Namen, Spielseiten, Typen, Seltenheitskürzel, Katalog-IDs und Scan-URLs: [swccgpc/swccg-card-json](https://github.com/swccgpc/swccg-card-json/tree/65cd150d20634447a5499d763ac324436158c7a8), unverändert fixierte Revision `65cd150d20634447a5499d763ac324436158c7a8`. Die beiden Quelldateien werden per SHA-256 geprüft; die MIT-Lizenz bleibt im Webpaket.
- Varianten und Folien: [Originalcheckliste v4.0](https://res.starwarsccg.org/Resources/swccgcardlist4.0.pdf). Reflections II führt neben 100 regulären Foils fünf zusätzliche Box-Topper-Foils; diese Zahlen bleiben getrennt.
- Wo die Veröffentlichungsquelle nur Monat und Jahr nennt, wird kein Erscheinungstag ergänzt. Ein Datumsfeld `1995-12` erscheint beispielsweise als „Dezember 1995“.

Die Kartenlisten enthalten die Standardkarten und 27 AI-Varianten (je neun aus Tatooine, Coruscant und Theed Palace). Beim reinen Reflections-Foil-Set führt die Seite unmittelbar zur vollständigen Originalcheckliste, Seiten 28–30. Zusätzliche Foil-Drucke aus Endor, Reflections II und III werden ebenfalls über diese Checkliste erschlossen; sie sind ausdrücklich keine zusätzlichen Zeilen in den lokalen Standardkartenlisten.

Der Import berücksichtigt `printings` statt ausschließlich des primären Sets, damit beide Anthology-Vorschaulisten vollständig bleiben. „Hindsight (Readable)“ ist eine zusätzliche Bildschirmdarstellung derselben Cloud-City-Karte und wird nicht als weiterer Druck gezählt. AI-Karten bleiben eigene Einträge. Die Katalog-ID ist eine Datenreferenz und wird nicht als aufgedruckte Sammlernummer bezeichnet.

## Privatheit und Ladeverhalten

Die Sammlerdaten enthalten nur freigegebene Metadaten und Bildlinks: keine Originaldruck-Transkriptionen, aktiven Spieltexte, privaten Prüfberichte oder Zugangsdaten. Die 308 privaten Drucktexte werden weder gelesen noch kopiert. Die 16 öffentlichen Transkriptionen bleiben ausschließlich im bisherigen öffentlichen Spielkatalog.

Die Startseite lädt weiterhin keine Kataloge oder Engine. Das Sammlerarchiv lädt ein kleines Editionsregister und ausschließlich die ausgewählte Kartenliste, hält bereits geladene Listen im Speicher und zeigt höchstens 40 Tabellenzeilen gleichzeitig. Scans werden erst beim Öffnen des Karten-Popups angefordert. Die V2-Spielseite lädt keine Sammlerdaten.

Der Web-Builder versioniert auch Sammlerdaten mit Inhalts-Hashes. Das Editionsregister verweist im fertigen Paket auf die passenden Hash-Dateien. Die bestehende Grenze von 600 KiB gzip für das gesamte eigene Webpaket bleibt erhalten.

## Prüfung und Aktualisierung

```powershell
node scripts/import-collectors.mjs --check
node scripts/import-collectors.mjs --verify-source
node --test
npm run test:browser
```

`--check` arbeitet offline und prüft Anzahl, IDs, freigegebene Datenfelder und Dateipfade. `--verify-source` vergleicht zusätzlich jede Listenzeile mit den fixierten öffentlichen Quelldateien. Es verändert keine Kataloge. Bei einer Quellenaktualisierung beide Hashes, Metadaten, Zählungen und Prüffälle bewusst gemeinsam aktualisieren; keinen ungeprüften Live-Katalog verwenden.
