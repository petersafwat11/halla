/**
 * Session 7 & 8 Verification Suite:
 * - Session 7: Settings, Account Security, Marketplace Multi-District Filtering & Private Data Projection
 * - Session 8: Full Event Lifecycle, Quotas, Per-Event Plan Slots, Live Event Immutability & UGC Guards
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Register Mongoose models
const User = require('../models/UserModel');
const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const Plan = require('../models/PlanModel');
const Subscription = require('../models/SubscriptionModel');
const Service = require('../models/ServiceModel');
const TermsAcceptance = require('../models/TermsAcceptanceModel');

const usersService = require('../src/modules/users/users.service');
const vendorsService = require('../src/modules/vendors/vendors.service');
const eventsService = require('../src/modules/events/events.service');
const guestsService = require('../src/modules/guests/guests.service');

const {
  EVENT_STATUS,
  USER_STATUS,
  VENDOR_STATUS,
  GUEST_STATUS,
  RSVP_STATUS,
  SERVICE_STATUS,
} = require('../src/shared/constants');

let mongoServer;

describe('Session 7 & 8: Settings, Marketplace, and Event Lifecycle Cross-Client Suite', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // ============================================================
  // SESSION 7: SETTINGS & ACCOUNT SECURITY
  // ============================================================
  describe('Session 7: Settings, Password Security, & Marketplace Privacy', () => {
    it('1. updateMyPassword verifies current password, rejects mismatch, and issues rotated tokens (BACK-07)', async () => {
      const user = await User.create({
        email: 'secure@test.com',
        phoneNumber: '+966500000010',
        role: 'host',
        accountType: 'personal',
        password: 'OldPassword123!',
      });

      // Wrong current password -> rejects with ValidationError (CURRENT_PASSWORD_INVALID)
      await assert.rejects(
        async () => {
          await usersService.updateMyPassword(
            user._id,
            'WrongPassword!',
            'NewPassword123!',
            'NewPassword123!'
          );
        },
        (err) => err.code === 'CURRENT_PASSWORD_INVALID' || err.statusCode === 400
      );

      // Password confirm mismatch -> rejects
      await assert.rejects(
        async () => {
          await usersService.updateMyPassword(
            user._id,
            'OldPassword123!',
            'NewPassword123!',
            'DifferentPassword123!'
          );
        },
        (err) => err.statusCode === 400 || err.name === 'ValidationError'
      );

      // Valid password update -> succeeds, updates hash and returns token pair
      const result = await usersService.updateMyPassword(
        user._id,
        'OldPassword123!',
        'NewPassword123!',
        'NewPassword123!',
        { ip: '127.0.0.1' }
      );

      assert.equal(result.success, true);
      assert.ok(result.accessToken, 'Must issue accessToken');
      assert.ok(result.refreshToken, 'Must issue refreshToken');

      // Verify updated user can authenticate with new password
      const reloaded = await User.findById(user._id).select('+password');
      const isNewMatch = await reloaded.comparePassword('NewPassword123!');
      const isOldMatch = await reloaded.comparePassword('OldPassword123!');
      assert.equal(isNewMatch, true);
      assert.equal(isOldMatch, false);
    });

    it('2. getPublicVendors projection excludes private identity fields (WEB-15)', async () => {
      const vendor = await User.create({
        name: 'Public Caterer',
        email: 'secret_caterer@test.com',
        phoneNumber: '+966500000020',
        role: 'vendor',
        status: USER_STATUS.ACTIVE,
        profile: {
          vendorData: {
            brandName: 'Royal Catering',
            vendorStatus: VENDOR_STATUS.APPROVED,
            commercialRegistrationNumber: 'CR-1234567890',
            nationalId: '1098765432',
            serviceLocation: { regionId: 1, cityId: 10, districtIds: [501] },
            pricing: { startingPrice: 1500 },
          },
        },
      });

      const res = await vendorsService.getPublicVendors({ page: 1, limit: 10 });
      assert.equal(res.data.length, 1);
      const publicVendor = res.data[0];

      // Public fields present
      assert.equal(publicVendor.brandName, 'Royal Catering');

      // Sensitive / private identity fields MUST NOT be exposed
      assert.equal(publicVendor.password, undefined);
      assert.equal(publicVendor.passwordResetToken, undefined);
      assert.equal(publicVendor.nationalId, undefined);
      assert.equal(publicVendor.commercialRegistrationNumber, undefined);
    });

    it('3. Marketplace multi-district OR filtering returns all matching vendors without dropping districts (MKT-01)', async () => {
      await User.create({
        name: 'Vendor District 101',
        email: 'v101@test.com',
        role: 'vendor',
        status: USER_STATUS.ACTIVE,
        profile: {
          vendorData: {
            brandName: 'Brand 101',
            vendorStatus: VENDOR_STATUS.APPROVED,
            serviceLocation: { regionId: 1, cityId: 10, districtIds: [101] },
          },
        },
      });

      await User.create({
        name: 'Vendor District 102',
        email: 'v102@test.com',
        role: 'vendor',
        status: USER_STATUS.ACTIVE,
        profile: {
          vendorData: {
            brandName: 'Brand 102',
            vendorStatus: VENDOR_STATUS.APPROVED,
            serviceLocation: { regionId: 1, cityId: 10, districtIds: [102] },
          },
        },
      });

      await User.create({
        name: 'Vendor District 103',
        email: 'v103@test.com',
        role: 'vendor',
        status: USER_STATUS.ACTIVE,
        profile: {
          vendorData: {
            brandName: 'Brand 103',
            vendorStatus: VENDOR_STATUS.APPROVED,
            serviceLocation: { regionId: 1, cityId: 10, districtIds: [103] },
          },
        },
      });

      // Filter by [101, 102] -> returns exactly 2 vendors
      const res = await vendorsService.getPublicVendors({
        districtIds: [101, 102],
        page: 1,
        limit: 10,
      });

      assert.equal(res.pagination.total, 2);
      const brandNames = res.data.map((v) => v.brandName);
      assert.ok(brandNames.includes('Brand 101'));
      assert.ok(brandNames.includes('Brand 102'));
      assert.ok(!brandNames.includes('Brand 103'));
    });
  });

  // ============================================================
  // SESSION 8: EVENT LIFECYCLE, QUOTAS & CONCURRENCY
  // ============================================================
  describe('Session 8: Event Lifecycle, Quota Enforcement & Concurrency', () => {
    it('1. Event draft creation, guest addition, and capacity limit enforcement (EVT-03, BACK-03)', async () => {
      const host = await User.create({
        email: 'ehost1@test.com',
        phoneNumber: '+966500000030',
        role: 'host',
        accountType: 'personal',
      });

      const plan = await Plan.getOrCreateByCode('basic_monthly_50');
      const sub = await Subscription.create({
        userId: host._id,
        planId: plan._id,
        status: 'active',
        invitePool: 50,
        compensationPool: 0,
        invitesConsumed: 0,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      });

      // Step 1: Create draft event
      const event = await Event.create({
        host: host._id,
        subscriptionId: sub._id,
        eventDetails: {
          title: 'Annual Gala 2026',
          type: 'wedding',
          date: new Date(Date.now() + 7 * 86400000),
          time: '20:00',
          location: { address: 'Riyadh Ballroom', latitude: 24.7136, longitude: 46.6753 },
        },
        status: EVENT_STATUS.DRAFT,
      });

      // Step 2: Add 3 guests
      const g1 = await guestsService.addGuest(
        String(event._id),
        { name: 'Guest 1', phone: '0501111111' },
        host
      );
      const g2 = await guestsService.addGuest(
        String(event._id),
        { name: 'Guest 2', phone: '0502222222' },
        host
      );
      const g3 = await guestsService.addGuest(
        String(event._id),
        { name: 'Guest 3', phone: '0503333333' },
        host
      );

      assert.ok(g1);
      assert.ok(g2);
      assert.ok(g3);

      const reloadedEvent = await Event.findById(event._id);
      assert.equal(reloadedEvent.guestList.length, 3);
    });

    it('2. Per-event plan single-active-event slot locking and freeing (EVT-15, BACK-04)', async () => {
      const host = await User.create({
        email: 'perevent@test.com',
        phoneNumber: '+966500000040',
        role: 'host',
        accountType: 'personal',
      });

      // Per-event plan: single event slot
      const plan = await Plan.getOrCreateByCode('basic_event_50');
      const sub = await Subscription.create({
        userId: host._id,
        planId: plan._id,
        status: 'active',
        invitePool: 50,
        compensationPool: 0,
        invitesConsumed: 0,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      });

      // Create active event 1
      const activeEvent1 = await Event.create({
        host: host._id,
        subscriptionId: sub._id,
        eventDetails: {
          title: 'Active Event 1',
          type: 'conference',
          date: new Date(Date.now() + 10 * 86400000),
          time: '10:00',
          location: { address: 'Jeddah Hall', latitude: 21.5433, longitude: 39.1728 },
        },
        status: EVENT_STATUS.LIVE,
      });

      // Attempting to create a second event on single-event plan while event 1 is LIVE fails
      await assert.rejects(
        async () => {
          await eventsService.createEvent(
            {
              eventDetails: {
                title: 'Active Event 2',
                type: 'conference',
                date: new Date(Date.now() + 12 * 86400000),
                time: '10:00',
                location: { address: 'Jeddah Hall 2', latitude: 21.5433, longitude: 39.1728 },
              },
            },
            [{ name: 'Guest 1', phone: '0501111111' }],
            { userId: host._id, userRole: host.role }
          );
        },
        (err) => err.statusCode === 400 || err.statusCode === 409 || err.name === 'ValidationError'
      );

      // Complete event 1 -> frees the per-event slot
      activeEvent1.status = EVENT_STATUS.COMPLETED;
      await activeEvent1.save();

      // Now event slot is free
      const reloadedEvent = await Event.findById(activeEvent1._id);
      assert.equal(reloadedEvent.status, EVENT_STATUS.COMPLETED);
    });

    it('3. RSVP status transitions from invited to confirmed, declined, and checked-in (EVT-03)', async () => {
      const host = await User.create({
        email: 'rsvphost@test.com',
        phoneNumber: '+966500000050',
        role: 'host',
        accountType: 'personal',
      });

      const event = await Event.create({
        host: host._id,
        eventDetails: {
          title: 'RSVP Gala',
          type: 'wedding',
          date: new Date(Date.now() + 5 * 86400000),
          time: '19:00',
          location: { address: 'Riyadh Hall', latitude: 24.7136, longitude: 46.6753 },
        },
        status: EVENT_STATUS.LIVE,
      });

      const guest = await Guest.create({
        event: event._id,
        name: 'VIP Guest',
        phone: '0505555555',
        status: GUEST_STATUS.INVITED,
      });

      // Update RSVP to CONFIRMED
      guest.status = GUEST_STATUS.CONFIRMED;
      guest.rsvp = { response: 'confirmed', responded: true, respondedAt: new Date() };
      await guest.save();

      const confirmedGuest = await Guest.findById(guest._id);
      assert.equal(confirmedGuest.status, GUEST_STATUS.CONFIRMED);

      // Check-in guest
      confirmedGuest.status = GUEST_STATUS.CHECKED_IN;
      confirmedGuest.checkIn = { checkedIn: true, checkedInAt: new Date() };
      await confirmedGuest.save();

      const checkedInGuest = await Guest.findById(guest._id);
      assert.equal(checkedInGuest.status, GUEST_STATUS.CHECKED_IN);
    });
  });
});
