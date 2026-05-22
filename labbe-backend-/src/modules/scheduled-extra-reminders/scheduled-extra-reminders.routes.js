/**
 * Routes for the scheduled-extra-reminders module. Mounted by the events
 * router at `/events/:id/scheduled-reminders` (mergeParams so :id flows
 * through). Auth + tenant scoping live in the events router; access to a
 * specific event is verified inside the service via getEventById's
 * `_buildScopedEventQuery`.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  validateObjectId,
  validateZod,
} = require('../../shared/middleware/validation');

const controller = require('./scheduled-extra-reminders.controller');
const { createSchema } = require('./scheduled-extra-reminders.validation');

/**
 * @swagger
 * /events/{id}/scheduled-reminders:
 *   get:
 *     tags: [ScheduledExtraReminders]
 *     summary: List scheduled extra reminders for an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of scheduled reminders }
 *       401: { description: Unauthorized }
 *       404: { description: Event not found or not in scope }
 */
router.get('/', validateObjectId('id'), controller.list);

/**
 * @swagger
 * /events/{id}/scheduled-reminders:
 *   post:
 *     tags: [ScheduledExtraReminders]
 *     summary: Schedule an extra reminder (consumes reminder quota)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reminderType, guestIds, scheduledFor]
 *             properties:
 *               reminderType:
 *                 type: string
 *                 enum: [reminder_confirmed, reminder_pending]
 *               guestIds:
 *                 type: array
 *                 items: { type: string }
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200: { description: Scheduled }
 *       400: { description: Validation error or insufficient quota }
 *       401: { description: Unauthorized }
 *       404: { description: Event not found or not in scope }
 */
router.post(
  '/',
  validateObjectId('id'),
  validateZod(createSchema),
  controller.create
);

/**
 * @swagger
 * /events/{id}/scheduled-reminders/{rid}:
 *   delete:
 *     tags: [ScheduledExtraReminders]
 *     summary: Cancel a pending scheduled extra reminder (refunds quota)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: rid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cancelled }
 *       400: { description: Cannot cancel non-pending reminder }
 *       409: { description: Reminder already processed }
 *       404: { description: Not found }
 */
router.delete(
  '/:rid',
  validateObjectId('id'),
  validateObjectId('rid'),
  controller.cancel
);

module.exports = router;
