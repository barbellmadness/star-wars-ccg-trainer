import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './support/cloud-city-harness.mjs';
test('Binders permit multiple captives and every captive remains discoverable and detachable',()=>{
 const {run}=harness(['captives']);run(`const escort=card('Dark:287');escort.attachments=[card('Dark:243')];state.dark[0]=[escort];const luke=card('Light:1593'),obi=card('Light:1803');luke.captured=true;obi.captured=true;state.pendingCustody=[{side:'Dark',card:luke,slot:0}];resolveCustody(custodyChoices('Dark').find(choice=>choice.args[0]==='seize'));state.pendingCustody=[{side:'Dark',card:obi,slot:0}];`);
 assert.equal(run("custodyChoices('Dark').filter(choice=>choice.args[0]==='seize').length"),1);
 run("resolveCustody(custodyChoices('Dark').find(choice=>choice.args[0]==='seize'));");
 assert.equal(run('ccCaptives(escort).length'),2);assert.equal(run("PremiereLocations.entries(state,'Dark').filter(entry=>entry.captive).length"),2);
 assert.equal(run("detachTableCard('Dark',0,obi)"),true);assert.equal(run('ccCaptives(escort).length'),1);
});
test('losing Binders asks which one captive to retain and releases the others',()=>{
 const {run}=harness(['captives']);run(`const escort=card('Dark:287'),luke=card('Light:1593'),obi=card('Light:1803');luke.captured=true;obi.captured=true;state.dark[0]=[escort];ccSetCaptives(escort,[luke,obi]);hothContinuous();`);
 assert.equal(run('state.pendingCardView.mode'),'hothDagCloudBindersLost');run('finishDagobahChoice(state.pendingCardView,1);');
 assert.equal(run('escort.escortedCaptive===obi'),true);assert.equal(run('state.pendingCustody[0].card===luke'),true);
});
test('losing an escort releases ordinary captives but leaves carbonite captives unattended',()=>{
 const {run}=harness(['captives']);run(`const escort=card('Dark:287'),luke=card('Light:1593'),obi=card('Light:1803');escort.attachments=[card('Dark:243')];luke.captured=true;luke.frozen=true;obi.captured=true;state.dark[0]=[escort];ccSetCaptives(escort,[luke,obi]);loseTableCard('Dark',0,escort);`);
 assert.equal(run('state.dark[0].includes(luke)&&luke.frozen&&luke.captured'),true);
 assert.equal(run('state.pendingCustody.some(choice=>choice.card===obi&&choice.side===\'Light\')'),true);
 assert.equal(run('cardAbility(luke)'),0);
});
test('controlling Light Side can release unattended frozen captives during Control',()=>{
 const {run}=harness(['captives']);run(`const luke=card('Light:1593');luke.captured=true;luke.frozen=true;state.dark[0]=[luke];state.light[0]=[card('Light:1803')];PremiereGame.setPhase(state,1);`);
 assert.equal(run("ccActionOptions('Light').some(option=>option.mode==='cc:freeFrozen')"),true);
 run("playHothAction('Light',...ccActionOptions('Light').find(option=>option.mode==='cc:freeFrozen').args);");
 assert.equal(run('state.light[0].includes(luke)&&!luke.frozen&&!luke.captured'),true);
});
