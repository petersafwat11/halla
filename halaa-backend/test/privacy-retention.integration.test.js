const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");
const Payment = require("../models/PaymentModel");
const Subscription = require("../models/SubscriptionModel");
const AuditLog = require("../models/AuditLogModel");
const BusinessPlanAssignment = require("../models/BusinessPlanAssignmentModel");
const RevenueCatEvent = require("../models/RevenueCatEventModel");
const LegalHold = require("../models/LegalHoldModel");
const RetentionRun = require("../models/RetentionRunModel");
const { runRetention, createLegalHold, releaseLegalHold } = require("../src/modules/privacy/retention.service");
const operations = require("../src/shared/legal/privacyOperations.generated.json");

const NOW = new Date("2035-01-01T00:00:00.000Z");
const old6y = new Date("2028-01-01T00:00:00.000Z");
const old2y = new Date("2032-01-01T00:00:00.000Z");
const recent = new Date("2034-06-01T00:00:00.000Z");

test.before(async () => db.start());
test.after(async () => db.stop());
test.beforeEach(async () => db.clearAll());

async function seed() {
  const heldSubject = new mongoose.Types.ObjectId();
  const ordinarySubject = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();
  const oldPayment = await Payment.collection.insertOne({ userId: ordinarySubject, amount: 10, status: "paid", createdAt: old6y, updatedAt: old6y });
  await Payment.collection.insertOne({ userId: ordinarySubject, amount: 10, status: "pending", createdAt: old6y, updatedAt: old6y });
  await Payment.collection.insertOne({ userId: ordinarySubject, amount: 10, status: "paid", createdAt: recent, updatedAt: recent });
  const heldPayment = await Payment.collection.insertOne({ userId: heldSubject, amount: 10, status: "paid", createdAt: old6y, updatedAt: old6y });

  const oldSub = await Subscription.collection.insertOne({ userId: ordinarySubject, planId, status: "expired", updatedAt: old6y, createdAt: old6y });
  await Subscription.collection.insertOne({ userId: ordinarySubject, planId, status: "active", updatedAt: old6y, createdAt: old6y });
  await Subscription.collection.insertOne({ userId: ordinarySubject, planId, status: "expired", updatedAt: recent, createdAt: recent });

  const oldAudit = await AuditLog.collection.insertOne({ action: "old", performedBy: ordinarySubject, timestamp: old2y, status: "success" });
  await AuditLog.collection.insertOne({ action: "recent", performedBy: ordinarySubject, timestamp: recent, status: "success" });

  const oldAssignment = await BusinessPlanAssignment.collection.insertOne({ businessUserId: ordinarySubject, planId, mode: "grant", status: "expired", createdAt: old6y, updatedAt: old6y });
  await BusinessPlanAssignment.collection.insertOne({ businessUserId: ordinarySubject, planId, mode: "grant", status: "pending_payment", createdAt: old6y, updatedAt: old6y });

  return { heldSubject, ordinarySubject, oldPayment: oldPayment.insertedId, heldPayment: heldPayment.insertedId, oldSub: oldSub.insertedId, oldAudit: oldAudit.insertedId, oldAssignment: oldAssignment.insertedId };
}

test("generated operations contract has exact approved rules and hash", () => {
  assert.equal(operations.ownerApproval, "OWNER_APPROVED");
  assert.match(operations.policyHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(operations.retentionRules.map((r) => [r.collection, r.durationYears]), [
    ["payments", 6], ["subscriptions", 6], ["revenuecatevents", 6], ["auditlogs", 2], ["businessplanassignments", 6],
  ]);
  assert.equal(operations.retentionRules.find((r) => r.collection === "payments").triggerField, "updatedAt");
  assert.equal(operations.retentionRules.find((r) => r.collection === "businessplanassignments").eligibleStatuses.includes("active"), false);
});

test("dry-run reports eligible rows but never mutates data", async () => {
  await seed();
  const before = await Promise.all([Payment.countDocuments(), Subscription.countDocuments(), AuditLog.countDocuments(), BusinessPlanAssignment.countDocuments()]);
  const run = await runRetention({ dryRun: true, now: NOW, batchSize: 100 });
  const after = await Promise.all([Payment.countDocuments(), Subscription.countDocuments(), AuditLog.countDocuments(), BusinessPlanAssignment.countDocuments()]);
  assert.deepEqual(after, before);
  assert.equal(run.mode, "dry_run");
  assert.equal(run.status, "completed");
  assert.ok(run.results.every((r) => r.processed === 0));
  assert.equal(await RetentionRun.countDocuments({ runId: run.runId }), 1);
});

test("execute purges only expired terminal records and is idempotent", async () => {
  const ids = await seed();
  const first = await runRetention({ dryRun: false, now: NOW, batchSize: 100 });
  assert.equal(first.status, "completed");
  assert.equal(await Payment.collection.countDocuments({ _id: ids.oldPayment }), 0);
  assert.equal(await Payment.collection.countDocuments({ _id: ids.heldPayment }), 0);
  assert.equal(await Subscription.collection.countDocuments({ _id: ids.oldSub }), 0);
  assert.equal(await AuditLog.collection.countDocuments({ _id: ids.oldAudit }), 0);
  assert.equal(await BusinessPlanAssignment.collection.countDocuments({ _id: ids.oldAssignment }), 0);
  assert.equal(await Payment.countDocuments(), 2, "old pending and recent paid remain");
  assert.equal(await Subscription.countDocuments(), 2, "old active and recent expired remain");
  assert.equal(await AuditLog.countDocuments(), 1);
  assert.equal(await BusinessPlanAssignment.countDocuments(), 1, "actionable assignment remains");

  const second = await runRetention({ dryRun: false, now: NOW, batchSize: 100 });
  assert.ok(second.results.every((r) => r.processed === 0));
});

test("document, subject and collection legal holds prevent purge until released", async () => {
  const ids = await seed();
  const documentHold = await createLegalHold({ targetCollection: "payments", scopeType: "document", documentId: ids.oldPayment, reason: "chargeback case" });
  await createLegalHold({ targetCollection: "payments", scopeType: "subject", subjectId: ids.heldSubject, reason: "fraud investigation" });
  const collectionHold = await createLegalHold({ targetCollection: "auditlogs", scopeType: "collection", reason: "security investigation" });

  const first = await runRetention({ dryRun: false, now: NOW, batchSize: 100 });
  assert.equal(await Payment.collection.countDocuments({ _id: ids.oldPayment }), 1);
  assert.equal(await Payment.collection.countDocuments({ _id: ids.heldPayment }), 1);
  assert.equal(await AuditLog.collection.countDocuments({ _id: ids.oldAudit }), 1);
  assert.equal(first.results.find((r) => r.targetCollection === "auditlogs").skippedReason, "collection_legal_hold");

  await releaseLegalHold(documentHold._id);
  await releaseLegalHold(collectionHold._id);
  await LegalHold.updateMany({ targetCollection: "payments", scopeType: "subject" }, { $set: { active: false, releasedAt: NOW } });
  await runRetention({ dryRun: false, now: NOW, batchSize: 100 });
  assert.equal(await Payment.collection.countDocuments({ _id: ids.oldPayment }), 0);
  assert.equal(await Payment.collection.countDocuments({ _id: ids.heldPayment }), 0);
  assert.equal(await AuditLog.collection.countDocuments({ _id: ids.oldAudit }), 0);
});

test("bounded batches expose hasMore and converge safely", async () => {
  const userId = new mongoose.Types.ObjectId();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Payment.collection.insertOne({ userId, amount: 1, status: "paid", createdAt: old6y, updatedAt: old6y });
  }
  const first = await runRetention({ dryRun: false, now: NOW, batchSize: 2 });
  assert.equal(first.results.find((r) => r.targetCollection === "payments").hasMore, true);
  assert.equal(await Payment.countDocuments(), 1);
  await runRetention({ dryRun: false, now: NOW, batchSize: 2 });
  assert.equal(await Payment.countDocuments(), 0);
});

test("deleted-account marker becomes eligible even when the billing state never became terminal", async () => {
  const userId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();
  await Subscription.collection.insertOne({
    userId, planId, status: "active", createdAt: old6y, updatedAt: recent,
    privacySubjectDeletedAt: old6y,
  });
  await RevenueCatEvent.collection.insertOne({
    eventId: "privacy-deleted-manual-review", type: "TEST", status: "manual_review",
    userId, createdAt: old6y, updatedAt: recent, privacySubjectDeletedAt: old6y,
  });
  await runRetention({ dryRun: false, now: NOW, batchSize: 100 });
  assert.equal(await Subscription.countDocuments({ userId }), 0);
  assert.equal(await RevenueCatEvent.countDocuments({ userId }), 0);
});
