import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultValues } from '../src/schemas/events.js';

test('mobile artwork prefill preserves PM, noon, midnight and 24-hour event times', () => {
  const template = { fields: [{ key: 'time', type: 'time' }] };
  for (const [input, hour] of [['8:00 PM',20],['8:00:PM',20],['20:00',20],['12:00 AM',0],['12:00 PM',12]]) {
    const result = buildDefaultValues(template, null, input, { timeAsDate: true });
    assert.equal(result.time.getHours(), hour, input);
  }
});
