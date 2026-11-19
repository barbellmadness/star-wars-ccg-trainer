import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const scripts=['data','game','battle','units','locations','card-rules','weapons','bot','learning','session'].map(name=>read('engine/premiere-'+name+'.js'));
const hoth=['hoth-rules','hoth-card-rules','hoth-session','hoth-interrupts','hoth-creatures','hoth-mines','hoth-timing'].map(name=>read('engine/'+name+'.js')).join('\n');
const dagobah=['rules','card-rules','session','jedi','space','creatures','units','effects','weapons','locations','interrupts','timing','abilities','passives'].map(name=>read('engine/dagobah-'+name+'.js')).join('\n');
const payloads=['premiere','a-new-hope','hoth','dagobah'].map(name=>JSON.parse(read('data/'+name+'.json')));
export function harness() {
 const context=vm.createContext({console,structuredClone,Math,Set,Map,publishGame(){},render(){}});
 scripts.forEach(script=>vm.runInContext(script,context));vm.runInContext(hoth,context);vm.runInContext(dagobah,context);
 context.payloads=payloads;
 const run=(code,timeout)=>vm.runInContext(code,context,timeout?{timeout}:undefined);
 run(`catalog=payloads.flatMap((data,i)=>PremiereData.readCatalog(data,String(i+1)));
 let serial=0;
 const card=id=>{const source=catalog.find(card=>card.id===id);if(!source)throw Error('Unknown card '+id);return {...structuredClone(source),instanceId:'hoth-test-'+(++serial),owner:source.side}};
 const pile=(side='Light',count=20)=>Array.from({length:count},()=>card(side==='Light'?'Light:259':'Dark:1264'));
 const game=PremiereGame.actionState(100,7);game.cardRulesVersion=32;game.playFormat=DagobahRules.FORMAT;game.playerSide='Light';
 state=PremiereGame.createState(game,[],[],['Light:5586','Light:5590','Light:597','Light:598','Light:602','Light:600','Light:601','Light:603','Dark:599'].map(card),[0,1,2,3,4,5,6,7,8],'Light');
 state.force=pile();state.botForce=pile('Dark');state.deck=pile();state.botDeck=pile('Dark');
 PremiereGame.setPhase(state,2);`);
 return {run,set(name,value){context[name]=value;}};
}
