const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
export default [{
 name:'We Have A Prisoner resumes paid forfeit and escort custody',phase:3,
 setup:`locations(['Light:2447']);put('Light',0,'Light:2052').weapons=[take('Light:259')];put('Dark',0,'Dark:634').weapons=[take('Dark:1264')];hand('Dark','Dark:2754');`,
 steps:[{kind:'battle',side:'Light',args:[0]},{kind:'passWeapons',side:'Light'},{kind:'passWeapons',side:'Dark'},{kind:'skipDestiny',side:'Light'},{kind:'skipDestiny',side:'Dark'},
 {kind:'battleForfeit',side:'Light',args:[0],expect:"PremiereGame.responseWindow(state.game).kind==='aboutToLoseBattle'"},
 {kind:'interruptResponse',side:'Dark',where:"action.args.includes('captureBattle')"},{kind:'passResponse',side:'Light'},{kind:'passResponse',side:'Dark',expect:"state.pendingCustody?.[0].card.captured&&!state.lost.some(c=>c.id==='Light:2052')"},
 {kind:'custody',side:'Dark',where:"action.args[0]==='seize'",expect:"state.dark[0][0].escortedCaptive?.id==='Light:2052'"}]
},{
 name:'Cell 2187 restores a moving spy, consecutive releases and Rally choices',phase:4,
 setup:`locations(['Dark:673','Light:676']);put('Light',1,'Light:1495');put('Dark',0,'Dark:634');const luke=put('Dark',0,'Light:1593');luke.captured=true;luke.imprisoned=true;luke.weapons=[take('Light:1813')];const trooper=put('Dark',0,'Light:2052');trooper.captured=true;trooper.imprisoned=true;state.locationEffects={0:[{card:take('Light:385'),target:state.light[1][0]}]};top('Light','Light:1062');`,
 steps:[{kind:'move',side:'Light',where:"action.card.id==='Light:1495'&&action.to===0",expect:"state.pendingCardView.mode==='cellRescue'"},choose('Light',[0],"state.pendingCustody.length===1&&state.pendingCardView.mode==='cellRescue'"),choose('Light',[0],"state.pendingCustody.length===2&&!state.pendingCardView"),{kind:'custody',side:'Light',args:['rally']},{kind:'custody',side:'Light',args:['rally'],expect:"state.light[0].filter(c=>!c.captured).length===3&&state.light[0].some(c=>c.id==='Light:1593'&&c.weapons[0].id==='Light:1813')"}]
},{
 name:'Spice Mines retains its escort through phases and hyperspace arrival',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Light:2430','Dark:1426']);const ship=put('Dark',0,'Dark:723');const escort=take('Dark:2635');escort.escortedCaptive=take('Light:1593');escort.escortedCaptive.captured=true;PremiereUnits.add(ship,escort,'passenger','Dark');hand('Dark','Dark:2330');for(let i=0;i<5;i++)state.botLost.push(take('Dark:2355'));`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='spiceMines'"},{kind:'advance',side:'Dark'},{kind:'advance',side:'Dark'},
 {kind:'move',side:'Dark',where:"action.card.id==='Dark:723'&&action.to===1",expect:"state.lost.some(c=>c.id==='Light:1593')&&!state.locationEffects[1].length&&state.botLost.every(card=>card.id==='Dark:2330')"}]
},{
 name:'Besieged selection rebuilds trapped crew and isolated combatants',active:'Dark',phase:3,
 setup:`locations(['Light:2430']);const holder=put('Dark',0,'Dark:723'),beam=take('Dark:2620'),ship=put('Light',0,'Light:530');holder.attachments=[beam];const vader=take('Dark:634');vader.weapons=[take('Dark:1264')];PremiereUnits.add(holder,vader,'pilot','Dark');PremiereUnits.add(holder,take('Dark:1279'),'passenger','Dark');const han=take('Light:1098');han.weapons=[take('Light:1106')];PremiereUnits.add(ship,han,'pilot','Light');ship.inactive=true;ship.attachments=[take('Dark:223')];state.capturedShips=[{holder,ship,beam,side:'Light',bay:0,site:0}];`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='besieged'",expect:"state.pendingCardView.mode==='besiegedChoose'"},choose('Dark',['toggle',0]),choose('Dark',['fight'],"battleSession.participants.Dark.length===1&&battleSession.participants.Dark[0].id==='Dark:634'&&battleSession.participants.Light[0].id==='Light:1098'"),{kind:'passWeapons',side:'Dark'},{kind:'passWeapons',side:'Light'},{kind:'skipDestiny',side:'Dark'},{kind:'skipDestiny',side:'Light'},{kind:'passDamage',side:'Dark'},{kind:'battleForfeit',side:'Light',expect:"state.lost.some(c=>c.id==='Light:1098')"}]
},{
 name:'Out Of Commission resumes the tractor release decision',phase:1,
 setup:`locations(['Light:2430']);const holder=put('Dark',0,'Dark:723'),beam=take('Dark:2620'),ship=put('Light',0,'Light:530');holder.attachments=[beam];PremiereUnits.add(holder,take('Dark:634'),'pilot','Dark');PremiereUnits.add(ship,take('Light:1098'),'pilot','Light');ship.inactive=true;state.capturedShips=[{holder,ship,beam,side:'Light',bay:0,site:0}];hand('Light','Light:1872');`,
 steps:[{kind:'pileInterrupt',side:'Light',where:"action.card.id==='Light:1872'&&!!action.record",expect:"state.pendingCardView.mode==='tractorRelease'"},choose('Light',['launch'],"!state.capturedShips.length&&!state.light[0][0].inactive")]
},{
 name:'Rogue Bantha trample decision resumes before battle responses',phase:3,
 setup:`locations(['Light:2448']);put('Light',0,'Light:2125');put('Light',0,'Light:2052').weapons=[take('Light:259')];put('Dark',0,'Dark:2648');put('Dark',0,'Dark:2355').weapons=[take('Dark:1264')];`,
 steps:[{kind:'battle',side:'Light',args:[0],expect:"state.pendingCardView.mode==='rogueTrample'"},choose('Light',[0],"state.botLost.some(c=>c.id==='Dark:2648')&&battleSession.segment==='weapons'"),{kind:'passWeapons',side:'Light'}]
}];
