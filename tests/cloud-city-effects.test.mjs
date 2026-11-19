import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
const setup=()=>harness(['devices','units','freezing','locations','effects']);
test('Frozen Assets blocks existing Force but leaves newly activated Force usable',()=>{
 const {run}=setup();run(`const source=card('Light:989');state.hand=[source];const option=ccEffectOptions('Light').find(option=>option.forceBarrier);settleHothEffect({...option,side:'Light'});`);
 assert.equal(run("ownForceBudget('Dark')"),0);assert.equal(run("drawFor('Dark')"),false);
 run("state.botForce.push(card('Dark:1264'))");assert.equal(run("ownForceBudget('Dark')"),1);assert.equal(run("drawFor('Dark')"),true);assert.equal(run("ownForceBudget('Dark')"),0);
});
test('Cloud City table Effects deploy through the normal response mechanism',()=>{
 const {run}=setup();run(`const source=card('Dark:2699'),host=card('Dark:287');state.dark[0]=[host];state.botHand=[source];state.activeSide='Dark';const option=ccEffectOptions('Dark').find(option=>option.host===host);announceHothEffect('Dark',option);`);
 assert.equal(run('host.attachments.includes(source)'),true);assert.equal(run("state.botForce.length"),17);
 run(`battleSession={site:0,participants:{Light:[],Dark:[host]},excluded:{Light:[],Dark:[]}}`);assert.equal(run("battleImmunity('Dark',host,0)"),5);
});
test('Access Denied removes opposing inserts and reshuffles without locking activation',()=>{
 const {run}=setup();run(`const insert=card('Light:54'),enemy=card('Dark:308');insert.insertedIntoReserveBy='Light';enemy.insertedIntoReserveBy='Dark';state.deck=[card('Light:259'),enemy,insert];let completed=false;dagoResolveTop('Light',()=>{completed=true;});`);
 assert.equal(run('completed'),true);assert.equal(run('state.lost.includes(insert)'),true);assert.equal(run('state.botLost.includes(enemy)'),true);assert.equal(run('state.deck.length'),1);assert.equal(run("activationLocked('Light')"),false);
});
test('Dark Deal requires sector control plus three sites and cancels at four opposing occupations',()=>{
 const {run}=setup();run(`const source=card('Dark:614');state.botHand=[source];state.activeSide='Dark';`);assert.equal(run("ccEffectOptions('Dark').length"),0);
 run(`state.locationEffects={2:[{card:source,site:2,target:'Dark'}]};state.locations.push(card('Dark:444'));state.light.push([]);state.dark.push([]);for(const slot of [0,1,2,5])state.light[slot]=[card('Light:305')];hothContinuous();`);
 assert.equal(run('state.locationEffects[2].length'),0);assert.equal(run('state.botLost.includes(source)'),true);
});
test('Civil Disorder charges only a turn without deployment of ability',()=>{
 for(const deployed of [false,true]){const {run}=setup();run(`state.game.playerSide='Dark';const source=card('Light:414');state.tableEffects=[{card:source,target:'Dark'}];state.activeSide='Dark';if(${deployed})state.cloudCityAbilityDeployed={Dark:state.game.timing.turn};let done=false;hothCheckpoint('phase:end',()=>{done=true;});`);assert.equal(run('!!state.pendingForceLoss'),!deployed);}
});
