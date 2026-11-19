import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Cloud City blasters can only deploy on warriors at city sites',()=>{
 const {run}=harness(['weapons']);run("const warrior=card('Light:1593'),gun=card('Light:428');state.light[0]=[warrior];");assert.equal(run('weaponDeployCost(gun,warrior)'),2);
 run("state.light[0]=[];state.locations[0]=card('Light:2447');state.light[0]=[warrior];");assert.equal(run('weaponDeployCost(gun,warrior)'),null);
});
test('Luke pistol and Boba rifle use distinct matching costs and bonuses',()=>{
 const {run}=harness(['weapons']);run("const luke=card('Light:2304'),boba=card('Dark:287'),warrior=card('Dark:2355'),pistol=card('Light:1603'),rifle=card('Dark:293');");
 assert.equal(run('weaponDeployCost(pistol,luke)'),1);assert.equal(run('weaponDeployCost(pistol,warrior)'),3);assert.equal(run('weaponDeployCost(rifle,boba)'),1);assert.equal(run('weaponDeployCost(rifle,warrior)'),null);
 assert.equal(run('weaponShot(pistol,luke,warrior,1).bonus'),1);run('battleSession={usedWeapons:[rifle]};');assert.equal(run('weaponShot(rifle,boba,luke,4).cost'),1);
});
test('cloud cars are targeted as starfighters while at cloud sectors',()=>{
 const {run}=harness(['weapons']);run("const car=card('Dark:425'),ship=card('Light:2838'),character=card('Light:1593');state.dark[2]=[car];");
 assert.equal(run("weaponShot(card('Light:1603'),character,car,4)"),null);
 assert.ok(run("weaponShot(card('Light:1962'),ship,car,4)"));
});
