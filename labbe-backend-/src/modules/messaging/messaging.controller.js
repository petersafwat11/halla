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
const { withIdempotency } = require('../../shared/utils/idempotency');

/**
 * Verify the Meta/WhatsApp HMAC signature on the incoming webhook payload.
 *
 * PIPELINE-F02 / FLOW-18-F01: fail closed when WHATSAPP_APP_SECRET is unset
 * or x-hub-signature-256 is missing/invalid.
 *
 * H-19: HMAC is computed over the *raw* request bytes, not over
 * `JSON.stringify(req.body)`. The previous behaviour false-negatived
 * against legitimate Meta payloads when the JSON re-serialisation reordered
 * keys or normalised whitespace. `req.rawBody` is captured by the
 * `express.json({ verify })` hook in app.js for the webhook route. If for
 * any reason rawBody is absent (defense in depth — should not happen in
 * production), we fall back to JSON.stringify and log a warning.
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

  let payload;
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    payload = req.rawBody;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[messaging.webhook] rawBody missing — falling back to JSON.stringify. '
        + 'Verify express.json({ verify }) is wired in app.js.'
    );
    payload = Buffer.from(JSON.stringify(req.body || {}));
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(payload)
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
  //
  // We never want a per-message error to break the whole webhook — Meta
  // would retry the entire payload, including messages we already
  // processed. Each inner block is therefore wrapped in its own
  // try/catch and we always send 200 at the end. Idempotency provides
  // the dedup safety net for retries Meta sends anyway.
  if (object === 'whatsapp_business_account' && entry) {
    for (const e of entry) {
      const changes = e.changes || [];
      for (const change of changes) {
        // Handle message status updates.
        //
        // Phase 3d.3 (FLOW-18-F02): per decision D3, the delivery-status
        // *field* on the guest doc updates last-write-wins (no dedup);
        // only host notifications are deduped, but updateDeliveryStatus
        // doesn't dispatch any. The button-response branch below is the
        // one that triggers a host notification, so the dedup wraps it.
        const statuses = change.value?.statuses || [];
        for (const status of statuses) {
          try {
            if (status.status === 'no_capability' || status.status === 'failed') {
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
              const tsMs = parseInt(status.timestamp, 10) * 1000;
              await messagingService.updateDeliveryStatus(
                status.id,
                status.status,
                Number.isFinite(tsMs) ? new Date(tsMs) : new Date()
              );
            }
          } catch (statusErr) {
            console.error(
              `[webhook] status-update for ${status?.id} failed:`,
              statusErr.message
            );
          }
        }

        // Handle button responses (RSVP). Each button-response triggers a
        // host notification inside `handleButtonResponse`. We dedup on
        // the Taqnyat `messageId` if present, else a 30-second-bucket
        // key seeded by phone+button+message-timestamp (per D3) so a Meta
        // retry within 30s doesn't double-notify the host.
        //
        // Using the payload's `message.timestamp` (Meta-supplied,
        // unix-seconds) instead of `Date.now()` makes the bucket
        // deterministic: two webhook copies of the same event always
        // hash to the same 30s window even if they arrive seconds
        // apart on different cron ticks.
        //
        // L-10: the dedup key intentionally does NOT include `eventId`.
        // We don't know the eventId until `handleButtonResponse` resolves
        // the phone → Guest → Event chain, and gating the lookup on the
        // dedup means we can't include the result IN the key. Practical
        // risk of cross-event collision is essentially zero — Meta's
        // `messageId` is globally unique, and the bucket fallback
        // includes phone (which uniquely identifies the guest in the
        // fast majority of cases). If we ever see a real collision we
        // can move the dedup INSIDE handleButtonResponse, after the
        // Guest lookup, and key on `${eventId}:${guestId}:${buttonText}`.
        const messages = change.value?.messages || [];
        for (const message of messages) {
          if (message.type === 'button' && message.button) {
            try {
              const messageId = message.id;
              const tsSec = parseInt(message.timestamp, 10);
              const bucketSeed = Number.isFinite(tsSec)
                ? Math.floor(tsSec / 30)
                : Math.floor(Date.now() / 30000);
              const dedupKey = messageId
                ? `webhook_button:${messageId}`
                : `webhook_button:${crypto
                    .createHash('sha256')
                    .update(`${message.from}:${message.button.text}:${bucketSeed}`)
                    .digest('hex')
                    .slice(0, 32)}`;

              await withIdempotency(
                dedupKey,
                () =>
                  messagingService.handleButtonResponse({
                    phoneNumber: message.from,
                    buttonText: message.button.text,
                    messageId,
                  }),
                { scope: 'webhook_dedup' }
              );
            } catch (buttonErr) {
              console.error(
                `[webhook] button-response handler for ${message?.id} failed:`,
                buttonErr.message
              );
            }
          }
        }
      }
    }
  }

  // Always return 200 OK to acknowledge webhook (per Meta contract).
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
