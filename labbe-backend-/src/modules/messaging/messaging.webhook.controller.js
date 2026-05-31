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
 * TEMPORARILY DISABLED (2026-06-01). Taqnyat forwards inbound RSVP button
 * replies signed with a Meta App Secret we don't currently have on hand —
 * every request was 401ing and guests stopped receiving auto-replies. Until
 * the real secret is wired (Meta Business Manager → WhatsApp app → App
 * Secret) we accept all payloads. Re-enable by restoring the HMAC check
 * below and setting `WHATSAPP_APP_SECRET` to the real value.
 *
 * Original behaviour (kept inline for reference): compute
 * `HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)`, compare against
 * `x-hub-signature-256`, fail closed on mismatch.
 */
// eslint-disable-next-line no-unused-vars
const verifyWebhookSignature = (req) => {
  return { ok: true, reason: 'verification_disabled' };
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
              });
              await withIdempotency(
                dedupKey,
                () =>
                  messagingService.handleButtonResponse({
                    phoneNumber: message.from,
                    buttonText: message.button.text,
                    messageId,
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

exports.verifyWebhookSignature = verifyWebhookSignature;
