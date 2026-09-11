import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { API_PATHS } from '../src/api/paths.js';
import { azureMapDocument } from '../src/utils/azureMapDocument.js';
import { createMapSessionManager } from '../src/utils/mapSession.js';

test('map document remains executable data for Hermes and escapes script-breaking configuration', () => {
  const html = azureMapDocument({ renderUrl: `https://halaa.com.sa${API_PATHS.locations.azureRender}`,
    token: '</script><script>alert(1)</script>', language: 'en', latitude: 0, longitude: 0 });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(scripts[0][1], /\[native code\]|\[bytecode\]/);
  assert.match(scripts[0][1], /"hasPin":true/);
  new vm.Script(scripts[0][1]);
});

test('map session coalesces requests, renews near expiry, and stops after disposal', async () => {
  let resolve, calls = 0, clock = 0, delay, observed;
  const manager = createMapSessionManager({
    requestSession: () => { ++calls; return new Promise(done => { resolve = done; }); },
    onSession: value => { observed = value; }, onError: assert.fail,
    now: () => clock, setTimer: (_, ms) => { delay = ms; return 1; }, clearTimer: () => {},
  });
  const first = manager.refresh();
  assert.equal(manager.refresh(true), first);
  await Promise.resolve();
  resolve({ token: 'limited-ticket', expiresIn: 1800 });
  await first;
  assert.equal(observed.token, 'limited-ticket');
  assert.equal(delay, 1740000);
  await manager.refresh();
  assert.equal(calls, 1);
  clock = 1800000;
  const renew = manager.refresh();
  await Promise.resolve();
  assert.equal(calls, 2);
  manager.dispose();
  resolve({ token: 'late-ticket', expiresIn: 1800 });
  await renew;
  assert.equal(observed.token, 'limited-ticket');
  await manager.refresh(true);
  assert.equal(calls, 2);
});

test('failed session requests are reported and retried with a bounded delay', async () => {
  let delay, errors = 0;
  const manager = createMapSessionManager({ requestSession: async () => { throw Error('offline'); },
    onSession: assert.fail, onError: () => { ++errors; },
    setTimer: (_, ms) => { delay = ms; }, clearTimer: () => {},
  });
  await manager.refresh();
  assert.equal(errors, 1);
  assert.equal(delay, 30000);
  manager.dispose();
});
