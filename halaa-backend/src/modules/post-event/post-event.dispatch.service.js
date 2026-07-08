/**
 * Post-Event — Taqnyat dispatch helpers.
 *
 * Bulk access-link send (manual via /send-access-links) and post-publish
 * auto-send. Both go through the WhatsApp-template path with native
 * Taqnyat SMS fallback. Pure dispatch concerns; no HTTP layer awareness.
 *
 * @module modules/post-event/post-event.dispatch.service
 */

const config = require('../../config');

const { NotFoundError } = require('../../shared/errors');
const AppError = require('../../shared/errors/AppError');

const Event = require('../../../models/EventModel');
const GuestAccessToken = require('../../../models/GuestAccessTokenModel');
const PostEventContent = require('../../../models/PostEventContentModel');

const notificationService = require('../notifications/notifications.service');
const taqnyat = require('../../infrastructure/taqnyat');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { GUEST_STATUS } = require('../../shared/constants');
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

/**
 * Build per-guest body params, image header URL, and SMS fallback.
 * Shared by bulk-send and post-publish auto-send so both speak the same
 * Taqnyat contract. `imageUrl` is non-null only when the template declares
 * an IMAGE header AND the event has a baked image asset — Taqnyat rejects
 * (code 100) any send that omits a header for an IMAGE-header template.
 */
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

/**
 * Dispatch one WhatsApp template message, routing through the image-header
 * variant when the template requires an IMAGE header.
 */
const dispatchTemplate = (phone, template, language, bodyParams, imageUrl, smsFallback) => {
  if (imageUrl) {
    return taqnyat.sendWhatsAppTemplateWithImage(
      phone,
      template.templateName,
      language,
      imageUrl,
      bodyParams,
      smsFallback
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
    smsFallback
  );
};

/**
 * Send post-event access links to guests via WhatsApp template (with
 * native Taqnyat SMS fallback for recipients that have no WhatsApp).
 *
 * Resolves the Taqnyat template in this priority:
 *   1. `taqnyatTemplateRef` from the request body (single-send override)
 *   2. `content.taqnyatTemplate.templateRef` (host's saved choice)
 *   3. → throw NoTemplateConfigured (frontend renders a CTA)
 */
async function sendBulkAccessLinks(
  eventId,
  user,
  { guestIds, filter = 'attended', taqnyatTemplateRef } = {}
) {
  // Import here to avoid a circular require with post-event.service.
  const { buildScopedEventQuery } = require('./post-event.service');
  const actorId = user?._id?.toString?.() || user?._id;
  const event = await Event.findOne(buildScopedEventQuery(eventId, user))
    .populate('host', 'name username');
  if (!event) throw new NotFoundError('Event');

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

  let tokens = await GuestAccessToken.find(tokenQuery).populate(
    'guest',
    'name phone status'
  );

  if (!guestIds && filter !== 'all') {
    const want =
      filter === 'attended'
        ? [GUEST_STATUS.CHECKED_IN]
        : [GUEST_STATUS.CONFIRMED, GUEST_STATUS.CHECKED_IN];
    tokens = tokens.filter((t) => t.guest && want.includes(t.guest.status));
  }

  const reachable = tokens.filter((t) => t.guest?.phone);
  if (!reachable.length) {
    throw new NotFoundError('No guests with phone numbers found');
  }

  const language = template.language || 'ar';
  // Two clicks of "send post-event link" within the cache TTL deduplicate
  // against the per-guest key, so guests don't get the same message twice.
  const batched = await runBatched(
    reachable,
    (t) => {
      const key = `post_event_access:${eventId}:${t.guest._id}`;
      const requestHash = sha256({
        eventId: String(eventId),
        guestId: String(t.guest._id),
        templateName: template?.templateName || null,
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
            smsFallback
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

  // Persist a delivery summary on the content doc so the host's published
  // view can show "X guests notified" on revisit. `content` was loaded
  // non-lean above, so a targeted update keeps it simple and atomic.
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

/**
 * Generate access tokens for every guest with a phone number and dispatch
 * access-link messages via Taqnyat WhatsApp template (SMS fallback). Runs
 * non-blocking after publishContent(). Skips silently when no template is
 * configured — the host can re-trigger from the UI.
 */
async function autoNotifyAfterPublish(event, content) {
  const templateRef = content.taqnyatTemplate?.templateRef;
  if (!templateRef) {
    logger.warn(
      '[post-event] publish: no taqnyatTemplate.templateRef configured — skipping auto-send',
      { eventId: event._id?.toString() }
    );
    return;
  }

  const template = await resolveTaqnyatTemplate({
    taqnyatTemplate: { templateRef },
  });
  if (!template) {
    logger.warn(
      '[post-event] publish: template not found in cache — skipping auto-send',
      {
        eventId: event._id?.toString(),
        templateRef: templateRef.toString(),
      }
    );
    return;
  }

  const guests = (event.guestList || []).filter((g) => g.phone);
  if (!guests.length) return;

  const language = template.language || 'ar';

  await runBatched(
    guests,
    (guest) => {
      const requestHash = sha256({
        eventId: String(event._id),
        guestId: String(guest._id),
        templateName: template?.templateName || null,
      });
      return withIdempotency(
        `post_event_publish:${event._id}:${guest._id}`,
        async () => {
          const tokenDoc = await GuestAccessToken.createForGuest(
            guest._id,
            event._id,
            'post_event',
            30
          );
          const accessLink = buildAccessLink(tokenDoc.token);
          const { bodyParams, imageUrl, smsFallback } = buildSendArgs(
            event,
            guest,
            template,
            accessLink,
            tokenDoc.expiresAt
          );
          return dispatchTemplate(
            guest.phone,
            template,
            language,
            bodyParams,
            imageUrl,
            smsFallback
          );
        },
        { scope: 'post_event_publish', requestHash }
      ).catch((err) => {
        logger.error('[post-event] notify guest failed', {
          eventId: event._id?.toString(),
          guestId: guest._id?.toString(),
          error: err.message,
        });
        return { ok: false };
      });
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  try {
    await notificationService.sendToUser(event.host?._id || event.host, {
      type: 'post_event_published',
      title: 'Post-Event Content Published',
      titleAr: 'تم نشر محتوى ما بعد المناسبة',
      message: `Your post-event content for "${event.eventDetails?.title}" has been published to ${guests.length} guests.`,
      messageAr: `تم نشر محتوى ما بعد مناسبة "${event.eventDetails?.title}" لـ ${guests.length} ضيف.`,
      data: { entityType: 'event', entityId: event._id },
    });
  } catch (err) {
    logger.error('[post-event] notify host failed', {
      eventId: event._id?.toString(),
      error: err.message,
    });
  }
}

module.exports = {
  buildAccessLink,
  sendBulkAccessLinks,
  autoNotifyAfterPublish,
};
