import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/dagobah-harness.mjs';
const setup=run=>run(`function sector(id='Light:149'){const loc=card(id),slot=state.locations.length;loc.dagobahSystemSlot=2;state.locations.push(loc);state.light.push([]);state.dark.push([]);state.locationOrder.push(slot);return slot;}function lostSpace(id='Light:2040'){const pilot=card(id),effect={card:card('Dark:1583'),site:2,support:[pilot]};(state.locationEffects[2]??=[]).push(effect);return {pilot,effect};}`);
test('Rogue Asteroid moves once in either Move phase and reverses at the end of the belt',()=>{
 const {run}=harness();setup(run);run(`const a=sector(),b=sector(),rogue=card('Light:2124');state.locationEffects[a]=[{card:rogue,site:a,direction:1}];PremiereGame.setPhase(state,4);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`dagoEffects('Light:2124')[0].site`),run('a'));
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='dago:rogueMove'))`),true);
 assert.equal(run(`dagoEffects('Light:2124')[0].site`),run('b'));
 run(`checkpoint('phase:end',()=>{});`);assert.equal(run(`dagoEffects('Light:2124')[0].site`),run('b'));
 run(`PremiereGame.setPhase(state,5);PremiereGame.setPhase(state,4);checkpoint('phase:end',()=>{});`);
 assert.equal(run(`dagoEffects('Light:2124')[0].site`),run('a'));
});
test('Starship weapons can hit Rogue Asteroid at defense three; character blasters cannot',()=>{
 const {run}=harness();setup(run);run(`const slot=sector(),rogue=card('Light:2124');state.locationEffects[slot]=[{card:rogue,site:slot,direction:1}];const gun=card('Dark:2644'),ship=card('Dark:176');`);
 assert.equal(run(`weaponShot(card('Light:259'),card('Light:1495'),rogue,null)`),null);
 assert.equal(run(`weaponTargets('Light',slot).some(target=>target.card===rogue)`),true);
 run(`const shot={...weaponShot(gun,ship,rogue,null),weapon:gun,host:ship,target:rogue,targetSlot:slot};dagoResolveWeapon('Dark',shot,4,[{card:card('Dark:1264'),value:4}],()=>{});`);
 assert.equal(run(`dagoEffects('Light:2124').length`),0);
 assert.equal(run(`state.lost.includes(rogue)`),true);
});
test('Lost In Space permits the pilot’s owner to rescue despite the opponent owning the effect',()=>{
 const {run}=harness();setup(run);run(`const {pilot,effect}=lostSpace();const ship=card('Light:2418');state.light[2]=[ship];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='dago:lostPilot'&&action.args.at(-1)==='pilot'))`),true);
 assert.equal(run(`ship.occupants.some(occupant=>occupant.card===pilot&&occupant.role==='pilot')`),true);
 assert.equal(run(`dagoEffects('Dark:1583').length`),0);
});
test('Lost In Space rescue requires available crew capacity and Light may not capture a Dark pilot',()=>{
 const {run}=harness();setup(run);run(`const {pilot}=lostSpace('Dark:1279'),ship=card('Light:2418');state.light[2]=[ship];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`dagoLostSpaceOptions('Light').length`),0);
 run(`state.locationEffects[2]=[];lostSpace();ship.occupants=[...Array.from({length:3},()=>({card:card('Light:2040'),role:'pilot'})),...Array.from({length:4},()=>({card:card('Light:2052'),role:'passenger'}))];`);
 assert.equal(run(`dagoLostSpaceOptions('Light').length`),0);
});
test('Lost In Space pilot is a legal starship-weapon target outside battles',()=>{
 const {run}=harness();setup(run);run(`const {pilot,effect}=lostSpace();const ship=card('Dark:176'),gun=card('Dark:2644');ship.weapons=[gun];state.dark[2]=[ship];state.activeSide='Dark';PremiereGame.setPhase(state,4);`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='dago:lostPilotFire'))`),true);
 assert.equal(run(`state.lost.includes(pilot)&&dagoEffects('Dark:1583').length===0`),true);
});
test('An asteroid-sector destiny loses its target even with a negative modifier',()=>{
 const {run}=harness();setup(run);run(`const slot=sector(),ship=card('Light:2838');PremiereUnits.add(ship,card('Light:2040'),'pilot','Light');state.light[slot]=[ship];ship.dagobahAsteroidProtectionUntil=state.game.timing.turn;ship.dagobahAsteroidProtection=100;state.botDeck=[card('Dark:148')];let finished=false;dagoAsteroid(dagoEntry(ship),()=>finished=true);`);
 assert.equal(run(`state.lost.includes(ship)&&finished`),true);
});
test('The opponent chooses the order of asteroid targets, before the destiny is drawn',()=>{
 const {run}=harness();setup(run);run(`const slot=sector();for(let i=0;i<2;i++){const ship=card('Light:2838');PremiereUnits.add(ship,card('Light:2040'),'pilot','Light');state.light[slot].push(ship);}PremiereGame.setPhase(state,1);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagAsteroidOrder');
 assert.equal(run(`state.pendingCardView.side`),'Dark');
 assert.equal(run(`state.botUsed.length`),0);
});
test('Light Maneuvers doubles both the chosen hull modifier and the Falcon’s conditional bonuses',()=>{
 const {run}=harness();run(`const ship=card('Light:1677'),mod=card('Light:2325');mod.hullStat='maneuver';ship.attachments=[mod];PremiereUnits.add(ship,card('Light:1098'),'pilot','Light');state.light[2]=[ship];const before=craftStats(ship,2);state.dagobahDoubleModTurn=state.game.timing.turn;const after=craftStats(ship,2);`);
 assert.equal(run(`after.maneuver-before.maneuver`),2);
 assert.equal(run(`after.power-before.power`),2);
});
test('Mist Hunter’s first pilot must be a bounty hunter or smuggler; its second may be another pilot',()=>{
 const {run}=harness();run(`const ship=card('Dark:1682'),ordinary=card('Dark:1279'),zuckuss=card('Dark:2912');`);
 assert.equal(run(`PremiereUnits.accepts(ship,ordinary,'pilot')`),false);
 run(`PremiereUnits.add(ship,zuckuss,'pilot','Dark');`);
 assert.equal(run(`ship.occupants[0].card===zuckuss`),true);
 assert.equal(run(`PremiereUnits.accepts(ship,ordinary,'pilot')`),true);
});
