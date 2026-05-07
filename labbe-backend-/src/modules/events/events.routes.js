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
const { restrictTo } = require("../../shared/middleware/rbac");
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
  validateZod,
  parseFormDataJsonFields,
} = require("../../shared/middleware/validation");
const {
  createEventSchema,
  updateEventDetailsSchema,
  updateGuestListSchema,
  updateStaffListSchema,
  updateStep2Schema,
  updateInvitationSettingsSchema,
  updateLaunchSettingsSchema,
  sendTestMessageSchema,
  addGuestSchema,
  updateGuestSchema,
  addStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
  bulkDeleteSchema,
  notifyStaffSchema,
} = require("./events.validation");

const adminRouter = require("./events.admin.routes");

const { ROLES } = require("../../shared/constants");

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
 *         $ref: '#/components/responses/GuestLimitExceededError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Subscription required or event-cap reached
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
  parseFormDataJsonFields([
    "eventDetails",
    "guestList",
    "staffList",
    "invitationSettings",
    "launchSettings",
  ]),
  validateZod(createEventSchema),
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
 *             $ref: '#/components/schemas/EventUpdateRequest'
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
  validateZod(updateEventDetailsSchema),
  eventsController.updateEventDetails
);

/**
 * @swagger
 * /events/{id}/guest-list:
 *   patch:
 *     summary: Replace guest list (partial update)
 *     description: Kept for guest-only edits in the update wizard. The full guest+staff replace lives at /events/{id}/step2.
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
 *             required: [guestList]
 *             properties:
 *               guestList:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Guest'
 *     responses:
 *       200:
 *         description: Guest list updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/guest-list",
  validateObjectId("id"),
  requireSubscription,
  checkGuestLimit((req) => req.body.guestList?.length || 0),
  validateZod(updateGuestListSchema),
  eventsController.updateGuestList
);

/**
 * @swagger
 * /events/{id}/staff-list:
 *   patch:
 *     summary: Replace staff list (partial update)
 *     description: Kept for staff-only edits in the update wizard. The full guest+staff replace lives at /events/{id}/step2.
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
 *             required: [staffList]
 *             properties:
 *               staffList:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Staff list updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/staff-list",
  validateObjectId("id"),
  validateZod(updateStaffListSchema),
  eventsController.updateStaffList
);


/**
 * @swagger
 * /events/{id}/step2:
 *   patch:
 *     summary: Atomically replace guest list + staff list
 *     description: |
 *       Updates `guestList` and `staffList` in a single transaction so a
 *       capacity-guard rejection on either side leaves both fields at
 *       their pre-call values.
 *
 *       Accepts both `supervisorsList` (web naming) and `staffList`
 *       (mobile naming) for the staff payload, normalized at the
 *       controller boundary.
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
 *             $ref: '#/components/schemas/Step2Request'
 *     responses:
 *       200:
 *         description: Step 2 updated successfully
 *       400:
 *         $ref: '#/components/responses/GuestLimitExceededError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/step2",
  validateObjectId("id"),
  requireSubscription,
  checkGuestLimit((req) => req.body.guestList?.length || 0),
  validateZod(updateStep2Schema),
  eventsController.updateEventStep2
);

/**
 * @swagger
 * /events/{id}/invitation-settings:
 *   patch:
 *     summary: Update invitation settings
 *     description: Update invitation settings for a specific event (multipart/form-data)
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
 *             $ref: '#/components/schemas/InvitationSettingsRequest'
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
  parseFormDataJsonFields([
    "selectedTemplate",
    "visualTemplate",
    "fieldValues",
    "guestReplies",
  ]),
  validateZod(updateInvitationSettingsSchema),
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
 *             $ref: '#/components/schemas/LaunchSettingsRequest'
 *     responses:
 *       200:
 *         description: Launch settings updated successfully
 *       400:
 *         $ref: '#/components/responses/EventEditLockedError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/launch-settings",
  validateObjectId("id"),
  validateZod(updateLaunchSettingsSchema),
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
 *     description: Send a test SMS/WhatsApp using the event's invitation template (idempotent)
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
 *             $ref: '#/components/schemas/SendTestMessageRequest'
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
  idempotency({ scope: "events.test_message" }),
  validateZod(sendTestMessageSchema),
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
  idempotency({ scope: "events.notify_staff" }),
  validateZod(notifyStaffSchema),
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
 *     description: Delete multiple events at once (transactional)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkDeleteRequest'
 *     responses:
 *       200:
 *         description: Events deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/bulk-delete",
  validateZod(bulkDeleteSchema),
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
  validateZod(addGuestSchema),
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
 *             $ref: '#/components/schemas/UpdateGuestRequest'
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
  validateZod(updateGuestSchema),
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
 *             $ref: '#/components/schemas/AddStaffRequest'
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
  validateZod(addStaffSchema),
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
 *             $ref: '#/components/schemas/UpdateStaffRequest'
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
  validateZod(updateStaffSchema),
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
  validateZod(updateStaffStatusSchema),
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
 * @swagger
 * /events/{eventId}/staff/{staffId}/revoke:
 *   post:
 *     summary: Revoke a staff access token
 *     description: |
 *       Revokes a StaffAccessToken so the staff portal link stops working
 *       immediately. The `:staffId` path param is the
 *       StaffAccessToken document `_id` (not the embedded staffList entry id).
 *       Idempotent — re-revoking returns 200 with the same final state.
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
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: Token revoked (or already revoked)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/:eventId/staff/:staffId/revoke",
  validateObjectId("eventId"),
  validateObjectId("staffId"),
  idempotency({ scope: "staff.revoke" }),
  staffController.revokeStaffToken
);

/**
 * @swagger
 * /events/{eventId}/staff-tokens:
 *   get:
 *     summary: List staff access tokens for an event (Phase 4b W0-STAFF)
 *     description: |
 *       Returns active and revoked StaffAccessToken records for
 *       this event (RBAC: host / wl-admin / admin / super_admin).
 *       Each token row carries phone, staffName, isRevoked,
 *       isExpired, lastUsedAt, useCount.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
 *       403:
 *         description: Caller is not authorized to view staff tokens for this event
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/:eventId/staff-tokens",
  validateObjectId("eventId"),
  staffController.listStaffTokens
);

// ============================================
// LAUNCH RETRY (3c.1)
// ============================================

/**
 * @swagger
 * /events/{id}/retry-launch:
 *   post:
 *     summary: Manually retry a failed launch
 *     description: |
 *       Only the host (event creator), whitelabel admin (own whitelabel),
 *       admin or super_admin can retry. Resets attemptCount to 0 and
 *       fires the launch flow immediately. Returns 409 if the event
 *       is not in `failed` or `scheduled` state.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Retry kicked off (whether or not the launch succeeded)
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/EventNotRetryableError'
 */
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
// ADMIN EVENT ROUTES — extracted to events.admin.routes.js
// ============================================
router.use("/admin", adminRouter);

module.exports = router;
