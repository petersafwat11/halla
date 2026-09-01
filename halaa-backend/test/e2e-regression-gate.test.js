/**
 * Session 6.3: End-to-End Backend Acceptance Matrix & Release Gate Test Suite
 *
 * Verifies all backend state machines, live event invariants, bulk envelopes,
 * ticket transitions, Taqnyat settings, marketplace queries, and identity boundaries.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const memoryDb = require("./helpers/memoryDb");

const User = require("../models/UserModel");
const Event = require("../models/EventModel");
const Guest = require("../models/GuestModel");
const Ticket = require("../models/TicketModel");
const Service = require("../models/ServiceModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");

const eventsService = require("../src/modules/events/events.service");
const guestsService = require("../src/modules/guests/guests.service");
const ticketsService = require("../src/modules/tickets/tickets.service");
const vendorsService = require("../src/modules/vendors/vendors.service");
const { updateInvitationSettingsSchema } = require("../src/modules/events/events.validation");

const {
  EVENT_STATUS,
  USER_STATUS,
  VENDOR_STATUS,
  SERVICE_STATUS,
  TICKET_STATUS,
  RSVP_STATUS,
} = require("../src/shared/constants");

test.before(async () => {
  await memoryDb.start();
});

test.after(async () => {
  await memoryDb.stop();
});

test.beforeEach(async () => {
  await memoryDb.clearAll();
});

test("Acceptance Matrix 1: Live Event Guest Invariants (EVT-03, EVT-15)", async () => {
  const host = await User.create({
    name: "Host Live Event",
    email: "hostlive@test.com",
    role: "host",
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  const sub = await Subscription.create({
    userId: host._id,
    planId: plan._id,
    status: "active",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });

  const event = await Event.create({
    host: host._id,
    subscriptionId: sub._id,
    eventDetails: {
      title: "Live Celebration",
      type: "wedding",
      date: new Date(Date.now() + 86400000),
      time: "20:00",
      location: { address: "Riyadh Hall", latitude: 24.7136, longitude: 46.6753 },
    },
    status: EVENT_STATUS.LIVE,
  });

  const existingGuest = await Guest.create({
    event: event._id,
    name: "Original Guest",
    phone: "0501112233",
    status: RSVP_STATUS.CONFIRMED,
  });

  event.guestList = [existingGuest._id];
  await event.save();

  // Attempt 1: Editing existing guest on live event MUST fail with ValidationError
  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(
        String(event._id),
        {
          guestList: [
            {
              name: "Renamed Guest",
              phone: "0501112233",
            },
          ],
          staffList: [],
        },
        host
      );
    },
    (err) => err.statusCode === 400 || err.statusCode === 409 || err.name === "ValidationError" || err.isOperational
  );

  // Attempt 2: Deleting existing guest on live event MUST fail
  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(
        String(event._id),
        { guestList: [], staffList: [] },
        host
      );
    },
    (err) => err.statusCode === 400 || err.statusCode === 409 || err.name === "ValidationError" || err.isOperational
  );

  // Attempt 3: Adding a brand new guest to live event MUST succeed via addGuest
  const newGuestRes = await guestsService.addGuest(
    String(event._id),
    {
      name: "Net New Guest",
      phone: "0509998877",
      category: "Friends",
    },
    host
  );

  assert.ok(newGuestRes);
  const reloadedEvent = await Event.findById(event._id);
  assert.equal(reloadedEvent.guestList.length, 2);

  const reloadedOriginal = await Guest.findById(existingGuest._id);
  assert.equal(reloadedOriginal.status, RSVP_STATUS.CONFIRMED);
});

test("Acceptance Matrix 2: Terminal Event Immutability (Completed/Cancelled)", async () => {
  const host = await User.create({
    name: "Host Terminal",
    email: "hostterminal@test.com",
    role: "host",
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  const sub = await Subscription.create({
    userId: host._id,
    planId: plan._id,
    status: "active",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });

  const completedEvent = await Event.create({
    host: host._id,
    subscriptionId: sub._id,
    eventDetails: {
      title: "Completed Gala",
      type: "wedding",
      date: new Date(Date.now() - 86400000),
      time: "20:00",
      location: { address: "Riyadh Hall", latitude: 24.7136, longitude: 46.6753 },
    },
    status: EVENT_STATUS.COMPLETED,
  });

  await assert.rejects(
    async () => {
      await eventsService.updateEventStep2(
        String(completedEvent._id),
        { guestList: [{ name: "Late Guest", phone: "0500000000" }], staffList: [] },
        host
      );
    },
    (err) => err.statusCode === 400 || err.statusCode === 409 || err.name === "ValidationError" || err.code === "EVENT_LIFECYCLE_CONFLICT"
  );
});

test("Acceptance Matrix 3: Taqnyat Settings Multipart & JSON Protection (EVT-02)", async () => {
  const templateObjectId = new mongoose.Types.ObjectId().toString();

  // Test 1: updateInvitationSettingsSchema normalizes taqnyatTemplateRef alias to canonical object
  const parsedWithAlias = updateInvitationSettingsSchema.parse({
    taqnyatTemplateRef: templateObjectId,
    guestReplies: {
      onAttend: "أهلاً وسهلاً",
      onAbsent: "شكراً لك",
    },
  });

  assert.deepEqual(parsedWithAlias.taqnyatTemplate, {
    templateRef: templateObjectId,
  });
  assert.equal(parsedWithAlias.guestReplies.onAttend, "أهلاً وسهلاً");

  // Test 2: Raw non-object strings are rejected
  assert.throws(
    () => {
      updateInvitationSettingsSchema.parse({
        taqnyatTemplate: templateObjectId,
      });
    },
    /Expected object/i
  );
});

test("Acceptance Matrix 4: Bulk Operations Envelope and Per-Item Results (ADM-04, ADM-07)", async () => {
  const admin = await User.create({
    name: "Admin User",
    email: "adminbulk@test.com",
    role: "admin",
    status: USER_STATUS.ACTIVE,
  });

  const u1 = await User.create({
    name: "Ticket User",
    email: "tuser@test.com",
    role: "host",
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const t1 = await Ticket.create({
    user: u1._id,
    subject: "Issue 1",
    message: "Description 1",
    type: "technical",
    status: TICKET_STATUS.OPEN,
  });

  const t2 = await Ticket.create({
    user: u1._id,
    subject: "Issue 2",
    message: "Description 2",
    type: "payment",
    status: TICKET_STATUS.IN_PROGRESS,
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  // Bulk resolve tickets
  const bulkResolveResult = await ticketsService.bulkUpdateTicketStatus(
    [String(t1._id), String(t2._id), nonExistentId],
    TICKET_STATUS.RESOLVED,
    "Resolved via bulk acceptance test",
    admin._id,
    true
  );

  assert.equal(bulkResolveResult.succeeded.length, 2);
  assert.equal(bulkResolveResult.failed.length, 1);
  assert.equal(bulkResolveResult.failed[0].id, nonExistentId);

  const freshT1 = await Ticket.findById(t1._id);
  assert.equal(freshT1.status, TICKET_STATUS.RESOLVED);
});

test("Acceptance Matrix 5: Marketplace Multi-District Pagination and Moderation (MKT-01, MKT-02)", async () => {
  const v1 = await User.create({
    name: "Approved Active Vendor 1",
    email: "vactive1@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Brand 1",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: { regionId: 1, cityId: 10, districtIds: [201] },
      },
    },
  });

  const v2 = await User.create({
    name: "Approved Active Vendor 2",
    email: "vactive2@test.com",
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: {
      vendorData: {
        brandName: "Brand 2",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: { regionId: 1, cityId: 10, districtIds: [202] },
      },
    },
  });

  const vSuspended = await User.create({
    name: "Suspended Vendor",
    email: "vsuspended@test.com",
    role: "vendor",
    status: USER_STATUS.SUSPENDED,
    profile: {
      vendorData: {
        brandName: "Brand Suspended",
        vendorStatus: VENDOR_STATUS.APPROVED,
        serviceLocation: { regionId: 1, cityId: 10, districtIds: [201] },
      },
    },
  });

  const results = await vendorsService.getPublicVendors({
    districtIds: [201, 202],
    page: 1,
    limit: 10,
  });

  assert.equal(results.pagination.total, 2);
  const foundIds = results.data.map((d) => d.id);
  assert.ok(foundIds.includes(String(v1._id)));
  assert.ok(foundIds.includes(String(v2._id)));
  assert.ok(!foundIds.includes(String(vSuspended._id)));
});

test("Acceptance Matrix 6: User Identity Separation & Email Verification Sync (SET-01, SET-02)", async () => {
  const user = await User.create({
    name: "Original Name",
    username: "original_username",
    email: "verify@test.com",
    role: "host",
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
    profile: {
      hostData: {
        emailVerified: false,
      },
    },
  });

  // Updating name does NOT alter username
  user.name = "New Display Name";
  await user.save();

  const refreshed = await User.findById(user._id);
  assert.equal(refreshed.name, "New Display Name");
  assert.equal(refreshed.username, "original_username");
  assert.equal(refreshed.profile.hostData.emailVerified, false);
});
