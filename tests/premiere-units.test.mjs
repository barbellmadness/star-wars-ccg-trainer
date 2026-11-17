import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const PremiereUnits = require('../engine/premiere-units.js');

function shipWithPilot({id, power, maneuver, pilot, subType='Starfighter: X-Wing'}) {
  return {id, type:'Starship', subType, power, maneuver, hyperspeed:5,
    occupants:[{role:'pilot',card:pilot}]};
}

test('cancelled Biggs text removes Red 3 power and maneuver bonuses without dismissing its pilot', () => {
  const biggs={id:'Light:239', type:'Character', pilot:true, ability:2,
    gametext:'Adds 2 to power of anything he pilots. When piloting Red 3, also adds 1 to maneuver and draws one battle destiny if not able to otherwise.'};
  const red3=shipWithPilot({id:'Light:2060',power:3,maneuver:4,pilot:biggs});
  assert.equal(PremiereUnits.stats(red3,null).power,5);
  assert.equal(PremiereUnits.stats(red3,null).maneuver,5);
  biggs.gameTextCancelled=true;
  const suppressed=PremiereUnits.stats(red3,null);
  assert.equal(suppressed.power,3);
  assert.equal(suppressed.maneuver,4);
  assert.equal(suppressed.ability,2, 'pilot ability is independent of canceled game text');
  assert.equal(suppressed.powered,true, 'the ship remains piloted');
  delete biggs.gameTextCancelled;
  assert.equal(PremiereUnits.stats(red3,null).power,5);
});

test('cancelled Vader text removes special Vader\'s Custom TIE bonuses', () => {
  const vader={id:'Dark:634',type:'Character',pilot:true,ability:6,
    gametext:'Adds 3 to power of anything he pilots (or 4 to power and 3 to maneuver if Vader\'s Custom TIE).'};
  const tie=shipWithPilot({id:'Dark:2700',power:2,maneuver:4,pilot:vader,subType:'Starfighter: TIE Advanced x1'});
  assert.equal(PremiereUnits.stats(tie,null).power,6);
  assert.equal(PremiereUnits.stats(tie,null).maneuver,7);
  vader.gameTextCancelled=true;
  const suppressed=PremiereUnits.stats(tie,null);
  assert.equal(suppressed.power,2);
  assert.equal(suppressed.maneuver,4);
  assert.equal(suppressed.ability,6);
});

test('canceled Lieutenant Tanbris text removes both its power bonus and maneuver penalty', () => {
  const tanbris={id:'Dark:1539',type:'Character',pilot:true,ability:2,
    gametext:'Adds 2 to power of anything he pilots. Subtracts 1 from maneuver of any starfighter he pilots.'};
  const tie=shipWithPilot({id:'Dark:247',power:2,maneuver:4,pilot:tanbris,subType:'Starfighter: TIE Fighter'});
  assert.equal(PremiereUnits.stats(tie,null).power,4);
  assert.equal(PremiereUnits.stats(tie,null).maneuver,3);
  tanbris.gameTextCancelled=true;
  assert.equal(PremiereUnits.stats(tie,null).power,2);
  assert.equal(PremiereUnits.stats(tie,null).maneuver,4);
});
