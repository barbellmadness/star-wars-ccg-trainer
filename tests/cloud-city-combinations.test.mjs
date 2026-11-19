import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Cloud City interrupts remain available in a real destiny-response window',()=>{
 const {run}=harness();run(`state.hand=[card('Light:1042')];const luke=card('Light:1593');luke.weapons=[card('Light:109')];state.cloudCityDuel={participants:{Light:[luke],Dark:[]}};const window=PremiereGame.openResponse(state.game,{kind:'destiny',side:'Dark',purpose:'cloudCityDuel',draw:{card:card('Dark:1264'),value:4,cancelled:false},site:0});`);
 assert.equal(run("legalActions(state,'Light').some(action=>action.kind==='interruptResponse'&&action.card?.id==='Light:1042')"),true);
});
test('Abyss recognizes the opposite-side Lando by title and resolves before optional destiny responses',()=>{
 const {run}=harness();run(`const lando=card('Dark:1465'),drawn=card('Light:1466');state.dark[0]=[lando];state.tableEffects=[{card:card('Dark:48'),target:'Dark'}];state.deck=[drawn];let result=null;drawDestinySeries('Light','test',1,0,draws=>{result=draws;});`);assert.equal(run('state.pendingCardView.mode'),'hothDagCloudChasm');run("finishDagobahChoice(state.pendingCardView,'character')");assert.equal(run('result[0].value'),0);assert.equal(run('state.lost.includes(drawn)'),true);assert.equal(run('state.used.includes(drawn)'),false);assert.equal(run('state.botLost.includes(lando)'),true);
});
test('Boba Fett increases the Bounty reward only when the original seizing hunter delivers',()=>{
 for(const same of [true,false]){const {run}=harness();run(`const boba=card('Dark:287'),other=card('Dark:308'),captive=card('Light:1593'),source=card('Dark:316');captive.captured=true;captive.imprisoned=true;captive.cloudCitySeizedByBounty=${same?'boba':'other'}.instanceId;captive.attachments=[source];state.dark[0]=[captive,boba];state.botLost=pile('Dark',20);state.tableEffects=[{card:source,host:captive,target:captive}];const initial=state.botLost.length;ccCaptiveReward(captive,boba,0);`);assert.equal(run('initial-state.botLost.length'),same?run('captive.forfeit+3'):0);}
});
test('Frozen captives cannot be interrogated or used as Human Shield targets',()=>{
 const {run}=harness();run(`const captive=card('Light:1593'),escort=card('Dark:287');captive.captured=true;captive.frozen=true;escort.escortedCaptive=captive;state.dark[0]=[escort];state.botHand=[card('Dark:73'),card('Dark:2306'),card('Dark:1188')];const shot={weapon:card('Light:1603'),host:card('Light:360'),target:escort};`);assert.equal(run("ccInterruptOptions('Dark').filter(option=>option.mode==='cc:forceLoss').length"),0);assert.equal(run("ccInterruptOptions('Dark',{kind:'cloudCityWouldHit',side:'Light',site:0,shot}).some(option=>option.mode==='cc:shieldHit')"),false);
});
test('Lando conversion replaces the Dark version while normal duplicate deployment is prohibited',()=>{
 const {run}=harness();run(`const dark=card('Dark:1465'),light=card('Light:1466');state.dark[0]=[dark];state.hand=[light];`);assert.equal(run("withinDeploymentLimit(light,'Light')"),false);assert.equal(run("ccActivatedOptions('Light').some(option=>option.mode==='cc:convertLando')"),true);
});
test('Projective Telepathy can answer Anger, Fear, Aggression at reveal without a generic table cancel',()=>{
 const {run}=harness();run(`const insert=card('Light:111');insert.insertedIntoReserveBy='Light';state.botDeck=[card('Dark:1264'),insert];state.botHand=[card('Dark:1957')];let done=false;dagoResolveTop('Dark',()=>{done=true;});const window=PremiereGame.responseWindow(state.game);`);assert.equal(run('window.kind'),'cloudCityAngerReveal');assert.equal(run("ccInterruptOptions('Dark',window).some(option=>option.mode==='cc:cancel')"),true);
});
