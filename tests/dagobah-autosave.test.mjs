import test from 'node:test';
import {checkSavedSteps} from './support/anh-save-harness.mjs';
const choose=(side,args,expect,privateFor)=>({kind:'finishCardInformation',side,args,expect,privateFor});
const dago=(side,mode,expect,where='true')=>({kind:'hothAction',side,where:`action.mode==='dago:${mode}'&&(${where})`,expect});
const cases=[{
 name:'Great Warrior training destiny and completed test',phase:1,
 setup:`locations(['Light:598','Light:602','Light:603']);const mentor=put('Light',0,'Light:2865'),apprentice=put('Light',0,'Light:2304');apprentice.dagobahApprentice=true;state.tableEffects.push({card:take('Light:1071'),site:0,target:apprentice,mentor,apprentice});state.dagobahTrainingWindow=state.game.timing.turn;top('Light','Light:424');`,
 steps:[dago('Light','testAttempt',"state.light[0].some(card=>card.attachments?.some(test=>test.dagobahJediTest===1))")]
},{
 name:'Stored Test-five destiny in a real weapon sequence',phase:3,
 setup:`locations(['Light:2447']);const luke=put('Light',0,'Light:2304'),test=take('Light:1332');test.dagobahJediTest=5;test.support=[take('Light:2722')];test.dagobahDestinyValue=5;luke.attachments=[test];luke.weapons=[take('Light:259')];put('Dark',0,'Dark:308');`,
 steps:[{kind:'battle',side:'Light',args:[0]},{kind:'fireWeapon',side:'Light',where:"action.weapon.id==='Light:259'",expect:"state.pendingCardView.mode==='hothDagSubstituteDestiny'"},choose('Light',['use'],"battleSession.hitUnits.Dark.length===1")]
},{
 name:'Mynock attaches without cycles, changes ship stats and resumes the creature continuation',player:'Dark',active:'Dark',phase:3,
 setup:`locations(['Light:113']);put('Dark',0,'Dark:1718');const ship=put('Light',0,'Light:2838');PremiereUnits.add(ship,take('Light:2040'),'pilot','Light');`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='creatureEat'"},choose('Dark',['Light']),choose('Dark',['pass']),choose('Light',['pass'],"!state.creatureAttack&&state.light[0][0].attachments.some(card=>card.attachedParasite)")]
},{
 name:'Landing Claw concealment and detach preserve ownership and game state',phase:1,
 setup:`locations(['Light:113']);const ship=put('Light',0,'Light:2838');PremiereUnits.add(ship,take('Light:2040'),'pilot','Light');ship.attachments=[take('Light:1464')];put('Dark',0,'Dark:176');`,
 steps:[dago('Light','landingClaw',"state.dark[0][0].occupants.some(o=>o.card.concealed)"),dago('Light','unclaw',"state.light[0].some(c=>c.id==='Light:2838'&&!c.concealed)")]
},{
 name:'The Dark Path private multi-card choice',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:2446']);hand('Dark','Dark:2518');top('Dark','Dark:308','Dark:9','Dark:2912');`,
 steps:[{kind:'hothAction',side:'Dark',where:"action.card?.id==='Dark:2518'&&action.mode==='effect'"},dago('Dark','darkPath',"state.pendingCardView.mode==='hothDagDarkPath'"),choose('Dark',[0],"state.pendingCardView.mode==='hothDagDarkPath'",'Light'),choose('Dark',[0],"!state.pendingCardView&&state.botLost.length===2")]
},{
 name:'Droid Sensorscope private Reserve peek',phase:1,
 setup:`locations(['Light:2447']);const droid=put('Light',0,'Light:1992');droid.attachments=[take('Light:780')];top('Dark','Dark:308');`,
 steps:[dago('Light','sensorscope',"state.pendingCardView.mode==='hothDagPeek'"),choose('Light',['done'],"!state.pendingCardView")]
},{
 name:'Visored Vision names a card before revealing Used and choosing the Used or Lost result',phase:2,
 setup:`locations(['Light:2447']);hand('Light','Light:2722');state.botUsed.push(take('Dark:520'));`,
 steps:[{kind:'hothAction',side:'Light',where:"action.mode==='dago:voyeur'"},
  {kind:'finishCardInformation',side:'Light',where:"action.label==='Control'",expect:"state.pendingCardView.mode==='hothDagVoyeurReveal'&&state.pendingCardView.publicView"},
  choose('Light',['Lost'],"state.botLost.some(card=>card.id==='Dark:520')&&state.lost.some(card=>card.id==='Light:2722')")]
},{
 name:'Close Call keeps its paid loss and public top-card comparison across reload',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:2446']);hand('Dark','Dark:421');top('Light','Light:2722');state.used.push(take('Light:259'));`,
 steps:[{kind:'hothAction',side:'Dark',where:"action.mode==='dago:closeCallLost'",expect:"state.pendingForceLoss.payer==='Dark'"},
  {kind:'loseForce',side:'Dark',args:['force'],expect:"state.pendingCardView.mode==='hothDagCloseCallReveal'&&state.pendingCardView.publicView"},
  choose('Dark',['done'],"!state.pendingCardView&&state.botLost.some(card=>card.id==='Dark:421')")]
},{
 name:'He Is Not Ready resumes the Move-phase choice and its Force-loss continuation',phase:3,
 setup:`locations(['Light:2447','Light:2448']);const pilot=put('Light',0,'Light:2040'),effect=take('Dark:1115');pilot.attachments=[effect];state.tableEffects.push({card:effect,host:pilot,pilotMode:true});`,
 steps:[{kind:'advance',side:'Light',expect:"state.pendingCardView.mode==='hothDagNotReady'"},
  choose('Light',['force'],"state.pendingForceLoss.payer==='Light'"),
  {kind:'loseForce',side:'Light',args:['force'],expect:"!state.pendingCardView&&!state.pendingForceLoss&&state.phase===4"}]
},{
 name:'Bombing Run’s starting Move-phase relocation restores the destination choice',player:'Dark',active:'Dark',phase:3,
 setup:`locations(['Dark:2446','Light:2448']);state.locationEffects[0]=[{card:take('Dark:299'),site:0}];`,
 steps:[{kind:'advance',side:'Dark',expect:"state.pendingCardView.mode==='hothDagMoveBombingRun'"},
  choose('Dark',[1],"state.locationEffects[1].some(effect=>effect.card.id==='Dark:299')&&state.phase===4")]
}];
for(const spec of cases)test('Dagobah autosave: '+spec.name,()=>checkSavedSteps({...spec,format:'premiere-a-new-hope-hoth-dagobah',rulesVersion:32}));
