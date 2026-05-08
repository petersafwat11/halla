/**
 * Messaging send controller.
 * Single-guest send, bulk send, retry, and reminder HTTP handlers.
 */

const messagingService = require('./messaging.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');

/**
 * @swagger
 * /messaging/send:
 *   post:
 *     summary: Send message to a single guest
 *     description: Dispatches an invitation to one guest via SMS or WhatsApp.
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
exports.sendToGuest = catchAsync(async (req, res) => {
  const { guestId, eventId, channel } = req.body;
  const result = await messagingService.sendToGuest({
    guestId,
    eventId,
    channel,
    userId: req.user._id,
  });
  sendSuccess(res, result);
});

/**
 * @swagger
 * /messaging/send-bulk:
 *   post:
 *     summary: Send bulk messages
 *     description: Dispatch invitations to multiple guests at once.
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendBulkRequest'
 *     responses:
 *       200:
 *         description: Bulk send result (with per-guest details)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
exports.sendBulk = catchAsync(async (req, res) => {
  const { guestIds, eventId, channel } = req.body;
  const result = await messagingService.sendBulk({
    guestIds,
    eventId,
    channel,
    userId: req.user._id,
  });
  sendSuccess(res, result);
});

/**
 * @swagger
 * /messaging/retry:
 *   post:
 *     summary: Retry failed invitations
 *     description: Resend invitations to guests whose last attempt failed (capped at 3 retries per guest).
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RetryMessageRequest'
 *     responses:
 *       200:
 *         description: Retry result
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
exports.retryFailed = catchAsync(async (req, res) => {
  const { eventId, channel } = req.body;
  const result = await messagingService.retryFailed(eventId, channel, req.user._id);
  sendSuccess(res, result);
});

/**
 * @swagger
 * /messaging/send-reminder:
 *   post:
 *     summary: Send event reminder to pending guests
 *     description: Reminds guests who haven't responded yet.
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendReminderRequest'
 *     responses:
 *       200:
 *         description: Reminder result
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
exports.sendReminder = catchAsync(async (req, res) => {
  const { eventId, guestIds, channel, customMessage, reminderTemplateName } =
    req.body;
  const result = await messagingService.sendReminder({
    eventId,
    guestIds,
    channel,
    customMessage,
    reminderTemplateName,
    userId: req.user._id,
  });
  sendSuccess(res, result, `Sent reminders to ${result.successful || 0} guests`);
});
