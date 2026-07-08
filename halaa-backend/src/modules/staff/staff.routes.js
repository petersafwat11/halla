/**
 * Staff Routes
 *
 * NOTE: two staff endpoints (`POST /events/:eventId/staff/:staffId/revoke`
 * and `GET /events/:eventId/staff-tokens`) are mounted on the events router
 * for URL-shape consistency. Their handlers ship from this module
 * (`staff.controller.js`).
 *
 * @module modules/staff/staff.routes
 */

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Event staff check-in management endpoints
 */

const express = require("express");
const router = express.Router();

const staffController = require("./staff.controller");
const { staffAuth } = require("../../shared/middleware/staffAuth");
const {
  validateObjectId,
  validateZod,
} = require("../../shared/middleware/validation");
const { apiLimiter } = require("../../shared/middleware/rateLimiter");
const {
  verifyStaffAccessQuerySchema,
  checkInBodySchema,
  getEventGuestsQuerySchema,
} = require("./staff.validation");

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

/**
 * @swagger
 * /staff/verify:
 *   get:
 *     summary: Verify staff access
 *     description: |
 *       Public endpoint to verify staff access via either `token` OR
 *       `phone`+`eventId` (mutually exclusive). Returns a 24h staff
 *       session JWT on success.
 *     tags: [Staff]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Staff phone number (required together with eventId)
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Event ID (required together with phone)
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Staff access token (alternative to phone+eventId)
 *     responses:
 *       200:
 *         description: Staff access verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffVerifyResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         description: Token revoked or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffGoneResponse'
 */
router.get(
  "/verify",
  apiLimiter,
  validateZod(verifyStaffAccessQuerySchema, "query"),
  staffController.verifyStaffAccess
);

// ============================================
// PROTECTED ROUTES (Staff token required)
// ============================================
router.use(staffAuth);

/**
 * @swagger
 * /staff/events/{eventId}/guests:
 *   get:
 *     summary: Get guest list for event
 *     description: |
 *       Paginated guest list for a specific event. Uses staffAuth token.
 *       Returned `stats` includes the `lastCheckIn` timestamp.
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search guests by name, phone, or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [invited, confirmed, declined, checked_in, maybe]
 *         description: Filter by guest status
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Guest list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffGuestListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         description: Staff token revoked or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffGoneResponse'
 */
router.get(
  "/events/:eventId/guests",
  validateObjectId("eventId"),
  validateZod(getEventGuestsQuerySchema, "query"),
  staffController.getEventGuests
);

/**
 * @swagger
 * /staff/events/{eventId}/check-in:
 *   post:
 *     summary: Check in guest
 *     description: |
 *       Check in a guest. Body must contain exactly one of `qrCode`,
 *       `guestId`, or `phone`. Idempotent at the DB level — replays
 *       return `alreadyCheckedIn: true` with the original `checkedInAt`.
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [qrCode]
 *                 properties:
 *                   qrCode:
 *                     type: string
 *               - required: [guestId]
 *                 properties:
 *                   guestId:
 *                     type: string
 *                     pattern: '^[0-9a-fA-F]{24}$'
 *               - required: [phone]
 *                 properties:
 *                   phone:
 *                     type: string
 *     responses:
 *       200:
 *         description: Guest checked in (or was already checked in)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffCheckInResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         description: Staff token revoked or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffGoneResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/events/:eventId/check-in",
  apiLimiter,
  validateObjectId("eventId"),
  validateZod(checkInBodySchema, "body"),
  staffController.checkInGuest
);

module.exports = router;
