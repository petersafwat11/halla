const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const db = require('./helpers/memoryDb');

const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const StaffAccessToken = require('../models/StaffAccessTokenModel');
const Subscription = require('../models/SubscriptionModel');
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel');

const adminEventsService = require('../src/modules/admin/admin.events.service');
const { EVENT_STATUS, USER_STATUS, ROLES } = require('../src/shared/constants');
const { ValidationError, NotFoundError } = require('../src/shared/errors');

let hostUser;
let adminUser;
let testPlan;
let testSub;

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();

  // Create host and admin users
  hostUser = await User.create({
    name: 'Host User',
    email: `host_${Date.now()}@example.com`,
    phoneNumber: '+966551112233',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });

  adminUser = await User.create({
    name: 'Admin User',
    email: `admin_${Date.now()}@example.com`,
    phoneNumber: '+966559998877',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  // Create plan and subscription using standard helper
  testPlan = await Plan.getOrCreateByCode('basic_monthly_50');

  testSub = await Subscription.create({
    userId: hostUser._id,
    planId: testPlan._id,
    status: 'active',
    invitePool: 100,
    invitesConsumed: 0,
    usage: { eventsCreated: 2 },
  });
});

function buildEventDoc(status = EVENT_STATUS.SCHEDULED, overrides = {}) {
  return {
    host: hostUser._id,
    status,
    subscriptionId: testSub._id,
    eventDetails: {
      title: `${status} Event`,
      type: 'wedding',
      date: new Date(Date.now() + 7 * 86400000),
      time: '20:00',
      location: {
        address: 'Riyadh Hall',
        city: 'Riyadh',
        latitude: 24.7136,
        longitude: 46.6753,
      },
    },
    guestList: [],
    staffList: [],
    ...overrides,
  };
}

test.describe('EVT-06: Event State Machine & Status Transitions', () => {
  test('requires the scheduling service before allowing lifecycle transitions', async () => {
    const event = await Event.create(buildEventDoc(EVENT_STATUS.PENDING_SCHEDULING));

    // pending_scheduling -> scheduled
    await assert.rejects(adminEventsService.updateEventStatus(event._id, EVENT_STATUS.SCHEDULED, adminUser), /Use Schedule Delivery/);
    assert.equal((await Event.findById(event._id)).status, EVENT_STATUS.PENDING_SCHEDULING);
    // Establish the state normally written by the scheduling service.
    await Event.updateOne({ _id: event._id }, { $set: { status: EVENT_STATUS.SCHEDULED } });

    // scheduled -> live
    const updated2 = await adminEventsService.updateEventStatus(event._id, EVENT_STATUS.LIVE, adminUser);
    assert.equal(updated2.status, EVENT_STATUS.LIVE);

    // live -> completed
    const updated3 = await adminEventsService.updateEventStatus(event._id, EVENT_STATUS.COMPLETED, adminUser);
    assert.equal(updated3.status, EVENT_STATUS.COMPLETED);
  });

  test('rejects invalid transitions (e.g. completed -> live, deleted -> scheduled, or arbitrary invalid strings)', async () => {
    const event = await Event.create(buildEventDoc(EVENT_STATUS.COMPLETED));

    // completed -> live is invalid
    await assert.rejects(
      () => adminEventsService.updateEventStatus(event._id, EVENT_STATUS.LIVE, adminUser),
      ValidationError
    );

    // arbitrary string or 'suspended' is invalid
    await assert.rejects(
      () => adminEventsService.updateEventStatus(event._id, 'suspended', adminUser),
      ValidationError
    );
    await assert.rejects(
      () => adminEventsService.updateEventStatus(event._id, 'random_status', adminUser),
      ValidationError
    );
  });

  test('cancellation frees active event subscription slot and reactivating resets cancelledAt', async () => {
    const event = await Event.create(buildEventDoc(EVENT_STATUS.SCHEDULED));

    // Cancel event
    const cancelled = await adminEventsService.updateEventStatus(event._id, EVENT_STATUS.CANCELLED, adminUser);
    assert.equal(cancelled.status, EVENT_STATUS.CANCELLED);
    assert.ok(cancelled.cancelledAt);
    assert.equal(cancelled.launchSettings?.scheduledDate, undefined);
    assert.equal(cancelled.launchSettings?.scheduledTime, undefined);
    assert.equal(cancelled.previousStatus, EVENT_STATUS.SCHEDULED);

    // Subscription usage.eventsCreated should be decremented from 2 to 1
    const subAfterCancel = await Subscription.findById(testSub._id);
    assert.equal(subAfterCancel.usage.eventsCreated, 1);

    // Older deployments may have retained a schedule on a cancelled event.
    await Event.updateOne({_id:event._id},{$set:{'launchSettings.scheduledDate':new Date('2026-10-10'),'launchSettings.scheduledTime':'02:25'}});
    // Reactivate event back to scheduled
    const reactivated = await adminEventsService.updateEventStatus(event._id, EVENT_STATUS.SCHEDULED, adminUser);
    assert.equal(reactivated.status, EVENT_STATUS.PENDING_SCHEDULING);
    assert.equal(reactivated.launchSettings?.scheduledDate, undefined);
    assert.equal(reactivated.launchSettings?.scheduledTime, undefined);
    assert.equal(reactivated.cancelledAt, null);
    assert.equal(reactivated.previousStatus, null);
  });
});

test.describe('EVT-04: Restriction on generic full update mutating domain collections', () => {
  test('rejects attempts to modify guestList or staffList via updateEventFull', async () => {
    const event = await Event.create(buildEventDoc(EVENT_STATUS.SCHEDULED));

    // Try passing guestList
    await assert.rejects(
      () => adminEventsService.updateEventFull(event._id, { guestList: [{ name: 'Hacker', phone: '+966500000000' }] }, { adminId: adminUser._id }),
      ValidationError
    );

    // Try passing staffList
    await assert.rejects(
      () => adminEventsService.updateEventFull(event._id, { staffList: [{ name: 'Staff', phone: '+966500000000' }] }, { adminId: adminUser._id }),
      ValidationError
    );
  });
});

test.describe('EVT-05 & EVT-06: Single and Bulk Delete Parity & Invariants', () => {
  test('single delete frees subscription slot, revokes active staff tokens, and soft-deletes event', async () => {
    const event = await Event.create(buildEventDoc(EVENT_STATUS.SCHEDULED, {
      staffList: [{ name: 'Supervisor A', phone: '+966551234567' }],
    }));

    // Create active staff access token
    const token = await StaffAccessToken.create({
      event: event._id,
      phone: '+966551234567',
      staffName: 'Supervisor A',
      token: `tok_${Date.now()}`,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });

    const res = await adminEventsService.deleteEvent(event._id, adminUser);
    assert.equal(res.success, true);

    // Check event status
    const deletedEvent = await Event.findById(event._id);
    assert.equal(deletedEvent.status, EVENT_STATUS.DELETED);
    assert.ok(deletedEvent.deletedAt);

    // Check subscription slot
    const sub = await Subscription.findById(testSub._id);
    assert.equal(sub.usage.eventsCreated, 1);

    // Check staff access token revoked
    const updatedToken = await StaffAccessToken.findById(token._id);
    assert.equal(updatedToken.isRevoked, true);
    assert.ok(updatedToken.revokedAt);
  });

  test('bulk delete applies identical invariants per event and returns per-item results', async () => {
    const event1 = await Event.create(buildEventDoc(EVENT_STATUS.SCHEDULED, {
      staffList: [{ name: 'Staff 1', phone: '+966551111111' }],
    }));

    const event2 = await Event.create(buildEventDoc(EVENT_STATUS.LIVE, {
      staffList: [{ name: 'Staff 2', phone: '+966552222222' }],
    }));

    const token1 = await StaffAccessToken.create({
      event: event1._id,
      phone: '+966551111111',
      staffName: 'Staff 1',
      token: `tok_bulk_1_${Date.now()}`,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });

    const token2 = await StaffAccessToken.create({
      event: event2._id,
      phone: '+966552222222',
      staffName: 'Staff 2',
      token: `tok_bulk_2_${Date.now()}`,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });

    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const result = await adminEventsService.bulkDeleteEvents(
      [event1._id.toString(), event2._id.toString(), nonExistentId],
      adminUser
    );

    assert.equal(result.success, true);
    assert.equal(result.deletedCount, 2);
    assert.deepEqual(result.succeeded.sort(), [event1._id.toString(), event2._id.toString()].sort());
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].id, nonExistentId);

    // Both tokens revoked
    const t1 = await StaffAccessToken.findById(token1._id);
    const t2 = await StaffAccessToken.findById(token2._id);
    assert.equal(t1.isRevoked, true);
    assert.equal(t2.isRevoked, true);

    // Events created usage decremented twice (from 2 to 0)
    const sub = await Subscription.findById(testSub._id);
    assert.equal(sub.usage.eventsCreated, 0);
  });

  test('bulk status update preserves invariants and returns per-item results', async () => {
    const event1 = await Event.create(buildEventDoc(EVENT_STATUS.PENDING_SCHEDULING));
    const event2 = await Event.create(buildEventDoc(EVENT_STATUS.COMPLETED));

    // Target transition: SCHEDULED
    // Pending events must use the scheduling endpoint; completed events reopen pending.
    const result = await adminEventsService.bulkUpdateEventStatus(
      [event1._id.toString(), event2._id.toString()],
      EVENT_STATUS.SCHEDULED,
      adminUser
    );

    assert.equal(result.success, true);
    assert.equal(result.updatedCount, 1);
    assert.equal(result.succeeded.length, 1);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].id, event1._id.toString());
    assert.equal((await Event.findById(event2._id)).status, EVENT_STATUS.PENDING_SCHEDULING);
    await Event.findByIdAndUpdate(event1._id, { status: EVENT_STATUS.SCHEDULED });

    // If we attempt transition to LIVE:
    // event1 is SCHEDULED -> LIVE (valid)
    // event2 is SCHEDULED -> LIVE (valid)
    // But if we pass an invalid transition (e.g. COMPLETED -> LIVE)
    await Event.findByIdAndUpdate(event2._id, { status: EVENT_STATUS.COMPLETED });

    const result2 = await adminEventsService.bulkUpdateEventStatus(
      [event1._id.toString(), event2._id.toString()],
      EVENT_STATUS.LIVE,
      adminUser
    );

    assert.equal(result2.updatedCount, 1);
    assert.equal(result2.succeeded.length, 1);
    assert.equal(result2.failed.length, 1);
    assert.equal(result2.failed[0].id, event2._id.toString());
  });
});
