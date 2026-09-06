import test from 'node:test';
import assert from 'node:assert/strict';
import { eventUpdateSection } from '../src/utils/eventUpdateSection.js';
import { fetchCompleteGuestList } from '../src/utils/guestPagination.js';

test('people and design payloads reach their mutation contracts', () => {
  const data = { guestList: [{ name: 'Guest' }], staffList: [] };
  assert.deepEqual(eventUpdateSection({ type: 'guestList', data }), { section: 'people', data });
  const image = { name: 'invitation.png' };
  assert.deepEqual(eventUpdateSection({ type: 'visualTemplate', data: { templateRef: 't' }, templateImage: image }), {
    section: 'design', data: { visualTemplate: { templateRef: 't' }, templateImage: image },
  });
  assert.throws(() => eventUpdateSection({ type: 'typo' }), /Unknown/);
  assert.throws(() => eventUpdateSection(null), /Missing/);
});

test('complete audience includes every page and fails closed on page errors', async () => {
  const rows = Array.from({ length: 251 }, (_, id) => ({ id }));
  const result = await fetchCompleteGuestList(async ({ page, limit }) => ({
    data: rows.slice((page - 1) * limit, page * limit), pagination: { pages: 2, total: 251 },
  }));
  assert.equal(result.data.length, 251);
  await assert.rejects(fetchCompleteGuestList(async ({ page }) => {
    if (page === 2) throw new Error('offline');
    return { data: rows.slice(0, 200), pagination: { pages: 2, total: 251 } };
  }), /offline/);
});


test('manual and legacy locations round-trip without a synthetic pin', async () => {
  const { normalizeEventLocation, hasEventCoordinates } = await import('../src/utils/eventLocation.js');
  const { locationSchema } = await import('../src/schemas/events.js');
  for (const value of ['Old hall', { address: 'Manual hall', latitude: null, longitude: null }]) {
    const normalized = normalizeEventLocation(value);
    assert.equal(hasEventCoordinates(normalized), false);
    assert.equal(normalized.provider, 'manual');
    assert.equal(locationSchema().parse(normalized).latitude, null);
  }
  const coordinate = normalizeEventLocation({ address: 'Equator', latitude: 0, longitude: 0, provider: 'device' });
  assert.equal(hasEventCoordinates(coordinate), true);
  assert.equal(coordinate.latitude, 0);
});
