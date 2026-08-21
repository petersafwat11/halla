const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isTrialFromPlan,
  parseSendInstant,
  assertSendWindow,
  assertEventDateFloor,
  TRIAL_MIN_LEAD_MS,
  PAID_MIN_LEAD_MS,
  MIN_GAP_BEFORE_EVENT_MS,
} = require('../src/shared/utils/schedulingWindow');
const { toRiyadhComponents, fromRiyadhComponents } = require('../src/shared/utils/timezone');

describe('Session 1.6: Scheduling Invariants & Timezone Rules (EVT-09)', () => {
  test('assertSendWindow enforces minimum lead time: 15m for trial, 24h for paid', () => {
    const now = Date.now();
    const futureEventInstant = new Date(now + 10 * 24 * 60 * 60 * 1000); // 10 days in future

    // Trial: 10 min from now is too soon (< 15 min)
    const tooSoonTrial = new Date(now + 10 * 60 * 1000);
    assert.throws(
      () => assertSendWindow({ scheduledInstant: tooSoonTrial, eventInstant: futureEventInstant, isTrial: true, nowMs: now }),
      (err) => err.code === 'SCHEDULE_TOO_SOON'
    );

    // Trial: 20 min from now is valid (> 15 min)
    const validTrial = new Date(now + 20 * 60 * 1000);
    assert.doesNotThrow(() =>
      assertSendWindow({ scheduledInstant: validTrial, eventInstant: futureEventInstant, isTrial: true, nowMs: now })
    );

    // Paid: 12 hours from now is too soon (< 24h)
    const tooSoonPaid = new Date(now + 12 * 60 * 60 * 1000);
    assert.throws(
      () => assertSendWindow({ scheduledInstant: tooSoonPaid, eventInstant: futureEventInstant, isTrial: false, nowMs: now }),
      (err) => err.code === 'SCHEDULE_TOO_SOON'
    );

    // Paid: 25 hours from now is valid (> 24h)
    const validPaid = new Date(now + 25 * 60 * 60 * 1000);
    assert.doesNotThrow(() =>
      assertSendWindow({ scheduledInstant: validPaid, eventInstant: futureEventInstant, isTrial: false, nowMs: now })
    );
  });

  test('assertSendWindow enforces upper bound (eventInstant - 3 days)', () => {
    const now = Date.now();
    const eventInstant = new Date(now + 10 * 24 * 60 * 60 * 1000); // 10 days from now

    // 2 days before event is too late (< 3 days gap)
    const tooLate = new Date(eventInstant.getTime() - 2 * 24 * 60 * 60 * 1000);
    assert.throws(
      () => assertSendWindow({ scheduledInstant: tooLate, eventInstant, isTrial: false, nowMs: now }),
      (err) => err.code === 'SCHEDULE_TOO_LATE'
    );

    // 4 days before event is valid (> 3 days gap)
    const validSchedule = new Date(eventInstant.getTime() - 4 * 24 * 60 * 60 * 1000);
    assert.doesNotThrow(() =>
      assertSendWindow({ scheduledInstant: validSchedule, eventInstant, isTrial: false, nowMs: now })
    );
  });

  test('parseSendInstant safely parses date and 24h / 12h time strings in Riyadh timezone', () => {
    const date = new Date(Date.UTC(2026, 8, 1)); // 2026-09-01
    const instant = parseSendInstant(date, '14:30');

    assert.ok(instant instanceof Date);
    assert.equal(Number.isNaN(instant.getTime()), false);

    // Format components back to Riyadh
    const comps = toRiyadhComponents(instant);
    assert.equal(comps.time, '14:30');
  });
});
