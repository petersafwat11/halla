/**
 * First-send event-entitlement CONSUME trigger (SHIP §9.4).
 *
 * Covers the WRITE trigger in messaging.send.service.js (`sendToGuest`, ~L298–314):
 * on the FIRST real dispatch on a subscription, `firstSendAt` is stamped AND a
 * linked store EventEntitlement flips `unused → consumed`. That flip is what
 * releases the RevenueCat `event-preflight` `unused_event_held` guard, so if it
 * silently fails a user can never buy a SECOND event package. The committed
 * suite exercises the reconcile/state MAPPING that READS `consumed`; nothing
 * exercised this write until now.
 *
 * Seam: `sendToGuest` is exported directly. We drive the channel `'sms'` path so
 * NO template/formatting DB is needed, and stub `taqnyat.sendSMS` on the shared
 * cached module object so NO real message is sent (deterministic, offline). The
 * dispatch-policy graph (active host User + active pool Subscription owned by the
 * host + non-terminal Event) is seeded so the REAL policy gate passes — more
 * faithful than bypassing it.
 *
 * Ephemeral replica set; no shared DB; no provider access.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

// The send service reads `taqnyat.sendSMS` by property at call time, so
// reassigning it on this shared cached module object stubs the transport for the
// service too (both resolve the same src/infrastructure/taqnyat.js).
const taqnyat = require("../src/infrastructure/taqnyat");
const sendService = require("../src/modules/messaging/messaging.send.service");

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const Event = require("../models/EventModel");
const Guest = require("../models/GuestModel");
const EventEntitlement = require("../models/EventEntitlementModel");

let realSendSMS;
let smsCalls;

test.before(async () => {
  await db.start();
  realSendSMS = taqnyat.sendSMS;
});

test.after(async () => {
  taqnyat.sendSMS = realSendSMS; // restore transport
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();
  // Deterministic, offline SMS transport: always "delivered", never network.
  smsCalls = [];
  taqnyat.sendSMS = async (phone, body) => {
    smsCalls.push({ phone, body });
    return { success: true, messageId: "stub-" + smsCalls.length, status: "sent" };
  };
});

// ── seed helpers ──────────────────────────────────────────────────────────────
const mkHost = () =>
  User.create({
    name: "Host",
    email: "host@x.com",
    phone: "+966500000001",
    password: "password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

// A POOL subscription: canCreateEvent() is always allowed and perEventGuardKey
// stays null (no per-event unique-index friction across seeded events). Positive
// invitePool so the dispatch-policy `requireInvites` check for a fresh guest
// passes (invitePool:0 would deny with `invites_exhausted` BEFORE the trigger).
const mkSub = async (userId) => {
  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  return Subscription.create({
    userId,
    planId: plan._id,
    status: "active",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    firstSendAt: null,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
};

const mkEvent = (host, subscriptionId) =>
  Event.create({
    host,
    subscriptionId,
    status: "live",
    eventDetails: {
      title: "Test Event",
      type: "wedding",
      date: new Date(Date.now() + 7 * 86400000),
      time: "18:00",
      location: { address: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
    },
  });

const mkGuest = (eventId, over = {}) =>
  Guest.create({
    name: "Guest",
    phone: "500000010",
    event: eventId,
    status: "invited",
    ...over,
  });

// A store event-entitlement ledger row linked to the subscription. planCode is a
// free-text label on the row; the trigger filters ONLY on {subscriptionId,status}.
const mkEntitlement = (userId, subscriptionId, over = {}) =>
  EventEntitlement.create({
    userId,
    planCode: "basic_event_50",
    source: "revenuecat",
    subscriptionId,
    status: "unused",
    ...over,
  });

// ── CASE 1: first send stamps firstSendAt AND consumes the linked entitlement ──
test("first send stamps firstSendAt AND flips the linked entitlement unused → consumed", async () => {
  const host = await mkHost();
  const sub = await mkSub(host._id);
  const event = await mkEvent(host._id, sub._id);
  const guest = await mkGuest(event._id);
  const ent = await mkEntitlement(host._id, sub._id);

  const res = await sendService.sendToGuest({ guestId: guest._id, eventId: event._id, channel: "sms" });
  assert.equal(res.success, true);
  assert.equal(smsCalls.length, 1); // stub hit exactly once — no real send

  const subAfter = await Subscription.findById(sub._id);
  assert.ok(subAfter.firstSendAt, "firstSendAt must be stamped on the first send");

  const entAfter = await EventEntitlement.findById(ent._id);
  assert.equal(entAfter.status, "consumed");
  assert.equal(String(entAfter.consumedEventId), String(event._id));
  assert.ok(entAfter.consumedAt, "consumedAt must be set");

  // Bonus: the RevenueCat second-purchase guard is now released.
  assert.equal(await EventEntitlement.hasUnused(host._id), null);
});

// ── CASE 2: a SECOND send (fresh guest) does not re-consume; no error ──────────
// Two guards sit in front of the entitlement write — the guest-flip guard and
// the firstSendAt guard. Send 2 must use a FRESH guest (same guest → the
// guest-flip guard short-circuits, testing the wrong thing). Two unused
// entitlements are seeded so the {status:'unused'} filter is non-vacuous at
// send 2: a working firstSendAt guard leaves exactly ONE consumed / ONE unused.
test("second send (fresh guest) does not re-consume a second entitlement and does not error", async () => {
  const host = await mkHost();
  const sub = await mkSub(host._id);
  const event = await mkEvent(host._id, sub._id);
  const g1 = await mkGuest(event._id, { phone: "500000011" });
  const g2 = await mkGuest(event._id, { phone: "500000012" });
  await mkEntitlement(host._id, sub._id, { providerTransactionId: "etx-a" });
  await mkEntitlement(host._id, sub._id, { providerTransactionId: "etx-b" });

  await sendService.sendToGuest({ guestId: g1._id, eventId: event._id, channel: "sms" });
  const subAfterFirst = await Subscription.findById(sub._id);
  const firstStampAt = subAfterFirst.firstSendAt;
  assert.ok(firstStampAt, "firstSendAt stamped on send 1");
  assert.equal(await EventEntitlement.countDocuments({ subscriptionId: sub._id, status: "consumed" }), 1);

  // Second send on the SAME subscription (different guest) — firstSendAt already
  // set, so firstStamp.modifiedCount is 0 and the entitlement write must NOT run.
  const res2 = await sendService.sendToGuest({ guestId: g2._id, eventId: event._id, channel: "sms" });
  assert.equal(res2.success, true);

  const subAfterSecond = await Subscription.findById(sub._id);
  assert.equal(
    subAfterSecond.firstSendAt.getTime(),
    firstStampAt.getTime(),
    "firstSendAt must be unchanged by the second send"
  );
  // Still exactly one consumed / one unused — the second entitlement is untouched.
  assert.equal(await EventEntitlement.countDocuments({ subscriptionId: sub._id, status: "consumed" }), 1);
  assert.equal(await EventEntitlement.countDocuments({ subscriptionId: sub._id, status: "unused" }), 1);
});

// ── CASE 3: an unused entitlement on a DIFFERENT subscription is not consumed ──
test("first send consumes ONLY the entitlement linked to this subscription (isolation)", async () => {
  const host = await mkHost();
  const sub = await mkSub(host._id);
  const event = await mkEvent(host._id, sub._id);
  const guest = await mkGuest(event._id);

  const linked = await mkEntitlement(host._id, sub._id, { providerTransactionId: "etx-linked" });
  // A different subscription's unused entitlement — must never be touched.
  const otherSub = await mkSub(host._id);
  const foreign = await mkEntitlement(host._id, otherSub._id, { providerTransactionId: "etx-foreign" });

  await sendService.sendToGuest({ guestId: guest._id, eventId: event._id, channel: "sms" });

  assert.equal((await EventEntitlement.findById(linked._id)).status, "consumed");
  const foreignAfter = await EventEntitlement.findById(foreign._id);
  assert.equal(foreignAfter.status, "unused", "a different subscription's entitlement stays unused");
  assert.ok(!foreignAfter.consumedEventId, "foreign entitlement has no consumedEventId");
});

// ── CASE 4: an already-consumed entitlement is not touched ─────────────────────
// The write filters on {status:'unused'}, so a row already `consumed` (from a
// prior event) must keep its original consumedEventId/consumedAt.
test("an already-consumed entitlement is not re-stamped by a later first send", async () => {
  const host = await mkHost();
  const sub = await mkSub(host._id);
  const event = await mkEvent(host._id, sub._id);
  const guest = await mkGuest(event._id);

  const sentinelEventId = new mongoose.Types.ObjectId();
  const sentinelAt = new Date(Date.now() - 86400000);
  const consumed = await mkEntitlement(host._id, sub._id, {
    status: "consumed",
    consumedEventId: sentinelEventId,
    consumedAt: sentinelAt,
    providerTransactionId: "etx-consumed",
  });

  // firstSendAt is null on this sub, so firstStamp passes and the entitlement
  // write RUNS — but its {status:'unused'} filter must not match this row.
  await sendService.sendToGuest({ guestId: guest._id, eventId: event._id, channel: "sms" });

  const after = await EventEntitlement.findById(consumed._id);
  assert.equal(after.status, "consumed");
  assert.equal(String(after.consumedEventId), String(sentinelEventId), "consumedEventId unchanged");
  assert.equal(after.consumedAt.getTime(), sentinelAt.getTime(), "consumedAt unchanged");
});
