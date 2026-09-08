const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const render = require('../src/modules/locations/azureRender.service');
const originalKey = config.maps.azureApiKey, originalFetch = global.fetch;
test.beforeEach(() => { config.maps.azureApiKey = 'test-azure-key'; });
test.afterEach(() => { config.maps.azureApiKey = originalKey; global.fetch = originalFetch; });

test('render tickets cannot authenticate as Halaa login tokens, nor vice versa', () => {
  const session = render.createSession('user1');
  assert.equal(render.verifySession(session.token), 'user1');
  assert.throws(() => jwt.verify(session.token, config.jwt.secret));
  const login = jwt.sign({ id: 'user1' }, config.jwt.secret);
  assert.throws(() => render.verifySession(login), { code: 'MAPS_SESSION_EXPIRED' });
  assert.throws(() => render.verifySession(session.token.slice(0, -3)), { code: 'MAPS_SESSION_EXPIRED' });
  assert.equal(jwt.decode(session.token).exp - jwt.decode(session.token).iat, 1800);
});
test('render proxy rejects arbitrary paths, invalid tiles and malformed bounds before fetching', async () => {
  global.fetch = async () => { assert.fail('Invalid input must not reach Azure'); };
  for (const [resource, query] of [['search', {}], ['../keys', {}], ['tile', { zoom: 2, x: 4, y: 0 }], ['tile', { zoom: 20, x: 0, y: 0 }], ['attribution', { zoom: 4, bounds: '1,2,3,no' }]]) {
    await assert.rejects(render.render(resource, query), { code: 'INVALID_MAP_REQUEST' });
  }
});
test('render proxy fixes upstream host and tileset and strips caller credentials', async () => {
  global.fetch = async (value, options) => {
    const url = new URL(value);
    assert.equal(url.origin, 'https://atlas.microsoft.com');
    assert.equal(url.searchParams.get('tilesetId'), 'microsoft.base.road');
    assert.equal(url.searchParams.get('api-version'), '2024-04-01');
    assert.equal(url.searchParams.has('subscription-key'), false);
    assert.equal(options.headers['subscription-key'], 'test-azure-key');
    return { ok: true, headers: new Headers({ 'content-type': 'image/png' }), arrayBuffer: async () => new Uint8Array([137,80,78,71]).buffer };
  };
  const result = await render.render('tile', { zoom: 2, x: 1, y: 1, url: 'https://evil.test', 'subscription-key': 'attacker' });
  assert.equal(result.type, 'image/png');
  assert.deepEqual([...result.body], [137,80,78,71]);
});
