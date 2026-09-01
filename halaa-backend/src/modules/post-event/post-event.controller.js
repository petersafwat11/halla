/**
 * Post-Event Content Controller
 * HTTP request handling for post-event content.
 * @module modules/post-event/post-event.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const postEventService = require("./post-event.service");
const moderationService = require("../moderation/moderation.service");

// ── Guest UGC moderation (§6): policy acceptance, report, block ─────────────
exports.guestPolicies = catchAsync(async (req, res) => {
  const result = await moderationService.getPolicyStatus(
    "guest",
    req.guestUser.guestId
  );
  sendSuccess(res, result);
});

exports.guestAcceptPolicies = catchAsync(async (req, res) => {
  const result = await moderationService.acceptPolicies(
    "guest",
    req.guestUser.guestId,
    { documents: req.body?.documents, locale: req.body?.locale, ip: req.ip }
  );
  sendSuccess(res, result, "Accepted");
});

exports.guestReport = catchAsync(async (req, res) => {
  const result = await moderationService.createReport({
    reporterType: "guest",
    reporterId: req.guestUser.guestId,
    ...req.body,
    contextEventId: req.params.eventId,
  });
  sendSuccess(res, result, "Report submitted", 201);
});

exports.guestBlock = catchAsync(async (req, res) => {
  const result = await moderationService.block("guest", req.guestUser.guestId, {
    ...req.body,
    contextEventId: req.params.eventId,
  });
  sendSuccess(res, result, "Blocked");
});

exports.guestUnblock = catchAsync(async (req, res) => {
  const result = await moderationService.unblock(
    "guest",
    req.guestUser.guestId,
    req.body
  );
  sendSuccess(res, result, "Unblocked");
});

/**
 * Validate guest access token.
 * GET /api/v2/post-event/validate?token=xxx
 *
 * Returns 410 Gone for rotated / revoked / expired tokens. The structured
 * `reason` field in `err.body` is bubbled into the response by
 * `globalErrorHandler` so the frontend can render the right message.
 */
exports.validateToken = catchAsync(async (req, res) => {
  const result = await postEventService.validateGuestToken(req.query.token);
  sendSuccess(res, result);
});

/**
 * Get published post-event content for a guest (token-authenticated).
 * Uses `getGuestContent` → model `getForGuest`, which returns the caption,
 * media gallery, and post-level like/comment counts + the guest's own like
 * state.
 */
exports.getContent = catchAsync(async (req, res) => {
  const result = await postEventService.getGuestContent(
    req.params.eventId,
    req.guestUser.guestId
  );
  sendSuccess(res, result);
});

exports.getHostContent = catchAsync(async (req, res) => {
  const result = await postEventService.getPostEventContent(
    req.params.eventId,
    req.user
  );
  sendSuccess(res, result);
});

/**
 * Upload one or more media files (photos and/or videos) — unified endpoint.
 * POST /api/v2/post-event/:eventId/media
 */
exports.uploadMedia = catchAsync(async (req, res) => {
  const result = await postEventService.uploadMedia(
    req.params.eventId,
    req.files,
    req.user
  );
  sendSuccess(res, result, "Media uploaded successfully");
});

/**
 * Delete a media item by id (works for photos and videos).
 * DELETE /api/v2/post-event/:eventId/media/:mediaId
 */
exports.deleteMedia = catchAsync(async (req, res) => {
  await postEventService.deleteMedia(
    req.params.eventId,
    req.params.mediaId,
    req.user
  );
  sendDeleted(res, "Media deleted");
});

/**
 * Update thank you message.
 * PATCH /api/v2/post-event/:eventId/thank-you
 */
exports.updateThankYouMessage = catchAsync(async (req, res) => {
  const result = await postEventService.updateThankYouMessage(
    req.params.eventId,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Thank you message updated");
});

/**
 * Save the host's chosen Taqnyat WhatsApp template for access-link
 * dispatch (StepFour pattern).
 * PATCH /api/v2/post-event/:eventId/messaging
 */
exports.updateMessagingTemplate = catchAsync(async (req, res) => {
  const result = await postEventService.updateMessagingTemplate(
    req.params.eventId,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Messaging template updated");
});

/**
 * Publish post-event content to guests.
 * POST /api/v2/post-event/:eventId/publish
 */
exports.publishContent = catchAsync(async (req, res) => {
  const result = await postEventService.publishContent(
    req.params.eventId,
    req.user
  );
  sendSuccess(res, result, "Content published successfully");
});

/**
 * Unpublish (revoke) post-event content.
 * PATCH /api/v2/post-event/:eventId/unpublish
 */
exports.unpublishContent = catchAsync(async (req, res) => {
  const result = await postEventService.unpublishContent(
    req.params.eventId,
    req.user
  );
  sendSuccess(res, result, "Content unpublished successfully");
});

/**
 * Toggle like on a media item.
 * POST /api/v2/post-event/:eventId/posts/:postId/like
 */
exports.toggleLike = catchAsync(async (req, res) => {
  const result = await postEventService.toggleLike(
    req.params.eventId,
    req.params.postId,
    req.guestUser
  );
  sendSuccess(res, result);
});

/**
 * Add comment to a media item.
 * POST /api/v2/post-event/:eventId/posts/:postId/comments
 */
exports.addComment = catchAsync(async (req, res) => {
  const result = await postEventService.addComment(
    req.params.eventId,
    req.params.postId,
    req.body,
    req.files,
    req.guestUser
  );
  sendSuccess(res, result, "Comment added");
});

/**
 * Get comments for a media item (paginated).
 * GET /api/v2/post-event/:eventId/posts/:postId/comments
 */
exports.getComments = catchAsync(async (req, res) => {
  const result = await postEventService.getComments(
    req.params.eventId,
    req.params.postId,
    { page: req.query.page, limit: req.query.limit },
    req.guestUser
  );
  sendSuccess(res, result);
});

/**
 * Toggle the guest's like on the post (one post per event).
 * POST /api/v2/post-event/:eventId/like
 */
exports.togglePostLike = catchAsync(async (req, res) => {
  const result = await postEventService.togglePostLike(
    req.params.eventId,
    req.guestUser
  );
  sendSuccess(res, result);
});

/**
 * Add a comment to the post (one post per event). Supports image attachments.
 * POST /api/v2/post-event/:eventId/comments
 */
exports.addPostComment = catchAsync(async (req, res) => {
  const result = await postEventService.addPostComment(
    req.params.eventId,
    req.body,
    req.files,
    req.guestUser
  );
  sendSuccess(res, result, "Comment added");
});

/**
 * Get comments for the post (paginated).
 * GET /api/v2/post-event/:eventId/comments
 */
exports.getPostComments = catchAsync(async (req, res) => {
  const result = await postEventService.getPostComments(
    req.params.eventId,
    { page: req.query.page, limit: req.query.limit },
    req.guestUser
  );
  sendSuccess(res, result);
});

/**
 * Publish post-event content AND notify the chosen audience in one action.
 * POST /api/v2/post-event/:eventId/publish-and-notify
 */
exports.publishAndNotify = catchAsync(async (req, res) => {
  const attemptId = req.get('idempotency-key');
  const result = await postEventService.publishAndNotify(
    req.params.eventId,
    req.user,
    { ...req.body, attemptId }
  );
  sendSuccess(res, result, "Content published and guests notified");
});

/**
 * Generate bulk access tokens for guests.
 * POST /api/v2/post-event/:eventId/generate-tokens
 */
exports.generateBulkTokens = catchAsync(async (req, res) => {
  const result = await postEventService.generateBulkTokens(
    req.params.eventId,
    req.user,
    req.body
  );
  sendSuccess(res, result, "Tokens generated");
});

/**
 * Send post-event access links to guests via Taqnyat WhatsApp template
 * (with native SMS fallback).
 * POST /api/v2/post-event/:eventId/send-access-links
 */
exports.sendBulkAccessLinks = catchAsync(async (req, res) => {
  const attemptId = req.get('idempotency-key');
  const result = await postEventService.sendBulkAccessLinks(
    req.params.eventId,
    req.user,
    { ...req.body, attemptId }
  );
  sendSuccess(res, result, "Access links sent");
});
