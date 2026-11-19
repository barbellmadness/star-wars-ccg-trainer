import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('drain suppression retains bonuses printed on opponent locations, but removes own saber bonuses',()=>{
 const {run}=harness();run(`state.locations[0]=card('Light:459');const vader=card('Dark:634');vader.weapons=[card('Dark:2702')];state.dark[0]=[vader];state.light[0]=[];const baseline=forceDrainEffects('Dark',0);ccDecree=side=>side==='Light';const suppressed=forceDrainEffects('Dark',0);`);
 assert.equal(run('suppressed.modifier'),1);assert.equal(run('suppressed.optional'),0);assert.equal(run('suppressed.base'),run('baseline.base'));
});
test('drain suppression preserves the negative modifier printed on a location',()=>{
 const {run}=harness();run(`state.locations[0]=card('Dark:449');state.light[0]=[card('Light:1593')];state.dark[0]=[];ccDecree=side=>side==='Dark';const suppressed=forceDrainEffects('Light',0);`);assert.equal(run('suppressed.modifier'),-1);
});
