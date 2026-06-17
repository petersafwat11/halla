/**
 * Messaging schedule controller.
 * Stages an event launch for a future wall-clock instant.
 */

const messagingService = require('./messaging.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');

/**
 * @swagger
 * /messaging/schedule:
 *   post:
 *     summary: Schedule an event launch
 *     description: Stage an event for cron-driven dispatch at a future date/time. Backend rejects schedules under the SCHEDULE_MIN_LEAD_HOURS threshold (default 48h).
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleSendRequest'
 *     responses:
 *       200:
 *         description: Schedule accepted
 *       400:
 *         description: Schedule too soon, invalid format, or no guests with phone numbers
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
exports.scheduleSend = catchAsync(async (req, res) => {
  const { eventId, scheduledDate, scheduledTime } = req.body;
  const result = await messagingService.scheduleBulkSend({
    eventId,
    scheduledDate,
    scheduledTime,
    userId: req.user._id,
  });
  sendSuccess(res, result);
});
