import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import PremiereBattle from '../engine/premiere-battle.js';
import PremiereData from '../engine/premiere-data.js';

const anh = JSON.parse(readFileSync(new URL('../data/a-new-hope.json', import.meta.url), 'utf8'));
const catalog = PremiereData.readCatalog(anh, PremiereData.A_NEW_HOPE);
const brainiac = catalog.find(card => card.id === 'Light:319');
const artoo = catalog.find(card => card.id === 'Light:1992');

test('Brainiac uses exact unrounded pi from the A New Hope source when drawn for destiny', () => {
  assert.equal(brainiac.values.destiny.raw, 'π');
  // The snapshot's approximate destinyValues entry must not round gameplay arithmetic.
  assert.equal(brainiac.destinyValues[0], 3.14159);
  assert.equal(PremiereBattle.printedDestiny(brainiac), Math.PI);
  assert.equal(PremiereBattle.printedDestiny(brainiac) > 3.14159, true);
});

test('drawing Brainiac preserves fractional destiny through modifiers, totals and used pile', () => {
  const piles = {deck: [brainiac], used: []};
  const draw = PremiereBattle.draw(piles, 1);
  assert.equal(draw.value, Math.PI + 1);
  assert.equal(PremiereBattle.total([draw]), Math.PI + 1);
  PremiereBattle.settle(piles, draw);
  assert.equal(piles.deck.length, 0);
  assert.deepEqual(piles.used, [brainiac]);
});

test('fractional battle destiny does not round attrition or forfeit requirements', () => {
  const outcome = PremiereBattle.result({Light: 2, Dark: 1}, {
    Light: {battle: Math.PI, power: 0, attrition: 0},
    Dark: {battle: 0, power: 0, attrition: 0}
  });
  assert.equal(outcome.darkAttrition, Math.PI);
  assert.equal(outcome.darkDamage, 1 + Math.PI);
  const debt = {attrition: Math.PI, damage: 0};
  PremiereBattle.forfeit(debt, 3);
  assert.ok(debt.attrition > 0 && debt.attrition < 1);
  PremiereBattle.forfeit(debt, 1);
  assert.equal(debt.attrition, 0);
});

test('other unknown or multi-valued printed destinies are not guessed', () => {
  assert.equal(PremiereBattle.printedDestiny(artoo), null);
  assert.equal(PremiereBattle.printedDestiny({...brainiac, id: 'Light:9999'}), null);
  assert.equal(PremiereBattle.printedDestiny({type:'Location',destiny:null}), 0);
  assert.equal(PremiereBattle.printedDestiny({type:'Character',destiny:4}), 4);
});
