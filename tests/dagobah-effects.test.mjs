import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/dagobah-harness.mjs';
const setup=run=>run(`const put=(id,fields={})=>{const c=card(id);dagoSettleEffect({card:c,side:c.side,...fields});return c;};const action=(id,mode)=>legalActions(state,card(id).side).find(a=>a.kind==='hothAction'&&a.card?.id===id&&(!mode||a.mode===mode));`);
test('New effect cards have actual deploy offers in the common action engine',()=>{
 const {run}=harness();setup(run);run(`state.hand=[card('Light:957')];const offer=action('Light:957');`);
 assert.equal(run(`!!offer`),true);
 assert.equal(run(`performAction(offer)`),true);
 run(`for(let i=0;i<8&&PremiereGame.responseWindow(state.game);i++){const f=PremiereGame.responseWindow(state.game);performAction(legalActions(state,f.priority).find(o=>o.kind==='passResponse'));}`);
 assert.equal(run(`dagoEffects('Light:957').length`),1);
});
test('Flash Of Insight charges three Force and draws exactly one normal card',()=>{
 const {run}=harness();setup(run);run(`put('Light:957');const hand=state.hand.length,force=state.force.length;`);
 assert.equal(run(`performAction(action('Light:957','dago:flash'))`),true);
 assert.equal(run(`state.hand.length`),run(`hand+1`));
 assert.equal(run(`state.force.length`),run(`force-3`));
});
test('Hiding In The Garbage commits to a type and reveals each Force card before taking the match',()=>{
 const {run}=harness();setup(run);run(`put('Light:1140');const hit=card('Light:1495'),miss=card('Light:259');state.force=[hit,miss];`);
 assert.equal(run(`performAction(action('Light:1140'))`),true);
 run(`finishDagobahChoice(state.pendingCardView,'Character');`);
 assert.equal(run(`state.hand.includes(hit)`),true);
 assert.equal(run(`state.used.includes(miss)`),true);
 assert.equal(run(`state.force.length`),0);
});
test('Quick Draw deploys a retrieved blaster immediately and cannot repeat in the same Draw phase',()=>{
 const {run}=harness();setup(run);run(`const warrior=card('Light:1495'),blaster=card('Light:259');state.light[0]=[warrior];state.lost=[blaster];put('Light:1976');PremiereGame.setPhase(state,5);`);
 assert.equal(run(`performAction(action('Light:1976'))`),true);
 assert.equal(run(`warrior.weapons.includes(blaster)&&!state.lost.includes(blaster)`),true);
 assert.equal(run(`!!action('Light:1976')`),false);
});
test('Reflection retrieves one Force once during its owner’s Control phase',()=>{
 const {run}=harness();setup(run);run(`const leia=card('Light:1495');state.light[0]=[leia];put('Light:2078',{host:leia});const lost=card('Light:259');state.lost=[lost];PremiereGame.setPhase(state,1);`);
 assert.equal(run(`performAction(action('Light:2078'))`),true);
 assert.equal(run(`state.used.includes(lost)`),true);
 assert.equal(run(`!!action('Light:2078')`),false);
});
test('The Dark Path keeps the unchosen top-three card in place and loses exactly two',()=>{
 const {run}=harness();setup(run);run(`put('Dark:2518');state.activeSide='Dark';const a=card('Dark:308'),b=card('Dark:9'),c=card('Dark:2912');state.botDeck=[a,b,c];`);
 assert.equal(run(`performAction(action('Dark:2518'))`),true);
 run(`finishDagobahChoice(state.pendingCardView,0);finishDagobahChoice(state.pendingCardView,0);`);
 assert.equal(run(`state.botLost.length`),2);
 assert.equal(run(`state.botDeck.length`),1);
 assert.equal(run(`!!action('Dark:2518')`),false);
});
test('Stone Pile conceals two random enemy hand cards and returns both when canceled',()=>{
 const {run}=harness();setup(run);run(`state.botHand=[card('Dark:308'),card('Dark:9'),card('Dark:2912')];const stone=put('Light:2352',{site:3});const effect=dagoEffects('Light:2352')[0];`);
 assert.equal(run(`state.botHand.length`),1);
 assert.equal(run(`effect.support.length`),2);
 run(`hothCancelEffect(effect);`);
 assert.equal(run(`state.botHand.length`),3);
 assert.equal(run(`state.lost.includes(stone)`),true);
});
test('Stone Pile is canceled by occupation even if that player has no ability or control',()=>{
 const {run}=harness();setup(run);run(`state.botHand=[card('Dark:308'),card('Dark:9')];put('Light:2352',{site:3});state.dark[3]=[card('Dark:1279')];dagoContinuous();`);
 assert.equal(run(`dagoEffects('Light:2352').length`),0);
 assert.equal(run(`state.botHand.length`),2);
});
test('Broken Concentration moves one Force card to Reserve, charges two, and is once per turn',()=>{
 const {run}=harness();setup(run);run(`put('Dark:336');state.activeSide='Dark';const force=state.botForce.length,top=state.force.at(-1),count=state.deck.length;`);
 assert.equal(run(`performAction(action('Dark:336'))`),true);
 assert.equal(run(`state.deck.at(-1)===top&&state.deck.length===count+1`),true);
 assert.equal(run(`state.botForce.length`),run(`force-2`));
 assert.equal(run(`!!action('Dark:336')`),false);
});
test('Wars Not Make One Great adds one global cost without stacking duplicate copies',()=>{
 const {run}=harness();setup(run);run(`const before=battleInitiationCost(0);put('Light:2741',{site:3});put('Light:2741',{site:4});`);
 assert.equal(run(`battleInitiationCost(0)`),run(`before+1`));
});
test('Encampment permits ordinary characters to deploy without Force icons on Dagobah',()=>{
 const {run}=harness();setup(run);run(`state.locations[3].icons.light=0;state.light[3]=[];const rebel=card('Light:2052');put('Light:838',{site:3});`);
 assert.notEqual(run(`boardDeployCost(rebel,state.locations[3],'Light')`),null);
});
test('At Peace can move to a test but the apprentice remains unable to train through the next own turn',()=>{
 const {run}=harness();setup(run);run(`const yoda=card('Light:2865'),luke=card('Light:2304');state.light[3]=[yoda,luke];luke.dagobahApprentice=true;const test=card('Light:1071');state.tableEffects=[{card:test,side:'Light',site:3,mentor:yoda,apprentice:luke}];put('Light:157',{host:luke,restUntil:state.game.timing.turn+2});`);
 assert.equal(run(`performAction(action('Light:157'))`),true);
 assert.equal(run(`dagoJediCanAttempt(state.tableEffects.find(e=>e.card===test),'Light')`),false);
 assert.equal(run(`dagoTrainingModifier(state.tableEffects.find(e=>e.card===test))>=3`),true);
});
test('Yoda’s Hope must be lost when its Levitation search is used',()=>{
 const {run}=harness();setup(run);run(`const yoda=card('Light:2865');state.light[3]=[yoda];const hope=put('Light:2873',{host:yoda});state.deck.push(card('Light:1512'));`);
 assert.equal(run(`performAction(action('Light:2865','dago:hope'))`),true);
 assert.equal(run(`state.lost.includes(hope)&&!yoda.attachments.includes(hope)`),true);
});
