const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDateTime } = require('../src/shared/utils/timezone');

test('wizard event dates and 12h times retain the Riyadh event instant', () => {
  assert.equal(parseDateTime('2026-09-11T21:00:00.000Z', '08:00:PM').toISOString(), '2026-09-12T17:00:00.000Z');
  assert.equal(parseDateTime('2026-09-12T00:00:00.000Z', '20:00').toISOString(), '2026-09-12T17:00:00.000Z');
  assert.equal(parseDateTime('2026-09-12', '12:00:AM').toISOString(), '2026-09-11T21:00:00.000Z');
  assert.equal(parseDateTime('2026-09-12', '12:00:PM').toISOString(), '2026-09-12T09:00:00.000Z');
  assert.equal(parseDateTime('bad', '20:00'), null);
  assert.equal(parseDateTime('2026-09-12', '25:00'), null);
});
