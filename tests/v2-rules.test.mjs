import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../v2.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!js)throw Error('V2 script missing');
function harness(){
 const elements=new Map();
 const document={getElementById(id){if(!elements.has(id))elements.set(id,{value:'',checked:true,style:{},innerHTML:'',textContent:'',scrollIntoView(){}});return elements.get(id)}};
 const context=vm.createContext({document,console,Math,Number,String,Array,RegExp,Set,fetch:async()=>({ok:false}),Error});
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
test('movement fails closed for different planets and nonadjacent sites',()=>{
 const {run}=harness();
 run("state={locations:[{name:'Tatooine: A',type:'Location',subType:'Site'},{name:'Hoth: B',type:'Location',subType:'Site'},{name:'Tatooine: C',type:'Location',subType:'Site'}]};");
 assert.equal(run("samePlanetAdjacent(0,1)"),false);
 assert.equal(run("samePlanetAdjacent(0,2)"),false);
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
 run("state={locations:[{name:'Tatooine: Mos Eisley',type:'Location',subType:'Site'},null],force:[],light:[[],[]],dark:[[],[]]};");
 assert.equal(run("checkDeployment({name:'Tatooine: Mos Eisley',type:'Location'},null)"),false);
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
 run("state={turn:1,phase:0,activeSide:'Dark',activated:false,botTurn:{steps:[],index:0},locations:[{name:'Hoth: A',icons:{light:2,dark:0}}],light:[[]],dark:[[{name:'Imperial',ability:1,power:1}]],drainedSitesThisTurn:[],pendingForceLoss:null,gameWinner:null,deck:[{name:'Reserve L'}],force:[{name:'Force L'}],used:[],hand:[{name:'Hand L'}],lost:[],botDeck:[{name:'Reserve D'}],botForce:[],botUsed:[],botHand:[],botLost:[],log:[],botHistory:[],botReason:''};");
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
 run("state={locations:[{name:'Hoth: A',type:'Location',subType:'Site',icons:{light:1,dark:0}},{name:'Hoth: B',type:'Location',subType:'Site',icons:{light:0,dark:2}}],force:[{}],botForce:[{}],light:[[],[]],dark:[[],[]],botHand:[{name:'Stormtrooper',side:'Dark',type:'Character',deploy:1}]};");
 assert.equal(run("botCharacterDeployOptions().length"),1);
 assert.equal(run("botCharacterDeployOptions()[0].siteIndex"),1);
 run("state.locations[1].icons.dark=0");
 assert.equal(run("botCharacterDeployOptions().length"),0);
 run("state.botHand[0].characteristics=['spy']");
 assert.equal(run("botCharacterDeployOptions().length"),2);
 run("state.botForce=[]");
 assert.equal(run("botCharacterDeployOptions().length"),0);
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
 assert.equal(run("botPlan().map(s=>s.kind).join(',')"),'activate,control,deploy,move,draw,finish');
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
