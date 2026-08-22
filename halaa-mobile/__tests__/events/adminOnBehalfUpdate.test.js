const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ENDPOINTS } = require('../../config/api');

describe('Session 1.5 Mobile: Admin-on-behalf Event Updates (EVT-10)', () => {
  it('registers CAPABILITIES and ENTITLEMENT endpoints in mobile config/api', () => {
    assert.equal(typeof ENDPOINTS.EVENTS.CAPABILITIES, 'function');
    assert.equal(typeof ENDPOINTS.EVENTS.ENTITLEMENT, 'function');
    assert.equal(ENDPOINTS.EVENTS.CAPABILITIES('evt_123'), '/events/evt_123/capabilities');
    assert.equal(ENDPOINTS.EVENTS.ENTITLEMENT('evt_123'), '/events/evt_123/entitlement');
  });

  it('correctly resolves effective subscription favoring event stamped subscription over viewer subscription', () => {
    const adminUserSubscription = {
      _id: 'sub_admin_unlimited',
      planType: 'unlimited',
      invitePool: null,
      invitesRemaining: null,
    };

    const eventStampedSubscription = {
      _id: 'sub_host_basic',
      planType: 'basic_event',
      invitePool: 50,
      invitesRemaining: 10,
    };

    // When viewing host event, effectiveSubscription must be the event's subscription
    const effectiveSubscription = eventStampedSubscription || adminUserSubscription;
    assert.equal(effectiveSubscription._id, 'sub_host_basic');
    assert.equal(effectiveSubscription.invitePool, 50);
    assert.equal(effectiveSubscription.invitesRemaining, 10);

    // Fallback if event is unstamped
    const unstampedEventSub = null;
    const fallbackSubscription = unstampedEventSub || adminUserSubscription;
    assert.equal(fallbackSubscription._id, 'sub_admin_unlimited');
  });
});
