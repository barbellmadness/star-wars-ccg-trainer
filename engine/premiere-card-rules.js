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
  register(['Light:1883'], [{ event: 'freeSiteDeploy', cost: 0, targets: 'moisture-farm', duration: 'instant', expires: 'after deploy',
    summary: 'Owen Lars wird an Lars’ Moisture Farm frei ausgespielt.', test: 'registered free deployment' }]);

  const device = (id, targets, cost, summary, fields) => register([id], [continuous('device', summary, targets,
    'registered devices', { cost, ...fields })], true);
  device('Light:2435', 'rebel-or-alien', 1, 'Rebel oder Alien erhält auf Tatooine Power und Forfeit +2.', { bonus: 'tatooine-belt' });
  device('Dark:2360', 'imperial-or-alien', 1, 'Imperial oder Alien erhält Power und Forfeit +1, auf dem Death Star jeweils +2.', { bonus: 'stormtrooper-belt' });
  for (const id of ['Light:997', 'Dark:996']) {
    device(id, 'starship-at-system-with-bay', 0, 'Die Tanks erhöhen Hyperspeed, Power und Maneuver des Schiffs um 1.', { bonus: 'supply-tanks' });
  }
  register(['Dark:1939'], [
    continuous('locationEffect', 'Ergänzt je ein Light- und Dark-Force-Icon an einer Location. Mehrere Kopien am selben Ort geben den Bonus einmal.',
      'location', 'registered location effects', { expires: 'when canceled', iconBonus: 1 }),
  ], true);
  register(['Light:664'], [
    continuous('locationEffect', 'Ein eigener Droide holt die Pläne von einer Death-Star-Site außerhalb der Docking Bay und bringt sie zu einer Yavin-4-Site. Drei Destiny-Draws bestimmen die Rückgewinnung.',
      'droid-outside-death-star', 'Death Star Plans tracks', { expires: 'completion, cancellation or target lost', mission: 'death-star-plans' }),
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
