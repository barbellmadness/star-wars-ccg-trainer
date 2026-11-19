import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('perfect Sabacc beats wild cards immediately, doubles stakes and preserves normal hands',()=>{
 const {run}=harness(['sabacc']);run(`const lando=card('Light:1466');state.light[0]=[lando];state.deck=[{...card('Light:428'),destiny:6},{...card('Light:259'),destiny:5}];state.botDeck=[card('Dark:1465'),card('Dark:427')];state.hand=[card('Light:244')];let completed=false;ccStartSabacc('Light',card('Light:433'),lando,()=>completed=true);`);
 assert.equal(run("state.pendingCardView.mode"),'hothDagCloudSabaccReveal');
 run("finishDagobahChoice(state.pendingCardView,'done');");
 assert.equal(run('completed'),true);assert.equal(run('state.cloudCitySabacc'),undefined);
 assert.equal(run('state.hand[0].id'),'Light:244');assert.equal(run("state.used.some(card=>card.id==='Dark:427'&&card.owner==='Light')"),true);
 assert.equal(run("state.botLost.some(card=>card.id==='Dark:1465')"),true);
});
test('ordinary Sabacc alternates draws, respects passing and reveals only after both finish',()=>{
 const {run}=harness(['sabacc']);run(`const lando=card('Light:1466');state.light[0]=[lando];state.deck=Array.from({length:8},()=>({...card('Light:259'),destiny:3}));state.botDeck=Array.from({length:8},()=>({...card('Dark:1264'),destiny:2}));let complete=false;ccStartSabacc('Light',card('Light:433'),lando,()=>complete=true);`);
 assert.equal(run('state.pendingCardView.side'),'Dark');assert.equal(run('state.pendingCardView.shown.length'),2);
 run("finishDagobahChoice(state.pendingCardView,'draw');");assert.equal(run('state.pendingCardView.side'),'Light');
 run("finishDagobahChoice(state.pendingCardView,'pass');");assert.equal(run('state.pendingCardView.side'),'Dark');
 run("finishDagobahChoice(state.pendingCardView,'pass');");assert.equal(run('state.pendingCardView.mode'),'hothDagCloudSabaccLando');
 run('finishDagobahChoice(state.pendingCardView,0);');assert.equal(run('state.pendingCardView.publicView'),true);
 run("finishDagobahChoice(state.pendingCardView,'done');");assert.equal(run('state.pendingCardView.side'),'Light');
 run('finishDagobahChoice(state.pendingCardView,0);');assert.equal(run('complete'),true);
});
