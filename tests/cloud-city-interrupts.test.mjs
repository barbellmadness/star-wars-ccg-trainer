import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
const setup=()=>harness(['devices','freezing','locations','weather-vane','units','weapons','effects','abilities','reacts','interrupts','battle','duels']);
test('Cloud City Effects and Used/Lost searches are offered through normal legal actions',()=>{
 const {run}=setup();run(`state.hand=[card('Light:583'),card('Light:139')];state.deck=[card('Light:1132')];`);
 assert.equal(run("hothActionOptions('Light').some(option=>option.card.id==='Light:583')"),true);assert.equal(run("hothInterruptOptions('Light').find(option=>option.card.id==='Light:139').rule.pile"),'Used');
});
test('Blaster Proficiency is Used for its +3 total mode, Dodge penalizes every draw',()=>{
 const {run}=setup();run(`const source=card('Light:261'),dodge=card('Light:749'),host=card('Light:360'),target=card('Dark:287');state.light[0]=[host];state.dark[0]=[target];state.hand=[source];state.botHand=[dodge];const shot={weapon:card('Light:1603'),host,target,bonus:1,from:0};const window={kind:'weaponTarget',side:'Light',site:0,shot};const option=ccInterruptOptions('Light',window).find(option=>option.mode==='cc:weaponPlus');ccSettleInterrupt({...option,side:'Light'},window);`);
 assert.equal(run('shot.bonus'),4);assert.equal(run('state.used.includes(source)'),true);
});
test('Off The Edge retrieves the difference, loses the difference, or loses its target on a tie',()=>{
 for(const delta of [-1,0,2]){const {run}=setup();run(`const source=card('Light:1821'),target=card('Light:360');target.destiny=3;state.light[0]=[target];state.hand=[source];state.deck=[{...card('Light:259'),destiny:${3+delta}}];state.lost=[card('Light:259'),card('Light:259'),card('Light:259')];const option=ccInterruptOptions('Light').find(option=>option.mode==='cc:offEdge');ccSettleInterrupt({...option,side:'Light'},null);`);if(delta<0)assert.equal(run('state.pendingForceLoss.remaining'),1);if(delta===0)assert.equal(run('state.lost.includes(target)'),true);if(delta>0)assert.equal(run('state.lost.length'),2);}
});
test('Projective Telepathy leaves the opponent the payment choice and can cancel a Force drain',()=>{
 const {run}=setup();run(`const cardSource=card('Dark:1957'),parent=PremiereGame.openResponse(state.game,{kind:'drain',side:'Light',site:0});state.botHand=[cardSource];state.force=[];const option=ccInterruptOptions('Dark',parent)[0];ccSettleInterrupt({...option,side:'Dark'},parent);finishDagobahChoice(state.pendingCardView,'cancel');`);assert.equal(run('parent.cancelled'),true);assert.equal(run('state.botUsed.includes(cardSource)'),true);
});
test('Epic Duel replaces the old power comparison and Vader loses out of play plus six Force',()=>{
 const {run}=setup();run(`state.game.playerSide='Dark';const vader=card('Dark:634'),obi=card('Light:1803'),source=card('Dark:2517');state.dark[0]=[vader];state.light[0]=[obi];state.tableEffects=[{card:card('Dark:879'),target:'Dark'}];state.botHand=[source];state.botDeck=[{...card('Dark:1264'),destiny:0},{...card('Dark:1264'),destiny:0}];state.deck=[{...card('Light:259'),destiny:6},{...card('Light:259'),destiny:6}];const frame=duelOptions('Dark')[0];settleDuel({...frame,side:'Dark'});`);assert.equal(run('state.outOfPlay.includes(vader)'),true);assert.equal(run('state.pendingForceLoss.remaining'),6);
});
