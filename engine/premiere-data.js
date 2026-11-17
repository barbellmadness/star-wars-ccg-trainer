'use strict';

const PremiereData = (() => {
  const SOURCE = 'swccgpc/swccg-card-json';
  const REVISION = '65cd150d20634447a5499d763ac324436158c7a8';
  const EDITION = '1';
  const A_NEW_HOPE = '2';
  const SIDES = ['Light', 'Dark'];
  const CARD_TYPES = new Set(['Character', 'Device', 'Effect', 'Interrupt', 'Location', 'Starship', 'Vehicle', 'Weapon']);
  const EDITIONS = Object.freeze({
    [EDITION]: {name: 'Premiere', cardsPerSide: 162},
    [A_NEW_HOPE]: {name: 'A New Hope', cardsPerSide: 81}
  });
  const EXPANSION_TYPES = new Set(['Creature', 'Epic Event']);
  const PLAY_FORMATS = Object.freeze({premiere: [EDITION], 'premiere-a-new-hope': [EDITION, A_NEW_HOPE]});
  const GARRISON_A_NEW_HOPE = new Map([['Dark:654', '2_143'], ['Dark:667', '2_111'], ['Dark:2103', '2_138']]);
  const EXPANSION_RULES_VERSION = 26;
  const A_NEW_HOPE_RELEASED = new Set(['Light:2035', 'Light:2389', 'Light:2418', 'Dark:872', 'Dark:1267',
    'Dark:1340', 'Dark:1588', 'Dark:1697', 'Dark:1700', 'Dark:2094']);
  const GARRISON_RIFLE = {id: 'Dark:2915', gempId: '4_180', set: '4'};
  const isGarrisonExpansionCard = card => card?.set === A_NEW_HOPE && GARRISON_A_NEW_HOPE.has(card.id) &&
    GARRISON_A_NEW_HOPE.get(card.id) === card.gempId;
  const isGarrisonRifle = card => card?.id === GARRISON_RIFLE.id && card.gempId === GARRISON_RIFLE.gempId && card.set === GARRISON_RIFLE.set;
  const isReleasedExpansionCard = (card, rulesVersion = Infinity) => isGarrisonExpansionCard(card) ||
    card?.set === A_NEW_HOPE && rulesVersion >= EXPANSION_RULES_VERSION && A_NEW_HOPE_RELEASED.has(card.id);
  const VALUE_FIELDS = ['power', 'ability', 'deploy', 'forfeit', 'destiny', 'armor', 'maneuver', 'hyperspeed', 'landspeed', 'parsec', 'lightSideIcons', 'darkSideIcons'];
  const BASIC_WEAPONS = new Map([
    ['Light:259', {cost: 1, bonus: 0}], // Blaster
    ['Light:265', {cost: 2, bonus: 1}], // Blaster Rifle
    ['Dark:264', {cost: 2, bonus: 1}],  // Blaster Rifle
    ['Dark:1264', {cost: 1, bonus: 0}]  // Imperial Blaster
  ]);

  function readCardValue(raw) {
    if (raw == null) return {kind: 'missing', value: null, raw: null};
    if (typeof raw !== 'number' && typeof raw !== 'string') return {kind: 'unknown', value: null, raw};
    const token = String(raw).trim();
    if (/^\d+$/.test(token) && Number.isSafeInteger(Number(token))) return {kind: 'number', value: Number(token), raw};
    if (/^(?:\*+|X|[¼½¾π])$/i.test(token)) return {kind: 'special', value: null, raw};
    return {kind: 'unknown', value: null, raw};
  }

  function locationTitle(card) {
    return String(card.name ?? '').trim().replace(/^[•*]+\s*/, '').toLowerCase();
  }

  function isDeployableCharacter(card) {
    return /character/i.test(card.type || '') && Number.isFinite(card.deploy) && card.deploy >= 0;
  }

  function basicWeaponRule(card) {
    return card?.type === 'Weapon' && card.subType === 'Character' ? BASIC_WEAPONS.get(card.id) : undefined;
  }

  function isBantha(card) {
    return card?.type === 'Vehicle' && card.id === 'Dark:191' && /\bBantha ability = ½\./.test(card.gametext || '');
  }

  function permanentPilotAbility(card) {
    if (card?.type !== 'Starship') return null;
    const wording = card.set === A_NEW_HOPE ? /\bPermanent pilot(?: aboard)? provides ability of ([1-9]\d*)\./i :
      /\bPermanent pilot aboard provides ability of ([1-9]\d*)\./i;
    const ability = String(card.gametext || '').match(wording);
    return ability ? Number(ability[1]) : null;
  }

  function checkedStrings(value, label) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string' || !entry.trim())) {
      throw new Error(label + ' muss eine Liste aus Texten sein.');
    }
    return value.slice();
  }

  function checkedText(value, label) {
    if (value == null) return null;
    if (typeof value !== 'string') throw new Error(label + ' muss Text sein.');
    return value;
  }

  function checkedImage(value, label) {
    const url = checkedText(value, label);
    if (url !== null && !/^https:\/\/res\.starwarsccg\.org\//.test(url)) throw new Error(label + ' muss von res.starwarsccg.org stammen.');
    return url;
  }

  function normalizeCard(record, edition = EDITION) {
    const {id, side, set, sourceId, gempId, rawFront: front} = record ?? {};
    if (!SIDES.includes(side) || set !== edition || !Number.isSafeInteger(sourceId) || sourceId < 1 || id !== side + ':' + sourceId ||
        !new RegExp('^' + edition + '_\\d+$').test(gempId ?? '')) {
      throw new Error('Ungültige Edition, Kartenseite oder Karten-ID: ' + (id ?? 'fehlt'));
    }
    const supportedType = CARD_TYPES.has(front?.type) || edition === A_NEW_HOPE && EXPANSION_TYPES.has(front?.type);
    if (!front || typeof front.title !== 'string' || !front.title.trim() || !supportedType) {
      throw new Error(id + ' hat keinen gültigen Namen oder Kartentyp.');
    }
    const flags = checkedStrings(front.icons, id + ' · Icons');
    const values = Object.fromEntries(VALUE_FIELDS.map(field => [field, readCardValue(front[field])]));
    for (const field of ['lightSideIcons', 'darkSideIcons']) {
      if (values[field].value > 8) values[field] = {kind: 'unknown', value: null, raw: values[field].raw};
    }
    const numbers = Object.fromEntries(VALUE_FIELDS.map(field => [field, values[field].value]));
    const errataSymbol = checkedText(front.errataSymbol, id + ' · Errata');
    const errataImage = checkedImage(front.printableSlipUrl, id + ' · Slip');
    const validErrataSymbol = ['E1', 'D-E1'].includes(errataSymbol) || edition === A_NEW_HOPE && errataSymbol === 'D-E2';
    // The pinned entry for Besieged marks its E1 slip as VIRTUAL despite the linked errata asset.
    const besiegedSlip = edition === A_NEW_HOPE && id === 'Dark:223' && errataSymbol === 'E1' &&
      front.printableSlipType === 'VIRTUAL' && errataImage?.endsWith('/Beseiged (Errata)/image.png');
    if (errataSymbol && (!validErrataSymbol || !errataImage || (front.printableSlipType !== 'ERRATA' && !besiegedSlip))) {
      throw new Error(id + ' hat ein Erratum ohne zugehörigen Korrekturslip oder einen unbekannten Marker.');
    }
    if (front.uniqueness != null && !/^\*+$/.test(front.uniqueness)) throw new Error(id + ' hat ein unbekanntes Einzigartigkeitszeichen.');
    const uniquenessLimit = front.uniqueness?.length ?? front.title.match(/^•+/)?.[0].length ?? null;
    const destinyValues = front.destinyValues ?? [];
    const validDestiny = value => Number.isSafeInteger(value) && value >= 0 ||
      edition === A_NEW_HOPE && front.destiny === 'π' && Number.isFinite(value) && value > 0;
    if (!Array.isArray(destinyValues) || !destinyValues.every(validDestiny)) {
      throw new Error(id + ' hat eine ungültige Liste gedruckter Destiny-Werte.');
    }
    const texts = {
      print: checkedText(record.printText, id + ' · Originaldruck'),
      active: checkedText(front.gametext, id + ' · Spieltext'),
      lore: checkedText(front.lore, id + ' · Lore'),
      explanationDe: checkedText(record.explanationDe, id + ' · Deutsche Erklärung'),
      preErrata: checkedText(record.preErrata?.gametext, id + ' · ältere Textfassung')
    };
    const images = {print: checkedImage(front.imageUrl, id + ' · Kartenscan'), slip: errataImage};
    if (texts.print !== null && (!images.print || record.printSource !== images.print)) {
      throw new Error(id + ' hat eine Drucktranskription ohne den zugehörigen Scan.');
    }
    if (record.preErrata && (!Number.isSafeInteger(record.preErrata.sourceId) || texts.preErrata === null)) {
      throw new Error(id + ' hat eine unvollständige Vor-Errata-Fassung.');
    }
    return {
      id, side, set, gempId, name: front.title, type: front.type, subType: checkedText(front.subType, id + ' · Untertyp') ?? '',
      personas: checkedStrings(record.personas, id + ' · Personas'),
      characteristics: checkedStrings(front.characteristics, id + ' · Merkmale'),
      extraText: checkedStrings(front.extraText, id + ' · Zusatztext'),
      uniquenessLimit, values, ...numbers, destinyValues: destinyValues.slice(), cardIcons: flags,
      warrior: flags.includes('Warrior'), pilot: flags.includes('Pilot'), navComputer: flags.includes('Nav Computer'),
      locationTags: front.type === 'Location' ? flags : [],
      icons: {light: numbers.lightSideIcons, dark: numbers.darkSideIcons},
      texts, images, errataSymbol, errataDate: checkedText(front.errataDate, id + ' · Errata-Datum'),
      errataNote: checkedText(front.errataNotes, id + ' · Errata-Hinweis'), preErrataSourceId: record.preErrata?.sourceId ?? null,
      gametext: texts.active ?? '', lore: texts.lore ?? '', image: images.print ?? ''
    };
  }

  function readCatalog(snapshot, edition = EDITION) {
    if (!Object.hasOwn(EDITIONS, edition)) throw new Error('Unbekannte Kartenedition ' + edition + '.');
    const {name, cardsPerSide} = EDITIONS[edition];
    if (snapshot?.schema !== 2 || snapshot.source !== SOURCE || snapshot.revision !== REVISION || snapshot.edition !== edition ||
        !Array.isArray(snapshot.cards) || snapshot.cards.length !== cardsPerSide * SIDES.length) {
      throw new Error(`Ungültiger ${name}-Snapshot. Erwartet sind ${cardsPerSide * SIDES.length} Karten der festgeschriebenen Revision.`);
    }
    const cards = snapshot.cards.map(record => normalizeCard(record, edition));
    if (new Set(cards.map(card => card.id)).size !== cards.length || new Set(cards.map(card => card.gempId)).size !== cards.length) {
      throw new Error('Doppelte Karten- oder Gemp-IDs in der ' + name + '-Datenbank.');
    }
    for (const side of SIDES) {
      if (cards.filter(card => card.side === side).length !== cardsPerSide) throw new Error(`${side} muss im ${name}-Snapshot genau ${cardsPerSide} Karten enthalten.`);
    }
    return cards;
  }

  function readSupplementalCards(payload) {
    if (payload?.schema !== 1 || payload.source !== SOURCE || payload.revision !== REVISION ||
        !isGarrisonRifle(payload.card)) {
      throw new Error('Ungültiger Datensatz für Zuckuss’ Fanggewehr.');
    }
    const expected = new Map(GARRISON_A_NEW_HOPE);
    const additions = (payload.additions ?? []).map(record => {
      if (!isGarrisonExpansionCard(record) || !expected.has(record.id)) throw new Error('Unbekannte Zusatzkarte aus A New Hope.');
      expected.delete(record.id);
      return normalizeCard(record, A_NEW_HOPE);
    });
    return [normalizeCard(payload.card, '4'), ...additions];
  }

  const isLostPileEffect = card => card?.id === 'Light:917' || card?.id === 'Dark:2897';

  function isPlayableStarterCard(card) {
    if (card.type === 'Location') return Number.isInteger(card.icons.light) && Number.isInteger(card.icons.dark);
    if (card.type === 'Weapon' || isLostPileEffect(card) ||
      ['Light:735','Dark:734','Dark:1880','Dark:262','Light:997','Dark:996','Light:2435','Dark:2360','Dark:1939','Light:664','Light:1429','Dark:489',
       'Light:95','Dark:94','Light:2217','Dark:2216','Light:348','Dark:347','Light:2100','Dark:2099','Dark:777','Light:1870',
       'Light:2514','Dark:1831','Light:1778','Dark:2373','Light:2102','Dark:2833','Light:2277','Dark:613','Light:2625','Dark:2029',
       'Light:1039','Dark:2357','Dark:1555','Dark:1691','Dark:391','Light:2297','Light:2531','Light:2740','Light:1389','Dark:621',
       'Light:994','Light:1455','Dark:1576','Dark:1578','Dark:2701','Light:1104','Light:1874','Dark:1215','Dark:2406','Dark:2634',
       'Light:1196','Light:2705','Dark:1064','Light:826','Dark:190','Light:2157','Dark:1430','Light:2141',
       'Light:68','Dark:1208','Light:695','Light:1380','Dark:1378','Light:1373','Dark:1372','Light:821','Dark:1617',
       'Dark:1579','Dark:2176','Light:2011','Dark:2632','Dark:2650',
       'Light:352','Light:468','Dark:649','Light:985','Dark:467',
       'Light:24','Dark:622','Light:1120','Light:2423','Light:2325','Light:1810','Light:1707','Light:1755','Light:1197',
       'Light:2033','Dark:1263','Light:2041','Light:2110','Dark:914','Light:2860','Dark:665','Dark:932','Dark:304','Light:781',
       'Light:761','Dark:2884','Light:1236','Light:1331','Dark:1338','Light:38','Dark:22','Light:222','Light:2764','Dark:2762',
       'Light:483','Dark:1932','Light:758','Light:1749','Dark:824','Light:1321','Dark:253','Dark:993',
       'Light:882','Dark:888','Light:1827','Dark:1440','Dark:1237','Light:1893','Dark:830','Light:2043','Dark:1282',
       'Dark:1480','Dark:2214','Dark:2397','Light:1402','Dark:1688','Light:1554','Light:1643',
       'Dark:2242','Dark:2410','Dark:1904','Dark:1767','Dark:2901','Dark:1238',
       'Light:2180','Dark:1265','Light:1187','Light:2319','Light:2509',
       'Light:1913','Light:2646','Dark:1599','Dark:1401','Dark:619','Dark:266','Dark:1815',
       'Light:1834','Light:1794','Light:2689','Dark:2688','Light:1125','Light:2570','Dark:1565','Light:585','Light:2863',
       'Dark:1857','Light:215','Dark:667','Dark:2103',
       'Light:1102','Light:1500','Light:1600','Light:2105','Dark:2528', // Named retrieval and Reserve Deck search
       'Light:2385','Dark:575','Dark:2517','Dark:643','Dark:1697'].includes(card.id)) return true;
    return Number.isInteger(card.deploy) && card.deploy >= 0 && (isDeployableCharacter(card) || ['Vehicle','Starship'].includes(card.type));
  }

  function buildStarterDeck(side, definition, byId, {format, cardRulesVersion}) {
    const error = message => new Error(side + '-Starterdeck: ' + message);
    if (format !== undefined && !Object.hasOwn(PLAY_FORMATS, format)) throw error('Unbekanntes Spielformat ' + format + '.');
    if (!Array.isArray(definition?.cards) || !Array.isArray(definition.startingLocations)) {
      throw error('Kartenliste oder Starting Locations fehlen.');
    }
    const cards = [], ids = new Set();
    for (const entry of definition.cards) {
      const {id, count} = entry ?? {}, card = byId.get(id);
      if (!card || card.side !== side) throw error('Unbekannte oder seitenfremde Karte ' + id + '.');
      const supportedEdition = format === undefined ? card.set === EDITION ||
        definition.theme?.id === 'imperiale-garnison' && (isGarrisonRifle(card) || isGarrisonExpansionCard(card)) :
        PLAY_FORMATS[format].includes(card.set);
      if (!supportedEdition) {
        throw error(id + ' stammt aus einer anderen Edition.');
      }
      if (card.set === A_NEW_HOPE && !isReleasedExpansionCard(card, cardRulesVersion)) throw error(id + ' ist noch nicht für das Spiel freigegeben (Regelstand).');
      if (ids.has(id)) throw error('Doppelter Eintrag für ' + id + '.');
      if (!Number.isInteger(count) || count < 1 || count > 60) throw error('Ungültige Kartenanzahl für ' + id + '.');
      if (!isPlayableStarterCard(card)) throw error(card.name + ' kann im aktuellen Lernmodus nicht ausgespielt werden.');
      ids.add(id);
      // Uniqueness limits cards on the table. Decks may include additional copies.
      for (let i = 0; i < count; i++) cards.push(card);
    }
    if (cards.length !== 60) throw error('Erwartet sind 60 Karten, gefunden wurden ' + cards.length + '.');
    const starts = definition.startingLocations.map(id => {
      const card = ids.has(id) ? byId.get(id) : null;
      if (card?.type !== 'Location') throw error('Ungültige Starting Location ' + id + '.');
      return card;
    });
    if (new Set(starts.map(locationTitle)).size !== starts.length) throw error('Die Starting Locations müssen unterschiedliche Namen haben.');
    const startingIndices = starts.flatMap(card => cards.flatMap((copy, index) => copy === card ? [index] : []));
    if (format !== undefined && !startingIndices.length) throw error('Mindestens eine Starting Location erforderlich.');
    const deck = {cards, startingIndices};
    if (definition.strategy !== undefined) {
      const fields = ['start', 'opening', 'tactics'];
      if (!fields.every(field => typeof definition.strategy?.[field] === 'string' && definition.strategy[field].trim())) {
        throw error('Die Strategie benötigt einen Startort, einen Aufbau und Schlüsselzüge.');
      }
      deck.strategy = Object.fromEntries(fields.map(field => [field, definition.strategy[field]]));
    }
    if (definition.theme === undefined) return deck;
    const {id, name, description} = definition.theme ?? {};
    if (typeof id !== 'string' || !/^[a-z]+(?:-[a-z]+)*$/.test(id) || id === 'starter' ||
        typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !description.trim()) {
      throw error('Ungültige Angaben zum Themendeck.');
    }
    if (!startingIndices.length) throw error('Ein Themendeck benötigt mindestens eine Starting Location.');
    return {...deck, theme: {id, name, description}};
  }

  function readStarterDecks(payload, catalog, options = {}) {
    if (payload?.schema !== 1) throw new Error('Unbekanntes Format der Premiere-Starterdecks.');
    const byId = new Map(catalog.map(card => [card.id, card]));
    if (byId.size !== catalog.length) throw new Error('Die Premiere-Kartendatenbank enthält doppelte Karten-IDs.');
    return {
      light: buildStarterDeck('Light', payload.decks?.Light, byId, options),
      dark: buildStarterDeck('Dark', payload.decks?.Dark, byId, options)
    };
  }

  function readThemedDecks(payload, catalog, options = {}) {
    if (payload?.schema !== 1) throw new Error('Unbekanntes Format der Premiere-Themendecks.');
    const byId = new Map(catalog.map(card => [card.id, card]));
    return Object.fromEntries(SIDES.map(side => {
      const definitions = payload.decks?.[side];
      if (!Array.isArray(definitions) || definitions.length === 0) {
        throw new Error(side + ' benötigt mindestens ein Premiere-Themendeck.');
      }
      const choices = definitions.map(definition => ({definition, deck: buildStarterDeck(side, definition, byId, options)}));
      const ids = new Set(choices.map(({deck}) => deck.theme?.id));
      if (ids.has(undefined) || ids.size !== choices.length) throw new Error(side + ': Die Themendecks benötigen eindeutige IDs.');
      return [side.toLowerCase(), choices];
    }));
  }

  function readFormatDeckChoices(format, starters, themes, variants, catalog) {
    if (themes?.schema !== 1 || variants?.schema !== 1 || !Object.hasOwn(PLAY_FORMATS, format) || !variants.formats?.[format]) {
      throw new Error('Ungültige Deckvarianten für ' + format + '.');
    }
    const definitions = Object.fromEntries(SIDES.map(side => {
      const byTheme = new Map(themes.decks[side].map(definition => [definition.theme.id, definition]));
      for (const definition of variants.formats[format][side]) byTheme.set(definition.theme.id, definition);
      return [side, [...byTheme.values()]];
    }));
    const fixed = readStarterDecks(starters, catalog, {format});
    const themed = readThemedDecks({schema: 1, decks: definitions}, catalog, {format});
    return Object.fromEntries(SIDES.map(side => {
      const key = side.toLowerCase();
      return [key, [{deck: fixed[key], definition: starters.decks[side]}, ...themed[key]]];
    }));
  }

  function buildAudit(catalog, decks) {
    const errata = catalog.filter(card => card.errataSymbol).map(card => ({
      id: card.id,
      name: card.name,
      marker: card.errataSymbol,
      date: card.errataDate,
      sourceNote: card.errataNote,
      activeText: 'pinned-front',
      decision: 'accepted-as-reference-text',
      slip: card.images.slip,
      printScan: card.images.print,
      hasTranscribedPrintText: card.texts.print !== null,
      preErrataSourceId: card.preErrataSourceId
    }));
    return {
      source: SOURCE,
      revision: REVISION,
      edition: EDITION,
      cards: Object.fromEntries(SIDES.map(side => [side, catalog.filter(card => card.side === side).length])),
      cardsWithPrintScan: catalog.filter(card => card.images.print).length,
      transcribedPrintTexts: catalog.filter(card => card.texts.print !== null).length,
      openPrintTexts: catalog.filter(card => card.texts.print === null).map(card => ({
        id: card.id, name: card.name, printScan: card.images.print
      })),
      preErrataTexts: catalog.filter(card => card.texts.preErrata !== null).length,
      values: Object.fromEntries(VALUE_FIELDS.map(field => {
        const counts = {number: 0, missing: 0, special: 0, unknown: 0};
        for (const card of catalog) counts[card.values[field].kind]++;
        return [field, counts];
      })),
      decks: Object.fromEntries(SIDES.map(side => {
        const deck = decks[side.toLowerCase()];
        return [side, {cards: deck.cards.length, startingLocations: [...new Set(deck.startingIndices.map(index => deck.cards[index].id))]}];
      })),
      errata
    };
  }

  return {SOURCE, REVISION, EDITION, A_NEW_HOPE, EDITIONS, SIDES, PLAY_FORMATS, EXPANSION_RULES_VERSION,
    readCatalog, readSupplementalCards, readStarterDecks, readThemedDecks, readFormatDeckChoices,
    readCardValue, locationTitle, isDeployableCharacter, basicWeaponRule, isBantha, isLostPileEffect, permanentPilotAbility,
    isGarrisonExpansionCard, isReleasedExpansionCard, buildAudit};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PremiereData;
