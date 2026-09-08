// Local, loopback-only visual check using real Azure tiles and the shared map.
// Run: node scripts/preview-azure-maps.mjs, then http://127.0.0.1:4187
import http from 'node:http';
import { createRequire } from 'node:module';
import { azureMapDocument } from '../../shared/src/utils/azureMapDocument.js';
const require = createRequire(import.meta.url);
const render = require('../src/modules/locations/azureRender.service');
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4187');
    if (url.pathname === '/') {
      const token = render.createSession('local-map-preview').token;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(azureMapDocument({ renderUrl: 'http://127.0.0.1:4187/render', token, language: url.searchParams.get('language') === 'en' ? 'en' : 'ar', latitude: 21.603542, longitude: 39.109055 }));
      return;
    }
    if (url.pathname.startsWith('/render/')) {
      render.verifySession((req.headers.authorization || '').replace(/^Bearer /, ''));
      const result = await render.render(url.pathname.slice('/render/'.length), Object.fromEntries(url.searchParams));
      res.setHeader('Content-Type', result.type);
      res.end(Buffer.isBuffer(result.body) ? result.body : JSON.stringify(result.body));
      return;
    }
    res.writeHead(404).end();
  } catch (error) { res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: error.code || 'MAPS_UNAVAILABLE' })); }
}).listen(4187, '127.0.0.1', () => console.log('Azure map preview: http://127.0.0.1:4187'));
