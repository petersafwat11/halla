const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const moderationService = require("./moderation.service");

// ── Policy acceptance (authenticated user) ─────────────────────────────────
exports.getPolicies = catchAsync(async (req, res) => {
  const result = await moderationService.getPolicyStatus("user", req.user._id);
  sendSuccess(res, result);
});

exports.acceptPolicies = catchAsync(async (req, res) => {
  const result = await moderationService.acceptPolicies("user", req.user._id, {
    documents: req.body?.documents,
    locale: req.body?.locale || req.user.preferredLanguage,
    ip: req.ip,
  });
  sendSuccess(res, result, "Policies accepted");
});

// ── Reporting ──────────────────────────────────────────────────────────────
exports.report = catchAsync(async (req, res) => {
  const result = await moderationService.createReport({
    reporterType: "user",
    reporterId: req.user._id,
    ...req.body,
  });
  sendSuccess(res, result, "Report submitted", 201);
});

// ── Blocking ───────────────────────────────────────────────────────────────
exports.block = catchAsync(async (req, res) => {
  const result = await moderationService.block("user", req.user._id, req.body);
  sendSuccess(res, result, "Blocked");
});

exports.unblock = catchAsync(async (req, res) => {
  const result = await moderationService.unblock("user", req.user._id, req.body);
  sendSuccess(res, result, "Unblocked");
});

exports.listBlocks = catchAsync(async (req, res) => {
  const result = await moderationService.listBlocks("user", req.user._id);
  sendSuccess(res, result);
});

// ── Host approve/reject of pending guest comments ──────────────────────────
exports.listPendingComments = catchAsync(async (req, res) => {
  const result = await moderationService.listPendingForHost(
    req.user._id,
    req.params.eventId
  );
  sendSuccess(res, result);
});

exports.setCommentApproval = catchAsync(async (req, res) => {
  const result = await moderationService.setCommentApproval(
    req.user._id,
    req.params.eventId,
    req.params.commentId,
    req.body.approve
  );
  sendSuccess(res, result, "Updated");
});

// ── Staff moderation queue ─────────────────────────────────────────────────
exports.listReports = catchAsync(async (req, res) => {
  const result = await moderationService.listReports({
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  });
  sendSuccess(res, result);
});

exports.getReport = catchAsync(async (req, res) => {
  const result = await moderationService.getReport(req.params.id);
  sendSuccess(res, result);
});

exports.actOnReport = catchAsync(async (req, res) => {
  const result = await moderationService.actOnReport(req.params.id, {
    action: req.body.action,
    note: req.body.note,
    by: req.user._id,
  });
  sendSuccess(res, result, "Report actioned");
});
