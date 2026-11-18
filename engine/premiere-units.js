const PremiereUnits = (() => {
  const capital = card => card?.type === 'Starship' && /^Capital\b/i.test(card.subType ?? '');
  const fighter = card => card?.type === 'Starship' && /^Starfighter\b/i.test(card.subType ?? '');
  const tie = card => card?.type==='Starship' && /\bTIE\b/i.test(card.subType);
  const tube = card => ['Light:1548', 'Dark:1547'].includes(card?.id);
  const bantha = card => ['Dark:191','Light:2125'].includes(card?.id) && card.type === 'Vehicle';
  const crawler = card => ['Light:2161', 'Dark:2160'].includes(card?.id);
  const active = card => !!card && !card.inactive && !card.switchedOff && !card.captured && !card.missing && !card.undercover;
  const restrainingBolt = card => card?.attachments?.find(item => ['Light:2100', 'Dark:2099'].includes(item.id));
  const textSuppressed = card => !!card?.gameTextCancelled || !!card?.switchedOff || !!card?.asleep || !!restrainingBolt(card) ||
    !!card?.attachments?.some(effect=>effect.suppressesHostText&&!effect.gameTextCancelled);
  const training = card => (card?.attachments ?? []).filter(effect => effect.training && !textSuppressed(effect));
  function hasSkill(card, skill) {
    const printed = card?.[skill] === true || card?.characteristics?.some(trait => trait.toLowerCase() === skill);
    return !!printed || training(card).some(effect => effect.training.skill === skill && effect.training.granted);
  }
  function trainingPower(card, pilot = false) {
    const bonuses = new Map();
    for (const {id, training: {skill, power}} of training(card)) {
      if ((skill === 'pilot') === pilot) bonuses.set(id, Math.max(bonuses.get(id) ?? 0, power));
    }
    return [...bonuses.values()].reduce((sum, value) => sum + value, 0);
  }
  const name = card => (card.name ?? '').replace(/^[•*]+\s*/, '');
  const rUnit = card => card?.characteristics?.includes('r-unit');
  const driveDroids = new Set(['Light:2000', 'Dark:2001']);
  const canDrive = card => card.subType !== 'Droid' || (driveDroids.has(card.id) && !textSuppressed(card));
  const bountyHunter = card => card?.type === 'Character' &&
    (card.characteristics?.includes('bounty hunter') || /(?:^|[.!?]\s+)bounty hunter\./i.test(card.lore ?? ''));
  const canEscort = card => active(card) && card.type === 'Character' &&
    (hasSkill(card,'warrior') || bountyHunter(card) || card.characteristics?.includes('battle droid'));

  const capacity = new Map([
    ['Light:1047',{shared:2}], ['Light:2061',{pilot:1,astromech:1}], ['Light:2125',{passenger:2}], ['Light:2908',{shared:3}], ['Light:1298', {passenger:1}], ['Dark:227', {passenger:3}], ['Dark:1685', {driver:1,passenger:1}],
    ['Light:530', {pilot:3, passenger:4, cargo:1}], ['Light:1045', {shared:2}],
    ['Light:1050', {shared:2, astromech:1}], ['Light:1548', {passenger:4}],
    ['Light:1609', {driver:1, passenger:2}], ['Light:1677', {pilot:2, passenger:2}],
    ['Light:2057', {pilot:1}], ['Light:2059', {pilot:1, astromech:1}], ['Light:2060', {pilot:1, astromech:1}], ['Light:2063', {pilot:1}],
    ['Light:2161', {driver:1, passenger:7}], ['Light:2307', {driver:1, passenger:3}], ['Light:2418', {pilot:3, passenger:4}],
    ['Light:2907', {shared:1}],
    ['Dark:191', {passenger:2}], ['Dark:247', {pilot:1}], ['Dark:249', {pilot:1}], ['Dark:250', {pilot:1}],
    ['Dark:519', {pilot:6, passenger:8, cargo:2, hangar:4}], ['Dark:723', {pilot:6, passenger:8, cargo:2, hangar:4}],
    ['Dark:1291', {pilot:6, passenger:8, cargo:2, hangar:4}],
    ['Dark:1547', {passenger:4}], ['Dark:2160', {driver:1, passenger:7}],
    ['Dark:2602', {pilot:1, passenger:2, crew:2}], ['Dark:2660', {driver:1, passenger:2}], ['Dark:2700', {pilot:1}],
    ['Dark:2715', {pilot:4, passenger:6, cargo:1, hangar:3}]
  ]);
  const hasDock = card => card?.type === 'Starship' && /ship-docking capability/i.test(card.gametext ?? '');
  const enclosed = card => card.type === 'Starship' || tube(card) || crawler(card) || card.enclosed === true;

  function accepts(host, card, role, ignored = null, captiveSeats = Number(!!card?.escortedCaptive)) {
    if (!active(host) || !active(card) || host === card) return false;
    const base = capacity.get(host.id);
    const added = host.pilotsEjected ?? 0;
    const printed = added ? { ...base, pilot: (base?.pilot ?? base?.shared ?? 0) + added,
      passenger: base?.passenger ?? base?.shared, shared: base?.shared === undefined ? undefined : base.shared + added } : base;
    const navLost=host.attachments?.some(card=>card.id==='Dark:1238'&&!textSuppressed(card));
    const spec = navLost&&host.type==='Starship'?{...printed,astromech:Math.max(1,printed?.astromech??0)}:printed;
    if (!spec) return false;
    const crew = (host.occupants ?? []).filter(entry => entry !== ignored);
    const isCrew = job => job === 'pilot' || job === 'passenger';
    const captiveCount = crew.filter(entry => entry.card.escortedCaptive).length;
    const limit = spec[role] ?? (isCrew(role) ? spec.shared : 0);
    if (!limit || crew.filter(entry => entry.role === role).length >= limit) return false;
    if (isCrew(role) || captiveSeats) {
      const passengers = crew.filter(entry => entry.role === 'passenger').length + captiveCount + captiveSeats + Number(role === 'passenger');
      if (passengers > (spec.passenger ?? spec.shared ?? 0)) return false;
      if (crew.filter(entry => isCrew(entry.role)).length + captiveCount + captiveSeats + Number(isCrew(role)) >
          (spec.shared ?? spec.crew ?? Infinity)) return false;
    }
    if (role === 'cargo') return card.type === 'Vehicle' && !bantha(card);
    if (role === 'hangar') return tie(card)&&crew.filter(entry=>entry.role==='hangar').reduce((n,entry)=>n+(/^Squadron/.test(entry.card.subType)?3:1),0)+(/^Squadron/.test(card.subType)?3:1)<=(spec.hangar??0);
    if (card.migTarget) return role === 'passenger';
    if (card.type !== 'Character' || (['Dark:1445','Light:1407'].includes(card.id) && enclosed(host) && !capital(host)) ||
        (card.id === 'Dark:1989' && fighter(host))) return false;
    if (role === 'pilot') return hasSkill(card, 'pilot');
    if (role === 'driver') return canDrive(card);
    if (role === 'astromech') return rUnit(card);
    return role === 'passenger';
  }

  function roles(host, card, ignored) {
    return ['pilot', 'driver', 'passenger', 'astromech', 'cargo', 'hangar'].filter(role => accepts(host, card, role, ignored));
  }

  const matchingPilots = new Map([
    ['Light:2611',['Light:1047',1]], ['Light:394', ['Light:1677',1]], ['Light:239', ['Light:2060', 1, true]], ['Light:799', ['Light:1045', 1, true]], ['Light:1098', ['Light:1677', 2, true]],
    ['Light:1390', [null, 1, true, 'Red 6']], ['Light:1593', ['Light:2068', 2]],
    ['Light:1924', ['Light:1050', 1, true, 'Gold 5']], ['Light:2067', ['Light:2057', 1, true]], ['Light:2786', ['Light:2059', 2, true]],
    ['Dark:790', ['Dark:247', 1, true]], ['Dark:791', ['Dark:249', 1, true]], ['Dark:792', ['Dark:250', 0, true]], ['Dark:634', ['Dark:2700', 3]],
    ['Dark:2094', [null, 1, true, 'Black 2', 'Black 3', 'Black 4']]
  ]);
  function matchingPilot(ship, pilot, matchNames) {
    if(ship.id==='Light:2061'&&pilot.id==='Light:1593')return [ship.id,2];
    const match = matchingPilots.get(pilot.id);
    return match && ((match[0] && match[0] === ship.id) || (matchNames && match.slice(3).includes(name(ship)))) ? match : null;
  }
  const matchingBattleDestiny = (ship, pilot, matchNames) => matchingPilot(ship, pilot, matchNames)?.[2] === true;

  function stats(card, permanentAbility, {landed = false, activePilotText = false, excludesOccupant = () => false,
    suspendsPilotText = () => false} = {}) {
    const occupants = (card.occupants ?? []).filter(({card}) => active(card)&&!card.asleep&&!excludesOccupant(card));
    const pilots = occupants.filter(({role}) => role === 'pilot').map(({card}) => card);
    const motor = card.type === 'Starship' ? permanentAbility !== null || pilots.length > 0
      : permanentAbility !== null || tube(card) || bantha(card) || occupants.some(({role,card}) => role === 'driver' && canDrive(card));
    const powered = motor && !landed && active(card) && !card.disabled;
    let power = card.power ?? 0, maneuver = card.maneuver, hyperspeed = card.hyperspeed, landspeed = card.landspeed;
    if(permanentAbility!==null&&card.subType==='Shuttle'&&!Number.isFinite(landspeed))landspeed=card.id==='Light:1298'?4:3;
    const ability = permanentAbility ?? 0;
    const navComputer = !!card.navComputer&&!card.attachments?.some(item=>item.id==='Dark:1238'&&!textSuppressed(item)) ||
      occupants.some(({card,role}) => (rUnit(card)||card.navComputer) && ['passenger','astromech'].includes(role));
    if (powered && (card.type === 'Starship'||card.subType==='Shuttle')) for (const pilot of pilots) {
      power += trainingPower(pilot, true);
      if (activePilotText && textSuppressed(pilot) || suspendsPilotText(pilot)) continue;
      const text = pilot.gametext ?? '';
      const bonus = Number(text.match(activePilotText?/Adds (\d+) to power of anything (?:he|she) pilots/i:/Adds (\d+) to power of anything he pilots/i)?.[1] ?? 0);
      power += pilot.id === 'Dark:634' && card.id === 'Dark:2700' ? 4 : bonus;
      const match = matchingPilot(card, pilot, activePilotText);
      if (Number.isFinite(maneuver) && match) maneuver += match[1];
      if (Number.isFinite(maneuver) && pilot.id === 'Dark:1539' && fighter(card)) maneuver--;
      if (Number.isFinite(hyperspeed) && pilot.id === 'Dark:502' && card.id === 'Dark:723') hyperspeed++;
    }
    if (powered) for (const {card: occupant} of occupants) {
      if (textSuppressed(occupant)) continue;
      const r2 = occupant.id === 'Light:1995' && fighter(card);
      const r1 = occupant.id === 'Dark:1989' && capital(card);
      const r4 = driveDroids.has(occupant.id) && card.type === 'Vehicle' && !bantha(card);
      if (r1 || r2 || r4) power++;
      if ((r2 || r4) && Number.isFinite(maneuver)) maneuver++;
      if ((r1 || r2) && Number.isFinite(hyperspeed)) hyperspeed++;
      if (r4 && Number.isFinite(landspeed)) landspeed++;
    }
    if (powered && (card.attachments??[]).some(device=>['Light:997','Dark:996'].includes(device.id))) {
      power++;
      if (Number.isFinite(maneuver)) maneuver++;
      if (Number.isFinite(hyperspeed)) hyperspeed++;
    }
    if(card.ionDamage){
      if (Number.isFinite(maneuver)) maneuver=0;
      if (Number.isFinite(hyperspeed)) hyperspeed=0;
    }
    const pilotAbility = pilots.reduce((sum, pilot) => sum + (pilot.ability ?? 0), 0);
    return {powered, motor, navComputer, power: powered ? power : 0, armor:card.ionDamage&&Number.isFinite(card.armor)?0:card.armor, maneuver: powered ? maneuver : null,
      hyperspeed: powered ? hyperspeed : null, landspeed: powered ? landspeed : null,
      ability: powered && card.type === 'Starship' ? ability + pilotAbility : 0};
  }

  function landspeedCost(card) {
    if(card.id==='Dark:1685'&&(card.occupants??[]).some(({card})=>active(card)&&(bountyHunter(card)||name(card)==='Jabba the Hutt')))return 0;
    const freeWith = card.id === 'Light:1609' ? ['Luke Skywalker'] : card.id === 'Light:2307' ? ['Owen Lars','Beru Lars','Luke Skywalker'] : [];
    return (card.occupants ?? []).some(({card}) => active(card) && freeWith.includes(name(card))) ? 0 : 1;
  }

  function add(host, card, role, controller) {
    card.controller = controller;
    (host.occupants ??= []).push({card, role});
  }

  function usesMultipleWeapons(host) {
    return capital(host) || (host.attachments ?? []).some(item=>item.id==='Dark:2357');
  }

  function canUseWeapon(state, host, weapon) {
    if(/^Squadron/.test(host.subType??''))return (state.weaponUsesThisTurn??[]).filter(use=>use.host===host&&use.weapon!==weapon).length<3;
    return usesMultipleWeapons(host) || !(state.weaponUsesThisTurn ?? []).some(use=>use.host===host&&use.weapon!==weapon);
  }

  function recordWeaponUse(state, host, weapon) {
    if(!(state.weaponUsesThisTurn ?? []).some(use=>use.host===host&&use.weapon===weapon))
      (state.weaponUsesThisTurn??=[]).push({host,weapon});
  }

  function remove(card, process, survive) {
    const occupants = card.occupants ?? [];
    const attachments = [...(card.weapons ?? []), ...(card.attachments ?? []), ...(card.salt ?? [])];
    delete card.salt;
    delete card.soupAbility;
    delete card.septoidForfeit;
    delete card.shuttleUses;
    delete card.shuttleUsesTurn;
    delete card.scoutReactTurn;
    delete card.lastMealPower;
    delete card.leaderWeaponTurn;
    delete card.hitForLoss;
    delete card.remoteBonus;
    delete card.noMoveTurn;
    delete card.noBattleTurn;
    delete card.switchedOff;
    delete card.occupants;
    delete card.weapons;
    delete card.attachments;
    delete card.dockedWith;
    delete card.controller;
    delete card.ionDamage;
    delete card.armedTurn;
    delete card.tableSide;
    delete card.undercover;
    delete card.pilotsEjected;
    process(card);
    for (const attachment of attachments) remove(attachment, process, survive);
    for (const entry of occupants) {
      if (bantha(card) && entry.role === 'passenger') survive(entry.card);
      else remove(entry.card, process, survive);
    }
  }

  return {active, accepts, add, bantha, bountyHunter, canEscort, canUseWeapon, capital, crawler, enclosed, fighter, hasDock, hasSkill, landspeedCost, matchingBattleDestiny, matchingPilot, trainingPower,
    recordWeaponUse, remove, restrainingBolt, roles, stats, textSuppressed, tie, tube, usesMultipleWeapons};
})();

if (typeof module !== 'undefined') module.exports = PremiereUnits;
