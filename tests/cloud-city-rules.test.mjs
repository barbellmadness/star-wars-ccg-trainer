import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../engine/cloud-city-rules.js';
import data from '../engine/premiere-data.js';
import {readFileSync} from 'node:fs';
const catalog=data.readCatalog(JSON.parse(readFileSync(new URL('../data/cloud-city.json',import.meta.url),'utf8')),'5');
const card=id=>catalog.find(card=>card.id===id);
test('Cloud City contains 180 physical cards with one canonical Hindsight',()=>{
 assert.equal(catalog.length,180);assert.equal(catalog.filter(card=>card.side==='Light').length,90);
 assert.equal(catalog.filter(card=>card.gempId==='5_26').length,1);assert.equal(card('Light:1145').name,'•Hindsight');
 assert.equal(data.isReleasedExpansionCard(card('Light:1145'),32),false);
});
test('Cloud City and generic Clouds are cloud sectors, not asteroid sectors',()=>{
 assert.equal(rules.cloud(card('Light:229')),true);assert.equal(rules.cloud(card('Dark:463')),true);
 assert.equal(rules.sector(card('Dark:228')),true);assert.equal(rules.city(card('Dark:437')),true);
});
test('cloud cars, starfighters and transports moving like fighters can use clouds',()=>{
 assert.equal(rules.cloudCapable(card('Light:426')),true);assert.equal(rules.cloudCapable(card('Light:332')),true);
 assert.equal(rules.cloudCapable(card('Light:2073')),false);
});
test('Sabacc uses assigned wild values and clones actual non-clone cards',()=>{
 const hand=[{name:'Lando',type:'Character',destiny:1},{name:'Ugnaught',type:'Character',destiny:3},{name:'Other',destiny:5}];
 assert.deepEqual(rules.sabaccValues(hand,[6,6]),[6,6,5]);
 assert.throws(()=>rules.sabaccValues(hand,[7,6]));assert.throws(()=>rules.sabaccValues(hand,[6,4]));
 assert.deepEqual(rules.sabaccValues([hand[1]],[]),[0]);assert.deepEqual(rules.sabaccValues(hand,[6,0],true),[6,0,5]);
});
test('Sabacc compares busts, distance, card count and perfect hands',()=>{
 const hand=(total,count=2,perfect=false)=>({total,count,perfect});
 assert.equal(rules.sabaccResult(hand(10),hand(12)),'Light');assert.equal(rules.sabaccResult(hand(14),hand(12)),'Dark');
 assert.equal(rules.sabaccResult(hand(10,2),hand(10,3)),'Light');assert.equal(rules.sabaccResult(hand(10),hand(10)),null);
 assert.equal(rules.sabaccResult(hand(11,3),hand(11,2,true)),'Dark');assert.equal(rules.sabaccResult(hand(11,2,true),hand(11,2,true)),null);
 assert.equal(rules.perfect([{destiny:5},{destiny:6}]),true);assert.equal(rules.perfect([{destiny:5},{name:'Lando',type:'Character',destiny:6}]),false);
 assert.equal(rules.wild(card('Light:1476')),false);assert.equal(rules.clone(card('Dark:2661')),true);
});
