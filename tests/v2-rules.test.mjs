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
 assert.equal(run("botBoardDeployOptions().length"),1);
 assert.equal(run("botBoardDeployOptions()[0].siteIndex"),1);
 run("state.locations[1].icons.dark=0");
 assert.equal(run("botBoardDeployOptions().length"),0);
 run("state.botHand[0].characteristics=['spy']");
 assert.equal(run("botBoardDeployOptions().length"),2);
 run("state.botForce=[]");
 assert.equal(run("botBoardDeployOptions().length"),0);
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
 assert.match(elements.get('setupOptions').innerHTML,/Starterdecklisten und Kartenabdeckung/);
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
 // Choose the first available bot location each round without changing the host Math object.
 run('Math=Object.create(Math);Math.random=()=>0;start()');
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
   assert.match(elements.get('setupOptions').innerHTML,/chooseStart\(null\)/);
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
 assert.match(run('renderPlaymatColumn(state.locations[0],0)'),/equipSelectedWeapon\(0,0\)/);
 assert.doesNotMatch(run('renderPlaymatColumn(state.locations[0],0)'),/equipSelectedWeapon\(0,1\)/);
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
 assert.match(elements.get('battleControls').innerHTML,/fireBattleWeapon\('Light',0,0,0\)/);
 assert.doesNotMatch(elements.get('battleControls').innerHTML,/Light Battle Destiny ziehen/);
 assert.equal(run("fireBattleWeapon('Dark',0,0,0)"),false);
 assert.equal(run("fireBattleWeapon('Light',0,0,9)"),false);
 assert.equal(run('state.force.length===4&&state.deck.length===2'),true);
 run("skipDestiny('Light')");
 assert.equal(run('battleSession.lightCard'),null);
 assert.equal(run("fireBattleWeapon('Light',0,0,0)"),true);
 assert.equal(run("battleSession.weaponHits.Dark.includes(0)&&state.used.at(-1).name==='Weapon draw'"),true);
 assert.equal(run("battleTotals(0).darkPower===3&&battleSession.darkCard===null"),true);
 assert.match(elements.get('battleControls').innerHTML,/botWeaponDecision\(\)/);
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
 assert.equal(run("boardDeployCost(ship,dock,'Light')"),null);
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
 run("state={phase:0,locations:[{name:'Hoth: Echo Base',image:'https://res.starwarsccg.org/cards/example.gif'}],light:[[{name:'Rebel'}]],dark:[[{name:'Trooper'}]],hand:[],force:[],botTurn:null};");
 const content=run("renderPlaymatColumn(state.locations[0],0)");
 assert.ok(content.indexOf('DARK · 1')<content.indexOf('Location-Karte: Hoth: Echo Base'));
 assert.ok(content.indexOf('Location-Karte: Hoth: Echo Base')<content.indexOf('LIGHT · 1'));
 assert.match(content,/onclick="play\(/);
 assert.match(content,/onclick="battleAnalysis\(/);
});

test('location art opens a detailed card inspector without changing game state',()=>{
 const {run,elements}=harness();
 run("state={locations:[{name:'Tatooine: Mos Eisley',type:'Location',subType:'Site',image:'https://res.starwarsccg.org/cards/test.gif',icons:{light:1,dark:2},gametext:'Some location effect'}],light:[[]],dark:[[]],phase:0,hand:[],force:[],botTurn:null};");
 const markup=run("renderPlaymatColumn(state.locations[0],0)");
 assert.match(markup,/onclick="inspectLocation\(0\)"/);
 assert.equal(run("inspectLocation(0)"),true);
 assert.match(elements.get('cardInspectorBody').innerHTML,/Tatooine: Mos Eisley/);
 assert.match(elements.get('cardInspectorBody').innerHTML,/Force-Icons · Light 1 \/ Dark 2/);
 assert.match(elements.get('cardInspectorBody').innerHTML,/Some location effect/);
 assert.equal(run("state.locations[0].name"),'Tatooine: Mos Eisley');
 assert.equal(run("inspectLocation(9)"),false);
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
 run("play(0,1)");
 assert.equal(run("state.locations.length"),3);
 assert.equal(run("state.locations[2]===null"),true);
 assert.equal(run("state.light.length"),3);
 run("play(0,2)");
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
test('Location deploy rejects duplicate, occupied slot and wrong player phase',()=>{
 const {run}=harness();
 run("state={phase:2,activeSide:'Light',locations:[{name:'Hoth: A',type:'Location',subType:'Site'},null],light:[[],[]],dark:[[],[]],hand:[{name:'Hoth: A',type:'Location'},{name:'Hoth: B',type:'Location'}],log:[]};");
 assert.equal(run("deployLocationFromHand('Light',0,1)"),false);
 assert.equal(run("deployLocationFromHand('Light',1,0)"),false);
 assert.equal(run("deployLocationFromHand('Dark',1,1)"),false);
 assert.equal(run("state.locations.length"),2);
 assert.equal(run("deployLocationFromHand('Light',1,1)"),true);
 assert.equal(run("state.locations.length"),3);
});
