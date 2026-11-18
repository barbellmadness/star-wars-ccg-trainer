import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {resolve, dirname, relative, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const webPages = ['index.html', 'v2.html', 'editionen.html', 'anleitungen/index.html',
  'anleitungen/schnellstart.html', 'anleitungen/spielzug.html', 'anleitungen/kampf.html',
  'anleitungen/a-new-hope.html'];
// Deliberate allowlist: never collect arbitrary JSON, local reports, credentials or the checkout.
const sourceAssets = ['assets/site.css', 'assets/edition-banners.css', ...['data', 'game', 'battle', 'units', 'locations',
  'weapons', 'card-rules', 'bot', 'learning', 'session'].map(name => `engine/premiere-${name}.js`),
  ...['premiere', 'a-new-hope', 'hoth', 'premiere-starter-decks', 'premiere-themed-decks',
    'premiere-supplemental-cards', 'premiere-card-notes', 'play-format-decks'].map(name => `data/${name}.json`)];
const digest = body => createHash('sha256').update(body).digest('hex');

export async function buildWeb(output) {
  output = resolve(output);
  if (output === root || !relative(root, output) || output === dirname(root)) {
    throw new Error('Das Ausgabeziel darf nicht das Repository oder dessen Elternverzeichnis sein.');
  }
  await mkdir(output, {recursive: true});
  if ((await readdir(output)).length) throw new Error('Das Ausgabeziel muss leer sein. Neues Release-Verzeichnis verwenden.');
  const files = [];
  const mapping = new Map();
  const editions = JSON.parse(await readFile(resolve(root, 'data/editions.json'), 'utf8'));
  const collectorFiles = editions.editions.filter(e => e.cardsUrl).map(e => {
    if (!/^[a-z0-9-]+$/.test(e.id) || e.cardsUrl !== `data/collector-${e.id}.json`) throw new Error('Ungültiger Sammlerpfad.');
    return e.cardsUrl;
  });
  async function emit(path, body, kind) {
    const target = resolve(output, path);
    if (!target.startsWith(output + sep)) throw new Error('Ungültiger Release-Pfad.');
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, body);
    files.push({path, kind, bytes: Buffer.byteLength(body), gzipBytes: gzipSync(body).length, sha256: digest(body)});
  }
  const bannerFiles = editions.editions.map(e => {
    if (!/^[a-z0-9-]+$/.test(e.id)) throw new Error('Ungültige Banner-Edition.');
    return `assets/edition-banners/${e.id}.svg`;
  });
  for (const source of [...bannerFiles, 'assets/edition-banners.js', ...sourceAssets, ...collectorFiles, 'data/editions.json', 'assets/collectors.css', 'assets/collectors.js']) {
    let body = (await readFile(resolve(root, source), 'utf8')).replaceAll('\r\n', '\n');
    if (source.endsWith('.json')) body = JSON.stringify(JSON.parse(body));
    if (source === 'data/editions.json' || source === 'assets/edition-banners.js') for (const [original, hashed] of mapping) body = body.replaceAll(original, hashed);
    const path = source.replace(/\.(js|json|css|svg)$/, `.${digest(body).slice(0, 12)}.$1`);
    mapping.set(source, path);
    await emit(path, body, 'asset');
  }
  for (const page of webPages) {
    let body = (await readFile(resolve(root, page), 'utf8')).replaceAll('\r\n', '\n');
    for (const [source, target] of mapping) {
      body = body.replaceAll(source, target);
      // Content hashes replace the development query version.
      body = body.replaceAll(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=[\\d.]+', 'g'), target);
    }
    await emit(page, body, 'page');
  }
  for (const path of ['.htaccess', 'data/SWCCGPC-LICENSE.txt']) {
    await emit(path, (await readFile(resolve(root, path), 'utf8')).replaceAll('\r\n', '\n'), 'config');
  }
  const version = (await readFile(resolve(root, 'v2.html'), 'utf8')).match(/const trainerVersion='([^']+)'/)[1];
  const revision = digest(files.map(file => file.path + ':' + file.sha256).join('\n')).slice(0, 16);
  const manifest = {schema: 1, version, revision, files};
  await writeFile(resolve(output, 'release.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--output') throw new Error('Aufruf: node scripts/build-web.mjs --output <leeres-verzeichnis>');
  const release = await buildWeb(args[1]);
  console.log(JSON.stringify({version: release.version, revision: release.revision,
    files: release.files.length, bytes: release.files.reduce((n, f) => n + f.bytes, 0),
    gzipBytes: release.files.reduce((n, f) => n + f.gzipBytes, 0)}, null, 2));
}
