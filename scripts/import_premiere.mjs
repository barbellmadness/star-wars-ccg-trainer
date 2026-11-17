import {createHash, randomUUID} from 'node:crypto';
import {readFile, rename, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import premiere from '../engine/premiere-data.js';

const {SOURCE, REVISION, EDITION, A_NEW_HOPE, EDITIONS, SIDES, readCatalog, readSupplementalCards, readStarterDecks, readThemedDecks,
  isGarrisonExpansionCard, isReleasedExpansionCard, readFormatDeckChoices, buildAudit} = premiere;
const snapshotPaths = {
  [EDITION]: new URL('../data/premiere.json', import.meta.url),
  [A_NEW_HOPE]: new URL('../data/a-new-hope.json', import.meta.url)
};
const deckPath = new URL('../data/premiere-starter-decks.json', import.meta.url);
const themesPath = new URL('../data/premiere-themed-decks.json', import.meta.url);
const formatDecksPath = new URL('../data/play-format-decks.json', import.meta.url);
const notesPath = new URL('../data/premiere-card-notes.json', import.meta.url);
const SHA256 = {
  'Light.json': 'bff27dcde1cad712c6fce6f3fddc17d062bf25ade60a2720ccc5977adcb38c32',
  'Dark.json': 'e153c31cf67846e4536581e59c4975dc6e9d7cc6abf5a4bc6170bedae3163539',
  'LightPreErrata.json': '9c698756276356b4cc2848e3b4850f61f6c030b86c536733eb5f8df247599edf',
  'DarkPreErrata.json': '449b69e61596c528e740699a33b60b502fddb7f1dac3dc2c7e84d0b1adc30f58'
};
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const serialize = value => JSON.stringify(value, null, 2) + '\n';

async function downloadInputs() {
  const base = `https://raw.githubusercontent.com/${SOURCE}/${REVISION}/`;
  const inputs = await Promise.all(Object.entries(SHA256).map(async ([name, sha]) => {
    const response = await fetch(base + name, {signal: AbortSignal.timeout(45_000)});
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== sha) throw new Error(`${name}: SHA-256 stimmt nicht überein.`);
    return [name, JSON.parse(bytes.toString('utf8'))];
  }));
  return Object.fromEntries(inputs);
}

function buildRecord(card, previous, notes) {
  const front = card.front;
  if (!front || typeof front !== 'object' || Array.isArray(front)) throw new Error(`Fehlende Kartenfront für ${card.side}:${card.id}.`);
  const id = `${card.side}:${card.id}`;
  const record = {
    id, sourceId: card.id, side: card.side,
    name: front.title ?? null, type: front.type ?? null, subType: front.subType ?? null,
    power: front.power ?? null, ability: front.ability ?? null, deploy: front.deploy ?? null,
    forfeit: front.forfeit ?? null, destiny: front.destiny ?? null, gametext: front.gametext ?? null,
    lore: front.lore ?? null, image: front.imageUrl ?? null, lightSideIcons: front.lightSideIcons ?? null,
    darkSideIcons: front.darkSideIcons ?? null, icons: front.icons ?? null, rawFront: front,
    set: card.set, gempId: card.gempId
  };
  if (card.personas) record.personas = card.personas;
  const note = notes[id];
  if (note?.explanationDe != null) record.explanationDe = note.explanationDe;
  if (note?.printText != null) {
    if (note.printSource !== front.imageUrl) throw new Error(`${id}: Drucktranskription ist keinem Kartenbild zugeordnet.`);
    record.printText = note.printText;
    record.printSource = note.printSource;
  }
  if (previous) record.preErrata = {
    sourceId: previous.id,
    gametext: previous.front?.gametext ?? null
  };
  return record;
}

export function buildSnapshot(inputs, notes, edition = EDITION) {
  const cards = SIDES.flatMap(side => {
    const modern = inputs[`${side}.json`]?.cards;
    const earlier = inputs[`${side}PreErrata.json`]?.cards;
    if (!Array.isArray(modern) || !Array.isArray(earlier)) throw new Error(`${side}: Quelldatei ohne Kartenliste.`);
    const priorOf = new Map(earlier.filter(card => card.set === edition && card.side === side).map(card => [card.id, card]));
    return modern.filter(card => String(card.set) === edition).map(card => {
      if (card.side !== side || card.legacy !== false || !card.printings?.some(printing => printing.set === edition)) {
        throw new Error(`${side}:${card.id}: Kartenseite, Edition oder Druckauflage stimmt nicht.`);
      }
      const previous = priorOf.get(card.previousId);
      if (card.previousId != null && (!previous || previous.nextId !== card.id)) throw new Error(`${side}:${card.id}: ältere Fassung nicht eindeutig verknüpft.`);
      return buildRecord(card, previous, notes);
    });
  });
  const ids = new Set(cards.map(card => card.id));
  for (const id of Object.keys(notes)) if (!ids.has(id)) throw new Error(`Kartennotiz verweist auf unbekannte ID ${id}.`);
  return {schema: 2, source: SOURCE, revision: REVISION, edition, cards};
}

async function replaceSnapshot(snapshot, snapshotPath) {
  const temporaryPath = fileURLToPath(snapshotPath) + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporaryPath, serialize(snapshot), {encoding: 'utf8', flag: 'wx'});
    await rename(temporaryPath, snapshotPath);
  } finally {
    await rm(temporaryPath, {force: true});
  }
}

async function verifyScanLinks(catalog) {
  const concurrency = 4;
  const failures = [];
  await Promise.all(Array.from({length: concurrency}, async (_, offset) => {
    for (let index = offset; index < catalog.length; index += concurrency) {
      const {id, name, images} = catalog[index];
      const url = images.print;
      try {
        if (!url) throw new Error('Scan-Link fehlt');
        const response = await fetch(url, {method: 'HEAD', signal: AbortSignal.timeout(15_000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Antwort liefert kein Bild');
      } catch (error) {
        failures.push({id, name, url, reason: error.message});
      }
    }
  }));
  failures.sort((a, b) => a.id.localeCompare(b.id));
  return {checked: catalog.length, reachable: catalog.length - failures.length, failures};
}

async function writeScanReport(catalog) {
  const report = await verifyScanLinks(catalog);
  process.stdout.write(serialize(report));
  if (report.failures.length) process.exitCode = 1;
}

function expansionReport(catalog) {
  return {
    source: SOURCE, revision: REVISION, edition: A_NEW_HOPE, inputsSha256: SHA256,
    cards: Object.fromEntries(SIDES.map(side => [side, catalog.filter(card => card.side === side).length])),
    cardsWithPrintScan: catalog.filter(card => card.images.print).length,
    cardsWithErrata: catalog.filter(card => card.errataSymbol).length,
    cardsWithHistoricalText: catalog.filter(card => card.texts.preErrata !== null).length,
    cardsInImperialGarrison: catalog.filter(isGarrisonExpansionCard).length,
    cardsReleased: catalog.filter(card => isReleasedExpansionCard(card)).length,
    cardsOpenForRuleReview: catalog.filter(card => !isReleasedExpansionCard(card)).map(card => ({
      id: card.id, gempId: card.gempId, side: card.side, name: card.name, type: card.type, subType: card.subType
    }))
  };
}

async function main(args) {
  let edition = EDITION;
  if (args[0] === '--edition' && args[1] === 'a-new-hope') {
    edition = A_NEW_HOPE;
    args = args.slice(2);
  }
  if (args.length > 1 || (args.length && !['--check', '--report', '--verify-source', '--verify-scans'].includes(args[0]))) {
    throw new Error('Aufruf: node scripts/import_premiere.mjs [--edition a-new-hope] [--check | --report | --verify-source | --verify-scans]');
  }
  const [mode] = args;
  const downloads = mode === undefined || mode === '--verify-source';
  const snapshotPath = snapshotPaths[edition];
  const snapshot = downloads ? buildSnapshot(await downloadInputs(), edition === EDITION ? await readJson(notesPath) : {}, edition) :
    await readJson(snapshotPath);
  const catalog = readCatalog(snapshot, edition);
  if (mode === '--verify-source' && serialize(snapshot) !== serialize(await readJson(snapshotPath))) {
    throw new Error('Der versionierte Snapshot weicht vom reproduzierten Quelldatensatz ab.');
  }
  if (edition === A_NEW_HOPE) {
    if (mode === '--verify-scans') return writeScanReport(catalog);
    const report = expansionReport(catalog);
    const [premiere, decks, themes, variants] = await Promise.all([
      readJson(snapshotPaths[EDITION]), readJson(deckPath), readJson(themesPath), readJson(formatDecksPath)
    ]);
    const base = readCatalog(premiere);
    readFormatDeckChoices('premiere', decks, themes, variants, base);
    const mixedDecks = readFormatDeckChoices('premiere-a-new-hope', decks, themes, variants, [...base, ...catalog]);
    const available = new Set([...mixedDecks.light, ...mixedDecks.dark].flatMap(({deck}) => deck.cards.map(card => card.id)));
    const omitted = catalog.filter(card => isReleasedExpansionCard(card) && !available.has(card.id));
    if (omitted.length) throw new Error('Freigegebene A-New-Hope-Karten ohne Deck: ' + omitted.map(card => card.id).join(', '));
    if (mode === '--report') {
      process.stdout.write(serialize(report));
      return;
    }
    if (mode === undefined) await replaceSnapshot(snapshot, snapshotPath);
    console.log(`${EDITIONS[edition].name} ${REVISION}: ${report.cards.Light} Light + ${report.cards.Dark} Dark, ${report.cardsReleased} freigegeben, ${report.cardsOpenForRuleReview.length} zur Regelprüfung.`);
    return;
  }
  const [definition, themeDefinitions, supplemental] = await Promise.all([
    readJson(deckPath),
    readJson(themesPath),
    readJson(new URL('../data/premiere-supplemental-cards.json', import.meta.url))
  ]);
  const decks = readStarterDecks(definition, catalog);
  const themes = readThemedDecks(themeDefinitions, [...catalog, ...readSupplementalCards(supplemental)]);
  const selectable = new Set([...decks.light.cards, ...decks.dark.cards,
    ...[...themes.light, ...themes.dark].flatMap(({deck}) => deck.cards)].map(card => card.id));
  const omitted = catalog.filter(card => !selectable.has(card.id));
  if (omitted.length) throw new Error('Premiere-Karten ohne auswählbares Deck: ' + omitted.map(card => card.id).join(', '));
  const audit = buildAudit(catalog, decks);
  if (mode === '--verify-scans') return writeScanReport(catalog);
  if (mode === '--report') {
    process.stdout.write(serialize({inputsSha256: SHA256, ...audit}));
    return;
  }
  if (mode === undefined) await replaceSnapshot(snapshot, snapshotPath);
  console.log(`Premiere ${REVISION}: 162 Light + 162 Dark, ${2 + themes.light.length + themes.dark.length} Decks à 60 Karten, ${audit.errata.length} Errata-Einträge geprüft.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
