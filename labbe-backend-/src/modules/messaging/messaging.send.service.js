/**
 * Messaging send service.
 * Test, single-guest, bulk, and retry flows.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const config = require('../../config');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { AppError, NotFoundError, ForbiddenError } = require('../../shared/errors');
const {
  TAQNYAT_SENDER,
  resolveTaqnyatTemplate,
  getEventBodyParams,
  buildSmsBody,
  getEventImageUrl,
} = require('./messaging.formatting');

async function sendSMS(phoneNumber, message) {
  return taqnyat.sendSMS(phoneNumber, message, { sender: TAQNYAT_SENDER });
}

/**
 * Send a test message for an event. Throws on failure (rate limit, missing
 * event, or no template). Returns the underlying provider result on success.
 */
async function sendTestMessage({ eventId, phoneNumber, channel = 'sms', isAdmin = false }) {
  const event = await Event.findById(eventId).populate('host', 'name username');
  if (!event) {
    throw new NotFoundError('Event');
  }

  // Per-event throttle: reject if last test was < 30s ago (admins exempt).
  if (!isAdmin && event.lastTestAt) {
    const elapsed = Date.now() - new Date(event.lastTestAt).getTime();
    if (elapsed < 30000) {
      throw new AppError(
        `Please wait ${Math.ceil((30000 - elapsed) / 1000)}s before sending another test message.`,
        429,
        'RATE_LIMITED'
      );
    }
  }

  const frontendUrl = config.frontend?.url || 'https://halaa.sa';
  const rsvpLink = `${frontendUrl}/rsvp/preview?event=${eventId}`;

  const cached = await resolveTaqnyatTemplate(event);
  const templateName =
    cached?.templateName || event.invitationSettings?.selectedTemplate?.name;

  let result;
  if (channel === 'whatsapp') {
    if (!templateName) {
      throw new AppError(
        'No Taqnyat template selected for this event',
        400,
        'NO_TEMPLATE_SELECTED'
      );
    }
    const imageUrl = getEventImageUrl(event);
    const bodyParams = getEventBodyParams(event, 'ضيف تجريبي', cached);

    result = imageUrl
      ? await taqnyat.sendWhatsAppTemplateWithImage(
          phoneNumber,
          templateName,
          'ar',
          imageUrl,
          bodyParams
        )
      : await taqnyat.sendWhatsAppTemplate(phoneNumber, templateName, 'ar', [
          {
            type: 'body',
            parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
          },
        ]);
  } else {
    result = await sendSMS(phoneNumber, buildSmsBody(event, 'ضيف تجريبي', rsvpLink));
  }

  // Always update the throttle timestamp; success-only fields stay gated.
  await Event.findByIdAndUpdate(eventId, {
    lastTestAt: new Date(),
    ...(result.success && {
      testMessageSent: true,
      'messagingStatus.preferredChannel': channel,
    }),
  });

  return result;
}

/**
 * Send invitation to a single guest.
 *
 * Note: a 429 from Taqnyat is treated as transient — we mark the guest
 * `rateLimited` and return `{ rateLimited: true }` so the bulk loop and
 * `runBatched`'s 429 handler can treat it as a controlled retry signal
 * rather than a permanent failure.
 */
async function sendToGuest({ guestId, eventId, channel = 'sms', userId }) {
  const [guest, event] = await Promise.all([
    Guest.findById(guestId),
    Event.findById(eventId).populate('host', 'name username'),
  ]);

  if (!guest) {
    throw new NotFoundError('Guest');
  }
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  const rsvpLink = `${config.frontend?.url || 'https://halaa.sa'}/rsvp/${eventId}/${guestId}`;

  const cached = await resolveTaqnyatTemplate(event);
  const templateName =
    cached?.templateName || event.invitationSettings?.selectedTemplate?.name;

  let result;
  if (channel === 'whatsapp') {
    if (!templateName) {
      throw new AppError(
        'No Taqnyat template selected for this event',
        400,
        'NO_TEMPLATE_SELECTED'
      );
    }

    const imageUrl = getEventImageUrl(event);
    const bodyParams = getEventBodyParams(event, guest.name, cached);

    // SMS fallback automatically dispatched by Taqnyat when the guest
    // has no WhatsApp capability.
    const smsFallback = {
      sender: TAQNYAT_SENDER,
      body: buildSmsBody(event, guest.name, rsvpLink),
    };

    result = imageUrl
      ? await taqnyat.sendWhatsAppTemplateWithImage(
          guest.phone,
          templateName,
          'ar',
          imageUrl,
          bodyParams,
          smsFallback
        )
      : await taqnyat.sendWhatsAppTemplate(
          guest.phone,
          templateName,
          'ar',
          [
            {
              type: 'body',
              parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
            },
          ],
          smsFallback
        );
  } else {
    result = await sendSMS(guest.phone, buildSmsBody(event, guest.name, rsvpLink));
  }

  // 429 → transient. Do NOT mark as failed or increment failedAttempts so
  // the guest stays eligible for the next retry window. The rate-limit
  // recovery happens upstream (runBatched 429 handler / cron).
  const isRateLimited =
    !result.success &&
    (result.statusCode === 429 || result.error === 'RATE_LIMITED');
  if (isRateLimited) {
    await Guest.findByIdAndUpdate(guestId, {
      'invitation.rateLimited': true,
      'invitation.lastAttemptAt': new Date(),
      'invitation.lastError': result.error || 'RATE_LIMITED',
    });
    return { ...result, rateLimited: true };
  }

  // `effectiveChannel` starts equal to the attempted channel. The webhook
  // worker flips it to 'sms' on a Taqnyat 'no_capability' status.
  const updateData = {
    'invitation.sent': result.success,
    'invitation.method': channel,
    'invitation.effectiveChannel': channel,
    'invitation.status': result.success ? 'sent' : 'failed',
    'invitation.lastAttemptAt': new Date(),
  };

  if (result.success) {
    updateData['invitation.sentAt'] = new Date();
    updateData['invitation.messageId'] = result.messageId;
  } else {
    updateData['invitation.lastError'] = result.error;
  }

  await Guest.findByIdAndUpdate(guestId, updateData);

  try {
    await logAudit({
      action: 'messaging.send_one',
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
      targetType: 'guest',
      targetId: guestId,
      metadata: {
        eventId,
        channel,
        success: !!result.success,
        ...(result.error && { error: result.error }),
      },
      status: result.success ? 'success' : 'failure',
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  return result;
}

/**
 * Send invitations to multiple guests. Failure paths throw; partial
 * per-guest failures are reflected in the per-item `details[]`.
 *
 * Idempotency: each per-guest send runs inside `withIdempotency(...)`.
 * The key uses `event.lastAttemptAt.getTime()` (or an explicit
 * `attemptId`) as the attempt fingerprint so distinct attempts (cron
 * tick #1, retry, manual resend) never collide.
 */
async function sendBulk({
  guestIds,
  eventId,
  channel = 'sms',
  userId,
  scope = 'event_launch',
  attemptId,
}) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (event.host && userId && event.host.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  // Validate that all guestIds belong to the event before sending.
  const validGuests = await Guest.find({
    _id: { $in: guestIds },
    event: eventId,
  })
    .select('_id')
    .lean();
  const validGuestIdSet = new Set(validGuests.map((g) => g._id.toString()));
  const filteredGuestIds = guestIds.filter((id) =>
    validGuestIdSet.has(id.toString())
  );
  if (filteredGuestIds.length < guestIds.length) {
    logger.warn('[sendBulk] some guest IDs do not belong to event — skipping', {
      eventId,
      skipped: guestIds.length - filteredGuestIds.length,
    });
  }
  const effectiveGuestIds = filteredGuestIds;

  await Event.findByIdAndUpdate(eventId, {
    'messagingStatus.bulkSendStarted': true,
    'messagingStatus.bulkSendStartedAt': new Date(),
    'messagingStatus.totalMessages': effectiveGuestIds.length,
    'messagingStatus.sentCount': 0,
    'messagingStatus.failedCount': 0,
    'messagingStatus.pendingCount': effectiveGuestIds.length,
    'messagingStatus.preferredChannel': channel,
  });

  // Attempt fingerprint priority:
  //   1. explicit `attemptId` (e.g. retryFailed)
  //   2. `event.lastAttemptAt.getTime()` set by runEventLaunch
  //   3. `event.attemptCount` (legacy fallback)
  // The fingerprint must change between distinct attempts so a cached
  // failure from attempt N doesn't poison attempt N+1.
  const fingerprint =
    attemptId !== undefined && attemptId !== null
      ? attemptId
      : event.lastAttemptAt
      ? new Date(event.lastAttemptAt).getTime()
      : event.attemptCount || 0;

  const batched = await runBatched(
    effectiveGuestIds,
    async (guestId) => {
      const key = `${scope}:${eventId}:${guestId}:${fingerprint}`;
      const result = await withIdempotency(
        key,
        () => sendToGuest({ guestId, eventId, channel }),
        { scope, userId }
      );
      // Persist stats incrementally so a crash mid-loop doesn't lose progress.
      const inc = result?.success
        ? { 'messagingStatus.sentCount': 1, 'messagingStatus.pendingCount': -1 }
        : { 'messagingStatus.failedCount': 1, 'messagingStatus.pendingCount': -1 };
      Event.findByIdAndUpdate(eventId, { $inc: inc })
        .exec()
        .catch(() => {});
      return result;
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  const successful = batched.results.filter(
    (r) => r.ok && r.value?.success
  ).length;
  const failed = batched.total - successful;
  const details = batched.results.map((r) => ({
    guestId: r.item,
    ...(r.ok ? r.value : { success: false, error: r.error }),
  }));

  // Final authoritative write — overrides incremental counts with exact totals.
  await Event.findByIdAndUpdate(eventId, {
    'messagingStatus.sentCount': successful,
    'messagingStatus.failedCount': failed,
    'messagingStatus.pendingCount':
      effectiveGuestIds.length - successful - failed,
    'messagingStatus.bulkSendCompletedAt': new Date(),
  });

  try {
    await logAudit({
      action: 'messaging.bulk_send',
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        channel,
        scope,
        total: effectiveGuestIds.length,
        successful,
        failed,
      },
      status: failed === 0 ? 'success' : successful === 0 ? 'failure' : 'partial',
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  // Bulk is `success: true` if at least one send succeeded; partial-failure
  // recovery happens via `retryFailed`. ALL_SENDS_FAILED throws so the cron
  // and HTTP callers get a typed error to act on.
  if (successful === 0 && effectiveGuestIds.length > 0) {
    const err = new AppError(
      'No invitations were delivered',
      502,
      'ALL_SENDS_FAILED'
    );
    err.details = details;
    err.total = effectiveGuestIds.length;
    err.successful = successful;
    err.failed = failed;
    throw err;
  }

  return {
    success: true,
    total: effectiveGuestIds.length,
    successful,
    failed,
    details,
  };
}

/**
 * Retry failed invitations for an event.
 * `attemptId` is bumped per-call so cached failures from earlier attempts
 * don't short-circuit the resend.
 */
async function retryFailed(eventId, channel = 'sms', userId = null) {
  if (userId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event');
    }
    if (event.host && event.host.toString() !== userId.toString()) {
      throw new ForbiddenError('Not authorized for this event');
    }
  }

  const failedGuests = await Guest.find({
    event: eventId,
    'invitation.status': 'failed',
    $or: [
      { 'invitation.failedAttempts': { $exists: false } },
      { 'invitation.failedAttempts': { $lt: 3 } },
    ],
  });

  if (failedGuests.length === 0) {
    return { success: true, message: 'No failed invitations to retry', retried: 0 };
  }

  await Guest.updateMany(
    { _id: { $in: failedGuests.map((g) => g._id) } },
    { $inc: { 'invitation.failedAttempts': 1 } }
  );

  try {
    await logAudit({
      action: 'messaging.retry',
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
      targetType: 'event',
      targetId: eventId,
      metadata: { channel, retried: failedGuests.length },
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  return sendBulk({
    guestIds: failedGuests.map((g) => g._id.toString()),
    eventId,
    channel,
    userId,
    // retryFailed runs outside the runEventLaunch lifecycle, so the
    // event's `lastAttemptAt` may still point at the original cron
    // attempt that produced the cached failures. Pass a fresh
    // fingerprint to bust the cache and re-send.
    attemptId: `retry_failed:${Date.now()}`,
    scope: 'manual_resend',
  });
}

module.exports = {
  sendTestMessage,
  sendToGuest,
  sendBulk,
  retryFailed,
};
