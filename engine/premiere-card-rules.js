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
  register(['Light:2'], [
    continuous('nighttimeRebelAlien', 'Bei Nacht erhalten deine Rebels und Aliens an derselben Planetensite +2 Power.',
      'allied Rebels and aliens', 'Tooex grants power and station immunity only under nighttime conditions', { amount:2, since:14 }),
    continuous('nighttimeRebelAlienImmunity', 'Ist Hydroponics Station dort anwesend, sind diese Karten zusätzlich immun gegen Attrition unter 3.',
      'allied Rebels and aliens', 'Tooex grants power and station immunity only under nighttime conditions', { below:3, since:14 }),
  ],true);
  register(['Dark:934'], [
    continuous('battleCostFromIcons','Ohne anwesenden Droiden wird der Kampfpreis für beide Seiten auf die Zahl der bei Trevagg anwesenden Force-Icons gesetzt.',
      'his location', 'Feltipern Trevagg resets the cost using icons present with him', {since:15}),
  ],true);
  register(['Dark:1011'], [
    continuous('imperialDiscount','Ist dort ein Rebel mit Ability über 2, werden Imperials an Garindans Location für 1 Force weniger ausgespielt.',
      'Imperials at his location', 'Garindan enables deployment and adjacent moves only with an eligible Rebel', {amount:1,since:15}),
    continuous('imperialMove','Bei derselben Bedingung können Imperials in deiner Move Phase kostenlos von einer angrenzenden Site zu Garindan ziehen.',
      'Imperials at an adjacent site', 'Garindan enables deployment and adjacent moves only with an eligible Rebel', {since:15}),
  ],true);
  register(['Dark:1445'], [
    continuous('cannotBoardEnclosed','Kann nicht auf Starfighter oder in geschlossene Fahrzeuge einsteigen.',
      'starfighters and enclosed vehicles', 'Kitik cannot board and is lost when Kal shares her site', {since:15}),
    continuous('lostWithKal','Geht sofort verloren, sobald Kal’Falnl C’ndros an derselben Site ist.',
      'same site as Kal’Falnl C’ndros', 'Kitik cannot board and is lost when Kal shares her site', {since:15}),
  ],true);
  register(['Dark:1922'], [
    continuous('combatPartner','Im Kampf an derselben Site wie Dr. Evazan erhält Ponda Baba +3 Power, sofern dort kein gegnerisches Lichtschwert anwesend ist.',
      'battle at the same site as Dr. Evazan', 'Ponda Baba gains power with Evazan unless a lightsaber is present', {amount:3,since:15}),
    continuous('pilotPower','Verleiht dem von ihm pilotierten Schiff +2 Power.',
      'piloted starship', 'Ponda Baba gains power with Evazan unless a lightsaber is present', {amount:2,legacy:true}),
  ],true);
  register(['Dark:2783'], [
    continuous('mechanicImmunity','Eigene Fahrzeuge und Droiden an derselben Location sind immun gegen Attrition unter 2.',
      'own vehicles and droids at his location', 'Treadwell protects friendly vehicles, droids and fighters', {below:2,since:15}),
    continuous('dockingMechanicImmunity','An einer Docking Bay schützt Treadwell eigene Starfighter am zugehörigen System und an zugehörigen Sektoren vor Attrition unter 3.',
      'own fighters at the related system and sectors', 'Treadwell protects friendly vehicles, droids and fighters', {below:3,since:15}),
  ],true);
  register(['Light:1883'], [
    { event: 'freeSiteDeploy', cost: 0, targets: 'moisture-farm', duration: 'instant', expires: 'after deploy',
      summary: 'Owen Lars wird an Lars’ Moisture Farm frei ausgespielt.', test: 'registered free deployment' },
    characterStat('characterPower', 2, 'Owen erhält an derselben Site wie Beru oder ein Vaporator Power +2.', { companions: ['Light:221', 'Light:2705'] }),
    continuous('larsLegacy','Geht Owen im gegnerischen Zug vom Tisch verloren, erhält Luke bis Ende deines nächsten Zugs +3 Power.',
      'Luke persona','Beru and Owen give Luke separate bonuses until the end of the next owner turn',{ amount:3,duration:'next owner turn',expires:'end of next owner turn',since:13 }),
  ], true);
  register(['Light:221'], [
    characterStat('characterForfeit', 2, 'Beru erhält an derselben Site wie Owen oder eine Hydroponics Station Forfeit +2.', { companions: ['Light:1883', 'Light:1196'] }),
    continuous('larsLegacy','Geht Beru im gegnerischen Zug vom Tisch verloren, erhält Luke bis Ende deines nächsten Zugs +3 Power.',
      'Luke persona','Beru and Owen give Luke separate bonuses until the end of the next owner turn',{ amount:3,duration:'next owner turn',expires:'end of next owner turn',since:13 }),
  ], true);
  register(['Dark:406'], [
    characterStat('characterPower', 1, 'Chief Bast erhält an derselben Site wie Tarkin Power +1.', { companions: ['Dark:1061'] }),
  ]);
  register(['Dark:478'], [
    characterStat('characterPower', 1, 'Yularen erhält an derselben Site wie Tarkin, Bast oder Dodonna Power +1.',
      { companions: ['Dark:1061', 'Dark:406', 'Light:1021'] }),
  ], true);
  register(['Dark:12'], [
    characterStat('characterPower', 1, 'Fivedesix erhält an derselben Site wie Motti oder Yularen Power +1.', { companions: ['Dark:60', 'Dark:478'] }),
    continuous('droidDeployTax', 'Verteuert gegnerische Droiden und eigene Mouse Droids beim Ausspielen an dieselbe Location um 1 Force.',
      'opposing droid or friendly mouse droid at same location', 'Fivedesix taxes opposing droids and friendly mouse droids at the location', { amount: 1, since: 9 }),
    continuous('nightImmunity', 'Bei Nacht immun gegen Attrition.', 'Fivedesix at a nighttime site',
      'Fivedesix taxes opposing droids and friendly mouse droids at the location', { legacy: true }),
  ], true);
  register(['Dark:643'], [
    characterStat('characterPower', 2, 'Dathcha erhält an Sites außerhalb von Tatooine Power +2.', { outsideRegion: 'tatooine' }),
    continuous('jawaDeploy', 'An einer Tatooine-Site können beide Spieler je 2 Force für seinen Deploy bezahlen. Jawa Camp kann diese Kosten ersetzen.',
      'Tatooine site and both Force Piles', 'Dathcha pays with both Force Piles even when deploying aboard',
      { cost: 2, opposingCost: 2, duration: 'instant', expires: 'after deploy', legacy: true }),
  ], true);
  register(['Light:1373','Dark:1372'], [
    continuous('jawaDeploy', 'Kann nur auf Tatooine ausgespielt werden. Normalerweise bezahlen beide Spieler je 1 Force. Jawa Camp kann die Kosten ersetzen.',
      'Tatooine site and both Force Piles', 'Jawa deployment honors the Tatooine restriction', { cost: 1, opposingCost: 1, duration: 'instant', expires: 'after deploy', legacy: true }),
  ], true);
  register(['Dark:668'], [
    characterStat('characterPower', -1, 'Der Death Star Trooper verliert außerhalb der Death-Star-Sites 1 Power.', { outsideRegion: 'death star' }),
    continuous('deployRegion', 'Nur auf dem Death Star ausspielbar. Spätere Bewegung an andere erlaubte Orte bleibt möglich.',
      'Death Star site', 'Death Star Trooper can deploy only on the Death Star', { region: 'death star', legacy: true }),
  ], true);
  register(['Dark:2834'], [
    continuous('wuherControl', 'Zu Beginn der eigenen Control-Phase gehen alle an derselben Site anwesenden Waffen und Droiden verloren.',
      'all weapons and droids present at same site', 'Wuher clears the Cantina and acts only at the start of Control elsewhere',
      { duration: 'instant', expires: 'after resolving', legacy: true }),
    continuous('wuherCantina', 'Wenn Wuher in der Cantina ist, gehen Waffen und Droiden dort sofort verloren.',
      'all weapons and droids at Cantina', 'Wuher clears the Cantina and acts only at the start of Control elsewhere',
      { duration: 'instant', expires: 'after resolving', legacy: true }),
  ], true);
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
    continuous('attritionImmunity', 'Leia hat diplomatische Immunität gegen Attrition unter 2.',
      'Leia Organa', 'Leia improves Death Star Rebels but not herself', { below: 2, legacy: true }),
  ], true);
  register(['Dark:2648'], [
    characterStat('tuskenPower', 1, 'Ein anderer anwesender nicht einzigartiger Tusken Raider gibt Power +1. Vier eigene anwesende Raider geben insgesamt weitere Power +2.',
      { groupAmount: 2, minimum: 4 }),
    continuous('deployRegion', 'Kann nur auf Tatooine ausgespielt werden.',
      'Tatooine site', 'Tusken Raiders count present non-unique copies', { region: 'tatooine', legacy: true }),
  ], true);
  register(['Dark:741'], [
    continuous('forceIconPower', 'Erhält +1 Power pro Dark-Force-Icon an der Location und weitere +2 bei Nacht.',
      'this character', 'Djas Puhr counts Dark Force icons and nighttime', { amount: 1, nightAmount: 2, since: 7 }),
    continuous('attritionImmunity', 'Djas Puhr ist immun gegen Attrition unter 3.',
      'Djas Puhr', 'Djas Puhr counts Dark Force icons and nighttime', { below: 3, since: 7 }),
  ], true);
  register(['Dark:816'], [
    continuous('nonPowerDroidAura', 'Erhöht die Power jedes eigenen anwesenden Droiden außer Power Droids um 1.',
      'friendly non-power droid present', 'EG-6 boosts friendly non-power droids', { amount: 1, legacy: true }),
    continuous('battlePowerDouble', 'Destiny ist 0. Als Battle Destiny kann sie bei geringerer eigener Power die eigene Power einmal pro Battle verdoppeln.',
      'your power present before destiny', 'EG-6 battle destiny doubles underdog Dark present power', { duration: 'once per battle', expires: 'after battle', legacy: true }),
  ], true);

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
  register(['Light:1039'], [
    continuous('extraBattleDestiny', 'Kämpft Luke zusammen mit Obi-Wan oder Yoda, können zwei Battle Destiny hinzugefügt werden.',
      'Luke and Obi-Wan or Yoda participating in same battle', 'Gift of the Mentor pairs Luke with a mentor', { amount: 2, duration: 'rest of battle', legacy: true }),
    continuous('searchLightsaber', 'Für 1 Force ein Lichtschwert aus dem Reserve Deck aufdecken und auf die Hand nehmen. Danach wird das Reserve Deck gemischt.',
      'lightsaber in own Reserve Deck', 'Gift of the Mentor searches only for a lightsaber', { cost: 1, duration: 'instant', expires: 'after resolving', since: 10 }),
  ], true);
  const defendingDestiny = (summary, draws, fields) =>
    continuous('defendingDestiny', summary, 'sole defending character', 'Defending battle interrupts distinguish lone characters and printed modes',
      { draws, duration: 'rest of battle', expires: 'after battle', since: 11, ...fields });
  register(['Dark:1691'], [
    defendingDestiny('Verteidigt Tarkin allein, zwei Battle Destiny hinzufügen.',2,{ character: 'grand moff tarkin' }),
    defendingDestiny('Verteidigt ein Alien allein, eine Battle Destiny hinzufügen.',1,{ subType: 'Alien' }),
  ], true);
  register(['Light:2297'], [
    defendingDestiny('Verteidigt Han eine Site allein, zwei Battle Destiny hinzufügen.',2,{ character: 'han solo', siteOnly: true }),
    defendingDestiny('Verteidigt ein Alien eine Site allein, eine Battle Destiny hinzufügen.',1,{ subType: 'Alien', siteOnly: true }),
  ], true);
  register(['Light:2740'], [
    defendingDestiny('Verteidigt ein Warrior eine Site allein, eine Battle Destiny hinzufügen.',1,{ warrior: true, siteOnly: true }),
    defendingDestiny('Verteidigt Leia eine Site allein, zwei Battle Destiny hinzufügen.',2,{ character: 'leia organa', siteOnly: true }),
  ], true);
  register(['Dark:1578'], [
    defendingDestiny('Verteidigt ein Warrior eine Site allein, eine Battle Destiny hinzufügen.',1,{ warrior:true,siteOnly:true,since:12 }),
    defendingDestiny('Verteidigt Tagge eine Site allein, zwei Battle Destiny hinzufügen.',2,{ character:'general tagge',siteOnly:true,since:12 }),
  ],true);
  for(const [id,character,faction] of [['Light:1455','obi-wan kenobi','Rebel'],['Dark:2701','darth vader','Imperial']]){
    register([id],[
      defendingDestiny('Verteidigt '+character+' eine Site allein, +1 Power und eine zusätzliche Battle Destiny.',1,
        { character,siteOnly:true,power:1,since:12 }),
      defendingDestiny('Verteidigt ein anderer '+faction+' mit mehr als 2 Ability eine Site allein, eine Battle Destiny hinzufügen.',1,
        { subType:faction,except:character,minimumAbility:3,siteOnly:true,since:12 }),
    ],true);
  }
  register(['Light:994'],[
    defendingDestiny('Verteidigt ein eigener Pilot oder permanenter Pilot im All allein, eine Battle Destiny hinzufügen.',1,
      { pilot:true,spaceOnly:true,since:12 }),
    defendingDestiny('Verteidigt Luke im All allein, +1 Power und eine zusätzliche Battle Destiny.',1,
      { character:'luke skywalker',spaceOnly:true,power:1,since:12 }),
  ],true);
  register(['Dark:1576'],[
    defendingDestiny('Verteidigt ein eigener Pilot oder permanenter Pilot im All allein, eine Battle Destiny hinzufügen.',1,
      { pilot:true,spaceOnly:true,since:12 }),
    defendingDestiny('Verteidigt Motti im All allein, zwei Battle Destiny hinzufügen.',2,
      { character:'admiral motti',spaceOnly:true,since:12 }),
  ],true);
  for(const [id, own, opponent, special, summary] of [
    ['Dark:391','grand moff tarkin','Rebel','leia organa','Kämpft Tarkin gegen einen Rebel mit mehr als 2 Ability, eine zusätzliche Destiny ziehen. Gegen Leia sind es zwei.'],
    ['Light:2531','luke skywalker','Imperial','darth vader','Kämpft Luke gegen einen Imperial mit mehr als 2 Ability, eine zusätzliche Destiny ziehen. Gegen Vader sind es zwei.'],
  ]){
    register([id],[
      continuous('opposedDestiny', summary, 'own named character and an opposing character of ability > 2',
        'Paired combat interrupts check opposing ability and the named opponent',
        { own, opponent, special, duration: 'rest of battle', expires: 'after battle', since: 11 }),
    ],true);
  }
  register(['Dark:1215'],[
    continuous('opposedDestiny','Kämpft ein eigener Dark Jedi gegen einen Rebel mit mehr als 2 Ability, eine Battle Destiny hinzufügen. Gegen Luke sind es zwei.',
      'Dark Jedi and opposing Rebel of ability > 2','I Have You Now identifies a Dark Jedi and the chosen Rebel',
      { ownRank:'Dark Jedi',opponent:'Rebel',special:'luke skywalker',duration:'rest of battle',expires:'after battle',since:13 }),
  ],true);
  register(['Light:1874'],[
    continuous('openingDestiny','Für 1 Force eine Battle Destiny hinzufügen, wenn der Gegner gerade im All einen Kampf initiiert hat und dort ein eigenes Schiff mit Maneuver über 3 ist.',
      'opposing just initiated battle in space; own starship with maneuver > 3','Out of Nowhere responds only to an opposing space battle',
      { cost:1,draws:1,duration:'rest of battle',expires:'after battle',since:13 }),
  ],true);
  register(['Light:1104'],[
    continuous('replacementBattleDestiny','Für 1 Force eine eigene gerade gezogene Battle Destiny ersetzen, wenn eine eigene beteiligte Figur mehr als 2 Ability hat.',
      'own just drawn battle destiny','Han’s Dice replaces a battle destiny after the response window',
      { cost:1,duration:'instant',expires:'after resolving',since:13 }),
  ],true);
  register(['Dark:2406'],[
    continuous('swapBattleDestiny','Für 1 Force die beiden Destiny-Werte tauschen, nachdem beide Seiten je eine Battle Destiny erfolgreich gezogen haben.',
      'both single completed battle destiny draws','Takeel swaps individual draws and leaves the total modifiers in place',
      { cost:1,duration:'instant',expires:'after resolving',since:13 }),
  ],true);
  register(['Dark:2634'],[
    continuous('trooperCharge','Ein beteiligter eigener Trooper erhält +2 Power für diesen Kampf, ein Death Star Trooper +3. Er muss anschließend forfeitet werden.',
      'own participating Imperial trooper','Trooper Charge targets a trooper and makes its forfeit mandatory',
      { amount:2,specialAmount:3,duration:'rest of battle',expires:'after battle',since:13 }),
  ],true);
  for(const [id, characters, cost] of [
    ['Light:1102','Han',1],['Light:1500','Leia',1],['Light:1600','Luke',1],
    ['Light:2105','Obi-Wan',1],['Dark:2528','Vader, Tarkin, Motti oder Tagge',2],
  ]){
    const test='Named Premiere retrieval and searches work during either turn';
    register([id], [
      continuous('retrieveNamedCharacter', 'Für '+cost+' Force eine der genannten Figuren aus dem Lost Pile auf den Used Pile holen.',
        characters,test,{ cost, duration: 'instant', expires: 'after resolving', since: 10 }),
      continuous('searchNamedCharacter', 'Für '+(cost+2)+' Force eine der genannten Figuren aus dem Reserve Deck aufdecken und auf die Hand nehmen. Danach das Deck mischen.',
        characters,test,{ cost: cost+2, duration: 'instant', expires: 'after resolving', since: 10 }),
    ],true);
  }
  register(['Dark:613'], [
    { event: 'cancelTableEffect', summary: 'Kann Restricted Deployment beim Ausspielen oder auf dem Tisch als Lost Interrupt aufheben.',
      targets: ['Light:2102'], cost: 0, duration: 'instant', expires: 'after cancellation', test: 'Skywalkers cancels Wrong Turn', since: 5 },
  ]);
  for(const [ids,skill,summary,test] of [
    [['Light:826','Dark:190'],'pilot','Gibt einer eigenen Figur ohne Pilot-Skill diesen Skill und +2 Power für das pilotierte Schiff. Gibt einem vorhandenen Piloten stattdessen +1 Schiff-Power.','both pilot trainers grant pilot skill or a ship power bonus'],
    [['Light:2157','Dark:1430'],'warrior','Gibt einer eigenen Figur ohne Warrior-Skill diesen Skill. Ein vorhandener Warrior erhält stattdessen +1 Power.','both warrior trainers grant warrior skill or character power'],
    [['Light:2141'],'smuggler','Gibt einer eigenen Figur ohne Smuggler-Skill diesen Skill. Ein vorhandener Smuggler erhält stattdessen +1 Power.','Rycar Ryjerd grants smuggler skill or character power'],
  ]){
    register(ids,[continuous('tableEffect',summary+' Immun gegen Alter.','own character',test,
      {ownSide:true,trainingSkill:skill,since:16})],true);
  }
  for (const [id, targets] of [['Light:348', 'rebel-or-jawa'], ['Dark:347', 'imperial-or-jawa']]) {
    register([id], [
      continuous('device', 'Caller wird an einen eigenen berechtigten Träger angelegt.', targets, 'Caller steals', { since: 3 }),
      { event: 'stealDroid', summary: 'In deiner Control Phase kannst du einen gegnerischen Droiden mit Restraining Bolt an derselben Site übernehmen. Der Bolt geht auf die Hand seines Besitzers.',
        targets: 'opposing restrained droid at same site', cost: 0, duration: 'permanent', expires: 'when control changes', test: 'Caller steals', since: 3 },
      continuous('droidTheftOwnership', 'Der Droide gehört dir für die restliche Partie oder bis er erneut gestohlen wird. Bei einem Persona-Konflikt wählst du, welche Kopie verloren geht.',
        'stolen droid', 'both Callers update ownership and resolve duplicate personas', { since:14 }),
    ],true);
  }
  register(['Light:2100', 'Dark:2099'], [
    continuous('restrainDroid', 'Kostet keine Force. Wird an einen Droiden an einer Site angelegt und sperrt dessen Bewegung und Kartentext.', 'droid at site',
      'Restraining Bolt blocks', { since: 3 }),
    { event: 'transferBolt', summary: 'In deiner Deploy Phase kannst du den Bolt kostenlos an einen anderen Droiden an derselben Site übertragen.',
      targets: 'another droid at same site', cost: 0, duration: 'instant', expires: 'after transfer', test: 'Restraining Bolt blocks', since: 3 },
  ], true);
  register(['Light:2385','Dark:575'], [
    continuous('assault', 'Für 1 Force einen gegnerischen Force Drain aufheben. Pro gegnerischer anwesender Figur, Schiff oder Fahrzeug eine Destiny ziehen und die Summe mit der gegnerischen Power vergleichen. Die Seite mit dem niedrigeren Wert verliert die Differenz an Force.',
      'opposing Force drain and units present', 'both Premiere Assault cards compare destiny against present power',
      { cost: 1, duration: 'instant', expires: 'after resolving', legacy: true }),
  ], true);
  register(['Dark:1555'], [
    continuous('limitedResources', 'Hat die Gegenseite höchstens zwei Handkarten, verliert sie in deinem Zug 4 Force und in ihrem Zug 2 Force. Mit Fusion Generator Supply Tanks an Bord eines Starships verliert sie 2 Force weniger.',
      'opponent with at most two cards in hand', 'Limited Resources applies hand size, turn and ship tanks',
      { duration: 'instant', expires: 'after resolving', since: 10 }),
  ], true);
  register(['Dark:777'], [
    continuous('locationEffect', 'Der unbewegliche Droid Detector sperrt Droiden-Deploy an einer Innen-Site. Ab dem folgenden Zug gehen dort anwesende Droiden jeweils am Zugende verloren.',
      'interior site', 'Droid Detector bars', { since: 3, siteDevice: 'droid-detector', requiredTag: 'Interior' }),
  ], true);
  register(['Light:1196'], [
    continuous('locationEffect','Unbewegliches Device für 1 Force an einer Außen-Site von Tatooine.','exterior Tatooine site',
      'Hydroponics Station offers each permitted activation draw',{ cost:1,siteDevice:'hydroponics',requiredTag:'Exterior',deployRegion:'tatooine',since:13 }),
    continuous('activationDraw','Die erste aktivierte Karte darf direkt auf die Hand. Mit einem Vaporator auf dem Tisch gilt das auch für die zweite.',
      'first activated card; second with a Vaporator','Hydroponics Station offers each permitted activation draw',{ since:13 }),
  ],true);
  register(['Light:2705'], [
    continuous('locationEffect','Unbewegliches Device für 1 Force an einer Tatooine-Site.','Tatooine site',
      'Vaporator protects its site and adjacent sites from Gravel Storm',{ cost:1,siteDevice:'vaporator',deployRegion:'tatooine',since:13 }),
    continuous('gravelProtection','Schützt Figuren hier und an benachbarten Sites vor Gravel Storm.','characters at or next to the site',
      'Vaporator protects its site and adjacent sites from Gravel Storm',{ since:13 }),
  ],true);
  register(['Dark:1064'], [
    continuous('gravelStorm','An ausgewählten Tatooine-Sites eine gegnerische anwesende Figur anzielen. Sie geht verloren, wenn Destiny höher als ihre Ability ist.',
      'opposing character present at a listed unprotected site','Vaporator protects its site and adjacent sites from Gravel Storm',
      { sites:['dune sea','jundland wastes',"beggar\'s canyon","lars\' moisture farm",'jawa camp','mos eisley'],duration:'instant',expires:'after resolving',since:13 }),
  ],true);
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
    continuous('kesselSmuggler', 'BoShek darf einen Kessel Run anstelle eines Schmugglers fliegen.',
      'BoShek aboard a starship', 'Kessel Run tracks', { since: 2 }),
    continuous('pilotPower', 'Ein von BoShek gesteuertes Schiff erhält +3 Power.',
      'piloted ship', 'Premiere pilots apply bonuses only while piloting', { amount: 3, legacy: true }),
    continuous('attritionImmunity', 'BoShek ist immun gegen Attrition unter 3.',
      'BoShek', 'Premiere pilots apply bonuses only while piloting', { below: 3, legacy: true }),
  ], true);
  register(['Light:2040','Dark:1279'], [
    continuous('pilotPower', 'Ein von dieser Karte gesteuertes Schiff erhält +2 Power.',
      'piloted ship', 'Premiere pilots apply bonuses only while piloting', { amount: 2, legacy: true }),
  ], true);
  register(['Light:2038','Dark:1286'], [
    continuous('cannotMove', 'Diese Karte darf sich nicht bewegen. Sie kann von einem Transporter getragen werden.',
      'this character', 'Premiere guards gain defending power and cannot move', { since: 7 }),
    continuous('defendingPower', 'Wenn diese Karte einen Kampf verteidigt, erhält sie +4 Power.',
      'defending participant', 'Premiere guards gain defending power and cannot move', { amount: 4, since: 7 }),
  ], true);
  register(['Light:1556','Dark:1557'], [
    continuous('defuseMine', 'Kann im eigenen Zug für 1 Force eine Mine am selben Site entschärfen.',
      'revealed mine at same site', 'Premiere mining droids defuse mines at the same site', { cost: 1, duration: 'instant', expires: 'after resolving' }),
  ], true);
  register(['Light:1995'], [
    continuous('astromechStats', 'An Bord eines Starfighters steigen Power, Maneuver und Hyperspeed um je 1.',
      'starfighter aboard', 'Premiere navigation droids improve only their supported craft', { amount: 1, legacy: true }),
  ], true);
  register(['Light:2000','Dark:2001'], [
    continuous('vehicleDroidStats', 'An Bord eines Nicht-Kreaturenfahrzeugs steigen Power, Maneuver und Landspeed um je 1.',
      'non-creature vehicle aboard', 'Premiere navigation droids improve only their supported craft', { amount: 1, legacy: true }),
    continuous('transportDriver', 'Dieser Droide kann Transportfahrzeuge fahren.',
      'transport vehicle', 'Premiere navigation droids improve only their supported craft', { legacy: true }),
  ], true);
  for (const [id, ship, power, maneuver] of [
    ['Light:239','Red 3',2,1], ['Light:1098','Millennium Falcon',2,2], ['Dark:790','Black 2',3,1], ['Dark:791','Black 3',3,1],
    ['Light:1390','Red 6',2,1], ['Light:1924','Gold 5',2,1],
  ]) {
    const test = 'Premiere matching pilots grant maneuver and one fallback destiny';
    const effects = [
      continuous('pilotPower', 'Das gesteuerte Schiff erhält +' + power + ' Power.', 'piloted ship', test, { amount: power, legacy: true }),
      continuous('matchingPilot', 'Beim Steuern von ' + ship + ' gelten +' + maneuver + ' Maneuver und eine Battle Destiny, falls kein regulärer Draw möglich ist.',
        ship, test, { amount: maneuver, legacy: true }),
    ];
    if (id === 'Light:1098') effects.push(continuous('redrawOwnDestiny', 'Einmal pro Battle für 1 Force eigenes gerade gezogenes Destiny neu ziehen.',
      'own just drawn destiny', 'Han can pay for one replacement', { cost: 1, duration: 'once per battle', expires: 'after battle', legacy: true }));
    register([id], effects, true);
  }
  for (const [id, ship, squadron] of [['Light:799','Gold 1','gold'],['Light:2067','Red 1','red']]) {
    const test='Premiere squadron leaders raise only other matching pilots’ forfeit';
    register([id], [
      continuous('pilotPower', 'Das gesteuerte Schiff erhält +2 Power.', 'piloted ship', test, { amount: 2, legacy: true }),
      continuous('matchingPilot','Beim Steuern von '+ship+' gelten +1 Maneuver und eine Battle Destiny, falls sonst kein Draw möglich ist.',
        ship,test,{ amount:1,legacy:true }),
      continuous('squadronForfeit','Andere Piloten der eigenen Staffel an derselben Location erhalten +1 Forfeit.',
        squadron+' squadron pilot at same location',test,{ squadron,amount:1,since:12 }),
    ],true);
  }
  register(['Dark:60'],[
    continuous('imperialFleetDiscount','Mit mindestens zwei imperialen Raumschiffen auf dem Tisch kostet Motti 2 Force weniger.',
      'Imperial starships on table','Motti discounts his deploy and reduces Rebel pilot forfeit at the system',{ amount:2,legacy:true }),
    continuous('pilotPower','Das gesteuerte Schiff erhält +2 Power.','piloted ship',
      'Motti discounts his deploy and reduces Rebel pilot forfeit at the system',{ amount:2,legacy:true }),
    continuous('rebelPilotForfeit','Rebel-Piloten am selben System verlieren 1 Forfeit.','Rebel pilots at the same system',
      'Motti discounts his deploy and reduces Rebel pilot forfeit at the system',{ amount:-1,since:12 }),
  ],true);
  for(const [id,rank,faction] of [['Light:1389','Jedi Knight','Rebel'],['Dark:621','Dark Jedi','Imperial']]){
    register([id],[
      continuous('doubleBattlePower','Für 1 Force verdoppeln alle anderen beteiligten '+faction+
        '-Figuren am Ort ihre Kampf-Power, wenn ein eigener '+rank+' anwesend ist.',
        'present Jedi and other participating '+faction+' characters','Jedi Presence doubles only other matching participants',
        { rank,faction,cost:1,duration:'rest of battle',expires:'after battle',since:12 }),
    ],true);
  }
  register(['Light:1593'], [
    continuous('forceGeneration', 'Außerhalb von Tatooine erhöht Luke die eigene gesamte Force-Generierung um 1.',
      'Light Side total Force generation', 'Luke adds Force off Tatooine and his Red 5 maneuver bonus', { amount: 1, legacy: true }),
    continuous('pilotPower', 'Ein von Luke gesteuertes Schiff erhält +3 Power.',
      'piloted ship', 'Luke adds Force off Tatooine and his Red 5 maneuver bonus', { amount: 3, legacy: true }),
    continuous('matchingPilot', 'Beim Steuern von Red 5 erhält das Schiff +2 Maneuver.',
      'Red 5', 'Luke adds Force off Tatooine and his Red 5 maneuver bonus', { amount: 2, legacy: true }),
    continuous('attritionImmunity', 'Luke ist immun gegen Attrition unter 3.',
      'Luke Skywalker', 'Luke adds Force off Tatooine and his Red 5 maneuver bonus', { below: 3, legacy: true }),
  ], true);
  register(['Dark:1539'], [
    continuous('shipWeaponDiscount', 'Waffen kosten auf dem von Tanbris gesteuerten Schiff 1 Force weniger.',
      'Starship weapons that deploy on his ship', 'Tanbris discounts only weapons on the ship he pilots', { amount: 1, since: 7 }),
    continuous('pilotPower', 'Ein von Tanbris gesteuertes Schiff erhält +2 Power. Ein Starfighter erhält außerdem −1 Maneuver.',
      'piloted ship', 'Tanbris discounts only weapons on the ship he pilots', { amount: 2, legacy: true }),
  ], true);
  register(['Light:2625','Dark:2029'], [
    continuous('tableEffect', 'Für 1 Force auf der eigenen Tischseite ausspielen.', 'own side of table',
      'Traffic Control and Reactor Terminal recycle selected cards only during Control', { cost: 1, ownSide: true, since: 8 }),
    continuous('recycleHand', 'In der eigenen Control-Phase beliebig viele Handkarten in gewählter Reihenfolge auf den Used Pile legen.',
      'own hand and top of own Used Pile', 'Traffic Control and Reactor Terminal recycle selected cards only during Control',
      { duration: 'instant', expires: 'after resolving', since: 8 }),
  ], true);
  register(['Dark:1989'], [
    continuous('capitalAstromech', 'An Bord eines Capital Starships steigen Power und Hyperspeed um 1. Das Schiff ist immun gegen Attrition unter 3.',
      'capital starship aboard', 'R1-G4 modifies capital ships and cannot board fighters', { below: 3, amount: 1, legacy: true }),
    continuous('boardingRestriction', 'Darf nicht an Bord von Starfightern.', 'starfighters',
      'R1-G4 modifies capital ships and cannot board fighters', { legacy: true }),
  ], true);
  register(['Light:1407'], [
    continuous('pilotPower', 'Ein von Kal’Falnl gesteuertes Schiff erhält +2 Power.',
      'piloted ship', 'Kal’Falnl can pilot capital ships and move three sites', { amount: 2, since: 7 }),
    continuous('boardingRestriction', 'Darf nicht an Bord von Starfightern und geschlossenen Fahrzeugen.', 'starfighters and enclosed vehicles',
      'Kal’Falnl can pilot capital ships and move three sites', { legacy: true }),
    continuous('landspeed', 'Hat Landspeed 3.', 'this character', 'Kal’Falnl can pilot capital ships and move three sites', { amount: 3, legacy: true }),
    continuous('opposingDestinyZero', 'Haben beide Spieler genau eine Battle Destiny gezogen und ist deine höher, wird die gegnerische Battle Destiny auf 0 gesetzt.',
      'opponent in same battle', 'Kal’Falnl sets opposite single battle destiny to zero', { duration: 'rest of battle', legacy: true }),
  ], true);
  const starfighterTest = 'Premiere starfighter pilots and capacity follow their printed slots';
  const permanentPilot = continuous('permanentPilot', 'Der permanente Pilot stellt Ability 1 bereit.',
    'this starfighter', starfighterTest, { amount: 1, legacy: true });
  const capacityRule = (summary, capacity) => continuous('crewCapacity', summary, 'characters aboard',
    starfighterTest, { capacity, legacy: true });
  register(['Light:2838','Dark:2595'], [permanentPilot], true);
  register(['Dark:2600'], [
    permanentPilot,
    continuous('capitalDeployDiscount', 'Kostet 1 Force weniger bei einem Imperial Capital Starship am selben System.',
      'same system as an Imperial capital starship', 'TIE Fighter deploy discount needs an Imperial capital ship at the system',
      { amount: 1, legacy: true }),
  ], true);
  register(['Light:2907'], [permanentPilot, capacityRule('Kann einen zusätzlichen Piloten oder Passagier aufnehmen.', { shared: 1 })], true);
  register(['Light:2057'], [capacityRule('Kann einen Piloten aufnehmen.', { pilot: 1 })], true);
  register(['Light:2060'], [capacityRule('Kann einen Piloten und einen Astromech aufnehmen.', { pilot: 1, astromech: 1 })], true);
  register(['Light:1677'], [
    continuous('crewCapacity', 'Kann zwei Piloten und zwei Passagiere aufnehmen und auf dem System andocken.',
      'pilot and passenger capacity and docking', 'Falcon requires an active pilot and its namesake pilots grant immunity',
      { capacity: { pilot: 2, passenger: 2 }, legacy: true }),
    continuous('pilotedImmunity', 'Mit Han, Chewie oder Lando als Pilot ist der Falcon immun gegen Attrition unter 5.',
      'Han, Chewie or Lando piloting', 'Falcon requires an active pilot and its namesake pilots grant immunity',
      { below: 5, legacy: true }),
    continuous('requiresPilot', 'Ohne aktiven Piloten kann der Falcon seine Power, Maneuver und Hyperspeed nicht nutzen.',
      'active pilot aboard', 'Falcon requires an active pilot and its namesake pilots grant immunity', { legacy: true }),
  ], true);
  register(['Dark:2357'], [
    continuous('device', 'Wird kostenlos auf einem eigenen Trooper ausgespielt.', 'own trooper',
      'Stormtrooper Backpack expands weapon use and offers planet-site immunity', { legacy: true }),
    continuous('multipleWeapons', 'Der Trooper darf mehrere Waffen und Devices einsetzen.',
      'equipped trooper', 'Stormtrooper Backpack expands weapon use and offers planet-site immunity', { legacy: true }),
    continuous('planetImmunity', 'An einer Planetensite ist der Trooper immun gegen Attrition unter 3.',
      'equipped trooper at planet site', 'Stormtrooper Backpack expands weapon use and offers planet-site immunity',
      { below: 3, legacy: true }),
  ], true);
  register(['Light:1045'], [
    continuous('crewCapacity', 'Kann insgesamt bis zu zwei Piloten oder Passagiere aufnehmen.', 'up to two pilots and passengers combined',
      'Gold 1, Custom TIE and Ubrikkian follow their individual rules', { capacity: { shared: 2 }, legacy: true }),
  ], true);
  register(['Dark:2700'], [
    continuous('crewCapacity', 'Kann einen Piloten aufnehmen.', 'one pilot',
      'Gold 1, Custom TIE and Ubrikkian follow their individual rules', { capacity: { pilot: 1 }, legacy: true }),
    continuous('pilotedImmunity', 'Wird der TIE von Vader gesteuert, ist er immun gegen Attrition unter 4.', 'Vader as pilot',
      'Gold 1, Custom TIE and Ubrikkian follow their individual rules', { below: 4, legacy: true }),
  ], true);
  const carriersTest = 'Premiere transports enforce crew, cargo and docking capacity';
  for (const [id, ability, slots, summary] of [
    ['Light:530',1,{ pilot: 3, passenger: 4, cargo: 1 },'Drei Piloten, vier Passagiere und ein Fahrzeug.'],
    ['Dark:723',2,{ pilot: 6, passenger: 8, cargo: 2, hangar: 4 },'Sechs Piloten, acht Passagiere, zwei Fahrzeuge und vier TIEs.'],
    ['Dark:1291',1,{ pilot: 6, passenger: 8, cargo: 2, hangar: 4 },'Sechs Piloten, acht Passagiere, zwei Fahrzeuge und vier TIEs.'],
    ['Dark:2602',1,{ pilot: 1, passenger: 2, crew: 2 },'Kann einen Piloten und einen Passagier oder zwei Passagiere aufnehmen.'],
  ]) {
    const effects = [
      continuous('crewCapacity', summary, 'allowed crew and cargo', carriersTest, { capacity: slots, legacy: true }),
      continuous('permanentPilot', 'Der permanente Pilot stellt Ability ' + ability + ' bereit.',
        'this starship', carriersTest, { amount: ability, legacy: true }),
    ];
    if (slots.cargo) effects.push(continuous('shipDocking', 'Kann mit einem anderen Schiff am selben System zum Transfer andocken.',
      'friendly Starship at same system', carriersTest, { cost: 1, legacy: true }));
    register([id], effects, true);
  }
  register(['Dark:191'], [
    continuous('crewCapacity', 'Kann zwei Passagiere tragen. Eigene Ability ist ½.', 'two passengers', carriersTest,
      { capacity: { passenger: 2 }, legacy: true }),
    continuous('moveReact', 'Kann auf einen gerade initiierten Battle oder Force Drain im Bewegungsradius reagieren.',
      'exterior site of opposing battle or drain', 'a Bantha has half ability', { legacy: true }),
    continuous('tuskenAura', 'Jeder Tusken Raider am selben Außen-Site erhält +1 Power.',
      'Tusken Raider at the same exterior site', 'a Bantha has half ability', { amount: 1, legacy: true }),
  ], true);
  const transportTest = 'Premiere transport reacts honor the route, passengers and printed cost';
  const battleDrainReact = continuous('moveReact', 'Kann auf einen gerade initiierten Battle oder Force Drain mit einer Bewegung reagieren.',
    'location of opposing battle or drain', transportTest, { legacy: true });
  register(['Light:2250'], [
    {...battleDrainReact, summary: 'Kann als React zu einer benachbarten Site ziehen.', targets: 'adjacent site'},
  ], true);
  for(const [id,movement] of [['Light:2161','Nur zu Planetensites verlegbar.'],['Dark:2160','Darf nicht zu mobilen Sites ziehen.']]){
    register([id], [
      continuous('sandcrawlerDeploy', 'Nur an einer Tatooine-Site ausspielbar. '+movement,
        'Tatooine site', 'both Sandcrawlers enforce their destination and capacity', { since:14 }),
      continuous('crewCapacity', 'Kann einen Fahrer und sieben Passagiere aufnehmen.',
        'driver and passengers aboard', 'both Sandcrawlers enforce their destination and capacity', { capacity:{driver:1,passenger:7}, legacy:true }),
      continuous('jawaForfeit', 'Jeder Jawa an derselben Außen-Site erhält +1 Forfeit. Der Bonus stapelt sich nicht.',
        'Jawa at the same exterior site', 'both Sandcrawlers enforce their destination and capacity', { amount:1, since:14 }),
    ],true);
  }
  register(['Light:1548','Dark:1547'], [
    battleDrainReact,
    continuous('liftTubeMovement', 'Kann vier Passagiere tragen. Einsatz und Bewegung sind auf innere mobile Sites beschränkt. Es braucht keinen Fahrer.',
      'interior mobile sites and passengers', transportTest, { capacity: { passenger: 4 }, legacy: true }),
  ], true);
  register(['Dark:2660'], [
    battleDrainReact,
    continuous('crewCapacity', 'Kann einen Fahrer und zwei Passagiere aufnehmen.', 'driver and passengers aboard',
      'Gold 1, Custom TIE and Ubrikkian follow their individual rules', { capacity: { driver: 1, passenger: 2 }, legacy: true }),
  ], true);
  for(const [id, passengers, riders] of [
    ['Light:1609',2,'Luke'], ['Light:2307',3,'Luke, Beru oder Owen']
  ]) {
    register([id], [
      battleDrainReact,
      continuous('crewCapacity', 'Kann einen Fahrer und ' + passengers + ' Passagiere aufnehmen.',
        'driver and passengers aboard', transportTest, { capacity: { driver: 1, passenger: passengers }, legacy: true }),
      continuous('freeTransport', 'Fährt kostenlos, wenn ' + riders + ' an Bord ist.',
        riders, transportTest, { legacy: true }),
    ], true);
  }
  for(const [ids, cost, bonus] of [
    [['Light:259','Dark:1264'], 1, 0], [['Light:265','Dark:264'], 2, 1],
  ]) {
    const test = 'Premiere blasters enforce mount, cost and strict defense threshold';
    register(ids, [
      continuous('weaponDeploy', 'Für ' + cost + ' Force an einem eigenen Warrior ausspielen.',
        'own warrior', test, { cost, duration: 'while equipped', legacy: true }),
      continuous('weaponShot', 'Für ' + cost + ' Force eine Waffen-Destiny ziehen. Ein Treffer benötigt Destiny' +
        (bonus ? ' +1' : '') + ' über dem Verteidigungswert.',
        'character, creature or vehicle', test, { cost, amount: bonus, duration: 'damage segment', legacy: true }),
    ], true);
  }
  register(['Light:1503'], [
    continuous('weaponDeploy', 'Kostet 1 Force auf Leia oder 2 Force auf einem anderen eigenen Warrior.',
      'Leia or own warrior', 'named pistols use alternative deploy costs', { cost: 1, fallbackCost: 2, legacy: true }),
    continuous('weaponShot', 'Feuert kostenlos. Destiny −1 muss über dem Verteidigungswert liegen. Feuert Leia, ist der Forfeit eines getroffenen Ziels 0.',
      'character, creature or vehicle', 'Premiere blasters enforce mount, cost and strict defense threshold', { amount: -1, duration: 'damage segment', legacy: true }),
  ], true);
  register(['Light:1106'], [
    continuous('weaponDeploy', 'Kostet 1 Force auf Han oder 3 Force auf einem anderen eigenen Warrior.',
      'Han or own warrior', 'named pistols use alternative deploy costs', { cost: 1, fallbackCost: 3, legacy: true }),
    continuous('weaponShot', 'Kostet 1 Force zum Feuern. Destiny +1 muss über der Verteidigung liegen. Feuert Han, ist der Forfeit eines getroffenen Ziels 0.',
      'character, creature or vehicle', 'named pistols use alternative deploy costs', { cost: 1, amount: 1, duration: 'damage segment', legacy: true }),
  ], true);
  const saberTest = 'lightsabers enforce named and ability-based costs';
  const saberDrain = continuous('weaponDrain', 'Kann einen eigenen Force Drain am selben Ort um 1 erhöhen.',
    'own Force drain where present', 'using a lightsaber during a drain', { amount: 1, duration: 'one drain', legacy: true });
  register(['Light:1386','Dark:620'], [
    continuous('weaponDeploy', 'Auf einen eigenen Warrior ausspielen. Kosten sind 7 minus dessen Ability.',
      'own warrior', saberTest, { costFormula: '7 - ability', legacy: true }),
    continuous('weaponShot', 'Zum Angriff erneut 7 minus Ability bezahlen. Zwei Destiny ziehen und bei Summe über der Verteidigung treffen.',
      'character or creature', saberTest, { costFormula: '7 - ability', duration: 'damage segment', legacy: true }),
    saberDrain,
  ], true);
  for (const [id, bearer] of [['Light:1813','Obi-Wan'],['Dark:2702','Vader']]) {
    register([id], [
      continuous('weaponDeploy', 'Wird kostenlos auf ' + bearer + ' ausgespielt.', bearer, saberTest, { legacy: true }),
      continuous('weaponShot', 'Feuert kostenlos. Zwei Destiny ziehen. Liegt die Summe über der Verteidigung, ist das Ziel getroffen und sein Forfeit 0.',
        'character or creature', saberTest, { duration: 'damage segment', legacy: true }),
      saberDrain,
    ], true);
  }
  for (const [id, mounts, cost, result, test] of [
    ['Light:1962','X-wing, Y-wing oder B-wing',1,'Destiny über der Verteidigung trifft.','all ship armaments enforce their printed mounts'],
    ['Light:1971','Corellian Corvette oder Falcon',2,'Gegen Starfighter zählt Destiny +1. Ein Wert über der Verteidigung trifft.','all ship armaments enforce their printed mounts'],
    ['Dark:303','TIE Advanced x1',1,'Destiny −1 gegen Capital Starships und Destiny +1 gegen Starfighter. Ein Wert über der Verteidigung trifft.','all ship armaments enforce their printed mounts'],
    ['Dark:1327','Star Destroyer',2,'Ist Destiny +2 höher als die Verteidigung, gehen die Schiffswaffen des Ziels verloren. Verteidigung und Hyperspeed werden auf 0 gesetzt.','a successful Ion Cannon destroys ship weapons'],
  ]) {
    register([id], [
      continuous('weaponDeploy', 'Für ' + cost + ' Force auf ' + mounts + ' ausspielen.', mounts, test,
        { cost, duration: 'while equipped', legacy: true }),
      continuous('weaponShot', 'Für 1 Force auf ein Starship feuern. ' + result,
        'opposing starship', test, { cost: 1, duration: id === 'Dark:1327' ? 'while target remains in play' : 'damage segment', legacy: true }),
    ], true);
  }
  register(['Dark:146'], [
    continuous('weaponDeploy', 'Für 3 Force auf einem eigenen Warrior ausspielen.', 'own warrior', 'Assault Rifle fires from an adjacent location',
      { cost: 3, duration: 'while equipped', legacy: true }),
    continuous('weaponShot', 'Für 2 Force ein Ziel am selben oder benachbarten Site angreifen. Destiny +1 muss über der Verteidigung liegen.',
      'character, creature or vehicle at same or adjacent site', 'Assault Rifle fires from an adjacent location',
      { cost: 2, amount: 1, duration: 'damage segment', legacy: true }),
  ], true);
  register(['Dark:1002'], [
    continuous('weaponDeploy', 'Für 2 Force auf einem Tusken Raider ausspielen.', 'Tusken Raider', 'Gaderffii Stick blocks the chosen bearer',
      { cost: 2, duration: 'while equipped', legacy: true }),
    continuous('weaponShot', 'Direkt nach Kampfbeginn kostenlos zwei Destiny gegen eine Figur ziehen. Bei Summe über 5 sind deren Waffen für diesen Kampf blockiert.',
      'character in just initiated battle', 'Gaderffii Stick blocks the chosen bearer',
      { duration: 'rest of battle', expires: 'after battle', legacy: true }),
  ], true);
  register(['Dark:1551'], [
    continuous('weaponDeploy', 'Für 2 Force auf einem eigenen Warrior ausspielen.', 'own warrior', 'Light Repeating Blaster Rifle needs a present power droid',
      { cost: 2, duration: 'while equipped', legacy: true }),
    continuous('weaponShot', 'Mit eigenem Power Droid oder Fusion Generator vor Ort darf der Warrior wiederholt feuern. Jeder Schuss kostet 2 Force. Destiny +1 muss über der Verteidigung liegen.',
      'character, creature or vehicle', 'Light Repeating Blaster Rifle needs a present power droid',
      { cost: 2, amount: 1, duration: 'weapon segment', legacy: true }),
  ], true);
  register(['Dark:2644'], [
    continuous('weaponDeploy', 'Für 3 Force auf einem eigenen Star Destroyer oder einem mobilen System ausspielen.',
      'Star Destroyer or mobile system', 'all ship armaments enforce their printed mounts', { cost: 3, duration: 'while equipped', legacy: true }),
    continuous('weaponShot', 'Für 2 Force auf ein Starship feuern und zwei Destiny ziehen. Gegen Capital Starships zieht die Batterie 2 ab, gegen andere Schiffe 5. Ein Wert über der Verteidigung trifft.',
      'opposing Starship', 'all ship armaments enforce their printed mounts', { cost: 2, duration: 'damage segment', legacy: true }),
  ], true);
  register(['Light:2610','Dark:2609'], [
    continuous('mineDeploy', 'Ein eigener Mining Droid legt die Mine auf der Gegenseite derselben Site aus. An Außen-Sites kann er Karten verdeckt als Minenfeld vergraben.',
      'site with friendly mining droid', 'a buried mine and a dud are hidden', { duration: 'until detonation or removal', legacy: true }),
    continuous('mineExplosion', 'Die ausgelegte Mine explodiert am Anfang deines nächsten Zugs. Destiny gibt die Anzahl gegnerischer Figuren an derselben Site vor, die der Gegner verliert. Der Gegner wählt. Die Mine geht ebenfalls verloren.',
      'opposing characters present with mine', 'each Timer Mine waits for its owner', { duration: 'instant', expires: 'after resolving', legacy: true }),
  ], true);
  for(const [id,description] of [
    ['Light:2400','Tagge oder einen Warrior mit Ability unter 3'],
    ['Light:2426','Tarkin oder einen Alien mit Ability unter 3'],
    ['Dark:1096','Han oder einen Alien mit Ability unter 3'],
    ['Dark:1592','Luke mit Ability unter 4 oder einen Piloten mit Ability unter 3'],
  ]){
    register([id],[
      continuous('seekerDeploy','Für 1 Force an einer unbesetzten Site auf der Gegenseite auslegen.',
        'unoccupied site','all four seekers use the opposing Move phase', {cost:1,legacy:true}),
      continuous('seekerMove','Bewegt sich in der gegnerischen Move Phase wie ein Undercover Spy. Der Docking-Bay-Text der eigenen Seite gilt.',
        'site movement in opponent move phase','all four seekers use the opposing Move phase',{since:17}),
      continuous('seekerStrike','Wählt '+description+' am selben physischen Ort. Ziel und Seeker gehen sofort verloren.',
        'eligible character on either side','seekers automatically resolve their chosen target',{legacy:true}),
    ],true);
  }
  register(['Dark:1479'],[
    continuous('projectorDeploy','Für 2 Force an einer Innen-Site auslegen.',
      'interior site','the Laser Projector deploys inside',{cost:2,legacy:true}),
    continuous('projectorFire','Zielt kostenlos auf Figuren, Kreaturen oder Seeker am selben physischen Ort. Destiny minus 1 muss über der Verteidigung liegen.',
      'character, creature or seeker','Laser Projector checks destiny and targets',{legacy:true}),
    continuous('projectorDefense','Der Laser Projector kann mit jeder dort verwendbaren Waffe angegriffen werden. Sein Verteidigungswert ist 1.',
      'projector','the Laser Projector deploys inside',{defense:1,legacy:true}),
  ],true);
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
