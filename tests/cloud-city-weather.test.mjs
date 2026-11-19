import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Weather Vane holds only the newest arrival and loses cards previously hanging there',()=>{
 const {run}=harness(['captives','devices','weather-vane']);run(`const vane=card('Light:2779');state.tableEffects=[{card:vane,support:[],target:'Light'}];const first=card('Light:1593'),next=card('Light:1803');state.light[0]=[first,next];ccToWeatherVane(first,0);ccToWeatherVane(next,0);`);
 assert.equal(run('state.lost.includes(first)'),true);assert.equal(run('state.tableEffects[0].support[0]===next'),true);assert.equal(run('!!ccEntry(next)'),false);
});
test('Weather Vane rescue respects craft capacity and capture remains Dark Side only',()=>{
 const {run}=harness(['captives','devices','weather-vane']);run(`const target=card('Light:1593'),vane=card('Light:2779'),ship=card('Light:1677');PremiereUnits.add(ship,card('Light:305'),'pilot','Light');state.tableEffects=[{card:vane,support:[target],target:'Light'}];state.light[2]=[ship];PremiereGame.setPhase(state,1);`);
 assert.ok(run("ccActionOptions('Light').some(option=>option.mode==='cc:weatherRescue')"));assert.equal(run("ccActionOptions('Light').some(option=>option.mode==='cc:weatherCapture')"),false);
 run("playHothAction('Light',...ccActionOptions('Light').find(option=>option.mode==='cc:weatherRescue').args);");assert.equal(run('ship.occupants.some(entry=>entry.card===target)'),true);
});
test('Chasm Walkway redirects a hit to Weather Vane instead of losing or marking the character',()=>{
 const {run}=harness(['captives','devices','weather-vane']);run(`state.locations[0]=card('Light:442');const target=card('Light:1593');state.light[0]=[target];state.tableEffects=[{card:card('Light:2779'),support:[],target:'Light'}];applyWeaponResult({host:card('Dark:634'),target,effect:'hit'},'Light',0);`);
 assert.equal(run('state.tableEffects[0].support[0]===target'),true);assert.equal(run('!!target.hitForLoss'),false);assert.equal(run('state.lost.includes(target)'),false);
});
