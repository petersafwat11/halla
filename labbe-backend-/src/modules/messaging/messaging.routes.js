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
const { validateObjectId } = require('../../shared/middleware/validation');

// Webhook routes (no auth required - called by Taqnyat/Meta)
/**
 * @swagger
 * /messaging/webhook:
 *   get:
 *     summary: WhatsApp webhook verification
 *     description: Verify webhook endpoint for WhatsApp/Meta
 *     tags: [Messaging]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.verify_token
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook verified
 */
router.get('/webhook', messagingController.webhookVerify);

/**
 * @swagger
 * /messaging/webhook:
 *   post:
 *     summary: WhatsApp webhook callback
 *     description: Receive webhook events from WhatsApp/Meta
 *     tags: [Messaging]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook', messagingController.webhook);

// Protected routes
router.use(protect);

// Test message (requires subscription)
/**
 * @swagger
 * /messaging/test:
 *   post:
 *     summary: Send test message
 *     description: Send a test message to verify messaging setup
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, message]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test message sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/test', requireSubscription, messagingController.sendTestMessage);

// Approved templates list (for event creation step 4 dropdown)
router.get('/templates/approved', messagingController.getApprovedTemplates);

// Template status
router.get('/template/status/:eventId', validateObjectId('eventId'), messagingController.getTemplateStatus);

// Schedule bulk send
router.post('/schedule', requireSubscription, messagingController.scheduleSend);

// Send invitations
/**
 * @swagger
 * /messaging/send:
 *   post:
 *     summary: Send message to guest
 *     description: Send a message to a specific guest
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       200:
 *         description: Message sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/send', requireSubscription, messagingController.sendToGuest);

/**
 * @swagger
 * /messaging/send-bulk:
 *   post:
 *     summary: Send bulk messages
 *     description: Send messages to multiple guests at once
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk messages sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/send-bulk', requireSubscription, messagingController.sendBulk);

/**
 * @swagger
 * /messaging/retry:
 *   post:
 *     summary: Retry failed message
 *     description: Retry sending a previously failed message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message retried
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/retry', requireSubscription, messagingController.retryFailed);

// Send reminders
/**
 * @swagger
 * /messaging/send-reminder:
 *   post:
 *     summary: Send event reminder
 *     description: Send a reminder message for an event
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/send-reminder', requireSubscription, messagingController.sendReminder);

// Balance check
/**
 * @swagger
 * /messaging/balance:
 *   get:
 *     summary: Get messaging balance
 *     description: Get current messaging credit balance
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/balance', messagingController.checkBalance);

// Statistics
/**
 * @swagger
 * /messaging/stats/{eventId}:
 *   get:
 *     summary: Get detailed messaging stats
 *     description: Get detailed messaging statistics for an event
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Stats retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats/:eventId', validateObjectId('eventId'), messagingController.getDetailedStats);

// Status
/**
 * @swagger
 * /messaging/status/{eventId}:
 *   get:
 *     summary: Get messaging status
 *     description: Get messaging status for an event
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/EventIdParam'
 *     responses:
 *       200:
 *         description: Status retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/status/:eventId', validateObjectId('eventId'), messagingController.getStatus);

module.exports = router;
