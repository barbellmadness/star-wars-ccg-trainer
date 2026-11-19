import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Carbon-Freezing combines console, Ugnaught and chamber bonuses and causes eight Force loss',()=>{
 const {run}=harness(['captives','devices','freezing']);run(`const source=card('Dark:379'),escort=card('Dark:287'),luke=card('Light:1593');luke.captured=true;escort.escortedCaptive=luke;state.dark[0]=[escort,card('Dark:2662'),card('Dark:2661')];state.locationEffects={0:[{card:source,target:'Dark',site:0}]};state.locationWeapons={0:[card('Dark:380')]};state.botDeck=[{...card('Dark:1264'),destiny:6}];state.activeSide='Dark';PremiereGame.setPhase(state,1);ccFreeze('Dark',source,luke,0);`);
 assert.equal(run('ccFreezeBonus(0)'),6);assert.equal(run('luke.frozen'),true);assert.equal(run('state.pendingForceLoss.remaining'),8);
 assert.equal(run('source===luke.attachments[0]'),true);assert.equal(run('cardAbility(luke)'),0);
});
test('Carbon-Freezing at five through ten leaves the captive unchanged and below five loses it',()=>{
 for(const [destiny,lost]of [[4,false],[0,true]]){
  const {run}=harness(['captives','devices','freezing']);run(`const source=card('Dark:379'),escort=card('Dark:287'),luke=card('Light:1593');luke.captured=true;escort.escortedCaptive=luke;state.dark[0]=[escort];state.locationEffects={0:[{card:source,target:'Dark',site:0}]};state.botDeck=[{...card('Dark:1264'),destiny:${destiny}}];state.activeSide='Dark';ccFreeze('Dark',source,luke,0);`);
  assert.equal(run("state.lost.includes(luke)"),lost);assert.equal(run('!!luke.frozen'),false);
 }
});
