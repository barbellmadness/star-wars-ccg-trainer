import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {chromium} from 'playwright-core';
import {buildWeb} from './build-web.mjs';
import {startLocalV2Server} from './serve-v2-local.mjs';

test('built fan homepage, guides and hashed game run without remote images', {timeout: 90000}, async () => {
  const output = await mkdtemp(join(tmpdir(), 'swccg-web-browser-'));
  let browser, server;
  try {
    await buildWeb(output);
    server = startLocalV2Server({port: 0, siteRoot: output});
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({channel: process.env.SWCCG_CHROMIUM_CHANNEL || 'chrome'});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(origin + '/');
    await page.getByRole('heading', {level: 1}).waitFor();
    assert.match(await page.locator('.fan-notice').textContent(), /inoffizielles Fanprojekt/);
    assert.equal(requests.filter(url => /engine\/|data\/|https:\/\//.test(url)).length, 0, 'Homepage must not load game or external assets');
    await page.screenshot({path: '.hosting-qa-desktop.png', fullPage: true});
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Homepage overflow at ' + width);
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: '.hosting-qa-mobile.png', fullPage: true});
    await page.getByRole('link', {name: 'Anleitungen', exact: true}).click();
    for (const name of ['schnellstart', 'spielzug', 'kampf', 'a-new-hope']) {
      await page.goto(origin + '/anleitungen/' + name + '.html');
      assert.equal(await page.getByRole('heading', {level: 1}).count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Guide overflow: ' + name);
    }
    assert.equal((await page.request.get(origin + '/local-print-texts.json')).status(), 404);
    assert.equal((await page.request.get(origin + '/.git/config')).status(), 404);
    assert.equal((await page.request.get(origin + '/data/SWCCGPC-LICENSE.txt')).status(), 200);
    await page.goto(origin + '/v2.html');
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    await page.locator('#launchSides [data-side="light"]').click();
    assert.equal(await page.locator('[data-deck-format="premiere"] [data-deck]').count(), 8);
    assert.equal(await page.locator('[data-deck-format="premiere-a-new-hope"] [data-deck]').count(), 8);
    assert.ok(requests.some(url => /engine\/premiere-session\.[a-f0-9]{12}\.js$/.test(url)));
    assert.ok(requests.some(url => /data\/a-new-hope\.[a-f0-9]{12}\.json$/.test(url)));
    assert.deepEqual(errors, []);
  } finally {
    try { await browser?.close(); }
    finally {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      const target = resolve(output);
      if (!target.startsWith(resolve(tmpdir()) + sep) || !target.includes('swccg-web-browser-')) throw new Error('Unexpected cleanup path');
      await rm(target, {recursive: true});
    }
  }
});
