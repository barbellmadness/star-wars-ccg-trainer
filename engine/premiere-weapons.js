const PremiereWeapons = (() => {
  const units = typeof PremiereUnits === 'undefined' ? require('./premiere-units.js') : PremiereUnits;
  const ground = ['Character','Creature','Vehicle'];
  const saberTargets = ['Character','Creature'];
  const space = ['Starship'];
  const warrior = card => card.type === 'Character' && card.warrior === true;
  const title = card => (card?.name ?? '').trim().replace(/^[•*]+\s*/, '').toLowerCase();
  const persona = (card, name) => card.type === 'Character' &&
    (card.personas?.some(item=>item.toLowerCase()===name) || title(card)===name || title(card).startsWith(name+' '));
  const byPersona = (name, fallback, otherwise = null) => host => persona(host,name) ? fallback : warrior(host) ? otherwise : null;
  const starDestroyer = card => units.capital(card) && /star destroyer/i.test(card.subType);
  const withHost = (accepts, cost) => host => accepts(host) ? cost : null;
  const amount = ability => Number.isFinite(ability) ? Math.max(0, 7 - ability) : null;
  const genericSaber = (host, ability) => warrior(host) ? amount(ability) : null;

  const blaster = (cost, bonus) => ({deploy:withHost(warrior,cost), cost, bonus, targets:ground});
  const saber = (deploy, cost, effect, extra = {}) => ({deploy, cost, draws:2, targets:saberTargets, effect, ...extra});
  const attached = new Map([
    ['Light:259', blaster(1,0)], ['Light:265', blaster(2,1)], ['Dark:264', blaster(2,1)], ['Dark:1264', blaster(1,0)],
    ['Light:1106', {deploy:byPersona('han',1,3),cost:1,bonus:1,targets:ground,zeroBy:'han'}],
    ['Light:1503', {deploy:byPersona('leia',1,2),cost:0,bonus:-1,targets:ground,zeroBy:'leia'}],
    ['Light:1386', saber(genericSaber,amount,'hit')], ['Dark:620', saber(genericSaber,amount,'hit')],
    ['Light:1813', saber(byPersona('obi-wan',0),0,'zero')], ['Dark:2702', saber(byPersona('vader',0),0,'zero')],
    ['Dark:146', {...blaster(2,1),deploy:withHost(warrior,3),adjacent:true}],
    ['Dark:1551', {...blaster(2,1),generator:true,repeats:true}],
    ['Dark:1002', {deploy:withHost(card=>card.type==='Character'&&title(card)==='tusken raider',2),
      cost:0,draws:2,targets:['Character'],timing:'initiation',effect:'block',threshold:5}],
    ['Light:1962', {deploy:withHost(card=>units.fighter(card)&&/\b[XYB]-wing\b/i.test(card.subType),1),cost:1,targets:space}],
    ['Light:1971', {deploy:withHost(card=>['Light:530','Light:1677'].includes(card.id),2),cost:1,
      targets:space,bonus:target=>units.fighter(target)?1:0}],
    ['Dark:303', {deploy:withHost(card=>units.fighter(card)&&/TIE Advanced x1/i.test(card.subType),1),cost:1,
      targets:space,bonus:target=>units.capital(target)?-1:units.fighter(target)?1:0}],
    ['Dark:1327', {deploy:withHost(starDestroyer,2),cost:1,bonus:2,targets:space,effect:'ion'}],
    ['Dark:2644', {deploy:withHost(card=>starDestroyer(card)||(card.subType==='System'&&card.locationTags?.includes('Mobile')),3),
      cost:2,draws:2,targets:space,bonus:target=>units.capital(target)?-2:-5}]
  ]);
  const seekers = new Map([
    ['Light:2400', {persona:'tagge',fallback:'warrior',limit:3}],
    ['Light:2426', {persona:'tarkin',fallback:'alien',limit:3}],
    ['Dark:1096', {persona:'han',fallback:'alien',limit:3}],
    ['Dark:1592', {persona:'luke',fallback:'pilot',primary:4,limit:3}]
  ]);
  const projector = card => card?.id === 'Dark:1479';
  const mine = card => ['Light:2610','Dark:2609'].includes(card?.id);
  const seeker = card => seekers.has(card?.id);
  const miningDroid = card => ['Light:1556','Dark:1557'].includes(card?.id);
  const disarmed = host => (host?.attachments ?? []).some(card=>['Light:735','Dark:734'].includes(card.id));

  function definition(card) {
    if (card?.type !== 'Weapon') return null;
    if (projector(card)) return {cost:0,bonus:-1,targets:saberTargets,projector:true};
    return attached.get(card.id) ?? null;
  }

  function deployCost(weapon, host, ability) {
    if (disarmed(host)) return null;
    return definition(weapon)?.deploy?.(host,ability) ?? null;
  }

  function shot(weapon, host, target, ability, defense) {
    const rule=definition(weapon);
    if(rule?.timing==='initiation'&&target.type!=='Character')return null;
    const category=target.type==='Vehicle'&&target.subType==='Creature'?'Creature':target.type;
    if (!rule || (!rule.targets.includes(category) && !projector(target) && !(rule.projector&&seeker(target)))) return null;
    const cost=typeof rule.cost==='function'?rule.cost(ability):rule.cost;
    const bonus=typeof rule.bonus==='function'?rule.bonus(target):rule.bonus??0;
    const threshold=rule.threshold??defense;
    if (cost===null||!Number.isFinite(threshold)) return null;
    const effect=rule.effect==='block'?'block':projector(target)||seeker(target)?'destroy':
      rule.effect??(rule.zeroBy&&persona(host,rule.zeroBy)?'zero':'hit');
    return {cost,bonus,defense:threshold,effect,draws:rule.draws??1,repeats:!!rule.repeats};
  }

  function defense(card, ability, stats={}) {
    if (projector(card)||seeker(card)) return 1;
    if (card.ionDamage&&card.type==='Starship') return 0;
    if (card.type==='Character') {
      const numbers=[ability,card.armor,card.maneuver].filter(Number.isFinite);
      return numbers.length?Math.max(...numbers):null;
    }
    if (['Vehicle','Starship','Creature'].includes(card.type)) {
      return [stats.armor,stats.maneuver,card.armor,card.maneuver].find(Number.isFinite)??null;
    }
    return null;
  }

  function seekerTarget(weapon, card, ability) {
    const rule=seekers.get(weapon.id);
    if(!rule||card.type!=='Character'||!Number.isFinite(ability))return false;
    const matching=persona(card,rule.persona)|| (rule.persona==='tarkin'&&title(card)==='grand moff tarkin');
    if(matching&&ability<(rule.primary??rule.limit))return true;
    return ability<rule.limit&&(rule.fallback==='alien'?card.subType==='Alien':card[rule.fallback]===true);
  }

  return {defense,definition,deployCost,disarmed,mine,miningDroid,projector,seeker,seekerTarget,shot};
})();

if (typeof module !== 'undefined') module.exports = PremiereWeapons;
