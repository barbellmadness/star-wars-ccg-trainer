const choice=(side,args,expect,privateFor)=>({kind:'finishCardInformation',side,args,expect,privateFor});
const anh=(side,mode,expect,extra='true')=>({kind:'anhCharacter',side,where:`action.args[0]==='${mode}'&&(${extra})`,expect});
const pass=side=>({kind:'passResponse',side});
const creatureSetup=`locations(['Light:680']);put('Dark',0,'Dark:729');const han=put('Light',0,'Light:1098');han.weapons=[take('Light:1106')];put('Light',0,'Light:394');put('Light',0,'Light:1593');top('Light','Light:1992','Light:1062');top('Dark','Dark:2505');`;
export default [{
 name:'illegal Bluffs resume concealed Life Force payment',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:2438']);put('Dark',0,'Dark:1011');hand('Dark','Dark:1264');state.lostPileEffects=[{card:take('Light:882'),target:'Dark'}];`,
 steps:[anh('Dark','placeBluff'),anh('Light','challengeBluff',"state.pendingCardView.mode==='bluffReveal'"),choice('Dark',['lose'],"state.pendingForceLoss?.payer==='Dark'"),{kind:'loseForce',side:'Dark',args:['force']},{kind:'loseForce',side:'Dark',args:['force'],expect:"!state.pendingForceLoss&&PremiereGame.playerView(state,'Light').players.Dark.lostFaceDown"}]
},{
 name:'Greedo threat payment preserves Force activation',active:'Light',phase:1,
 setup:`locations(['Light:2440']);put('Dark',0,'Dark:1073');put('Light',0,'Light:1098');`,
 steps:[anh('Dark','threat',"state.pendingCardView.mode==='greedoThreat'"),choice('Light',['pay'],"!state.pendingCardView&&state.force.length===0")]
},{
 name:'Greedo threat risk restores the random draw continuation',active:'Light',phase:1,
 setup:`locations(['Light:2440']);put('Dark',0,'Dark:1073');put('Light',0,'Light:1098');top('Dark','Dark:1308');`,
 steps:[anh('Dark','threat'),choice('Light',['risk'],"state.lost.some(card=>card.id==='Light:1098')")]
},{
 name:'Hypo question and truthful answer preserve private hand information',active:'Dark',phase:1,
 setup:`locations(['Dark:673']);const it=put('Dark',0,'Dark:1340');it.attachments=[take('Dark:1200')];it.escortedCaptive=take('Light:2052');it.escortedCaptive.captured=true;hand('Light','Light:1593');`,
 steps:[anh('Dark','hypo',"state.pendingCardView.mode==='hypoQuestion'","action.args[3]==='question'"),choice('Dark',['Light:1593'],"state.pendingCardView.mode==='hypoAnswer'&&!cardInformationChoices(state.pendingCardView).some(option=>option.args[0]==='no')"),choice('Light',['yes'],"!state.pendingCardView")]
},{
 name:'Hypo refusal resumes the separate Force loss',active:'Dark',phase:1,
 setup:`locations(['Dark:673']);const it=put('Dark',0,'Dark:1340');it.attachments=[take('Dark:1200')];it.escortedCaptive=take('Light:2052');it.escortedCaptive.captured=true;`,
 steps:[anh('Dark','hypo',undefined,"action.args[3]==='question'"),choice('Dark',['Light:1593']),choice('Light',['lose'],"state.pendingForceLoss?.payer==='Light'"),{kind:'loseForce',side:'Light',args:['force'],expect:"!state.pendingForceLoss"}]
},{
 name:'musician peek and reshuffle rebuild the suspended Interrupt',phase:1,
 setup:`locations(['Light:2440']);put('Light',0,'Light:1752');put('Light',0,'Light:942');put('Light',0,'Light:751');hand('Light','Light:2514');`,
 steps:[{kind:'shufflePile',side:'Light',where:"action.args.includes('deck')&&action.args.includes('Light')",expect:"state.pendingCardView.mode==='shuffleMusicians'"},choice('Light',['peek'],"state.pendingCardView.shown.length===2",'Dark'),choice('Light',['done'],"!state.pendingCardView")]
},{
 name:'suction destination retains the target and carrier references',phase:1,
 setup:`locations(['Light:2448']);const crawler=put('Light',0,'Light:2161');crawler.attachments=[take('Light:1619')];put('Dark',0,'Dark:2355');top('Light','Light:1062');`,
 steps:[anh('Light','suction',"state.pendingCardView.mode==='suctionDestination'","action.target?.id==='Dark:2355'"),choice('Light',['used'],"state.botUsed.some(c=>c.id==='Dark:2355')&&!state.dark[0].length")]
},{
 name:'squadron equipment choices keep component ships and selected crew',phase:2,copies:{'Light:2907':3},
 setup:`locations(['Light:2430']);const ships=[put('Light',0,'Light:2907'),put('Light',0,'Light:2907'),put('Light',0,'Light:2907')];PremiereUnits.add(ships[0],take('Light:1593'),'pilot','Light');ships[0].weapons=[take('Light:1962')];hand('Light','Light:2908');`,
 steps:[anh('Light','formSquadron',"state.pendingCardView.mode==='squadronTransfer'"),choice('Light',['crew',0,'pilot']),choice('Light',['done'],"state.used.filter(c=>c.id==='Light:2907').length===3&&state.light[0].some(c=>c.id==='Light:2908')")]
},{
 name:'Attack Run selection, cover, pilot, room and R2 destiny choices',phase:4,
 setup:`locations(['Dark:654','Light:681','Light:2859','Light:2851']);const lead=put('Light',0,'Light:2061');PremiereUnits.add(lead,take('Light:1593'),'pilot','Light');lead.weapons=[take('Light:1962')];lead.attachments=[take('Light:2423')];put('Light',2,'Light:2050');put('Light',3,'Light:504');state.locationEffects={1:[{card:take('Light:169')}]};top('Light','Light:1992','Light:1062');`,
 steps:[anh('Light','attackRun',"state.pendingCardView.mode==='runSelectLight'"),choice('Light',['toggle',0]),choice('Light',['done'],"state.pendingCardView.mode==='runSelectDark'"),choice('Dark',['done'],"state.pendingCardView.mode==='runLead'"),choice('Light',[0],"state.pendingCardView.mode==='runCover'"),choice('Dark',['pass']),choice('Light',['pass'],"state.pendingCardView.mode==='runPilot'"),choice('Light',[4],"state.pendingCardView.mode==='epicRoomChoice'"),choice('Light',['yes'],"state.pendingCardView.mode==='destinyValue'"),choice('Light',[5],"!state.attackRun&&state.locations[0].blownAway")]
},{
 name:'mandatory Creature target RNG, weapon and ferocity continuation',active:'Dark',phase:3,setup:creatureSetup,
 steps:[anh('Dark','creatureEat',"state.pendingCardView.mode==='creatureTargetSide'"),choice('Dark',['Light'],"state.pendingCardView.mode==='creatureFight'"),choice('Dark',['pass']),choice('Light',['pass'],"!state.creatureAttack&&state.lost.some(card=>card.type==='Character')")]
},{
 name:'voluntary Creature attack can resume an R2 attack destiny',phase:3,setup:creatureSetup,
 steps:[anh('Light','creatureHunt',"state.pendingCardView.mode==='creatureFight'"),choice('Light',['pass']),choice('Dark',['pass'],"state.pendingCardView.mode==='creaturePower'"),choice('Light',['draw'],"state.pendingCardView.mode==='destinyValue'"),choice('Light',[5],"!state.creatureAttack&&state.botLost.some(c=>c.id==='Dark:729')")]
}];
