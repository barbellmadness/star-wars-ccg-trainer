const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
const grabSetup=id=>`locations(['Light:2447']);hand('Light','Light:1872','Light:1872');hand('Dark','${id}');state.botLost.push(take('Dark:2355'),take('Dark:2355'));`;
const grabSteps=[{kind:'pileInterrupt',side:'Light',where:"action.card.id==='Light:1872'&&!action.record",expect:"PremiereGame.responseWindow(state.game).kind==='interrupt'"},{kind:'interruptResponse',side:'Dark',where:"action.responseKind==='grabInterrupt'||action.args.includes('grabInterrupt')",expect:"state.tableEffects[0].stackPending.id==='Light:1872'"},{kind:'passResponse',side:'Light'},{kind:'passResponse',side:'Dark',expect:"state.tableEffects[0].support[0].id==='Light:1872'&&state.outOfPlay.length===1"}];
export default [{
 name:'Immediate Effect grab restores its pending Interrupt and unique limit',phase:1,setup:grabSetup('Dark:2505'),
 steps:grabSteps
},{
 name:'stacked Interrupt copies retain their escalating replay costs',phase:1,setup:grabSetup('Dark:2555'),
 steps:[...grabSteps,{kind:'pileInterrupt',side:'Light',where:"action.card.id==='Light:1872'&&!action.record&&action.cost===2",expect:"state.tableEffects[0].support.length===2&&state.force.length===6"}]
},{
 name:'R2 choice queues Program Trap and a Krayt Bones free deployment',phase:1,inFlight:{'Light:2308':['destinyValue','anhDestinyTrigger']},
 setup:`locations(['Light:2447']);const han=put('Light',0,'Light:1098');han.weapons=[take('Light:1106')];const escort=put('Dark',0,'Dark:2355');escort.escortedCaptive=take('Light:2052');escort.escortedCaptive.captured=true;put('Dark',0,'Dark:1372');const mouse=put('Dark',0,'Dark:1709');mouse.attachments=[take('Dark:1955')];state.tableEffects=[{card:take('Dark:1453'),target:'Dark'}];hand('Light','Light:2308');hand('Dark','Dark:2355');top('Light','Light:1992');`,
 steps:[{kind:'pileInterrupt',side:'Light',where:"action.rule.mode==='controlFire'&&action.shot.target.id==='Dark:2355'",expect:"state.pendingCardView.mode==='destinyValue'"},choose('Light',[5],"state.pendingCardView.mode==='anhDestinyTrigger'&&state.lost.some(c=>c.id==='Light:1098')"),{kind:'finishCardInformation',side:'Dark',where:"action.args[0]==='deploy'",expect:"!state.pendingCardView&&state.dark[0].some(c=>c.id==='Dark:2355')"}]
},{
 name:'U-3PO cover break restores the optional change of ownership',active:'Dark',phase:2,
 setup:`locations(['Light:2447']);const spy=put('Dark',0,'Dark:2659');setUndercover(spy,'Dark');`,
 steps:[{kind:'spyAction',side:'Dark',where:"action.card?.id==='Dark:2659'",expect:"state.pendingCardView.mode==='u3poCover'"},choose('Light',['steal'],"state.light[0].some(c=>c.id==='Dark:2659'&&!c.undercover)")]
},{
 name:'Sabotage resumes stealing after the private spy destiny choice',phase:1,inFlight:{'Light:2151':['destinyValue']},
 setup:`locations(['Light:2447']);const spy=put('Light',0,'Light:1690'),merc=take('Light:1668');spy.attachments=[merc];state.tableEffects=[{card:merc,host:spy}];setUndercover(spy,'Light');put('Dark',0,'Dark:2355').weapons=[take('Dark:1264')];hand('Light','Light:2151');top('Light','Light:1992');`,
 steps:[{kind:'pileInterrupt',side:'Light',where:"action.rule.mode==='spySabotage'",expect:"state.pendingCardView.mode==='destinyValue'"},choose('Light',[5],"state.pendingCardView.mode==='spySabotage'"),choose('Light',['steal'],"state.light[0][0].weapons?.some(c=>c.id==='Dark:1264')")]
},{
 name:'Informant restores a partly selected free react before battle',phase:3,
 setup:`locations(['Light:2440','Light:2447']);put('Light',0,'Light:1495');put('Dark',0,'Dark:2355');const spy=put('Dark',0,'Dark:2659');setUndercover(spy,'Dark');put('Dark',1,'Dark:2355');hand('Dark','Dark:1308');`,
 steps:[{kind:'battle',side:'Light',args:[0]},{kind:'interruptResponse',side:'Dark',where:"action.args.includes('informantReact')"},{kind:'passResponse',side:'Light'},{kind:'passResponse',side:'Dark',expect:"state.pendingCardView.mode==='informantReact'"},{kind:'finishCardInformation',side:'Dark',where:"action.card?.id==='Dark:2355'",expect:"state.dark[1].length===0"},choose('Dark',['done'],"!state.pendingCardView&&!!battleSession")]
},{
 name:'R2-Q2 private draw-phase peek remains limited after reload',player:'Dark',active:'Dark',phase:5,
 setup:`locations(['Dark:669']);put('Dark',0,'Dark:1994');top('Dark','Dark:1308','Dark:2555','Dark:2505');`,
 steps:[{kind:'cardInformation',side:'Dark',where:"action.card.id==='Dark:1994'",expect:"state.pendingCardView.shown.length===3&&!state.pendingCardView.publicView",privateFor:'Light'},choose('Dark',['deck'],"!state.pendingCardView")]
},{
 name:'Gold 2 restores the deferred weapon result and Attack Run cover turn',phase:4,
 setup:`locations(['Dark:654','Light:681']);const lead=put('Light',0,'Light:2061');PremiereUnits.add(lead,take('Light:1593'),'pilot','Light');lead.weapons=[take('Light:1962')];const wing=put('Light',0,'Light:2838');PremiereUnits.add(wing,take('Light:2040'),'pilot','Light');const gold=put('Light',0,'Light:1047');PremiereUnits.add(gold,take('Light:2611'),'pilot','Light');put('Dark',0,'Dark:2600').weapons=[take('Dark:872')];state.locationEffects={1:[{card:take('Light:169')}]};top('Dark','Dark:1308');`,
 steps:[{kind:'anhCharacter',side:'Light',where:"action.args[0]==='attackRun'"},choose('Light',['toggle',0]),choose('Light',['toggle',1]),choose('Light',['toggle',2]),choose('Light',['done']),choose('Dark',['toggle',0]),choose('Dark',['done']),choose('Light',[0]),{kind:'finishCardInformation',side:'Dark',where:"action.args[0]==='fire'&&runWeaponOptions()[action.args[1]].target.id==='Light:2838'",expect:"state.pendingCardView.mode==='goldRescue'"},choose('Light',['sacrifice'],"state.pendingCardView.mode==='runCover'&&state.lost.some(c=>c.id==='Light:1047')&&state.light[1].some(c=>c.id==='Light:2838')"),choose('Light',['pass'])]
}];
