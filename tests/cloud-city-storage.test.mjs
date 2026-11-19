import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
const setup=()=>harness(['devices','freezing','locations','weather-vane','units','weapons','effects','abilities','reacts','interrupts','battle','duels','storage','timing']);
test('Cyborg Construct stores once per turn and plays a stored Interrupt through normal legality',()=>{
 const {run}=setup();run(`const host=card('Light:2810'),device=card('Light:592'),source=card('Light:139');host.attachments=[device];device.cloudCityStored=[];device.cloudCityStorageHostId=host.instanceId;state.light[0]=[host];state.hand=[source];state.deck=[card('Light:1132')];const store=ccStorageOptions('Light').find(option=>option.mode==='cc:storeCard');store.resolve();`);
 assert.equal(run('state.hand.length'),0);assert.equal(run('device.cloudCityStored.length'),1);assert.equal(run("ccStorageOptions('Light').some(option=>option.mode==='cc:storeCard')"),false);
 run(`const play=ccStorageOptions('Light').find(option=>option.mode==='cc:playStored');play.resolve();finishDagobahChoice(state.pendingCardView,0);`);
 assert.equal(run('device.cloudCityStored.length'),0);assert.equal(run('state.hand[0].id'),'Light:1132');assert.equal(run('state.used.includes(source)'),true);
});
test('Removing or losing Cyborg Construct returns storage to Used, not Lost',()=>{
 const {run}=setup();run(`const host=card('Light:2810'),device=card('Light:592'),stored=card('Light:139');host.attachments=[device];device.cloudCityStored=[stored];device.cloudCityStorageHostId=host.instanceId;state.light[0]=[host];loseTableCard('Light',0,host);`);assert.equal(run('state.used.includes(stored)'),true);assert.equal(run('state.lost.includes(stored)'),false);
});
test('All Too Easy is offered before a lightsaber hit at Carbonite Chamber',()=>{
 const {run}=setup();run(`const vader=card('Dark:634'),luke=card('Light:1593'),source=card('Dark:87'),shot={weapon:card('Dark:2702'),host:vader,target:luke,effect:'hit'};state.dark[0]=[vader];state.light[0]=[luke];state.botHand=[source];const option=ccEffectOptions('Dark',{kind:'cloudCityWouldHit',side:'Dark',shot,target:luke,site:0})[0];state.botHand=[];settleHothEffect({...option,side:'Dark'});`);assert.equal(run('luke.captured'),true);assert.equal(run('luke.frozen'),true);assert.equal(run('state.pendingCustody[0].card===luke'),true);
});
