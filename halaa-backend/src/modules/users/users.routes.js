/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Self-profile, password, phone, image, and notification-preferences endpoints
 */

const express = require("express");
const router = express.Router();

const usersController = require("./users.controller");
const { protect } = require("../../shared/middleware/auth");
const {
  validateZod,
  parseFormDataJsonFields,
} = require("../../shared/middleware/validation");
const { uploadUserProfile } = require("../../shared/utils/s3Upload");
const {
  otpLimiter,
  otpHourlyLimiter,
  uploadLimiter,
  deletionLimiter,
} = require("../../shared/middleware/rateLimiter");
const { AppError } = require("../../shared/errors");
const {
  updatePasswordSchema,
  updateProfileSchema,
  profileSectionParamSchema,
  getSectionSchema,
  updateNotificationPreferencesSchema,
  sendPhoneOtpSchema,
  updatePhoneSchema,
  deleteImageSchema,
} = require("./users.validation");

// Public (no auth): deletion-status lookup by unguessable requestId. The
// /delete-account page + app poll this after the session is gone (§4.1/§4.3).
router.get("/deletion-status/:requestId", usersController.getDeletionStatus);

router.use(protect);

router.get("/profile", usersController.getMyProfile);

/**
 * GET /users/pre-deletion-info
 * Pre-deletion warning info: active store (IAP) subscription flag + the
 * store-manager URLs + the retention disclosure (§4.2).
 */
router.get("/pre-deletion-info", usersController.getPreDeletionInfo);

/**
 * POST /users/pre-deletion-otp
 * Sends a reauth OTP to the current user's verified phone (password-less
 * accounts) before deletion. OTP rate-limited.
 */
router.post(
  "/pre-deletion-otp",
  otpLimiter,
  otpHourlyLimiter,
  usersController.sendDeletionOtp
);

/**
 * PATCH /users/profile
 * Top-level user fields only: name, email, preferredLanguage.
 * Avatar/businessLogo can be uploaded via multipart. Phone is NOT here —
 * use the OTP-gated phone routes below.
 */
router.patch(
  "/profile",
  uploadLimiter,
  uploadUserProfile,
  validateZod(updateProfileSchema),
  usersController.updateMyProfile
);

router.patch(
  "/password",
  validateZod(updatePasswordSchema),
  usersController.updateMyPassword
);

/**
 * DELETE /users/profile
 * Self-service account deletion (Apple 5.1.1(v) / Google Play data-deletion).
 * REAUTHENTICATED — body carries `{ password }` or `{ otp }` (§4.1). Idempotent;
 * returns `{ requestId, status }`. Anonymizes the user's PII + nested profile,
 * third-party guest names/phones, post-event media/comments, vendor services,
 * support tickets, notifications, and all S3 assets; revokes every session
 * (issued access JWTs also stop working via the protect DELETED-status check);
 * retains only the pseudonymized legal/accounting rows in the retention matrix.
 */
router.delete("/profile", deletionLimiter, usersController.deleteMyAccount);

/**
 * POST /users/profile/phone/send-otp
 * Sends an SMS OTP to a candidate new phone number. The number is validated
 * and checked for uniqueness before the OTP is sent.
 */
router.post(
  "/profile/phone/send-otp",
  otpLimiter,
  otpHourlyLimiter,
  validateZod(sendPhoneOtpSchema),
  usersController.sendPhoneChangeOtp
);

/**
 * PATCH /users/profile/phone
 * Verifies the OTP and commits the new phone number to the user record.
 */
router.patch(
  "/profile/phone",
  validateZod(updatePhoneSchema),
  usersController.updatePhone
);

/**
 * DELETE /users/profile/vendorData/image
 * Removes a single image from a vendor's profile and deletes the underlying
 * S3 object. For array fields the request body must include the `key` to
 * identify which element to remove.
 */
router.delete(
  "/profile/vendorData/image",
  validateZod(deleteImageSchema),
  usersController.deleteVendorImage
);

/**
 * PATCH /users/profile/:section
 *
 * The body schema is chosen per section. Unknown keys are rejected to
 * surface client/server contract drift early.
 */
const validateSectionBody = (req, res, next) => {
  try {
    const schema = getSectionSchema(req.params.section);
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join(", ");
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

router.patch(
  "/profile/:section",
  uploadLimiter,
  uploadUserProfile,
  parseFormDataJsonFields([
    "serviceCategories",
    "serviceLocation",
    "socialLinks",
  ]),
  validateZod(profileSectionParamSchema, "params"),
  validateSectionBody,
  usersController.updateMyProfileSection
);

router
  .route("/notification-preferences")
  .get(usersController.getNotificationPreferences)
  .patch(
    validateZod(updateNotificationPreferencesSchema),
    usersController.updateNotificationPreferences
  );

module.exports = router;
