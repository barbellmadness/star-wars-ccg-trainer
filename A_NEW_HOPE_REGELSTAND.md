# A New Hope: Regelstand V2.15.34

Alle 162 ANH-Karten sind ab Regelversion 29 für neue Mischpartien freigegeben. Die letzten 74 Karten sind unten zugeordnet. Premiere bleibt das voreingestellte Format. Historische Partien behalten ihre frühere Regelversion; neue Regeln werden beim Fortsetzen nicht rückwirkend eingeschaltet.

## Quellen und bewusste Regelfassung

Grundlage sind die aktiven Texte des gepinnten Gemp-Katalogs, die verknüpften Errata und das [Advanced Rulebook 2023](https://res.starwarsccg.org/rules/SWCCG_2023_AdvancedRulebook.pdf), insbesondere Creatures, Capturing Characters, Tractor Beaming, Squadrons und Anhang C. Das ist eine festgehaltene Regelfassung, keine Behauptung über den jeweils neuesten Turnierstand.

Die [Decipher-Beilage von 1996](https://res.starwarsccg.org/rules/anewhoperules.pdf) erklärt die ursprünglichen ANH-Ergänzungen. Ihre Sonderregeln werden nicht zusätzlich mit widersprechenden späteren Regeln kombiniert:

| Gegenstand | Entscheidung im Trainer | Nachweis |
|---|---|---|
| Undercover | Die Beilage gestattete fremdes Boarding und Pilotieren; verwendet wird die spätere Einschränkung auf zugehörige Sites ohne Boarding/Pilotieren. | ANH Undercover-Tests, AR Anhang C |
| Gefangene | Die alte Voraussetzung Detention Block Corridor für jeden Fang wird durch Eskorte, Haft und Freilassung nach AR ersetzt. | Tests zu We Have A Prisoner, Cell 2187, Spice Mines sowie bisherigen Custody-Fällen |
| Creatures | Keine zusätzliche kostenlose Jagdbewegung nach der alten Beilage. Reguläre Habitat-Bewegung, Pflichtangriff in der Battle Phase, Wahl der betroffenen Seite und zufällige Beute nach AR. Creature-Angriffe sind keine Battles. | ANH Dianoga attacks; Regelmodul creaturePrey/creatureActions |
| Immediate Effects | Eigene Antwortfenster; bleiben auf dem Tisch. Alter-Immunität folgt dem Kartentyp, Control-Immunität ist eine separate Karteneigenschaft. | ANH grabbers; bestehende Sense/Alter-Tests |
| Destiny / Kosten | R2-D2 verlangt Wertwahl; Brainiac verwendet π. Lose Force geht in Lost und ist keine Use-Force-Zahlung. Optionale Raumboni bleiben eine Entscheidung. | ANH R2D2, Brainiac, epic rooms |
| Traktor / Squadrons | Gefangene Schiffe, eingeschlossene Besatzung und Besieged sind getrennte Zustände. Squadrons ersetzen drei passende Jäger, sind selbst keine Starfighters. | ANH Tractor Beam, Besieged, squadrons |

Aktiver Text, Druckscan und Vor-Errata-Text bleiben getrennte Datenfelder. Die 308 privaten Premiere-Drucktexte werden weder in diese Dokumentation noch in die Veröffentlichung übernommen.

## Einzelkarten und Prüfzuordnung

Die Basisangabe ersetzt keine Kostenberechnung: variable, zusätzliche und alternative Kosten sowie Zeitfenster stehen im [Regelregister](engine/premiere-card-rules.js), die ausführbaren Angebote in der [Session-Engine](engine/premiere-session.js). Die Testlinks führen zu Einzelkarten- oder Gruppenfällen. Vollständige Mischpartien prüfen zusätzlich Aktionserlaubnis, beide Spielseiten, deterministische Seeds und den Erhalt aller 120 Karteninstanzen. Das ist keine vollständige Aufzählung jeder möglichen Kartenkombination.

| Karte | Regelereignisse / Basis | Ziele | Regelfall |
|---|---|---|---|
| Light:64 · Advance Preparation | pileInterrupt (ab 29); pileInterrupt (ab 29; Kostenparameter 3) | own hand; own Lost Pile | [ANH Advance Preparation pays the selected cost before retrieval](tests/v2-rules.test.mjs#L7615) |
| Light:100 · Alternatives To Fighting | anhResponse (ab 29); pileInterrupt (ab 29); pileInterrupt (ab 29) | battle at system or sector; Besieged; captured starship | [ANH Alternatives cancels space battles and frees captured crews](tests/v2-rules.test.mjs#L7558) |
| Light:169 · •Attack Run | attackRunEpic (ab 29) | Death Star Trench | [ANH Leader targets attack-run fighters and improves ordinary weapon destiny](tests/v2-rules.test.mjs#L7224) |
| Light:319 · •Brainiac | brainiac (ab 29) | all hands and locations | [ANH Brainiac keeps irrational destiny and dynamic values](tests/v2-rules.test.mjs#L7494) |
| Light:385 · •Cell 2187 | locationEffect (ab 29) | own spy or leader | [ANH Cell 2187 releases chosen captives after its target arrives](tests/v2-rules.test.mjs#L7354) |
| Light:394 · •Chewbacca | chewbacca (ab 29) | same location and same site | [ANH Chewbacca repairs hits and receives Han and Falcon bonuses](tests/v2-rules.test.mjs#L7457) |
| Light:416 · •Clak'dor VII | clakdor (ab 29); clakdor (ab 29) | active side of location | [ANH Clakdor and Kiffex modify only qualifying states](tests/v2-rules.test.mjs#L7511) |
| Light:509 · •Commence Recharging | tableEffect (ab 29); recharge (ab 29) | superlaser; host superlaser | [ANH recharging conceals eight Force cards and returns them on cancellation](tests/v2-rules.test.mjs#L7313) |
| Light:681 · •Death Star: Trench | trenchManeuver (ab 29); trenchWeapons (ab 29) | active side of location | [ANH Leader targets attack-run fighters and improves ordinary weapon destiny](tests/v2-rules.test.mjs#L7224) |
| Light:694 · •Dejarik Hologameboard | holosite (ab 29); holosite (ab 29) | active side of location | [ANH holosites use destiny values and suspend ordinary text](tests/v2-rules.test.mjs#L7366) |
| Light:943 · Fire Extinguisher | device (ab 29); fireExtinguisher (ab 29) | astromech; same place or occupied starship | [ANH extinguisher prevents explosions and protects its ship](tests/v2-rules.test.mjs#L7450) |
| Light:1047 · •Gold 2 | goldRescue (ab 29) | hit friendly starfighter in Trench | [ANH Gold 2 sacrifices itself to save another hit starfighter](tests/v2-rules.test.mjs#L7273) |
| Light:1062 · Grappling Hook | grabInterrupt (ab 29; Kostenparameter 1) | opponent just played interrupt | [ANH grabbers enforce uniqueness and escalating costs after resolution](tests/v2-rules.test.mjs#L7600) |
| Light:1214 · I Have A Very Bad Feeling About This | anhResponse (ab 29) | deployment or completed react | [ANH Bad Feeling and Ngok answer completed actions](tests/v2-rules.test.mjs#L7536) |
| Light:1298 · Incom T-16 Skyhopper | shuttleVehicle (ab 29) | characters between site and related orbit | [ANH shuttle vehicles expose range and free orbit transfers](tests/v2-rules.test.mjs#L7623) |
| Light:1507 · •Let The Wookiee Win | anhResponse (ab 29); holositeDestiny (ab 29) | opposing character present; holosite battle | [ANH Let The Wookiee Win disarms after an eligible lost battle](tests/v2-rules.test.mjs#L7488) |
| Light:1674 · M-HYD 'Binary' Droid | binaryForfeit (ab 29) | non-droids at same and adjacent sites | [ANH Binary droid can be switched by either player](tests/v2-rules.test.mjs#L7651) |
| Light:1619 · Magnetic Suction Tube | device (ab 29); suction (ab 29) | sandcrawler; character present | [ANH suction devices compare ability and let the owner choose destination](tests/v2-rules.test.mjs#L7428) |
| Light:1987 · Quite A Mercenary | anhResponse (ab 29) | completed transport or deployment | [ANH transport retaliation and smuggler stop respect response timing](tests/v2-rules.test.mjs#L7547) |
| Light:1992 · •R2-D2 (Artoo-Detoo) | astromechShipStats (ab 29); r2Destiny (ab 29) | occupied starfighter; destiny draws | [ANH R2D2 chooses destiny and offers Scomp reactions](tests/v2-rules.test.mjs#L7503) |
| Light:2006 · RA-7 (Aray-Seven) | ra7Transfer (ab 29) | character weapons | [ANH RA7 transfers character weapons without paying deploy costs](tests/v2-rules.test.mjs#L7633) |
| Light:2048 · Rebel Squad Leader | squadLeader (ab 29) | other friendly troopers at same site | [ANH epic rooms require control and leaders for the printed positive bonus](tests/v2-rules.test.mjs#L7245) |
| Light:2050 · •••Rebel Tech | techAttack (ab 29); unitReserveSearch (ab 29) | own war room; Reserve Deck | [ANH Tech and Gunner bonuses accumulate and their searches pay with the source](tests/v2-rules.test.mjs#L7288) |
| Light:2061 · •Red 5 | pilotAttritionImmunity (ab 29); redFiveAttack (ab 29) | Luke piloting; lead starfighter | [ANH All Clear cancels the leader and ejects only one actual TIE](tests/v2-rules.test.mjs#L7267) |
| Light:2082 · Remote | locationEffect (ab 29; Kostenparameter 1); remote (ab 29) | any site; present character or seeker | [ANH Remote grants one temporary bonus or cancels a seeker](tests/v2-rules.test.mjs#L7437) |
| Light:2125 · •Rogue Bantha | rogueTrample (ab 29) | Tusken Raider present | [ANH Rogue Bantha tramples before optional battle responses](tests/v2-rules.test.mjs#L7408) |
| Light:2165 · •••Sandcrawler: Loading Bay | vehicleSite (ab 29); vehicleSiteTransit (ab 29); vehicleSiteTransit (ab 29; Kostenparameter 1); forfeit (ab 29); alwaysNight (ab 29); alwaysNight (ab 29) | friendly Sandcrawler; active side of location; jawa | [ANH crawler sites follow their host and lose their contents with it](tests/v2-rules.test.mjs#L7396) |
| Light:2298 · Solomahal | tableEffect (ab 29); scoutReact (ab 29) | warrior or scout; attached character | [ANH Solomahal grants scout skill to a warrior and exposes legal reacts](tests/v2-rules.test.mjs#L7638) |
| Light:2308 · •Sorry About The Mess | pileInterrupt (ab 29) | legal weapon target | [ANH control firing resolves costs, optional shooter bonus and immediate hits](tests/v2-rules.test.mjs#L7230) |
| Light:2563 · They're On Dantooine | locationEffect (ab 29; Kostenparameter 2); dantooineBlock (ab 29) | Death Star | [ANH Dantooine diversion blocks ignition until the mobile system arrives](tests/v2-rules.test.mjs#L7260) |
| Light:2611 · •Tiree | tireeAttack (ab 29) | Gold 2 piloted | [ANH Red 5 and Tiree apply matching pilot and Attack Run bonuses](tests/v2-rules.test.mjs#L7279) |
| Light:2802 · •••What're You Tryin' To Push On Us? | grabInterrupt (ab 29; Kostenparameter 3) | opponent just played interrupt | [ANH grabbers enforce uniqueness and escalating costs after resolution](tests/v2-rules.test.mjs#L7600) |
| Light:2824 · •Wookiee Roar | defendingDestiny (ab 29); pileInterrupt (ab 29; Kostenparameter 3); pileInterrupt (ab 29) | defending Chewbacca; Reserve Deck; mouse droid | [ANH Wookiee Roar supports defense, search and mouse droids](tests/v2-rules.test.mjs#L7480) |
| Light:2908 · Y-wing Assault Squadron | squadron (ab 29) | three matching starfighters | [ANH squadrons transfer optional crew and send replaced cards to Used](tests/v2-rules.test.mjs#L7415) |
| Light:2851 · •Yavin 4: Briefing Room | epicRoom (ab 29); epicRoom (ab 29) | active side of location | [ANH epic rooms require control and leaders for the printed positive bonus](tests/v2-rules.test.mjs#L7245) |
| Light:2892 · •You're All Clear Kid! | cancelNamedInterrupt (ab 29); pileInterrupt (ab 29; Kostenparameter 1) | Dark:1230; TIE in Trench | [ANH All Clear cancels the leader and ejects only one actual TIE](tests/v2-rules.test.mjs#L7267) |
| Dark:67 · •••Advosze | advosze (ab 29) | same location | [ANH Advosze receives equipment kickbacks and rejects voluntary collisions](tests/v2-rules.test.mjs#L7576) |
| Dark:223 · Besieged | tableEffect (ab 29); besieged (ab 29) | captured starship; captured starship crew | [ANH Besieged isolates trapped crew and selected attacking characters](tests/v2-rules.test.mjs#L7342) |
| Dark:227 · Bespin Motors Void Spider THX 1138 | shuttleVehicle (ab 29) | characters between site and related orbit | [ANH shuttle vehicles expose range and free orbit transfers](tests/v2-rules.test.mjs#L7623) |
| Dark:508 · Commence Primary Ignition | ignitionEpic (ab 29) | orbited planet | [ANH Primary Ignition pays site cost and lets the opponent choose Z](tests/v2-rules.test.mjs#L7307) |
| Dark:605 · •Dannik Jerriko | anhCharacter (ab 29) | character and eligible targets | [ANH Dannik consumes only a just lost opposing non-droid once per battle](tests/v2-rules.test.mjs#L7679) |
| Dark:657 · •••Death Star Gunner | gunnerIgnition (ab 29); unitReserveSearch (ab 29) | Death Star; Reserve Deck | [ANH Tech and Gunner bonuses accumulate and their searches pay with the source](tests/v2-rules.test.mjs#L7288) |
| Dark:670 · •Death Star: Conference Room | epicRoom (ab 29); epicRoom (ab 29) | active side of location | [ANH epic rooms require control and leaders for the printed positive bonus](tests/v2-rules.test.mjs#L7245) |
| Dark:687 · •••Defel | anhCharacter (ab 29) | character and eligible targets | [ANH Defel hides only at night and causes loss at a revolved site](tests/v2-rules.test.mjs#L7667) |
| Dark:729 · Dianoga | dianoga (ab 29) | creature habitat and eligible prey | [ANH Dianoga attacks select a side then random prey and remember the last meal](tests/v2-rules.test.mjs#L7238) |
| Dark:891 · Evader | pileInterrupt (ab 29); anhResponse (ab 29) | Revolutions; just lost card | [ANH Evader cancels revolutions and rescues eligible recent losses](tests/v2-rules.test.mjs#L7472) |
| Dark:1073 · •Greedo | anhCharacter (ab 29) | character and eligible targets | [ANH Greedo offers a genuine threat payment choice](tests/v2-rules.test.mjs#L7673) |
| Dark:1126 · •Hem Dazon | anhCharacter (ab 29) | character and eligible targets | [ANH Hem Dazon keeps salt concealed and loses it with his card](tests/v2-rules.test.mjs#L7659) |
| Dark:1200 · Hypo | device (ab 29); hypo (ab 29) | it0; captive present | [ANH Hypo asks a truthful question or grants a drain bonus](tests/v2-rules.test.mjs#L7390) |
| Dark:1230 · •I'm On The Leader | pileInterrupt (ab 29); pileInterrupt (ab 29) | Attack Run starfighter; any starfighter | [ANH Leader targets attack-run fighters and improves ordinary weapon destiny](tests/v2-rules.test.mjs#L7224) |
| Dark:1274 · •Imperial Holotable | holosite (ab 29); holosite (ab 29) | active side of location | [ANH holosites use destiny values and suspend ordinary text](tests/v2-rules.test.mjs#L7366) |
| Dark:1284 · Imperial Squad Leader | squadLeader (ab 29) | other friendly troopers at same site | [ANH epic rooms require control and leaders for the printed positive bonus](tests/v2-rules.test.mjs#L7245) |
| Dark:1434 · •Kiffex | kiffex (ab 29); kiffex (ab 29) | active side of location | [ANH Clakdor and Kiffex modify only qualifying states](tests/v2-rules.test.mjs#L7511) |
| Dark:1453 · •Krayt Dragon Bones | tableEffect (ab 29; Kostenparameter 1); kraytBones (ab 29) | own side; opposing destiny | [ANH Krayt bones resolves every numbered destiny consequence](tests/v2-rules.test.mjs#L7521) |
| Dark:1478 · ••Laser Gate | laserGate (ab 29) | adjacent interior mobile sites | [ANH Laser Gate blocks passage and is a weapon target from either side](tests/v2-rules.test.mjs#L7383) |
| Dark:1558 · •Lirin Car'n | coverCharge (ab 29) | characters arriving at same site | [ANH Lirin cover charge counts present musicians and preserves free movement](tests/v2-rules.test.mjs#L7583) |
| Dark:1618 · Magnetic Suction Tube | device (ab 29); suction (ab 29) | sandcrawler; character present | [ANH suction devices compare ability and let the owner choose destination](tests/v2-rules.test.mjs#L7428) |
| Dark:1640 · •Maneuver Check | locationEffect (ab 29); maneuverCheck (ab 29) | Death Star Trench; departing opposing starfighters | [ANH Maneuver Check resolves each departing opposing starfighter](tests/v2-rules.test.mjs#L7254) |
| Dark:1685 · Mobquet A-1 Deluxe Floater | floaterReact (ab 29) | friendly underworld in battle | [ANH Floater requires an eligible participant for its free react](tests/v2-rules.test.mjs#L7644) |
| Dark:1770 · Ng'ok | anhResponse (ab 29) | deployment or completed react | [ANH Bad Feeling and Ngok answer completed actions](tests/v2-rules.test.mjs#L7536) |
| Dark:1844 · Oo-ta Goo-ta, Solo? | anhResponse (ab 29); namedCancellation (ab 29) | completed transport or deployment; Kessel Run | [ANH transport retaliation and smuggler stop respect response timing](tests/v2-rules.test.mjs#L7547) |
| Dark:1955 · •Program Trap | tableEffect (ab 29; Kostenparameter 1); programTrap (ab 29) | droid; all destiny draws | [ANH Program Trap counts the whole site but explodes only among present characters](tests/v2-rules.test.mjs#L7444) |
| Dark:2164 · •••Sandcrawler: Droid Junkheap | vehicleSite (ab 29); vehicleSiteTransit (ab 29); vehicleSiteTransit (ab 29; Kostenparameter 1); forfeit (ab 29); alwaysNight (ab 29); alwaysNight (ab 29) | friendly Sandcrawler; active side of location; jawa | [ANH crawler sites follow their host and lose their contents with it](tests/v2-rules.test.mjs#L7396) |
| Dark:2290 · •Sniper | pileInterrupt (ab 29) | legal weapon target | [ANH control firing resolves costs, optional shooter bonus and immediate hits](tests/v2-rules.test.mjs#L7230) |
| Dark:2330 · •Spice Mines Of Kessel | locationEffect (ab 29); spiceMines (ab 29) | escorted captive; captive and escort | [ANH Spice Mines completes only with its designated captive and escort](tests/v2-rules.test.mjs#L7360) |
| Dark:2378 · •Superlaser | weapon (ab 29) | capital starship | [ANH Tech and Gunner bonuses accumulate and their searches pay with the source](tests/v2-rules.test.mjs#L7288) |
| Dark:2438 · •Tatooine: Bluffs | bluffs (ab 29); bluffs (ab 29) | active side of location | [ANH Bluffs conceal cards and distinguish legal free deployment from loss](tests/v2-rules.test.mjs#L7376) |
| Dark:2505 · Tentacle | grabInterrupt (ab 29; Kostenparameter 1) | opponent just played interrupt | [ANH grabbers enforce uniqueness and escalating costs after resolution](tests/v2-rules.test.mjs#L7600) |
| Dark:2555 · •••There'll Be Hell To Pay | grabInterrupt (ab 29; Kostenparameter 3) | opponent just played interrupt | [ANH grabbers enforce uniqueness and escalating costs after resolution](tests/v2-rules.test.mjs#L7600) |
| Dark:2596 · TIE Assault Squadron | squadron (ab 29) | three matching starfighters | [ANH All Clear cancels the leader and ejects only one actual TIE](tests/v2-rules.test.mjs#L7267) |
| Dark:2620 · Tractor Beam | device (ab 29; Kostenparameter 2); tractorDevice (ab 29) | star-destroyer; opposing starship present | [ANH Tractor Beam holds crewed ships and releases them when its holder loses the device](tests/v2-rules.test.mjs#L7335) |
| Dark:2635 · •Trooper Davin Felth | felth (ab 29) | Tatooine and same site | [ANH Felth changes interrupt destination and accident chooser](tests/v2-rules.test.mjs#L7465) |
| Dark:2754 · We Have A Prisoner | anhResponse (ab 29); pileInterrupt (ab 29) | about to lose opposing character; captured ship crew | [ANH We Have A Prisoner replaces a paid battle forfeit with capture](tests/v2-rules.test.mjs#L7348) |
| Dark:2784 · •WED15-l7 'Septoid' Droid | septoid (ab 29) | self | [ANH Septoid absorbs damage without leaving until exhausted or hit](tests/v2-rules.test.mjs#L7590) |
