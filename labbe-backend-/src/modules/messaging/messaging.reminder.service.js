/**
 * Messaging reminder service.
 * Sends reminders to pending (unanswered) guests for an event.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const config = require('../../config');
const { runBatched } = require('../../shared/utils/runBatched');
const { logAudit } = require('../../shared/utils/auditLog');
const { NotFoundError, ForbiddenError } = require('../../shared/errors');
const {
  TAQNYAT_SENDER,
  formatDate,
} = require('./messaging.formatting');

async function sendSMS(phoneNumber, message) {
  return taqnyat.sendSMS(phoneNumber, message, { sender: TAQNYAT_SENDER });
}

/**
 * Send a reminder to guests who haven't responded.
 *
 * @param {Object} params
 * @param {string} params.eventId
 * @param {string[]} [params.guestIds] - Optional specific guest IDs
 * @param {string} [params.channel='sms']
 * @param {string} [params.customMessage]
 * @param {string} [params.reminderTemplateName]
 * @param {string} [params.userId]
 */
async function sendReminder({
  eventId,
  guestIds = null,
  channel = 'sms',
  customMessage = null,
  reminderTemplateName,
  userId,
}) {
  const event = await Event.findById(eventId).populate('host', 'name username');
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  const templateName =
    reminderTemplateName || config.taqnyat?.reminderTemplateName;

  const query = {
    event: eventId,
    'invitation.sent': true,
    'invitation.status': { $in: ['sent', 'delivered'] },
    'rsvp.responded': { $ne: true },
  };
  if (guestIds && guestIds.length > 0) {
    query._id = { $in: guestIds };
  }

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
    hostName: event.host?.name || event.host?.username || 'Host',
    date: formatDate(event.eventDetails?.date),
  };

  const batched = await runBatched(
    pendingGuests,
    async (guest) => {
      const rsvpLink = `${config.frontend?.url || 'https://halaa.sa'}/rsvp/${eventId}/${guest._id}`;
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
          ]
        );
      } else {
        result = await sendSMS(guest.phone, message);
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
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
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

module.exports = {
  sendReminder,
};
