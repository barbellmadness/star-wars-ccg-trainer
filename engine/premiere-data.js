'use strict';

const PremiereData = (() => {
  const SOURCE = 'swccgpc/swccg-card-json';
  const REVISION = '65cd150d20634447a5499d763ac324436158c7a8';
  const EDITION = '1';
  const A_NEW_HOPE = '2';
  const HOTH = '3';
  const SIDES = ['Light', 'Dark'];
  const CARD_TYPES = new Set(['Character', 'Device', 'Effect', 'Interrupt', 'Location', 'Starship', 'Vehicle', 'Weapon']);
  const EDITIONS = Object.freeze({
    [EDITION]: {name: 'Premiere', cardsPerSide: 162},
    [A_NEW_HOPE]: {name: 'A New Hope', cardsPerSide: 81},
    [HOTH]: {name: 'Hoth', cardsPerSide: 81}
  });
  const EXPANSION_TYPES = new Set(['Creature', 'Epic Event']);
  const PLAY_FORMATS = Object.freeze({premiere: [EDITION], 'premiere-a-new-hope': [EDITION, A_NEW_HOPE], 'premiere-a-new-hope-hoth': [EDITION,A_NEW_HOPE,HOTH]});
  const HOTH_RULES_VERSION=31;
  const HOTH_RELEASED=new Map([["Light:5300","3_1"],["Light:109","3_71"],["Light:135","3_28"],["Light:161","3_72"],["Light:167","3_40"],["Light:184","3_32"],["Light:345","3_2"],["Light:498","3_3"],["Light:515","3_73"],["Light:595","3_4"],["Light:615","3_41"],["Light:707","3_5"],["Light:736","3_33"],["Light:793","3_74"],["Light:805","3_34"],["Light:807","3_6"],["Light:808","3_7"],["Light:811","3_29"],["Light:815","3_8"],["Light:889","3_35"],["Light:920","3_42"],["Light:987","3_36"],["Light:1001","3_9"],["Light:1018","3_10"],["Light:1044","3_75"],["Light:1163","3_55"],["Light:1165","3_30"],["Light:5582","3_56"],["Light:1169","3_57"],["Light:1171","3_58"],["Light:1173","3_59"],["Light:1174","3_60"],["Light:5586","3_61"],["Light:5590","3_62"],["Light:5591","3_63"],["Light:1220","3_43"],["Light:1241","3_37"],["Light:1307","3_76"],["Light:1330","3_44"],["Light:1391","3_11"],["Light:1404","3_12"],["Light:1589","3_45"],["Light:1621","3_13"],["Light:1664","3_77"],["Light:1665","3_65"],["Light:1773","3_46"],["Light:1836","3_47"],["Light:1854","3_64"],["Light:1902","3_48"],["Light:1910","3_78"],["Light:1929","3_79"],["Light:1997","3_14"],["Light:1990","3_31"],["Light:2004","3_15"],["Light:2045","3_16"],["Light:2119","3_66"],["Light:2120","3_67"],["Light:2121","3_68"],["Light:2126","3_17"],["Light:2128","3_18"],["Light:2137","3_49"],["Light:2249","3_19"],["Light:2294","3_69"],["Light:2383","3_80"],["Light:2413","3_20"],["Light:2480","3_70"],["Light:2481","3_38"],["Light:2483","3_21"],["Light:2530","3_39"],["Light:2606","3_22"],["Light:2618","3_23"],["Light:2671","3_50"],["Light:2710","3_81"],["Light:2734","3_51"],["Light:2782","3_24"],["Light:2796","3_25"],["Light:2805","3_52"],["Light:2836","3_26"],["Light:2881","3_53"],["Light:2888","3_54"],["Light:2911","3_27"],["Dark:18","3_116"],["Dark:62","3_82"],["Dark:158","3_158"],["Dark:160","3_83"],["Dark:267","3_154"],["Dark:269","3_155"],["Dark:272","3_156"],["Dark:274","3_157"],["Dark:327","3_98"],["Dark:363","3_84"],["Dark:368","3_85"],["Dark:465","3_117"],["Dark:466","3_118"],["Dark:513","3_119"],["Dark:584","3_120"],["Dark:650","3_99"],["Dark:651","3_100"],["Dark:684","3_121"],["Dark:692","3_94"],["Dark:733","3_122"],["Dark:894","3_159"],["Dark:823","3_95"],["Dark:913","3_123"],["Dark:916","3_124"],["Dark:986","3_101"],["Dark:990","3_102"],["Dark:995","3_125"],["Dark:1000","3_86"],["Dark:1029","3_87"],["Dark:1114","3_126"],["Dark:1142","3_103"],["Dark:1162","3_143"],["Dark:6353","3_144"],["Dark:1168","3_145"],["Dark:1170","3_146"],["Dark:1172","3_147"],["Dark:6354","3_148"],["Dark:6358","3_149"],["Dark:6359","3_150"],["Dark:1240","3_104"],["Dark:1226","3_127"],["Dark:1253","3_105"],["Dark:1270","3_106"],["Dark:1272","3_88"],["Dark:1285","3_128"],["Dark:1306","3_160"],["Dark:1521","3_89"],["Dark:1552","3_129"],["Dark:1673","3_107"],["Dark:1706","3_108"],["Dark:1826","3_130"],["Dark:1853","3_151"],["Dark:1869","3_131"],["Dark:1925","3_96"],["Dark:1949","3_97"],["Dark:1950","3_90"],["Dark:1952","3_161"],["Dark:1953","3_132"],["Dark:2098","3_109"],["Dark:2187","3_133"],["Dark:2209","3_134"],["Dark:2266","3_110"],["Dark:2295","3_91"],["Dark:2296","3_92"],["Dark:2339","3_152"],["Dark:2353","3_135"],["Dark:2399","3_136"],["Dark:2422","3_115"],["Dark:2511","3_137"],["Dark:2541","3_111"],["Dark:2572","3_112"],["Dark:2615","3_113"],["Dark:2627","3_138"],["Dark:2645","3_139"],["Dark:2657","3_153"],["Dark:2709","3_162"],["Dark:2732","3_140"],["Dark:2736","3_141"],["Dark:2737","3_93"],["Dark:2772","3_114"],["Dark:2842","3_142"]]);
  const GARRISON_A_NEW_HOPE = new Map([['Dark:654', '2_143'], ['Dark:667', '2_111'], ['Dark:2103', '2_138']]);
  const EXPANSION_RULES_VERSION = 26;
  const A_NEW_HOPE_RELEASED = new Set(['Light:2035', 'Light:2389', 'Light:2418', 'Dark:872', 'Dark:1267',
    'Dark:1340', 'Dark:1588', 'Dark:1697', 'Dark:1700', 'Dark:2094']);
  const A_NEW_HOPE_RULES_27 = new Set(['Light:255', 'Light:318', 'Light:493', 'Light:504', 'Light:527', 'Light:534',
    'Light:751', 'Light:1013', 'Light:1081', 'Light:1183', 'Light:1242', 'Light:1572', 'Light:1606', 'Light:2003',
    'Light:2017', 'Light:2056', 'Light:2059', 'Light:2063', 'Light:2786', 'Light:2857', 'Dark:153', 'Dark:250',
    'Dark:362', 'Dark:611', 'Dark:792', 'Dark:1035', 'Dark:1824', 'Dark:2002', 'Dark:2016', 'Dark:2117', 'Dark:2368',
    'Dark:2604', 'Dark:2683', 'Dark:2687', 'Dark:2715']);
  const A_NEW_HOPE_RULES_28 = new Set(['Light:127', 'Light:282', 'Light:529', 'Light:762', 'Light:819', 'Light:1136', 'Light:1189',
    'Light:1229', 'Light:1377', 'Light:1413', 'Light:1605', 'Light:1668', 'Light:1705', 'Light:1872', 'Light:2151',
    'Light:1752', 'Light:2173', 'Light:2174', 'Light:2222', 'Light:2658', 'Light:2673', 'Light:2916', 'Dark:487', 'Dark:519', 'Dark:626', 'Dark:1198', 'Dark:1275',
    'Dark:1308', 'Dark:1376', 'Dark:1412', 'Dark:1496', 'Dark:1587', 'Dark:1994', 'Dark:1999', 'Dark:2075', 'Dark:2392',
    'Dark:2490', 'Dark:2577', 'Dark:2659', 'Dark:2672']);
  const A_NEW_HOPE_RULES_29 = new Set(["Light:64","Light:100","Light:169","Light:319","Light:385","Light:394","Light:416","Light:509","Light:681","Light:694","Light:943","Light:1047","Light:1062","Light:1214","Light:1298","Light:1507","Light:1674","Light:1619","Light:1987","Light:1992","Light:2006","Light:2048","Light:2050","Light:2061","Light:2082","Light:2125","Light:2165","Light:2298","Light:2308","Light:2563","Light:2611","Light:2802","Light:2824","Light:2908","Light:2851","Light:2892","Dark:67","Dark:223","Dark:227","Dark:508","Dark:605","Dark:657","Dark:670","Dark:687","Dark:729","Dark:891","Dark:1073","Dark:1126","Dark:1200","Dark:1230","Dark:1274","Dark:1284","Dark:1434","Dark:1453","Dark:1478","Dark:1558","Dark:1618","Dark:1640","Dark:1685","Dark:1770","Dark:1844","Dark:1955","Dark:2164","Dark:2290","Dark:2330","Dark:2378","Dark:2438","Dark:2505","Dark:2555","Dark:2596","Dark:2620","Dark:2635","Dark:2754","Dark:2784"]);
  const GARRISON_RIFLE = {id: 'Dark:2915', gempId: '4_180', set: '4'};
  const isGarrisonExpansionCard = card => card?.set === A_NEW_HOPE && GARRISON_A_NEW_HOPE.has(card.id) &&
    GARRISON_A_NEW_HOPE.get(card.id) === card.gempId;
  const isGarrisonRifle = card => card?.id === GARRISON_RIFLE.id && card.gempId === GARRISON_RIFLE.gempId && card.set === GARRISON_RIFLE.set;
  const isReleasedExpansionCard = (card, rulesVersion = Infinity) => card?.set===HOTH&&rulesVersion>=HOTH_RULES_VERSION&&HOTH_RELEASED.get(card.id)===card.gempId || isGarrisonExpansionCard(card) ||
    card?.set === A_NEW_HOPE && (rulesVersion >= EXPANSION_RULES_VERSION && A_NEW_HOPE_RELEASED.has(card.id) ||
      rulesVersion >= 27 && A_NEW_HOPE_RULES_27.has(card.id) || rulesVersion >= 28 && A_NEW_HOPE_RULES_28.has(card.id) || rulesVersion >= 29 && A_NEW_HOPE_RULES_29.has(card.id));
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
    return /character/i.test(card.type || '') && (card.id==='Light:319'||Number.isFinite(card.deploy) && card.deploy >= 0);
  }

  function basicWeaponRule(card) {
    return card?.type === 'Weapon' && card.subType === 'Character' ? BASIC_WEAPONS.get(card.id) : undefined;
  }

  function isBantha(card) {
    return card?.type === 'Vehicle' && ['Dark:191','Light:2125'].includes(card.id) && /Bantha ability = (?:½|½)/.test(card.gametext || '');
  }

  function permanentPilotAbility(card) {
    if (!['Starship','Vehicle'].includes(card?.type) || card.pilotsEjected) return null;
    if(['Light:2908','Dark:2596'].includes(card.id))return 3;
    const wording = [A_NEW_HOPE,HOTH].includes(card.set) ? /\bPermanent pilot(?: aboard)? provides ability of ([1-9]\d*)\./i :
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
    const supportedType = CARD_TYPES.has(front?.type) || [A_NEW_HOPE,HOTH].includes(edition) && EXPANSION_TYPES.has(front?.type);
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
    // This exact pinned Hoth entry documents a text erratum but supplies no slip asset.
    const textOnlyArtillery = edition === HOTH && id === 'Light:135' && errataSymbol === 'E1' &&
      front.errataDate === '2023-10-07' && record.preErrata?.sourceId === 40034 &&
      front.errataNotes === 'Clarifies that the Warrior with the remote is firing the weapons remotely.' &&
      !errataImage && front.printableSlipType == null;
    if (errataSymbol && !textOnlyArtillery && (!validErrataSymbol || !errataImage || (front.printableSlipType !== 'ERRATA' && !besiegedSlip))) {
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
    if(card.set===HOTH)return isReleasedExpansionCard(card);
    if(card.set===A_NEW_HOPE&&isReleasedExpansionCard(card))return true;
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
       'Light:2385','Dark:575','Dark:2517','Dark:643','Dark:1697','Light:534','Light:1572','Dark:153',
       'Light:255','Light:282','Light:762','Light:819','Light:1081','Light:1136','Light:1183','Light:1229','Light:1605','Light:1668','Light:1872',
       'Light:2056','Light:2151','Light:2174','Light:2222','Light:2673',
       'Dark:487','Dark:626','Dark:1035','Dark:1198','Dark:1275','Dark:1308','Dark:2368','Dark:2392','Dark:2577','Dark:2672'].includes(card.id)) return true;
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
      if ([A_NEW_HOPE,HOTH].includes(card.set) && !isReleasedExpansionCard(card, cardRulesVersion)) throw error(id + ' ist noch nicht für das Spiel freigegeben (Regelstand).');
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
      const byTheme = new Map((format==='premiere-a-new-hope-hoth'?[]:themes.decks[side]).map(definition => [definition.theme.id, definition]));
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

  return {SOURCE, REVISION, EDITION, A_NEW_HOPE, HOTH, EDITIONS, SIDES, PLAY_FORMATS, EXPANSION_RULES_VERSION,HOTH_RULES_VERSION,
    readCatalog, readSupplementalCards, readStarterDecks, readThemedDecks, readFormatDeckChoices,
    readCardValue, locationTitle, isDeployableCharacter, basicWeaponRule, isBantha, isLostPileEffect, permanentPilotAbility,
    isGarrisonExpansionCard, isReleasedExpansionCard, buildAudit};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PremiereData;
