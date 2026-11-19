import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Double-Crossing after Nabrun opens immediate deployments and makes troopers free',()=>{
 const {run}=harness();run(`const nabrun=card('Light:1749'),source=card('Dark:765'),trooper=card('Dark:2355');state.used=[nabrun];state.botHand=[trooper];state.phase=4;const parent=PremiereGame.openResponse(state.game,{kind:'transportCompleted',side:'Light',card:nabrun,site:0});ccSettleBattleInterrupt({mode:'cc:nabrunDeploy',side:'Dark',card:source,target:nabrun,site:0,rule:{pile:'Lost'}},parent,()=>{});const option=state.pendingCardView.choices.find(choice=>choice.card===trooper&&choice.action.kind==='deploy');const before=state.botForce.length;finishDagobahChoice(state.pendingCardView,...option.args);`);
 assert.equal(run('state.lost.includes(nabrun)'),true);assert.equal(run('state.dark[0].includes(trooper)'),true);assert.equal(run('state.botForce.length'),run('before'));assert.equal(run('state.phase'),4);
 assert.equal(run("state.game.responses.some(window=>window.kind==='react')"),false);
 run(`if(state.pendingCardView)finishDagobahChoice(state.pendingCardView,'done');`);assert.equal(run('state.botLost.includes(source)'),true);
});
test('Double-Crossing preserves the surrounding transport response and stops when requested',()=>{
 const {run}=harness();run(`const source=card('Dark:765'),nabrun=card('Light:1749');state.used=[nabrun];const parent=PremiereGame.openResponse(state.game,{kind:'transportCompleted',side:'Light',card:nabrun,site:0});ccSettleBattleInterrupt({mode:'cc:nabrunDeploy',side:'Dark',card:source,target:nabrun,site:0,rule:{pile:'Lost'}},parent,()=>{});finishDagobahChoice(state.pendingCardView,'done');`);assert.equal(run('PremiereGame.responseWindow(state.game)===parent'),true);assert.equal(run('state.cloudCityNabrun'),undefined);
});
