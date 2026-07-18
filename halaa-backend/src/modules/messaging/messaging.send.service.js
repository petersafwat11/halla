/**
 * Messaging send service.
 * Test, single-guest, bulk, and retry flows.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const Subscription = require('../../../models/SubscriptionModel');
const EventEntitlement = require('../../../models/EventEntitlementModel');
const { maybeNotifyPlanLimit } = require('../../shared/utils/planLimitWarning');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { AppError, NotFoundError, ForbiddenError } = require('../../shared/errors');
const dispatchPolicy = require('./messaging.dispatchPolicy.service');
const {
  TAQNYAT_SENDER,
  resolveTaqnyatTemplate,
  getEventBodyParams,
  buildSmsBody,
  getEventImageUrl,
  buildInvitationUrlButton,
} = require('./messaging.formatting');
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const { INVITATION_TYPE } = require('../../shared/constants');

function createInvitationPreviewCode(eventId) {
  const token = jwt.sign(
    { purpose: 'invitation_preview', eventId: String(eventId) },
    config.jwt.secret,
    { expiresIn: '15m' }
  );
  return `preview_${token}`;
}

async function sendSMS(phoneNumber, message, logContext = {}) {
  return taqnyat.sendSMS(phoneNumber, message, { sender: TAQNYAT_SENDER, logContext });
}

/**
 * Send a test message for an event. Throws on failure (rate limit, missing
 * event, or no template). Returns the underlying provider result on success.
 */
async function sendTestMessage({ eventId, phoneNumber, channel = 'whatsapp', isAdmin = false }) {
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

  const frontendUrl = (config.frontend?.url || 'https://halaa.sa').replace(/\/$/, '');
  const previewCode = createInvitationPreviewCode(eventId);
  const rsvpLink = `${frontendUrl}/ar/invitation/${previewCode}`;

  let cached = await resolveTaqnyatTemplate(event);
  const templateName = cached?.templateName;

  let result;
  let imageUrl = null;
  let bodyParams = null;
  let smsBody = null;
  const logOptions = {
    logContext: { eventId: event._id, purpose: 'event_test_message' },
    sensitive: true,
  };
  if (channel === 'whatsapp') {
    if (!templateName) {
      throw new AppError(
        'No Taqnyat template selected for this event',
        400,
        'NO_TEMPLATE_SELECTED'
      );
    }
    cached = taqnyatTemplatesService.assertResolvedInviteTemplateCompatible(
      cached,
      {
        category: event.eventDetails?.type,
        invitationMode: event.invitationType || INVITATION_TYPE.REPLY_AND_QR,
      }
    );
    imageUrl = getEventImageUrl(event, cached);
    bodyParams = getEventBodyParams(event, 'ضيف تجريبي', cached);

    const urlButton = buildInvitationUrlButton(event, cached, previewCode, 'ar');
    const components = [
      {
        type: 'body',
        parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
      },
      urlButton,
    ].filter(Boolean);

    // Native SMS failover: Taqnyat dispatches SMS automatically when the
    // recipient has no WhatsApp capability. Mirror the per-guest path so
    // the test send behaves like a real send.
    smsBody = buildSmsBody(event, 'ضيف تجريبي', rsvpLink);
    const smsFallback = { sender: TAQNYAT_SENDER, body: smsBody };

    result = imageUrl
      ? await taqnyat.sendWhatsAppTemplateWithImage(
          phoneNumber,
          templateName,
          'ar',
          imageUrl,
          bodyParams,
          smsFallback,
          logOptions,
          urlButton ? [urlButton] : []
        )
      : await taqnyat.sendWhatsAppTemplate(
          phoneNumber,
          templateName,
          'ar',
          components,
          smsFallback,
          logOptions
        );
  } else {
    smsBody = buildSmsBody(event, 'ضيف تجريبي', rsvpLink);
    result = await sendSMS(phoneNumber, smsBody, logOptions.logContext);
  }

  logger.info('[sendTestMessage] result', {
    eventId,
    channel,
    phoneNumber,
    templateName: templateName || null,
    imageUrl,
    bodyParams,
    smsBodyPreview: smsBody ? smsBody.slice(0, 80) : null,
    success: !!result.success,
    messageId: result.messageId || null,
    error: result.error || null,
    code: result.code || null,
  });

  // Always update the throttle timestamp; success-only fields stay gated.
  await Event.findByIdAndUpdate(eventId, {
    lastTestAt: new Date(),
    ...(result.success && {
      testMessageSent: true,
      'messagingStatus.preferredChannel': channel,
    }),
  });

  // Expose template/image so the caller can include them in audit metadata.
  return { ...result, templateName: templateName || null, imageUrl, channel };
}

/**
 * Send invitation to a single guest.
 *
 * Note: a 429 from Taqnyat is treated as transient — we mark the guest
 * `rateLimited` and return `{ rateLimited: true }` so the bulk loop and
 * `runBatched`'s 429 handler can treat it as a controlled retry signal
 * rather than a permanent failure.
 */
async function sendToGuest({ guestId, eventId, channel = 'sms', userId, isAdmin = false }) {
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

  // The guest MUST belong to the event being sent. Without this a caller could
  // pair a guest from one event with another event's template/content (and
  // charge the wrong subscription's pool). `sendBulk` validates this for the
  // batch path; this is the single-send equivalent.
  if (!guest.event || guest.event.toString() !== eventId.toString()) {
    throw new ForbiddenError('Guest does not belong to this event');
  }

  if (!isAdmin && event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  const decision = await dispatchPolicy.assertCanDispatch(
    event,
    { path: 'sendToGuest' },
    { requireInvites: !guest.invitation?.sent }
  );
  if (!decision.allowed) {
    throw new AppError(
      `Invitations can no longer be sent for this event (${decision.reason}).`,
      403
    );
  }

  // Points at the live guest portal, keyed by the guest's qrcode
  // (route: app/[lang]/invitation/[code]). The old /rsvp/:eventId/:guestId
  // path had no corresponding page and 404'd.
  const rsvpBase = config.frontend?.url || 'https://halaa.sa';
  const rsvpLink = `${rsvpBase.replace(/\/$/, '')}/ar/invitation/${guest.qrcode}`;

  let cached = await resolveTaqnyatTemplate(event);
  const templateName = cached?.templateName;

  let result;
  let imageUrl = null;
  let bodyParams = null;
  let smsBody = null;
  const logOptions = {
    logContext: {
      eventId: event._id,
      guestId: guest._id,
      userId: userId || null,
      purpose: 'guest_invitation',
    },
    sensitive: true,
  };
  if (channel === 'whatsapp') {
    if (!templateName) {
      throw new AppError(
        'No Taqnyat template selected for this event',
        400,
        'NO_TEMPLATE_SELECTED'
      );
    }

    cached = taqnyatTemplatesService.assertResolvedInviteTemplateCompatible(
      cached,
      {
        category: event.eventDetails?.type,
        invitationMode: event.invitationType || INVITATION_TYPE.REPLY_AND_QR,
      }
    );
    imageUrl = getEventImageUrl(event, cached);
    bodyParams = getEventBodyParams(event, guest.name, cached);
    const urlButton = buildInvitationUrlButton(event, cached, guest.qrcode, 'ar');
    const components = [
      {
        type: 'body',
        parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
      },
      urlButton,
    ].filter(Boolean);

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
          smsFallback,
          logOptions,
          urlButton ? [urlButton] : []
        )
      : await taqnyat.sendWhatsAppTemplate(
          guest.phone,
          templateName,
          'ar',
          components,
          smsFallback,
          logOptions
        );
  } else {
    smsBody = buildSmsBody(event, guest.name, rsvpLink);
    result = await sendSMS(guest.phone, smsBody, logOptions.logContext);
  }

  logger.info('[sendToGuest] result', {
    eventId,
    guestId,
    channel,
    phone: guest.phone,
    templateName: templateName || null,
    imageUrl,
    bodyParams,
    smsBodyPreview: smsBody ? smsBody.slice(0, 80) : null,
    success: !!result.success,
    messageId: result.messageId || null,
    error: result.error || null,
    code: result.code || null,
  });

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

  if (result.success) {
    // Consume one invite per guest, exactly once, at send time. Guard the
    // sent:false->true transition so retries / idempotent replays / concurrent
    // sends can never double-charge — only the update that actually flips
    // `sent` debits the pool. (finalizeWaResult guarantees success ⇒ a real
    // messageId, so we never charge for an undelivered message.)
    const flip = await Guest.updateOne(
      { _id: guestId, 'invitation.sent': { $ne: true } },
      { $set: updateData }
    );
    if (flip.modifiedCount === 1 && event.subscriptionId) {
      // Stamp `firstSendAt` once, on the first real dispatch on this
      // subscription. This is the authoritative "sending started" signal for
      // the per-event re-creation gate (set even at capacity, when the message
      // still goes out but isn't charged below).
      const firstStamp = await Subscription.updateOne(
        { _id: event.subscriptionId, firstSendAt: null },
        { $set: { firstSendAt: new Date() } }
      ).catch((err) => {
        logger.error('[sendToGuest] firstSendAt stamp failed', { guestId, err: err?.message });
        return null;
      });

      // §9.4: on the FIRST send, mark a linked store event-entitlement consumed
      // (best-effort ledger sync; access/consume is enforced by the subscription
      // firstSendAt gate above).
      if (firstStamp?.modifiedCount === 1) {
        await EventEntitlement.updateOne(
          { subscriptionId: event.subscriptionId, status: 'unused' },
          { $set: { status: 'consumed', consumedEventId: event._id, consumedAt: new Date() } }
        ).catch(() => {});
      }

      // Unified pool: per-event and pool subscriptions both carry an
      // invitePool. Skip unlimited plans (invitePool null). The batch-level
      // send-budget pre-check enforces the ceiling, so a plain $inc is safe.
      // Guard the $inc so concurrent batches can't push invitesConsumed past
      // capacity (the batch-level budget pre-check is not atomic across
      // simultaneous sends on the same pool). If already at capacity the
      // message still went out — we just don't over-charge.
      const consume = await Subscription.updateOne(
        {
          _id: event.subscriptionId,
          invitePool: { $ne: null },
          $expr: {
            $lt: [
              { $ifNull: ['$invitesConsumed', 0] },
              { $add: [{ $ifNull: ['$invitePool', 0] }, { $ifNull: ['$compensationPool', 0] }] },
            ],
          },
        },
        { $inc: { invitesConsumed: 1 } }
      ).catch((err) => {
        // A consume failure means a message went out UNCHARGED — surface it
        // loudly (error, not warn) so it can be reconciled, not silently lost.
        logger.error('[sendToGuest] invite consume failed — message sent but UNCHARGED', {
          guestId,
          subscriptionId: String(event.subscriptionId),
          err: err?.message,
        });
        return null;
      });
      // matchedCount 0 (without an error) = the clamp rejected the charge
      // because the pool was already at capacity: an oversend. Log it so the
      // gap between sent and charged is observable.
      if (consume && consume.matchedCount === 0) {
        logger.error('[sendToGuest] invite NOT charged — pool already at capacity (oversend)', {
          guestId,
          subscriptionId: String(event.subscriptionId),
        });
      }
    }
  } else {
    // Never clobber an already-sent guest with a failure write (stale retry).
    await Guest.updateOne(
      { _id: guestId, 'invitation.sent': { $ne: true } },
      { $set: updateData }
    );
  }

  try {
    await logAudit({
      action: 'messaging.send_one',
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
      targetType: 'guest',
      targetId: guestId,
      metadata: {
        eventId,
        channel,
        templateName: templateName || null,
        imageUrl,
        success: !!result.success,
        messageId: result.messageId || null,
        ...(result.error && { error: result.error }),
        ...(result.code && { code: result.code }),
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
  isAdmin = false,
  actorRole,
  scope = 'event_launch',
  attemptId,
}) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (!isAdmin && event.host && userId && event.host.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  // Dispatch-policy gate for every send path that funnels through sendBulk
  // (HTTP bulk send + retryFailed). Blocks terminal events, suspended/deleted
  // owners, missing/owner-mismatched/expired subscriptions, and under-refund
  // assignments. The cron launch/reminder paths already gate upstream; a second
  // check here is idempotent and keeps the gate centralized for all callers.
  const decision = await dispatchPolicy.assertCanDispatch(event, { path: `sendBulk:${scope}` });
  if (!decision.allowed) {
    throw new AppError(
      `Invitations can no longer be sent for this event (${decision.reason}).`,
      403
    );
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

  // Send-budget gate: a send consumes one invite per delivered guest. Block the
  // batch up front when the not-yet-sent guests would exceed the subscription's
  // remaining invites (pool or per-event — both carry an invitePool now).
  // Unlimited plans (invitePool null) are never gated. Retries only re-send
  // already-failed guests, and `notYetSent` reflects prior successes via the
  // per-guest consume, so this stays correct across attempts.
  if (event.subscriptionId) {
    const sub = await Subscription.findById(event.subscriptionId)
      .select('invitePool compensationPool invitesConsumed');
    if (sub && sub.invitePool !== null && sub.invitePool !== undefined) {
      const remaining =
        (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
      const notYetSent = await Guest.countDocuments({
        _id: { $in: effectiveGuestIds },
        event: eventId,
        'invitation.sent': { $ne: true },
      });
      if (notYetSent > remaining) {
        throw new AppError(
          `Insufficient invites: ${notYetSent} to send but ${Math.max(0, remaining)} remaining in your plan.`,
          402,
          'INSUFFICIENT_INVITES'
        );
      }
    }
  }

  await Event.findByIdAndUpdate(eventId, {
    'messagingStatus.bulkSendStarted': true,
    'messagingStatus.bulkSendStartedAt': new Date(),
    'messagingStatus.totalMessages': effectiveGuestIds.length,
    'messagingStatus.sentCount': 0,
    'messagingStatus.failedCount': 0,
    'messagingStatus.pendingCount': effectiveGuestIds.length,
    'messagingStatus.preferredChannel': channel,
  });

  logger.info('[sendBulk] start', {
    eventId,
    channel,
    scope,
    total: effectiveGuestIds.length,
    attemptId: attemptId || null,
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
      const requestHash = sha256(
        JSON.stringify({ eventId: String(eventId), guestId: String(guestId), channel })
      );
      const result = await withIdempotency(
        key,
        () => sendToGuest({ guestId, eventId, channel }),
        { scope, userId, requestHash }
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

  // Plan-usage warning fires here now that consumption lives on the send path.
  // Best-effort; never blocks the response.
  if (event.subscriptionId && successful > 0) {
    Subscription.findById(event.subscriptionId)
      .select('userId invitePool compensationPool invitesConsumed')
      .then((sub) => sub && maybeNotifyPlanLimit(sub.userId, sub))
      .catch(() => {});
  }

  logger.info('[sendBulk] complete', {
    eventId,
    channel,
    scope,
    total: effectiveGuestIds.length,
    successful,
    failed,
  });

  try {
    await logAudit({
      action: 'messaging.bulk_send',
      actor: { _id: userId || null, role: actorRole || (userId ? 'host' : 'system') },
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
async function retryFailed(eventId, channel = 'sms', userId = null, isAdmin = false, actorRole) {
  if (userId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event');
    }
    if (!isAdmin && event.host && event.host.toString() !== userId.toString()) {
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
    isAdmin,
    actorRole,
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
