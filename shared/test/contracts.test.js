import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EVENT_STATUS,
  RSVP_STATUS,
  GUEST_STATUS,
  CHECKIN_STATUS,
  RSVP_BUCKETS,
  classifyRsvpBucket,
  USER_STATUS,
  VENDOR_STATUS,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  INVITATION_TYPE,
  invitationAllowsReply,
  invitationIncludesQr,
} from "../src/constants/index.js";

import {
  normalizeId,
  toGuestDTO,
  toTicketDTO,
  normalizeSubscriptionResponse,
  toSubscriptionDTO,
  toBulkIdsPayload,
  eventKeys,
  guestKeys,
  ticketKeys,
  planKeys,
  vendorServiceKeys,
  subscriptionKeys,
} from "../src/utils/index.js";

import { bulkIdsRequestSchema } from "../src/schemas/bulk.js";

// ============================================================
// 1. normalizeId & DTO Adapters
// ============================================================

test("normalizeId: handles primitives, objects, and edge cases", () => {
  assert.equal(normalizeId("60d5ec49f1b2c8b1f8e4e1a1"), "60d5ec49f1b2c8b1f8e4e1a1");
  assert.equal(normalizeId(12345), "12345");
  assert.equal(normalizeId({ _id: "mongo_id_123" }), "mongo_id_123");
  assert.equal(normalizeId({ id: "standard_id_456" }), "standard_id_456");
  assert.equal(normalizeId({ guestId: "guest_789" }), "guest_789");
  assert.equal(normalizeId({ userId: "user_999" }), "user_999");
  assert.equal(normalizeId({ eventId: "event_111" }), "event_111");
  assert.equal(normalizeId({ ticketId: "ticket_222" }), "ticket_222");

  // Custom toString (e.g. Mongo ObjectId mock)
  const mockObjectId = {
    toString: () => "507f191e810c19729de860ea",
  };
  assert.equal(normalizeId(mockObjectId), "507f191e810c19729de860ea");

  // Nullish / empty
  assert.equal(normalizeId(null), null);
  assert.equal(normalizeId(undefined), null);
  assert.equal(normalizeId("   "), null);
  assert.equal(normalizeId({}), null);
});

test("toGuestDTO (EVT-15): produces canonical GuestDTO from various shapes", () => {
  const rawFromMongo = {
    _id: "mongo_guest_1",
    name: "Ahmed Ali",
    phone: "0501234567",
    category: "VIP",
    rsvpStatus: "confirmed",
    invitationType: "reply_and_qr",
    qrCode: "data:image/png;base64,...",
    checkedIn: false,
    tableNumber: 5,
    companionsCount: 2,
    checkIn: { checkedInAt: new Date("2026-08-21T18:00:00Z") },
    rsvp: { response: "confirmed", respondedAt: new Date() },
    invitation: { sent: true, autoReminderSent: true },
    addedBy: { _id: "user_1", username: "host1" },
    createdAt: new Date("2026-08-20T10:00:00Z"),
  };

  const dto = toGuestDTO(rawFromMongo);
  assert.equal(dto.id, "mongo_guest_1");
  assert.equal(dto._id, "mongo_guest_1");
  assert.equal(dto.name, "Ahmed Ali");
  assert.equal(dto.phone, "0501234567");
  assert.equal(dto.mobile, "0501234567");
  assert.equal(dto.category, "VIP");
  assert.equal(dto.status, "confirmed");
  assert.equal(dto.rsvpStatus, "confirmed");
  assert.equal(dto.tableNumber, 5);
  assert.equal(dto.companionsCount, 2);
  assert.ok(dto.checkIn);
  assert.ok(dto.rsvp);
  assert.ok(dto.invitation);
  assert.ok(dto.addedBy);

  // Raw with alternative field names (guestId, mobile, rsvpStatus)
  const rawAlt = {
    guestId: "alt_guest_2",
    fullName: "Sara Omar",
    mobile: "0559876543",
    status: "INVITED",
  };

  const dtoAlt = toGuestDTO(rawAlt);
  assert.equal(dtoAlt.id, "alt_guest_2");
  assert.equal(dtoAlt._id, "alt_guest_2");
  assert.equal(dtoAlt.name, "Sara Omar");
  assert.equal(dtoAlt.phone, "0559876543");
  assert.equal(dtoAlt.mobile, "0559876543");
  assert.equal(dtoAlt.status, "invited");
  assert.equal(dtoAlt.rsvpStatus, "pending"); // classifyRsvpBucket maps invited -> pending

  assert.equal(toGuestDTO(null), null);
});

test("toTicketDTO (ADM-06): normalizes subject, title, description, message", () => {
  const rawWithSubject = {
    _id: "ticket_1",
    subject: "Login issue on Android",
    description: "Cannot sign in with phone",
    status: "OPEN",
    priority: "HIGH",
    attachments: [{ url: "https://example.com/screenshot.jpg" }],
  };

  const dto1 = toTicketDTO(rawWithSubject);
  assert.equal(dto1.id, "ticket_1");
  assert.equal(dto1.subject, "Login issue on Android");
  assert.equal(dto1.title, "Login issue on Android");
  assert.equal(dto1.description, "Cannot sign in with phone");
  assert.equal(dto1.message, "Cannot sign in with phone");
  assert.equal(dto1.status, "open");
  assert.equal(dto1.priority, "high");
  assert.equal(dto1.attachments.length, 1);

  // Legacy format with title and message
  const rawWithTitle = {
    id: "ticket_2",
    title: "Billing dispute",
    message: "Charged twice for subscription",
  };

  const dto2 = toTicketDTO(rawWithTitle);
  assert.equal(dto2.id, "ticket_2");
  assert.equal(dto2.subject, "Billing dispute");
  assert.equal(dto2.title, "Billing dispute");
  assert.equal(dto2.description, "Charged twice for subscription");
  assert.equal(dto2.message, "Charged twice for subscription");
});

test("normalizeSubscriptionResponse (EVT-17): handles object, array, and API envelope", () => {
  // 1. Standard backend response: { subscription: {...}, subscriptions: [...], hasSubscription: true }
  const resp1 = {
    subscription: { id: "sub_1", planCode: "basic_monthly" },
    subscriptions: [{ id: "sub_1", planCode: "basic_monthly" }],
    hasSubscription: true,
  };
  const norm1 = normalizeSubscriptionResponse(resp1);
  assert.equal(norm1.hasSubscription, true);
  assert.equal(norm1.subscription.id, "sub_1");
  assert.equal(norm1.subscriptions.length, 1);

  // 2. Nested in .data envelope: { data: { subscription: {...}, hasSubscription: true } }
  const resp2 = {
    data: {
      subscription: { id: "sub_2" },
      hasSubscription: true,
    },
  };
  const norm2 = normalizeSubscriptionResponse(resp2);
  assert.equal(norm2.hasSubscription, true);
  assert.equal(norm2.subscription.id, "sub_2");

  // 3. Array response (handles mobile indexing bug): [{ id: "sub_3" }]
  const resp3 = [{ id: "sub_3" }];
  const norm3 = normalizeSubscriptionResponse(resp3);
  assert.equal(norm3.hasSubscription, true);
  assert.equal(norm3.subscription.id, "sub_3");
  assert.equal(norm3.subscriptions.length, 1);

  // 4. Null / empty
  const norm4 = normalizeSubscriptionResponse(null);
  assert.equal(norm4.hasSubscription, false);
  assert.equal(norm4.subscription, null);
  assert.deepEqual(norm4.subscriptions, []);
});

test("toSubscriptionDTO: computes remaining invites and normalizes fields", () => {
  const sub = {
    _id: "sub_100",
    planCode: "premium_monthly",
    planType: "premium_monthly",
    status: "ACTIVE",
    invitePool: 500,
    usedInvites: 120,
  };

  const dto = toSubscriptionDTO(sub);
  assert.equal(dto.id, "sub_100");
  assert.equal(dto.planCode, "premium_monthly");
  assert.equal(dto.status, "active");
  assert.equal(dto.invitePool, 500);
  assert.equal(dto.usedInvites, 120);
  assert.equal(dto.remainingInvites, 380);

  // Unlimited / null pool
  const unlimitedSub = {
    id: "sub_unlimited",
    planCode: "unlimited",
    invitePool: null,
    usedInvites: 50,
  };
  const dtoUnlimited = toSubscriptionDTO(unlimitedSub);
  assert.equal(dtoUnlimited.invitePool, null);
  assert.equal(dtoUnlimited.remainingInvites, null);
});

// ============================================================
// 2. Bulk ID Serialization & Schema (ADM-04)
// ============================================================

test("toBulkIdsPayload (ADM-04): normalizes hostIds, vendorIds, moderatorIds, eventIds to { ids }", () => {
  // Object with hostIds
  assert.deepEqual(toBulkIdsPayload({ hostIds: ["h1", "h2", "h1"] }), {
    ids: ["h1", "h2"],
  });

  // Object with vendorIds
  assert.deepEqual(toBulkIdsPayload({ vendorIds: ["v1", "v2"] }), {
    ids: ["v1", "v2"],
  });

  // Object with moderatorIds
  assert.deepEqual(toBulkIdsPayload({ moderatorIds: ["m1"] }), {
    ids: ["m1"],
  });

  // Object with eventIds
  assert.deepEqual(toBulkIdsPayload({ eventIds: ["e1", "e2"] }), {
    ids: ["e1", "e2"],
  });

  // Direct array of strings or objects
  assert.deepEqual(toBulkIdsPayload(["id1", { _id: "id2" }, "id1", "  "]), {
    ids: ["id1", "id2"],
  });

  // Empty / null
  assert.deepEqual(toBulkIdsPayload(null), { ids: [] });
  assert.deepEqual(toBulkIdsPayload({}), { ids: [] });
});

test("bulkIdsRequestSchema: validates and rejects properly", () => {
  const schema = bulkIdsRequestSchema();

  // Valid
  assert.doesNotThrow(() => schema.parse({ ids: ["id1", "id2"] }));

  // Empty ids array throws
  assert.throws(() => schema.parse({ ids: [] }));

  // Empty string in array throws
  assert.throws(() => schema.parse({ ids: ["   "] }));

  // Missing ids throws
  assert.throws(() => schema.parse({}));
});

// ============================================================
// 3. RSVP Buckets (EVT-16)
// ============================================================

test("RSVP_BUCKETS and classifyRsvpBucket (EVT-16): classifies all states accurately", () => {
  assert.equal(classifyRsvpBucket("invited"), "pending");
  assert.equal(classifyRsvpBucket("pending"), "pending");
  assert.equal(classifyRsvpBucket("confirmed"), "confirmed");
  assert.equal(classifyRsvpBucket("checked_in"), "attended");
  assert.equal(classifyRsvpBucket("declined"), "declined");
  assert.equal(classifyRsvpBucket("no_show"), "no_show");
  assert.equal(classifyRsvpBucket(null), "pending");
  assert.equal(classifyRsvpBucket("UNKNOWN_STATE"), "pending");

  // Buckets inclusion
  assert.ok(RSVP_BUCKETS.PENDING.includes("invited"));
  assert.ok(RSVP_BUCKETS.PENDING.includes("pending"));
  assert.ok(RSVP_BUCKETS.CONFIRMED.includes("confirmed"));
  assert.ok(RSVP_BUCKETS.CONFIRMED.includes("checked_in"));
  assert.ok(RSVP_BUCKETS.DECLINED.includes("declined"));
  assert.ok(RSVP_BUCKETS.ATTENDED.includes("checked_in"));
  assert.ok(RSVP_BUCKETS.NO_SHOW.includes("no_show"));
});

// ============================================================
// 4. Canonical Query Key Factories (ADM-09)
// ============================================================

test("Canonical Query Key Factories: produce expected stable key arrays", () => {
  // Event keys
  assert.deepEqual(eventKeys.all, ["events"]);
  assert.deepEqual(eventKeys.detail("evt_123"), ["events", "evt_123"]);
  assert.deepEqual(eventKeys.adminDetail("evt_123"), ["admin", "events", "evt_123"]);
  assert.deepEqual(eventKeys.singleStats("evt_123"), ["events", "evt_123", "stats"]);
  assert.deepEqual(eventKeys.staffTokens("evt_123"), ["events", "evt_123", "staff-tokens"]);
  assert.deepEqual(eventKeys.stats(), ["events", "stats"]);

  // Guest keys
  assert.deepEqual(guestKeys.all, ["guests"]);
  assert.deepEqual(guestKeys.forEvent("evt_123"), ["guests", "events", "evt_123"]);
  assert.deepEqual(guestKeys.forEvent("evt_123", { page: 1 }), [
    "guests",
    "events",
    "evt_123",
    { page: 1 },
  ]);
  assert.deepEqual(guestKeys.detail("gst_456"), ["guests", "detail", "gst_456"]);

  // Ticket keys
  assert.deepEqual(ticketKeys.all, ["tickets"]);
  assert.deepEqual(ticketKeys.detail("tkt_789"), ["tickets", "tkt_789"]);
  assert.deepEqual(ticketKeys.adminList({ status: "open" }), [
    "tickets",
    "all",
    { status: "open" },
  ]);

  // Plan keys
  assert.deepEqual(planKeys.all, ["plans"]);
  assert.deepEqual(planKeys.list(), ["plans", "all"]);
  assert.deepEqual(planKeys.adminAll(), ["admin", "plans"]);
  assert.deepEqual(planKeys.adminList({ status: "active" }), [
    "admin",
    "plans",
    { status: "active" },
  ]);

  // Vendor service keys
  assert.deepEqual(vendorServiceKeys.all, ["vendor-services"]);
  assert.deepEqual(vendorServiceKeys.detail("svc_321"), ["vendor-services", "svc_321"]);
  assert.deepEqual(vendorServiceKeys.stats(), ["vendor-services", "stats"]);

  // Subscription keys
  assert.deepEqual(subscriptionKeys.all, ["subscriptions"]);
  assert.deepEqual(subscriptionKeys.mySubscription(), ["subscriptions", "my-subscription"]);
});

// ============================================================
// 5. Status Enums & Helper Parity
// ============================================================

test("Status Enums: are frozen and contain all required lifecycle states", () => {
  assert.ok(Object.isFrozen(EVENT_STATUS));
  assert.ok(Object.isFrozen(RSVP_STATUS));
  assert.ok(Object.isFrozen(GUEST_STATUS));
  assert.ok(Object.isFrozen(CHECKIN_STATUS));
  assert.ok(Object.isFrozen(USER_STATUS));
  assert.ok(Object.isFrozen(VENDOR_STATUS));
  assert.ok(Object.isFrozen(SUBSCRIPTION_STATUS));
  assert.ok(Object.isFrozen(TICKET_STATUS));
  assert.ok(Object.isFrozen(TICKET_PRIORITY));
  assert.ok(Object.isFrozen(INVITATION_TYPE));

  assert.equal(EVENT_STATUS.PENDING_SCHEDULING, "pending_scheduling");
  assert.equal(EVENT_STATUS.PENDING_REVIEW, "pending_review");
  assert.equal(EVENT_STATUS.SCHEDULED, "scheduled");
  assert.equal(EVENT_STATUS.LIVE, "live");
  assert.equal(EVENT_STATUS.PUBLISHED, "published");
  assert.equal(EVENT_STATUS.COMPLETED, "completed");
  assert.equal(EVENT_STATUS.CANCELLED, "cancelled");
  assert.equal(EVENT_STATUS.ARCHIVED, "archived");
  assert.equal(EVENT_STATUS.FAILED, "failed");
  assert.equal(EVENT_STATUS.DELETED, "deleted");

  // Invitation helpers
  assert.equal(invitationAllowsReply(INVITATION_TYPE.REPLY_AND_QR), true);
  assert.equal(invitationAllowsReply(INVITATION_TYPE.REPLY_ONLY), true);
  assert.equal(invitationAllowsReply(INVITATION_TYPE.NONE), false);

  assert.equal(invitationIncludesQr(INVITATION_TYPE.REPLY_AND_QR), true);
  assert.equal(invitationIncludesQr(INVITATION_TYPE.REPLY_ONLY), false);
  assert.equal(invitationIncludesQr(INVITATION_TYPE.NONE), false);
});

// ============================================================
// 6. Event Wizard Steps (Session 1.1)
// ============================================================

test("Event Wizard Steps: constants are frozen and define expected step order", async () => {
  const {
    EVENT_CREATE_STEPS,
    EVENT_CREATE_STEP_NUMBERS,
    ADMIN_EVENT_CREATE_STEPS,
    ADMIN_EVENT_CREATE_STEP_NUMBERS,
    EVENT_UPDATE_STEPS,
    EVENT_UPDATE_STEP_NUMBERS,
  } = await import("../src/constants/index.js");

  assert.ok(Object.isFrozen(EVENT_CREATE_STEPS));
  assert.ok(Object.isFrozen(EVENT_CREATE_STEP_NUMBERS));
  assert.ok(Object.isFrozen(ADMIN_EVENT_CREATE_STEPS));
  assert.ok(Object.isFrozen(ADMIN_EVENT_CREATE_STEP_NUMBERS));
  assert.ok(Object.isFrozen(EVENT_UPDATE_STEPS));
  assert.ok(Object.isFrozen(EVENT_UPDATE_STEP_NUMBERS));

  // Host create has 5 steps ending with review
  assert.equal(EVENT_CREATE_STEPS.length, 5);
  assert.equal(EVENT_CREATE_STEPS[4], "review");
  assert.equal(EVENT_CREATE_STEP_NUMBERS.REVIEW, 5);

  // Admin create has 6 steps starting with host_selector and ending with review
  assert.equal(ADMIN_EVENT_CREATE_STEPS.length, 6);
  assert.equal(ADMIN_EVENT_CREATE_STEPS[0], "host_selector");
  assert.equal(ADMIN_EVENT_CREATE_STEPS[5], "review");
  assert.equal(ADMIN_EVENT_CREATE_STEP_NUMBERS.HOST_SELECTOR, 1);
  assert.equal(ADMIN_EVENT_CREATE_STEP_NUMBERS.REVIEW, 6);

  // Update has 4 steps
  assert.equal(EVENT_UPDATE_STEPS.length, 4);
  assert.equal(EVENT_UPDATE_STEP_NUMBERS.MESSAGES, 4);
});

test("toInvitationSettingsDTO and invitationSettingsSchema (EVT-02): normalizes and validates invitation settings", async () => {
  const { toInvitationSettingsDTO } = await import("../src/utils/index.js");
  const { invitationSettingsSchema } = await import("../src/schemas/events.js");

  // 1. Raw settings with aliases and legacy keys
  const raw = {
    selectedTemplate: {
      _id: "507f1f77bcf86cd799439011",
      templateName: "wedding_standard",
    },
    visualTemplate: {
      templateRef: "507f1f77bcf86cd799439012",
      fieldValues: { groomName: "Fahad" },
      bakedImagePath: "https://s3.example.com/invites/baked.jpg",
      isCustomUpload: false,
    },
    attendanceAutoReply: "See you there!",
    absenceAutoReply: "We will miss you!",
    invitationType: "reply_and_qr",
  };

  const dto = toInvitationSettingsDTO(raw);
  assert.equal(dto.invitationType, "reply_and_qr");
  assert.equal(dto.taqnyatTemplate.templateRef, "507f1f77bcf86cd799439011");
  assert.equal(dto.visualTemplate.templateRef, "507f1f77bcf86cd799439012");
  assert.equal(dto.visualTemplate.fieldValues.groomName, "Fahad");
  assert.equal(dto.guestReplies.onAttend, "See you there!");
  assert.equal(dto.guestReplies.onAbsent, "We will miss you!");
  assert.equal(dto.templateImage, "https://s3.example.com/invites/baked.jpg");

  // 2. Schema validation
  const schema = invitationSettingsSchema();
  const parsed = schema.parse(raw);
  assert.equal(parsed.taqnyatTemplate.templateRef, "507f1f77bcf86cd799439011");
  assert.equal(parsed.guestReplies.onAttend, "See you there!");

  // 3. Schema rejects invalid non-object strings where objects are expected
  assert.throws(() => {
    schema.parse({
      taqnyatTemplate: "not-an-object",
    });
  });
});

test("EVENT_TRANSITIONS and isValidEventStatusTransition (EVT-06): state machine validation", async () => {
  const { EVENT_STATUS, EVENT_TRANSITIONS, isValidEventStatusTransition } = await import("../src/constants/eventStatus.js");

  assert.ok(EVENT_TRANSITIONS);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.PENDING_SCHEDULING, EVENT_STATUS.SCHEDULED), true);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE), true);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.LIVE, EVENT_STATUS.COMPLETED), true);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.COMPLETED, EVENT_STATUS.SCHEDULED), true);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.SCHEDULED, EVENT_STATUS.CANCELLED), true);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.CANCELLED, EVENT_STATUS.SCHEDULED), true);

  // Invalid transitions
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.COMPLETED, EVENT_STATUS.LIVE), false);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.DELETED, EVENT_STATUS.SCHEDULED), false);
  assert.equal(isValidEventStatusTransition(EVENT_STATUS.SCHEDULED, "suspended"), false);
  assert.equal(isValidEventStatusTransition(null, EVENT_STATUS.SCHEDULED), false);
});

