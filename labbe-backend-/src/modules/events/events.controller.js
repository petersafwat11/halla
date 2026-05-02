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
  const subscriptionId = req.user.subscription?._id || req.user.subscription;
  const subscription = subscriptionId
    ? await Subscription.findById(subscriptionId).populate("planId")
    : null;
  const info = await eventsService.getSubscriptionInfo(
    req.user._id,
    subscription
  );
  sendSuccess(res, info);
});

/**
 * Get single event stats
 * GET /api/v2/events/stats/:id
 */
exports.getSingleEventStats = catchAsync(async (req, res) => {
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(req.user.role);
  const stats = await eventsService.getSingleEventStats(
    req.params.id,
    req.user._id,
    isAdmin
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
  const buffer = await eventsService.exportEventsAsExcel(req.user._id);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=events.xlsx");
  res.send(buffer);
});

/**
 * Export event guests as Excel
 * GET /api/v2/events/export/:id/guests
 */
exports.exportEventGuestsAsExcel = catchAsync(async (req, res) => {
  const buffer = await eventsService.exportEventGuestsAsExcel(
    req.params.id,
    req.user._id
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=event-${req.params.id}-guests.xlsx`
  );
  res.send(buffer);
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get event by ID
 * GET /api/v2/events/:id
 */
exports.getEventById = catchAsync(async (req, res) => {
  const result = await eventsService.getEventById(req.params.id, req.user._id);
  sendSuccess(res, result);
});

/**
 * Create event
 * POST /api/v2/events
 */
exports.createEvent = catchAsync(async (req, res) => {
  let guestList = [];
  let eventData = {};

  try {
    if (req.body.guestList) guestList = JSON.parse(req.body.guestList);
    if (req.body.eventDetails)
      eventData.eventDetails = JSON.parse(req.body.eventDetails);
    if (req.body.staffList)
      eventData.staffList = JSON.parse(req.body.staffList);
    if (req.body.invitationSettings)
      eventData.invitationSettings = JSON.parse(req.body.invitationSettings);
    if (req.body.launchSettings)
      eventData.launchSettings = JSON.parse(req.body.launchSettings);
  } catch (error) {
    const { ValidationError } = require("../../shared/errors");
    throw new ValidationError(`Invalid JSON format: ${error.message}`);
  }

  const context = {
    userId: req.user._id,
    userRole: req.user.role,
    subscription: req.subscription,
    file: req.file,
    whitelabelId: req.body.whitelabelId,
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
 */
exports.updateEventDetails = catchAsync(async (req, res) => {
  const result = await eventsService.updateEventDetails(
    req.params.id,
    req.body,
    req.user._id
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
    req.user._id
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
    req.user._id
  );
  sendSuccess(res, result, "Staff list updated");
});

/**
 * Update invitation settings
 * PATCH /api/v2/events/:id/invitation-settings
 */
exports.updateInvitationSettings = catchAsync(async (req, res) => {
  // Multer delivers FormData text fields as strings — parse any JSON-encoded values
  const settings = { ...req.body };
  for (const key of ["selectedTemplate", "visualTemplate"]) {
    if (typeof settings[key] === "string") {
      try {
        settings[key] = JSON.parse(settings[key]);
      } catch {
        /* keep as-is */
      }
    }
  }

  const result = await eventsService.updateInvitationSettings(
    req.params.id,
    settings,
    req.user._id,
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
    req.user._id
  );
  sendSuccess(res, result, "Launch settings updated");
});

/**
 * Send test message
 * PATCH /api/v2/events/:id/test-message
 */
exports.sendTestMessage = catchAsync(async (req, res) => {
  const result = await eventsService.sendTestMessage(
    req.params.id,
    req.body,
    req.user._id
  );
  sendSuccess(res, result, "Test message sent");
});

// ============================================
// GUEST MANAGEMENT
// ============================================

/**
 * Add guest to event
 * POST /api/v2/events/:eventId/guests
 */
exports.addGuestToEvent = catchAsync(async (req, res) => {
  const result = await eventsService.addGuestToEvent(
    req.params.eventId,
    req.body,
    req.user._id
  );
  sendCreated(res, result, "Guest added successfully");
});

/**
 * Update event guest
 * PUT /api/v2/events/:eventId/guests/:guestId
 */
exports.updateEventGuest = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  const result = await eventsService.updateEventGuest(
    eventId,
    guestId,
    req.body,
    req.user._id
  );
  sendSuccess(res, result, "Guest updated successfully");
});

/**
 * Delete event guest
 * DELETE /api/v2/events/:eventId/guests/:guestId
 */
exports.deleteEventGuest = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  await eventsService.deleteEventGuest(eventId, guestId, req.user._id);
  sendDeleted(res, "Guest deleted successfully");
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
    req.user._id
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
    req.user._id
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
    req.user._id
  );
  sendSuccess(res, result, "Staff status updated");
});

/**
 * Delete staff
 * DELETE /api/v2/events/:eventId/staff/:staffId
 */
exports.deleteStaff = catchAsync(async (req, res) => {
  const { eventId, staffId } = req.params;
  await eventsService.deleteStaff(eventId, staffId, req.user._id);
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
  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(req.user.role);
  const result = await eventsService.notifyStaff(
    req.params.eventId,
    req.user._id,
    isAdmin
  );
  sendSuccess(res, result, `Notifications sent: ${result.sent}/${result.total}`);
});

// ============================================
// LAUNCH RETRY (3c.1)
// ============================================

/**
 * Manual launch retry — host, whitelabel-admin, admin, super_admin only.
 * POST /api/v2/events/:id/retry-launch
 */
exports.retryLaunch = catchAsync(async (req, res) => {
  const result = await eventsService.retryEventLaunch(req.params.id, req.user);
  res.status(200).json({ status: "success", data: result });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all events (admin)
 * GET /api/v2/events/admin/all
 */
exports.getAllEvents = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };

  const result = await eventsService.getAllEvents(
    filters,
    options,
    req.whitelabelFilter
  );
  sendPaginated(res, result.data, result.pagination);
});

/**
 * Admin update event status
 * PATCH /api/v2/events/admin/:id/status
 */
exports.adminUpdateEventStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const result = await eventsService.updateEventStatus(
    req.params.id,
    status,
    req.user._id,
    true
  );
  sendSuccess(res, result, "Event status updated successfully");
});

/**
 * Admin delete event
 * DELETE /api/v2/events/admin/:id
 */
exports.adminDeleteEvent = catchAsync(async (req, res) => {
  await eventsService.deleteEvent(req.params.id, req.user._id, true);
  sendDeleted(res, "Event deleted successfully");
});
