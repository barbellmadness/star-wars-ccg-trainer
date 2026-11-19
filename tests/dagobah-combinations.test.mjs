import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/dagobah-harness.mjs';

test('Dagobah and Training Area grant their search to the printed text side, including Revolution',()=>{
 const {run}=harness();run(`state.deck.push(card('Light:1071'));state.botDeck.push(card('Light:1071'));`);
 assert.equal(run(`dagoLocationActions('Light').some(o=>o.mode==='dago:trainingSearch')`),true);
 run(`state.activeSide='Dark';`);
 assert.equal(run(`dagoLocationActions('Dark').some(o=>['dago:trainingSearch','dago:reserveSite'].includes(o.mode))`),false);
 run(`state.locationEffects[4]=[{card:card('Light:2110')}];`);
 assert.equal(run(`dagoLocationActions('Dark').some(o=>o.mode==='dago:trainingSearch')`),true);
});

test('Great Warrior cancels bonuses individually while retaining penalties and the icon base',()=>{
 const {run}=harness();run(`const pupil=card('Light:2304'),test=card('Light:1071');test.dagobahJediTest=1;pupil.attachments=[test];state.light[3]=[pupil];state.locationEffects[0]=[{card:card('Dark:1264'),drainModifier:{Dark:2}},{card:card('Dark:1264'),drainModifier:{Dark:-1}}];state.dark[0]=[card('Dark:308')];const plan=forceDrainEffects('Dark',0);`);
 assert.equal(run(`plan.modifier`),-1);
 assert.equal(run(`plan.optional`),0);
 assert.equal(run(`plan.base`),run(`PremiereLocations.icons(state,0,'Light')`));
});

test('He Is Not Ready offers its pilot a move or an explicit loss at the beginning of its Move phase',()=>{
 const {run}=harness();run(`const pilot=card('Light:2040');state.light[0]=[pilot];const effect=card('Dark:1115');pilot.attachments=[effect];state.tableEffects=[{card:effect,host:pilot,pilotMode:true}];PremiereGame.setPhase(state,4);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagNotReady');
 assert.equal(run(`state.pendingCardView.side`),'Light');
 assert.equal(run(`state.pendingCardView.choices.some(c=>c.args[0]==='force')&&state.pendingCardView.choices.some(c=>c.args[0]==='lose')`),true);
 run(`finishDagobahChoice(state.pendingCardView,'force');`);
 assert.equal(run(`state.pendingForceLoss.payer`),'Light');
});

test('Rycar training and Smuggler’s Blues permit mission retrieval into hand',()=>{
 const {run}=harness();run(`const pilot=card('Light:2040'),ship=card('Light:2418');pilot.attachments=[card('Light:2141'),card('Light:2286')];PremiereUnits.add(ship,pilot,'pilot','Light');state.light[2]=[ship];const reward=card('Light:259');state.lost=[reward];let finished=false;dagoMissionRetrieve({card:card('Light:2143'),target:ship},1,()=>finished=true);`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagMissionRetrieval');
 run(`finishDagobahChoice(state.pendingCardView,'hand');`);
 assert.equal(run(`finished&&state.hand.includes(reward)&&!state.used.includes(reward)`),true);
});

test('Capturing I Want That Ship’s target cancels the effect and charges the target’s controller',()=>{
 const {run}=harness();run(`const ship=card('Light:1677'),effect=card('Dark:1221');state.light[2]=[ship];ship.attachments=[effect];state.tableEffects=[{card:effect,host:ship}];dagoShipCaptured(ship,'Light');state.hothDeferred.shift()();`);
 assert.equal(run(`state.tableEffects.length`),0);
 assert.equal(run(`state.pendingForceLoss.payer`),'Light');
 assert.equal(run(`state.pendingForceLoss.remaining`),5);
});

test('They’d Be Crazy adds two once to a complete target total, under the Interrupt player’s control',()=>{
 const {run}=harness();run(`const target=card('Dark:176');target.dagobahCrazyDestiny={side:'Light',turn:state.game.timing.turn};let value=null;dagoTargetTotal('Dark',target,7,total=>value=total);let frame=PremiereGame.responseWindow(state.game);`);
 assert.equal(run(`frame.kind`),'dagobahTargetTotal');
 assert.equal(run(`hothResponseOptions('Dark',frame).some(o=>o.ability==='dago:targetTotalPlus')`),false);
 run(`const option=hothResponseOptions('Light',frame).find(o=>o.ability==='dago:targetTotalPlus');hothRespond('Light',option,frame);`);
 assert.equal(run(`frame.total`),9);
 assert.equal(run(`hothResponseOptions('Light',frame).some(o=>o.ability==='dago:targetTotalPlus')`),false);
 run(`frame.finish(frame);`);
 assert.equal(run('value'),9);
});

test('Utinni retargeting retains the original target condition and updates the actual effect record',()=>{
 const {run}=harness();run(`const old=card('Dark:1279'),ordinary=card('Dark:2912'),imperial=card('Dark:538');state.dark[0]=[old,ordinary,imperial];const effect={card:card('Dark:1857'),site:0,target:old};state.locationEffects[0]=[effect];state.hand=[card('Light:1212')];`);
 assert.equal(run(`dagoRetargetAllowed(effect,dagoEntry(ordinary))`),false);
 assert.equal(run(`dagoRetargetAllowed(effect,dagoEntry(imperial))`),true);
 run(`const option=dagoInterruptOptions('Light').find(o=>o.mode==='dago:retarget'&&o.target===imperial);dagoSettleInterrupt({...option,side:'Light',card:state.hand.pop()},null);`);
 assert.equal(run(`effect.target===imperial`),true);
});

test('Corporal Derdram cancels Detention Block Control Room’s release text while at the corridor',()=>{
 const {run}=harness();run(`state.locations[0]=card('Light:672');state.locations[1]=card('Dark:673');state.dark[1]=[card('Dark:538')];`);
 assert.equal(run(`PremiereLocations.rulesAt(state,0,'Light','releasePrisoners').length`),0);
 run(`state.dark[1]=[];`);
 assert.equal(run(`PremiereLocations.rulesAt(state,0,'Light','releasePrisoners').length`),1);
});

test('Retractable Arm protects its armed droid from Disarmed and transfers stolen equipment for free',()=>{
 const {run}=harness();run(`const droid=card('Light:1992'),rebel=card('Light:1495'),gun=card('Dark:1264');droid.attachments=[card('Light:2104')];droid.weapons=[gun];gun.controller='Light';gun.dagobahArmStolen=true;state.light[0]=[droid,rebel];const dark=card('Dark:1279');dark.weapons=[card('Dark:1264')];state.dark[0]=[dark];state.botHand=[card('Dark:734')];PremiereGame.setPhase(state,1);`);
 assert.equal(run(`weaponEffectOptions('Dark').some(o=>o.args[0]==='disarm'&&o.entry.card===droid)`),false);
 run(`dagoArmTransfer('Light',droid,gun);const chosen=state.pendingCardView.choices.find(o=>o.card===rebel);finishDagobahChoice(state.pendingCardView,...chosen.args);`);
 assert.equal(run(`rebel.weapons.includes(gun)&&droid.weapons.length===0`),true);
});

test('An unfinished Test two prevents an apprentice being transported by their carrier',()=>{
 const {run}=harness();run(`const pupil=card('Light:2040'),ship=card('Light:2418');PremiereUnits.add(ship,pupil,'pilot','Light');state.light[2]=[ship];state.tableEffects=[{card:card('Light:30'),apprentice:pupil,site:4}];`);
 assert.equal(run(`dagoMoveAllowed('Light',ship,2,0,'Landen')`),false);
 assert.equal(run(`dagoMoveAllowed('Light',pupil,2,0,'Landspeed')`),true);
});

test('Losing a host ship loses its sites, converted sites, site effects and site weapons',()=>{
 const {run}=harness();run(`const ship=card('Dark:906'),loc=card('Dark:908'),under=card('Dark:907'),effect=card('Light:2741'),gun=card('Light:259');state.dark[2]=[ship];loc.hostInstanceId=ship.instanceId;state.locations[0]=loc;state.convertedLocations={0:[under]};state.locationEffects[0]=[{card:effect,site:0}];state.locationWeapons={0:[gun]};loseTableCard('Dark',2,ship);`);
 assert.equal(run(`state.locations[0]===null&&state.botLost.includes(loc)&&state.botLost.includes(under)&&state.lost.includes(effect)&&state.lost.includes(gun)`),true);
});

test('Printed creature defense values and fixed ferocity do not consume an invented destiny draw',()=>{
 const {run}=harness();run(`const mynock=card('Light:1719'),snake=card('Dark:2717'),nudj=card('Light:1799');let value;hothFerocity(mynock,'Light',[],number=>value=number);`);
 assert.equal(run('value'),2);
 assert.equal(run(`DagobahRules.ferocity(mynock).draws+DagobahRules.ferocity(snake).draws`),0);
 assert.equal(run(`PremiereWeapons.defense(mynock,0)`),3);
 assert.equal(run(`PremiereWeapons.defense(nudj,0)`),1);
 run(`state.locations[0]=card('Dark:673');`);
 assert.equal(run(`creatureHabitat(snake,0)||creatureHabitat(nudj,0)`),false);
});

test('Bombing Run may relocate only at the start of its owner’s Move phase',()=>{
 const {run}=harness();run(`state.locations[0]=card('Dark:2446');state.locations[1]=card(catalog.find(c=>/tatooine: dune sea/i.test(c.name)).id);const effect=card('Dark:299');state.locationEffects[0]=[{card:effect,site:0}];state.activeSide='Dark';PremiereGame.setPhase(state,4);checkpoint('phase:start',()=>{});`);
 assert.equal(run(`state.pendingCardView.mode`),'hothDagMoveBombingRun');
 assert.equal(run(`state.pendingCardView.side`),'Dark');
});

test('A Great Warrior training total equal to twelve fails the strict printed threshold',()=>{
 const {run}=harness();run(`const yoda=card('Light:2865'),luke=card('Light:2304'),test=card('Light:1071');state.light[3]=[yoda,luke];const effect={card:test,site:3,mentor:yoda,apprentice:luke};state.tableEffects=[effect];state.deck=[{...card('Light:259'),destiny:0}];PremiereGame.setPhase(state,1);const total=dagoTrainingModifier(effect)+cardAbility(luke);dagoAttemptJedi(effect);`);
 assert.equal(run('total'),12);
 assert.equal(run(`dagoCompleted('Light',1)`),false);
});

test('Recirculation turns exposed Used cards face down',()=>{
 const {run}=harness();run(`const used=card('Light:259');used.dagobahFaceUp=true;state.used=[used];recirculate('Light');`);
 assert.equal(run(`state.used.length`),0);
 assert.equal(run(`state.deck.includes(used)&&!used.dagobahFaceUp`),true);
});

test('Astromech Translator lets an astromech fly an unpiloted fighter and gives matching-pilot immunity six',()=>{
 const {run}=harness();run(`const ship=card('Light:2838'),astromech=card('Light:1992'),translator=card('Light:155');ship.attachments=[translator];PremiereUnits.add(ship,astromech,'astromech','Light');state.light[2]=[ship];`);
 assert.equal(run(`craftStats(ship,2).powered`),true);
 assert.ok(run(`craftStats(ship,2).power>0`));
 run(`const pilot=card('Light:2040');pilot.attachments=[card('Light:2037')];PremiereUnits.add(ship,pilot,'pilot','Light');`);
 assert.equal(run(`dagoImmunity('Light',ship,2)`),6);
});

test('A pilot can take off from an open asteroid cave; a closed Slug mouth blocks the move',()=>{
 const {run}=harness();run(`const big=card('Light:236'),cave=card('Light:238'),ship=card('Light:2838');big.dagobahSystemSlot=2;cave.dagobahBigSlot=0;state.locations[0]=big;state.locations[1]=cave;PremiereUnits.add(ship,card('Light:2040'),'pilot','Light');state.light[1]=[ship];`);
 assert.equal(run(`travelOptions(ship,'Light',1,0).some(move=>move.kind==='Starten')`),true);
 run(`const slug=card('Dark:2312');slug.dagobahMouthClosed=true;state.dark[0]=[slug];`);
 assert.equal(run(`travelOptions(ship,'Light',1,0).length`),0);
});

test('IG-88 uses exactly two different weapons per turn and keeps the normal device limit',()=>{
 const {run}=harness();run(`const ig=card('Dark:1245'),a=card('Dark:1251'),b=card('Dark:11'),c=card('Dark:1264');PremiereUnits.recordWeaponUse(state,ig,a);`);
 assert.equal(run(`PremiereUnits.canUseWeapon(state,ig,b)`),true);
 assert.equal(run(`PremiereUnits.canUseWeapon(state,ig,a)`),false);
 run(`PremiereUnits.recordWeaponUse(state,ig,b);PremiereUnits.recordDeviceUse(state,ig,a);`);
 assert.equal(run(`PremiereUnits.canUseWeapon(state,ig,c)`),false);
 assert.equal(run(`PremiereUnits.canUseDevice(state,ig,b)`),false);
});

test('Han’s Toolkit deployed directly on a ship can cancel a card targeting that ship',()=>{
 const {run}=harness();run(`const ship=card('Light:1677'),toolkit=card('Light:1108');ship.attachments=[toolkit];state.light[2]=[ship];const frame={kind:'locationEffect',side:'Dark',card:card('Dark:1480'),target:ship};const offer=hothResponseOptions('Light',frame).find(offer=>offer.ability==='dago:toolkit');`);
 assert.equal(run(`!!offer&&offer.deviceHost===ship`),true);
});

test('Venka’s same-site Tarkin and Chief Bast bonuses reference existing cards',()=>{
 const {run}=harness();run(`const venka=card('Dark:1542');state.dark[0]=[venka,card('Dark:1061')];`);
 assert.equal(run(`dagoPowerModifier(venka,'Dark',0)`),2);
 run(`state.dark[0]=[venka,card('Dark:406')];`);
 assert.equal(run(`dagoPowerModifier(venka,'Dark',0)`),2);
});
