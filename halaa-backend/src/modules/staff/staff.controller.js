/**
 * Staff Controller
 *
 * NOTE: `revokeStaffToken` and `listStaffTokens` exports below are mounted
 * by the events router (see `events.routes.js`) under
 * `/events/:eventId/staff/:staffId/revoke` and `/events/:eventId/staff-tokens`.
 *
 * @module modules/staff/staff.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
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
  const { page, limit, search, status } = req.query;
  const options = { page: page || 1, limit: limit || 50 };
  const filters = { search, status };

  const result = await staffService.getEventGuests(eventId, filters, options);

  sendSuccess(res, {
    guests: result.data,
    stats: result.stats,
    pagination: result.pagination,
  });
});

/**
 * Check in guest via QR or by identifier
 * POST /api/v2/staff/events/:eventId/check-in
 * Body: { qrCode } XOR { guestId } XOR { phone } — enforced by Zod schema.
 */
exports.checkInGuest = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { qrCode, guestId, phone } = req.body;

  let result;
  if (qrCode) {
    result = await staffService.checkInByQR(eventId, qrCode, req.staffUser);
  } else {
    result = await staffService.checkInByIdentifier(
      eventId,
      { guestId, phone },
      req.staffUser
    );
  }

  sendSuccess(res, result, result.message || "Guest checked in");
});

/**
 * Revoke a staff access token.
 * POST /api/v2/events/:eventId/staff/:staffId/revoke
 */
exports.revokeStaffToken = catchAsync(async (req, res) => {
  const { eventId, staffId } = req.params;
  const result = await staffService.revokeStaffToken(eventId, staffId, req.user);
  sendSuccess(res, result, "Staff token revoked");
});

/**
 * List staff access tokens for an event.
 * GET /api/v2/events/:eventId/staff-tokens
 */
exports.listStaffTokens = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const result = await staffService.listStaffTokens(eventId, req.user);
  sendSuccess(res, result);
});
