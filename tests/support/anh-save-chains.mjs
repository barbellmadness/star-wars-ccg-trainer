const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
export default [{
 name:'R2 reactions resume successive random Creature clash destinies',active:'Dark',phase:3,
 setup:`locations(['Dark:669','Light:680']);put('Light',0,'Light:1992');put('Dark',1,'Dark:729');put('Dark',1,'Dark:729');top('Dark','Dark:1073','Dark:622');top('Light','Light:1062');`,
 steps:[choose('Light',['accept'],"state.pendingCardView.mode==='anhDestinyTrigger'&&state.force.length===9&&state.force.some(c=>c.id==='Light:1062')"),choose('Light',['accept'],"!state.creatureClashInProgress&&state.dark[1].length===1&&state.hand.length===1&&!JSON.stringify(PremiereGame.playerView(state,'Dark')).includes('Light:2052')")]
},{
 name:'Dannik consumes a battle loss and resumes the interrupted damage window',phase:3,
 setup:`locations(['Light:2447']);put('Light',0,'Light:2052').weapons=[take('Light:259')];put('Dark',0,'Dark:634').weapons=[take('Dark:1264')];put('Dark',0,'Dark:605');`,
 steps:[{kind:'battle',side:'Light',args:[0]},{kind:'passWeapons',side:'Light'},{kind:'passWeapons',side:'Dark'},{kind:'skipDestiny',side:'Light'},{kind:'skipDestiny',side:'Dark'},{kind:'battleForfeit',side:'Light',args:[0],expect:"PremiereGame.responseWindow(state.game).kind==='characterLost'"},{kind:'interruptResponse',side:'Dark',where:"action.args.includes('eatSoup')",expect:"state.outOfPlay.some(c=>c.id==='Light:2052')&&state.soupAbility['Dark:605']===1"},{kind:'passResponse',side:'Light'},{kind:'passResponse',side:'Dark',expect:"battleSession.segment==='damage'"}]
},{
 name:'capture of an entire held crew restores both custody choices and stolen ship',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:654','Dark:675']);const beam=take('Dark:667');state.locationEffects={1:[{card:beam}]};const ship=put('Light',1,'Light:530');PremiereUnits.add(ship,take('Light:1098'),'pilot','Light');PremiereUnits.add(ship,take('Light:1495'),'passenger','Light');ship.inactive=true;state.capturedShips=[{ship,beam,side:'Light',bay:1,site:0}];put('Dark',1,'Dark:634');put('Dark',1,'Dark:2355');hand('Dark','Dark:2754');`,
 steps:[{kind:'pileInterrupt',side:'Dark',where:"action.rule.mode==='captureShipCrew'",expect:"state.pendingCustody.length===2"},{kind:'custody',side:'Dark',where:"action.args[0]==='seize'&&action.escort.id==='Dark:634'"},{kind:'custody',side:'Dark',where:"action.args[0]==='seize'&&action.escort.id==='Dark:2355'",expect:"!state.pendingCustody.length&&!state.capturedShips.length&&state.dark[0].some(c=>c.id==='Light:530')"}]
}];
