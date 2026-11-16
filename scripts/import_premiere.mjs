import {createHash, randomUUID} from 'node:crypto';
import {readFile, rename, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import premiere from '../engine/premiere-data.js';

const {SOURCE, REVISION, EDITION, SIDES, readCatalog, readStarterDecks, buildAudit} = premiere;
const snapshotPath = new URL('../data/premiere.json', import.meta.url);
const deckPath = new URL('../data/premiere-starter-decks.json', import.meta.url);
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

export function buildSnapshot(inputs, notes) {
  const cards = SIDES.flatMap(side => {
    const modern = inputs[`${side}.json`]?.cards;
    const earlier = inputs[`${side}PreErrata.json`]?.cards;
    if (!Array.isArray(modern) || !Array.isArray(earlier)) throw new Error(`${side}: Quelldatei ohne Kartenliste.`);
    const priorOf = new Map(earlier.filter(card => card.set === EDITION && card.side === side).map(card => [card.id, card]));
    return modern.filter(card => String(card.set) === EDITION).map(card => {
      if (card.side !== side || card.legacy !== false || !card.printings?.some(printing => printing.set === EDITION)) {
        throw new Error(`${side}:${card.id}: Kartenseite, Edition oder Druckauflage stimmt nicht.`);
      }
      const previous = priorOf.get(card.previousId);
      if (card.previousId != null && (!previous || previous.nextId !== card.id)) throw new Error(`${side}:${card.id}: ältere Fassung nicht eindeutig verknüpft.`);
      return buildRecord(card, previous, notes);
    });
  });
  const ids = new Set(cards.map(card => card.id));
  for (const id of Object.keys(notes)) if (!ids.has(id)) throw new Error(`Kartennotiz verweist auf unbekannte ID ${id}.`);
  return {schema: 2, source: SOURCE, revision: REVISION, edition: EDITION, cards};
}

async function replaceSnapshot(snapshot) {
  const temporaryPath = fileURLToPath(snapshotPath) + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporaryPath, serialize(snapshot), {encoding: 'utf8', flag: 'wx'});
    await rename(temporaryPath, snapshotPath);
  } finally {
    await rm(temporaryPath, {force: true});
  }
}

async function main(args) {
  if (args.length > 1 || (args.length && !['--check', '--report', '--verify-source'].includes(args[0]))) {
    throw new Error('Aufruf: node scripts/import_premiere.mjs [--check | --report | --verify-source]');
  }
  const [mode] = args;
  const downloads = mode === undefined || mode === '--verify-source';
  const [snapshot, definition] = await Promise.all([
    downloads ? Promise.all([downloadInputs(), readJson(notesPath)]).then(([inputs, notes]) => buildSnapshot(inputs, notes)) : readJson(snapshotPath),
    readJson(deckPath)
  ]);
  const catalog = readCatalog(snapshot);
  const decks = readStarterDecks(definition, catalog);
  const audit = buildAudit(catalog, decks);
  if (mode === '--report') {
    process.stdout.write(serialize({inputsSha256: SHA256, ...audit}));
    return;
  }
  if (mode === '--verify-source' && serialize(snapshot) !== serialize(await readJson(snapshotPath))) {
    throw new Error('Der versionierte Snapshot weicht vom reproduzierten Quelldatensatz ab.');
  }
  if (mode === undefined) await replaceSnapshot(snapshot);
  console.log(`Premiere ${REVISION}: 162 Light + 162 Dark, 2 × 60 Deckkarten, ${audit.errata.length} Errata-Einträge geprüft.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
