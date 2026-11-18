import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import data from '../engine/premiere-data.js';
import weapons from '../engine/premiere-weapons.js';
const json=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
test('each side offers eight distinct ANH mixed decks with complete guides and legal start sites',()=>{
 const catalog=[...data.readCatalog(json('premiere.json')),...data.readCatalog(json('a-new-hope.json'),data.A_NEW_HOPE)];
 const formats=data.readFormatDeckChoices('premiere-a-new-hope',json('premiere-starter-decks.json'),json('premiere-themed-decks.json'),json('play-format-decks.json'),catalog);
 const keys={light:{rettungsteam:['Light:1495','Light:385','Light:1229'],'corellianische-eskorte':['Light:394','Light:527','Light:1429'],'bith-ensemble':['Light:942','Light:751','Light:1242','Light:1752']},dark:{'imperiales-spionagenetz':['Dark:2659','Dark:1198','Dark:2176'],'schwarze-eskorte':['Dark:250','Dark:792','Dark:2094'],'jawa-schrottmarkt':['Dark:2075','Dark:1372','Dark:2164']}};
 for(const side of ['light','dark']){
  const choices=formats[side].filter(({deck})=>deck.cards.some(card=>card.set===data.A_NEW_HOPE));
  assert.equal(choices.length,8,side);
  assert.equal(new Set(choices.map(({deck})=>deck.cards.map(card=>card.id).sort().join(','))).size,8);
  for(const {deck,definition} of choices){
   assert.equal(deck.cards.length,60);
   assert.ok(deck.cards.every(card=>card.side.toLowerCase()===side&&['1','2'].includes(card.set)));
   assert.ok(definition.startingLocations.length>0);
   assert.ok(deck.startingIndices.every(index=>deck.cards[index].type==='Location'&&!deck.cards[index].locationTags?.includes('Vehicle Site')));
   for(const field of ['start','opening','tactics'])assert.ok(deck.strategy[field].trim());
  }
  for(const [id,anchors] of Object.entries(keys[side])){
   const deck=choices.find(({deck})=>deck.theme.id===id)?.deck;
   assert.ok(deck,id);
   assert.ok(anchors.every(id=>deck.cards.some(card=>card.id===id)),id+' has its strategy cards');
   assert.ok(deck.cards.filter(card=>card.type==='Character').length>=20,id+' has enough characters');
   for(const weapon of deck.cards.filter(card=>card.type==='Weapon'&&weapons.definition(card)?.deploy)){
    assert.ok(deck.cards.some(host=>['Character','Vehicle','Starship','Location'].includes(host.type)&&weapons.deployCost(weapon,host,host.ability)!==null),id+' has a legal carrier for '+weapon.name);
   }
  }
 }
});
