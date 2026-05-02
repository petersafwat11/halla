/**
 * Post-Event Content Controller
 * HTTP request handling for post-event content
 * @module modules/post-event/post-event.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const postEventService = require("./post-event.service");

/**
 * Get post-event content
 * GET /api/v2/post-event/:eventId
 */
exports.getContent = catchAsync(async (req, res) => {
  const result = await postEventService.getPostEventContent(
    req.params.eventId,
    req.guestUser ? req.guestUser.guestId : req.user._id
  );
  sendSuccess(res, result);
});

/**
 * Upload photos
 * POST /api/v2/post-event/:eventId/photos
 */
exports.uploadPhotos = catchAsync(async (req, res) => {
  const result = await postEventService.uploadPhotos(
    req.params.eventId,
    req.files,
    req.user._id
  );
  sendSuccess(res, result, "Photos uploaded successfully");
});

/**
 * Upload video
 * POST /api/v2/post-event/:eventId/videos
 */
exports.uploadVideo = catchAsync(async (req, res) => {
  const result = await postEventService.uploadVideo(
    req.params.eventId,
    req.file,
    req.user._id
  );
  sendSuccess(res, result, "Video uploaded successfully");
});

/**
 * Update thank you message
 * PATCH /api/v2/post-event/:eventId/thank-you
 */
exports.updateThankYouMessage = catchAsync(async (req, res) => {
  const result = await postEventService.updateThankYouMessage(
    req.params.eventId,
    req.body,
    req.user._id
  );
  sendSuccess(res, result, "Thank you message updated");
});

/**
 * Delete photo
 * DELETE /api/v2/post-event/:eventId/photos/:photoId
 */
exports.deletePhoto = catchAsync(async (req, res) => {
  await postEventService.deletePhoto(
    req.params.eventId,
    req.params.photoId,
    req.user._id
  );
  sendDeleted(res, "Photo deleted");
});

/**
 * Delete video
 * DELETE /api/v2/post-event/:eventId/videos/:videoId
 */
exports.deleteVideo = catchAsync(async (req, res) => {
  await postEventService.deleteVideo(
    req.params.eventId,
    req.params.videoId,
    req.user._id
  );
  sendDeleted(res, "Video deleted");
});

/**
 * Publish content
 * POST /api/v2/post-event/:eventId/publish
 */
exports.publishContent = catchAsync(async (req, res) => {
  const result = await postEventService.publishContent(
    req.params.eventId,
    req.user._id
  );
  sendSuccess(res, result, "Content published successfully");
});

/**
 * Get published content for guest (legacy route)
 * GET /api/v2/post-event/:eventId/guest/:guestCode
 */
exports.getGuestContent = catchAsync(async (req, res) => {
  const result = await postEventService.getPublishedContentForGuest(
    req.params.eventId,
    req.params.guestCode
  );
  sendSuccess(res, result);
});

/**
 * Validate guest access token (Phase 3e.3 / 3e.4).
 * GET /api/v2/post-event/validate?token=xxx
 *
 * Returns 410 Gone for rotated / revoked / expired tokens, with the
 * structured `reason` in the body so the frontend can render the right
 * message ("هذا الرمز انتهت صلاحيته" vs "تم إلغاء هذا الرمز" vs ...).
 */
exports.validateToken = catchAsync(async (req, res) => {
  const { token } = req.query;
  try {
    const result = await postEventService.validateGuestToken(token);
    sendSuccess(res, result);
  } catch (err) {
    if (err && err.statusCode === 410 && err.body) {
      return res.status(410).json({ status: 'error', ...err.body });
    }
    throw err;
  }
});

/**
 * Get host content (management view)
 * GET /api/v2/post-event/:eventId
 */
exports.getHostContent = catchAsync(async (req, res) => {
  const result = await postEventService.getPostEventContent(
    req.params.eventId,
    req.user._id
  );
  sendSuccess(res, result);
});

/**
 * Toggle like on a post
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
 * Add comment to a post
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
 * Get comments for a post
 * GET /api/v2/post-event/:eventId/posts/:postId/comments
 */
exports.getComments = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await postEventService.getComments(
    req.params.eventId,
    req.params.postId,
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
  );
  sendSuccess(res, result);
});

/**
 * Generate bulk access tokens for guests
 * POST /api/v2/post-event/:eventId/generate-tokens
 */
exports.generateBulkTokens = catchAsync(async (req, res) => {
  const { guestIds, filter } = req.body;
  const result = await postEventService.generateBulkTokens(
    req.params.eventId,
    req.user._id,
    { guestIds, filter }
  );
  sendSuccess(res, result, "Tokens generated");
});

/**
 * Send post-event access emails to guests
 * POST /api/v2/post-event/:eventId/send-emails
 */
exports.sendBulkAccessEmails = catchAsync(async (req, res) => {
  const { guestIds, filter } = req.body;
  const result = await postEventService.sendBulkAccessEmails(
    req.params.eventId,
    req.user._id,
    { guestIds, filter }
  );
  sendSuccess(res, result, "Emails sent");
});
