import test from 'node:test';
import {checkSavedSteps} from './support/anh-save-harness.mjs';
const choose=(side,args,expect,privateFor)=>({kind:'finishCardInformation',side,args,expect,privateFor});
const hoth=(side,mode,expect,extra='true')=>({kind:'hothAction',side,where:`action.mode==='${mode}'&&(${extra})`,expect});
const pass=side=>({kind:'passResponse',side});
const cases=[{
 name:'search party selection, random recovery and turn restrictions',phase:1,
 setup:`locations(['Light:5590']);put('Light',0,'Light:2045');put('Light',0,'Light:498').missing=true;top('Light','Light:1902');`,
 steps:[hoth('Light','search',"state.pendingCardView.mode==='hothSearch'"),choose('Light',['toggle',0]),choose('Light',['search'],"!state.pendingCardView&&!state.light[0][1].missing&&state.light[0].every(card=>card.searchPartyTurn===state.game.timing.turn)")]
},{
 name:'Tactical Support cost, Reserve search and shuffle',player:'Dark',active:'Dark',phase:1,
 setup:`locations(['Dark:6358']);hand('Dark','Dark:2399');put('Dark',0,'Dark:2295');top('Dark','Dark:2296');`,
 steps:[hoth('Dark','trooperSearch',"state.pendingForceLoss?.payer==='Dark'"),{kind:'loseForce',side:'Dark',args:['force'],expect:"state.pendingCardView.mode==='hothInterruptSelect'"},{kind:'finishCardInformation',side:'Dark',where:"action.card?.id==='Dark:2296'",expect:"state.botHand.some(card=>card.id==='Dark:2296')"},choose('Dark',['done'],"!state.pendingCardView&&state.botLost.some(card=>card.id==='Dark:2399')")]
},{
 name:'Perimeter Scan private hand and selective discards',phase:1,
 setup:`locations(['Light:5590']);hand('Light','Light:1902');hand('Dark','Dark:1306','Dark:2295');`,
 steps:[hoth('Light','perimeterHand',"state.pendingCardView.mode==='hothInterruptPerimeter'"),choose('Light',[0],"state.botUsed.some(card=>card.id==='Dark:1306')"),choose('Light',['done'],"!state.pendingCardView&&state.botHand.some(card=>card.id==='Dark:2295')")]
},{
 name:'Wampa defeat choice and relocation preserve the real Creature continuation',active:'Dark',phase:3,
 setup:`locations(['Light:5590','Dark:6359']);put('Dark',0,'Dark:2737');put('Light',0,'Light:2045');top('Dark','Dark:1308');`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='creatureEat'",expect:"state.pendingCardView.mode==='creatureTargetSide'"},choose('Dark',['Light']),choose('Dark',['pass']),choose('Light',['pass'],"state.pendingCardView.mode==='hothWampaVictim'"),choose('Light',['relocate'],"!state.creatureAttack&&state.light[1].some(card=>card.id==='Light:2045')&&!state.light[1][0].missing")]
},{
 name:'simultaneous Infantry Mine arrival exposes only the legal target choice',phase:4,
 setup:`locations(['Light:1173','Light:2447']);put('Dark',0,'Dark:1306');put('Light',1,'Light:2045');put('Light',1,'Light:807');top('Dark','Dark:1308');`,
 steps:[{kind:'transitGroup',side:'Light',args:[1,0,0,1],expect:"state.pendingCardView.mode==='hothMineTarget'"},choose('Dark',['target',0],"!state.pendingCardView&&state.lost.some(card=>card.id==='Light:2045')&&state.botLost.some(card=>card.id==='Dark:1306')")]
},{
 name:'Hoth weapon response, selected pilot and crashed walker',phase:3,
 setup:`locations(['Light:5590']);const rogue=put('Light',0,'Light:2119');PremiereUnits.add(rogue,take('Light:498'),'pilot','Light');rogue.weapons=[take('Light:1929')];put('Dark',0,'Dark:269');hand('Light','Light:1836');top('Light','Light:1902');`,
 steps:[{kind:'battle',side:'Light',args:[0]},{kind:'fireWeapon',side:'Light',where:"action.weapon.id==='Light:1929'",expect:"PremiereGame.responseWindow(state.game).kind==='weaponTarget'"},pass('Dark'),{kind:'interruptResponse',side:'Light',where:"action.mode==='weaponBonus'"},pass('Dark'),pass('Light'),pass('Dark'),{...pass('Light'),expect:"state.dark[0][0].crashed&&craftStats(state.dark[0][0],0).power===0"}]
}];
for(const spec of cases)test('Hoth autosave: '+spec.name,()=>checkSavedSteps({...spec,format:'premiere-a-new-hope-hoth',rulesVersion:31}));
