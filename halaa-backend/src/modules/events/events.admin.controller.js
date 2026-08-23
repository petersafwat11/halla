/**
 * Events Admin Controller
 * Admin handlers for /events/admin/* — separated from events.controller.js
 * to keep that file under the size cap. Re-exported from events.controller.js
 * so routes that already imported from there keep working.
 * @module modules/events/events.admin.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendPaginated,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const eventsService = require("./events.service");

/**
 * Get all events (admin)
 * GET /api/v2/events/admin/all
 */
exports.getAllEvents = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };

  const result = await eventsService.getAllEvents(filters, options);
  res.status(200).json({
    success: true,
    status: "success",
    data: result.data,
    statusCounts: result.statusCounts,
    pagination: result.pagination,
  });
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
