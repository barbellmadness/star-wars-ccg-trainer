import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/hoth-harness.mjs';

test('Loading Hoth never enables its rules inside a Premiere or A New Hope match',()=>{
 const {run}=harness();
 for(const format of ['premiere','premiere-a-new-hope']){run(`state.game.playFormat='${format}';`);assert.equal(run(`hothEnabled()`),false);}
 run(`state.game.playFormat='premiere-a-new-hope-hoth';`);assert.equal(run(`hothEnabled()`),true);
});

test('Frostbite excludes missing crew enclosed inside a vehicle but charges exposed missing characters twice',()=>{
 const {run}=harness();run(`const walker=card('Dark:269'),trooper=card('Dark:2295');PremiereUnits.add(walker,trooper,'passenger','Dark');trooper.missing=true;state.dark[3]=[walker];state.activeSide='Dark';state.nightSites=[3];state.tableEffects=[{card:card('Light:987')}];hothCheckpoint('turn:end',()=>{});`);
 assert.equal(run(`state.botLost.length`),0);
 run(`walker.occupants=[];state.dark[3].push(trooper);hothCheckpoint('turn:end',()=>{});`);
 assert.equal(run(`state.botLost.length`),2);
});

test('Infantry Mine reacts to leaving an enclosed vehicle at its site',()=>{
 const {run}=harness();run(`const walker=card('Dark:269'),trooper=card('Dark:2295'),mine=card('Light:1307');PremiereUnits.add(walker,trooper,'passenger','Dark');state.dark[3]=[walker];state.light[3]=[mine];const before=hothMineTraffic();walker.occupants=[];state.dark[3].push(trooper);hothMineArrivals(before);`);
 assert.equal(run(`state.hothMineQueue[0].targets[0].card===trooper`),true);
});

test('Hoth bot keeps drawing when a full hand cannot establish any deployment access',()=>{
 const {run}=harness();run(`state.locations=[card('Dark:6358'),card('Dark:6354'),card('Dark:6359')];state.light=[[],[],[]];state.dark=[[],[],[]];state.hand=Array.from({length:7},()=>card('Light:807'));state.game.playerSide='Dark';PremiereGame.setPhase(state,5);`);
 assert.equal(run(`choosePlannedBotAction(legalActions(state,'Light')).kind`),'draw');
 run(`state.locations.push(card('Light:5582'));state.light.push([]);state.dark.push([]);`);
 assert.equal(run(`choosePlannedBotAction(legalActions(state,'Light'))?.kind==='draw'`),false);
});

test('All 162 released Hoth cards have complete versioned rule registrations without gaps',()=>{
 const {run}=harness();
 assert.equal(run(`HothCardRules.definitions.length`),162);
 assert.equal(run(`catalog.filter(card=>card.set==='3').every(card=>{const rule=PremiereCardRules.entry(card);return rule.complete&&rule.effects.length>0&&rule.effects.every(effect=>effect.since===31);})`),true);
});

test('Collapsed docking bays keep their transit identity and free movement ignores collapse modifiers',()=>{
 const {run}=harness();run(`state.locations.push(card('Light:1173'));state.light.push([]);state.dark.push([]);state.locations[7].collapsed=true;const cal=card('Light:345'),speeder=card('Light:2294');state.light[2]=[cal];state.light[3]=[speeder];state.locations[2].collapsed=true;PremiereGame.setPhase(state,4);`);
 assert.equal(run(`PremiereLocations.conditions(state,7,'Light').dockingBay&&PremiereLocations.conditions(state,7,'Light').transitCost===0`),true);
 assert.equal(run(`travelOptions(speeder,'Light',3,2).find(move=>move.kind==='Landspeed').cost`),0);
});

test('Crashed enclosed vehicles charge one Force when boarding and disembarking',()=>{
 const {run}=harness();run(`const walker=card('Dark:269'),trooper=card('Dark:2295');walker.crashed=true;state.dark[3]=[walker,trooper];state.activeSide='Dark';PremiereGame.setPhase(state,4);`);
 assert.equal(run(`transportOptions('Dark').find(move=>move.args[0]==='embark').cost`),1);
 run(`state.dark[3]=[walker];PremiereUnits.add(walker,trooper,'passenger','Dark');`);
 assert.equal(run(`transportOptions('Dark').find(move=>move.args[0]==='exit').cost`),1);
});

test('Missing characters remain aboard and missing prey may be attacked by a Wampa',()=>{
 const {run}=harness();run(`const rogue=card('Light:2120'),zev=card('Light:2911'),wampa=card('Dark:2737'),luke=card('Light:498');PremiereUnits.add(rogue,zev,'pilot','Light');state.light[3]=[rogue,luke];state.dark[3]=[wampa];hothMakeMissing(zev,'Light',3);hothMakeMissing(luke,'Light',3);`);
 assert.equal(run(`rogue.occupants[0].card===zev&&zev.missing`),true);
 assert.equal(run(`creaturePrey(PremiereLocations.findEntry(state,wampa)).some(entry=>entry.card===luke)`),true);
});

test('Carrying a character preserves its doubled power until the character moves itself',()=>{
 const {run}=harness();run(`const rogue=card('Light:2120'),zev=card('Light:2911');PremiereUnits.add(rogue,zev,'pilot','Light');state.light[2]=[rogue];zev.hothDoublePower=true;const before=new Map(hothAllUnits().map(entry=>[entry.card,{...entry,carriers:entry.carriers.slice()}]));state.light[2]=[];state.light[3]=[rogue];hothCompleteMovement(before);`);
 assert.equal(run(`zev.hothDoublePower`),true);
 run(`const again=new Map(hothAllUnits().map(entry=>[entry.card,{...entry,carriers:entry.carriers.slice()}]));rogue.occupants=[];state.light[3].push(zev);hothCompleteMovement(again);`);
 assert.equal(run(`zev.hothDoublePower===undefined`),true);
});

test('Hoth actual deploy and direct-aboard offers respect shield and printed deployment restrictions',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[card('Dark:2295')];
 const walker=card('Dark:269');state.dark[1]=[walker];`);
 assert.equal(run(`boardDeployCost(state.botHand[0],state.locations[1],'Dark')`),null);
 assert.equal(run(`legalActions(state,'Dark').some(action=>action.kind==='transport'&&action.args[0]==='deployAboard'&&action.to===1)`),false);
 assert.equal(run(`Number.isFinite(boardDeployCost(state.botHand[0],state.locations[3],'Dark'))`),true);
 run(`state.activeSide='Light';state.botTurn=null;state.hand=[card('Light:498')];state.locations[3]=card('Light:2447')`);
 assert.equal(run(`boardDeployCost(state.hand[0],state.locations[3],'Light')`),null);
});
test('Hoth search actions validate party selection, find own missing cards and restrict only the initiating side',()=>{
 const {run}=harness();
 run(`PremiereGame.setPhase(state,1);const scout=card('Light:2045'),luke=card('Light:498');luke.missing=true;state.light[1]=[scout,luke];state.deck=[{...card('Light:259'),destiny:6}];`);
 assert.equal(run(`requestAction('hothAction','Light',['search',1])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Dark',['toggle',0])`),false);
 assert.equal(run(`requestAction('finishCardInformation','Light',['search'])`),false);
 assert.equal(run(`requestAction('finishCardInformation','Light',['toggle',0])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Light',['search'])`),true);
 assert.equal(run(`!!luke.missing`),false);
 assert.equal(run(`travelOptions(luke,'Light',1,2).length`),0);
 assert.equal(run(`hothActionOptions('Light').some(action=>action.mode==='search')`),false);
 assert.equal(run(`battleCandidates('Light',1).length`),0);
 run(`state.activeSide='Dark'`);assert.equal(run(`battleCandidates('Light',1).length`),2);
});
test('Hoth generator search pulls North Ridge from Reserve without losing or duplicating cards',()=>{
 const {run}=harness();
 run(`state.locations[3]=null;state.locations[4]=null;state.deck=[card('Light:5590'),...pile()];const total=state.deck.length+state.locations.filter(Boolean).length;hothFulfillGenerator('Light');`);
 assert.equal(run(`state.deck.length+state.locations.filter(Boolean).length===total`),true);
 assert.equal(run(`state.locations.filter(card=>card?.id==='Light:5590').length`),1);
 assert.equal(run(`state.deck.some(card=>card.id==='Light:5590')`),false);
});
test('Hoth collapsed sites lose occupants, cancel icons, tax ground movement and rebuild with a matching copy',()=>{
 const {run}=harness();
 run(`const trooper=card('Light:807');state.light[1]=[trooper];hothCollapseSite(1);`);
 assert.equal(run(`state.lost.includes(trooper)&&state.light[1].length===0`),true);
 assert.equal(run(`PremiereLocations.icons(state,1,'Light')`),0);
 run(`const scout=card('Light:2045');state.light[2]=[scout];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`travelOptions(scout,'Light',2,1).find(option=>option.kind==='Landspeed').cost`),2);
 run(`PremiereGame.setPhase(state,2);state.hand=[card('Light:5591')];`);
 assert.equal(run(`requestAction('hothAction','Light',['rebuild',0,1])`),true);
 assert.equal(run(`!!state.locations[1].collapsed`),false);
 assert.equal(run(`PremiereLocations.icons(state,1,'Light')`),run(`state.locations[1].icons.light`));
});
test('Hoth weather Effects use real deploy offers and Ice Storm makes exposed characters missing after moving',()=>{
 const {run}=harness();
 run(`state.hand=[card('Light:1241')];const scout=card('Light:2045');state.light[4]=[scout];`);
 assert.equal(run(`requestAction('hothAction','Light',['effect',0,4])`),false);
 assert.equal(run(`requestAction('hothAction','Light',['effect',0,6])`),true);
 assert.equal(run(`!!scout.missing`),false);
 run(`changePhase(1)`);
 assert.equal(run(`!!scout.missing`),true);
 assert.equal(run(`state.locationEffects[4][0].card.id`),'Light:1241');
 assert.equal(run(`confirmedPresence('Light',4)`),false);
 assert.equal(run(`transportOptions('Light').some(option=>option.card===scout)`),false);
});
test('Frostbite waits for selectable Force loss before completing turn-end timing and respects survival gear',()=>{
 const {run}=harness();
 run(`state.locations.push(card('Light:1163'));state.light.push([]);state.dark.push([]);
 state.locationEffects[7]=[{card:card('Light:987'),site:7}];state.nightSites=[1];
 const missing=card('Light:498');missing.missing=true;
 const protectedTrooper=card('Light:807');protectedTrooper.attachments=[card('Light:1165')];
 state.light[1]=[card('Light:2045'),missing,protectedTrooper];checkpoint('turn:end',()=>state.endComplete=true);`);
 assert.equal(run(`state.pendingForceLoss.remaining`),3);assert.equal(run(`!!state.endComplete`),false);
 for(let i=0;i<3;i++)assert.equal(run(`requestAction('loseForce','Light',['deck'])`),true);
 assert.equal(run(`!!state.endComplete`),true);
});
test('High Anxiety can answer a missing character and automatically ends when the character is found',()=>{
 const {run}=harness();
 run(`const luke=card('Light:498'),obi=card('Light:1803');state.light[1]=[luke];state.light[2]=[obi];state.botHand=[card('Dark:1142')];
 hothMakeMissing(luke,'Light',1,card('Dark:1240'));openQueuedRuleResponse();`);
 assert.equal(run(`PremiereGame.responseWindow(state.game).kind`),'hothMissing');
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.responseKind==='hothEffect'))`),true);
 run(`while(PremiereGame.responseWindow(state.game)){const window=PremiereGame.responseWindow(state.game);requestAction('passResponse',window.priority);}`);
 assert.equal(run(`excludedFromCurrentBattle(obi)`),true);
 run(`delete luke.missing;hothContinuous()`);assert.equal(run(`excludedFromCurrentBattle(obi)`),false);
 assert.equal(run(`state.botLost.some(card=>card.id==='Dark:1142')`),true);
});
test('Hoth Med Lab discounts the first medical droid across Hoth and records the turn use',()=>{
 const {run}=harness();
 run(`state.locations[5]=card('Light:1174');state.hand=[card('Light:5300'),card('Light:1001')];`);
 assert.equal(run(`boardDeployCost(state.hand[0],state.locations[1],'Light')`),run(`Math.max(0,state.hand[0].deploy-2)`));
 assert.equal(run(`!!requestAction('deploy','Light',[0,1])`),true);
 assert.equal(run(`boardDeployCost(state.hand[0],state.locations[1],'Light')`),run(`state.hand[0].deploy`));
});
test('2-1B responds to a real character loss at its site and cannot rescue twice in one turn',()=>{
 const {run}=harness();
 run(`const medic=card('Light:5300'),scout=card('Light:2045');state.light[1]=[medic,scout];loseTableCard('Light',1,scout);openQueuedRuleResponse();`);
 assert.equal(run(`requestAction('passResponse','Dark',[])`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.responseKind==='hothAbility'))`),true);
 assert.equal(run(`state.used.includes(scout)&&!state.lost.includes(scout)`),true);
 run(`const another=card('Light:2045');state.light[1].push(another);loseTableCard('Light',1,another);`);
 assert.equal(run(`hothResponseOptions('Light',{kind:'characterLost',fallen:another,site:1}).length`),0);
});
test('Bacta Tank holds only one patient and deployment returns it to hand at the medical discount',()=>{
 const {run}=harness();
 run(`state.hand=[card('Light:184')];`);
 assert.equal(run(`requestAction('hothAction','Light',['effect',0])`),true);
 run(`const scout=card('Light:2045');state.light[1]=[scout];loseTableCard('Light',1,scout);openQueuedRuleResponse();`);
 assert.equal(run(`requestAction('passResponse','Dark',[])`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.responseKind==='hothAbility'))`),true);
 assert.equal(run(`state.tableEffects[0].support[0]===scout`),true);
 run(`while(PremiereGame.responseWindow(state.game)){const window=PremiereGame.responseWindow(state.game);requestAction('passResponse',window.priority);}`);
 assert.equal(run(`requestAction('hothAction','Light',['bacta',0])`),true);
 assert.equal(run(`state.hand.includes(scout)&&state.tableEffects[0].support.length===0`),true);
});
test('Hoth weapon devices mount on the actual cannon and Probe Antennae is free on a Probe Droid',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};const walker=card('Dark:269'),cannon=card('Dark:158');walker.weapons=[cannon];state.dark[3]=[walker,card('Dark:1950')];state.botHand=[card('Dark:823'),card('Dark:1949')];`);
 assert.equal(run(`deviceHosts('Dark',0).some(option=>option.host===cannon&&option.cost===2)`),true);
 assert.equal(run(`deviceHosts('Dark',1).find(option=>option.host.id==='Dark:1950').cost`),0);
});
test('Power Harpoon uses matching pilot maneuver and crashes the AT-AT without losing its crew or presence',()=>{
 const {run}=harness();
 run(`const rogue=card('Light:2119'),luke=card('Light:498'),walker=card('Dark:269');
 PremiereUnits.add(rogue,luke,'pilot','Light');rogue.weapons=[card('Light:1929')];state.light[3]=[rogue];state.dark[3]=[walker];
 state.deck=[{...card('Light:259'),destiny:4}];PremiereGame.setPhase(state,3);`);
 assert.equal(run(`requestAction('battle','Light',[3])`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='fireWeapon'&&action.weapon.id==='Light:1929'))`),true);
 assert.equal(run(`walker.crashed&&craftStats(walker,3).power===0&&confirmedPresence('Dark',3)===true`),true);
});
test('Planet Defender Ion Cannon fires from a powered Rebel Base site and preserves the target armor',()=>{
 const {run}=harness();
 run(`state.locations.push(card('Light:1163'));state.light.push([card('Light:1665')]);const tyrant=card('Dark:2657');tyrant.weapons=[card('Dark:1327')];state.dark.push([tyrant]);
 state.light[0]=[card('Light:498')];state.locationWeapons={0:[card('Light:1910')]};state.deck=[{...card('Light:259'),destiny:6}];PremiereGame.setPhase(state,3);`);
 assert.equal(run(`requestAction('battle','Light',[7])`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='fireWeapon'&&action.weapon.id==='Light:1910'))`),true);
 assert.equal(run(`tyrant.hothIonDamage&&craftStats(tyrant,7).power===0&&craftStats(tyrant,7).hyperspeed===0&&craftStats(tyrant,7).armor===tyrant.armor`),true);
 assert.equal(run(`tyrant.weapons.length`),0);assert.equal(run(`state.botLost.some(card=>card.id==='Dark:1327')`),true);
});
test('Artillery Remote allows control-phase firing but still requires a local power source and consumes the phase use',()=>{
 const {run}=harness();
 run(`const warrior=card('Light:498');warrior.attachments=[card('Light:135')];state.light[0]=[warrior];state.dark[3]=[card('Dark:2295')];state.locationWeapons={3:[card('Light:1044')]};PremiereGame.setPhase(state,1);`);
 assert.equal(run(`hothArtilleryShots('Light','weapons',null,20,true).length`),0);
 run(`state.light[3]=[card('Light:815')];state.deck=[{...card('Light:259'),destiny:6}]`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='hothAction'&&action.mode==='artilleryFire'))`),true);
 assert.equal(run(`state.dark[3].length`),0);
 assert.equal(run(`hothArtilleryShots('Light','weapons',null,20,true).length`),0);
});
test('Cold Feet and Stop Motion use nighttime destiny while missing characters remain untargetable',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};const scout=card('Light:2045'),tauntaun=card('Light:2480');state.light[3]=[scout,tauntaun];state.nightSites=[3];state.botHand=[card('Dark:465'),card('Dark:2353')];state.botDeck=[{...card('Dark:1264'),destiny:4},{...card('Dark:1264'),destiny:1}];`);
 assert.equal(run(`requestAction('hothAction','Dark',['interrupt',0,'coldFeet',0])`),true);
 assert.equal(run(`scout.noMoveTurn===state.game.timing.turn&&state.botUsed.some(card=>card.id==='Dark:465')`),true);
 assert.equal(run(`requestAction('hothAction','Dark',['interrupt',0,'stopMotion',1])`),true);
 assert.equal(run(`state.botUsed.some(card=>card.id==='Dark:2353')&&state.lost.includes(tauntaun)`),true);
});
test('Exposure pays for all affected characters but loses only those without weather protection',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,1);state.nightSites=[3];
 const exposed=card('Light:2045'),protectedCard=card('Light:807');protectedCard.attachments=[card('Light:1165')];state.light[3]=[exposed,protectedCard];state.botHand=[card('Dark:916')];`);
 assert.equal(run(`requestAction('hothAction','Dark',['interrupt',0,'exposure'])`),true);
 assert.equal(run(`state.botUsed.length`),2);
 assert.equal(run(`state.lost.includes(exposed)&&state.light[3].includes(protectedCard)&&state.botLost.some(card=>card.id==='Dark:916')`),true);
});
test('It Can Wait returns a just deployed vehicle and grants exactly one matching-title free deploy next turn',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};state.hand=[card('Light:1330')];state.botHand=[card('Dark:269')];`);
 assert.equal(run(`!!requestAction('deploy','Dark',[0,3])`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.responseKind==='hothInterrupt'))`),true);
 run(`while(PremiereGame.responseWindow(state.game)){const window=PremiereGame.responseWindow(state.game);requestAction('passResponse',window.priority);}`);
 assert.equal(run(`state.dark[3].length===0&&state.botHand[0].id==='Dark:269'`),true);
 run(`state.game.timing.turn+=2`);
 assert.equal(run(`boardDeployCost(state.botHand[0],state.locations[3],'Dark')`),0);
 assert.equal(run(`!!requestAction('deploy','Dark',[0,3])`),true);
 assert.equal(run(`state.hothFreeDeploys.length`),0);
});
test('Wampa deploys free in the occupied Cave, requires an unoccupied other marker and stays within Hoth',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};const wampa=card('Dark:2737');state.light[3]=[card('Light:498')];state.light[6]=[card('Light:2045')];`);
 assert.equal(run(`boardDeployCost(wampa,state.locations[3],'Dark')`),null);
 assert.equal(run(`boardDeployCost(wampa,state.locations[6],'Dark')`),0);
 assert.equal(run(`creatureHabitat(wampa,5)`),true);
 run(`state.locations[5]=card('Light:2447')`);assert.equal(run(`creatureHabitat(wampa,5)`),false);
});
test('Wampa defeat offers its opponent relocation to the Cave and keeps the creature ferocity independent of meals',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,3);const wampa=card('Dark:2737'),scout=card('Light:2045');state.dark[3]=[wampa];state.light[3]=[scout];state.botDeck=[{...card('Dark:1264'),destiny:6}];`);
 assert.equal(run(`requestAction('anhCharacter','Dark',['creatureEat',0])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Dark',['Light'])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Dark',['pass'])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Light',['pass'])`),true);
 assert.equal(run(`state.pendingCardView.mode`),'hothWampaVictim');
 assert.equal(run(`requestAction('finishCardInformation','Light',['relocate'])`),true);
 assert.equal(run(`state.light[6].includes(scout)&&!state.lost.includes(scout)&&!scout.missing&&state.dark[3].includes(wampa)`),true);
 assert.equal(run(`wampa.lastMealPower`),undefined);
});
test('Frozen Dinner prevents relocation and adds two permanent ferocity only when the character is eaten',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};const wampa=card('Dark:2737'),scout=card('Light:2045');state.dark[6]=[wampa];state.light[6]=[scout];state.botHand=[card('Dark:990')];state.botDeck=[{...card('Dark:1264'),destiny:6}];`);
 assert.equal(run(`requestAction('hothAction','Dark',['effect',0,0])`),true);
 run(`PremiereGame.setPhase(state,3)`);
 assert.equal(run(`requestAction('anhCharacter','Dark',['creatureEat',0])`),true);
 run(`requestAction('finishCardInformation','Dark',['Light']);requestAction('finishCardInformation','Dark',['pass']);requestAction('finishCardInformation','Light',['pass']);`);
 assert.equal(run(`state.lost.includes(scout)&&wampa.hothFerocityBonus===2&&!state.creatureAttack`),true);
});
test('Disarming Creature subtracts its controller destiny from Wampa ferocity',()=>{
 const {run}=harness();
 run(`const wampa=card('Dark:2737'),luke=card('Light:498');luke.weapons=[card('Light:109')];state.light[3]=[luke];state.dark[3]=[wampa];state.hand=[card('Light:736')];state.deck=[{...card('Light:259'),destiny:2}];`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='hothAction'&&action.card.id==='Light:736'&&action.host===wampa))`),true);
 run(`hothFerocity(wampa,'Dark',[{card:card('Dark:1264'),value:4}],value=>state.ferocity=value)`);
 assert.equal(run(`state.ferocity`),5);
});
test('Losing a Tauntaun lets its rider jump off and survive at the same site',()=>{
 const {run}=harness();
 run(`const tauntaun=card('Light:2480'),luke=card('Light:498');PremiereUnits.add(tauntaun,luke,'passenger','Light');state.light[3]=[tauntaun];loseTableCard('Light',3,tauntaun);`);
 assert.equal(run(`state.lost.includes(tauntaun)&&state.light[3].includes(luke)&&!state.lost.includes(luke)`),true);
});
test('Target The Main Generator destroys only the site contents, retains the marker and requires eight selectable Force loss',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,1);const walker=card('Dark:269');walker.weapons=[card('Dark:158')];state.dark[1]=[walker];state.light[0]=[card('Light:807')];state.botHand=[card('Dark:2422')];state.botDeck=[{...card('Dark:1264'),destiny:6}];`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.kind==='hothAction'&&action.mode==='targetGenerator'))`),true);
 assert.equal(run(`state.locations[0].blownAway&&HothRules.marker(state.locations[0])===1&&!HothRules.shielded(state,1)&&state.light[0].length===0`),true);
 assert.equal(run(`state.pendingForceLoss.remaining`),8);
 assert.equal(run(`state.botLost.some(card=>card.id==='Dark:2422')&&state.dark[1].includes(walker)`),true);
 for(let i=0;i<8;i++)assert.equal(run(`requestAction('loseForce','Light',['deck'])`),true);
 run(`state.activeSide='Light';state.botTurn=null;PremiereGame.setPhase(state,2);state.hand=[card('Light:5586')]`);
 assert.equal(run(`locationDeployPositions('Light',0).length`),0);
});
test('Target The Main Generator uses one selected pilot instead of their sum and ignores the active Light North Ridge text',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,1);const walker=card('Dark:267'),veers=card('Dark:1029'),piett=card('Dark:368');
 PremiereUnits.add(walker,veers,'pilot','Dark');PremiereUnits.add(walker,piett,'pilot','Dark');walker.weapons=[card('Dark:158')];state.dark[1]=[walker];state.dark[3]=[card('Dark:2295')];state.botHand=[card('Dark:2422')];state.botDeck=[{...card('Dark:1264'),destiny:3}];`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.kind==='hothAction'&&action.mode==='targetGenerator'&&action.pilot===veers))`),true);
 assert.equal(run(`!!state.locations[0].blownAway`),false,run(`state.log.join(' | ')`));
 assert.equal(run(`state.botUsed.some(card=>card.id==='Dark:2422')`),true);
});
test('Electro-Rangefinder enables a generator shot over two actual sites and adds its Epic modifier',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,1);const walker=card('Dark:267'),veers=card('Dark:1029'),cannon=card('Dark:158');
 PremiereUnits.add(walker,veers,'pilot','Dark');walker.weapons=[cannon];state.dark[2]=[walker];state.botHand=[card('Dark:2422')];`);
 assert.equal(run(`hothGeneratorOptions('Dark').length`),0);
 run(`cannon.attachments=[card('Dark:823')];state.botDeck=[{...card('Dark:1264'),destiny:6}]`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.kind==='hothAction'&&action.mode==='targetGenerator'))`),true);
 assert.equal(run(`!!state.locations[0].blownAway`),true);
});
test('Rebel Scout reacts for free to a qualifying Rebel battle even with an empty Force Pile',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,3);const scout=card('Light:2045');state.light[2]=[scout];state.light[3]=[card('Light:498')];state.dark[3]=[card('Dark:2295')];state.force=[];`);
 assert.equal(run(`requestAction('battle','Dark',[3])`),true);
 assert.equal(run(`legalActions(state,'Light').find(action=>action.kind==='react'&&action.card===scout).cost`),0);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='react'&&action.card===scout))`),true);
 run(`requestAction('passResponse','Dark',[]);requestAction('passResponse','Light',[])`);
 assert.equal(run(`state.light[3].includes(scout)&&state.force.length===0`),true);
});
test('Echo Base Trooper Officer grants movement Reacts to other troopers at his Hoth site',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,3);const trooper=card('Light:807');state.light[2]=[trooper];state.light[3]=[card('Light:808')];state.dark[3]=[card('Dark:2295')];`);
 assert.equal(run(`requestAction('battle','Dark',[3])`),true);
 assert.equal(run(`reactOptions('Light',PremiereGame.responseWindow(state.game)).some(option=>option.card===trooper&&option.to===3)`),true);
});
test('Romas forbids opposing Reacts to or from his location and Bren blocks Reacts to Echo across Hoth',()=>{
 const {run}=harness();
 run(`const scout=card('Dark:272');state.dark[2]=[scout];state.light[3]=[card('Light:2128')];const window={kind:'battle',side:'Light',site:3};`);
 assert.equal(run(`hothReactOptions('Dark',window).length`),0);
 run(`state.light[3]=[card('Light:1621')];state.locations[5]=card('Light:1173')`);
 assert.equal(run(`hothMovementAllowed('Dark',scout,0,5,'react')`),false);
});
test('R2 Sensor Array lets the selected prey React away and ends the creature attack without a loss',()=>{
 const {run}=harness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,3);const wampa=card('Dark:2737'),scout=card('Light:2045'),droid=card('Light:2004');droid.attachments=[card('Light:1990')];state.dark[3]=[wampa];state.light[3]=[scout,droid];`);
 assert.equal(run(`requestAction('anhCharacter','Dark',['creatureEat',0])`),true);
 assert.equal(run(`requestAction('finishCardInformation','Dark',['Light'])`),true);
 assert.equal(run(`PremiereGame.responseWindow(state.game).kind`),'hothCreatureReact');
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.kind==='react'&&action.card===scout&&action.to===2))`),true);
 run(`while(PremiereGame.responseWindow(state.game)){const window=PremiereGame.responseWindow(state.game);requestAction('passResponse',window.priority);}`);
 assert.equal(run(`state.light[2].includes(scout)&&!state.creatureAttack&&!state.lost.includes(scout)`),true);
});
test('WED-10-I6 pays a selectable Force loss inside its response window before rescuing a hit vehicle',()=>{
 const {run}=harness();
 run(`const mechanic=card('Light:2782'),rogue=card('Light:2119');state.light[0]=[mechanic];state.light[1]=[rogue];rogue.hitForLoss=true;loseTableCard('Light',1,rogue);openQueuedRuleResponse();`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.responseKind==='hothAbility'&&action.card===mechanic),false)`),true);
 assert.equal(run(`state.pendingForceLoss.remaining`),1);
 assert.equal(run(`requestAction('loseForce','Light',['deck'])`),true);
 assert.equal(run(`state.used.includes(rogue)&&!state.lost.includes(rogue)`),true);
});
test('Infantry Mine deploys only at an exterior mining-droid site and does not detonate merely at a later turn',()=>{
 const {run}=harness();
 run(`state.light[0]=[card('Light:1556')];state.light[5]=[card('Light:1556')];state.hand=[card('Light:1307')];`);
 assert.equal(run(`automatedDeployOptions('Light').some(option=>option.slot===5)`),false);
 assert.equal(run(`requestAction('deployAutomated','Light',[0,0])`),true);
 run(`state.game.timing.turn+=2;findAutomatedWeapons()`);
 assert.equal(run(`state.light[0].some(card=>card.id==='Light:1307')`),true);
});
test('Infantry Mine explodes against its own controller character arriving on foot',()=>{
 const {run}=harness();
 run(`const mine=card('Light:1307'),scout=card('Light:2045');state.light[0]=[mine];state.light[1]=[scout];state.deck=[{...card('Light:259'),destiny:2}];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`requestAction('move','Light',[1,0,0,'Landspeed'])`),true);
 assert.equal(run(`state.lost.includes(scout)&&state.lost.includes(mine)`),true);
});
test('Infantry Mine does not target a character carried by an arriving enclosed vehicle',()=>{
 const {run}=harness();
 run(`const mine=card('Light:1307'),speeder=card('Light:2294'),scout=card('Light:2045');PremiereUnits.add(speeder,scout,'passenger','Light');state.light[0]=[mine];state.light[1]=[speeder];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`requestAction('move','Light',[1,0,0,'Landspeed'])`),true);
 assert.equal(run(`state.light[0].includes(mine)&&state.light[0].includes(speeder)&&speeder.occupants[0].card===scout`),true);
});
test('Vehicle Mine uses defense five against a deploying starfighter instead of its landed maneuver',()=>{
 const {run}=harness();
 run(`const mine=card('Light:2710'),fighter=card('Light:2838');state.locations[5]=card('Light:1173');state.light[5]=[mine];state.hand=[fighter];state.deck=[{...card('Light:259'),destiny:3}];`);
 assert.equal(run(`!!requestAction('deploy','Light',[0,5])`),true);
 assert.equal(run(`state.light[5].includes(fighter)&&state.lost.includes(mine)`),true);
});
test('Vehicle Mine attacks a vehicle crossing its site even though the regular move ends farther away',()=>{
 const {run}=harness();
 run(`const mine=card('Light:2710'),speeder=card('Light:2294');state.light[1]=[mine];state.light[3]=[speeder];state.deck=[{...card('Light:259'),destiny:6}];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`requestAction('move','Light',[3,0,0,'Landspeed'])`),true);
 assert.equal(run(`state.lost.includes(speeder)&&state.lost.includes(mine)&&!state.light[0].includes(speeder)`),true);
});
test('Infantry Mine lets its controller select one of simultaneous transit arrivals',()=>{
 const {run}=harness();
 run(`const mine=card('Light:1307'),first=card('Light:2045'),second=card('Light:807');state.locations[5]=card('Light:1173');state.light[5]=[mine];state.locations.push(card('Light:2447'));state.light.push([first,second]);state.dark.push([]);state.locationOrder=initialLocationOrder(state.locations);state.deck=[{...card('Light:259'),destiny:6}];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`requestAction('transitGroup','Light',[7,5,0,1])`),true);
 assert.equal(run(`state.pendingCardView.mode`),'hothMineTarget');
 assert.equal(run(`requestAction('finishCardInformation','Light',['target',1])`),true);
 assert.equal(run(`state.light[5].includes(first)&&state.lost.includes(second)&&state.lost.includes(mine)`),true);
});

test('Attack Pattern Delta protects only the other T-47s present at initiation until turn end',()=>{
 const {run}=harness();run(`const lead=card('Light:2294'),wing=card('Light:2121'),walker=card('Dark:269');PremiereUnits.add(wing,card('Light:2786'),'pilot','Light');state.light[3]=[lead,wing];state.dark[3]=[walker];state.hand=[card('Light:167')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);`);
 assert.equal(run(`!!PremiereGame.responseWindow(state.game)`),true);
 run(`resolveResponsePass('Dark');`);
 run(`const option=hothInterruptOptions('Light',PremiereGame.responseWindow(state.game)).find(option=>option.mode==='delta'&&option.lead===lead);announceHothInterrupt('Light',option,PremiereGame.responseWindow(state.game));for(let i=0;i<12&&PremiereGame.responseWindow(state.game);i++)resolveResponsePass(PremiereGame.responseWindow(state.game).priority);`);
 assert.equal(run(`wing.hothDeltaTurn===state.game.timing.turn&&lead.hothDeltaTurn===undefined`),true);
 assert.equal(run(`battleImmunity('Light',wing,3)`),Infinity);
 assert.equal(run(`weaponTargets('Light',3).some(entry=>entry.card===wing)`),false);
});

test('Rug Hug adds two destiny or four power through the actual battle action menu',()=>{
 const {run}=harness();run(`state.light[3]=[card('Light:498'),card('Light:394')];state.dark[3]=[card('Dark:269')];state.hand=[card('Light:2137')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);`);
 assert.equal(run(`legalActions(state,'Light').some(action=>action.kind==='hothAction'&&action.mode==='rugDestiny')`),true);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='rugDestiny'))`),true);
 assert.equal(run(`battleSession.extraDraws.Light`),2);
});

test('Lost battle reduction subtracts after destiny and clamps both power and attrition at zero',()=>{
 const {run}=harness();run(`state.light[3]=[card('Light:498')];state.dark[3]=[card('Dark:634'),card('Dark:1029')];state.hand=[card('Light:615')];state.deck=[{...card('Light:259'),destiny:9},{...card('Light:259'),destiny:9}];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='reduceBattle'))`),true);
 run(`battleSession.lightDestiny=0;battleSession.darkDestiny=3;battleSession.lightCard={};battleSession.darkCard={};battleSession.powerDestiny={Light:0,Dark:0};battleSession.attritionDestiny={Light:0,Dark:0};`);
 assert.equal(run(`battleDamagePreview().darkTotal`),0);
 assert.equal(run(`battleDamagePreview().lightAttrition`),0);
});

test('Tactical Support pays loss before searching up to three real Reserve troopers and shuffles',()=>{
 const {run}=harness();run(`state.botHand=[card('Dark:2399')];state.botDeck=[card('Dark:2295'),card('Dark:2296'),card('Dark:160')];const interrupt=state.botHand[0];`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='trooperSearch'))`),true);
 assert.equal(run(`state.botLost.length`),1);
 assert.equal(run(`state.pendingCardView.mode`),'hothInterruptSelect');
 run(`const choice=hothCardChoices(state.pendingCardView).find(choice=>choice.card?.id==='Dark:2295');requestAction('finishCardInformation','Dark',choice.args);requestAction('finishCardInformation','Dark',['done']);`);
 assert.equal(run(`state.botHand.some(card=>card.id==='Dark:2295')&&state.botLost.includes(interrupt)&&!state.pendingCardView`),true);
});

test('Probe Telemetry never removes unique cards and works on either Lost Pile',()=>{
 const {run}=harness();run(`state.dark[3]=[card('Dark:1950')];state.botHand=[card('Dark:1953')];const unique=card('Light:498'),trooper=card('Light:807');state.lost=[unique,trooper];`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='telemetryLost'&&action.pileSide==='Light'))`),true);
 assert.equal(run(`hothCardChoices(state.pendingCardView).filter(choice=>choice.card).length`),1);
 run(`requestAction('finishCardInformation','Dark',[1]);`);
 assert.equal(run(`state.outOfPlay.includes(trooper)&&state.lost.includes(unique)&&!state.pendingCardView`),true);
});

test('Perimeter Scan shows the hand privately and sends only droid spies and Infantry Mines to Used',()=>{
 const {run}=harness();run(`state.hand=[card('Light:1902')];const mine=card('Dark:1306'),normal=card('Dark:2295');state.botHand=[mine,normal];`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='perimeterHand'))`),true);
 assert.equal(run(`state.pendingCardView.publicView===true`),false);
 run(`requestAction('finishCardInformation','Light',[1]);`);
 assert.equal(run(`state.botHand.includes(normal)`),true);
 run(`requestAction('finishCardInformation','Light',[0]);requestAction('finishCardInformation','Light',['done']);`);
 assert.equal(run(`state.botUsed.includes(mine)&&state.hand.length===0&&state.used.some(card=>card.id==='Light:1902')`),true);
});

test('Tauntaun Bones resumes opponent destiny after its selectable Force loss',()=>{
 const {run}=harness();run(`const bones=card('Light:2481');state.tableEffects=[{card:bones}];state.botDeck=[{...card('Dark:1264'),destiny:1}];let completed=false;drawDestinySeries('Dark','test',1,0,()=>completed=true);`);
 assert.equal(run(`completed`),false);assert.equal(run(`state.pendingForceLoss.payer`),'Light');
 run(`requestAction('loseForce','Light',['force']);`);assert.equal(run(`completed`),true);
});

test('Tauntaun Bones offers a real free character deploy while preserving presence restrictions',()=>{
 const {run}=harness();run(`state.tableEffects=[{card:card('Light:2481')}];state.hand=[card('Light:498')];state.botDeck=[{...card('Dark:1264'),destiny:5}];let completed=false;drawDestinySeries('Dark','test',1,0,()=>completed=true);`);
 assert.equal(run(`state.pendingCardView.mode`),'hothBonesDeploy');
 assert.equal(run(`requestAction('finishCardInformation','Light',[0,3])`),true);
 assert.equal(run(`state.light[3].some(card=>card.id==='Light:498')&&completed&&state.force.length===20`),true);
});

test('Portable Fusion Generator adds optional power only to the chosen present droid',()=>{
 const {run}=harness();run(`const warrior=card('Dark:2295'),device=card('Dark:1925'),probe=card('Dark:1950');warrior.attachments=[device];state.dark[3]=[warrior,probe];`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='fusionDroid'&&action.target===probe))`),true);
 assert.equal(run(`hothCharacterPower(probe,'Dark',3)`),1);
 assert.equal(run(`legalActions(state,'Dark').some(action=>action.mode==='fusionDroid')`),false);
 run(`state.dark[3].splice(state.dark[3].indexOf(probe),1);state.dark[4].push(probe);`);assert.equal(run(`hothCharacterPower(probe,'Dark',4)`),0);
});

test('Shawn Valdez moves adjacent troopers as paid regular movement only after your initiation',()=>{
 const {run}=harness();run(`const shawn=card('Light:2249'),scout=card('Light:2045'),trooper=card('Light:807');state.light[3]=[shawn,scout];state.light[2]=[trooper];state.dark[3]=[card('Dark:269')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);requestAction('passResponse','Dark',[]);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.ability==='shawnMove'))`),true);
 assert.equal(run(`state.light[3].includes(trooper)&&state.movedThisTurn.includes(trooper)&&battleSession.participants.Light.includes(trooper)&&state.force.length===18`),true);
});

test('Fall Back cancels a stronger opposing battle and withdraws characters into a shielded neighbor',()=>{
 const {run}=harness();run(`const scout=card('Light:2045');state.light[3]=[scout];state.dark[3]=[card('Dark:269'),card('Dark:269')];state.hand=[card('Light:920')];state.activeSide='Dark';state.botTurn={steps:[],index:0};PremiereGame.setPhase(state,3);requestAction('battle','Dark',[3]);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='fallBack'&&action.to===2))`),true);
 run(`for(let i=0;i<12&&PremiereGame.responseWindow(state.game);i++)requestAction('passResponse',PremiereGame.responseWindow(state.game).priority,[]);`);
 assert.equal(run(`!battleSession&&state.light[2].includes(scout)&&state.lost.some(card=>card.id==='Light:920')`),true);
});

test('Turn It Off cancels a hit craft rescue and the medic cannot try twice on the same loss',()=>{
 const {run}=harness();run(`const tech=card('Light:2782'),rogue=card('Light:2119');rogue.hitForLoss=true;state.light[0]=[tech];state.light[1]=[rogue];state.botHand=[card('Dark:2645')];loseTableCard('Light',1,rogue);openQueuedRuleResponse();requestAction('passResponse','Dark',[]);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.ability==='rescue'))`),true);
 run(`requestAction('loseForce','Light',['force']);`);
 assert.equal(run(`PremiereGame.responseWindow(state.game).kind`),'hothRescue');
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='cancelRescue'))`),true);
 run(`for(let i=0;i<20&&PremiereGame.responseWindow(state.game);i++)requestAction('passResponse',PremiereGame.responseWindow(state.game).priority,[]);`);
 assert.equal(run(`state.lost.includes(rogue)&&!state.used.includes(rogue)&&state.botUsed.some(card=>card.id==='Dark:2645')`),true);
 assert.equal(run(`PremiereGame.wasUsed(state.game,'turn','hothRescue:'+tech.instanceId)`),true);
});

test('Oh Switch Off protects a targeted Probe Droid from the shot and all later opposing weapons this turn',()=>{
 const {run}=harness();run(`const luke=card('Light:498'),probe=card('Dark:1950'),walker=card('Dark:269');luke.weapons=[card('Light:109')];state.light[3]=[luke];state.dark[3]=[probe,walker];state.botHand=[card('Dark:1826')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);performAction(legalActions(state,'Light').find(action=>action.kind==='fireWeapon'&&action.target===probe));`);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.responseKind==='droidShutdown'))`),true);
 run(`for(let i=0;i<12&&PremiereGame.responseWindow(state.game);i++)requestAction('passResponse',PremiereGame.responseWindow(state.game).priority,[]);`);
 assert.equal(run(`droidProtectedFrom(probe,'Light')&&!battleSession.hitUnits.Dark.includes(probe)`),true);
 assert.equal(run(`battleWeaponOptions('Light').some(shot=>shot.target===probe)`),false);
});

test('Portable Fusion Generator enhancement persists across turns and can be turned off explicitly',()=>{
 const {run}=harness();run(`const trooper=card('Dark:2295'),probe=card('Dark:1950');trooper.attachments=[card('Dark:1925')];state.dark[3]=[trooper,probe];performAction(legalActions(state,'Dark').find(action=>action.mode==='fusionDroid'));state.game.timing.turn++;hothContinuous();`);
 assert.equal(run(`hothCharacterPower(probe,'Dark',3)`),1);
 assert.equal(run(`performAction(legalActions(state,'Dark').find(action=>action.mode==='fusionOff'))`),true);
 assert.equal(run(`hothCharacterPower(probe,'Dark',3)`),0);
});

test('Device use limits combine older equipment with Hoth and Backpack permits multiple devices',()=>{
 const {run}=harness();run(`const trooper=card('Dark:2295'),fusion=card('Dark:1925'),old=card('Dark:1617'),probe=card('Dark:1950');trooper.attachments=[fusion,old];state.dark[3]=[trooper,probe];PremiereUnits.recordDeviceUse(state,trooper,old);`);
 assert.equal(run(`legalActions(state,'Dark').some(action=>action.mode==='fusionDroid')`),false);
 run(`trooper.attachments.push(card('Dark:2357'));`);
 assert.equal(run(`legalActions(state,'Dark').some(action=>action.mode==='fusionDroid')`),true);
});

test('Heavy artillery moves with two eligible warriors and its extra Force, and carries no hidden passengers',()=>{
 const {run}=harness();run(`const first=card('Light:807'),second=card('Light:2045'),gun=card('Light:1664');state.light[1]=[first,second];state.locationWeapons={1:[gun]};PremiereGame.setPhase(state,4);`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='moveArtillery'&&action.to===2))`),true);
 assert.equal(run(`state.force.length===17&&state.locationWeapons[2].includes(gun)&&state.light[2].includes(first)&&state.light[2].includes(second)&&state.movedThisTurn.length===2`),true);
});

test('Anakin lightsaber provides its optional drain and reserves that weapon for the character this turn',()=>{
 const {run}=harness();run(`const luke=card('Light:498'),saber=card('Light:109');luke.weapons=[saber,card('Light:259')];state.light[3]=[luke];PremiereGame.setPhase(state,1);`);
 assert.equal(run(`forceDrainEffects('Light',3).optional`),1);
 assert.equal(run(`requestAction('drain','Light',[3,1])`),true);
 assert.equal(run(`PremiereUnits.canUseWeapon(state,luke,luke.weapons[1])`),false);
});

test('Search-party pilots cannot move themselves but may still be carried by Rogue 2',()=>{
 const {run}=harness();run(`const rogue=card('Light:2120'),zev=card('Light:2911');PremiereUnits.add(rogue,zev,'pilot','Light');zev.searchPartyTurn=state.game.timing.turn;state.light[2]=[rogue];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`travelOptions(zev,'Light',2,3).length`),0);
 assert.equal(run(`travelOptions(rogue,'Light',2,3).length>0`),true);
});

test('Perimeter Scan can privately inspect a buried card without revealing or discarding it',()=>{
 const {run}=harness();run(`const mine=card('Dark:1306');state.buriedMines=[{side:'Dark',slot:3,card:mine}];state.hand=[card('Light:1902')];`);
 assert.equal(run(`performAction(legalActions(state,'Light').find(action=>action.mode==='perimeterCard'&&action.entry.card===mine))`),true);
 assert.equal(run(`state.pendingCardView.mode==='hothPeek'&&state.pendingCardView.shown[0]===mine&&!state.pendingCardView.publicView&&state.buriedMines[0].card===mine`),true);
});

test('Tauntaun Handler improves the ridden creature vehicle, not his own power',()=>{
 const {run}=harness();run(`const mount=card('Light:2480'),handler=card('Light:2483');PremiereUnits.add(mount,handler,'passenger','Light');state.light[3]=[mount];`);
 assert.equal(run(`craftStats(mount,3).power===mount.power+2&&hothCharacterPower(handler,'Light',3)===0`),true);
});

test('Revolution transfers Hoth location benefits and a destroyed generator does not close the whole planet',()=>{
 const {run}=harness();run(`state.locationEffects[0]=[{card:card('Light:2110')}];`);
 assert.equal(run(`hothArtilleryPowered('Light',0)`),false);assert.equal(run(`hothArtilleryPowered('Dark',0)`),true);
 run(`state.locations[0].blownAway=true;state.hand=[card('Light:1174')];`);
 assert.equal(run(`locationDeployPositions('Light',0).length>0`),true);
});

test('EG-4 doubles power as its own draw completes before the next battle destiny',()=>{
 const {run}=harness();run(`state.light[3]=[card('Light:498')];state.dark[3]=[card('Dark:269')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);battleSession.weaponTurn=null;state.deck=[card('Light:815'),card('Light:815')];let saw=false;const before=hothDestinyTriggers;hothDestinyTriggers=function(side,draw,next,purpose){before(side,draw,()=>{if(state.deck.length===1)saw=battleSession.lightPowerDoubled===true;next();},purpose);};drawDestinySeries('Light','battle',2,0,()=>{});`);
 assert.equal(run(`saw&&battleSession.lightPowerDoubled===true`),true);
});

test('Cal Alder grants his perimeter power and free vehicle moves only toward his site',()=>{
 const {run}=harness();run(`const cal=card('Light:345'),speeder=card('Light:2294');state.light[2]=[cal];state.light[3]=[speeder];PremiereGame.setPhase(state,4);`);
 assert.equal(run(`hothCharacterPower(cal,'Light',2)`),1);assert.equal(run(`travelOptions(speeder,'Light',3,2).find(move=>move.kind==='Landspeed').cost`),0);
 run(`state.light[3]=[];state.light[2].push(speeder);`);assert.equal(run(`travelOptions(speeder,'Light',2,3).find(move=>move.kind==='Landspeed').cost`),1);
});

test('K-3PO provides presence and conditional leadership while counting each other droid at the site',()=>{
 const {run}=harness();run(`const k3=card('Light:1404'),eg=card('Light:815'),r5=card('Light:2004');state.light[3]=[k3,eg,r5];`);
 assert.equal(run(`confirmedPresence('Light',3)&&characterTraits(k3).includes('leader')`),true);
 assert.equal(run(`hothCharacterPower(k3,'Light',3)`),3);
 run(`eg.missing=true;r5.missing=true;`);assert.equal(run(`characterTraits(k3).includes('leader')`),false);assert.equal(run(`hothCharacterPower(k3,'Light',3)`),0);
});

test('R-3PO charges four Force for a present undercover droid spy and ignores a missing spy',()=>{
 const {run}=harness();run(`const r3=card('Light:1997'),probe=card('Dark:1950');probe.undercover=true;state.light[3]=[r3];state.dark[3]=[probe];PremiereGame.setPhase(state,1);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.botLost.length`),4);
 run(`probe.missing=true;checkpoint('phase:start',()=>{});`);assert.equal(run(`state.botLost.length`),4);
});

test('Jeroen Webb and Cabbel each subtract one from the opposing battle destiny with their faction leader',()=>{
 const {run}=harness();run(`state.light[3]=[card('Light:1391'),card('Light:498')];state.dark[3]=[card('Dark:1521'),card('Dark:1029')];PremiereGame.setPhase(state,3);requestAction('battle','Light',[3]);battleSession.lightDestiny=5;battleSession.darkDestiny=5;hothBattleDestinyResult('Light',[],battleTotals(3));hothBattleDestinyResult('Dark',[],battleTotals(3));`);
 assert.equal(run(`battleSession.lightDestiny===4&&battleSession.darkDestiny===4`),true);
});

test('R5-M2 and Deflector Shield Generators combine capital immunity, armor, power and hyperspeed',()=>{
 const {run}=harness();run(`state.locations.push(card('Light:1163'));state.light.push([]);state.dark.push([]);const ship=card('Light:1665'),r5=card('Light:2004');PremiereUnits.add(ship,r5,'passenger','Light');ship.attachments=[card('Dark:692')];state.light[7]=[ship];`);
 assert.equal(run(`craftStats(ship,7).power===ship.power+1&&craftStats(ship,7).hyperspeed===ship.hyperspeed+1&&craftStats(ship,7).armor===ship.armor+2`),true);
 assert.equal(run(`battleImmunity('Light',ship,7,[])`),5);
});

test('Toryn Farr grants ion-cannon destiny only from a war room on the same planet',()=>{
 const {run}=harness();run(`const toryn=card('Light:2618'),warrior=card('Light:498'),weapon=card('Light:1910');state.light[5]=[toryn];state.light[0]=[warrior];`);
 assert.equal(run(`hothWeaponDestiny('Light',{host:warrior,weapon,from:0})`),1);
 run(`state.light[5]=[];state.light[3]=[toryn];`);assert.equal(run(`hothWeaponDestiny('Light',{host:warrior,weapon,from:0})`),0);
});
