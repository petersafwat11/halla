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
const { validateObjectId } = require('../../shared/middleware/validation');
const { idempotency } = require('../../shared/middleware/idempotency');

/**
 * RSVP idempotency-key derivation (Phase 3d.2 / FLOW-19-F02 / decision D2).
 *
 * If the client doesn't send `Idempotency-Key`, derive one server-side
 * from `${eventId}:${guestId}:${rsvpChoice}` (Phase 3de decision D2). The
 * eventId is sourced via the `Guest` doc's `event` field — the route
 * doesn't expose eventId in the URL, so we'd need to look it up before
 * deriving the key. To avoid that DB hit on every RSVP we lean on the
 * fact that `guestId` is globally unique and ties to exactly one event,
 * making `${guestId}:${choice}` functionally equivalent. The
 * invitationCode is added so the same guest with multiple invitations
 * (rare; typically pre-Phase-3 legacy data) doesn't collide.
 *
 *   - A double-tap on the same answer is deduplicated (same key).
 *   - A guest changing answers ('confirmed' → 'declined') is a fresh
 *     request (different key, new write, new host notification).
 *
 * L-11: D2 doc spelled out `${eventId}:${guestId}:${choice}`. The code
 * uses `${guestId}:${choice}:${code}` because:
 *   1. Guest is globally unique → guestId already implies eventId.
 *   2. Adding `eventId` would require a DB lookup before key derivation
 *      (the route only has guestId), which we want to avoid for the
 *      idempotency middleware path.
 *   3. `code` (invitationCode) covers the edge case of one guest
 *      record having multiple invitations across events — extremely
 *      rare but cheap to disambiguate.
 * Both forms are functionally equivalent for collision; the code's
 * choice is the cheaper one. D2 doc to be updated.
 */
function deriveRsvpIdempotencyKey(req, _res, next) {
  if (!req.get('idempotency-key')) {
    const guestId = req.params.id;
    const choice = req.body?.response || '';
    const code = req.body?.invitationCode || '';
    const seed = `${guestId}:${choice}:${code}`;
    // 32 hex chars (128 bits) is plenty of collision resistance for an
    // idempotency key; truncating shortens the IdempotencyKey.key index
    // entry without weakening dedup. The model accepts up to 256 chars.
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
 *       - $ref: '#/components/parameters/IdParam'
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
 *                 enum: [confirmed, declined]
 *               invitationCode:
 *                 type: string
 *               message:
 *                 type: string
 *               dietaryRestrictions:
 *                 type: string
 *               plusOnes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: RSVP submitted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:id/rsvp',
  apiLimiter,
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
 *                   type: object
 *                   properties:
 *                     guests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Guest'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
 */
router.post('/events/:eventId', validateObjectId('eventId'), guestsController.addGuest);

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
 *             $ref: '#/components/schemas/AddGuestRequest'
 *     responses:
 *       200:
 *         description: Guest updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/events/:eventId/guests/:guestId', validateObjectId('eventId'), validateObjectId('guestId'), guestsController.updateGuest);

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
 * Phase 3e.3 — Rotate guest QR (FLOW-18-F03).
 *
 * Marks the active post_event GuestAccessToken `isRevoked: true` with
 * `revokedReason: 'rotation'` and issues a fresh token. RBAC: host or
 * whitelabel-admin (admin / super_admin via the routes-level
 * `restrictTo` already in place).
 */
router.post(
  '/events/:eventId/guests/:guestId/rotate-qr',
  validateObjectId('eventId'),
  validateObjectId('guestId'),
  idempotency({ scope: 'guests.rotate_qr' }),
  guestsController.rotateQR
);

/**
 * Phase 3e.4 — Manual revoke (FLOW-21-F03).
 *
 * Distinct from rotation. Marks the active token revoked with
 * `revokedReason: 'manual'`; subsequent scans → 410 Gone, `qr_revoked`.
 */
router.post(
  '/events/:eventId/guests/:guestId/revoke-access',
  validateObjectId('eventId'),
  validateObjectId('guestId'),
  idempotency({ scope: 'guests.revoke_access' }),
  guestsController.revokeAccess
);

module.exports = router;
