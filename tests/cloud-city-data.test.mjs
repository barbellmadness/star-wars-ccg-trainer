import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import data from '../engine/premiere-data.js';
import {harness} from './support/cloud-city-harness.mjs';
const json=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
test('all 180 physical Cloud City cards are released at rule version 33 and covered by sixteen legal decks',()=>{
 const cards=['premiere','a-new-hope','hoth','dagobah','cloud-city'].flatMap((name,i)=>data.readCatalog(json(name),String(i+1)));
 const expansion=cards.filter(card=>card.set==='5');
 const choices=data.readFormatDeckChoices('premiere-a-new-hope-hoth-dagobah-cloud-city',json('premiere-starter-decks'),json('premiere-themed-decks'),json('cloud-city-decks'),cards);
 const {run}=harness();assert.equal(run('CloudCityCardRules.definitions.length'),180);assert.equal(run('CloudCityCardRules.definitions.filter(rule=>rule.complete).length'),180);
 for(const side of ['light','dark']){
  const decks=choices[side].filter(({deck})=>deck.theme);assert.equal(decks.length,8);
  for(const {deck,definition} of decks){assert.equal(deck.cards.length,60);assert.ok(deck.cards.every(card=>card.side.toLowerCase()===side&&Number(card.set)<=5));assert.ok(deck.cards.some(card=>card.id===definition.theme.cover));assert.ok(Object.values(definition.strategy).every(text=>text.length>80));assert.ok(definition.startingLocations.every(id=>cards.find(card=>card.id===id)?.subType!=='Sector'));}
  const available=new Set(decks.flatMap(({deck})=>deck.cards.map(card=>card.id)));
  for(const card of expansion.filter(card=>card.side.toLowerCase()===side)){assert.ok(available.has(card.id),card.name);assert.equal(data.isReleasedExpansionCard(card,33),true);assert.equal(data.isReleasedExpansionCard(card,32),false);}
 }
});
