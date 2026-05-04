/**
 * Users Routes
 * Route definitions for user management module
 * @module modules/users/users.routes
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints for hosts, vendors, and moderators
 */

const express = require("express");
const router = express.Router();

// Controller
const usersController = require("./users.controller");

// Middleware (using existing during migration)
const { protect } = require("../../shared/middleware/auth");
const {
  requirePageAccess,
} = require("../../shared/middleware/rbac");
const { whitelabelIsolation } = require("../../shared/middleware/whitelabel");
const { validateObjectId } = require("../../shared/middleware/validation");

const { ROLES, ADMIN_PAGES } = require("../../shared/constants");

// Use centralized S3 upload utility
const { uploadUserProfile } = require("../../shared/utils/s3Upload");

// All routes require authentication
router.use(protect);

// ============================================
// USER PROFILE ROUTES (Role-aware - works for all roles)
// ============================================

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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/profile", usersController.getMyProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Update current user's profile with optional photo upload
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/profile", uploadUserProfile, usersController.updateMyProfile);

// FLOW-07-F01: Phone number update via OTP (2-step)
router.post("/phone/request-update", usersController.requestPhoneUpdate);
router.patch("/phone", usersController.confirmPhoneUpdate);

/**
 * @swagger
 * /users/password:
 *   patch:
 *     summary: Update my password
 *     description: Update current user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/password", usersController.updateMyPassword);

/**
 * @swagger
 * /users/profile/{section}:
 *   patch:
 *     summary: Update profile section
 *     description: Update specific profile section (personal, business, preferences)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [personal, business, preferences]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile section updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/profile/:section",
  uploadUserProfile,
  usersController.updateMyProfileSection
);

// Notification preferences (role-aware - works for all roles)
/**
 * @swagger
 * /users/notification-preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Get user's notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   patch:
 *     summary: Update notification preferences
 *     description: Update user's notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router
  .route("/notification-preferences")
  .get(usersController.getNotificationPreferences)
  .patch(usersController.updateNotificationPreferences);

// ============================================
// HOST ROUTES
// ============================================

/**
 * @swagger
 * /users/hosts:
 *   get:
 *     summary: Get hosts list
 *     description: Retrieve list of hosts with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hosts retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Create host
 *     description: Create a new host user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Host created successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router
  .route("/hosts")
  .get(
    requirePageAccess(ADMIN_PAGES.HOSTS, "view"),
    whitelabelIsolation,
    usersController.getHosts
  )
  .post(
    requirePageAccess(ADMIN_PAGES.HOSTS, "create"),
    whitelabelIsolation,
    usersController.createHost
  );

/**
 * @swagger
 * /users/hosts/{id}:
 *   get:
 *     summary: Get host by ID
 *     description: Retrieve a specific host by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Host retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete host
 *     description: Delete a host by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Host deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router
  .route("/hosts/:id")
  .get(
    validateObjectId("id"),
    requirePageAccess(ADMIN_PAGES.HOSTS, "view"),
    whitelabelIsolation,
    usersController.getHostById
  )
  .delete(
    validateObjectId("id"),
    requirePageAccess(ADMIN_PAGES.HOSTS, "delete"),
    whitelabelIsolation,
    usersController.deleteHost
  );

/**
 * @swagger
 * /users/hosts/{id}/status:
 *   patch:
 *     summary: Update host status
 *     description: Update the status of a host by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Host status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/hosts/:id/status",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.HOSTS, "update"),
  whitelabelIsolation,
  usersController.updateHostStatus
);

// ============================================
// VENDOR ROUTES
// ============================================

/**
 * @swagger
 * /users/vendors:
 *   get:
 *     summary: Get vendors list
 *     description: Retrieve list of vendors
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router
  .route("/vendors")
  .get(
    requirePageAccess(ADMIN_PAGES.VENDORS, "view"),
    whitelabelIsolation,
    usersController.getVendors
  );

/**
 * @swagger
 * /users/vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve a specific vendor by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router
  .route("/vendors/:id")
  .get(
    validateObjectId("id"),
    requirePageAccess(ADMIN_PAGES.VENDORS, "view"),
    whitelabelIsolation,
    usersController.getVendorById
  );

/**
 * @swagger
 * /users/vendors/{id}/status:
 *   patch:
 *     summary: Update vendor status
 *     description: Update the status of a vendor by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/vendors/:id/status",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.VENDORS, "update"),
  whitelabelIsolation,
  usersController.updateVendorStatus
);

// ============================================
// MODERATOR ROUTES
// ============================================

/**
 * @swagger
 * /users/moderators:
 *   get:
 *     summary: Get moderators
 *     description: Retrieve list of moderators
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Moderators retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Create moderator
 *     description: Create a new moderator user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Moderator created successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router
  .route("/moderators")
  .get(
    requirePageAccess(ADMIN_PAGES.MODERATORS, "view"),
    whitelabelIsolation,
    usersController.getModerators
  )
  .post(
    requirePageAccess(ADMIN_PAGES.MODERATORS, "create"),
    whitelabelIsolation,
    usersController.createModerator
  );

console.log("Moderators route defined");

module.exports = router;
