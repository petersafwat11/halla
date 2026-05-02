/**
 * Staff Routes
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
const { validateObjectId } = require("../../shared/middleware/validation");
const { apiLimiter } = require("../../shared/middleware/rateLimiter");

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

/**
 * @swagger
 * /staff/verify:
 *   get:
 *     summary: Verify staff access
 *     description: Public endpoint to verify staff access via phone+eventId or token. No authentication required.
 *     tags: [Staff]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Staff phone number
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Event ID to verify access for
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
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/verify", apiLimiter, staffController.verifyStaffAccess);

// ============================================
// PROTECTED ROUTES (Staff token required)
// ============================================
router.use(staffAuth);

/**
 * @swagger
 * /staff/events/{eventId}/guests:
 *   get:
 *     summary: Get guest list for event
 *     description: Get paginated guest list for a specific event. Uses staffAuth token (not bearerAuth).
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search guests by name or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by guest status
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Guest list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/events/:eventId/guests",
  validateObjectId("eventId"),
  staffController.getEventGuests
);

/**
 * @swagger
 * /staff/events/{eventId}/check-in:
 *   post:
 *     summary: Check in guest
 *     description: Check in a guest via QR code, guest ID, or phone number. Uses staffAuth token (not bearerAuth).
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qrCode:
 *                 type: string
 *               guestId:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Guest checked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/events/:eventId/check-in",
  validateObjectId("eventId"),
  staffController.checkInGuest
);

/**
 * @swagger
 * /staff/events/{eventId}/manual-check-in:
 *   post:
 *     summary: Manual check-in
 *     description: Manually check in a guest with optional notes and override. Uses staffAuth token (not bearerAuth).
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestId
 *             properties:
 *               guestId:
 *                 type: string
 *               note:
 *                 type: string
 *               overrideDeclined:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Guest manually checked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  "/events/:eventId/manual-check-in",
  validateObjectId("eventId"),
  staffController.manualCheckIn
);

/**
 * @swagger
 * /staff/events/{eventId}/stats:
 *   get:
 *     summary: Get real-time event stats
 *     description: Get real-time check-in statistics for an event. Uses staffAuth token (not bearerAuth).
 *     tags: [Staff]
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Event stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/events/:eventId/stats",
  validateObjectId("eventId"),
  staffController.getEventStats
);

module.exports = router;
