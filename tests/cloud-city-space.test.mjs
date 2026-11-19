import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Cloud City modules preserve Dagobah while identifying cloud sectors separately',()=>{
 const {run}=harness();assert.equal(run('cloudCityEnabled()&&dagobahEnabled()&&hothEnabled()'),true);
 assert.equal(run("locationGroup(state.locations[0])"),'bespin');assert.equal(run("dagoSystemSlot(0)"),4);
 assert.equal(run('ccClouds("bespin").join(",")'),'2,3');assert.equal(run('dagoSectors(4).length'),0);
});
test('cloud movement visits the lowest and highest sectors and never skips directly to the planet',()=>{
 const {run}=harness();run("const ship=card('Light:2838');state.light[4]=[ship];");
 assert.equal(run("travelOptions(ship,'Light',4,3).length"),1);assert.equal(run("travelOptions(ship,'Light',4,2).length"),0);
 assert.equal(run("travelOptions(ship,'Light',3,2).length"),1);assert.equal(run("travelOptions(ship,'Light',2,1).length"),1);
 assert.equal(run("travelOptions(ship,'Light',3,1).length"),0);assert.equal(run("travelOptions(ship,'Light',4,1).length"),0);
});
test('ordinary capital ships cannot enter clouds and Clouds applies both ship penalties',()=>{
 const {run}=harness();run("const capital=card('Light:2073'),tie=card('Dark:1817');state.dark[3]=[tie];");
 assert.equal(run("travelOptions(capital,'Light',4,3).length"),0);
 assert.equal(run("craftDeployCost(capital,state.locations[3],'Light')"),null);
 assert.equal(run("craftStats(tie,3).power-tie.power"),1);
 assert.equal(run("craftStats(tie,3).maneuver"),run('tie.maneuver-2'));
});
test('Sabacc cards remain Life Force and can satisfy losses without exposing the regular hand',()=>{
 const {run}=harness();run("state.deck=[];state.force=[];state.used=[];state.hand=[card('Light:1466')];state.cloudCitySabacc={hands:{Light:[card('Light:259'),card('Light:259')],Dark:[]}};");
 assert.equal(run("PremiereGame.lifeForce(state,'Light')"),2);assert.equal(run("PremiereGame.lossChoices(state,'Light')[0].args[0]"),'sabacc');
 assert.equal(run("PremiereGame.loseForce(state,'Light','sabacc',0).id"),'Light:259');assert.equal(run("state.hand.length"),1);
});
