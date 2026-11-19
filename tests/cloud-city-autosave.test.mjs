import test from 'node:test';
import {checkSavedSteps} from './support/anh-save-harness.mjs';
const action=(side,mode,expect)=>({kind:'hothAction',side,where:`action.mode==='cc:${mode}'`,expect});
const choose=(side,args,expect,privateFor)=>({kind:'finishCardInformation',side,args,expect,privateFor});
const cases=[{
 name:'Sense remains in flight while R2-D2 chooses a destiny value',phase:1,
 setup:`locations(['Light:438']);put('Light',0,'Light:1593');hand('Light','Light:2217');hand('Dark','Dark:1957');top('Light','Light:1992');`,
 steps:[{kind:'drain',side:'Light',args:[0]},
  {kind:'interruptResponse',side:'Dark',where:"action.mode==='cc:payOrCancel'"},
  {kind:'interruptResponse',side:'Light',where:"action.card?.id==='Light:2217'"},
  {kind:'passResponse',side:'Dark',args:[]},{kind:'passResponse',side:'Light',args:[],expect:"state.pendingCardView.mode==='destinyValue'&&state.resolvingInterrupts.some(frame=>frame.card.id==='Light:2217')"},
  choose('Light',[2],"!state.resolvingInterrupts&&state.used.some(card=>card.id==='Light:2217')")]
},{
 name:'Cyborg storage and a stored search survive every reload',
 setup:`locations(['Light:438']);const host=put('Light',0,'Light:2810'),device=take('Light:592');host.attachments=[device];device.cloudCityStored=[];device.cloudCityStorageHostId=host.instanceId;hand('Light','Light:139');top('Light','Light:1132');`,
 steps:[action('Light','storeCard',"!state.hand.length&&state.light[0][0].attachments[0].cloudCityStored.length===1"),action('Light','playStored',"state.pendingCardView.mode==='hothDagSearch'"),choose('Light',[0],"state.hand.some(card=>card.id==='Light:1132')&&state.used.some(card=>card.id==='Light:139')")]
},{
 name:'Carbon-Freezing preserves frozen custody and the eight-Force loss continuation',player:'Light',active:'Dark',phase:1,
 setup:`locations(['Light:438']);const hunter=put('Dark',0,'Dark:287'),captive=take('Light:1593');captive.captured=true;hunter.escortedCaptive=captive;put('Dark',0,'Dark:2662');put('Dark',0,'Dark:2661');state.locationWeapons={0:[take('Dark:380')]};state.locationEffects={0:[{card:take('Dark:379'),site:0}]};top('Dark','Dark:347');`,
 steps:[action('Dark','freeze',"state.dark[0][0].escortedCaptive.frozen&&state.pendingForceLoss.payer==='Light'"),...Array.from({length:8},(_,i)=>({kind:'loseForce',side:'Light',args:['force'],...(i===7?{expect:'!state.pendingForceLoss'}:{})}))]
},{
 name:'Sabacc private hands, final passes, wild-free scoring and stakes survive reload',phase:2,
 copies:{'Light:259':2,'Dark:1264':2},
 setup:`locations(['Light:438']);put('Light',0,'Light:1466');hand('Light','Light:433');top('Light','Light:259','Light:259');top('Dark','Dark:1264','Dark:1264');`,
 steps:[{kind:'hothAction',side:'Light',where:"action.mode==='cc:sabacc'",expect:"state.pendingCardView.mode==='hothDagCloudSabaccDraw'"},choose('Dark',['pass'],"state.pendingCardView.side==='Light'",'Dark'),choose('Light',['pass'],"state.pendingCardView.mode==='hothDagCloudSabaccLando'"),choose('Light',[1],"state.pendingCardView.mode==='hothDagCloudSabaccReveal'"),choose('Light',['done'],"state.pendingCardView.mode==='hothDagCloudSabaccStakes'"),choose('Light',[0],"!state.cloudCitySabacc&&state.used.some(card=>card.id==='Dark:1264')")]
}];
for(const spec of cases)test('Cloud City autosave: '+spec.name,()=>checkSavedSteps({...spec,format:'premiere-a-new-hope-hoth-dagobah-cloud-city',rulesVersion:33}));
