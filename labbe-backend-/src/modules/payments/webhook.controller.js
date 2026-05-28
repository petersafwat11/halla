/**
 * Moyasar webhook handler.
 *
 * Endpoint: POST /api/v2/payments/webhook
 *
 * AUTHENTICATION
 *   Moyasar sends a constant `secret_token` (configured per-webhook in
 *   the Moyasar dashboard). We compare against
 *   `MOYASAR_WEBHOOK_SECRET` using a constant-time string compare.
 *   The token is sent either inside the body (`secret_token` field) or
 *   in the `X-Moyasar-Auth` header — we accept both.
 *
 *   Optional defense-in-depth: if MOYASAR_WEBHOOK_IP_WHITELIST is set,
 *   we 403 anything not in the list. We do not enforce by default
 *   because Moyasar's published IP ranges rotate and the runtime cost
 *   of a stale list is dropped legitimate webhooks.
 *
 * IDEMPOTENCY
 *   Multiple webhooks for the same `id` + `type` may arrive (Moyasar
 *   retries on non-2xx). We dedupe via `withIdempotency` keyed on
 *   `<moyasarPaymentId>:<eventType>`, scope `payment.webhook`. Duplicate
 *   deliveries replay the cached 200 without re-executing the handler.
 *
 * BODY SHAPE (Moyasar)
 *   {
 *     id: <event uuid>,
 *     type: 'payment_paid' | 'payment_failed' | 'payment_refunded' |
 *           'payment_captured' | 'payment_authorized' | 'payment_voided' |
 *           'payment_updated' | 'invoice_paid' | 'invoice_failed',
 *     account_name: <merchant name>,
 *     live: true | false,
 *     created_at: <iso>,
 *     secret_token: <our secret>,
 *     data: <Payment object — same shape as GET /payments/:id>,
 *   }
 */

const crypto = require('crypto');
const Payment = require('../../../models/PaymentModel');
const Subscription = require('../../../models/SubscriptionModel');
const paymentsService = require('./payments.service');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

const constantTimeEqual = (a, b) => {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch (_) {
    return false;
  }
};

const verifySecret = (req) => {
  const expected = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!expected) {
    logger.error('[moyasar.webhook] MOYASAR_WEBHOOK_SECRET not configured — rejecting all traffic');
    return false;
  }
  const headerToken = req.get('x-moyasar-auth') || req.get('moyasar-auth');
  const bodyToken = req.body?.secret_token;
  return constantTimeEqual(headerToken, expected) || constantTimeEqual(bodyToken, expected);
};

const verifyIp = (req) => {
  const list = (process.env.MOYASAR_WEBHOOK_IP_WHITELIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true; // not enforced
  const ip = (req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
  return list.includes(ip);
};

exports.handle = async (req, res) => {
  if (!verifyIp(req)) {
    logger.warn('[moyasar.webhook] rejected by IP allowlist', { ip: req.ip });
    return res.status(403).json({ status: 'error', message: 'forbidden' });
  }
  if (!verifySecret(req)) {
    return res.status(401).json({ status: 'error', message: 'unauthorized' });
  }

  const { id: eventId, type: eventType, data } = req.body || {};
  if (!eventType || !data?.id) {
    return res.status(400).json({ status: 'error', message: 'malformed payload' });
  }

  const dedupKey = `${data.id}:${eventType}`;

  try {
    const result = await withIdempotency(
      dedupKey,
      async () => {
        // Invoice events route through subscription renewal handling.
        if (eventType === 'invoice_paid' || eventType === 'invoice_failed') {
          return handleInvoiceEvent(eventType, data);
        }

        const payment = await Payment.findOne({ moyasarPaymentId: data.id });
        if (!payment) {
          // We never created this Payment — most likely a manual charge
          // from the Moyasar dashboard, or a stale event for a deleted
          // record. Audit-log and 200 so Moyasar stops retrying.
          await logAudit({
            action: 'payment.webhook_unknown',
            actor: { _id: null, role: 'system' },
            targetType: 'payment',
            metadata: { eventId, eventType, moyasarPaymentId: data.id },
          });
          return { handled: false, reason: 'unknown_payment' };
        }

        payment.applyMoyasarSnapshot(data);
        await payment.save();

        // Dispatch on `purpose` (set by the originating service): a
        // single Payment row finalises EITHER a subscription OR an addon
        // OR a bundled checkout. `runFinalization` swallows errors so the
        // webhook still acks payment-state reconciliation; finalize
        // failure already wrote a `pending_refund` audit row.
        if (eventType === 'payment_paid') {
          await paymentsService.runFinalization(payment);
        }

        await logAudit({
          action: 'payment.webhook_processed',
          actor: { _id: null, role: 'system' },
          targetType: 'payment',
          targetId: payment._id,
          metadata: {
            eventId,
            eventType,
            moyasarPaymentId: data.id,
            status: payment.status,
          },
        });

        return { handled: true, paymentId: payment._id };
      },
      {
        scope: 'payment.webhook',
        requestHash: sha256({
          eventType,
          dataId: data.id,
          status: data.status,
          refunded: data.refunded || 0,
          captured: data.captured || 0,
        }),
        userId: null,
      }
    );
    return res.status(200).json({ success: true, status: 'success', ...result });
  } catch (err) {
    logger.error('[moyasar.webhook] handler error', { error: err?.message });
    // Return 500 so Moyasar retries.
    return res.status(500).json({ status: 'error', message: 'internal' });
  }
};

/**
 * Phase 3 (recurring billing) — handle `invoice_paid` / `invoice_failed`.
 * Looks up the Subscription that opened the invoice (stored as
 * `metadata.pendingInvoiceId`) and renews / marks past_due accordingly.
 */
async function handleInvoiceEvent(eventType, data) {
  const sub = await Subscription.findOne({ 'metadata.pendingInvoiceId': data.id });
  if (!sub) {
    await logAudit({
      action: 'payment.webhook_unknown_invoice',
      actor: { _id: null, role: 'system' },
      targetType: 'subscription',
      metadata: { eventType, invoiceId: data.id },
    });
    return { handled: false, reason: 'unknown_invoice' };
  }

  if (eventType === 'invoice_paid') {
    if (typeof sub.renew === 'function') {
      try {
        await sub.renew();
      } catch (e) {
        logger.error('[invoice_paid] sub.renew() failed', { error: e?.message });
      }
    }
    sub.metadata = { ...(sub.metadata || {}), pendingInvoiceId: null };
    if (sub.status === 'past_due') sub.status = 'active';
    await sub.save();
  } else if (eventType === 'invoice_failed') {
    sub.status = 'past_due';
    await sub.save();
  }

  await logAudit({
    action: 'payment.invoice_processed',
    actor: { _id: null, role: 'system' },
    targetType: 'subscription',
    targetId: sub._id,
    metadata: { eventType, invoiceId: data.id, status: sub.status },
  });

  return { handled: true, subscriptionId: sub._id };
}
