/**
 * Events Routes
 * Route definitions for event management module
 * @module modules/events/events.routes
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints for creating, updating, and managing events
 */

const express = require("express");
const router = express.Router();

// Controller
const eventsController = require("./events.controller");
// Cross-module controller — staff revoke endpoint lives under
// `/events/:eventId/staff/:staffId/revoke` for URL-shape consistency with
// the rest of the event-staff routes, but the handler itself ships with
// the staff module.
const staffController = require("../staff/staff.controller");

// Middleware (using existing during migration)
const { protect } = require("../../shared/middleware/auth");
const { restrictTo, requirePageAccess } = require("../../shared/middleware/rbac");
const {
  requireSubscription,
  checkEventLimit,
  checkGuestLimit,
} = require("../../shared/middleware/subscription");
const {
  filterByWhitelabel,
  injectWhitelabel,
} = require("../../shared/middleware/whitelabel");
const { uploadTemplateImage } = require("../../shared/utils/fileUpload");
const { idempotency } = require("../../shared/middleware/idempotency");
const {
  validateObjectId,
  validateArray,
  validateObjectIdArray,
} = require("../../shared/middleware/validation");

const { ADMIN_PAGES, ROLES } = require("../../shared/constants");

// All routes require authentication
router.use(protect);
router.use(
  restrictTo(ROLES.HOST, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.WHITELABEL_ADMIN, ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR)
);

// ============================================
// EVENT LIST & STATS
// ============================================

/**
 * @swagger
 * /events/my-events:
 *   get:
 *     summary: Get my events
 *     description: Get list of events created by current user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/my-events", filterByWhitelabel, eventsController.getMyEvents);

/**
 * @swagger
 * /events/stats:
 *   get:
 *     summary: Get event statistics
 *     description: Get statistics for user's events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/stats", filterByWhitelabel, eventsController.getEventStats);

/**
 * @swagger
 * /events/subscription-info:
 *   get:
 *     summary: Get subscription info for event creation
 *     description: Retrieve current user's subscription details relevant to event creation limits
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription info retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/subscription-info", eventsController.getSubscriptionInfo);

/**
 * @swagger
 * /events/stats/{id}:
 *   get:
 *     summary: Get single event stats
 *     description: Get statistics for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Event stats retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/stats/:id",
  validateObjectId("id"),
  eventsController.getSingleEventStats
);

// ============================================
// EXPORT ROUTES
// ============================================

/**
 * @swagger
 * /events/export/events:
 *   get:
 *     summary: Export all events as Excel
 *     description: Download all user's events as an Excel spreadsheet
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/export/events", eventsController.exportEventsAsExcel);

/**
 * @swagger
 * /events/export/{id}/guests:
 *   get:
 *     summary: Export event guests as Excel
 *     description: Download guest list for a specific event as an Excel spreadsheet
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Excel file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/export/:id/guests",
  validateObjectId("id"),
  eventsController.exportEventGuestsAsExcel
);

// ============================================
// CREATE EVENT
// ============================================

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create new event
 *     description: Create a new event with guest list
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Event created successfully
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
 *                     event:
 *                       $ref: '#/components/schemas/Event'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Subscription limit reached
 */
router.post(
  "/",
  requireSubscription,
  checkEventLimit,
  checkGuestLimit((req) => {
    try {
      const guestList = req.body.guestList
        ? JSON.parse(req.body.guestList)
        : [];
      return guestList.length || 0;
    } catch {
      return 0;
    }
  }),
  injectWhitelabel,
  uploadTemplateImage,
  eventsController.createEvent
);

// ============================================
// GET SINGLE EVENT
// ============================================

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     description: Get detailed information about a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Event retrieved successfully
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
 *                     event:
 *                       $ref: '#/components/schemas/Event'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", validateObjectId("id"), eventsController.getEventById);

// ============================================
// UPDATE EVENT (partial updates)
// ============================================

/**
 * @swagger
 * /events/{id}/event-details:
 *   patch:
 *     summary: Update event details
 *     description: Update basic details of a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event details updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/event-details",
  validateObjectId("id"),
  eventsController.updateEventDetails
);

/**
 * @swagger
 * /events/{id}/guest-list:
 *   patch:
 *     summary: Update guest list
 *     description: Update the guest list for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestList:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Guest'
 *     responses:
 *       200:
 *         description: Guest list updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Guest limit exceeded
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/guest-list",
  validateObjectId("id"),
  requireSubscription,
  checkGuestLimit((req) => req.body.guestList?.length || 0),
  eventsController.updateGuestList
);

/**
 * @swagger
 * /events/{id}/staff-list:
 *   patch:
 *     summary: Replace staff list
 *     description: Replace the entire staff list for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffList:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *     responses:
 *       200:
 *         description: Staff list updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/staff-list",
  validateObjectId("id"),
  eventsController.updateStaffList
);

/**
 * @swagger
 * /events/{id}/invitation-settings:
 *   patch:
 *     summary: Update invitation settings
 *     description: Update invitation settings for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Invitation settings updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/invitation-settings",
  validateObjectId("id"),
  uploadTemplateImage,
  eventsController.updateInvitationSettings
);

/**
 * @swagger
 * /events/{id}/launch-settings:
 *   patch:
 *     summary: Update launch settings
 *     description: Update launch settings for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Launch settings updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/launch-settings",
  validateObjectId("id"),
  eventsController.updateLaunchSettings
);

// ============================================
// MESSAGING
// ============================================

/**
 * @swagger
 * /events/{id}/test-message:
 *   patch:
 *     summary: Send test message
 *     description: Send a test message for a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Test message sent successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/test-message",
  validateObjectId("id"),
  requireSubscription,
  eventsController.sendTestMessage
);

// ============================================
// STAFF NOTIFICATION
// ============================================

/**
 * @swagger
 * /events/{eventId}/notify-staff:
 *   post:
 *     summary: Notify all active staff
 *     description: Send SMS to all active staff with event info and staff portal link
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Staff notifications sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:eventId/notify-staff",
  validateObjectId("eventId"),
  eventsController.notifyStaff
);

// ============================================
// DELETE EVENT
// ============================================

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete event
 *     description: Delete a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", validateObjectId("id"), eventsController.deleteEvent);

/**
 * @swagger
 * /events/bulk-delete:
 *   post:
 *     summary: Bulk delete events
 *     description: Delete multiple events at once
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventIds
 *             properties:
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Events deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/bulk-delete",
  validateArray("eventIds", { minLength: 1, maxLength: 100 }),
  validateObjectIdArray("eventIds"),
  eventsController.bulkDeleteEvents
);

// ============================================
// GUEST MANAGEMENT
// ============================================

/**
 * @swagger
 * /events/{eventId}/guests:
 *   post:
 *     summary: Add guest to event
 *     description: Add a new guest to a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddGuestRequest'
 *     responses:
 *       201:
 *         description: Guest added successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Guest limit exceeded
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:eventId/guests",
  validateObjectId("eventId"),
  requireSubscription,
  checkGuestLimit(1),
  eventsController.addGuestToEvent
);

/**
 * @swagger
 * /events/{eventId}/guests/{guestId}:
 *   put:
 *     summary: Update event guest
 *     description: Update a specific guest in an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - $ref: '#/components/parameters/GuestIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Guest'
 *     responses:
 *       200:
 *         description: Guest updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  "/:eventId/guests/:guestId",
  validateObjectId("eventId"),
  validateObjectId("guestId"),
  eventsController.updateEventGuest
);

/**
 * @swagger
 * /events/{eventId}/guests/{guestId}:
 *   delete:
 *     summary: Delete event guest
 *     description: Remove a specific guest from an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - $ref: '#/components/parameters/GuestIdParam'
 *     responses:
 *       200:
 *         description: Guest deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:eventId/guests/:guestId",
  validateObjectId("eventId"),
  validateObjectId("guestId"),
  eventsController.deleteEventGuest
);

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * @swagger
 * /events/{eventId}/staff:
 *   post:
 *     summary: Add staff
 *     description: Add a new staff member to a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Staff added successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:eventId/staff",
  validateObjectId("eventId"),
  requireSubscription,
  eventsController.addStaffToEvent
);

/**
 * @swagger
 * /events/{eventId}/staff/{staffId}:
 *   put:
 *     summary: Update staff
 *     description: Update a specific staff member in an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - name: staffId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Staff updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  "/:eventId/staff/:staffId",
  validateObjectId("eventId"),
  validateObjectId("staffId"),
  eventsController.updateStaff
);

/**
 * @swagger
 * /events/{eventId}/staff/{staffId}/status:
 *   put:
 *     summary: Update staff status
 *     description: Update the status of a specific staff member in an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - name: staffId
 *         in: path
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
 *         description: Staff status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  "/:eventId/staff/:staffId/status",
  validateObjectId("eventId"),
  validateObjectId("staffId"),
  eventsController.updateStaffStatus
);

/**
 * @swagger
 * /events/{eventId}/staff/{staffId}:
 *   delete:
 *     summary: Delete staff
 *     description: Remove a specific staff member from an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - name: staffId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:eventId/staff/:staffId",
  validateObjectId("eventId"),
  validateObjectId("staffId"),
  eventsController.deleteStaff
);

/**
 * Revoke a staff access token (Phase 3e.1 / FLOW-20-F01).
 * The `:staffId` here is the StaffAccessToken document _id.
 * RBAC: host or whitelabel-admin (admin / super_admin allowed via
 * `restrictTo` at the router head).
 *
 * Idempotent at the action level — re-revoke returns 200 with the same
 * final state.
 */
router.post(
  "/:eventId/staff/:staffId/revoke",
  validateObjectId("eventId"),
  validateObjectId("staffId"),
  idempotency({ scope: "staff.revoke" }),
  staffController.revokeStaffToken
);

// ============================================
// LAUNCH RETRY (3c.1)
// ============================================

/**
 * @swagger
 * /events/{id}/retry-launch:
 *   post:
 *     summary: Manually retry a failed launch
 *     description: Only the host (event creator), whitelabel admin (own whitelabel),
 *                  admin or super_admin can retry. Resets attemptCount to 0 and
 *                  fires the launch flow immediately. Returns 409 if the event
 *                  is not in `failed` or `scheduled` state.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Retry kicked off (whether or not the launch succeeded)
 *       403:
 *         description: Caller is not authorized to retry this event
 *       409:
 *         description: Event not in a retryable state
 */
// L-9: route-level RBAC matches the service-level check inside
// events.service.retryLaunch (host / wl-admin tied to the event /
// admin / super_admin). Previously the route inherited the broader
// router-level allow-list which let MODERATOR / WHITELABEL_MODERATOR
// reach the controller and get a 403 from the service. Tightening the
// route returns 401/403 earlier and clarifies the audit log story.
router.post(
  "/:id/retry-launch",
  validateObjectId("id"),
  restrictTo(
    ROLES.HOST,
    ROLES.WHITELABEL_ADMIN,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  ),
  idempotency({ scope: "events.retry_launch" }),
  eventsController.retryLaunch
);

// ============================================
// ADMIN EVENT ROUTES
// ============================================

/**
 * @swagger
 * /events/admin/all:
 *   get:
 *     summary: Get all events (admin)
 *     description: Retrieve all events. Requires admin role with events view permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/admin/all",
  requirePageAccess(ADMIN_PAGES.EVENTS, "view"),
  filterByWhitelabel,
  eventsController.getAllEvents
);

/**
 * @swagger
 * /events/admin/{id}/status:
 *   patch:
 *     summary: Admin update event status
 *     description: Update event status. Requires admin role with events update permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
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
 *         description: Event status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/admin/:id/status",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.EVENTS, "update"),
  eventsController.adminUpdateEventStatus
);

/**
 * @swagger
 * /events/admin/{id}:
 *   delete:
 *     summary: Admin delete event
 *     description: Delete an event. Requires admin role with events delete permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/admin/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.EVENTS, "delete"),
  eventsController.adminDeleteEvent
);

module.exports = router;
