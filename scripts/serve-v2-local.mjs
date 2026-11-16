import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const reportPath = resolve(process.argv[2] ?? join(root, '..',
  'Star Wars CCG Premiere - Drucktexte lokal', 'premiere-drucktexte-lokal.json'));
const host = '127.0.0.1';
const port = 8000;
const allowedHosts = new Set([host + ':' + port, 'localhost:' + port]);
const contentTypes = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  if (!allowedHosts.has(request.headers.host)) {
    response.writeHead(403).end();
    return;
  }
  if (request.method !== 'GET') {
    response.writeHead(405, {Allow: 'GET'}).end();
    return;
  }
  const route = request.url.split('?')[0];
  const privateReport = route === '/local-print-texts.json';
  if (privateReport && request.headers['sec-fetch-site'] &&
      request.headers['sec-fetch-site'] !== 'same-origin') {
    response.writeHead(403).end();
    return;
  }
  const asset = route === '/' ? '/v2.html' : route;
  if (!privateReport && !/^\/(?:v2\.html|index\.html|engine\/[\w-]+\.js|data\/[\w-]+\.json)$/.test(asset)) {
    response.writeHead(404).end();
    return;
  }
  const file = privateReport ? reportPath : join(root, asset.slice(1));
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[asset.split('.').at(-1)],
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    }).end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? 'Port 8000 ist belegt. Beende den laufenden lokalen Server und starte V2 erneut.'
    : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log('V2 läuft unter http://127.0.0.1:8000/v2.html. Beenden mit Strg+C.');
});
