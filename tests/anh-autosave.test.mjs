import test from 'node:test';
import assert from 'node:assert/strict';
import movementCases from './support/anh-save-movement.mjs';
import chainCases from './support/anh-save-chains.mjs';
import privateCases from './support/anh-save-private.mjs';
import responseCases from './support/anh-save-responses.mjs';
import custodyCases from './support/anh-save-custody.mjs';
import epicCases from './support/anh-save-epics.mjs';
import extraCases from './support/anh-save-cases.mjs';
import {checkSavedSteps,savedPosition} from './support/anh-save-harness.mjs';
const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
const cases=[{
 name:'Advosze conflict preserves the chosen card after reload',phase:2,
 setup:`locations(['Light:2447']);put('Dark',0,'Dark:67');put('Dark',0,'Dark:67');`,
 steps:[choose('Dark',['lose',0],"!state.pendingCardView&&state.botLost.some(c=>c.id==='Dark:67')&&state.dark[0].length===1")]
},{
 name:'legal Bluffs remain concealed until challenged and deploy after reload',active:'Dark',phase:2,
 setup:`locations(['Dark:2438']);put('Dark',0,'Dark:1011');hand('Dark','Dark:2355');`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='placeBluff'",expect:"PremiereGame.playerView(state,'Light').locations[0].bluffs[0].faceDown"},
 {kind:'anhCharacter',side:'Light',where:"action.args[0]==='challengeBluff'",expect:"state.pendingCardView.mode==='bluffReveal'"},
 choose('Dark',['deploy'],"state.dark[0].some(c=>c.id==='Dark:2355')&&!state.locations[0].bluffs.length")]
}];
cases.push(...extraCases,...epicCases,...custodyCases,...responseCases,...privateCases,...chainCases,...movementCases);
for(const spec of cases)test('ANH autosave: '+spec.name,()=>checkSavedSteps(spec));

const goldCase=responseCases.find(spec=>spec.name.startsWith('Gold 2'));
test('ANH autosave: rules 29 retains its historical Trench replay behavior',()=>{
 const steps=goldCase.steps.slice(0,8).map(step=>({...step}));
 steps.at(-1).expect="state.pendingCardView.mode==='runCover'&&runWeaponOptions().length===0";
 return checkSavedSteps({...goldCase,name:'legacy Trench',rulesVersion:29,steps});
});
const bonesCase=responseCases.find(spec=>spec.name.startsWith('R2 choice'));
test('ANH autosave: rules 29 retains the historical single-choice Bones continuation',()=>{
 const steps=bonesCase.steps.slice(0,2).map(step=>({...step}));
 steps.at(-1).expect="!state.pendingCardView&&state.botHand.length===1&&!state.dark[0].length";
 return checkSavedSteps({...bonesCase,name:'legacy Bones',rulesVersion:29,steps});
});
test('ANH autosave: automatic bot resumes a Creature choice and stops at the human weapon decision',async()=>{
 const spec=extraCases.find(spec=>spec.name.startsWith('mandatory Creature'));
 const original=await savedPosition(spec);assert.equal(original.act(spec.steps[0]),true);
 const resumed=await savedPosition(spec,original.saved());assert.equal(resumed.run('resumeGameFromUI()'),true);
 for(const fixture of [original,resumed]){
  fixture.run('setAutoBot(true)');let ticks=0;
  while(fixture.run("state.pendingCardView?.side===botSide()")&&ticks++<8)assert.equal(fixture.tick(),true);
  assert.equal(fixture.run("state.pendingCardView.mode==='creatureFight'&&state.pendingCardView.side===playerSide()"),true);
  assert.equal(fixture.tick(),false,'the bot must wait for the human choice');
 }
 assert.equal(resumed.snapshot(),original.snapshot());
 const again=await savedPosition(spec,resumed.saved());assert.equal(again.run('resumeGameFromUI()'),true);
 assert.equal(again.snapshot(),resumed.snapshot());
});
