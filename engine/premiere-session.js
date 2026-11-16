const {REVISION, readCatalog, readStarterDecks, buildAudit, locationTitle, isDeployableCharacter, isBantha, permanentPilotAbility, basicWeaponRule}=PremiereData;
let catalog=[],starterDecks=null,state=null,battleSession=null,setupDecks=null;
let nextGameId=0, presentGame=()=>{};
const currentGame=()=>state?.game??setupDecks?.game;
function publishGame(){if(!currentGame()?.executing)presentGame()}
const topLevelActions=new Set(['activate','draw','drain','deploy','deployWithPilot','transport','transitGroup','deployLocation','convertLocation','revolution','retrieve','equip','deployDevice','move','battle']);

function forceFromLocations(side){
 return state?PremiereLocations.forceGeneration(state,side):{count:0,unknown:0};
}

function activate(side,requested){const x=forceFromLocations(side),deck=side==='Light'?state.deck:state.botDeck,pile=side==='Light'?state.force:state.botForce;const count=Math.max(0,Math.min(Number.isInteger(requested)?requested:x.count,x.count,deck.length));PremiereGame.moveTop(deck,pile,count);log(side+' aktiviert '+count+' Force (Maximum '+x.count+' inklusive persönlicher Force und Karteneffekten).');return count}

function drawFor(side){
 const {force,hand}=PremiereGame.zones(state,side);
 if(!PremiereGame.moveTop(force,hand).length)return false;
 log(side+' Side zieht 1 Karte aus der Force Pile auf die Hand.');return true;
}
function recirculate(side){
 const {deck,used}=PremiereGame.zones(state,side);
 if(PremiereGame.recirculate(deck,used))log(side+' Used Pile unter das eigene Reserve Deck gelegt.');
}

function recirculateBoth(){recirculate('Light');recirculate('Dark')}

function cardAbility(c){
 if(isBantha(c))return 0.5;
 const pilot=permanentPilotAbility(c);
 if(pilot!==null){
  const slot=state?.locations?.findIndex((_,i)=>state.light?.[i]?.includes(c)||state.dark?.[i]?.includes(c))??-1;
  return slot>=0&&landedAt(c,slot)?0:pilot;
 }
 // Droids have no ability, counting as zero in comparisons; unknown other ability stays unknown.
 if(Number.isFinite(c?.ability))return c.ability;
 if(isDroid(c)||['Vehicle','Starship','Creature'].includes(c?.type))return 0;
 return null;
}

function confirmedPresence(side,i){return state?PremiereLocations.presence(state,side,i,cardAbility):false}

function drainPlan(side,i){
 if(!state||state.gameWinner||state.pendingForceLoss||state.phase!==1||state.activeSide!==side||
    state.drainedSitesThisTurn?.includes(i)||battleSession||PremiereGame.responseWindow(state.game))return null;
 return PremiereLocations.drain(state,side,i,cardAbility);
}
function drainAmount(plan,bonus=0){return Math.max(0,plan.base+plan.modifier+Math.min(bonus,plan.optional))}
function forceDrainValue(side,i){const plan=drainPlan(side,i);return plan?drainAmount(plan):null}
function forceDrainOptions(side){
 if(!state)return [];
 return state.locations.flatMap((loc,siteIndex)=>{
  const plan=drainPlan(side,siteIndex);
  if(!plan)return [];
  return [...Array(plan.optional+1)].map((_,bonus)=>({siteIndex,bonus,amount:drainAmount(plan,bonus)}));
 });
}

function lifeForceRemaining(side){return state?PremiereGame.lifeForce(state,side):0}
function checkLifeForceVictory(){
 if(!state||state.gameWinner)return state?.gameWinner??null;
 state.gameWinner=PremiereGame.outcome(state);
 if(state.gameWinner)log(state.gameWinner==='Simultaneous'?'SPIELENDE: Beide Seiten haben gleichzeitig keine Life Force mehr.':'SPIELENDE: '+state.gameWinner+' Side gewinnt, weil die gegnerische Life Force aufgebraucht ist.');
 return state.gameWinner;
}

function loseForceForDrain(side,zone,index){
 const pending=state?.pendingForceLoss;
 if(!pending||state.gameWinner||pending.payer!==side||!PremiereGame.lossChoices(state,side,pending.from).some(choice=>
  choice.args[0]===zone&&(zone!=='hand'||choice.args[1]===index)))return false;
 const card=PremiereGame.loseForce(state,side,zone,index);
 if(!card)return false;
 pending.remaining--;
 const label=pending.reason==='battleDamage'?'Battle Damage':pending.reason==='assault'?'Assault':'Force Drain';
 log(side+' verliert 1 Force für '+label+' aus '+zone+': '+card.name+'.');
 if(!pending.remaining||!PremiereGame.lossChoices(state,side).length){
  state.pendingForceLoss=null;
  if(pending.reason==='battleDamage')endBattleTiming();
 }
 checkLifeForceVictory();publishGame();return true;
}

function botPayDrainLoss(){
 while(state?.pendingForceLoss?.payer==='Dark'&&!state.gameWinner){
  const sources=['hand','used','force','deck'];
  const options=legalActions(state,'Dark');
  const choice=sources.map(zone=>options.find(option=>option.args[0]===zone)).find(Boolean);
  if(!performAction(choice,false))break;
 }
}

function initiateForceDrain(side,i,bonus=0){
 const plan=drainPlan(side,i);
 if(!plan||!Number.isInteger(bonus)||bonus<0||bonus>plan.optional)return false;
 (state.drainedSitesThisTurn??=[]).push(i);
 log(side+' initiiert einen Force Drain bei '+state.locations[i].name+' ('+drainAmount(plan,bonus)+' Force).');
 if(!openReactWindow('drain',side,i,bonus))resolveForceDrain(side,i,bonus);
 return true;
}
function resolveForceDrain(side,i,bonus){
 const plan=PremiereLocations.drain(state,side,i,cardAbility);
 if(!plan)return;
 const amount=drainAmount(plan,bonus);
 for(const {host,weapon} of plan.weapons.slice(0,bonus))PremiereUnits.recordWeaponUse(state,host,weapon);
 log(side+' führt Force Drain '+amount+' bei '+state.locations[i].name+' aus.');
 beginForceLoss(PremiereGame.otherSide(side),amount,{locationIndex:i,reason:'drain'});
}
function beginForceLoss(payer,amount,terms){
 const loss=Math.min(amount,(PremiereGame.zones(state,payer).hand?.length??0)+lifeForceRemaining(payer));
 if(loss>0){
  state.pendingForceLoss={payer,remaining:loss,...terms};
  log(payer+' muss '+loss+' Force verlieren.');
  if(payer==='Dark'&&!currentGame()?.executing)botPayDrainLoss();
 }
 publishGame();
 return loss;
}

function isLoc(c){return /location|site|system/i.test(c.type||'')}

function isSite(c){return isLoc(c)&&!/system/i.test(c.subType||'')}

function isSystem(c){return isLoc(c)&&/system/i.test(c.subType||'')}

function isPlanetSystem(c){return !!c&&isSystem(c)&&c.locationTags?.includes('Planet')&&Number.isInteger(c.parsec)}

function isExteriorPlanetSite(c){return !!c&&isSite(c)&&c.locationTags?.includes('Planet')&&c.locationTags.includes('Exterior')}

function withinDeploymentLimit(card,side){
 const limit=card.uniquenessLimit??card.name?.match(/^[*•]+/)?.[0].length??(card.unique===true?1:Infinity);
 if(limit===Infinity)return true;
 const identity=card.personas?.map(persona=>persona.toLowerCase())??[];
 return PremiereLocations.cardsOnTable(state,side).filter(unit=>
  locationTitle(unit)===locationTitle(card)||identity.some(persona=>unit.personas?.some(name=>name.toLowerCase()===persona))).length<limit;
}



function log(x){state.log.unshift(x);state.log=state.log.slice(0,40)}

function startingLocationChoices(deck){
 const offeredTitles=new Set();
 return deck.startingIndices.flatMap(index=>{
  if(deck.setAside.has(index))return [];
  const card=deck.cards[index],title=locationTitle(card);
  if(offeredTitles.has(title))return [];
  offeredTitles.add(title);
  return [{index,card}];
 });
}

function start(seed=Math.floor(Math.random()*4294967296),autoChoose=true,trainingBattle=false){
 if(!starterDecks||!Number.isInteger(seed)||seed<0||seed>4294967295)return false;
 battleSession=null;state=null;
 setupDecks={game:PremiereGame.actionState(++nextGameId,seed),trainingBattle,
  light:PremiereGame.copyDeck(starterDecks.light,'Light'),
  dark:PremiereGame.copyDeck(starterDecks.dark,'Dark')};
 prepareStartingRound();
 if(autoChoose)chooseBotStartingLocation();
 return true;
}
function prepareStartingRound(){
 setupDecks.revealed=null;
 setupDecks.darkChoice=undefined;
}
function chooseBotStartingLocation(){
 const options=legalActions(null,'Dark');
 if(!options.length)return false;
 const cursor={randomState:setupDecks.game.randomState};
 return performAction(options[Math.floor(PremiereGame.random(cursor)*options.length)]);
}
function resolveStartingChoice(side,index){
 const setup=setupDecks;
 const deck=side==='Dark'?setup.dark:setup.light;
 const choice=startingLocationChoices(deck).find(option=>option.index===index)??null;
 if(side==='Dark'){
  PremiereGame.random(setup.game);
  setup.darkChoice=choice;
  return true;
 }
 const lightChoice=choice,darkChoice=setup.darkChoice;
 const collision=!!lightChoice&&!!darkChoice&&locationTitle(lightChoice.card)===locationTitle(darkChoice.card);
 if(collision){
  setup.light.setAside.add(lightChoice.index);
  setup.dark.setAside.add(darkChoice.index);
 }
 setup.revealed={lightChoice,darkChoice,collision};
 return true;
}
function finishSetup(){
 const setup=setupDecks,{lightChoice,darkChoice}=setup.revealed;
 const locations=[lightChoice?.card,darkChoice?.card].filter(Boolean).concat(null);
 // Only the final picks leave the decks. Set-aside cards return to the shuffle.
 const deck=PremiereGame.shuffle(setup.light.cards.filter((card,index)=>index!==lightChoice?.index),setup.game);
 const botDeck=PremiereGame.shuffle(setup.dark.cards.filter((card,index)=>index!==darkChoice?.index),setup.game);
 state=PremiereGame.createState(setup.game,deck,botDeck,locations,initialLocationOrder(locations));
 state.trainingBattle=setup.trainingBattle;
 setupDecks=null;
 log('Starting Locations: Light '+(lightChoice?.card.name??'kein Startort')+' / Dark '+(darkChoice?.card.name??'kein Startort')+'. Je 8 Karten Starthand. Dark Side beginnt.');
 botBegin();
 checkpoint('turn:start',()=>checkpoint('phase:start',()=>{}));
 return true;
}

function sitePlanet(card){
 if(!card||!isSite(card))return null;
 const match=locationTitle(card).match(/^([^:]+):\s*\S/);
 return match?match[1].trim():null;
}

function locationGroup(card){return card&&isSystem(card)?locationTitle(card):sitePlanet(card)}

function locationPlacementRank(card){
 // Inside, Cantina, indoor/outdoor docking bay, Mos Eisley, outside, system.
 // The three named Tatooine sites form an uninterrupted block when in play.
 if(isSystem(card))return 5;
 const title=locationTitle(card);
 if(title==='tatooine: cantina')return 1;
 if(title==='tatooine: mos eisley')return 3;
 if(card.locationTags?.includes('Interior'))return card.locationTags.includes('Exterior')?2:0;
 return 4;
}

function initialLocationOrder(locations){
 const groups=new Map();
 locations.forEach((card,slot)=>{
  if(!card)return;
  const group=locationGroup(card)??slot;
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push(slot);
 });
 return [...groups.values()].flatMap(slots=>slots.sort((a,b)=>locationPlacementRank(locations[a])-locationPlacementRank(locations[b])));
}

function boardLocationOrder(){return state.locationOrder??initialLocationOrder(state.locations)}

function adjacentSites(from,to){
 const group=sitePlanet(state?.locations[from]);
 if(!group||group!==sitePlanet(state.locations[to]))return false;
 const order=boardLocationOrder(),position=order.indexOf(from);
 return position>=0&&(order[position-1]===to||order[position+1]===to);
}

function landedAt(card,slot){
 return card.type==='Starship'&&!!state.locations[slot]&&isSite(state.locations[slot]);
}

function craftStats(card,slot,forMovement=false){
 return PremiereUnits.stats(card,permanentPilotAbility(card),{landed:!forMovement&&landedAt(card,slot)});
}

function groundReach(card,from,to,range){
 const order=boardLocationOrder(),a=order.indexOf(from),b=order.indexOf(to),region=sitePlanet(state.locations[from]);
 if(a<0||b<0||!region||region!==sitePlanet(state.locations[to])||Math.abs(a-b)>range)return false;
 return order.slice(Math.min(a,b),Math.max(a,b)+1).every(slot=>{
  const loc=state.locations[slot],tags=loc.locationTags??[];
  if(sitePlanet(loc)!==region)return false;
  if(PremiereUnits.tube(card))return tags.includes('Interior')&&tags.includes('Mobile');
  if(PremiereUnits.bantha(card))return isExteriorPlanetSite(loc);
  if(card.type==='Vehicle')return tags.includes('Exterior')&&(!PremiereUnits.crawler(card)||tags.includes('Planet'));
  return true;
 });
}

function travelOptions(card,side,from,to,react=false){
 const origin=state.locations[from],destination=state.locations[to];
 if(from===to||!origin||!destination||!PremiereUnits.active(card))return [];
 const options=[];
 if(card.type==='Starship'){
  const stats=craftStats(card,from,true);
  if(!stats.powered)return [];
  if(isPlanetSystem(origin)&&isPlanetSystem(destination)&&stats.navComputer&&stats.hyperspeed>0&&
     Math.abs(origin.parsec-destination.parsec)<=stats.hyperspeed)options.push({kind:'Hyperspeed',cost:1});
  if(PremiereUnits.fighter(card)){
   const landing=isPlanetSystem(origin)&&isExteriorPlanetSite(destination)&&locationGroup(origin)===sitePlanet(destination);
   const takeoff=isExteriorPlanetSite(origin)&&isPlanetSystem(destination)&&sitePlanet(origin)===locationGroup(destination);
   const bay=PremiereLocations.conditions(state,landing?to:from,side).dockingBay;
   if((landing||takeoff)&&(bay||!PremiereUnits.tie(card)))options.push({kind:landing?'Landen':'Starten',cost:bay?0:1});
  }
  return options;
 }
 const vehicle=card.type==='Vehicle',character=card.type==='Character'||isDeployableCharacter(card);
 if(!vehicle&&!character)return [];
 const speed=vehicle?craftStats(card,from).landspeed:card.id==='Dark:1709'||card.id==='Light:1407'?3:1;
 if(speed>0&&groundReach(card,from,to,react&&card.id==='Light:2250'?1:speed)){
  options.push({kind:'Landspeed',cost:vehicle?PremiereUnits.landspeedCost(card):1});
 }
 if(!react&&state.phase===1){
  const names=[locationTitle(origin),locationTitle(destination)].sort();
  const mos=locationTitle(origin)==='tatooine: mos eisley'?from:to;
  const mosCard=state.locations[mos];
  return names[0]==='tatooine: cantina'&&names[1]==='tatooine: mos eisley'&&character&&
   mosCard.id==='Light:2466'&&PremiereLocations.printedSide(state,mos,side)==='Light'?[{kind:'Mos Eisley',cost:0}]:[];
 }
 if(!react&&state.phase===4&&!PremiereUnits.tube(card)&&!PremiereUnits.crawler(card)&&
  PremiereLocations.conditions(state,from,side).dockingBay&&PremiereLocations.conditions(state,to,side).dockingBay){
  options.push({kind:'Docking-Bay-Transit',cost:PremiereLocations.conditions(state,from,side).transitCost});
 }
 if(!react&&state.phase===4&&origin.id==='Dark:678'&&sitePlanet(destination)==='death star'&&character&&
    /^Imperial$/i.test(card.subType??'')&&PremiereLocations.printedSide(state,from,side)==='Dark'){
  options.push({kind:'Militärkorridor',cost:0});
 }
 return options;
}

function regularMoveKind(card,from,to){return travelOptions(card,card.side??state.activeSide??'Light',from,to)[0]?.kind??null}

function movementOptionsFor(side){
 if(!state||state.gameWinner||state.pendingForceLoss||!PremiereGame.sides.includes(side)||
    (state.activeSide&&state.activeSide!==side)||![1,4].includes(state.phase))return [];
 if(side==='Light'?!!state.botTurn:!state.botTurn)return [];
 const {force,board}=PremiereGame.zones(state,side);
 if(!force||!board)return [];
 return board.flatMap((row,from)=>row.flatMap((card,index)=>{
  if(state.movedThisTurn?.includes(card))return [];
  return state.locations.flatMap((location,to)=>travelOptions(card,side,from,to)
   .filter(travel=>travel.cost<=force.length)
   .map(travel=>({...travel,from,to,index,card,name:card.name})));
 }));
}

function movementOptions(){return movementOptionsFor('Light')}

function moveCharacterFor(side,from,index,to,kind){
 const option=movementOptionsFor(side).find(x=>x.from===from&&x.index===index&&x.to===to&&(!kind||x.kind===kind));
 if(!option)return false;
 const {board,force,used}=PremiereGame.zones(state,side);
 const [card]=board[from].splice(index,1);
 PremiereGame.moveTop(force,used,option.cost);
 board[to].push(card);
 (state.movedThisTurn??=[]).push(card);
 log(side+' bewegt '+card.name+' per '+option.kind+' nach '+state.locations[to].name+' ('+option.cost+' Force).');
 publishGame();return true;
}

function moveCharacter(from,index,to){return moveCharacterFor('Light',from,index,to)}

function transportOptions(side){
 const options=[];
 if(state.activeSide!==side||![2,4].includes(state.phase))return options;
 const {board,force,hand}=PremiereGame.zones(state,side);
 const move=state.phase===4,ready=card=>PremiereUnits.active(card)&&!state.movedThisTurn?.includes(card);
 const offer=(kind,from,to,unit,host,role,cost,card,carrier,label)=>{
  if(cost<=(force?.length??0))options.push({args:[kind,from,to,unit,host,role],from,to,card,carrier,cost,label});
 };
 for(const [slot,row] of (board??[]).entries())for(const [i,host] of row.entries()){
  if(!PremiereUnits.active(host))continue;
  const here=state.locations[slot];
  const landed=isSite(here);
  if(!move&&['Starship','Vehicle'].includes(host.type)){
   for(const [h,card] of (hand??[]).entries()){
    if((card.side&&card.side!==side)||!Number.isFinite(card.deploy)||!withinDeploymentLimit(card,side)||!hasDeployPresence(side,here))continue;
    if(card.type==='Character'&&!characterLocationAllowed(card,here))continue;
    for(const role of PremiereUnits.roles(host,card)){
     offer('deployAboard',slot,slot,h,i,role,crewDeployCost(card,side),card,host,'An Bord ausspielen');
    }
   }
  }
  if(move)for(const [j,card] of row.entries())for(const role of PremiereUnits.roles(host,card)){
   if(landed||role==='cargo'||role==='hangar')offer('embark',slot,slot,j,i,role,0,card,host,'Einsteigen');
  }
  for(const [j,entry] of (host.occupants??[]).entries()){
   const card=entry.card;
   if(!PremiereUnits.active(card))continue;
   for(const role of PremiereUnits.roles(host,card,entry).filter(role=>role!==entry.role)){
    offer('role',slot,slot,j,i,role,0,card,host,'Rolle wechseln');
   }
   (host.occupants??[]).forEach((other,k)=>{
    if(k>j&&other.role!==entry.role&&PremiereUnits.accepts(host,card,other.role,other)&&
       PremiereUnits.accepts(host,other.card,entry.role,entry))offer('swap',slot,k,j,i,'',0,card,host,'Rollen tauschen mit '+other.card.name);
   });
   if(!move)continue;
   if(landed||(entry.role==='hangar'&&craftStats(card,slot,true).powered))offer('exit',slot,slot,j,i,'',0,card,host,'Aussteigen');
   if(!landed&&host.type==='Starship'&&['pilot','passenger','cargo','hangar'].includes(entry.role)){
    row.forEach((target,k)=>{
     if(target===host||target.type!=='Starship'||(!PremiereUnits.hasDock(target)&&!PremiereUnits.hasDock(host)&&
        !PremiereUnits.capital(target)&&!PremiereUnits.capital(host))||(!craftStats(host,slot).powered&&!craftStats(target,slot).powered))return;
     for(const role of PremiereUnits.roles(target,card).filter(role=>role!=='astromech')){
      offer('dock',slot,k,j,i,role,1,card,target,'Andocken und transferieren');
     }
    });
   }
   if(!landed&&PremiereUnits.capital(host)&&ready(card)&&['Character','Vehicle'].includes(card.type)&&!PremiereUnits.bantha(card)){
    state.locations.forEach((loc,to)=>{
     if(isExteriorPlanetSite(loc)&&sitePlanet(loc)===locationGroup(here))offer('shuttleDown',slot,to,j,i,'',1,card,host,'Shuttle zum Site');
    });
   }
  }
  if(move&&!landed&&PremiereUnits.capital(host)){
   state.locations.forEach((loc,from)=>{
    if(!isExteriorPlanetSite(loc)||sitePlanet(loc)!==locationGroup(here))return;
    board[from].forEach((card,j)=>{
     if(!ready(card))return;
     for(const role of PremiereUnits.roles(host,card).filter(role=>role!=='hangar')){
      offer('shuttleUp',from,slot,j,i,role,1,card,host,'Shuttle zum Schiff');
     }
    });
   });
  }
 }
 return options;
}

function performTransport(side,...args){
 const choice=transportOptions(side).find(option=>option.args.every((value,i)=>value===args[i]));
 if(!choice)return false;
 const [kind,from,to,index,hostIndex,role]=choice.args;
 const {board,hand,force,used}=PremiereGame.zones(state,side);
 const host=board[kind==='shuttleUp'?to:from][hostIndex];
 const card=choice.card;
 if(kind==='role')host.occupants[index].role=role;
 else if(kind==='swap'){
  const first=host.occupants[index],second=host.occupants[to];
  [first.role,second.role]=[second.role,first.role];
 }
 else if(kind==='deployAboard'){
  hand.splice(index,1);
  PremiereUnits.add(host,card,role,side);
  (state.deployedThisTurn??=[]).push(card);
 }else if(kind==='embark'||kind==='shuttleUp'){
  board[from].splice(index,1);
  PremiereUnits.add(host,card,role,side);
 }else{
  host.occupants.splice(index,1);
  if(kind==='dock')PremiereUnits.add(board[from][to],card,role,side);
  else board[to].push(card);
 }
 if(kind==='shuttleUp'||kind==='shuttleDown')(state.movedThisTurn??=[]).push(card);
 PremiereGame.moveTop(force,used,choice.cost);
 log(side+' · '+choice.label+': '+card.name+' / '+choice.carrier.name+' ('+choice.cost+' Force).');
 return true;
}

function transitGroups(side){
 const groups=new Map();
 for(const option of movementOptionsFor(side).filter(move=>move.kind==='Docking-Bay-Transit')){
  const key=option.from+':'+option.to;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(option);
 }
 return [...groups.values()].filter(group=>group.length>1);
}

function performTransitGroup(side,from,to){
 const group=transitGroups(side).find(group=>group[0].from===from&&group[0].to===to);
 if(!group)return false;
 const {board,force,used}=PremiereGame.zones(state,side);
 for(const move of group.slice().reverse())board[from].splice(move.index,1);
 const cards=group.map(move=>move.card);
 board[to].push(...cards);
 (state.movedThisTurn??=[]).push(...cards);
 PremiereGame.moveTop(force,used,group[0].cost);
 log(side+' verlegt '+cards.length+' Einheiten per Docking-Bay-Transit ('+group[0].cost+' Force).');
 return true;
}


function botMoveScore(option){
 const dest=state.locations[option.to],lightIcons=Number.isInteger(dest?.icons?.light)?dest.icons.light:0;
 const enemy=confirmedPresence('Light',option.to)===true?2:0,empty=confirmedPresence('Dark',option.to)!==true?1:0;
 const leavesLast=(state.dark[option.from]||[]).length===1?2:0;
 return lightIcons*2+enemy+empty-leavesLast;
}

function characterTraits(c){return (c.characteristics||[]).map(x=>String(x).toLowerCase())}

function isDroid(c){return String(c?.type||'').toLowerCase()==='character'&&String(c?.subType||'').toLowerCase()==='droid'}

function isPowerDroid(c){return isDroid(c)&&(c.id==='Dark:816'||(c.extraText||[]).some(tag=>/\bpower droid\b/i.test(String(tag))))}

function cardPowerModifier(c,side,siteIndex){
 if(!state||!['Light','Dark'].includes(side)||!isSite(state.locations?.[siteIndex]))return 0;
 const same=PremiereLocations.presentCards(state,side,siteIndex);
 let bonus=0;
 if(side==='Light'&&PremiereLocations.conditions(state,siteIndex,side).night&&sitePlanet(state.locations[siteIndex])&&
    same.some(x=>x.id==='Light:2'&&/nighttime conditions/i.test(x.gametext||''))&&
    characterTraits(c).some(x=>/\brebel\b|\balien\b/.test(x)))bonus+=2;
 // EG-6 gives +1 power to each other allied droid at its site, except power droids.
 if(isDroid(c)&&!isPowerDroid(c))
   bonus+=same.filter(x=>x.id==='Dark:816'&&/adds 1 to power of each of your droids/i.test(x.gametext||'')).length;
 if(c.id==='Dark:2648'&&isExteriorPlanetSite(state.locations[siteIndex]))
   bonus+=(state.dark[siteIndex]||[]).filter(isBantha).length;
 return bonus;
}

function cardEffectStatus(c){
 if(isBantha(c))return 'TEILWEISE: Außen-Site, Ability ½, Landspeed, React, Waffenabwehr und Power +1 für anwesende Tusken Raider. Boarding ist offen.';
 if(c.id==='Light:1593')return 'TEILWEISE: Force-Generierung +1 außerhalb von Tatooine-Sites und gedruckte Attrition-Immunität. Pilotenboni sind offen.';
 if(c.id==='Light:2110')return 'TEILWEISE: Vertauscht Force-Icons und die Seiten der implementierten Ortsregeln. Expand The Empire und Aufheben des Effects sind offen.';
 if(lostRetrieval.has(c.id))return 'TEILWEISE: Rückholen der benannten Karten aus dem Lost Pile. Die Suche im Reserve Deck ist offen.';
 if(['Light:2385','Dark:575'].includes(c.id))return 'TEILWEISE: Antwort auf Force Drain mit Destiny-Vergleich und Force Loss.';
 if(permanentPilotAbility(c)!==null)return 'TEILWEISE: System-Deploy, Power und permanente Piloten-Ability. Hyperspeed mit Nav Computer, soweit vorhanden. Boarding, Landen und Schiffsbewaffnung sind offen.';
 if(['Light:608','Dark:1426','Light:80'].includes(c.id))return 'TEILWEISE: Grundlegende Modifikatoren für Deploy oder Battle Destiny im Weltraum. Weitere Kartentexte sind offen.';
 if(['Dark:682','Light:2859'].includes(c.id))return 'TEILWEISE: Zusätzliche Battle-Destiny bei eigener Initiierung. Weitere Effekte sind offen.';
 if(['Light:2448','Dark:2458'].includes(c.id))return 'TEILWEISE: Erhöhte Mindest-Ability für Battle-Destiny berücksichtigt. Weitere Effekte sind offen.';
 if(basicWeaponRule(c))return 'TEILWEISE: Ausspielen auf einem eigenen Warrior und Waffen-Destiny gegen Charaktere und Banthas am Kampf-Site unterstützt.';if(c.id==='Dark:634'&&/When in battle, adds 1 to each of your battle destiny draws/i.test(c.gametext||''))return 'TEILWEISE: Battle-Destiny-Draws Dark +1 durch Vader und gedruckte Attrition-Immunität; Pilot- und weitere Sonderregeln offen.';if(c.id==='Light:2')return 'TEILWEISE: Nacht-Power +2 für verbündete Rebels/Aliens am selben Planetensite; bedingte Attrition-Immunität offen.';if(c.id==='Dark:816')return 'TEILWEISE: EG-6 erhöht Power eigener Droids am selben Site; Spezial-Destiny 0 und bedingte Power-Verdopplung unterstützt.';const below=printedAttritionImmunityBelow(c);if(below!==null)return 'TEILWEISE: Unbedingte gedruckte Attrition-Immunität < '+below+' unterstützt; übrige Karteneffekte offen.';if(!(c.gametext||'').trim())return 'KEIN KARTENTEXT: keine individuellen Text-Effekte zu automatisieren (andere Spielregeln gelten weiterhin).';return 'OFFEN: Kartentext noch nicht als ausführbare Regel validiert.'}

function effectCoverage(){const total=catalog.length,withoutText=catalog.filter(c=>!(c.gametext||'').trim()),partial=catalog.filter(c=>cardEffectStatus(c).startsWith('TEILWEISE:')),unimplemented=catalog.filter(c=>cardEffectStatus(c).startsWith('OFFEN:'));return {total,withoutText,partial,unimplemented}}

function cardEffectFlags(c){const s=c.gametext||'';return [{name:'Force',re:/force generation|force drain|force icons?|activate.*force|generates? .*force/i},{name:'Deploy',re:/deploy|deployment/i},{name:'Destiny',re:/destiny|attrition/i},{name:'Power',re:/power [+-]|power is|power \+/i},{name:'Movement',re:/move|movement|landspeed|hyperspeed|transport/i},{name:'Immunity',re:/immun/i}].filter(x=>x.re.test(s)).map(x=>x.name)}

function isSpyCharacter(c){
 if(!isDeployableCharacter(c))return false;
 return (c.characteristics||[]).some(t=>/\bspy\b/i.test(String(t)))||/\bspy\b/i.test(String(c.lore||c.rawFront?.lore||''));
}

function canPayBoardDeploy(c,side,cost){
 const pile=side==='Light'?state.force:state.botForce;
 return !!pile&&pile.length>=cost&&withinDeploymentLimit(c,side);
}

function hasDeployPresence(side,loc){
 const index=state.locations.indexOf(loc);
 const ownIcons=index>=0?PremiereLocations.icons(state,index,side):loc.icons?.[side.toLowerCase()];
 if(index>=0&&loc.id==='Light:680'&&PremiereLocations.printedSide(state,index,side)==='Light')return true;
 return (Number.isFinite(ownIcons)&&ownIcons>=1)||(index>=0&&confirmedPresence(side,index)===true);
}

function characterDeployCost(card,site,side){
 if(!isSite(site)||(!hasDeployPresence(side,site)&&!isSpyCharacter(card)))return null;
 if(!characterLocationAllowed(card,site))return null;
 const printed=PremiereLocations.printedSide(state,state.locations.indexOf(site),side);
 const name=locationTitle(card);
 let discount=0;
 if(printed==='Light'&&site.id==='Light:2462'&&['beru lars','luke skywalker'].includes(name))discount=1;
 if(printed==='Light'&&site.id==='Light:2471'&&name==='obi-wan kenobi')discount=3;
 const slot=state.locations.indexOf(site);
 const droidTax=isDroid(card)?PremiereLocations.presentCards(state,PremiereGame.otherSide(side),slot).filter(unit=>unit.id==='Dark:12').length:0;
 return Math.max(0,crewDeployCost(card,side)-discount+droidTax);
}

function characterLocationAllowed(card,loc){
 const region=sitePlanet(loc);
 if(card.id==='Dark:2648')return region==='tatooine';
 if(card.id==='Dark:668')return region==='death star';
 if(card.id==='Dark:1709'){
  const slot=state.locations.indexOf(loc);
  const targets=PremiereGame.sides.flatMap(side=>PremiereLocations.cardsOnTable(state,side))
   .filter(unit=>unit.type==='Character'&&PremiereLocations.at(state,unit,slot));
  return isSite(loc)&&Object.values(state.locationEffects??{}).flat().some(effect=>
   effect.card.subType==='Utinni'&&effect.card.id!=='Light:1429'&&effect.targetInstanceId&&targets.some(unit=>unit.instanceId===effect.targetInstanceId));
 }
 return true;
}

function crewDeployCost(card,side){
 const imperials=card.id==='Dark:60'?PremiereLocations.activeCards(state,side).filter(unit=>
  unit.type==='Starship'&&unit.side==='Dark'&&!unit.characteristics?.includes('independent')).length:0;
 return Math.max(0,card.deploy-(imperials>=2?2:0));
}

function craftDeployCost(card,loc,side,pilot=null){
 if(!Number.isInteger(card.deploy)||card.deploy<0)return null;
 if(isBantha(card))return isExteriorPlanetSite(loc)?card.deploy:null;
 if(card.type==='Vehicle'){
  if(PremiereUnits.tube(card))return isSite(loc)&&loc.locationTags?.includes('Interior')&&loc.locationTags.includes('Mobile')?card.deploy:null;
  if(PremiereUnits.crawler(card)&&sitePlanet(loc)!=='tatooine')return null;
  return isExteriorPlanetSite(loc)?card.deploy:null;
 }
 if(card.type!=='Starship')return null;
 const slot=state.locations.indexOf(loc);
 const bay=PremiereUnits.fighter(card)&&PremiereLocations.conditions(state,slot,side).dockingBay;
 if(!bay&&(!isPlanetSystem(loc)||(permanentPilotAbility(card)===null&&!pilot)))return null;
 if(pilot&&!PremiereUnits.accepts(card,pilot,'pilot'))return null;
 const capital=/^Capital\b/i.test(card.subType||'');
 let discount=0;
 const printed=PremiereLocations.printedSide(state,slot,side);
 if(printed==='Light'&&loc.id==='Light:608')discount=capital?2:1;
 if(printed==='Dark'&&loc.id==='Dark:1426'){
  const board=PremiereGame.zones(state,side).board?.[slot]??[];
  const tarkinAboard=board.some(ship=>ship.type==='Starship'&&ship.occupants?.some(({card})=>locationTitle(card)==='grand moff tarkin'));
  discount=tarkinAboard?2:1;
 }
 if(card.id==='Dark:2600'&&state.dark[state.locations.indexOf(loc)]?.some(c=>
  c.type==='Starship'&&/^Capital\b/i.test(c.subType||'')&&/\bImperial\b/i.test(c.subType)))discount++;
 return Math.max(0,card.deploy-discount)+(pilot?crewDeployCost(pilot,side):0);
}

const jawaCosts=new Map([['Light:1373',1],['Dark:1372',1],['Dark:643',2]]);
function jawaDeployPayment(card,loc,side){
 if(!isSite(loc)||sitePlanet(loc)!=='tatooine'||!hasDeployPresence(side,loc))return null;
 const slot=state.locations.indexOf(loc),printed=PremiereLocations.printedSide(state,slot,side);
 if((loc.id==='Light:2455'&&printed==='Light')||(loc.id==='Dark:2454'&&printed==='Dark')){
  const sandcrawler=loc.id==='Light:2455'&&PremiereGame.sides.some(player=>
   PremiereLocations.presentCards(state,player,slot).some(unit=>/Sandcrawler/i.test(unit.name??'')));
  return {own:sandcrawler?0:1,opposing:0};
 }
 const cost=jawaCosts.get(card.id);
 return {own:cost,opposing:cost};
}

function boardDeployCost(card,loc,side){
 if(!state||!card||!loc||(card.side&&card.side!==side))return null;
 if(jawaCosts.has(card.id)){
  const payment=jawaDeployPayment(card,loc,side);
  if(!payment||!canPayBoardDeploy(card,side,payment.own))return null;
  const {force}=PremiereGame.zones(state,PremiereGame.otherSide(side));
  return payment.opposing<=(force?.length??0)?payment.own:null;
 }
 const cost=isDeployableCharacter(card)?characterDeployCost(card,loc,side):
  hasDeployPresence(side,loc)?craftDeployCost(card,loc,side):null;
 return cost!==null&&canPayBoardDeploy(card,side,cost)?cost:null;
}

function weaponDeployOptions(side,handIndex){
 if(!state||state.phase!==2||state.activeSide!==side||state.gameWinner||state.pendingForceLoss||battleSession)return [];
 const light=side==='Light',hand=light?state.hand:state.botHand,rows=light?state.light:state.dark;
 const force=light?state.force:state.botForce,used=light?state.used:state.botUsed;
 const card=hand?.[handIndex],rule=basicWeaponRule(card);
 if(!rule||card.side!==side||!force||!used||force.length<rule.cost)return [];
 const options=[];
 state.locations.forEach((site,siteIndex)=>{
  if(!site||!isSite(site))return;
  rows[siteIndex].forEach((host,hostIndex)=>{
   if(host.type==='Character'&&host.warrior&&host.side===side)options.push({siteIndex,hostIndex,host,cost:rule.cost});
  });
 });
 return options;
}

function deployWeaponFor(side,handIndex,siteIndex,hostIndex){
 const option=weaponDeployOptions(side,handIndex).find(x=>x.siteIndex===siteIndex&&x.hostIndex===hostIndex);
 if(!option)return false;
 const light=side==='Light',hand=light?state.hand:state.botHand,force=light?state.force:state.botForce,used=light?state.used:state.botUsed;
 const [weapon]=hand.splice(handIndex,1);
 PremiereGame.moveTop(force,used,option.cost);
 (option.host.weapons??=[]).push(weapon);
 log(side+' rüstet '+option.host.name+' mit '+weapon.name+' aus ('+option.cost+' Force → Used Pile).');
 return true;
}

function backpackHosts(side,handIndex){
 const {hand,board}=PremiereGame.zones(state,side);
 if(side!=='Dark'||hand?.[handIndex]?.id!=='Dark:2357')return [];
 return board.flatMap((row,slot)=>row.flatMap((host,index)=>{
  const trooper=characterTraits(host).some(trait=>/trooper/.test(trait))||/trooper/i.test(host.name??'');
  return host.type==='Character'&&trooper&&PremiereUnits.active(host)&&!host.attachments?.some(card=>card.id==='Dark:2357')?
   [{slot,index,host}]:[];
 }));
}

function deployBackpack(side,handIndex,slot,hostIndex){
 const option=backpackHosts(side,handIndex).find(choice=>choice.slot===slot&&choice.index===hostIndex);
 if(!option)return false;
 const {hand}=PremiereGame.zones(state,side),[device]=hand.splice(handIndex,1);
 (option.host.attachments??=[]).push(device);
 log(side+' rüstet '+option.host.name+' mit '+device.name+' aus.');
 return true;
}

function ensureFreeLocationSlot(){
 if(!state||!Array.isArray(state.locations))return false;
 if(state.locations.some(loc=>loc===null))return true;
 state.locations.push(null);state.light.push([]);state.dark.push([]);return true;
}

function locationDeployPositions(side,handIndex){
 if(!state||state.phase!==2||state.activeSide!==side||!['Light','Dark'].includes(side)||state.gameWinner||state.pendingForceLoss||battleSession)return [];
 const card=(side==='Light'?state.hand:state.botHand)?.[handIndex];
 const group=locationGroup(card);
 if(!group||(card.side&&card.side!==side))return [];
 if(state.locations.some(loc=>loc&&locationTitle(loc)===locationTitle(card)))return [];

 const order=boardLocationOrder();
 const groupAt=index=>locationGroup(state.locations[order[index]]);
 const first=order.findIndex(slot=>locationGroup(state.locations[slot])===group);
 if(first<0)return [order.length];

 let end=first+1;
 while(end<order.length&&groupAt(end)===group)end++;
 const rank=locationPlacementRank(card),positions=[];
 for(let i=first;i<=end;i++){
  const fitsAfter=i===first||locationPlacementRank(state.locations[order[i-1]])<=rank;
  const fitsBefore=i===end||rank<=locationPlacementRank(state.locations[order[i]]);
  if(fitsAfter&&fitsBefore)positions.push(i);
 }
 return positions;
}

function deployLocationFromHand(side,handIndex,position){
 if(!locationDeployPositions(side,handIndex).includes(position))return false;
 const hand=side==='Light'?state.hand:state.botHand;
 const order=boardLocationOrder().slice();
 ensureFreeLocationSlot();
 const slot=state.locations.indexOf(null),[card]=hand.splice(handIndex,1);
 // Unit arrays and rule references use the stable slot. Insertion only changes the table order.
 state.locations[slot]=card;
 order.splice(position,0,slot);
 state.locationOrder=order;
 ensureFreeLocationSlot();
 log(side+' legt Location '+card.name+' aus.');return true;
}

function conversionTarget(side,handIndex){
 if(!state||state.phase!==2||state.activeSide!==side||state.gameWinner||state.pendingForceLoss||battleSession)return -1;
 const card=PremiereGame.zones(state,side).hand?.[handIndex];
 if(!card||!isLoc(card)||card.side!==side)return -1;
 return state.locations.findIndex(old=>old&&old.side===PremiereGame.otherSide(side)&&
  old.subType===card.subType&&locationTitle(old)===locationTitle(card)&&!old.cannotConvert);
}

function convertLocation(side,handIndex,slot){
 if(slot<0||conversionTarget(side,handIndex)!==slot)return false;
 const [card]=PremiereGame.zones(state,side).hand.splice(handIndex,1);
 const previous=state.locations[slot];
 ((state.convertedLocations??=[])[slot]??=[]).push(previous);
 state.locations[slot]=card;
 const effects=PremiereLocations.effectsAt(state,slot);
 if(effects.length){
  state.locationEffects[slot]=effects.filter(effect=>{
   if(!effect.requiredTag||card.locationTags?.includes(effect.requiredTag))return true;
   PremiereGame.zones(state,effect.card.owner??effect.card.side).lost.push(effect.card);
   log(effect.card.name+' geht verloren: Die neue Location erfüllt die Zielbedingung nicht.');
   return false;
  });
 }
 log(side+' konvertiert '+previous.name+'.');
 return true;
}

function revolutionOptions(side,handIndex){
 const {hand,force}=PremiereGame.zones(state,side);
 if(hand?.[handIndex]?.id!=='Light:2110'||side!=='Light'||force.length<3)return [];
 return state.locations.flatMap((location,slot)=>location&&!PremiereLocations.effectsAt(state,slot)
  .some(effect=>effect.card.id==='Light:2110')?[slot]:[]);
}

function deployRevolution(side,handIndex,slot){
 if(!revolutionOptions(side,handIndex).includes(slot))return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 const [card]=hand.splice(handIndex,1);
 PremiereGame.moveTop(force,used,3);
 ((state.locationEffects??=[])[slot]??=[]).push({card});
 log(card.name+' vertauscht Force-Icons und Seiten des Spieltexts bei '+state.locations[slot].name+'.');
 return true;
}

const lostRetrieval = new Map([
 ['Light:1102',{cost:1,names:['han solo']}], ['Light:1500',{cost:1,names:['leia organa']}],
 ['Light:1600',{cost:1,names:['luke skywalker']}], ['Light:2105',{cost:1,names:['obi-wan kenobi']}],
 ['Dark:2528',{cost:2,names:['darth vader','grand moff tarkin','admiral motti','general tagge']}]
]);

function retrievalOptions(side){
 const {hand,force,lost}=PremiereGame.zones(state,side);
 return (hand??[]).flatMap((card,index)=>{
  const rule=lostRetrieval.get(card.id);
  if(!rule||card.side!==side||force.length<rule.cost)return [];
  return lost.flatMap((target,slot)=>rule.names.includes(locationTitle(target))?
   [{index,slot,card,target,cost:rule.cost}]:[]);
 });
}

function playRetrieval(side,index,slot){
 const choice=retrievalOptions(side).find(x=>x.index===index&&x.slot===slot);
 if(!choice)return false;
 const {hand,force,used,lost}=PremiereGame.zones(state,side);
 const [interrupt]=hand.splice(index,1);
 PremiereGame.moveTop(force,used,choice.cost);
 const retrieved=PremiereGame.retrieveCard(state,side,slot);
 lost.push(interrupt);
 log(side+' spielt '+interrupt.name+' und holt '+retrieved.name+' in die Used Pile.');
 return true;
}

function checkDeployment(card,site){
 return boardDeployCost(card,site,'Light')!==null;
}



function deployBoardCardFor(side,handIndex,siteIndex){
 if(!state||state.phase!==2||(state.activeSide&&state.activeSide!==side)||state.gameWinner||state.pendingForceLoss||battleSession)return null;
 const light=side==='Light',hand=light?state.hand:state.botHand;
 const card=hand[handIndex],loc=state.locations[siteIndex],cost=boardDeployCost(card,loc,side);
 if(cost===null)return null;
 const force=light?state.force:state.botForce,used=light?state.used:state.botUsed,rows=light?state.light:state.dark;
 hand.splice(handIndex,1);
 PremiereGame.moveTop(force,used,cost);
 if(jawaCosts.has(card.id)){
  const {opposing}=jawaDeployPayment(card,loc,side);
  if(opposing){
   const rival=PremiereGame.otherSide(side),piles=PremiereGame.zones(state,rival);
   PremiereGame.moveTop(piles.force,piles.used,opposing);
   log(rival+' bezahlt '+opposing+' Force für den Jawa-Deploy.');
  }
 }
 rows[siteIndex].push(card);
 if(card.owner||card.side)card.controller=side;
 (state.deployedThisTurn??=[]).push(card);
 return {card,loc,cost};
}

function deployPilotOptions(side,handIndex,slot){
 const {hand,force}=PremiereGame.zones(state,side),ship=hand?.[handIndex],loc=state.locations[slot];
 if(ship?.type!=='Starship'||(ship.side&&ship.side!==side)||permanentPilotAbility(ship)!==null||
    !loc||!hasDeployPresence(side,loc)||!withinDeploymentLimit(ship,side))return [];
 return hand.flatMap((pilot,index)=>{
  if(index===handIndex||!pilot.pilot||!Number.isFinite(pilot.deploy)||(pilot.side&&pilot.side!==side)||!withinDeploymentLimit(pilot,side))return [];
  const cost=craftDeployCost(ship,loc,side,pilot);
  return cost!==null&&cost<=force.length?[{pilot,index,cost,ship}]:[];
 });
}

function deployWithPilot(side,index,slot,pilotIndex){
 const option=deployPilotOptions(side,index,slot).find(item=>item.index===pilotIndex);
 if(!option)return false;
 const {hand,force,used,board}=PremiereGame.zones(state,side);
 for(const i of [index,pilotIndex].sort((a,b)=>b-a))hand.splice(i,1);
 PremiereGame.moveTop(force,used,option.cost);
 option.ship.controller=side;
 PremiereUnits.add(option.ship,option.pilot,'pilot',side);
 board[slot].push(option.ship);
 (state.deployedThisTurn??=[]).push(option.ship,option.pilot);
 const loc=state.locations[slot];
 log(side+' setzt '+option.ship.name+' mit '+option.pilot.name+' bei '+loc.name+' ein ('+option.cost+' Force).');
 return {card:option.ship,loc,cost:option.cost};
}

function botDeployPhase(){
 if(!state||state.phase!==2||state.activeSide!=='Dark'||!state.botTurn)return [];
 const actions=[],maxActions=state.botHand.length;
 for(let k=0;k<maxActions;k++){
  const available=legalActions(state,'Dark'),own=PremiereGame.zones(state,'Dark');
  const conversion=available.find(action=>action.kind==='convertLocation');
  if(conversion){
   if(!performAction(conversion))break;
   actions.push('konvertiert '+conversion.card.name);continue;
  }
  const location=available.filter(x=>x.kind==='deployLocation').sort((a,b)=>a.args[0]-b.args[0]||b.args[1]-a.args[1])[0];
  if(location){
   const name=own.hand[location.args[0]].name;
   if(!performAction(location))break;
   actions.push('Location '+name);continue;
  }
  const weapon=available.filter(x=>x.kind==='equip'&&!x.host.weapons?.length)
   .sort((a,b)=>Number(b.contested)-Number(a.contested)||a.cost-b.cost)[0];
  if(weapon){
   const name=own.hand[weapon.args[0]].name;
   if(!performAction(weapon))break;
   actions.push(weapon.host.name+' erhält '+name+' ('+weapon.cost+' Force)');continue;
  }
  const device=available.find(x=>x.kind==='deployDevice');
  if(device){
   if(!performAction(device))break;
   actions.push(device.host.name+' erhält '+device.card.name);continue;
  }
  const option=available.find(x=>x.kind==='deployWithPilot')??available.find(x=>x.kind==='deploy');
  if(!option)break;
  const deployed=performAction(option);
  if(!deployed)break;
  const label=deployed.card.type==='Vehicle'?'Fahrzeug':deployed.card.type==='Starship'?'Raumschiff':'Charakter';
  actions.push(label+' '+deployed.card.name+' bei '+deployed.loc.name+' ('+deployed.cost+' Force)');
 }
 return actions;
}

function botSay(message){state.botReason=message;state.botHistory.unshift('Runde '+state.turn+': '+message);state.botHistory=state.botHistory.slice(0,20);log(message)}

function botPlan(){return ['activate','control','deploy','battle','move','draw','finish'].map(kind=>({kind}))}

function botBegin(){state.botTurn={steps:botPlan(),index:0};botSay('Dark Side beginnt ihren sichtbaren Lernzug. Klicke auf „Nächste Bot-Aktion zeigen“.')}

function botNextStep(){
 if(!state?.botTurn||state.gameWinner)return false;
 const window=PremiereGame.responseWindow(state.game);
 if(window||state.game?.timing.pending)return performAction(legalActions(state,'Dark')[0]);
 if(state.pendingForceLoss||battleSession)return false;
 const deferred=state.botTurn.decision;
 const action=deferred?{kind:deferred}:state.botTurn.steps[state.botTurn.index];
 if(!deferred&&action?.kind==='deploy'&&state.phase===1&&botDrain())return true;
 if(!action||!requestAction(deferred?'botDecision':'botStep','Dark',[action.kind]))return false;
 if(state.game?.timing.pending)return true;
 const available=legalActions(state,'Dark');
 if(action.kind==='move'){
  const choice=available.filter(x=>x.kind==='move').sort((a,b)=>botMoveScore(b)-botMoveScore(a))[0];
  if(!choice||botMoveScore(choice)<=0)botSay('Move: Bot passt, keine vorteilhafte legale Bewegung mit 1 Force.');
  else if(performAction(choice))botSay('Move: Bot bewegt '+choice.name+' für '+choice.cost+' Force zu '+state.locations[choice.to].name+' ('+choice.movementKind+').');
 }else if(action.kind==='battle'){
  const choices=available.filter(x=>x.kind==='battle');
  choices.sort((a,b)=>{const x=battleTotals(a.args[0]),y=battleTotals(b.args[0]);return (y.darkPower-y.lightPower)-(x.darkPower-x.lightPower)});
  if(choices.length&&performAction(choices[0])){
   botSay('Battle: Bot initiiert einen Kampf bei '+state.locations[choices[0].args[0]].name+' für 1 Force. Dark Side hat die erste Aktion in jedem Kampfsegment.');
   botDestinyDecision();
  }else botSay('Battle: Kein legaler Kampf mit Presence beider Seiten und 1 Force verfügbar.');
 }else if(action.kind==='draw'){
  const choice=available.find(x=>x.kind==='draw');
  const drawn=choice&&performAction(choice)?1:0;
  botSay('Draw Phase: Bot zieht '+drawn+' Karte aus seiner Force Pile. Seine Hand enthält jetzt '+state.botHand.length+' Karten.');
 }else if(action.kind==='activate'){
  const choice=available.filter(x=>x.kind==='activate').at(-1);
  if(choice&&performAction(choice))botSay('Activate: Bot aktiviert '+choice.args[0]+' Force. Jetzt verfügbar: '+state.botForce.length+'.');
 }else if(action.kind==='control'){
  const retrieval=available.find(option=>option.kind==='retrieve');
  if(retrieval)performAction(retrieval);
  if(!botDrain())botSay('Control: Keine weitere Location erlaubt einen Force Drain.');
 }else if(action.kind==='deploy'){
  const actions=botDeployPhase();
  botSay(actions.length?'Deploy: '+actions.join('; ')+'.':'Deploy: Bot passt; keine legale bezahlbare Karte.');
 }
 publishGame();
 return true;
}
function botDrain(){
 const choice=legalActions(state,'Dark').filter(x=>x.kind==='drain').sort((a,b)=>b.amount-a.amount)[0];
 if(!choice||!performAction(choice))return false;
 botSay('Control: Dark Side sagt Force Drain bei '+state.locations[choice.args[0]].name+' an.');
 publishGame();
 return true;
}
function endTurn(side){
 checkpoint('phase:end',()=>checkpoint('turn:end',()=>{
  recirculateBoth();
  PremiereGame.resetTurn(state,PremiereGame.otherSide(side));
  if(side==='Light')botBegin();
  else {state.turn++;state.botTurn=null;botSay('Bot beendet seinen Lernzug. Light Side beginnt mit Activate.');}
  checkpoint('turn:start',()=>checkpoint('phase:start',()=>{}));
 }));
}
function checkpoint(event,next){return PremiereGame.checkpoint(state.game,event,state.activeSide,next)}
function changePhase(phase){
 if(phase===state.phase)return;
 checkpoint('phase:end',()=>{
  PremiereGame.setPhase(state,phase);
  checkpoint('phase:start',()=>{});
 });
}
function advance(){
 if(!state||state.gameWinner||state.pendingForceLoss||battleSession||state.botTurn||
    (state.phase===0&&!state.activated))return false;
 if(state.phase===5)endTurn('Light');
 else changePhase(state.phase+1);
 return true;
}
function advanceBotStep(kind){
 const steps={activate:0,control:1,deploy:2,battle:3,move:4,draw:5,finish:5};
 state.botTurn.index++;
 if(kind==='finish')endTurn('Dark');
 else {
  changePhase(steps[kind]);
  if(state.game?.timing.pending)state.botTurn.decision=kind;
 }
 return true;
}

function battleTotals(i){
 const ability=cards=>{const a=cards.map(card=>card.type==='Starship'?craftStats(card,i).ability:cardAbility(card)),known=a.reduce((n,v)=>n+(Number.isFinite(v)?v:0),0);return a.some(v=>v===null)&&known<4?null:known};
 const cards=side=>PremiereLocations.presentCards(state,side,i).filter(card=>card.type!=='Weapon'&&card.type!=='Device'&&
  PremiereUnits.active(card)&&(!battleSession?.segmented||battleSession.site!==i||battleSession.participants[side].includes(card)));
 const power=(cards,side)=>{
  const slot=state.locations[i],printed=PremiereLocations.printedSide(state,i,side);
  const alone=cards.length===1&&((slot?.id==='Light:2855'&&printed==='Light'&&cards[0].subType==='Rebel')||
   (slot?.id==='Dark:2854'&&printed==='Dark'&&cards[0].subType==='Imperial'));
  return cards.reduce((n,c)=>n+(['Starship','Vehicle'].includes(c.type)?craftStats(c,i).power:(c.power??0))+cardPowerModifier(c,side,i),alone?2:0);
 };
 const light=cards('Light'),dark=cards('Dark');
 return {lightPower:power(light,'Light'),darkPower:power(dark,'Dark'),lightAbility:ability(light),darkAbility:ability(dark)};
}

function battleCandidates(side,slot){
 const {board}=PremiereGame.zones(state,side);
 function units(card){
  if(!PremiereUnits.active(card)||card.excludedFromBattle||card.cannotBattle)return [];
  return [card,...(card.occupants??[]).filter(entry=>!['cargo','hangar'].includes(entry.role)).flatMap(entry=>units(entry.card))];
 }
 return (board?.[slot]??[]).flatMap(units);
}

function battlePresence(side,slot){
 const x=battleSession;
 const candidates=battleCandidates(side,slot).filter(card=>!state.battledCardsThisTurn?.includes(card)||
  (x?.site===slot&&x.participants?.[side].includes(card)));
 return candidates.some(card=>card.presence===true)||candidates.reduce((sum,card)=>sum+(cardAbility(card)??0),0)>=1;
}

function refreshBattleParticipants(){
 const x=battleSession;
 if(!x?.segmented)return;
 for(const side of PremiereGame.sides){
  const entries=battleCandidates(side,x.site).filter(card=>x.participants[side].includes(card)||!state.battledCardsThisTurn?.includes(card));
  for(const card of entries)if(!state.battledCardsThisTurn?.includes(card))(state.battledCardsThisTurn??=[]).push(card);
  x.participants[side]=entries;
 }
}

function canInitiateBattleFor(side,i){
 if(!state||state.phase!==3||state.activeSide!==side||state.gameWinner||state.pendingForceLoss||battleSession)return false;
 if(side==='Light'?!!state.botTurn:!state.botTurn)return false;
 const force=side==='Light'?state.force:state.botForce;
 if(!Number.isInteger(i)||i<0||!state.locations?.[i]||!force?.length)return false;
 if(state.battledSitesThisTurn?.includes(i))return false;
 return battlePresence('Light',i)&&battlePresence('Dark',i);
}

function canInitiateBattle(i){return canInitiateBattleFor('Light',i)}

function initiateBattleFor(side,i){
 if(!canInitiateBattleFor(side,i))return false;
 const force=side==='Light'?state.force:state.botForce,used=side==='Light'?state.used:state.botUsed;
 PremiereGame.moveTop(force,used);
 if(!state.battledSitesThisTurn)state.battledSitesThisTurn=[];
 state.battledSitesThisTurn.push(i);
 battleSession={site:i,initiator:side,lightDestiny:null,darkDestiny:null,lightCard:null,darkCard:null,lightLoss:[],darkLoss:[],weaponHits:{Light:[],Dark:[]},resolved:false,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,botForfeitsPending:true};
 if(state.game){
  Object.assign(battleSession,{segmented:true,segment:'initiation',participants:{Light:[],Dark:[]},
   extraDraws:{Light:0,Dark:0},powerDestiny:{Light:0,Dark:0},attritionDestiny:{Light:0,Dark:0},
   battleDrawSucceeded:{Light:false,Dark:false}});
  refreshBattleParticipants();
 }
 log(side+' initiiert Battle bei '+state.locations[i].name+' (1 Force → Used Pile).');
 if(!openReactWindow('battle',side,i))enterBattleSegments();
 publishGame();return true;
}
function enterBattleSegments(){
 checkpoint('battle:start',()=>{
  refreshBattleParticipants();
  const x=battleSession;
  if(x.segmented)x.segment='weapons';
  if(battleWeaponOptions('Light').length||battleWeaponOptions('Dark').length||
     (x.segmented&&PremiereGame.sides.some(side=>battleEffectOptions(side).length)))x.weaponTurn=x.initiator;
  else if(x.segmented)x.segment='power';
 });
}
function endBattleTiming(){checkpoint('battle:end',()=>PremiereGame.expire(state.game,'battle'))}

function battleAnalysis(i){return initiateBattleFor('Light',i)}
// Printed Premiere site requirements may raise the destiny threshold for one side.

function minimumBattleDestinyAbility(side,siteIndex){
 if(side!=='Light'&&side!=='Dark')return null;
 const loc=state?.locations?.[siteIndex];
 if(!loc||!isLoc(loc))return 4;
 for(const clause of String(loc.gametext||'').matchAll(/(?:^|[.!?]\s+)(Light|Dark):\s*Total ability of (\d+) or more required for you to draw battle destiny here(?:[.!?]|$)/gi)){
  if(clause[1].toLowerCase()===PremiereLocations.printedSide(state,siteIndex,side).toLowerCase())return Number(clause[2]);
 }
 return 4;
}
// This bonus applies to each actual Dark Side battle destiny draw; not weapon destiny or skips.

function printedBattleDestinyBonus(side,siteIndex){
 if(side!=='Dark')return 0;
 const units=battleSession?.segmented?activeBattleUnits(side):state?.dark?.[siteIndex]??[];
 return units.some(c=>c?.id==='Dark:634'&&
  /When in battle, adds 1 to each of your battle destiny draws/i.test(c.gametext||''))?1:0;
}

function printedBattleDestiny(card){
 return card&&isLoc(card)?0:PremiereBattle.printedDestiny(card);
}
// Two printed Premiere War Room effects grant an additional battle destiny
// to the side that initiated battle here. These are actual Reserve Deck draws.

function printedWarRoomExtraBattleDestiny(side,siteIndex){
 const x=battleSession,loc=state?.locations?.[siteIndex];
 if(!x||x.initiator!==side||!isSite(loc))return 0;
 if(!['Dark:682','Light:2859'].includes(loc.id))return 0;
 const text=String(loc.gametext||'');
 const printed=PremiereLocations.printedSide(state,siteIndex,side);
 const pattern=new RegExp('(?:^|[.!?]\\s+)'+printed+':\\s*If you initiate a battle here, add one battle destiny(?:[.!?]|$)','i');
 return pattern.test(text)?1:0;
}

function battleEffectOptions(side){
 const x=battleSession;
 if(!x?.segmented||x.segment!=='weapons')return [];
 const own=x.participants[side].filter(card=>battleCandidates(side,x.site).includes(card));
 const names=new Set(own.map(locationTitle));
 const {hand}=PremiereGame.zones(state,side);
 const eligible=new Map([
  ['Light:758',names.has('luke skywalker')&&names.has('han solo')],
  ['Light:2277',names.has('luke skywalker')&&names.has('leia organa')],
  ['Light:1039',names.has('luke skywalker')&&names.has('obi-wan kenobi')],
  ['Dark:613',names.has('grand moff tarkin')&&(names.has('admiral motti')||names.has('general tagge'))]
 ]);
 const options=(hand??[]).flatMap((card,index)=>eligible.get(card.id)?[{args:[index],card,label:card.name+' · zwei Battle Destiny hinzufügen'}]:[]);
 const hit=x.lastHit;
 if(hit&&own.some(card=>card.id==='Dark:768'&&card!==hit.card&&PremiereLocations.present(state,card,x.site))&&
  hit.card.type==='Character'&&PremiereLocations.present(state,hit.card,x.site)){
  options.push({args:[-1],card:hit.card,label:'Dr. Evazan operiert '+hit.card.name});
 }
 return options;
}

function playBattleEffect(side,index){
 const option=battleEffectOptions(side).find(effect=>effect.args[0]===index),x=battleSession;
 if(!option||x.weaponTurn!==side)return false;
 if(index<0){
  const hit=x.lastHit,{board}=PremiereGame.zones(state,hit.side),row=board[x.site];
  const target=row.indexOf(hit.card);
  if(target<0)return false;
  removeBattleUnit(hit.side,hit.card);
  x.weaponHits[hit.side]=(x.weaponHits[hit.side]??[]).filter(i=>i!==target).map(i=>i>target?i-1:i);
  x.lastHit=null;
  log('Dr. Evazan operiert '+hit.card.name+'. Die Karte geht verloren.');
  finishWeaponAction(side,false);
  return true;
 }
 const {hand}=PremiereGame.zones(state,side);
 hand.splice(index,1);
 const frame={kind:'interrupt',interrupt:'battleEffect',site:x.site,side,card:option.card};
 if(interruptResponses(PremiereGame.otherSide(side),frame).length)PremiereGame.openResponse(state.game,frame);
 else settleBattleEffect(frame);
 return true;
}

function settleBattleEffect(frame){
 PremiereGame.zones(state,frame.side).lost.push(frame.card);
 if(!frame.cancelled){
  scheduleBattleDestiny(frame.side,'battle',2);
  log(frame.card.name+' fügt zwei Battle Destiny hinzu.');
 }
 battleSession.lastHit=null;
 finishWeaponAction(frame.side,false);
}

function scheduleBattleDestiny(side,purpose,count){
 if(purpose==='battle')battleSession.extraDraws[side]+=count;
 else (battleSession.additionalDestinies??=[]).push({side,purpose,count});
}

function battleDestinyDrawCount(side,siteIndex,ability){
 if(!Number.isFinite(ability))return null; // Unknown ability cannot justify an assumed draw.
 const required=minimumBattleDestinyAbility(side,siteIndex);
 const own=PremiereGame.zones(state,side).board?.[siteIndex]??[];
 const matching=new Map([['Light:2060','Light:239'],['Light:1045','Light:799'],['Light:1677','Light:1098'],['Light:1050','Light:1924'],['Light:2057','Light:2067'],['Dark:247','Dark:790'],['Dark:249','Dark:791']]);
 const backup=own.some(ship=>craftStats(ship,siteIndex).powered&&ship.occupants?.some(entry=>entry.role==='pilot'&&
  entry.card.id===matching.get(ship.id)&&PremiereUnits.active(entry.card)));
 const regular=ability>=required||backup?1:0;
 return regular+printedWarRoomExtraBattleDestiny(side,siteIndex)+(battleSession?.extraDraws?.[side]??0);
}

function drawDestinySeries(side,kind,count,modifier,complete){
 const piles=PremiereGame.zones(state,side),game=state.game,draws=[];
 function next(replacement=false){
  if(!replacement&&count--<=0){complete(draws);return;}
  const draw=PremiereBattle.draw(piles,modifier);
  if(!draw){complete(draws);return;}
  const finish=frame=>{
   draws.push(PremiereBattle.settle(piles,frame.draw));
   next(frame.redraw);
  };
  const frame={kind:'destiny',purpose:kind,side,draw,site:battleSession?.site,finish};
  if(game&&battleSession?.segmented&&PremiereGame.sides.some(actor=>destinyResponses(actor,frame).length)){
   PremiereGame.openResponse(game,frame);
   return;
  }
  finish(frame);
 }
 next();
}

function destinyResponses(side,frame){
 const x=battleSession;
 if(!x?.segmented||frame.draw.cancelled)return [];
 const {force}=PremiereGame.zones(state,side);
 const members=x.participants[side].filter(card=>battleCandidates(side,x.site).includes(card));
 const offers=[];
 if(side===frame.side&&force.length&&members.some(card=>card.id==='Light:1098')&&
    !PremiereGame.wasUsed(state.game,'battle','hanRedraw')){
  offers.push({kind:'hanRedraw',label:'Han Solo: Destiny neu ziehen (1 Force)'});
 }
 if(side!==frame.side&&members.some(card=>card.id==='Dark:1061')&&members.some(card=>card.id==='Dark:634')&&
    !PremiereGame.wasUsed(state.game,'battle','tarkinCancel')){
  offers.push({kind:'tarkinCancel',label:'Tarkin: gegnerisches Destiny aufheben'});
 }
 return offers;
}

function answerDestiny(side,kind){
 const game=state.game,frame=PremiereGame.responseWindow(game);
 if(!frame||frame.kind!=='destiny'||frame.priority!==side||!destinyResponses(side,frame).some(answer=>answer.kind===kind))return false;
 PremiereGame.useOnce(game,'battle',kind);
 if(kind==='hanRedraw'){
  const {force,used}=PremiereGame.zones(state,side);
  PremiereGame.moveTop(force,used);
  frame.redraw=true;
 }
 frame.draw.cancelled=true;
 frame.priority=PremiereGame.otherSide(side);
 frame.passes=0;
 log(side+(frame.redraw?' zieht Destiny mit Han Solo neu.':' hebt Destiny mit Tarkin auf.'));
 return true;
}

function battleDestiny(side){
 if(!battleSession||battleSession.weaponTurn||state.phase!==3)return;
 const x=battleSession,t=battleTotals(x.site),light=side==='Light',key=light?'lightCard':'darkCard',val=light?'lightDestiny':'darkDestiny';
 if(x[key]!==null)return;
 const first=x.initiator==='Dark'?'Dark':'Light';if(side!==first&&x[first==='Dark'?'darkCard':'lightCard']===null){log('Zuerst entscheidet die initiierende Seite über Battle Destiny.');return}
 const ability=light?t.lightAbility:t.darkAbility,count=battleDestinyDrawCount(side,x.site,ability);
 if(count===null||count<1){log(side+' darf keine Battle Destiny ziehen (Ability '+(ability??'?')+', Mindestwert '+minimumBattleDestinyAbility(side,x.site)+').');return}
 const vaderBonus=printedBattleDestinyBonus(side,x.site);
 const alderaanPenalty=state.locations[x.site]?.id==='Light:80'&&PremiereLocations.printedSide(state,x.site,side)==='Dark'?1:0;
 drawDestinySeries(side,'battle',count,vaderBonus-alderaanPenalty,draws=>{
  if(draws.length&&vaderBonus)log('Darth Vader erhöht jeden Dark-Side-Battle-Destiny-Draw um +'+vaderBonus+'.');
  if(draws.length&&alderaanPenalty)log('Alderaan reduziert den Battle-Destiny-Draw von '+side+' um 1 (Minimum 0).');
  if(!light&&t.darkPower<t.lightPower&&draws.some(draw=>!draw.cancelled&&draw.card.id==='Dark:816'&&/total power present is doubled/i.test(draw.card.gametext||''))){
   x.darkPowerDoubled=true;
   log('EG-6 als Battle Destiny gezogen: Dark-Power present ist niedriger als Light; Dark-Power present einmalig verdoppelt.');
  }
  x[key]=draws[0]?.card||{name:'Reserve Deck leer'};
  x[val]=PremiereBattle.total(draws);
  if(x.segmented){
   (x.drawCounts??={})[side]=draws.filter(draw=>!draw.cancelled&&Number.isFinite(draw.value)).length;
   x.battleDrawSucceeded[side]=x.drawCounts[side]>0;
  }
  x[light?'lightDrawCards':'darkDrawCards']=draws.map(draw=>({name:draw.card.name,value:draw.cancelled?0:draw.value}));
  log(side+' Battle Destiny: '+draws.map(draw=>draw.card.name+' '+(draw.cancelled?'(aufgehoben)':draw.value??'UNBEKANNT')).join(', ')
   +' · Gesamt '+(x[val]??'UNBEKANNT')+'.');
  finishPowerDecision();
 });
}
function skipDestiny(side){
 if(!battleSession||battleSession.weaponTurn||state.phase!==3)return;
 const x=battleSession,first=x.initiator==='Dark'?'Dark':'Light',key=side==='Light'?'lightCard':'darkCard',val=side==='Light'?'lightDestiny':'darkDestiny';
 if((side!==first&&x[first==='Dark'?'darkCard':'lightCard']===null)||x[key]!==null)return;
 x[key]={name:'Freiwillig verzichtet'};x[val]=0;
 log(side+' verzichtet auf Battle Destiny.');
 finishPowerDecision();
}
function finishPowerDecision(){
 if(battleSession.segmented)settlePowerSegment();
 else maybePlanBotForfeits();
 publishGame();
}

function settlePowerSegment(){
 const x=battleSession;
 if(x.lightCard===null||x.darkCard===null)return;
 const next=x.additionalDestinies?.shift();
 if(next){
  drawDestinySeries(next.side,next.purpose,next.count,0,draws=>{
   x[next.purpose+'Destiny'][next.side]+=PremiereBattle.total(draws)??0;
   settlePowerSegment();
  });
  return;
 }
 if(x.drawCounts?.Light===1&&x.drawCounts.Dark===1&&x.lightDestiny>x.darkDestiny&&
    activeBattleUnits('Light').some(card=>card.id==='Light:1407')){
  x.darkDestiny=0;
  log("Kal'Falnl C'ndros setzt Dark Battle Destiny auf 0.");
 }
 prepareDamageSegment();
}

function botDestinyDecision(){
 const available=legalActions(state,'Dark');
 return performAction(available.find(x=>x.kind==='destiny')??available.find(x=>x.kind==='skipDestiny'));
}
// Only Dark Side casualties are controlled by the bot. Human Light forfeits remain manual.

function botChooseForfeits(){
 const x=battleSession;
 if(!x||!state?.dark?.[x.site]||x.lightCard===null||x.darkCard===null)return false;
 const cards=state.dark[x.site],original=x.darkLoss||[];
 let best=null;
 function consider(indices){
  x.darkLoss=indices;
  const plan=battleForfeitPlan('Dark');
  if(!plan.valid)return;
  const score=plan.remainingDamage*2+indices.reduce((n,i)=>n+2+Math.max(0,Number(cards[i].power)||0)*2+Math.max(0,cardAbility(cards[i])||0),0);
  if(!best||score<best.score||(score===best.score&&indices.length<best.indices.length))best={score,indices:indices.slice()};
 }
 if(cards.length<=12){
  for(let mask=0;mask<(1<<cards.length);mask++){
   const indices=[];for(let i=0;i<cards.length;i++)if(mask&(1<<i))indices.push(i);
   consider(indices);
  }
 }else{
  // Bounded fallback for large groups; never invent unknown forfeit values.
  const order=cards.map((card,i)=>i).sort((a,b)=>(Math.max(0,Number(cards[b].forfeit)||0)/(2+Math.max(0,Number(cards[b].power)||0)))-(Math.max(0,Number(cards[a].forfeit)||0)/(2+Math.max(0,Number(cards[a].power)||0))));
  let indices=[];consider(indices);
  for(const i of order){indices=indices.concat(i);consider(indices);if(best)break}
 }
 x.darkLoss=best?best.indices:original;
 if(!best){log('Bot-Forfeit blockiert: unbekannte oder nicht regelkonform auflösbare Werte. Manuelle Prüfung erforderlich.');return false}
 x.botForfeitsPending=false;
 log('Dark Bot wählt '+best.indices.length+' Forfeit(s); verbleibender Battle Damage wird aus Hand/Life Force bezahlt.');
 return true;
}

function maybePlanBotForfeits(){
 if(battleSession?.botForfeitsPending&&battleSession.lightCard!==null&&battleSession.darkCard!==null)botChooseForfeits();
}

function setBattleModifier(side,kind,value){const x=battleSession;if(!x||state.phase!==3||(x.segmented&&(!state.trainingBattle||x.segment==='damage')))return;const key=(side==='Light'?'light':'dark')+(kind==='power'?'PowerMod':'Bonus');const n=Number(value);if(!Number.isInteger(n)||n<0||n>20){log('Ungültiger Modifikator (0–20).');return}x[key]=n;log(side+' manueller '+(kind==='power'?'Power':'zusätzlicher Battle-Destiny')+'-Bonus '+n+' (Lernübung).');publishGame()}

function battleWeaponOptions(side){
 const x=battleSession;
 if(!x||x.resolved||state?.phase!==3||x.lightCard!==null||x.darkCard!==null)return [];
 const light=side==='Light',hosts=(light?state.light:state.dark)[x.site];
 const targets=(light?state.dark:state.light)[x.site],force=light?state.force:state.botForce;
 const options=[];
 hosts.forEach((host,hostIndex)=>{
  if(x.segmented&&(!x.participants[side].includes(host)||!PremiereUnits.active(host)))return;
  if(!x.segmented&&!PremiereUnits.usesMultipleWeapons(host)&&state.weaponUsersThisTurn?.includes(host))return;
  (host.weapons??[]).forEach((weapon,weaponIndex)=>{
   if(x.usedWeapons?.includes(weapon)||!PremiereUnits.canUseWeapon(state,host,weapon))return;
   const rule=basicWeaponRule(weapon);
   if(!rule||weapon.side!==side||force.length<rule.cost)return;
   targets.forEach((target,targetIndex)=>{
    const opponent=PremiereGame.otherSide(side);
    if(x.segmented&&(!x.participants[opponent].includes(target)||!PremiereUnits.active(target)))return;
    const defense=isBantha(target)?target.maneuver:target.type==='Character'?cardAbility(target):null;
    if(Number.isFinite(defense))options.push({host,hostIndex,weapon,weaponIndex,target,targetIndex,defense,...rule});
   });
  });
 });
 return options;
}

function finishWeaponAction(side,passed){
 const x=battleSession;
 const bothPassed=passed&&x.weaponPassed;
 x.weaponPassed=passed;
 x.weaponTurn=bothPassed?null:(side==='Light'?'Dark':'Light');
 if(bothPassed&&x.segmented)x.segment='power';
 publishGame();
}

function passBattleWeapons(side){
 if(!battleSession||battleSession.weaponTurn!==side||state?.phase!==3)return false;
 log(side+' passt im Waffen-Segment.');
 finishWeaponAction(side,true);
 return true;
}

function fireBattleWeapon(side,hostIndex,weaponIndex,targetIndex){
 if(!battleSession||battleSession.weaponTurn!==side)return false;
 const shot=battleWeaponOptions(side).find(x=>x.hostIndex===hostIndex&&x.weaponIndex===weaponIndex&&x.targetIndex===targetIndex);
 if(!shot)return false;
 const {force,used}=PremiereGame.zones(state,side);
 PremiereGame.moveTop(force,used,shot.cost);
 (state.weaponUsersThisTurn??=[]).push(shot.host);
 PremiereUnits.recordWeaponUse(state,shot.host,shot.weapon);
 (battleSession.usedWeapons??=[]).push(shot.weapon);
 battleSession.lastHit=null;
 drawDestinySeries(side,'weapon',1,shot.bonus,draws=>{
  const draw=draws.find(item=>!item.cancelled),total=PremiereBattle.total(draws);
  const hit=!!draw&&!draw.cancelled&&total!==null&&total>shot.defense;
  log(side+' feuert '+shot.weapon.name+' auf '+shot.target.name+' ('+shot.cost+' Force). Waffen-Destiny: '+(draw?draw.card.name+' · '+(total??'unbekannt'):'Reserve Deck leer')+' gegen Verteidigung '+shot.defense+' → '+(hit?'Treffer':'kein Treffer')+'.');
  if(hit){
   const opponent=PremiereGame.otherSide(side);
   recordBattleWeaponHit(opponent,targetIndex);
   battleSession.lastHit={side:opponent,card:shot.target};
  }
  finishWeaponAction(side,false);
 });
 return true;
}

function botWeaponAction(){
 if(battleSession?.weaponTurn!=='Dark')return null;
 const hitTargets=battleSession.weaponHits.Light;
 const available=legalActions(state,'Dark');
 const options=available.filter(x=>x.kind==='fireWeapon'&&!hitTargets.includes(x.targetIndex)&&state.botDeck.length);
 options.sort((a,b)=>(b.target.power??0)-(a.target.power??0)||a.defense-a.bonus-b.defense+b.bonus||a.cost-b.cost);
 const choice=options[0];
 return choice??available.find(x=>x.kind==='battleEffect')??available.find(x=>x.kind==='passWeapons');
}
function botWeaponDecision(){return performAction(botWeaponAction())}
// Hits still participate in combat. The damage segment requires them to be forfeited.

function recordBattleWeaponHit(side,index){
 const x=battleSession;
 if(!x||x.resolved||state?.phase!==3||!['Light','Dark'].includes(side))return false;
 const cards=side==='Light'?state.light[x.site]:state.dark[x.site];
 if(!cards||!Number.isInteger(index)||index<0||index>=cards.length)return false;
 x.weaponHits??={Light:[],Dark:[]};
 const hits=x.weaponHits[side]??=[];
 if(!hits.includes(index))hits.push(index);
 const key=side==='Light'?'lightLoss':'darkLoss';
 if(!x[key].includes(index))x[key].push(index);
 x.botForfeitsPending=true;
 log(cards[index].name+' ist getroffen: verpflichtender Forfeit im Damage-Segment.');
 return true;
}

function toggleLoss(side,index){const x=battleSession;if(!x)return;const key=side==='Light'?'lightLoss':'darkLoss',list=x[key];if((x.weaponHits?.[side]||[]).includes(index)){log('Getroffene Karte muss forfeitet werden.');return;}x[key]=list.includes(index)?list.filter(i=>i!==index):[...list,index];if(side==='Dark')x.botForfeitsPending=false;publishGame()}

function battleAttritionAgainst(side){
 const x=battleSession;if(!x||!['Light','Dark'].includes(side))return null;
 const k=side==='Light'?'dark':'light',card=x[k+'Card'],destiny=x[k+'Destiny'];
 if(card===null||!Number.isFinite(destiny))return null;
 if(card?.name==='Freiwillig verzichtet'||card?.name==='Reserve Deck leer')return 0;
 return Math.max(0,destiny+(Number.isFinite(x[k+'Bonus'])?x[k+'Bonus']:0));
}

function printedAttritionImmunityBelow(c){
 // Only unconditional printed values; conditional / granted immunity remains unsupported.
 const m=String(c?.gametext||'').match(/(?:^|[.!?]\s+)(?:['"]diplomatic['"]\s+)?(?:immune|immunity)\s+to\s+attrition\s*<\s*(\d+)\s*(?=[.!?]|$)/i);
 return m?Number(m[1]):null;
}

function immuneToBattleAttrition(c,incoming){
 const below=printedAttritionImmunityBelow(c);
 return Number.isFinite(incoming)&&below!==null&&incoming<below;
}

function activeBattleUnits(side){
 const x=battleSession;
 return x.participants[side].filter(card=>battleCandidates(side,x.site).includes(card));
}

function battleImmunity(side,card){
 if(card.immunityCancelled)return 0;
 const x=battleSession,site=state.locations[x.site],rules=PremiereLocations.conditions(state,x.site,side);
 let limit=card.gameTextCancelled?0:printedAttritionImmunityBelow(card)??0;
 const members=activeBattleUnits(side);
 const pilots=(card.occupants??[]).filter(entry=>entry.role==='pilot'&&PremiereUnits.active(entry.card)).map(entry=>locationTitle(entry.card));
 if(!card.gameTextCancelled&&craftStats(card,x.site).powered){
  if(card.id==='Light:1677'&&pilots.some(name=>/^(han solo|chewbacca|lando calrissian)$/.test(name)))limit=Math.max(limit,5);
  if(card.id==='Dark:2700'&&pilots.includes('darth vader'))limit=Math.max(limit,4);
  if(PremiereUnits.capital(card)&&card.occupants?.some(entry=>entry.card.id==='Dark:1989'&&PremiereUnits.active(entry.card)))limit=Math.max(limit,3);
 }
 if(card.id==='Dark:12'&&rules.night)return Infinity;
 const printed=PremiereLocations.printedSide(state,x.site,side);
 if(members.length===1&&((site.id==='Light:2855'&&printed==='Light'&&card.subType==='Rebel')||
    (site.id==='Dark:2854'&&printed==='Dark'&&card.subType==='Imperial')))return Infinity;
 const attachments=card.attachments??[];
 if(attachments.some(effect=>effect.id==='Light:1810'))limit=Math.max(limit,5);
 if(site.locationTags?.includes('Planet')&&attachments.some(device=>device.id==='Dark:2357'))limit=Math.max(limit,3);
 const {board}=PremiereGame.zones(state,side);
 const mechanics=new Set(['Light:2785','Dark:2783']);
 if((card.type==='Vehicle'||isDroid(card))&&(board?.[x.site]??[]).some(unit=>mechanics.has(unit.id)&&PremiereUnits.active(unit)))limit=Math.max(limit,2);
 if(PremiereUnits.fighter(card)&&isPlanetSystem(site)&&state.locations.some((loc,slot)=>loc&&sitePlanet(loc)===locationGroup(site)&&
   PremiereLocations.conditions(state,slot,side).dockingBay&&(board?.[slot]??[]).some(unit=>mechanics.has(unit.id)&&PremiereUnits.active(unit))))limit=Math.max(limit,3);
 if(rules.night&&characterTraits(card).some(trait=>/rebel|alien/.test(trait))&&members.some(unit=>unit.id==='Light:2')&&
    PremiereLocations.effectsAt(state,x.site).some(effect=>effect.card.id==='Light:1196'))limit=Math.max(limit,3);
 return limit;
}

function battleForfeitValue(card,side){
 const base=card.battleForfeit??card.forfeit;
 if(!Number.isFinite(base))return null;
 const {site:slot}=battleSession,loc=state.locations[slot],printed=PremiereLocations.printedSide(state,slot,side);
 const traits=characterTraits(card),name=locationTitle(card);
 let modifier=card.battleForfeitModifier??0;
 if(loc.id==='Dark:2458'&&printed==='Dark'&&name==='tusken raider')modifier++;
 if(loc.id==='Dark:2454'&&printed==='Light'&&(name==='jawa'||traits.includes('jawa')))modifier--;
 if(isExteriorPlanetSite(loc)&&(name==='jawa'||traits.includes('jawa'))){
  for(const actor of PremiereGame.sides)modifier+=PremiereLocations.presentCards(state,actor,slot).filter(PremiereUnits.crawler).length;
 }
 for(const [index,location] of state.locations.entries()){
  const target=location?.id==='Dark:682'?(traits.includes('rebel trooper')||/\bY-Wing\b/i.test(card.subType??'')):
   location?.id==='Light:2859'?(traits.includes('stormtrooper')||PremiereUnits.tie(card)):false;
  if(!target)continue;
  const actor=location.id==='Dark:682'?'Dark':'Light';
  if(PremiereGame.sides.some(player=>PremiereLocations.printedSide(state,index,player)===actor&&
   PremiereLocations.control(state,player,index,cardAbility)===true&&
   PremiereLocations.presentCards(state,player,index).some(unit=>characterTraits(unit).includes('leader'))))modifier--;
 }
 return Math.max(0,base+modifier);
}

function prepareDamageSegment(){
 const x=battleSession;
 if(x.lightCard===null||x.darkCard===null)return;
 const result=battleDamagePreview();
 if(!result)return;
 const debt=Object.fromEntries(PremiereGame.sides.map(side=>{
  const key=side.toLowerCase(),{board}=PremiereGame.zones(state,side);
  const hits=(x.weaponHits[side]??[]).map(index=>board[x.site][index]).filter(Boolean);
  const attrition=result[key+'Attrition'],members=activeBattleUnits(side);
  const immunity=members.filter(card=>{
   if(card.immunityCancelled)return false;
   const inherited=members.filter(host=>PremiereUnits.enclosed(host)&&PremiereLocations.aboard(state,card,host));
   return [card,...inherited].some(unit=>battleImmunity(side,unit)>attrition);
  });
  return [side,{damage:result[key+'Damage'],attrition,hits,immunity}];
 }));
 x.segment='damage';
 x.damage={result,debt,priority:x.initiator,passes:0};
}

function battleDamageOptions(side){
 const x=battleSession,d=x.damage;
 if(d.priority!==side)return [];
 const debt=d.debt[side],units=activeBattleUnits(side);
 const actions=[];
 let requiredAttrition=false;
 for(const card of units){
  const value=battleForfeitValue(card,side),hit=debt.hits.includes(card);
  if(value===null)continue;
  const immune=debt.immunity.includes(card);
  if(debt.attrition>0&&!immune)requiredAttrition=true;
  if(hit||debt.damage>0||debt.attrition>0)actions.push({kind:'battleForfeit',args:[x.participants[side].indexOf(card)],card,value,hit});
 }
 const losses=debt.damage>0?PremiereGame.lossChoices(state,side):[];
 actions.push(...losses.map(option=>({kind:'battleForceLoss',...option})));
 const mustPay=actions.some(option=>option.hit)||requiredAttrition||(debt.damage>0&&actions.length>0);
 if(!mustPay)actions.push({kind:'passDamage',args:[]});
 return actions;
}

function removeBattleUnit(side,card){
 const slot=battleSession.site,{board}=PremiereGame.zones(state,side);
 function detach(row){
  const index=row.findIndex(entry=>(entry.card??entry)===card);
  if(index>=0){row.splice(index,1);return true;}
  return row.some(entry=>{const unit=entry.card??entry;return unit.occupants?.length&&detach(unit.occupants);});
 }
 if(!detach(board[slot]))return false;
 PremiereUnits.remove(card,unit=>{
  const owner=unit.owner??unit.side??side;
  PremiereGame.zones(state,owner).lost.push(unit);
 },passenger=>{
  const controller=passenger.controller??side;
  PremiereGame.zones(state,controller).board[slot].push(passenger);
  log(passenger.name+' steigt vom verlorenen Bantha ab.');
 });
 return true;
}

function stopBattleWithoutPresence(){
 const x=battleSession;
 if(!x?.segmented||!['weapons','power'].includes(x.segment)||PremiereGame.responseWindow(state.game))return;
 if(PremiereGame.sides.every(side=>battlePresence(side,x.site)))return;
 log('Battle endet vorzeitig, weil eine Seite keine teilnehmende Presence mehr hat.');
 battleSession=null;
 endBattleTiming();
}

function battleDamageAction(side,kind,args){
 const x=battleSession,d=x?.damage;
 if(!d)return false;
 const option=battleDamageOptions(side).find(item=>item.kind===kind&&item.args.length===args.length&&item.args.every((value,i)=>value===args[i]));
 if(!option)return false;
 const debt=d.debt[side];
 if(kind==='battleForfeit'){
  if(!removeBattleUnit(side,option.card))return false;
  PremiereBattle.forfeit(debt,option.value);
  debt.hits=debt.hits.filter(card=>activeBattleUnits(side).includes(card));
  log(side+' forfeitet '+option.card.name+' für '+option.value+'.');
 }else if(kind==='battleForceLoss'){
  const card=PremiereGame.loseForce(state,side,...args);
  if(!card)return false;
  debt.damage--;
  log(side+' verliert '+card.name+' für Battle Damage.');
 }
 d.passes=kind==='passDamage'?d.passes+1:0;
 d.priority=PremiereGame.otherSide(side);
 if(d.passes===2){
  log('Battle beendet: Light '+d.result.lightTotal+' / Dark '+d.result.darkTotal+' Power.');
  battleSession=null;
  endBattleTiming();
 }
 return true;
}

function botDamageAction(){
 const offers=legalActions(state,'Dark');
 const debt=battleSession?.damage?.debt.Dark;
 const forfeits=offers.filter(option=>option.kind==='battleForfeit');
 const vulnerable=debt?.attrition>0?forfeits.filter(option=>!debt.immunity.includes(option.card)):[];
 return forfeits.find(option=>option.hit)??offers.find(option=>option.kind==='passDamage')??
  vulnerable.sort((a,b)=>b.value-a.value)[0]??offers.find(option=>option.kind==='battleForceLoss')??forfeits[0];
}

function battleForfeitPlan(side){
 const x=battleSession,damage=battleDamagePreview();
 if(!x||!['Light','Dark'].includes(side)||!damage)return {valid:false,reason:'Destiny nicht abgeschlossen',sum:0};
 const cards=side==='Light'?state.light[x.site]:state.dark[x.site],indices=x[side==='Light'?'lightLoss':'darkLoss']||[];
 const incoming=battleAttritionAgainst(side),required=side==='Light'?damage.lightDamage:damage.darkDamage;
 if(incoming===null)return {valid:false,reason:'Attrition unbekannt',sum:0};
 if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=cards.length))return {valid:false,reason:'Ungültige Kartenauswahl',sum:0};
 if(indices.some(i=>!Number.isFinite(cards[i].forfeit)||cards[i].forfeit<0))return {valid:false,reason:'Forfeit-Wert unbekannt',sum:0};
 const mandatory=x.weaponHits?.[side]||[];
  if(mandatory.some(i=>!indices.includes(i)))return {valid:false,reason:'Getroffene Karten müssen forfeitet werden',sum:0};
  const sum=indices.reduce((n,i)=>n+cards[i].forfeit,0);
 const vulnerable=cards.map((c,i)=>immuneToBattleAttrition(c,incoming)?null:i).filter(i=>i!==null);
 const satisfiesAttrition=selection=>{
  const eligibleSelection=vulnerable.filter(i=>selection.includes(i));
  const eligibleForfeit=eligibleSelection.reduce((n,i)=>n+(Number.isFinite(cards[i].forfeit)?cards[i].forfeit:0),0);
  return eligibleForfeit>=incoming||eligibleSelection.length===vulnerable.length;
 };
 if(!satisfiesAttrition(indices))return {valid:false,reason:'Attrition erfordert weitere nicht-immune Forfeits',sum,incoming,required};
 // A selected card is unnecessary only if BOTH attrition and battle damage still remain covered without it.
 if(indices.some(i=>{
  const rest=indices.filter(j=>j!==i);
  return !mandatory.includes(i)&&satisfiesAttrition(rest)&&sum-cards[i].forfeit>=required;
 }))return {valid:false,reason:'Unnötiger freiwilliger Forfeit',sum,incoming,required};
 return {valid:true,reason:'Bereit',sum,incoming,required,remainingDamage:Math.max(0,required-sum)};
}

function battleDamagePreview(){
 if(!battleSession)return null;
 const x=battleSession,t=battleTotals(x.site);
 if(x.damage)return x.damage.result;
 if(!Number.isFinite(x.lightDestiny)||!Number.isFinite(x.darkDestiny))return null;
 const power={Light:(t.lightPower+x.lightPowerMod)*(x.lightPowerDoubled?2:1),Dark:(t.darkPower+x.darkPowerMod)*(x.darkPowerDoubled?2:1)};
 if(x.segmented){
  const destiny=Object.fromEntries(PremiereGame.sides.map(side=>{
   const key=side.toLowerCase();
   return [side,{battle:x[key+'Destiny'],power:x.powerDestiny[side]+x[key+'Bonus'],
    attrition:x.battleDrawSucceeded[side]?x.attritionDestiny[side]+x[key+'Bonus']:0}];
  }));
  return PremiereBattle.result(power,destiny);
 }
 const lightTotal=power.Light+x.lightDestiny+x.lightBonus,darkTotal=power.Dark+x.darkDestiny+x.darkBonus;
 return {lightTotal,darkTotal,lightDamage:Math.max(0,darkTotal-lightTotal),darkDamage:Math.max(0,lightTotal-darkTotal)};
}

function lossValue(side){const x=battleSession,cards=side==='Light'?state.light[x.site]:state.dark[x.site],indices=x[side==='Light'?'lightLoss':'darkLoss'];return {sum:indices.reduce((n,i)=>n+(cards[i]?.forfeit||0),0),unknown:indices.some(i=>!Number.isFinite(cards[i]?.forfeit)),count:indices.length}}

function resolveBattleLosses(){
 const x=battleSession;if(!x||x.resolved||x.weaponTurn||state.phase!==3||state.pendingForceLoss||state.gameWinner)return false;
 if(x.lightCard===null||x.darkCard===null)return false;
 const light=battleForfeitPlan('Light'),dark=battleForfeitPlan('Dark'),damage=battleDamagePreview();
 if(!light.valid||!dark.valid||!damage){log('Battle nicht abgeschlossen: '+(!light.valid?'Light '+light.reason+'; ':'')+(!dark.valid?'Dark '+dark.reason:''));publishGame();return false;}
 for(const side of ['Light','Dark']){
  const {board}=PremiereGame.zones(state,side),cards=board[x.site];
  for(const i of x[side==='Light'?'lightLoss':'darkLoss'].slice().sort((a,b)=>b-a)){
   const card=cards.splice(i,1)[0];
   PremiereUnits.remove(card,unit=>{
    const owner=unit.owner??unit.side??side;
    PremiereGame.zones(state,owner).lost.push(unit);
   },passenger=>{
    const controller=passenger.controller??side;
    PremiereGame.zones(state,controller).board[x.site].push(passenger);
    log(passenger.name+' steigt vom verlorenen Bantha ab.');
   });
   log(side+' forfeitet '+card.name+' (Forfeit '+card.forfeit+').');
  }
 }
 x.resolved=true;
 const loser=damage.lightDamage?'Light':damage.darkDamage?'Dark':null;
 const amount=loser==='Light'?light.remainingDamage:loser==='Dark'?dark.remainingDamage:0;
 log('Battle beendet: Power Light '+damage.lightTotal+', Dark '+damage.darkTotal+'. Light Attrition '+light.incoming+', Dark Attrition '+dark.incoming+'.');
 battleSession=null;
 if(loser&&amount>0){
  if(!beginForceLoss(loser,amount,{reason:'battleDamage',locationIndex:x.site}))endBattleTiming();
 }else endBattleTiming();
 checkLifeForceVictory();publishGame();return true;
}

function commitDemoLoss(){return resolveBattleLosses()}

function reactOptions(side, window){
 if(!window||window.cancelled||!['battle','drain'].includes(window.kind)||side===window.side)return [];
 const {board,force}=PremiereGame.zones(state,side);
 if(!force||!board)return [];
 return board.flatMap((row,from)=>row.flatMap((card,index)=>{
  if(state.reactedThisTurn?.includes(card)||(card.occupants??[]).some(entry=>state.reactedThisTurn?.includes(entry.card)))return [];
  const destination=state.locations[window.site];
  const dantooine=card.type==='Starship'&&destination?.id==='Dark:607'&&PremiereLocations.printedSide(state,window.site,side)==='Dark';
  if(!dantooine&&!['Light:2250','Dark:191','Light:1548','Dark:1547','Light:1609','Light:2307','Dark:2660'].includes(card.id))return [];
  return travelOptions(card,side,from,window.site,true).filter(option=>option.cost<=force.length)
   .map(option=>({from,index,card,cost:option.cost}));
 }));
}

function reactDeployOptions(side,window){
 if(!window||window.cancelled||!['battle','drain'].includes(window.kind)||side===window.side)return [];
 const {hand,board}=PremiereGame.zones(state,side),loc=state.locations[window.site];
 const sources=(board??[]).some((row,slot)=>(slot===window.site||adjacentSites(slot,window.site))&&
  PremiereLocations.presentCards(state,side,slot).some(card=>PremiereUnits.active(card)&&
   (card.id==='Light:593'||card.id==='Dark:489')));
 if(!loc||!sources)return [];
 return (hand??[]).flatMap((card,index)=>{
  if(state.cancelledReactTitles?.includes(locationTitle(card))||jawaCosts.has(card.id))return [];
  const cost=boardDeployCost(card,loc,side);
  const options=cost===null?[]:[{card,index,cost,pilotIndex:-1}];
  return options.concat(deployPilotOptions(side,index,window.site).map(pilot=>
   ({card,index,cost:pilot.cost,pilotIndex:pilot.index,pilot:pilot.pilot})));
 });
}

function openReactWindow(kind,side,site,bonus){
 if(!state.game)return false;
 const frame={kind,side,site,bonus};
 const opponent=PremiereGame.otherSide(side);
 if(!reactOptions(opponent,frame).length&&!reactDeployOptions(opponent,frame).length&&!interruptResponses(opponent,frame).length)return false;
 PremiereGame.openResponse(state.game,frame);
 return true;
}

function resolveResponsePass(side){
 const game=state.game;
 const frame=PremiereGame.passResponse(game,side);
 if(!frame||frame===true)return frame;
 if(frame.kind==='destiny'){
  frame.finish(frame);
  return true;
 }
 if(frame.kind==='interrupt'){
  const parent=PremiereGame.responseWindow(game);
  if(frame.interrupt==='battleEffect'){
   settleBattleEffect(frame);
  }else if(frame.interrupt==='assault'){
   PremiereGame.cancelResponse(game,parent);
   resolveAssault(frame,parent.side);
  }else{
   const {used}=PremiereGame.zones(state,frame.side);
   const complete=cancelled=>{
    used.push(frame.card);
    if(cancelled)PremiereGame.cancelResponse(game,parent);
    settleCancelledResponse(game);
   };
   if(parent.kind==='interrupt'&&['sense','alter'].includes(parent.interrupt))complete(true);
   else drawDestinySeries(frame.side,'interrupt',1,0,draws=>{
    const draw=draws.find(item=>!item.cancelled),destiny=draw?.value??null;
    const cancelled=destiny!==null&&destiny<frame.ability;
    log(frame.card.name+': Destiny '+(destiny??'–')+' gegen Ability '+frame.ability+(cancelled?' · Aktion aufgehoben.':' · Aktion bleibt bestehen.'));
    complete(cancelled);
   });
   return true;
  }
 }else if(frame.kind==='react'&&!frame.cancelled){
  const {board}=PremiereGame.zones(state,frame.side);
  const index=frame.deploy?-1:board[frame.from].indexOf(frame.card);
  if(frame.deploy||index>=0){
   if(frame.deploy){
    frame.card.controller=frame.side;
    if(frame.pilot)PremiereUnits.add(frame.card,frame.pilot,'pilot',frame.side);
    board[frame.site].push(frame.card);
    (state.deployedThisTurn??=[]).push(frame.card);
   }else{
    board[frame.site].push(...board[frame.from].splice(index,1));
   }
   log(frame.side+' · '+frame.card.name+' reagiert bei '+state.locations[frame.site].name+'.');
   const parent=PremiereGame.responseWindow(game);
   if(parent.kind==='drain'&&confirmedPresence(frame.side,frame.site)===true){
    PremiereGame.cancelResponse(game,parent);
    log('Force Drain aufgehoben: Der React hat Presence an den Ort gebracht.');
   }
  }
 }else if(frame.kind==='drain'&&!frame.cancelled){
  resolveForceDrain(frame.side,frame.site,frame.bonus);
 }else if(frame.kind==='battle'){
  if(!frame.cancelled&&battlePresence('Light',frame.site)&&battlePresence('Dark',frame.site))enterBattleSegments();
  else {battleSession=null;PremiereGame.expire(game,'battle');}
 }
 settleCancelledResponse(game);
 return true;
}

function settleCancelledResponse(game){
 const cancelled=PremiereGame.removeCancelledResponse(game);
 if(cancelled?.kind==='interrupt'){
  if(cancelled.interrupt==='battleEffect')settleBattleEffect(cancelled);
  else PremiereGame.zones(state,cancelled.side).lost.push(cancelled.card);
  log(cancelled.card.name+' wurde aufgehoben und kommt in den Lost Pile.');
 }
 if(cancelled?.kind==='react'&&cancelled.deploy){
  const {lost}=PremiereGame.zones(state,cancelled.side);
  lost.push(cancelled.card);
  if(cancelled.pilot)lost.push(cancelled.pilot);
  (state.cancelledReactTitles??=[]).push(locationTitle(cancelled.card));
 }
}

function initiateReact(side,from,index){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=reactOptions(side,window).find(x=>x.from===from&&x.index===index);
 if(!option)return false;
 const {force,used}=PremiereGame.zones(state,side);
 if(!PremiereGame.answer(game,side,{kind:'react',site:window.site,from,card:option.card}))return false;
 PremiereGame.moveTop(force,used,option.cost);
 (state.reactedThisTurn??=[]).push(option.card,...(option.card.occupants??[]).map(entry=>entry.card));
 if(option.card.instanceId)PremiereGame.useOnce(game,'turn','react:'+option.card.instanceId);
 log(side+' initiiert einen React mit '+option.card.name+' für '+option.cost+' Force.');
 return true;
}

function initiateReactDeploy(side,index,pilotIndex){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=reactDeployOptions(side,window).find(choice=>choice.index===index&&choice.pilotIndex===pilotIndex);
 if(!option||!PremiereGame.answer(game,side,{kind:'react',deploy:true,site:window.site,card:option.card,pilot:option.pilot}))return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 for(const i of [index,pilotIndex].filter(i=>i>=0).sort((a,b)=>b-a))hand.splice(i,1);
 PremiereGame.moveTop(force,used,option.cost);
 (state.reactedThisTurn??=[]).push(option.card,...(option.pilot?[option.pilot]:[]));
 log(side+' kündigt '+option.card.name+' als Deploy-React an ('+option.cost+' Force).');
 return true;
}

function interruptResponses(side,window){
 if(!window||window.cancelled||side===window.side)return [];
 const {force,hand}=PremiereGame.zones(state,side);
 if(window.kind==='drain'){
  const id=side==='Light'?'Light:2385':'Dark:575';
  if(!force?.length)return [];
  return (hand??[]).flatMap((card,index)=>card.id===id?[{kind:'assault',card,index,cost:1}]:[]);
 }
 const kind=window.kind==='react'?'sense':window.kind==='interrupt'?window.interrupt==='sense'?'alter':'sense':null;
 if(!kind)return [];
 const ids=kind==='sense'?['Light:2217','Dark:2216']:['Light:95','Dark:94'];
 const requiresDestiny=window.kind==='react'||['assault','battleEffect'].includes(window.interrupt);
 const ability=requiresDestiny?Math.max(0,...PremiereLocations.activeCards(state,side)
  .filter(card=>card.type==='Character'&&!card.undercover).map(card=>cardAbility(card)??0)):0;
 if(requiresDestiny&&!ability)return [];
 return (hand??[]).flatMap((card,index)=>ids.includes(card.id)?[{kind,card,index,ability,cost:0}]:[]);
}

function initiateInterruptResponse(side,index){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=interruptResponses(side,window).find(response=>response.index===index);
 if(!option||!PremiereGame.answer(game,side,{kind:'interrupt',interrupt:option.kind,site:window.site,card:option.card,ability:option.ability}))return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 hand.splice(index,1);
 if(option.cost)PremiereGame.moveTop(force,used,option.cost);
 log(side+' antwortet mit '+option.card.name+'.');
 return true;
}

function resolveAssault(frame,opponent){
 const {lost}=PremiereGame.zones(state,frame.side);
 const targets=PremiereLocations.presentCards(state,opponent,frame.site).filter(card=>
  ['Character','Starship','Vehicle'].includes(card.type)&&!card.undercover);
 drawDestinySeries(frame.side,'assault',targets.length,0,draws=>{
  const total=PremiereBattle.total(draws);
  const power=targets.map(card=>card.power==null?null:
   (['Starship','Vehicle'].includes(card.type)?craftStats(card,frame.site).power:card.power)+cardPowerModifier(card,opponent,frame.site));
  lost.push(frame.card);
  if(total===null||power.some(value=>!Number.isFinite(value))){
   log(frame.card.name+' hebt den Drain auf. Ein benötigter Destiny- oder Power-Wert fehlt.');
   return;
  }
  const difference=total-power.reduce((sum,n)=>sum+n,0);
  log(frame.card.name+' hebt den Drain auf. Destiny: '+(draws.map(draw=>draw.card.name+' '+(draw.cancelled?'(aufgehoben)':draw.value)).join(', ')||'0')+'.');
  if(difference)beginForceLoss(difference<0?frame.side:opponent,Math.abs(difference),{reason:'assault',locationIndex:frame.site});
 });
}

function legalActions(position,side){
 if(!PremiereGame.sides.includes(side)||position!==state)return [];
 const offer=(kind,args,details)=>PremiereGame.offer(currentGame(),side,kind,args,details);
 if(!position){
  const setup=setupDecks;
  if(!setup)return [];
  if(setup.revealed)return side==='Light'?[offer(setup.revealed.collision?'retrySetup':'beginGame')]:[];
  const chooser=setup.darkChoice===undefined?'Dark':'Light';
  if(side!==chooser)return [];
  const choices=startingLocationChoices(side==='Dark'?setup.dark:setup.light);
  return choices.length?choices.map(x=>offer('chooseStart',[x.index],{card:x.card})):[offer('chooseStart',[null])];
 }
 if(position.gameWinner)return [];
 if(position.game?.timing.pending)return PremiereGame.triggerOptions(position.game,side)
  .map(effect=>offer('timingTrigger',[effect.id],{label:effect.label}));
 const window=PremiereGame.responseWindow(position.game);
 if(window){
  if(side!==window.priority)return [];
  if(window.kind==='destiny')return [...destinyResponses(side,window).map(answer=>offer('destinyResponse',[answer.kind],{label:answer.label})),offer('passResponse')];
  return [...reactOptions(side,window).map(x=>offer('react',[x.from,x.index],x)),
   ...reactDeployOptions(side,window).map(x=>offer('reactDeploy',[x.index,x.pilotIndex],x)),
   ...interruptResponses(side,window).map(x=>offer('interruptResponse',[x.index],x)),offer('passResponse')];
 }
 const {hand,deck,force,board}=PremiereGame.zones(position,side);
 if(position.pendingForceLoss){
  if(position.pendingForceLoss.payer!==side)return [];
  return PremiereGame.lossChoices(position,side,position.pendingForceLoss.from).map(choice=>offer('loseForce',choice.args,{card:choice.card}));
 }
 if(battleSession){
  const x=battleSession;
  if(x.resolved||position.phase!==3)return [];
  if(x.segment==='damage')return battleDamageOptions(side).map(option=>offer(option.kind,option.args,option));
  if(x.segment==='initiation')return [];
  const training=[];
  if(side==='Light'&&(!x.segmented||position.trainingBattle))for(const target of PremiereGame.sides)for(const kind of ['power','destiny']){
   for(let value=0;value<=20;value++)training.push(offer('trainingModifier',[target,kind,value]));
  }
  if(x.weaponTurn)return x.weaponTurn===side?
   [...battleWeaponOptions(side).map(shot=>offer('fireWeapon',[shot.hostIndex,shot.weaponIndex,shot.targetIndex],shot)),
   ...battleEffectOptions(side).map(option=>offer('battleEffect',option.args,option)),offer('passWeapons'),...training]:training;
  const first=x.initiator==='Dark'?'Dark':'Light',key=side==='Light'?'lightCard':'darkCard';
  if(x[key]===null){
   if(side!==first&&x[first==='Light'?'lightCard':'darkCard']===null)return training;
   const totals=battleTotals(x.site),ability=side==='Light'?totals.lightAbility:totals.darkAbility;
   return [...((battleDestinyDrawCount(side,x.site,ability)??0)>0?[offer('destiny')]:[]),offer('skipDestiny'),...training];
  }
  if(x.segmented||x.lightCard===null||x.darkCard===null)return training;
  const actions=board[x.site].flatMap((card,index)=>x.weaponHits?.[side]?.includes(index)?[]:[offer('toggleLoss',[index],{card})]);
  if(side==='Light'&&battleDamagePreview()&&battleForfeitPlan('Light').valid&&battleForfeitPlan('Dark').valid)actions.push(offer('resolveBattle'));
  return [...actions,...training];
 }
 const active=position.activeSide??(position.botTurn?'Dark':'Light');
 const actions=side==='Light'&&(!position.game||position.trainingBattle)?[offer('trainingNight',[!position.nightConditions])]:[];
 if(side!==active)return actions;
 const botStep=position.botTurn?.steps[position.botTurn.index];
 if(side==='Dark'&&position.botTurn?.decision)return [offer('botDecision',[position.botTurn.decision])];
 if(side==='Dark'&&botStep)actions.push(offer('botStep',[botStep.kind]));
 if(side==='Light'&&(position.phase!==0||position.activated))actions.push(offer('advance'));
 for(const option of retrievalOptions(side))actions.push(offer('retrieve',[option.index,option.slot],option));
 for(const option of transportOptions(side))actions.push(offer('transport',option.args,option));
 if(position.phase===0&&!position.activated){
  const max=Math.min(deck?.length??0,forceFromLocations(side).count);
  for(let n=0;n<=max;n++)actions.push(offer('activate',[n]));
 }else if(position.phase===1){
  for(const option of forceDrainOptions(side))actions.push(offer('drain',option.bonus?[option.siteIndex,option.bonus]:[option.siteIndex],option));
 }else if(position.phase===2){
  for(const [i,card] of (hand??[]).entries()){
   for(const slot of locationDeployPositions(side,i))actions.push(offer('deployLocation',[i,slot],{card}));
   const conversion=conversionTarget(side,i);
   if(conversion>=0)actions.push(offer('convertLocation',[i,conversion],{card}));
   for(const slot of revolutionOptions(side,i))actions.push(offer('revolution',[i,slot],{card,cost:3}));
   for(const option of weaponDeployOptions(side,i))actions.push(offer('equip',[i,option.siteIndex,option.hostIndex],
    {...option,card,contested:confirmedPresence(PremiereGame.otherSide(side),option.siteIndex)===true}));
   for(const option of backpackHosts(side,i))actions.push(offer('deployDevice',[i,option.slot,option.index],{...option,card}));
   for(const [slot,location] of position.locations.entries()){
    const cost=boardDeployCost(card,location,side);
    if(cost!==null)actions.push(offer('deploy',[i,slot],{card,location,cost}));
    for(const pilot of deployPilotOptions(side,i,slot))actions.push(offer('deployWithPilot',[i,slot,pilot.index],pilot));
   }
  }
 }else if(position.phase===3){
  for(const i of position.locations.keys())if(canInitiateBattleFor(side,i))actions.push(offer('battle',[i],{cost:1}));
 }else if(position.phase===5&&force?.length)actions.push(offer('draw'));
 for(const option of movementOptionsFor(side))actions.push(offer('move',[option.from,option.index,option.to,option.kind],{...option,movementKind:option.kind}));
 for(const group of transitGroups(side)){
  const {from,to,cost}=group[0];
  actions.push(offer('transitGroup',[from,to],{from,to,cost,count:group.length}));
 }
 return actions;
}

function executeAction({kind,side,args}){
 switch(kind){
  case 'chooseStart': return resolveStartingChoice(side,...args);
  case 'retrySetup': prepareStartingRound();return true;
  case 'beginGame': return finishSetup();
  case 'botStep': return advanceBotStep(...args);
  case 'botDecision': delete state.botTurn.decision;return true;
  case 'advance': return advance();
  case 'activate': activate(side,...args);state.activated=true;return true;
  case 'draw': return drawFor(side);
  case 'loseForce': return loseForceForDrain(side,...args);
  case 'drain': return initiateForceDrain(side,...args);
  case 'deployLocation': return deployLocationFromHand(side,...args);
  case 'convertLocation': return convertLocation(side,...args);
  case 'revolution': return deployRevolution(side,...args);
  case 'retrieve': return playRetrieval(side,...args);
  case 'deployWithPilot': return deployWithPilot(side,...args);
  case 'transport': return performTransport(side,...args);
  case 'transitGroup': return performTransitGroup(side,...args);
  case 'equip': return deployWeaponFor(side,...args);
  case 'deployDevice': return deployBackpack(side,...args);
  case 'deploy': {
   const result=deployBoardCardFor(side,...args);
   if(result)log(side+' setzt '+result.card.name+' bei '+result.loc.name+' ein ('+result.cost+' Force → Used Pile).');
   return result;
  }
  case 'move': return moveCharacterFor(side,...args);
  case 'battle': return initiateBattleFor(side,...args);
  case 'fireWeapon': return fireBattleWeapon(side,...args);
  case 'passWeapons': return passBattleWeapons(side);
  case 'battleEffect': return playBattleEffect(side,...args);
  case 'destinyResponse': return answerDestiny(side,...args);
  case 'battleForfeit':
  case 'battleForceLoss':
  case 'passDamage': return battleDamageAction(side,kind,args);
  case 'destiny': battleDestiny(side);return true;
  case 'skipDestiny': skipDestiny(side);return true;
  case 'toggleLoss': toggleLoss(side,...args);return true;
  case 'resolveBattle': return resolveBattleLosses();
  case 'react': return initiateReact(side,...args);
  case 'reactDeploy': return initiateReactDeploy(side,...args);
  case 'passResponse': return resolveResponsePass(side);
  case 'interruptResponse': return initiateInterruptResponse(side,...args);
  case 'timingTrigger': return PremiereGame.resolveTrigger(state.game,side,...args);
  case 'trainingModifier': setBattleModifier(...args);return true;
  case 'trainingNight': {
   state.nightConditions=args[0];
   log('Nachtbedingungen (manueller Lernschalter): '+(state.nightConditions?'aktiv':'inaktiv'));
   return true;
  }
 }
 return false;
}

function performAction(action,followUp=true){
 const game=currentGame();
 const result=PremiereGame.execute(game,action,side=>legalActions(state,side),executeAction);
 if(!result)return false;
 if(battleSession?.segmented)stopBattleWithoutPresence();
 if(game&&topLevelActions.has(action.kind))game.rootAction=action.side;
 if(state?.game&&!battleSession)checkLifeForceVictory();
 if(game?.rootAction&&!state.gameWinner&&!state.pendingForceLoss&&!battleSession&&
    !PremiereGame.responseWindow(game)&&!game.timing.pending){
  const priority=PremiereGame.otherSide(game.rootAction);
  delete game.rootAction;
  PremiereGame.checkpoint(game,'phase:priority',state.activeSide,()=>{},priority);
 }
 if(followUp&&action.kind==='retrySetup')chooseBotStartingLocation();
 if(followUp&&state?.pendingForceLoss?.payer==='Dark')botPayDrainLoss();
 publishGame();
 return result;
}

function requestAction(kind,side,args=[],followUp=true){
 return performAction(PremiereGame.offer(currentGame(),side,kind,args),followUp);
}

function chooseStart(index){return requestAction('chooseStart','Light',[index])}
function retryStartingLocations(){return requestAction('retrySetup','Light')}
function beginStartingGame(){return requestAction('beginGame','Light')}
