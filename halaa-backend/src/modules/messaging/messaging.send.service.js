/**
 * Messaging send service.
 * Test, single-guest, bulk, launch batch, and retry flows.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const crypto = require('crypto');
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
  getRequiredEventImageUrl,
  computeInvitationFingerprint,
} = require('./messaging.formatting');
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const { INVITATION_TYPE, EVENT_LIFECYCLE_ALLOWED } = require('../../shared/constants');
const { getActiveEventGuestsFilter } = require('../../shared/utils/guestFilter');

const DISPATCH_CLAIM_TTL_MS = 5 * 60 * 1000;

async function claimFirstInvitationDispatch(guest, eventId) {
  if (guest.invitation?.sent === true) return null;

  const token = crypto.randomUUID();
  const staleBefore = new Date(Date.now() - DISPATCH_CLAIM_TTL_MS);
  const claimed = await Guest.updateOne(
    {
      _id: guest._id,
      event: eventId,
      deleted: { $ne: true },
      'invitation.sent': { $ne: true },
      $or: [
        { 'invitation.dispatchClaimToken': { $exists: false } },
        { 'invitation.dispatchClaimToken': null },
        { 'invitation.dispatchClaimedAt': { $exists: false } },
        { 'invitation.dispatchClaimedAt': { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        'invitation.dispatchClaimToken': token,
        'invitation.dispatchClaimedAt': new Date(),
      },
    }
  );

  if (claimed.modifiedCount !== 1) {
    throw new AppError(
      'An invitation dispatch is already in progress for this guest',
      409,
      'INVITATION_DISPATCH_IN_PROGRESS'
    );
  }
  return token;
}

async function releaseInvitationDispatchClaim(guestId, token) {
  if (!token) return;
  await Guest.updateOne(
    { _id: guestId, 'invitation.dispatchClaimToken': token },
    { $unset: { 'invitation.dispatchClaimToken': 1, 'invitation.dispatchClaimedAt': 1 } }
  );
}

async function reserveInviteCapacity(subscriptionId) {
  if (!subscriptionId) return false;

  const subscription = await Subscription.findById(subscriptionId)
    .select('invitePool');
  if (!subscription) {
    throw new AppError('Event subscription was not found', 409, 'SUBSCRIPTION_NOT_FOUND');
  }
  if (subscription.invitePool === null || subscription.invitePool === undefined) {
    return false;
  }

  const reserved = await Subscription.updateOne(
    {
      _id: subscriptionId,
      invitePool: { $ne: null },
      $expr: {
        $lt: [
          { $ifNull: ['$invitesConsumed', 0] },
          { $add: [{ $ifNull: ['$invitePool', 0] }, { $ifNull: ['$compensationPool', 0] }] },
        ],
      },
    },
    { $inc: { invitesConsumed: 1 } }
  );
  if (reserved.modifiedCount !== 1) {
    throw new AppError('Insufficient invitations remaining in the plan pool', 402, 'INSUFFICIENT_INVITES');
  }
  return true;
}

async function releaseInviteCapacity(subscriptionId, reserved) {
  if (!subscriptionId || !reserved) return;
  await Subscription.updateOne(
    { _id: subscriptionId, invitesConsumed: { $gt: 0 } },
    { $inc: { invitesConsumed: -1 } }
  );
}

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
 * Send a test message for an event.
 * Validates status allowlist, sends test payload, and records canonical test fingerprint.
 */
async function sendTestMessage({ eventId, phoneNumber, channel = 'whatsapp', isAdmin = false }) {
  const event = await Event.findById(eventId).populate('host', 'name');
  if (!event) {
    throw new NotFoundError('Event');
  }

  // Lifecycle check: test messages only allowed before launch
  if (!EVENT_LIFECYCLE_ALLOWED.TEST_MESSAGE.includes(event.status)) {
    throw new AppError(
      `Test messages cannot be sent for events with status "${event.status}"`,
      409,
      'EVENT_LIFECYCLE_CONFLICT'
    );
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
    imageUrl = getRequiredEventImageUrl(event, cached);
    bodyParams = getEventBodyParams(event, 'ضيف تجريبي', cached);

    const components = [
      {
        type: 'body',
        parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
      },
    ];

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
          []
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

  const fingerprint = result.success ? computeInvitationFingerprint(event, cached) : null;

  // Always update the throttle timestamp; success-only fields stay gated.
  const stamped = await Event.updateOne(
    { _id: eventId, status: { $in: EVENT_LIFECYCLE_ALLOWED.TEST_MESSAGE } },
    {
      $set: {
        lastTestAt: new Date(),
        ...(result.success && {
          testMessageSent: true,
          testMessageFingerprint: fingerprint,
          'messagingStatus.preferredChannel': channel,
        }),
      },
    }
  );
  if (stamped.matchedCount !== 1) {
    throw new AppError(
      'Event lifecycle changed while sending the test message',
      409,
      'EVENT_LIFECYCLE_CONFLICT'
    );
  }

  // Expose template/image so the caller can include them in audit metadata.
  return { ...result, templateName: templateName || null, imageUrl, channel };
}

/**
 * Private per-guest primitive: dispatches invitation to a single guest,
 * records database status, handles rate limits, pool charging, and audit logs.
 */
async function _dispatchInvitationToGuest({
  guest,
  event,
  channel = 'sms',
  userId,
  actorRole,
}) {
  const guestId = guest._id;
  const eventId = event._id;
  let dispatchClaimToken = null;
  let inviteReserved = false;

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

  try {
    dispatchClaimToken = await claimFirstInvitationDispatch(guest, eventId);
    if (dispatchClaimToken) {
      inviteReserved = await reserveInviteCapacity(event.subscriptionId);
    }

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
    imageUrl = getRequiredEventImageUrl(event, cached);
    bodyParams = getEventBodyParams(event, guest.name, cached);
    const components = [
      {
        type: 'body',
        parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
      },
    ];

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
          []
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
  } catch (error) {
    await Promise.allSettled([
      releaseInviteCapacity(event.subscriptionId, inviteReserved),
      releaseInvitationDispatchClaim(guestId, dispatchClaimToken),
    ]);
    throw error;
  }

  logger.info('[_dispatchInvitationToGuest] result', {
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

  const isRateLimited =
    !result.success &&
    (result.statusCode === 429 || result.error === 'RATE_LIMITED');
  if (isRateLimited) {
    await Guest.updateOne(
      {
        _id: guestId,
        ...(dispatchClaimToken && { 'invitation.dispatchClaimToken': dispatchClaimToken }),
      },
      {
        $set: {
          ...(dispatchClaimToken && {
            'invitation.sent': false,
            'invitation.status': 'failed',
          }),
          'invitation.rateLimited': true,
          'invitation.lastAttemptAt': new Date(),
          'invitation.lastError': result.error || 'RATE_LIMITED',
        },
        $unset: { 'invitation.dispatchClaimToken': 1, 'invitation.dispatchClaimedAt': 1 },
      }
    );
    await releaseInviteCapacity(event.subscriptionId, inviteReserved);
    return { ...result, rateLimited: true, success: false };
  }

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
    const flip = await Guest.updateOne(
      {
        _id: guestId,
        'invitation.sent': { $ne: true },
        ...(dispatchClaimToken && { 'invitation.dispatchClaimToken': dispatchClaimToken }),
      },
      {
        $set: updateData,
        $unset: { 'invitation.dispatchClaimToken': 1, 'invitation.dispatchClaimedAt': 1 },
      }
    );
    if (flip.modifiedCount !== 1 && inviteReserved) {
      await releaseInviteCapacity(event.subscriptionId, true);
      inviteReserved = false;
    }
    if (flip.modifiedCount !== 1) {
      await releaseInvitationDispatchClaim(guestId, dispatchClaimToken);
    }
    if (flip.modifiedCount === 1 && event.subscriptionId) {
      const firstStamp = await Subscription.updateOne(
        { _id: event.subscriptionId, firstSendAt: null },
        { $set: { firstSendAt: new Date() } }
      ).catch((err) => {
        logger.error('[sendToGuest] firstSendAt stamp failed', { guestId, err: err?.message });
        return null;
      });

      if (firstStamp?.modifiedCount === 1) {
        await EventEntitlement.updateOne(
          { subscriptionId: event.subscriptionId, status: 'unused' },
          { $set: { status: 'consumed', consumedEventId: event._id, consumedAt: new Date() } }
        ).catch(() => {});
      }
    }
  } else {
    await Guest.updateOne(
      {
        _id: guestId,
        'invitation.sent': { $ne: true },
        ...(dispatchClaimToken && { 'invitation.dispatchClaimToken': dispatchClaimToken }),
      },
      {
        $set: updateData,
        $unset: { 'invitation.dispatchClaimToken': 1, 'invitation.dispatchClaimedAt': 1 },
      }
    );
    await releaseInviteCapacity(event.subscriptionId, inviteReserved);
    inviteReserved = false;
  }

  try {
    await logAudit({
      action: 'messaging.send_one',
      actor: { _id: userId || null, role: actorRole || (userId ? 'host' : 'system') },
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
 * Send invitation to a single guest (public entrypoint).
 * Enforces live event status and permission boundaries.
 */
async function sendToGuest({ guestId, eventId, channel = 'sms', userId, isAdmin = false, actorRole }) {
  const [guest, event] = await Promise.all([
    Guest.findById(guestId),
    Event.findById(eventId).populate('host', 'name'),
  ]);

  if (!guest) {
    throw new NotFoundError('Guest');
  }
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (!guest.event || guest.event.toString() !== eventId.toString()) {
    throw new ForbiddenError('Guest does not belong to this event');
  }

  if (!isAdmin && event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  if (!EVENT_LIFECYCLE_ALLOWED.LIVE_SEND.includes(event.status)) {
    throw new AppError(
      'Invitations cannot be sent until the event is live',
      409,
      'EVENT_NOT_LIVE'
    );
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

  return _dispatchInvitationToGuest({
    guest,
    event,
    channel,
    userId,
    actorRole,
  });
}

/**
 * Re-computes and saves authoritative messagingStatus numbers from the Guest collection.
 */
async function _recomputeAuthoritativeMessagingStatus(eventId, guestList = []) {
  const guestFilter = getActiveEventGuestsFilter(eventId, guestList);
  const [totalCount, sentCount, failedCount, pendingCount] = await Promise.all([
    Guest.countDocuments(guestFilter),
    Guest.countDocuments({ ...guestFilter, 'invitation.sent': true }),
    Guest.countDocuments({ ...guestFilter, 'invitation.sent': { $ne: true }, 'invitation.status': 'failed' }),
    Guest.countDocuments({ ...guestFilter, 'invitation.sent': { $ne: true }, 'invitation.status': { $ne: 'failed' } }),
  ]);

  await Event.findByIdAndUpdate(eventId, {
    'messagingStatus.totalMessages': totalCount,
    'messagingStatus.sentCount': sentCount,
    'messagingStatus.failedCount': failedCount,
    'messagingStatus.pendingCount': pendingCount,
    'messagingStatus.bulkSendCompletedAt': new Date(),
    ...(failedCount === 0 && pendingCount === 0 && sentCount > 0 ? {
      'messagingStatus.deliveryStatus': 'delivered',
      'messagingStatus.deliveryExhaustedAt': null,
      'messagingStatus.lastError': null,
    } : {}),
  });

  return { totalCount, sentCount, failedCount, pendingCount };
}

/**
 * Internal Launch Batch method: called by runEventLaunch for scheduled initial
 * launches and retry jobs. Scope is strictly 'internal_event_launch'.
 */
async function sendInitialLaunchBatch({
  eventId,
  guestIds,
  channel = 'sms',
  attemptId,
}) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (!['scheduled', 'live'].includes(event.status)) {
    throw new AppError(
      `Initial launch dispatch is not allowed for status "${event.status}"`,
      409,
      'EVENT_LIFECYCLE_CONFLICT'
    );
  }
  const validGuests = await Guest.find(
    getActiveEventGuestsFilter(eventId, event.guestList, guestIds)
  );

  const effectiveGuests = validGuests;
  const effectiveGuestIds = effectiveGuests.map((g) => g._id.toString());

  if (event.subscriptionId) {
    const sub = await Subscription.findById(event.subscriptionId)
      .select('invitePool compensationPool invitesConsumed');
    if (sub && sub.invitePool !== null && sub.invitePool !== undefined) {
      const remaining =
        (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
      const notYetSent = await Guest.countDocuments({
        ...getActiveEventGuestsFilter(eventId, event.guestList, effectiveGuestIds),
        'invitation.sent': { $ne: true },
      });
      if (notYetSent > remaining) {
        throw new AppError(
          `Insufficient invites: ${notYetSent} to send but ${Math.max(0, remaining)} remaining in plan pool.`,
          402,
          'INSUFFICIENT_INVITES'
        );
      }
    }
  }

  await Event.findByIdAndUpdate(eventId, {
    'messagingStatus.bulkSendStarted': true,
    'messagingStatus.bulkSendStartedAt': new Date(),
    'messagingStatus.preferredChannel': channel,
  });

  const fingerprint =
    attemptId !== undefined && attemptId !== null
      ? attemptId
      : event.lastAttemptAt
      ? new Date(event.lastAttemptAt).getTime()
      : event.attemptCount || 0;

  const scope = 'internal_event_launch';

  const batched = await runBatched(
    effectiveGuests,
    async (guest) => {
      const key = `${scope}:${eventId}:${guest._id}:${fingerprint}`;
      const requestHash = sha256(
        JSON.stringify({ eventId: String(eventId), guestId: String(guest._id), channel })
      );
      return withIdempotency(
        key,
        () => _dispatchInvitationToGuest({ guest, event, channel, userId: null, actorRole: 'system' }),
        { scope, userId: null, requestHash }
      );
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  const successful = batched.results.filter(
    (r) => r.ok && r.value?.success
  ).length;
  const failed = batched.total - successful;
  const details = batched.results.map((r) => ({
    guestId: r.item._id,
    ...(r.ok ? r.value : { success: false, error: r.error }),
  }));

  // Authoritative re-aggregation from DB records
  await _recomputeAuthoritativeMessagingStatus(eventId, event.guestList);

  if (event.subscriptionId && successful > 0) {
    Subscription.findById(event.subscriptionId)
      .select('userId invitePool compensationPool invitesConsumed')
      .then((sub) => sub && maybeNotifyPlanLimit(sub.userId, sub))
      .catch(() => {});
  }

  logger.info('[sendInitialLaunchBatch] complete', {
    eventId,
    channel,
    total: effectiveGuestIds.length,
    successful,
    failed,
  });

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
    partial: failed > 0,
    total: effectiveGuestIds.length,
    successful,
    failed,
    details,
  };
}

/**
 * Send invitations to multiple guests (public entrypoint / manual resend).
 * Defaults scope to 'manual_send'.
 */
async function sendBulk({
  guestIds,
  eventId,
  channel = 'sms',
  userId,
  isAdmin = false,
  actorRole,
  scope = 'manual_send',
  attemptId,
}) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (!isAdmin && event.host && userId && event.host.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  // Public/manual bulk sending requires event to be live
  if (scope !== 'internal_event_launch' && !EVENT_LIFECYCLE_ALLOWED.LIVE_SEND.includes(event.status)) {
    throw new AppError(
      'Invitations cannot be sent until the event is live',
      409,
      'EVENT_NOT_LIVE'
    );
  }

  const decision = await dispatchPolicy.assertCanDispatch(event, { path: `sendBulk:${scope}` });
  if (!decision.allowed) {
    throw new AppError(
      `Invitations can no longer be sent for this event (${decision.reason}).`,
      403
    );
  }

  const validGuests = await Guest.find(
    getActiveEventGuestsFilter(eventId, event.guestList, guestIds)
  );

  const effectiveGuests = validGuests;
  const effectiveGuestIds = effectiveGuests.map((g) => g._id.toString());

  if (event.subscriptionId) {
    const sub = await Subscription.findById(event.subscriptionId)
      .select('invitePool compensationPool invitesConsumed');
    if (sub && sub.invitePool !== null && sub.invitePool !== undefined) {
      const remaining =
        (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
      const notYetSent = await Guest.countDocuments({
        ...getActiveEventGuestsFilter(eventId, event.guestList, effectiveGuestIds),
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
    'messagingStatus.preferredChannel': channel,
  });

  logger.info('[sendBulk] start', {
    eventId,
    channel,
    scope,
    total: effectiveGuestIds.length,
    attemptId: attemptId || null,
  });

  const fingerprint =
    attemptId !== undefined && attemptId !== null
      ? attemptId
      : event.lastAttemptAt
      ? new Date(event.lastAttemptAt).getTime()
      : event.attemptCount || 0;

  const batched = await runBatched(
    effectiveGuests,
    async (guest) => {
      const key = `${scope}:${eventId}:${guest._id}:${fingerprint}`;
      const requestHash = sha256(
        JSON.stringify({ eventId: String(eventId), guestId: String(guest._id), channel })
      );
      return withIdempotency(
        key,
        () => _dispatchInvitationToGuest({ guest, event, channel, userId, actorRole }),
        { scope, userId, requestHash }
      );
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  const successful = batched.results.filter(
    (r) => r.ok && r.value?.success
  ).length;
  const failed = batched.total - successful;
  const details = batched.results.map((r) => ({
    guestId: r.item._id,
    ...(r.ok ? r.value : { success: false, error: r.error }),
  }));

  // Authoritative re-aggregation from DB
  await _recomputeAuthoritativeMessagingStatus(eventId, event.guestList);

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
    partial: failed > 0,
    total: effectiveGuestIds.length,
    successful,
    failed,
    details,
  };
}

/**
 * Retry failed invitations for an event.
 */
async function retryFailed(eventId, channel = 'sms', userId = null, isAdmin = false, actorRole) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (!isAdmin && event.host && userId && event.host.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  const failedGuests = await Guest.find({
    ...getActiveEventGuestsFilter(eventId, event.guestList),
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
      actor: { _id: userId || null, role: actorRole || (userId ? 'host' : 'system') },
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
    attemptId: `retry_failed:${Date.now()}`,
    scope: 'manual_resend',
  });
}

module.exports = {
  sendTestMessage,
  sendInitialLaunchBatch,
  sendToGuest,
  sendBulk,
  retryFailed,
  _recomputeAuthoritativeMessagingStatus,
};
