import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../v2.html',import.meta.url),'utf8');
const cardDataScript=readFileSync(new URL('../engine/premiere-data.js',import.meta.url),'utf8');
const gameScript=readFileSync(new URL('../engine/premiere-game.js',import.meta.url),'utf8');
const battleScript=readFileSync(new URL('../engine/premiere-battle.js',import.meta.url),'utf8');
const unitScript=readFileSync(new URL('../engine/premiere-units.js',import.meta.url),'utf8');
const weaponScript=readFileSync(new URL('../engine/premiere-weapons.js',import.meta.url),'utf8');
const locationScript=readFileSync(new URL('../engine/premiere-locations.js',import.meta.url),'utf8');
const sessionScript=readFileSync(new URL('../engine/premiere-session.js',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!js)throw Error('V2 script missing');
function harness(){
 const elements=new Map();
 const document={getElementById(id){
  if(!elements.has(id))elements.set(id,{
   value:'',checked:true,style:{},innerHTML:'',textContent:'',open:false,
   showModal(){this.open=true;},close(){this.open=false;},
  });
  return elements.get(id);
 }};
 const context=vm.createContext({document,console,Math,Number,String,Array,RegExp,Set,fetch:async()=>({ok:false}),Error});
 vm.runInContext(cardDataScript,context);
 vm.runInContext(gameScript,context);
 vm.runInContext(battleScript,context);
 vm.runInContext(unitScript,context);
 vm.runInContext(locationScript,context);
 vm.runInContext(weaponScript,context);
 vm.runInContext(sessionScript,context);
 vm.runInContext(js.replace(/load\(\);\s*$/,''),context);
 const run=code=>vm.runInContext(code,context);
 return {run,elements};
}
test('deployment rejects characters at systems and insufficient force',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Tatooine',type:'Location',subType:'System'}],force:[],light:[[]],dark:[[]]};");
 assert.equal(run("checkDeployment({name:'Luke',type:'Character',deploy:1},state.locations[0])"),false);
});
test('deployment accepts an affordable character at a site',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Tatooine: Mos Eisley',type:'Location',subType:'Site',icons:{light:1,dark:0}}],force:[{}],light:[[]],dark:[[]]};");
 assert.equal(run("checkDeployment({name:'Rebel',type:'Character',deploy:1},state.locations[0])"),true);
});
test('site neighborhoods follow related table rows instead of storage slots',()=>{
 const {run}=harness();
 run(`state={locations:[
  {name:'Tatooine: A',type:'Location',subType:'Site'}, {name:'Hoth: B',type:'Location',subType:'Site'},
  {name:'Tatooine: C',type:'Location',subType:'Site'}, {name:'Tatooine: D',type:'Location',subType:'Site'},
  {name:'Tatooine',type:'Location',subType:'System'}
 ]}`);
 assert.equal(run('adjacentSites(0,1)'),false);
 assert.equal(run('adjacentSites(0,2)&&adjacentSites(2,0)'),true);
 assert.equal(run('adjacentSites(0,3)'),false);
 assert.equal(run('adjacentSites(3,4)'),false);
});
test('regular site movement allows a deployed character but blocks a second regular move',()=>{
 const {run}=harness();
 run("const character={name:'Rebel',type:'Character',deploy:1};state={phase:4,botTurn:null,locations:[{name:'Hoth: A',type:'Location',subType:'Site'},{name:'Hoth: B',type:'Location',subType:'Site'}],light:[[character],[]],force:[{}],movedThisTurn:[],deployedThisTurn:[character]};");
 assert.equal(run("movementOptions().length"),1);
 run("state.deployedThisTurn=[];state.movedThisTurn=[character]");
 assert.equal(run("movementOptions().length"),0);
});

test('Force generation includes personal Force and both location icon sources',()=>{
 const {run}=harness();
 run("state={locations:[{icons:{light:2,dark:1}},{icons:{light:0,dark:2}}]};");
 assert.equal(run("forceFromLocations('Light').count"),3);
 assert.equal(run("forceFromLocations('Dark').count"),4);
});
test('activation respects requested amount and Reserve Deck size',()=>{
 const {run}=harness();
 run("state={locations:[{icons:{light:2,dark:1}}],deck:[{id:1},{id:2}],botDeck:[],force:[],botForce:[],log:[]};");
 assert.equal(run("activate('Light',3)"),2);
 assert.equal(run("state.deck.length"),0);
 assert.equal(run("state.force.length"),2);
});
test('battle destiny requires Light decision before Dark draw',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{ability:4,power:2}]],dark:[[{ability:4,power:2}]],deck:[{name:'A',destiny:3}],botDeck:[{name:'B',destiny:2}],used:[],botUsed:[],log:[],force:[],botForce:[]};battleSession={site:0,lightCard:null,darkCard:null,lightDestiny:null,darkDestiny:null,lightLoss:[],darkLoss:[],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Dark')");
 assert.equal(run("state.botDeck.length"),1);
 assert.equal(run("battleSession.darkCard"),null);
});

test('Tooex nighttime power effect applies only to allied Rebel or alien at same site',()=>{
 const {run}=harness();
 run("const tooex={id:'Light:2',name:'2X-3KPR (Tooex)',gametext:'Where present under nighttime conditions, each of your Rebels and aliens at same planet site are power +2'};const rebel={id:'Light:4',name:'Rebel',power:2,characteristics:['rebel']};state={nightConditions:true,locations:[{name:'Tatooine: A',type:'Location',subType:'Site'}],light:[[tooex,rebel]],dark:[[]]};");
 assert.equal(run("cardPowerModifier(state.light[0][1],'Light',0)"),2);
 run("state.nightConditions=false");
 assert.equal(run("cardPowerModifier(state.light[0][1],'Light',0)"),0);
 run("state.nightConditions=true;state.light[0].shift()");
 assert.equal(run("cardPowerModifier(state.light[0][0],'Light',0)"),0);
});

test('Tooex does not grant nighttime bonus at a system or unqualified location',()=>{
 const {run}=harness();
 run("const tooex={id:'Light:2',gametext:'nighttime conditions'};const rebel={characteristics:['rebel'],power:2};state={nightConditions:true,locations:[{name:'Tatooine',type:'Location',subType:'System'}],light:[[tooex,rebel]],dark:[[]]};");
 assert.equal(run("cardPowerModifier(state.light[0][1],'Light',0)"),0);
});

test('every catalog card receives an explicit effect coverage status',()=>{
 const {run}=harness();
 run("catalog=[{id:'Light:2',name:'Tooex',gametext:'nighttime conditions'},{id:'Dark:99',name:'Other',gametext:'Power +1'},{id:'Light:100',name:'Blank',gametext:''}]");
 assert.equal(run("effectCoverage().total"),3);
 assert.equal(run("effectCoverage().partial.length"),1);
 assert.equal(run("effectCoverage().unimplemented.length"),1);
 assert.equal(run("effectCoverage().withoutText.length"),1);
 assert.equal(run("cardEffectStatus(catalog[1]).startsWith('OFFEN')"),true);
});

test('both Used Piles recirculate at the end of either player turn',()=>{
 const {run}=harness();
 run("state={deck:[{id:'L0'}],used:[{id:'L1'},{id:'L2'}],botDeck:[{id:'D0'}],botUsed:[{id:'D1'}],log:[]};");
 run("recirculateBoth()");
 assert.equal(run("state.used.length"),0);
 assert.equal(run("state.botUsed.length"),0);
 assert.equal(run("state.deck.length"),3);
 assert.equal(run("state.botDeck.length"),2);
 assert.equal(run("state.deck.map(x=>x.id).join(',')"),'L1,L2,L0');
 assert.equal(run("state.botDeck.map(x=>x.id).join(',')"),'D1,D0');
});
test('same named location cannot be deployed twice',()=>{
 const {run}=harness();
 run(`state={phase:2,activeSide:'Light',locations:[{name:'•Tatooine: Mos Eisley',side:'Dark',type:'Location',subType:'Site'},null],
  hand:[{name:'Tatooine: Mos Eisley',side:'Light',type:'Location',subType:'Site'}],light:[[],[]],dark:[[],[]]}`);
 assert.equal(run("locationDeployPositions('Light',0).length"),0);
});
test('battle damage and attrition stay separate',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{ability:4,power:4}]],dark:[[{ability:4,power:7}]]};battleSession={site:0,lightDestiny:2,darkDestiny:1,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("battleDamagePreview().lightDamage"),2);
 assert.equal(run("battleDamagePreview().darkDamage"),0);
});

test('Control phase: confirmed exclusive presence enables drain equal to opposing icons',()=>{
 const {run}=harness();
 run("state={phase:1,activeSide:'Light',botTurn:null,locations:[{name:'Tatooine: A',icons:{light:1,dark:2}}],light:[[{name:'Rebel',ability:2}]],dark:[[]],drainedSitesThisTurn:[],pendingForceLoss:null,gameWinner:null};");
 assert.equal(run("forceDrainValue('Light',0)"),2);
 run("state.dark[0]=[{name:'Imperial',ability:1}]");
 assert.equal(run("forceDrainValue('Light',0)"),null);
 run("state.dark[0]=[{name:'Unknown',ability:null}]");
 assert.equal(run("forceDrainValue('Light',0)"),null);
 run("state.dark[0]=[];state.light[0]=[{name:'Droid',ability:0}]");
 assert.equal(run("forceDrainValue('Light',0)"),null);
});
test('Force drain cannot be initiated twice at the same location',()=>{
 const {run}=harness();
 run("state={phase:1,activeSide:'Light',botTurn:null,locations:[{name:'Tatooine: A',icons:{light:1,dark:1}}],light:[[{name:'Rebel',ability:1}]],dark:[[]],drainedSitesThisTurn:[0],pendingForceLoss:null,gameWinner:null};");
 assert.equal(run("forceDrainValue('Light',0)"),null);
});
test('Force drain bot pays from chosen hand and life-force piles into Lost Pile',()=>{
 const {run}=harness();
 run("state={turn:1,phase:1,activeSide:'Light',activated:true,botTurn:null,locations:[{name:'Tatooine: A',icons:{light:1,dark:2}}],light:[[{name:'Rebel',type:'Character',ability:1,power:2}]],dark:[[]],drainedSitesThisTurn:[],pendingForceLoss:null,gameWinner:null,deck:[{name:'Reserve L'}],force:[],used:[],hand:[],lost:[],botDeck:[{name:'Reserve D'}],botForce:[],botUsed:[{name:'Used D'}],botHand:[{name:'Hand D'}],botLost:[],log:[],botHistory:[],botReason:''};");
 assert.equal(run("initiateForceDrain('Light',0)"),true);
 assert.equal(run("state.botLost.length"),2);
 assert.equal(run("state.botHand.length"),0);
 assert.equal(run("state.botUsed.length"),0);
 assert.equal(run("state.botDeck.length"),1);
 assert.equal(run("state.pendingForceLoss"),null);
 assert.equal(run("state.drainedSitesThisTurn.length"),1);
});
test('Dark Force drain makes Light player choose from hand or a Life Force pile',()=>{
 const {run}=harness();
 run("state={turn:1,phase:1,activeSide:'Dark',activated:false,botTurn:{steps:[],index:0},locations:[{name:'Hoth: A',icons:{light:2,dark:0}}],light:[[]],dark:[[{name:'Imperial',ability:1,power:1}]],drainedSitesThisTurn:[],pendingForceLoss:null,gameWinner:null,deck:[{name:'Reserve L'}],force:[{name:'Force L'}],used:[],hand:[{name:'Hand L'}],lost:[],botDeck:[{name:'Reserve D'}],botForce:[],botUsed:[],botHand:[],botLost:[],log:[],botHistory:[],botReason:''};");
 assert.equal(run("initiateForceDrain('Dark',0)"),true);
 assert.equal(run("state.pendingForceLoss.remaining"),2);
 assert.equal(run("loseForceForDrain('Light','force')"),true);
 assert.equal(run("state.pendingForceLoss.remaining"),1);
 assert.equal(run("loseForceForDrain('Light','hand',0)"),true);
 assert.equal(run("state.pendingForceLoss"),null);
 assert.equal(run("state.lost.length"),2);
 assert.equal(run("state.deck.length"),1);
});
test('Life Force depletion ends the game even while the losing player holds cards',()=>{
 const {run}=harness();
 run("state={turn:1,phase:1,activeSide:'Light',activated:true,botTurn:null,locations:[{name:'Tatooine: A',icons:{light:1,dark:1}}],light:[[{name:'Rebel',ability:1,power:2,type:'Character'}]],dark:[[]],drainedSitesThisTurn:[],pendingForceLoss:null,gameWinner:null,deck:[{name:'Reserve L'}],force:[],used:[],hand:[],lost:[],botDeck:[{name:'Reserve D'}],botForce:[],botUsed:[],botHand:[],botLost:[],log:[],botHistory:[],botReason:''};");
 assert.equal(run("initiateForceDrain('Light',0)"),true);
 assert.equal(run("state.botDeck.length"),0);
 assert.equal(run("state.gameWinner"),'Light');
 assert.equal(run("state.pendingForceLoss"),null);
});

test('Battle initiation consumes exactly 1 Force and prevents repeat at same site',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,activeSide:'Light',botTurn:null,gameWinner:null,pendingForceLoss:null,locations:[{name:'Tatooine: Mos Eisley'}],light:[[{ability:2,power:3}]],dark:[[{ability:1,power:2}]],force:[{id:'bottom'},{id:'top'}],used:[],battledSitesThisTurn:[],log:[]}");
 assert.equal(run("canInitiateBattle(0)"),true);
 assert.equal(run("battleAnalysis(0)"),true);
 assert.equal(run("state.force.length"),1);
 assert.equal(run("state.used[0].id"),'top');
 assert.equal(run("state.battledSitesThisTurn.includes(0)"),true);
 run("closeBattle()");
 assert.equal(run("canInitiateBattle(0)"),false);
 assert.equal(run("battleAnalysis(0)"),false);
 assert.equal(run("state.force.length"),1);
 assert.equal(run("state.used.length"),1);
});

test('Battle initiation fails closed without cost, presence or correct phase',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,activeSide:'Light',botTurn:null,gameWinner:null,pendingForceLoss:null,locations:[{name:'Tatooine: Mos Eisley'}],light:[[{ability:2}]],dark:[[{ability:1}]],force:[],used:[],battledSitesThisTurn:[],log:[]}");
 assert.equal(run("canInitiateBattle(0)"),false);
 assert.equal(run("battleAnalysis(0)"),false);
 run("state.force.push({id:'f'})");
 assert.equal(run("canInitiateBattle(0)"),true);
 run("state.dark[0][0].ability=null");
 assert.equal(run("canInitiateBattle(0)"),false);
 run("state.dark[0][0].ability=1;state.phase=2");
 assert.equal(run("canInitiateBattle(0)"),false);
 run("state.phase=3;state.pendingForceLoss={payer:'Light',remaining:1}");
 assert.equal(run("canInitiateBattle(0)"),false);
 run("state.pendingForceLoss=null;state.activeSide='Dark'");
 assert.equal(run("canInitiateBattle(0)"),false);
 run("state.activeSide='Light';state.gameWinner='Dark'");
 assert.equal(run("canInitiateBattle(0)"),false);
});

test('Battle site limit resets on a new turn',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};recirculateBoth=()=>{};botBegin=()=>{};state={phase:5,activeSide:'Light',botTurn:null,gameWinner:null,pendingForceLoss:null,activated:true,locations:[{name:'Tatooine: Mos Eisley'}],light:[[{ability:2}]],dark:[[{ability:1}]],force:[{id:'f'}],used:[],battledSitesThisTurn:[0],drainedSitesThisTurn:[],log:[]}");
 run("advance()");
 assert.equal(run("state.battledSitesThisTurn.length"),0);
 assert.equal(run("state.activeSide"),'Dark');
});

test('non-spy deployment needs friendly Force icons or confirmed presence',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Hoth: A',type:'Location',subType:'Site',icons:{light:0,dark:1}}],force:[{}],botForce:[{}],light:[[]],dark:[[]]};const rebel={name:'Rebel',type:'Character',deploy:1,side:'Light'};");
 assert.equal(run("checkDeployment(rebel,state.locations[0])"),false);
 run("state.locations[0].icons.light=1");
 assert.equal(run("checkDeployment(rebel,state.locations[0])"),true);
 run("state.locations[0].icons.light=0;state.light[0]=[{name:'Luke',ability:2}]");
 assert.equal(run("checkDeployment(rebel,state.locations[0])"),true);
 run("state.light[0]=[{name:'Unresolved',ability:null}]");
 assert.equal(run("checkDeployment(rebel,state.locations[0])"),false);
});
test('spies ignore local Force-icon and presence requirement but still pay deploy costs',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Death Star: A',type:'Location',subType:'Site',icons:{light:0,dark:0}}],force:[{}],botForce:[],light:[[]],dark:[[]]};const spy={name:'Leia Organa',type:'Character',deploy:1,characteristics:['spy']};");
 assert.equal(run("checkDeployment(spy,state.locations[0])"),true);
 run("state.force=[]");
 assert.equal(run("checkDeployment(spy,state.locations[0])"),false);
 run("state.force=[{}];spy.characteristics=[];spy.lore='Secret Imperial spy.'");
 assert.equal(run("checkDeployment(spy,state.locations[0])"),true);
 run("spy.lore='Soldier with no special training'");
 assert.equal(run("checkDeployment(spy,state.locations[0])"),false);
});
test('bot considers only legal Dark deployments and can use spies',()=>{
 const {run}=harness();
 run("state={phase:2,activeSide:'Dark',locations:[{name:'Hoth: A',type:'Location',subType:'Site',icons:{light:1,dark:0}},{name:'Hoth: B',type:'Location',subType:'Site',icons:{light:0,dark:2}}],force:[{}],botForce:[{}],light:[[],[]],dark:[[],[]],botHand:[{name:'Stormtrooper',side:'Dark',type:'Character',deploy:1}]};const deployOptions=()=>legalActions(state,'Dark').filter(option=>option.kind==='deploy');");
 assert.equal(run("deployOptions().length"),1);
 assert.equal(run("deployOptions()[0].args[1]"),1);
 run("state.locations[1].icons.dark=0");
 assert.equal(run("deployOptions().length"),0);
 run("state.botHand[0].characteristics=['spy']");
 assert.equal(run("deployOptions().length"),2);
 run("state.botForce=[]");
 assert.equal(run("deployOptions().length"),0);
});
test('character cannot deploy directly to a system even with own icons',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Tatooine',type:'Location',subType:'System',icons:{light:2,dark:1}}],force:[{}],botForce:[{}],light:[[]],dark:[[]]};");
 assert.equal(run("checkDeployment({name:'Luke',type:'Character',deploy:1,characteristics:['spy']},state.locations[0])"),false);
});

test('battle forfeit covers attrition and battle damage simultaneously',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,gameWinner:null,locations:[{name:'Hoth'}],light:[[{name:'Rebel',power:4,forfeit:4}]],dark:[[{name:'Trooper',power:7,forfeit:2}]],hand:[{name:'Hand'}],deck:[{name:'Deck'}],force:[{name:'Force'}],used:[],lost:[],botHand:[],botDeck:[{name:'DDeck'}],botForce:[],botUsed:[],botLost:[],log:[]};battleSession={site:0,lightCard:{name:'Destiny L'},darkCard:{name:'Destiny D'},lightDestiny:0,darkDestiny:2,lightLoss:[0],darkLoss:[],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,resolved:false}");
 assert.equal(run("battleForfeitPlan('Light').incoming"),2);
 assert.equal(run("battleDamagePreview().lightDamage"),5);
 assert.equal(run("resolveBattleLosses()"),true);
 assert.equal(run("state.lost.length"),1);
 assert.equal(run("state.pendingForceLoss.remaining"),1);
 assert.equal(run("state.pendingForceLoss.reason"),'battleDamage');
 assert.equal(run("battleSession"),null);
 assert.equal(run("loseForceForDrain('Light','hand',0)"),true);
 assert.equal(run("state.pendingForceLoss"),null);
 assert.equal(run("state.lost.length"),2);
});
test('battle remains unresolved if some attrition is uncovered while cards remain',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,gameWinner:null,locations:[{name:'Hoth'}],light:[[{name:'Light',power:5,forfeit:2}]],dark:[[{name:'A',power:2,forfeit:1},{name:'B',power:1,forfeit:1}]],hand:[],deck:[{name:'LD'}],force:[],used:[],lost:[],botHand:[],botDeck:[{name:'DD'}],botForce:[],botUsed:[],botLost:[],log:[]};battleSession={site:0,lightCard:{name:'Destiny L'},darkCard:{name:'Destiny D'},lightDestiny:3,darkDestiny:0,lightLoss:[],darkLoss:[0],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,resolved:false}");
 assert.equal(run("battleForfeitPlan('Dark').valid"),false);
 assert.equal(run("resolveBattleLosses()"),false);
 assert.equal(run("state.dark[0].length"),2);
 assert.equal(run("state.botLost.length"),0);
 run("battleSession.darkLoss=[0,1]");
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
});
test('bot automatically pays remaining battle damage from its hand and Life Force',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,gameWinner:null,locations:[{name:'Hoth'}],light:[[{name:'Light',power:5,forfeit:2}]],dark:[[{name:'Dark',power:2,forfeit:2}]],hand:[],deck:[{name:'LD'}],force:[],used:[],lost:[],botHand:[{name:'DH1'},{name:'DH2'}],botDeck:[{name:'DD'}],botForce:[{name:'DF'}],botUsed:[],botLost:[],log:[]};battleSession={site:0,lightCard:{name:'Destiny L'},darkCard:{name:'Destiny D'},lightDestiny:2,darkDestiny:0,lightLoss:[],darkLoss:[0],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,resolved:false}");
 assert.equal(run("battleForfeitPlan('Dark').remainingDamage"),3);
 assert.equal(run("resolveBattleLosses()"),true);
 assert.equal(run("state.botLost.length"),4);
 assert.equal(run("state.pendingForceLoss"),null);
 assert.equal(run("state.gameWinner"),null);
});
test('skipped battle destiny cannot generate attrition via a manual destiny bonus',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth'}],light:[[{name:'L',power:2,forfeit:1}]],dark:[[{name:'D',power:2,forfeit:1}]]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:{name:'Destiny D'},lightDestiny:0,darkDestiny:0,lightBonus:6,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[],darkLoss:[]}");
 assert.equal(run("battleAttritionAgainst('Dark')"),0);
 assert.equal(run("battleAttritionAgainst('Light')"),0);
});
test('unneeded extra forfeits are refused when all debts already satisfied',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth'}],light:[[{name:'A',power:2,forfeit:5},{name:'B',power:2,forfeit:5}]],dark:[[{name:'D',power:5,forfeit:1}]]};battleSession={site:0,lightCard:{name:'Destiny L'},darkCard:{name:'Destiny D'},lightDestiny:0,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[0,1],darkLoss:[]}");
 assert.equal(run("battleForfeitPlan('Light').valid"),false);
});

test('Dark side character uses one Force to move to adjacent site and cannot move twice',()=>{
 const {run}=harness();
 run("render=()=>{};const trooper={name:'Stormtrooper',type:'Character',deploy:1,ability:1};state={phase:0,activeSide:'Dark',botTurn:{steps:[],index:0},locations:[{name:'Tatooine: A',type:'Location',subType:'Site',icons:{light:0}},{name:'Tatooine: B',type:'Location',subType:'Site',icons:{light:2}}],light:[[],[]],dark:[[trooper],[]],botForce:[{id:'one'}],botUsed:[],movedThisTurn:[],log:[]};");
 assert.equal(run("movementOptionsFor('Dark').length"),0);
 run("state.phase=4");
 assert.equal(run("movementOptionsFor('Dark').length"),1);
 assert.equal(run("moveCharacterFor('Dark',0,0,1)"),true);
 assert.equal(run("state.botForce.length"),0);
 assert.equal(run("state.botUsed.length"),1);
 assert.equal(run("state.dark[0].length"),0);
 assert.equal(run("state.dark[1][0].name"),'Stormtrooper');
 assert.equal(run("movementOptionsFor('Dark').length"),0);
 assert.equal(run("moveCharacterFor('Dark',1,0,0)"),false);
});

test('movement options reject wrong side, wrong phase and insufficient Force',()=>{
 const {run}=harness();
 run("const rebel={name:'Rebel',type:'Character',deploy:1};const trooper={name:'Trooper',type:'Character',deploy:1};state={phase:4,activeSide:'Light',botTurn:null,locations:[{name:'Hoth: A',type:'Location',subType:'Site'},{name:'Hoth: B',type:'Location',subType:'Site'}],light:[[rebel],[]],dark:[[trooper],[]],force:[{}],botForce:[{}],movedThisTurn:[],log:[]};");
 assert.equal(run("movementOptionsFor('Light').length"),1);
 assert.equal(run("movementOptionsFor('Dark').length"),0);
 run("state.phase=3");
 assert.equal(run("movementOptionsFor('Light').length"),0);
 run("state.phase=4;state.force=[]");
 assert.equal(run("movementOptionsFor('Light').length"),0);
 run("state.activeSide='Dark';state.botTurn={steps:[],index:0}");
 assert.equal(run("movementOptionsFor('Light').length"),0);
 assert.equal(run("movementOptionsFor('Dark').length"),1);
 run("state.botForce=[]");
 assert.equal(run("movementOptionsFor('Dark').length"),0);
});

test('Dark bot schedules a Move phase and moves toward opponent Force icons',()=>{
 const {run}=harness();
 assert.equal(run("botPlan().map(s=>s.kind).join(',')"),'activate,control,deploy,battle,move,draw,finish');
 run("render=()=>{};const trooper={name:'Trooper',type:'Character',deploy:1,ability:1};state={turn:2,phase:0,activeSide:'Dark',botTurn:{steps:[{kind:'move'}],index:0},locations:[{name:'Tatooine: A',type:'Location',subType:'Site',icons:{light:0,dark:1}},{name:'Tatooine: B',type:'Location',subType:'Site',icons:{light:2,dark:0}}],light:[[],[]],dark:[[trooper],[]],botForce:[{id:'force'}],botUsed:[],movedThisTurn:[],botHistory:[],log:[]};");
 run("botNextStep()");
 assert.equal(run("state.dark[1][0].name"),'Trooper');
 assert.equal(run("state.botUsed.length"),1);
 assert.equal(run("state.botForce.length"),0);
 assert.equal(run("state.movedThisTurn.length"),1);
 assert.equal(run("state.botHistory[0].includes('Move: Bot bewegt')"),true);
});

test('Dark bot does not spend Force when no legal adjacent destination exists',()=>{
 const {run}=harness();
 run("render=()=>{};const trooper={name:'Trooper',type:'Character',deploy:1,ability:1};state={turn:2,activeSide:'Dark',phase:0,botTurn:{steps:[{kind:'move'}],index:0},locations:[{name:'Tatooine: A',type:'Location',subType:'Site',icons:{light:0}},{name:'Hoth: B',type:'Location',subType:'Site',icons:{light:2}}],light:[[],[]],dark:[[trooper],[]],botForce:[{id:'force'}],botUsed:[],movedThisTurn:[],botHistory:[],log:[]};");
 run("botNextStep()");
 assert.equal(run("state.dark[0].length"),1);
 assert.equal(run("state.botForce.length"),1);
 assert.equal(run("state.botUsed.length"),0);
});

test('droids count as zero ability, cannot create presence, and do not block allied known ability',()=>{
 const {run}=harness();
 run("const bot={id:'Dark:816',name:'EG-6',type:'Character',subType:'Droid',ability:null,power:0};state={locations:[{name:'Tatooine: Cantina',type:'Location',subType:'Site'}],light:[[]],dark:[[bot]]};");
 assert.equal(run("cardAbility(state.dark[0][0])"),0);
 assert.equal(run("confirmedPresence('Dark',0)"),false);
 assert.equal(run("battleTotals(0).darkAbility"),0);
 run("state.dark[0].push({name:'Officer',type:'Character',subType:'Imperial',ability:4,power:2})");
 assert.equal(run("confirmedPresence('Dark',0)"),true);
 assert.equal(run("battleTotals(0).darkAbility"),4);
});
test('unknown non-droid ability remains unknown when no known presence or destiny threshold exists',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Hoth: Site',type:'Location',subType:'Site'}],light:[[{name:'Unknown',type:'Character',subType:'Alien',ability:null,power:2}]],dark:[[]]};");
 assert.equal(run("cardAbility(state.light[0][0])"),null);
 assert.equal(run("confirmedPresence('Light',0)"),null);
 assert.equal(run("battleTotals(0).lightAbility"),null);
 run("state.light[0].push({name:'Rebel',type:'Character',ability:4,power:2})");
 assert.equal(run("confirmedPresence('Light',0)"),true);
 assert.equal(run("battleTotals(0).lightAbility"),4);
});
test('EG-6 boosts friendly non-power droids present, but not itself, power droids or enemies',()=>{
 const {run}=harness();
 run("const eg={id:'Dark:816',name:'EG-6',type:'Character',subType:'Droid',power:0,extraText:['Power Droid'],gametext:'Adds 1 to power of each of your droids present, except power droids.'};const astromech={name:'R1',type:'Character',subType:'Droid',power:2};const otherPower={name:'Power Droid',type:'Character',subType:'Droid',power:3,extraText:['Power Droid']};const lightDroid={name:'R2',type:'Character',subType:'Droid',power:1};state={locations:[{name:'Tatooine: A',type:'Location',subType:'Site'}],light:[[lightDroid]],dark:[[eg,astromech,otherPower]]};");
 assert.equal(run("cardPowerModifier(state.dark[0][1],'Dark',0)"),1);
 assert.equal(run("cardPowerModifier(state.dark[0][0],'Dark',0)"),0);
 assert.equal(run("cardPowerModifier(state.dark[0][2],'Dark',0)"),0);
 assert.equal(run("cardPowerModifier(state.light[0][0],'Light',0)"),0);
 assert.equal(run("battleTotals(0).darkPower"),6);
 run("state.dark[0].push(state.dark[0][0])");
 assert.equal(run("cardPowerModifier(state.dark[0][1],'Dark',0)"),2);
});
test('starred EG-6 destiny is explicitly zero, locations are zero, unknown non-locations stay unknown',()=>{
 const {run}=harness();
 assert.equal(run("printedBattleDestiny({id:'Dark:816',type:'Character',destiny:NaN,gametext:'*Destiny equals zero'})"),0);
 assert.equal(run("printedBattleDestiny({type:'Location',subType:'Site',destiny:null})"),0);
 assert.equal(run("printedBattleDestiny({type:'Character',destiny:null})"),null);
 assert.equal(run("printedBattleDestiny({type:'Character',destiny:3})"),3);
});
test('EG-6 battle destiny doubles underdog Dark present power once, not battle destiny',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Tatooine: A',type:'Location',subType:'Site'}],light:[[{name:'Rebel',type:'Character',ability:4,power:5}]],dark:[[{name:'Trooper',type:'Character',ability:4,power:3}]],deck:[],used:[],botDeck:[{id:'Dark:816',name:'EG-6',destiny:NaN,gametext:'*Destiny equals zero, but if drawn as a battle destiny where you have less power than opponent, your total power present is doubled (once per battle).'}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Dark')");
 assert.equal(run("battleSession.darkDestiny"),0);
 assert.equal(run("battleSession.darkPowerDoubled"),true);
 assert.equal(run("battleDamagePreview().darkTotal"),6);
 assert.equal(run("battleDamagePreview().lightDamage"),1);
 assert.equal(run("state.botUsed.length"),1);
});
test('EG-6 destiny does not double Dark power if already tied or stronger',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Tatooine: A',type:'Location',subType:'Site'}],light:[[{name:'Rebel',type:'Character',ability:4,power:3}]],dark:[[{name:'Trooper',type:'Character',ability:4,power:3}]],deck:[],used:[],botDeck:[{id:'Dark:816',name:'EG-6',destiny:NaN,gametext:'*Destiny equals zero, but if drawn as a battle destiny where you have less power than opponent, your total power present is doubled (once per battle).'}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Dark')");
 assert.equal(run("battleSession.darkPowerDoubled"),undefined);
 assert.equal(run("battleDamagePreview().darkTotal"),3);
});


test('printed unconditional immunity is strict and conditional/granted immunity is excluded',()=>{
 const {run}=harness();
 assert.equal(run("printedAttritionImmunityBelow({gametext:'Immune to attrition < 5.'})"),5);
 assert.equal(run("printedAttritionImmunityBelow({gametext:\"Adds 1 to power. 'Diplomatic' immunity to attrition < 2.\"})"),2);
 assert.equal(run("printedAttritionImmunityBelow({gametext:'Immune to attrition < 5 if Han pilots.'})"),null);
 assert.equal(run("printedAttritionImmunityBelow({gametext:'Adds immunity to attrition < 2 to all vehicles.'})"),null);
 assert.equal(run("immuneToBattleAttrition({gametext:'Immune to attrition < 5.'},4)"),true);
 assert.equal(run("immuneToBattleAttrition({gametext:'Immune to attrition < 5.'},5)"),false);
});
test('immune Vader still requires vulnerable Trooper forfeit when attrition is 4',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Tatooine: A'}],light:[[{name:'Rebel',forfeit:7,power:8,ability:4}]],dark:[[{name:'Vader',forfeit:8,power:6,gametext:'Immune to attrition < 5.'},{name:'Trooper',forfeit:2,power:2}]]};battleSession={site:0,lightCard:{name:'Draw'},darkCard:{name:'Freiwillig verzichtet'},lightDestiny:4,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[],darkLoss:[]};");
 assert.equal(run("battleForfeitPlan('Dark').valid"),false);
 run("battleSession.darkLoss=[1]");
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
 assert.equal(run("battleForfeitPlan('Dark').sum"),2);
 run("battleSession.darkLoss=[0]");
 assert.equal(run("battleForfeitPlan('Dark').valid"),false);
});
test('at immunity threshold Vader must be eligible for attrition',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{name:'Rebel',forfeit:7,power:5,ability:4}]],dark:[[{name:'Vader',forfeit:8,power:6,gametext:'Immune to attrition < 5.'}]]};battleSession={site:0,lightCard:{name:'Draw'},darkCard:{name:'Freiwillig verzichtet'},lightDestiny:5,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[],darkLoss:[]};");
 assert.equal(run("battleForfeitPlan('Dark').valid"),false);
 run("battleSession.darkLoss=[0]");
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
});
test('immune Vader can forfeit to cover battle damage only after Trooper covers attrition',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{name:'Rebel',forfeit:7,power:10,ability:4}]],dark:[[{name:'Vader',forfeit:8,power:6,gametext:'Immune to attrition < 5.'},{name:'Trooper',forfeit:2,power:2}]]};battleSession={site:0,lightCard:{name:'Draw'},darkCard:{name:'Freiwillig verzichtet'},lightDestiny:4,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[],darkLoss:[0,1]};");
 assert.equal(run("battleDamagePreview().darkDamage"),6);
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
 assert.equal(run("battleForfeitPlan('Dark').remainingDamage"),0);
});
test('all immune cards survive attrition without forfeit but battle damage remains payable',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{name:'Rebel',power:10,ability:4}]],dark:[[{name:'Vader',forfeit:8,power:6,gametext:'Immune to attrition < 5.'}]]};battleSession={site:0,lightCard:{name:'Draw'},darkCard:{name:'Freiwillig verzichtet'},lightDestiny:4,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,lightLoss:[],darkLoss:[]};");
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
 assert.equal(run("battleForfeitPlan('Dark').remainingDamage"),8);
});


test('Premiere location text raises battle destiny threshold only for the named side',()=>{
 const {run}=harness();
 run("state={locations:[{id:'Light:2448',name:'Tatooine: Dune Sea',type:'Location',subType:'Site',gametext:'Light: Blank. Dark: Total ability of 6 or more required for you to draw battle destiny here.'},{id:'Dark:2458',name:'Tatooine: Jundland Wastes',type:'Location',subType:'Site',gametext:'Dark: Your Tusken Raiders are forfeit +1. Light: Total ability of 6 or more required for you to draw battle destiny here.'},{id:'Dark:1426',name:'Kessel',type:'Location',subType:'System',gametext:'Dark: Blank. Light: Total ability of 6 or more required for you to draw battle destiny here.'},{name:'Hoth: A',type:'Location',subType:'Site',gametext:'Dark: Blank.'}]};");
 assert.equal(run("minimumBattleDestinyAbility('Dark',0)"),6);
 assert.equal(run("minimumBattleDestinyAbility('Light',0)"),4);
 assert.equal(run("minimumBattleDestinyAbility('Light',1)"),6);
 assert.equal(run("minimumBattleDestinyAbility('Dark',1)"),4);
 assert.equal(run("minimumBattleDestinyAbility('Light',2)"),6);
 assert.equal(run("minimumBattleDestinyAbility('Dark',3)"),4);
});
test('Dark bot must skip destiny at Dune Sea with ability 4 despite having Force',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Tatooine: Dune Sea',type:'Location',subType:'Site',gametext:'Light: Blank. Dark: Total ability of 6 or more required for you to draw battle destiny here.'}],light:[[{name:'L',ability:4,power:2}]],dark:[[{name:'D',ability:4,power:2}]],deck:[],used:[],botDeck:[{name:'Dark destiny',destiny:5}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("botDestinyDecision()");
 assert.equal(run("battleSession.darkCard.name"),'Freiwillig verzichtet');
 assert.equal(run("battleSession.darkDestiny"),0);
 assert.equal(run("state.botDeck.length"),1);
 assert.equal(run("state.botUsed.length"),0);
});
test('Dark bot draws battle destiny at Dune Sea with ability at least 6',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Tatooine: Dune Sea',type:'Location',subType:'Site',gametext:'Light: Blank. Dark: Total ability of 6 or more required for you to draw battle destiny here.'}],light:[[{name:'L',ability:4,power:2}]],dark:[[{name:'D',ability:6,power:2}]],deck:[],used:[],botDeck:[{name:'Dark destiny',destiny:5}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("botDestinyDecision()");
 assert.equal(run("battleSession.darkDestiny"),5);
 assert.equal(run("state.botDeck.length"),0);
 assert.equal(run("state.botUsed.length"),1);
});
test('Vader increases each Dark battle destiny draw and therefore opposing attrition',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Hoth: A',type:'Location',subType:'Site'}],light:[[{name:'Rebel',ability:4,power:4}]],dark:[[{id:'Dark:634',name:'Vader',ability:6,power:6,gametext:'When in battle, adds 1 to each of your battle destiny draws. Immune to attrition < 5.'}]],deck:[],used:[],botDeck:[{name:'Destiny D',type:'Character',destiny:2}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Dark')");
 assert.equal(run("battleSession.darkDestiny"),3);
 assert.equal(run("battleAttritionAgainst('Light')"),3);
 assert.equal(run("battleDamagePreview().darkTotal"),9);
 assert.equal(run("state.botDeck.length"),0);
 assert.equal(run("state.botUsed.length"),1);
});
test('Vader bonus does not apply when absent, and never generates attrition from skipped destiny',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Hoth: A',type:'Location',subType:'Site'}],light:[[{name:'Rebel',ability:4,power:4}]],dark:[[{name:'Trooper',ability:4,power:3}]],deck:[],used:[],botDeck:[{name:'Destiny D',destiny:2}],botUsed:[],log:[]};battleSession={site:0,lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Dark')");
 assert.equal(run("battleSession.darkDestiny"),2);
 run("battleSession.darkCard=null;battleSession.darkDestiny=null;state.dark[0].push({id:'Dark:634',name:'Vader',gametext:'When in battle, adds 1 to each of your battle destiny draws.'});skipDestiny('Dark')");
 assert.equal(run("battleSession.darkDestiny"),0);
 assert.equal(run("battleAttritionAgainst('Light')"),0);
});

test('Death Star War Room grants actual second Light battle destiny only to the initiator',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{id:'Dark:682',name:'Death Star: War Room',type:'Location',subType:'Site',gametext:'Dark: If you control, with a leader here, all Rebel Troopers are forfeit -1. Light: If you initiate a battle here, add one battle destiny.'}],light:[[{ability:4,power:5}]],dark:[[{ability:4,power:4}]],deck:[{name:'Second',destiny:2},{name:'First',destiny:3}],used:[],botDeck:[],botUsed:[],log:[]};battleSession={site:0,initiator:'Light',lightCard:null,darkCard:{name:'Freiwillig verzichtet'},lightDestiny:null,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("battleDestinyDrawCount('Light',0,4)"),2);
 run("battleDestiny('Light')");
 assert.equal(run("battleSession.lightDestiny"),5);
 assert.equal(run("battleSession.lightDrawCards.length"),2);
 assert.equal(run("state.deck.length"),0);
 assert.equal(run("state.used.length"),2);
 assert.equal(run("battleAttritionAgainst('Dark')"),5);
 assert.equal(run("battleDamagePreview().lightTotal"),10);
});
test('War Room bonus allows one added battle destiny with ability below four',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{id:'Dark:682',name:'Death Star: War Room',type:'Location',subType:'Site',gametext:'Light: If you initiate a battle here, add one battle destiny.'}],light:[[{ability:1,power:1}]],dark:[[{ability:4,power:4}]],deck:[{name:'Bonus',destiny:4}],used:[],botDeck:[],botUsed:[],log:[]};battleSession={site:0,initiator:'Light',lightCard:null,darkCard:{name:'Freiwillig verzichtet'},lightDestiny:null,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("battleDestinyDrawCount('Light',0,1)"),1);
 run("battleDestiny('Light')");
 assert.equal(run("battleSession.lightDestiny"),4);
 assert.equal(run("state.used.length"),1);
});
test('War Room bonus is side- and initiator-specific and fails closed on missing printed text',()=>{
 const {run}=harness();
 run("state={locations:[{id:'Dark:682',name:'Death Star: War Room',type:'Location',subType:'Site',gametext:'Light: If you initiate a battle here, add one battle destiny.'}]};battleSession={site:0,initiator:'Dark'};");
 assert.equal(run("printedWarRoomExtraBattleDestiny('Light',0)"),0);
 assert.equal(run("battleDestinyDrawCount('Dark',0,4)"),1);
 run("battleSession.initiator='Light'");
 assert.equal(run("printedWarRoomExtraBattleDestiny('Light',0)"),1);
 assert.equal(run("printedWarRoomExtraBattleDestiny('Dark',0)"),0);
 run("state.locations[0].gametext='Light: Another unrelated ability.'");
 assert.equal(run("printedWarRoomExtraBattleDestiny('Light',0)"),0);
 assert.equal(run("battleDestinyDrawCount('Light',0,null)"),null);
});
test('Massassi War Room adds Dark battle destiny with Vader +1 on every actual draw',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{id:'Light:2859',name:'Yavin 4: Massassi War Room',type:'Location',subType:'Site',gametext:'Light: If you control, with a leader here, all Stormtroopers are forfeit -1. Dark: If you initiate a battle here, add one battle destiny.'}],light:[[{ability:4,power:4}]],dark:[[{id:'Dark:634',name:'Vader',ability:6,power:6,gametext:'When in battle, adds 1 to each of your battle destiny draws.'}]],deck:[],used:[],botDeck:[{name:'Second',destiny:2},{name:'First',destiny:1}],botUsed:[],log:[]};battleSession={site:0,initiator:'Dark',lightCard:{name:'Freiwillig verzichtet'},darkCard:null,lightDestiny:0,darkDestiny:null,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("battleDestinyDrawCount('Dark',0,6)"),2);
 run("battleDestiny('Dark')");
 assert.equal(run("battleSession.darkDestiny"),5);
 assert.equal(run("battleSession.darkDrawCards.length"),2);
 assert.equal(run("state.botUsed.length"),2);
 assert.equal(run("battleAttritionAgainst('Light')"),5);
});
test('Two entitled draws with only one Reserve card draw only once and never invent destiny',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{id:'Dark:682',name:'Death Star: War Room',type:'Location',subType:'Site',gametext:'Light: If you initiate a battle here, add one battle destiny.'}],light:[[{ability:4,power:2}]],dark:[[{ability:4,power:2}]],deck:[{name:'Only',destiny:6}],used:[],botDeck:[],botUsed:[],log:[]};battleSession={site:0,initiator:'Light',lightCard:null,darkCard:{name:'Freiwillig verzichtet'},lightDestiny:null,darkDestiny:0,lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Light')");
 assert.equal(run("battleSession.lightDestiny"),6);
 assert.equal(run("battleSession.lightDrawCards.length"),1);
 assert.equal(run("state.used.length"),1);
 assert.equal(run("state.deck.length"),0);
});

test('Dark bot can initiate exactly one battle at a site for 1 Force',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,activeSide:'Dark',botTurn:{steps:[],index:0},locations:[{name:'Hoth: A'}],light:[[{ability:2,power:3}]],dark:[[{ability:4,power:5}]],force:[],used:[],botForce:[{id:'one'},{id:'two'}],botUsed:[],battledSitesThisTurn:[],log:[]};");
 assert.equal(run("canInitiateBattleFor('Dark',0)"),true);
 assert.equal(run("initiateBattleFor('Dark',0)"),true);
 assert.equal(run("state.botForce.length"),1);
 assert.equal(run("state.botUsed[0].id"),'two');
 assert.equal(run("battleSession.initiator"),'Dark');
 assert.equal(run("state.battledSitesThisTurn.includes(0)"),true);
 assert.equal(run("canInitiateBattleFor('Dark',0)"),false);
});
test('Dark bot battle step follows deploy and draws destiny before human Light side',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={turn:2,phase:2,activeSide:'Dark',botTurn:{steps:[{kind:'battle'},{kind:'move'}],index:0},locations:[{name:'Hoth: A',type:'Location',subType:'Site'}],light:[[{name:'Rebel',ability:4,power:3,forfeit:3}]],dark:[[{name:'Trooper',ability:4,power:4,forfeit:4}]],force:[],used:[],deck:[{name:'Light destiny',destiny:2}],botDeck:[{name:'Dark destiny',destiny:3}],botForce:[{name:'Payment'}],botUsed:[],battledSitesThisTurn:[],log:[],botHistory:[]};");
 run("botNextStep()");
 assert.equal(run("state.phase"),3);
 assert.equal(run("battleSession.initiator"),'Dark');
 assert.equal(run("battleSession.darkDestiny"),3);
 assert.equal(run("battleSession.lightCard"),null);
 assert.equal(run("state.botUsed.length"),2);
 assert.equal(run("state.botTurn.index"),1);
 run("botNextStep()");
 assert.equal(run("state.botTurn.index"),1);
 run("battleDestiny('Light')");
 assert.equal(run("battleSession.lightDestiny"),2);
});
test('battle destiny is always drawn by the initiator first',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,locations:[{name:'Hoth: A',type:'Location',subType:'Site'}],light:[[{ability:4,power:2,forfeit:2}]],dark:[[{ability:4,power:2,forfeit:2}]],deck:[{name:'L',destiny:5}],botDeck:[{name:'D',destiny:2}],used:[],botUsed:[],log:[]};battleSession={site:0,initiator:'Dark',lightCard:null,darkCard:null,lightDestiny:null,darkDestiny:null,lightLoss:[],darkLoss:[],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 run("battleDestiny('Light')");
 assert.equal(run("state.deck.length"),1);
 assert.equal(run("battleSession.lightCard"),null);
 run("botDestinyDecision()");
 assert.equal(run("battleSession.darkDestiny"),2);
 run("battleDestiny('Light')");
 assert.equal(run("battleSession.lightDestiny"),5);
 assert.equal(run("state.used.length"),1);
});
test('Dark bot selects mandatory nonimmune forfeit while preserving immune Vader',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Hoth: A'}],light:[[{name:'Rebel',ability:4,power:10,forfeit:7}]],dark:[[{name:'Vader',ability:6,power:6,forfeit:8,gametext:'Immune to attrition < 5.'},{name:'Trooper',ability:1,power:2,forfeit:2}]],log:[]};battleSession={site:0,initiator:'Dark',lightCard:{name:'Draw'},darkCard:{name:'Freiwillig verzichtet'},lightDestiny:4,darkDestiny:0,lightLoss:[],darkLoss:[],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0,botForfeitsPending:true};");
 assert.equal(run("botChooseForfeits()"),true);
 assert.equal(run("battleSession.darkLoss.join(',')"),'1');
 assert.equal(run("battleSession.botForfeitsPending"),false);
 assert.equal(run("battleForfeitPlan('Dark').valid"),true);
});
test('Dark bot cannot battle without Force, confirmed presence, or correct phase',()=>{
 const {run}=harness();
 run("render=()=>{};state={turn:1,phase:3,activeSide:'Dark',botTurn:{steps:[{kind:'battle'}],index:0},locations:[{name:'Hoth: A'}],light:[[{ability:4,power:2}]],dark:[[{ability:4,power:2}]],botForce:[],botUsed:[],battledSitesThisTurn:[],log:[],botHistory:[]};");
 assert.equal(run("canInitiateBattleFor('Dark',0)"),false);
 run("state.botForce=[{id:'f'}];state.dark[0][0].ability=null");
 assert.equal(run("canInitiateBattleFor('Dark',0)"),false);
 run("state.dark[0][0].ability=4;state.phase=2");
 assert.equal(run("canInitiateBattleFor('Dark',0)"),false);
 // The bot advances its own phase to Battle; unresolved presence must still prevent initiation.
 run("state.dark[0][0].ability=null;botNextStep()");
 assert.equal(run("state.botForce.length"),1);
 assert.equal(run("battleSession"),null);
 assert.equal(run("state.botTurn.index"),1);
});

test('initiated battles cannot be abandoned before paying attrition and damage',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};state={phase:3,activeSide:'Light',botTurn:null,locations:[{name:'Hoth: A'}],light:[[{ability:4,power:3}]],dark:[[{ability:1,power:2}]],force:[{id:'f'}],used:[],battledSitesThisTurn:[],log:[]};");
 assert.equal(run("battleAnalysis(0)"),true);
 assert.equal(run("closeBattle()"),false);
 assert.equal(run("battleSession.initiator"),'Light');
 assert.equal(run("state.used.length"),1);
});

test('weapon hit obliges forfeiture even when attrition and battle damage are zero',()=>{
 const {run}=harness();
 run("render=()=>{};renderBattle=()=>{};const hit={name:'Hit trooper',power:4,ability:4,forfeit:3};state={phase:3,locations:[{name:'Tatooine: A'}],light:[[hit]],dark:[[{name:'Dark',power:4,ability:1,forfeit:1}]],lost:[],botLost:[],log:[],deck:[],used:[],botDeck:[],botUsed:[],force:[],botForce:[]};battleSession={site:0,initiator:'Light',lightDestiny:0,darkDestiny:0,lightCard:{name:'Skipped'},darkCard:{name:'Skipped'},lightLoss:[],darkLoss:[],weaponHits:{Light:[],Dark:[]},lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("recordBattleWeaponHit('Light',0)"),true);
 assert.equal(run("battleSession.lightLoss.includes(0)"),true);
 assert.equal(run("battleForfeitPlan('Light').valid"),true);
 run("toggleLoss('Light',0)");
 assert.equal(run("battleSession.lightLoss.includes(0)"),true);
 assert.equal(run("resolveBattleLosses()"),true);
 assert.equal(run("state.lost[0].name"),'Hit trooper');
 assert.equal(run("state.light[0].length"),0);
});
test('weapon hit cannot be ignored even if the target is immune to attrition',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Tatooine: A'}],light:[[{name:'Immune',forfeit:5,gametext:'Immune to attrition < 5.'}]],dark:[[]],log:[]};battleSession={site:0,lightCard:{name:'Drawn'},darkCard:{name:'Drawn'},lightDestiny:0,darkDestiny:1,lightLoss:[],darkLoss:[],lightBonus:0,darkBonus:0,lightPowerMod:0,darkPowerMod:0};");
 assert.equal(run("recordBattleWeaponHit('Light',0)"),true);
 assert.equal(run("battleForfeitPlan('Light').valid"),true);
 run("battleSession.lightLoss=[]");
 assert.equal(run("battleForfeitPlan('Light').valid"),false);
});
test('weapon hit registration rejects invalid targets and phases',()=>{
 const {run}=harness();
 run("state={phase:3,locations:[{name:'Site'}],light:[[{name:'L'}]],dark:[[]],log:[]};battleSession={site:0,lightLoss:[],darkLoss:[]};");
 assert.equal(run("recordBattleWeaponHit('Dark',0)"),false);
 assert.equal(run("recordBattleWeaponHit('Light',2)"),false);
 assert.equal(run("recordBattleWeaponHit('Other',0)"),false);
 assert.equal(run("recordBattleWeaponHit('Light',0)"),true);
 assert.equal(run("recordBattleWeaponHit('Light',0)"),true);
 assert.equal(run("battleSession.weaponHits.Light.length"),1);
 run("state.phase=4");
 assert.equal(run("recordBattleWeaponHit('Light',0)"),false);
});

const starterLists=JSON.parse(readFileSync(new URL('../data/premiere-starter-decks.json',import.meta.url),'utf8'));

async function premiereHarness(deckLists=starterLists){
 const {run,elements}=harness();
 const snapshot=readFileSync(new URL('../data/premiere.json',import.meta.url),'utf8');
 run(`fetch=async path=>{
  if(path==='data/premiere.json')return {ok:true,json:async()=>JSON.parse(${JSON.stringify(snapshot)})};
  if(path==='data/premiere-starter-decks.json'&&${deckLists!==null})return {ok:true,json:async()=>(${JSON.stringify(deckLists)})};
  return {ok:false,status:404};
 }`);
 await run('load()');
 return {run,elements};
}

test('the card inspector separates rules text, print scan, lore, German notes and special values',async()=>{
 const {run,elements}=await premiereHarness();
 assert.match(html,/<dialog id="cardInspector"[^>]+aria-labelledby="cardInspectorTitle">/);
 assert.equal(elements.get('cardInspector').open,false);
 run(`state={botHand:[catalog.find(card=>card.id==='Dark:816'),catalog.find(card=>card.id==='Dark:1767')]};inspectCard('Dark',0,'hand')`);
 assert.equal(elements.get('cardInspector').open,true);
 assert.equal(elements.get('cardInspectorTitle').textContent,run("state.botHand[0].name"));
 const eg6=elements.get('cardInspectorBody').innerHTML;
 assert.match(eg6,/Destiny \* \(Sonderwert\)/);
 assert.match(eg6,/Aktiver Spieltext.*Korrekturslip.*Drucktext im Kartenscan.*Lore.*Deutsche Erklärung/);
 run("inspectCard('Dark',1,'hand')");
 assert.match(elements.get('cardInspectorBody').innerHTML,/Aktiver Spieltext.*Verknüpfte Vor-Errata-Fassung/);
 run("closeCard();el('showBotHand').checked=false;inspectCard('Dark',0,'hand')");
 assert.equal(elements.get('cardInspector').open,false);
});

test('Premiere snapshot loads the four supported blasters into the starter decks',async()=>{
 const {run}=await premiereHarness();
 assert.equal(run("catalog.find(c=>c.name==='Rebel Trooper').warrior"),true);
 assert.deepEqual(JSON.parse(run('JSON.stringify(catalog.filter(basicWeaponRule).map(c=>c.id))')),['Light:259','Light:265','Dark:264','Dark:1264']);
 for(const side of ['light','dark']){
  assert.equal(run(`new Set(setupDecks.${side}.cards.filter(basicWeaponRule).map(c=>c.id)).size`),2);
 }
});

test('fixed starter lists load 60 cards per side and each new game gets independent copies',async()=>{
 const {run,elements}=await premiereHarness();
 assert.equal(elements.get('start').disabled,false);
 for(const [side,key] of [['Light','light'],['Dark','dark']]){
  const expected=starterLists.decks[side].cards.flatMap(({id,count})=>Array(count).fill(id));
  assert.equal(expected.length,60);
  const deck=`setupDecks.${key}`;
  assert.deepEqual(JSON.parse(run(`JSON.stringify(${deck}.cards.map(card=>card.id))`)),expected);
  assert.equal(run(`new Set(${deck}.cards).size`),60);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(startingLocationChoices(${deck}).map(x=>x.card.id))`)),starterLists.decks[side].startingLocations);
  run(`${deck}.cards[0].power=999`);
  run('start()');
  assert.notEqual(run(`${deck}.cards[0].power`),999);
 }
});

test('starter deck buttons open only the selected 60-card list on demand',async()=>{
 const {run,elements}=await premiereHarness();
 const dialog=run("el('starterDeckDialog')");
 const list=run("el('starterDeckCards')");
 assert.match(html,/<dialog id="starterDeckDialog"[^>]+aria-labelledby="starterDeckTitle">/);
 assert.match(html,/<form method="dialog"><button autofocus>Schließen<\/button><\/form>/);
 assert.equal(list.innerHTML,'');
 assert.equal(elements.has('effectCoverage'),false);
 assert.equal(dialog.open,false);

 for(const [side,card,otherCard] of [['Light','Rebel Trooper','Stormtrooper'],['Dark','Stormtrooper','Rebel Trooper']]){
  const button=elements.get('view'+side+'Deck');
  assert.equal(button.disabled,false);
  dialog.open=false;
  button.onclick();
  assert.equal(dialog.open,true);
  assert.equal(elements.get('starterDeckTitle').textContent,side+' Side Deck · 60 Karten');
  assert.ok(list.innerHTML.includes('10 × '+card));
  assert.ok(!list.innerHTML.includes('10 × '+otherCard));
  assert.equal([...list.innerHTML.matchAll(/<li>(\d+) × /g)].reduce((total,entry)=>total+Number(entry[1]),0),60);
 }

 run('showEffectCoverage()');
 assert.match(elements.get('effectCoverage').textContent,/OFFENE KARTEN/);
});

function assertStartingDecksPreserved(run,lists){
 for(const [side,hand,deck,lost] of [['Light','state.hand','state.deck','state.lost'],['Dark','state.botHand','state.botDeck','state.botLost']]){
  assert.equal(run(`${hand}.length`),8);
  assert.equal(run(`${lost}.length`),0);
  const board=`state.locations.filter(card=>card?.side==='${side}')`;
  const ids=JSON.parse(run(`JSON.stringify([...${hand},...${deck},...${board}].map(card=>card.id).sort())`));
  assert.deepEqual(ids,lists.decks[side].cards.flatMap(({id,count})=>Array(count).fill(id)).sort());
 }
 assert.equal(run('state.light.length===state.locations.length&&state.dark.length===state.locations.length'),true);
 assert.equal(run('state.locations.at(-1)'),null);
}

test('the bot commits a concealed start and both locations are revealed before shuffling',async()=>{
 const {run,elements}=await premiereHarness();
 const lockedBotId=run('setupDecks.darkChoice.card.id');
 assert.equal(run('setupDecks.revealed'),null);
 assert.doesNotMatch(elements.get('setupOptions').innerHTML,/Gleichzeitig aufgedeckte Startorte/);
 assert.equal(run("chooseStart(setupDecks.light.cards.findIndex(card=>card.id==='Light:80'))"),false);
 assert.equal(run('chooseStart(null)'),false);
 assert.equal(run('beginStartingGame()'),false);
 assert.equal(run('setupDecks.darkChoice.card.id'),lockedBotId);

 assert.equal(run('chooseStart(setupDecks.light.startingIndices[1])'),true);
 const reveal=elements.get('setupOptions').innerHTML;
 assert.match(reveal,/Gleichzeitig aufgedeckte Startorte.*Light Side.*Dark Side/);
 assert.match(reveal,/Tatooine: Dune Sea/);
 assert.ok(reveal.includes(run('setupDecks.darkChoice.card.name')));
 assert.equal(run('state'),null);
 run('retryStartingLocations()');
 assert.equal(run('chooseStart(setupDecks.light.startingIndices[2])'),false);
 assert.equal(run('beginStartingGame()'),true);
 assert.equal(run('state.locations[0].id'),starterLists.decks.Light.startingLocations[1]);
 assert.equal(run('state.locations[1].id'),lockedBotId);
 assert.equal(run('state.activeSide'),'Dark');
 assert.equal(run('state.deck.length===51&&state.botDeck.length===51'),true);
 assertStartingDecksPreserved(run,starterLists);
});

async function startingCollisionHarness(lists){
 const {run,elements}=await premiereHarness(lists);
 // Seed 0 chooses the first available bot location on both contested rounds.
 run('start(0)');
 return {run,elements};
}

test('matching titles on both sides set aside each copy and repeated collisions preserve both decks',async()=>{
 const lists=structuredClone(starterLists);
 lists.decks.Dark.cards.find(card=>card.id==='Dark:1426').id='Dark:607';
 lists.decks.Dark.startingLocations=['Dark:2446','Dark:607','Dark:2458'];
 const {run,elements}=await startingCollisionHarness(lists);
 for(const [lightId,darkId] of [['Light:2447','Dark:2446'],['Light:608','Dark:607']]){
  const index=run(`startingLocationChoices(setupDecks.light).find(x=>x.card.id==='${lightId}').index`);
  assert.equal(run(`chooseStart(${index})`),true);
  assert.equal(run('setupDecks.revealed.darkChoice.card.id'),darkId);
  assert.equal(run('setupDecks.revealed.collision'),true);
  assert.equal(elements.get('instruction').textContent,'Gleicher Ortsname');
  assert.match(elements.get('setupOptions').innerHTML,/Gleichzeitig aufgedeckte Startorte.*Light Side.*Dark Side.*Erneut wählen/);
  assert.equal(run('beginStartingGame()'),false);
  assert.equal(run('state'),null);
  assert.equal(run('setupDecks.light.cards.length===60&&setupDecks.dark.cards.length===60'),true);
  run('retryStartingLocations()');
  assert.equal(run(`chooseStart(${index})`),false);
  assert.equal(run(`startingLocationChoices(setupDecks.dark).some(x=>x.card.id==='${darkId}')`),false);
 }
 run('chooseStart(startingLocationChoices(setupDecks.light)[0].index);beginStartingGame()');
 assert.equal(run("state.locations[0].id==='Light:2448'&&state.locations[1].id==='Dark:2458'"),true);
 assertStartingDecksPreserved(run,lists);
});

test('another copy of a colliding starter title remains available',async()=>{
 const lists=structuredClone(starterLists);
 lists.decks.Light.startingLocations=['Light:2447'];
 lists.decks.Light.cards.find(card=>card.id==='Light:2447').count=2;
 lists.decks.Light.cards.find(card=>card.id==='Light:2052').count--;
 lists.decks.Dark.startingLocations=['Dark:2446','Dark:1426'];
 const {run}=await startingCollisionHarness(lists);
 assert.equal(run('startingLocationChoices(setupDecks.light).length'),1);
 const first=run('startingLocationChoices(setupDecks.light)[0].index');
 run(`chooseStart(${first});retryStartingLocations()`);
 const second=run('startingLocationChoices(setupDecks.light)[0].index');
 assert.notEqual(second,first);
 assert.equal(run(`chooseStart(${first})`),false);
 run(`chooseStart(${second});beginStartingGame()`);
 assert.equal(run('state.locations[0].id'),'Light:2447');
 assert.equal(run("[...state.deck,...state.hand].filter(card=>card.id==='Light:2447').length"),1);
 assertStartingDecksPreserved(run,lists);
});

for(const sideWithoutStart of ['Light','Dark','both']){
 test(`the game starts when ${sideWithoutStart} has no alternative after a collision`,async()=>{
  const lists=structuredClone(starterLists);
  lists.decks.Light.startingLocations=sideWithoutStart==='Dark'?['Light:2447','Light:2448']:['Light:2447'];
  lists.decks.Dark.startingLocations=sideWithoutStart==='Light'?['Dark:2446','Dark:2458']:['Dark:2446'];
  const {run,elements}=await startingCollisionHarness(lists);
  run('chooseStart(startingLocationChoices(setupDecks.light)[0].index);retryStartingLocations()');
  if(sideWithoutStart==='Dark'){
   assert.equal(run('chooseStart(startingLocationChoices(setupDecks.light)[0].index)'),true);
  }else{
   assert.match(elements.get('setupOptions').innerHTML,/&quot;kind&quot;:&quot;chooseStart&quot;.*&quot;args&quot;:\[null\]/);
   assert.equal(run('chooseStart(null)'),true);
  }
  assert.match(elements.get('setupOptions').innerHTML,/Kein Startort verfügbar/);
  assert.equal(run('beginStartingGame()'),true);
  const chosen=sideWithoutStart==='Light'?['Dark:2458']:sideWithoutStart==='Dark'?['Light:2448']:[];
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.locations.filter(Boolean).map(card=>card.id))')),chosen);
  assert.equal(run('state.deck.length'),sideWithoutStart==='Dark'?51:52);
  assert.equal(run('state.botDeck.length'),sideWithoutStart==='Light'?51:52);
  assertStartingDecksPreserved(run,lists);
 });
}

test('starter validation rejects invalid IDs, side, quantities and starting locations',async()=>{
 const {run}=await premiereHarness();
 const assertInvalid=(mutate,message)=>{
  const copy=structuredClone(starterLists);
  mutate(copy.decks.Light);
  assert.throws(()=>run(`readStarterDecks(${JSON.stringify(copy)},catalog)`),message);
 };
 assertInvalid(deck=>{deck.cards[0].id='Light:unknown'},/Unbekannte oder seitenfremde/);
 assertInvalid(deck=>{deck.cards[0].id='Dark:191'},/Unbekannte oder seitenfremde/);
 assertInvalid(deck=>{deck.cards[1].id=deck.cards[0].id},/Doppelter Eintrag/);
 assertInvalid(deck=>{deck.cards[0].count=1.5},/Ungültige Kartenanzahl/);
 assertInvalid(deck=>{deck.cards[0].count=2},/Erwartet sind 60 Karten/);
 assertInvalid(deck=>{deck.cards[0].id='Light:95'},/nicht ausgespielt werden/);
 assertInvalid(deck=>{deck.startingLocations=['Light:2052']},/Ungültige Starting Location/);
 assertInvalid(deck=>{deck.startingLocations=['Light:1427']},/Ungültige Starting Location/);
 assertInvalid(deck=>{deck.startingLocations.push(deck.startingLocations[0])},/unterschiedliche Namen/);

});

test('the game stays disabled when the local starter deck file is missing',async()=>{
 const {run,elements}=await premiereHarness(null);
 assert.equal(elements.get('start').disabled,true);
 assert.match(elements.get('hint').textContent,/data\/premiere-starter-decks\.json.*404/);
 assert.equal(run('setupDecks'),null);
});

function weaponBattleHarness(initiator='Light'){
 const {run,elements}=harness();
 run(`
 const rifle={id:'Light:265',side:'Light',name:'Blaster Rifle',type:'Weapon',subType:'Character'};
 const blaster={id:'Dark:1264',side:'Dark',name:'Imperial Blaster',type:'Weapon',subType:'Character'};
 const rebel={side:'Light',name:'Rebel',type:'Character',warrior:true,ability:2,power:3,deploy:1,forfeit:2};
 const officer={side:'Light',name:'Officer',type:'Character',ability:1,power:0,deploy:1,forfeit:2};
 const trooper={side:'Dark',name:'Trooper',type:'Character',warrior:true,ability:3,power:3,deploy:1,forfeit:2};
 const forceCards=()=>Array.from({length:5},(_,i)=>({name:'Force '+i}));
 state={turn:1,phase:2,activeSide:'${initiator}',botTurn:${initiator==='Dark'?'{steps:[],index:0}':'null'},locations:[
  {name:'Tatooine: A',type:'Location',subType:'Site'}, {name:'Tatooine: B',type:'Location',subType:'Site'}
 ],light:[[rebel,officer],[]],dark:[[trooper],[]],hand:[rifle],botHand:[blaster],
 deck:[{name:'Battle draw',destiny:5},{name:'Weapon draw',destiny:3}],
 botDeck:[{name:'Bot battle draw',destiny:5},{name:'Bot weapon draw',destiny:4}],
 force:forceCards(),botForce:forceCards(),used:[],botUsed:[],lost:[],botLost:[],log:[],botHistory:[],battledSitesThisTurn:[]};`);
 return {run,elements};
}

test('Light equips a blaster through the playmat only on an eligible warrior and it moves with its host',()=>{
 const {run}=weaponBattleHarness();
 run('select(0)');
 assert.match(run('renderPlaymatColumn(state.locations[0],0)'),/&quot;kind&quot;:&quot;equip&quot;[^>]*&quot;args&quot;:\[0,0,0\]/);
 assert.doesNotMatch(run('renderPlaymatColumn(state.locations[0],0)'),/&quot;kind&quot;:&quot;equip&quot;[^>]*&quot;args&quot;:\[0,0,1\]/);
 assert.equal(run("deployWeaponFor('Dark',0,0,0)"),false);
 assert.equal(run("deployWeaponFor('Light',0,0,1)"),false);
 assert.equal(run("deployWeaponFor('Light',0,1,0)"),false);
 run('equipSelectedWeapon(0,0)');
 assert.equal(run('rebel.weapons[0]===rifle&&state.hand.length===0&&state.force.length===3&&state.used.length===2'),true);
 run('state.phase=4');
 assert.equal(run('moveCharacter(0,0,1)'),true);
 assert.equal(run('state.light[1][0].weapons[0]===rifle'),true);
});

test('Dark bot equips an affordable weapon on its warrior during Deploy',()=>{
 const {run}=weaponBattleHarness('Dark');
 assert.match(run('botDeployPhase()[0]'),/Trooper erhält Imperial Blaster/);
 assert.equal(run('trooper.weapons[0]===blaster&&state.botForce.length===4&&state.botUsed.length===1'),true);
});

test('battle alternates weapon actions, hit warriors can return fire, and attached weapons follow forfeited hosts',()=>{
 const {run,elements}=weaponBattleHarness();
 run('rebel.weapons=[rifle];trooper.weapons=[blaster];state.phase=3;');
 assert.equal(run('battleAnalysis(0)'),true);
 assert.match(elements.get('battleControls').innerHTML,/&quot;kind&quot;:&quot;fireWeapon&quot;[^>]*&quot;args&quot;:\[0,0,0\]/);
 assert.doesNotMatch(elements.get('battleControls').innerHTML,/Light Battle Destiny ziehen/);
 assert.equal(run("fireBattleWeapon('Dark',0,0,0)"),false);
 assert.equal(run("fireBattleWeapon('Light',0,0,9)"),false);
 assert.equal(run('state.force.length===4&&state.deck.length===2'),true);
 run("skipDestiny('Light')");
 assert.equal(run('battleSession.lightCard'),null);
 assert.equal(run("fireBattleWeapon('Light',0,0,0)"),true);
 assert.equal(run("battleSession.weaponHits.Dark.includes(0)&&state.used.at(-1).name==='Weapon draw'"),true);
 assert.equal(run("battleTotals(0).darkPower===3&&battleSession.darkCard===null"),true);
 assert.match(elements.get('battleControls').innerHTML,/&quot;kind&quot;:&quot;fireWeapon&quot;[^>]*&quot;side&quot;:&quot;Dark&quot;[^>]*>Waffenaktion des Bots zeigen/);
 assert.equal(run('botWeaponDecision()'),true);
 assert.equal(run("battleSession.weaponHits.Light.includes(0)&&state.botUsed.at(-1).name==='Bot weapon draw'"),true);
 assert.equal(run('state.force.length===2&&state.botForce.length===4'),true);
 assert.equal(run("fireBattleWeapon('Light',0,0,0)"),false);
 assert.equal(run("passBattleWeapons('Light')"),true);
 assert.equal(run('botWeaponDecision()'),true);
 assert.equal(run('battleSession.weaponTurn'),null);
 run("skipDestiny('Light');botDestinyDecision()");
 assert.equal(run('resolveBattleLosses()'),true);
 assert.equal(run('state.lost.includes(rebel)&&state.lost.includes(rifle)&&state.botLost.includes(trooper)&&state.botLost.includes(blaster)'),true);
 assert.equal(run("'weapons' in rebel||'weapons' in trooper"),false);
});

test('weapon destiny equal to the target defense misses, even for the initiator',()=>{
 const {run}=weaponBattleHarness('Dark');
 run('trooper.weapons=[blaster];state.botDeck.at(-1).destiny=2;state.phase=3;');
 assert.equal(run("initiateBattleFor('Dark',0)"),true);
 assert.equal(run('battleSession.weaponTurn'),'Dark');
 assert.equal(run('botWeaponDecision()'),true);
 assert.equal(run("battleSession.weaponHits.Light.length===0&&state.botForce.length===3&&battleSession.darkCard===null"),true);
});

test('an empty Reserve Deck cannot hit and does not refund the weapon action',()=>{
 const {run}=weaponBattleHarness();
 run('rebel.weapons=[rifle,rifle];state.deck=[];state.phase=3;battleAnalysis(0);');
 assert.equal(run("fireBattleWeapon('Light',0,0,0)"),true);
 assert.equal(run('battleSession.weaponHits.Dark.length===0&&state.used.length===3&&state.force.length===2'),true);
 assert.equal(run('botWeaponDecision()'),true);
 assert.equal(run("fireBattleWeapon('Light',0,1,0)"),false);
});

async function craftHarness(){
 const {run,elements}=await premiereHarness();
 run(`
 const card=id=>({...catalog.find(c=>c.id===id)});
 const ship=card('Light:2838'), scout=card('Dark:2602'), tie=card('Dark:2600');
 const bantha=card('Dark:191'), tusken=card('Dark:2648');
 const dantooine=card('Light:608'), kessel=card('Dark:1426'), alderaan=card('Light:80'), tatooine=card('Light:2430');
 const dock=card('Light:2447'), dunes=card('Light:2448'), cantina=card('Light:2440');
 const forcePile=()=>Array.from({length:5},(_,i)=>({name:'Force '+i}));
 state={turn:1,phase:2,activeSide:'Light',botTurn:null,locations:[dantooine,kessel,dock,dunes,cantina,alderaan,tatooine],
  light:[[],[],[],[],[],[],[]],dark:[[],[],[],[],[],[],[]],hand:[ship],botHand:[scout,bantha],
  deck:[card('Light:259')],botDeck:[card('Dark:1264')],
  force:forcePile(),botForce:forcePile(),used:[],botUsed:[],lost:[],botLost:[],log:[],botHistory:[],battledSitesThisTurn:[]};`);
 return {run,elements};
}

test('learning decks contain planet systems, exterior sites, piloted starships and a Dark Bantha',async()=>{
 const {run}=await premiereHarness();
 for(const side of ['light','dark']){
  run(`var craftTestDeck=setupDecks.${side}.cards`);
  assert.ok(run('craftTestDeck.filter(isPlanetSystem).length')>=2);
  assert.ok(run('craftTestDeck.filter(isExteriorPlanetSite).length')>=2);
  assert.equal(run('craftTestDeck.some(c=>c.type===\'Starship\'&&cardAbility(c)===1)'),true);
  assert.equal(run('craftTestDeck.some(isBantha)'),side==='dark');
 }
});

test('ship deployment pays actual costs at a valid system and requires a supported pilot and friendly presence',async()=>{
 const {run}=await craftHarness();
 assert.equal(run("boardDeployCost(ship,dock,'Light')"),2);
 assert.equal(run("boardDeployCost(card('Light:1677'),dantooine,'Light')"),null);
 assert.equal(run("boardDeployCost(scout,dantooine,'Dark')"),null);
 assert.equal(run("boardDeployCost(card('Light:530'),dantooine,'Light')"),2);
 assert.equal(run("boardDeployCost(tie,kessel,'Dark')"),0);
 run("state.dark[6].push(card('Dark:1291'))");
 assert.equal(run("boardDeployCost(tie,tatooine,'Dark')"),0);
 run('play(0,0)');
 assert.equal(run('state.light[0].includes(ship)&&state.force.length===4&&state.used.length===1'),true);
 assert.equal(run("confirmedPresence('Light',0)"),true);
});

test('deployment respects single and multiple Premiere uniqueness dots',async()=>{
 const {run}=await craftHarness();
 run("const devastator=card('Dark:723'), talz=card('Light:2412');state.botForce=forcePile().concat(forcePile());");
 assert.equal(run("boardDeployCost(devastator,kessel,'Dark')"),7);
 run('state.dark[1].push({...devastator});state.light[2].push({...talz},{...talz})');
 assert.equal(run("boardDeployCost(devastator,kessel,'Dark')"),null);
 assert.notEqual(run("boardDeployCost(talz,dock,'Light')"),null);
 run('state.light[2].push({...talz})');
 assert.equal(run("boardDeployCost(talz,dock,'Light')"),null);
});

test('hyperspeed uses parsec distance, requires a nav computer, and costs one regular move',async()=>{
 const {run,elements}=await craftHarness();
 run("state.phase=4;state.light[5]=[ship];render()");
 assert.match(elements.get('board').innerHTML,/Tatooine \(Hyperspeed, 1 Force\)/);
 assert.equal(run('moveCharacter(5,0,1)'),false);
 assert.equal(run('moveCharacter(5,0,2)'),false);
 run('ship.navComputer=false');
 assert.equal(run('moveCharacter(5,0,6)'),false);
 run('ship.navComputer=true');
 assert.equal(run('moveCharacter(5,0,6)'),true);
 assert.equal(run('moveCharacter(6,0,0)'),false);
 assert.equal(run('state.light[6][0]===ship&&state.force.length===4&&state.used.length===1'),true);
});

test('the bot deploys ships and Banthas and chooses legal Hyperspeed in its Move phase',async()=>{
 const {run}=await craftHarness();
 run("state.activeSide='Dark';state.botTurn={steps:[{kind:'move'}],index:0}");
 assert.match(run('botDeployPhase().join(";")'),/Raumschiff TIE Scout .*Kessel.*Fahrzeug Bantha .*Docking Bay/);
 assert.equal(run('state.dark[1][0]===scout&&state.dark[2][0]===bantha&&state.botForce.length===3'),true);
 run('botNextStep()');
 assert.equal(run('state.dark[6][0]===scout&&state.botForce.length===2'),true);
});

test('a Bantha has half ability, boosts Tusken power outdoors and cannot move into an interior-only site',async()=>{
 const {run}=await craftHarness();
 assert.equal(run("boardDeployCost(bantha,cantina,'Dark')"),null);
 assert.equal(run("boardDeployCost(bantha,kessel,'Dark')"),null);
 run('state.dark[2]=[bantha]');
 assert.equal(run('cardAbility(bantha)'),0.5);
 assert.equal(run("confirmedPresence('Dark',2)"),false);
 run('state.dark[2].push(tusken);state.phase=4;state.activeSide="Dark";state.botTurn={steps:[],index:0}');
 assert.equal(run('battleTotals(2).darkPower'),3);
 assert.equal(run("moveCharacterFor('Dark',2,0,3)"),true);
 assert.equal(run('battleTotals(2).darkPower'),1);
 assert.equal(run('regularMoveKind(bantha,3,4)'),null);
});

test('the Bantha defends against Blasters with maneuver rather than ability',async()=>{
 const {run}=await craftHarness();
 run(`const light=card('Light:2052');light.weapons=[card('Light:259')];
  state.light[2]=[light];state.dark[2]=[bantha,tusken];state.phase=3;
  state.deck=[{name:'Destiny 2',destiny:2}];battleAnalysis(2);`);
 assert.equal(run("fireBattleWeapon('Light',0,0,0)"),true);
 assert.equal(run('battleSession.weaponHits.Dark.length'),0);
 assert.match(run('state.log[0]'),/Verteidigung 2.*kein Treffer/);
});

test('space battles use permanent-pilot ability and apply the system Battle Destiny rules',async()=>{
 const {run}=await craftHarness();
 run('state.light[1]=[ship,{...ship},{...ship},{...ship}];state.dark[1]=[scout];state.phase=3;battleAnalysis(1)');
 assert.equal(run('battleTotals(1).lightAbility'),4);
 assert.equal(run("minimumBattleDestinyAbility('Light',1)"),6);
 assert.equal(run("minimumBattleDestinyAbility('Dark',1)"),4);
 run("battleDestiny('Light')");
 assert.equal(run('battleSession.lightCard'),null);
 run(`battleSession=null;state.activeSide='Dark';state.botTurn={steps:[],index:0};
  state.light[5]=[ship];state.dark[5]=[scout,{...scout},{...scout},{...scout}];
  state.botDeck=[{name:'Destination draw',destiny:0}];initiateBattleFor('Dark',5);botDestinyDecision()`);
 assert.equal(run('battleSession.darkDestiny'),0);
 assert.equal(run("state.log.some(entry=>entry.includes('Alderaan reduziert'))"),true);
});

test('Playmat uses official card image URLs for locations and accessible fallback',()=>{
 const {run}=harness();
 assert.match(html,/<header class="brand-header"><img[^>]+alt="Star Wars Customizable Card Game Logo"/);
 assert.match(html,/id="board" class="playmat"/);
 assert.match(run("locationCardVisual({name:'Hoth: Echo Base',image:'https://res.starwarsccg.org/cards/example.gif'})"),/src="https:\/\/res.starwarsccg.org\/cards\/example.gif"/);
 assert.match(run("locationCardVisual({name:'Unknown',image:null})"),/kein Kartenbild/);
 assert.match(run("locationCardVisual(null)"),/Freier Location-Platz/);
});
test('Playmat places Dark above location art and Light below and retains actions',()=>{
 const {run}=harness();
 assert.match(html,/id="botHand"[\s\S]*id="board"[\s\S]*id="hand"/);
 run("state={phase:0,locations:[{name:'Hoth: Echo Base',image:'https://res.starwarsccg.org/cards/example.gif'}],light:[[{name:'Rebel'}]],dark:[[{name:'Trooper'}]],hand:[],force:[],botTurn:null};");
 const content=run("renderPlaymatColumn(state.locations[0],0)");
 assert.ok(content.indexOf('DARK · 1')<content.indexOf('Location-Karte: Hoth: Echo Base'));
 assert.ok(content.indexOf('Location-Karte: Hoth: Echo Base')<content.indexOf('LIGHT · 1'));
 assert.match(content,/<button disabled>Ausspielen<\/button>/);
 assert.match(content,/<button disabled>Battle \(1 Force\)<\/button>/);
});

test('the hand phase lists follow the current turn through setup, play and game end',async()=>{
 const {run,elements}=await premiereHarness();
 assert.match(html,/id="botHand"[\s\S]*id="phaseListDark"[\s\S]*id="board"[\s\S]*id="hand"[\s\S]*id="phaseListLight"/);
 assert.equal(elements.get('gameTable').hidden,true);
 const assertPhase=(active,phase)=>{
  for(const side of ['Dark','Light']){
   const list=elements.get('phaseList'+side).innerHTML;
   assert.equal([...list.matchAll(/<li\b/g)].length,6);
   const highlighted=[...list.matchAll(/<li aria-current="step">([^<]+)<\/li>/g)].map(match=>match[1]);
   assert.deepEqual(highlighted,side===active?[phase]:[]);
   const label=!active?'Partie beendet':side!==active?'Wartet':side==='Dark'?'Bot ist am Zug':'Du bist am Zug';
   assert.equal(elements.get('turnStatus'+side).textContent,label);
  }
 };

 run('start(1);chooseStart(startingLocationChoices(setupDecks.light)[1].index);beginStartingGame()');
 assert.equal(elements.get('gameTable').hidden,false);
 assert.equal(elements.get('gameMessage').hidden,true);
 assertPhase('Dark','Aktivieren');
 run('botNextStep();botNextStep()');
 assertPhase('Dark','Kontrolle');
 run('for(let i=0;i<5;i++)botNextStep()');
 assertPhase('Light','Aktivieren');
 run("requestAction('activate','Light',[1]);requestAction('advance','Light')");
 assertPhase('Light','Kontrolle');
 run("state.gameWinner='Light';render()");
 assertPhase(null);
 assert.equal(elements.get('gameMessage').hidden,false);
 assert.match(elements.get('instruction').textContent,/Light Side gewinnt/);
 run('start(1)');
 assert.equal(elements.get('gameTable').hidden,true);
});

test('location art opens a detailed card inspector without changing game state',()=>{
 const {run,elements}=harness();
 run("state={locations:[{name:'Tatooine: Mos Eisley',type:'Location',subType:'Site',image:'https://res.starwarsccg.org/cards/test.gif',icons:{light:1,dark:2},gametext:'Some location effect'}],light:[[]],dark:[[]],phase:0,hand:[],force:[],botTurn:null};");
 const markup=run("renderPlaymatColumn(state.locations[0],0)");
 assert.match(markup,/onclick="inspectLocation\(0\)"/);
 assert.equal(run("inspectLocation(0)"),true);
 assert.equal(elements.get('cardInspector').open,true);
 assert.equal(elements.get('cardInspectorTitle').textContent,'Tatooine: Mos Eisley');
 assert.match(elements.get('cardInspectorBody').innerHTML,/Force-Icons · Light 1 \/ Dark 2/);
 assert.match(elements.get('cardInspectorBody').innerHTML,/Some location effect/);
 assert.equal(run("state.locations[0].name"),'Tatooine: Mos Eisley');
 run('closeCard()');
 assert.equal(run("inspectLocation(9)"),false);
 assert.equal(elements.get('cardInspector').open,false);
});
test('initial location choices include original image thumbnails',async()=>{
 const {elements}=await premiereHarness();
 const markup=elements.get('setupOptions').innerHTML;
 assert.match(markup,/start-location-option/);
 assert.match(markup,/<img[^>]+tatooinedunesea\.gif/i);
 assert.match(markup,/Tatooine: Dune Sea/);
});

test('Light may deploy successive locations beyond original three-slot board',()=>{
 const {run}=harness();
 run("render=()=>{};state={phase:2,activeSide:'Light',locations:[{name:'Hoth: A',type:'Location',subType:'Site'} ,null],light:[[],[]],dark:[[],[]],hand:[{name:'Hoth: B',type:'Location',subType:'Site'},{name:'Hoth: C',type:'Location',subType:'Site'}],force:[],used:[],deployedThisTurn:[],log:[]};");
 run('playLocation(0,1)');
 assert.equal(run("state.locations.length"),3);
 assert.equal(run("state.locations[2]===null"),true);
 assert.equal(run("state.light.length"),3);
 run('playLocation(0,2)');
 assert.equal(run("state.locations.length"),4);
 assert.equal(run("state.locations[3]===null"),true);
 assert.equal(run("state.hand.length"),0);
});
test('Dark bot deploy phase plays multiple affordable characters and pays Force per card',()=>{
 const {run}=harness();
 run("render=()=>{};state={phase:2,activeSide:'Dark',botTurn:{steps:[],index:0},locations:[{name:'Hoth: A',type:'Location',subType:'Site',icons:{dark:1,light:0}},null],light:[[],[]],dark:[[],[]],botHand:[{name:'Trooper A',type:'Character',deploy:1,ability:1},{name:'Trooper B',type:'Character',deploy:2,ability:1}],botForce:[{id:1},{id:2},{id:3}],botUsed:[],deployedThisTurn:[],log:[]};");
 const actions=run("botDeployPhase()");
 assert.equal(actions.length,2);
 assert.equal(run("state.dark[0].length"),2);
 assert.equal(run("state.botHand.length"),0);
 assert.equal(run("state.botForce.length"),0);
 assert.equal(run("state.botUsed.length"),3);
});
test('Dark bot multi-deploy cannot spend more Force than available',()=>{
 const {run}=harness();
 run("state={phase:2,activeSide:'Dark',botTurn:{steps:[],index:0},locations:[{name:'Hoth: A',type:'Location',subType:'Site',icons:{dark:1,light:0}},null],light:[[],[]],dark:[[],[]],botHand:[{name:'Trooper A',type:'Character',deploy:1,ability:1},{name:'Trooper B',type:'Character',deploy:2,ability:1}],botForce:[{id:1}],botUsed:[],deployedThisTurn:[],log:[]};");
 assert.equal(run("botDeployPhase().length"),1);
 assert.equal(run("state.botHand.length"),1);
 assert.equal(run("state.botForce.length"),0);
});
test('Location deploy rejects duplicate titles, invalid insertion positions and the wrong side or phase',()=>{
 const {run}=harness();
 run("state={phase:2,activeSide:'Light',locations:[{name:'Hoth: A',type:'Location',subType:'Site'},null],light:[[],[]],dark:[[],[]],hand:[{name:'Hoth: A',type:'Location'},{name:'Hoth: B',type:'Location'}],log:[]};");
 assert.equal(run("deployLocationFromHand('Light',0,1)"),false);
 assert.equal(run("deployLocationFromHand('Light',1,2)"),false);
 assert.equal(run("deployLocationFromHand('Dark',1,1)"),false);
 assert.equal(run("state.locations.length"),2);
 run('state.phase=3');
 assert.equal(run("deployLocationFromHand('Light',1,1)"),false);
 run('state.phase=2');
 assert.equal(run("deployLocationFromHand('Light',1,1)"),true);
 assert.equal(run("state.locations.length"),3);
});

test('starting locations use their geographic order while keeping the original location references',async()=>{
 const {run,elements}=await premiereHarness();
 run('start(1)');
 run('chooseStart(setupDecks.light.startingIndices[1]);beginStartingGame()');
 assert.equal(run("state.locations[0].id==='Light:2448'&&state.locations[1].id==='Dark:2446'"),true);
 assert.equal(run('boardLocationOrder().join()'),'1,0');
 assert.equal(run('adjacentSites(0,1)'),true);
 const board=elements.get('board').innerHTML;
 assert.ok(board.indexOf('inspectLocation(1)')<board.indexOf('inspectLocation(0)'));
});

test('Tatooine insertion preserves the spaceport block, offers exterior gaps and keeps units on their sites',async()=>{
 const {run,elements}=await craftHarness();
 run(`const rebel=card('Light:2052');const stormtrooper=card('Dark:2355');
  state.locations=[tatooine,card('Dark:682'),dunes,null];
  state.light=[[],[],[rebel],[]];state.dark=[[],[],[stormtrooper],[]];
  state.hand=[cantina,dock,card('Light:2466'),card('Light:2462')];
  state.drainedSitesThisTurn=[2];state.battledSitesThisTurn=[2];`);
 assert.equal(run('boardLocationOrder().join()'),'2,0,1');
 assert.equal(run("locationDeployPositions('Light',0).join()"),'0');
 run('playLocation(0,0)');
 assert.equal(run('adjacentSites(3,2)'),true);
 assert.equal(run("locationDeployPositions('Light',0).join()"),'1');
 run('playLocation(0,1)');
 assert.equal(run('adjacentSites(3,2)'),false);
 assert.equal(run('adjacentSites(3,4)&&adjacentSites(4,2)'),true);
 assert.equal(run("locationDeployPositions('Light',0).join()"),'2');
 run('playLocation(0,2);select(0)');
 assert.equal(run("locationDeployPositions('Light',0).join()"),'3,4');
 assert.equal(run("deployLocationFromHand('Light',0,2)"),false);
 const board=elements.get('board').innerHTML;
 assert.match(board,/&quot;kind&quot;:&quot;deployLocation&quot;[^>]*&quot;args&quot;:\[0,3\]/);
 assert.match(board,/&quot;kind&quot;:&quot;deployLocation&quot;[^>]*&quot;args&quot;:\[0,4\]/);
 assert.doesNotMatch(board,/&quot;kind&quot;:&quot;deployLocation&quot;[^>]*&quot;args&quot;:\[0,2\]/);

 run('playLocation(0,3)');
 assert.equal(run('boardLocationOrder().join()'),'3,4,5,6,2,0,1');
 assert.equal(run('state.locations[2]===dunes&&state.light[2][0]===rebel&&state.dark[2][0]===stormtrooper'),true);
 assert.equal(run('state.drainedSitesThisTurn[0]===2&&state.battledSitesThisTurn[0]===2'),true);
 assert.equal(run('adjacentSites(6,2)&&!adjacentSites(5,2)&&!adjacentSites(2,0)&&!adjacentSites(2,1)'),true);
 run('state.phase=4');
 assert.equal(run('moveCharacter(2,0,5)'),false);
 assert.equal(run('moveCharacter(2,0,6)'),true);
 assert.equal(run('state.light[6][0]===rebel&&state.dark[2][0]===stormtrooper&&state.force.length===4'),true);
});

test('the bot inserts Death Star and Yavin 4 sites using the same legal order',async()=>{
 const {run}=await craftHarness();
 run(`state.activeSide='Dark';state.botTurn={steps:[],index:0};
  state.locations=[card('Dark:682'),card('Dark:2848'),card('Light:2859'),null];
  state.light=[[],[],[],[]];state.dark=[[],[],[],[]];
  state.botHand=[card('Dark:675'),card('Dark:669'),card('Dark:2852'),card('Dark:2854')];`);
 assert.equal(run('botDeployPhase().length'),4);
 assert.equal(run('boardLocationOrder().map(slot=>state.locations[slot].id).join()'),
  'Dark:682,Dark:669,Dark:675,Light:2859,Dark:2852,Dark:2854,Dark:2848');
 assert.equal(run('adjacentSites(4,3)&&adjacentSites(2,5)&&adjacentSites(5,6)'),true);
 assert.equal(run('adjacentSites(3,2)||adjacentSites(6,1)'),false);
 assert.equal(run('state.botForce.length'),5);
});

test('a seed and the recorded action choices reproduce setup and both sides’ zone order',async()=>{
 const {run}=await premiereHarness();
 run(`start(1);
  chooseStart(startingLocationChoices(setupDecks.light)[1].index);
  beginStartingGame();
  for(let i=0;i<7;i++)botNextStep();
  requestAction('activate','Light',[1]);
  requestAction('advance','Light');
  const recorded=state.game.actions.slice();
  const snapshot=()=>JSON.stringify([state.phase,state.activeSide,state.locations,state.light,state.dark,
   state.deck,state.botDeck,state.force,state.botForce,state.hand,state.botHand,state.used,state.botUsed,state.game.randomState]);
  const original=snapshot();
  start(1,false);`);
 assert.equal(run('recorded.every(action=>requestAction(action.kind,action.side,action.args,false))'),true);
 assert.equal(run('snapshot()===original'),true);
 assert.equal(run(`new Set([...state.deck,...state.botDeck,...state.force,...state.botForce,...state.hand,...state.botHand,
  ...state.used,...state.botUsed,...state.lost,...state.botLost,...state.locations.filter(Boolean),...state.light.flat(),...state.dark.flat()]
  .flatMap(card=>[card,...(card.weapons??[])]).map(card=>card.instanceId)).size`),120);
});

test('the public view omits opponent hands and all Life Force order, including in setup',async()=>{
 const {run,elements}=await premiereHarness();
 run('start(1)');
 assert.equal(run('PremiereGame.setupView(setupDecks,"Light").revealed'),null);
 assert.equal(run('"darkChoice" in PremiereGame.setupView(setupDecks,"Light")'),false);
 run('chooseStart(startingLocationChoices(setupDecks.light)[1].index);beginStartingGame()');
 elements.get('showBotHand').checked=false;
 run('render()');
 assert.match(elements.get('botHand').innerHTML,/Verdeckt/);
 assert.equal(run(`PremiereGame.sides.every(side=>{
  const view=PremiereGame.playerView(state,side),own=view.players[side],opponent=view.players[PremiereGame.otherSide(side)];
  return own.hand.length===8&&opponent.handCount===8&&!('hand' in opponent)&&
   [own,opponent].every(piles=>['deck','force','used'].every(zone=>!(zone in piles)));
 })`),true);
 run(`const copy=PremiereGame.playerView(state,'Light');copy.players.Light.hand[0].name='changed';`);
 assert.equal(run("state.hand[0].name==='changed'"),false);
});

test('UI action versions reject duplicate clicks, wrong-side targets and unaffordable options',()=>{
 const {run}=weaponBattleHarness();
 run(`state.game=PremiereGame.actionState(12,1);select(0);
  const equip=findOffer(legalActions(state,'Light'),'equip',0,0,0);`);
 assert.equal(run("performAction({...equip,side:'Dark'})"),false);
 assert.equal(run('performAction({...equip,args:[0,0,9]})'),false);
 assert.equal(run('performAction({...equip,gameId:11})'),false);
 assert.equal(run('dispatchUI(equip)'),true);
 assert.equal(run('dispatchUI(equip)'),false);
 assert.equal(run('state.used.length===2&&state.game.actions.length===1'),true);
 run(`state.hand=[rifle];const second=findOffer(legalActions(state,'Light'),'equip',0,0,0);state.force=[];`);
 assert.equal(run('performAction(second)'),false);
 assert.equal(run('state.hand[0]===rifle&&state.used.length===2'),true);
});

function reactHarness(){
 const session=harness();
 session.run(`const nearby={name:'Hoth: Exterior A',type:'Location',subType:'Site',locationTags:['Planet','Exterior'],icons:{light:1,dark:1}};
  const target={...nearby,name:'Hoth: Exterior B',icons:{...nearby.icons}};
  const wolfman={name:'Shistavanen Wolfman',id:'Light:2250',instanceId:'Light:9',type:'Character',deploy:2,ability:2};
  const imperial={name:'Imperial',type:'Character',ability:3};
  state=PremiereGame.createState(PremiereGame.actionState(21,1),[],[],[nearby,target],[0,1]);
  state.phase=1;state.botTurn={steps:[],index:0};
  state.light[0].push(wolfman);state.dark[1].push(imperial);
  state.force.push({name:'React cost'});state.deck.push({name:'Life L'});
  state.botDeck.push({name:'Life D',destiny:4},{name:'Sense Destiny',destiny:2});`);
 return session;
}

test('a Wolfman can pay once and react in the opposing turn to cancel an unresolved Force Drain',()=>{
 const {run,elements}=reactHarness();
 assert.equal(run("requestAction('drain','Dark',[1])"),true);
 assert.match(elements.get('controlPanel').innerHTML,/Antwortfenster.*Shistavanen Wolfman/);
 assert.equal(run("requestAction('passResponse','Dark')"),false);
 assert.equal(run("requestAction('draw','Light')"),false);
 assert.equal(run("requestAction('react','Light',[0,0])"),true);
 assert.equal(run("state.light[0][0]===wolfman&&state.used[0].name==='React cost'"),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run('state.light[1][0]===wolfman&&state.pendingForceLoss===null&&state.game.responses.length===0'),true);
 assert.equal(run("PremiereGame.wasUsed(state.game,'turn','react:Light:9')"),true);
 assert.equal(run("requestAction('drain','Dark',[1])"),false);
});

test('Sense can interrupt a paid React, and Alter can cancel the pending Sense in stack order',()=>{
 for(const counter of [false,true]){
  const {run}=reactHarness();
  run(`state.botHand.push({id:'Dark:2216',name:'Sense'});
   if(${counter})state.hand.push({id:'Light:95',name:'Alter'});`);
  assert.equal(run(`requestAction('drain','Dark',[1])&&requestAction('react','Light',[0,0])&&
   requestAction('interruptResponse','Dark',[0])`),true);
  if(counter){
   assert.equal(run(`requestAction('interruptResponse','Light',[0])&&requestAction('passResponse','Dark')&&requestAction('passResponse','Light')`),true);
   assert.equal(run("state.botLost[0].name==='Sense'&&state.used[1].name==='Alter'&&state.botDeck.length===2"),true);
  }
  assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
  if(counter)assert.equal(run('state.light[1][0]===wolfman&&state.pendingForceLoss===null'),true);
  else {
   assert.equal(run('state.light[0][0]===wolfman&&state.used.length===1'),true);
   assert.equal(run("state.botUsed.map(card=>card.name).join()"),'Sense Destiny,Sense');
   assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
   assert.equal(run("state.pendingForceLoss.payer"),'Light');
  }
 }
});

test('phase checkpoints give the active side the order of mandatory triggers and then alternate optional priority',()=>{
 const {run}=reactHarness();
 run(`PremiereGame.resetTurn(state,'Light');state.botTurn=null;state.activated=true;
  const observed=[];
  function register(id,side,mandatory,scope,event){PremiereGame.registerTrigger(state.game,{id,side,mandatory,scope,event,once:true,label:id,resolve(){observed.push(id)}})}
  register('first','Light',true,'phase','phase:end');
  register('second','Dark',true,'phase','phase:end');
  register('optional','Dark',false,'game','phase:end');
  register('entry','Light',true,'turn','phase:start');`);
 assert.equal(run("requestAction('advance','Light')&&state.phase===0"),true);
 assert.equal(run("legalActions(state,'Light').map(x=>x.label).join()"),'first,second');
 assert.equal(run("requestAction('timingTrigger','Dark',['second'])"),false);
 assert.equal(run("requestAction('timingTrigger','Light',[null])"),false);
 assert.equal(run("requestAction('timingTrigger','Light',['second'])&&requestAction('timingTrigger','Light',['first'])"),true);
 assert.equal(run("requestAction('timingTrigger','Light',[null])"),true);
 assert.equal(run("requestAction('timingTrigger','Dark',['optional'])&&state.phase===1"),true);
 assert.equal(run("requestAction('timingTrigger','Light',['entry'])"),true);
 assert.equal(run('observed.join()'),'second,first,optional,entry');
 assert.equal(run("state.game.timing.effects.map(x=>x.id).join()"),'optional,entry');
 assert.equal(run("PremiereGame.wasUsed(state.game,'game','optional')&&PremiereGame.wasUsed(state.game,'turn','entry')"),true);
 assert.equal(run("PremiereGame.useOnce(state.game,'battle','shot')&&!PremiereGame.useOnce(state.game,'battle','shot')"),true);
 assert.equal(run("PremiereGame.expire(state.game,'battle');PremiereGame.useOnce(state.game,'battle','shot')"),true);
 assert.equal(run("PremiereGame.resetTurn(state,'Dark');!PremiereGame.wasUsed(state.game,'turn','entry')&&PremiereGame.wasUsed(state.game,'game','optional')"),true);
});

test('Life Force is evaluated after the complete loss payment and locks both sides',()=>{
 const {run}=reactHarness();
 run(`state.light[0]=[];state.force=[];state.deck=[{name:'Last Life Force'}];
  state.locations[1].icons.light=2;state.hand=[{name:'Last hand card'}];
  const drain=legalActions(state,'Dark').find(x=>x.kind==='drain');`);
 assert.equal(run('performAction(drain)'),true);
 assert.equal(run("requestAction('loseForce','Light',['deck'])"),true);
 assert.equal(run('state.gameWinner'),null);
 assert.equal(run('state.pendingForceLoss.remaining'),1);
 assert.equal(run("requestAction('loseForce','Light',['hand',0])"),true);
 assert.equal(run('state.gameWinner'),'Dark');
 assert.equal(run("legalActions(state,'Dark').length+legalActions(state,'Light').length"),0);
 assert.equal(run('performAction(drain)'),false);
});

test('the opponent gets the next optional priority when there is an eligible phase action',()=>{
 const {run}=reactHarness();
 run(`PremiereGame.resetTurn(state,'Light');state.botTurn=null;
  PremiereGame.registerTrigger(state.game,{id:'dark-option',side:'Dark',event:'phase:priority',scope:'phase',label:'Dark option',
   resolve(){state.botReason='resolved'}});`);
 assert.equal(run("requestAction('activate','Light',[0])"),true);
 assert.equal(run("legalActions(state,'Light').length"),0);
 assert.equal(run("legalActions(state,'Dark').map(option=>option.label).join()"),'Dark option,Passen');
 assert.equal(run("requestAction('advance','Light')"),false);
 assert.equal(run("requestAction('timingTrigger','Dark',['dark-option'])&&state.botReason==='resolved'"),true);
 assert.equal(run("requestAction('advance','Light')&&state.phase===1"),true);
});

test('one mandatory callback can deplete both sides before the engine determines an outcome',()=>{
 const {run}=reactHarness();
 run(`PremiereGame.resetTurn(state,'Light');state.botTurn=null;state.activated=true;state.force=[];
  state.botDeck.length=1;
  PremiereGame.registerTrigger(state.game,{id:'both-lose',side:'Dark',mandatory:true,event:'phase:end',scope:'phase',label:'Both lose',
   resolve(){PremiereGame.moveTop(state.deck,state.lost);PremiereGame.moveTop(state.botDeck,state.botLost)}});`);
 assert.equal(run("requestAction('advance','Light')&&state.gameWinner===null"),true);
 assert.equal(run("requestAction('timingTrigger','Light',['both-lose'])"),true);
 assert.equal(run('state.gameWinner'),'Simultaneous');
 assert.equal(run("legalActions(state,'Dark').length+legalActions(state,'Light').length"),0);
});

test('location conversion stacks opposing printings without moving units or compatible effects',async()=>{
 const {run,elements}=await premiereHarness();
 run(`const catalogCard=id=>({...catalog.find(card=>card.id===id)});
  const darkBay=catalogCard('Dark:2446'),lightBay=catalogCard('Light:2447'),revolution=catalogCard('Light:2110');
  const guard={ability:1,name:'Guard'},effect={card:{name:'Location effect',side:'Dark'},requiredTag:'Scomp Link'};
  const incompatible={card:{name:'Inapplicable effect',side:'Dark'},requiredTag:'Mobile'};
  state=PremiereGame.createState(PremiereGame.actionState(41,0),[],[],[darkBay,null],[0]);setupDecks=null;
  state.deck=[{name:'Life L'}];state.botDeck=[{name:'Life D'}];state.force=[{},{},{}];state.phase=2;state.activeSide='Light';
  state.dark[0].push(guard);state.hand=[revolution,lightBay];state.locationEffects={0:[effect,incompatible]};`);
 assert.equal(run("requestAction('revolution','Light',[0,0])"),true);
 assert.equal(run("PremiereLocations.conditions(state,0,'Light').transitCost"),1);
 run('select(0)');
 assert.match(elements.get('board').innerHTML,/Konvertieren/);
 assert.equal(run("requestAction('convertLocation','Light',[0,0])"),true);
 assert.equal(run(`state.locations[0]===lightBay&&state.dark[0][0]===guard&&state.convertedLocations[0][0]===darkBay&&
  state.locationEffects[0][0]===effect&&state.locationEffects[0][1].card===revolution&&state.botLost[0]===incompatible.card&&state.locationOrder.join()==='0'`),true);
 assert.equal(run("PremiereLocations.conditions(state,0,'Light').transitCost"),2);
 assert.equal(run("PremiereLocations.icons(state,0,'Light')===lightBay.icons.dark"),true);
 run('inspectLocation(0)');
 assert.match(elements.get('cardInspectorBody').innerHTML,/Scomp Link.*Docking Bay.*darunter|Scomp Link.*Docking Bay.*Darunter/);
 run('state.hand=[{...lightBay}]');
 assert.equal(run("requestAction('convertLocation','Light',[0,0])"),false);
 assert.equal(run("requestAction('deployLocation','Light',[0,0])"),false);
});

test('at, present, aboard, Occupy and Control differ for enclosed units, droids and spies',()=>{
 const {run}=reactHarness();
 run(`const passenger={type:'Character',ability:2},droid={type:'Character',subType:'Droid'},
  ship={type:'Starship',occupants:[{card:passenger,role:'passenger'},{card:droid,role:'passenger'}]},
  spy={type:'Character',ability:3,undercover:true};
  state.locations[0]={name:'Hoth',type:'Location',subType:'System'};
  state.light=[[ship],[]];state.dark=[[],[spy]];`);
 assert.equal(run('PremiereLocations.at(state,passenger,0)&&PremiereLocations.aboard(state,passenger,ship)'),true);
 assert.equal(run('PremiereLocations.present(state,passenger,ship)&&!PremiereLocations.present(state,passenger,0)'),true);
 assert.equal(run("PremiereLocations.occupy(state,'Light',0,cardAbility)&&PremiereLocations.control(state,'Light',0,cardAbility)"),true);
 assert.equal(run("confirmedPresence('Dark',1)"),false);
 run('state.light[1].push(wolfman);state.activeSide="Light";state.botTurn=null;');
 assert.equal(run("PremiereLocations.at(state,wolfman,0)&&PremiereLocations.control(state,'Light',1,cardAbility)"),true);
 assert.equal(run("forceDrainValue('Light',1)"),null);
 run('spy.undercover=false;');
 assert.equal(run("confirmedPresence('Dark',1)&&!PremiereLocations.control(state,'Light',1,cardAbility)"),true);
});

test('Luke modifies Force off Tatooine, zero icons are known, and activation stops at the Reserve limit',()=>{
 const {run}=reactHarness();
 run(`PremiereGame.resetTurn(state,'Light');state.botTurn=null;
  state.light[0]=[{id:'Light:1593',ability:4,type:'Character'}];
  state.locations[0].icons.light=0;state.locations[1].icons.light=null;`);
 assert.equal(run("JSON.stringify(forceFromLocations('Light'))"),'{"count":2,"unknown":1}');
 run("state.locations[0].name='Tatooine: Dune Sea'");
 assert.equal(run("forceFromLocations('Light').count"),1);
 run("state.locations[0].name='Alderaan';state.locations[0].subType='System'");
 assert.equal(run("requestAction('activate','Light',[2])"),false);
 assert.equal(run("requestAction('activate','Light',[1])"),true);
 assert.equal(run("state.deck.length===0&&state.force.at(-1).name==='Life L'"),true);
});

test('printed drain bonuses, penalties and zero drains share the per-location turn limit',()=>{
 const {run}=reactHarness();
 run(`state.light[0]=[];state.dark[0]=[{type:'Character',ability:1}];
  state.locations[0].icons.light=0;state.locations[1].id='Dark:2458';
  state.locationEffects={1:[{card:{id:'test modifier'},drainModifier:{Dark:-1}}]};`);
 assert.equal(run("forceDrainValue('Dark',0)"),0);
 assert.equal(run("forceDrainValue('Dark',1)"),1);
 assert.equal(run("requestAction('drain','Dark',[0])&&state.pendingForceLoss===null"),true);
 assert.equal(run("requestAction('drain','Dark',[0])"),false);
 assert.equal(run("requestAction('drain','Dark',[1])&&state.pendingForceLoss.remaining===1"),true);
});

test('Surprise Assault replaces a Force Drain with the destiny comparison and shared loss choices',()=>{
 const {run}=reactHarness();
 run(`state.light[0]=[];imperial.power=2;state.hand=[{id:'Light:2385',name:'Surprise Assault'}];
  state.deck.push({name:'Assault Destiny',destiny:3});`);
 assert.equal(run("requestAction('drain','Dark',[1])&&requestAction('interruptResponse','Light',[0])"),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run(`state.lost[0].name==='Surprise Assault'&&state.used.map(card=>card.name).join()===
  'React cost,Assault Destiny'&&state.botLost.length===1&&state.pendingForceLoss===null`),true);
});

test('Force loss respects a required pile and retrieval preserves the remaining pile order',async()=>{
 const {run}=await premiereHarness();
 run(`const source=id=>({...catalog.find(card=>card.id===id)});
  const interrupt=source('Light:2105'),obi=source('Light:1803'),bottom={name:'Bottom'},last={name:'Top'};
  state=PremiereGame.createState(PremiereGame.actionState(42,0),[],[],[],[]);setupDecks=null;
  state.activeSide='Light';state.phase=1;state.deck=[bottom,last];state.botDeck=[{name:'Life D'}];
  state.force=[{name:'Cost'}];state.lost=[{name:'First'},obi,{name:'Third'}];state.hand=[interrupt];
  beginForceLoss('Light',1,{reason:'drain',from:'deck'});`);
 assert.equal(run("requestAction('loseForce','Light',['force'])"),false);
 assert.equal(run("requestAction('loseForce','Light',['deck'])"),true);
 assert.equal(run('state.deck[0]===bottom&&state.lost.at(-1)===last'),true);
 assert.equal(run("requestAction('retrieve','Light',[0,1])"),true);
 assert.equal(run('state.used.at(-1)===obi&&state.lost.at(-1)===interrupt'),true);
 assert.equal(run("PremiereGame.retrieveForce(state,'Light',2)[1]===last&&state.lost.map(card=>card.name).join()==='First,Third'"),true);
});

test('the bot makes another legal drain after Light pays the previous one',()=>{
 const {run}=reactHarness();
 run(`state.light[0]=[];state.dark[0]=[{type:'Character',ability:1}];
  state.locations[1].icons.light=2;state.phase=0;
  state.botTurn={steps:[{kind:'control'},{kind:'deploy'}],index:0};
  state.deck.push({name:'Extra 1'},{name:'Extra 2'});state.hand=[{name:'Hand loss'}];`);
 assert.equal(run('botNextStep()&&state.pendingForceLoss.locationIndex===1'),true);
 assert.equal(run('botNextStep()'),false);
 assert.equal(run("requestAction('loseForce','Light',['hand',0])&&requestAction('loseForce','Light',['force'])"),true);
 assert.equal(run('botNextStep()&&state.pendingForceLoss.locationIndex===0&&state.phase===1'),true);
 assert.equal(run("requestAction('loseForce','Light',['deck'])&&botNextStep()&&state.phase===2"),true);
});

test('lightsabers offer an optional bonus, and a forbidden location offers no drain',()=>{
 const {run}=reactHarness();
 run(`state.activeSide='Light';state.botTurn=null;
  state.dark[1]=[];wolfman.weapons=[{id:'Light:1386',type:'Weapon'}];`);
 assert.equal(run("legalActions(state,'Light').filter(action=>action.kind==='drain').map(action=>action.amount).join()"),'1,2');
 run("state.locationEffects={0:[{card:{id:'test modifier'},drainForbiddenFor:'Light'}]};");
 assert.equal(run("requestAction('drain','Light',[0,1])"),false);
});

test('Jawa deployment honors the Tatooine restriction and both players’ printed payments',async()=>{
 const {run}=await premiereHarness();
 run(`const card=id=>({...catalog.find(c=>c.id===id)}),jawa=card('Dark:1372'),camp=card('Dark:2454');
  const nonTatooine={name:'Hoth: A',type:'Location',subType:'Site',icons:{dark:2,light:1}};
  const other={name:'Tatooine: Another Site',type:'Location',subType:'Site',icons:{dark:2,light:1}};
  state=PremiereGame.createState(PremiereGame.actionState(43,0),[],[],[camp,nonTatooine,other],[0,2,1]);setupDecks=null;
  state.activeSide='Dark';state.phase=2;state.botTurn={steps:[],index:0};state.botHand=[jawa,{...jawa}];
  state.botForce=[{name:'Dark bottom'},{name:'Dark top'}];state.botDeck=[{}];state.deck=[{}];`);
 assert.equal(run("requestAction('deploy','Dark',[0,1])"),false);
 assert.equal(run("requestAction('deploy','Dark',[0,2])"),false);
 assert.ok(run("requestAction('deploy','Dark',[0,0])"));
 run("state.force=[{name:'Light payment'}]");
 assert.ok(run("requestAction('deploy','Dark',[0,2])"));
 assert.equal(run("state.dark[0].length===1&&state.dark[2].length===1&&state.used[0].name==='Light payment'&&state.botUsed.length===2"),true);
});

test('starfighters deploy with a manual pilot as one paid action and use the matching pilot bonuses',async()=>{
 const {run,elements}=await craftHarness();
 run("const red=card('Light:2060'),biggs=card('Light:239');state.hand=[red,biggs];select(0)");
 assert.match(elements.get('board').innerHTML,/Mit .*Biggs Darklighter ausspielen/);
 assert.equal(run("requestAction('deploy','Light',[0,0])"),false);
 assert.ok(run("requestAction('deployWithPilot','Light',[0,0,1])"));
 assert.equal(run(`state.hand.length===0&&state.light[0][0]===red&&red.occupants[0].card===biggs&&
  craftStats(red,0).power===5&&craftStats(red,0).maneuver===5&&craftStats(red,0).ability===biggs.ability`),true);
 assert.equal(run("PremiereLocations.aboard(state,biggs,red)&&!PremiereLocations.present(state,biggs,0)"),true);
});

test('a parked unpiloted fighter cannot take off until an eligible pilot boards',async()=>{
 const {run}=await craftHarness();
 run("const xwing=card('Light:2057'),leader=card('Light:2067');state.hand=[xwing];");
 assert.ok(run("requestAction('deploy','Light',[0,2])"));
 run("state.phase=4;state.light[2].push(leader);");
 assert.equal(run("movementOptionsFor('Light').some(move=>move.card===xwing)"),false);
 assert.equal(run("requestAction('transport','Light',['embark',2,2,1,0,'pilot'])"),true);
 assert.equal(run("requestAction('move','Light',[2,0,6,'Starten'])"),true);
 assert.equal(run("state.light[6][0]===xwing&&state.force.length===3&&xwing.occupants[0].card===leader"),true);
});

test('a landspeeder can move several sites for free with Luke and only one regular move per turn',async()=>{
 const {run}=await craftHarness();
 run(`const speeder=card('Light:1609'),luke=card('Light:1593');
  state.locations[4]=card('Light:2466');state.locationOrder=[0,1,2,4,3,6,5];
  state.phase=4;state.light[2]=[speeder,luke];state.force=[];`);
 assert.equal(run("requestAction('move','Light',[2,0,3,'Landspeed'])"),false);
 assert.equal(run("requestAction('transport','Light',['embark',2,2,1,0,'driver'])"),true);
 assert.equal(run("requestAction('move','Light',[2,0,3,'Landspeed'])"),true);
 assert.equal(run("requestAction('move','Light',[3,0,4,'Landspeed'])"),false);
 assert.equal(run("state.light[3][0]===speeder&&PremiereLocations.present(state,luke,3)&&state.used.length===0"),true);
});

test('Lift Tubes use interior mobile routes, and a grouped Docking Bay Transit pays once',async()=>{
 const {run}=await craftHarness();
 run(`const tube=card('Light:1548'),a=card('Light:2052'),b=card('Light:2040');
  state.locations[0]=card('Dark:669');state.locations[1]=card('Dark:678');state.locations[5]=card('Dark:675');
  state.locationOrder=[0,1,5,4,2,3,6];state.phase=4;state.light[0]=[tube];state.light[2]=[a,b];`);
 assert.equal(run("requestAction('move','Light',[0,0,5,'Landspeed'])"),true);
 assert.equal(run("requestAction('move','Light',[5,0,2,'Landspeed'])"),false);
 assert.equal(run("requestAction('transitGroup','Light',[2,5])"),true);
 assert.equal(run("state.light[5].includes(a)&&state.light[5].includes(b)&&state.used.length===2"),true);
});

test('shuttling to a capital ship, a docked transfer and cargo survival respect roles and timing',async()=>{
 const {run}=await craftHarness();
 run(`const big=card('Light:530'),other=card('Light:1677'),han=card('Light:1098'),cargo=card('Light:2161');
  state.phase=4;state.light[2]=[han,cargo];state.light[6]=[big,other];`);
 assert.equal(run("requestAction('transport','Light',['shuttleUp',2,6,0,0,'passenger'])"),true);
 assert.equal(run("requestAction('transport','Light',['dock',6,1,0,0,'pilot'])"),true);
 assert.equal(run("craftStats(other,6).power===5&&other.occupants[0].card===han"),true);
 assert.equal(run("requestAction('transport','Light',['shuttleUp',2,6,0,0,'cargo'])"),true);
 assert.equal(run("PremiereLocations.aboard(state,cargo,big)&&state.used.length===3"),true);
 assert.equal(run("requestAction('transport','Light',['shuttleDown',6,2,0,0,''])"),false);
});

test('a carrier loss loses attachments and crew under their owners, except Bantha passengers',async()=>{
 const {run}=await craftHarness();
 run(`const rebel=card('Light:2052'),vader=card('Dark:634');
  const lost=[],safe=[];PremiereUnits.add(bantha,vader,'passenger','Dark');
  PremiereUnits.remove(bantha,card=>lost.push(card),card=>safe.push(card));
  PremiereUnits.add(ship,rebel,'pilot','Light');ship.weapons=[card('Light:259')];
  PremiereUnits.remove(ship,card=>lost.push(card),card=>safe.push(card));`);
 assert.equal(run('safe[0]===vader&&lost.includes(rebel)&&lost.length===4&&!ship.occupants&&!ship.weapons'),true);
});

test('CZ-3 offers a paid Deploy-React at the adjacent drain and the arrival cancels it',()=>{
 const {run}=reactHarness();
 run(`state.light[0]=[{type:'Character',subType:'Droid',id:'Light:593'}];
  state.hand=[{id:'Light:2052',side:'Light',type:'Character',deploy:1,ability:1,name:'Rebel'}];`);
 assert.equal(run("requestAction('drain','Dark',[1])&&requestAction('reactDeploy','Light',[0,-1])"),true);
 assert.equal(run('state.light[1].length===0&&state.used.length===1&&state.hand.length===0'),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("state.light[1][0].name==='Rebel'&&state.pendingForceLoss===null&&state.game.responses.length===0"),true);
});

test('an active astromech supplies navigation and hyperspeed, and disabling the ship blocks the move',async()=>{
 const {run}=await craftHarness();
 run(`const red=card('Light:2060'),pilot=card('Light:239'),r2=card('Light:1995');
  state.light[5]=[red];state.phase=4;red.navComputer=false;
  PremiereUnits.add(red,pilot,'pilot','Light');`);
 assert.equal(run("movementOptionsFor('Light').some(move=>move.kind==='Hyperspeed')"),false);
 run("PremiereUnits.add(red,r2,'astromech','Light')");
 assert.equal(run("craftStats(red,5).hyperspeed===6&&movementOptionsFor('Light').some(move=>move.kind==='Hyperspeed')"),true);
 run('red.disabled=true');
 assert.equal(run("movementOptionsFor('Light').some(move=>move.kind==='Hyperspeed')"),false);
});

function segmentedBattleHarness(side='Light'){
 const fixture=weaponBattleHarness(side);
 fixture.run('state.game=PremiereGame.actionState(90,1);state.phase=3;state.trainingBattle=false;');
 return fixture;
}

test('a regular battle advances from weapons through power to individual damage payments',()=>{
 const {run,elements}=segmentedBattleHarness();
 run('rebel.weapons=[rifle];');
 assert.equal(run("requestAction('trainingNight','Light',[true])"),false);
 assert.equal(run("requestAction('battle','Light',[0])&&battleSession.segment==='weapons'"),true);
 assert.equal(run("requestAction('trainingModifier','Light',['Light','power',12])"),false);
 assert.doesNotMatch(elements.get('battleDetails').innerHTML,/Manuelle Karten-Effekte/);
 assert.equal(run("requestAction('destiny','Light')"),false);
 assert.equal(run("requestAction('fireWeapon','Light',[0,0,0])&&battleSession.lastHit.card===trooper"),true);
 assert.equal(run("requestAction('passWeapons','Dark')&&requestAction('passWeapons','Light')&&battleSession.segment==='power'"),true);
 assert.equal(run("requestAction('skipDestiny','Light')&&requestAction('skipDestiny','Dark')&&battleSession.segment==='damage'"),true);
 assert.equal(run("requestAction('passDamage','Light')"),true);
 assert.equal(run("requestAction('passDamage','Dark')"),false);
 assert.match(elements.get('battleDetails').innerHTML,/Pflicht-Forfeits Trooper/);
 assert.equal(run("botDamageAction().kind"),'battleForfeit');
 assert.equal(run("performAction(botDamageAction())&&state.botLost.includes(trooper)"),true);
 assert.equal(run("requestAction('passDamage','Light')&&performAction(botDamageAction())&&battleSession===null"),true);
});

test('Han can pay for one replacement after revealing destiny, and only the replacement counts',()=>{
 const {run,elements}=segmentedBattleHarness();
 run(`rebel.id='Light:1098';rebel.ability=4;state.deck=[{name:'Replacement',destiny:5},{name:'First draw',destiny:1}];`);
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('destiny','Light')"),true);
 assert.equal(run("state.used.length===1&&lifeForceRemaining('Light')===7"),true);
 assert.match(elements.get('controlPanel').innerHTML,/First draw/);
 assert.equal(run("requestAction('destinyResponse','Light',['hanRedraw'])"),false);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('destinyResponse','Light',['hanRedraw'])"),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("battleSession.lightDestiny===5&&state.used.slice(-2).map(card=>card.name).join()==='First draw,Replacement'"),true);
 assert.equal(run("PremiereGame.wasUsed(state.game,'battle','hanRedraw')"),true);
});

test('Tarkin with Vader cancels an opposing draw without creating attrition',()=>{
 const {run}=segmentedBattleHarness();
 run(`rebel.ability=4;state.dark[0].push({id:'Dark:1061',type:'Character',name:'Grand Moff Tarkin',ability:3,power:2,forfeit:4},
  {id:'Dark:634',type:'Character',name:'Darth Vader',ability:6,power:6,forfeit:6});`);
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('destiny','Light')"),true);
 assert.equal(run("requestAction('destinyResponse','Dark',['tarkinCancel'])"),true);
 assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
 assert.equal(run("battleSession.lightDestiny===0&&!battleSession.battleDrawSucceeded.Light&&state.used.at(-1).name==='Weapon draw'"),true);
 assert.equal(run("requestAction('skipDestiny','Dark')&&battleSession.damage.debt.Dark.attrition===0"),true);
});

test('a printed battle Interrupt grants real draws and keeps the weapon segment open for passes',()=>{
 const {run}=segmentedBattleHarness();
 run(`rebel.name='•Luke Skywalker';officer.name='•Han Solo';rebel.ability=4;
  state.hand.push({id:'Light:758',name:"Don't Get Cocky",type:'Interrupt'});
  state.deck=[{name:'Spare',destiny:6},{name:'Third',destiny:3},{name:'Second',destiny:2},{name:'First',destiny:1}];`);
 assert.equal(run("requestAction('battle','Light',[0])&&battleSession.segment==='weapons'"),true);
 assert.equal(run("requestAction('battleEffect','Light',[1])&&battleSession.extraDraws.Light===2"),true);
 assert.equal(run("requestAction('passWeapons','Dark')&&requestAction('passWeapons','Light')"),true);
 assert.equal(run("requestAction('destiny','Light')&&battleSession.lightDestiny===6&&state.deck[0].name==='Spare'"),true);
});

test('Dr. Evazan can remove the last rival participant before the damage segment',()=>{
 const {run}=segmentedBattleHarness('Dark');
 run(`state.light[0]=[rebel];trooper.weapons=[blaster];state.dark[0].push({id:'Dark:768',name:'Dr. Evazan',type:'Character',ability:2,power:2,forfeit:3});`);
 assert.equal(run("requestAction('battle','Dark',[0])&&requestAction('fireWeapon','Dark',[0,0,0])"),true);
 assert.equal(run("requestAction('passWeapons','Light')&&requestAction('battleEffect','Dark',[-1])"),true);
 assert.equal(run("state.lost.includes(rebel)&&battleSession===null&&state.battledCardsThisTurn.includes(rebel)"),true);
});

test('damage freezes inherited immunity and an immune pilot may still forfeit to cover damage and attrition',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(91,1);state.phase=3;
  const falcon=card('Light:1677'),han=card('Light:1098'),enemy=card('Dark:723');
  PremiereUnits.add(falcon,han,'pilot','Light');state.light[0]=[falcon];state.dark[0]=[enemy];
  state.botDeck=[{name:'Dark destiny',destiny:4}];
  state.dark[0].push({...scout});`);
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('skipDestiny','Light')"),true);
 assert.equal(run("requestAction('destiny','Dark')"),false); // Permanent pilot abilities sum to only 3.
 run('enemy.occupants=[{role:"pilot",card:card("Dark:791")}];refreshBattleParticipants();');
 assert.equal(run("requestAction('destiny','Dark')"),true);
 assert.equal(run("battleSession.damage.debt.Light.immunity.includes(han)&&battleSession.damage.debt.Light.immunity.includes(falcon)"),true);
 assert.equal(run("requestAction('battleForfeit','Light',[1])&&state.lost.includes(han)"),true);
 assert.equal(run("battleSession.damage.debt.Light.immunity.includes(falcon)&&battleSession.damage.debt.Light.attrition===0"),true);
});

test('Battle, Power and Attrition Destiny use separate totals and actually draw from the deck',()=>{
 const {run}=segmentedBattleHarness();
 run(`rebel.ability=4;state.deck=[{name:'Attrition',destiny:3},{name:'Power',destiny:2},{name:'Location',type:'Location'}];`);
 assert.equal(run("requestAction('battle','Light',[0])"),true);
 run("scheduleBattleDestiny('Light','power',1);scheduleBattleDestiny('Light','attrition',1);");
 assert.equal(run("requestAction('destiny','Light')&&requestAction('skipDestiny','Dark')"),true);
 assert.equal(run("battleSession.lightDestiny===0&&battleSession.damage.debt.Dark.damage===2&&battleSession.damage.debt.Dark.attrition===3"),true);
 assert.equal(run('state.deck.length===0&&state.used.length===4'),true);
});

test('damage payments alternate even when forfeiting removes all presence on the losing side',()=>{
 const {run}=segmentedBattleHarness();
 run('state.light[0]=[rebel];trooper.power=7;');
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('skipDestiny','Light')&&requestAction('skipDestiny','Dark')"),true);
 assert.equal(run("requestAction('battleForceLoss','Light',['hand',0])"),true);
 assert.equal(run("requestAction('battleForfeit','Light',[0])"),false);
 assert.equal(run("requestAction('passDamage','Dark')&&requestAction('battleForfeit','Light',[0])"),true);
 assert.equal(run("!confirmedPresence('Light',0)&&battleSession.damage.debt.Light.damage===1&&battleSession.segment==='damage'"),true);
 assert.equal(run("requestAction('passDamage','Dark')&&requestAction('battleForceLoss','Light',['force'])"),true);
 assert.equal(run("requestAction('passDamage','Dark')&&requestAction('passDamage','Light')&&battleSession===null"),true);
});

test('using a lightsaber during a drain locks that carrier to the same weapon for the turn',()=>{
 const {run}=segmentedBattleHarness();
 run(`const saber={id:'Light:1386',type:'Weapon',side:'Light',name:'Lightsaber'};
  rebel.weapons=[saber,rifle];state.phase=1;state.locations[0].icons={light:1,dark:1};state.dark[0]=[];`);
 assert.equal(run("requestAction('drain','Light',[0,1])"),true);
 assert.equal(run("state.weaponUsesThisTurn[0].weapon===saber"),true);
 run('state.dark[0]=[trooper];state.phase=3;');
 assert.equal(run("requestAction('battle','Light',[0])&&battleSession.segment==='power'"),true);
 assert.equal(run("requestAction('fireWeapon','Light',[0,1,0])"),false);
});

test('all 25 Premiere weapons have a rule and deck validation admits them',async()=>{
 const {run}=await premiereHarness();
 assert.equal(run(`catalog.filter(card=>card.type==='Weapon').filter(card=>PremiereWeapons.definition(card)||
  PremiereWeapons.seeker(card)||PremiereWeapons.mine(card)).length`),25);
 const lists=structuredClone(starterLists);
 lists.decks.Light.cards.find(card=>card.id==='Light:259').id='Light:1962';
 assert.equal(run(`readStarterDecks(${JSON.stringify(lists)},catalog).light.cards.length`),60);
});

test('named pistols use alternative deploy costs and reset forfeit only for their named bearer',async()=>{
 const {run}=await premiereHarness();
 run(`const card=id=>({...catalog.find(c=>c.id===id)}),han=card('Light:1098'),leia=card('Light:1495'),rebel=card('Light:2052');
  const hanPistol=card('Light:1106'),leiaPistol=card('Light:1503'),enemy=card('Dark:2648');
  setupDecks=null;state=PremiereGame.createState(PremiereGame.actionState(115,2),[],[],[card('Light:2448')],[0]);
  state.phase=2;state.activeSide='Light';state.light[0]=[han,leia,rebel];state.dark[0]=[enemy];
  state.hand=[hanPistol,leiaPistol];state.force=Array.from({length:8},()=>({}));
  state.deck=[{name:'Spare'},{name:'Blaster draw',destiny:5}];state.botDeck=[{name:'Life'}];`);
 assert.equal(run("weaponDeployOptions('Light',0).map(option=>option.cost).join()"),'1,3,3');
 assert.equal(run("weaponDeployOptions('Light',1).map(option=>option.cost).join()"),'2,1,2');
 assert.equal(run("PremiereWeapons.shot(leiaPistol,leia,enemy,leia.ability,1).cost"),0);
 assert.equal(run("PremiereWeapons.shot(hanPistol,rebel,enemy,rebel.ability,1).effect"),'hit');
 assert.equal(run("requestAction('equip','Light',[0,0,0])"),true);
 run('state.phase=3;');
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('fireWeapon','Light',[0,0,0])"),true);
 // Han's optional redraw gives both sides an opportunity to respond to this weapon draw.
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("battleSession.zeroForfeit.includes(enemy)&&battleForfeitValue(enemy,'Dark')===0"),true);
});

test('lightsabers enforce named and ability-based costs and use two draws against character and creature defense',async()=>{
 const {run}=await premiereHarness();
 assert.equal(run(`const byId=id=>catalog.find(card=>card.id===id);
  const obi=byId('Light:1803'),generic=byId('Light:1386'),named=byId('Light:1813'),bantha=byId('Dark:191');
  const result=PremiereWeapons.shot(generic,obi,bantha,obi.ability,bantha.maneuver);
  PremiereWeapons.deployCost(generic,obi,obi.ability)===1&&result.cost===1&&result.draws===2&&
  PremiereWeapons.deployCost(named,obi,obi.ability)===0&&PremiereWeapons.deployCost(named,byId('Light:2052'),1)===null;`),true);
});

test('Assault Rifle fires from an adjacent location only into the active battle',()=>{
 const {run}=segmentedBattleHarness('Dark');
 run(`const rifleman={name:'Rifleman',type:'Character',warrior:true,side:'Dark',ability:2,
  weapons:[{id:'Dark:146',side:'Dark',type:'Weapon',subType:'Character',name:'Assault Rifle'}]};state.dark[1]=[rifleman];
  const bystander={name:'Other Light',type:'Character',ability:1};state.light[1]=[bystander];`);
 assert.equal(run("requestAction('battle','Dark',[0])&&battleSession.segment==='weapons'"),true);
 assert.equal(run("battleWeaponOptions('Dark').every(option=>option.from===1&&option.target!==bystander)"),true);
 assert.equal(run("requestAction('fireWeapon','Dark',[0,0,0])"),false);
 assert.equal(run("requestAction('fireWeapon','Dark',[0,0,0,1])&&battleSession.hitUnits.Light.includes(rebel)"),true);
});

test('Light Repeating Blaster Rifle needs a present power droid and fires consecutively with a cost per shot',()=>{
 const {run}=segmentedBattleHarness('Dark');
 run(`trooper.weapons=[{id:'Dark:1551',side:'Dark',type:'Weapon',subType:'Character',name:'Light Repeating Blaster Rifle'}];
  state.botForce.push({},{});rebel.ability=2;`);
 assert.equal(run("battleSession={site:0,lightCard:null,darkCard:null};battleWeaponOptions('Dark').length"),0);
 run("battleSession=null;state.dark[0].push({id:'Dark:816',name:'EG-6',type:'Character',subType:'Droid'});");
 assert.equal(run("requestAction('battle','Dark',[0])&&requestAction('fireWeapon','Dark',[0,0,0])"),true);
 assert.equal(run("battleSession.weaponTurn==='Dark'&&battleSession.repeatingWeapon===trooper.weapons[0]"),true);
 assert.equal(run("requestAction('fireWeapon','Dark',[0,0,1])&&state.botForce.length===2"),true);
 assert.equal(run("battleSession.hitUnits.Light.length===2&&requestAction('passWeapons','Dark')&&battleSession.weaponTurn==='Light'"),true);
});

test('Gaderffii Stick blocks the chosen bearer only in the just-initiated battle',()=>{
 const {run}=segmentedBattleHarness('Dark');
 run(`trooper.name='Tusken Raider';trooper.weapons=[{id:'Dark:1002',side:'Dark',type:'Weapon',subType:'Character',name:'Gaderffii Stick'}];rebel.weapons=[rifle];`);
 assert.equal(run("requestAction('battle','Dark',[0])&&battleSession.segment==='initiation'"),true);
 assert.equal(run("requestAction('passResponse','Light')&&requestAction('gaderffii','Dark',[0,0,0])"),true);
 assert.equal(run("battleSession.blockedWeapons[0]===rebel&&state.botForce.length===4"),true);
 assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')&&battleSession.segment==='power'"),true);
});

test('a successful Ion Cannon destroys ship weapons and permanently resets defense and hyperspeed without a hit',async()=>{
 const {run}=await craftHarness();
 run(`const destroyer=card('Dark:1291'),ion=card('Dark:1327'),torpedoes=card('Light:1962');
  setupDecks=null;state.game=PremiereGame.actionState(116,0);state.phase=3;state.activeSide='Dark';state.botTurn={steps:[],index:0};
  state.light[1]=[ship];ship.weapons=[torpedoes];state.dark[1]=[destroyer];destroyer.weapons=[ion];
  state.botDeck=[{name:'Ion destiny',destiny:3}];`);
 assert.equal(run("requestAction('battle','Dark',[1])&&requestAction('fireWeapon','Dark',[0,0,0])"),true);
 assert.equal(run("ship.ionDamage&&state.lost.includes(torpedoes)&&ship.weapons.length===0&&!battleSession.hitUnits.Light.length"),true);
 assert.equal(run("craftStats(ship,1).hyperspeed===0&&craftStats(ship,1).maneuver===0&&craftStats(ship,1).power===3"),true);
});

test('the Laser Projector deploys inside and can itself be destroyed by a legal weapon',async()=>{
 const {run}=await craftHarness();
 run(`const projector=card('Dark:1479'),light=card('Light:2052'),dark=card('Dark:2355');
  setupDecks=null;state.game=PremiereGame.actionState(117,0);state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[projector];
  state.light[4]=[light];state.dark[4]=[dark];light.weapons=[card('Light:265')];
  state.deck=[{name:'Shot',destiny:3}];`);
 assert.equal(run("requestAction('deployAutomated','Dark',[0,3])"),false);
 assert.equal(run("requestAction('deployAutomated','Dark',[0,4])"),true);
 run("state.activeSide='Light';state.phase=3;state.botTurn=null;");
 assert.equal(run("requestAction('battle','Light',[4])&&requestAction('fireWeapon','Light',[0,0,1])"),true);
 assert.equal(run("state.botLost.includes(projector)&&state.dark[4].length===1&&!battleSession.hitUnits.Dark.length"),true);
});

test('seekers move in the owning Control phase and choose between eligible targets on either side',async()=>{
 const {run,elements}=await craftHarness();
 run(`const seeker=card('Light:2400'),enemy=card('Dark:2355'),ally=card('Light:2052');ally.ability=1;
  setupDecks=null;state.game=PremiereGame.actionState(118,0);state.hand=[seeker];state.light[3]=[ally];state.dark[3]=[enemy];
  state.locationOrder=[0,1,2,3,4,6,5];`);
 assert.equal(run("requestAction('deployAutomated','Light',[0,3])"),false);
 assert.equal(run("requestAction('deployAutomated','Light',[0,2])"),true);
 assert.equal(run("seekerMoves('Light').length"),0);
 run("state.phase=1;const choice=legalActions(state,'Light').find(action=>action.kind==='moveSeeker'&&action.to===3);");
 assert.equal(run('performAction(choice)&&state.automatedPending.kind==="seeker"'),true);
 assert.match(elements.get('controlPanel').innerHTML,/Ziel des Seekers/);
 assert.equal(run("requestAction('automatedTarget','Light',[1])&&state.botLost.includes(enemy)&&state.lost.includes(seeker)"),true);
 assert.equal(run('state.light[3].includes(ally)'),true);
});

test('each Timer Mine waits for its owner’s next turn and the targeted side chooses its character',()=>{
 for(const side of ['Light','Dark']){
  const {run}=segmentedBattleHarness(side);
  run(`const mine={id:'${side==='Light'?'Light:2610':'Dark:2609'}',side:'${side}',type:'Weapon',name:'Timer Mine'};
   const droid={id:'${side==='Light'?'Light:1556':'Dark:1557'}',type:'Character',subType:'Droid',name:'Mining Droid'};
   const own=PremiereGame.zones(state,'${side}'),enemy=PremiereGame.zones(state,PremiereGame.otherSide('${side}'));
   own.hand.push(mine);own.board[0].push(droid);own.deck.push({name:'Mine draw',destiny:1});state.phase=2;`);
  assert.equal(run(`requestAction('deployAutomated','${side}',[1,0])`),true);
  assert.equal(run('own.board[0].includes(mine)&&!state.automatedPending'),true);
  run(`endTurn('${side}');findAutomatedWeapons();`);
  assert.equal(run('own.board[0].includes(mine)'),true);
  run(`endTurn(PremiereGame.otherSide('${side}'));findAutomatedWeapons();`);
  assert.equal(run('own.lost.includes(mine)&&state.automatedPending.remaining===1'),true);
  assert.equal(run(`requestAction('automatedTarget',PremiereGame.otherSide('${side}'),[0])&&enemy.lost.length===1`),true);
 }
});

test('Disarmed works during the opposing Control phase and prevents later weapon transfer onto the character',async()=>{
 const {run}=await craftHarness();
 run(`const own=card('Light:2052'),target=card('Dark:2355'),weapon=card('Dark:264'),other=card('Dark:1279');
  own.weapons=[card('Light:259')];target.weapons=[weapon];other.weapons=[card('Dark:264')];
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.phase=1;
  state.light[2]=[own];state.dark[2]=[target,other];state.hand=[card('Light:735')];`);
 assert.equal(run("performAction(legalActions(state,'Light').find(option=>option.args[0]==='disarm'))"),true);
 assert.equal(run("state.botLost.includes(weapon)&&cardPowerModifier(target,'Dark',2)===-1"),true);
 run("state.phase=2;state.botHand=[card('Dark:264')];");
 assert.equal(run("weaponDeployOptions('Dark',0).some(option=>option.host===target)||weaponEffectOptions('Dark').some(option=>option.target?.host===target)"),false);
});

test('all ship armaments enforce their printed mounts, targeting families and shot modifiers',async()=>{
 const {run}=await craftHarness();
 assert.equal(run(`const torps=card('Light:1962'),quad=card('Light:1971'),boosted=card('Dark:303'),ion=card('Dark:1327'),turbo=card('Dark:2644');
  const corvette=card('Light:530'),destroyer=card('Dark:1291'),advanced=card('Dark:2595');
  PremiereWeapons.deployCost(torps,ship,1)===1&&PremiereWeapons.deployCost(torps,corvette,1)===null&&
  PremiereWeapons.deployCost(quad,corvette,1)===2&&PremiereWeapons.shot(quad,corvette,ship,1,4).bonus===1&&
  PremiereWeapons.deployCost(boosted,advanced,1)===1&&PremiereWeapons.shot(boosted,advanced,destroyer,1,5).bonus===-1&&
  PremiereWeapons.deployCost(ion,ship,1)===null&&PremiereWeapons.deployCost(ion,destroyer,1)===2&&
  PremiereWeapons.deployCost(turbo,{type:'Location',subType:'System',locationTags:['Mobile']},0)===3&&
  PremiereWeapons.shot(turbo,destroyer,ship,1,4).draws===2&&PremiereWeapons.shot(turbo,destroyer,ship,1,4).bonus===-5;`),true);
});

test('a buried mine and a dud are hidden until crossed by a vehicle, whose crew is eligible for loss',async()=>{
 const {run,elements}=await craftHarness();
 run(`const mine=card('Light:2610'),dud={name:'Hidden Dud',side:'Light'},droid=card('Light:1556'),
  vehicle=card('Dark:2660'),driver=card('Dark:2355');
  setupDecks=null;state.game=PremiereGame.actionState(119,0);state.hand=[mine,dud];state.light[3]=[droid];
  state.locations[4]=card('Light:2466');state.locationOrder=[0,1,2,3,4,6,5];
  state.deck=[{name:'Mine Destiny',destiny:1}];`);
 assert.equal(run("!requestAction('buryMineCard','Light',[0,2])&&requestAction('buryMineCard','Light',[0,3])&&requestAction('buryMineCard','Light',[0,3])"),true);
 assert.equal(run(`const view=PremiereGame.playerView(state,'Dark');view.buriedCounts[3]===2&&!JSON.stringify(view).includes('Hidden Dud')`),true);
 assert.match(elements.get('board').innerHTML,/2 verdeckte Karten/);
 run("state.activeSide='Dark';state.phase=4;state.botTurn={steps:[],index:0};state.dark[2]=[vehicle];PremiereUnits.add(vehicle,driver,'driver','Dark');");
 assert.equal(run("requestAction('move','Dark',[2,0,4,'Landspeed'])&&state.automatedPending.kind==='mine'"),true);
 assert.equal(run("state.buriedMines.length===0&&state.lost.includes(dud)&&state.lost.includes(mine)"),true);
 assert.equal(run("requestAction('automatedTarget','Dark',[0])&&state.botLost.includes(driver)&&state.dark[4][0]===vehicle"),true);
});

test('all four seekers distinguish named characters from their printed fallback and ability ceilings',async()=>{
 const {run}=await premiereHarness();
 assert.equal(run(`const card=id=>catalog.find(c=>c.id===id);
  const han=card('Light:1098'),tarkin=card('Dark:1061'),luke=card('Light:1593');
  PremiereWeapons.seekerTarget(card('Light:2400'),{type:'Character',warrior:true},2)&&
  !PremiereWeapons.seekerTarget(card('Light:2400'),{type:'Character',warrior:true},3)&&
  PremiereWeapons.seekerTarget(card('Light:2426'),tarkin,2)&&
  PremiereWeapons.seekerTarget(card('Dark:1096'),han,2)&&
  PremiereWeapons.seekerTarget(card('Dark:1592'),luke,3)&&!PremiereWeapons.seekerTarget(card('Dark:1592'),luke,4);`),true);
});

test('weapon transfer charges the deploy cost, and Overload can lose the weapon and carrier outside battle',async()=>{
 const {run}=await craftHarness();
 run(`const a=card('Light:2052'),b=card('Light:239'),weapon=card('Light:265');
  setupDecks=null;state.game=PremiereGame.actionState(120,0);state.light[2]=[a,b];a.weapons=[weapon];
  state.botHand=[card('Dark:1880')];state.botDeck=[{name:'Empty-site Draw',type:'Location'}];`);
 assert.equal(run("performAction(legalActions(state,'Light').find(action=>action.args[0]==='transfer'))"),true);
 assert.equal(run('a.weapons.length===0&&b.weapons[0]===weapon&&state.used.length===2'),true);
 run("state.activeSide='Dark';state.phase=4;state.botTurn={steps:[],index:0};");
 assert.equal(run("performAction(legalActions(state,'Dark').find(action=>action.args[0]==='overload'))"),true);
 assert.equal(run("state.lost.includes(weapon)&&state.lost.includes(b)&&state.light[2][0]===a&&state.botUsed.length===1"),true);
});
