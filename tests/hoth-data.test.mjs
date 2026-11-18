import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import data from '../engine/premiere-data.js';
import locations from '../engine/premiere-locations.js';
const json=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
const snapshot=json('hoth'),cards=data.readCatalog(snapshot,data.HOTH);

test('Hoth validates all 162 pinned cards with distinct scan, errata and historical texts',()=>{
  assert.equal(cards.length,162);
  for(const side of ['Light','Dark'])assert.equal(cards.filter(c=>c.side===side).length,81);
  assert.equal(cards.filter(c=>c.errataSymbol).length,76);
  assert.equal(cards.filter(c=>c.texts.preErrata!==null).length,2);
  assert.ok(cards.every(c=>c.texts.print===null&&c.images.print&&c.texts.active));
  assert.ok(cards.some(c=>c.type==='Creature'));
  assert.ok(cards.some(c=>c.type==='Epic Event'));
  const invalid=structuredClone(snapshot);invalid.cards[0].set='2';
  assert.throws(()=>data.readCatalog(invalid,data.HOTH),/Edition/);
  assert.throws(()=>data.readCatalog(snapshot),/Premiere-Snapshot/);
});

test('Hoth cannot enter either playable format or bypass expansion release checks',()=>{
  assert.ok(cards.every(c=>!data.isReleasedExpansionCard(c)));
  assert.ok(Object.values(data.PLAY_FORMATS).every(sets=>!sets.includes(data.HOTH)));
  const base=data.readCatalog(json('premiere')),anh=data.readCatalog(json('a-new-hope'),data.A_NEW_HOPE);
  for(const format of Object.keys(data.PLAY_FORMATS)){
    const definition=json('premiere-starter-decks');
    const first=definition.decks.Light.cards[0];first.count--;definition.decks.Light.cards=definition.decks.Light.cards.filter(c=>c.count>0);
    definition.decks.Light.cards.push({id:cards.find(c=>c.side==='Light'&&c.type==='Character').id,count:1});
    assert.throws(()=>data.readStarterDecks(definition,[...base,...anh,...cards],{format,cardRulesVersion:30}),/anderen Edition/);
  }
});

test('Artillery Remote preserves the exact documented text-only erratum without fabricating a slip',()=>{
  const card=cards.find(c=>c.id==='Light:135');
  assert.equal(card.errataSymbol,'E1');assert.equal(card.errataDate,'2023-10-07');assert.equal(card.images.slip,null);
  assert.equal(card.preErrataSourceId,40034);assert.notEqual(card.texts.active,card.texts.preErrata);
  const altered=structuredClone(snapshot);altered.cards.find(c=>c.id==='Light:135').rawFront.errataDate='2024-01-01';
  assert.throws(()=>data.readCatalog(altered,data.HOTH),/Erratum/);
  const other=structuredClone(snapshot),record=other.cards.find(c=>c.rawFront.printableSlipUrl);
  delete record.rawFront.printableSlipUrl;
  assert.throws(()=>data.readCatalog(other,data.HOTH),/Erratum/);
});

test('Hoth markers include the interior Wampa Cave but not Echo Docking Bay or another planet',()=>{
  const marker=id=>locations.hothMarker(cards.find(c=>c.id===id));
  assert.equal(marker('Light:5586'),1);assert.equal(marker('Light:5591'),2);assert.equal(marker('Light:5582'),3);
  assert.equal(marker('Light:5590'),4);assert.equal(marker('Dark:6354'),5);assert.equal(marker('Dark:6359'),7);
  assert.equal(marker('Light:1173'),null);
  assert.equal(locations.hothMarker({name:'Tatooine: Other (3rd Marker)',type:'Location',subType:'Site'}),null);
});
