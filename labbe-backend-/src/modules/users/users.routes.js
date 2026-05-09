/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Self-profile, password, and notification-preferences endpoints
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
  updatePasswordSchema,
  updateProfileSchema,
  profileSectionParamSchema,
  updateProfileSectionSchema,
  updateNotificationPreferencesSchema,
} = require("./users.validation");

router.use(protect);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get my profile
 *     description: Get current user's complete profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/profile", usersController.getMyProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update my profile
 *     description: Update current user's profile. Multipart accepts avatar/businessLogo files and a JSON-stringified `profile` field.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/profile",
  uploadUserProfile,
  parseFormDataJsonFields(["profile"]),
  validateZod(updateProfileSchema),
  usersController.updateMyProfile
);

/**
 * @swagger
 * /users/password:
 *   patch:
 *     summary: Update my password
 *     description: Update current user's password. `passwordConfirm` must equal `newPassword`.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordInput'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/password",
  validateZod(updatePasswordSchema),
  usersController.updateMyPassword
);

/**
 * @swagger
 * /users/profile/{section}:
 *   patch:
 *     summary: Update profile section
 *     description: Update a specific profile section. Multipart fields `serviceCategories`, `serviceLocation`, `socialLinks`, `pricePackages`, `portfolioImages` may be JSON-stringified.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hostData, vendorData, businessInfo, contactInfo, documents]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileSectionInput'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileSectionInput'
 *     responses:
 *       200:
 *         description: Profile section updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/profile/:section",
  uploadUserProfile,
  parseFormDataJsonFields([
    "serviceCategories",
    "serviceLocation",
    "socialLinks",
    "pricePackages",
    "portfolioImages",
  ]),
  validateZod(profileSectionParamSchema, "params"),
  validateZod(updateProfileSectionSchema),
  usersController.updateMyProfileSection
);

/**
 * @swagger
 * /users/notification-preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Get the current user's notification preferences.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferencesEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   patch:
 *     summary: Update notification preferences
 *     description: Update the current user's notification preferences.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferencesUpdateInput'
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferencesEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router
  .route("/notification-preferences")
  .get(usersController.getNotificationPreferences)
  .patch(
    validateZod(updateNotificationPreferencesSchema),
    usersController.updateNotificationPreferences
  );

module.exports = router;
