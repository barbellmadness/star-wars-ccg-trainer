import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
const setup=()=>harness(['devices','units','freezing','locations','effects','abilities','reacts']);
test('Tibanna miners cumulatively activate for clouds and Beldon doubles the extra activation',()=>{
 const {run}=setup();run(`const miner=card('Light:2592');state.light[0]=[miner];state.light[2]=[card('Light:2838')];state.locationEffects={2:[{card:card('Light:217'),site:2,target:'Light'}]};PremiereGame.setPhase(state,0);const option=ccActivatedOptions('Light').find(option=>option.mode==='cc:activate');option.resolve('Light');`);
 assert.equal(run('state.force.length'),24);assert.equal(run("ccActivatedOptions('Light').some(option=>option.mode==='cc:activate')"),false);
});
test('Cloud City technician raises the friendly converted site without dropping attachments or occupants',()=>{
 const {run}=setup();run(`const tech=card('Light:434'),friendly=state.locations[0];state.light[0]=[tech];state.locations[0]=card('Dark:437');state.convertedLocations={0:[friendly]};const option=ccActivatedOptions('Light').find(option=>option.mode==='cc:raiseSite');option.resolve('Light');`);
 assert.equal(run('state.locations[0]===friendly'),true);assert.equal(run('state.light[0][0]===tech'),true);assert.equal(run('state.force.length'),18);
});
test('Treva sells an Interrupt, opponent chooses payment, ownership and activation transfer',()=>{
 const {run}=setup();run(`const treva=card('Light:2631'),sold=card('Light:433');state.light[0]=[treva];state.hand=[sold];PremiereGame.setPhase(state,1);const option=ccActivatedOptions('Light').find(option=>option.mode==='cc:sell');option.resolve('Light');const frame=state.pendingCardView;finishDagobahChoice(frame,'destiny');`);
 assert.equal(run('state.botUsed.includes(sold)'),true);assert.equal(run("sold.owner"),'Dark');assert.equal(run('state.force.length'),run('20+sold.destiny'));assert.equal(run('state.botForce.length'),run('20-sold.destiny'));
});
test('Lobot deploys only as a react and Cloud Cars can react to cloud sectors',()=>{
 const {run}=setup();run(`state.hand=[card('Light:1562'),card('Light:426')];const siteFrame={kind:'battle',side:'Dark',site:0},cloudFrame={kind:'drain',side:'Dark',site:2};`);
 assert.equal(run("boardDeployCost(state.hand[0],state.locations[0],'Light')"),null);
 assert.equal(run("reactDeployOptions('Light',siteFrame).some(option=>option.card.id==='Light:1562')"),true);
 assert.equal(run("reactDeployOptions('Light',cloudFrame).some(option=>option.card.id==='Light:426')"),true);
});
test('E-3PO cannot insult R2-D2, can suppress another droid once each turn',()=>{
 const {run}=setup();run(`const e=card('Dark:801'),r2=card('Light:1992'),other=card('Light:1404');state.dark[0]=[e];state.light[0]=[r2,other];const options=ccActivatedOptions('Dark').filter(option=>option.mode==='cc:insult');options[0].resolve('Dark');`);
 assert.equal(run('options.length'),1);assert.equal(run('PremiereUnits.textSuppressed(other)'),true);assert.equal(run("ccActivatedOptions('Dark').some(option=>option.mode==='cc:insult')"),false);
});
