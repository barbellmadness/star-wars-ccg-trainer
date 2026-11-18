const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
const ignition=(destiny,lightControls=false)=>`locations(['Dark:654','Dark:682','Dark:673','Dark:670','Light:2430','Light:2447','Light:2849','Light:2859']);
 const laser=take('Dark:2378');state.locationWeapons={0:[laser]};state.mobileSystems={'Dark:654':{parsec:7,orbit:4}};
 put('Dark',1,'Dark:657');put('${lightControls?'Light':'Dark'}',3,'${lightControls?'Light:1495':'Dark:60'}');
 put('Light',4,'Light:2907');put('Light',5,'Light:2052');
 const recharge=take('Light:509');laser.attachments=[recharge];state.tableEffects=[{card:recharge,host:laser,support:Array.from({length:8},()=>take('Dark:2355'))}];
 hand('Dark','Dark:508');top('Dark','${destiny}');`;
export default [{
 name:'Primary Ignition resumes Z, optional room bonus, recharging and planet destruction',active:'Dark',phase:1,inFlight:{'Dark:508':['epicRoomChoice']},
 setup:ignition('Dark:1308'),
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='primaryIgnition'",expect:"state.pendingCardView.mode==='ignitionZ'&&!JSON.stringify(PremiereGame.playerView(state,'Light')).includes('Dark:2355')"},choose('Light',[1],"state.pendingCardView.mode==='epicRoomChoice'"),choose('Dark',['yes'],"state.locations[4].blownAway&&!state.locations[5]&&state.light[4].some(card=>card.type==='Starship')&&!state.tableEffects.length&&state.botUsed.length>=8")]
},{
 name:'failed Ignition restores the deferred Gunner loss',active:'Dark',phase:1,inFlight:{'Dark:508':['epicRoomChoice']},
 setup:ignition('Dark:673'),
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='primaryIgnition'"},choose('Light',[1]),choose('Dark',['no'],"state.pendingCardView.mode==='ignitionGunner'&&!state.locations[4].blownAway"),choose('Dark',[0],"state.botLost.some(card=>card.id==='Dark:657')&&state.botUsed.some(card=>card.id==='Dark:508')")]
},{
 name:'opponent controls optional negative Ignition room modifier',active:'Dark',phase:1,inFlight:{'Dark:508':['epicRoomChoice']},
 setup:ignition('Dark:673',true),
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='primaryIgnition'"},choose('Light',[1],"state.pendingCardView.mode==='epicRoomChoice'&&state.pendingCardView.side==='Light'"),choose('Light',['yes'],"state.pendingCardView.mode==='ignitionGunner'"),choose('Dark',[0])]
}];
