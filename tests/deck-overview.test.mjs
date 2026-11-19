import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {buildDeckOverview} from '../scripts/build-deck-overview.mjs';

test('lightweight overview stays in sync with all expansion decks and omits card lists and rules', async () => {
  const overview = JSON.parse(await readFile(new URL('../data/deck-overview.json', import.meta.url), 'utf8'));
  assert.deepEqual(overview, await buildDeckOverview());
  assert.ok(gzipSync(JSON.stringify(overview)).length < 4096, 'Overview gzip budget: 4 KiB');
  for (const sides of Object.values(overview.formats)) for (const decks of Object.values(sides)) {
    assert.equal(decks.length, 8);
    assert.equal(new Set(decks.map(deck => deck.id)).size, 8);
    for (const deck of decks) {
      assert.deepEqual(Object.keys(deck).sort(), ['cover', 'id', 'name']);
      assert.match(deck.cover.image, /^https:\/\//);
    }
  }
});
