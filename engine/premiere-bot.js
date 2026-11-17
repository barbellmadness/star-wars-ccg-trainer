const PremiereBot = (() => {
  const unit = card => card && ['Character', 'Vehicle', 'Starship'].includes(card.type);
  const strength = card => (card?.power ?? 0) * 0.55 + (card?.ability ?? 0) * 0.4;
  const value = card => card?.redundant ? 0.5 : unit(card) ? 2 + strength(card) : card?.type === 'Location' ? 2 : 1.8;
  const siteValue = site => 1.6 + 1.45 * (site?.drain ?? 0) + 0.35 * (site?.generation ?? 0);

  function startingLocation(cards, options, fraction) {
    const ships = cards.filter(card => card.type === 'Starship').length;
    const ground = cards.filter(card => card.type === 'Character' || card.type === 'Vehicle').length;
    const score = location => !location ? -Infinity : 2 * (location.icons.dark ?? 0) - (location.icons.light ?? 0) * 0.5 +
      (location.subType === 'System' ? Math.min(ships, 12) * 0.22 : Math.min(ground, 18) * 0.1) +
      (location.locationTags?.includes('Exterior') ? 0.25 : 0);
    const strongest = Math.max(...options.map(score));
    const tied = options.flatMap((location, index) => score(location) === strongest ? [index] : []);
    return tied[Math.floor(fraction * tied.length)];
  }

  function drawGoal(view) {
    const units = view.hand.filter(card => unit(card) && !card.redundant && !card.needsCrew && (card.ability > 0 || card.type === 'Starship'));
    const holdsSites = view.sites.some(site => site?.dark);
    return holdsSites ? (units.length >= 2 ? 3 : 5) : (units.length ? 5 : 7);
  }

  function reserve(view, phase = view.phase) {
    const draw = view.life > 3 ? Math.min(3, Math.max(0, drawGoal(view) - view.hand.length)) : 0;
    const battle = phase <= 3 && view.sites.some(site => site?.dark && site.light && site.margin >= 1);
    const fire = battle && view.sites.some(site => site?.dark && site.light && site.readyWeapons);
    const movement = phase < 4 && view.sites.some(site => site?.routes);
    return draw + Number(battle) + Number(fire) + Number(movement);
  }

  function cost(view, action, keep = reserve(view)) {
    return action.cost * 0.55 + Math.max(0, Math.min(view.force, keep) - (view.force - action.cost)) * 1.45;
  }

  // Use a common distribution for unrevealed destiny, independent of deck order and contents.
  function hitChance(draws, threshold) {
    let totals = [1];
    for (let count = 0; count < draws; count++) {
      const next = Array(totals.length + 6).fill(0);
      totals.forEach((chance, sum) => {
        for (let destiny = 0; destiny <= 6; destiny++) next[sum + destiny] += chance / 7;
      });
      totals = next;
    }
    return draws ? totals.reduce((sum, chance, destiny) => sum + (destiny > threshold ? chance : 0), 0) : 0;
  }

  function movement(view, action) {
    const from = view.sites[action.from], to = view.sites[action.to];
    if (!to) return -Infinity;
    const enters = action.from !== action.to;
    const claim = enters && to.darkKnown && !to.dark && !to.light && to.lightKnown && action.bringsPresence;
    const contest = enters && to.light ? (to.margin + action.unitPower >= 2 ? 1.6 : -2.5) : 0;
    const retreat = enters && from?.light && from.margin < -2 && !to.light ? 1.6 : 0;
    const leaves = action.leavesControl ? siteValue(from) : 0;
    return (claim ? siteValue(to) + 0.6 : 0) + contest + retreat - leaves + action.carrierGain - cost(view, action);
  }

  function deployment(view, action) {
    const site = view.sites[action.site];
    if (action.kind === 'deployLocation' || action.kind === 'convertLocation') {
      return (action.card?.icons?.dark ?? 0) * 1.5 - (action.card?.icons?.light ?? 0) * 0.8 + action.locationSupport;
    }
    if (action.kind === 'equip') return (site?.light && site.dark ? 3 : 0.8) + action.carrierGain - cost(view, action);
    if (action.kind === 'deployDevice' || action.kind === 'deployAutomated') return 1.2 + action.carrierGain - cost(view, action);
    if (action.kind === 'deploy' || action.kind === 'deployWithPilot') {
      const claim = site?.lightKnown && !site.light && site.darkKnown && !site.dark && action.bringsPresence;
      const reinforcement = site?.light ? (site.margin + action.unitPower >= 1 ? 2.4 : -1.3) : 0;
      return 0.6 + action.unitPower * 0.55 + action.unitAbility * 0.38 + action.carrierGain +
        (claim ? siteValue(site) + 1 : 0) + reinforcement - cost(view, action);
    }
    return 1.3 + action.effectValue - cost(view, action);
  }

  function damage(view, action) {
    const debt = view.debt;
    switch (action.kind) {
      case 'battleForfeit':
      case 'talzForfeit':
      case 'battleHandForfeit': {
        const coverage = Math.min(debt.damage, action.value) + (action.immune ? 0 : Math.min(debt.attrition, action.value));
        return Number(!!action.mandatory) * 80 + Number(debt.attrition > 0 && !action.immune) * 24 +
          coverage * 2 - value(action.card) - action.collateral;
      }
      case 'battleForceLoss':
      case 'loseForce': return action.mode === 'hand' ? 14 - value(action.card) : 11 - (view.life <= debt.damage + 2 ? 8 : 0) - Number(action.mode === 'force');
      case 'reduceForceLoss': return 14 + action.amount * 1.2 - cost(view, action);
      case 'pileInterrupt': return action.effectValue > 0 ? 26 + action.effectValue - cost(view, action) : -Infinity;
      case 'passDamage': return 70;
      default: return -Infinity;
    }
  }

  function score(view, action) {
    const site = view.sites[action.site];
    if (view.debt) return damage(view, action);
    switch (action.kind) {
      case 'activate': return action.amount + action.immediateDraw * (view.hand.length < 3 ? 0.35 : -0.4) + 0.1;
      case 'draw': return view.life > (view.sites.some(site => site?.dark) ? 2 : 1) && view.hand.length < drawGoal(view) ? 2 : -1;
      case 'deployLocation': case 'convertLocation': case 'deploy': case 'deployWithPilot': case 'equip':
      case 'deployDevice': case 'deployBolt': case 'deployAutomated': case 'deployTableEffect': case 'deployLocationEffect':
      case 'deployReserveInsert': case 'deployLostPileEffect': case 'navSabotage': case 'revolution':
        return deployment(view, action);
      case 'move': case 'transport': case 'moveSeeker': return movement(view, action);
      case 'recycleHand': return view.hand.length >= 5 && action.card?.redundant ? 1 : 0;
      case 'battle': return (site?.margin ?? -99) - 0.9 - cost(view, action);
      case 'drain': return 1 + action.amount * 2;
      case 'fireWeapon': case 'computerFire': case 'combinedAttack': case 'gaderffii':
        return action.hit ? -2 : hitChance(Math.min(action.draws, view.reserveCount), action.defense - action.bonus) *
          (3.4 + strength(action.target) + Number(action.effect === 'capture') * 2) + action.effectValue - cost(view, action);
      case 'react': case 'reactDeploy':
        if (view.window === 'drain') return (action.bringsPresence ? 2 + (view.drain ?? 0) * 2 : -2) -
          (action.leavesControl ? siteValue(view.sites[action.from]) : 0) - cost(view, action);
        return (site?.margin ?? 0) + action.unitPower < -4 ? -3 :
          action.unitPower * 0.8 + action.unitAbility * 0.6 - (action.leavesControl ? siteValue(view.sites[action.from]) : 0) - cost(view, action);
      case 'interruptResponse':
        return action.effectValue + strength(action.target) * 0.4 - cost(view, action);
      case 'destinyResponse': return action.effectValue - cost(view, action);
      case 'destiny': return 4;
      case 'skipDestiny': return 0;
      case 'battlePrediction': return (action.mode === 'Dark') === (view.sites[view.battleSite]?.margin >= 0) ? 4 : 1;
      case 'passWeapons': case 'passResponse': return 0;
      case 'retrieve': case 'searchReserve': return 2.5 + action.effectValue - cost(view, action);
      case 'takeFromReserve': return action.card ? value(action.card) : 0;
      case 'finishCardInformation': return (['done','keep','decline'].includes(action.mode) ? 0 : 0.7) + action.effectValue;
      case 'custody': case 'prisonerTransfer': return (['deliver','imprison','seize'].includes(action.mode) ? 4 : 0) + action.effectValue;
      case 'automatedTarget': return action.targetSide === 'Light' ? value(action.card) : -value(action.card);
      case 'timingTrigger': return action.effectValue;
      case 'duel': return action.effectValue - cost(view, action);
      case 'battleEffect': case 'pileInterrupt': case 'cardInformation': case 'weaponEffect': case 'holocamPower':
      case 'cancelTableEffect': case 'cancelNamedWeapon': case 'controlTheft': case 'deviceAction': case 'limitedResources':
      case 'lateralRepair': case 'lateralMechanic': case 'gravelStorm':
        return action.effectValue - cost(view, action);
      default: return -Infinity;
    }
  }

  function choose(view, actions, required = false) {
    let best = null, bestScore = required ? -Infinity : 0;
    for (const action of actions) {
      const points = score(view, action);
      if (points > bestScore) { bestScore = points; best = action.index; }
    }
    // Forced engine prompts can include a single action with no strategic alternatives.
    return best ?? (required ? actions[0]?.index ?? null : null);
  }

  return {startingLocation, choose};
})();

if (typeof module !== 'undefined') module.exports = PremiereBot;
