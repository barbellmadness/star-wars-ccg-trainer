const {REVISION, readCatalog, readStarterDecks, buildAudit, locationTitle, isDeployableCharacter, isBantha, permanentPilotAbility, basicWeaponRule}=PremiereData;
let catalog=[],starterDecks=null,state=null,battleSession=null,setupDecks=null;
let nextGameId=0, presentGame=()=>{};
const currentGame=()=>state?.game??setupDecks?.game;
function publishGame(){if(!currentGame()?.executing)presentGame()}
const topLevelActions=new Set(['activate','draw','drain','deploy','deployLocation','equip','move','battle']);

function forceFromLocations(side){if(!state)return {count:0,unknown:0};let count=1,unknown=0;for(const c of state.locations){if(!c)continue;const n=side==='Light'?c.icons?.light:c.icons?.dark;if(Number.isInteger(n))count+=n;else unknown++}return {count,unknown}}

function activate(side,requested){const x=forceFromLocations(side),deck=side==='Light'?state.deck:state.botDeck,pile=side==='Light'?state.force:state.botForce;const count=Math.max(0,Math.min(Number.isInteger(requested)?requested:x.count,x.count,deck.length));PremiereGame.moveTop(deck,pile,count);log(side+' aktiviert '+count+' Force (Maximum '+x.count+' inklusive 1 persönlicher Force).');return count}

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
 if(pilot!==null)return pilot;
 // Droids have no ability, counting as zero in comparisons; unknown other ability stays unknown.
 if(Number.isFinite(c?.ability))return c.ability;
 if(String(c?.type||'').toLowerCase()==='character'&&String(c?.subType||'').toLowerCase()==='droid')return 0;
 return null;
}

function confirmedPresence(side,i){
 if(!state||!state.locations?.[i])return false;
 const cards=(side==='Light'?state.light:state.dark)?.[i]||[];
 if(!cards.length)return false;
 const values=cards.map(cardAbility),known=values.reduce((n,v)=>n+(Number.isFinite(v)?v:0),0);
 if(known>=1)return true;
 return values.some(v=>v===null)?null:false;
}

function forceDrainValue(side,i){
 if(!state||state.gameWinner||state.pendingForceLoss||state.drainedSitesThisTurn?.includes(i))return null;
 if(side==='Light'?(state.phase!==1||state.botTurn||state.activeSide!=='Light'):(!state.botTurn||state.activeSide!=='Dark'))return null;
 const loc=state.locations?.[i];
 if(!loc||confirmedPresence(side,i)!==true||confirmedPresence(side==='Light'?'Dark':'Light',i)!==false)return null;
 const value=side==='Light'?loc.icons?.dark:loc.icons?.light;
 return Number.isInteger(value)&&value>0?value:null;
}

function forceDrainOptions(side){if(!state)return[];return state.locations.map((loc,siteIndex)=>({siteIndex,amount:forceDrainValue(side,siteIndex)})).filter(x=>x.amount!==null)}

function lifeForceRemaining(side){return state?PremiereGame.lifeForce(state,side):0}
function checkLifeForceVictory(){
 if(!state||state.gameWinner)return state?.gameWinner??null;
 state.gameWinner=PremiereGame.outcome(state);
 if(state.gameWinner)log(state.gameWinner==='Simultaneous'?'SPIELENDE: Beide Seiten haben gleichzeitig keine Life Force mehr.':'SPIELENDE: '+state.gameWinner+' Side gewinnt, weil die gegnerische Life Force aufgebraucht ist.');
 return state.gameWinner;
}

function loseForceForDrain(side,zone,index){
 const pending=state?.pendingForceLoss;
 if(!pending||state.gameWinner||pending.payer!==side||pending.remaining<=0)return false;
 const own=side==='Light',hand=own?state.hand:state.botHand,deck=own?state.deck:state.botDeck,force=own?state.force:state.botForce,used=own?state.used:state.botUsed,lost=own?state.lost:state.botLost;
 const pile=new Map([['hand',hand],['deck',deck],['force',force],['used',used]]).get(zone);if(!pile?.length)return false;
 if(zone==='hand'&&(!Number.isInteger(index)||index<0||index>=pile.length))return false;
 const card=zone==='hand'?pile.splice(index,1)[0]:pile.pop();lost.push(card);pending.remaining--;
 const label=pending.reason==='battleDamage'?'Battle Damage':'Force Drain';
 log(side+' verliert 1 Force für '+label+' aus '+zone+': '+card.name+'.');
 if(!pending.remaining||!(hand.length+lifeForceRemaining(side))){
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

function initiateForceDrain(side,i){
 const n=forceDrainValue(side,i);if(n===null)return false;
 state.drainedSitesThisTurn.push(i);
 const payer=side==='Light'?'Dark':'Light';
 log(side+' initiiert Force Drain '+n+' bei '+state.locations[i].name+'.');
 if(openReactWindow('drain',side,i,n))return true;
 beginDrainLoss(payer,i,n);
 return true;
}
function beginDrainLoss(payer,i,n){
 const loss=Math.min(n,PremiereGame.zones(state,payer).hand.length+lifeForceRemaining(payer));
 if(loss)state.pendingForceLoss={payer,remaining:loss,locationIndex:i};
 log(payer+' muss '+n+' Force verlieren.');
 if(payer==='Dark'&&!currentGame()?.executing)botPayDrainLoss();
 publishGame();return true;
}

function isLoc(c){return /location|site|system/i.test(c.type||'')}

function isSite(c){return isLoc(c)&&!/system/i.test(c.subType||'')}

function isSystem(c){return isLoc(c)&&/system/i.test(c.subType||'')}

function isPlanetSystem(c){return !!c&&isSystem(c)&&c.locationTags?.includes('Planet')&&Number.isInteger(c.parsec)}

function isExteriorPlanetSite(c){return !!c&&isSite(c)&&c.locationTags?.includes('Planet')&&c.locationTags.includes('Exterior')}

function withinDeploymentLimit(card,side){
 const limit=card.uniquenessLimit??card.name?.match(/^[*•]+/)?.[0].length??(card.unique===true?1:Infinity);
 if(limit===Infinity)return true;
 const rows=side==='Light'?state.light:state.dark;
 return rows.flat().filter(c=>c.name===card.name).length<limit;
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

function start(seed=Math.floor(Math.random()*4294967296),autoChoose=true){
 if(!starterDecks||!Number.isInteger(seed)||seed<0||seed>4294967295)return false;
 battleSession=null;state=null;
 setupDecks={game:PremiereGame.actionState(++nextGameId,seed),
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

function regularMoveKind(card,from,to){
 const origin=state.locations[from],destination=state.locations[to];
 if(from===to||!origin||!destination)return null;
 if(permanentPilotAbility(card)!==null){
  if(!isPlanetSystem(origin)||!isPlanetSystem(destination)||!card.navComputer||!(card.hyperspeed>0))return null;
  return Math.abs(origin.parsec-destination.parsec)<=card.hyperspeed?'Hyperspeed':null;
 }
 if(!adjacentSites(from,to))return null;
 if(isBantha(card))return isExteriorPlanetSite(origin)&&isExteriorPlanetSite(destination)&&card.landspeed>=1?'Landspeed':null;
 return isDeployableCharacter(card)?'Landspeed':null;
}

function movementOptionsFor(side){
 if(!state||state.gameWinner||state.pendingForceLoss||(side!=='Light'&&side!=='Dark'))return[];
 const light=side==='Light';
 if(state.activeSide&&state.activeSide!==side)return[];
 if(state.phase!==4||(light?!!state.botTurn:!state.botTurn))return[];
 const force=light?state.force:state.botForce,rows=light?state.light:state.dark;
 if(!force?.length||!rows)return[];
 const options=[];
 for(let from=0;from<state.locations.length;from++){
  (rows[from]||[]).forEach((card,index)=>{
   if(state.movedThisTurn?.includes(card))return;
   for(let to=0;to<state.locations.length;to++){
    const kind=regularMoveKind(card,from,to);
    if(kind)options.push({from,to,index,cost:1,name:card.name,kind});
   }
  });
 }
 return options;
}

function movementOptions(){return movementOptionsFor('Light')}

function moveCharacterFor(side,from,index,to){
 const option=movementOptionsFor(side).find(x=>x.from===from&&x.index===index&&x.to===to);
 if(!option)return false;
 const light=side==='Light',rows=light?state.light:state.dark,force=light?state.force:state.botForce,used=light?state.used:state.botUsed;
 if(!rows?.[from]||!rows?.[to]||!force?.length||!used)return false;
 const card=rows[from].splice(index,1)[0];
 PremiereGame.moveTop(force,used);rows[to].push(card);
 if(!state.movedThisTurn)state.movedThisTurn=[];
 state.movedThisTurn.push(card);
 log(side+' bewegt '+card.name+' per '+option.kind+' von '+state.locations[from].name+' nach '+state.locations[to].name+' (1 Force).');
 publishGame();return true;
}

function moveCharacter(from,index,to){return moveCharacterFor('Light',from,index,to)}

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
 const same=(side==='Light'?state.light:state.dark)?.[siteIndex]||[];
 let bonus=0;
 if(side==='Light'&&state.nightConditions&&sitePlanet(state.locations[siteIndex])&&
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
 if(isBantha(c))return 'TEILWEISE: Außen-Site, Ability ½, Landspeed, Waffenabwehr und Power +1 für anwesende Tusken Raider. Passagiere und Reacts sind offen.';
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
 const ownIcons=loc.icons?.[side==='Light'?'light':'dark'];
 const index=state.locations.indexOf(loc);
 return (Number.isFinite(ownIcons)&&ownIcons>=1)||(index>=0&&confirmedPresence(side,index)===true);
}

function canDeployCharacter(c,site,side){
 if(!state||!site||!isSite(site)||!isDeployableCharacter(c)||!['Light','Dark'].includes(side))return false;
 return canPayBoardDeploy(c,side,c.deploy)&&(hasDeployPresence(side,site)||isSpyCharacter(c));
}

function craftDeployCost(card,loc,side){
 if(!Number.isInteger(card.deploy)||card.deploy<0)return null;
 if(isBantha(card))return isExteriorPlanetSite(loc)?card.deploy:null;
 if(permanentPilotAbility(card)===null||!isPlanetSystem(loc))return null;
 const capital=/^Capital\b/i.test(card.subType||'');
 let discount=0;
 if(side==='Light'&&loc.id==='Light:608')discount=capital?2:1;
 if(side==='Dark'&&loc.id==='Dark:1426')discount=1;
 if(card.id==='Dark:2600'&&state.dark[state.locations.indexOf(loc)]?.some(c=>
  c.type==='Starship'&&/^Capital\b/i.test(c.subType||'')&&/\bImperial\b/i.test(c.subType)))discount++;
 return Math.max(0,card.deploy-discount);
}

function boardDeployCost(card,loc,side){
 if(!state||!card||!loc||(card.side&&card.side!==side))return null;
 if(isDeployableCharacter(card))return canDeployCharacter(card,loc,side)?card.deploy:null;
 const cost=craftDeployCost(card,loc,side);
 return cost!==null&&canPayBoardDeploy(card,side,cost)&&hasDeployPresence(side,loc)?cost:null;
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
 rows[siteIndex].push(card);
 (state.deployedThisTurn??=[]).push(card);
 return {card,loc,cost};
}

function botDeployPhase(){
 if(!state||state.phase!==2||state.activeSide!=='Dark'||!state.botTurn)return [];
 const actions=[],maxActions=state.botHand.length;
 for(let k=0;k<maxActions;k++){
  const available=legalActions(state,'Dark'),own=PremiereGame.zones(state,'Dark');
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
  const option=available.find(x=>x.kind==='deploy');
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
 if(!action||!requestAction(deferred?'botDecision':'botStep','Dark',[action.kind]))return false;
 if(state.game?.timing.pending)return true;
 const available=legalActions(state,'Dark');
 if(action.kind==='move'){
  const choice=available.filter(x=>x.kind==='move').sort((a,b)=>botMoveScore(b)-botMoveScore(a))[0];
  if(!choice||botMoveScore(choice)<=0)botSay('Move: Bot passt, keine vorteilhafte legale Bewegung mit 1 Force.');
  else if(performAction(choice))botSay('Move: Bot bewegt '+choice.name+' für 1 Force zu '+state.locations[choice.to].name+' ('+choice.movementKind+').');
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
  const choice=available.filter(x=>x.kind==='drain').sort((a,b)=>b.amount-a.amount)[0];
  if(choice&&performAction(choice))botSay('Control: Dark Side führt einen Force Drain '+choice.amount+' bei '+state.locations[choice.args[0]].name+' aus. Light Side wählt die Verlustkarten.');
  else botSay('Control: Keine Location mit bestätigter alleiniger Präsenz und gegnerischen Force-Icons.');
 }else if(action.kind==='deploy'){
  const actions=botDeployPhase();
  botSay(actions.length?'Deploy: '+actions.join('; ')+'.':'Deploy: Bot passt; keine legale bezahlbare Karte.');
 }
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
 const ability=cards=>{const a=cards.map(cardAbility),known=a.reduce((n,v)=>n+(Number.isFinite(v)?v:0),0);return a.some(v=>v===null)&&known<4?null:known};
 const power=(cards,side)=>cards.reduce((n,c)=>n+(Number.isFinite(c.power)?c.power:0)+cardPowerModifier(c,side,i),0);
 return {lightPower:power(state.light[i],'Light'),darkPower:power(state.dark[i],'Dark'),lightAbility:ability(state.light[i]),darkAbility:ability(state.dark[i])};
}

function canInitiateBattleFor(side,i){
 if(!state||state.phase!==3||state.activeSide!==side||state.gameWinner||state.pendingForceLoss||battleSession)return false;
 if(side==='Light'?!!state.botTurn:!state.botTurn)return false;
 const force=side==='Light'?state.force:state.botForce;
 if(!Number.isInteger(i)||i<0||!state.locations?.[i]||!force?.length)return false;
 if(state.battledSitesThisTurn?.includes(i))return false;
 return confirmedPresence('Light',i)===true&&confirmedPresence('Dark',i)===true;
}

function canInitiateBattle(i){return canInitiateBattleFor('Light',i)}

function initiateBattleFor(side,i){
 if(!canInitiateBattleFor(side,i))return false;
 const force=side==='Light'?state.force:state.botForce,used=side==='Light'?state.used:state.botUsed;
 PremiereGame.moveTop(force,used);
 if(!state.battledSitesThisTurn)state.battledSitesThisTurn=[];
 state.battledSitesThisTurn.push(i);
 battleSession={site:i,initiator:side,lightDestiny:null,darkDestiny:null,lightCard:null,darkCard:null,lightLoss:[],darkLoss:[],weaponHits:{Light:[],Dark:[]},resolved:false,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,botForfeitsPending:true};
 log(side+' initiiert Battle bei '+state.locations[i].name+' (1 Force → Used Pile).');
 if(!openReactWindow('battle',side,i))enterBattleSegments();
 publishGame();return true;
}
function enterBattleSegments(){
 checkpoint('battle:start',()=>{
  if(battleWeaponOptions('Light').length||battleWeaponOptions('Dark').length)battleSession.weaponTurn=battleSession.initiator;
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
  if(clause[1].toLowerCase()===side.toLowerCase())return Number(clause[2]);
 }
 return 4;
}
// This bonus applies to each actual Dark Side battle destiny draw; not weapon destiny or skips.

function printedBattleDestinyBonus(side,siteIndex){
 if(side!=='Dark')return 0;
 return (state?.dark?.[siteIndex]||[]).some(c=>c?.id==='Dark:634'&&
  /When in battle, adds 1 to each of your battle destiny draws/i.test(c.gametext||''))?1:0;
}

function printedBattleDestiny(card){
 if(!card)return null;
 // Premiere EG-6's star explicitly defines its destiny as zero.
 if(card.id==='Dark:816'&&/destiny equals zero/i.test(card.gametext||''))return 0;
 if(isLoc(card))return 0; // All locations have destiny 0.
 return Number.isFinite(card.destiny)?card.destiny:null;
}
// Two printed Premiere War Room effects grant an additional battle destiny
// to the side that initiated battle here. These are actual Reserve Deck draws.

function printedWarRoomExtraBattleDestiny(side,siteIndex){
 const x=battleSession,loc=state?.locations?.[siteIndex];
 if(!x||x.initiator!==side||!isSite(loc))return 0;
 if(!['Dark:682','Light:2859'].includes(loc.id))return 0;
 const text=String(loc.gametext||'');
 const pattern=new RegExp('(?:^|[.!?]\\s+)'+side+':\\s*If you initiate a battle here, add one battle destiny(?:[.!?]|$)','i');
 return pattern.test(text)?1:0;
}

function battleDestinyDrawCount(side,siteIndex,ability){
 if(!Number.isFinite(ability))return null; // Unknown ability cannot justify an assumed draw.
 const required=minimumBattleDestinyAbility(side,siteIndex);
 const regular=ability>=required?1:0;
 return regular+printedWarRoomExtraBattleDestiny(side,siteIndex);
}

function battleDestiny(side){
 if(!battleSession||battleSession.weaponTurn||state.phase!==3)return;
 const x=battleSession,t=battleTotals(x.site),light=side==='Light',key=light?'lightCard':'darkCard',val=light?'lightDestiny':'darkDestiny';
 if(x[key]!==null)return;
 const first=x.initiator==='Dark'?'Dark':'Light';if(side!==first&&x[first==='Dark'?'darkCard':'lightCard']===null){log('Zuerst entscheidet die initiierende Seite über Battle Destiny.');return}
 const ability=light?t.lightAbility:t.darkAbility,count=battleDestinyDrawCount(side,x.site,ability);
 if(count===null||count<1){log(side+' darf keine Battle Destiny ziehen (Ability '+(ability??'?')+', Mindestwert '+minimumBattleDestinyAbility(side,x.site)+').');return}
 const deck=light?state.deck:state.botDeck,used=light?state.used:state.botUsed,draws=[];
 const vaderBonus=printedBattleDestinyBonus(side,x.site);
 const alderaanPenalty=!light&&state.locations[x.site]?.id==='Light:80'?1:0;
 for(let i=0;i<count&&deck.length;i++){
  const [card]=PremiereGame.moveTop(deck,used);
  const printed=printedBattleDestiny(card),value=Number.isFinite(printed)?Math.max(0,printed+vaderBonus-alderaanPenalty):null;
  draws.push({card,value});
  if(vaderBonus)log('Darth Vader erhöht den Dark-Side-Battle-Destiny-Draw um +'+vaderBonus+'.');
  if(alderaanPenalty)log('Alderaan reduziert den Dark-Side-Battle-Destiny-Draw um 1 (Minimum 0).');
  if(card?.id==='Dark:816'&&side==='Dark'&&/total power present is doubled/i.test(card.gametext||'')&&t.darkPower<t.lightPower){
   x.darkPowerDoubled=true;
   log('EG-6 als Battle Destiny gezogen: Dark-Power present ist niedriger als Light; Dark-Power present einmalig verdoppelt.');
  }
 }
 x[key]=draws[0]?.card||{name:'Reserve Deck leer'};
 x[val]=draws.every(d=>Number.isFinite(d.value))?draws.reduce((sum,d)=>sum+d.value,0):null;
 x[light?'lightDrawCards':'darkDrawCards']=draws.map(d=>({name:d.card.name,value:d.value}));
 log(side+' Battle Destiny: '+draws.length+' von '+count+' erlaubten Karten gezogen'+(draws.length?' ('+draws.map(d=>d.card.name+': '+(d.value??'UNBEKANNT')).join(', ')+')':' (Reserve Deck leer)')+'; Gesamt '+(x[val]??'UNBEKANNT')+'. Alle tatsächlichen Draws liegen in der Used Pile.');
 maybePlanBotForfeits();publishGame();
}

function skipDestiny(side){if(!battleSession||battleSession.weaponTurn||state.phase!==3)return;const first=battleSession.initiator==='Dark'?'Dark':'Light';if(side!==first&&battleSession[first==='Dark'?'darkCard':'lightCard']===null)return;const x=battleSession,key=side==='Light'?'lightCard':'darkCard',val=side==='Light'?'lightDestiny':'darkDestiny';if(x[key]!==null)return;x[key]={name:'Freiwillig verzichtet'};x[val]=0;log(side+' verzichtet auf Battle Destiny.');maybePlanBotForfeits();publishGame()}

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

function setBattleModifier(side,kind,value){const x=battleSession;if(!x||state.phase!==3)return;const key=(side==='Light'?'light':'dark')+(kind==='power'?'PowerMod':'Bonus');const n=Number(value);if(!Number.isInteger(n)||n<0||n>20){log('Ungültiger Modifikator (0–20).');return}x[key]=n;log(side+' manueller '+(kind==='power'?'Power':'zusätzlicher Battle-Destiny')+'-Bonus '+n+' (nicht automatisch durch Kartentext verifiziert).');publishGame()}

function battleWeaponOptions(side){
 const x=battleSession;
 if(!x||x.resolved||state?.phase!==3||x.lightCard!==null||x.darkCard!==null)return [];
 const light=side==='Light',hosts=(light?state.light:state.dark)[x.site];
 const targets=(light?state.dark:state.light)[x.site],force=light?state.force:state.botForce;
 const options=[];
 hosts.forEach((host,hostIndex)=>{
  if(state.weaponUsersThisTurn?.includes(host))return;
  (host.weapons??[]).forEach((weapon,weaponIndex)=>{
   const rule=basicWeaponRule(weapon);
   if(!rule||weapon.side!==side||force.length<rule.cost)return;
   targets.forEach((target,targetIndex)=>{
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
 const light=side==='Light',force=light?state.force:state.botForce,used=light?state.used:state.botUsed;
 const deck=light?state.deck:state.botDeck;
 PremiereGame.moveTop(force,used,shot.cost);
 (state.weaponUsersThisTurn??=[]).push(shot.host);
 const [drawn]=PremiereGame.moveTop(deck,used),destiny=printedBattleDestiny(drawn);
 const total=destiny===null?null:destiny+shot.bonus;
 const hit=total!==null&&total>shot.defense;
 log(side+' feuert '+shot.weapon.name+' auf '+shot.target.name+' ('+shot.cost+' Force). Waffen-Destiny: '+(drawn?drawn.name+' · '+(total??'unbekannt'):'Reserve Deck leer')+' gegen Verteidigung '+shot.defense+' → '+(hit?'Treffer':'kein Treffer')+'.');
 if(hit)recordBattleWeaponHit(light?'Dark':'Light',targetIndex);
 finishWeaponAction(side,false);
 return true;
}

function botWeaponAction(){
 if(battleSession?.weaponTurn!=='Dark')return null;
 const hitTargets=battleSession.weaponHits.Light;
 const available=legalActions(state,'Dark');
 const options=available.filter(x=>x.kind==='fireWeapon'&&!hitTargets.includes(x.targetIndex)&&state.botDeck.length);
 options.sort((a,b)=>(b.target.power??0)-(a.target.power??0)||a.defense-a.bonus-b.defense+b.bonus||a.cost-b.cost);
 const choice=options[0];
 return choice??available.find(x=>x.kind==='passWeapons');
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

function battleDamagePreview(){if(!battleSession)return null;const x=battleSession,t=battleTotals(x.site);if(!Number.isFinite(x.lightDestiny)||!Number.isFinite(x.darkDestiny))return null;const lightTotal=(t.lightPower+x.lightPowerMod)*(x.lightPowerDoubled?2:1)+x.lightDestiny+x.lightBonus,darkTotal=(t.darkPower+x.darkPowerMod)*(x.darkPowerDoubled?2:1)+x.darkDestiny+x.darkBonus;return {lightTotal,darkTotal,lightDamage:Math.max(0,darkTotal-lightTotal),darkDamage:Math.max(0,lightTotal-darkTotal)}}

function lossValue(side){const x=battleSession,cards=side==='Light'?state.light[x.site]:state.dark[x.site],indices=x[side==='Light'?'lightLoss':'darkLoss'];return {sum:indices.reduce((n,i)=>n+(cards[i]?.forfeit||0),0),unknown:indices.some(i=>!Number.isFinite(cards[i]?.forfeit)),count:indices.length}}

function resolveBattleLosses(){
 const x=battleSession;if(!x||x.resolved||x.weaponTurn||state.phase!==3||state.pendingForceLoss||state.gameWinner)return false;
 if(x.lightCard===null||x.darkCard===null)return false;
 const light=battleForfeitPlan('Light'),dark=battleForfeitPlan('Dark'),damage=battleDamagePreview();
 if(!light.valid||!dark.valid||!damage){log('Battle nicht abgeschlossen: '+(!light.valid?'Light '+light.reason+'; ':'')+(!dark.valid?'Dark '+dark.reason:''));publishGame();return false;}
 for(const side of ['Light','Dark']){
  const cards=side==='Light'?state.light[x.site]:state.dark[x.site],lost=side==='Light'?state.lost:state.botLost;
  for(const i of x[side==='Light'?'lightLoss':'darkLoss'].slice().sort((a,b)=>b-a)){
   const card=cards.splice(i,1)[0],weapons=card.weapons??[];
   delete card.weapons;
   lost.push(card,...weapons);
   log(side+' forfeitet '+card.name+' (Forfeit '+card.forfeit+').');
   if(weapons.length)log('Angehängte Waffen gehen separat in den Lost Pile: '+weapons.map(weapon=>weapon.name).join(', ')+'.');
  }
 }
 x.resolved=true;
 const loser=damage.lightDamage?'Light':damage.darkDamage?'Dark':null;
 const amount=loser==='Light'?light.remainingDamage:loser==='Dark'?dark.remainingDamage:0;
 log('Battle beendet: Power Light '+damage.lightTotal+', Dark '+damage.darkTotal+'. Light Attrition '+light.incoming+', Dark Attrition '+dark.incoming+'.');
 battleSession=null;
 if(loser&&amount>0){
  const remaining=Math.min(amount,PremiereGame.zones(state,loser).hand.length+lifeForceRemaining(loser));
  if(remaining)state.pendingForceLoss={payer:loser,remaining,reason:'battleDamage',locationIndex:x.site};
  else endBattleTiming();
  log(loser+' muss '+amount+' verbliebenen Battle Damage durch Force-Verluste bezahlen.');
  if(loser==='Dark'&&!currentGame()?.executing)botPayDrainLoss();
 }else endBattleTiming();
 checkLifeForceVictory();publishGame();return true;
}

function commitDemoLoss(){return resolveBattleLosses()}

function reactOptions(side, window){
 if(!window||window.cancelled||!['battle','drain'].includes(window.kind)||side===window.side)return [];
 const {board,force}=PremiereGame.zones(state,side);
 if(!force?.length||!board)return [];
 return board.flatMap((row,from)=>row.flatMap((card,index)=>{
  if(!['Light:2250','Dark:191'].includes(card.id)||state.reactedThisTurn?.includes(card)||
     (card.instanceId&&PremiereGame.wasUsed(state.game,'turn','react:'+card.instanceId))||
     !adjacentSites(from,window.site)||!regularMoveKind(card,from,window.site))return [];
  return [{from,index,card,cost:1}];
 }));
}

function openReactWindow(kind,side,site,amount){
 if(!state.game)return false;
 const frame={kind,side,site,amount};
 if(!reactOptions(PremiereGame.otherSide(side),frame).length)return false;
 PremiereGame.openResponse(state.game,frame);
 return true;
}

function resolveResponsePass(side){
 const game=state.game;
 const frame=PremiereGame.passResponse(game,side);
 if(!frame||frame===true)return frame;
 if(frame.kind==='interrupt'){
  const parent=PremiereGame.responseWindow(game),{deck,used}=PremiereGame.zones(state,frame.side);
  let cancelled=parent.kind==='interrupt';
  if(!cancelled){
   const drawn=PremiereGame.moveTop(deck,used)[0],destiny=printedBattleDestiny(drawn);
   cancelled=destiny!==null&&destiny<frame.ability;
   log(frame.card.name+': Destiny '+(destiny??'–')+' gegen Ability '+frame.ability+(cancelled?' · React aufgehoben.':' · React bleibt bestehen.'));
  }
  used.push(frame.card);
  if(cancelled)PremiereGame.cancelResponse(game,parent);
 }else if(frame.kind==='react'&&!frame.cancelled){
  const {board}=PremiereGame.zones(state,frame.side);
  const index=board[frame.from].indexOf(frame.card);
  if(index>=0){
   board[frame.site].push(...board[frame.from].splice(index,1));
   log(frame.side+' bewegt '+frame.card.name+' als React nach '+state.locations[frame.site].name+'.');
   const parent=PremiereGame.responseWindow(game);
   if(parent.kind==='drain'&&confirmedPresence(frame.side,frame.site)===true){
    PremiereGame.cancelResponse(game,parent);
    log('Force Drain aufgehoben: Der React hat Presence an den Ort gebracht.');
   }
  }
 }else if(frame.kind==='drain'&&!frame.cancelled){
  beginDrainLoss(PremiereGame.otherSide(frame.side),frame.site,frame.amount);
 }else if(frame.kind==='battle'){
  if(!frame.cancelled&&confirmedPresence('Light',frame.site)===true&&confirmedPresence('Dark',frame.site)===true)enterBattleSegments();
  else {battleSession=null;PremiereGame.expire(game,'battle');}
 }
 const cancelled=PremiereGame.removeCancelledResponse(game);
 if(cancelled?.kind==='interrupt'){
  PremiereGame.zones(state,cancelled.side).lost.push(cancelled.card);
  log(cancelled.card.name+' wurde aufgehoben und kommt in den Lost Pile.');
 }
 return true;
}

function initiateReact(side,from,index){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=reactOptions(side,window).find(x=>x.from===from&&x.index===index);
 if(!option)return false;
 const {force,used}=PremiereGame.zones(state,side);
 if(!PremiereGame.answer(game,side,{kind:'react',site:window.site,from,card:option.card}))return false;
 PremiereGame.moveTop(force,used,option.cost);
 (state.reactedThisTurn??=[]).push(option.card);
 if(option.card.instanceId)PremiereGame.useOnce(game,'turn','react:'+option.card.instanceId);
 log(side+' initiiert einen React mit '+option.card.name+' für '+option.cost+' Force.');
 return true;
}

function interruptResponses(side,window){
 if(window.cancelled||side===window.side)return [];
 const {board,hand}=PremiereGame.zones(state,side);
 const kind=window.kind==='react'?'sense':window.kind==='interrupt'?window.interrupt==='sense'?'alter':'sense':null;
 if(!kind)return [];
 const ids=kind==='sense'?['Light:2217','Dark:2216']:['Light:95','Dark:94'];
 const ability=window.kind==='react'?Math.max(0,...board.flat().filter(card=>card.type==='Character').map(card=>cardAbility(card)??0)):0;
 if(window.kind==='react'&&!ability)return [];
 return hand.flatMap((card,index)=>ids.includes(card.id)?[{kind,card,index,ability}]:[]);
}

function initiateInterruptResponse(side,index){
 const game=state.game,window=PremiereGame.responseWindow(game);
 const option=interruptResponses(side,window).find(response=>response.index===index);
 if(!option||!PremiereGame.answer(game,side,{kind:'interrupt',interrupt:option.kind,site:window.site,card:option.card,ability:option.ability}))return false;
 PremiereGame.zones(state,side).hand.splice(index,1);
 log(side+' antwortet mit '+option.card.name+'.');
 return true;
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
  return [...reactOptions(side,window).map(x=>offer('react',[x.from,x.index],x)),
   ...interruptResponses(side,window).map(x=>offer('interruptResponse',[x.index],x)),offer('passResponse')];
 }
 const {hand,deck,force,used,board}=PremiereGame.zones(position,side);
 if(position.pendingForceLoss){
  if(position.pendingForceLoss.payer!==side)return [];
  return [...(hand??[]).map((card,i)=>offer('loseForce',['hand',i],{card})),
   ...Object.entries({deck,force,used}).filter(([,pile])=>pile?.length).map(([zone])=>offer('loseForce',[zone]))];
 }
 if(battleSession){
  const x=battleSession;
  if(x.resolved||position.phase!==3)return [];
  const training=[];
  if(side==='Light')for(const target of PremiereGame.sides)for(const kind of ['power','destiny']){
   for(let value=0;value<=20;value++)training.push(offer('trainingModifier',[target,kind,value]));
  }
  if(x.weaponTurn)return x.weaponTurn===side?
   [...battleWeaponOptions(side).map(shot=>offer('fireWeapon',[shot.hostIndex,shot.weaponIndex,shot.targetIndex],shot)),offer('passWeapons'),...training]:training;
  const first=x.initiator==='Dark'?'Dark':'Light',key=side==='Light'?'lightCard':'darkCard';
  if(x[key]===null){
   if(side!==first&&x[first==='Light'?'lightCard':'darkCard']===null)return training;
   const totals=battleTotals(x.site),ability=side==='Light'?totals.lightAbility:totals.darkAbility;
   return [...((battleDestinyDrawCount(side,x.site,ability)??0)>0?[offer('destiny')]:[]),offer('skipDestiny'),...training];
  }
  if(x.lightCard===null||x.darkCard===null)return training;
  const actions=board[x.site].flatMap((card,index)=>x.weaponHits?.[side]?.includes(index)?[]:[offer('toggleLoss',[index],{card})]);
  if(side==='Light'&&battleDamagePreview()&&battleForfeitPlan('Light').valid&&battleForfeitPlan('Dark').valid)actions.push(offer('resolveBattle'));
  return [...actions,...training];
 }
 const active=position.activeSide??(position.botTurn?'Dark':'Light');
 const actions=side==='Light'?[offer('trainingNight',[!position.nightConditions])]:[];
 if(side!==active)return actions;
 const botStep=position.botTurn?.steps[position.botTurn.index];
 if(side==='Dark'&&position.botTurn?.decision)return [offer('botDecision',[position.botTurn.decision])];
 if(side==='Dark'&&botStep)actions.push(offer('botStep',[botStep.kind]));
 if(side==='Light'&&(position.phase!==0||position.activated))actions.push(offer('advance'));
 if(position.phase===0&&!position.activated){
  const max=Math.min(deck?.length??0,forceFromLocations(side).count);
  for(let n=0;n<=max;n++)actions.push(offer('activate',[n]));
 }else if(position.phase===1){
  for(const option of forceDrainOptions(side))actions.push(offer('drain',[option.siteIndex],option));
 }else if(position.phase===2){
  for(const [i,card] of (hand??[]).entries()){
   for(const slot of locationDeployPositions(side,i))actions.push(offer('deployLocation',[i,slot],{card}));
   for(const option of weaponDeployOptions(side,i))actions.push(offer('equip',[i,option.siteIndex,option.hostIndex],
    {...option,card,contested:confirmedPresence(PremiereGame.otherSide(side),option.siteIndex)===true}));
   for(const [slot,location] of position.locations.entries()){
    const cost=boardDeployCost(card,location,side);
    if(cost!==null)actions.push(offer('deploy',[i,slot],{card,location,cost}));
   }
  }
 }else if(position.phase===3){
  for(const i of position.locations.keys())if(canInitiateBattleFor(side,i))actions.push(offer('battle',[i],{cost:1}));
 }else if(position.phase===4){
  for(const option of movementOptionsFor(side))actions.push(offer('move',[option.from,option.index,option.to],{...option,movementKind:option.kind}));
 }else if(position.phase===5&&force?.length)actions.push(offer('draw'));
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
  case 'equip': return deployWeaponFor(side,...args);
  case 'deploy': {
   const result=deployBoardCardFor(side,...args);
   if(result)log(side+' setzt '+result.card.name+' bei '+result.loc.name+' ein ('+result.cost+' Force → Used Pile).');
   return result;
  }
  case 'move': return moveCharacterFor(side,...args);
  case 'battle': return initiateBattleFor(side,...args);
  case 'fireWeapon': return fireBattleWeapon(side,...args);
  case 'passWeapons': return passBattleWeapons(side);
  case 'destiny': battleDestiny(side);return true;
  case 'skipDestiny': skipDestiny(side);return true;
  case 'toggleLoss': toggleLoss(side,...args);return true;
  case 'resolveBattle': return resolveBattleLosses();
  case 'react': return initiateReact(side,...args);
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
