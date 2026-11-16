const PremiereCardRules = (() => {
  const cards = new Map();
  const register = (ids, effects, complete = false) => {
    for (const id of ids) cards.set(id, { effects, complete });
  };
  const continuous = (event, summary, targets, test, fields = {}) => ({
    event, summary, targets, test, cost: 0, duration: 'continuous', expires: 'when the condition ends', ...fields,
  });
  const atLocation = (printedSide, event, targets, amount, summary, legacy = false) =>
    continuous(event, summary, targets, 'registered Premiere locations', { printedSide, amount, legacy });
  const characterStat = (event, amount, summary, options) => continuous(event, summary, 'character at a site',
    'registered character stat rules', { amount, since: 2, ...options });

  register(['Light:2440'], [
    atLocation('Light', 'power', 'alien', 1, 'Light-Aliens erhalten am Ort Power +1.'),
    atLocation('Dark', 'forfeit', 'alien-except-tusken', 1, 'Dark-Aliens außer Tusken Raiders erhalten Forfeit +1.'),
  ], true);
  register(['Dark:2439'], [
    atLocation('Dark', 'power', 'alien-except-tusken', 1, 'Dark-Aliens außer Tusken Raiders erhalten Power +1.'),
    atLocation('Light', 'forfeit', 'alien', 1, 'Light-Aliens erhalten am Ort Forfeit +1.'),
  ], true);
  register(['Dark:2454'], [
    atLocation('Light', 'power', 'jawa', -1, 'Light-Jawas erhalten am Ort Power −1.'),
    atLocation('Light', 'forfeit', 'jawa', -1, 'Light-Jawas erhalten am Ort Forfeit −1.', true),
  ]);
  register(['Dark:2458'], [
    atLocation('Dark', 'forfeit', 'tusken', 1, 'Dark-Tusken Raiders erhalten am Ort Forfeit +1.', true),
  ]);
  register(['Dark:2465'], [
    atLocation('Dark', 'power', 'underworld', 1, 'Dark-Spione, Diebe, Kopfgeldjäger und Schmuggler erhalten Power +1.'),
    atLocation('Dark', 'forfeit', 'underworld', 1, 'Dieselben Charaktere erhalten Forfeit +1.'),
  ], true);

  for (const [ids, region] of [[['Light:2430', 'Dark:2429'], 'tatooine'], [['Light:2849', 'Dark:2848'], 'yavin 4']]) {
    register(ids, [continuous('fleetPower', 'Bei Kontrolle des Systems zählt jedes eigene anwesende Schiff als +1 Gesamt-Power in zugehörigen Site-Battles.',
      'regional-site-battle', 'registered fleet power', { region })], true);
  }

  for (const [id, printedSide, targets] of [['Dark:682', 'Dark', 'rebel-trooper-or-y-wing'], ['Light:2859', 'Light', 'stormtrooper-or-tie']]) {
    register([id], [
      continuous('warRoomForfeit', 'Bei Kontrolle mit einem Leader am Ort erleiden die betroffenen Karten auf dem Tisch Forfeit −1.', targets,
        'registered Premiere locations', { printedSide, amount: -1 }),
      continuous('extraBattleDestiny', 'Die Seite mit diesem Ortswortlaut erhält beim Initiieren hier einen zusätzlichen Battle-Destiny-Draw.',
        'battle-initiator', 'War Room', { printedSide: printedSide === 'Dark' ? 'Light' : 'Dark', amount: 1, duration: 'battle', expires: 'battle end' }),
    ]);
  }

  for (const [id, ally] of [['Light:2052', 'Rebel'], ['Dark:2355', 'Imperial']]) {
    register([id], [{ event: 'freeSiteDeploy', cost: 0, targets: ally, duration: 'instant', expires: 'after deploy',
      summary: 'Deploy frei an einer Site mit einem eigenen ' + ally + ' mit Ability über 2.', test: 'registered free deployment' }], true);
  }
  register(['Light:1883'], [
    { event: 'freeSiteDeploy', cost: 0, targets: 'moisture-farm', duration: 'instant', expires: 'after deploy',
      summary: 'Owen Lars wird an Lars’ Moisture Farm frei ausgespielt.', test: 'registered free deployment' },
    characterStat('characterPower', 2, 'Owen erhält an derselben Site wie Beru oder ein Vaporator Power +2.', { companions: ['Light:221', 'Light:2705'] }),
  ]);
  register(['Light:221'], [
    characterStat('characterForfeit', 2, 'Beru erhält an derselben Site wie Owen oder eine Hydroponics Station Forfeit +2.', { companions: ['Light:1883', 'Light:1196'] }),
  ]);
  register(['Dark:406'], [
    characterStat('characterPower', 1, 'Chief Bast erhält an derselben Site wie Tarkin Power +1.', { companions: ['Dark:1061'] }),
  ]);
  register(['Dark:478'], [
    characterStat('characterPower', 1, 'Yularen erhält an derselben Site wie Tarkin, Bast oder Dodonna Power +1.',
      { companions: ['Dark:1061', 'Dark:406', 'Light:1021'] }),
  ]);
  register(['Dark:12'], [
    characterStat('characterPower', 1, 'Fivedesix erhält an derselben Site wie Motti oder Yularen Power +1.', { companions: ['Dark:60', 'Dark:478'] }),
  ]);
  register(['Dark:643'], [
    characterStat('characterPower', 2, 'Dathcha erhält an Sites außerhalb von Tatooine Power +2.', { outsideRegion: 'tatooine' }),
  ]);
  register(['Dark:668'], [
    characterStat('characterPower', -1, 'Der Death Star Trooper verliert außerhalb der Death-Star-Sites 1 Power.', { outsideRegion: 'death star' }),
  ]);
  register(['Dark:1027'], [
    characterStat('characterForfeit', 1, 'Tagge erhält an einer Site Forfeit +1 je anwesendem Imperial Trooper.', { eachPresent: 'imperial-trooper' }),
  ], true);
  register(['Light:1021'], [
    characterStat('rebelAura', 1, 'Mit Dodonna an einer Yavin-4-Site anwesende Rebels erhalten Power +1.', { region: 'yavin 4' }),
  ]);
  register(['Light:1495'], [
    characterStat('rebelAura', 1, 'Mit Leia an einer Death-Star-Site anwesende Rebels erhalten Power +1.', { region: 'death star' }),
  ]);
  register(['Dark:2648'], [
    characterStat('tuskenPower', 1, 'Ein anderer anwesender nicht einzigartiger Tusken Raider gibt Power +1. Vier eigene anwesende Raider geben insgesamt weitere Power +2.',
      { groupAmount: 2, minimum: 4 }),
  ]);

  const device = (id, targets, cost, summary, fields) => register([id], [continuous('device', summary, targets,
    'registered devices', { cost, ...fields })], true);
  device('Light:2435', 'rebel-or-alien', 1, 'Rebel oder Alien erhält auf Tatooine Power und Forfeit +2.', { bonus: 'tatooine-belt' });
  device('Dark:2360', 'imperial-or-alien', 1, 'Imperial oder Alien erhält Power und Forfeit +1, auf dem Death Star jeweils +2.', { bonus: 'stormtrooper-belt' });
  for (const id of ['Light:997', 'Dark:996']) {
    device(id, 'starship-at-system-with-bay', 0, 'Die Tanks erhöhen Hyperspeed, Power und Maneuver des Schiffs um 1.', { bonus: 'supply-tanks' });
  }
  register(['Dark:489'], [
    continuous('device', 'Comlink kostet beim Deploy 1 Force und eröffnet Deploy-React-Optionen am Ort des Trägers oder an einer Nachbar-Site.',
      'character', 'Comlink equips', { cost: 1, since: 2, deployReact: true }),
  ]);
  register(['Dark:1939'], [
    continuous('locationEffect', 'Ergänzt je ein Light- und Dark-Force-Icon an einer Location. Mehrere Kopien am selben Ort geben den Bonus einmal.',
      'location', 'registered location effects', { expires: 'when canceled', iconBonus: 1 }),
  ], true);
  register(['Light:2110'], [
    continuous('rotateLocation', 'Revolution kostet 3 Force. Es vertauscht Force-Icons und Spieltextseiten. Alter kann die Ausspielaktion aufheben oder die ursprüngliche Ausrichtung wiederherstellen.',
      'location', 'Alter restores a rotated location', { cost: 3, since: 2, expires: 'when canceled' }),
  ]);
  register(['Light:664'], [
    continuous('locationEffect', 'Ein eigener Droide holt die Pläne von einer Death-Star-Site außerhalb der Docking Bay und bringt sie zu einer Yavin-4-Site. Drei Destiny-Draws bestimmen die Rückgewinnung.',
      'droid-outside-death-star', 'Death Star Plans tracks', { expires: 'completion, cancellation or target lost', mission: 'death-star-plans' }),
  ], true);
  register(['Light:1429'], [
    continuous('locationEffect', 'Ein eigener Schmuggler fliegt von einem anderen System nach Kessel und zurück. Ein gegnerischer Destiny-Draw von 0 kostet das Schiff. Bei Rückkehr wird die beim Ausspielen festgelegte Parsec-Distanz an Force zurückgeholt.',
      'smuggler-aboard-starship', 'Kessel Run tracks', { expires: 'completion, cancellation or target lost', mission: 'kessel-run', since: 2 }),
  ], true);
  register(['Light:305'], [
    continuous('kesselSmuggler', 'BoShek darf einen Kessel Run anstelle eines Schmugglers fliegen. Seine Pilot-Power und gedruckte Attrition-Immunität gelten daneben.',
      'BoShek aboard a starship', 'Kessel Run tracks', { since: 2 }),
  ]);
  register(['Dark:1426', 'Light:1427'], [
    continuous('blockKesselRun', 'Wer die Seite mit diesem Ortswortlaut kontrolliert, verhindert oder hebt Kessel Run auf.',
      'Kessel Run at Kessel', 'Kessel Run tracks', { printedSide: 'Dark', since: 2 }),
  ]);
  register(['Light:80'], [
    continuous('opponentBattleDestiny', 'Die Light-Seite von Alderaan zieht von jedem gegnerischen Battle-Destiny-Draw 1 ab.',
      'opponent at Alderaan', 'Alderaan reduces opposing destiny', { printedSide: 'Light', amount: -1, legacy: true }),
  ]);

  function entry(card) {
    const definition = cards.get(card.id);
    return { cardId: card.id, source: card.images?.slip ?? card.images?.print ?? null, text: card.texts?.active ?? card.gametext ?? null,
      effects: definition?.effects ?? [], complete: definition?.complete ?? false };
  }

  function effects(card, event) {
    return (cards.get(card?.id)?.effects ?? []).filter(effect => effect.event === event);
  }

  return Object.freeze({ entry, effects });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PremiereCardRules;
