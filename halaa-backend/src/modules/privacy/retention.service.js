const crypto = require("crypto");
const mongoose = require("mongoose");
const Payment = require("../../../models/PaymentModel");
const Subscription = require("../../../models/SubscriptionModel");
const AuditLog = require("../../../models/AuditLogModel");
const BusinessPlanAssignment = require("../../../models/BusinessPlanAssignmentModel");
const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const LegalHold = require("../../../models/LegalHoldModel");
const RetentionRun = require("../../../models/RetentionRunModel");
const operations = require("../../shared/legal/privacyOperations.generated.json");
const logger = require("../../shared/utils/logger");

const MODELS = { Payment, Subscription, RevenueCatEvent, AuditLog, BusinessPlanAssignment };
const DEFAULT_BATCH = 250;
const MAX_BATCH = 1000;

const sanitizeError = (error) => String(error?.message || error || "unknown error").slice(0, 500);
const activeHoldFilter = (collection, now) => ({
  targetCollection: collection,
  active: true,
  startsAt: { $lte: now },
  $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
});

function buildEligibility(rule, cutoff) {
  const dateOperator = rule.retentionAnchor === "end_of_calendar_year" ? "$lt" : "$lte";
  const terminal = { [rule.triggerField]: { [dateOperator]: cutoff } };
  if (rule.eligibleStatuses?.length) terminal.status = { $in: rule.eligibleStatuses };
  if (!rule.deletionTriggerField) return terminal;
  return { $or: [terminal, { [rule.deletionTriggerField]: { [dateOperator]: cutoff } }] };
}

function cutoffFor(rule, now) {
  if (rule.durationYears) {
    if (rule.retentionAnchor === "end_of_calendar_year") {
      return new Date(Date.UTC(now.getUTCFullYear() - rule.durationYears, 0, 1));
    }
    const cutoff = new Date(now);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - rule.durationYears);
    return cutoff;
  }
  return new Date(now.getTime() - rule.durationDays * 24 * 60 * 60 * 1000);
}

async function holdsFor(rule, now) {
  const holds = await LegalHold.find(activeHoldFilter(rule.collection, now)).lean();
  return {
    entireCollection: holds.some((hold) => hold.scopeType === "collection"),
    documentIds: holds.filter((hold) => hold.scopeType === "document").map((hold) => hold.documentId).filter(Boolean),
    subjectIds: holds.filter((hold) => hold.scopeType === "subject").map((hold) => hold.subjectId).filter(Boolean),
  };
}

async function processRule(rule, { now, dryRun, batchSize }) {
  const Model = MODELS[rule.model];
  if (!Model) throw new Error(`retention model not registered: ${rule.model}`);
  const cutoff = cutoffFor(rule, now);
  const base = buildEligibility(rule, cutoff);
  const holds = await holdsFor(rule, now);
  const totalEligible = await Model.countDocuments(base);

  if (holds.entireCollection) {
    return { ruleId: rule.id, targetCollection: rule.collection, cutoff, scanned: 0, eligible: totalEligible, held: totalEligible, processed: 0, hasMore: false, skippedReason: "collection_legal_hold" };
  }

  const query = { ...base };
  const exclusions = [];
  if (holds.documentIds.length) exclusions.push({ _id: { $nin: holds.documentIds } });
  if (holds.subjectIds.length && rule.subjectField) exclusions.push({ [rule.subjectField]: { $nin: holds.subjectIds } });
  if (exclusions.length) query.$and = exclusions;

  const projection = { _id: 1, [rule.triggerField]: 1 };
  if (rule.subjectField) projection[rule.subjectField] = 1;
  const candidates = await Model.find(query).select(projection).sort({ [rule.triggerField]: 1, _id: 1 }).limit(batchSize + 1).lean();
  const hasMore = candidates.length > batchSize;
  const batch = candidates.slice(0, batchSize);
  const held = Math.max(0, totalEligible - await Model.countDocuments(query));
  let processed = 0;

  if (!dryRun && batch.length) {
    const result = await Model.collection.deleteMany({ _id: { $in: batch.map((item) => item._id) } });
    processed = result.deletedCount || 0;
  }

  return {
    ruleId: rule.id,
    targetCollection: rule.collection,
    cutoff,
    scanned: batch.length,
    eligible: totalEligible,
    held,
    processed: dryRun ? 0 : processed,
    hasMore,
  };
}

async function runRetention({ dryRun = true, batchSize = DEFAULT_BATCH, now = new Date(), continueOnError = true } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("invalid retention now date");
  const boundedBatch = Math.min(MAX_BATCH, Math.max(1, Number(batchSize) || DEFAULT_BATCH));
  const runId = crypto.randomUUID();
  const run = await RetentionRun.create({
    runId,
    mode: dryRun ? "dry_run" : "execute",
    policyHash: operations.policyHash,
    batchSize: boundedBatch,
    startedAt: now,
  });
  const results = [];
  let failed = false;

  try {
    for (const rule of operations.retentionRules) {
      try {
        // eslint-disable-next-line no-await-in-loop
        results.push(await processRule(rule, { now, dryRun, batchSize: boundedBatch }));
      } catch (error) {
        failed = true;
        results.push({ ruleId: rule.id, targetCollection: rule.collection, error: sanitizeError(error) });
        if (!continueOnError) throw error;
      }
    }
    run.status = failed ? "failed" : "completed";
    run.results = results;
    run.completedAt = new Date();
    if (failed) run.error = "one or more retention rules failed";
    await run.save();
    logger.info("[privacy.retention] run complete", { runId, mode: run.mode, status: run.status, policyHash: operations.policyHash });
    return run.toObject();
  } catch (error) {
    run.status = "failed";
    run.error = sanitizeError(error);
    run.results = results;
    run.completedAt = new Date();
    await run.save().catch(() => {});
    throw error;
  }
}

async function createLegalHold(input) {
  return LegalHold.create(input);
}

async function releaseLegalHold(id, { releasedBy = null } = {}) {
  if (!mongoose.isValidObjectId(id)) return null;
  return LegalHold.findOneAndUpdate(
    { _id: id, active: true },
    { $set: { active: false, releasedAt: new Date(), releasedBy } },
    { new: true }
  );
}

module.exports = { runRetention, createLegalHold, releaseLegalHold, buildEligibility, cutoffFor, _private: { processRule, holdsFor } };
