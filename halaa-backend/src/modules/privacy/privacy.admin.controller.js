const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const ProcessorErasure = require("../../../models/ProcessorErasureModel");
const RetentionRun = require("../../../models/RetentionRunModel");
const LegalHold = require("../../../models/LegalHoldModel");
const operations = require("../../shared/legal/privacyOperations.generated.json");
const retention = require("./retention.service");
const { logAudit } = require("../../shared/utils/auditLog");

const PROCESSOR_FINAL = ["acknowledged", "not_applicable", "retained_by_policy"];
const PROCESSOR_ALL = ["pending", "requested", "acknowledged", "not_applicable", "retained_by_policy", "failed"];

exports.getPolicy = catchAsync(async (_req, res) => sendSuccess(res, {
  policyVersion: operations.policyVersion,
  policyHash: operations.policyHash,
  ownerApproval: operations.ownerApproval,
  counselStatus: operations.counselStatus,
  retentionRules: operations.retentionRules,
  processors: operations.processors,
}));

exports.listRetentionRuns = catchAsync(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const rows = await RetentionRun.find({}).sort({ startedAt: -1 }).limit(limit).lean();
  sendSuccess(res, { runs: rows });
});

exports.runRetention = catchAsync(async (req, res) => {
  const execute = req.body?.execute === true;
  if (execute && req.body?.policyHash !== operations.policyHash) {
    throw new ValidationError("Executing retention requires the current policyHash");
  }
  const run = await retention.runRetention({ dryRun: !execute, batchSize: req.body?.batchSize });
  await logAudit({ action: "privacy.retention_run", actor: req.user, targetType: "system", metadata: { runId: run.runId, mode: run.mode, policyHash: run.policyHash, status: run.status } });
  sendSuccess(res, { run });
});

exports.listLegalHolds = catchAsync(async (_req, res) => {
  const holds = await LegalHold.find({}).sort({ createdAt: -1 }).limit(500).lean();
  sendSuccess(res, { holds });
});

exports.createLegalHold = catchAsync(async (req, res) => {
  const hold = await retention.createLegalHold({ ...req.body, createdBy: req.user._id });
  await logAudit({ action: "privacy.legal_hold_created", actor: req.user, targetType: "system", metadata: { holdId: hold._id, targetCollection: hold.targetCollection, scopeType: hold.scopeType, reference: hold.reference } });
  sendSuccess(res, { hold }, "Legal hold created");
});

exports.releaseLegalHold = catchAsync(async (req, res) => {
  const hold = await retention.releaseLegalHold(req.params.id, { releasedBy: req.user._id });
  if (!hold) throw new NotFoundError("Legal hold");
  await logAudit({ action: "privacy.legal_hold_released", actor: req.user, targetType: "system", metadata: { holdId: hold._id, targetCollection: hold.targetCollection } });
  sendSuccess(res, { hold }, "Legal hold released");
});

exports.listProcessorErasures = catchAsync(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.processor) query.processor = req.query.processor;
  const rows = await ProcessorErasure.find(query).sort({ createdAt: -1 }).limit(500).lean();
  sendSuccess(res, { obligations: rows });
});

exports.resolveProcessorErasure = catchAsync(async (req, res) => {
  const status = req.body?.status;
  if (!PROCESSOR_ALL.includes(status)) throw new ValidationError("Invalid processor erasure status");
  const row = await ProcessorErasure.findByIdAndUpdate(
    req.params.id,
    { $set: { status, reason: req.body?.reason || null, lastError: status === "failed" ? req.body?.lastError || "manual failure" : null, resolvedAt: PROCESSOR_FINAL.includes(status) ? new Date() : null }, $inc: { attempts: 1 } },
    { new: true, runValidators: true }
  );
  if (!row) throw new NotFoundError("Processor erasure obligation");
  await logAudit({ action: "privacy.processor_erasure_updated", actor: req.user, targetType: "system", metadata: { obligationId: row._id, processor: row.processor, status: row.status } });
  sendSuccess(res, { obligation: row });
});
