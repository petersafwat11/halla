/**
 * Guests Routes
 * @module modules/guests/guests.routes
 */

/**
 * @swagger
 * tags:
 *   name: Guests
 *   description: Guest management and RSVP endpoints
 */

const express = require('express');
const router = express.Router();

const crypto = require('crypto');
const guestsController = require('./guests.controller');
const { protect } = require('../../shared/middleware/auth');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { idempotency } = require('../../shared/middleware/idempotency');
const { requireSubscription, checkGuestLimit } = require('../../shared/middleware/subscription');
const {
  addGuestSchema,
  updateGuestSchema,
  submitRSVPSchema,
} = require('./guests.validation');

/**
 * Derive an RSVP idempotency key from `${guestId}:${choice}:${code}` so a
 * double-tap on the same answer is deduped, but `confirmed → declined` is a
 * fresh request. `guestId` already implies `eventId` (globally unique), so
 * we avoid the extra DB lookup the URL would otherwise require.
 */
function deriveRsvpIdempotencyKey(req, _res, next) {
  if (!req.get('idempotency-key')) {
    const guestId = req.params.id;
    const choice = req.body?.response || '';
    const code = req.body?.invitationCode || '';
    const seed = `${guestId}:${choice}:${code}`;
    const derived = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
    req.headers['idempotency-key'] = `rsvp_${derived}`;
  }
  next();
}

// ============================================
// PUBLIC ROUTES (Guest Portal)
// ============================================

/**
 * @swagger
 * /guests/invitation/{code}:
 *   get:
 *     summary: Get guest by invitation code
 *     description: Retrieve guest details using their unique invitation code
 *     tags: [Guests]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique invitation code
 *     responses:
 *       200:
 *         description: Guest retrieved successfully
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
 *                     guest:
 *                       $ref: '#/components/schemas/Guest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/invitation/:code', apiLimiter, guestsController.getByInvitationCode);

/**
 * @swagger
 * /guests/{id}/rsvp:
 *   post:
 *     summary: Submit RSVP
 *     description: Submit RSVP response for a guest invitation
 *     tags: [Guests]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Guest ID (24-char hex ObjectId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response, invitationCode]
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [confirmed, declined, maybe]
 *               invitationCode:
 *                 type: string
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               dietaryRestrictions:
 *                 type: string
 *                 maxLength: 200
 *               plusOnes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: RSVP submitted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Idempotency replay — request body differs from the original idempotent request for the same key
 *       410:
 *         description: Idempotency replay — original request is no longer cached or the event no longer accepts RSVPs
 */
router.post(
  '/:id/rsvp',
  apiLimiter,
  validateObjectId('id'),
  validateZod(submitRSVPSchema),
  deriveRsvpIdempotencyKey,
  idempotency({ scope: 'guests.rsvp' }),
  guestsController.submitRSVP
);

// ============================================
// PROTECTED ROUTES (Host Management)
// ============================================

router.use(protect);

/**
 * @swagger
 * /guests/events/{eventId}:
 *   get:
 *     summary: Get event guests
 *     description: Get paginated list of guests for an event
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by guest name or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, declined, attended]
 *         description: Filter by RSVP status
 *     responses:
 *       200:
 *         description: Guests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Guest'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/events/:eventId', validateObjectId('eventId'), guestsController.getEventGuests);

/**
 * @swagger
 * /guests/events/{eventId}:
 *   post:
 *     summary: Add guest to event
 *     description: Add a new guest to an event's guest list
 *     tags: [Guests]
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
 *                     guest:
 *                       $ref: '#/components/schemas/Guest'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Guest limit exceeded
 */
router.post(
  '/events/:eventId',
  validateObjectId('eventId'),
  requireSubscription,
  checkGuestLimit(1),
  validateZod(addGuestSchema),
  guestsController.addGuest
);

/**
 * @swagger
 * /guests/events/{eventId}/export:
 *   get:
 *     summary: Export guests as Excel
 *     description: Export event guest list as an Excel spreadsheet
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Excel file downloaded
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
router.get('/events/:eventId/export', validateObjectId('eventId'), guestsController.exportGuests);

/**
 * @swagger
 * /guests/events/{eventId}/guests/{guestId}:
 *   patch:
 *     summary: Update guest
 *     description: Update guest details in an event
 *     tags: [Guests]
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
router.patch(
  '/events/:eventId/guests/:guestId',
  validateObjectId('eventId'),
  validateObjectId('guestId'),
  validateZod(updateGuestSchema),
  guestsController.updateGuest
);

/**
 * @swagger
 * /guests/events/{eventId}/guests/{guestId}:
 *   delete:
 *     summary: Delete guest
 *     description: Remove a guest from an event
 *     tags: [Guests]
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
router.delete('/events/:eventId/guests/:guestId', validateObjectId('eventId'), validateObjectId('guestId'), guestsController.deleteGuest);

/**
 * @swagger
 * /guests/events/{eventId}/guests/{guestId}/rotate-qr:
 *   post:
 *     summary: Rotate guest QR code
 *     description: Revoke the active post-event guest access token and issue a fresh one. Best-effort delivery to the guest's phone via SMS.
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - $ref: '#/components/parameters/GuestIdParam'
 *     responses:
 *       200:
 *         description: QR rotated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GuestRotateQrResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/events/:eventId/guests/:guestId/rotate-qr',
  validateObjectId('eventId'),
  validateObjectId('guestId'),
  idempotency({ scope: 'guests.rotate_qr' }),
  guestsController.rotateQR
);

/**
 * @swagger
 * /guests/events/{eventId}/guests/{guestId}/revoke-access:
 *   post:
 *     summary: Revoke guest access token
 *     description: Manually revoke the active post-event guest access token. Subsequent scans return 410 Gone.
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *       - $ref: '#/components/parameters/GuestIdParam'
 *     responses:
 *       200:
 *         description: "Access revoked (idempotent — succeeds with `wasAlreadyRevoked: true` when no active token exists)"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GuestRevokeAccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/events/:eventId/guests/:guestId/revoke-access',
  validateObjectId('eventId'),
  validateObjectId('guestId'),
  idempotency({ scope: 'guests.revoke_access' }),
  guestsController.revokeAccess
);

module.exports = router;
