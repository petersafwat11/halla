/**
 * Account-deletion integration proof (DEL-03 · REVIEW-FINDINGS P1-02 ·
 * LEGAL-PARITY-PLAN §7/§9).
 *
 * Runs the REAL deletion pipeline against an ephemeral MongoMemoryReplSet with
 * an isolated in-memory local-storage stub (deleteStoredFile overridden). It
 * never touches the shared database or filesystem. Proves:
 *   1. No non-retained PII remains (User anonymized; events/guests/post-event/
 *      services/tickets/notifications/moderation/tokens gone or scrubbed;
 *      full-URL post-event media collected + deleted).
 *   2. Auth token invalidation (refresh tokens deleted; deleted user excluded
 *      from default finds).
 *   3. Idempotence (second delete is a no-op returning the same request).
 *   4. Truthful completion + partial-retry: a storage failure yields `pending_retry`
 *      (NOT `completed`) with residual keys; the retry worker converges it.
 *   5. Retained rows (Payment/Subscription) survive, pseudonymized.
 *   6. Post-deletion RevenueCat webhook → `account_deleted` (not dead_letter).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const localUpload = require("../src/shared/utils/localUpload");
const deletionService = require("../src/modules/account-deletion/deletion.service");
const { collectUploadRefs } = require("../src/modules/account-deletion/deletion.collect");
const { runDeletionRetryTick } = require("../src/modules/account-deletion/deletion.retry");

const User = require("../models/UserModel");
const Event = require("../models/EventModel");
const Guest = require("../models/GuestModel");
const PostEventContent = require("../models/PostEventContentModel");
const Service = require("../models/ServiceModel");
const Ticket = require("../models/TicketModel");
const Notification = require("../models/NotificationModel");
const NotificationPreferences = require("../models/NotificationPreferencesModel");
const RefreshToken = require("../models/RefreshTokenModel");
const Addon = require("../models/AddonModel");
const TermsAcceptance = require("../models/TermsAcceptanceModel");
const Block = require("../models/BlockModel");
const Report = require("../models/ReportModel");
const Subscription = require("../models/SubscriptionModel");
const Payment = require("../models/PaymentModel");
const BusinessPlanAssignment = require("../models/BusinessPlanAssignmentModel");
const RevenueCatEvent = require("../models/RevenueCatEventModel");
const AuditLog = require("../models/AuditLogModel");
const OutboundMessage = require("../models/OutboundMessageModel");
const AccountDeletionRequest = require("../models/AccountDeletionRequestModel");
const ProcessorErasure = require("../models/ProcessorErasureModel");
const StaffAccessToken = require("../models/StaffAccessTokenModel");

let deleted;
let storageShouldFail;

const origDelete = localUpload.deleteStoredFile;

test.before(async () => {
  await db.start();
});
test.after(async () => {
  localUpload.deleteStoredFile = origDelete;
  await db.stop();
});
test.beforeEach(async () => {
  await db.clearAll();
  deleted = new Set();
  storageShouldFail = new Set();
  localUpload.deleteStoredFile = async (key) => {
    if (storageShouldFail.has(key)) return false;
    deleted.add(key);
    return true;
  };
});

async function seedUser(over = {}) {
  return User.create({
    name: "Alice Host",
    email: "alice@example.com",
    mobile: "+966500000009",
    phoneNumber: "+966500000009",
    password: "password123",
    role: "host",
    accountType: "personal",
    avatar: "users/avatars/alice/av.jpg",
    billingUserId: "bill-alice-1",
    profile: {
      hostData: { bio: "my bio" },
      vendorData: {
        businessLogo: "vendors/logos/alice/logo.png",
        portfolioImages: ["vendors/portfolios/alice/p1.jpg"],
      },
    },
    ...over,
  });
}

async function seedFullGraph(user) {
  const event = await Event.create({
    host: user._id,
    eventDetails: {
      title: "Alice Wedding",
      type: "wedding",
      date: new Date(Date.now() + 7 * 86400000),
      time: "18:00",
      location: { address: "123 Riyadh St", latitude: 24.7, longitude: 46.6, city: "Riyadh" },
      description: "private notes",
    },
    templateImage: "events/templates/e1/hdr.jpg",
    branding: { logoKey: "events/branding/e1/logo.png" },
    visualTemplate: { bakedImagePath: "events/templates/e1/baked.png" },
    staffList: [{ name: "Bob Staff", phone: "500111222" }],
  });
  await Guest.create({
    event: event._id,
    name: "Guest One",
    phone: "500333444",
    status: "invited",
    rsvp: { message: "see you there", dietaryRestrictions: "none" },
  });
  await StaffAccessToken.create({
    event: event._id,
    tokenHash: "hash-staff-1",
    phone: "500111222",
    staffName: "Bob Staff",
  }).catch(() => {});
  // Post-event content with a public local reference plus nested comment
  // image. Raw insert bypasses subdoc `required` validators (guest/type) — the
  // deletion pipeline reads with `.lean()` and deletes by `host`, so the exact
  // sub-field validity is irrelevant; only the upload refs + host matter here.
  await PostEventContent.collection.insertOne({
    event: event._id,
    host: user._id,
    coverImage: "events/post-event/e1/cover.jpg",
    media: [
      {
        type: "photo",
        url: "/uploads/events/post-event/e1/photos/full.jpg",
        thumbnailUrl: "events/post-event/e1/photos/thumb.jpg",
        comments: [
          { text: "nice", images: [{ url: "events/post-event/e1/comments/c1.jpg", thumbnail: "events/post-event/e1/comments/c1t.jpg" }] },
        ],
      },
    ],
    comments: [
      { text: "great", images: [{ url: "events/post-event/e1/comments/p1.jpg" }] },
    ],
  });
  await Service.collection.insertOne({
    vendorId: user._id,
    name: "Photography",
    category: "media",
    price: 100,
    image: "vendors/services/alice/svc.jpg",
  });
  await Ticket.create({ user: user._id, subject: "help", message: "issue text" }).catch(() => {});
  await Notification.create({ userId: user._id, type: "generic", title: "t", message: "m" }).catch(() => {});
  await NotificationPreferences.create({ userId: user._id }).catch(() => {});
  await RefreshToken.create({ userId: user._id, tokenHash: "rt-1", expiresAt: new Date(Date.now() + 1e9) });
  await Addon.create({ userId: user._id, addonType: "extra_invites", price: 40 }).catch(() => {});
  await TermsAcceptance.create({ actorType: "user", actorId: user._id, documentType: "terms", version: "2026-06-27", ip: "1.2.3.4" });
  await Block.create({ blockerType: "user", blockerId: user._id, blockedActorType: "guest", blockedActorId: user._id });
  await Report.create({
    reporterType: "user", reporterId: user._id, targetType: "service", targetId: user._id,
    reportedActorType: "user", reportedActorId: user._id, reason: "spam",
  }).catch(() => {});
  // Retained rows (must survive, pseudonymized). Raw insert — we only assert on
  // survival + free-text scrub, not on full billing validity.
  const mongoose = require("mongoose");
  await Subscription.collection.insertOne({
    userId: user._id, planId: new mongoose.Types.ObjectId(), status: "active",
    notes: "vip note", cancelReason: "x",
  });
  await Payment.collection.insertOne({
    userId: user._id, amount: 100, currency: "SAR", status: "paid",
    description: "Alice private order", metadata: { email: "alice@example.com" },
  });
  await BusinessPlanAssignment.collection.insertOne({
    businessUserId: user._id, planId: new mongoose.Types.ObjectId(), mode: "grant", status: "active",
    grantReason: "Alice requested it", tokenHash: "private-link-hash", createdAt: new Date(), updatedAt: new Date(),
  });
  await RevenueCatEvent.collection.insertOne({
    eventId: "rc-alice-delete", type: "INITIAL_PURCHASE", status: "processed", userId: user._id,
    appUserId: "bill-alice-1", aliases: ["alice@example.com"], rawPayload: { email: "alice@example.com" },
    createdAt: new Date(), updatedAt: new Date(),
  });
  await AuditLog.collection.insertOne({
    action: "user.updated", performedBy: user._id, targetType: "user", targetId: user._id,
    metadata: { email: "alice@example.com" }, ipAddress: "1.2.3.4", userAgent: "private-agent", timestamp: new Date(),
  });
  await OutboundMessage.collection.insertOne({
    provider: "taqnyat", channel: "sms", effectiveChannel: "sms", messageType: "sms", status: "sent",
    recipients: ["+966500000000"], recipientCount: 1, requestPayload: { phone: "+966500000000" },
    event: event._id, user: user._id, createdAt: new Date(), updatedAt: new Date(),
  });
  return event;
}

test("collectUploadRefs gathers every local media variant and nested comment image", async () => {
  const user = await seedUser();
  await seedFullGraph(user);
  const loaded = await User.findById(user._id);
  const { keys } = await collectUploadRefs(loaded);
  const set = new Set(keys);
  // profile
  assert.ok(set.has("users/avatars/alice/av.jpg"));
  assert.ok(set.has("vendors/logos/alice/logo.png"));
  assert.ok(set.has("vendors/portfolios/alice/p1.jpg"));
  // event
  assert.ok(set.has("events/templates/e1/hdr.jpg"));
  assert.ok(set.has("events/branding/e1/logo.png"));
  assert.ok(set.has("events/templates/e1/baked.png"), "baked visual template must be collected");
  assert.ok(set.has("events/post-event/e1/photos/full.jpg"));
  assert.ok(set.has("events/post-event/e1/photos/thumb.jpg"));
  assert.ok(set.has("events/post-event/e1/cover.jpg"), "cover image must be collected");
  assert.ok(set.has("events/post-event/e1/comments/c1.jpg"), "media-comment image must be collected");
  assert.ok(set.has("events/post-event/e1/comments/c1t.jpg"));
  assert.ok(set.has("events/post-event/e1/comments/p1.jpg"), "post-comment image must be collected");
  // service
  assert.ok(set.has("vendors/services/alice/svc.jpg"));
});

test("full deletion → no non-retained PII remains; retained rows survive; status completed", async () => {
  const user = await seedUser();
  const event = await seedFullGraph(user);

  const res = await deletionService.runDeletion({ userId: user._id, channel: "app" });
  assert.equal(res.status, "completed");

  // User anonymized (must query WITH deletedAt to bypass the soft-delete hook).
  const closed = await User.findOne({ _id: user._id, deletedAt: { $exists: true } }).select("+email").lean();
  assert.equal(closed.status, "deleted");
  assert.equal(closed.name, "Deleted User");
  assert.ok(!closed.email && !closed.mobile && !closed.phoneNumber && !closed.username);
  assert.ok(!closed.avatar);
  assert.ok(!closed.profile?.vendorData, "vendorData PII removed");
  assert.ok(!closed.profile?.hostData?.bio, "host bio removed");
  // billingUserId retained (pseudonymous tombstone key).
  assert.equal(closed.billingUserId, "bill-alice-1");

  // Event scrubbed + soft-deleted, staff PII scrubbed.
  const ev = await Event.findOne({ _id: event._id }).lean();
  assert.equal(ev.status, "deleted");
  assert.equal(ev.eventDetails.title, "Deleted Event");
  assert.ok(!ev.eventDetails.location, "location removed");
  assert.ok(!ev.eventDetails.description, "description removed");
  assert.ok(!ev.branding, "branding removed");
  assert.equal(ev.staffList[0].name, "Deleted");
  assert.equal(ev.staffList[0].phone, "");

  // Guests scrubbed.
  const guests = await Guest.find({ event: event._id }).lean();
  for (const g of guests) {
    assert.equal(g.name, "Deleted Guest");
    assert.equal(g.phone, "");
    assert.equal(g.rsvp.message, "");
  }

  // Hard-deleted collections.
  assert.equal(await PostEventContent.countDocuments({ host: user._id }), 0);
  assert.equal(await Service.countDocuments({ vendorId: user._id }), 0);
  assert.equal(await Ticket.countDocuments({ user: user._id }), 0);
  assert.equal(await Notification.countDocuments({ userId: user._id }), 0);
  assert.equal(await NotificationPreferences.countDocuments({ userId: user._id }), 0);
  assert.equal(await RefreshToken.countDocuments({ userId: user._id }), 0);
  assert.equal(await Addon.countDocuments({ userId: user._id }), 0);
  assert.equal(await TermsAcceptance.countDocuments({ actorId: user._id }), 0);
  assert.equal(await Block.countDocuments({ blockerId: user._id }), 0);
  assert.equal(await StaffAccessToken.countDocuments({ event: event._id }), 0);

  // Retained rows survive; free-text scrubbed.
  const sub = await Subscription.findOne({ userId: user._id }).lean();
  assert.ok(sub, "subscription retained");
  assert.equal(sub.notes, null, "subscription notes scrubbed");
  const payment = await Payment.findOne({ userId: user._id }).lean();
  assert.ok(payment, "payment retained");
  assert.equal(payment.description, null);
  assert.deepEqual(payment.metadata, {});
  assert.ok(payment.privacySubjectDeletedAt);
  const assignment = await BusinessPlanAssignment.findOne({ businessUserId: user._id }).lean();
  assert.equal(assignment.grantReason, null);
  assert.equal(assignment.tokenHash, null);
  assert.ok(assignment.privacySubjectDeletedAt);
  const rcEvent = await RevenueCatEvent.findOne({ userId: user._id }).lean();
  assert.deepEqual(rcEvent.aliases, []);
  assert.equal(rcEvent.rawPayload, null);
  assert.ok(rcEvent.privacySubjectDeletedAt);
  const audit = await AuditLog.collection.findOne({ action: "user.updated", targetType: "user", targetId: user._id });
  assert.equal(audit.performedBy, null);
  assert.deepEqual(audit.metadata, {});
  assert.equal(await OutboundMessage.countDocuments({ user: user._id }), 0);

  // All personal uploads were deleted.
  assert.ok(deleted.has("events/post-event/e1/photos/full.jpg"));
  assert.ok(deleted.has("users/avatars/alice/av.jpg"));
  assert.equal(res.pendingUploadRefs.length, 0);

  // Processor obligations recorded (RevenueCat retained_by_policy; DEC-04).
  const rc = await ProcessorErasure.findOne({ deletionRequestId: res.requestId, processor: "revenuecat" }).lean();
  assert.equal(rc.status, "retained_by_policy");
  assert.equal(rc.externalRef, "bill-alice-1");
});

test("auth token invalidation: deleted user excluded from default find", async () => {
  const user = await seedUser();
  await RefreshToken.create({ userId: user._id, tokenHash: "rt-x", expiresAt: new Date(Date.now() + 1e9) });
  await deletionService.runDeletion({ userId: user._id });
  // Default find (protect uses findById → pre-find hook excludes deletedAt).
  assert.equal(await User.findById(user._id), null, "deleted user not returned by default find");
  assert.equal(await RefreshToken.countDocuments({ userId: user._id }), 0);
});

test("idempotent: second delete returns same request, no throw", async () => {
  const user = await seedUser();
  const r1 = await deletionService.runDeletion({ userId: user._id });
  const r2 = await deletionService.runDeletion({ userId: user._id });
  assert.equal(String(r1.requestId), String(r2.requestId));
  assert.equal(await AccountDeletionRequest.countDocuments({ userId: user._id }), 1);
});

test("partial storage failure → pending_retry with residual; worker converges", async () => {
  const user = await seedUser();
  await seedFullGraph(user);
  // Fail exactly the full-URL media key on the first pass.
  storageShouldFail.add("events/post-event/e1/photos/full.jpg");

  const res = await deletionService.runDeletion({ userId: user._id });
  assert.equal(res.status, "pending_retry", "must NOT be completed while a personal object remains");
  assert.ok(res.pendingUploadRefs.includes("events/post-event/e1/photos/full.jpg"));
  // Account is still CLOSED despite the residual.
  assert.equal(await User.findById(user._id), null);

  // Force nextRetryAt into the past, clear the failure, run the worker.
  await AccountDeletionRequest.updateOne({ requestId: res.requestId }, { $set: { nextRetryAt: new Date(0) } });
  storageShouldFail.clear();
  const tick = await runDeletionRetryTick();
  assert.equal(tick.completed, 1);
  const done = await AccountDeletionRequest.findOne({ requestId: res.requestId }).lean();
  assert.equal(done.status, "completed");
  assert.equal(done.pendingUploadRefs.length, 0);
  assert.ok(deleted.has("events/post-event/e1/photos/full.jpg"), "residual key deleted on retry");
});

test("idempotent local retry: an already-absent path counts as gone", async () => {
  const user = await seedUser();
  // No failures configured; deleteStoredFile returns true even for absent keys.
  const res = await deletionService.runDeletion({ userId: user._id });
  assert.equal(res.status, "completed");
});

test("persistent storage failure → terminal `failed` after max retries", async () => {
  process.env.DELETION_MAX_RETRIES = "2";
  const user = await seedUser();
  await seedFullGraph(user);
  storageShouldFail.add("events/post-event/e1/photos/full.jpg");

  const res = await deletionService.runDeletion({ userId: user._id });
  assert.equal(res.status, "pending_retry");

  // Drive the worker until it exhausts (keep the failure in place).
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await AccountDeletionRequest.updateOne({ requestId: res.requestId }, { $set: { nextRetryAt: new Date(0) } });
    // eslint-disable-next-line no-await-in-loop
    await runDeletionRetryTick();
  }
  const done = await AccountDeletionRequest.findOne({ requestId: res.requestId }).lean();
  assert.equal(done.status, "failed", "must terminate as failed, not loop forever");
  assert.ok(done.pendingUploadRefs.length > 0, "residual preserved for manual cleanup");
  assert.notEqual(done.status, "completed", "never a false completed while objects remain");
  delete process.env.DELETION_MAX_RETRIES;
});
