/**
 * Events Controller
 * HTTP request handling only - delegates to events.service
 * @module modules/events/events.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const eventsService = require("./events.service");
const Subscription = require("../../../models/SubscriptionModel");
const { isAdminRole } = require("../../shared/constants/roles");

// ============================================
// EVENT LIST & STATS
// ============================================

/**
 * Get my events (host)
 * GET /api/v2/events/my-events
 */
exports.getMyEvents = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };

  const result = await eventsService.getMyEvents(
    req.user._id,
    filters,
    options
  );

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get aggregated event stats
 * GET /api/v2/events/stats
 */
exports.getEventStats = catchAsync(async (req, res) => {
  const stats = await eventsService.getEventStats(req.user._id);
  sendSuccess(res, stats);
});

/**
 * Get subscription info for event creation
 * GET /api/v2/events/subscription-info
 */
exports.getSubscriptionInfo = catchAsync(async (req, res) => {
  // Platform admins (admin/super_admin) bypass plan gating — matches the
  // middleware bypass in createEvent.
  const isPlatformAdmin = isAdminRole(req.user?.role);
  if (isPlatformAdmin) {
    return sendSuccess(res, {
      hasSubscription: true,
      isUnlimited: true,
      canCreateEvent: true,
      isGuestUnlimited: true,
      guestLimit: -1,
      eventsRemaining: -1,
      eventsUsed: 0,
    });
  }

  // Resolve the subscription that gates event creation: the host's own
  // user subscription.
  let subscription = null;
  const subscriptionId = req.user.subscription?._id || req.user.subscription;
  if (subscriptionId) {
    subscription = await Subscription.findById(subscriptionId).populate("planId");
  }
  const info = await eventsService.getSubscriptionInfo(
    req.user._id,
    subscription
  );
  sendSuccess(res, info);
});

/**
 * Get single event stats
 * GET /api/v2/events/stats/:id
 *
 * Scope is resolved inside the service via the full user context
 * (role), so admin / moderator / super_admin see any event without
 * needing a separate admin route.
 */
exports.getSingleEventStats = catchAsync(async (req, res) => {
  const stats = await eventsService.getSingleEventStats(
    req.params.id,
    req.user
  );
  sendSuccess(res, stats);
});

// ============================================
// EXPORT
// ============================================

/**
 * Export events as Excel
 * GET /api/v2/events/export/events
 */
exports.exportEventsAsExcel = catchAsync(async (req, res) => {
  const buffer = await eventsService.exportEventsAsExcel(req.user);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=events.xlsx");
  res.send(buffer);
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get event by ID
 * GET /api/v2/events/:id
 *
 * Scope resolved inside the service via the full user context.
 * See `eventsService._buildScopedEventQuery`.
 */
exports.getEventById = catchAsync(async (req, res) => {
  const result = await eventsService.getEventById(req.params.id, req.user);
  sendSuccess(res, result);
});

/**
 * Create event
 * POST /api/v2/events
 */
exports.createEvent = catchAsync(async (req, res) => {
  // parseFormDataJsonFields + validateZod have already coerced these into
  // their object/array shapes — no manual parsing here.
  const {
    guestList = [],
    eventDetails,
    staffList,
    visualTemplate,
    taqnyatTemplate,
    guestReplies,
    invitationType,
    launchSettings,
  } = req.body;
  const eventData = {
    eventDetails,
    staffList,
    visualTemplate,
    taqnyatTemplate,
    guestReplies,
    invitationType,
    launchSettings,
  };

  const context = {
    userId: req.user._id,
    userRole: req.user.role,
    subscription: req.subscription,
    file: req.file,
  };

  const result = await eventsService.createEvent(eventData, guestList, context);
  sendCreated(res, result, "Event created successfully");
});

/**
 * Delete event
 * DELETE /api/v2/events/:id
 */
exports.deleteEvent = catchAsync(async (req, res) => {
  await eventsService.deleteEvent(req.params.id, req.user._id);
  sendDeleted(res, "Event deleted successfully");
});

/**
 * Bulk delete events
 * POST /api/v2/events/bulk-delete
 */
exports.bulkDeleteEvents = catchAsync(async (req, res) => {
  const { eventIds } = req.body;
  const result = await eventsService.bulkDeleteEvents(eventIds, req.user._id);
  sendSuccess(res, result, `${result.deletedCount} events deleted`);
});

// ============================================
// PARTIAL UPDATES
// ============================================

/**
 * Update event details
 * PATCH /api/v2/events/:id/event-details
 *
 * Scope resolved from req.user inside the service so the unified update
 * wizard works for admin / moderator / super_admin on the SAME
 * endpoint as the host.
 */
exports.updateEventDetails = catchAsync(async (req, res) => {
  const result = await eventsService.updateEventDetails(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Event details updated");
});

/**
 * Update guest list
 * PATCH /api/v2/events/:id/guest-list
 */
exports.updateGuestList = catchAsync(async (req, res) => {
  const result = await eventsService.updateGuestList(
    req.params.id,
    req.body.guestList,
    req.user
  );
  sendSuccess(res, result, "Guest list updated");
});

/**
 * Replace staff list
 * PATCH /api/v2/events/:id/staff-list
 */
exports.updateStaffList = catchAsync(async (req, res) => {
  const result = await eventsService.updateStaffList(
    req.params.id,
    req.body.staffList,
    req.user
  );
  sendSuccess(res, result, "Staff list updated");
});

/**
 * Atomically update guest list + staff list
 * PATCH /api/v2/events/:id/step2
 *
 * Accepts both `supervisorsList` (web naming) and `staffList` (mobile
 * naming); normalises to a single `staffList` payload before handing
 * off to the service. Both keys may appear together — `staffList`
 * wins (mobile-first stays canonical) and `supervisorsList` is only used
 * when `staffList` is absent.
 *
 * Both `guestList` AND a staff key (either `staffList` or
 * `supervisorsList`) are REQUIRED; defaulting a missing key to `[]`
 * would let a partial request empty the existing list. The atomic
 * endpoint is "replace both" — callers that only want to edit one side
 * must use the `/guest-list` or `/staff-list` endpoints.
 */
exports.updateEventStep2 = catchAsync(async (req, res) => {
  // Zod schema enforces guestList + at least one of staffList/supervisorsList.
  // Normalise to a single canonical key before handing off to the service.
  const guestList = req.body.guestList;
  const staffList = req.body.staffList ?? req.body.supervisorsList;

  const result = await eventsService.updateEventStep2(
    req.params.id,
    { guestList, staffList },
    req.user
  );
  sendSuccess(res, result, "Step 2 updated");
});

/**
 * Update invitation settings
 * PATCH /api/v2/events/:id/invitation-settings
 */
exports.updateInvitationSettings = catchAsync(async (req, res) => {
  // parseFormDataJsonFields middleware coerces JSON-string fields to
  // objects before this handler runs.
  const result = await eventsService.updateInvitationSettings(
    req.params.id,
    req.body,
    req.user,
    req.file
  );
  sendSuccess(res, result, "Invitation settings updated");
});

/**
 * Update launch settings
 * PATCH /api/v2/events/:id/launch-settings
 */
exports.updateLaunchSettings = catchAsync(async (req, res) => {
  const result = await eventsService.updateLaunchSettings(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Launch settings updated");
});

/**
 * Update reminder settings
 * PATCH /api/v2/events/:id/reminder-settings
 */
exports.updateReminderSettings = catchAsync(async (req, res) => {
  const result = await eventsService.updateReminderSettings(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Reminder settings updated");
});

/**
 * Send test message
 * PATCH /api/v2/events/:id/test-message
 */
exports.sendTestMessage = catchAsync(async (req, res) => {
  const result = await eventsService.sendTestMessage(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Test message sent");
});

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * Add staff to event
 * POST /api/v2/events/:eventId/staff
 */
exports.addStaffToEvent = catchAsync(async (req, res) => {
  const result = await eventsService.addStaffToEvent(
    req.params.eventId,
    req.body,
    req.user
  );
  sendCreated(res, result, "Staff added successfully");
});

/**
 * Update staff
 * PUT /api/v2/events/:eventId/staff/:staffId
 */
exports.updateStaff = catchAsync(async (req, res) => {
  const { eventId, staffId } = req.params;
  const result = await eventsService.updateStaff(
    eventId,
    staffId,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Staff updated successfully");
});

/**
 * Update staff status
 * PUT /api/v2/events/:eventId/staff/:staffId/status
 */
exports.updateStaffStatus = catchAsync(async (req, res) => {
  const { eventId, staffId } = req.params;
  const { status } = req.body;
  const result = await eventsService.updateStaffStatus(
    eventId,
    staffId,
    status,
    req.user
  );
  sendSuccess(res, result, "Staff status updated");
});

/**
 * Delete staff
 * DELETE /api/v2/events/:eventId/staff/:staffId
 */
exports.deleteStaff = catchAsync(async (req, res) => {
  const { eventId, staffId } = req.params;
  await eventsService.deleteStaff(eventId, staffId, req.user);
  sendDeleted(res, "Staff deleted successfully");
});

// ============================================
// STAFF NOTIFICATION
// ============================================

/**
 * Notify all active staff via SMS
 * POST /api/v2/events/:eventId/notify-staff
 */
exports.notifyStaff = catchAsync(async (req, res) => {
  const { ROLES } = require("../../shared/constants/roles");
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR].includes(
    req.user.role
  );
  const result = await eventsService.notifyStaff(
    req.params.eventId,
    req.user._id,
    isAdmin
  );
  sendSuccess(res, result, `Notifications sent: ${result.sent}/${result.total}`);
});

// ============================================
// LAUNCH RETRY
// ============================================

/**
 * Manual launch retry — host, admin, super_admin, moderator only.
 * POST /api/v2/events/:id/retry-launch
 */
exports.retryLaunch = catchAsync(async (req, res) => {
  const result = await eventsService.retryEventLaunch(req.params.id, req.user);
  sendSuccess(res, result, "Launch retry kicked off");
});

// ============================================
// RESEND INVITE
// ============================================

/**
 * Resend invitation to non-responders / "maybe" guests (or an explicit
 * guestIds set). POST /api/v2/events/:id/resend-invite
 *
 * Pool-charged (one invite per successful send) and repeatable — no
 * live/cooldown/once-only gates.
 */
exports.resendInvite = catchAsync(async (req, res) => {
  const result = await eventsService.resendInvite(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Re-invitations sent");
});

// ============================================
// EXTRA REMINDER
// ============================================

/**
 * Send an immediate pool-charged reminder to CONFIRMED guests using the
 * approved reminder_confirmed template.
 * POST /api/v2/events/:id/extra-reminder
 */
exports.extraReminder = catchAsync(async (req, res) => {
  const result = await eventsService.extraReminder(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Extra reminders sent");
});

// ============================================
// SEND NEW GUESTS
// ============================================

/**
 * Send the initial invitation to guests added after launch (never-sent guests,
 * invitation.sent != true). Optional guestIds narrows the set.
 * POST /api/v2/events/:id/send-new-guests
 */
exports.sendNewGuests = catchAsync(async (req, res) => {
  const result = await eventsService.sendToNewGuests(
    req.params.id,
    req.body,
    req.user
  );
  sendSuccess(res, result, "Invitations sent to new guests");
});

// ============================================
// ADMIN ENDPOINTS — re-exported here so imports of `events.controller`
// resolve the admin handlers defined in events.admin.controller.js.
// ============================================
const adminController = require("./events.admin.controller");
exports.getAllEvents = adminController.getAllEvents;
exports.adminUpdateEventStatus = adminController.adminUpdateEventStatus;
exports.adminDeleteEvent = adminController.adminDeleteEvent;
