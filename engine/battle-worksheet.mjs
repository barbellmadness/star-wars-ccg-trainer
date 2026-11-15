/**
 * Pure calculation helpers for the Premiere starter training battle.
 * Not a full SWCCG rules engine. Card effects, immunity, weapons and timing
 * must be resolved before using this simplified damage worksheet.
 */
export function battleWorksheet({lightPower,darkPower,lightDestiny=0,darkDestiny=0}){
  for(const x of [lightPower,darkPower,lightDestiny,darkDestiny])if(!Number.isFinite(x)||x<0)throw Error('Invalid battle input');
  const lightTotal=lightPower+lightDestiny,darkTotal=darkPower+darkDestiny;
  return {lightTotal,darkTotal,lightDamage:Math.max(0,darkTotal-lightTotal),
    darkDamage:Math.max(0,lightTotal-darkTotal),lightAttrition:darkDestiny,darkAttrition:lightDestiny};
}
export function lossWorksheet({forfeits,damage,attrition}){
  if(!Array.isArray(forfeits)||forfeits.some(x=>!Number.isFinite(x)||x<0))throw Error('Invalid forfeits');
  if(!Number.isFinite(damage)||damage<0||!Number.isFinite(attrition)||attrition<0)throw Error('Invalid requirements');
  const sum=forfeits.reduce((a,b)=>a+b,0);
  return {forfeitTotal:sum,attritionCovered:sum>=attrition,
    damageRemaining:Math.max(0,damage-sum)};
}
