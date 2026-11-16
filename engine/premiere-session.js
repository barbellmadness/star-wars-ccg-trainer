const {REVISION, readCatalog, readStarterDecks, buildAudit, locationTitle, isDeployableCharacter, isBantha, isLostPileEffect, permanentPilotAbility, basicWeaponRule}=PremiereData;
let catalog=[],starterDecks=null,state=null,battleSession=null,setupDecks=null;
let nextGameId=0, presentGame=()=>{};
const currentGame=()=>state?.game??setupDecks?.game;
function publishGame(){if(!currentGame()?.executing)presentGame()}
const topLevelActions=new Set(['activate','draw','drain','deploy','deployWithPilot','transport','transitGroup','dockGroup','deployLocation','convertLocation','revolution','deployLostPileEffect','alterLostPileEffect','deployLocationEffect','alterLocationEffect','deployTableEffect','retrieve','searchReserve','equip','deployDevice','deployBolt','deviceAction','deployAutomated','buryMineCard','moveSeeker','weaponEffect','move','battle','duel']);

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
 const plan=PremiereLocations.drain(state,side,i,cardAbility);
 if(!plan||(currentGame()?.cardRulesVersion??latestCardRulesVersion)<4)return plan;
 const participants=PremiereLocations.entries(state,side).filter(({card,slot,unavailable})=>
  slot===i&&!unavailable&&PremiereUnits.active(card)&&['Character','Vehicle','Starship','Weapon','Device'].includes(card.type))
  .map(entry=>entry.card);
 participants.push(...(state.locationWeapons?.[i]??[]).filter(card=>(card.controller??card.side)===side));
 participants.push(...PremiereLocations.effectsAt(state,i).flatMap(effect=>effect.siteDevice&&effect.card.side===side?[effect.card]:[]));
 if(participants.some(card=>state.drainedCardsThisTurn?.includes(card)))return null;
 return {...plan,participants};
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
 if(state.gameWinner)log(state.gameWinner==='Simultaneous'?'SPIELENDE – Unentschieden. Beide Life Forces sind gleichzeitig aufgebraucht.':'SPIELENDE: '+state.gameWinner+' Side gewinnt, weil die gegnerische Life Force aufgebraucht ist.');
 return state.gameWinner;
}

function forceLossDescription(side,zone,card){
 return zone!=='hand'&&PremiereGame.lostPileFaceDown(state,side)?'eine verdeckte Karte':card.name;
}

function loseForceForDrain(side,zone,index){
 const pending=state?.pendingForceLoss;
 if(!pending||state.gameWinner||pending.payer!==side||!PremiereGame.lossChoices(state,side,pending.from).some(choice=>
  choice.args[0]===zone&&(zone!=='hand'||choice.args[1]===index)))return false;
 const card=PremiereGame.loseForce(state,side,zone,index);
 if(!card)return false;
 pending.remaining--;
 const label={battleDamage:'Battle Damage',assault:'Assault',prediction:'Prophetess'}[pending.reason]??'Force Drain';
 log(side+' verliert 1 Force für '+label+' aus '+zone+': '+forceLossDescription(side,zone,card)+'.');
 if(!pending.remaining||!PremiereGame.lossChoices(state,side).length){
  state.pendingForceLoss=null;
  if(pending.reason==='battleDamage')endBattleTiming();
 }
 checkLifeForceVictory();publishGame();return true;
}

function botPayDrainLoss(){
 const sources=['hand','used','force','deck'];
 while(state?.pendingForceLoss?.payer==='Dark'&&!state.gameWinner){
  const options=legalActions(state,'Dark');
  const choice=strategicBot()?botForceLossChoice(options):sources.map(zone=>options.find(option=>option.args[0]===zone)).find(Boolean);
  if(!performAction(choice,false))break;
 }
}

function initiateForceDrain(side,i,bonus=0){
 const plan=drainPlan(side,i);
 if(!plan||!Number.isInteger(bonus)||bonus<0||bonus>plan.optional)return false;
 (state.drainedSitesThisTurn??=[]).push(i);
 if(plan.participants)(state.drainedCardsThisTurn??=[]).push(...plan.participants);
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
 const matches=unit=>locationTitle(unit)===locationTitle(card)||identity.some(persona=>unit.personas?.some(name=>name.toLowerCase()===persona));
 if(state.outOfPlay?.some(unit=>(unit.owner??unit.side)===side&&matches(unit)))return false;
 const effects=[...Object.values(state.locationEffects??{}).flat(),...(state.tableEffects??[])]
  .map(effect=>effect.card).filter(unit=>(unit.owner??unit.side)===side);
 return [...PremiereLocations.cardsOnTable(state,side),...effects].filter(matches).length<limit;
}



function log(x){
 state.log.unshift(x);
 if(state.botTurn)(state.botHistory??=[]).unshift(x);
 if(battleSession)battleSession.recentEvents=[x,...(battleSession.recentEvents??[]).slice(0,2)];
}

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

const latestCardRulesVersion=5;
const expandedCardRules=()=> (currentGame()?.cardRulesVersion??latestCardRulesVersion)>=3;

function start(seed=Math.floor(Math.random()*4294967296),autoChoose=true,trainingBattle=false,decks=starterDecks,cardRulesVersion=latestCardRulesVersion,botStrategyVersion=1){
 if(!decks||!Number.isInteger(seed)||seed<0||seed>4294967295)return false;
 battleSession=null;state=null;
 const game=PremiereGame.actionState(++nextGameId,seed);
 game.starterDecks=decks;
 game.cardRulesVersion=cardRulesVersion;
 game.botStrategyVersion=botStrategyVersion;
 setupDecks={game,trainingBattle,
  light:PremiereGame.copyDeck(decks.light,'Light'),
  dark:PremiereGame.copyDeck(decks.dark,'Dark')};
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
 const firstSide=activeCardRules(lightChoice?.card,'firstTurn').length?'Light':'Dark';
 state=PremiereGame.createState(setup.game,deck,botDeck,locations,initialLocationOrder(locations),firstSide);
 state.trainingBattle=setup.trainingBattle;
 registerDuelTiming();
 setupDecks=null;
 log('Starting Locations: Light '+(lightChoice?.card.name??'kein Startort')+' / Dark '+(darkChoice?.card.name??'kein Startort')+'. Je 8 Karten Starthand. '+firstSide+' Side beginnt.');
 if(firstSide==='Dark')botBegin();
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
 if(from===to||!origin||!destination||!PremiereUnits.active(card)||PremiereUnits.restrainingBolt(card))return [];
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
  return names[0]==='tatooine: cantina'&&names[1]==='tatooine: mos eisley'&&character&&
   PremiereLocations.ruleAt(state,mos,side,'cantinaMove')?[{kind:'Mos Eisley',cost:0}]:[];
 }
 if(!react&&state.phase===4&&!PremiereUnits.tube(card)&&!PremiereUnits.crawler(card)&&
  PremiereLocations.conditions(state,from,side).dockingBay&&PremiereLocations.conditions(state,to,side).dockingBay){
  options.push({kind:'Docking-Bay-Transit',cost:PremiereLocations.conditions(state,from,side).transitCost});
 }
 if(!react&&state.phase===4&&sitePlanet(destination)==='death star'&&character&&/^Imperial$/i.test(card.subType??'')&&
    PremiereLocations.ruleAt(state,from,side,'militaryCorridorMove')){
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
 if(option.kind==='Landspeed')noteMineTraversal(side,from,to,card);
 (state.movedThisTurn??=[]).push(card);
 log(side+' bewegt '+card.name+' per '+option.kind+' nach '+state.locations[to].name+' ('+option.cost+' Force).');
 publishGame();return true;
}

function moveCharacter(from,index,to){return moveCharacterFor('Light',from,index,to)}

function canDock(first,second,slot){
 return first!==second&&first.type==='Starship'&&second.type==='Starship'&&
  PremiereUnits.active(first)&&PremiereUnits.active(second)&&isSystem(state.locations[slot])&&
  [first,second].some(ship=>PremiereUnits.hasDock(ship)||PremiereUnits.capital(ship))&&
  [first,second].some(ship=>craftStats(ship,slot).powered);
}

function transportOptions(side){
 const options=[];
 if(state.activeSide!==side||![2,4].includes(state.phase))return options;
 const {board,force,hand}=PremiereGame.zones(state,side);
 const move=state.phase===4,ready=card=>PremiereUnits.active(card)&&!state.movedThisTurn?.includes(card)&&!PremiereUnits.restrainingBolt(card);
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
     offer('deployAboard',slot,slot,h,i,role,crewDeployCost(card,side,here),card,host,'An Bord ausspielen');
    }
   }
  }
  if(move)for(const [j,card] of row.entries())for(const role of PremiereUnits.roles(host,card)){
   if(!PremiereUnits.restrainingBolt(card)&&(landed||role==='cargo'||role==='hangar'))offer('embark',slot,slot,j,i,role,0,card,host,'Einsteigen');
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
   if(!move||PremiereUnits.restrainingBolt(card))continue;
   if(landed||(entry.role==='hangar'&&craftStats(card,slot,true).powered))offer('exit',slot,slot,j,i,'',0,card,host,'Aussteigen');
   if(!landed&&host.type==='Starship'&&['pilot','passenger','cargo','hangar'].includes(entry.role)){
    row.forEach((target,k)=>{
     if(!canDock(host,target,slot))return;
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

function performTransitGroup(side,group){
 const {from,to,cost}=group[0];
 const {board,force,used}=PremiereGame.zones(state,side);
 for(const move of group.slice().reverse())board[from].splice(move.index,1);
 const cards=group.map(move=>move.card);
 board[to].push(...cards);
 (state.movedThisTurn??=[]).push(...cards);
 PremiereGame.moveTop(force,used,cost);
 log(side+' verlegt '+cards.map(card=>card.name).join(', ')+' per Docking-Bay-Transit ('+cost+' Force).');
 return true;
}

function dockingGroups(side){
 if(state.phase!==4)return [];
 const {board,force}=PremiereGame.zones(state,side);
 if(!force?.length)return [];
 return board.flatMap((row,slot)=>row.flatMap((first,left)=>row.flatMap((second,right)=>{
  if(right<=left||!canDock(first,second,slot))return [];
  const ships=[first,second];
  const choices=ships.flatMap((ship,source)=>(ship.occupants??[]).flatMap(({card,role},index)=>{
   if(!['pilot','passenger','cargo','hangar'].includes(role)||PremiereUnits.restrainingBolt(card))return [];
   const destination={...ships[1-source],occupants:[]};
   const roles=PremiereUnits.roles(destination,card).filter(role=>role!=='astromech');
   return roles.length?[{source,index,card,roles}]:[];
  }));
  return choices.length>1?[{args:[slot,left,right],from:slot,cost:1,ships,choices}]:[];
 })));
}

function dockingPlan({ships,choices},selection){
 if(!selection.length||selection.length%3!==0)return null;
 const occupants=ships.map(ship=>(ship.occupants??[]).slice());
 const moved=[new Set(),new Set()], transfers=[];
 for(let i=0;i<selection.length;i+=3){
  const [source,index,role]=selection.slice(i,i+3);
  const choice=choices.find(entry=>entry.source===source&&entry.index===index&&entry.roles.includes(role));
  if(!choice||moved[source].has(index))return null;
  moved[source].add(index);
  transfers.push({source,role,entry:occupants[source][index]});
 }
 const next=ships.map((ship,i)=>({...ship,occupants:occupants[i].filter((_,index)=>!moved[i].has(index))}));
 for(const {source,role,entry} of transfers){
  const destination=next[1-source];
  if(!PremiereUnits.accepts(destination,entry.card,role))return null;
  destination.occupants.push({...entry,role});
 }
 return {occupants:next.map(ship=>ship.occupants),cards:transfers.map(({entry})=>entry.card)};
}

function performDockingGroup(side,ships,plan){
 if(!plan)return false;
 const {force,used}=PremiereGame.zones(state,side);
 ships.forEach((ship,index)=>{ship.occupants=plan.occupants[index]});
 PremiereGame.moveTop(force,used);
 log(side+' transferiert '+plan.cards.map(card=>card.name).join(', ')+' zwischen '+ships.map(ship=>ship.name).join(' und ')+' (1 Force).');
 return true;
}


function botMoveScore(option){
 if(strategicBot())return strategicMoveScore(option);
 const dest=state.locations[option.to],lightIcons=Number.isInteger(dest?.icons?.light)?dest.icons.light:0;
 const enemy=confirmedPresence('Light',option.to)===true?2:0,empty=confirmedPresence('Dark',option.to)!==true?1:0;
 const leavesLast=(state.dark[option.from]||[]).length===1?2:0;
 return lightIcons*2+enemy+empty-leavesLast;
}

function strategicBot(){return state?.game?.botStrategyVersion===1}

function botPosition(slot){
 return {...battleTotals(slot),dark:confirmedPresence('Dark',slot),light:confirmedPresence('Light',slot),
  drain:PremiereLocations.icons(state,slot,'Light')??0};
}

function botUnitStrength(card,slot,pilot=null){
 if(['Starship','Vehicle'].includes(card.type)){
  const craft=pilot?{...card,occupants:[...(card.occupants??[]),{role:'pilot',card:pilot}]}:card;
  const stats=craftStats(craft,slot);
  const ability=stats.ability||(craft.occupants??[]).reduce((sum,entry)=>sum+(cardAbility(entry.card)??0),0)||cardAbility(card)||0;
  return {power:stats.power,ability};
 }
 return {power:Math.max(0,(card.power??0)+cardPowerModifier(card,'Dark',slot)),ability:cardAbility(card)??0};
}

function strategicMoveScore(option){
 const from=botPosition(option.from),to=botPosition(option.to),unit=botUnitStrength(option.card,option.to);
 const dark=state.dark.slice();
 dark[option.from]=dark[option.from].filter(card=>card!==option.card);
 const leavesControl=from.dark===true&&from.light===false&&
  PremiereLocations.control({...state,dark},'Dark',option.from,cardAbility)!==true;
 const gainControl=to.dark!==true&&to.light===false&&unit.ability+(to.darkAbility??0)>=1;
 const margin=to.darkPower+unit.power-to.lightPower;
 const contest=to.light===true?(margin>=2?2:margin>=0?0:-3):0;
 const retreat=from.light===true&&from.lightPower>from.darkPower+2?2:0;
 return (gainControl?2+2*to.drain:0)+contest+retreat-(leavesControl?2+2*from.drain:0)-option.cost*0.8;
}

function botHandValue(card){
 const {hand}=PremiereGame.zones(state,'Dark');
 if(card.type==='Location'){
  const redundant=state.locations.some(loc=>loc&&locationTitle(loc)===locationTitle(card))||
   hand.some(copy=>copy!==card&&locationTitle(copy)===locationTitle(card));
  return redundant?0:3;
 }
 const uniqueCopy=card.uniquenessLimit&&hand.some(copy=>copy!==card&&copy.id===card.id);
 if(uniqueCopy)return 1;
 if(card.type==='Character')return 3+(cardAbility(card)??0)+(card.power??0)/2;
 if(card.type==='Starship'||card.type==='Vehicle')return 3+(card.power??0);
 return 2;
}

function botForceLossChoice(options){
 const fromHand=options.filter(option=>option.args[0]==='hand')
  .map(option=>({option,value:botHandValue(option.card)})).sort((a,b)=>a.value-b.value)[0];
 const piles=['used','deck','force'];
 const fromLife=piles.map(zone=>options.find(option=>option.args[0]===zone)).find(Boolean);
 if(fromHand&&(fromHand.value<4||lifeForceRemaining('Dark')<=5||!fromLife))return fromHand.option;
 return fromLife;
}

function characterTraits(c){return (c.characteristics||[]).map(x=>String(x).toLowerCase())}

function activeCardRules(card,event){
 if(PremiereUnits.textSuppressed(card))return [];
 const version=currentGame()?.cardRulesVersion??latestCardRulesVersion;
 return PremiereCardRules.effects(card,event).filter(rule=>version>=(rule.since??(rule.legacy?0:1)));
}

function matchesRegisteredTarget(card,target){
 const traits=characterTraits(card),alien=card.type==='Character'&&card.subType==='Alien';
 if(target==='alien')return alien;
 if(target==='alien-except-tusken')return alien&&!traits.includes('tusken raider')&&locationTitle(card)!=='tusken raider';
 if(target==='jawa')return traits.includes('jawa')||locationTitle(card)==='jawa';
 if(target==='tusken')return traits.includes('tusken raider')||locationTitle(card)==='tusken raider';
 if(target==='underworld')return card.type==='Character'&&['spy','thief','bounty hunter','smuggler'].some(trait=>traits.includes(trait));
 if(target==='imperial-trooper')return card.type==='Character'&&card.subType==='Imperial'&&traits.includes('trooper');
 if(target==='rebel-trooper-or-y-wing')return traits.includes('rebel trooper')||(card.type==='Starship'&&/\bY-Wing\b/i.test(card.subType??''));
 if(target==='stormtrooper-or-tie')return traits.includes('stormtrooper')||PremiereUnits.tie(card);
 if(target==='character')return card.type==='Character';
 if(target==='rebel-or-alien')return alien||(card.type==='Character'&&card.subType==='Rebel');
 if(target==='imperial-or-alien')return alien||(card.type==='Character'&&card.subType==='Imperial');
 if(target==='rebel-or-jawa'||target==='imperial-or-jawa'){
  return card.type==='Character'&&(card.subType===(target==='rebel-or-jawa'?'Rebel':'Imperial')||
   traits.includes('jawa')||locationTitle(card)==='jawa');
 }
 return false;
}

function registeredLocationModifier(event,card,side,slot){
 const loc=state.locations?.[slot],printed=PremiereLocations.printedSide(state,slot,side);
 return activeCardRules(loc,event).filter(rule=>rule.printedSide===printed&&matchesRegisteredTarget(card,rule.targets))
  .reduce((sum,rule)=>sum+rule.amount,0);
}

function deviceCharacterModifier(card,loc){
 const region=loc?(isSite(loc)?sitePlanet(loc):isSystem(loc)?locationGroup(loc):null):null;
 const bonuses=new Set((card.attachments??[]).flatMap(device=>activeCardRules(device,'device').map(rule=>rule.bonus)));
 return (bonuses.has('tatooine-belt')&&region==='tatooine'?2:0)+(bonuses.has('stormtrooper-belt')?(region==='death star'?2:1):0);
}

function registeredCharacterModifier(event,card,slot){
 const region=sitePlanet(state.locations[slot]);
 if(!region||card.type!=='Character')return 0;
 const rules=activeCardRules(card,event);
 if(!rules.length)return 0;
 return rules.reduce((total,rule)=>{
  if(rule.outsideRegion)return total+(region!==rule.outsideRegion?rule.amount:0);
  if(rule.companions){
   const companion=PremiereGame.sides.some(side=>PremiereLocations.entries(state,side).some(entry=>
    entry.slot===slot&&!entry.unavailable&&rule.companions.includes(entry.card.id)))||
    PremiereLocations.effectsAt(state,slot).some(effect=>rule.companions.includes(effect.card.id));
   return total+(companion?rule.amount:0);
  }
  if(rule.eachPresent&&PremiereLocations.present(state,card,slot)){
   return total+rule.amount*PremiereGame.sides.flatMap(side=>PremiereLocations.presentCards(state,side,slot))
    .filter(unit=>unit!==card&&matchesRegisteredTarget(unit,rule.eachPresent)).length;
  }
  return total;
 },0);
}

function rebelAuraPower(card,side,slot,same){
 if(card.type!=='Character'||card.subType!=='Rebel')return 0;
 const region=sitePlanet(state.locations[slot]);
 if(!['yavin 4','death star'].includes(region)||!same.includes(card)||(currentGame()?.cardRulesVersion??latestCardRulesVersion)<2)return 0;
 const sources=[...same,...PremiereLocations.presentCards(state,PremiereGame.otherSide(side),slot)];
 return sources.filter(unit=>unit!==card).reduce((total,unit)=>total+
  activeCardRules(unit,'rebelAura').filter(rule=>rule.region===region).reduce((bonus,rule)=>bonus+rule.amount,0),0);
}

const isNonUniqueTusken=card=>matchesRegisteredTarget(card,'tusken')&&!card.uniquenessLimit&&PremiereUnits.active(card);

function tuskenGroupPower(cards){
 const present=cards.filter(isNonUniqueTusken);
 const [rule]=activeCardRules(present[0],'tuskenPower');
 return rule&&present.length>=rule.minimum?rule.groupAmount:0;
}

function isDroid(c){return String(c?.type||'').toLowerCase()==='character'&&String(c?.subType||'').toLowerCase()==='droid'}

function isPowerDroid(c){return isDroid(c)&&(c.id==='Dark:816'||(c.extraText||[]).some(tag=>/\bpower droid\b/i.test(String(tag))))}

function cardPowerModifier(c,side,siteIndex,ownPresent){
 const disarmed=PremiereWeapons.disarmed(c)?-1:0;
 if(!state||!['Light','Dark'].includes(side))return disarmed;
 let bonus=disarmed+deviceCharacterModifier(c,state.locations?.[siteIndex])+registeredLocationModifier('power',c,side,siteIndex);
 if(!state.locations?.[siteIndex]||!isSite(state.locations[siteIndex]))return bonus;
 const same=ownPresent??PremiereLocations.presentCards(state,side,siteIndex);
 bonus+=registeredCharacterModifier('characterPower',c,siteIndex)+rebelAuraPower(c,side,siteIndex,same);
 const [tuskenRule]=activeCardRules(c,'tuskenPower');
 if(tuskenRule&&same.some(card=>card!==c&&isNonUniqueTusken(card)))bonus+=tuskenRule.amount;
 if(side==='Light'&&PremiereLocations.conditions(state,siteIndex,side).night&&sitePlanet(state.locations[siteIndex])&&
    same.some(x=>x.id==='Light:2'&&!PremiereUnits.textSuppressed(x)&&/nighttime conditions/i.test(x.gametext||''))&&
    characterTraits(c).some(x=>/\brebel\b|\balien\b/.test(x)))bonus+=2;
 // EG-6 gives +1 power to each other allied droid at its site, except power droids.
 if(isDroid(c)&&!isPowerDroid(c))
   bonus+=same.filter(x=>x.id==='Dark:816'&&!PremiereUnits.textSuppressed(x)&&/adds 1 to power of each of your droids/i.test(x.gametext||'')).length;
 if(c.id==='Dark:2648'&&isExteriorPlanetSite(state.locations[siteIndex]))
   bonus+=(state.dark[siteIndex]||[]).filter(isBantha).length;
 return bonus;
}

function cardEffectStatus(c){
 const registered=PremiereCardRules.entry(c);
 if(registered.effects.length)return (registered.complete?'UMGESETZT: ':'TEILWEISE: ')+registered.effects.map(rule=>rule.summary).join(' ');
 if(c.id==='Light:483')return 'UMGESETZT: Kombiniert mindestens zwei bezahlte Schiffswaffen gegen ein Ziel und wertet ihre gemeinsame Destiny in gewählter Reihenfolge aus.';
 if(c.id==='Dark:2517')return 'UMGESETZT: Vader und Obi-Wan duellieren sich am Site. Vergleicht Power samt Lichtschwertbonus und entfernt den Verlierer aus dem Spiel.';
 if(c.id==='Dark:1958')return 'UMGESETZT: Sagt vor dem eigenen Battle den Sieger voraus, erhält bei richtiger Vorhersage eine zufällige verlorene Karte zurück und verliert andernfalls 1 Force. Immun gegen Attrition < 3.';
 if(isLostPileEffect(c))return 'UMGESETZT: Legt den gewählten Lost Pile verdeckt. Verluste aus Life Force bleiben verdeckt, Rückholen bleibt möglich.';
 if(isBantha(c))return 'TEILWEISE: Außen-Site, Ability ½, Landspeed, React, Waffenabwehr und Power +1 für anwesende Tusken Raider. Boarding ist offen.';
 if(c.id==='Light:1593')return 'TEILWEISE: Force-Generierung +1 außerhalb von Tatooine-Sites und gedruckte Attrition-Immunität. Pilotenboni sind offen.';
 if(c.id==='Light:2110')return 'TEILWEISE: Vertauscht Force-Icons und die Seiten der implementierten Ortsregeln. Expand The Empire und Aufheben des Effects sind offen.';
 if(lostRetrieval.has(c.id))return 'TEILWEISE: Benannte Karten aus dem Lost Pile zurückholen oder im Reserve Deck suchen, aufdecken und auf die Hand nehmen. Spielen im gegnerischen Zug bleibt offen.';
 if(['Light:2385','Dark:575'].includes(c.id))return 'TEILWEISE: Antwort auf Force Drain mit Destiny-Vergleich und Force Loss.';
 if(permanentPilotAbility(c)!==null)return 'TEILWEISE: System-Deploy, Power und permanente Piloten-Ability. Hyperspeed mit Nav Computer, soweit vorhanden. Boarding, Landen und Schiffsbewaffnung sind offen.';
 if(['Light:608','Dark:1426','Light:80'].includes(c.id))return 'TEILWEISE: Grundlegende Modifikatoren für Deploy oder Battle Destiny im Weltraum. Weitere Kartentexte sind offen.';
 if(['Light:2448','Dark:2458'].includes(c.id))return 'TEILWEISE: Erhöhte Mindest-Ability für Battle-Destiny berücksichtigt. Weitere Effekte sind offen.';
 if(PremiereWeapons.seeker(c))return 'TEILWEISE: Seeker mit Control-Bewegung und automatischer Zielwahl.';
 if(PremiereWeapons.mine(c))return 'TEILWEISE: Offene Timer Mine mit Zielwahl nach dem Destiny-Draw zum nächsten eigenen Zug.';
 if(PremiereWeapons.definition(c))return 'TEILWEISE: Träger oder Aufstellung, Waffen-Destiny und Kartenfolgen im implementierten Kampfablauf.';
 if(c.id==='Dark:634'&&/When in battle, adds 1 to each of your battle destiny draws/i.test(c.gametext||''))return 'TEILWEISE: Battle-Destiny-Draws Dark +1 durch Vader und gedruckte Attrition-Immunität; Pilot- und weitere Sonderregeln offen.';if(c.id==='Light:2')return 'TEILWEISE: Nacht-Power +2 für verbündete Rebels/Aliens am selben Planetensite; bedingte Attrition-Immunität offen.';if(c.id==='Dark:816')return 'TEILWEISE: EG-6 erhöht Power eigener Droids am selben Site; Spezial-Destiny 0 und bedingte Power-Verdopplung unterstützt.';const below=printedAttritionImmunityBelow(c);if(below!==null)return 'TEILWEISE: Unbedingte gedruckte Attrition-Immunität < '+below+' unterstützt; übrige Karteneffekte offen.';if(!(c.gametext||'').trim())return 'KEIN KARTENTEXT: keine individuellen Text-Effekte zu automatisieren (andere Spielregeln gelten weiterhin).';return 'OFFEN: Kartentext noch nicht als ausführbare Regel validiert.'}

function effectCoverage(){
 const results=catalog.map(card=>({card,status:cardEffectStatus(card)}));
 const cardsWith=prefix=>results.filter(entry=>entry.status.startsWith(prefix)).map(entry=>entry.card);
 return {total:results.length,withoutText:cardsWith('KEIN KARTENTEXT'),complete:cardsWith('UMGESETZT'),partial:cardsWith('TEILWEISE'),unimplemented:cardsWith('OFFEN')};
}

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
 if(index>=0&&PremiereLocations.ruleAt(state,index,side,'deployWithoutIcons'))return true;
 return (Number.isFinite(ownIcons)&&ownIcons>=1)||(index>=0&&confirmedPresence(side,index)===true);
}

function characterDeployCost(card,site,side){
 if(!isSite(site)||(!hasDeployPresence(side,site)&&!isSpyCharacter(card)))return null;
 if(!characterLocationAllowed(card,site))return null;
 const slot=state.locations.indexOf(site);
 const deployRule=PremiereLocations.ruleAt(state,slot,side,'characterDeploy');
 const discount=deployRule?.names.includes(locationTitle(card))?deployRule.amount:0;
 const droidTax=isDroid(card)?PremiereLocations.presentCards(state,PremiereGame.otherSide(side),slot)
  .filter(unit=>unit.id==='Dark:12'&&!PremiereUnits.textSuppressed(unit)).length:0;
 return Math.max(0,crewDeployCost(card,side,site)-discount+droidTax);
}

function characterLocationAllowed(card,loc){
 const region=sitePlanet(loc);
 if(isDroid(card)&&PremiereLocations.effectsAt(state,state.locations.indexOf(loc)).some(effect=>effect.siteDevice==='droid-detector'))return false;
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

function crewDeployCost(card,side,loc){
 if(loc&&isSite(loc)){
  const slot=state.locations.indexOf(loc);
  if(isSpyCharacter(card)&&PremiereLocations.nightEffectsAt(state,slot).length)return 0;
  if(activeCardRules(card,'freeSiteDeploy').some(rule=>rule.targets==='moisture-farm'?
    locationTitle(loc)==="tatooine: lars' moisture farm":PremiereLocations.entries(state,side).some(entry=>entry.slot===slot&&
    !entry.unavailable&&entry.card.type==='Character'&&entry.card.subType===rule.targets&&cardAbility(entry.card)>2)))return 0;
 }
 const imperials=card.id==='Dark:60'?PremiereLocations.activeCards(state,side).filter(unit=>
  unit.type==='Starship'&&unit.side==='Dark'&&!unit.characteristics?.includes('independent')).length:0;
 return Math.max(0,card.deploy-(imperials>=2?2:0)+warriorDeployIncrease(card,side));
}

function warriorDeployIncrease(card,side){
 if(card.type!=='Character'||!card.warrior)return 0;
 return Math.max(0,...(state.tableEffects??[]).filter(effect=>effect.target===side)
  .map(effect=>tableEffectRule(effect.card)?.warriorDeploy??0));
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
 const deployRule=PremiereLocations.ruleAt(state,slot,side,'shipDeploy');
 let discount=(PremiereUnits.capital(card)?deployRule?.capitalDiscount:deployRule?.fighterDiscount)??0;
 if(deployRule?.tarkinDiscount){
  const board=PremiereGame.zones(state,side).board?.[slot]??[];
  const tarkinAboard=board.some(ship=>ship.type==='Starship'&&ship.occupants?.some(({card})=>locationTitle(card)==='grand moff tarkin'));
  if(tarkinAboard)discount=deployRule.tarkinDiscount;
 }
 if(card.id==='Dark:2600'&&state.dark[state.locations.indexOf(loc)]?.some(c=>
  c.type==='Starship'&&/^Capital\b/i.test(c.subType||'')&&/\bImperial\b/i.test(c.subType)))discount++;
 return Math.max(0,card.deploy-discount)+(pilot?crewDeployCost(pilot,side,loc):0);
}

const jawaCosts=new Map([['Light:1373',1],['Dark:1372',1],['Dark:643',2]]);
function jawaDeployPayment(card,loc,side){
 if(!isSite(loc)||sitePlanet(loc)!=='tatooine'||!hasDeployPresence(side,loc))return null;
 const slot=state.locations.indexOf(loc),deployRule=PremiereLocations.ruleAt(state,slot,side,'jawaDeploy');
 if(deployRule){
  const sandcrawler=deployRule.freeWithCrawler&&PremiereGame.sides.some(player=>
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

function weaponMounts(side){
 const {board}=PremiereGame.zones(state,side);
 const entries=PremiereLocations.entries(state,side);
 return state.locations.flatMap((location,slot)=>{
  if(!location)return [];
  const roots=board?.[slot]??[],local=entries.filter(entry=>entry.slot===slot);
  const mounts=local.flatMap((entry,index)=>{
   const card=entry.card;
   if(entry.unavailable||(!PremiereUnits.active(card)&&!PremiereWeapons.projector(card))||
      !['Character','Vehicle','Starship'].includes(card.type)&&!PremiereWeapons.projector(card))return [];
   const root=roots.indexOf(card);
   return [{host:card,slot,index:root>=0?root:roots.length+index,place:PremiereLocations.physicalPlace(entry)}];
  });
  if(isSystem(location)&&location.locationTags?.includes('Mobile'))mounts.push({host:location,slot,index:-1,place:slot});
  return mounts;
 });
}

function mountWeapons(mount){
 if(isLoc(mount.host))return state.locationWeapons?.[mount.slot]??[];
 if(PremiereWeapons.projector(mount.host))return [mount.host];
 return mount.host.weapons??[];
}
function attachWeapon(mount,weapon){
 if(isLoc(mount.host))((state.locationWeapons??={})[mount.slot]??=[]).push(weapon);
 else (mount.host.weapons??=[]).push(weapon);
}

function weaponDeployOptions(side,handIndex){
 if(!state||state.phase!==2||state.activeSide!==side||state.gameWinner||state.pendingForceLoss||battleSession)return [];
 const {hand}=PremiereGame.zones(state,side);
 return weaponPlacementOptions(side,hand?.[handIndex]);
}

function weaponPlacementOptions(side,card,slot){
 const {force}=PremiereGame.zones(state,side);
 if(!PremiereWeapons.definition(card)||card.side!==side||!withinDeploymentLimit(card,side))return [];
 return weaponMounts(side).flatMap(mount=>{
  if(slot!==undefined&&mount.slot!==slot)return [];
  const cost=PremiereWeapons.deployCost(card,mount.host,cardAbility(mount.host));
  if(cost===null||cost>force.length)return [];
  return [{mount,siteIndex:mount.slot,hostIndex:mount.index,host:mount.host,cost}];
 });
}

function deployWeaponFor(side,handIndex,siteIndex,hostIndex){
 const option=weaponDeployOptions(side,handIndex).find(x=>x.siteIndex===siteIndex&&x.hostIndex===hostIndex);
 if(!option)return false;
 const {hand,force,used}=PremiereGame.zones(state,side),[weapon]=hand.splice(handIndex,1);
 PremiereGame.moveTop(force,used,option.cost);
 attachWeapon(option.mount,weapon);
 log(side+' rüstet '+option.host.name+' mit '+weapon.name+' aus ('+option.cost+' Force → Used Pile).');
 return true;
}

function allWeaponEntries(){
 return PremiereGame.sides.flatMap(side=>PremiereLocations.entries(state,side).map(entry=>({...entry,side})));
}

function weaponRecords(){
 const entries=allWeaponEntries();
 const records=entries.filter(entry=>!entry.unavailable&&entry.card.type==='Weapon').map(entry=>({...entry,
  host:entries.find(other=>other.card.weapons?.includes(entry.card))?.card}));
 const fixed=Object.entries(state.locationWeapons??{}).flatMap(([slot,cards])=>cards.map(card=>
  ({card,slot:Number(slot),side:card.side,host:state.locations[slot],carriers:[]})));
 return records.concat(fixed);
}

function weaponEffectOptions(side){
 const {hand,force}=PremiereGame.zones(state,side),active=state.activeSide===side;
 const phase=state.phase,options=[],mounts=weaponMounts(side),entries=allWeaponEntries(),weapons=weaponRecords();
 const add=(args,label,details={})=>options.push({args,label,...details});
 const rack=state.blasterRack;
 if(active&&phase===2){
  const targetMounts=mounts.filter(mount=>!isLoc(mount.host)&&!PremiereWeapons.projector(mount.host));
  mounts.forEach((source,a)=>mountWeapons(source).forEach((weapon,w)=>{
   if(PremiereWeapons.projector(weapon)||weapon.side!==side)return;
   targetMounts.forEach(target=>{
    if(source.host===target.host||source.slot!==target.slot||source.place!==target.place)return;
    const cost=PremiereWeapons.deployCost(weapon,target.host,cardAbility(target.host));
    if(cost!==null&&cost<=(force?.length??0))add(['transfer',a,w,target.slot,target.index],weapon.name+' → '+target.host.name+' ('+cost+' Force)',{source,weapon,target,cost});
   });
  }));
  if(side==='Dark'&&!rack){
   const index=hand?.findIndex(card=>card.id==='Dark:262')??-1;
   if(index>=0)add(['rack',index],'Blaster Rack ausspielen',{index});
  }
  if(side==='Dark'&&rack)rack.weapons.forEach((weapon,index)=>targetMounts.forEach(target=>{
   const cost=PremiereWeapons.deployCost(weapon,target.host,cardAbility(target.host));
   if(cost!==null&&cost<=(force?.length??0))add(['rackOut',index,target.slot,target.index],weapon.name+' vom Rack → '+target.host.name+' ('+cost+' Force)',{weapon,target,cost});
  }));
  const tanks=hand?.findIndex(card=>card.id===(side==='Light'?'Light:997':'Dark:996'))??-1;
  if(tanks>=0)targetMounts.forEach(target=>{
   const system=state.locations[target.slot];
   if(target.host.type==='Starship'&&isSystem(system)&&!target.host.attachments?.some(card=>['Light:997','Dark:996'].includes(card.id))&&
      state.locations.some((loc,slot)=>loc&&sitePlanet(loc)===locationGroup(system)&&PremiereLocations.conditions(state,slot,side).dockingBay)){
    add(['tanks',tanks,target.slot,target.index],'Fusion Generator Supply Tanks → '+target.host.name,{index:tanks,target});
   }
  });
 }
 if(active&&side==='Dark'&&rack)weapons.forEach((entry,index)=>{
  if(entry.side===side&&entry.card.side===side&&entry.card.subType==='Character'&&entry.host&&isSite(state.locations[entry.slot]))
   add(['rackIn',index],entry.card.name+' ins Blaster Rack legen',{entry});
 });
 if(phase===1){
  const index=hand?.findIndex(card=>card.id===(side==='Light'?'Light:735':'Dark:734'))??-1;
  if(index>=0){
   const own=mounts.filter(mount=>mount.host.type==='Character'&&mount.host.weapons?.length&&mount.place===mount.slot);
   entries.forEach((entry,j)=>{
    const {card,slot}=entry;
    if(entry.side===side||entry.unavailable||card.type!=='Character'||!card.weapons?.length||
       PremiereLocations.physicalPlace(entry)!==slot||!isSite(state.locations[slot])||!own.some(unit=>unit.slot===slot))return;
    add(['disarm',index,j],'Disarmed · '+card.name, {entry,index});
   });
  }
 }
 if(active||battleSession?.weaponTurn===side){
  const overload=side==='Dark'?hand?.findIndex(card=>card.id==='Dark:1880')??-1:-1;
  if(overload>=0)weapons.forEach((entry,index)=>{
   if(entry.card.id==='Dark:1002'||!/^[^:]+:/.test(entry.card.id??''))return;
   if(entry.card.characteristics?.some(trait=>/ewok/i.test(trait)))return;
   add(['overload',overload,index],'Overload · '+entry.card.name,{entry,index:overload});
  });
 }
 if(active&&(force?.length??0)>0)weapons.forEach((entry,index)=>{
  if(!PremiereWeapons.mine(entry.card)||!PremiereLocations.presentCards(state,side,entry.slot).some(card=>
     PremiereWeapons.miningDroid(card)&&PremiereUnits.active(card)))return;
  add(['defuse',index],'Timer Mine entschärfen (1 Force)',{entry,cost:1});
 });
 return options;
}

function playWeaponEffect(side,...args){
 const effect=weaponEffectOptions(side).find(option=>option.args.length===args.length&&option.args.every((value,i)=>value===args[i]));
 if(!effect)return false;
 const {hand,force,used}=PremiereGame.zones(state,side),{entry}=effect;
 switch(args[0]){
  case 'transfer':
   mountWeapons(effect.source).splice(mountWeapons(effect.source).indexOf(effect.weapon),1);
   PremiereGame.moveTop(force,used,effect.cost);
   attachWeapon(effect.target,effect.weapon);
   break;
  case 'rack': state.blasterRack={card:hand.splice(effect.index,1)[0],weapons:[]};break;
  case 'rackIn':
   if(!detachTableCard(entry.side,entry.slot,entry.card))return false;
   state.blasterRack.weapons.push(entry.card);
   break;
  case 'rackOut':
   state.blasterRack.weapons.splice(args[1],1);
   PremiereGame.moveTop(force,used,effect.cost);
   attachWeapon(effect.target,effect.weapon);
   break;
  case 'disarm': {
   const [card]=hand.splice(effect.index,1);
   for(const weapon of entry.card.weapons.splice(0))loseOwnedCard(weapon,entry.side);
   (entry.card.attachments??=[]).push(card);
   break;
  }
  case 'tanks': {
   const [card]=hand.splice(effect.index,1);
   (effect.target.host.attachments??=[]).push(card);
   break;
  }
  case 'overload': {
   const [card]=hand.splice(effect.index,1);
   const frame={kind:'interrupt',interrupt:'overload',site:entry.slot,side,card,entry};
   if(state.game&&hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
   else resolveOverload(frame);
   break;
  }
  case 'defuse':
   PremiereGame.moveTop(force,used,effect.cost);
   loseTableCard(entry.side,entry.slot,entry.card);
   if(battleSession?.weaponTurn)finishWeaponAction(side,false);
   break;
 }
 log(side+' · '+effect.label+'.');
 return true;
}

function resolveOverload(frame){
 const {entry,side,card}=frame;
 drawDestinySeries(side,'overload',1,0,draws=>{
  const draw=draws.find(item=>!item.cancelled);
  const value=draw?.value,limit=printedBattleDestiny(entry.card);
  if(Number.isFinite(value)&&Number.isFinite(limit)&&value<limit){
   loseTableCard(entry.side,entry.slot,entry.card);
   log(entry.card.name+' geht durch Overload verloren.');
  }
  if(value===0&&['Character','Starship'].includes(entry.host?.type))loseTableCard(entry.side,entry.slot,entry.host);
  if(!draw)log('Overload: Keine wirksame Destiny.');
  loseOwnedCard(card,side);
  if(battleSession?.weaponTurn)finishWeaponAction(side,false);
 });
}

function automatedDeployOptions(side){
 const {hand,force}=PremiereGame.zones(state,side);
 if(state.phase!==2||state.activeSide!==side)return [];
 return (hand??[]).flatMap((card,index)=>{
  const projector=PremiereWeapons.projector(card),mine=PremiereWeapons.mine(card),seeker=PremiereWeapons.seeker(card);
  if(!projector&&!mine&&!seeker||card.side!==side)return [];
  const cost=projector?2:seeker?1:0;
  if(cost>(force?.length??0))return [];
  return state.locations.flatMap((loc,slot)=>{
   if(!loc||!isSite(loc))return [];
   if(projector&&!loc.locationTags?.includes('Interior'))return [];
   if(mine&&!PremiereLocations.presentCards(state,side,slot).some(unit=>PremiereWeapons.miningDroid(unit)&&PremiereUnits.active(unit)))return [];
   if(seeker&&(!PremiereGame.sides.every(actor=>confirmedPresence(actor,slot)===false)||
      allWeaponEntries().some(entry=>entry.slot===slot&&entry.card.type==='Character'&&entry.card.undercover&&!entry.unavailable)))return [];
   return [{card,index,slot,cost}];
  });
 });
}

function mineLayers(side,slot){
 return PremiereLocations.presentCards(state,side,slot).some(card=>PremiereWeapons.miningDroid(card)&&PremiereUnits.active(card)&&!PremiereUnits.textSuppressed(card));
}

function buryWeaponCard(side,index,slot){
 const {hand}=PremiereGame.zones(state,side);
 if(state.phase!==2||state.activeSide!==side||!isExteriorPlanetSite(state.locations[slot])||!mineLayers(side,slot)||!hand[index])return false;
 (state.buriedMines??=[]).push({side,slot,card:hand.splice(index,1)[0]});
 log(side+' vergräbt eine Karte bei '+state.locations[slot].name+'.');
 return true;
}

function mineTraffic(){
 return allWeaponEntries().filter(entry=>!entry.unavailable&&['Character','Starship','Vehicle'].includes(entry.card.type));
}

function noteMineTraversal(side,from,to,card){
 if(!state.buriedMines?.length)return;
 const order=boardLocationOrder(),a=order.indexOf(from),b=order.indexOf(to);
 state.mineTraversal={side,card,slots:order.slice(Math.min(a,b)+1,Math.max(a,b))};
}

function revealTrippedMines(before){
 const path=state.mineTraversal;
 delete state.mineTraversal;
 if(!state.buriedMines?.length||!before)return;
 const arrivals=new Map();
 for(const {side,slot,card} of mineTraffic())if(before.get(card)!==slot)arrivals.set(slot,{side});
 for(const slot of path?.slots??[])arrivals.set(slot,{side:path.side,crossing:path.card});
 state.buriedMines=state.buriedMines.filter(record=>{
  const arrival=arrivals.get(record.slot);
  if(!arrival)return true;
  log('Aufgedeckt bei '+state.locations[record.slot].name+' · '+record.card.name+'.');
  if(PremiereWeapons.mine(record.card))(state.mineQueue??=[]).push({...record,actor:arrival.side,crossing:arrival.crossing});
  else loseOwnedCard(record.card,record.side);
  return false;
 });
}

function explodeMine(side,slot,card,crossing){
 drawDestinySeries(side,'mine',1,0,draws=>{
  const pending={kind:'mine',card,slot,place:slot,crossing,side:PremiereGame.otherSide(side),remaining:PremiereBattle.total(draws)??0};
  log(card.name+' explodiert bei '+state.locations[slot].name+' · '+(draws.length?'Destiny '+pending.remaining:'Reserve Deck leer')+'.');
  if(pending.remaining>0&&automatedTargets(pending).length)state.automatedPending=pending;
 });
}

function settleTrippedMine(record,defused=false){
 loseOwnedCard(record.card,record.side);
 if(!defused&&PremiereWeapons.mine(record.card)&&record.actor!==record.side)explodeMine(record.side,record.slot,record.card,record.crossing);
}

function handleTrippedMine(side,defuse){
 const pending=state.automatedPending;
 if(pending?.kind!=='defuse'||pending.side!==side)return false;
 if(defuse){
  const {force,used}=PremiereGame.zones(state,side);
  if(!force.length||!mineLayers(side,pending.slot))return false;
  PremiereGame.moveTop(force,used);
  log(pending.card.name+' wird entschärft.');
 }
 state.automatedPending=null;
 settleTrippedMine(pending.record,defuse);
 return true;
}

function deployAutomated(side,index,slot){
 const move=automatedDeployOptions(side).find(choice=>choice.index===index&&choice.slot===slot);
 if(!move)return false;
 const {hand,force,used,board}=PremiereGame.zones(state,side),[card]=hand.splice(index,1);
 PremiereGame.moveTop(force,used,move.cost);
 card.controller=side;
 if(!PremiereWeapons.projector(card))card.tableSide=PremiereGame.otherSide(side);
 if(PremiereWeapons.mine(card))card.armedTurn=state.game?.timing.turn??0;
 board[slot].push(card);
 log(side+' legt '+card.name+' bei '+state.locations[slot].name+' aus ('+move.cost+' Force).');
 return true;
}

function seekerMoves(side){
 if(state.phase!==1||state.activeSide!==side)return [];
 const {force}=PremiereGame.zones(state,side);
 const entries=allWeaponEntries();
 return entries.flatMap((entry,index)=>{
  if(entry.unavailable||!PremiereWeapons.seeker(entry.card)||(entry.card.controller??entry.card.side)!==side)return [];
  const {card,slot:from}=entry,tableSide=card.tableSide??PremiereGame.otherSide(side);
  const moved=state.movedThisTurn?.includes(card),carrier=entry.carriers[0],origin=state.locations[from];
  const choices=[];
  const add=(to,cost,args,label,host)=>{
   if(cost<=(force?.length??0))choices.push({args,entry,to,from,cost,card,label,host});
  };
  if(carrier){
   if(isSite(origin))add(from,0,[index,from,'exit'],card.name+' verlässt '+carrier.name);
   if(!moved&&entry.carriers.length===1&&isSystem(origin))entries.forEach((target,i)=>{
    if(target.side===tableSide&&target.slot===from&&!target.carriers.length&&canDock(carrier,target.card,from)){
     add(from,1,[index,from,'dock',i],card.name+' transferiert zu '+target.card.name+' (1 Force)',target.card);
    }
   });
   if(!moved&&PremiereUnits.capital(carrier)&&isPlanetSystem(origin))state.locations.forEach((loc,to)=>{
    if(isExteriorPlanetSite(loc)&&sitePlanet(loc)===locationGroup(origin))add(to,1,[index,to,'shuttle'],card.name+' shuttelt nach '+loc.name);
   });
   return choices;
  }
  if(!moved)state.locations.forEach((loc,to)=>{
   if(!loc||!isSite(loc)||from===to)return [];
   const bay=PremiereLocations.conditions(state,from,tableSide);
   const transit=bay.dockingBay&&PremiereLocations.conditions(state,to,tableSide).dockingBay;
   const cost=transit?bay.transitCost:adjacentSites(from,to)?1:null;
   if(cost!==null)add(to,cost,[index,to],card.name+' → '+loc.name+' ('+cost+' Force)');
  });
  entries.forEach((target,i)=>{
   const host=target.card,loc=state.locations[target.slot];
   if(target.side!==tableSide||target.unavailable||target.carriers.length||!PremiereUnits.active(host))return;
   if(target.slot===from&&isSite(origin)&&['Vehicle','Starship'].includes(host.type)){
    add(from,0,[index,from,'embark',i],card.name+' steigt auf '+host.name,host);
   }else if(!moved&&PremiereUnits.capital(host)&&isExteriorPlanetSite(origin)&&isPlanetSystem(loc)&&sitePlanet(origin)===locationGroup(loc)){
    add(target.slot,1,[index,target.slot,'shuttle',i],card.name+' shuttelt zu '+host.name,host);
   }
  });
  return choices;
 });
}

function moveSeeker(side,...args){
 const move=seekerMoves(side).find(choice=>choice.args.length===args.length&&choice.args.every((value,i)=>value===args[i]));
 if(!move)return false;
 const {board,force,used}=PremiereGame.zones(state,side);
 if(!detachTableCard(move.entry.side,move.from,move.card))return false;
 if(move.host)PremiereUnits.add(move.host,move.card,'seeker',side);
 else board[move.to].push(move.card);
 if(!['embark','exit'].includes(args[2]))(state.movedThisTurn??=[]).push(move.card);
 PremiereGame.moveTop(force,used,move.cost);
 log(move.label+'.');
 return true;
}

function automatedTargets(pending){
 return allWeaponEntries().filter(entry=>!entry.unavailable&&entry.card.type==='Character'&&
  (pending.kind==='seeker'?PremiereLocations.physicalPlace(entry)===pending.place&&
  PremiereWeapons.seekerTarget(pending.card,entry.card,cardAbility(entry.card)):entry.side===pending.side&&
   (entry.slot===pending.slot||entry.card===pending.crossing||entry.carriers.includes(pending.crossing))));
}

function findAutomatedWeapons(){
 if(!state?.game||state.automatedPending||state.gameWinner||state.pendingForceLoss||state.pendingReserveSearch||
    state.game.timing.pending||PremiereGame.responseWindow(state.game))return;
 while(state.mineQueue?.length){
  const record=state.mineQueue.shift(),{side,slot,card,actor}=record;
  if(PremiereWeapons.mine(card)&&actor!==side&&state.activeSide===side&&mineLayers(side,slot)&&PremiereGame.zones(state,side).force.length){
   state.automatedPending={kind:'defuse',card,slot,side,record};
   return;
  }
  settleTrippedMine(record);
  if(state.automatedPending||PremiereGame.responseWindow(state.game))return;
 }
 applyWuher();
 const entries=allWeaponEntries();
 for(const entry of entries){
  const {card,slot}=entry;
  if(entry.unavailable)continue;
  const owner=card.controller??card.side;
  if(PremiereWeapons.mine(card)&&Number.isInteger(card.armedTurn)&&owner===state.activeSide&&card.armedTurn<state.game.timing.turn){
   loseTableCard(entry.side,slot,card);
   explodeMine(owner,slot,card);
   if(state.automatedPending||PremiereGame.responseWindow(state.game))return;
  }
  if(PremiereWeapons.seeker(card)){
   const pending={kind:'seeker',card,slot,place:PremiereLocations.physicalPlace(entry),side:owner,entry};
   const targets=automatedTargets(pending);
   if(targets.length){
    state.automatedPending=pending;
    if(targets.length===1){resolveAutomatedTarget(owner,0);findAutomatedWeapons();return;}
    else return;
   }
  }
 }
}

function applyWuher(){
 const entries=allWeaponEntries(),current=state.game.timing.turn;
 for(const {card,side,slot,unavailable} of entries){
  if(card.id!=='Dark:2834'||unavailable)continue;
  const cantina=locationTitle(state.locations[slot])==='tatooine: cantina';
  const phaseStart=state.phase===1&&state.activeSide===side&&card.wuherControlTurn!==current;
  if(!cantina&&!phaseStart)continue;
  if(phaseStart)card.wuherControlTurn=current;
  for(const target of entries){
   if(target.slot!==slot||(!cantina&&PremiereLocations.physicalPlace(target)!==slot)||
      (target.card.type!=='Weapon'&&!isDroid(target.card)))continue;
   if(loseTableCard(target.side,slot,target.card))log('Wuher · '+target.card.name+' geht verloren.');
  }
 }
}

function resolveAutomatedTarget(side,index){
 const pending=state.automatedPending;
 if(!pending||!Number.isInteger(index)||pending.side!==side)return false;
 const target=automatedTargets(pending)[index];
 if(!target||!loseTableCard(target.side,target.slot,target.card))return false;
 log(pending.card.name+' · '+target.card.name+' geht verloren.');
 if(pending.kind==='seeker'){
  loseTableCard(pending.entry.side,pending.slot,pending.card);
  state.automatedPending=null;
 }else if(--pending.remaining===0||!automatedTargets(pending).length)state.automatedPending=null;
 return true;
}

function deviceHosts(side,handIndex){
 const {hand,force,board}=PremiereGame.zones(state,side),device=hand?.[handIndex];
 const [rule]=activeCardRules(device,'device');
 const backpack=side==='Dark'&&device?.id==='Dark:2357';
 if((!rule&&!backpack)||(device.side&&device.side!==side)||(rule?.cost??0)>(force?.length??0))return [];
 return weaponMounts(side).filter(({host,slot,index})=>{
  if(backpack)return host.type==='Character'&&
   (currentGame()?.cardRulesVersion!==0||board[slot][index]===host)&&
   (characterTraits(host).some(trait=>/trooper/.test(trait))||/trooper/i.test(host.name??''))&&
   !host.attachments?.some(card=>card.id===device.id);
  if(rule.targets!=='starship-at-system-with-bay')return matchesRegisteredTarget(host,rule.targets);
  const loc=state.locations[slot];
  return host.type==='Starship'&&isSystem(loc)&&state.locations.some((site,bay)=>
   sitePlanet(site)===locationGroup(loc)&&PremiereLocations.conditions(state,bay,side).dockingBay);
 }).map(mount=>({...mount,cost:rule?.cost??0}));
}

function deployDevice(side,handIndex,slot,hostIndex){
 const option=deviceHosts(side,handIndex).find(choice=>choice.slot===slot&&choice.index===hostIndex);
 if(!option)return false;
 const {hand,force,used}=PremiereGame.zones(state,side),[device]=hand.splice(handIndex,1);
 PremiereGame.moveTop(force,used,option.cost);
 (option.host.attachments??=[]).push(device);
 log(side+' rüstet '+option.host.name+' mit '+device.name+' aus ('+option.cost+' Force).');
 return true;
}

function siteDroids(){
 return allWeaponEntries().filter(({card,slot,unavailable})=>!unavailable&&isDroid(card)&&
  state.locations[slot]&&isSite(state.locations[slot])&&!/immune to restraining bolt/i.test(card.gametext??''));
}

function boltDeployOptions(side,index){
 const {hand}=PremiereGame.zones(state,side),card=hand?.[index];
 if(!activeCardRules(card,'restrainDroid').length)return [];
 return siteDroids().flatMap((entry,targetIndex)=>PremiereUnits.restrainingBolt(entry.card)?[]:[{
  card,host:entry.card,hostSide:entry.side,cost:0,args:[index,entry.slot,targetIndex],
  label:card.name+' an '+entry.card.name+' ('+entry.side+' Side) anlegen',
 }]);
}

function deployBolt(side,...args){
 const option=boltDeployOptions(side,args[0]).find(choice=>choice.args.every((value,i)=>value===args[i]));
 if(!option)return false;
 const [card]=PremiereGame.zones(state,side).hand.splice(args[0],1);
 (option.host.attachments??=[]).push(card);
 log(option.label+'.');
 return true;
}

function deviceActions(side){
 if(!expandedCardRules()||state.activeSide!==side||![1,2].includes(state.phase))return [];
 const droids=siteDroids();
 if(state.phase===2)return droids.flatMap((source,sourceIndex)=>{
  const bolt=PremiereUnits.restrainingBolt(source.card);
  if((bolt?.owner??bolt?.side)!==side||!activeCardRules(bolt,'transferBolt').length)return [];
  return droids.flatMap((target,targetIndex)=>target.slot===source.slot&&target!==source&&!PremiereUnits.restrainingBolt(target.card)?[{
   args:['transferBolt',sourceIndex,targetIndex],site:source.slot,source,target,bolt,cost:0,
   label:'Restraining Bolt von '+source.card.name+' auf '+target.card.name+' ('+target.side+' Side) übertragen',
  }]:[]);
 });
 const opposing=PremiereGame.otherSide(side);
 const callers=PremiereLocations.entries(state,side).filter(({card,unavailable})=>!unavailable&&PremiereUnits.active(card)&&
  card.attachments?.some(item=>activeCardRules(item,'stealDroid').length));
 return droids.flatMap((target,targetIndex)=>{
  const bolt=PremiereUnits.restrainingBolt(target.card);
  const caller=callers.find(entry=>entry.slot===target.slot);
  return target.side===opposing&&bolt&&caller&&withinDeploymentLimit(target.card,side)?[{
   args:['stealDroid',targetIndex],site:target.slot,target,bolt,cost:0,
   label:'Caller · '+target.card.name+' mit '+caller.card.name+' übernehmen',
  }]:[];
 });
}

function performDeviceAction(side,...args){
 const option=deviceActions(side).find(choice=>choice.args.length===args.length&&choice.args.every((value,i)=>value===args[i]));
 if(!option)return false;
 const {source,target,bolt,site}=option;
 if(source){
  source.card.attachments.splice(source.card.attachments.indexOf(bolt),1);
  (target.card.attachments??=[]).push(bolt);
 }else{
  if(!detachTableCard(target.side,site,target.card))return false;
  target.card.attachments.splice(target.card.attachments.indexOf(bolt),1);
  PremiereGame.zones(state,bolt.owner??bolt.side).hand.push(bolt);
  target.card.controller=side;
  PremiereGame.zones(state,side).board[site].push(target.card);
 }
 log(option.label+'.');
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
 const frame={kind:'locationEffect',side,card,site:slot};
 if(state.game&&activeCardRules(card,'rotateLocation').length&&hasInterruptResponse(frame)){
  PremiereGame.openResponse(state.game,frame);
 }else placeRevolution(card,slot);
 return true;
}

function placeRevolution(card,slot){
 ((state.locationEffects??=[])[slot]??=[]).push({card});
 log(card.name+' vertauscht Force-Icons und Seiten des Spieltexts bei '+state.locations[slot].name+'.');
}

function placeLostPileEffect(effect){
 (state.lostPileEffects??=[]).push(effect);
 log(effect.card.name+' liegt bei der Lost Pile der '+effect.target+' Side. Der Stapel ist verdeckt.');
}

function deployLostPileEffect(side,index,target){
 const [card]=PremiereGame.zones(state,side).hand.splice(index,1);
 const effect={card,target},frame={kind:'lostPileEffect',side,...effect};
 if(state.game&&hasInterruptResponse(frame)){
  PremiereGame.openResponse(state.game,frame);
  log(side+' kündigt '+card.name+' für die Lost Pile der '+target+' Side an.');
 }else placeLostPileEffect(effect);
 return true;
}

function cancelLostPileEffect(effect){
 const index=state.lostPileEffects.indexOf(effect);
 if(index<0)return;
 state.lostPileEffects.splice(index,1);
 loseOwnedCard(effect.card,effect.card.side);
 log(effect.card.name+' wurde aufgehoben.');
}

function controlledLocationRule(side,event){
 for(const [site,loc] of state.locations.entries()){
  const rule=activeCardRules(loc,event).find(rule=>rule.printedSide===PremiereLocations.printedSide(state,site,side));
  if(rule&&PremiereLocations.control(state,side,site,cardAbility)===true)return {loc,rule};
 }
 return null;
}

function resolveLocationControlRules(){
 if(state.game.cardRulesVersion!==undefined&&state.game.cardRulesVersion<5)return;
 for(const side of PremiereGame.sides){
  const release=controlledLocationRule(side,'releasePrisoners');
  if(release){
   for(const actor of PremiereGame.sides){
    for(const {card,slot,carriers} of PremiereLocations.entries(state,actor)){
     if(card.type!=='Character'||!card.captured||!card.imprisoned||carriers.length||
        sitePlanet(state.locations[slot])!==release.rule.region)continue;
     const owner=card.owner??card.side??'Light';
     if(!detachTableCard(actor,slot,card))continue;
     delete card.captured;
     delete card.imprisoned;
     delete card.frozen;
     card.controller=owner;
     PremiereGame.zones(state,owner).board[slot].push(card);
     log(release.loc.name+' · '+card.name+' wird bei '+state.locations[slot].name+' befreit.');
    }
   }
  }
  const cancellation=controlledLocationRule(side,'cancelSiteDevice');
  if(cancellation)for(const site of state.locations.keys()){
   for(const effect of [...PremiereLocations.effectsAt(state,site)]){
    if(effect.card.type==='Device'&&locationTitle(effect.card)===cancellation.rule.name)cancelLocationEffect(site,effect);
   }
  }
 }
}

const tableEffectRule=card=>activeCardRules(card,'tableEffect')[0];

function tableEffectOptions(side){
 if(!state.game)return [];
 const {hand,force}=PremiereGame.zones(state,side),target=PremiereGame.otherSide(side);
 const waiver=controlledLocationRule(side,'freeNamedDeploy');
 return (hand??[]).flatMap((card,index)=>{
  const rule=tableEffectRule(card);
  if(!rule||card.side!==side||!withinDeploymentLimit(card,side))return [];
  const free=waiver?.rule.names.includes(locationTitle(card));
  const cost=free?0:rule.cost;
  return cost<=(force?.length??0)?[{args:[index],card,target,cost,
   label:card.name+' · '+target+' Side ('+cost+' Force)'+(free?' · Central Core':'')}]:[];
 });
}

function deployTableEffect(side,index){
 const option=tableEffectOptions(side).find(choice=>choice.args[0]===index);
 if(!option)return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 const [card]=hand.splice(index,1);
 PremiereGame.moveTop(force,used,option.cost);
 const frame={kind:'tableEffect',side,card,target:option.target};
 log(side+' kündigt '+option.label+' an.');
 if(hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else placeTableEffect(frame);
 return true;
}

function placeTableEffect({card,target}){
 (state.tableEffects??=[]).push({card,target});
 log(card.name+' liegt auf der '+target+' Side. Warriors dieser Seite kosten +1 Force.');
}

function cancelTableEffect(effect){
 const index=state.tableEffects.indexOf(effect);
 if(index<0)return;
 state.tableEffects.splice(index,1);
 loseOwnedCard(effect.card,effect.card.side);
 log(effect.card.name+' wurde aufgehoben.');
}

function namedTableCounter(card,target){
 return activeCardRules(card,'cancelTableEffect').some(rule=>rule.targets.includes(target.id));
}

function tableCancellationOptions(side){
 if(!state.tableEffects?.length)return [];
 const {hand}=PremiereGame.zones(state,side),ability=highestInterruptAbility(side);
 return (hand??[]).flatMap((card,index)=>state.tableEffects.flatMap((effect,effectIndex)=>{
  const named=namedTableCounter(card,effect.card);
  if(!named&&!(isAlter(card)&&ability&&alterTarget(effect.card)))return [];
  return [{args:[index,effectIndex],card,effect,named,ability,label:card.name+' · '+effect.card.name+' aufheben'}];
 }));
}

function initiateTableCancellation(side,index,effectIndex){
 const option=tableCancellationOptions(side).find(choice=>choice.args[0]===index&&choice.args[1]===effectIndex);
 if(!option)return false;
 const [card]=PremiereGame.zones(state,side).hand.splice(index,1);
 PremiereGame.openResponse(state.game,{kind:'interrupt',interrupt:option.named?'namedCounter':'alter',
  counterMode:option.named?'direct':'destiny',side,card,ability:option.ability,tableEffect:option.effect,duringBattle:!!battleSession});
 log(side+' spielt '+option.label+'.');
 return true;
}

function initiateAlterLostPileEffect(side,index,effectIndex){
 const [card]=PremiereGame.zones(state,side).hand.splice(index,1);
 const targetEffect=state.lostPileEffects[effectIndex];
 PremiereGame.openResponse(state.game,{kind:'interrupt',interrupt:'alter',side,card,targetEffect,ability:highestInterruptAbility(side),
  counterMode:expandedCardRules()?'destiny':undefined});
 log(side+' spielt '+card.name+' gegen '+targetEffect.card.name+' bei der '+targetEffect.target+' Side.');
 return true;
}

const locationEffectRule=card=>activeCardRules(card,'locationEffect')[0];

function kesselRunBlocked(site){
 const loc=state.locations[site];
 return activeCardRules(loc,'blockKesselRun').some(rule=>PremiereGame.sides.some(side=>
  PremiereLocations.printedSide(state,site,side)===rule.printedSide&&PremiereLocations.control(state,side,site,cardAbility)===true));
}

function missionTargets(mission,side){
 return PremiereLocations.entries(state,side).flatMap(({card,slot,carriers,unavailable},targetIndex)=>{
  if(unavailable)return [];
  const loc=state.locations[slot];
  if(mission==='death-star-plans')return isDroid(card)&&locationGroup(loc)!=='death star'?[{target:card,targetIndex}]:[];
  if(mission==='desperate-hour')return card.type==='Character'&&card.subType==='Rebel'&&locationGroup(loc)==='tatooine'?
   [{target:card,targetIndex}]:[];
  const smuggler=characterTraits(card).includes('smuggler')||activeCardRules(card,'kesselSmuggler').length>0;
  return smuggler&&isPlanetSystem(loc)&&carriers.some(ship=>ship.type==='Starship'&&PremiereUnits.active(ship))?
   [{target:card,targetIndex,origin:slot,parsec:loc.parsec}]:[];
 });
}

function locationEffectOptions(side,index){
 const {hand,force}=PremiereGame.zones(state,side),card=hand?.[index],rule=locationEffectRule(card);
 if(!rule||card.side!==side||rule.cost>(force?.length??0)||!withinDeploymentLimit(card,side))return [];
 const targets=rule.mission?missionTargets(rule.mission,side):[];
 return state.locations.flatMap((loc,site)=>{
  if(!loc)return [];
  if(rule.siteDevice)return isSite(loc)&&loc.locationTags?.includes(rule.requiredTag)?
   [{card,cost:rule.cost,args:[index,site],label:card.name+' bei '+loc.name+' auslegen ('+rule.cost+' Force)'}]:[];
  if(rule.nightfall)return isPlanetSystem(loc)?[{card,cost:0,args:[index,site],label:loc.name+' · Nachtbedingungen an den Sites'}]:[];
  if(rule.iconBonus)return [{card,cost:0,args:[index,site],label:loc.name+' · +1 Force-Icon pro Seite'}];
  if(rule.mission==='kessel-run'){
   if(!isPlanetSystem(loc)||locationGroup(loc)!=='kessel'||kesselRunBlocked(site))return [];
   return targets.filter(target=>target.origin!==site).map(({target,targetIndex,origin,parsec})=>{
    const distance=Math.abs(loc.parsec-parsec);
    return {card,cost:0,target,origin,distance,args:[index,site,targetIndex],
     label:target.name+' · '+state.locations[origin].name+' ↔ '+loc.name+' ('+distance+' Force zurückholen)'};
   });
  }
  if(rule.mission==='desperate-hour'){
   if(!isPlanetSystem(loc)||locationGroup(loc)!=='alderaan')return [];
   return targets.map(({target,targetIndex})=>({card,cost:0,target,args:[index,site,targetIndex],
    label:loc.name+' · '+target.name+' als Ziel'}));
  }
  if(sitePlanet(loc)!=='death star'||PremiereLocations.conditions(state,site,side).dockingBay)return [];
  return targets.map(({target,targetIndex})=>({card,cost:0,target,args:[index,site,targetIndex],label:loc.name+' · '+target.name+' als Ziel'}));
 });
}

function placeLocationEffect({card,site,target,origin,distance}){
 if(activeCardRules(card,'rotateLocation').length){placeRevolution(card,site);return;}
 const rule=locationEffectRule(card);
 const effect={card};
 if(target)Object.assign(effect,{target,targetInstanceId:target.instanceId,plansCollected:false,origin,distance});
 else if(rule.siteDevice)Object.assign(effect,{siteDevice:rule.siteDevice,requiredTag:rule.requiredTag,deployedTurn:state.game.timing.turn});
 else if(rule.nightfall)effect.nightfall=true;
 else effect.iconBonus=rule.iconBonus;
 ((state.locationEffects??={})[site]??=[]).push(effect);
 log(card.name+' wird bei '+state.locations[site].name+(target?' mit '+target.name+' als Ziel':'')+' ausgelegt.');
}

function deployLocationEffect(side,index,site,targetIndex){
 const args=targetIndex===undefined?[index,site]:[index,site,targetIndex];
 const option=locationEffectOptions(side,index).find(choice=>choice.args.length===args.length&&choice.args.every((arg,i)=>arg===args[i]));
 if(!option)return false;
 const {hand,force,used}=PremiereGame.zones(state,side),[card]=hand.splice(index,1);
 if(option.cost)PremiereGame.moveTop(force,used,option.cost);
 const frame={kind:'locationEffect',side,card,site,target:option.target,origin:option.origin,distance:option.distance};
 if(state.game&&hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else placeLocationEffect(frame);
 return true;
}

function resolveDroidDetectors(){
 if(!state.game||!expandedCardRules())return;
 for(const site of state.locations.keys()){
  const detector=PremiereLocations.effectsAt(state,site).find(effect=>effect.siteDevice==='droid-detector'&&
   state.game.timing.turn>effect.deployedTurn);
  if(!detector)continue;
  for(const side of PremiereGame.sides)for(const card of PremiereLocations.presentCards(state,side,site)){
   if(isDroid(card)&&loseTableCard(side,site,card))log(detector.card.name+' · '+card.name+' geht verloren.');
  }
 }
}

function initiateAlterLocationEffect(side,index,site,effectIndex){
 const [card]=PremiereGame.zones(state,side).hand.splice(index,1);
 const targetEffect=state.locationEffects[site][effectIndex];
 PremiereGame.openResponse(state.game,{kind:'interrupt',interrupt:'alter',side,card,site,targetEffect,ability:highestInterruptAbility(side),
  counterMode:expandedCardRules()?'destiny':undefined});
 log(side+' spielt '+card.name+' gegen '+targetEffect.card.name+' bei '+state.locations[site].name+'.');
 return true;
}

function cancelLocationEffect(site,effect){
 const row=state.locationEffects?.[site],index=row?.indexOf(effect)??-1;
 if(index<0)return;
 row.splice(index,1);
 loseOwnedCard(effect.card,effect.card.side);
 log(effect.card.name+' wurde aufgehoben.');
}

function retrieveLocationMission(site,effect,count){
 const side=effect.card.side;
 for(const card of PremiereGame.retrieveForce(state,side,count??0)){
  log(side+' holt '+card.name+' mit '+effect.card.name+' zurück.');
 }
 cancelLocationEffect(site,effect);
}

function progressKesselRun(site,effect,target){
 const ship=target.carriers.find(card=>card.type==='Starship'&&PremiereUnits.active(card));
 if(!ship)return;
 if(effect.reachedKessel){
  if(target.slot===effect.origin)retrieveLocationMission(site,effect,effect.distance);
  return;
 }
 if(target.slot!==site)return;
 const opponent=PremiereGame.otherSide(effect.card.side);
 drawDestinySeries(opponent,'kesselRun',1,0,draws=>{
  if(draws.some(draw=>!draw.cancelled&&draw.value===0)){
   loseTableCard(target.side,site,ship);
   log('Kessel Run · Destiny 0. '+ship.name+' geht verloren.');
   cancelLocationEffect(site,effect);
   return;
  }
  effect.reachedKessel=true;
  log(effect.target.name+' hat Kessel erreicht. Rückkehr nach '+state.locations[effect.origin].name+'.');
 });
}

function progressLocationMissions(){
 if(!state.locationEffects||state.automatedPending||state.pendingForceLoss||state.pendingReserveSearch||battleSession||
    PremiereGame.responseWindow(state.game)||state.game?.timing.pending)return;
 for(const [site, row] of state.locations.entries()){
  if(!row)continue;
  for(const effect of [...PremiereLocations.effectsAt(state,site)]){
   const mission=locationEffectRule(effect.card)?.mission;
   if(!mission)continue;
   if(mission==='kessel-run'&&kesselRunBlocked(site)){cancelLocationEffect(site,effect);continue;}
   const target=PremiereLocations.findEntry(state,effect.target);
   if(!target){cancelLocationEffect(site,effect);continue;}
   if(target.unavailable)continue;
   if(mission==='kessel-run'){progressKesselRun(site,effect,target);continue;}
   if(mission==='desperate-hour'){
    const carrier=target.carriers[0],role=carrier?.occupants?.find(entry=>entry.card===target.card)?.role;
    if(target.slot===site&&(!carrier||target.carriers.length===1&&['pilot','passenger','astromech'].includes(role)&&PremiereUnits.active(carrier))){
     const amount=PremiereLocations.activeCards(state,effect.card.side).reduce((total,card)=>{
      if(card.type!=='Character'||!PremiereUnits.active(card))return total;
      const ability=cardAbility(card);
      return total+(ability>=4?2:ability===3?1:0);
     },0);
     retrieveLocationMission(site,effect,amount);
    }
    continue;
   }
   if(target.slot===site&&!effect.plansCollected){
    effect.plansCollected=true;
    log(effect.target.name+' hat die Todessternpläne geholt.');
   }
   if(!effect.plansCollected||sitePlanet(state.locations[target.slot])!=='yavin 4')continue;
   drawDestinySeries(effect.card.side,'deathStarPlans',3,0,draws=>retrieveLocationMission(site,effect,PremiereBattle.total(draws)));
  }
 }
}

const lostRetrieval = new Map([
 ['Light:1102',{cost:1,names:['han solo']}], ['Light:1500',{cost:1,names:['leia organa']}],
 ['Light:1600',{cost:1,names:['luke skywalker']}], ['Light:2105',{cost:1,names:['obi-wan kenobi']}],
 ['Dark:2528',{cost:2,names:['darth vader','grand moff tarkin','admiral motti','general tagge']}]
]);

const shufflePileNames={deck:'Reserve Deck',used:'Used Pile',lost:'Lost Pile'};
function shuffleOptions(side){
 if(!state.game)return [];
 const {hand}=PremiereGame.zones(state,side);
 return (hand??[]).flatMap((card,index)=>{
  if(!activeCardRules(card,'shufflePile').length)return [];
  return PremiereGame.sides.flatMap(target=>Object.entries(shufflePileNames).flatMap(([zone,name])=>
   PremiereGame.zones(state,target)[zone].length?[{card,args:[index,target,zone],cost:0,label:card.name+' · '+target+' '+name+' mischen'}]:[]));
 });
}

function playShuffle(side,index,target,zone){
 const choice=shuffleOptions(side).find(option=>option.args[0]===index&&option.args[1]===target&&option.args[2]===zone);
 if(!choice)return false;
 PremiereGame.zones(state,side).hand.splice(index,1);
 const frame={kind:'interrupt',interrupt:'shufflePile',side,card:choice.card,target,zone,duringBattle:!!battleSession};
 log(choice.label+'.');
 if(hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else settleShuffle(frame);
 return true;
}

function settleShuffle(frame){
 if(!frame.cancelled){
  const pile=PremiereGame.zones(state,frame.target)[frame.zone];
  pile.splice(0,pile.length,...PremiereGame.shuffle(pile,state.game));
  PremiereGame.zones(state,frame.side).used.push(frame.card);
 }else loseOwnedCard(frame.card,frame.side);
 if(frame.duringBattle)finishWeaponAction(frame.side,false);
}

function namedRetrievalOptions(side){
 const {hand,force,deck,lost}=PremiereGame.zones(state,side);
 return (hand??[]).flatMap((card,index)=>{
  const rule=lostRetrieval.get(card.id);
  if(!rule||card.side!==side||force.length<rule.cost)return [];
  const retrieve=lost.flatMap((target,slot)=>rule.names.includes(locationTitle(target))?
   [{kind:'retrieve',args:[index,slot],card,target,cost:rule.cost,
    label:card.name+' · '+target.name+' zurückholen ('+rule.cost+' Force)'}]:[]);
  const searchCost=rule.cost+2;
  if(state.game&&deck?.length&&force.length>=searchCost)retrieve.push({
   kind:'searchReserve',args:[index],card,cost:searchCost,
   label:card.name+' · Reserve Deck durchsuchen ('+searchCost+' Force)'});
  return retrieve;
 });
}

function playRetrieval(side,kind,...args){
 const choice=namedRetrievalOptions(side).find(entry=>entry.kind===kind&&entry.args.every((value,i)=>value===args[i]));
 if(!choice)return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 hand.splice(args[0],1);
 PremiereGame.moveTop(force,used,choice.cost);
 const frame={...choice,kind:'interrupt',interrupt:'retrieve',side,search:kind==='searchReserve',duringBattle:!!battleSession};
 log(side+' spielt '+choice.card.name+' ('+choice.cost+' Force).');
 if(state.game&&hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else settleRetrieval(frame);
 return true;
}

function settleRetrieval(frame){
 if(!frame.cancelled&&frame.search){
  state.pendingReserveSearch=frame;
  return;
 }
 if(!frame.cancelled){
  const {lost}=PremiereGame.zones(state,frame.side);
  const retrieved=PremiereGame.retrieveCard(state,frame.side,lost.indexOf(frame.target));
  if(retrieved)log(frame.side+' holt '+retrieved.name+' in die Used Pile.');
 }
 loseOwnedCard(frame.card,frame.side);
 if(frame.duringBattle&&battleSession?.weaponTurn===frame.side)finishWeaponAction(frame.side,false);
}

function reserveSearchChoices(frame){
 const {deck}=PremiereGame.zones(state,frame.side);
 const rule=lostRetrieval.get(frame.card.id);
 const eligible=deck.filter(card=>rule.names.includes(locationTitle(card)));
 return eligible.length?eligible.map((card,index)=>({args:[index],card,label:card.name+' aufdecken und auf die Hand nehmen'})):
  [{args:[null],label:'Suche beenden und mischen'}];
}

function finishReserveSearch(index){
 const frame=state.pendingReserveSearch;
 const choice=reserveSearchChoices(frame).find(option=>option.args[0]===index);
 if(!choice)return false;
 const {deck,hand}=PremiereGame.zones(state,frame.side);
 if(choice.card){
  hand.push(...deck.splice(deck.indexOf(choice.card),1));
  log(frame.side+' deckt '+choice.card.name+' auf und nimmt die Karte auf die Hand.');
 }else log(frame.side+' findet keine passende Karte.');
 const shuffled=PremiereGame.shuffle(deck,state.game);
 deck.splice(0,deck.length,...shuffled);
 log(frame.side+' mischt das Reserve Deck.');
 state.pendingReserveSearch=null;
 loseOwnedCard(frame.card,frame.side);
 if(frame.duringBattle&&battleSession?.weaponTurn===frame.side)finishWeaponAction(frame.side,false);
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

function botDeploymentChoice(available){
 const units=available.filter(option=>['deploy','deployWithPilot'].includes(option.kind));
 const weapons=available.filter(option=>option.kind==='equip'&&!option.host.weapons?.length);
 const devices=available.filter(option=>option.kind==='deployDevice'||(option.kind==='deployBolt'&&option.hostSide==='Light'));
 const automated=available.filter(option=>option.kind==='deployAutomated');
 if(!strategicBot()){
  return weapons.sort((a,b)=>Number(b.contested)-Number(a.contested)||a.cost-b.cost)[0]??
   devices[0]??automated[0]??units.find(option=>option.kind==='deployWithPilot')??units[0];
 }
 const positions=new Map();
 const score=option=>{
  const slot=option.args[1],cost=option.cost,budget=state.botForce.length-cost;
  if(!positions.has(slot))positions.set(slot,botPosition(slot));
  const site=positions.get(slot);
  if(option.kind==='equip'){
   const targets=PremiereLocations.presentCards(state,'Light',slot).filter(PremiereUnits.active);
   const canFire=budget>=2&&targets.some(target=>{
    const defense=PremiereWeapons.defense(target,cardAbility(target),craftStats(target,slot));
    const shot=PremiereWeapons.shot(option.card,option.host,target,cardAbility(option.host),defense);
    return shot&&shot.cost+1<=budget;
   });
   return site.dark===true&&site.light===true&&canFire?3-cost*0.4:budget>=2?0.8-cost*0.4:-1;
  }
  if(option.kind==='deployBolt')return 2.6;
  if(option.kind==='deployDevice'||option.kind==='deployAutomated'){
   if(option.host?.attachments?.some(card=>card.id===option.card.id))return -1;
   return option.kind==='deployDevice'?1.2-cost*0.5:1-cost*0.5;
  }
  const unit=botUnitStrength(option.ship??option.card,slot,option.pilot),after=site.darkPower+unit.power-site.lightPower;
  const takesControl=site.dark!==true&&site.light===false&&unit.ability+(site.darkAbility??0)>=1;
  const contests=site.light===true?(after>=1?2.5:after< -2?-2:0.5):0;
  const destiny=(site.darkAbility??0)<4&&(site.darkAbility??0)+unit.ability>=4?1.5:0;
  const reserve=cost>0&&budget===0&&state.botHand.length<=3&&!takesControl?1.5:0;
  return 0.8+Math.min(unit.power,6)*0.55+Math.min(unit.ability,4)*0.4-cost*0.7+contests+destiny-reserve+
   (takesControl?3+site.drain*1.5:0);
 };
 const best=[...units,...weapons,...devices,...automated].map(option=>({option,score:score(option)}))
  .sort((a,b)=>b.score-a.score)[0];
 return best?.score>0?best.option:undefined;
}

function botDeployPhase(){
 if(!state||state.phase!==2||state.activeSide!=='Dark'||!state.botTurn)return [];
 const actions=[],maxActions=state.botHand.length;
 for(let k=0;k<maxActions;k++){
  const available=legalActions(state,'Dark'),own=PremiereGame.zones(state,'Dark');
  const tableEffect=available.find(action=>action.kind==='deployTableEffect');
  if(tableEffect){
   if(!performAction(tableEffect))break;
   actions.push(tableEffect.card.name+' auslegen ('+tableEffect.cost+' Force)');
   if(PremiereGame.responseWindow(state.game))break;
   continue;
  }
  const pileTarget=PremiereGame.lostPileFaceDown(state,'Dark')?'Light':'Dark';
  const pileEffect=available.find(action=>action.kind==='deployLostPileEffect'&&action.target===pileTarget);
  if(pileEffect&&!PremiereGame.lostPileFaceDown(state,pileTarget)){
   if(!performAction(pileEffect))break;
   actions.push(pileEffect.card.name+' für die Lost Pile der '+pileTarget+' Side');
   continue;
  }
  const locationEffect=available.find(action=>action.kind==='deployLocationEffect'&&confirmedPresence('Dark',action.args[1])===true&&
   !PremiereLocations.effectsAt(state,action.args[1]).some(effect=>effect.card.id===action.card.id));
  if(locationEffect){
   if(!performAction(locationEffect))break;
   actions.push(locationEffect.card.name+' bei '+state.locations[locationEffect.args[1]].name);
   if(PremiereGame.responseWindow(state.game))break;
   continue;
  }
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
  const option=botDeploymentChoice(available);
  if(!option)break;
  const deployed=performAction(option);
  if(!deployed)break;
  if(['equip','deployDevice','deployBolt'].includes(option.kind)){
   actions.push(option.host.name+' erhält '+option.card.name+(option.kind==='equip'?' ('+option.cost+' Force)':''));
   continue;
  }
  if(option.kind==='deployAutomated'){
   actions.push(option.card.name+' auslegen');
   if(state.automatedPending)break;
   continue;
  }
  const label=deployed.card.type==='Vehicle'?'Fahrzeug':deployed.card.type==='Starship'?'Raumschiff':'Charakter';
  actions.push(label+' '+deployed.card.name+' bei '+deployed.loc.name+' ('+deployed.cost+' Force)');
 }
 return actions;
}

function botSay(message){state.botReason=message;log(message)}

function botPlan(){return ['activate','control','deploy','battle','move','draw','finish'].map(kind=>({kind}))}

function botBegin(){
 state.botTurn={steps:botPlan(),index:0};
 state.botHistory=[];
 botSay('Dark Side beginnt ihren Zug.');
}

function botNextStep(repeatPhase=true,adaptive=true){
 if(!state?.botTurn||state.gameWinner)return false;
 const window=PremiereGame.responseWindow(state.game);
 if(window||state.game?.timing.pending||state.automatedPending)return performAction(legalActions(state,'Dark')[0]);
 if(state.pendingForceLoss||state.pendingReserveSearch||battleSession)return false;
 const deferred=state.botTurn.decision;
 const duel=legalActions(state,'Dark').find(option=>option.kind==='duel');
 if(!deferred&&duel&&performAction(duel))return true;
 const action=deferred?{kind:deferred}:state.botTurn.steps[state.botTurn.index];
 if(!deferred&&action?.kind==='deploy'&&state.phase===1&&botDrain())return true;
 if(repeatPhase&&!deferred){
  const continued=action?.kind==='move'&&state.phase===3?botBattle(legalActions(state,'Dark'),adaptive):
   action?.kind==='draw'&&state.phase===4?botMove():false;
  if(continued){publishGame();return true;}
 }
 if(!action||!requestAction(deferred?'botDecision':'botStep','Dark',[action.kind]))return false;
 if(state.game?.timing.pending||state.automatedPending)return true;
 const available=legalActions(state,'Dark');
 if(action.kind==='move'){
  if(!botMove(available))botSay('Move: Bot passt, keine vorteilhafte bezahlbare Bewegung.');
 }else if(action.kind==='battle'){
  if(!botBattle(available,adaptive))botSay(adaptive&&available.some(option=>option.kind==='battle')?
   'Battle: Bot passt. Nach Power, erwarteter Battle Destiny und sichtbaren Waffen fehlt ein Vorteil.':
   'Battle: Kein legaler Kampf mit Presence beider Seiten und 1 Force verfügbar.');
 }else if(action.kind==='draw'){
  if(adaptive)botDraw();
  else{
   const choice=available.find(x=>x.kind==='draw');
   const drawn=choice&&performAction(choice)?1:0;
   botSay('Draw Phase: Bot zieht '+drawn+' Karte aus seiner Force Pile. Seine Hand enthält jetzt '+state.botHand.length+' Karten.');
  }
 }else if(action.kind==='activate'){
  const choice=available.filter(x=>x.kind==='activate').at(-1);
  if(choice&&performAction(choice))botSay('Activate: Bot aktiviert '+choice.args[0]+' Force. Jetzt verfügbar: '+state.botForce.length+'.');
 }else if(action.kind==='control'){
  const cancel=available.find(option=>option.kind==='cancelTableEffect'&&option.effect.target==='Dark');
  if(cancel&&performAction(cancel))return true;
  const steal=available.find(option=>option.kind==='deviceAction'&&option.args[0]==='stealDroid');
  if(steal)performAction(steal);
  const retrieval=available.find(option=>option.kind==='retrieve')??available.find(option=>option.kind==='searchReserve');
  if(retrieval)requestAction(retrieval.kind,'Dark',retrieval.args);
  const seeker=legalActions(state,'Dark').find(option=>option.kind==='moveSeeker');
  if(seeker)requestAction('moveSeeker','Dark',seeker.args);
  if(!botDrain())botSay('Control: Keine weitere Location erlaubt einen Force Drain.');
 }else if(action.kind==='deploy'){
  const actions=botDeployPhase();
  botSay(actions.length?'Deploy: '+actions.join('; ')+'.':'Deploy: Bot passt.');
 }
 publishGame();
 return true;
}
function botMove(available=legalActions(state,'Dark')){
 const best=available.filter(option=>option.kind==='move').map(option=>({option,score:botMoveScore(option)}))
  .sort((a,b)=>b.score-a.score)[0];
 if(!best||best.score<=0||!performAction(best.option))return false;
 const choice=best.option;
 botSay('Move: Bot bewegt '+choice.name+' für '+choice.cost+' Force zu '+state.locations[choice.to].name+' ('+choice.movementKind+').');
 return true;
}
const estimatedDestiny=2.5;

function botWeaponPressure(side,slot){
 const opponent=PremiereGame.otherSide(side);
 const {force,deck}=PremiereGame.zones(state,side);
 const budget=(force?.length??0)-(side==='Dark'?1:0);
 if(!deck?.length||budget<0)return 0;
 const targets=PremiereLocations.presentCards(state,opponent,slot).filter(PremiereUnits.active);
 const hosts=PremiereLocations.presentCards(state,side,slot).filter(PremiereUnits.active);
 let pressure=0;
 for(const host of hosts){
  if(PremiereWeapons.disarmed(host)||(host.type==='Starship'&&!craftStats(host,slot).powered))continue;
  for(const weapon of host.weapons??[]){
   if(!PremiereUnits.canUseWeapon(state,host,weapon))continue;
   for(const target of targets){
    const defense=PremiereWeapons.defense(target,cardAbility(target),craftStats(target,slot));
    const shot=PremiereWeapons.shot(weapon,host,target,cardAbility(host),defense);
    if(!shot||shot.cost>budget||shot.effect==='block')continue;
    const margin=estimatedDestiny*Math.min(shot.draws,deck.length)+shot.bonus-defense;
    pressure=Math.max(pressure,margin>0?1.5:margin>=-1?0.5:0);
   }
  }
 }
 return pressure;
}

function botBattleEstimate(slot,adaptive){
 const {darkPower,lightPower,darkAbility,lightAbility}=battleTotals(slot);
 if(!adaptive)return darkPower-lightPower;
 const darkDraws=Math.min(state.botDeck?.length??0,battleDestinyDrawCount('Dark',slot,darkAbility,'Dark')??0);
 const lightDraws=Math.min(state.deck?.length??0,battleDestinyDrawCount('Light',slot,lightAbility,'Dark')??0);
 const darkBonus=vaderBattleDestinyBonus('Dark',slot),useLocation=(currentGame()?.cardRulesVersion??latestCardRulesVersion)>=2;
 return darkPower-lightPower+darkDraws*(estimatedDestiny+darkBonus-(useLocation?alderaanBattleDestinyPenalty('Dark',slot):0))-
  lightDraws*(estimatedDestiny-(useLocation?alderaanBattleDestinyPenalty('Light',slot):0))+
  botWeaponPressure('Dark',slot)-botWeaponPressure('Light',slot);
}

function botBattle(available,adaptive){
 const best=available.filter(option=>option.kind==='battle')
  .map(option=>({option,margin:botBattleEstimate(option.args[0],adaptive)}))
  .sort((a,b)=>b.margin-a.margin)[0];
 if(!best||(adaptive&&best.margin<1))return false;
 const choice=best.option;
 if(!performAction(choice))return false;
 botSay('Battle: Bot initiiert einen Kampf bei '+state.locations[choice.args[0]].name+' für 1 Force. Dark Side hat die erste Aktion in jedem Kampfsegment.');
 botDestinyDecision();
 return true;
}

function botDraw(){
 const {hand,force}=PremiereGame.zones(state,'Dark');
 const hasPresence=state.locations.some((location,slot)=>location&&confirmedPresence('Dark',slot)===true);
 const hasReinforcement=hand.some(card=>
  (isDeployableCharacter(card)&&cardAbility(card)>0)||(card.type==='Starship'&&permanentPilotAbility(card)!==null));
 const handGoal=hasPresence?(hasReinforcement?3:4):5;
 const needed=Math.max(handGoal-hand.length,(!hasPresence&&!hasReinforcement)?2:0);
 const lifeReserve=!hasPresence&&!hasReinforcement?1:2;
 const maxDraw=Math.max(0,Math.min(needed,force.length,lifeForceRemaining('Dark')-lifeReserve));
 let drawn=0;
 while(drawn<maxDraw){
  const draw=legalActions(state,'Dark').find(option=>option.kind==='draw');
  if(!draw||!performAction(draw))break;
  drawn++;
 }
 const count=drawn===1?'1 Karte':drawn+' Karten';
 if(drawn)botSay('Draw Phase: Bot zieht '+count+(hasPresence?' für seine Hand.':' für den Wiederaufbau.')+' Hand: '+hand.length+' Karten.');
 else botSay('Draw Phase: Bot behält seine Force. '+(needed>0?'Force Pile oder Life Force begrenzen das Nachziehen.':'Die Hand ist ausreichend gefüllt.'));
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
  resolveDroidDetectors();
  recirculateBoth();
  if(side==='Dark')botSay('Bot beendet seinen Lernzug.');
  PremiereGame.resetTurn(state,PremiereGame.otherSide(side));
  state.log=[];
  if(side==='Light')botBegin();
  else {state.turn++;state.botTurn=null;log('Light Side beginnt mit Activate.');}
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
 const lightPresent=PremiereLocations.presentCards(state,'Light',i),darkPresent=PremiereLocations.presentCards(state,'Dark',i);
 const cards=(side,present)=>present.filter(card=>card.type!=='Weapon'&&card.type!=='Device'&&
  PremiereUnits.active(card)&&(!battleSession?.segmented||battleSession.site!==i||battleSession.participants[side].includes(card)));
 const power=(cards,side,present)=>{
  const jungle=cards.reduce((total,card)=>total+jungleBonus(card,side,i,cards),0);
  return cards.reduce((n,c)=>n+(['Starship','Vehicle'].includes(c.type)?craftStats(c,i).power:(c.power??0))+cardPowerModifier(c,side,i,present),
   jungle+fleetPowerAtSite(side,i)+tuskenGroupPower(present));
 };
 const light=cards('Light',lightPresent),dark=cards('Dark',darkPresent);
 return {lightPower:power(light,'Light',lightPresent),darkPower:power(dark,'Dark',darkPresent),lightAbility:ability(light),darkAbility:ability(dark)};
}

function jungleBonus(card,side,slot,participants){
 const rule=PremiereLocations.ruleAt(state,slot,side,'aloneInJungle');
 if(!rule||card.subType!==rule.subtype||!PremiereUnits.active(card))return 0;
 const legacy=(currentGame()?.cardRulesVersion??latestCardRulesVersion)<rule.since;
 const alone=legacy?participants.length===1:PremiereLocations.entries(state,side).every(entry=>
  entry.slot!==slot||entry.card===card||entry.unavailable||!PremiereUnits.active(entry.card)||
  (entry.card.type!=='Character'&&!(cardAbility(entry.card)>0)));
 return alone?rule.amount:0;
}

function fleetPowerAtSite(side,slot){
 const region=sitePlanet(state.locations[slot]);
 if(!region)return 0;
 return state.locations.reduce((total,loc,system)=>{
  if(!loc||!isSystem(loc)||!activeCardRules(loc,'fleetPower').some(rule=>rule.region===region)||
     PremiereLocations.control(state,side,system,cardAbility)!==true)return total;
  return total+PremiereLocations.presentCards(state,side,system).filter(ship=>ship.type==='Starship'&&PremiereUnits.active(ship)).length;
 },0);
}

function battleCandidates(side,slot){
 const {board}=PremiereGame.zones(state,side);
 function units(card){
  if(!PremiereUnits.active(card)||card.excludedFromBattle||card.cannotBattle||['Weapon','Device','Effect'].includes(card.type))return [];
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
   battleDrawSucceeded:{Light:false,Dark:false},hitUnits:{Light:[],Dark:[]}});
  refreshBattleParticipants();
 }
 log(side+' initiiert Battle bei '+state.locations[i].name+' (1 Force → Used Pile).');
 const prophetess=side==='Dark'&&state.game&&PremiereLocations.presentCards(state,side,i)
  .find(card=>card.id==='Dark:1958'&&PremiereUnits.active(card));
 if(prophetess)battleSession.prediction={card:prophetess,winner:null};
 else beginBattleResponses();
 publishGame();return true;
}

function beginBattleResponses(){
 const {initiator,site}=battleSession;
 if(!openReactWindow('battle',initiator,site))enterBattleSegments();
}

function chooseBattlePrediction(winner){
 battleSession.prediction.winner=winner;
 log('Prophetess sagt einen Sieg der '+winner+' Side voraus.');
 beginBattleResponses();
 return true;
}

function botPredictionAction(offers){
 if(!battleSession?.prediction)return null;
 const {lightPower,darkPower}=battleTotals(battleSession.site);
 return offers.find(action=>action.kind==='battlePrediction'&&action.args[0]===(darkPower>=lightPower?'Dark':'Light'));
}
function enterBattleSegments(){
 checkpoint('battle:start',()=>{
  refreshBattleParticipants();
  const x=battleSession;
  if(x.segmented)x.segment='weapons';
  if(battleWeaponOptions('Light').length||battleWeaponOptions('Dark').length||
     (x.segmented&&PremiereGame.sides.some(side=>duelOptions(side).length||namedRetrievalOptions(side).length||shuffleOptions(side).length||tableCancellationOptions(side).length||
      battleEffectOptions(side).length||weaponEffectOptions(side).some(option=>option.args[0]==='overload'))))x.weaponTurn=x.initiator;
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
  if(clause[1].toLowerCase()===PremiereLocations.printedSide(state,siteIndex,side).toLowerCase()){
   return PremiereLocations.ruleAt(state,siteIndex,side,'minimumBattleAbility')?.amount??Number(clause[2]);
  }
 }
 return 4;
}
// This bonus applies to each actual Dark Side battle destiny draw; not weapon destiny or skips.

function alderaanBattleDestinyPenalty(side,siteIndex){
 const loc=state.locations[siteIndex],opponent=PremiereGame.otherSide(side);
 const printed=PremiereLocations.printedSide(state,siteIndex,opponent);
 const rule=activeCardRules(loc,'opponentBattleDestiny').find(rule=>rule.printedSide===printed);
 return rule?-rule.amount:0;
}

function vaderBattleDestinyBonus(side,siteIndex){
 if(side!=='Dark')return 0;
 const units=battleSession?.segmented?activeBattleUnits(side):state?.dark?.[siteIndex]??[];
 return Math.max(0,...units.flatMap(card=>/When in battle, adds 1 to each of your battle destiny draws/i.test(card.gametext||'')?
  activeCardRules(card,'battleDestiny').map(rule=>rule.amount):[]));
}

function printedBattleDestiny(card){
 return card&&isLoc(card)?0:PremiereBattle.printedDestiny(card);
}
// Two printed Premiere War Room effects grant an additional battle destiny
// to the side that initiated battle here. These are actual Reserve Deck draws.

function printedWarRoomExtraBattleDestiny(side,siteIndex,initiator=battleSession?.initiator){
 const loc=state?.locations?.[siteIndex];
 if(initiator!==side||!isSite(loc))return 0;
 const printed=PremiereLocations.printedSide(state,siteIndex,side);
 const rule=PremiereCardRules.effects(loc,'extraBattleDestiny').find(rule=>rule.printedSide===printed);
 const pattern=new RegExp('(?:^|[.!?]\\s+)'+printed+':\\s*If you initiate a battle here, add one battle destiny(?:[.!?]|$)','i');
 return rule&&pattern.test(loc.gametext??'')?rule.amount:0;
}

function duelOptions(side){
 if(side!=='Dark'||!state.game||!state.botForce?.length)return [];
 const copies=state.botHand.flatMap((card,index)=>card.id==='Dark:2517'?[{card,index}]:[]);
 if(!copies.length)return [];
 return state.locations.flatMap((loc,site)=>{
  if(!isSite(loc))return [];
  const character=(player,name)=>PremiereLocations.presentCards(state,player,site)
   .find(card=>card.type==='Character'&&locationTitle(card)===name&&PremiereUnits.active(card)&&Number.isFinite(card.power));
  const vader=character('Dark','darth vader'),obi=character('Light','obi-wan kenobi');
  if(!vader||!obi)return [];
  return copies.map(({card,index})=>({args:[index,site],card,site,vader,obi,
   label:card.name+' · Duell bei '+loc.name+' (1 Force)'}));
 });
}

function registerDuelTiming(){
 PremiereGame.registerTrigger(state.game,{id:'premiere-duel',side:'Dark',scope:'game',event:'phase:priority',
  label:'Bot-Aktion zeigen',
  when:()=>state.activeSide==='Light'&&duelOptions('Dark').length>0,
  resolve(){playDuel('Dark',...duelOptions('Dark')[0].args);}});
}

function playDuel(side,...args){
 const choice=duelOptions(side).find(entry=>entry.args.every((value,i)=>value===args[i]));
 if(!choice)return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 hand.splice(args[0],1);
 PremiereGame.moveTop(force,used);
 const frame={...choice,kind:'interrupt',interrupt:'duel',side,duringBattle:!!battleSession};
 log(choice.card.name+' · Vader und Obi-Wan duellieren sich bei '+state.locations[choice.site].name+'.');
 if(hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else settleDuel(frame);
 return true;
}

function settleDuel(frame){
 if(!frame.cancelled){
  const power=(card,side)=>card.power+cardPowerModifier(card,side,frame.site)+
   ((card.weapons??[]).some(weapon=>PremiereWeapons.definition(weapon)?.saber)?2:0);
  const dark=power(frame.vader,'Dark'),light=power(frame.obi,'Light');
  const result='Duell · Vader '+dark+' / Obi-Wan '+light;
  if(dark===light)log(result+' · Gleichstand.');
  else{
   const loser=dark<light?frame.vader:frame.obi,side=dark<light?'Dark':'Light';
   if(loseTableCard(side,frame.site,loser,true))log(result+' · '+loser.name+' ist aus dem Spiel.');
  }
 }
 loseOwnedCard(frame.card,frame.side);
 if(frame.duringBattle&&battleSession?.weaponTurn===frame.side)finishWeaponAction(frame.side,false);
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
 if(hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
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

function battleDestinyDrawCount(side,siteIndex,ability,initiator=battleSession?.initiator){
 if(!Number.isFinite(ability))return null; // Unknown ability cannot justify an assumed draw.
 const required=minimumBattleDestinyAbility(side,siteIndex);
 const own=PremiereGame.zones(state,side).board?.[siteIndex]??[];
 const matching=new Map([['Light:2060','Light:239'],['Light:1045','Light:799'],['Light:1677','Light:1098'],['Light:1050','Light:1924'],['Light:2057','Light:2067'],['Dark:247','Dark:790'],['Dark:249','Dark:791']]);
 const backup=own.some(ship=>craftStats(ship,siteIndex).powered&&ship.occupants?.some(entry=>entry.role==='pilot'&&
  entry.card.id===matching.get(ship.id)&&PremiereUnits.active(entry.card)));
 const regular=ability>=required||backup?1:0;
 return regular+printedWarRoomExtraBattleDestiny(side,siteIndex,initiator)+(battleSession?.extraDraws?.[side]??0);
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
 if(side!==frame.side&&members.some(card=>activeCardRules(card,'cancelBattleDraw').length)&&members.some(card=>card.id==='Dark:634')&&
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
 const vaderBonus=vaderBattleDestinyBonus(side,x.site);
 const alderaanPenalty=alderaanBattleDestinyPenalty(side,x.site);
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
 if(!x.nightDestinyScheduled){
  x.nightDestinyScheduled=true;
  const nightCount=new Set(PremiereLocations.nightEffectsAt(state,x.site).map(effect=>effect.card.id)).size;
  if(nightCount){
   const first=x.initiator;
   const draws=[first,PremiereGame.otherSide(first)].map(side=>({side,purpose:'power',count:nightCount}));
   x.additionalDestinies=[...draws,...(x.additionalDestinies??[])];
  }
 }
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
 if(x.prediction?.winner){
  const result=battleDamagePreview();
  const winner=result.darkTotal>result.lightTotal?'Dark':result.lightTotal>result.darkTotal?'Light':null;
  if(winner===x.prediction.winner){
   const {lost}=PremiereGame.zones(state,'Dark');
   const retrieved=lost.length&&PremiereGame.retrieveCard(state,'Dark',Math.floor(PremiereGame.random(state.game)*lost.length));
   log('Prophetess hat richtig vorhergesagt'+(retrieved?' und holt eine zufällige verlorene Karte zurück.':'.'));
  }else{
   log('Prophetess hat den Ausgang des Battle falsch vorhergesagt.');
   beginForceLoss('Dark',1,{reason:'prediction',locationIndex:x.site});
  }
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

function battleWeaponOptions(side,timing='weapons'){
 const x=battleSession;
 if(!x||x.resolved||state?.phase!==3||x.lightCard!==null||x.darkCard!==null)return [];
 const opponent=PremiereGame.otherSide(side),{force}=PremiereGame.zones(state,side);
 const targets=weaponTargets(opponent,x.site);
 return weaponMounts(side).flatMap(mount=>{
  const {host,slot:from,place}=mount;
  if(PremiereWeapons.disarmed(host)||x.blockedWeapons?.includes(host))return [];
  if(!x.segmented&&!PremiereUnits.usesMultipleWeapons(host)&&state.weaponUsersThisTurn?.includes(host))return [];
  return mountWeapons(mount).flatMap((weapon,weaponIndex)=>{
   const rule=PremiereWeapons.definition(weapon);
   if(!rule||weapon.side!==side||(rule.timing??'weapons')!==timing)return [];
   if(x.repeatingWeapon?x.repeatingWeapon!==weapon:x.usedWeapons?.includes(weapon))return [];
   if(!PremiereUnits.canUseWeapon(state,host,weapon))return [];
   if(host.type==='Starship'&&!craftStats(host,from).powered)return [];
   const external=from!==x.site;
   if(external&&(!rule.adjacent||place!==from||!adjacentSites(from,x.site)))return [];
   if(!external&&x.segmented&&!x.participants[side].includes(host)&&!rule.projector&&!isLoc(host))return [];
   if(rule.generator&&!PremiereLocations.presentCards(state,side,place).some(unit=>isPowerDroid(unit)||
      unit.characteristics?.includes('fusion generator')||/^portable fusion generator$/i.test(unit.name??'')))return [];
   return targets.flatMap(({card:target,index:targetIndex,place:targetPlace})=>{
    if(external?targetPlace!==x.site:targetPlace!==place)return [];
    const defense=PremiereWeapons.defense(target,cardAbility(target),craftStats(target,x.site));
    const shot=PremiereWeapons.shot(weapon,host,target,cardAbility(host),defense);
    if(!shot||shot.cost>force.length)return [];
    const args=[mount.index,weaponIndex,targetIndex];
    if(external)args.push(from);
    return [{...shot,host,weapon,target,targetIndex,args,hostIndex:mount.index,weaponIndex,from}];
   });
  });
 });
}

function weaponTargets(side,slot){
 const x=battleSession,roots=PremiereGame.zones(state,side).board?.[slot]??[];
 return PremiereLocations.entries(state,side).filter(entry=>entry.slot===slot).flatMap((entry,index)=>{
  const target=entry.card,automated=PremiereWeapons.projector(target)||PremiereWeapons.seeker(target);
  if(entry.unavailable||(!PremiereUnits.active(target)&&!automated))return [];
  if(x?.segmented&&!x.participants[side].includes(target)&&!automated)return [];
  const root=roots.indexOf(target);
  return [{card:target,index:root>=0?root:roots.length+index,place:PremiereLocations.physicalPlace(entry)}];
 });
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
 if(battleSession.repeatingWeapon){
  log(side+' beendet das wiederholte Feuern.');
  battleSession.repeatingWeapon=null;
  finishWeaponAction(side,false);
  return true;
 }
 log(side+' passt im Waffen-Segment.');
 finishWeaponAction(side,true);
 return true;
}

function fireBattleWeapon(side,...args){
 if(!battleSession||battleSession.weaponTurn!==side)return false;
 const shot=battleWeaponOptions(side).find(option=>option.args.length===args.length&&option.args.every((value,i)=>value===args[i]));
 if(!shot)return false;
 const x=battleSession;
 shootWeapon(side,shot,()=>{
  x.repeatingWeapon=shot.repeats?shot.weapon:null;
  if(x.repeatingWeapon&&battleWeaponOptions(side).length){
   x.weaponPassed=false;
   publishGame();
  }else{
   x.repeatingWeapon=null;
   finishWeaponAction(side,false);
  }
 });
 return true;
}

function markWeaponFired(shot){
 const x=battleSession;
 (state.weaponUsersThisTurn??=[]).push(shot.host);
 PremiereUnits.recordWeaponUse(state,shot.host,shot.weapon);
 if(x){
  (x.usedWeapons??=[]).push(shot.weapon);
  x.lastHit=null;
 }
}

function shootWeapon(side,shot,complete){
 const x=battleSession,{force,used}=PremiereGame.zones(state,side);
 const slot=shot.targetSlot??x.site,opponent=PremiereGame.otherSide(side);
 PremiereGame.moveTop(force,used,shot.cost);
 markWeaponFired(shot);
 const sourceBonus=PremiereLocations.ruleAt(state,shot.from,side,'weaponDestiny')?.amount??0;
 drawDestinySeries(side,'weapon',shot.draws,sourceBonus,draws=>{
  const valid=draws.filter(draw=>!draw.cancelled);
  const sum=PremiereBattle.total(draws),total=valid.length&&sum!==null?Math.max(0,sum+shot.bonus):null;
  const hit=total!==null&&total>shot.defense;
  log(side+' feuert '+shot.weapon.name+' auf '+shot.target.name+' ('+shot.cost+' Force). Waffen-Destiny: '+
   (draws.length?draws.map(draw=>draw.card.name+(draw.cancelled?' (aufgehoben)':'')).join(', ')+' · '+(total??'unbekannt'):'Reserve Deck leer')+
   ' gegen Verteidigung '+shot.defense+' → '+(hit?(shot.effect==='ion'?'Ionenschaden':'Treffer'):'kein Treffer')+'.');
  if(hit)applyWeaponResult(shot,opponent,slot);
  complete();
 });
}

function combinedAttackOptions(side,shots,request,offer){
 if(side!=='Light'||!state.game)return [];
 const {hand,force}=PremiereGame.zones(state,side);
 const attacks=hand.flatMap((card,index)=>card.id==='Light:483'?[{card,index}]:[]);
 if(!attacks.length)return [];
 const targets=new Map();
 for(const shot of shots){
  if(shot.host.type!=='Starship'||shot.weapon.subType!=='Starship'||shot.target.type!=='Starship')continue;
  if(!targets.has(shot.targetIndex))targets.set(shot.targetIndex,[]);
  targets.get(shot.targetIndex).push(shot);
 }
 const options=[];
 for(const [targetIndex,choices] of targets){
  const compatible=(a,b)=>a.host!==b.host||PremiereUnits.usesMultipleWeapons(a.host);
  if(!choices.some((a,i)=>choices.slice(i+1).some(b=>compatible(a,b)&&a.cost+b.cost<=force.length)))continue;
  for(const {card,index} of attacks){
   const base=[index,targetIndex];
   const choosing=request?.kind==='combinedAttack'&&base.every((value,i)=>value===request.args?.[i]);
   let plan;
   if(choosing){
    const selected=request.args.slice(2);
    plan=selected.map(choice=>Number.isInteger(choice)&&choices[choice]);
    if(plan.length<2||new Set(selected).size!==selected.length||plan.some(shot=>!shot)||
       plan.reduce((sum,shot)=>sum+shot.cost,0)>force.length||
       plan.some((a,i)=>plan.slice(i+1).some(b=>!compatible(a,b))))continue;
   }
   options.push(offer('combinedAttack',choosing?request.args:base,{card,target:choices[0].target,choices,plan}));
  }
 }
 return options;
}

function playCombinedAttack(side,args,card,shots){
 if(!shots)return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 hand.splice(args[0],1);
 for(const shot of shots)PremiereGame.moveTop(force,used,shot.cost);
 const frame={kind:'interrupt',interrupt:'combinedAttack',site:battleSession.site,side,card,shots};
 log(side+' spielt '+card.name+' gegen '+shots[0].target.name+' und bezahlt '+shots.reduce((sum,shot)=>sum+shot.cost,0)+' Force.');
 if(hasInterruptResponse(frame))PremiereGame.openResponse(state.game,frame);
 else settleCombinedAttack(frame);
 return true;
}

function settleCombinedAttack(frame){
 const {shots,side,site}=frame;
 const complete=()=>{
  loseOwnedCard(frame.card,side);
  finishWeaponAction(side,false);
 };
 if(frame.cancelled){complete();return;}
 for(const shot of shots)markWeaponFired(shot);
 let total=0,drawn=false,known=true;
 function draw(index){
  if(index===shots.length){
   const attacks=known&&drawn?Math.max(0,total):null;
   for(const shot of shots){
    const hit=attacks!==null&&attacks>shot.defense;
    log(shot.weapon.name+' · Combined Attack '+(attacks??'–')+' gegen Verteidigung '+shot.defense+' · '+(hit?'Treffer':'kein Treffer')+'.');
    if(hit)applyWeaponResult(shot,'Dark',site);
   }
   complete();
   return;
  }
  const shot=shots[index];
  drawDestinySeries(side,'weapon',shot.draws,0,draws=>{
   if(draws.some(draw=>!draw.cancelled)){
    const value=PremiereBattle.total(draws);
    drawn=true;
    known&&=value!==null;
    if(value!==null)total+=value+shot.bonus;
   }
   draw(index+1);
  });
 }
 draw(0);
}

function applyWeaponResult(shot,opponent,slot){
 const x=battleSession,target=shot.target;
 if(shot.effect==='ion'){
  for(const weapon of [...(target.weapons??[])].filter(card=>card.subType==='Starship')){
   target.weapons.splice(target.weapons.indexOf(weapon),1);
   loseOwnedCard(weapon,opponent);
  }
  target.ionDamage=true;
  log(target.name+' verliert seine Schiffswaffen. Verteidigungswert und Hyperspeed fallen auf 0.');
 }else if(shot.effect==='block'){
  (x.blockedWeapons??=[]).push(target);
  log(target.name+' kann in diesem Battle keine Waffen verwenden.');
 }else if(shot.effect==='destroy'||!x){
  loseTableCard(opponent,slot,target);
 }else{
  if(shot.effect==='zero')(x.zeroForfeit??=[]).push(target);
  const roots=PremiereGame.zones(state,opponent).board[slot];
  const index=roots.indexOf(target);
  const hits=((x.hitUnits??={Light:[],Dark:[]})[opponent]);
  if(!hits.includes(target))hits.push(target);
  if(index>=0)recordBattleWeaponHit(opponent,index);
  else log(target.name+' ist getroffen: verpflichtender Forfeit im Damage-Segment.');
  x.lastHit={side:opponent,card:target};
 }
}

function botWeaponAction(){
 if(battleSession?.weaponTurn!=='Dark')return null;
 const hitTargets=battleSession.hitUnits?.Light??[];
 const available=legalActions(state,'Dark');
 const options=available.filter(x=>x.kind==='fireWeapon'&&!hitTargets.includes(x.target)&&state.botDeck.length);
 let choice;
 if(strategicBot()){
  const scored=options.map(option=>{
   const margin=estimatedDestiny*Math.min(option.draws,state.botDeck.length)+option.bonus-option.defense;
   const chance=Math.max(0,Math.min(1,0.5+margin/6));
   const payoff=2+(option.target.power??0)*0.5+(cardAbility(option.target)??0)*0.3;
   return {option,score:chance*payoff-option.cost*0.7};
  }).sort((a,b)=>b.score-a.score)[0];
  if(scored?.score>0)choice=scored.option;
 }else{
  options.sort((a,b)=>(b.target.power??0)-(a.target.power??0)||a.defense-a.bonus-b.defense+b.bonus||a.cost-b.cost);
  choice=options[0];
 }
 return available.find(x=>x.kind==='duel')??choice??
  available.find(x=>['battleEffect','weaponEffect','retrieve','searchReserve'].includes(x.kind)||(x.kind==='cancelTableEffect'&&x.effect.target==='Dark'))??available.find(x=>x.kind==='passWeapons');
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
 let limit=PremiereUnits.textSuppressed(card)?0:printedAttritionImmunityBelow(card)??0;
 const members=activeBattleUnits(side);
 const pilots=(card.occupants??[]).filter(entry=>entry.role==='pilot'&&PremiereUnits.active(entry.card)).map(entry=>locationTitle(entry.card));
 if(!PremiereUnits.textSuppressed(card)&&craftStats(card,x.site).powered){
  if(card.id==='Light:1677'&&pilots.some(name=>/^(han solo|chewbacca|lando calrissian)$/.test(name)))limit=Math.max(limit,5);
  if(card.id==='Dark:2700'&&pilots.includes('darth vader'))limit=Math.max(limit,4);
  if(PremiereUnits.capital(card)&&card.occupants?.some(entry=>entry.card.id==='Dark:1989'&&PremiereUnits.active(entry.card)&&
     !PremiereUnits.textSuppressed(entry.card)))limit=Math.max(limit,3);
 }
 if(card.id==='Dark:12'&&rules.night&&!PremiereUnits.textSuppressed(card))return Infinity;
 if(jungleBonus(card,side,x.site,members))return Infinity;
 const attachments=card.attachments??[];
 if(attachments.some(effect=>effect.id==='Light:1810'))limit=Math.max(limit,5);
 if(site.locationTags?.includes('Planet')&&attachments.some(device=>device.id==='Dark:2357'))limit=Math.max(limit,3);
 const {board}=PremiereGame.zones(state,side);
 const mechanic=unit=>['Light:2785','Dark:2783'].includes(unit.id)&&PremiereUnits.active(unit)&&!PremiereUnits.textSuppressed(unit);
 if((card.type==='Vehicle'||isDroid(card))&&(board?.[x.site]??[]).some(mechanic))limit=Math.max(limit,2);
 if(PremiereUnits.fighter(card)&&isPlanetSystem(site)&&state.locations.some((loc,slot)=>loc&&sitePlanet(loc)===locationGroup(site)&&
   PremiereLocations.conditions(state,slot,side).dockingBay&&(board?.[slot]??[]).some(mechanic)))limit=Math.max(limit,3);
 if(rules.night&&characterTraits(card).some(trait=>/rebel|alien/.test(trait))&&members.some(unit=>unit.id==='Light:2'&&!PremiereUnits.textSuppressed(unit))&&
    PremiereLocations.effectsAt(state,x.site).some(effect=>effect.card.id==='Light:1196'))limit=Math.max(limit,3);
 return limit;
}

function battleForfeitValue(card,side){
 if(battleSession.zeroForfeit?.includes(card))return 0;
 const base=card.battleForfeit??card.forfeit;
 if(!Number.isFinite(base))return null;
 const {site:slot}=battleSession,loc=state.locations[slot];
 let modifier=(card.battleForfeitModifier??0)+registeredLocationModifier('forfeit',card,side,slot)+deviceCharacterModifier(card,loc);
 modifier+=registeredCharacterModifier('characterForfeit',card,slot);
 if(isExteriorPlanetSite(loc)&&matchesRegisteredTarget(card,'jawa')){
  const crawlers=PremiereGame.sides.reduce((total,actor)=>total+PremiereLocations.presentCards(state,actor,slot).filter(PremiereUnits.crawler).length,0);
  modifier+=currentGame()?.cardRulesVersion===0?crawlers:Math.min(crawlers,1);
 }
 for(const [index,location] of state.locations.entries()){
  for(const rule of PremiereCardRules.effects(location,'warRoomForfeit')){
   if(matchesRegisteredTarget(card,rule.targets)&&PremiereGame.sides.some(player=>
     PremiereLocations.printedSide(state,index,player)===rule.printedSide&&
     PremiereLocations.control(state,player,index,cardAbility)===true&&
     PremiereLocations.presentCards(state,player,index).some(unit=>characterTraits(unit).includes('leader'))))modifier+=rule.amount;
  }
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
  const hits=(x.hitUnits?.[side]??(x.weaponHits[side]??[]).map(index=>board[x.site][index])).filter(card=>activeBattleUnits(side).includes(card));
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
 return loseTableCard(side,battleSession.site,card);
}

function loseOwnedCard(card,fallback){
 const owner=card.owner??card.side??fallback;
 PremiereGame.zones(state,owner).lost.push(card);
 if(PremiereGame.lostPileFaceDown(state,owner))log(card.name+' geht offen verloren und wird anschließend verdeckt abgelegt.');
}

function loseTableCard(side,slot,card,outOfPlay=false){
 if(!detachTableCard(side,slot,card))return false;
 PremiereUnits.remove(card,unit=>{
  if(outOfPlay&&unit===card)(state.outOfPlay??=[]).push(unit);
  else loseOwnedCard(unit,side);
 },passenger=>{
  const controller=passenger.controller??side;
  PremiereGame.zones(state,controller).board[slot].push(passenger);
  log(passenger.name+' steigt vom verlorenen Bantha ab.');
 });
 return true;
}

function detachTableCard(side,slot,card){
 const {board}=PremiereGame.zones(state,side);
 function detach(row){
  const index=row.findIndex(entry=>(entry.card??entry)===card);
  if(index>=0){row.splice(index,1);return true;}
  return row.some(entry=>{
   const unit=entry.card??entry;
   return [unit.occupants,unit.weapons,unit.attachments].some(children=>children?.length&&detach(children));
  });
 }
 return detach(board?.[slot]??[])||detach(state.locationWeapons?.[slot]??[]);
}

function useGaderffii(side,...args){
 const frame=PremiereGame.responseWindow(state.game);
 if(frame?.kind!=='battle'||frame.priority!==side)return false;
 const shot=battleWeaponOptions(side,'initiation').find(item=>item.args.length===args.length&&item.args.every((value,i)=>value===args[i]));
 if(!shot)return false;
 frame.priority=PremiereGame.otherSide(side);
 frame.passes=0;
 shootWeapon(side,shot,()=>{});
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
  log(side+' verliert '+forceLossDescription(side,args[0],card)+' für Battle Damage.');
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
   PremiereUnits.remove(card,unit=>loseOwnedCard(unit,side),passenger=>{
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
  const dantooine=card.type==='Starship'&&PremiereLocations.ruleAt(state,window.site,side,'shipReact');
  if(!dantooine&&!['Light:2250','Dark:191','Light:1548','Dark:1547','Light:1609','Light:2307','Dark:2660'].includes(card.id))return [];
  return travelOptions(card,side,from,window.site,true).filter(option=>option.cost<=force.length)
   .map(option=>({from,index,card,cost:option.cost,movement:option.kind}));
 }));
}

function reactDeployOptions(side,window){
 if(!window||window.cancelled||!['battle','drain'].includes(window.kind)||side===window.side)return [];
 const {hand,board}=PremiereGame.zones(state,side),loc=state.locations[window.site];
 const withinRange=slot=>slot===window.site||adjacentSites(slot,window.site);
 const czSource=(board??[]).some((row,slot)=>withinRange(slot)&&
  PremiereLocations.presentCards(state,side,slot).some(card=>PremiereUnits.active(card)&&card.id==='Light:593'&&!PremiereUnits.textSuppressed(card)));
 const comlinkHost=czSource?null:PremiereLocations.entries(state,side).find(({card,slot,unavailable})=>
  !unavailable&&card.type==='Character'&&PremiereUnits.active(card)&&withinRange(slot)&&
  (window.comlinkHost===card||!state.comlinkUsedBy?.includes(card))&&
  card.attachments?.some(device=>activeCardRules(device,'device').some(rule=>rule.deployReact)))?.card;
 if(!loc||(!czSource&&!comlinkHost))return [];
 return (hand??[]).flatMap((card,index)=>{
  if(state.cancelledReactTitles?.includes(locationTitle(card))||jawaCosts.has(card.id))return [];
  const cost=boardDeployCost(card,loc,side);
  const options=cost===null?[]:[{card,index,cost,args:[index,-1]}];
  return options.concat(deployPilotOptions(side,index,window.site).map(pilot=>
   ({card,index,cost:pilot.cost,args:[index,pilot.index],pilot:pilot.pilot})),
   weaponPlacementOptions(side,card,window.site).map(option=>
    ({card,index,cost:option.cost,args:[index,-1,option.hostIndex],mount:option.mount}))).map(option=>({...option,comlinkHost}));
 });
}

function openReactWindow(kind,side,site,bonus){
 if(!state.game)return false;
 const frame={kind,side,site,bonus};
 const opponent=PremiereGame.otherSide(side);
 const stick=kind==='battle'&&PremiereGame.sides.some(actor=>battleWeaponOptions(actor,'initiation').length);
 if(!stick&&!reactOptions(opponent,frame).length&&!reactDeployOptions(opponent,frame).length&&!hasInterruptResponse(frame))return false;
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
  }else if(frame.interrupt==='combinedAttack'){
   settleCombinedAttack(frame);
  }else if(frame.interrupt==='duel'){
   settleDuel(frame);
  }else if(frame.interrupt==='retrieve'){
   settleRetrieval(frame);
  }else if(frame.interrupt==='shufflePile'){
   settleShuffle(frame);
  }else if(frame.interrupt==='overload'){
   resolveOverload(frame);
  }else if(frame.interrupt==='assault'){
   PremiereGame.cancelResponse(game,parent);
   resolveAssault(frame,parent.side);
  }else{
   const {used,lost}=PremiereGame.zones(state,frame.side);
   const complete=cancelled=>{
    (frame.interrupt==='namedCounter'?lost:used).push(frame.card);
    if(cancelled){
     if(frame.tableEffect)cancelTableEffect(frame.tableEffect);
     else if(frame.targetEffect&&Number.isInteger(frame.site))cancelLocationEffect(frame.site,frame.targetEffect);
     else if(frame.targetEffect)cancelLostPileEffect(frame.targetEffect);
     else PremiereGame.cancelResponse(game,parent);
    }
    settleCancelledResponse(game);
    if(frame.duringBattle)finishWeaponAction(frame.side,false);
   };
   if(frame.counterMode==='direct'||(!frame.counterMode&&parent?.kind==='interrupt'&&['sense','alter'].includes(parent.interrupt)))complete(true);
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
    if(frame.mount){
     const stillPresent=weaponMounts(frame.side).find(mount=>mount.slot===frame.site&&mount.host===frame.mount.host);
     if(stillPresent&&!PremiereWeapons.disarmed(stillPresent.host))attachWeapon(stillPresent,frame.card);
     else loseOwnedCard(frame.card,frame.side);
    }else{
     frame.card.controller=frame.side;
     if(frame.pilot)PremiereUnits.add(frame.card,frame.pilot,'pilot',frame.side);
     board[frame.site].push(frame.card);
     (state.deployedThisTurn??=[]).push(frame.card);
    }
   }else{
    board[frame.site].push(...board[frame.from].splice(index,1));
    if(frame.movement==='Landspeed')noteMineTraversal(frame.side,frame.from,frame.site,frame.card);
   }
   log(frame.side+' · '+frame.card.name+' reagiert bei '+state.locations[frame.site].name+'.');
   const parent=PremiereGame.responseWindow(game);
   if(parent.kind==='drain'&&confirmedPresence(frame.side,frame.site)===true){
    PremiereGame.cancelResponse(game,parent);
    log('Force Drain aufgehoben: Der React hat Presence an den Ort gebracht.');
   }
  }
 }else if(frame.kind==='lostPileEffect'&&!frame.cancelled){
  placeLostPileEffect({card:frame.card,target:frame.target});
 }else if(frame.kind==='locationEffect'&&!frame.cancelled){
  placeLocationEffect(frame);
 }else if(frame.kind==='tableEffect'&&!frame.cancelled){
  placeTableEffect(frame);
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
 if(['lostPileEffect','locationEffect','tableEffect'].includes(cancelled?.kind)){
  loseOwnedCard(cancelled.card,cancelled.side);
  log(cancelled.card.name+' wurde beim Ausspielen aufgehoben.');
 }
 if(cancelled?.kind==='interrupt'){
  if(cancelled.interrupt==='battleEffect')settleBattleEffect(cancelled);
  else if(cancelled.interrupt==='combinedAttack')settleCombinedAttack(cancelled);
  else if(cancelled.interrupt==='duel')settleDuel(cancelled);
  else if(cancelled.interrupt==='retrieve')settleRetrieval(cancelled);
  else if(cancelled.interrupt==='shufflePile')settleShuffle(cancelled);
  else{
   PremiereGame.zones(state,cancelled.side).lost.push(cancelled.card);
   if((cancelled.interrupt==='overload'||cancelled.duringBattle)&&battleSession?.weaponTurn)finishWeaponAction(cancelled.side,false);
  }
  log(cancelled.card.name+' wurde aufgehoben und kommt in den Lost Pile.');
 }
 if(cancelled?.kind==='react'&&cancelled.deploy){
  loseOwnedCard(cancelled.card,cancelled.side);
  if(cancelled.pilot)loseOwnedCard(cancelled.pilot,cancelled.side);
  (state.cancelledReactTitles??=[]).push(locationTitle(cancelled.card));
 }
}

function initiateReact(side,from,index){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=reactOptions(side,window).find(x=>x.from===from&&x.index===index);
 if(!option)return false;
 const {force,used}=PremiereGame.zones(state,side);
 if(!PremiereGame.answer(game,side,{kind:'react',site:window.site,from,card:option.card,movement:option.movement}))return false;
 PremiereGame.moveTop(force,used,option.cost);
 (state.reactedThisTurn??=[]).push(option.card,...(option.card.occupants??[]).map(entry=>entry.card));
 if(option.card.instanceId)PremiereGame.useOnce(game,'turn','react:'+option.card.instanceId);
 log(side+' initiiert einen React mit '+option.card.name+' für '+option.cost+' Force.');
 return true;
}

function initiateReactDeploy(side,index,pilotIndex,hostIndex){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=reactDeployOptions(side,window).find(choice=>choice.index===index&&choice.args[1]===pilotIndex&&choice.args[2]===hostIndex);
 if(!option||!PremiereGame.answer(game,side,{kind:'react',deploy:true,site:window.site,card:option.card,pilot:option.pilot,mount:option.mount}))return false;
 const {hand,force,used}=PremiereGame.zones(state,side);
 for(const i of [index,pilotIndex].filter(i=>i>=0).sort((a,b)=>b-a))hand.splice(i,1);
 PremiereGame.moveTop(force,used,option.cost);
 if(option.comlinkHost&&window.comlinkHost!==option.comlinkHost){
  window.comlinkHost=option.comlinkHost;
  (state.comlinkUsedBy??=[]).push(option.comlinkHost);
 }
 (state.reactedThisTurn??=[]).push(option.card,...(option.pilot?[option.pilot]:[]));
 log(side+' kündigt '+option.card.name+' als Deploy-React an ('+option.cost+' Force).');
 return true;
}

const isAlter=card=>['Light:95','Dark:94'].includes(card.id);
const isSense=card=>['Light:2217','Dark:2216'].includes(card.id);
const alterTarget=card=>card?.type==='Effect'&&!/immune to alter\b/i.test(card.gametext??'')&&
 !['Starting','Immediate','Political'].includes(card.subType);

function highestInterruptAbility(side){
 return Math.max(0,...PremiereLocations.activeCards(state,side)
  .filter(card=>card.type==='Character'&&!card.undercover).map(card=>cardAbility(card)??0));
}

function interruptResponses(side,window){
 if(!window||window.cancelled)return [];
 if(expandedCardRules()){
  const counter=counterResponses(side,window);
  if(counter)return counter;
 }
 if(side===window.side)return [];
 const {force,hand}=PremiereGame.zones(state,side);
 if(window.kind==='drain'){
  const id=side==='Light'?'Light:2385':'Dark:575';
  if(!force?.length)return [];
  return (hand??[]).flatMap((card,index)=>card.id===id?[{kind:'assault',card,index,cost:1}]:[]);
 }
 const effectWindow=['lostPileEffect','locationEffect'].includes(window.kind);
 const kind=effectWindow?'alter':window.kind==='react'?'sense':window.kind==='interrupt'?window.interrupt==='sense'?'alter':'sense':null;
 if(!kind)return [];
 const requiresDestiny=effectWindow||window.kind==='react'||['assault','battleEffect','combinedAttack','duel','overload','retrieve'].includes(window.interrupt);
 const ability=requiresDestiny?highestInterruptAbility(side):0;
 if(requiresDestiny&&!ability)return [];
 return (hand??[]).flatMap((card,index)=>(kind==='alter'?isAlter(card):isSense(card))
  ?[{kind,card,index,ability,cost:0}]:[]);
}

function counterResponses(side,window){
 const effect=['lostPileEffect','locationEffect','tableEffect'].includes(window.kind);
 if(!effect&&!['interrupt','react'].includes(window.kind))return null;
 if(effect&&!alterTarget(window.card)||window.kind==='interrupt'&&/immune to sense\b/i.test(window.card?.gametext??''))return [];
 const {hand}=PremiereGame.zones(state,side);
 const ability=highestInterruptAbility(side);
 return (hand??[]).flatMap((card,index)=>{
  const offers=[];
  if(window.kind==='tableEffect'&&namedTableCounter(card,window.card)){
   offers.push({kind:'namedCounter',card,index,cost:0,counterMode:'direct',args:[index],
    label:card.name+' · '+window.card.name+' aufheben'});
  }
  for(const rule of activeCardRules(card,'counter')){
   const direct=rule.mode==='direct';
   const valid=direct?window.kind==='interrupt'&&window.interrupt===rule.targets:
    ability>0&&(rule.name==='Alter'?effect:!effect);
   if(!valid)continue;
   const target=window.card?.name??(effect?'Effect':'React');
   offers.push({kind:rule.name.toLowerCase(),card,index,cost:rule.cost,ability,counterMode:rule.mode,
    args:offers.length?[index,rule.mode]:[index],label:card.name+' · '+target+(direct?' ohne Destiny aufheben':' mit Destiny aufheben')});
  }
  return offers;
 });
}

function hasInterruptResponse(frame){
 const sides=expandedCardRules()?PremiereGame.sides:[PremiereGame.otherSide(frame.side)];
 return sides.some(side=>interruptResponses(side,frame).length);
}

function initiateInterruptResponse(side,index,mode){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=interruptResponses(side,window).find(response=>response.index===index&&response.args?.[1]===mode);
 if(!option||!PremiereGame.answer(game,side,{kind:'interrupt',interrupt:option.kind,site:window.site,card:option.card,
    ability:option.ability,counterMode:option.counterMode}))return false;
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

function legalActions(position,side,request){
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
 if(position.automatedPending){
  if(position.automatedPending.side!==side)return [];
  if(position.automatedPending.kind==='defuse')return [offer('resolveMine',[true],{label:'Entschärfen (1 Force)'}),
   offer('resolveMine',[false],{label:'Explodieren lassen'})];
  return automatedTargets(position.automatedPending).map((target,index)=>offer('automatedTarget',[index],{card:target.card}));
 }
 if(position.game?.timing.pending)return PremiereGame.triggerOptions(position.game,side)
  .map(effect=>offer('timingTrigger',[effect.id],{label:effect.label}));
 const window=PremiereGame.responseWindow(position.game);
 if(window){
  if(side!==window.priority)return [];
  if(window.kind==='destiny')return [...destinyResponses(side,window).map(answer=>offer('destinyResponse',[answer.kind],{label:answer.label})),offer('passResponse')];
  return [...(window.kind==='battle'?battleWeaponOptions(side,'initiation').map(shot=>offer('gaderffii',shot.args,{...shot,label:shot.weapon.name+' → '+shot.target.name})):[]),
   ...reactOptions(side,window).map(x=>offer('react',[x.from,x.index],x)),
   ...reactDeployOptions(side,window).map(x=>offer('reactDeploy',x.args,x)),
   ...interruptResponses(side,window).map(x=>offer('interruptResponse',x.args??[x.index],x)),offer('passResponse')];
 }
 if(position.pendingReserveSearch)return position.pendingReserveSearch.side===side?
  reserveSearchChoices(position.pendingReserveSearch).map(choice=>offer('takeFromReserve',choice.args,choice)):[];
 const {hand,deck,force,board}=PremiereGame.zones(position,side);
 if(position.pendingForceLoss){
  if(position.pendingForceLoss.payer!==side)return [];
  return PremiereGame.lossChoices(position,side,position.pendingForceLoss.from).map(choice=>offer('loseForce',choice.args,{card:choice.card}));
 }
 if(battleSession){
  const x=battleSession;
  if(x.resolved||position.phase!==3)return [];
  if(x.segment==='damage')return battleDamageOptions(side).map(option=>offer(option.kind,option.args,option));
  if(x.segment==='initiation')return side==='Dark'&&x.prediction&&!x.prediction.winner?
   PremiereGame.sides.map(winner=>offer('battlePrediction',[winner])):[];
  const training=[];
  if(side==='Light'&&(!x.segmented||position.trainingBattle))for(const target of PremiereGame.sides)for(const kind of ['power','destiny']){
   for(let value=0;value<=20;value++)training.push(offer('trainingModifier',[target,kind,value]));
  }
  if(x.weaponTurn&&x.weaponTurn!==side)return training;
  if(x.weaponTurn){
   const shots=battleWeaponOptions(side);
   return [...shots.map(shot=>offer('fireWeapon',shot.args,shot)),
   ...(x.repeatingWeapon?[]:[...duelOptions(side).map(option=>offer('duel',option.args,option)),
    ...combinedAttackOptions(side,shots,request,offer),
    ...namedRetrievalOptions(side).map(option=>offer(option.kind,option.args,option)),
    ...shuffleOptions(side).map(option=>offer('shufflePile',option.args,option)),
    ...tableCancellationOptions(side).map(option=>offer('cancelTableEffect',option.args,option)),
    ...battleEffectOptions(side).map(option=>offer('battleEffect',option.args,option)),
    ...weaponEffectOptions(side).filter(option=>['defuse','overload'].includes(option.args[0])).map(option=>offer('weaponEffect',option.args,option))]),
   offer('passWeapons'),...training];
  }
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
 for(const option of weaponEffectOptions(side))actions.push(offer('weaponEffect',option.args,option));
 for(const option of shuffleOptions(side))actions.push(offer('shufflePile',option.args,option));
 for(const option of tableCancellationOptions(side))actions.push(offer('cancelTableEffect',option.args,option));
 if(position.game&&(position.lostPileEffects?.length||position.locationEffects)&&hand?.some(isAlter)&&highestInterruptAbility(side)>0){
  for(const [index,card] of hand.entries())if(isAlter(card)){
   position.lostPileEffects?.forEach((effect,effectIndex)=>{
    if(!expandedCardRules()||alterTarget(effect.card))actions.push(offer('alterLostPileEffect',[index,effectIndex],{card,target:effect.target}));
   });
   position.locations.forEach((loc,site)=>PremiereLocations.effectsAt(position,site).forEach((effect,effectIndex)=>{
    if((!expandedCardRules()||alterTarget(effect.card))&&(locationEffectRule(effect.card)||activeCardRules(effect.card,'rotateLocation').length))
     actions.push(offer('alterLocationEffect',[index,site,effectIndex],{card,label:card.name+' · '+effect.card.name+' bei '+loc.name+' aufheben'}));
   }));
  }
 }
 if(side!==active)return actions;
 const botStep=position.botTurn?.steps[position.botTurn.index];
 if(side==='Dark'&&position.botTurn?.decision)return [offer('botDecision',[position.botTurn.decision])];
 if(side==='Dark'&&botStep)actions.push(offer('botStep',[botStep.kind]));
 for(const option of deviceActions(side))actions.push(offer('deviceAction',option.args,option));
 for(const option of duelOptions(side))actions.push(offer('duel',option.args,option));
 if(side==='Light'&&(position.phase!==0||position.activated))actions.push(offer('advance'));
 for(const option of namedRetrievalOptions(side))actions.push(offer(option.kind,option.args,option));
 for(const option of transportOptions(side))actions.push(offer('transport',option.args,option));
 for(const group of dockingGroups(side)){
  const choosing=request?.kind==='dockGroup'&&group.args.every((arg,i)=>arg===request.args?.[i]);
  const plan=choosing?dockingPlan(group,request.args.slice(group.args.length)):null;
  if(!choosing||plan)actions.push(offer('dockGroup',choosing?request.args:group.args,{...group,plan}));
 }
 if(position.phase===0&&!position.activated){
  const max=Math.min(deck?.length??0,forceFromLocations(side).count);
  for(let n=0;n<=max;n++)actions.push(offer('activate',[n]));
 }else if(position.phase===1){
  for(const option of forceDrainOptions(side))actions.push(offer('drain',option.bonus?[option.siteIndex,option.bonus]:[option.siteIndex],option));
  for(const option of seekerMoves(side))actions.push(offer('moveSeeker',option.args,option));
 }else if(position.phase===2){
  for(const option of tableEffectOptions(side))actions.push(offer('deployTableEffect',option.args,option));
  for(const option of automatedDeployOptions(side))actions.push(offer('deployAutomated',[option.index,option.slot],option));
  for(const [i,card] of (hand??[]).entries()){
   if(card.side===side&&isLostPileEffect(card))for(const target of PremiereGame.sides){
    actions.push(offer('deployLostPileEffect',[i,target],{card,target}));
   }
   for(const option of locationEffectOptions(side,i))actions.push(offer('deployLocationEffect',option.args,option));
   for(const slot of locationDeployPositions(side,i))actions.push(offer('deployLocation',[i,slot],{card}));
   const conversion=conversionTarget(side,i);
   if(conversion>=0)actions.push(offer('convertLocation',[i,conversion],{card}));
   for(const slot of revolutionOptions(side,i))actions.push(offer('revolution',[i,slot],{card,cost:3}));
   for(const option of weaponDeployOptions(side,i))actions.push(offer('equip',[i,option.siteIndex,option.hostIndex],
    {...option,card,contested:confirmedPresence(PremiereGame.otherSide(side),option.siteIndex)===true}));
   for(const option of deviceHosts(side,i))actions.push(offer('deployDevice',[i,option.slot,option.index],{...option,card}));
   for(const option of boltDeployOptions(side,i))actions.push(offer('deployBolt',option.args,option));
   for(const [slot,location] of position.locations.entries()){
    const cost=boardDeployCost(card,location,side);
    if(cost!==null)actions.push(offer('deploy',[i,slot],{card,location,cost}));
    if(isExteriorPlanetSite(location)&&mineLayers(side,slot))actions.push(offer('buryMineCard',[i,slot]));
    for(const pilot of deployPilotOptions(side,i,slot))actions.push(offer('deployWithPilot',[i,slot,pilot.index],pilot));
   }
  }
 }else if(position.phase===3){
  for(const i of position.locations.keys())if(canInitiateBattleFor(side,i))actions.push(offer('battle',[i],{cost:1}));
 }else if(position.phase===5&&force?.length)actions.push(offer('draw'));
 for(const option of movementOptionsFor(side))actions.push(offer('move',[option.from,option.index,option.to,option.kind],{...option,movementKind:option.kind}));
 for(const group of transitGroups(side)){
  const {from,to,cost}=group[0];
  const choosing=request?.kind==='transitGroup'&&request.args?.[0]===from&&request.args?.[1]===to;
  const selection=choosing?request.args.slice(2):[];
  const plan=selection.length?group.filter(move=>selection.includes(move.index)):group;
  if(selection.length&&plan.length!==selection.length)continue;
  actions.push(offer('transitGroup',choosing?request.args:[from,to],{from,to,cost,choices:group,plan}));
 }
 return actions;
}

function executeAction({kind,side,args,plan,ships,card}){
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
  case 'deployLostPileEffect': return deployLostPileEffect(side,...args);
  case 'alterLostPileEffect': return initiateAlterLostPileEffect(side,...args);
  case 'deployLocationEffect': return deployLocationEffect(side,...args);
  case 'alterLocationEffect': return initiateAlterLocationEffect(side,...args);
  case 'deployTableEffect': return deployTableEffect(side,...args);
  case 'cancelTableEffect': return initiateTableCancellation(side,...args);
  case 'retrieve':
  case 'searchReserve': return playRetrieval(side,kind,...args);
  case 'shufflePile': return playShuffle(side,...args);
  case 'takeFromReserve': return finishReserveSearch(...args);
  case 'deployWithPilot': return deployWithPilot(side,...args);
  case 'transport': return performTransport(side,...args);
  case 'transitGroup': return performTransitGroup(side,plan);
  case 'dockGroup': return performDockingGroup(side,ships,plan);
  case 'equip': return deployWeaponFor(side,...args);
  case 'deployAutomated': return deployAutomated(side,...args);
  case 'buryMineCard': return buryWeaponCard(side,...args);
  case 'moveSeeker': return moveSeeker(side,...args);
  case 'automatedTarget': return resolveAutomatedTarget(side,...args);
  case 'resolveMine': return handleTrippedMine(side,...args);
  case 'weaponEffect': return playWeaponEffect(side,...args);
  case 'deployDevice': return deployDevice(side,...args);
  case 'deployBolt': return deployBolt(side,...args);
  case 'deviceAction': return performDeviceAction(side,...args);
  case 'deploy': {
   const result=deployBoardCardFor(side,...args);
   if(result)log(side+' setzt '+result.card.name+' bei '+result.loc.name+' ein ('+result.cost+' Force → Used Pile).');
   return result;
  }
  case 'move': return moveCharacterFor(side,...args);
  case 'battle': return initiateBattleFor(side,...args);
  case 'battlePrediction': return chooseBattlePrediction(...args);
  case 'duel': return playDuel(side,...args);
  case 'fireWeapon': return fireBattleWeapon(side,...args);
  case 'combinedAttack': return playCombinedAttack(side,args,card,plan);
  case 'gaderffii': return useGaderffii(side,...args);
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
 const traffic=state?.buriedMines?.length?new Map(mineTraffic().map(entry=>[entry.card,entry.slot])):null;
 const result=PremiereGame.execute(game,action,(side,request)=>legalActions(state,side,request),executeAction);
 if(!result)return false;
 if(state?.game){resolveLocationControlRules();revealTrippedMines(traffic);findAutomatedWeapons();progressLocationMissions();}
 if(battleSession?.segmented)stopBattleWithoutPresence();
 if(game&&topLevelActions.has(action.kind))game.rootAction=action.side;
 if(state?.game&&!battleSession)checkLifeForceVictory();
 if(game?.rootAction&&!state.gameWinner&&!state.pendingForceLoss&&!state.pendingReserveSearch&&!state.automatedPending&&!battleSession&&
    !PremiereGame.responseWindow(game)&&!game.timing.pending){
  const priority=PremiereGame.otherSide(game.rootAction);
  delete game.rootAction;
  PremiereGame.checkpoint(game,'phase:priority',state.activeSide,()=>{},priority);
 }
 if(['deployLostPileEffect','deployLocationEffect','deployTableEffect'].includes(action.kind)&&action.side==='Dark'&&state.botTurn&&
    (PremiereGame.responseWindow(game)||game?.timing.pending))state.botTurn.decision='deploy';
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
