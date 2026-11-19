import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Unique and restricted Cloud City cards have a shared turn limit, including canceled plays',()=>{
 const {run}=harness();run(`const source=card('Light:640'),second=card('Light:640'),host=card('Light:1593');state.light[0]=[host];state.dark[0]=[card('Dark:634')];state.botHand=[card('Dark:2216')];state.hand=[source,second];const action=legalActions(state,'Light').find(action=>action.card===source&&action.mode==='cc:dash');performAction(action);PremiereGame.cancelResponse(state.game,PremiereGame.responseWindow(state.game));settleCancelledResponse(state.game);`);assert.equal(run("legalActions(state,'Light').some(action=>action.card===second&&action.mode==='cc:dash')"),false);assert.equal(run("ccPlayCount(second,'Light')"),1);
});
test('Stored cards are visible to their owner, concealed from the opponent and absent from the regular hand',()=>{
 const {run}=harness();run(`const host=card('Light:2810'),device=card('Light:592'),stored=card('Light:139');device.cloudCityStored=[stored];host.attachments=[device];state.light[0]=[host];state.hand=[card('Light:1593')];const own=PremiereGame.playerView(state,'Light'),opponent=PremiereGame.playerView(state,'Dark');`);assert.equal(run('own.players.Light.board[0][0].attachments[0].cloudCityStored[0].id'),'Light:139');assert.equal(run('JSON.stringify(opponent.players.Light.board[0][0].attachments[0].cloudCityStored)'),'[{"faceDown":true}]');assert.equal(run('own.players.Light.hand.length'),1);
});
test('A Sabacc view sets aside the normal hand and exposes only the current Sabacc hand to its owner',()=>{
 const {run}=harness();run(`state.hand=[card('Light:1593')];state.cloudCitySabacc={hands:{Light:[card('Light:259')],Dark:[card('Dark:1264'),card('Dark:1264')]}};const view=PremiereGame.playerView(state,'Light');`);assert.equal(run('view.players.Light.hand[0].id'),'Light:259');assert.equal(run('view.players.Dark.handCount'),2);assert.equal(run('view.players.Dark.hand'),undefined);assert.equal(run('state.hand[0].id'),'Light:1593');
});
test('Tibanna drain bonuses do not accumulate, while each miner has its own activation',()=>{
 const {run}=harness();run(`state.light[0]=[card('Light:2592'),card('Light:2592'),card('Light:2592')];state.light[2]=[card('Light:2838')];const before=forceDrainEffects('Light',2).modifier;state.light[0].splice(1);const after=forceDrainEffects('Light',2).modifier;`);assert.equal(run('before'),run('after'));
});
test('Dining Room control doubles Blue Milk and preserves its ordinary pile handling',()=>{
 const {run}=harness();run(`state.locations[0]=card('Dark:444');state.light[0]=[card('Light:305')];const source=card('Light:282'),count=state.force.length;settlePileInterrupt({card:source,side:'Light',targetSide:'Light',rule:{mode:'blueMilk',pile:'Used'}});`);assert.equal(run('state.force.length-count'),2);assert.equal(run('state.used.includes(source)'),true);
});
test('Haven offers the extra destiny as an optional response, once per battle',()=>{
 const {run}=harness();run(`const source=card('Light:1112');state.locationEffects={4:[{card:source,site:4,target:'Light'}]};state.light[4]=[card('Light:2838')];battleSession={site:4,initiator:'Light',participants:{Light:state.light[4],Dark:[]},extraDraws:{Light:0,Dark:0}};const window={kind:'beforeBattleDestiny',side:'Light',site:4};const option=ccResponseProviders.flatMap(provider=>provider('Light',window)).find(option=>option.mode==='cc:havenDestiny');option.resolve('Light');`);assert.equal(run('battleSession.extraDraws.Light'),1);assert.equal(run("ccResponseProviders.flatMap(provider=>provider('Light',window)).some(option=>option.mode==='cc:havenDestiny')"),false);
});
