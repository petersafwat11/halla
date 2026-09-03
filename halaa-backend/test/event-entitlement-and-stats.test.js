const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const eventsService = require('../src/modules/events/events.service');
const { classifyRsvpBucket, RSVP_BUCKETS } = require('../src/shared/constants/status');
const { ROLES } = require('../src/shared/constants/roles');
const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const Subscription = require('../models/SubscriptionModel');

describe('Session 1.5: Event Entitlement & Stats Fixes (EVT-10, EVT-16)', () => {
  test('classifyRsvpBucket accurately maps guest statuses', () => {
    assert.equal(classifyRsvpBucket('invited'), 'pending');
    assert.equal(classifyRsvpBucket('pending'), 'pending');
    assert.equal(classifyRsvpBucket('confirmed'), 'confirmed');
    assert.equal(classifyRsvpBucket('checked_in'), 'attended');
    assert.equal(classifyRsvpBucket('declined'), 'declined');
    assert.equal(classifyRsvpBucket('no_show'), 'no_show');
    assert.equal(classifyRsvpBucket(null), 'pending');
    assert.equal(classifyRsvpBucket('UNKNOWN_STATUS'), 'pending');
  });

  test('getSingleEventStats aggregates pending, confirmed, declined, checkedIn correctly', async () => {
    const mockEventId = new mongoose.Types.ObjectId();
    const mockHostId = new mongoose.Types.ObjectId();

    // Stub Event.findOne
    const origFindOne = Event.findOne;
    const origGuestFind = Guest.find;

    Event.findOne = () => ({
      populate: () => Promise.resolve({
        _id: mockEventId,
        host: {
          _id: mockHostId,
          name: 'Host One',
          phoneNumber: '+966500000001',
        },
        eventDetails: { title: 'Test Wedding', type: 'wedding', date: new Date() },
        status: 'scheduled',
        toObject: function() { return this; },
      }),
    });

    Guest.find = () => ({
      populate: () => ({
        lean: () => Promise.resolve([
          { _id: new mongoose.Types.ObjectId(), name: 'Guest 1', status: 'invited' },
          { _id: new mongoose.Types.ObjectId(), name: 'Guest 2', status: 'pending' },
          { _id: new mongoose.Types.ObjectId(), name: 'Guest 3', status: 'confirmed' },
          { _id: new mongoose.Types.ObjectId(), name: 'Guest 4', status: 'checked_in' },
          { _id: new mongoose.Types.ObjectId(), name: 'Guest 5', status: 'declined' },
        ]),
      }),
    });

    try {
      const stats = await eventsService.getSingleEventStats(
        mockEventId.toString(),
        { _id: mockHostId, role: ROLES.HOST }
      );

      assert.equal(stats.totalGuests, 5);
      // Both 'invited' and 'pending' count towards pending in single event stats
      assert.equal(stats.pending, 2);
      // Both 'confirmed' and 'checked_in' count towards confirmed in single event stats
      assert.equal(stats.confirmed, 2);
      assert.equal(stats.declined, 1);
      assert.equal(stats.checkedIn, 1);
    } finally {
      Event.findOne = origFindOne;
      Guest.find = origGuestFind;
    }
  });

  test('getEventCapabilities resolves host stamped plan and permissions', async () => {
    const mockEventId = new mongoose.Types.ObjectId();
    const mockHostId = new mongoose.Types.ObjectId();
    const mockSubId = new mongoose.Types.ObjectId();

    const origEventFindOne = Event.findOne;
    const origSubFindById = Subscription.findById;

    Event.findOne = () => ({
      populate: () => Promise.resolve({
        _id: mockEventId,
        host: { _id: mockHostId, name: 'Host One' },
        subscriptionId: mockSubId,
        status: 'live',
      }),
    });

    Subscription.findById = () => ({
      populate: () => ({
        lean: () => Promise.resolve({
          _id: mockSubId,
          status: 'active',
          invitePool: 300,
          compensationPool: 20,
          invitesConsumed: 50,
          planId: {
            planType: 'premium_event',
            code: 'premium_event_100',
          },
        }),
      }),
    });

    try {
      const caps = await eventsService.getEventCapabilities(
        mockEventId.toString(),
        { _id: new mongoose.Types.ObjectId(), role: ROLES.ADMIN }
      );

      assert.equal(caps.eventId.toString(), mockEventId.toString());
      assert.equal(caps.hasSubscription, true);
      assert.equal(caps.isSingleEvent, true);
      assert.equal(caps.invitePool, 300);
      assert.equal(caps.invitesRemaining, 270);
      assert.equal(caps.guestLimit, 320);
      assert.equal(caps.isLive, true);
      assert.equal(caps.allowAddOnly, true);
      assert.equal(caps.canEditEvent, true);
    } finally {
      Event.findOne = origEventFindOne;
      Subscription.findById = origSubFindById;
    }
  });
});
