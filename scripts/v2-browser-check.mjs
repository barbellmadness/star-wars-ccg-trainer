import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
import {startLocalV2Server} from './serve-v2-local.mjs';

test('V2 starts, handles unavailable images and stays playable at desktop and narrow widths', {timeout: 45000}, async () => {
  const server = startLocalV2Server({port: 0});
  let browser;
  try {
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({channel: process.env.SWCCG_CHROMIUM_CHANNEL || 'chrome'});
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await page.goto(origin + '/v2.html');
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    await page.locator('#gameSeed').fill('4');
    await page.locator('#start').click();
    await page.locator('#setupOptions button.start-location-option').nth(1).click();
    await page.getByRole('button', {name: 'Partie beginnen'}).click();
    assert.equal(await page.locator('#botHand .card-back').count(), 8);
    assert.equal(await page.locator('#hand .card-face').count(), 8);
    assert.ok(await page.evaluate(() => {
      const board = document.querySelector('.playmat-shell').getBoundingClientRect();
      const bot = document.querySelector('.table-bot').getBoundingClientRect();
      const info = document.querySelector('.table-info').getBoundingClientRect();
      return board.left >= bot.right && info.left >= board.right;
    }));

    const firstCard = page.locator('#handCard0');
    await firstCard.focus();
    await page.keyboard.press('Enter');
    const inspector = page.getByRole('dialog', {name: await firstCard.getAttribute('aria-label').then(label => label.replace(/ ansehen$/, ''))});
    assert.ok(await inspector.isVisible());
    await page.waitForFunction(() => {
      const image = document.querySelector('#cardInspectorBody img');
      return image?.complete && !image.naturalWidth;
    });
    assert.match(await inspector.textContent(), /Aktiver Spieltext/);
    assert.ok(await inspector.evaluate(dialog => {
      const luminance = color => color.match(/\d+/g).slice(0, 3).map(Number)
        .map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const {color, backgroundColor} = getComputedStyle(dialog);
      return (luminance(color) + 0.05) / (luminance(backgroundColor) + 0.05) >= 4.5;
    }));
    await page.keyboard.press('Escape');
    assert.equal(await inspector.isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'handCard0');

    for (let step = 0; step < 18 && await page.locator('#botTurnPanel').isVisible(); step++) {
      await page.locator('#botNext').click();
    }
    assert.equal(await page.locator('#botTurnPanel').isVisible(), false);
    assert.match(await page.locator('#botHistory').textContent(), /Bot beendet seinen Lernzug/);
    await page.getByRole('button', {name: 'Force aktivieren'}).click();
    await page.locator('#step').click();
    await page.locator('#step').click();
    const playable = await page.evaluate(() => legalActions(state, 'Light').find(action => action.kind === 'deploy')?.args[0]);
    assert.ok(Number.isInteger(playable));
    await page.locator('#handCard' + playable).click();
    await page.getByRole('button', {name: 'Karte auswählen'}).click();
    const targets = page.locator('.playmat-actions').getByRole('button', {name: 'Ausspielen'});
    assert.ok(await targets.locator('xpath=self::button[not(@disabled)]').count() > 0);
    assert.ok(await targets.locator('xpath=self::button[@disabled]').count() > 0);
    const handBefore = await page.locator('#hand .card-face').count();
    await targets.locator('xpath=self::button[not(@disabled)]').first().click();
    assert.equal(await page.locator('#hand .card-face').count(), handBefore - 1);

    await page.setViewportSize({width: 390, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.locator('.location-art-button').first().getAttribute('aria-label'));
    assert.deepEqual(errors, []);

    await page.locator('#gameSeed').fill('0');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#start').click();
    await page.getByRole('checkbox', {name: 'Bot automatisch spielen lassen'}).check();
    await page.locator('#setupOptions button.start-location-option').nth(1).click();
    await page.getByRole('button', {name: 'Partie beginnen'}).click();
    await page.getByRole('button', {name: 'Force aktivieren'}).waitFor();
    assert.equal(await page.locator('#botNext').isVisible(), false);
    assert.match(await page.locator('#botHistory').textContent(), /Bot beendet seinen Lernzug/);
    await page.getByRole('button', {name: /Eyes In The Dark ansehen/}).click();
    const effect = page.getByRole('dialog', {name: /Eyes In The Dark/});
    assert.match(await effect.textContent(), /In deiner Ausspielen-Phase/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Force aktivieren'}).click();
    await page.locator('#step').click();
    await page.locator('#step').click();
    await page.getByRole('button', {name: 'Eyes In The Dark ansehen', exact: false}).click();
    await effect.getByRole('button', {name: 'Dark Side Lost Pile verdecken (0 Force)'}).click();
    assert.equal(await effect.isVisible(), false);
    assert.match(await page.locator('#pilesDark').textContent(), /Lost Pile verdeckt/);

    await page.evaluate(() => {
      const card = id => ({...catalog.find(card => card.id === id)});
      state.phase = 4;
      state.locations = ['Light:2447', 'Light:2448', 'Light:2440'].map(card);
      state.locationOrder = [0, 1, 2];
      state.light = [[], [{...card('Light:2052'), weapons: [card('Light:259')]}, card('Light:2040')], []];
      state.dark = [[], [{...card('Dark:2355'), weapons: [card('Dark:1264')]}], []];
      presentGame();
    });
    const originColumn = page.locator('.playmat-column').filter({hasText: 'Tatooine: Dune Sea'});
    assert.equal(await originColumn.locator('.light-zone .zone-totals').textContent(), 'Power 1 Ability 3');
    assert.equal(await originColumn.locator('.dark-zone .zone-totals').textContent(), 'Power 1 Ability 1');
    assert.ok(await originColumn.locator('.light-zone .playmat-stack').evaluate(stack => {
      const weapon = stack.firstElementChild.getBoundingClientRect();
      const host = stack.lastElementChild.getBoundingClientRect();
      const neighbor = stack.parentElement.nextElementSibling.getBoundingClientRect();
      return weapon.top < host.top && weapon.bottom > host.top && host.right <= neighbor.left;
    }));
    await originColumn.getByRole('button', {name: 'Waffe · Blaster ansehen'}).click({position: {x: 8, y: 5}});
    assert.ok(await page.getByRole('dialog', {name: 'Blaster', exact: true}).isVisible());
    await page.keyboard.press('Escape');

    const moveTrigger = originColumn.getByRole('button', {name: /Bewegen.*4 Optionen/});
    assert.equal(await originColumn.locator('.playmat-location button').count(), 2);
    await moveTrigger.click();
    const movement = page.getByRole('dialog', {name: /Bewegung.*Tatooine: Dune Sea/});
    assert.ok(await movement.isVisible());
    await movement.locator('summary').filter({hasText: 'Rebel Pilot'}).click();
    await movement.getByRole('button', {name: /Tatooine: Docking Bay 94 · Landspeed \(1 Force\)/}).click();
    assert.equal(await movement.isVisible(), false);
    assert.ok(await page.locator('.playmat-column').filter({hasText: 'Tatooine: Docking Bay 94'})
      .getByRole('button', {name: 'Rebel Pilot ansehen', exact: true}).isVisible());
    assert.equal(await originColumn.locator('.light-zone .zone-totals').textContent(), 'Power 1 Ability 1');
    await page.evaluate(() => { state.phase = 3; presentGame(); });

    await page.getByRole('button', {name: 'Battle (1 Force)', exact: true}).and(page.locator(':enabled')).first().click();
    const battle = page.getByRole('dialog', {name: /Bodenkampf/});
    assert.ok(await battle.isVisible());
    assert.match(await battle.locator('.battle-side.light').textContent(), /Rebel Trooper/);
    assert.match(await battle.locator('.battle-side.dark').textContent(), /Stormtrooper/);
    assert.equal(await battle.locator('[aria-current="step"]').textContent(), 'Waffen');
    await page.keyboard.press('Escape');
    assert.ok(await battle.isVisible());
    await battle.getByRole('button', {name: 'Im Waffen-Segment passen'}).click();
    await battle.getByRole('button', {name: 'Light verzichtet'}).waitFor();
    assert.equal(await battle.locator('[aria-current="step"]').textContent(), 'Power & Destiny');
    assert.match(await battle.locator('#battlePriority').textContent(), /Du bist dran/);

    const endBattle = battle.getByRole('button', {name: 'Partie beenden · v2.1.0'});
    page.once('dialog', dialog => dialog.dismiss());
    await endBattle.click();
    assert.ok(await battle.isVisible());
    assert.ok(await page.evaluate(() => Boolean(localStorage.getItem(saveKey))));
    page.once('dialog', dialog => dialog.accept());
    await endBattle.click();
    assert.equal(await battle.isVisible(), false);
    assert.equal(await page.locator('#gameTable').isVisible(), false);
    assert.equal(await page.locator('#instruction').textContent(), 'Partie beendet');
    assert.equal(await page.evaluate(() => localStorage.getItem(saveKey)), null);
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    assert.equal(await page.locator('#resumeGame').isVisible(), false);

    await page.route('**/data/premiere.json', route => route.fulfill({json: {cards: []}}));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#instruction').textContent.includes('Kartendaten oder Starterdecks nicht bereit'));
    assert.equal(await page.locator('#start').isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    try {
      await browser?.close();
    } finally {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
});
