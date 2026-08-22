import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeEventActionGate } from '@halaa/shared/hooks';

describe('Session 1.6 Web: Event Action Gate & Scheduling Tests (EVT-09)', () => {
  it('correctly derives canSchedule, isScheduled, and other action flags', () => {
    // 1. Unscheduled event with template + test message sent -> canSchedule = true
    const unscheduledEvent = {
      status: 'pending_scheduling',
      taqnyatTemplate: { templateRef: 'tpl_123' },
      staffList: [],
    };
    const gate1 = computeEventActionGate({
      event: unscheduledEvent,
      testMessageSent: true,
    });
    assert.equal(gate1.canSchedule, true);
    assert.equal(gate1.isScheduled, false);
    assert.equal(gate1.isLive, false);

    // 2. Event without test message sent -> canSchedule = false, canSendTest = true
    const gate2 = computeEventActionGate({
      event: unscheduledEvent,
      testMessageSent: false,
    });
    assert.equal(gate2.canSchedule, false);
    assert.equal(gate2.canSendTest, true);

    // 3. Event with status: 'scheduled'
    const scheduledEvent = {
      status: 'scheduled',
      taqnyatTemplate: { templateRef: 'tpl_123' },
    };
    const gate3 = computeEventActionGate({
      event: scheduledEvent,
      testMessageSent: true,
    });
    assert.equal(gate3.isScheduled, true);
    assert.equal(gate3.canSchedule, true);
    assert.equal(gate3.isLive, false);

    // 4. Live event -> canSchedule = false, isLive = true
    const liveEvent = {
      status: 'live',
      taqnyatTemplate: { templateRef: 'tpl_123' },
    };
    const gate4 = computeEventActionGate({
      event: liveEvent,
      testMessageSent: true,
    });
    assert.equal(gate4.canSchedule, false);
    assert.equal(gate4.isLive, true);
  });
});
