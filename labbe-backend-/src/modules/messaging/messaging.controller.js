/**
 * Messaging Controller
 * HTTP handlers for messaging endpoints
 * @module modules/messaging/messaging.controller
 */

const crypto = require('crypto');
const messagingService = require('./messaging.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { ValidationError } = require('../../shared/errors');
const Guest = require('../../../models/GuestModel');

/**
 * Verify the Meta/WhatsApp HMAC signature on the incoming webhook payload.
 * PIPELINE-F02 / FLOW-18-F01: this MUST fail closed. The previous code
 * silently accepted requests when WHATSAPP_APP_SECRET was unset or the
 * x-hub-signature-256 header was missing. WHATSAPP_APP_SECRET is now a
 * required env var (see src/config/env.js), so the only ways verification
 * can fail at runtime are a missing or invalid header — both must be
 * rejected with 401.
 *
 * NOTE: This verifies over JSON.stringify(req.body), which matches the prior
 * behavior. A more robust implementation reads the raw request bytes (since
 * key ordering / whitespace are not guaranteed to match what Meta signed).
 * Capturing raw body is out of scope for Phase 0 and tracked for Phase 3d.
 */
const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || typeof signature !== 'string') {
    return { ok: false, reason: 'missing_signature' };
  }

  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    // env.js validation should make this unreachable; defense in depth.
    return { ok: false, reason: 'misconfigured_secret' };
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const matches = crypto.timingSafeEqual(sigBuf, expBuf);
  return matches ? { ok: true } : { ok: false, reason: 'invalid_signature' };
};

/**
 * Send test message
 * POST /messaging/test
 */
exports.sendTestMessage = catchAsync(async (req, res) => {
  const { eventId, phoneNumber, channel = 'sms' } = req.body;

  if (!eventId || !phoneNumber) {
    throw new ValidationError('Event ID and phone number are required');
  }

  const result = await messagingService.sendTestMessage({ eventId, phoneNumber, channel });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Send invitation to single guest
 * POST /messaging/send
 */
exports.sendToGuest = catchAsync(async (req, res) => {
  const { guestId, eventId, channel = 'sms' } = req.body;

  if (!guestId || !eventId) {
    throw new ValidationError('Guest ID and Event ID are required');
  }

  const result = await messagingService.sendToGuest({ guestId, eventId, channel, userId: req.user._id });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Send bulk invitations
 * POST /messaging/send-bulk
 */
exports.sendBulk = catchAsync(async (req, res) => {
  const { guestIds, eventId, channel = 'sms' } = req.body;

  if (!guestIds?.length || !eventId) {
    throw new ValidationError('Guest IDs array and Event ID are required');
  }

  const result = await messagingService.sendBulk({ guestIds, eventId, channel, userId: req.user._id });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Retry failed invitations
 * POST /messaging/retry
 */
exports.retryFailed = catchAsync(async (req, res) => {
  const { eventId, channel = 'sms' } = req.body;

  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  const result = await messagingService.retryFailed(eventId, channel, req.user._id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get event messaging status
 * GET /messaging/status/:eventId
 */
exports.getStatus = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const result = await messagingService.getEventMessagingStatus(eventId, req.user._id);

  if (!result.success) {
    const statusCode = result.error === 'FORBIDDEN' ? 403 : 404;
    return res.status(statusCode).json({
      success: false,
      error: result.error,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Webhook for Taqnyat/Meta status updates
 * POST /messaging/webhook
 *
 * PIPELINE-F02 / FLOW-18-F01: HMAC verification fails closed. Any request
 * without a valid x-hub-signature-256 (computed with WHATSAPP_APP_SECRET) is
 * rejected with 401. WHATSAPP_APP_SECRET is required at server startup; see
 * src/config/env.js.
 */
exports.webhook = catchAsync(async (req, res) => {
  const verification = verifyWebhookSignature(req);
  if (!verification.ok) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Invalid or missing signature', reason: verification.reason });
  }

  const { object, entry } = req.body;

  // Handle WhatsApp Business API webhook
  if (object === 'whatsapp_business_account' && entry) {
    for (const e of entry) {
      const changes = e.changes || [];
      for (const change of changes) {
        // Handle message status updates
        const statuses = change.value?.statuses || [];
        for (const status of statuses) {
          if (status.status === 'no_capability' || status.status === 'failed') {
            // 'no_capability' = recipient has no WhatsApp account.
            // Taqnyat already sent the SMS fallback natively.
            // Mark the guest record to show "SMS (بديل)" on the events/[id] page.
            await Guest.findOneAndUpdate(
              { 'invitation.messageId': status.id },
              {
                $set: {
                  'invitation.effectiveChannel': 'sms',
                  'invitation.smsFallback': true,
                  'invitation.status': 'sent',
                },
              }
            );
          } else {
            await messagingService.updateDeliveryStatus(
              status.id,
              status.status,
              new Date(parseInt(status.timestamp) * 1000)
            );
          }
        }

        // Handle button responses (RSVP)
        const messages = change.value?.messages || [];
        for (const message of messages) {
          if (message.type === 'button' && message.button) {
            await messagingService.handleButtonResponse({
              phoneNumber: message.from,
              buttonText: message.button.text,
              messageId: message.id,
            });
          }
        }
      }
    }
  }

  // Always return 200 OK to acknowledge webhook
  res.status(200).send('OK');
});

/**
 * Webhook verification (GET request from Meta)
 * GET /messaging/webhook
 */
exports.webhookVerify = catchAsync(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return res.status(500).send('Webhook verify token not configured');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

/**
 * Send reminder to pending guests
 * POST /messaging/send-reminder
 */
exports.sendReminder = catchAsync(async (req, res) => {
  const { eventId, guestIds, channel = 'sms', customMessage, reminderTemplateName } = req.body;

  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  const result = await messagingService.sendReminder({
    eventId,
    guestIds,
    channel,
    customMessage,
    reminderTemplateName,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    message: `Sent reminders to ${result.successful} guests`,
    data: result,
  });
});

/**
 * Check SMS balance
 * GET /messaging/balance
 */
exports.checkBalance = catchAsync(async (req, res) => {
  const result = await messagingService.checkBalance();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      balance: result.balance,
      currency: result.currency,
    },
  });
});

/**
 * Get detailed invitation statistics
 * GET /messaging/stats/:eventId
 */
exports.getDetailedStats = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const result = await messagingService.getDetailedStats(eventId);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    data: result.stats,
  });
});

/**
 * Schedule bulk send for a future date/time
 * POST /messaging/schedule
 */
exports.scheduleSend = catchAsync(async (req, res) => {
  const { eventId, scheduledDate, scheduledTime, channel = 'whatsapp' } = req.body;

  if (!eventId || !scheduledDate || !scheduledTime) {
    throw new ValidationError('Event ID, scheduled date, and scheduled time are required');
  }

  const result = await messagingService.scheduleBulkSend({ eventId, scheduledDate, scheduledTime, channel });

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }

  res.status(200).json({ success: true, data: result });
});

/**
 * Get approved WhatsApp templates from Taqnyat
 * GET /messaging/templates/approved
 */
exports.getApprovedTemplates = catchAsync(async (req, res) => {
  const result = await messagingService.getApprovedTemplates();
  res.status(200).json(result);
});

/**
 * Get WhatsApp template status for an event
 * GET /messaging/template/status/:eventId
 */
exports.getTemplateStatus = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const result = await messagingService.getTemplateStatus(eventId);

  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }

  res.status(200).json({ success: true, data: result });
});
