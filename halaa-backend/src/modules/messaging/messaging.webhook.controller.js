/**
 * Messaging webhook controller.
 * Handles GET (Meta verify) and POST (Meta status / button replies) of
 * `/messaging/webhook`.
 */

const crypto = require('crypto');
const messagingService = require('./messaging.service');
const catchAsync = require('../../shared/utils/catchAsync');
const logger = require('../../shared/utils/logger');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');

/**
 * Verify the Meta/WhatsApp HMAC signature on the incoming webhook payload.
 *
 * Computes `HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)` and compares it against
 * the `x-hub-signature-256` header in constant time, failing closed on a
 * missing/mismatched signature. `req.rawBody` is captured for this route only
 * (see app.js `captureRawForWebhook`) because the HMAC is over the exact bytes.
 *
 * `WHATSAPP_WEBHOOK_ALLOW_UNSIGNED` is a temporary operational escape hatch.
 * It defaults to true for the current rollout, as requested by the product
 * owner, so Taqnyat callbacks are accepted even without a Meta app secret.
 * Set it to false after the signed callback secret is available.
 */
const unsignedWebhookAllowed = () =>
  String(process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED ?? 'true').toLowerCase() !==
  'false';

const verifyWebhookSignature = (req) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (unsignedWebhookAllowed()) {
    logger.warn(
      '[webhook] Accepting unsigned WhatsApp callback because WHATSAPP_WEBHOOK_ALLOW_UNSIGNED is enabled.'
    );
    return { ok: true, reason: 'unsigned_webhooks_temporarily_allowed' };
  }

  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        '[webhook] WHATSAPP_APP_SECRET is not set in production — rejecting webhook (fail closed). ' +
          'Set the Meta App Secret to receive inbound RSVP replies.'
      );
      return { ok: false, reason: 'app_secret_not_configured' };
    }
    logger.warn(
      '[webhook] WHATSAPP_APP_SECRET not set (non-production) — skipping signature verification.'
    );
    return { ok: true, reason: 'app_secret_not_configured_dev' };
  }

  const signature = req.get('x-hub-signature-256') || '';
  if (!signature || !req.rawBody) {
    return { ok: false, reason: 'missing_signature' };
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first.
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return { ok: false, reason: 'signature_mismatch' };
  }

  return { ok: true };
};

/**
 * @swagger
 * /messaging/webhook:
 *   post:
 *     summary: WhatsApp webhook callback
 *     description: Receive webhook events from WhatsApp/Meta. The body must be signed with x-hub-signature-256.
 *     tags: [Messaging]
 *     parameters:
 *       - in: header
 *         name: x-hub-signature-256
 *         required: true
 *         schema:
 *           type: string
 *         description: HMAC-SHA256 of the raw body using WHATSAPP_APP_SECRET
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       401:
 *         description: Missing or invalid signature
 */
exports.webhook = catchAsync(async (req, res) => {
  const verification = verifyWebhookSignature(req);
  if (!verification.ok) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or missing signature',
      reason: verification.reason,
    });
  }

  const { object, entry } = req.body;

  // Each inner block is wrapped in its own try/catch and we always send
  // 200 at the end. A per-message error must not break the whole webhook
  // — Meta would retry the entire payload, including messages we already
  // processed. Idempotency provides the dedup safety net for retries
  // Meta sends anyway.
  if (object === 'whatsapp_business_account' && entry) {
    for (const e of entry) {
      const changes = e.changes || [];
      for (const change of changes) {
        // Status updates: per decision D3, the delivery-status field on
        // the guest doc updates last-write-wins (no dedup); only host
        // notifications are deduped, but updateDeliveryStatus doesn't
        // dispatch any. The button-response branch below is the one
        // that triggers a host notification, so the dedup wraps it.
        const statuses = change.value?.statuses || [];
        for (const status of statuses) {
          try {
            if (status.status === 'no_capability' || status.status === 'failed') {
              await messagingService.markGuestAsSmsFallback(status.id);
            } else {
              const tsMs = parseInt(status.timestamp, 10) * 1000;
              await messagingService.updateDeliveryStatus(
                status.id,
                status.status,
                Number.isFinite(tsMs) ? new Date(tsMs) : new Date()
              );
            }
          } catch (statusErr) {
            logger.error('[webhook] status-update failed', {
              statusId: status?.id,
              error: statusErr.message,
            });
          }
        }

        // Button responses (RSVP). Each button-response triggers a host
        // notification inside `handleButtonResponse`. We dedup on the
        // Taqnyat `messageId` if present, else a 30-second-bucket key
        // seeded by phone+button+message-timestamp so a Meta retry within
        // 30s doesn't double-notify the host.
        //
        // Using the payload's `message.timestamp` (Meta-supplied,
        // unix-seconds) instead of `Date.now()` makes the bucket
        // deterministic across cron ticks.
        //
        // The dedup key intentionally does NOT include `eventId` — we
        // don't know it until `handleButtonResponse` resolves the
        // phone → Guest → Event chain. Practical risk of cross-event
        // collision is essentially zero — Meta's `messageId` is globally
        // unique, and the bucket fallback includes phone (which uniquely
        // identifies the guest in the fast majority of cases).
        const messages = change.value?.messages || [];
        for (const message of messages) {
          if (message.type === 'button' && message.button) {
            try {
              const messageId = message.id;
              const originalMessageId = message.context?.id || null;
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

              const requestHash = sha256({
                phoneNumber: String(message.from),
                buttonText: String(message.button.text),
                messageId: messageId || null,
                originalMessageId,
              });
              await withIdempotency(
                dedupKey,
                () =>
                  messagingService.handleButtonResponse({
                    phoneNumber: message.from,
                    buttonText: message.button.text,
                    messageId,
                    originalMessageId,
                  }),
                { scope: 'webhook_dedup', requestHash }
              );
            } catch (buttonErr) {
              logger.error('[webhook] button-response handler failed', {
                messageId: message?.id,
                error: buttonErr.message,
              });
            }
          }
        }
      }
    }
  }

  // Always return 200 OK (Meta contract).
  res.status(200).send('OK');
});

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
 *         description: Webhook verified — returns the challenge token verbatim
 *       403:
 *         description: Verify token mismatch
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

exports.__test = {
  verifyWebhookSignature,
  unsignedWebhookAllowed,
};

exports.verifyWebhookSignature = verifyWebhookSignature;
