import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/dagobah-harness.mjs';

test('Dagobah weapons mount only on their printed bearers and charge the correct cost',()=>{
 const {run}=harness();
 for(const [weapon,host,cost] of [['Dark:11','Dark:9',0],['Dark:312','Dark:308',2],['Dark:704','Dark:700',1],['Dark:1249','Dark:1245',0],['Dark:1251','Dark:1245',1],['Dark:1961','Dark:2598',0],['Dark:2915','Dark:2912',0]])assert.equal(run(`weaponDeployCost(card('${weapon}'),card('${host}'))`),cost,weapon);
 assert.equal(run(`weaponDeployCost(card('Dark:1961'),card('Dark:2597'))`),null);
 assert.equal(run(`weaponDeployCost(card('Dark:1249'),card('Dark:490'))`),null);
});
test('Neural Inhibitor cannot target a droid and sets all affected stats to zero until the deadline',()=>{
 const {run}=harness();
 run(`const ig=card('Dark:1245'),victim=card('Light:2304'),weapon=card('Dark:1249');state.dark[0]=[ig];state.light[0]=[victim];`);
 assert.equal(run(`weaponShot(weapon,ig,card('Light:343'),2)`),null);
 run(`dagoResolveWeapon('Dark',{...weaponShot(weapon,ig,victim,6),weapon,host:ig,target:victim,from:0,targetSlot:0},8,[{card:card('Dark:1264'),value:7}],()=>{});`);
 assert.equal(run(`cardForfeitValueAt(victim,'Light',0)`),0);
 assert.equal(run(`victim.power+cardPowerModifier(victim,'Light',0)`),0);
 assert.equal(run(`dagoMoveAllowed('Light',victim,0,1,'Landspeed')`),false);
 assert.equal(run(`dagoMoveAllowed('Light',victim,0,1,'shuttle')`),true);
 run(`state.game.timing.turn=victim.dagobahNeuralUntil+1;`);
 assert.ok(run(`cardForfeitValueAt(victim,'Light',0)>0`));
});
test('Mortar Gun loses its bearer on zero and lets its controller select exactly one matching-destiny card',()=>{
 const {run}=harness();
 run(`const bossk=card('Dark:308'),gun=card('Dark:312'),a=card('Light:2304'),b=card('Light:807');a.destiny=3;b.destiny=3;bossk.weapons=[gun];state.dark[0]=[bossk];state.light[0]=[a,b];let completed=0;const shot={weapon:gun,host:bossk,target:a,from:0,targetSlot:0,effect:'dagobahMortar'};dagoResolveWeapon('Dark',shot,3,[{card:card('Dark:1264'),value:3}],()=>completed++);`);
 assert.equal(run(`state.pendingCardView.side`),'Dark');
 assert.equal(run(`state.lost.length`),0);
 run(`finishDagobahChoice(state.pendingCardView,0);`);
 assert.equal(run(`state.lost.length`),1);
 assert.equal(run(`completed`),1);
 run(`dagoResolveWeapon('Dark',shot,0,[{card:card('Dark:1264'),value:0}],()=>completed++);`);
 assert.equal(run(`state.botLost.includes(bossk)&&state.botLost.includes(gun)`),true);
 assert.equal(run(`completed`),2);
});
test('Pulse Cannon zero weakens a target without hitting it and a successful IG-88 shot permits assassination',()=>{
 const {run}=harness();
 run(`const ig=card('Dark:1245'),gun=card('Dark:1251'),victim=card('Light:2304');state.dark[0]=[ig];state.light[0]=[victim];battleSession={site:0,hitUnits:{Light:[],Dark:[]},zeroForfeit:[],weaponHits:{Light:[],Dark:[]},lightLoss:[],darkLoss:[],weaponResults:[]};const shot={weapon:gun,host:ig,target:victim,from:0,targetSlot:0,effect:'dagobahPulse',defense:6};dagoResolveWeapon('Dark',shot,-1,[{card:card('Dark:1264'),value:0}],()=>{});`);
 assert.equal(run(`cardForfeitValueAt(victim,'Light',0)`),run(`victim.forfeit-1`));
 assert.equal(run(`battleSession.hitUnits.Light.length`),0);
 run(`dagoResolveWeapon('Dark',shot,8,[{card:card('Dark:1264'),value:9}],()=>{});`);
 assert.equal(run(`battleSession.hitUnits.Light.includes(victim)`),true);
 assert.ok(run(`dagoUnitOptions('Dark').some(option=>option.mode==='dago:assassinate')`));
});
test('Carbine on Dengar zeros forfeit, Concussion Rifle respects the two-site exterior range',()=>{
 const {run}=harness();
 assert.equal(run(`weaponShot(card('Dark:704'),card('Dark:700'),card('Light:807'),1).effect`),'zero');
 assert.equal(run(`weaponShot(card('Dark:704'),card('Dark:308'),card('Light:807'),1).effect`),'hit');
 run(`state.locationOrder=[3,4,5,6,7,0,1,2,8];`);
 assert.equal(run(`hothWeaponInRange(card('Dark:11'),3,5)`),true);
 assert.equal(run(`hothWeaponInRange(card('Dark:11'),3,6)`),false);
});
test('Proton Bombs in a bombing run lose matching characters, ships and vehicles on both sides',()=>{
 const {run}=harness();
 run(`const bomber=card('Dark:2598'),bombs=card('Dark:1961'),victim=card('Light:2304'),other=card('Dark:308');victim.destiny=2;other.destiny=2;bomber.destiny=1;bomber.dagobahBombingRun=2;state.dark[0]=[bomber,other];state.light[0]=[victim];dagoResolveWeapon('Dark',{weapon:bombs,host:bomber,target:victim,from:0,targetSlot:0,effect:'dagobahBombs'},2,[{card:card('Dark:1264'),value:2}],()=>{});`);
 assert.equal(run(`state.lost.includes(victim)&&state.botLost.includes(other)`),true);
 assert.equal(run(`state.dark[0].includes(bomber)`),true);
});
