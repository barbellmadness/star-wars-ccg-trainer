import test from 'node:test';
import assert from 'node:assert/strict';
import {battleWorksheet,lossWorksheet} from '../engine/battle-worksheet.mjs';
test('tie produces no battle damage',()=>assert.deepEqual(battleWorksheet({lightPower:5,darkPower:5}),{lightTotal:5,darkTotal:5,lightDamage:0,darkDamage:0,lightAttrition:0,darkAttrition:0}));
test('destiny contributes to power and opponent attrition',()=>assert.deepEqual(battleWorksheet({lightPower:6,darkPower:5,lightDestiny:3,darkDestiny:2}),{lightTotal:9,darkTotal:7,lightDamage:0,darkDamage:2,lightAttrition:2,darkAttrition:3}));
test('forfeit can cover damage and attrition without double-counting',()=>assert.deepEqual(lossWorksheet({forfeits:[3,2],damage:7,attrition:4}),{forfeitTotal:5,attritionCovered:true,damageRemaining:2}));
test('insufficient forfeit remains insufficient for attrition',()=>assert.equal(lossWorksheet({forfeits:[1],damage:0,attrition:3}).attritionCovered,false));
test('invalid input fails closed',()=>assert.throws(()=>battleWorksheet({lightPower:NaN,darkPower:2})));
