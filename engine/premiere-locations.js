const PremiereLocations = (() => {
  const units = typeof PremiereUnits === 'undefined' ? require('./premiere-units.js') : PremiereUnits;
  const bothSides = ['Light', 'Dark'];
  const opposite = side => side === 'Light' ? 'Dark' : 'Light';
  const title = card => (card?.name ?? '').replace(/^•+\s*/, '').split(' (')[0];
  const system = card => card?.subType === 'System';
  const region = card => system(card) ? title(card) : title(card).split(':')[0];
  const inactive = card => card.captured || card.missing || card.inactive;
  const enclosed = card => units.enclosed(card) ||
    card.subType === 'Enclosed';

  function entries(state, side) {
    const board = side === 'Light' ? state.light : state.dark;
    const result = [];
    function visit(card, slot, carriers = [], blocked = false) {
      if (!card) return;
      const unavailable = blocked || inactive(card);
      result.push({card, slot, carriers, unavailable});
      for (const occupant of card.occupants ?? []) visit(occupant.card, slot, [card, ...carriers], unavailable);
      for (const attachment of [...(card.weapons ?? []), ...(card.attachments ?? [])]){
        visit(attachment, slot, carriers, unavailable);
      }
    }
    board?.forEach((row, slot) => row.forEach(card => visit(card, slot)));
    return result;
  }

  function find(state, card) {
    for (const side of bothSides) {
      const entry = entries(state, side).find(item => item.card === card);
      if (entry) return entry;
    }
    return null;
  }

  function at(state, card, slot) {
    const entry = find(state, card), target = state.locations?.[slot];
    return !!entry && !!target && (entry.slot === slot ||
      (system(target) && !system(state.locations[entry.slot]) && region(state.locations[entry.slot]) === region(target)));
  }

  function aboard(state, card, carrier) {
    const entry = find(state, card);
    return !!entry && (entry.carriers.includes(carrier) ||
      (!!carrier.instanceId && state.locations[entry.slot]?.hostInstanceId === carrier.instanceId));
  }

  function presentAt(entry, place) {
    return !entry.unavailable && (entry.carriers.find(enclosed) ?? entry.slot) === place;
  }

  function present(state, card, place) {
    const entry = find(state, card);
    return !!entry && presentAt(entry, place);
  }

  function presentCards(state, side, place) {
    return entries(state, side).filter(entry => presentAt(entry, place)).map(entry => entry.card);
  }

  function activeCards(state, side) {
    return entries(state, side).filter(entry => !entry.unavailable).map(entry => entry.card);
  }

  function cardsOnTable(state, side) { return entries(state, side).map(entry => entry.card); }

  function presence(state, side, slot, ability) {
    if (!state.locations?.[slot]) return false;
    let known = 0, uncertain = false;
    for (const {card} of entries(state, side).filter(entry => entry.slot === slot && !entry.unavailable)) {
      if (card.undercover) continue;
      if (card.presence === true) return true;
      if (card.type && !['Character', 'Vehicle', 'Starship', 'Creature'].includes(card.type)) continue;
      const value = ability(card);
      if (Number.isFinite(value)) known += value;
      else uncertain = true;
    }
    return known >= 1 ? true : uncertain ? null : false;
  }

  function control(state, side, slot, ability) {
    const own = presence(state, side, slot, ability), enemy = presence(state, opposite(side), slot, ability);
    if (own === false || enemy === true) return false;
    return own === true && enemy === false ? true : null;
  }

  function effectsAt(state, slot) {
    return state.locationEffects?.[slot] ?? [];
  }

  function printedSide(state, slot, side) {
    return effectsAt(state, slot).filter(effect => effect.card.id === 'Light:2110').length % 2
      ? opposite(side) : side;
  }

  function icons(state, slot, side) {
    const card = state.locations[slot];
    const printed = card?.icons?.[printedSide(state, slot, side).toLowerCase()];
    if (!Number.isInteger(printed)) return null;
    return Math.max(0, printed + effectsAt(state, slot).reduce((sum, effect) => sum + (effect.icons?.[side] ?? 0), 0));
  }

  const transit = new Map([
    ['Light:676', [1, 1]], ['Dark:675', [2, 0]], ['Light:2447', [1, 2]],
    ['Dark:2446', [2, 1]], ['Light:2853', [0, 2]], ['Dark:2852', [1, 1]]
  ]);

  function conditions(state, slot, side) {
    const card = state.locations[slot], tags = card?.locationTags ?? [];
    const cost = transit.get(card?.id);
    return {interior: tags.includes('Interior'), exterior: tags.includes('Exterior'),
      scompLink: tags.includes('Scomp Link'), dockingBay: !!cost,
      transitCost: cost?.[printedSide(state, slot, side) === 'Light' ? 0 : 1] ?? null,
      night: state.nightSites?.includes(slot) ?? (!!state.nightConditions && !system(card))};
  }

  function forceGeneration(state, side) {
    let count = 1, unknown = 0;
    state.locations.forEach((card, slot) => {
      if (!card) return;
      const value = icons(state, slot, side);
      if (value === null) unknown++;
      else count += value;
    });
    for (const {card, slot, unavailable} of entries(state, side)) {
      const location = state.locations[slot];
      if (!unavailable && card.id === 'Light:1593' && location && (system(location) || region(location) !== 'Tatooine')) count++;
    }
    return {count, unknown};
  }

  const lightDrain = new Set(['Light:672', 'Light:680', 'Light:1427', 'Dark:669', 'Dark:673', 'Dark:678']);
  const darkDrain = new Set(['Light:80', 'Light:608', 'Light:2471', 'Light:2855', 'Light:2858', 'Dark:2458', 'Dark:2461']);
  const lightsabers = new Set(['Light:1386', 'Light:1813', 'Dark:620', 'Dark:2702']);

  function drain(state, side, slot, ability) {
    const location = state.locations[slot];
    if (!location || control(state, side, slot, ability) !== true) return null;
    const opposing = opposite(side);
    if (presentCards(state, opposing, slot).some(card => card.undercover)) return null;
    const effects = effectsAt(state, slot);
    if (effects.some(effect => effect.drainForbiddenFor === side)) return null;
    const base = icons(state, slot, opposing);
    if (base === null) return null;
    const printed = printedSide(state, slot, side);
    let modifier = (printed === 'Light' ? lightDrain : darkDrain).has(location.id) ? 1 : 0;
    if (printed === 'Dark' && location.id === 'Dark:79') {
      modifier += state.locations.filter((card, index) => card && !system(card) && region(card) === 'Death Star' && control(state, side, index, ability) === true).length;
    }
    modifier += effects.reduce((sum, effect) => sum + (effect.drainModifier?.[side] ?? 0), 0);
    const present = presentCards(state, side, slot);
    const weapons = present.flatMap(host=>{
      const eligible=(host.weapons??[]).filter(weapon=>lightsabers.has(weapon.id)&&units.canUseWeapon(state,host,weapon));
      return (units.usesMultipleWeapons(host)?eligible:eligible.slice(0,1)).map(weapon=>({host,weapon}));
    });
    return {base, modifier, optional:weapons.length, weapons};
  }

  return {aboard, activeCards, at, cardsOnTable, conditions, control, drain, effectsAt, forceGeneration, icons, presence,
    occupy: presence, present, presentCards, printedSide};
})();

if (typeof module !== 'undefined') module.exports = PremiereLocations;
