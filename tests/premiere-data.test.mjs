import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import premiere from '../engine/premiere-data.js';
import {buildSnapshot} from '../scripts/import_premiere.mjs';

const json = name => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const snapshot = json('premiere.json');
const definitions = json('premiere-starter-decks.json');
const {readCatalog, readStarterDecks, readThemedDecks, buildAudit, readCardValue} = premiere;

test('the checked-in catalog and starter decks validate against the pinned edition', () => {
  const catalog = readCatalog(snapshot);
  const decks = readStarterDecks(definitions, catalog);
  const audit = buildAudit(catalog, decks);
  assert.deepEqual(audit.cards, {Light: 162, Dark: 162});
  assert.equal(audit.cardsWithPrintScan, 324);
  assert.equal(audit.transcribedPrintTexts + audit.openPrintTexts.length, audit.cardsWithPrintScan);
  assert.equal(audit.errata.length, 139);
  for (const side of ['Light', 'Dark']) {
    assert.equal(audit.decks[side].cards, 60);
    assert.deepEqual(audit.decks[side].startingLocations, definitions.decks[side].startingLocations);
  }
  assert.ok(audit.errata.every(card => card.slip && card.activeText === 'pinned-front' && card.decision === 'accepted-as-reference-text'));
  const historical = catalog.filter(card => card.texts.preErrata !== null);
  assert.deepEqual(historical.map(card => [card.id, card.preErrataSourceId]), [['Dark:1767', 20016]]);
  assert.notEqual(historical[0].texts.preErrata, historical[0].texts.active);
  assert.equal(historical[0].texts.print, null);
});

test('linked print text is kept separate and the audit lists the remaining scans', () => {
  const catalog = readCatalog(snapshot);
  const audit = buildAudit(catalog, readStarterDecks(definitions, catalog));
  const notes = json('premiere-card-notes.json');
  const submittedPrints = Object.entries(notes).filter(([, note]) => note.printText != null);
  assert.equal(audit.transcribedPrintTexts, submittedPrints.length);
  assert.ok(submittedPrints.length > 0);
  for (const [id, note] of submittedPrints) {
    const card = catalog.find(card => card.id === id);
    assert.equal(card.texts.print, note.printText);
    assert.equal(card.images.print, note.printSource);
    assert.ok(!audit.openPrintTexts.some(item => item.id === id));
  }
  const unverified = catalog.find(card => card.id === 'Dark:1767');
  assert.ok(audit.openPrintTexts.some(item => item.id === unverified.id && item.printScan === unverified.images.print));
  const redOne = catalog.find(card => card.id === 'Light:2057');
  assert.match(redOne.texts.print, /Must have pilot aboard/);
  assert.doesNotMatch(redOne.texts.active, /Must have pilot aboard/);
});

test('both sides have four distinct, valid 60-card themed decks with playable starting locations', () => {
  const catalog = readCatalog(snapshot);
  const definitions = json('premiere-themed-decks.json');
  const sets = readThemedDecks(definitions, catalog);
  for (const side of ['light', 'dark']) {
    assert.equal(sets[side].length, 4);
    const lineups = sets[side].map(({deck}) => deck.cards.map(card => card.id).sort().join(','));
    assert.equal(new Set(lineups).size, 4);
    for (const {deck, definition} of sets[side]) {
      assert.equal(deck.cards.length, 60);
      assert.deepEqual([...new Set(deck.startingIndices.map(index => deck.cards[index].id))], definition.startingLocations);
      assert.ok(deck.cards.every(card => card.side.toLowerCase() === side && card.set === '1'));
    }
  }
  const invalid = structuredClone(definitions);
  invalid.decks.Light[0].startingLocations = [];
  assert.throws(() => readThemedDecks(invalid, catalog), /mindestens eine Starting Location/);
  invalid.decks.Light[0] = structuredClone(invalid.decks.Light[1]);
  assert.throws(() => readThemedDecks(invalid, catalog), /eindeutige IDs/);
});

test('typed cards distinguish missing, unknown, printed special and numeric values', () => {
  assert.deepEqual(readCardValue(undefined), {kind: 'missing', value: null, raw: null});
  assert.deepEqual(readCardValue([1]), {kind: 'unknown', value: null, raw: [1]});
  assert.deepEqual(readCardValue('?'), {kind: 'unknown', value: null, raw: '?'});
  assert.deepEqual(readCardValue('*'), {kind: 'special', value: null, raw: '*'});
  assert.deepEqual(readCardValue('0'), {kind: 'number', value: 0, raw: '0'});
  const cards = new Map(readCatalog(snapshot).map(card => [card.id, card]));
  assert.equal(cards.get('Dark:816').values.destiny.kind, 'special');
  assert.deepEqual(cards.get('Dark:816').destinyValues, [0]);
  assert.equal(cards.get('Light:1373').values.deploy.kind, 'special');
  assert.equal(cards.get('Dark:634').warrior, true);
  assert.equal(cards.get('Dark:634').pilot, true);
  assert.equal(cards.get('Dark:634').uniquenessLimit, 1);
  assert.ok(cards.get('Dark:634').texts.explanationDe);
  assert.ok(cards.get('Dark:634').texts.lore);
  assert.ok(cards.get('Light:1593').personas.length);
  assert.equal(cards.get('Light:2838').navComputer, true);
  assert.deepEqual(cards.get('Light:2447').locationTags, ['Exterior', 'Interior', 'Planet', 'Scomp Link']);
});

test('catalog rejects source drift, mixed editions, bad side counts, duplicates and unsupported errata markers', () => {
  const invalid = (mutate, message) => {
    const copy = structuredClone(snapshot);
    mutate(copy);
    assert.throws(() => readCatalog(copy), message);
  };
  invalid(copy => { copy.revision = 'main'; }, /festgeschriebenen Revision/);
  invalid(copy => { copy.cards[0].set = '2'; }, /Edition/);
  invalid(copy => { copy.cards[0].side = 'Dark'; }, /Kartenseite/);
  invalid(copy => { copy.cards[1] = copy.cards[0]; }, /Doppelte/);
  invalid(copy => { copy.cards[0] = {...copy.cards[162], sourceId: 9000, id: 'Dark:9000', gempId: '1_9000'}; }, /genau 162/);
  invalid(copy => { delete copy.cards.find(card => card.rawFront.errataSymbol).rawFront.printableSlipUrl; }, /Korrekturslip/);
  invalid(copy => { copy.cards[0].printText = 'unverified'; }, /zugehörigen Scan/);
});

test('starter decks allow legal duplicate copies while enforcing the edition and playability', () => {
  const catalog = readCatalog(snapshot);
  const extra = structuredClone(definitions);
  extra.decks.Light.cards.find(card => card.id === 'Light:1593').count++;
  extra.decks.Light.cards.find(card => card.id === 'Light:2052').count--;
  assert.equal(readStarterDecks(extra, catalog).light.cards.filter(card => card.id === 'Light:1593').length, 2);
  const luke = catalog.find(card => card.id === 'Light:1593');
  assert.throws(() => readStarterDecks(extra, catalog.map(card => card === luke ? {...card, set: '2'} : card)), /anderen Edition/);
  extra.decks.Light.cards.find(card => card.id === 'Light:1593').id = 'Light:1373';
  assert.throws(() => readStarterDecks(extra, catalog), /nicht ausgespielt/);
});

test('source import filters out other editions and rejects a mismatched side or prior version', () => {
  const front = {title: 'Example', type: 'Character', gametext: 'Active'};
  const card = {id: 100, gempId: '1_100', side: 'Light', set: '1', legacy: false, printings: [{set: '1'}], previousId: 200, front};
  const earlier = {id: 200, nextId: 100, set: '1', side: 'Light', front: {...front, gametext: 'Earlier'}};
  const inputs = {
    'Light.json': {cards: [card, {...card, set: '2'}]}, 'Dark.json': {cards: []},
    'LightPreErrata.json': {cards: [earlier]}, 'DarkPreErrata.json': {cards: []}
  };
  const imported = buildSnapshot(inputs, {'Light:100': {explanationDe: 'Deutscher Hinweis'}});
  assert.equal(imported.cards.length, 1);
  assert.equal(imported.cards[0].rawFront.gametext, 'Active');
  assert.deepEqual(imported.cards[0].preErrata, {sourceId: 200, gametext: 'Earlier'});
  assert.throws(() => buildSnapshot(inputs, {'Light:100': {printText: 'unverified', printSource: 'other'}}), /keinem Kartenbild/);
  earlier.nextId = 101;
  assert.throws(() => buildSnapshot(inputs, {}), /nicht eindeutig/);
  card.side = 'Dark';
  assert.throws(() => buildSnapshot(inputs, {}), /Kartenseite/);
});
