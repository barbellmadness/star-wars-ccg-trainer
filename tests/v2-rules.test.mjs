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
const cardRulesScript=readFileSync(new URL('../engine/premiere-card-rules.js',import.meta.url),'utf8');
const sessionScript=readFileSync(new URL('../engine/premiere-session.js',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!js)throw Error('V2 script missing');
function harness({storage={getItem:()=>null,setItem:()=>{}},confirmNewGame=()=>true}={}){
 const elements=new Map();
 const timers=new Map();
 let timerId=0;
 const document={getElementById(id){
  if(!elements.has(id))elements.set(id,{
   value:'',checked:true,style:{},dataset:{},innerHTML:'',textContent:'',open:false,validity:{valid:true},
   showModal(){this.open=true;},close(){this.open=false;},focus(){},
  });
  return elements.get(id);
 }};
 const context=vm.createContext({document,console,Math,Number,String,Array,RegExp,Set,fetch:async()=>({ok:false}),Error,
  localStorage:storage,confirm:confirmNewGame,setTimeout(callback){timers.set(++timerId,callback);return timerId;},
  clearTimeout:id=>timers.delete(id)});
 vm.runInContext(cardDataScript,context);
 vm.runInContext(gameScript,context);
 vm.runInContext(battleScript,context);
 vm.runInContext(unitScript,context);
 vm.runInContext(locationScript,context);
 vm.runInContext(cardRulesScript,context);
 vm.runInContext(weaponScript,context);
 vm.runInContext(sessionScript,context);
 vm.runInContext(js.replace(/load\(\);\s*$/,''),context);
 const run=code=>vm.runInContext(code,context);
 return {run,elements,tick(){
  const [id,callback]=timers.entries().next().value??[];
  if(!callback)return false;
  timers.delete(id);callback();return true;
 }};
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
const themedLists=readFileSync(new URL('../data/premiere-themed-decks.json',import.meta.url),'utf8');
const supplementalCards=readFileSync(new URL('../data/premiere-supplemental-cards.json',import.meta.url),'utf8');

async function premiereHarness(deckLists=starterLists,browser){
 const fixture=harness(browser);
 const {run}=fixture;
 const snapshot=readFileSync(new URL('../data/premiere.json',import.meta.url),'utf8');
 run('globalThis.location={hostname:'+JSON.stringify(browser?.hostname??'')+'};');
 run(`fetch=async path=>{
  if(path==='data/premiere.json')return {ok:true,json:async()=>JSON.parse(${JSON.stringify(snapshot)})};
  if(path==='data/premiere-starter-decks.json'&&${deckLists!==null})return {ok:true,json:async()=>(${JSON.stringify(deckLists)})};
  if(path==='data/premiere-themed-decks.json')return {ok:true,json:async()=>JSON.parse(${JSON.stringify(themedLists)})};
  if(path==='data/premiere-supplemental-cards.json')return {ok:true,json:async()=>JSON.parse(${JSON.stringify(supplementalCards)})};
  if(path==='local-print-texts.json'){
   globalThis.requestedLocalPrints=true;
   const report=${JSON.stringify(browser?.localPrintReport??null)};
   if(report)return {ok:true,json:async()=>report};
  }
  return {ok:false,status:404};
 }`);
 await run('load()');
 return fixture;
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

test('the local inspector uses scan-matched print text and keeps both location sides separate',async()=>{
 const localPrintReport={schema:1,cards:[
  {id:'Light:2',status:'sight',scanUrl:'https://res.starwarsccg.org/cards/Premiere-Light/large/2x3kpr.gif',printText:'Printed < text'},
  {id:'Light:672',status:'sight',scanUrl:'https://res.starwarsccg.org/cards/Premiere-Light/large/deathstardetentionblockcontrolroom.gif',
   printText:{Light:'Printed Light Side text',Dark:''}},
  {id:'Dark:816',status:'sight',scanUrl:'https://res.starwarsccg.org/cards/Premiere-Dark/large/wrong-scan.gif',printText:'Wrong scan'},
 ]};
 const {run,elements}=await premiereHarness(starterLists,{hostname:'127.0.0.1',localPrintReport});
 assert.equal(run('localPrintTexts.size'),2);
 run(`state={hand:[catalog.find(card=>card.id==='Light:2')],botHand:[catalog.find(card=>card.id==='Dark:816')]};inspectCard('Light',0,'hand')`);
 const body=elements.get('cardInspectorBody');
 assert.match(body.innerHTML,/Aktiver Spieltext.*<h3>Drucktext<\/h3><p[^>]*>Printed &lt; text/);
 assert.equal(run('state.hand[0].texts.print'),null);
 run(`showCardWithStats(catalog.find(card=>card.id==='Light:672'))`);
 assert.match(body.innerHTML,/<h3>Drucktext<\/h3>.*Light Side<\/b><br>Printed Light Side text.*Dark Side<\/b><br>Feld im Scan leer/);
 run(`inspectCard('Dark',0,'hand')`);
 assert.match(body.innerHTML,/Drucktext im Kartenscan · Transkription offen/);

 const publicPage=await premiereHarness(starterLists,{hostname:'example.com',localPrintReport});
 assert.equal(publicPage.run('globalThis.requestedLocalPrints'),undefined);
 assert.equal(publicPage.run('localPrintTexts.size'),0);
});

test('hand images select directly and a separate magnifier opens the inspector',async()=>{
 const {run,elements}=await premiereHarness();
 run(`start(0);chooseStart(startingLocationChoices(setupDecks.light)[1].index);beginStartingGame()`);
 const hand=elements.get('hand').innerHTML;
 assert.match(hand,/<button class="card-face"[^>]*id="handCard0"[^>]*aria-pressed="false"[^>]*onclick="select\(0,\d+,\d+\)"><img/);
 assert.match(hand,/<button class="hand-card-inspect"[^>]*aria-haspopup="dialog"[^>]*onclick="inspectCard\('Light',0,'hand'\)"/);
 assert.doesNotMatch(hand,/<b>|>Details<\/button>/);
 assert.equal(run('select(0)'),true);
 assert.equal(run('selected'),0);
 assert.equal(elements.get('cardInspector').open,false);
 assert.match(elements.get('hand').innerHTML,/id="handCard0" aria-pressed="true"/);
 run("inspectCard('Light',0,'hand',0)");
 assert.equal(elements.get('cardInspector').open,true);
 assert.equal(run('selected'),0);
 assert.equal(elements.get('selectInspectorCard').hidden,false);
 run("el('selectInspectorCard').onclick()");
 assert.equal(run('selected'),0);
 assert.equal(elements.get('cardInspector').open,false);
 assert.match(elements.get('hand').innerHTML,/class="card hand-card chosen"/);

 run(`const ship={name:'Test Ship',type:'Starship',ionDamage:true,
  weapons:[{name:'Test Weapon'}],occupants:[{role:'pilot',card:{name:'Test Pilot'}}]};
  state.light[0].push(ship);inspectCard('Light',0,'field',0)`);
 const field=run('renderPlaymatColumn(state.locations[0],0)');
 assert.match(field,/class="location-name">[^<]+/);
 assert.match(field,/aria-label="Test Ship ansehen" onclick="inspectCard\('Light',0,'field',0\)"/);
 assert.doesNotMatch(field,/<b>Test Ship|hand-card-inspect|>Test (?:Weapon|Pilot)</);
 assert.match(field,/class="playmat-stack"[^>]+>.*aria-label="Waffe · Test Weapon ansehen".*aria-label="Pilot · Test Pilot ansehen"/);
 assert.equal(elements.get('selectInspectorCard').hidden,true);
 assert.match(elements.get('cardInspectorBody').innerHTML,/Ionenschaden.*Besatzung und Ausrüstung.*Test Weapon.*Pilot · Test Pilot/);
 run("inspectStackLayer('Light',0,0,1)");
 assert.equal(elements.get('cardInspectorTitle').textContent,'Test Pilot');
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
 assertInvalid(deck=>{deck.cards[0].id='Light:38'},/nicht ausgespielt werden/);
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
 const fixture=harness();
 const {run}=fixture;
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
 return fixture;
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

test('Premiere pilots apply bonuses only while piloting',async()=>{
 const {run}=await craftHarness();
 for(const [pilotId,shipId,side,bonus] of [
  ['Light:305','Light:530','Light',3],['Light:2040','Light:530','Light',2],['Dark:1279','Dark:723','Dark',2]
 ]){
  const result=JSON.parse(run(`(()=>{
   const pilot=card('${pilotId}'),ship=card('${shipId}');
   const base=craftStats(ship,0).power;
   PremiereUnits.add(ship,pilot,'passenger','${side}');
   const passenger=craftStats(ship,0).power-base;
   ship.occupants[0].role='pilot';
   const piloted=craftStats(ship,0).power-base;
   pilot.gameTextCancelled=true;
   return JSON.stringify({passenger,piloted,suppressed:craftStats(ship,0).power-base});
  })()`));
  assert.deepEqual(result,{passenger:0,piloted:bonus,suppressed:0});
 }
 assert.equal(run("printedAttritionImmunityBelow(card('Light:305'))"),3);
});

test('Premiere guards gain defending power and cannot move',async()=>{
 const {run}=await craftHarness();
 run(`const rebelGuard=card('Light:2038'),imperialGuard=card('Dark:1286'),speeder=card('Light:1609');
  state.light[2]=[rebelGuard,speeder];state.dark[2]=[imperialGuard];state.phase=4;`);
 assert.equal(run("legalActions(state,'Light').some(option=>['move','transport'].includes(option.kind)&&option.card===rebelGuard)"),false);
 run("state.activeSide='Dark';state.botTurn={steps:[],index:0}");
 assert.equal(run("legalActions(state,'Dark').some(option=>option.kind==='move'&&option.card===imperialGuard)"),false);
 assert.equal(run("battleTotals(2,'Light').darkPower-battleTotals(2).darkPower"),4);
 assert.equal(run("battleTotals(2,'Dark').lightPower-battleTotals(2).lightPower"),4);
 assert.equal(run("battleTotals(2,'Light').lightPower-battleTotals(2).lightPower"),0);
 assert.equal(run("battleTotals(2,'Dark').darkPower-battleTotals(2).darkPower"),0);
 run("state.game=PremiereGame.actionState(1,0);state.game.cardRulesVersion=6");
 assert.equal(run("battleTotals(2,'Dark').lightPower-battleTotals(2).lightPower"),0);
});

test('Premiere mining droids defuse mines at the same site',async()=>{
 const {run}=await craftHarness();
 for(const [side,droidId,mineId] of [
  ['Light','Light:1556','Dark:2609'],['Dark','Dark:1557','Light:2610']
 ]){
  const observed=JSON.parse(run(`(()=>{
   const side='${side}',enemy=PremiereGame.otherSide(side),droid=card('${droidId}'),mine=card('${mineId}');
   const own=PremiereGame.zones(state,side),opposing=PremiereGame.zones(state,enemy);
   state.activeSide=side;state.phase=2;state.botTurn=side==='Dark'?{steps:[],index:0}:null;
   own.board[2]=[];own.board[3]=[droid];opposing.board[2]=[mine];opposing.board[3]=[];
   const defuse=()=>legalActions(state,side).find(action=>action.kind==='weaponEffect'&&action.args[0]==='defuse');
   const nearby=Boolean(defuse());
   own.board[3]=[];own.board[2]=[droid];
   droid.gameTextCancelled=true;
   const suppressed=Boolean(defuse());
   droid.gameTextCancelled=false;state.activeSide=enemy;
   const offTurn=Boolean(defuse());
   state.activeSide=side;
   const startingForce=own.force.length,success=performAction(defuse());
   return JSON.stringify({nearby,suppressed,offTurn,success,paid:startingForce-own.force.length,lost:opposing.lost.includes(mine)});
  })()`));
  assert.deepEqual(observed,{nearby:false,suppressed:false,offTurn:false,success:true,paid:1,lost:true});
 }
});

test('Premiere navigation droids improve only their supported craft',async()=>{
 const {run}=await craftHarness();
 for(const [droidId,hostId,side,role,fields] of [
  ['Light:1995','Light:2060','Light','astromech',['power','maneuver','hyperspeed']],
  ['Light:2000','Light:1609','Light','driver',['power','maneuver','landspeed']],
  ['Dark:2001','Dark:2660','Dark','driver',['power','maneuver','landspeed']]
 ]){
  assert.equal(run(`(()=>{
   const droid=card('${droidId}'),ship=card('${hostId}'),driver=card('${side==='Light'?'Light:2040':'Dark:2355'}');
   if(!PremiereUnits.accepts(ship,droid,'${role}'))return false;
   PremiereUnits.add(ship,driver,'${role==='driver'?'driver':'pilot'}','${side}');
   const base=craftStats(ship,0);
   if('${role}'==='driver')ship.occupants=[];
   PremiereUnits.add(ship,droid,'${role}','${side}');
   const stats=craftStats(ship,0);
   return stats.powered&&${JSON.stringify(fields)}.every(field=>stats[field]===base[field]+1);
  })()`),true,droidId);
 }
 assert.equal(run("PremiereUnits.accepts(card('Dark:191'),card('Dark:2001'),'driver')"),false);
});

test('Premiere matching pilots grant maneuver and one fallback destiny',async()=>{
 const {run}=await craftHarness();
 for(const [pilotId,shipId,side,power,maneuver] of [
  ['Light:239','Light:2060','Light',2,1],['Light:1098','Light:1677','Light',2,2],
  ['Dark:790','Dark:247','Dark',3,1],['Dark:791','Dark:249','Dark',3,1]
 ]){
  const actual=JSON.parse(run(`(()=>{
   const pilot=card('${pilotId}'),ship=card('${shipId}'),side='${side}';
   const board=PremiereGame.zones(state,side).board;
   board[0]=[ship];
   PremiereUnits.add(ship,pilot,'pilot',side);
   const stats=craftStats(ship,0);
   const fallback=battleDestinyDrawCount(side,0,1),regular=battleDestinyDrawCount(side,0,6);
   ship.id='unmatched';const wrongShip=battleDestinyDrawCount(side,0,1);
   ship.id='${shipId}';pilot.gameTextCancelled=true;
   return JSON.stringify({power:stats.power-ship.power,maneuver:stats.maneuver-ship.maneuver,
    fallback,regular,wrongShip,suppressed:battleDestinyDrawCount(side,0,1)});
  })()`));
  assert.deepEqual(actual,{power,maneuver,fallback:1,regular:1,wrongShip:0,suppressed:0});
 }
 for(const [pilotId,shipName] of [['Light:1390','Red 6'],['Light:1924','Gold 5']]){
  assert.equal(run(`(()=>{
   const pilot=card('${pilotId}'),ship={...card('Light:2060'),id:'matching-ship',name:'•${shipName}'};
   state.light[0]=[ship];PremiereUnits.add(ship,pilot,'pilot','Light');
   return craftStats(ship,0).power===ship.power+2&&craftStats(ship,0).maneuver===ship.maneuver+1&&
    battleDestinyDrawCount('Light',0,1)===1;
  })()`),true);
 }
});

test('Luke adds Force off Tatooine and his Red 5 maneuver bonus',async()=>{
 const {run}=await craftHarness();
 run(`const luke=card('Light:1593'),red5={...card('Light:2060'),id:'Light:2068',name:'•Red 5'};
  const baseline=forceFromLocations('Light').count;
  state.light[2]=[luke];`);
 assert.equal(run("forceFromLocations('Light').count-baseline"),0);
 run("state.light[2]=[];state.light[6]=[red5];PremiereUnits.add(red5,luke,'pilot','Light')");
 assert.equal(run("forceFromLocations('Light').count-baseline"),1);
 assert.equal(run("craftStats(red5,6).maneuver-red5.maneuver"),2);
 assert.equal(run("craftStats(red5,6).power-red5.power"),3);
 assert.equal(run("printedAttritionImmunityBelow(luke)"),3);
 run("red5.id='Not Red 5'");
 assert.equal(run("craftStats(red5,6).maneuver-red5.maneuver"),0);
});

test('Premiere starfighter pilots and capacity follow their printed slots',async()=>{
 const {run}=await craftHarness();
 run(`const xwing=card('Light:2838'),tieAdvanced=card('Dark:2595'),ywing=card('Light:2907'),
  red1=card('Light:2057'),red3=card('Light:2060'),pilot=card('Light:2040'),rebel=card('Light:2052'),droid=card('Light:1995');`);
 assert.equal(run('[xwing,tieAdvanced,ywing].every(ship=>craftStats(ship,0).ability===1)'),true);
 assert.equal(run("[xwing,tieAdvanced].some(ship=>PremiereUnits.accepts(ship,pilot,'pilot')||PremiereUnits.accepts(ship,rebel,'passenger'))"),false);
 assert.equal(run("PremiereUnits.accepts(ywing,pilot,'pilot')&&PremiereUnits.accepts(ywing,rebel,'passenger')"),true);
 run("PremiereUnits.add(ywing,rebel,'passenger','Light')");
 assert.equal(run("PremiereUnits.accepts(ywing,pilot,'pilot')"),false);
 assert.equal(run("[red1,red3].every(ship=>!craftStats(ship,0).powered&&PremiereUnits.accepts(ship,pilot,'pilot'))"),true);
 assert.equal(run("PremiereUnits.accepts(red1,droid,'astromech')"),false);
 run("PremiereUnits.add(red3,pilot,'pilot','Light');PremiereUnits.add(red3,droid,'astromech','Light')");
 assert.equal(run("craftStats(red3,0).powered&&PremiereUnits.roles(red3,rebel).length===0&&PremiereUnits.roles(red3,droid).length===0"),true);
});

test('Premiere transport reacts honor the route, passengers and printed cost',async()=>{
 const {run}=await craftHarness();
 run(`const tube=card('Light:1548'),darkTube=card('Dark:1547'),speeder=card('Light:1609'),v35=card('Light:2307'),
  wolf=card('Light:2250'),luke=card('Light:1593'),beru=card('Light:221'),guard=card('Light:2038');
  const estimate=(side,site,kind='battle')=>reactOptions(side,{kind,site,side:PremiereGame.otherSide(side)});
  state.locationOrder=[0,1,2,3,4,5,6];
  state.locations[2]=card('Dark:673');state.locations[3]=card('Dark:678');state.locations[4]=card('Dark:682');
  state.light[2]=[tube];state.dark[2]=[darkTube];`);
 assert.equal(run("estimate('Light',4).some(option=>option.card===tube&&option.cost===1)"),true);
 assert.equal(run("estimate('Dark',3,'drain').some(option=>option.card===darkTube)"),true);
 assert.equal(run("estimate('Light',4,'deploy').length"),0);
 assert.equal(run("estimate('Dark',4).some(option=>option.card===darkTube)"),true);
 run("tube.occupants=[1,2,3,4].map(()=>({role:'passenger',card:guard}));state.locations[4]=card('Light:2448')");
 assert.equal(run("PremiereUnits.roles(tube,guard).length===0&&estimate('Light',4).length===0"),true);
 run(`state.locations[2]=card('Light:2447');state.locations[3]=card('Light:2448');state.locations[4]=card('Light:2462');
  state.light[2]=[speeder,v35,wolf];PremiereUnits.add(speeder,luke,'driver','Light');PremiereUnits.add(v35,beru,'driver','Light');`);
 assert.equal(run("estimate('Light',3).some(option=>option.card===wolf&&option.cost===1)"),true);
 assert.equal(run("estimate('Light',4).some(option=>option.card===wolf)"),false);
 assert.equal(run("estimate('Light',3).filter(option=>option.card!==wolf).every(option=>option.cost===0)&&estimate('Light',3).length===3"),true);
 run("speeder.gameTextCancelled=true;state.reactedThisTurn=[beru]");
 assert.equal(run("estimate('Light',3).length===1&&estimate('Light',3)[0].card===wolf"),true);
});

test('Premiere blasters enforce mount, cost and strict defense threshold',async()=>{
 const {run}=await craftHarness();
 for(const [id,deploy,fire,bonus,effect] of [
  ['Light:259',1,1,0,'hit'],['Dark:1264',1,1,0,'hit'],['Light:265',2,2,1,'hit'],['Dark:264',2,2,1,'hit'],['Light:1503',1,0,-1,'zero']
 ]){
  const result=JSON.parse(run(`(()=>{
   const weapon=card('${id}'),host=card('${id.startsWith('Light')?'Light:1495':'Dark:2355'}'),target=card('Dark:2355');
   const shot=PremiereWeapons.shot(weapon,host,target,host.ability,target.ability);
   const craft=card('Dark:191'),starship=card('Dark:2595'),officer=card('Dark:1279');
   return JSON.stringify({deploy:PremiereWeapons.deployCost(weapon,host,host.ability),fire:shot.cost,
    bonus:shot.bonus,effect:shot.effect,defense:shot.defense,officer:PremiereWeapons.deployCost(weapon,officer,officer.ability),
    starship:Boolean(PremiereWeapons.shot(weapon,host,starship,host.ability,3)),
    creature:Boolean(PremiereWeapons.shot(weapon,host,craft,host.ability,3))});
  })()`));
  assert.deepEqual(result,{deploy,fire,bonus,effect,defense:1,officer:null,starship:false,creature:true});
 }
});

test('Djas Puhr counts Dark Force icons and nighttime',async()=>{
 const {run}=await craftHarness();
 run("const djas=card('Dark:741');state.dark[2]=[djas];state.locations[2]=card('Dark:682')");
 assert.equal(run("cardPowerModifier(djas,'Dark',2)"),2);
 run("state.nightSites=[2]");
 assert.equal(run("cardPowerModifier(djas,'Dark',2)"),4);
 assert.equal(run("printedAttritionImmunityBelow(djas)"),3);
 run('djas.gameTextCancelled=true');
 assert.equal(run("cardPowerModifier(djas,'Dark',2)"),0);
});

test('Leia improves Death Star Rebels but not herself',async()=>{
 const {run}=await craftHarness();
 run("const leia=card('Light:1495'),rebel=card('Light:2052'),alien=card('Light:305');state.light[2]=[leia,rebel,alien]");
 assert.equal(run("cardPowerModifier(rebel,'Light',2)"),0);
 run("state.locations[2]=card('Dark:682')");
 assert.equal(run("cardPowerModifier(rebel,'Light',2)"),1);
 assert.equal(run("cardPowerModifier(leia,'Light',2)+cardPowerModifier(alien,'Light',2)"),0);
 assert.equal(run("printedAttritionImmunityBelow(leia)"),2);
});

test('TIE Fighter deploy discount needs an Imperial capital ship at the system',async()=>{
 const {run}=await craftHarness();
 run("const fighter=card('Dark:2600'),capital=card('Dark:723'),neutral=card('Light:530');const base=craftDeployCost(fighter,state.locations[6],'Dark')");
 assert.equal(run('base'),run('fighter.deploy'));
 run("state.dark[6]=[neutral];state.dark[0]=[capital]");
 assert.equal(run("craftDeployCost(fighter,state.locations[6],'Dark')"),run('base'));
 run("state.dark[6]=[capital];state.dark[0]=[]");
 assert.equal(run("craftDeployCost(fighter,state.locations[6],'Dark')"),run('base-1'));
 assert.equal(run('craftStats(fighter,6).ability'),1);
});

test('Premiere transports enforce crew, cargo and docking capacity',async()=>{
 const {run}=await craftHarness();
 for(const [id,ability,capacity] of [
  ['Light:530',1,{pilot:3,passenger:4,cargo:1,hangar:0}],
  ['Dark:723',2,{pilot:6,passenger:8,cargo:2,hangar:4}],
  ['Dark:1291',1,{pilot:6,passenger:8,cargo:2,hangar:4}],
  ['Dark:2602',1,{pilot:1,passenger:2,cargo:0,hangar:0}],
 ]){
  assert.equal(run(`craftStats(card('${id}'),0).ability`),ability);
  for(const [role,limit] of Object.entries(capacity)){
   const expected=JSON.stringify(Array.from({length:limit+1},(_,i)=>i<limit));
   assert.equal(run(`(()=>{
    const ship=card('${id}'),role='${role}', results=[];
    const passengerId=({pilot:'Light:2040',passenger:'Light:2052',cargo:'Light:1609',hangar:'Dark:2600'})[role];
    for(let seat=0;seat<=${limit};seat++){
     const passenger=card(passengerId),accepted=PremiereUnits.accepts(ship,passenger,role);
     results.push(accepted);
     if(accepted)PremiereUnits.add(ship,passenger,role,ship.side);
    }
    return JSON.stringify(results);
   })()`),expected,id+' '+role);
  }
 }
 assert.equal(run("['Light:530','Dark:723','Dark:1291'].every(id=>canDock(card(id),scout,0))"),true);
 assert.equal(run("canDock(card('Dark:2595'),scout,0)"),false);
 run("PremiereUnits.add(scout,card('Dark:1279'),'pilot','Dark');PremiereUnits.add(scout,tusken,'passenger','Dark')");
 assert.equal(run("PremiereUnits.accepts(scout,tusken,'passenger')"),false);
 assert.equal(run("PremiereUnits.accepts(bantha,tusken,'passenger')&&cardAbility(bantha)===0.5"),true);
 run("PremiereUnits.add(bantha,tusken,'passenger','Dark');PremiereUnits.add(bantha,card('Dark:2355'),'passenger','Dark')");
 assert.equal(run("PremiereUnits.accepts(bantha,tusken,'passenger')"),false);
});

test('Tanbris discounts only weapons on the ship he pilots',async()=>{
 const {run}=await craftHarness();
 run(`const tanbris=card('Dark:1539'),destroyer=card('Dark:723'),other=card('Dark:1291'),ion=card('Dark:1327');
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.dark[0]=[destroyer,other];state.botHand=[ion];
  PremiereUnits.add(destroyer,tanbris,'passenger','Dark');`);
 assert.equal(run("weaponPlacementOptions('Dark',ion).every(choice=>choice.cost===2)"),true);
 run("destroyer.occupants[0].role='pilot'");
 assert.equal(run("weaponPlacementOptions('Dark',ion).find(choice=>choice.host===destroyer).cost"),1);
 assert.equal(run("weaponPlacementOptions('Dark',ion).find(choice=>choice.host===other).cost"),2);
 const before=run('state.botForce.length');
 assert.equal(run("requestAction('equip','Dark',[0,0,0])&&destroyer.weapons[0]===ion"),true);
 assert.equal(run('state.botForce.length'),before-1);
 run("const black=card('Dark:247');PremiereUnits.add(black,tanbris,'pilot','Dark')");
 assert.equal(run('craftStats(black,0).power-black.power'),2);
 assert.equal(run('craftStats(black,0).maneuver-black.maneuver'),-1);
});

test('R1-G4 modifies capital ships and cannot board fighters',async()=>{
 const {run}=await craftHarness();
 run(`const r1=card('Dark:1989'),destroyer=card('Dark:723'),baseline=craftStats(destroyer,0);
  state.dark[0]=[destroyer];battleSession={site:0,participants:{Light:[],Dark:[destroyer]}};
  PremiereUnits.add(destroyer,r1,'passenger','Dark');`);
 assert.equal(run("PremiereUnits.accepts(scout,card('Dark:2355'),'passenger')&&!PremiereUnits.accepts(scout,r1,'passenger')"),true);
 assert.equal(run("craftStats(destroyer,0).power===baseline.power+1&&craftStats(destroyer,0).hyperspeed===baseline.hyperspeed+1"),true);
 assert.equal(run("battleImmunity('Dark',destroyer)"),3);
 run('r1.gameTextCancelled=true');
 assert.equal(run("battleImmunity('Dark',destroyer)"),0);
});

test('Kal’Falnl can pilot capital ships and move three sites',async()=>{
 const {run}=await craftHarness();
 run(`const kal=card('Light:1407'),corvette=card('Light:530');
  state.locations[5]=card('Light:2462');state.locationOrder=[0,1,2,3,4,5,6];
  state.locations[4]=card('Light:2471');`);
 assert.equal(run(`PremiereUnits.accepts(corvette,kal,'pilot')&&!PremiereUnits.accepts(card('Light:2907'),kal,'pilot')&&
  !PremiereUnits.accepts(card('Light:2161'),kal,'passenger')`),true);
 assert.equal(run("travelOptions(kal,'Light',2,5)[0].kind"),'Landspeed');
 run("PremiereUnits.add(corvette,kal,'pilot','Light')");
 assert.equal(run('craftStats(corvette,0).power-corvette.power'),2);
});

test('Kal’Falnl sets opposite single battle destiny to zero',async()=>{
 const {run}=await craftHarness();
 run(`const kal=card('Light:1407');state.game=PremiereGame.actionState(58,1);state.game.cardRulesVersion=7;
  state.light[2]=[kal];state.dark[2]=[card('Dark:2355')];state.phase=3;
  requestAction('battle','Light',[2]);requestAction('passWeapons','Light');requestAction('passWeapons','Dark');
  Object.assign(battleSession,{lightCard:{name:'draw'},darkCard:{name:'draw'},lightDestiny:4,darkDestiny:3,drawCounts:{Light:1,Dark:1}});
  settlePowerSegment();`);
 assert.equal(run('battleSession.darkDestiny'),0);
 assert.equal(run('battleSession.lightDestiny'),4);
});

test('Traffic Control and Reactor Terminal recycle selected cards only during Control',async()=>{
 const {run}=await craftHarness();
 for(const [id,side,first,second] of [
  ['Light:2625','Light','Light:2052','Light:2040'],['Dark:2029','Dark','Dark:2355','Dark:1279'],
 ]){
  assert.equal(run(`(()=>{
   const cardSide='${side}',opponent=PremiereGame.otherSide(cardSide),own=PremiereGame.zones(state,cardSide);
   const effect=card('${id}'),topFirst=card('${first}'),topSecond=card('${second}');
   setupDecks=null;state.game=PremiereGame.actionState(131,1);state.game.cardRulesVersion=8;
   state.activeSide=cardSide;state.phase=2;state.botTurn=cardSide==='Dark'?{steps:[],index:0}:null;
   own.hand.splice(0,own.hand.length,effect,topFirst,topSecond);
   const before=own.force.length;
   if(!requestAction('deployTableEffect',cardSide,[0])||!state.tableEffects.some(record=>record.card===effect&&record.target===cardSide))return false;
   if(own.force.length!==before-1||requestAction('recycleHand',cardSide,[0]))return false;
   state.phase=1;state.activeSide=opponent;
   if(requestAction('recycleHand',cardSide,[0]))return false;
   state.activeSide=cardSide;
   if(!requestAction('recycleHand',cardSide,[1])||!requestAction('recycleHand',cardSide,[0]))return false;
   return own.force.length===before-1&&own.hand.length===0&&own.used.at(-1)===topFirst&&own.used.at(-2)===topSecond;
  })()`),true);
 }
});

test('Gold 1, Custom TIE and Ubrikkian follow their individual rules',async()=>{
 const {run}=await craftHarness();
 run(`const gold=card('Light:1045'),custom=card('Dark:2700'),ubrikkian=card('Dark:2660'),vader=card('Dark:634');
  const trooper=card('Dark:2355'),darkPilot=card('Dark:1279'),lightPilot=card('Light:2040');
  PremiereUnits.add(gold,lightPilot,'pilot','Light');PremiereUnits.add(gold,card('Light:2052'),'passenger','Light');`);
 assert.equal(run("!PremiereUnits.accepts(gold,lightPilot,'pilot')&&!PremiereUnits.accepts(gold,lightPilot,'passenger')"),true);
 run("battleSession={site:0,participants:{Light:[],Dark:[custom]}};state.dark[0]=[custom];PremiereUnits.add(custom,darkPilot,'pilot','Dark')");
 assert.equal(run("battleImmunity('Dark',custom)"),0);
 run("custom.occupants=[];PremiereUnits.add(custom,vader,'pilot','Dark')");
 assert.equal(run("battleImmunity('Dark',custom)"),4);
 assert.equal(run("!PremiereUnits.accepts(custom,darkPilot,'pilot')&&!PremiereUnits.accepts(custom,trooper,'passenger')"),true);
 run("state.dark[2]=[ubrikkian];PremiereUnits.add(ubrikkian,trooper,'driver','Dark')");
 assert.equal(run("reactOptions('Dark',{kind:'battle',side:'Light',site:3}).some(option=>option.card===ubrikkian&&option.cost===1)"),true);
 assert.equal(run("!PremiereUnits.accepts(ubrikkian,trooper,'driver')&&PremiereUnits.accepts(ubrikkian,trooper,'passenger')"),true);
});

test('Fivedesix taxes opposing droids and friendly mouse droids at the location',async()=>{
 const {run}=await craftHarness();
 run(`const five=card('Dark:12'),mouse=card('Dark:1709'),droid=card('Light:1995'),friendly=card('Dark:2001');
  const base=(droid,slot)=>crewDeployCost(droid,droid.side,state.locations[slot]);
  state.dark[2]=[five];`);
 assert.equal(run('base(mouse,2)-base(mouse,3)'),1);
 assert.equal(run('base(droid,2)-base(droid,3)'),1);
 assert.equal(run('base(friendly,2)-base(friendly,3)'),0);
 run("state.nightSites=[2];battleSession={site:2,participants:{Light:[],Dark:[five]}}");
 assert.equal(run("battleImmunity('Dark',five)"),Infinity);
 run('five.gameTextCancelled=true');
 assert.equal(run('base(mouse,2)-base(mouse,3)'),0);
 assert.equal(run("battleImmunity('Dark',five)"),0);
});

test('Dathcha pays with both Force Piles even when deploying aboard',async()=>{
 const {run}=await craftHarness();
 run(`const crawler=card('Dark:2160'),dathcha=card('Dark:643');state.dark[2]=[crawler];
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[dathcha];state.force=state.force.slice(0,1);
  const deployAboard=()=>legalActions(state,'Dark').find(option=>option.kind==='transport'&&option.args[0]==='deployAboard'&&option.args[5]==='passenger');`);
 assert.equal(run('Boolean(deployAboard())'),false);
 run('state.force.push(...forcePile().slice(0,2));const lightBefore=state.force.length,darkBefore=state.botForce.length');
 assert.equal(run('deployAboard().cost===2&&deployAboard().opponentCost===2&&performAction(deployAboard())'),true);
 assert.equal(run('state.force.length===lightBefore-2&&state.botForce.length===darkBefore-2&&crawler.occupants[0].card===dathcha'),true);
});

test('Death Star Trooper can deploy only on the Death Star',async()=>{
 const {run}=await craftHarness();
 run("const trooper=card('Dark:668');state.locations[3]=card('Dark:673');state.dark[2]=[trooper]");
 assert.equal(run("characterDeployCost(trooper,state.locations[2],'Dark')"),null);
 assert.equal(run("characterDeployCost(trooper,state.locations[3],'Dark')"),run("trooper.deploy"));
 assert.equal(run("cardPowerModifier(trooper,'Dark',2)"),-1);
 assert.equal(run("cardPowerModifier(trooper,'Dark',3)"),0);
});

test('Wuher clears the Cantina and acts only at the start of Control elsewhere',async()=>{
 const {run}=await craftHarness();
 run(`const wuher=card('Dark:2834'),droid=card('Light:1995'),later=card('Light:2000'),blaster=card('Dark:1264');
  const trooper=card('Dark:2355');trooper.weapons=[blaster];
  state.game=PremiereGame.actionState(135,1);state.game.cardRulesVersion=9;
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.phase=0;
  state.dark[2]=[wuher,trooper];state.light[2]=[droid];`);
 assert.equal(run('changePhase(1);state.lost.includes(droid)&&state.botLost.includes(blaster)'),true);
 run('state.light[2]=[later];findAutomatedWeapons()');
 assert.equal(run('state.light[2].includes(later)'),true);
 run("state.locations[2]=card('Light:2440');findAutomatedWeapons()");
 assert.equal(run('state.lost.includes(later)'),true);
});

test('Gift of the Mentor searches only for a lightsaber',async()=>{
 const {run}=await craftHarness();
 run(`const gift=card('Light:1039'),lightsaber=card('Light:1386'),blaster=card('Light:259');
  state.game=PremiereGame.actionState(82,1);state.game.cardRulesVersion=10;
  state.hand=[gift];state.deck=[blaster,lightsaber,card('Light:1593')];state.activeSide='Dark';
  const before=state.force.length;`);
 assert.equal(run("requestAction('searchReserve','Light',[0])&&state.force.length===before-1"),true);
 assert.equal(run("legalActions(state,'Light').length===1&&legalActions(state,'Light')[0].card===lightsaber"),true);
 assert.equal(run("requestAction('takeFromReserve','Light',[1])"),false);
 assert.equal(run("requestAction('takeFromReserve','Light',[0])&&state.hand.includes(lightsaber)&&state.deck.includes(blaster)&&state.lost.includes(gift)"),true);
});

test('Gift of the Mentor pairs Luke with a mentor',async()=>{
 const {run}=await craftHarness();
 run(`const luke=card('Light:1593'),obi=card('Light:1803'),gift=card('Light:1039'),yoda={...obi,name:'•Yoda'};
  state.game=PremiereGame.actionState(83,1);state.game.cardRulesVersion=10;
  state.light[2]=[luke,obi];state.dark[2]=[card('Dark:2355')];state.hand=[gift];state.phase=3;`);
 assert.equal(run("requestAction('battle','Light',[2])&&battleEffectOptions('Light').some(option=>option.card===gift)"),true);
 run('state.light[2][1]=yoda;refreshBattleParticipants()');
 assert.equal(run("requestAction('battleEffect','Light',[0])&&battleSession.extraDraws.Light===2"),true);
});

test('Named Premiere retrieval and searches work during either turn',async()=>{
 const {run}=await craftHarness();
 for(const [interruptId,targetId,side,cost] of [
  ['Light:1102','Light:1098','Light',1],['Light:1500','Light:1495','Light',1],['Light:1600','Light:1593','Light',1],
  ['Light:2105','Light:1803','Light',1],['Dark:2528','Dark:1061','Dark',2],
 ]){
  assert.equal(run(`(()=>{
   const side='${side}',target=card('${targetId}'),second=card('${targetId}'),wrong=card('Light:2052');
   const own=PremiereGame.zones(state,side);
   state.game=PremiereGame.actionState(81,1);state.game.cardRulesVersion=10;
   state.activeSide=PremiereGame.otherSide(side);state.phase=1;
   own.force.splice(0,own.force.length,...forcePile(),...forcePile());
   own.hand.splice(0,own.hand.length,card('${interruptId}'),card('${interruptId}'));
   own.lost.splice(0,own.lost.length,wrong,target);own.deck.splice(0,own.deck.length,wrong,second);
   if(requestAction('retrieve',side,[0,0]))return false;
   if(!requestAction('retrieve',side,[0,1])||own.used.at(-1)!==target||own.force.length!==10-${cost})return false;
   if(!requestAction('searchReserve',side,[0])||own.force.length!==8-2*${cost})return false;
   if(requestAction('takeFromReserve',side,[1])||!requestAction('takeFromReserve',side,[0]))return false;
   return own.hand.includes(second)&&own.deck.includes(wrong)&&!own.deck.includes(second);
  })()`),true,interruptId);
 }
});

test('Falcon requires an active pilot and its namesake pilots grant immunity',async()=>{
 const {run}=await craftHarness();
 run(`const falcon=card('Light:1677'),han=card('Light:1098');
  state.light[0]=[falcon];battleSession={site:0,participants:{Light:[falcon],Dark:[]}};`);
 assert.equal(run("craftStats(falcon,0).power===0&&craftStats(falcon,0).hyperspeed===0&&PremiereWeapons.defense(falcon,0,craftStats(falcon,0))===0"),true);
 run("PremiereUnits.add(falcon,han,'passenger','Light')");
 assert.equal(run("!craftStats(falcon,0).powered&&battleImmunity('Light',falcon)===0"),true);
 run("falcon.occupants[0].role='pilot'");
 assert.equal(run("craftStats(falcon,0).powered&&battleImmunity('Light',falcon)===5&&PremiereUnits.hasDock(falcon)"),true);
});

test('Stormtrooper Backpack expands weapon use and offers planet-site immunity',async()=>{
 const {run}=await craftHarness();
 run(`const trooper=card('Dark:2355'),pilot=card('Dark:1279'),backpack=card('Dark:2357'),blaster=card('Dark:1264'),rifle=card('Dark:264');
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[backpack];state.dark[2]=[trooper,pilot];`);
 assert.equal(run("deviceHosts('Dark',0).map(option=>option.host.id).join(',')"),'Dark:2355');
 assert.equal(run("requestAction('deployDevice','Dark',[0,2,0])&&trooper.attachments[0]===backpack"),true);
 run("PremiereUnits.recordWeaponUse(state,trooper,blaster);battleSession={site:2,participants:{Light:[],Dark:[trooper]}}");
 assert.equal(run("PremiereUnits.canUseWeapon(state,trooper,rifle)&&battleImmunity('Dark',trooper)===3"),true);
 run('battleSession.site=0;state.dark[2]=[];state.dark[0]=[trooper]');
 assert.equal(run("battleImmunity('Dark',trooper)"),0);
});

test('Limited Resources applies hand size, turn and ship tanks',async()=>{
 const {run,elements}=await craftHarness();
 run(`const limited=card('Dark:1555'),tank=card('Light:997');
  setupDecks=null;state.game=PremiereGame.actionState(93,1);state.game.cardRulesVersion=10;state.activeSide='Dark';
  state.botHand=[limited];state.hand=[ship,card('Light:1593'),card('Light:1373')];`);
 assert.equal(run("requestAction('limitedResources','Dark',[0])"),false);
 run('state.hand.pop();state.activeSide="Light"');
 assert.equal(run("limitedResourcesOptions('Dark')[0].amount"),2);
 run('ship.attachments=[tank];state.light[0]=[ship];state.hand.shift()');
 assert.equal(run("limitedResourcesOptions('Dark').length"),0);
 run('state.activeSide="Dark"');
 assert.equal(run("botBegin();botNextStep()&&state.pendingForceLoss.remaining===2&&state.botLost.includes(limited)"),true);
 run('renderControlPanel()');
 assert.match(elements.get('controlPanel').innerHTML,/Limited Resources/);
});

test('both Premiere Restraining Bolts block boarding moves and transfer for free',async()=>{
 const {run}=await craftHarness();
 run(`const lightBolt=card('Light:2100'),darkBolt=card('Dark:2099'),droid=card('Light:2000'),other=card('Dark:2001');
  const landspeeder=card('Light:1609');PremiereUnits.add(landspeeder,droid,'passenger','Light');
  state.light[2]=[landspeeder];state.dark[2]=[other];state.hand=[lightBolt];`);
 const light=run("legalActions(state,'Light').find(action=>action.kind==='deployBolt'&&action.host===droid).args");
 assert.equal(run(`requestAction('deployBolt','Light',${JSON.stringify(light)})`),true);
 assert.equal(run("transportOptions('Light').some(option=>option.card===droid)"),false);
 assert.equal(run("performAction(legalActions(state,'Light').find(option=>option.kind==='deviceAction'&&option.args[0]==='transferBolt'))"),true);
 run("state.activeSide='Dark';state.botHand=[darkBolt];state.botTurn={steps:[],index:0}");
 assert.equal(run("performAction(legalActions(state,'Dark').find(action=>action.kind==='deployBolt'&&action.host===droid))"),true);
 assert.equal(run("PremiereUnits.restrainingBolt(droid)===darkBolt&&PremiereUnits.restrainingBolt(other)===lightBolt"),true);
});

test('registered Premiere locations apply their printed sides and exceptions',async()=>{
 const {run}=await craftHarness();
 run(`const jawa=card('Light:1373'),spy=card('Dark:1011');
  state.locations[2]=card('Light:2440');state.light[2]=[jawa];state.dark[2]=[tusken,spy];battleSession={site:2};`);
 assert.equal(run("cardPowerModifier(jawa,'Light',2)"),1);
 assert.equal(run("battleForfeitValue(spy,'Dark')"),run('spy.forfeit+1'));
 assert.equal(run("battleForfeitValue(tusken,'Dark')"),run('tusken.forfeit'));
 run("state.locations[2]=card('Dark:2439')");
 assert.equal(run("cardPowerModifier(spy,'Dark',2)"),1);
 assert.equal(run("cardPowerModifier(tusken,'Dark',2)"),0);
 assert.equal(run("battleForfeitValue(jawa,'Light')"),run('jawa.forfeit+1'));
 run("state.locations[2]=card('Dark:2454')");
 assert.equal(run("cardPowerModifier(jawa,'Light',2)"),-1);
 assert.equal(run("battleForfeitValue(jawa,'Light')"),run('jawa.forfeit-1'));
 run("state.locations[2]=card('Dark:2465');state.locations[4]=card('Dark:682');state.dark[4]=[card('Dark:1027')]");
 assert.equal(run("cardPowerModifier(spy,'Dark',2)"),1);
 assert.equal(run("battleForfeitValue(spy,'Dark')"),run('spy.forfeit+1'));
 assert.equal(run("battleForfeitValue(card('Light:2052'),'Light')"),run("card('Light:2052').forfeit-1"));
 run("state.light[4]=[card('Light:1593')]");
 assert.equal(run("battleForfeitValue(card('Light:2052'),'Light')"),run("card('Light:2052').forfeit"));
});

test('registered fleet power counts only ships at a controlled related system',async()=>{
 const {run}=await craftHarness();
 run("state.light[6]=[ship,card('Light:2907')];state.light[2]=[card('Light:2052')]");
 assert.equal(run('battleTotals(2).lightPower'),3);
 assert.equal(run('fleetPowerAtSite("Light",6)'),0);
 run('state.dark[6]=[tie]');
 assert.equal(run('battleTotals(2).lightPower'),1);
 assert.equal(run('fleetPowerAtSite("Dark",2)'),0);
});

test('registered location text follows printed sides even after Revolution',async()=>{
 const {run}=await craftHarness();
 run(`const locationRules=side=>PremiereLocations.conditions(state,2,side);
  state.locations[2]=card('Dark:675');`);
 assert.equal(run("locationRules('Dark').transitCost"),0);
 assert.equal(run("locationRules('Light').transitCost"),2);
 run(`state.locationEffects={2:[{card:card('Light:2110')}]};
  state.locations[3]=card('Light:2462');state.locations[4]=card('Light:680');`);
 assert.equal(run("locationRules('Dark').transitCost"),2);
 assert.equal(run("locationRules('Light').transitCost"),0);
 assert.equal(run("PremiereLocations.ruleAt(state,3,'Dark','weaponDestiny').amount"),1);
 assert.equal(run("PremiereLocations.ruleAt(state,3,'Light','weaponDestiny')"),undefined);
 assert.equal(run("hasDeployPresence('Light',state.locations[4])"),true);
 assert.equal(run("hasDeployPresence('Dark',state.locations[4])"),false);
 assert.equal(run("characterDeployCost(card('Light:1593'),state.locations[3],'Light')"),2);
 assert.equal(run("characterDeployCost(card('Light:1021'),state.locations[3],'Light')"),3);
});

test('Central Core waives Wrong Turn only for its controlling side and the tax applies to warriors',async()=>{
 const {run,elements}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(130,1);
  const core=card('Dark:669'),wrongTurn=card('Dark:2833'),trooper=card('Light:2052'),droid=card('Light:2');
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.locations[4]=core;
  state.botHand=[wrongTurn,card('Dark:2833')];state.botForce=[];`);
 assert.equal(run("requestAction('deployTableEffect','Dark',[0])"),false);
 run("state.botForce=forcePile()");
 assert.equal(run("legalActions(state,'Dark').find(action=>action.kind==='deployTableEffect').cost"),3);
 run("state.dark[4]=[card('Dark:2355')];state.light[4]=[card('Light:1593')]");
 assert.equal(run("legalActions(state,'Dark').find(action=>action.kind==='deployTableEffect').cost"),3);
 run("state.light[4]=[]");
 assert.equal(run("legalActions(state,'Dark').find(action=>action.kind==='deployTableEffect').cost"),0);
 assert.equal(run("requestAction('deployTableEffect','Dark',[0])&&state.botForce.length===5&&state.botUsed.length===0"),true);
 assert.match(elements.get('pilesLight').innerHTML,/Effects · .*Wrong Turn/);
 assert.equal(run("requestAction('deployTableEffect','Dark',[0])"),false);
 assert.equal(run("boardDeployCost(trooper,dock,'Light')"),2);
 assert.equal(run("boardDeployCost(droid,dock,'Light')"),2);
 run("state.light[2]=[card('Light:1593')]");
 assert.equal(run("boardDeployCost(trooper,dock,'Light')"),0);
});

test('Skywalkers cancels Wrong Turn on table and during deployment as a Lost Interrupt',async()=>{
 for(const pending of [false,true]){
  const {run}=await craftHarness();
  run(`setupDecks=null;state.game=PremiereGame.actionState(131,1);
   const wrongTurn=card('Dark:2833'),skywalkers=card('Light:2277');
   state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[wrongTurn];
   state.tableEffects=[];state.hand=${pending}?[skywalkers]:[];`);
  assert.equal(run("requestAction('deployTableEffect','Dark',[0])"),true);
  if(pending)assert.equal(run("requestAction('interruptResponse','Light',[0])"),true);
  else{
   run("state.hand=[skywalkers]");
   assert.equal(run("requestAction('cancelTableEffect','Light',[0,0])"),true);
  }
  assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
  assert.equal(run("state.tableEffects.length===0&&state.botLost.includes(wrongTurn)&&state.lost.includes(skywalkers)"),true);
  assert.equal(run("state.botUsed.length"),3);
 }
});

test('Detention Block releases only imprisoned characters on the Death Star after gaining control',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(132,1);state.phase=4;
  state.locations[2]=card('Light:672');state.locations[3]=card('Dark:673');state.locations[4]=card('Dark:682');
  state.locationOrder=[0,1,4,2,3,5,6];
  const prisoner={...card('Light:1495'),captured:true,imprisoned:true};
  const escorted={...card('Light:221'),captured:true},elsewhere={...card('Light:1098'),captured:true,imprisoned:true};
  state.dark[3]=[prisoner,escorted];state.dark[5]=[elsewhere];state.light[4]=[card('Light:1593')];
  state.dark[2]=[card('Dark:2355')];`);
 assert.equal(run("requestAction('move','Light',[4,0,2,'Landspeed'])"),true);
 assert.equal(run("state.dark[3].includes(prisoner)&&prisoner.captured"),true);
 run("state.activeSide='Dark';state.botTurn={steps:[],index:0}");
 assert.equal(run("requestAction('move','Dark',[2,0,3,'Landspeed'])"),true);
 assert.equal(run("state.light[3].includes(prisoner)&&!prisoner.captured&&!prisoner.imprisoned"),true);
 assert.equal(run("state.dark[3].includes(escorted)&&escorted.captured&&state.dark[5].includes(elsewhere)&&elsewhere.captured"),true);
});

async function captureHarness(destiny,atPrison=false){
 const fixture=await craftHarness(),{run}=fixture;
 run(`setupDecks=null;state.game=PremiereGame.actionState(134,1);state.game.cardRulesVersion=6;state.game.botStrategyVersion=1;
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.locationOrder=[0,1,2,3,4,5,6];
  state.locations[2]=card('Dark:682');state.locations[3]=card('Dark:673');state.locations[4]=card('Light:672');
  const captureSite=${atPrison?3:2},hunter=card('Dark:741'),trooper=card('Dark:2355');
  const prisoner=card('Light:1495'),blaster=card('Light:1503'),snare={...supplementalCatalog[0]};
  prisoner.weapons=[blaster];state.light[captureSite]=[prisoner];state.dark[captureSite]=[hunter,trooper];
  state.botHand=[snare];state.botDeck=[{name:'Waffen-Destiny',destiny:${destiny}}];
  const dark=(kind,args=[])=>requestAction(kind,'Dark',args);
  const light=(kind,args=[])=>requestAction(kind,'Light',args);
  const custody=kind=>legalActions(state,'Dark').find(option=>option.kind==='custody'&&option.args[0]===kind);
  const transfer=kind=>legalActions(state,'Dark').find(option=>option.kind==='prisonerTransfer'&&option.args[0]===kind);
  const shot=()=>legalActions(state,'Dark').find(option=>option.kind==='fireWeapon'&&option.target===prisoner);`);
 return fixture;
}

test('the bot uses printed capture rules, then escorts, imprisons and transfers a captive for free',async()=>{
 const {run,elements}=await captureHarness(6);
 assert.equal(run("dark('equip',[0,captureSite,1])"),false,'a regular Stormtrooper cannot equip the rifle');
 assert.equal(run("dark('equip',[0,captureSite,0])&&hunter.weapons[0]===snare&&state.botForce.length===4"),true);
 run('state.phase=3;');
 assert.equal(run("dark('battle',[captureSite])&&shot().cost===2&&shot().bonus===-1"),true);
 assert.equal(run("botWeaponAction().effect==='capture'&&performAction(botWeaponAction())"),true);
 assert.equal(run('state.botForce.length===1&&state.pendingCustody[0].card===prisoner&&prisoner.captured'),true);
 assert.equal(run("!!custody('imprison')||light('passWeapons')"),false,'must decide immediately, at a location without prison');
 assert.match(elements.get('battleDetails').innerHTML,/Gefangenenentscheidung des Bots zeigen/);
 assert.equal(run("performAction(botCustodyAction())&&hunter.escortedCaptive===prisoner&&battleSession===null"),true);
 assert.equal(run("withinDeploymentLimit(card('Light:1495'),'Light')||withinDeploymentLimit(card('Light:1503'),'Light')"),false);
 assert.equal(run("cardAbility(hunter)>0&&PremiereLocations.findEntry(state,prisoner).unavailable"),true);
 assert.match(elements.get('board').innerHTML,/Eskorte · •Leia Organa/);
 assert.equal(run("Boolean(transfer('deliver'))"),false,'only in the Dark Move phase');
 run('state.phase=4;');
 assert.equal(run("Boolean(transfer('deliver'))"),false,'only at the prison');
 assert.equal(run("botMove()&&state.botForce.length===0&&PremiereLocations.findEntry(state,prisoner).slot===3"),true);
 assert.equal(run("botMove()&&!hunter.escortedCaptive&&state.dark[3].includes(prisoner)&&prisoner.imprisoned"),true);
 assert.match(elements.get('board').innerHTML,/Inhaftiert/);
 assert.equal(run("performAction(transfer('take'))&&hunter.escortedCaptive===prisoner&&!prisoner.imprisoned"),true);
 assert.equal(run("performAction(transfer('deliver'))&&state.botForce.length===0"),true);
 run("state.dark[3]=[prisoner];state.light[3]=[card('Light:1593')];state.activeSide='Light';state.botTurn=null");
 assert.equal(run("PremiereLocations.control(state,'Light',3,cardAbility)"),true);
 assert.equal(run("state.dark[3].includes(prisoner)"),true);
 assert.equal(run("light('move',[3,0,4,'Landspeed'])"),true);
 assert.equal(run("state.light[3].includes(prisoner)&&prisoner.weapons[0]===blaster&&!prisoner.captured&&!prisoner.imprisoned"),true);
 assert.equal(run("state.lost.includes(prisoner)||state.used.includes(prisoner)"),false);
});

test('failed snares leave the target active, and successful snares can imprison it immediately at the prison',async()=>{
 const failed=await captureHarness(4);
 assert.equal(failed.run("dark('equip',[0,captureSite,0]);state.phase=3;dark('battle',[captureSite]);performAction(shot())"),true);
 assert.equal(failed.run("state.light[captureSite].includes(prisoner)&&!state.pendingCustody&&!prisoner.captured"),true);
 const prison=await captureHarness(4,true);
 assert.equal(prison.run("dark('equip',[0,captureSite,0]);state.phase=3;dark('battle',[captureSite]);performAction(shot())"),true);
 assert.equal(prison.run("botCustodyAction().args[0]"),'imprison','Corridor adds 1 to Dark weapon destiny');
 assert.equal(prison.run("performAction(botCustodyAction())&&prisoner.imprisoned&&state.dark[captureSite].includes(prisoner)"),true);
});

test('a captive needs an extra passenger seat, and removing the escort gives Light a Rally or Escape choice',async()=>{
 const {run,elements}=await captureHarness(6);
 run("dark('equip',[0,captureSite,0]);state.phase=3;dark('battle',[captureSite]);performAction(shot());performAction(botCustodyAction())");
 assert.equal(run("PremiereUnits.accepts(card('Dark:1547'),hunter,'passenger')"),true);
 assert.equal(run("PremiereUnits.accepts({...card('Dark:1547'),occupants:[1,2,3].map(()=>({card:trooper,role:'passenger'}))},hunter,'passenger')"),false);
 assert.equal(run("loseTableCard('Dark',captureSite,hunter)&&state.pendingCustody[0].side==='Light'"),true);
 run('render()');
 assert.match(elements.get('playerCustodyControls').innerHTML,/Rally/);
 assert.equal(run("dark('custody',['escape'])"),false);
 assert.equal(run("light('custody',['escape'])&&state.used.includes(prisoner)&&state.lost.includes(blaster)&&!prisoner.captured"),true);
 run(`const transport=card('Dark:1547'),second=card('Light:1593');
  second.captured=true;trooper.escortedCaptive=second;
  state.dark[captureSite]=[transport];PremiereUnits.add(transport,trooper,'passenger','Dark');`);
 assert.equal(run("loseTableCard('Dark',captureSite,transport)&&state.lost.includes(second)&&!state.pendingCustody.length"),true);
});

test('Central Core cancels the Tractor Beam when Light gains control',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(133,1);state.phase=4;
  state.locations[2]=card('Dark:669');state.locations[3]=card('Dark:675');state.locationOrder=[0,1,2,3,4,5,6];
  const beam={name:'Death Star Tractor Beam',type:'Device',side:'Dark'};
  state.locationEffects={3:[{card:beam}]};state.light[3]=[card('Light:1593')];`);
 assert.equal(run("state.locationEffects[3].length"),1);
 assert.equal(run("requestAction('move','Light',[3,0,2,'Landspeed'])"),true);
 assert.equal(run("state.locationEffects[3].length===0&&state.botLost.includes(beam)"),true);
});

test('Mos Eisley applies one bonus to the Tonnika Sisters as a combo card',async()=>{
 const {run}=await craftHarness();
 run(`const sisters=card('Dark:2613');state.locations[2]=card('Dark:2465');state.dark[2]=[sisters];battleSession={site:2};`);
 assert.equal(run("cardPowerModifier(sisters,'Dark',2)"),1);
 assert.equal(run("battleForfeitValue(sisters,'Dark')"),run('sisters.forfeit+1'));
 run("state.locationEffects={2:[{card:card('Light:2110')}]};");
 assert.equal(run("cardPowerModifier(sisters,'Dark',2)"),0);
 assert.equal(run("battleForfeitValue(sisters,'Dark')"),run('sisters.forfeit'));
});

test('Massassi Throne Room starts the Light turn only when chosen under the new rules',async()=>{
 const {run,elements}=await premiereHarness();
 run(`const decks={light:deckChoices.light.find(({deck})=>deck.theme?.id==='massassi-widerstand').deck,dark:starterDecks.dark};
  function setupLocation(id,version){
   start(7,true,false,decks,version);
   const index=startingLocationChoices(setupDecks.light).find(option=>option.card.id===id).index;
   return chooseStart(index)&&beginStartingGame();
  }`);
 assert.equal(run("setupLocation('Light:2858',4)"),true);
 assert.equal(run("state.activeSide==='Light'&&!state.botTurn&&state.hand.length===8&&state.botHand.length===8"),true);
 assert.match(elements.get('log').textContent,/Light Side beginnt/);
 assert.equal(run("requestAction('activate','Light',[1])"),true);
 assert.equal(run("setupLocation('Light:2858',3)"),true);
 assert.equal(run("state.activeSide==='Dark'&&!!state.botTurn"),true);
 assert.equal(run("setupLocation('Light:2859',4)"),true);
 assert.equal(run("state.activeSide==='Dark'&&!!state.botTurn"),true);
});

test('Jungle bonuses require an active character alone at the site',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(124,1);
  const rebel=card('Light:2052'),trooper=card('Dark:2355'),droid=card('Light:2'),speeder=card('Light:2307');
  state.locations[2]=card('Light:2855');state.light[2]=[rebel,speeder];state.dark[2]=[trooper];`);
 assert.equal(run("battleTotals(2).lightPower===rebel.power+2"),true);
 assert.equal(run("battleTotals(2).darkPower===trooper.power"),true);
 run("PremiereUnits.add(speeder,droid,'passenger','Light');speeder.enclosed=true");
 assert.equal(run("battleTotals(2).lightPower===rebel.power"),true);
 run("droid.inactive=true;state.phase=3");
 assert.equal(run("requestAction('battle','Light',[2])&&battleImmunity('Light',rebel)===Infinity"),true);
 run("battleSession=null;state.locations[2]=card('Dark:2854')");
 assert.equal(run("battleTotals(2).darkPower===trooper.power+2"),true);
 assert.equal(run("battleTotals(2).lightPower===rebel.power"),true);
});

test('starships react to the printed side of Dantooine with an affordable legal route',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(125,1);
  state.locations[0]=card('Dark:607');state.dark[6]=[scout];state.light[0]=[card('Light:2907')];
  state.phase=1;const drain={kind:'drain',side:'Light',site:0};`);
 assert.equal(run("reactOptions('Dark',drain).some(choice=>choice.card===scout&&choice.cost===1)"),true);
 run("state.locationEffects={0:[{card:card('Light:2110')}]};");
 assert.equal(run("reactOptions('Dark',drain).length"),0);
});

test('a character moving from Mos Eisley to the Cantina cannot participate in a second drain that turn',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(126,1);
  const luke=card('Light:1593'),rebel=card('Light:2052');
  state.locations[2]=card('Light:2466');state.light[2]=[luke];state.light[4]=[rebel];
  state.phase=1;state.botHand=[];state.botDeck=forcePile();`);
 assert.equal(run("requestAction('drain','Light',[2])"),true);
 assert.equal(run("state.drainedCardsThisTurn.includes(luke)&&forceDrainValue('Light',4)===2"),true);
 assert.equal(run("requestAction('move','Light',[2,0,4,'Mos Eisley'])"),true);
 assert.equal(run("confirmedPresence('Light',4)&&forceDrainValue('Light',4)===null"),true);
 assert.equal(run("requestAction('drain','Light',[4])"),false);
 run("PremiereGame.resetTurn(state,'Light');state.phase=1");
 assert.equal(run("forceDrainValue('Light',4)"),2);
});

test('Vader and Tarkin apply their printed pilot bonuses',async()=>{
 const {run}=await craftHarness();
 run(`const vader=card('Dark:634'),tarkin=card('Dark:1061'),custom=card('Dark:2700'),destroyer=card('Dark:1291');
  const customPower=custom.power,customManeuver=custom.maneuver;PremiereUnits.add(custom,vader,'pilot','Dark');
  PremiereUnits.add(destroyer,tarkin,'pilot','Dark');`);
 assert.equal(run('craftStats(custom,1).power'),run('customPower+4'));
 assert.equal(run('craftStats(custom,1).maneuver'),run('customManeuver+3'));
 assert.equal(run('craftStats(destroyer,1).power'),run('destroyer.power+2'));
 run("custom.occupants=[];PremiereUnits.add(destroyer,vader,'pilot','Dark')");
 assert.equal(run('craftStats(custom,1).powered'),false);
 assert.equal(run('craftStats(destroyer,1).power'),run('destroyer.power+5'));
});

test('registered free deployment requires the qualifying ally or farm',async()=>{
 const {run}=await craftHarness();
 run(`const rebel=card('Light:2052'),owen=card('Light:1883');
  state.locations[3]=card('Light:2462');state.hand=[rebel,owen];state.force=[];
  state.light[2]=[{type:'Character',subType:'Rebel',ability:2}];`);
 assert.equal(run('boardDeployCost(rebel,dock,"Light")'),null);
 run('state.light[2][0].ability=3');
 assert.equal(run('boardDeployCost(rebel,dock,"Light")'),0);
 assert.equal(run('boardDeployCost(owen,state.locations[3],"Light")'),0);
 assert.equal(run('boardDeployCost(owen,dock,"Light")'),null);
 assert.equal(run("requestAction('deploy','Light',[0,2]).cost"),0);
 run("state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[card('Dark:2355')];state.botForce=[];state.dark[2]=[card('Dark:1061')]");
 assert.equal(run("requestAction('deploy','Dark',[0,2]).cost"),0);
 assert.equal(run('state.used.length+state.botUsed.length'),0);
});

test('registered devices charge their costs, validate their mounts and apply continuous stats',async()=>{
 const {run,elements}=await craftHarness();
 run(`const belt=card('Light:2435'),rebel=card('Light:2052'),droid=card('Light:2');
  state.hand=[belt,card('Light:997')];state.light[2]=[rebel,droid];state.light[6]=[ship];state.light[0]=[card('Light:2907')];
  state.force=[];const baseStats=craftStats(ship,6);`);
 assert.equal(run("requestAction('deployDevice','Light',[0,2,0])"),false);
 run('state.force=forcePile();select(0)');
 assert.match(elements.get('board').innerHTML,/Rebel Trooper ausrüsten \(1 Force\)/);
 assert.equal(run("requestAction('deployDevice','Light',[0,2,1])"),false);
 assert.equal(run("requestAction('deployDevice','Light',[0,2,0])"),true);
 assert.equal(run("requestAction('deployDevice','Light',[0,0,0])"),false);
 assert.equal(run("requestAction('deployDevice','Light',[0,6,0])"),true);
 assert.ok(run('state.used.length===1&&craftStats(ship,6).power===baseStats.power+1&&craftStats(ship,6).hyperspeed===baseStats.hyperspeed+1&&craftStats(ship,6).maneuver===baseStats.maneuver+1'));
 run("rebel.attachments.push({...belt});battleSession={site:2}");
 assert.equal(run("cardPowerModifier(rebel,'Light',2)"),2);
 assert.equal(run("battleForfeitValue(rebel,'Light')"),run('rebel.forfeit+2'));
 run(`battleSession=null;state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[card('Dark:2360')];
  state.locations[3]=card('Dark:675');state.dark[3]=[card('Dark:2355')];`);
 assert.equal(run("requestAction('deployDevice','Dark',[0,3,0])"),true);
 assert.equal(run("cardPowerModifier(state.dark[3][0],'Dark',3)"),2);
 assert.equal(run("cardPowerModifier(state.dark[3][0],'Dark',2)"),1);
});

test('card rule registry returns source, active text and test references across the full catalog',async()=>{
 const {run}=await premiereHarness();
 assert.equal(run('catalog.length'),324);
 assert.ok(run(`catalog.every(card=>{
  const entry=PremiereCardRules.entry(card);
  return entry.cardId===card.id&&entry.source===(card.images.slip??card.images.print)&&entry.text===card.gametext&&
   entry.effects.every(rule=>rule.test&&rule.event&&rule.targets&&rule.expires&&Number.isInteger(rule.cost));
 })`));
 assert.ok(run("effectCoverage().complete.some(card=>card.id==='Light:2052')"));
 assert.ok(run("effectCoverage().unimplemented.some(card=>card.id==='Dark:1480')"));
});

test('Restraining Bolt blocks movement and active text, and Caller steals from the other side',async()=>{
 const {run,elements}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(97,8);
  const rebel=card('Light:2052'),tooex=card('Light:2'),power=card('Dark:816'),droid=card('Dark:2001');
  const bolt=card('Light:2100'),caller=card('Light:348');
  state.light[2]=[rebel,tooex];state.dark[2]=[power,droid];state.hand=[caller,bolt];state.force=[];`);
 assert.equal(run("cardPowerModifier(droid,'Dark',2)"),1);
 assert.equal(run("requestAction('deployDevice','Light',[0,2,1])"),false);
 assert.equal(run("requestAction('deployDevice','Light',[0,2,0])"),true);
 run('select(0)');
 assert.match(elements.get('board').innerHTML,/Restraining Bolt an .*Eegee-Six.*Dark Side/);
 assert.equal(run("requestAction('deployBolt','Light',[0,3,1])"),false);
 assert.equal(run("performAction(legalActions(state,'Light').find(action=>action.kind==='deployBolt'&&action.host===power))"),true);
 assert.equal(run("state.used.length===0&&cardPowerModifier(droid,'Dark',2)===0"),true);
 assert.equal(run("travelOptions(power,'Dark',2,3).length"),0);
 assert.equal(run("requestAction('deviceAction','Light',['stealDroid',1])"),false);
 assert.equal(run("performAction(legalActions(state,'Light').find(action=>action.kind==='deviceAction'&&action.target.card===droid))"),true);
 assert.equal(run("!PremiereUnits.restrainingBolt(power)&&PremiereUnits.restrainingBolt(droid)===bolt"),true);
 assert.equal(run("cardPowerModifier(droid,'Dark',2)"),1);
 run("state.phase=1;presentGame()");
 assert.match(elements.get('board').innerHTML,/Caller · .*übernehmen/);
 assert.equal(run("performAction(legalActions(state,'Light').find(action=>action.kind==='deviceAction'))"),true);
 assert.equal(run("state.light[2].includes(droid)&&!state.dark[2].includes(droid)&&state.hand[0]===bolt"),true);
 assert.equal(run("droid.side==='Dark'&&droid.controller==='Light'&&!PremiereUnits.textSuppressed(droid)"),true);
 assert.equal(run("loseTableCard('Light',2,droid)&&state.botLost.includes(droid)&&!state.lost.includes(droid)"),true);
});

test('Droid Detector bars droid deploy immediately and removes present droids only from later turns',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(98,8);
  state.locations[2]=card('Dark:673');const droid=card('Light:2'),other=card('Dark:816');
  state.light[2]=[droid,card('Light:1593')];state.dark[2]=[other];
  state.activeSide='Dark';state.botTurn={steps:[],index:0};state.botHand=[card('Dark:777')];state.hand=[card('Light:95')];`);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,3])"),false);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,2])"),true);
 assert.equal(run("!PremiereGame.responseWindow(state.game)&&!legalActions(state,'Light').some(action=>action.kind==='alterLocationEffect')"),true);
 assert.equal(run("characterLocationAllowed(droid,state.locations[2])"),false);
 assert.equal(run("characterLocationAllowed(droid,dunes)"),true);
 assert.equal(run("characterLocationAllowed(state.light[2][1],state.locations[2])"),true);
 run("endTurn('Dark')");
 assert.equal(run("state.light[2].includes(droid)&&state.dark[2].includes(other)"),true);
 run("endTurn('Light')");
 assert.equal(run("state.lost.includes(droid)&&state.botLost.includes(other)&&state.light[2][0].id==='Light:1593'"),true);
});

test('Our Most Desperate Hour reaches Alderaan aboard a ship and retrieves Force by character ability',async()=>{
 const {run,elements}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(102,8);
  const han=card('Light:1098'),luke=card('Light:1593'),obi=card('Light:1803'),falcon=card('Light:1677');
  const mission=card('Light:1870');
  state.light[2]=[han];state.light[3]=[luke,obi];state.dark[2]=[card('Dark:634')];
  state.hand=[mission];state.force=forcePile();
  state.lost=Array.from({length:6},(_,i)=>({name:'Lost '+i}));`);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,6,0])"),false);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,5,0])"),true);
 assert.match(elements.get('log').textContent,/Alderaan.*Han Solo/);
 run("state.light[2].splice(0,1);PremiereUnits.add(falcon,han,'pilot','Light');state.light[6]=[falcon];state.phase=4");
 assert.equal(run("requestAction('move','Light',[6,0,5,'Hyperspeed'])"),true);
 assert.equal(run("state.light[5][0]===falcon&&state.locationEffects[5].length===0&&state.lost.includes(mission)"),true);
 assert.equal(run("state.used.filter(card=>card.name.startsWith('Lost')).map(card=>card.name).join(',')"),'Lost 5,Lost 4,Lost 3,Lost 2,Lost 1');
});

test('Nightfall and Sunsdown enable free Spy deployment and Power Destiny limited to related sites',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(109,9);
  const spy=card('Dark:1011'),nightfall=card('Light:1778'),sunsdown=card('Dark:2373');
  state.locations[4]=card('Dark:673');state.hand=[nightfall];state.botHand=[sunsdown];
  state.light[2]=[card('Light:2052')];state.dark[2]=[card('Dark:2355')];`);
 const column=slot=>run(`renderPlaymatColumn(state.locations[${slot}],${slot})`);
 assert.doesNotMatch(column(2),/location-night/);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,2])"),false);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,6])"),true);
 assert.match(column(2),/location-night">Nacht aktiv · Nightfall</);
 assert.doesNotMatch(column(4),/location-night/);
 assert.doesNotMatch(column(6),/location-night/);
 assert.equal(run("PremiereLocations.conditions(state,2,'Dark').night"),true);
 assert.equal(run("PremiereLocations.conditions(state,4,'Dark').night"),false);
 assert.equal(run("characterDeployCost(spy,dock,'Dark')"),0);
 assert.equal(run("characterDeployCost(spy,state.locations[4],'Dark')"),run('spy.deploy'));
 run("state.activeSide='Dark';state.botTurn={steps:[],index:0}");
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,6])"),true);
 assert.match(column(2),/location-night">Nacht aktiv · Nightfall \+ Sunsdown</);
 run(`state.phase=3;state.activeSide='Light';state.botTurn=null;
  state.deck=[{name:'Light Life'},{name:'L power 1',destiny:2},{name:'L power 2',destiny:3}];
  state.botDeck=[{name:'Dark Life'},{name:'D power 1',destiny:4},{name:'D power 2',destiny:5}];`);
 assert.equal(run("requestAction('battle','Light',[2])&&requestAction('skipDestiny','Light')&&requestAction('skipDestiny','Dark')"),true);
 assert.equal(run("battleSession.powerDestiny.Light"),5);
 assert.equal(run("battleSession.powerDestiny.Dark"),9);
 assert.equal(run("battleSession.damage.debt.Light.attrition+battleSession.damage.debt.Dark.attrition"),0);
 run('cancelLocationEffect(6,PremiereLocations.effectsAt(state,6)[0])');
 assert.match(column(2),/location-night">Nacht aktiv · Sunsdown</);
 run('cancelLocationEffect(6,PremiereLocations.effectsAt(state,6)[0])');
 assert.doesNotMatch(column(2),/location-night/);
});

test('registered location effects add icons once and can be canceled by Alter',async()=>{
 const {run,elements}=await craftHarness();
 run(`const presence=()=>card('Dark:1939');setupDecks=null;state.game=PremiereGame.actionState(95,4);
  state.activeSide='Dark';state.botHand=[presence(),presence(),presence()];state.botTurn={steps:[],index:0};
  state.light[2]=[card('Light:1593')];state.hand=[];
  state.deck=[{name:'Low destiny',destiny:1},{name:'Low destiny',destiny:1}];`);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,99])"),false);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,2])"),true);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,2])"),true);
 assert.equal(run("requestAction('deployLocationEffect','Dark',[0,3])"),false);
 assert.equal(run("PremiereLocations.icons(state,2,'Dark')+PremiereLocations.icons(state,2,'Light')"),4);
 run("state.hand=[card('Light:95'),card('Light:95')];render()");
 assert.match(elements.get('controlPanel').innerHTML,/Presence Of The Force.*aufheben/);
 for(const icons of [2,1]){
  assert.equal(run("requestAction('alterLocationEffect','Light',[0,2,0])&&requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
  assert.equal(run("PremiereLocations.icons(state,2,'Light')"),icons);
 }
 assert.equal(run("state.botLost.filter(card=>card.id==='Dark:1939').length"),2);
});

test('Death Star Plans tracks the chosen droid, rejects the docking bay and retrieves once at Yavin 4',async()=>{
 const {run,elements}=await craftHarness();
 run(`const plans=card('Light:664'),droid=card('Light:2');setupDecks=null;state.game=PremiereGame.actionState(111,0);
  state.locations=[card('Dark:678'),card('Dark:675'),card('Light:2853'),dock];state.locationOrder=[0,1,2,3];
  state.light=[[],[],[],[droid]];state.dark=[[],[],[],[]];state.hand=[plans];
  state.deck=[{name:'Ordinary reserve'},{name:'First',destiny:1},{name:'Second',destiny:1},{name:'Third',destiny:1}];
  state.lost=[{name:'Lost A'},{name:'Lost B'},{name:'Lost C'}];state.force=forcePile().concat(forcePile());`);
 run("inspectCard('Light',0,'hand',0)");
 assert.match(elements.get('cardInspectorBody').innerHTML,/Level 4 Military Corridor.*Tooex.*als Ziel/);
 run('closeCard();select(0)');
 assert.match(run('renderPlaymatColumn(state.locations[0],0)'),/Tooex.*als Ziel/);
 assert.doesNotMatch(run('renderPlaymatColumn(state.locations[1],1)'),/Tooex.*als Ziel/);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,1,0])"),false);
 assert.equal(run("requestAction('deployLocationEffect','Light',[0,0,0])"),true);
 assert.equal(run('state.locationEffects[0][0].target===droid'),true);
 run('state.phase=4');
 for(const [from,to,kind] of [[3,1,'Docking-Bay-Transit'],[1,0,'Landspeed'],[0,1,'Landspeed'],[1,2,'Docking-Bay-Transit']]){
  run('state.movedThisTurn=[]');
  assert.ok(run(`requestAction('move','Light',[${from},0,${to},'${kind}'])`));
  if(to===0)assert.ok(run('state.locationEffects[0][0].plansCollected'));
 }
 assert.equal(run('state.locationEffects[0].length'),0);
 assert.equal(run('state.lost.length===1&&state.lost[0]===plans&&state.deck.length===1'),true);
 assert.ok(run("state.used.some(card=>card.name==='Lost A')&&state.used.some(card=>card.name==='Lost C')"));
});

async function kesselHarness(pilotId='Light:305'){
 const fixture=await craftHarness();
 fixture.run(`const runner=card('${pilotId}'),falcon=card('Light:1677'),mission=card('Light:1429');
  setupDecks=null;state.game=PremiereGame.actionState(112,4);state.hand=[mission];
  state.light[0]=[falcon];PremiereUnits.add(falcon,runner,'pilot','Light');
  const runOffer=()=>legalActions(state,'Light').find(action=>action.kind==='deployLocationEffect');`);
 return fixture;
}

test('Kessel Run tracks BoShek and fixes retrieval at the original Parsec distance',async()=>{
 const {run,elements}=await kesselHarness();
 assert.ok(run("runOffer().target===runner&&runOffer().distance===3"));
 run("inspectCard('Light',0,'hand',0)");
 assert.match(elements.get('cardInspectorBody').innerHTML,/BoShek.*Dantooine.*Kessel.*3 Force zurückholen/);
 assert.ok(run('performAction(runOffer())'));
 run("state.phase=4;state.botDeck=[{name:'Safe destiny',destiny:2}];state.lost=forcePile();");
 assert.ok(run("requestAction('move','Light',[0,0,1,'Hyperspeed'])"));
 assert.ok(run("state.locationEffects[1][0].reachedKessel&&state.botUsed.at(-1).name==='Safe destiny'"));
 run('state.locations[0]={...dantooine,parsec:3};state.movedThisTurn=[]');
 assert.ok(run("requestAction('move','Light',[1,0,0,'Hyperspeed'])"));
 assert.ok(run('state.locationEffects[1].length===0&&state.lost.length===3&&state.lost.at(-1)===mission&&state.light[0][0]===falcon'));
});

test('Kessel Run tracks target legality, control, a zero draw and an empty Reserve Deck',async()=>{
 const blocked=await kesselHarness('Light:1098');
 const {run}=blocked;
 run('state.dark[1]=[tie]');
 assert.equal(run('runOffer()'),undefined);
 run('state.dark[1]=[]');
 assert.ok(run('performAction(runOffer())'));
 run("state.phase=4;state.activeSide='Dark';state.botTurn={steps:[],index:0};state.dark[6]=[scout]");
 assert.ok(run("requestAction('move','Dark',[6,0,1,'Hyperspeed'])"));
 assert.ok(run('state.locationEffects[1].length===0&&state.lost.includes(mission)'));

 const invalid=await kesselHarness('Light:239');
 assert.equal(invalid.run('runOffer()'),undefined);
 for(const succeeds of [false,true]){
  const attempt=await kesselHarness();
  assert.ok(attempt.run('performAction(runOffer())'));
  attempt.run(`state.phase=4;state.botDeck=${succeeds?'[]':"[{name:'Zero',destiny:0}]"}`);
  assert.ok(attempt.run("requestAction('move','Light',[0,0,1,'Hyperspeed'])"));
  assert.equal(attempt.run('state.light[1].includes(falcon)'),succeeds);
  assert.equal(attempt.run('state.lost.includes(mission)'),!succeeds);
 }
});

test('registered character stat rules respect same site, physical presence and faction',async()=>{
 const {run}=await craftHarness();
 run(`const beru=card('Light:221'),owen=card('Light:1883'),dodonna=card('Light:1021'),leia=card('Light:1495'),rebel=card('Light:2052'),
  bast=card('Dark:406'),yularen=card('Dark:478'),motti=card('Dark:60'),fivedesix=card('Dark:12'),tagge=card('Dark:1027'),
  dsTrooper=card('Dark:668'),dathcha=card('Dark:643');state.locations[3]=card('Light:2853');state.locations[4]=card('Dark:675');
  state.light[2]=[beru,owen];state.light[3]=[dodonna,rebel];state.light[4]=[leia,{...rebel}];
  state.dark[2]=[bast,card('Dark:1061'),fivedesix,motti,tagge,dsTrooper,card('Dark:2355'),dathcha];state.dark[3]=[yularen];
  battleSession={site:2};`);
 assert.equal(run("cardPowerModifier(owen,'Light',2)"),2);
 assert.equal(run("battleForfeitValue(beru,'Light')-beru.forfeit"),2);
 assert.equal(run("cardPowerModifier(bast,'Dark',2)"),1);
 assert.equal(run("cardPowerModifier(fivedesix,'Dark',2)"),1);
 assert.equal(run("cardPowerModifier(yularen,'Dark',3)"),1);
 assert.equal(run("battleForfeitValue(tagge,'Dark')-tagge.forfeit"),2);
 assert.equal(run("cardPowerModifier(dsTrooper,'Dark',2)"),-1);
 assert.equal(run("cardPowerModifier(dathcha,'Dark',2)"),0);
 assert.equal(run("cardPowerModifier(dathcha,'Dark',4)"),2);
 assert.equal(run("cardPowerModifier(rebel,'Light',3)"),1);
 assert.equal(run("cardPowerModifier(dodonna,'Light',3)"),0);
 assert.equal(run("cardPowerModifier(state.light[4][1],'Light',4)"),1);
 run('state.light[2].shift();state.dark[2].splice(1,1)');
 assert.equal(run("cardPowerModifier(owen,'Light',2)"),0);
 assert.equal(run("cardPowerModifier(bast,'Dark',2)"),0);
});

test('Tusken Raiders count present non-unique copies and Alderaan reduces opposing destiny',async()=>{
 const {run}=await craftHarness();
 run("state.dark[2]=[tusken];state.locations[0]=alderaan");
 assert.equal(run('battleTotals(2).darkPower'),1);
 run("state.dark[2].push(card('Dark:2648'),card('Dark:2648'),card('Dark:2648'))");
 assert.equal(run('battleTotals(2).darkPower'),10);
 assert.equal(run("alderaanBattleDestinyPenalty('Dark',0)"),1);
 assert.equal(run("alderaanBattleDestinyPenalty('Light',0)"),0);
 run("state.locationEffects={0:[{card:card('Light:2110')}]} ");
 assert.equal(run("alderaanBattleDestinyPenalty('Dark',0)"),0);
 assert.equal(run("alderaanBattleDestinyPenalty('Light',0)"),1);
});

test('Comlink equips a character and opens a paid Deploy-React from an adjacent site',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(113,1);state.activeSide='Dark';
  const carrier=card('Dark:1027'),comlink=card('Dark:489'),reinforcement=card('Dark:2355');
  state.dark[2]=[carrier];state.dark[6]=[tie];state.botHand=[comlink,reinforcement,card('Dark:2355')];
  state.locationOrder=[2,3,4,6,5,1,0];state.light[3]=[card('Light:2052')];`);
 assert.equal(run("requestAction('deployDevice','Dark',[0,6,0])"),false);
 assert.equal(run("requestAction('deployDevice','Dark',[0,2,0])"),true);
 assert.ok(run('carrier.attachments[0]===comlink&&state.botForce.length===4'));
 run("state.phase=1;state.activeSide='Light'");
 assert.ok(run("requestAction('drain','Light',[3])&&PremiereGame.responseWindow(state.game).kind==='drain'"));
 assert.ok(run("requestAction('reactDeploy','Dark',[0,-1])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"));
 assert.deepEqual(JSON.parse(run('JSON.stringify({deployed:state.dark[3].includes(reinforcement),loss:state.pendingForceLoss??null,force:state.botForce.length})')),
  {deployed:true,loss:null,force:3});
 assert.equal(run("reactDeployOptions('Dark',{kind:'drain',side:'Light',site:3}).length"),0);
 run("PremiereGame.resetTurn(state,'Light')");
 assert.ok(run("reactDeployOptions('Dark',{kind:'drain',side:'Light',site:3}).length>0"));
});

test('Alter restores a rotated location and can also cancel a pending Revolution',async()=>{
 const {run}=await craftHarness();
 run(`setupDecks=null;state.game=PremiereGame.actionState(114,2);const revolution=card('Light:2110');
  state.hand=[revolution];state.botHand=[];state.locations[3]={...dunes,icons:{light:1,dark:3}};
  state.dark[3]=[card('Dark:1061')];state.botDeck=[{name:'Low destiny',destiny:1}];`);
 assert.ok(run("requestAction('revolution','Light',[0,3])&&PremiereLocations.icons(state,3,'Light')===3"));
 run("state.botHand=[card('Dark:94')]");
 assert.ok(run("requestAction('alterLocationEffect','Dark',[0,3,0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"));
 assert.ok(run("PremiereLocations.icons(state,3,'Light')===1&&state.lost.includes(revolution)"));
 run("state.hand=[card('Light:2110')];state.force=forcePile();state.botHand=[card('Dark:94')];state.botDeck=[{name:'Low destiny',destiny:1}]");
 assert.ok(run("requestAction('revolution','Light',[0,3])&&PremiereGame.responseWindow(state.game).kind==='locationEffect'"));
 assert.ok(run("requestAction('interruptResponse','Dark',[0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"));
 assert.ok(run("PremiereLocations.icons(state,3,'Light')===1&&state.force.length===2&&state.game.responses.length===0"));
});

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
 assert.match(elements.get('board').innerHTML,/id="movementTrigger5"/);
 assert.doesNotMatch(elements.get('board').innerHTML,/Hyperspeed, 1 Force|Hyperspeed \(1 Force\)/);
 run('openMovement(5)');
 assert.match(elements.get('movementOptions').innerHTML,/Tatooine · Hyperspeed \(1 Force\)/);
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
 assert.match(html,/id="forceControls"[^>]*><\/div>\s*<section[^>]+id="drainLossControls"[^>]*><\/section>\s*<figure[^>]+id="pilesLight"/);
 assert.match(html,/id="phaseDisplayLight"[^>]*>\s*<button id="step"[^>]*>[^<]*<\/button>\s*<p id="turnStatusLight"/);
 assert.match(html,/class="table-sidebar table-bot"[\s\S]*id="botHistory"[\s\S]*class="table-sidebar table-info"[\s\S]*id="phaseHelpText"[\s\S]*id="log"/);
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
 assert.equal(elements.get('forceControls').hidden,true);
 assertPhase('Dark','Aktivieren');
 assert.match(elements.get('phaseHelpText').textContent,/Aktiviere/);
 run('botNextStep();botNextStep()');
 assertPhase('Dark','Kontrolle');
 assert.match(elements.get('phaseHelpText').textContent,/Kontrolle/);
 assert.match(elements.get('botHistory').textContent,/Control/);
 assert.match(elements.get('log').textContent,/Control/);
 run('for(let i=0;i<5;i++)botNextStep()');
 assertPhase('Light','Aktivieren');
 assert.equal(elements.get('forceControls').hidden,false);
 assert.match(elements.get('forceControls').innerHTML,/Force aktivieren/);
 run("requestAction('activate','Light',[1]);requestAction('advance','Light')");
 assertPhase('Light','Kontrolle');
 run("state.gameWinner='Light';render()");
 assertPhase(null);
 assert.equal(elements.get('gameMessage').hidden,false);
 assert.match(elements.get('instruction').textContent,/Light Side gewinnt/);
 run('start(1)');
 assert.equal(elements.get('gameTable').hidden,true);
});

test('both playmat pile diagrams show their own counts and follow card movement',async()=>{
 const {run,elements}=await premiereHarness();
 const diagram=side=>elements.get('piles'+side).innerHTML;
 const assertPiles=(side,reserve,force,used,lost,life)=>{
  const markup=diagram(side);
  for(const [label,count] of [['Reserve Deck',reserve],['Force Pile',force],['Used Pile',used],['Lost Pile',lost],['Life Force',life]]){
   assert.ok(markup.includes(label+' <strong>'+count+'</strong>'),label+' count for '+side);
  }
 };
 run('start(1);chooseStart(startingLocationChoices(setupDecks.light)[1].index);beginStartingGame()');
 assertPiles('Dark',51,0,0,0,51);
 assertPiles('Light',51,0,0,0,51);
 assert.match(diagram('Dark'),/cards\/darkcardback\.png/);
 assert.match(diagram('Light'),/cards\/lightcardback\.png/);
 assert.equal((diagram('Light').match(/class="side-card-back"/g)||[]).length,1);
 assert.match(diagram('Light'),/Am Zugende unter das Reserve Deck.*Reserve Deck <strong.*Aktivieren.*→.*Force Pile.*Ausgeben.*→.*Used Pile.*↓.*Auf die Hand ziehen/);

 const activation=run("forceFromLocations('Dark').count");
 run('botNextStep()');
 assertPiles('Dark',51-activation,activation,0,0,51);
 assertPiles('Light',51,0,0,0,51);
 run("for(let i=0;i<6;i++)botNextStep();requestAction('activate','Light',[1])");
 assertPiles('Light',50,1,0,0,51);
 run('PremiereGame.moveTop(state.force,state.used);render()');
 assertPiles('Light',50,0,1,0,51);
 run('recirculateBoth();render()');
 assertPiles('Light',51,0,0,0,51);
 run('PremiereGame.moveTop(state.deck,state.lost);render()');
 assertPiles('Light',50,0,0,1,50);
});

test('lost piles reveal only their top card and keep covered bot hands face down',async()=>{
 const {run,elements}=await premiereHarness();
 run(`start(1);chooseStart(startingLocationChoices(setupDecks.light)[1].index);beginStartingGame();
  el('showBotHand').checked=false;
  state.botHand=[{name:'Hidden Bot Card'}];
  state.deck.push({name:'Latest Loss',type:'Character'},{name:'Earlier Loss',type:'Character'});
  PremiereGame.loseForce(state,'Light','deck');
  PremiereGame.loseForce(state,'Light','deck');
  render()`);
 const ownPile=elements.get('pilesLight');
 assert.match(ownPile.innerHTML,/Lost Pile <strong>2<\/strong>/);
 assert.match(ownPile.innerHTML,/Latest Loss/);
 assert.doesNotMatch(ownPile.innerHTML,/Earlier Loss/);
 assert.match(elements.get('botHand').innerHTML,/darkcardback\.png/);
 assert.doesNotMatch(elements.get('botHand').innerHTML,/Hidden Bot Card/);
 run("inspectLostTop('Light')");
 assert.equal(elements.get('cardInspectorTitle').textContent,'Latest Loss');
 assert.equal(elements.get('cardInspector').open,true);
 run("closeCard();PremiereGame.retrieveForce(state,'Light',1);render()");
 assert.match(ownPile.innerHTML,/Earlier Loss/);
 assert.doesNotMatch(ownPile.innerHTML,/Latest Loss/);
});

async function eyesInTheDarkHarness(){
 const fixture=await premiereHarness();
 fixture.run(`start(1);chooseStart(startingLocationChoices(setupDecks.light)[1].index);
  const copies=setupDecks.light.cards.filter(isLostPileEffect).length;
  beginStartingGame();
  for(let i=0;i<7;i++)botNextStep();
  state.phase=2;
  const eyes=catalog.find(card=>card.side==='Light'&&isLostPileEffect(card));
  state.hand=[eyes];state.botHand=[];`);
 return fixture;
}

test('Eyes In The Dark covers a chosen pile and conceals all Life Force losses while allowing retrieval',async()=>{
 const {run,elements}=await eyesInTheDarkHarness();
 assert.equal(run('copies'),1);
 assert.deepEqual(JSON.parse(run(`JSON.stringify(legalActions(state,'Light').filter(action=>
  action.kind==='deployLostPileEffect').map(action=>action.args))`)),[[0,'Light'],[0,'Dark']]);
 assert.equal(run("state.phase=1;requestAction('deployLostPileEffect','Light',[0,'Light'])"),false);
 assert.equal(run("state.phase=2;requestAction('deployLostPileEffect','Light',[0,'Unknown'])"),false);
 run("state.lost.push({name:'Previously Visible'});inspectLostTop('Light')");
 assert.equal(elements.get('cardInspector').open,true);
 assert.equal(run("requestAction('deployLostPileEffect','Light',[0,'Light'])"),true);
 assert.equal(elements.get('cardInspector').open,false);
 run("inspectLostTop('Light')");
 assert.equal(elements.get('cardInspector').open,false);
 assert.match(elements.get('pilesLight').innerHTML,/Lost Pile verdeckt.*Eyes In The Dark/);
 assert.doesNotMatch(elements.get('pilesLight').innerHTML,/Previously Visible|lost-top-card/);
 assert.doesNotMatch(elements.get('pilesDark').innerHTML,/Lost Pile verdeckt/);

 run(`for(const zone of ['deck','force','used']){
  PremiereGame.zones(state,'Light')[zone].push({name:'Secret '+zone});
  beginForceLoss('Light',1,{reason:'drain',from:zone});
  if(!requestAction('loseForce','Light',[zone]))throw new Error('Loss did not resolve');
 }`);
 assert.equal(run('state.lost.length'),4);
 for(const viewer of ['Light','Dark']){
  assert.doesNotMatch(run(`JSON.stringify(PremiereGame.playerView(state,'${viewer}'))`),/Secret|Previously Visible/);
 }
 assert.doesNotMatch(elements.get('log').textContent,/Secret/);
 assert.match(elements.get('log').textContent,/eine verdeckte Karte/);
 run(`state.hand=[{name:'Public Hand Loss'}];
  beginForceLoss('Light',1,{reason:'drain',from:'hand'});
  requestAction('loseForce','Light',['hand',0]);
  const unit={name:'Public Table Loss',type:'Character'};
  state.light[0].push(unit);loseTableCard('Light',0,unit);render()`);
 assert.match(elements.get('log').textContent,/Public Hand Loss/);
 assert.match(elements.get('log').textContent,/Public Table Loss/);
 assert.doesNotMatch(elements.get('pilesLight').innerHTML,/Public Hand Loss|Public Table Loss/);

 run(`const luke=catalog.find(card=>locationTitle(card)==='luke skywalker');
  state.lost.push(luke);state.hand=[catalog.find(card=>card.id==='Light:1600')];
  state.force.push({name:'Force Payment'});render()`);
 assert.equal(run("requestAction('retrieve','Light',[0,state.lost.indexOf(luke)])"),true);
 assert.equal(run('state.used.includes(luke)&&PremiereGame.lostPileFaceDown(state,\'Light\')'),true);
 assert.match(elements.get('log').textContent,/Luke Skywalker/);
});

test('Alter can uncover a pile after Eyes In The Dark is on the table',async()=>{
 const {run,elements}=await eyesInTheDarkHarness();
 run("state.botLost.push({name:'Visible Again'});state.dark[0].push({name:'Imperial',type:'Character',ability:4})");
 assert.equal(run("requestAction('deployLostPileEffect','Light',[0,'Dark'])"),true);
 assert.match(elements.get('pilesDark').innerHTML,/Lost Pile verdeckt/);
 assert.doesNotMatch(elements.get('pilesDark').innerHTML,/Visible Again/);
 run("state.botHand=[catalog.find(card=>card.id==='Dark:94')];state.botDeck.push({name:'Destiny',destiny:1})");
 assert.equal(run("requestAction('alterLostPileEffect','Dark',[0,0])"),true);
 assert.match(elements.get('controlPanel').innerHTML,/Antwortfenster · Alter/);
 assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
 assert.match(elements.get('pilesDark').innerHTML,/Visible Again/);
 assert.doesNotMatch(elements.get('pilesDark').innerHTML,/Lost Pile verdeckt/);
 assert.equal(run('state.lost.includes(eyes)&&state.lostPileEffects.length===0'),true);
});

test('a Light Effect in hand shows legal targets in the popup and plays through the normal action path',async()=>{
 const {run,elements}=await eyesInTheDarkHarness();
 run("state.phase=1;inspectCard('Light',0,'hand')");
 const body=elements.get('cardInspectorBody');
 assert.match(body.innerHTML,/In deiner Ausspielen-Phase/);
 assert.doesNotMatch(body.innerHTML,/Side Lost Pile verdecken/);
 run("state.phase=2;inspectCard('Light',0,'hand')");
 assert.match(body.innerHTML,/Light Side Lost Pile verdecken \(0 Force\).*Dark Side Lost Pile verdecken \(0 Force\)/);
 assert.equal(elements.get('selectInspectorCard').hidden,true);
 run("playInspectorEffect(legalActions(state,'Light').find(action=>action.kind==='deployLostPileEffect'&&action.target==='Dark'))");
 assert.equal(elements.get('cardInspector').open,false);
 assert.equal(run("state.hand.length===0&&PremiereGame.lostPileFaceDown(state,'Dark')"),true);
});

test('an unsupported Effect or an unaffordable Revolution shows why the card cannot be played',async()=>{
 const {run,elements}=await eyesInTheDarkHarness();
 run(`state.hand=[catalog.find(card=>card.id==='Light:2110'),{id:'test-effect',type:'Effect',name:'Untested'}];
  state.force=[{name:'Force'}];inspectCard('Light',0,'hand');`);
 const body=elements.get('cardInspectorBody');
 assert.match(body.innerHTML,/Revolution braucht 3 Force\. Du hast 1/);
 run("inspectCard('Light',1,'hand')");
 assert.match(body.innerHTML,/Effect ist in V2 noch nicht spielbar/);
 run("state.force.push({name:'Force'},{name:'Force'});inspectCard('Light',0,'hand')");
 assert.match(body.innerHTML,/Force-Icons und Spieltext vertauschen \(3 Force\)/);
});

test('Alter must draw below the highest ability to stop Eyes In The Dark from deploying',async()=>{
 for(const destiny of [1,4]){
  const {run,elements}=await eyesInTheDarkHarness();
  run(`state.botHand=[catalog.find(card=>card.id==='Dark:94')];
   state.dark[0].push({name:'Imperial',type:'Character',ability:4});
   state.botDeck.push({name:'Destiny',destiny:${destiny}})`);
  assert.equal(run("requestAction('deployLostPileEffect','Light',[0,'Dark'])"),true);
  assert.match(elements.get('controlPanel').innerHTML,/Antwortfenster · Eyes In The Dark/);
  assert.equal(run("requestAction('interruptResponse','Dark',[0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
  if(destiny===4)assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
  assert.equal(run("PremiereGame.lostPileFaceDown(state,'Dark')"),destiny===4);
  assert.equal(run('state.lost.includes(eyes)'),destiny===1);
 }
});

async function darkLostPileEffectHarness(){
 const fixture=await premiereHarness();
 fixture.run(`start(1);chooseStart(startingLocationChoices(setupDecks.light)[1].index);
  const copies=setupDecks.dark.cards.filter(isLostPileEffect).length;
  beginStartingGame();
  const darkEffect=catalog.find(card=>card.side==='Dark'&&isLostPileEffect(card));
  state.botHand=[darkEffect];
  botNextStep();botNextStep();`);
 return fixture;
}

test('Dark deploys Your Eyes Can Deceive You from its starter deck and conceals its Life Force losses',async()=>{
 const {run,elements}=await darkLostPileEffectHarness();
 assert.equal(run('copies'),1);
 assert.equal(run("requestAction('deployLostPileEffect','Dark',[0,'Dark'])"),false);
 const force=run('state.botForce.length');
 assert.equal(run('botNextStep()'),true);
 assert.equal(run('state.botForce.length'),force);
 assert.equal(run("state.lostPileEffects[0].card===darkEffect&&state.lostPileEffects[0].target==='Dark'"),true);
 assert.match(elements.get('botHistory').textContent,/Your Eyes Can Deceive You/);
 assert.match(elements.get('pilesDark').innerHTML,/Lost Pile verdeckt.*Your Eyes Can Deceive You/);
 assert.doesNotMatch(elements.get('pilesLight').innerHTML,/Lost Pile verdeckt/);
 run(`state.botDeck.push({name:'Hidden Dark Card'});
  beginForceLoss('Dark',1,{reason:'drain',from:'deck'});`);
 assert.equal(run("state.botLost.at(-1).name==='Hidden Dark Card'"),true);
 assert.doesNotMatch(elements.get('log').textContent,/Hidden Dark Card/);
 assert.doesNotMatch(run("JSON.stringify(PremiereGame.playerView(state,'Light'))"),/Hidden Dark Card/);
});

test('Dark has both legal targets and covers Light when Dark is already covered',async()=>{
 const {run}=await darkLostPileEffectHarness();
 run(`state.lostPileEffects.push({card:catalog.find(card=>card.id==='Light:917'),target:'Dark'});
  requestAction('botStep','Dark',['deploy']);`);
 assert.deepEqual(JSON.parse(run(`JSON.stringify(legalActions(state,'Dark').filter(action=>
  action.kind==='deployLostPileEffect').map(action=>action.target))`)),['Light','Dark']);
 run('botDeployPhase()');
 assert.equal(run("state.lostPileEffects[1].card===darkEffect&&state.lostPileEffects[1].target==='Light'"),true);
});

test('Light can cancel Your Eyes Can Deceive You with Alter and the bot resumes its Deploy phase',async()=>{
 const {run,elements}=await darkLostPileEffectHarness();
 run(`state.hand=[catalog.find(card=>card.id==='Light:95')];
  state.light[0].push({name:'Rebel',type:'Character',ability:4});
  state.deck.push({name:'Destiny',destiny:1});`);
 assert.equal(run('botNextStep()'),true);
 assert.equal(run("state.botTurn.decision==='deploy'"),true);
 assert.match(elements.get('controlPanel').innerHTML,/Antwortfenster · Your Eyes Can Deceive You.*Alter/);
 assert.equal(run("requestAction('interruptResponse','Light',[0])&&requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("state.botLost.includes(darkEffect)&&!PremiereGame.lostPileFaceDown(state,'Dark')"),true);
 assert.equal(run("botNextStep()&&state.phase===2&&state.botTurn.decision===undefined"),true);
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

function autosaveStorage(){
 const values=new Map();
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

test('starter decks replay complete matches with legal decisions and conserve all card instances',async()=>{
 const {run}=await premiereHarness();
 run(`presentGame=()=>{};
 function inventory(){
  const roots=[...state.locations.filter(Boolean),...(state.outOfPlay??[]),...Object.values(state.convertedLocations??{}).flat(),
   ...Object.values(state.locationWeapons??{}).flat(),
   ...Object.values(state.locationEffects??{}).flat().map(effect=>effect.card),
   ...[...(state.buriedMines??[]),...(state.lostPileEffects??[])].map(effect=>effect.card)];
  if(state.blasterRack)roots.push(state.blasterRack.card,...state.blasterRack.weapons);
  for(const side of PremiereGame.sides){
   const {deck,hand,force,used,lost,board}=PremiereGame.zones(state,side);
   roots.push(...deck,...hand,...force,...used,...lost,...board.flat());
  }
  function walk(card){
   return [card.instanceId,...[...(card.weapons??[]),...(card.attachments??[]),
    ...(card.occupants??[]).map(entry=>entry.card)].flatMap(walk)];
  }
  return roots.flatMap(walk);
 }
 function playMatch(seed,cardRulesVersion=latestCardRulesVersion){
  start(seed,true,false,starterDecks,cardRulesVersion,cardRulesVersion===0?0:1);
  const choose=()=>chooseStart(startingLocationChoices(setupDecks.light)[1]?.index??startingLocationChoices(setupDecks.light)[0]?.index??null);
  choose();
  while(setupDecks.revealed.collision){retryStartingLocations();choose();}
  beginStartingGame();
  const summary={seed,ground:false,space:false,responses:0,reactions:0,botActions:0,validated:0};
  for(let step=0;step<1600&&!state.gameWinner;step++){
   if(!PremiereGame.responseWindow(state.game)&&!battleSession&&!state.game.timing.pending){
    const ids=inventory();
    if(ids.length!==120||new Set(ids).size!==120||ids.some(id=>!id))throw Error('Card balance at '+seed+'/'+step);
    summary.validated++;
   }
   const light=legalActions(state,'Light'),dark=legalActions(state,'Dark');
   const response=PremiereGame.responseWindow(state.game);
   if(response)summary.responses++;
   if(battleSession)summary[isSystem(state.locations[battleSession.site])?'space':'ground']=true;
   if(dark.some(action=>['botStep','botDecision'].includes(action.kind))&&
      !state.pendingForceLoss&&!battleSession&&!response&&!state.game.timing.pending&&!state.automatedPending){
    if(!botNextStep())throw Error('Bot refused a step at '+seed+'/'+step);
    summary.botActions++;
    continue;
   }
   const preferred=['resolveMine','automatedTarget','reactDeploy','react','interruptResponse','passResponse','timingTrigger','battlePrediction','duel',
    'fireWeapon','battleEffect','passWeapons','destiny','skipDestiny','battleForfeit','battleForceLoss','passDamage','loseForce',
    'deployLocation','convertLocation','deployWithPilot','equip','deploy','battle','drain','activate','draw','advance'];
   const options=light.length?light:dark;
   let action;
   if(!light.length&&battleSession?.weaponTurn==='Dark')action=botWeaponAction();
   if(!light.length&&battleSession?.damage?.priority==='Dark')action=botDamageAction();
   action??=preferred.map(kind=>kind==='activate'?options.filter(action=>action.kind===kind).at(-1):
    options.find(action=>action.kind===kind)).find(Boolean);
   if(!action||!performAction(action))throw Error('Unresolved '+(action?.kind??options.map(option=>option.kind))+' at '+seed+'/'+step+' phase '+state.phase);
   if(['react','reactDeploy','interruptResponse'].includes(action.kind))summary.reactions++;
  }
  const ids=inventory();
  if(ids.length!==120||new Set(ids).size!==120||ids.some(id=>!id))throw Error('Final card balance at '+seed);
  return {...summary,winner:state.gameWinner,turn:state.turn,trace:JSON.stringify(state.game.actions)};
 }`);
 const matches=[3,4,9].map(seed=>JSON.parse(run(`JSON.stringify(playMatch(${seed}))`)));
 assert.ok(matches.every(match=>match.winner&&match.botActions>0&&match.validated>0));
 assert.deepEqual(new Set(matches.map(match=>match.winner)),new Set(['Light','Dark']));
 assert.ok(matches.some(match=>match.ground&&match.space&&match.reactions>0),
  JSON.stringify(matches.map(({trace,...match})=>match)));
 const legacy=JSON.parse(run('JSON.stringify(playMatch(4,0))'));
 assert.ok(legacy.winner&&legacy.ground&&legacy.space,
  JSON.stringify({...legacy,trace:undefined}));
 assert.deepEqual(JSON.parse(run('JSON.stringify(playMatch(4))')),matches.find(match=>match.seed===4));
});

function startSavedGame(run,seed=0){
 run(`const act=(kind,side='Light',args=[])=>dispatchUI(PremiereGame.offer(currentGame(),side,kind,args));
  el('gameSeed').value='${seed}';el('trainingBattle').checked=false;el('start').onclick();`);
}

test('selected theme decks set the starting locations and are saved, replayed and previewed',async()=>{
 const storage=autosaveStorage();
 const {run,elements}=await premiereHarness(starterLists,{storage});
 assert.equal(elements.get('selectLightDeck').innerHTML.match(/<option/g).length,5);
 assert.equal(elements.get('selectDarkDeck').innerHTML.match(/<option/g).length,5);
 run("el('selectLightDeck').value='falcon-kessel';el('selectLightDeck').onchange();el('viewLightDeck').onclick()");
 assert.match(elements.get('starterDeckTitle').textContent,/Kessel Run · 60 Karten/);
 assert.match(elements.get('starterDeckCards').innerHTML,/4 × •Millennium Falcon/);
 run("el('selectDarkDeck').value='imperiale-garnison';el('selectDarkDeck').onchange()");
 assert.match(elements.get('setupOptions').innerHTML,/Tatooine: Docking Bay 94.*Dantooine.*Yavin 4/);
 startSavedGame(run,19);
 assert.equal(run("act('chooseStart','Light',[setupDecks.light.startingIndices[0]])&&act('beginGame')"),true);
 assert.equal(run("state.locations[0].id"),'Light:2447');
 assert.match(run("state.locations[1].name"),/Death Star:/);
 const key=run('saveKey'),saved=JSON.parse(storage.getItem(key));
 assert.equal(saved.decks.decks.Light.theme.id,'falcon-kessel');
 assert.equal(saved.decks.decks.Dark.theme.id,'imperiale-garnison');
 const zones="JSON.stringify([state.locations,state.deck,state.botDeck,state.hand,state.botHand])";
 const original=run(zones);
 run("el('selectDarkDeck').value='blockade-von-kessel';el('selectDarkDeck').onchange()");
 assert.equal(run(zones),original);
 const reload=await premiereHarness(starterLists,{storage});
 assert.equal(reload.run("el('resumeGame').onclick()"),true);
 assert.equal(reload.run(zones),original);
 assert.equal(reload.elements.get('selectLightDeck').value,'falcon-kessel');
 assert.equal(reload.elements.get('selectDarkDeck').value,'imperiale-garnison');
});

test('legacy autosaves resume without applying new registered card rules retroactively',async()=>{
 const storage=autosaveStorage();
 const {run}=await premiereHarness(starterLists,{storage});
 startSavedGame(run);
 const key=run('saveKey'),saved=JSON.parse(storage.getItem(key));
 assert.equal(saved.cardRulesVersion,10);
 assert.equal(saved.botStrategyVersion,1);
 delete saved.cardRulesVersion;
 delete saved.botStrategyVersion;
 storage.setItem(key,JSON.stringify(saved));
 const reload=await premiereHarness(starterLists,{storage});
 assert.ok(reload.run("el('resumeGame').onclick()"));
 assert.equal(reload.run('currentGame().cardRulesVersion'),0);
 assert.equal(reload.run('currentGame().botStrategyVersion'),0);
 assert.equal(reload.run("activeCardRules(catalog.find(card=>card.id==='Light:2052'),'freeSiteDeploy').length"),0);
});

test('ending the active game preserves an autosave changed by another tab',async()=>{
 const storage=autosaveStorage();
 const {run}=await premiereHarness(starterLists,{storage});
 startSavedGame(run);
 const key=run('saveKey'),otherSave=JSON.stringify({...JSON.parse(storage.getItem(key)),seed:4});
 storage.setItem(key,otherSave);
 assert.equal(run("el('endGame').onclick()"),true);
 assert.equal(storage.getItem(key),otherSave);
 assert.equal(run('currentGame()'),undefined);
 assert.equal(run("el('resumeGame').hidden"),false);
});

test('autosave restores a partially completed bot turn and keeps the original starter decks',async()=>{
 const storage=autosaveStorage();
 const {run}=await premiereHarness(starterLists,{storage});
 const readSave=()=>storage.getItem(run('saveKey'));
 assert.equal(readSave(),null);
 startSavedGame(run);
 assert.equal(JSON.parse(readSave()).commands.length,0);
 assert.equal(run("act('chooseStart','Light',[setupDecks.light.startingIndices[1]])"),true);
 assert.equal(JSON.parse(readSave()).commands.length,1);
 assert.equal(run("act('beginGame')"),true);
 run("el('botNext').onclick()");
 const saved=readSave();
 assert.equal(JSON.parse(saved).commands.at(-1).type,'bot');
 assert.match(run("state.botHistory[0]"),/Activate/);
 assert.equal(run("act('advance')"),false);
 assert.equal(readSave(),saved);
 const snapshot='JSON.stringify([state.phase,state.botTurn,state.deck,state.botDeck,state.botForce,state.botHistory,state.log])';
 const actual=run(snapshot);

 const newDecks=structuredClone(starterLists);
 newDecks.decks.Dark.cards.find(card=>card.id==='Dark:1279').count--;
 newDecks.decks.Dark.cards.find(card=>card.id==='Dark:2355').count++;
 const reload=await premiereHarness(newDecks,{storage,confirmNewGame:()=>false});
 assert.equal(reload.run("el('resumeGame').hidden"),false);
 assert.equal(reload.run('currentGame()'),undefined);
 reload.run("el('start').onclick()");
 assert.equal(reload.run("el('resumeGame').hidden"),false);
 assert.equal(readSave(),saved);
 assert.equal(reload.run("el('resumeGame').onclick()"),true);
 assert.equal(reload.run(snapshot),actual);
 assert.equal(reload.run("el('resumeGame').hidden"),true);
 assert.equal(reload.run("currentGame().starterDecks.dark.cards.filter(card=>card.id==='Dark:1279').length"),3);
 reload.run("el('botNext').onclick()");
 assert.equal(reload.run('state.phase'),1);
 assert.equal(JSON.parse(readSave()).commands.length,4);
});

test('automatic bot turns are saved and continue after reload, stopping at Light decisions',async()=>{
 const storage=autosaveStorage();
 const first=await premiereHarness(starterLists,{storage});
 const {run,tick,elements}=first;
 startSavedGame(run,0);
 assert.equal(run("act('chooseStart','Light',[setupDecks.light.startingIndices[1]])&&act('beginGame')"),true);
 assert.equal(tick(),false);
 run('setAutoBot(true)');
 assert.equal(elements.get('botNext').hidden,true);
 assert.equal(tick(),true);
 const saved=JSON.parse(storage.getItem(run('saveKey')));
 assert.equal(saved.commands.at(-1).type,'bot');
 assert.equal(saved.commands.at(-1).adaptive,true);
 const second=await premiereHarness(starterLists,{storage});
 assert.equal(second.run("el('autoBot').checked"),true);
 assert.equal(second.tick(),false);
 assert.equal(second.run("el('resumeGame').onclick()"),true);
 assert.equal(second.run('currentGame().revision'),saved.revision);
 for(let step=0;step<24&&second.tick();step++){}
 assert.equal(second.run("state.activeSide==='Light'&&state.phase===0&&!state.activated"),true);
 assert.equal(second.tick(),false);
 assert.match(second.elements.get('botHistory').textContent,/Activate/);
 assert.match(second.elements.get('botHistory').textContent,/Bot beendet seinen Lernzug/);
 assert.doesNotMatch(second.elements.get('log').textContent,/Bot beendet|Dark aktiviert/);
});

test('a saved live battle resumes in the damage segment and accepts the remaining payment',async()=>{
 const storage=autosaveStorage();
 const {run}=await premiereHarness(starterLists,{storage});
 startSavedGame(run);
 run('currentGame().botStrategyVersion=0;activeSave.botStrategyVersion=0');
 assert.equal(run(`act('chooseStart','Light',[setupDecks.light.startingIndices[1]])&&act('beginGame')`),true);
 run("for(let i=0;state.botTurn&&i<8;i++)el('botNext').onclick()");
 assert.equal(run(`act('activate','Light',[4])&&act('advance')&&act('advance')&&act('deploy','Light',[1,0])&&
  act('advance')&&act('battle','Light',[0])&&act('skipDestiny')&&act('skipDestiny','Dark')`),true);
 assert.equal(run("battleSession.segment==='damage'&&battleSession.damage.debt.Light.damage===1"),true);
 const snapshot='JSON.stringify([state.force,state.lost,state.hand,state.log,battleSession.damage])';
 const actual=run(snapshot);
 const reload=await premiereHarness(starterLists,{storage});
 assert.equal(reload.run("el('resumeGame').onclick()"),true);
 assert.equal(reload.run(snapshot),actual);
 assert.equal(reload.run("el('battleAnalysis').open"),true);
 assert.equal(reload.run(`dispatchUI(PremiereGame.offer(currentGame(),'Light','battleForceLoss',['force']))`),true);
 assert.equal(reload.run('battleSession.damage.debt.Light.damage'),0);
 assert.equal(reload.run('state.lost.length'),1);
});

test('an invalid saved command leaves the saved data in place and offers a new game',async()=>{
 const storage=autosaveStorage();
 const {run}=await premiereHarness(starterLists,{storage});
 startSavedGame(run);
 const key=run('saveKey');
 const data=JSON.parse(storage.getItem(key));
 data.commands.push({type:'action',kind:'invalid',side:'Light',args:[]});
 const invalid=JSON.stringify(data);
 storage.setItem(key,invalid);
 const reload=await premiereHarness(starterLists,{storage});
 assert.equal(reload.run("el('resumeGame').onclick()"),false);
 assert.equal(reload.run('currentGame()'),undefined);
 assert.match(reload.run("el('gameSaveStatus').textContent"),/konnte.*nicht fortgesetzt/);
 assert.equal(storage.getItem(key),invalid);
 assert.equal(reload.run("el('start').disabled"),false);
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
 assert.match(elements.get('playerReactControls').innerHTML,/Antwortfenster.*Shistavanen Wolfman/);
 assert.equal(elements.get('playerReactControls').hidden,false);
 assert.equal(elements.get('controlPanel').style.display,'none');
 assert.equal(run("requestAction('passResponse','Dark')"),false);
 assert.equal(run("requestAction('draw','Light')"),false);
 assert.equal(run("requestAction('react','Light',[0,0])"),true);
 assert.equal(run("state.light[0][0]===wolfman&&state.used[0].name==='React cost'"),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run('state.light[1][0]===wolfman&&state.pendingForceLoss===null&&state.game.responses.length===0'),true);
 assert.equal(elements.get('playerReactControls').hidden,true);
 assert.equal(run("PremiereGame.wasUsed(state.game,'turn','react:Light:9')"),true);
 assert.equal(run("requestAction('drain','Dark',[1])"),false);
});

test('battle React appears on the Light side and follows the player back to the playmat',()=>{
 const {run,elements}=reactHarness();
 run(`state.phase=3;state.botForce.push({name:'Battle Force'});
  state.light[1].push({name:'Rebel',type:'Character',ability:2,power:1});
  el('autoBot').checked=false;`);
 assert.equal(run("requestAction('battle','Dark',[1])"),true);
 assert.match(elements.get('battleDetails').innerHTML,/battle-side light.*Deine React-Aktionen.*Shistavanen Wolfman.*battle-side dark/s);
 assert.equal(elements.get('battleResponses').style.display,'none');
 assert.equal(elements.get('playerReactControls').hidden,true);
 run('battleOnPlaymat=battleSession;presentGame()');
 assert.equal(elements.get('playerReactControls').hidden,false);
 assert.match(elements.get('playerReactControls').innerHTML,/Shistavanen Wolfman/);
 assert.equal(elements.get('controlPanel').style.display,'none');
 run('returnToBattle()');
 assert.equal(elements.get('playerReactControls').hidden,true);
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

test('Sense and Alter offer the matching modes and resolve from the top of the response stack',()=>{
 const {run,elements}=reactHarness();
 run(`state.botHand=[{id:'Dark:2216',name:'Sense'},{id:'Dark:2216',name:'Sense'}];
  state.hand=[{id:'Light:95',name:'Alter'}];`);
 assert.equal(run(`requestAction('drain','Dark',[1])&&requestAction('react','Light',[0,0])&&
  requestAction('interruptResponse','Dark',[0])&&requestAction('interruptResponse','Light',[0])`),true);
 assert.equal(run("legalActions(state,'Dark').filter(action=>action.kind==='interruptResponse').map(action=>action.counterMode).join(',')"),'direct,destiny');
 assert.equal(run("requestAction('interruptResponse','Dark',[0,'wrong'])"),false);
 assert.equal(run("requestAction('interruptResponse','Dark',[0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
 assert.equal(run("state.lost[0].name==='Alter'&&state.botUsed[0].name==='Sense'&&state.botDeck.length===2"),true);
 assert.equal(run("requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("state.botUsed.map(card=>card.name).join(',')"),'Sense,Sense Destiny,Sense');
 assert.equal(run("state.light[0].includes(wolfman)"),true);
 assert.match(elements.get('log').textContent,/Destiny 2 gegen Ability 3/);
});

test('Alter rejects an immune Effect both during deployment and on table',async()=>{
 const {run}=await eyesInTheDarkHarness();
 run("state.hand[0]={...eyes,gametext:eyes.gametext+' (Immune to Alter.)'};state.botHand=[catalog.find(card=>card.id==='Dark:94')];state.dark[0].push({type:'Character',name:'Imperial',ability:4})");
 assert.equal(run("requestAction('deployLostPileEffect','Light',[0,'Dark'])"),true);
 assert.equal(run("PremiereGame.responseWindow(state.game)"),null);
 assert.equal(run("requestAction('alterLostPileEffect','Dark',[0,0])"),false);
 assert.equal(run("state.botHand.length===1&&PremiereGame.lostPileFaceDown(state,'Dark')"),true);
});

test('Pile shuffling preserves private information and Sense can cancel before the shuffle',async()=>{
 for(const blocked of [false,true]){
  const {run,elements}=await craftHarness();
  run(`setupDecks=null;state.game=PremiereGame.actionState(103,9);
   const shuffle=card('Light:2514');state.hand=[shuffle];state.force=[];
   state.botDeck=[{name:'Sentinel Life'},{name:'Sense Destiny',destiny:1}];
   state.botLost=['Alpha','Bravo','Charlie','Delta'].map(name=>({name}));
   state.lostPileEffects=[{card:card('Dark:2897'),target:'Dark'}];
   state.dark[2]=[card('Dark:634')];state.botHand=${blocked}?[card('Dark:2216')]:[];
   const cards=state.botLost.slice(),previous=state.game.randomState;select(0);`);
  assert.match(elements.get('controlPanel').innerHTML,/The Bith Shuffle · Dark Lost Pile mischen/);
  assert.doesNotMatch(elements.get('controlPanel').innerHTML,/Alpha|Bravo|Charlie|Delta/);
  assert.equal(run("requestAction('shufflePile','Light',[0,'Dark','force'])"),false);
  assert.equal(run("requestAction('shufflePile','Light',[0,'Light','lost'])"),false);
  assert.equal(run("requestAction('shufflePile','Light',[0,'Dark','lost'])"),true);
  if(blocked)assert.equal(run("requestAction('interruptResponse','Dark',[0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
  assert.equal(run("state.botLost.every(card=>cards.includes(card))&&state.botLost.length===cards.length"),true);
  assert.equal(run("state.game.randomState===previous"),blocked);
  assert.equal(run("state.lost.includes(shuffle)"),blocked);
  assert.equal(run("state.used.includes(shuffle)"),!blocked);
 }
});

test('Sense may answer Sense only with Destiny and an eligible character',()=>{
 const {run}=reactHarness();
 run(`state.botHand=[{id:'Dark:2216',name:'Sense'}];state.hand=[{id:'Light:2217',name:'Sense'}];
  state.deck.push({name:'Equal',destiny:2});`);
 assert.equal(run(`requestAction('drain','Dark',[1])&&requestAction('react','Light',[0,0])&&
  requestAction('interruptResponse','Dark',[0])`),true);
 run("wolfman.ability=0");
 assert.equal(run("requestAction('interruptResponse','Light',[0])"),false);
 run("wolfman.ability=2");
 assert.equal(run("legalActions(state,'Light').filter(action=>action.kind==='interruptResponse').map(action=>action.counterMode).join(',')"),'destiny');
 assert.equal(run("requestAction('interruptResponse','Light',[0])&&requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("state.used.map(card=>card.name).join(',')"),'React cost,Equal,Sense');
 assert.equal(run("state.botLost.length===0&&PremiereGame.responseWindow(state.game).side==='Dark'"),true);
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

test('simultaneous Life Force depletion shows a draw and locks the game',()=>{
 const {run,elements}=reactHarness();
 run(`PremiereGame.resetTurn(state,'Light');state.botTurn=null;state.activated=true;state.force=[];
  state.botDeck.length=1;
  PremiereGame.registerTrigger(state.game,{id:'both-lose',side:'Dark',mandatory:true,event:'phase:end',scope:'phase',label:'Both lose',
   resolve(){PremiereGame.moveTop(state.deck,state.lost);PremiereGame.moveTop(state.botDeck,state.botLost)}});`);
 assert.equal(run("requestAction('advance','Light')&&state.gameWinner===null"),true);
 assert.equal(run("requestAction('timingTrigger','Light',['both-lose'])"),true);
 assert.equal(run('state.gameWinner'),'Simultaneous');
 assert.equal(run("legalActions(state,'Dark').length+legalActions(state,'Light').length"),0);
 assert.match(run('state.log.join("\\n")'),/SPIELENDE – Unentschieden/);
 run('render()');
 assert.equal(elements.get('gameMessage').hidden,false);
 assert.equal(elements.get('instruction').textContent,'Unentschieden – beide Life Forces gleichzeitig aufgebraucht');
 assert.equal(elements.get('step').disabled,true);
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

test('both Premiere Assault cards compare destiny against present power',()=>{
 const {run}=reactHarness();
 run(`state.activeSide='Light';state.botTurn=null;wolfman.power=2;
  state.botHand=[{id:'Dark:575',name:'Counter Assault'}];state.botForce=[{name:'Counter cost'}];
  state.botDeck.push({name:'Counter Destiny',destiny:3});`);
 assert.equal(run("requestAction('drain','Light',[0])&&requestAction('interruptResponse','Dark',[0])"),true);
 assert.equal(run("requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
 assert.equal(run("state.botLost[0].name==='Counter Assault'&&state.pendingForceLoss.payer==='Light'&&state.pendingForceLoss.remaining===1"),true);
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

test('named Reserve searches spend Force before revealing choices, then transfer one card and shuffle',async()=>{
 const {run,elements}=await craftHarness();
 run(`const interrupt=card('Dark:2528'),motti=card('Dark:60'),tarkin=card('Dark:1061'),other=card('Dark:2355');
  setupDecks=null;state.game=PremiereGame.actionState(45,99);state.activeSide='Dark';state.phase=1;
  state.botTurn={steps:botPlan(),index:2};state.botDeck=[motti,other,tarkin];state.botHand=[interrupt];state.hand=[];`);
 assert.equal(run("requestAction('takeFromReserve','Dark',[0])"),false);
 assert.equal(run("requestAction('searchReserve','Dark',[1])"),false);
 assert.equal(run("requestAction('searchReserve','Dark',[0])"),true);
 assert.equal(run('state.botUsed.length===4&&state.botHand.length===0&&state.botDeck.length===3'),true);
 assert.doesNotMatch(elements.get('controlPanel').innerHTML,/Motti|Tarkin/);
 assert.equal(run("requestAction('takeFromReserve','Light',[1])||requestAction('takeFromReserve','Dark',[3])"),false);
 assert.equal(run("requestAction('takeFromReserve','Dark',[1])"),true);
 assert.equal(run("state.botHand[0]===tarkin&&state.botDeck.length===2&&state.botDeck.includes(motti)&&state.botDeck.includes(other)&&state.botLost[0]===interrupt"),true);
 assert.equal(run("state.game.randomState!==99&&!state.pendingReserveSearch"),true);
});

test('a Reserve search with no match still consumes the Interrupt and shuffles; Sense stops a search before looking',async()=>{
 for(const cancel of [false,true]){
  const {run}=await craftHarness();
  run(`setupDecks=null;state.game=PremiereGame.actionState(46,99);state.phase=1;
   const interrupt=card('Light:1600'),other=card('Light:2052'),second=card('Light:2040');
   state.hand=[interrupt];state.deck=[other,second];state.botHand=[];`);
  if(cancel)run(`const sense=card('Dark:2216');state.botHand=[sense];state.dark[2]=[card('Dark:634')];
   state.botDeck=[{name:'Destiny',destiny:1}];`);
  assert.equal(run("requestAction('searchReserve','Light',[0])"),true);
  if(cancel){
   assert.equal(run("requestAction('interruptResponse','Dark',[0])&&requestAction('passResponse','Light')&&requestAction('passResponse','Dark')"),true);
   assert.equal(run('state.game.randomState===99'),true);
  }else{
   assert.equal(run("requestAction('takeFromReserve','Light',[null])"),true);
   assert.equal(run('state.game.randomState!==99'),true);
  }
  assert.equal(run('!state.pendingReserveSearch&&state.hand.length===0&&state.used.length===3&&state.lost[0]===interrupt&&state.deck.length===2'),true);
 }
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

test('the bot reevaluates distinct battle sites before leaving the Battle phase',()=>{
 const {run}=reactHarness();
 run(`state.locations.forEach((_,slot)=>{
  state.light[slot]=[{name:'Rebel '+slot,type:'Character',ability:1,power:1,forfeit:1}];
  state.dark[slot]=[{name:'Imperial '+slot,type:'Character',ability:1,power:2,forfeit:1}];
 });
 state.hand=[{name:'First damage'},{name:'Second damage'}];
 state.phase=2;state.botForce=[{name:'Battle cost 1'},{name:'Battle cost 2'}];
 state.botTurn={steps:botPlan(),index:3};
 function finishBattle(){
  for(let step=0;step<24&&battleSession;step++){
   const pass=PremiereGame.sides.flatMap(side=>legalActions(state,side)).find(action=>
    ['passResponse','passWeapons','skipDestiny','passDamage'].includes(action.kind)||
    (action.kind==='battleForceLoss'&&action.args[0]==='hand'));
   if(!pass||!performAction(pass))return false;
  }
  return !battleSession;
 }`);
 assert.equal(run('botNextStep()&&state.phase===3&&battleSession.site===0'),true);
 assert.equal(run('finishBattle()'),true);
 assert.equal(run('botNextStep()&&state.phase===3&&battleSession.site===1'),true);
 assert.equal(run('finishBattle()'),true);
 assert.equal(run('botNextStep()&&state.phase===4&&state.battledSitesThisTurn.join()=== "0,1"'),true);
});

test('strategic bot spends its last Force taking a drain location before arming an isolated unit',async()=>{
 const {run}=await craftHarness();
 run("setupDecks=null;state.game=PremiereGame.actionState(98,0);state.game.botStrategyVersion=1;state.activeSide='Dark';state.botTurn={steps:[],index:0};");
 run("state.dark[2]=[card('Dark:2355')];state.botHand=[card('Dark:1264'),card('Dark:2355')];state.botForce=[{}];state.locations[3]={...dunes,icons:{light:3,dark:1}};");
 assert.ok(run("legalActions(state,'Dark').some(option=>option.kind==='equip')"));
 assert.equal(run("botDeploymentChoice(legalActions(state,'Dark')).args.join()"),'1,3');
 assert.ok(run("botDeployPhase().some(text=>text.includes('Stormtrooper')&&text.includes('Dune Sea'))"));
 assert.equal(run('state.dark[3].length===1&&!state.dark[2][0].weapons?.length&&state.botForce.length===0'),true);
});

test('strategic bot holds a controlled drain and moves a spare unit into safe control',async()=>{
 const {run}=await craftHarness();
 run("setupDecks=null;state.game=PremiereGame.actionState(99,0);state.game.botStrategyVersion=1;state.activeSide='Dark';state.botTurn={steps:[],index:0};state.phase=4;");
 run("state.locationOrder=[2,3,4,6,5,1,0];state.locations[2]={...dock,icons:{light:3,dark:1}};state.dark[2]=[card('Dark:2355')];state.light[3]=[card('Light:1593')];");
 assert.ok(run("legalActions(state,'Dark').some(option=>option.kind==='move'&&option.to===3)"));
 assert.equal(run('botMove()'),false);
 run("state.light[3]=[];state.dark[2].push(card('Dark:2355'))");
 assert.equal(run('botMove()&&state.dark[2].length===1&&state.dark[3].length===1'),true);
});

test('strategic bot gives up redundant cards before losing an important unit or Life Force',async()=>{
 const {run}=await craftHarness();
 run("setupDecks=null;state.game=PremiereGame.actionState(100,0);state.game.botStrategyVersion=1;state.activeSide='Light';state.botTurn=null;");
 run("const vader=card('Dark:634'),duplicate=card('Dark:2446');state.botHand=[vader,duplicate];state.botDeck=[{}];");
 assert.equal(run("beginForceLoss('Dark',1,{reason:'drain'})"),1);
 assert.equal(run('state.botLost[0]===duplicate&&state.botHand[0]===vader&&state.botDeck.length===1'),true);
});

test('strategic bot shoots at a worthwhile target with favorable odds',()=>{
 const {run}=weaponBattleHarness('Dark');
 run(`state.game=PremiereGame.actionState(101,0);state.game.botStrategyVersion=1;state.phase=3;
  rebel.power=8;rebel.armor=8;trooper.weapons=[blaster];`);
 assert.equal(run("requestAction('battle','Dark',[0])"),true);
 assert.equal(run('botWeaponAction().target===officer'),true);
});

test('the bot skips a legal battle when the opponent is favored after estimated Destiny',()=>{
 const {run}=reactHarness();
 run(`state.phase=2;state.botTurn={steps:botPlan(),index:3};state.botForce=[{name:'Battle cost'}];
  state.light[0]=[{name:'Rebel',type:'Character',ability:4,power:4}];
  state.dark=[[{name:'Imperial',type:'Character',ability:2,power:5}],[]];`);
 assert.equal(run("botNextStep()&&state.phase===3&&!battleSession&&state.botForce.length===1"),true);
 assert.match(run('state.botHistory[0]'),/fehlt ein Vorteil/);
 assert.equal(run("legalActions(state,'Dark').some(action=>action.kind==='battle')"),true);
 assert.equal(run("botNextStep()&&state.phase===4&&!battleSession"),true);
});

test('the bot draws several cards to rebuild, preserves its last Life Force and can replay a one-card turn',()=>{
 for(const [adaptive,count,forceCount] of [[true,5,6],[true,2,3],[false,1,6]]){
  const {run}=reactHarness();
  run(`state.activeSide='Dark';state.dark=[[],[]];state.phase=4;state.botTurn={steps:botPlan(),index:5};
   state.botDeck=[];state.botHand=[];state.botUsed=[];
   state.botForce=Array.from({length:${forceCount}},(_,index)=>({name:'Force '+index}));`);
  assert.equal(run(`botNextStep(true,${adaptive})`),true);
  assert.equal(run('state.botHand.length'),count);
  assert.equal(run('state.botForce.length'),forceCount-count);
  assert.equal(run('state.gameWinner'),null);
  assert.equal(run("state.game.actions.filter(action=>action.kind==='draw').length"),count);
 }
});
test('each move reevaluates the available cards and legacy replay can leave the phase after one',()=>{
 for(const repeatPhase of [false,true]){
  const {run}=reactHarness();
  run(`state.phase=3;state.light=[[],[]];
   state.locations[1].icons.light=2;
   state.dark=[[{name:'First',type:'Character',ability:1},{name:'Second',type:'Character',ability:1}],[]];
   state.botForce=[{name:'Move 1'},{name:'Move 2'}];state.botTurn={steps:botPlan(),index:4};`);
  assert.equal(run('botNextStep()&&state.phase===4&&state.dark[1].length===1'),true);
  assert.equal(run(`botNextStep(${repeatPhase})`),true);
  assert.equal(run('state.phase'),repeatPhase?4:5);
  assert.equal(run('state.dark[1].length'),repeatPhase?2:1);
  if(repeatPhase)assert.equal(run('botNextStep()&&state.phase===5&&state.movedThisTurn.length===2'),true);
 }
});

test('lightsabers offer an optional bonus, and a forbidden location offers no drain',()=>{
 const {run}=reactHarness();
 run(`state.activeSide='Light';state.botTurn=null;
  state.dark[1]=[];wolfman.weapons=[{id:'Light:1386',type:'Weapon'}];`);
 assert.equal(run("legalActions(state,'Light').filter(action=>action.kind==='drain').map(action=>action.amount).join()"),'1,2');
 const column='renderPlaymatColumn(state.locations[0],0)';
 assert.match(run(column),/>Force Drain · 1 Force<\/button>.*>Force Drain · 2 Force \(\+1 Bonus\)<\/button>/);
 run('state.locations[0].icons.dark=0');
 assert.match(run(column),/>Force Drain · 0 Force<\/button>/);
 run("state.locationEffects={0:[{card:{id:'test modifier'},drainForbiddenFor:'Light'}]};");
 assert.equal(run("requestAction('drain','Light',[0,1])"),false);
 assert.doesNotMatch(run(column),/class="playmat-drain-actions"/);
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
 run('state.dark[0]=[tie];state.dark[2]=[bantha]');
 const field=run('renderPlaymatColumn(state.locations[0],0)');
 assert.match(field,/dark-zone.*?Power <b>1<\/b>.*?Ability <b>1<\/b>/);
 assert.match(run('renderPlaymatColumn(state.locations[2],2)'),/dark-zone.*?Power <b>1<\/b>.*?Ability <b>0,5<\/b>/);
 assert.match(field,/light-zone.*?aria-label="Pilot · [^"]*Biggs Darklighter ansehen".*?Power <b>5<\/b>.*?Ability <b>2<\/b>/);
});

test('Playmat distinguishes unknown Location status and marks only the actual hit card instance aboard',async()=>{
 const {run}=await craftHarness();
 run(`const damaged=card('Light:1677'),other=card('Light:1677'),hitPilot=card('Light:1098'),otherPilot=card('Light:1098');
  state.light[6]=[damaged,other];
  PremiereUnits.add(damaged,hitPilot,'pilot','Light');
  PremiereUnits.add(other,otherPilot,'pilot','Light');
  state.light[2]=[{name:'Unbekannte Ability',type:'Character'}];
  state.dark[2]=[card('Dark:2355')];
  battleSession={site:6,hitUnits:{Light:[hitPilot],Dark:[]}};`);
 const battleSite=run('renderPlaymatColumn(state.locations[6],6,false,[])');
 assert.equal((battleSite.match(/class="card-hit-label"/g)??[]).length,1);
 assert.match(battleSite,/aria-label="Pilot · [^"]*Han Solo ansehen · Getroffen" onclick="inspectStackLayer\('Light',6,0,0\)"/);
 const otherSite=run('renderPlaymatColumn(state.locations[2],2,false,[])');
 assert.match(otherSite,/dark-zone.*aria-label="Control · unbekannt"/);
 assert.match(otherSite,/light-zone.*aria-label="Presence · unbekannt"/);
 assert.doesNotMatch(otherSite,/class="card-hit-label"/);
 run('battleSession=null');
 assert.doesNotMatch(run('renderPlaymatColumn(state.locations[6],6,false,[])'),/class="card-hit-label"/);
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

test('selected units transit together, leaving unselected cards and their movement available',async()=>{
 const {run}=await craftHarness();
 run(`const a=card('Light:2052'),b=card('Light:2040'),c=card('Light:1098');
  const blaster=card('Light:259');a.weapons=[blaster];
  state.locations[5]=card('Dark:675');state.phase=4;state.light[2]=[a,b,c];
  const transit=legalActions(state,'Light').find(action=>action.kind==='transitGroup');`);
 assert.match(run("transportGroupMarkup(transit)"),/type="checkbox".*type="checkbox".*type="checkbox"/);
 assert.equal(run("requestAction('transitGroup','Light',[2,5,0,0])"),false);
 assert.equal(run("requestAction('transitGroup','Light',[2,5,0,99])"),false);
 assert.equal(run('state.light[2].length===3&&state.used.length===0'),true);
 run(`openMovement(2);
  const status={};
  const form={querySelector:()=>status,querySelectorAll:()=>[{value:'0'},{value:'2'}]};
  submitTransportGroup(form,transit);`);
 assert.equal(run("el('movementDialog').open"),false);
 assert.equal(run("state.light[2].length===1&&state.light[2][0]===b&&state.light[5].length===2&&state.light[5][0]===a&&state.light[5][1]===c&&a.weapons[0]===blaster"),true);
 assert.equal(run("state.used.length===1&&state.movedThisTurn.includes(a)&&state.movedThisTurn.includes(c)&&!state.movedThisTurn.includes(b)"),true);
});

test('group movement offers affordable shared destinations and pauses when a mine opens a decision',async()=>{
 const {run}=await craftHarness();
 run(`const first=card('Light:2052'),second=card('Light:2040'),mine=card('Dark:2609');
  setupDecks=null;state.game=PremiereGame.actionState(119,0);state.phase=4;state.light[2]=[first,second];
  state.buriedMines=[{side:'Dark',slot:3,card:mine}];state.botDeck=[{name:'Mine Destiny',destiny:1}];
  state.force=forcePile().slice(0,1);`);
 assert.equal(run('groupMovePlans(2,[0,1]).length'),0);
 run('state.force=forcePile().slice(0,2);state.light[2][1]=ship');
 assert.ok(run("groupMoveOptions(2,legalActions(state,'Light')).some(move=>move.card===ship&&move.movementKind==='Starten')"));
 assert.equal(run('groupMovePlans(2,[0,1]).length'),0);
 run(`state.light[2][1]=second;
  openMovement(2);
  const form={dataset:{slot:'2'},querySelectorAll:()=>[{value:'0'},{value:'1'}]};
  submitGroupMove(form,{value:'3'});`);
 assert.ok(run("state.light[3].includes(first)&&state.light[2].includes(second)&&state.used.length===1&&state.automatedPending?.kind==='mine'"));
 assert.equal(run("el('movementDialog').open"),false);
 assert.ok(run("state.log.some(message=>message.includes('1 von 2 Karten bewegt'))"));
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

test('docking moves multiple chosen passengers for one Force and validates final capacity atomically',async()=>{
 const {run}=await craftHarness();
 run(`const big=card('Light:530'),other=card('Light:1677'),han=card('Light:1098'),trooper=card('Light:2052'),luke=card('Light:1593');
  state.phase=4;state.light[6]=[big,other];
  PremiereUnits.add(big,han,'passenger','Light');PremiereUnits.add(big,trooper,'passenger','Light');
  PremiereUnits.add(other,luke,'passenger','Light');`);
 assert.match(run("transportGroupMarkup(legalActions(state,'Light').find(action=>action.kind==='dockGroup'))"),/Andocken.*Transfer ausführen/);
 assert.equal(run("requestAction('dockGroup','Light',[6,0,1,0,0,'passenger',0,1,'passenger'])"),false);
 assert.equal(run("requestAction('dockGroup','Light',[6,0,1,0,0,'passenger',0,0,'pilot'])"),false);
 assert.equal(run("big.occupants.length===2&&other.occupants.length===1&&state.used.length===0"),true);
 assert.equal(run("requestAction('dockGroup','Light',[6,0,1,0,0,'passenger',0,1,'passenger',1,0,'passenger'])"),true);
 assert.equal(run("big.occupants.length===1&&big.occupants[0].card===luke&&other.occupants[0].card===han&&other.occupants[1].card===trooper&&state.used.length===1"),true);
});

test('a Seeker can dock and transfer to a reachable enemy ship only during its Control phase',async()=>{
 const {run}=await craftHarness();
 run(`const first=card('Light:530'),second=card('Light:1677'),seeker=card('Dark:1096'),han=card('Light:1098');
  state.game=PremiereGame.actionState(42,1);state.activeSide='Dark';state.botTurn={steps:[],index:0};
  state.light[6]=[first,second];PremiereUnits.add(first,seeker,'seeker','Dark');
  PremiereUnits.add(second,han,'pilot','Light');seeker.tableSide='Light';
  state.phase=4;`);
 assert.equal(run("seekerMoves('Dark').some(move=>move.args[2]==='dock')"),false);
 run("state.phase=1;const transfer=()=>legalActions(state,'Dark').find(action=>action.kind==='moveSeeker'&&action.args[2]==='dock');");
 assert.equal(run("!!transfer()"),true);
 assert.equal(run("performAction(transfer())"),true);
 assert.equal(run("!first.occupants.length&&second.occupants.some(entry=>entry.card===seeker&&entry.role==='seeker')&&state.botUsed.length===1"),true);
 assert.equal(run("!state.automatedPending&&state.light[6][1]===second&&state.botForce.length===4"),true);
 run('han.ability=2;findAutomatedWeapons()');
 assert.equal(run('state.lost.includes(han)&&state.botLost.includes(seeker)'),true);
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

test('the battle dialog shows facing participants, the current segment and active player',()=>{
 const {run,elements,tick}=segmentedBattleHarness();
 run('rebel.weapons=[rifle];setAutoBot(true);');
 assert.equal(run("requestAction('battle','Light',[0])"),true);
 assert.equal(elements.get('battleAnalysis').open,true);
 assert.match(elements.get('battleTitle').textContent,/Bodenkampf.*Tatooine/);
 assert.match(elements.get('battleDetails').innerHTML,/aria-current="step">Waffen<\/li>/);
 assert.match(elements.get('battleDetails').innerHTML,/battle-side light.*Rebel.*battle-side dark.*Trooper/);
 assert.match(elements.get('battlePriority').textContent,/Du bist dran/);
 assert.equal(tick(),false);
 assert.equal(run("requestAction('fireWeapon','Light',[0,0,0])"),true);
 assert.match(elements.get('battleDetails').innerHTML,/Trooper<small>Getroffen/);
 assert.match(elements.get('battleDetails').innerHTML,/Letzte Kampfaktionen.*feuert Blaster Rifle/);
 assert.match(elements.get('battlePriority').textContent,/Bot entscheidet automatisch/);
 assert.equal(tick(),true);
 assert.match(elements.get('battlePriority').textContent,/Du bist dran/);
 assert.equal(tick(),false);
});

test('game log resets each turn and the latest bot log stays readable until the next Dark turn',()=>{
 const {run}=reactHarness();
 run("state.botHistory=['Alter Bot-Eintrag'];state.log=['Alter Spielzug'];endTurn('Dark')");
 assert.match(run("state.botHistory.join(' ')"),/Alter Bot-Eintrag/);
 assert.doesNotMatch(run("state.log.join(' ')"),/Alter Spielzug|Bot beendet/);
 run("log('Light-Aktion');endTurn('Light')");
 assert.doesNotMatch(run("state.botHistory.join(' ')"),/Alter Bot-Eintrag/);
 assert.doesNotMatch(run("state.log.join(' ')"),/Light-Aktion/);
 assert.match(run("state.log.join(' ')"),/Dark Side beginnt/);
});

test('Han can pay for one replacement after revealing destiny, and only the replacement counts',()=>{
 const {run,elements}=segmentedBattleHarness();
 run(`rebel.id='Light:1098';rebel.ability=4;state.deck=[{name:'Replacement',destiny:5},{name:'First draw',destiny:1}];`);
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('destiny','Light')"),true);
 assert.equal(run("state.used.length===1&&lifeForceRemaining('Light')===7"),true);
 assert.equal(elements.get('battleAnalysis').open,true);
 assert.match(elements.get('battleResponses').innerHTML,/First draw/);
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

test('The Circle Is Now Complete pays once, applies the saber bonus and removes only the losing persona',async()=>{
 const {run,elements}=await craftHarness();
 run(`const vader=card('Dark:634'),obi=card('Light:1803'),interrupt=card('Dark:2517'),blaster=card('Dark:1264');
  setupDecks=null;state.game=PremiereGame.actionState(43,1);state.activeSide='Dark';state.botTurn={steps:botPlan(),index:2};state.phase=1;
  state.dark[2]=[vader];state.light[3]=[obi];state.botHand=[interrupt];
  vader.weapons=[blaster];obi.weapons=[card('Light:1813')];state.hand=[];`);
 assert.equal(run("requestAction('duel','Dark',[0,2])"),false);
 assert.equal(run("state.botForce.length===5&&state.botHand[0]===interrupt"),true);
 run('state.light[2]=state.light[3].splice(0);const reserveCount=state.botDeck.length;');
 assert.equal(run("requestAction('duel','Dark',[0,2])"),true);
 assert.equal(run("state.outOfPlay[0]===vader&&state.botLost.includes(blaster)&&state.botLost.includes(interrupt)"),true);
 assert.equal(run("!state.botLost.includes(vader)&&state.light[2][0]===obi&&state.botUsed.length===1&&state.botDeck.length===reserveCount&&!battleSession"),true);
 assert.equal(run("withinDeploymentLimit(card('Dark:634'),'Dark')"),false);
 assert.match(elements.get('outOfPlay').textContent,/Darth Vader/);
});

test('the duel can be played in an opposing priority window and canceled with Sense',async()=>{
 const {run}=await craftHarness();
 run(`const vader=card('Dark:634'),obi=card('Light:1803'),interrupt=card('Dark:2517'),sense=card('Light:2217');
  state.game=PremiereGame.actionState(44,1);state.phase=0;
  state.dark[2]=[vader];state.light[2]=[obi];state.botHand=[interrupt];
  state.deck=[{name:'Spare',destiny:2},{name:'Sense Destiny',destiny:1}];state.hand=[sense];
  registerDuelTiming();`);
 assert.equal(run("requestAction('duel','Dark',[0,2])"),false);
 assert.equal(run("requestAction('activate','Light',[0])&&requestAction('timingTrigger','Dark',['premiere-duel'])"),true);
 assert.equal(run("requestAction('interruptResponse','Light',[0])&&requestAction('passResponse','Dark')&&requestAction('passResponse','Light')"),true);
 assert.equal(run("state.botLost.includes(interrupt)&&state.used.includes(sense)&&!state.outOfPlay&&state.dark[2][0]===vader&&state.light[2][0]===obi"),true);
});

test('Prophetess predicts before Battle and receives exactly one reward or loss after power is decided',()=>{
 for(const predicted of ['Dark','Light']){
  const {run,elements}=segmentedBattleHarness('Dark');
  run(`const prophetess={id:'Dark:1958',name:'Prophetess',type:'Character',power:1,ability:1,forfeit:3};
   trooper.ability=1;state.dark[0].push(prophetess);
   const reward={name:'Lost card'};state.botLost=[reward];
   const randomBefore=state.game.randomState;`);
  assert.equal(run("requestAction('battle','Dark',[0])&&battleSession.segment==='initiation'"),true);
  assert.match(elements.get('battleControls').innerHTML,/Vorhersage des Bots zeigen/);
  assert.equal(run("requestAction('skipDestiny','Dark')||requestAction('battlePrediction','Light',['Light'])"),false);
  assert.equal(run(`requestAction('battlePrediction','Dark',['${predicted}'])&&battleSession.segment==='power'`),true);
  assert.equal(run("requestAction('skipDestiny','Dark')&&requestAction('skipDestiny','Light')"),true);
  assert.equal(run("battleSession.segment==='damage'"),true);
  if(predicted==='Dark'){
   assert.equal(run('state.botUsed.includes(reward)&&state.botLost.length===0&&state.game.randomState!==randomBefore'),true);
  }else{
   assert.equal(run('state.botLost.includes(reward)&&state.botLost.includes(blaster)&&state.botHand.length===0'),true);
  }
 }
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
 const {run,elements}=segmentedBattleHarness();
 run(`state.light[0]=[rebel];trooper.power=7;
  state.lostPileEffects=[{card:{name:'Eyes In The Dark'},target:'Light'}];
  const lostFromHand=state.hand[0].name;
  state.force.at(-1).name='Hidden Battle Loss';`);
 assert.equal(run("requestAction('battle','Light',[0])&&requestAction('skipDestiny','Light')&&requestAction('skipDestiny','Dark')"),true);
 assert.equal(run("requestAction('battleForceLoss','Light',['hand',0])"),true);
 assert.equal(run("requestAction('battleForfeit','Light',[0])"),false);
 assert.equal(run("requestAction('passDamage','Dark')&&requestAction('battleForfeit','Light',[0])"),true);
 assert.equal(run("!confirmedPresence('Light',0)&&battleSession.damage.debt.Light.damage===1&&battleSession.segment==='damage'"),true);
 assert.equal(run("requestAction('passDamage','Dark')&&requestAction('battleForceLoss','Light',['force'])"),true);
 assert.ok(elements.get('log').textContent.includes(run('lostFromHand')));
 assert.match(elements.get('log').textContent,/verliert eine verdeckte Karte für Battle Damage/);
 assert.doesNotMatch(elements.get('log').textContent,/Hidden Battle Loss/);
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

test('Combined Attack pays for two legally mounted weapons and applies their combined result in the chosen order',async()=>{
 const {run,elements}=await craftHarness();
 run(`const corvette=card('Light:530'),wing=card('Light:2838'),target=card('Dark:2600'),attack=card('Light:483');
  const quad=card('Light:1971'),torpedo=card('Light:1962');
  setupDecks=null;state.game=PremiereGame.actionState(47,1);state.phase=3;state.light[6]=[corvette,wing];
  target.maneuver=4;state.dark[6]=[target];corvette.weapons=[quad];wing.weapons=[torpedo];
  state.hand=[attack];state.botHand=[];state.deck=[{name:'Reserve'},{name:'First destiny',destiny:2},{name:'Second destiny',destiny:2}];`);
 assert.equal(run("requestAction('battle','Light',[6])&&battleSession.weaponTurn==='Light'"),true);
 assert.match(elements.get('battleControls').innerHTML,/Combined Attack.*Kombiniert feuern/);
 run('const remainingForce=state.force;state.force=remainingForce.slice(0,1);');
 assert.equal(run("requestAction('combinedAttack','Light',[0,0,1,0])"),false);
 run('state.force=remainingForce;');
 assert.equal(run("requestAction('combinedAttack','Light',[0,0,0,0])||requestAction('combinedAttack','Light',[0,0,0])"),false);
 assert.equal(run('state.force.length===4&&state.hand[0]===attack&&state.deck.length===3'),true);
 assert.equal(run("requestAction('combinedAttack','Light',[0,0,1,0])"),true);
 assert.equal(run("state.force.length===2&&state.used.length===5&&state.deck.length===1&&state.lost.includes(attack)"),true);
 assert.equal(run("battleSession.hitUnits.Dark[0]===target&&battleSession.usedWeapons[0]===torpedo&&battleSession.usedWeapons[1]===quad&&battleSession.weaponTurn==='Dark'"),true);
 assert.match(run('state.log.join("\\n")'),/Combined Attack 5 gegen Verteidigung 4 · Treffer/);
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
