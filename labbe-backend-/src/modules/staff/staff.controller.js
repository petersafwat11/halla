/**
 * Staff Controller
 * HTTP request handling for staff portal
 * @module modules/staff/staff.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendPaginated,
} = require("../../shared/utils/responseHelper");
const staffService = require("./staff.service");

/**
 * Verify staff access
 * GET /api/v2/staff/verify?phone=xxx&eventId=xxx OR ?token=xxx
 */
exports.verifyStaffAccess = catchAsync(async (req, res) => {
  const { token, phone, eventId } = req.query;
  const result = await staffService.verifyStaffAccess({
    token,
    phone,
    eventId,
  });
  sendSuccess(res, result);
});

/**
 * Get event guests
 * GET /api/v2/staff/events/:eventId/guests
 */
exports.getEventGuests = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };

  const result = await staffService.getEventGuests(eventId, filters, options);

  res.status(200).json({
    status: "success",
    results: result.data.length,
    data: {
      guests: result.data,
      stats: result.stats,
      pagination: result.pagination,
    },
  });
});

/**
 * Check in guest via QR or by identifier
 * POST /api/v2/staff/events/:eventId/check-in
 * Body: { qrCode } or { guestId } or { phone }
 */
exports.checkInGuest = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { qrCode, guestId, phone } = req.body;

  let result;
  if (qrCode) {
    result = await staffService.checkInByQR(eventId, qrCode, req.staffUser);
  } else if (guestId || phone) {
    result = await staffService.checkInByIdentifier(
      eventId,
      { guestId, phone },
      req.staffUser
    );
  } else {
    const { ValidationError } = require("../../shared/errors");
    throw new ValidationError("qrCode, guestId, or phone is required");
  }

  sendSuccess(res, result, result.message || "Guest checked in");
});

/**
 * Manual check in with notes
 * POST /api/v2/staff/events/:eventId/manual-check-in
 * Body: { guestId, note?, overrideDeclined? }
 */
exports.manualCheckIn = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { guestId, note, overrideDeclined } = req.body;

  const result = await staffService.manualCheckIn(
    eventId,
    guestId,
    req.staffUser,
    {
      note,
      overrideDeclined,
    }
  );

  sendSuccess(res, result, "Guest checked in successfully");
});

/**
 * Get event stats
 * GET /api/v2/staff/events/:eventId/stats
 */
exports.getEventStats = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const stats = await staffService.getEventStats(eventId);
  sendSuccess(res, { stats });
});
