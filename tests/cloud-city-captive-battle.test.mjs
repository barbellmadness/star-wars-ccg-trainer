import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Captive Fury uses the captive owner even though Dark Side controls the escort',()=>{
 const {run}=harness();run(`const captive=card('Light:1593'),escort=card('Dark:287'),source=card('Light:376');captive.captured=true;captive.controller='Dark';escort.escortedCaptive=captive;state.dark[0]=[escort];state.hand=[source];PremiereGame.setPhase(state,3);`);
 assert.equal(run("ccInterruptOptions('Light').some(option=>option.mode==='cc:captiveFury')"),true);
 run(`const frame=ccInterruptOptions('Light').find(option=>option.mode==='cc:captiveFury');ccSettleInterrupt({...frame,side:'Light'},null);`);assert.equal(run('battleSession.participants.Light.includes(captive)'),true);assert.equal(run('captive.captured'),undefined);
});
test('Captive Pursuit releases its target after the battle session has closed',()=>{
 const {run}=harness();run(`const captive=card('Light:1593'),escort=card('Dark:287');captive.captured=true;captive.controller='Dark';escort.escortedCaptive=captive;state.dark[0]=[escort];state.cloudCityPursuit=[{side:'Light',target:captive,site:0}];battleSession=null;endBattleTiming(0,{lightTotal:20,darkTotal:10},{Light:[],Dark:[escort]});`);assert.equal(run('state.light[0].includes(captive)'),true);assert.equal(run('captive.captured'),undefined);assert.equal(run('escort.escortedCaptive'),undefined);
});
