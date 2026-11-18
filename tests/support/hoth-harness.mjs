import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const scripts=['data','game','battle','units','locations','card-rules','weapons','bot','learning','session'].map(name=>read('engine/premiere-'+name+'.js'));
const hoth=['hoth-rules','hoth-card-rules','hoth-session','hoth-interrupts','hoth-creatures','hoth-mines','hoth-timing'].map(name=>read('engine/'+name+'.js')).join('\n');
const payloads=['premiere','a-new-hope','hoth'].map(name=>JSON.parse(read('data/'+name+'.json')));
export function harness() {
 const context=vm.createContext({console,structuredClone,Math,Set,Map,publishGame(){},render(){}});
 scripts.forEach(script=>vm.runInContext(script,context));vm.runInContext(hoth,context);
 context.payloads=payloads;
 const run=(code,timeout)=>vm.runInContext(code,context,timeout?{timeout}:undefined);
 run(`catalog=payloads.flatMap((data,i)=>PremiereData.readCatalog(data,String(i+1)));
 let serial=0;
 const card=id=>{const source=catalog.find(card=>card.id===id);if(!source)throw Error('Unknown card '+id);return {...structuredClone(source),instanceId:'hoth-test-'+(++serial),owner:source.side}};
 const pile=(side='Light',count=20)=>Array.from({length:count},()=>card(side==='Light'?'Light:259':'Dark:1264'));
 const game=PremiereGame.actionState(100,7);game.cardRulesVersion=31;game.playerSide='Light';
 state=PremiereGame.createState(game,[],[],['Light:5586','Light:5591','Light:5582','Light:5590','Dark:6354','Light:1169','Dark:6359'].map(card),[5,0,1,2,3,4,6],'Light');
 state.force=pile();state.botForce=pile('Dark');state.deck=pile();state.botDeck=pile('Dark');
 PremiereGame.setPhase(state,2);`);
 return {run,set(name,value){context[name]=value;}};
}
