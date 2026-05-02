/**
 * Guests Controller
 * HTTP request handling for guest portal and host guest management
 * @module modules/guests/guests.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated, sendPaginated, sendDeleted } = require('../../shared/utils/responseHelper');
const guestsService = require('./guests.service');

// ============================================
// GUEST PORTAL (Public)
// ============================================

/**
 * Get guest by invitation code
 * GET /api/v2/guests/invitation/:code
 */
exports.getByInvitationCode = catchAsync(async (req, res) => {
  const result = await guestsService.getGuestByCode(req.params.code);
  sendSuccess(res, result);
});

/**
 * Submit RSVP
 * POST /api/v2/guests/:id/rsvp
 */
exports.submitRSVP = catchAsync(async (req, res) => {
  const { response, message, dietaryRestrictions, plusOnes, invitationCode } = req.body;
  const result = await guestsService.submitRSVP(req.params.id, response, {
    message,
    dietaryRestrictions,
    plusOnes,
    invitationCode,
  });
  sendSuccess(res, result, 'RSVP submitted successfully');
});

// ============================================
// HOST GUEST MANAGEMENT (Protected)
// ============================================

/**
 * Get event guests
 * GET /api/v2/guests/events/:eventId
 */
exports.getEventGuests = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };

  const result = await guestsService.getEventGuests(
    req.params.eventId,
    req.user._id,
    filters,
    options
  );

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Add guest to event
 * POST /api/v2/guests/events/:eventId
 */
exports.addGuest = catchAsync(async (req, res) => {
  const result = await guestsService.addGuest(
    req.params.eventId,
    req.body,
    req.user._id
  );
  sendCreated(res, result, 'Guest added successfully');
});

/**
 * Update guest
 * PATCH /api/v2/guests/events/:eventId/guests/:guestId
 */
exports.updateGuest = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  const result = await guestsService.updateGuest(
    eventId,
    guestId,
    req.body,
    req.user._id
  );
  sendSuccess(res, result, 'Guest updated successfully');
});

/**
 * Delete guest
 * DELETE /api/v2/guests/events/:eventId/guests/:guestId
 */
exports.deleteGuest = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  await guestsService.deleteGuest(eventId, guestId, req.user._id);
  sendDeleted(res, 'Guest deleted successfully');
});

/**
 * Rotate a guest's QR (Phase 3e.3 / FLOW-18-F03).
 * POST /api/v2/guests/events/:eventId/guests/:guestId/rotate-qr
 */
exports.rotateQR = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  const result = await guestsService.rotateGuestQR(eventId, guestId, req.user);
  sendSuccess(res, result, 'QR rotated');
});

/**
 * Manually revoke a guest's access token (Phase 3e.4 / FLOW-21-F03).
 * POST /api/v2/guests/events/:eventId/guests/:guestId/revoke-access
 */
exports.revokeAccess = catchAsync(async (req, res) => {
  const { eventId, guestId } = req.params;
  const result = await guestsService.revokeGuestAccess(eventId, guestId, req.user);
  sendSuccess(res, result, 'QR revoked');
});

/**
 * Export guests to Excel
 * GET /api/v2/guests/events/:eventId/export
 */
exports.exportGuests = catchAsync(async (req, res) => {
  const buffer = await guestsService.exportGuestsExcel(
    req.params.eventId,
    req.user._id
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=guests-${req.params.eventId}.xlsx`
  );
  res.send(buffer);
});
