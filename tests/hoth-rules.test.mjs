import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Hoth from '../engine/hoth-rules.js';
import Data from '../engine/premiere-data.js';
import Units from '../engine/premiere-units.js';

const catalog=Data.readCatalog(JSON.parse(readFileSync(new URL('../data/hoth.json',import.meta.url))),'3');
const card=id=>structuredClone(catalog.find(card=>card.id===id));
const position=()=>({locations:['Light:5586','Light:5591','Light:5582','Light:5590','Dark:6354','Light:1169','Dark:6359'].map(card),light:Array.from({length:7},()=>[]),dark:Array.from({length:7},()=>[])});

test('Hoth shield covers Echo and markers 1–3, never the fourth marker or Wampa Cave',()=>{
 const state=position();
 assert.deepEqual(state.locations.map((_,i)=>Hoth.shielded(state,i)),[true,true,true,false,false,true,false]);
 state.locations[0].blownAway=true;
 assert.ok(state.locations.every((_,i)=>!Hoth.shielded(state,i)));
});
test('Hoth shield follows an associated vehicle interior but does not loop on invalid host links',()=>{
 const state=position(),walker=card('Dark:267');walker.instanceId=10;state.dark[1]=[walker];
 state.locations.push({hostInstanceId:10,type:'Location',subType:'Site',name:'Blizzard 1: Interior'});
 assert.equal(Hoth.shielded(state,7),true);state.dark[3]=state.dark[1];state.dark[1]=[];
 assert.equal(Hoth.shielded(state,7),false);
});
test('Hoth shield allows ground assault and equipment but blocks Dark deploy, shuttle and relocation',()=>{
 const state=position();
 for(const id of ['Dark:2295','Dark:267','Dark:2657'])assert.equal(Hoth.canDeploy(state,'Dark',card(id),1),false);
 for(const id of ['Dark:2737','Dark:158','Dark:986'])assert.equal(Hoth.canDeploy(state,'Dark',card(id),1),true);
 assert.equal(Hoth.canDeploy(state,'Light',card('Light:807'),1),true);
 for(const kind of ['Landen','Starten','Shuttle','Docking-Bay-Transit','Elis Helrot'])assert.equal(Hoth.canTravel(state,'Dark',3,1,kind),false);
 assert.equal(Hoth.canTravel(state,'Dark',3,1,'Landspeed'),true);
 assert.equal(Hoth.canTravel(state,'Light',3,1,'Landen'),true);
});
test('Main Power Generators requires an existing marker 4–6 or North Ridge in Reserve',()=>{
 const generator=card('Light:5586'),ridge=card('Light:5590');
 assert.equal(Hoth.generatorPlan([generator],[]).allowed,false);
 assert.deepEqual(Hoth.generatorPlan([generator],[card('Light:807'),ridge]),{allowed:true,search:true,index:1});
 assert.deepEqual(Hoth.generatorPlan([generator,card('Dark:6354')],[]),{allowed:true,search:false});
 assert.equal(Hoth.generatorPlan([generator,card('Dark:6359')],[]).allowed,false);
});
test('Ice Storm advances through actual marker order, turns at the innermost, and leaves past the outermost',()=>{
 const state=position();
 assert.deepEqual(Hoth.stormStep(state,6),{slot:4,direction:-1});
 assert.deepEqual(Hoth.stormStep(state,0,-1),{slot:1,direction:1});
 assert.deepEqual(Hoth.stormStep(state,6,1),{lost:true});
});
test('Hoth search counts scouts twice, matching Rogue 2 pilots and sensor arrays',()=>{
 const state=position(),scout=card('Light:2045'),pilot=card('Light:2911'),rogue=card('Light:2120');
 rogue.occupants=[{card:pilot,role:'pilot'}];state.light[1]=[scout,rogue];
 assert.equal(Hoth.searchBonus(state,'Light',1,[scout,pilot]),5);
 const droid=card('Light:2004');droid.attachments=[card('Light:1990')];state.light[1].push(droid);
 assert.equal(Hoth.searchBonus(state,'Light',1,[scout,pilot]),8);
 assert.equal(Hoth.searchBonus(state,'Light',1,[scout]),5);
});
test('Hoth combat vehicles require pilots, use combat pilot bonuses and cap AT-AT landspeed',()=>{
 const walker=card('Dark:267'),driver=card('Dark:160');
 assert.equal(Units.stats(walker,null).powered,false);
 assert.equal(Units.accepts(walker,driver,'driver'),false);
 assert.equal(Units.accepts(walker,driver,'pilot'),true);
 Units.add(walker,driver,'pilot','Dark');
 assert.equal(Units.stats(walker,null,{activePilotText:true}).power,walker.power+3);
 assert.equal(Units.stats(walker,null).ability,driver.ability);
 walker.landspeed=3;assert.equal(Units.stats(walker,null).landspeed,1);
 walker.crashed=true;assert.equal(Units.stats(walker,null).powered,false);
 assert.equal(Units.enclosed(walker),true);
});
test('Hoth matching vehicle pilots add maneuver and permanent pilots allow empty vehicles to function',()=>{
 const rogue=card('Light:2119'),luke=card('Light:498');Units.add(rogue,luke,'pilot','Light');
 const stats=Units.stats(rogue,null,{activePilotText:true});
 assert.equal(stats.power,rogue.power+3);assert.equal(stats.maneuver,rogue.maneuver+2);
 const scout=card('Dark:272');assert.equal(Units.stats(scout,Data.permanentPilotAbility(scout)).powered,true);
 const tauntaun=card('Light:2480');assert.equal(Units.stats(tauntaun,null).powered,true);
 assert.equal(Units.accepts(tauntaun,luke,'passenger'),true);
});
test('Hoth gunners apply individual passenger bonuses with the matching maximum',()=>{
 const rogue=card('Light:2119');rogue.occupants=[{card:card('Light:595'),role:'passenger'},{card:card('Light:2126'),role:'passenger'}];
 assert.equal(Hoth.crewWeaponBonus(rogue),4);rogue.occupants[0].role='pilot';assert.equal(Hoth.crewWeaponBonus(rogue),1);
});

test('Hoth pilot and droid modifiers do not stack copies of the same title',()=>{
 const walker=card('Dark:267');Units.add(walker,card('Dark:160'),'pilot','Dark');Units.add(walker,card('Dark:160'),'pilot','Dark');
 assert.equal(Units.stats(walker,null,{activePilotText:true}).power,walker.power+3);
 const ship=card('Light:1665');Units.add(ship,card('Light:2004'),'passenger','Light');Units.add(ship,card('Light:2004'),'passenger','Light');
 assert.equal(Units.stats(ship,1,{activePilotText:true}).power,ship.power+1);assert.equal(Units.stats(ship,1,{activePilotText:true}).hyperspeed,ship.hyperspeed+1);
 const tyrant=card('Dark:2657');Units.add(tyrant,card('Dark:1521'),'pilot','Dark');assert.equal(Units.stats(tyrant,1,{activePilotText:true}).power,tyrant.power+2);
 const rogue=card('Light:2119');rogue.occupants=[{card:card('Light:2126'),role:'passenger'},{card:card('Light:2126'),role:'passenger'}];assert.equal(Hoth.crewWeaponBonus(rogue),1);
});
