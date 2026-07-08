/**
 * Express middleware (SHIP §6): block a UGC-creating action until the
 * authenticated user has accepted the current Terms + Community Rules. Returns
 * 403 UGC_TERMS_REQUIRED (with the required docs) so the client can surface the
 * acceptance prompt. Mount on user UGC-creation routes (e.g. post-event media
 * upload). Guests are gated inside the post-event service instead.
 */

const moderationService = require("./moderation.service");
const catchAsync = require("../../shared/utils/catchAsync");

const requireUserUgcTerms = catchAsync(async (req, res, next) => {
  await moderationService.assertUgcTermsAccepted("user", req.user._id);
  next();
});

module.exports = { requireUserUgcTerms };
