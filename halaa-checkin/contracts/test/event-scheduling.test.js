import test from 'node:test';
import assert from 'node:assert/strict';
import { eventScheduleSchema, isoTimestampWithOffsetSchema } from '../src/index.js';

test('scheduling rejects past and present times, but accepts a future instant across offsets', () => {
  const schema = eventScheduleSchema({ now: Date.parse('2026-09-16T12:00:00Z') });
  assert.equal(schema.safeParse('2026-09-16T14:59:00+03:00').success, false);
  assert.equal(schema.safeParse('2026-09-16T15:00:00+03:00').success, false);
  assert.equal(schema.safeParse('2026-09-16T15:01:00+03:00').success, true);
});

test('editing preserves an unchanged historical instant without allowing backdating', () => {
  const schema = eventScheduleSchema({ previousStartsAt: '2026-09-01T12:00:30Z', now: Date.parse('2026-09-16T12:00:00Z') });
  assert.equal(schema.safeParse('2026-09-01T15:00:30+03:00').success, true);
  assert.equal(schema.safeParse('2026-09-02T15:00:30+03:00').success, false);
});

test('dates reject rollover, midnight 24:00, missing offset and invalid minutes', () => {
  for (const value of ['2026-02-29T12:00:00Z', '2026-04-31T12:00:00Z', '2026-09-16T24:00:00Z', '2026-09-16T12:60:00Z', '2026-09-16T12:00:00']) {
    assert.equal(isoTimestampWithOffsetSchema.safeParse(value).success, false, value);
  }
  assert.equal(isoTimestampWithOffsetSchema.safeParse('2028-02-29T12:00:00+03:00').success, true);
});
