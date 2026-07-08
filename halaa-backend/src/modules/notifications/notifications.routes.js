/**
 * Notifications Routes
 * Route definitions for notification management module
 * @module modules/notifications/notifications.routes
 */

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification management endpoints
 */

const express = require("express");
const router = express.Router();

// Controller
const notificationsController = require("./notifications.controller");
const { protect } = require("../../shared/middleware/auth");
const { restrictTo } = require("../../shared/middleware/rbac");
const { ROLES } = require("../../shared/constants");
const { validateObjectId } = require("../../shared/middleware/validation");

// All routes require authentication
router.use(protect);

// ============================================
// USER ROUTES
// ============================================

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Get count of unread notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Get unread count (lightweight endpoint for badge)
router.get("/unread-count", notificationsController.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all of the current user's notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Mark all as read
router.patch("/read-all", notificationsController.markAllAsRead);

/**
 * @swagger
 * /notifications/clear-all:
 *   delete:
 *     summary: Clear all notifications
 *     description: Delete all notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Clear all notifications
router.delete("/clear-all", notificationsController.clearAllNotifications);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications
 *     description: Get paginated list of notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [system, event, guest, message, ticket, subscription]
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Get user's notifications (paginated)
router.get("/", notificationsController.getNotifications);

// Single notification operations
/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get single notification
 *     description: Get a specific notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
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
 *                     notification:
 *                       $ref: '#/components/schemas/Notification'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete notification
 *     description: Delete a specific notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router
  .route("/:id")
  .get(validateObjectId("id"), notificationsController.getNotification)
  .delete(validateObjectId("id"), notificationsController.deleteNotification);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Mark single notification as read
router.patch(
  "/:id/read",
  validateObjectId("id"),
  notificationsController.markAsRead
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send notification to users
 *     description: Send a notification to specific users (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds, title, message]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Send notification to specific users
router.post("/send", restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN), notificationsController.sendNotification);

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast notification
 *     description: Broadcast a notification to all users with a specific role (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, title, message]
 *             properties:
 *               role:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification broadcast successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Broadcast notification to role or all users
router.post(
  "/broadcast",
  restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  notificationsController.broadcastNotification
);

module.exports = router;
