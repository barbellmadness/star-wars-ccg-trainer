import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Slave I only accepts bounty hunters as pilots and gets Boba matching maneuver and immunity',()=>{
 const {run}=harness(['units']);run("const ship=card('Dark:2278'),boba=card('Dark:287'),pilot=card('Dark:1029');state.dark[2]=[ship];");
 assert.equal(run("PremiereUnits.accepts(ship,pilot,'pilot')"),false);assert.equal(run("PremiereUnits.accepts(ship,boba,'pilot')"),true);
 run("PremiereUnits.add(ship,boba,'pilot','Dark');battleSession={site:2,participants:{Light:[],Dark:[ship]},excluded:{Light:[],Dark:[]}};");assert.equal(run('craftStats(ship,2).maneuver'),run('ship.maneuver+2'));assert.equal(run("battleImmunity('Dark',ship,2)"),5);
});
test('Captain Han matches Falcon while Lando gets the printed extra Falcon power',()=>{
 const {run}=harness(['units']);run("const ship=card('Light:1677'),han=card('Light:360'),lando=card('Light:1466');state.light[2]=[ship];PremiereUnits.add(ship,han,'pilot','Light');");
 assert.equal(run('craftStats(ship,2).maneuver'),run('ship.maneuver+2'));assert.equal(run('PremiereUnits.matchingBattleDestiny(ship,han,true)'),true);
 run("ship.occupants=[];PremiereUnits.add(ship,lando,'pilot','Light');");assert.equal(run('craftStats(ship,2).power'),run('ship.power+3'));
});
test('Captain Han adds a destiny even when the Falcon already qualifies to draw normally',()=>{
 const {run}=harness();run(`const ship=card('Light:1677'),han=card('Light:360');state.light[2]=[ship];PremiereUnits.add(ship,han,'pilot','Light');battleSession={site:2,initiator:'Light',participants:{Light:[ship],Dark:[]},excluded:{Light:[],Dark:[]},extraDraws:{Light:0,Dark:0}};`);
 assert.equal(run("battleDestinyDrawCount('Light',2,3)"),1);assert.equal(run("battleDestinyDrawCount('Light',2,6)"),2);
});
test('Cloud City troops are restricted on deployment, and Dainsom cannot move',()=>{
 const {run}=harness(['units']);run("const troop=card('Light:436'),guard=card('Dark:1287');");assert.equal(run('ccCharacterDeployAllowed(troop,state.locations[0],\'Light\')'),true);
 assert.equal(run("ccCharacterDeployAllowed(troop,card('Light:2447'),'Light')"),false);assert.match(run('movementRestriction(guard)'),/Dainsom/);
});
test('Bright Hope follows fighter landing without becoming a normal starfighter card',()=>{
 const {run}=harness(['units']);run("const ship=card('Light:332');state.light[2]=[ship];");assert.equal(run("PremiereUnits.fighter(ship)"),false);
 assert.equal(run("travelOptions(ship,'Light',2,1).length"),1);assert.equal(run("PremiereUnits.accepts(ship,card('Light:1593'),'passenger')"),true);
});
