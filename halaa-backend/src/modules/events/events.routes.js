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

// Middleware
const { protect } = require("../../shared/middleware/auth");
const { restrictTo } = require("../../shared/middleware/rbac");
const {
  requireSubscription,
  checkEventLimit,
  checkGuestLimit,
} = require("../../shared/middleware/subscription");
const { uploadTemplateImage } = require("../../shared/utils/fileUpload");
const { idempotency } = require("../../shared/middleware/idempotency");
const {
  createEventLimiter,
  uploadLimiter,
} = require("../../shared/middleware/rateLimiter");
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
  addStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
  bulkDeleteSchema,
  notifyStaffSchema,
  updateReminderSettingsSchema,
  resendInviteSchema,
  extraReminderSchema,
  sendNewGuestsSchema,
} = require("./events.validation");

const adminRouter = require("./events.admin.routes");

const { ROLES } = require("../../shared/constants");

// All routes require authentication
router.use(protect);
router.use(
  restrictTo(ROLES.HOST, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MODERATOR)
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
router.get("/my-events", eventsController.getMyEvents);

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
router.get("/stats", eventsController.getEventStats);

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
  createEventLimiter,
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
  uploadTemplateImage,
  parseFormDataJsonFields([
    "eventDetails",
    "guestList",
    "staffList",
    "visualTemplate",
    "taqnyatTemplate",
    "guestReplies",
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
  uploadLimiter,
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

/**
 * @swagger
 * /events/{id}/reminder-settings:
 *   patch:
 *     summary: Update reminder settings
 *     description: Update reminder settings for a specific event
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
 *               customReminderTime:
 *                 type: boolean
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               scheduledTime:
 *                 type: string
 *                 example: "18:30"
 *     responses:
 *       200:
 *         description: Reminder settings updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/reminder-settings",
  validateObjectId("id"),
  validateZod(updateReminderSettingsSchema),
  eventsController.updateReminderSettings
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
 *       Revokes every active StaffAccessToken for the staff member so the
 *       staff portal link stops working immediately. The `:staffId` path
 *       param is the staff member sub-document `_id` from
 *       `event.staffList`. Idempotent — re-revoking returns 200 with
 *       `wasAlreadyRevoked: true`.
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffRevokeResponse'
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
 *     summary: List staff access tokens for an event
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffTokensListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
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
// LAUNCH RETRY
// ============================================

/**
 * @swagger
 * /events/{id}/retry-launch:
 *   post:
 *     summary: Manually retry a failed launch
 *     description: |
 *       Only the host (event creator), admin, moderator or super_admin
 *       can retry. Resets attemptCount to 0 and
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
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.MODERATOR
  ),
  idempotency({ scope: "events.retry_launch" }),
  eventsController.retryLaunch
);

// ============================================
// RESEND INVITE — pool-charged re-invitation for non-responders
// guests (or an explicit guestIds set). Repeatable BUT idempotent on a
// client-supplied `Idempotency-Key` header (optional): a NEW key starts a
// genuinely new re-send, the SAME key replays the cached result instead of
// re-charging/re-sending. This kills the double-charge-on-retry risk
// (double-tap, mobile/proxy retry, timeout) without an outbox. No header =
// legacy repeatable behavior (executes every time), so existing clients are
// unaffected.
// ============================================
router.post(
  "/:id/resend-invite",
  validateObjectId("id"),
  requireSubscription,
  idempotency({ scope: "events.resend_invite" }),
  validateZod(resendInviteSchema),
  eventsController.resendInvite
);

// ============================================
// EXTRA REMINDER — immediate pool-charged reminder to CONFIRMED guests
// using the approved reminder_confirmed template. Same idempotency contract
// as resend-invite above: an optional client-supplied `Idempotency-Key`
// makes a retry a safe replay; a new key is a new reminder; no header =
// repeatable.
// ============================================
router.post(
  "/:id/extra-reminder",
  validateObjectId("id"),
  requireSubscription,
  idempotency({ scope: "events.extra_reminder" }),
  validateZod(extraReminderSchema),
  eventsController.extraReminder
);

// ============================================
// SEND NEW GUESTS — initial pool-charged send to guests added after launch
// (invitation.sent != true). Reuses the launch send primitive (flip + charge +
// firstSendAt) and bumps the event sent-count additively. Same idempotency
// contract as resend-invite / extra-reminder.
// ============================================
router.post(
  "/:id/send-new-guests",
  validateObjectId("id"),
  requireSubscription,
  idempotency({ scope: "events.send_new_guests" }),
  validateZod(sendNewGuestsSchema),
  eventsController.sendNewGuests
);

// ============================================
// ADMIN EVENT ROUTES
// ============================================
router.use("/admin", adminRouter);

module.exports = router;
