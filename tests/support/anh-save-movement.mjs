export default [{
 name:'mobile Sandcrawler interior retains its host and occupants after moving',player:'Dark',active:'Dark',phase:2,
 setup:`locations(['Dark:2446','Dark:2461']);const crawler=put('Dark',0,'Dark:2160');PremiereUnits.add(crawler,take('Dark:2355'),'driver','Dark');PremiereUnits.add(crawler,take('Dark:2075'),'passenger','Dark');hand('Dark','Dark:2164');`,
 steps:[{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='vehicleSite'",expect:"state.locations.filter(Boolean).length===3&&state.locations[2].hostInstanceId===state.dark[0][0].instanceId"},{kind:'advance',side:'Dark'},{kind:'advance',side:'Dark'},{kind:'anhCharacter',side:'Dark',where:"action.args[0]==='mobileCrew'&&action.card.id==='Dark:2075'&&action.to===2",expect:"state.dark[2].some(card=>card.id==='Dark:2075')"},{kind:'move',side:'Dark',where:"action.card.id==='Dark:2160'&&action.to===1",expect:"state.dark[2][0].id==='Dark:2075'&&adjacentSites(2,1)&&!adjacentSites(2,0)"}]
},{
 name:'free Skyhopper shuttle quota stays spent after resuming',phase:4,
 setup:`locations(['Light:2447','Light:2430']);put('Light',0,'Light:1298');put('Light',0,'Light:1098');put('Light',0,'Light:2052');put('Light',1,'Light:530');`,
 steps:[{kind:'anhCharacter',side:'Light',where:"action.args[0]==='shuttle'&&action.target.id==='Light:1098'&&action.role==='passenger'",expect:"!shuttleVehicleActions('Light').length&&state.force.length===8"},{kind:'transport',side:'Light',where:"action.card.id==='Light:2052'&&action.cost===1",expect:"state.light[1][0].occupants.length===2&&state.force.length===7"}]
}];
