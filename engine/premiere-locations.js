const PremiereLocations = (() => {
  const units = typeof PremiereUnits === 'undefined' ? require('./premiere-units.js') : PremiereUnits;
  const bothSides = ['Light', 'Dark'];
  const opposite = side => side === 'Light' ? 'Dark' : 'Light';
  const title = card => (card?.name ?? '').replace(/^•+\s*/, '').split(' (')[0];
  const system = card => card?.subType === 'System';
  const region = card => system(card) ? title(card) : title(card).split(':')[0];
  const prison = card => card?.type === 'Location' && card.subType === 'Site' &&
    (/\bPrison\b/i.test(title(card)) || ['Death Star: Detention Block Corridor','Cloud City: Security Tower',"Jabba's Palace: Dungeon"].includes(title(card)));
  const inactive = card => card.captured || card.missing || card.inactive;
  const enclosed = card => units.enclosed(card) ||
    card.subType === 'Enclosed';

  function entries(state, side) {
    const board = side === 'Light' ? state.light : state.dark;
    const result = [];
    function visit(card, slot, carriers = [], blocked = false, captive = false) {
      if (!card) return;
      const unavailable = blocked || inactive(card);
      const held = captive || !!card.captured;
      result.push({card, side, slot, carriers, unavailable, captive:held});
      for (const occupant of card.occupants ?? []) visit(occupant.card, slot, [card, ...carriers], unavailable);
      if (card.escortedCaptive) visit(card.escortedCaptive, slot, carriers, true, true);
      for (const attachment of [...(card.weapons ?? []), ...(card.attachments ?? [])]){
        visit(attachment, slot, carriers, unavailable, held);
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
    return !entry.unavailable && physicalPlace(entry) === place;
  }

  function physicalPlace(entry) { return entry.carriers.find(enclosed) ?? entry.slot; }

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

  function ruleAt(state, slot, side, event) {
    const registry = typeof PremiereCardRules === 'undefined' ? require('./premiere-card-rules.js') : PremiereCardRules;
    const printed = printedSide(state, slot, side);
    return registry.effects(state.locations[slot], event).find(rule => rule.printedSide === printed);
  }

  function icons(state, slot, side) {
    const card = state.locations[slot];
    const printed = card?.icons?.[printedSide(state, slot, side).toLowerCase()];
    if (!Number.isInteger(printed)) return null;
    const effects = effectsAt(state, slot);
    const bothSidesBonus = Math.max(0, ...effects.map(effect => effect.iconBonus ?? 0));
    return Math.max(0, printed + bothSidesBonus + effects.reduce((sum, effect) => sum + (effect.icons?.[side] ?? 0), 0));
  }

  function nightEffectsAt(state, slot) {
    const site = state.locations[slot];
    if (!site || system(site)) return [];
    return state.locations.flatMap((card, index) =>
      system(card) && region(card) === region(site) ? effectsAt(state, index).filter(effect => effect.nightfall) : []);
  }

  function conditions(state, slot, side) {
    const card = state.locations[slot], tags = card?.locationTags ?? [];
    const transit = ruleAt(state, slot, side, 'dockingTransit');
    return {interior: tags.includes('Interior'), exterior: tags.includes('Exterior'),
      scompLink: tags.includes('Scomp Link'), dockingBay: !!transit, transitCost: transit?.cost ?? null,
      night: !!nightEffectsAt(state, slot).length || (state.nightSites?.includes(slot) ?? (!!state.nightConditions && !system(card)))};
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
      if (!unavailable && card.id === 'Light:1593' && location &&
          !(state.game?.cardRulesVersion >= 7 && units.textSuppressed(card)) &&
          (system(location) || region(location) !== 'Tatooine')) count++;
    }
    return {count, unknown};
  }

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
    let modifier = ruleAt(state, slot, side, 'forceDrain')?.amount ?? 0;
    const controlledSiteBonus = ruleAt(state, slot, side, 'controlSiteDrain');
    if (controlledSiteBonus) {
      modifier += state.locations.filter((card, index) => card && !system(card) && region(card) === controlledSiteBonus.region &&
        control(state, side, index, ability) === true).length;
    }
    modifier += effects.reduce((sum, effect) => sum + (effect.drainModifier?.[side] ?? 0), 0);
    const present = presentCards(state, side, slot);
    const weapons = present.flatMap(host=>{
      const eligible=(host.weapons??[]).filter(weapon=>lightsabers.has(weapon.id)&&units.canUseWeapon(state,host,weapon));
      return (units.usesMultipleWeapons(host)?eligible:eligible.slice(0,1)).map(weapon=>({host,weapon}));
    });
    return {base, modifier, optional:weapons.length, weapons};
  }

  return {aboard, activeCards, at, cardsOnTable, entries, physicalPlace, conditions, control, drain, effectsAt, forceGeneration, icons, presence, prison,
    findEntry: find, nightEffectsAt, occupy: presence, present, presentCards, printedSide, ruleAt};
})();

if (typeof module !== 'undefined') module.exports = PremiereLocations;
