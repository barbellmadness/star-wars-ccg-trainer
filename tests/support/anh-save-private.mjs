const choose=(side,args,expect)=>({kind:'finishCardInformation',side,args,expect});
export default [{
 name:'Hunchback private Force view resumes the interrupted drain',active:'Dark',phase:1,
 setup:`locations(['Light:2440','Dark:2446']);put('Light',0,'Light:1189');put('Dark',1,'Dark:2355');`,
 steps:[{kind:'drain',side:'Dark',args:[1]},{kind:'interruptResponse',side:'Light',where:"action.args.includes('hunchback')",expect:"state.pendingCardView.mode==='hunchback'&&!state.pendingCardView.publicView",privateFor:'Dark'},choose('Light',['done']),{kind:'passResponse',side:'Dark'},{kind:'passResponse',side:'Light'}, {kind:'loseForce',side:'Light',args:['force'],expect:"!state.pendingForceLoss"}]
},{
 name:'Conquest private hand peek restores the original battle response',player:'Dark',active:'Dark',phase:3,
 setup:`locations(['Light:2430']);put('Dark',0,'Dark:519');const falcon=put('Light',0,'Light:1677');PremiereUnits.add(falcon,take('Light:1098'),'pilot','Light');hand('Light','Light:1495');`,
 steps:[{kind:'battle',side:'Dark',args:[0]},{kind:'passResponse',side:'Light'},{kind:'interruptResponse',side:'Dark',where:"action.args.includes('conquestPeek')",expect:"state.pendingCardView.mode==='conquestPeek'&&state.pendingCardView.shown.length===1",privateFor:'Light'},choose('Dark',['deck']),{kind:'passResponse',side:'Light'},{kind:'passResponse',side:'Dark',expect:"!!battleSession&&!state.pendingCardView"}]
},{
 name:'Retract The Bridge keeps a partially chosen interior order',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:682','Dark:673','Dark:669','Dark:675']);hand('Dark','Dark:2103');`,
 steps:[{kind:'pileInterrupt',side:'Dark',where:"action.card.id==='Dark:2103'",expect:"state.pendingCardView.mode==='bridgeOrder'"},choose('Dark',['orderSite',2]),choose('Dark',['orderSite',1]),choose('Dark',['orderSite',0],"!state.pendingCardView&&JSON.stringify(boardLocationOrder())==='[2,1,0,3]'")]
},{
 name:'Hem Dazon hidden salt follows its owner through movement',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:2446','Dark:2439']);put('Dark',0,'Dark:1126');hand('Dark','Dark:1279');`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='salt'&&action.args[2]==='hand'",expect:"PremiereGame.playerView(state,'Light').players.Dark.board[0][0].salt[0].faceDown&&PremiereGame.playerView(state,'Dark').players.Dark.board[0][0].salt[0].faceDown"},{kind:'advance',side:'Dark'},{kind:'advance',side:'Dark'},{kind:'move',side:'Dark',where:"action.card.id==='Dark:1126'&&action.to===1",expect:"state.dark[1][0].salt.length===1"}]
},{
 name:'partial Superlaser recharging preserves hidden stack and payment order',active:'Dark',phase:2,
 setup:`locations(['Dark:654']);const laser=take('Dark:2378'),effect=take('Light:509');laser.attachments=[effect];state.locationWeapons={0:[laser]};state.tableEffects=[{card:effect,host:laser,support:[]}];`,
 steps:[{kind:'anhCharacter',side:'Dark',args:['chargeSuperlaser'],expect:"state.tableEffects[0].support.length===1&&!JSON.stringify(PremiereGame.playerView(state,'Light')).includes('Dark:2355')"},{kind:'anhCharacter',side:'Dark',args:['chargeSuperlaser']},{kind:'anhCharacter',side:'Dark',args:['chargeSuperlaser'],expect:"state.tableEffects[0].support.length===3"}]
}];
