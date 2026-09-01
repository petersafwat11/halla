/**
 * Comprehensive Integration Tests for Event Lifecycle Audit Remediation
 *
 * Validates:
 * 1. Fingerprint invalidation and auto-unscheduling on invitation mutation.
 * 2. Pre-launch fingerprint mismatch protection in runEventLaunch().
 * 3. Public send isolation (public send restricted to live events).
 * 4. 24-hour Asia/Riyadh event completion outbox claim.
 * 5. Webhook delivery status monotonicity and two-step BSON timestamp updates.
 * 6. Post-event draft mutation vs publish lifecycle gating and idempotency.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const Event = require("../models/EventModel");
const Guest = require("../models/GuestModel");
const taqnyat = require("../src/infrastructure/taqnyat");
const OutboundMessage = require("../models/OutboundMessageModel");

const eventsService = require("../src/modules/events/events.service");
const eventsSettingsService = require("../src/modules/events/events.settings.service");
const messagingService = require("../src/modules/messaging/messaging.service");
const messagingSendService = require("../src/modules/messaging/messaging.send.service");
const messagingScheduleService = require("../src/modules/messaging/messaging.schedule.service");
const messagingWebhookService = require("../src/modules/messaging/messaging.webhook.service");
const postEventService = require("../src/modules/post-event/post-event.service");
const scheduledTasks = require("../src/shared/utils/scheduledTasks");
const { computeInvitationFingerprint } = require("../src/modules/messaging/messaging.formatting");
const { EVENT_STATUS } = require("../src/shared/constants/status");
const { getActiveEventGuestsFilter } = require('../src/shared/utils/guestFilter');

let hostUser;
let poolSub;
let realSendSMS;

test.before(async () => {
  await db.start();
  realSendSMS = taqnyat.sendSMS;
});

test.after(async () => {
  taqnyat.sendSMS = realSendSMS;
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();
  taqnyat.sendSMS = async () => ({ success: true, messageId: "stub-1", status: "sent" });

  hostUser = await User.create({
    name: "Audit Host",
    email: "audithost@example.com",
    phone: "+966500000001",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  poolSub = await Subscription.create({
    userId: hostUser._id,
    planId: plan._id,
    status: "active",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
});

// Helper to create a base event with guests
async function createScheduledEvent(overrides = {}) {
  const event = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "scheduled",
    eventDetails: {
      title: "Royal Gala",
      type: "wedding",
      date: new Date(Date.now() + 5 * 86400000),
      time: "20:00",
      location: { address: "Riyadh Grand Hall", latitude: 24.7136, longitude: 46.6753 },
    },
    launchSettings: {
      scheduledDate: new Date(Date.now() + 4 * 86400000),
      scheduledTime: "10:00",
    },
    testMessageSent: true,
    testMessageFingerprint: null, // to be populated
    guestList: [],
    ...overrides,
  });

  const guest = await Guest.create({
    event: event._id,
    name: "VIP Guest",
    phone: "+966501112233",
    status: "invited",
  });

  event.guestList = [guest._id];
  event.testMessageFingerprint = computeInvitationFingerprint(event, null);
  await event.save();

  return { event, guest };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fingerprint Auto-Unscheduling on Event Details / Settings Mutation
// ─────────────────────────────────────────────────────────────────────────────
test("Editing invitation details on a scheduled event atomically auto-unschedules it", async () => {
  const { event } = await createScheduledEvent();
  assert.equal(event.status, "scheduled");
  assert.ok(event.testMessageFingerprint);

  // Update event details (title change)
  const updated = await eventsService.updateEventDetails(
    event._id.toString(),
    {
      title: "Updated Royal Gala Title",
      type: "wedding",
      date: event.eventDetails.date,
      time: "20:00",
      location: { address: "Riyadh Grand Hall", latitude: 24.7136, longitude: 46.6753 },
    },
    hostUser
  );

  const reloaded = await Event.findById(event._id);
  assert.equal(reloaded.status, "pending_scheduling", "Status must revert to pending_scheduling");
  assert.equal(reloaded.testMessageSent, false, "testMessageSent must reset to false");
  assert.equal(reloaded.testMessageFingerprint, null, "testMessageFingerprint must be cleared");
  assert.equal(reloaded.launchSettings?.scheduledDate, undefined, "scheduledDate must be unset");
  assert.equal(reloaded.launchSettings?.scheduledTime, undefined, "scheduledTime must be unset");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pre-Launch Fingerprint Validation & Auto-Unschedule in runEventLaunch
// ─────────────────────────────────────────────────────────────────────────────
test("runEventLaunch auto-unschedules event if test fingerprint is invalid or missing", async () => {
  const { event } = await createScheduledEvent({
    launchSettings: {
      scheduledDate: new Date(Date.now() - 3600000), // due in the past
      scheduledTime: "08:00",
    },
  });

  // Corrupt the fingerprint
  event.testMessageFingerprint = "corrupted_stale_fingerprint";
  await event.save();

  // Trigger launch execution
  await scheduledTasks.runEventLaunch(event, "test-worker");

  const reloaded = await Event.findById(event._id);
  assert.equal(reloaded.status, "pending_scheduling", "Event must be auto-unscheduled on mismatch");
  assert.equal(reloaded.failureReason, "untested_changes", "Failure reason must record untested_changes");
  assert.equal(reloaded.testMessageSent, false);
  assert.equal(reloaded.testMessageFingerprint, null);
  assert.equal(reloaded.launchSettings?.scheduledDate, undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Public Send Isolation (sendBulk / sendToGuest rejected on non-live events)
// ─────────────────────────────────────────────────────────────────────────────
test("Public send endpoints reject execution on scheduled or draft events", async () => {
  const { event, guest } = await createScheduledEvent();

  await assert.rejects(
    async () => {
      await messagingSendService.sendToGuest({
        guestId: guest._id.toString(),
        eventId: event._id.toString(),
        channel: "sms",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, "EVENT_NOT_LIVE");
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await messagingSendService.sendBulk({
        eventId: event._id.toString(),
        scope: "manual_send",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, "EVENT_NOT_LIVE");
      return true;
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Authoritative 24h Asia/Riyadh Completion Outbox Claim
// ─────────────────────────────────────────────────────────────────────────────
test("scheduleEventCompletion completes live event only 24 hours after Riyadh eventInstantOf", async () => {
  // Event 1: Event was 25 hours ago -> MUST complete
  const pastEvent = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "live",
    eventDetails: {
      title: "Past Live Gala",
      type: "wedding",
      date: new Date(Date.now() - 30 * 3600000), // 30h ago
      time: "10:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
  });

  // Event 2: Event was 5 hours ago -> MUST NOT complete
  const recentEvent = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "live",
    eventDetails: {
      title: "Recent Live Gala",
      type: "wedding",
      date: new Date(Date.now() - 5 * 3600000), // 5h ago
      time: "20:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
  });

  await scheduledTasks.runEventCompletion();

  const reloadedPast = await Event.findById(pastEvent._id);
  assert.equal(reloadedPast.status, "completed", "Past event must be completed");
  assert.ok(reloadedPast.completedAt, "completedAt must be stamped");
  assert.equal(reloadedPast.completionNotificationStatus, "sent");

  const reloadedRecent = await Event.findById(recentEvent._id);
  assert.equal(reloadedRecent.status, "live", "Recent event must remain live");
  assert.equal(reloadedRecent.completedAt, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Monotonic Webhook Status & Two-Step Timestamp Updates
// ─────────────────────────────────────────────────────────────────────────────
test("Webhook service enforces status monotonicity and updates timestamps correctly", async () => {
  const { event, guest } = await createScheduledEvent();

  guest.invitation = {
    messageId: "wamid.HBgLMTIzNDU2Nzg5",
    status: "sent",
    sentAt: new Date(Date.now() - 60000),
    deliveredAt: null,
    readAt: null,
  };
  await guest.save();

  await OutboundMessage.create({
    providerMessageId: "wamid.HBgLMTIzNDU2Nzg5",
    status: "sent",
    recipients: [guest.phone],
    recipientCount: 1,
    messageType: "template",
    channel: "whatsapp",
    effectiveChannel: "whatsapp",
    requestPayload: {},
  });

  // Transition 1: 'sent' -> 'delivered'
  const deliveryTime = new Date();
  await messagingWebhookService.updateDeliveryStatus("wamid.HBgLMTIzNDU2Nzg5", "delivered", deliveryTime);

  let reloadedGuest = await Guest.findById(guest._id);
  assert.equal(reloadedGuest.invitation.status, "delivered");
  assert.ok(reloadedGuest.invitation.deliveredAt, "deliveredAt must be stamped via two-step update");

  // Transition 2: 'delivered' -> 'read'
  const readTime = new Date(deliveryTime.getTime() + 10000);
  await messagingWebhookService.updateDeliveryStatus("wamid.HBgLMTIzNDU2Nzg5", "read", readTime);

  reloadedGuest = await Guest.findById(guest._id);
  assert.equal(reloadedGuest.invitation.status, "read");
  assert.ok(reloadedGuest.invitation.readAt, "readAt must be stamped");

  // Transition 3: Out-of-order 'sent' or 'delivered' arrives AFTER 'read' -> MUST NOT regress
  await messagingWebhookService.updateDeliveryStatus("wamid.HBgLMTIzNDU2Nzg5", "sent", deliveryTime);

  reloadedGuest = await Guest.findById(guest._id);
  assert.equal(reloadedGuest.invitation.status, "read", "Status must remain monotonically 'read'");

  // A late provider failure is also lower-ranked and must never regress read.
  await messagingWebhookService.updateDeliveryStatus("wamid.HBgLMTIzNDU2Nzg5", "failed", readTime);
  reloadedGuest = await Guest.findById(guest._id);
  assert.equal(reloadedGuest.invitation.status, 'read');

  const outbound = await OutboundMessage.findOne({ providerMessageId: "wamid.HBgLMTIzNDU2Nzg5" });
  assert.equal(outbound.status, 'read', 'outbound log must mirror monotonic state');
});

test('Concurrent webhook callbacks converge to read with earliest delivery and latest read timestamps', async () => {
  const { guest } = await createScheduledEvent();
  const messageId = 'wamid.concurrent-status';
  guest.invitation = { messageId, status: 'pending' };
  await guest.save();

  await OutboundMessage.create({
    providerMessageId: messageId,
    status: 'sent',
    recipients: [guest.phone],
    recipientCount: 1,
    messageType: 'template',
    channel: 'whatsapp',
    effectiveChannel: 'whatsapp',
    requestPayload: {},
  });

  const early = new Date('2026-08-01T10:00:00.000Z');
  const late = new Date('2026-08-01T10:02:00.000Z');
  await Promise.all([
    messagingWebhookService.updateDeliveryStatus(messageId, 'read', late),
    messagingWebhookService.updateDeliveryStatus(messageId, 'delivered', early),
    messagingWebhookService.updateDeliveryStatus(messageId, 'sent', early),
    messagingWebhookService.updateDeliveryStatus(messageId, 'failed', late),
  ]);

  const reloaded = await Guest.findById(guest._id);
  assert.equal(reloaded.invitation.status, 'read');
  assert.equal(reloaded.invitation.deliveredAt.toISOString(), early.toISOString());
  assert.equal(reloaded.invitation.readAt.toISOString(), late.toISOString());
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Post-Event Draft Mutation vs Publish Lifecycle Gating
// ─────────────────────────────────────────────────────────────────────────────
test("Post-event draft allows editing before completion but publish requires completed status", async () => {
  const liveEvent = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "live",
    eventDetails: {
      title: "Live Post Event",
      type: "wedding",
      date: new Date(),
      time: "20:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
  });

  // Updating post-event thank you message during live/draft is permitted
  const draftRes = await postEventService.updateThankYouMessage(
    liveEvent._id.toString(),
    {
      text: "Thank you for joining our celebration!",
    },
    hostUser
  );
  assert.ok(draftRes);
  assert.equal(draftRes.thankYouMessage.text, "Thank you for joining our celebration!");

  // Publishing post-event while still live MUST be rejected with 409
  await assert.rejects(
    async () => {
      await postEventService.publishContent(
        liveEvent._id.toString(),
        hostUser
      );
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.ok(err.code === "EVENT_NOT_COMPLETED" || err.code === "EVENT_LIFECYCLE_CONFLICT");
      return true;
    }
  );

  // Transition event to completed
  liveEvent.status = "completed";
  liveEvent.completedAt = new Date();
  await liveEvent.save();

  // Publishing post-event on completed event MUST succeed
  const publishRes = await postEventService.publishContent(
    liveEvent._id.toString(),
    hostUser
  );
  assert.ok(publishRes);
  assert.equal(publishRes.published, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. WhatsApp RSVP Button: "سأحضر" Button Match, Schema Fields, Notification & Caption Order
// ─────────────────────────────────────────────────────────────────────────────
test("WhatsApp button response 'سأحضر' confirms RSVP, sets rsvp.response, and sends host alert", async () => {
  const { event, guest } = await createScheduledEvent({
    status: "live",
    invitationType: "reply_and_qr",
    eventDetails: {
      title: "Wedding of Peter",
      type: "wedding",
      date: new Date(Date.now() + 5 * 86400000),
      time: "19:00",
      location: { address: "Riyadh Palace", latitude: 24.7, longitude: 46.7 },
    },
  });

  const Notification = require("../models/NotificationModel");

  // Inbound button reply "سأحضر"
  const result = await messagingWebhookService.handleButtonResponse({
    phoneNumber: guest.phone,
    buttonText: "سأحضر",
    messageId: "btn-msg-123",
  });

  assert.equal(result.success, true);

  const updatedGuest = await Guest.findById(guest._id);
  assert.equal(updatedGuest.status, "confirmed");
  assert.equal(updatedGuest.rsvp.responded, true);
  assert.equal(updatedGuest.rsvp.response, "confirmed");
  assert.equal(updatedGuest.rsvp.message, "سأحضر");

  // Verify host received valid notification
  const hostNotif = await Notification.findOne({
    userId: hostUser._id,
    type: "guest_rsvp_accepted",
  });
  assert.ok(hostNotif, "Host must receive guest_rsvp_accepted notification");
  assert.equal(hostNotif.data.metadata.guestName, guest.name);
  assert.equal(hostNotif.data.metadata.status, "confirmed");
});

test('Unknown WhatsApp RSVP text fails closed and never becomes a decline', async () => {
  const { guest } = await createScheduledEvent({ status: 'live', invitationType: 'reply_only' });
  const result = await messagingWebhookService.handleButtonResponse({
    phoneNumber: guest.phone,
    buttonText: 'maybe later',
    messageId: 'btn-unknown',
  });
  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_BUTTON');

  const reloaded = await Guest.findById(guest._id);
  assert.equal(reloaded.status, 'invited');
  assert.equal(reloaded.rsvp.responded, false);
});

test('Active guest filters fail closed for empty lists and empty subset intersections', () => {
  const eventId = new mongoose.Types.ObjectId();
  const currentId = new mongoose.Types.ObjectId();
  const foreignId = new mongoose.Types.ObjectId();

  assert.deepEqual(getActiveEventGuestsFilter(eventId, [])._id.$in, []);
  assert.deepEqual(getActiveEventGuestsFilter(eventId, [currentId], [])._id.$in, []);
  assert.deepEqual(getActiveEventGuestsFilter(eventId, [currentId], [foreignId])._id.$in, []);
  assert.deepEqual(getActiveEventGuestsFilter(eventId, [currentId], [currentId])._id.$in, [currentId]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Recipient Subset Querying: sendInitialLaunchBatch with guestIds Subset
// ─────────────────────────────────────────────────────────────────────────────
test("sendInitialLaunchBatch respects guestIds subset and does NOT overwrite with full guestList", async () => {
  const guest1 = await Guest.create({
    name: "Guest One",
    phone: "+966500000011",
    event: new mongoose.Types.ObjectId(),
    status: "invited",
  });
  const guest2 = await Guest.create({
    name: "Guest Two",
    phone: "+966500000012",
    event: new mongoose.Types.ObjectId(),
    status: "invited",
  });
  const guest3 = await Guest.create({
    name: "Guest Three",
    phone: "+966500000013",
    event: new mongoose.Types.ObjectId(),
    status: "invited",
  });

  const event = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "live",
    eventDetails: {
      title: "Subset Test Event",
      type: "wedding",
      date: new Date(Date.now() + 5 * 86400000),
      time: "20:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [guest1._id, guest2._id, guest3._id],
  });

  await Guest.updateMany({ _id: { $in: [guest1._id, guest2._id, guest3._id] } }, { event: event._id });

  const sentPhones = [];
  taqnyat.sendSMS = async (phone) => {
    sentPhones.push(phone);
    return { success: true, messageId: `msg_${phone}`, status: "sent" };
  };

  // Only dispatch to guest2
  await messagingService.sendInitialLaunchBatch({
    eventId: event._id,
    guestIds: [guest2._id.toString()],
    channel: "sms",
    attemptId: "subset_test_1",
  });

  assert.equal(sentPhones.length, 1);
  assert.equal(sentPhones[0], guest2.phone);

  const g1 = await Guest.findById(guest1._id);
  const g2 = await Guest.findById(guest2._id);
  const g3 = await Guest.findById(guest3._id);

  assert.equal(g1.invitation.sent, false);
  assert.equal(g2.invitation.sent, true);
  assert.equal(g3.invitation.sent, false);
});

test('Concurrent launch batches cannot exceed the shared invite pool', async () => {
  poolSub.invitePool = 1;
  poolSub.compensationPool = 0;
  poolSub.invitesConsumed = 0;
  await poolSub.save();
  const event = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: 'live',
    eventDetails: {
      title: 'Capacity Race', type: 'wedding',
      date: new Date(Date.now() + 86400000), time: '20:00',
      location: { address: 'Riyadh', latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [],
  });
  const guests = await Guest.create([
    { event: event._id, name: 'Race One', phone: '+966500000021', status: 'invited' },
    { event: event._id, name: 'Race Two', phone: '+966500000022', status: 'invited' },
  ]);
  event.guestList = guests.map((guest) => guest._id);
  await event.save();

  const sentPhones = [];
  taqnyat.sendSMS = async (phone) => {
    sentPhones.push(phone);
    return { success: true, messageId: `race-${phone}`, status: 'sent' };
  };

  const outcomes = await Promise.allSettled(
    guests.map((guest, index) => messagingService.sendInitialLaunchBatch({
      eventId: event._id,
      guestIds: [guest._id],
      channel: 'sms',
      attemptId: `capacity-race-${index}`,
    }))
  );
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
  assert.equal(sentPhones.length, 1);
  const reloadedSub = await Subscription.findById(poolSub._id);
  assert.equal(reloadedSub.invitesConsumed, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Provider 429 Rate Limiting: Guest marked failed and selected for retries
// ─────────────────────────────────────────────────────────────────────────────
test("Provider 429 sets guest status failed and rateLimited true for retry recovery", async () => {
  const { event, guest } = await createScheduledEvent({ status: "live" });

  taqnyat.sendSMS = async () => ({
    success: false,
    statusCode: 429,
    error: "RATE_LIMITED",
  });

  await assert.rejects(
    async () => {
      await messagingService.sendInitialLaunchBatch({
        eventId: event._id,
        guestIds: [guest._id.toString()],
        channel: "sms",
        attemptId: "rate_limit_test",
      });
    },
    (err) => {
      assert.equal(err.code, "ALL_SENDS_FAILED");
      return true;
    }
  );

  const updatedGuest = await Guest.findById(guest._id);
  assert.equal(updatedGuest.invitation.sent, false);
  assert.equal(updatedGuest.invitation.status, "failed");
  assert.equal(updatedGuest.invitation.rateLimited, true);

  const updatedEvent = await Event.findById(event._id);
  assert.equal(updatedEvent.messagingStatus.failedCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Completion Notification Outbox Durability
// ─────────────────────────────────────────────────────────────────────────────
test("runEventCompletion retries pending and failed completion notifications", async () => {
  const Notification = require("../models/NotificationModel");

  const completedEvent = await Event.create({
    host: hostUser._id,
    subscriptionId: poolSub._id,
    status: "completed",
    completedAt: new Date(Date.now() - 25 * 3600000),
    completionNotificationStatus: "failed",
    eventDetails: {
      title: "Completed Event Notification Test",
      type: "wedding",
      date: new Date(Date.now() - 30 * 3600000),
      time: "18:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
  });

  await scheduledTasks.runEventCompletion(new Date());

  const reloaded = await Event.findById(completedEvent._id);
  assert.equal(reloaded.completionNotificationStatus, "sent");
  assert.ok(reloaded.completionNotifiedAt);

  const notif = await Notification.findOne({
    userId: hostUser._id,
    type: "event_completed",
  });
  assert.ok(notif, "Event completed notification must be delivered to host");
});
