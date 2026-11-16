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
  const printed = (printedSide, event, summary, fields = {}, test = 'registered location text follows printed sides') =>
    continuous(event, summary, 'active side of location', test, { printedSide, legacy: true, ...fields });
  const drain = side => printed(side, 'forceDrain', 'Wer diese Seite kontrolliert, erhält beim Force Drain hier +1.', { amount: 1 });
  const weaponDestiny = printed('Dark', 'weaponDestiny', 'Jeder eigene Waffen-Destiny-Draw von hier erhält +1.', { amount: 1 });
  const minimumSix = side => printed(side, 'minimumBattleAbility', 'Für reguläre Battle Destiny ist hier mindestens Ability 6 erforderlich.', { amount: 6 });

  for (const [id, light, dark] of [
    ['Light:676', 1, 1], ['Dark:675', 2, 0], ['Light:2447', 1, 2],
    ['Dark:2446', 2, 1], ['Light:2853', 0, 2], ['Dark:2852', 1, 1],
  ]) {
    register([id], [['Light', light], ['Dark', dark]].map(([side, cost]) =>
      printed(side, 'dockingTransit', 'Docking-Bay-Transit von dieser Seite kostet ' + cost + ' Force.', { cost })), true);
  }
  register(['Light:608'], [
    printed('Light', 'shipDeploy', 'Capital Starships werden hier für 2 Force weniger und Starfighters für 1 Force weniger ausgespielt.',
      { fighterDiscount: 1, capitalDiscount: 2 }),
    drain('Dark'),
  ], true);
  register(['Dark:607'], [
    printed('Dark', 'shipReact', 'Eigene Starships können sich als React hierher bewegen.', {}, 'starships react to the printed side of Dantooine'),
  ], true);
  register(['Dark:79'], [
    printed('Dark', 'controlSiteDrain', 'Beim Force Drain hier zählt jede kontrollierte Death-Star-Site als +1.', { region: 'Death Star' }),
  ], true);
  register(['Light:672'], [
    drain('Light'),
    printed('Light', 'releasePrisoners', 'Bei Kontrolle werden die auf dem Todesstern inhaftierten Charaktere an ihrer jeweiligen Site befreit.',
      { since: 5, region: 'death star' }, 'Detention Block releases only imprisoned characters'),
  ], true);
  register(['Dark:669'], [
    drain('Light'),
    printed('Dark', 'freeNamedDeploy', 'Bei Kontrolle werden Wrong Turn und Retract The Bridge frei ausgespielt.',
      { since: 5, names: ['wrong turn', 'retract the bridge'] }, 'Central Core waives Wrong Turn'),
    printed('Light', 'cancelSiteDevice', 'Bei Kontrolle wird Death Star Tractor Beam aufgehoben.',
      { since: 5, name: 'death star tractor beam' }, 'Central Core cancels the Tractor Beam'),
  ]);
  register(['Light:680'], [
    printed('Light', 'deployWithoutIcons', 'Diese Seite darf hier ohne eigene Presence oder Force-Icons ausspielen.'),
    drain('Light'),
  ], true);
  register(['Dark:673'], [weaponDestiny, drain('Light')], true);
  register(['Dark:2461'], [weaponDestiny, drain('Dark')], true);
  register(['Dark:678'], [
    printed('Dark', 'militaryCorridorMove', 'Imperials dürfen in ihrer Move Phase frei von hier zu einer Death-Star-Site ziehen.'),
    drain('Light'),
  ], true);
  register(['Light:2448'], [minimumSix('Dark')], true);
  register(['Light:2455'], [
    printed('Light', 'jawaDeploy', 'Deine Jawas kosten hier 1 eigene Force, bei anwesendem Sandcrawler sind sie frei.', { freeWithCrawler: true }),
  ], true);
  register(['Light:2462'], [
    printed('Light', 'characterDeploy', 'Beru Lars und Luke Skywalker werden hier für 1 Force weniger ausgespielt.',
      { names: ['beru lars','luke skywalker'], amount: 1 }),
    weaponDestiny,
  ], true);
  register(['Light:2466'], [
    printed('Light', 'cantinaMove', 'In deiner Control Phase kannst du frei zwischen Mos Eisley und der Cantina ziehen.'),
  ], true);
  register(['Light:2471'], [
    printed('Light', 'characterDeploy', 'Obi-Wan Kenobi wird hier für 3 Force weniger ausgespielt.', { names: ['obi-wan kenobi'], amount: 3 }),
    drain('Dark'),
  ], true);
  register(['Light:2858'], [
    printed('Light', 'firstTurn', 'Wählt Light diese Location als Starting Location, beginnt Light Side.',
      { since: 4 }, 'Massassi Throne Room starts the Light turn'),
    drain('Dark'),
  ], true);
  for (const [id, side, subtype] of [['Light:2855', 'Light', 'Rebel'], ['Dark:2854', 'Dark', 'Imperial']]) {
    const effects = [printed(side, 'aloneInJungle', 'Ein alleiniger ' + subtype + ' erhält hier im Battle Power +2 und ist immun gegen Attrition.',
      { subtype, amount: 2, since: 4 }, 'Jungle bonuses require an active character alone at the site')];
    if (side === 'Light') effects.push(drain('Dark'));
    register([id], effects, true);
  }

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
    printed('Dark', 'jawaDeploy', 'Deine Jawas kosten hier 1 eigene Force.'),
  ], true);
  register(['Dark:2458'], [
    atLocation('Dark', 'forfeit', 'tusken', 1, 'Dark-Tusken Raiders erhalten am Ort Forfeit +1.', true),
    drain('Dark'),
    minimumSix('Light'),
  ], true);
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
    ], true);
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
  register(['Dark:634'], [
    continuous('battleDestiny', 'In einem Battle gibt Vader jedem eigenen Battle-Destiny-Draw +1.', 'own battle destiny',
      'Vader increases each Dark battle destiny', { amount: 1, legacy: true }),
    continuous('pilotPower', 'Vader erhöht die Power des pilotierten Schiffs um 3. In seiner Custom TIE gibt er stattdessen Power +4 und Maneuver +3.',
      'piloted starship', 'Vader and Tarkin apply their printed pilot bonuses', { amount: 3 }),
    continuous('attritionImmunity', 'Vader ist immun gegen Attrition unter 5.', 'Vader', 'immune Vader still requires vulnerable Trooper forfeit', { below: 5 }),
  ], true);
  register(['Dark:1061'], [
    continuous('pilotPower', 'Tarkin erhöht die Power des pilotierten Schiffs um 2.', 'piloted starship',
      'Vader and Tarkin apply their printed pilot bonuses', { amount: 2 }),
    { event: 'cancelBattleDraw', summary: 'Ist Tarkin mit Vader am selben Battle beteiligt, kann er einmal pro Battle einen gegnerischen Destiny-Draw aufheben.',
      cost: 0, targets: 'just drawn opposing destiny in battle', duration: 'instant', expires: 'after cancellation',
      test: 'Tarkin with Vader cancels', legacy: true },
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
  register(['Light:2102', 'Dark:2833'], [
    continuous('tableEffect', 'Liegt auf der gegnerischen Tischseite. Die Warriors dieser Seite kosten beim Deploy 1 Force mehr.',
      'opposing table', 'Central Core waives Wrong Turn', { since: 5, cost: 3, warriorDeploy: 1, expires: 'when canceled' }),
  ], true);
  register(['Light:2277'], [
    { event: 'cancelTableEffect', summary: 'Kann Wrong Turn beim Ausspielen oder auf dem Tisch als Lost Interrupt aufheben.',
      targets: ['Dark:2833'], cost: 0, duration: 'instant', expires: 'after cancellation', test: 'Skywalkers cancels Wrong Turn', since: 5 },
  ]);
  register(['Dark:613'], [
    { event: 'cancelTableEffect', summary: 'Kann Restricted Deployment beim Ausspielen oder auf dem Tisch als Lost Interrupt aufheben.',
      targets: ['Light:2102'], cost: 0, duration: 'instant', expires: 'after cancellation', test: 'Skywalkers cancels Wrong Turn', since: 5 },
  ]);
  for (const [id, targets] of [['Light:348', 'rebel-or-jawa'], ['Dark:347', 'imperial-or-jawa']]) {
    register([id], [
      continuous('device', 'Caller wird an einen eigenen berechtigten Träger angelegt.', targets, 'Caller steals', { since: 3 }),
      { event: 'stealDroid', summary: 'In deiner Control Phase kannst du einen gegnerischen Droiden mit Restraining Bolt an derselben Site übernehmen. Der Bolt geht auf die Hand seines Besitzers.',
        targets: 'opposing restrained droid at same site', cost: 0, duration: 'permanent', expires: 'when control changes', test: 'Caller steals', since: 3 },
    ]);
  }
  register(['Light:2100', 'Dark:2099'], [
    continuous('restrainDroid', 'Kostet keine Force. Wird an einen Droiden an einer Site angelegt und sperrt dessen Bewegung und Kartentext.', 'droid at site',
      'Restraining Bolt blocks', { since: 3 }),
    { event: 'transferBolt', summary: 'In deiner Deploy Phase kannst du den Bolt kostenlos an einen anderen Droiden an derselben Site übertragen.',
      targets: 'another droid at same site', cost: 0, duration: 'instant', expires: 'after transfer', test: 'Restraining Bolt blocks', since: 3 },
  ]);
  register(['Dark:777'], [
    continuous('locationEffect', 'Der unbewegliche Droid Detector sperrt Droiden-Deploy an einer Innen-Site. Ab dem folgenden Zug gehen dort anwesende Droiden jeweils am Zugende verloren.',
      'interior site', 'Droid Detector bars', { since: 3, siteDevice: 'droid-detector', requiredTag: 'Interior' }),
  ], true);
  register(['Light:1778', 'Dark:2373'], [
    continuous('locationEffect', 'Legt ein Planetensystem unter Nachtbedingungen für dessen Sites. In Battles dort zählen zusätzliche Destiny-Draws nur zur Power. Spione werden an Nacht-Sites frei ausgespielt.',
      'planet system', 'Nightfall and Sunsdown', { since: 3, nightfall: true }),
  ], true);

  for (const [ids, name, directTarget, drawTarget] of [
    [['Light:2217', 'Dark:2216'], 'Sense', 'Alter', 'Interrupt oder React'],
    [['Light:95', 'Dark:94'], 'Alter', 'Sense', 'Effect oder Utinni Effect'],
  ]) {
    register(ids, [
      { event: 'counter', mode: 'direct', name, targets: directTarget.toLowerCase(), cost: 0, duration: 'instant', expires: 'after resolution',
        summary: 'Hebt gerade gespieltes ' + directTarget + ' ohne Destiny auf.', test: 'Sense and Alter offer', since: 3 },
      { event: 'counter', mode: 'destiny', name, targets: drawTarget, cost: 0, duration: 'instant', expires: 'after resolution',
        summary: 'Hebt ' + drawTarget + ' auf, wenn Destiny unter der höchsten Ability eines eigenen Charakters auf dem Tisch liegt.',
        test: 'Sense and Alter offer', since: 3 },
    ]);
  }
  register(['Light:2514', 'Dark:1831'], [
    { event: 'shufflePile', summary: 'Mische das nicht leere Reserve Deck, den Used Pile oder den Lost Pile einer beliebigen Seite, ohne Karten aufzudecken.',
      cost: 0, targets: 'Reserve Deck, Used Pile or Lost Pile', duration: 'instant', expires: 'after shuffle', test: 'Pile shuffling', since: 3 },
  ], true);
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
  register(['Light:1870'], [
    continuous('locationEffect', 'Ein Rebel von Tatooine reist nach Alderaan. Bei Ankunft werden pro eigenem Force-Attuned-Charakter 1 Force und pro Force-Sensitive-Charakter oder Jedi 2 Force zurückgeholt.',
      'Rebel on Tatooine', 'Our Most Desperate Hour reaches Alderaan', { expires: 'completion, cancellation or target lost', mission: 'desperate-hour', since: 3 }),
  ], true);
  register(['Light:305'], [
    continuous('kesselSmuggler', 'BoShek darf einen Kessel Run anstelle eines Schmugglers fliegen. Seine Pilot-Power und gedruckte Attrition-Immunität gelten daneben.',
      'BoShek aboard a starship', 'Kessel Run tracks', { since: 2 }),
  ]);
  const blockKesselRun = continuous('blockKesselRun', 'Wer die Seite mit diesem Ortswortlaut kontrolliert, verhindert oder hebt Kessel Run auf.',
    'Kessel Run at Kessel', 'Kessel Run tracks', { printedSide: 'Dark', since: 2 });
  register(['Light:1427'], [drain('Light'), blockKesselRun], true);
  register(['Dark:1426'], [
    printed('Dark', 'shipDeploy', 'Eigene Schiffe kosten 1 Force weniger. Mit Tarkin an Bord eines Schiffs hier sind es 2 Force weniger.',
      { fighterDiscount: 1, capitalDiscount: 1, tarkinDiscount: 2 }),
    minimumSix('Light'),
    blockKesselRun,
  ], true);
  register(['Light:80'], [
    continuous('opponentBattleDestiny', 'Die Light-Seite von Alderaan zieht von jedem gegnerischen Battle-Destiny-Draw 1 ab.',
      'opponent at Alderaan', 'Alderaan reduces opposing destiny', { printedSide: 'Light', amount: -1, legacy: true }),
    drain('Dark'),
  ], true);

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
