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

const guestsController = require('./guests.controller');
const { protect } = require('../../shared/middleware/auth');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');
const { validateObjectId } = require('../../shared/middleware/validation');

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
router.post('/:id/rsvp', apiLimiter, guestsController.submitRSVP);

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

module.exports = router;
