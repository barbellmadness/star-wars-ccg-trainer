import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/dagobah-harness.mjs';
const setup=run=>run(`const yoda=card('Light:2865'),luke=card('Light:2304');state.light[3]=[yoda,luke];const complete=(id,n)=>{const t=card(id);t.dagobahJediTest=n;(luke.attachments??=[]).push(t);};const play=mode=>performAction(legalActions(state,'Light').find(action=>action.mode===mode));`);
test('Great Warrior charges the normal deploy cost when introducing an apprentice from hand',()=>{
 const {run}=harness();run(`const yoda=card('Light:2865');state.light[3]=[yoda];state.hand=[card('Light:1071'),card('Light:1495')];const before=state.force.length;`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='dago:testDeploy'&&action.site===3))`),true);
 assert.equal(run(`before-state.force.length`),run(`state.light[3].find(c=>c.id==='Light:1495').deploy`));
 assert.equal(run(`state.light[3].find(c=>c.id==='Light:1495').dagobahApprentice`),true);
});
test('One mentor cannot train two apprentices and a completed test cannot be deployed twice on one apprentice',()=>{
 const {run}=harness();setup(run);run(`state.hand=[card('Light:1071')];play('dago:testDeploy');state.light[3].push(card('Light:1495'));state.hand=[card('Light:1071')];`);
 assert.equal(run(`dagoJediOptions('Light').filter(o=>o.mode==='dago:testDeploy').length`),0);
});
test('A Jedi’s Strength requires an unoccupied site, restricts travel and lets the opponent move the test only in its owner’s Move phase',()=>{
 const {run}=harness();setup(run);run(`complete('Light:1071',1);state.hand=[card('Light:30')];`);
 assert.equal(run(`dagoJediOptions('Light').some(o=>o.site===3)`),false);
 assert.equal(run(`performAction(legalActions(state,'Light').find(o=>o.mode==='dago:testDeploy'&&o.site===4))`),true);
 assert.equal(run(`dagoMoveAllowed('Light',luke,3,4,'Landspeed')`),true);
 assert.equal(run(`dagoMoveAllowed('Light',luke,3,4,'shuttle')`),false);
 run(`state.activeSide='Dark';PremiereGame.setPhase(state,4);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.pendingCardView===null||state.pendingCardView===undefined`),true);
 run(`state.activeSide='Light';checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.pendingCardView.side`),'Dark');
});
test('Completed training raises ability, increases power, and imposes the six-ability destiny requirement',()=>{
 const {run}=harness();setup(run);run(`const pupil=card('Light:1495');state.light[0]=[pupil];const t=card('Light:30');t.dagobahJediTest=2;pupil.attachments=[t];`);
 assert.ok(run(`cardPowerModifier(pupil,'Light',0)>=1`));
 assert.equal(run(`battleDestinyDrawCount('Dark',0,5)`),0);
});
test('Domain Of Evil is attempted at the end of a turn with no battle, drain or training activity',()=>{
 const {run}=harness();setup(run);run(`complete('Light:1071',1);complete('Light:30',2);state.hand=[card('Light:752')];performAction(legalActions(state,'Light').find(o=>o.mode==='dago:testDeploy'&&o.site===5));state.light[3].splice(state.light[3].indexOf(luke),1);state.light[5].push(luke);state.deck=[{...card('Light:259'),destiny:6}];PremiereGame.setPhase(state,5);checkpoint('turn:end',()=>{});`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagAttemptThree');
 run(`finishDagobahChoice(state.pendingCardView,'attempt');`);
 assert.equal(run(`dagoCompleted('Light',3)`),true);
});
test('Domain Of Evil is unavailable after the apprentice’s side took part in a battle',()=>{
 const {run}=harness();setup(run);run(`complete('Light:1071',1);complete('Light:30',2);state.hand=[card('Light:752')];performAction(legalActions(state,'Light').find(o=>o.mode==='dago:testDeploy'&&o.site===5));state.light[3].splice(state.light[3].indexOf(luke),1);state.light[5].push(luke);state.dagobahTurnActivity={Light:{turn:state.game.timing.turn,battle:true}};PremiereGame.setPhase(state,5);checkpoint('turn:end',()=>{});`);
 assert.equal(run(`state.pendingCardView===null||state.pendingCardView===undefined`),true);
});
test('Size Matters Not unlocks a paid once-per-Control-phase Reserve search',()=>{
 const {run}=harness();setup(run);run(`complete('Light:1071',1);complete('Light:30',2);complete('Light:752',3);complete('Light:2272',4);PremiereGame.setPhase(state,1);`);
 assert.equal(run(`play('dago:testFourSearch')`),true);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagSearch');
 run(`finishDagobahChoice(state.pendingCardView,'done');`);
 assert.equal(run(`dagoEffectActions('Light').some(o=>o.mode==='dago:testFourSearch')`),false);
});
test('Test five meditates through the next own turn and stores exactly one of the top two Reserve cards',()=>{
 const {run}=harness();setup(run);run(`complete('Light:1071',1);complete('Light:30',2);complete('Light:752',3);complete('Light:2272',4);state.hand=[card('Light:1332')];performAction(legalActions(state,'Light').find(o=>o.mode==='dago:testDeploy'&&o.site===3));PremiereGame.setPhase(state,1);checkpoint('phase:start',()=>{});const began=state.game.timing.turn;play('dago:testAttempt');const before=state.deck.length;`);
 assert.equal(run(`luke.power+cardPowerModifier(luke,'Light',3)`),0);
 assert.equal(run(`dagoMoveAllowed('Light',luke,3,4,'Landspeed')`),false);
 run(`checkpoint('turn:end',()=>{});`);
 assert.equal(run(`dagoCompleted('Light',5)`),false);
 run(`state.game.timing.turn=began+2;checkpoint('turn:end',()=>{});`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagTestFiveCard');
 run(`const choice=state.pendingCardView.choices[0];finishDagobahChoice(state.pendingCardView,...choice.args);`);
 assert.equal(run(`state.deck.length`),run(`before-1`));
 assert.equal(run(`luke.attachments.find(c=>c.dagobahJediTest===5).support.length`),1);
});
test('Substituted Test-five destiny is reusable and unmodified; losing the apprentice also loses the supporting card',()=>{
 const {run}=harness();setup(run);run(`const t=card('Light:1332'),stored=card('Light:259');t.dagobahJediTest=5;t.support=[stored];t.dagobahDestinyValue=4;luke.attachments=[t];const before=state.deck.length;let values=[];drawDestinySeries('Light','training',2,10,draws=>values=draws.map(d=>d.value));finishDagobahChoice(state.pendingCardView,'use');finishDagobahChoice(state.pendingCardView,'use');`);
 assert.equal(run(`JSON.stringify(values)`),'[4,4]');
 assert.equal(run(`state.deck.length`),run(`before`));
 run(`loseTableCard('Light',3,luke);`);
 assert.equal(run(`state.lost.includes(t)&&state.lost.includes(stored)`),true);
});
