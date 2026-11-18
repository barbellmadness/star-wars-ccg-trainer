import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('every edition has prepared, self-contained artwork without external image requests', async () => {
  const registry=JSON.parse(await readFile(new URL('../data/editions.json',import.meta.url),'utf8'));
  const sources=JSON.parse(await readFile(new URL('../data/edition-banner-sources.json',import.meta.url),'utf8'));
  assert.deepEqual(sources.map(e=>e.edition),registry.editions.map(e=>e.id));
  const context={window:{}};
  vm.runInNewContext(await readFile(new URL('../assets/edition-banners.js',import.meta.url),'utf8'),context);
  for(const edition of sources){
    const metadata=context.window.PremiereEditionBanners.get(edition.edition);
    assert.equal(metadata.artwork,edition.artwork);
    const art=await readFile(new URL('../'+edition.artwork,import.meta.url),'utf8');
    assert.match(art,/<svg[^>]+viewBox="0 0 440 180"/);
    assert.match(art,/<image href="data:image\/webp;base64,/);
    assert.doesNotMatch(art,/<script|<foreignObject|href="https?:|local-print|generated_images/);
    if(edition.packagingReference){assert.match(art,/<clipPath id="wrapper"><polygon points="/);assert.match(art,/clip-path="url\(#wrapper\)"/);}
    assert.equal(edition.cards.every(c=>c.source.startsWith('https://res.starwarsccg.org/cards/')),true);
  }
  assert.equal(context.window.PremiereEditionBanners.get('unknown'),undefined);
  const heading=context.window.PremiereEditionBanners.heading('premiere',{headingId:'test',title:'<Decks>',description:'A & B'});
  assert.match(heading,/&lt;Decks&gt;/);assert.match(heading,/A &amp; B/);assert.match(heading,/loading="lazy"/);
  assert.equal(context.window.PremiereEditionBanners.heading('unknown',{}),'');
});
