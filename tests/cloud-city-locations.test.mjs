import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Cloud City docking platforms have printed side-specific transit costs',()=>{
 const {run}=harness(['locations']);assert.equal(run("PremiereLocations.conditions(state,1,'Dark').transitCost"),1);assert.equal(run("PremiereLocations.conditions(state,1,'Light').transitCost"),2);
});
test('Bespin control changes opponent deployment costs at city locations',()=>{
 const {run}=harness(['locations']);run("state.light[4]=[card('Light:2838')];const trooper=card('Dark:435');");
 assert.equal(run("ccBespinDeployModifier(trooper,state.locations[0],'Dark')"),1);
 run("state.light[4]=[];state.dark[4]=[card('Dark:2595')];");assert.equal(run("ccBespinDeployModifier(trooper,state.locations[0],'Dark')"),-1);
});
test('controlled city sector adds each friendly craft to power at city sites',()=>{
 const {run}=harness(['locations']);run("state.light[2]=[card('Light:2838'),card('Light:426')];state.light[0]=[card('Light:1803')];");assert.equal(run("hothBattlePower('Light',0)"),2);
});
test('Clouds enhancement is optional, belongs to a chosen related site and is once per turn',()=>{
 const {run}=harness(['locations']);run("state.light[3]=[card('Light:2838')];state.light[0]=[card('Light:1803')];PremiereGame.setPhase(state,1);");
 const before=run("forceDrainValue('Light',0)");run("playHothAction('Light',...ccActionOptions('Light').find(option=>option.mode==='cc:chooseCloudDrain'&&option.site===0).args);");assert.equal(run("forceDrainValue('Light',0)"),before+1);
 run("resolveForceDrain('Light',0,0);");assert.equal(run("ccUsed(state.locations[3],'drainBoost')"),true);
});
