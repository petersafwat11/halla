/**
 * Messaging reminder service.
 * Sends reminders to pending (unanswered) guests or auto/extra reminder batches.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const config = require('../../config');
const { runBatched } = require('../../shared/utils/runBatched');
const { logAudit } = require('../../shared/utils/auditLog');
const { NotFoundError, ForbiddenError, AppError } = require('../../shared/errors');
const dispatchPolicy = require('./messaging.dispatchPolicy.service');
const { EVENT_LIFECYCLE_ALLOWED } = require('../../shared/constants/status');
const { getActiveEventGuestsFilter } = require('../../shared/utils/guestFilter');
const {
  TAQNYAT_SENDER,
  formatDate,
  getEventBodyParams,
  getRequiredEventImageUrl,
  buildSmsBody,
} = require('./messaging.formatting');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const logger = require('../../shared/utils/logger');

async function sendSMS(phoneNumber, message, logContext = {}) {
  return taqnyat.sendSMS(phoneNumber, message, { sender: TAQNYAT_SENDER, logContext });
}

/**
 * Send a reminder to guests who haven't responded.
 */
async function sendReminder({
  eventId,
  guestIds = null,
  channel = 'sms',
  customMessage = null,
  reminderTemplateName,
  userId,
  isAdmin = false,
  actorRole,
}) {
  const event = await Event.findById(eventId).populate('host', 'name');
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (!isAdmin && event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  // Reminders only permitted on live events
  if (!EVENT_LIFECYCLE_ALLOWED.LIVE_SEND.includes(event.status)) {
    throw new AppError(
      'Reminders cannot be sent until the event is live',
      409,
      'EVENT_NOT_LIVE'
    );
  }

  const decision = await dispatchPolicy.assertCanDispatch(
    event,
    { path: 'sendReminder' },
    { requireInvites: false }
  );
  if (!decision.allowed) {
    throw new AppError(
      `Reminders can no longer be sent for this event (${decision.reason}).`,
      403
    );
  }

  const templateName =
    reminderTemplateName || config.taqnyat?.reminderTemplateName;

  const query = {
    ...getActiveEventGuestsFilter(
      eventId,
      event.guestList,
      Array.isArray(guestIds) ? guestIds : null
    ),
    'invitation.sent': true,
    'invitation.status': { $in: ['sent', 'delivered'] },
    'rsvp.responded': { $ne: true },
  };
  const pendingGuests = await Guest.find(query);
  if (pendingGuests.length === 0) {
    return {
      success: true,
      message: 'No pending guests to remind',
      reminded: 0,
    };
  }

  const eventData = {
    title: event.eventDetails?.title || 'Event',
    hostName: event.host?.name || 'Host',
    date: formatDate(event.eventDetails?.date),
  };

  const frontendUrl = (config.frontend?.url || 'https://halaa.sa').replace(/\/$/, '');

  const batched = await runBatched(
    pendingGuests,
    async (guest) => {
      const logOptions = {
        logContext: {
          eventId: event._id,
          guestId: guest._id,
          userId: userId || null,
          purpose: 'guest_reminder_manual',
        },
      };
      const rsvpLink = `${frontendUrl}/ar/invitation/${guest.qrcode}`;
      const defaultMessage = `تذكير: ${eventData.hostName} بانتظار ردك على دعوة "${eventData.title}". للرد: ${rsvpLink}`;
      const message = customMessage || defaultMessage;

      let result;
      if (channel === 'whatsapp') {
        result = await taqnyat.sendWhatsAppTemplate(
          guest.phone,
          templateName,
          'ar',
          [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: eventData.hostName },
                { type: 'text', text: eventData.title },
                { type: 'text', text: eventData.date },
              ],
            },
          ],
          null,
          logOptions
        );
      } else {
        result = await sendSMS(guest.phone, message, logOptions.logContext);
      }

      if (result.success) {
        await Guest.findByIdAndUpdate(guest._id, {
          'invitation.reminderSentAt': new Date(),
          $inc: { 'invitation.reminderCount': 1 },
        });
      }

      return result;
    },
    { concurrency: 5, ratePerSecond: 5 }
  );

  const successful = batched.results.filter(
    (r) => r.ok && r.value?.success
  ).length;
  const failed = batched.total - successful;

  try {
    await logAudit({
      action: 'messaging.reminder',
      actor: { _id: userId || null, role: actorRole || (userId ? 'host' : 'system') },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        channel,
        templateName,
        total: pendingGuests.length,
        successful,
        failed,
      },
      status: failed === 0 ? 'success' : successful === 0 ? 'failure' : 'partial',
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  return {
    success: true,
    reminded: pendingGuests.length,
    successful,
    failed,
  };
}

/**
 * Send an auto-reminder batch (48h-before cron) or an extra-reminder batch
 * (manual schedule).
 */
async function sendAutoReminderBatch({
  event,
  guests,
  reminderType,
  template,
  scope = 'guest_reminder_auto',
  idempotencyPrefix = 'reminder_auto',
  attemptId,
  attemptKey,
}) {
  if (!template) {
    return { successful: 0, failed: guests.length, rateLimited: 0, details: [] };
  }

  const frontendUrl = (config.frontend?.url || 'https://halaa.sa').replace(/\/$/, '');

  const batched = await runBatched(
    guests,
    async (guest) => {
      const rsvpLink = `${frontendUrl}/ar/invitation/${guest.qrcode}`;
      const attemptToken =
        attemptKey || attemptId || `${event._id}:${reminderType}:48h`;
      const key = `${idempotencyPrefix}:${event._id}:${guest._id}:${reminderType}:${attemptToken}`;
      const requestHash = sha256(
        JSON.stringify({
          eventId: String(event._id),
          guestId: String(guest._id),
          reminderType,
          template: template.templateName,
        })
      );

      return withIdempotency(
        key,
        async () => {
          const logOptions = {
            logContext: {
              eventId: event._id,
              guestId: guest._id,
              purpose: reminderType === 'extra' ? 'guest_reminder_extra' : 'guest_reminder_auto',
              metadata: { reminderType },
            },
          };
          const bodyParams = getEventBodyParams(event, guest.name, template);
          const imageUrl = getRequiredEventImageUrl(event, template);
          const smsFallback = {
            sender: TAQNYAT_SENDER,
            body: buildSmsBody(event, guest.name, rsvpLink),
          };

          const wa = imageUrl
            ? await taqnyat.sendWhatsAppTemplateWithImage(
                guest.phone,
                template.templateName,
                template.language || 'ar',
                imageUrl,
                bodyParams,
                smsFallback,
                logOptions
              )
            : await taqnyat.sendWhatsAppTemplate(
                guest.phone,
                template.templateName,
                template.language || 'ar',
                [
                  {
                    type: 'body',
                    parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
                  },
                ],
                smsFallback,
                logOptions
              );

          const isRateLimited =
            !wa?.success &&
            (wa?.statusCode === 429 || wa?.error === 'RATE_LIMITED');

          return {
            guestId: guest._id,
            success: !!wa?.success,
            messageId: wa?.messageId || null,
            error: wa?.error || null,
            rateLimited: isRateLimited,
          };
        },
        { scope, requestHash }
      );
    },
    { concurrency: 5, ratePerSecond: 10 }
  );

  const details = batched.results.map((r) => {
    if (r.ok) return r.value;
    return {
      guestId: r.item?._id,
      success: false,
      error: r.error?.message || 'unknown',
      rateLimited: false,
    };
  });
  let successful = 0;
  let failed = 0;
  let rateLimited = 0;
  for (const d of details) {
    if (d?.rateLimited) rateLimited++;
    else if (d?.success) successful++;
    else failed++;
  }

  logger.info('[sendAutoReminderBatch] done', {
    eventId: String(event._id),
    reminderType,
    total: guests.length,
    successful,
    failed,
    rateLimited,
  });

  return { successful, failed, rateLimited, details };
}

module.exports = {
  sendReminder,
  sendAutoReminderBatch,
};
