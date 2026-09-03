/**
 * Post-Event — Taqnyat dispatch helpers.
 * Bulk access-link send (manual via /send-access-links and publishAndNotify).
 * @module modules/post-event/post-event.dispatch.service
 */

const config = require('../../config');
const { NotFoundError, AppError } = require('../../shared/errors');
const Event = require('../../../models/EventModel');
const GuestAccessToken = require('../../../models/GuestAccessTokenModel');
const PostEventContent = require('../../../models/PostEventContentModel');
const taqnyat = require('../../infrastructure/taqnyat');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { GUEST_STATUS } = require('../../shared/constants');
const { EVENT_LIFECYCLE_ALLOWED } = require('../../shared/constants/status');
const { getActiveEventGuestsFilter } = require('../../shared/utils/guestFilter');
const { resolveTaqnyatTemplateRef } = require('../events/templateRefResolver');
const {
  TAQNYAT_SENDER,
  resolveTaqnyatTemplate,
  getPostEventBodyParams,
  getEventImageUrl,
  buildPostEventAccessLinkSmsBody,
} = require('../messaging/messaging.formatting');

const buildAccessLink = (token) => {
  const frontendUrl =
    config.frontend?.url || process.env.FRONTEND_URL || 'https://halaa.sa';
  return `${frontendUrl}/ar/post-event?token=${token}`;
};

const noTemplateError = () => {
  const err = new AppError(
    'No Taqnyat template configured for post-event access links',
    400,
    'NO_TEMPLATE_CONFIGURED'
  );
  err.body = {
    reason: 'no_template',
    cta: '/host/settings/messaging-templates',
  };
  return err;
};

const buildSendArgs = (event, guest, template, accessLink, expiresAt) => {
  const bodyParams = getPostEventBodyParams(event, guest.name, template, {
    link: accessLink,
    expiresAt,
  });
  const imageUrl = getEventImageUrl(event, template);
  const smsBody = buildPostEventAccessLinkSmsBody(event, guest.name, accessLink);
  return {
    bodyParams,
    imageUrl,
    smsFallback: { sender: TAQNYAT_SENDER, body: smsBody },
  };
};

const dispatchTemplate = (
  phone,
  template,
  language,
  bodyParams,
  imageUrl,
  smsFallback,
  logOptions = {}
) => {
  if (imageUrl) {
    return taqnyat.sendWhatsAppTemplateWithImage(
      phone,
      template.templateName,
      language,
      imageUrl,
      bodyParams,
      smsFallback,
      logOptions
    );
  }
  return taqnyat.sendWhatsAppTemplate(
    phone,
    template.templateName,
    language,
    [
      {
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text })),
      },
    ],
    smsFallback,
    logOptions
  );
};

/**
 * Send post-event access links to guests via WhatsApp template.
 */
async function sendBulkAccessLinks(
  eventId,
  user,
  { guestIds, filter = 'attended', taqnyatTemplateRef, attemptId } = {}
) {
  const { buildScopedEventQuery } = require('./post-event.service');
  const actorId = user?._id?.toString?.() || user?._id;
  const event = await Event.findOne(buildScopedEventQuery(eventId, user))
    .populate('host', 'name');
  if (!event) throw new NotFoundError('Event');

  if (!EVENT_LIFECYCLE_ALLOWED.POST_EVENT_NOTIFY.includes(event.status)) {
    throw new AppError(
      `Cannot send post-event access links when event status is '${event.status}'`,
      409,
      'EVENT_NOT_COMPLETED'
    );
  }

  const content = await PostEventContent.findOne({ event: eventId });
  if (!content) throw new NotFoundError('Post-event content');

  const overrideRef = taqnyatTemplateRef
    ? await resolveTaqnyatTemplateRef(taqnyatTemplateRef)
    : null;
  const effectiveRef = overrideRef || content.taqnyatTemplate?.templateRef;

  if (!effectiveRef) throw noTemplateError();

  const template = await resolveTaqnyatTemplate({
    taqnyatTemplate: { templateRef: effectiveRef },
  });
  if (!template) throw noTemplateError();

  const tokenQuery = {
    event: eventId,
    expiresAt: { $gt: new Date() },
    isRevoked: false,
  };
  if (guestIds?.length) tokenQuery.guest = { $in: guestIds };

  let tokens = await GuestAccessToken.find(tokenQuery).populate({
    path: 'guest',
    select: 'name phone status deleted event',
    match: getActiveEventGuestsFilter(eventId, event.guestList),
  });

  // Filter out tokens where guest is null (soft-deleted or not in active list)
  tokens = tokens.filter((t) => t.guest && t.guest.phone);

  if (!guestIds && filter !== 'all') {
    const want =
      filter === 'attended'
        ? [GUEST_STATUS.CHECKED_IN]
        : [GUEST_STATUS.CONFIRMED, GUEST_STATUS.CHECKED_IN];
    tokens = tokens.filter((t) => want.includes(t.guest.status));
  }

  const reachable = tokens;
  if (!reachable.length) {
    throw new NotFoundError('No guests with phone numbers found for the selected audience');
  }

  if (!attemptId) {
    throw new AppError(
      'Idempotency-Key header is required for post-event dispatch',
      400,
      'IDEMPOTENCY_KEY_REQUIRED'
    );
  }
  const requestAttemptId = attemptId;

  const batched = await runBatched(
    reachable,
    (t) => {
      const key = `post_event_access:${eventId}:${t.guest._id}:${requestAttemptId}`;
      const requestHash = sha256({
        eventId: String(eventId),
        guestId: String(t.guest._id),
        templateName: template?.templateName || null,
        requestAttemptId,
      });
      return withIdempotency(
        key,
        async () => {
          const accessLink = buildAccessLink(t.token);
          const { bodyParams, imageUrl, smsFallback } = buildSendArgs(
            event,
            t.guest,
            template,
            accessLink,
            t.expiresAt
          );
          return dispatchTemplate(
            t.guest.phone,
            template,
            language,
            bodyParams,
            imageUrl,
            smsFallback,
            {
              logContext: {
                eventId: event._id,
                guestId: t.guest._id,
                userId: actorId || null,
                purpose: 'post_event_access',
              },
            }
          );
        },
        { scope: 'post_event_access', userId: actorId, requestHash }
      );
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  const sent = [];
  const failed = [];
  let whatsappCount = 0;
  let smsCount = 0;
  for (const r of batched.results) {
    if (r.ok && r.value?.success === true) {
      const channel = r.value?.status === 'sms' ? 'sms' : 'whatsapp';
      sent.push({
        guestId: r.item.guest._id,
        guestName: r.item.guest.name,
        phone: r.item.guest.phone,
        channel,
      });
      if (channel === 'sms') smsCount += 1;
      else whatsappCount += 1;
    } else {
      failed.push({
        guestId: r.item.guest._id,
        phone: r.item.guest.phone,
        error: r.error || r.value?.error,
      });
    }
  }

  await PostEventContent.updateOne(
    { _id: content._id },
    {
      $set: {
        'stats.lastSend': {
          at: new Date(),
          total: reachable.length,
          whatsapp: whatsappCount,
          sms: smsCount,
          failed: failed.length,
          audience: filter,
        },
      },
    }
  ).catch((err) => {
    logger.error('[post-event] failed to persist stats.lastSend', {
      eventId: String(eventId),
      error: err.message,
    });
  });

  logAudit({
    action: 'post_event.access_links_sent',
    actor: { _id: actorId },
    targetType: 'event',
    targetId: event._id,
    metadata: {
      templateRef: effectiveRef,
      templateName: template.templateName,
      count: sent.length,
      filter,
      attemptId: requestAttemptId,
      channelBreakdown: {
        whatsapp: whatsappCount,
        sms: smsCount,
        failed: failed.length,
      },
    },
  }).catch(() => {});

  return {
    sent: sent.length,
    failed: failed.length,
    templateRef: effectiveRef,
    templateName: template.templateName,
    channelBreakdown: {
      whatsapp: whatsappCount,
      sms: smsCount,
      failed: failed.length,
    },
    errors: failed,
    summary: {
      total: reachable.length,
      sent: sent.length,
      failed: failed.length,
    },
  };
}

module.exports = {
  buildAccessLink,
  sendBulkAccessLinks,
};
