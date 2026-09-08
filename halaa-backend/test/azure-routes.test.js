const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const config = require('../src/config');
const renderer = require('../src/modules/locations/azureRender.service');
const originalKey = config.maps.azureApiKey;
process.env.RATE_LIMIT_ENABLED = 'true';
// Only authentication is substituted in this isolated router test. Live UI
// tests exercise the real seeded login, cookies and protect middleware.
const authPath = require.resolve('../src/shared/middleware/auth');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
  protect(req, res, next) {
    if (!req.get('x-test-user')) return res.sendStatus(401);
    req.user = { _id: req.get('x-test-user'), role: 'admin' }; next();
  },
} };
const router = require('../src/modules/locations/azureMaps.routes');
const httpFetch = global.fetch;
let server, base;
test.before(async () => {
  config.maps.azureApiKey = 'route-test-key';
  const app = express();
  app.use('/azure', router);
  app.use((error, req, res, next) => res.status(error.statusCode || 400).json({ code: error.code }));
  server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  base = `http://127.0.0.1:${server.address().port}/azure`;
});
test.after(async () => {
  global.fetch = httpFetch; config.maps.azureApiKey = originalKey;
  await new Promise(resolve => server.close(resolve));
});

test('session and search require authentication; render rejects missing/forged tickets', async () => {
  for (const [path, method] of [['/session', 'POST'], ['/autocomplete?q=Jeddah', 'GET'], ['/reverse-geocode?latitude=21&longitude=39', 'GET'], ['/render/tile?zoom=1&x=0&y=0', 'GET']]) {
    assert.equal((await httpFetch(base + path, { method })).status, 401);
  }
  const forged = await httpFetch(base + '/render/tile?zoom=1&x=0&y=0', { headers: { authorization: 'Bearer forged' } });
  assert.equal(forged.status, 401);
});

test('session quota is per user, includes admins, and does not consume search quota', async () => {
  for (let n = 0; n < 10; n++) {
    const response = await httpFetch(base + '/session', { method: 'POST', headers: { 'x-test-user': 'quota-a' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok((await response.json()).data.token);
  }
  assert.equal((await httpFetch(base + '/session', { method: 'POST', headers: { 'x-test-user': 'quota-a' } })).status, 429);
  assert.equal((await httpFetch(base + '/session', { method: 'POST', headers: { 'x-test-user': 'quota-b' } })).status, 200);
  global.fetch = async () => ({ ok: true, json: async () => ({ results: [] }) });
  const search = await httpFetch(base + '/autocomplete?q=Jeddah', { headers: { 'x-test-user': 'quota-a' } });
  assert.equal(search.status, 200);
  assert.equal(search.headers.get('cache-control'), 'no-store');
});

test('valid render ticket cannot turn proxy into a general fetch endpoint', async () => {
  global.fetch = async () => { assert.fail('Invalid input must not call upstream'); };
  const headers = { authorization: `Bearer ${renderer.createSession('renderer').token}` };
  for (const path of ['/render/search?q=Jeddah', '/render/tile?zoom=2&x=4&y=0', '/render/attribution?zoom=2&bounds=1,2,3,']) {
    assert.equal((await httpFetch(base + path, { headers })).status, 400);
  }
});
