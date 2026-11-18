import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const collectorRevision = '65cd150d20634447a5499d763ac324436158c7a8';
const hashes = {Light:'bff27dcde1cad712c6fce6f3fddc17d062bf25ade60a2720ccc5977adcb38c32',Dark:'e153c31cf67846e4536581e59c4975dc6e9d7cc6abf5a4bc6170bedae3163539'};
export function extractCollectorCards(all, set) {
  return all.filter(c => c.legacy === false && !c.front.title.endsWith(' (Readable)') && c.printings.some(p => p.set === set)).map(c => ({
    id:c.side+':'+c.id,name:c.front.title,side:c.side,type:c.front.type,subType:c.front.subType||null,rarity:c.rarity||null,
    catalogId:c.gempId,image:c.front.imageUrl,backImage:c.back?.imageUrl||null,variant:c.front.title.endsWith(' (AI)')?'AI':'Standard'
  }));
}
export async function checkCollectorData({verifySource=false}={}) {
  const registry=JSON.parse(await readFile(new URL('../data/editions.json',import.meta.url),'utf8'));
  if(registry.schema!==1||registry.revision!==collectorRevision||registry.editions.length!==27)throw new Error('Unbekanntes Editionsregister');
  let source=[];
  if(verifySource)for(const side of ['Light','Dark']){
    const response=await fetch(`https://raw.githubusercontent.com/swccgpc/swccg-card-json/${collectorRevision}/${side}.json`,{signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error('Quelldatei: HTTP '+response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==hashes[side])throw new Error('Quell-Prüfsumme stimmt nicht');
    source.push(...JSON.parse(bytes).cards);
  }
  let cards=0,lists=0;
  const ids=new Set();
  for(const e of registry.editions){
    if(!/^[a-z0-9-]+$/.test(e.id)||ids.has(e.id)||!/^\d{4}-\d{2}(?:-\d{2})?$/.test(e.releaseDate))throw new Error('Ungültige Editionsmetadaten');
    ids.add(e.id);
    if(!e.cardsUrl){if(e.id!=='reflections')throw new Error('Kartenliste fehlt');continue;}
    if(e.cardsUrl!==`data/collector-${e.id}.json`)throw new Error('Ungültiger Kartenpfad');
    const payload=JSON.parse(await readFile(new URL('../'+e.cardsUrl,import.meta.url),'utf8'));
    if(payload.schema!==1||payload.edition!==e.id||payload.revision!==collectorRevision)throw new Error('Katalog gehört nicht zur Edition');
    if(payload.cards.filter(c=>c.variant==='Standard').length!==e.cardCount||payload.cards.filter(c=>c.variant==='AI').length!==e.variantCount)throw new Error(e.id+': Kartenanzahl stimmt nicht');
    const cardIds=new Set();
    for(const c of payload.cards){
      if(cardIds.has(c.id)||!['Light','Dark'].includes(c.side)||!c.name||!c.type||!c.catalogId||!/^https:\/\/res\.starwarsccg\.org\/cards\//.test(c.image))throw new Error(e.id+': Ungültige Karte');
      cardIds.add(c.id);
      if(Object.keys(c).sort().join(',')!=='backImage,catalogId,id,image,name,rarity,side,subType,type,variant')throw new Error('Nicht freigegebene Daten in Sammlerliste');
    }
    if(verifySource&&JSON.stringify(extractCollectorCards(source,e.set))!==JSON.stringify(payload.cards))throw new Error(e.id+': Abweichung von fixierter Quelle');
    cards+=payload.cards.length;lists++;
  }
  return {editions:ids.size,lists,cards,verifiedSource:verifySource};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const option=process.argv[2];if(!['--check','--verify-source'].includes(option))throw new Error('Aufruf: node scripts/import-collectors.mjs --check|--verify-source');
  console.log(JSON.stringify(await checkCollectorData({verifySource:option==='--verify-source'}),null,2));
}
