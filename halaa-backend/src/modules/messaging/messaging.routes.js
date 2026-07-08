/**
 * Messaging Routes
 * @module modules/messaging/messaging.routes
 */

/**
 * @swagger
 * tags:
 *   name: Messaging
 *   description: SMS, WhatsApp, and email messaging endpoints
 */

const express = require('express');
const router = express.Router();
const messagingController = require('./messaging.controller');
const { protect } = require('../../shared/middleware/auth');
const { requireSubscription } = require('../../shared/middleware/subscription');
const { validateZod } = require('../../shared/middleware/validation');
const { idempotency } = require('../../shared/middleware/idempotency');
const {
  authLimiter,
  bulkOperationLimiter,
  webhookLimiter,
} = require('../../shared/middleware/rateLimiter');
const {
  sendMessageSchema,
  sendBulkSchema,
  retrySchema,
  scheduleSchema,
  reminderSchema,
} = require('./messaging.validation');

// Webhook routes (no auth required — called by Taqnyat / Meta).
router.get('/webhook', messagingController.webhookVerify);
router.post('/webhook', webhookLimiter, messagingController.webhook);

// All routes below require an authenticated user.
router.use(protect);

// Schedule a future bulk send.
router.post(
  '/schedule',
  requireSubscription,
  bulkOperationLimiter,
  idempotency({ scope: 'messaging.schedule' }),
  validateZod(scheduleSchema),
  messagingController.scheduleSend
);

// Send invitation to a single guest.
router.post(
  '/send',
  requireSubscription,
  authLimiter,
  idempotency({ scope: 'messaging.send' }),
  validateZod(sendMessageSchema),
  messagingController.sendToGuest
);

// Send bulk invitations.
router.post(
  '/send-bulk',
  requireSubscription,
  bulkOperationLimiter,
  idempotency({ scope: 'messaging.send_bulk' }),
  validateZod(sendBulkSchema),
  messagingController.sendBulk
);

// Retry failed invitations.
router.post(
  '/retry',
  requireSubscription,
  bulkOperationLimiter,
  idempotency({ scope: 'messaging.retry' }),
  validateZod(retrySchema),
  messagingController.retryFailed
);

// Send reminders to pending guests.
router.post(
  '/send-reminder',
  requireSubscription,
  bulkOperationLimiter,
  idempotency({ scope: 'messaging.reminder' }),
  validateZod(reminderSchema),
  messagingController.sendReminder
);

module.exports = router;
