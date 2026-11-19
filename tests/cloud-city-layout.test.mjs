import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
const setup=()=>harness(['devices','freezing','locations','weather-vane','units','weapons','effects','abilities','reacts','interrupts','battle','duels','storage','timing','layout','support']);
test('Cloud City docking bays bracket the interiors; sites cannot deploy between the second bay and the sector',()=>{
 const {run}=setup();run(`state.locations=[card('Light:455'),card('Light:438'),card('Dark:447'),card('Light:229'),card('Light:226')];state.locationOrder=[0,1,2,3,4];const site=card('Light:448');`);
 assert.equal(run("JSON.stringify(locationPositionsForCard('Light',site))"),'[1,2]');
});
test('Cloud City site rearrangement preserves stable slot IDs, attached cards and both docking bays',()=>{
 const {run}=setup();run(`const actor=card('Light:305');state.light[0]=[actor];let done=false;ccRearrangeSites('Dark',card('Dark:1121'),()=>{done=true;});finishDagobahChoice(state.pendingCardView,1);finishDagobahChoice(state.pendingCardView,0);`);assert.equal(run('done'),true);assert.equal(run('state.light[0][0]===actor'),true);assert.equal(run('state.locationOrder[0]'),1);
});
test('Cloud sector deployment requires a Force icon or friendly presence and does not accept ground vehicles',()=>{
 const {run}=setup();run(`state.locations[2].icons.light=0;state.light[2]=[];const car=card('Light:426');`);assert.equal(run("boardDeployCost(car,state.locations[2],'Light')"),null);run("state.light[2]=[card('Light:2838')]");assert.equal(run("boardDeployCost(car,state.locations[2],'Light')!==null"),true);assert.equal(run("dagoCanDeploy(car,state.locations[2],'Light')"),true);
});
test('A cloud-car weapon target remains the original live card',()=>{
 const {run}=setup();run(`const target=card('Dark:425'),ship=card('Light:2838'),weapon=card('Light:1962');state.dark[2]=[target];state.light[2]=[ship];const shot=weaponShot(weapon,ship,target,2);`);assert.equal(run('shot.target===target'),true);
});
