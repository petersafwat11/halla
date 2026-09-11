import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, setCsrfToken, setUnauthorizedHandler } from '../lib/api.js';
import { pendingAdmissionSlot, pendingEventFor } from '../lib/pendingAdmissions.js';

test('request deadline includes reading response body, and malformed successful writes remain uncertain', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (_, { signal }) => ({ ok: true, status: 200, json: () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))) });
    await assert.rejects(apiRequest('/checkins', { method: 'POST', timeoutMs: 15 }), err => err.code === 'LOST_RESPONSE');
    global.fetch = async () => ({ ok: true, status: 201, json: async () => { throw new SyntaxError('truncated'); } });
    await assert.rejects(apiRequest('/checkins', { method: 'POST' }), err => err.code === 'LOST_RESPONSE');
  } finally { global.fetch = original; }
});

test('old session 401 cannot invalidate new login; explicit revocation token survives local clear', async () => {
  const original = global.fetch;
  let notified = 0;
  setUnauthorizedHandler(() => notified++);
  try {
    setCsrfToken('old');
    let respond;
    global.fetch = () => new Promise(resolve => { respond = resolve; });
    const pending = apiRequest('/auth/session');
    setCsrfToken('new');
    respond(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), { status: 401 }));
    await assert.rejects(pending);
    assert.equal(notified, 0);
    setCsrfToken(null);
    global.fetch = async (_, options) => { assert.equal(options.headers['X-CSRF-Token'], 'new'); return new Response(null, { status: 204 }); };
    await apiRequest('/auth/logout', { method: 'POST', csrfToken: 'new' });
  } finally { global.fetch = original; setUnauthorizedHandler(null); setCsrfToken(null); }
});

test('uncertain admission remains immutable and actor/event scoped across route remount', () => {
  const slot = pendingAdmissionSlot('actor-a', 'event-a');
  slot.current = { eventId: 'event-a', guestId: 'guest', key: 'same-key', actualCompanions: 2 };
  assert.equal(pendingAdmissionSlot('actor-a', 'event-a').current.key, 'same-key');
  assert.equal(pendingAdmissionSlot('actor-b', 'event-a').current, null);
  assert.equal(pendingAdmissionSlot('actor-a', 'event-b').current, null);
  assert.equal(pendingEventFor('actor-a'), 'event-a');
  assert.throws(() => { slot.current.actualCompanions = 4; }, TypeError);
  slot.current = null;
});
