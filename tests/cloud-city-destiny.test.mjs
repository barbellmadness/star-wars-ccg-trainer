import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/cloud-city-harness.mjs';

test('Smoke Screen replaces one battle draw without moving or settling the character',()=>{
 const {run}=harness();run(`const target=card('Light:1593');state.light[0]=[target];state.hand=[];state.botHand=[];battleSession={site:0,participants:{Light:[target],Dark:[]},cloudCitySmoke:{Light:target}};const initial=state.deck.length;let result;drawDestinySeries('Light','battle',2,0,draws=>result=draws);`);
 assert.equal(run('result.length'),2);assert.equal(run('result[0].value'),run('cardAbility(target)'));assert.equal(run('initial-state.deck.length'),1);assert.equal(run('state.used.includes(target)'),false);assert.equal(run('state.light[0].includes(target)'),true);
});

test('Smoke Screen may replace a later draw, after the first destiny has resolved',()=>{
 const {run}=harness();run(`const target=card('Light:1593'),source=card('Light:2285');state.light[0]=[target];state.hand=[];state.botHand=[];battleSession={site:0,participants:{Light:[target],Dark:[]}};let result;const original=ccBeforeBattleCard;let count=0;ccBeforeBattleCard=(side,draw,substitute)=>{if(++count===2)battleSession.cloudCitySmoke={Light:target};original(side,draw,substitute);};const initial=state.deck.length;drawDestinySeries('Light','battle',2,0,draws=>result=draws);`);
 assert.equal(run('count'),2);assert.equal(run('result[1].cloudCityReplacement'),true);assert.equal(run('initial-state.deck.length'),1);
});

test("Gambler's Luck discards from its extra draws, preserving the ordinary battle destiny",()=>{
 const {run}=harness();run(`state.hand=[];state.botHand=[];battleSession={site:0,participants:{Light:[],Dark:[]},cloudCityGamble:{Light:2}};let result;drawDestinySeries('Light','battle',3,0,draws=>result=draws);`);
 assert.equal(run('state.pendingCardView.choices.length'),2);run('finishDagobahChoice(state.pendingCardView,0)');assert.equal(run('result.length'),3);assert.equal(run('result[0].cancelled'),false);assert.equal(run('result.filter(draw=>draw.cancelled).length'),1);
});

test('All My Urchins protects the Force needed to initiate the battle while paying its loss',()=>{
 const {run}=harness();run(`PremiereGame.setPhase(state,3);state.light[0]=[card('Light:1593')];state.dark[0]=[card('Dark:634')];state.locationEffects={0:[{card:card('Light:84'),site:0}]};state.force=[card('Light:259')];state.hand=[card('Light:259'),card('Light:259')];state.deck=[];state.used=[];const started=initiateBattleFor('Light',0);`);
 assert.equal(run('started'),true);assert.equal(run("legalActions(state,'Light').some(action=>action.kind==='loseForce'&&action.args[0]==='force')"),false);run("loseForceForDrain('Light','hand',0);loseForceForDrain('Light','hand',0)");assert.equal(run('battleSession.site'),0);assert.equal(run('state.force.length'),0);assert.equal(run('state.used.length'),1);
});

test('Urchins cannot start an unpayable battle using Force trapped below Frozen Assets',()=>{
 const {run}=harness();run(`PremiereGame.setPhase(state,3);state.light[0]=[card('Light:1593')];state.dark[0]=[card('Dark:634')];state.locationEffects={0:[{card:card('Light:84'),site:0}]};state.force=pile('Light',3);state.hand=[];state.deck=[];state.used=[];state.tableEffects=[{card:card('Light:989'),forceBarrier:'Light',blockedForce:state.force.slice(0,2)}];`);
 assert.equal(run("canInitiateBattleFor('Light',0)"),false);assert.equal(run("initiateBattleFor('Light',0)"),false);assert.equal(run('state.pendingForceLoss'),null);
});
