import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import premiere from '../engine/premiere-data.js';
import {buildSnapshot} from '../scripts/import_premiere.mjs';

const json = name => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const snapshot = json('premiere.json');
const definitions = json('premiere-starter-decks.json');
const {A_NEW_HOPE, readCatalog, readSupplementalCards, readStarterDecks, readThemedDecks, buildAudit, readCardValue,
  isGarrisonExpansionCard, isReleasedExpansionCard, readFormatDeckChoices} = premiere;

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
    assert.deepEqual(decks[side.toLowerCase()].strategy, definitions.decks[side].strategy);
    assert.ok(decks[side.toLowerCase()].strategy.tactics.trim());
  }
  const withoutGuide = structuredClone(definitions);
  delete withoutGuide.decks.Light.strategy;
  assert.equal(readStarterDecks(withoutGuide, catalog).light.strategy, undefined);
  withoutGuide.decks.Light.strategy = {...definitions.decks.Light.strategy, opening: ' '};
  assert.throws(() => readStarterDecks(withoutGuide, catalog), /Strategie/);
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

test('A New Hope covers all 162 printed Gemp slots and preserves new card types and special values', () => {
  const expansion = json('a-new-hope.json');
  const cards = readCatalog(expansion, A_NEW_HOPE);
  assert.throws(() => readCatalog(expansion), /Premiere-Snapshot/);
  assert.deepEqual(cards.map(card => Number(card.gempId.slice(2))).sort((a, b) => a - b), Array.from({length: 162}, (_, index) => index + 1));
  assert.ok(cards.every(card => card.images.print && card.texts.print === null));
  assert.ok(cards.every(card => !snapshot.cards.some(premiereCard => premiereCard.id === card.id)));
  const find = id => cards.find(card => card.id === id);
  assert.equal(find('Dark:729').type, 'Creature');
  assert.deepEqual(cards.filter(card => card.type === 'Epic Event').map(card => card.id), ['Light:169', 'Dark:508']);
  assert.deepEqual(find('Light:1992').destinyValues, [2, 5]);
  assert.equal(find('Light:319').values.destiny.raw, 'π');
  assert.deepEqual(find('Light:319').destinyValues, [3.14159]);
  assert.equal(find('Light:1062').errataSymbol, 'D-E2');
  assert.equal(find('Dark:223').errataSymbol, 'E1');
  assert.equal(cards.filter(card => card.texts.preErrata !== null).length, 5);
  const existing = readSupplementalCards(json('premiere-supplemental-cards.json')).filter(isGarrisonExpansionCard);
  assert.deepEqual(cards.filter(isGarrisonExpansionCard).map(card => card.id).sort(), existing.map(card => card.id).sort());
  for (const card of existing) assert.equal(find(card.id).texts.active, card.texts.active);
});

test('explicit deck formats allow only the declared sets and cards cleared for play', () => {
  const expansionCards = readCatalog(json('a-new-hope.json'), A_NEW_HOPE);
  const [rifle] = readSupplementalCards(json('premiere-supplemental-cards.json'));
  const catalog = [...readCatalog(snapshot), ...expansionCards, rifle];
  const mixed = structuredClone(definitions);
  const card = mixed.decks.Dark.cards.find(entry => entry.id === 'Dark:1027');
  card.id = 'Dark:667';
  assert.throws(() => readStarterDecks(mixed, catalog, {format: 'premiere'}), /anderen Edition/);
  assert.equal(readStarterDecks(mixed, catalog, {format: 'premiere-a-new-hope'}).dark.cards.length, 60);
  assert.throws(() => readStarterDecks(mixed, catalog, {format: 'mixed'}), /Unbekanntes Spielformat/);
  card.id = 'Dark:729';
  assert.throws(() => readStarterDecks(mixed, catalog, {format: 'premiere-a-new-hope'}), /noch nicht für das Spiel freigegeben/);
  card.id = rifle.id;
  assert.throws(() => readStarterDecks(mixed, catalog, {format: 'premiere-a-new-hope'}), /anderen Edition/);
  const themes = json('premiere-themed-decks.json');
  assert.equal(readThemedDecks(themes, catalog).dark.find(({deck}) => deck.theme.id === 'imperiale-garnison').deck.cards.length, 60);
  assert.throws(() => readThemedDecks(themes, catalog, {format: 'premiere-a-new-hope'}), /Dark:2915 stammt aus einer anderen Edition/);
});

test('both sides have seven distinct, valid 60-card themed decks with playable starting locations', () => {
  const catalog = [...readCatalog(snapshot), ...readSupplementalCards(json('premiere-supplemental-cards.json'))];
  const definitions = json('premiere-themed-decks.json');
  const sets = readThemedDecks(definitions, catalog);
  for (const side of ['light', 'dark']) {
    assert.equal(sets[side].length, 7);
    const lineups = sets[side].map(({deck}) => deck.cards.map(card => card.id).sort().join(','));
    assert.equal(new Set(lineups).size, sets[side].length);
    for (const {deck, definition} of sets[side]) {
      assert.equal(deck.cards.length, 60);
      assert.deepEqual(deck.strategy, definition.strategy);
      assert.ok(deck.strategy.tactics.trim());
      assert.deepEqual([...new Set(deck.startingIndices.map(index => deck.cards[index].id))], definition.startingLocations);
      assert.ok(deck.cards.every(card => card.side.toLowerCase() === side &&
        (card.set === '1' || (['Dark:2915','Dark:654','Dark:667','Dark:2103'].includes(card.id) && deck.theme.id === 'imperiale-garnison'))));
    }
  }
  const garrison = sets.dark.find(({deck}) => deck.theme.id === 'imperiale-garnison').deck;
  assert.equal(garrison.cards.filter(card => card.id === 'Dark:2915').length, 3);
  assert.ok(sets.light[0].deck.cards.some(card => card.id === 'Light:672'));
  const starterWithRifle = json('premiere-starter-decks.json');
  starterWithRifle.decks.Dark.cards[0].id = 'Dark:2915';
  assert.throws(() => readStarterDecks(starterWithRifle, catalog), /anderen Edition/);
  const invalid = structuredClone(definitions);
  invalid.decks.Light[0].startingLocations = [];
  assert.throws(() => readThemedDecks(invalid, catalog), /mindestens eine Starting Location/);
  invalid.decks.Light[0] = structuredClone(invalid.decks.Light[1]);
  assert.throws(() => readThemedDecks(invalid, catalog), /eindeutige IDs/);
  for (const [side, theme, checks] of [
    ['light', 'jedi-auf-tatooine', {'Light:1803': 3, 'Light:1039': 3, 'Light:1813': 2}],
    ['light', 'droidenstuetzpunkt', {'Light:343': 3, 'Light:1995': 3, 'Light:2052': 5}],
    ['dark', 'vaders-jagd', {'Dark:634': 4, 'Dark:1061': 3, 'Dark:2517': 2}],
    ['dark', 'sturmtruppen-offensive', {'Dark:2355': 9, 'Dark:2634': 3, 'Dark:1027': 3}],
  ]) {
    const {deck, definition} = sets[side].find(choice => choice.deck.theme.id === theme);
    assert.equal(definition.startingLocations.length, 3);
    assert.ok(deck.cards.every(card => card.set === '1'));
    for (const [id, count] of Object.entries(checks)) {
      assert.equal(deck.cards.filter(card => card.id === id).length, count);
    }
  }
});

test('both formats have legal decks for either side and offer every released expansion card', () => {
  const base = readCatalog(snapshot);
  const expansion = readCatalog(json('a-new-hope.json'), A_NEW_HOPE);
  const themes = json('premiere-themed-decks.json');
  const variants = json('play-format-decks.json');
  const mixedFormat = 'premiere-a-new-hope';
  const fixed = readFormatDeckChoices('premiere', definitions, themes, variants, base);
  const mixed = readFormatDeckChoices(mixedFormat, definitions, themes, variants, [...base, ...expansion]);
  assert.ok([...fixed.light, ...fixed.dark].every(({deck}) => deck.cards.every(card => card.set === '1')));
  for (const side of ['light', 'dark']) {
    assert.ok(mixed[side].some(({deck}) => deck.cards.some(card => card.set === A_NEW_HOPE)));
    assert.ok(mixed[side].every(({deck}) => deck.startingIndices.length && deck.cards.length === 60 && deck.cards.every(card => card.set !== '4')));
  }
  const available = new Set([...mixed.light, ...mixed.dark].flatMap(({deck}) => deck.cards.map(card => card.id)));
  assert.ok(expansion.every(card => available.has(card.id) === isReleasedExpansionCard(card)));
  const decks = {schema: 1, decks: {Light: mixed.light.at(-1).definition, Dark: mixed.dark[1].definition}};
  assert.throws(() => readStarterDecks(decks, [...base, ...expansion], {format:mixedFormat, cardRulesVersion:25}), /noch nicht für das Spiel freigegeben/);
  assert.throws(() => readStarterDecks(decks, [...base, ...expansion], {format:mixedFormat, cardRulesVersion:26}), /noch nicht für das Spiel freigegeben/);
  assert.equal(readStarterDecks(decks, [...base, ...expansion], {format:mixedFormat, cardRulesVersion:27}).light.cards.length, 60);
});

test('the selectable decks include all 324 Premiere cards, including the nine previously rejected cards', () => {
  const catalog = readCatalog(snapshot);
  const starters = readStarterDecks(definitions, catalog);
  const themes = readThemedDecks(json('premiere-themed-decks.json'),
    [...catalog, ...readSupplementalCards(json('premiere-supplemental-cards.json'))]);
  const coversAll = new Set();
  const originalDecks = new Set();
  for (const [side, addition, earlier, admitted] of [
    ['light', 'rebellen-spezialeinsatz', ['massassi-widerstand', 'rote-staffel', 'tatooine-verbuendete', 'falcon-kessel'], [1102, 1500, 1600, 2105, 2385]],
    ['dark', 'imperiale-sondereinheit', ['imperiale-garnison', 'schwarze-staffel', 'tusken-ueberfall', 'blockade-von-kessel'], [575, 643, 2517, 2528]],
  ]) {
    const additionalDeck = themes[side].find(({deck}) => deck.theme.id === addition).deck;
    const newIds = new Set(additionalDeck.cards.map(card => card.id));
    for (const id of admitted) assert.ok(newIds.has(side[0].toUpperCase()+side.slice(1)+':'+id));
    for (const card of [...starters[side].cards, ...themes[side].filter(({deck}) => earlier.includes(deck.theme.id)).flatMap(({deck}) => deck.cards)]) {
      originalDecks.add(card.id);
    }
    for (const id of newIds) coversAll.add(id);
  }
  const previouslyMissing = catalog.filter(card => !originalDecks.has(card.id));
  assert.equal(previouslyMissing.length, 71);
  assert.deepEqual(previouslyMissing.filter(card => !coversAll.has(card.id)), []);
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
  assert.throws(() => readStarterDecks(extra, catalog.map(card => card === luke ? {...card, deploy: null} : card)), /nicht ausgespielt/);
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
