/**
 * Messaging webhook service.
 * Handles delivery-status updates and WhatsApp button (RSVP) replies
 * received via the Taqnyat / Meta webhook with monotonic transitions.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Guest = require('../../../models/GuestModel');
const OutboundMessage = require('../../../models/OutboundMessageModel');
const {
  updateOutboundDeliveryStatus,
  markOutboundSmsFallback,
} = require('../../infrastructure/outboundMessageLog');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { NotFoundError } = require('../../shared/errors');
const {
  invitationAllowsReply,
  invitationIncludesQr,
} = require('../../shared/constants');
const { TAQNYAT_SENDER } = require('./messaging.formatting');
const {
  getReplyMessage,
  buildConfirmedCaption,
} = require('../../shared/utils/rsvpMessages');

const ALLOWED_PREVIOUS_STATUSES = {
  failed: ['failed'],
  pending: ['failed', 'pending'],
  sent: ['failed', 'pending', 'sent'],
  delivered: ['failed', 'pending', 'sent', 'delivered'],
  read: ['failed', 'pending', 'sent', 'delivered', 'read'],
};

/**
 * Update a guest's invitation delivery status from a webhook event with strict atomic monotonicity.
 */
async function updateDeliveryStatus(messageId, status, timestamp = new Date()) {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_PREVIOUS_STATUSES, status)) {
    logger.warn('[Messaging] Ignoring unknown delivery status', { messageId, status });
    return { success: false, ignored: true, error: 'UNKNOWN_DELIVERY_STATUS' };
  }

  await updateOutboundDeliveryStatus(messageId, status, timestamp).catch((error) => {
    logger.error('[Messaging] Failed to update outbound delivery record', {
      messageId,
      status,
      error: error.message,
    });
  });

  const guest = await Guest.findOne({ 'invitation.messageId': messageId });
  if (!guest) {
    throw new NotFoundError('Guest');
  }

  const at = timestamp ? new Date(timestamp) : new Date();

  // Status and its timestamp advance together. Lower-rank callbacks can still
  // enrich delivered/read timestamps below, but cannot regress current state.
  await Guest.updateOne(
    {
      'invitation.messageId': messageId,
      'invitation.status': { $in: ALLOWED_PREVIOUS_STATUSES[status] },
    },
    { $set: { 'invitation.status': status, 'invitation.statusUpdatedAt': at } }
  );

  // 3. Two-step timestamp update for deliveredAt (earliest)
  if (status === 'delivered' || status === 'read') {
    await Guest.updateOne(
      { 'invitation.messageId': messageId, $or: [{ 'invitation.deliveredAt': null }, { 'invitation.deliveredAt': { $exists: false } }] },
      { $set: { 'invitation.deliveredAt': at } }
    );
    await Guest.updateOne(
      { 'invitation.messageId': messageId, 'invitation.deliveredAt': { $type: 'date', $gt: at } },
      { $set: { 'invitation.deliveredAt': at } }
    );
  }

  // 4. Two-step timestamp update for readAt (latest)
  if (status === 'read') {
    await Guest.updateOne(
      { 'invitation.messageId': messageId, $or: [{ 'invitation.readAt': null }, { 'invitation.readAt': { $exists: false } }] },
      { $set: { 'invitation.readAt': at } }
    );
    await Guest.updateOne(
      { 'invitation.messageId': messageId, 'invitation.readAt': { $type: 'date', $lt: at } },
      { $set: { 'invitation.readAt': at } }
    );
  }

  return { success: true, guestId: guest._id, status };
}

/**
 * Mark a guest's invitation as fallen back to SMS when Taqnyat reports
 * `no_capability` / `failed` for a WhatsApp send without clobbering delivered state.
 */
async function markGuestAsSmsFallback(messageId) {
  await markOutboundSmsFallback(messageId).catch((error) => {
    logger.error('[Messaging] Failed to mark outbound SMS fallback', {
      messageId,
      error: error.message,
    });
  });

  await Guest.updateOne(
    { 'invitation.messageId': messageId },
    {
      $set: {
        'invitation.effectiveChannel': 'sms',
        'invitation.smsFallback': true,
      },
    }
  );

  await Guest.updateOne(
    {
      'invitation.messageId': messageId,
      'invitation.status': { $in: ['failed', 'pending', 'sent'] },
    },
    {
      $set: {
        'invitation.status': 'sent',
      },
    }
  );

  return Guest.findOne({ 'invitation.messageId': messageId });
}

function normalizeRsvpResponse(buttonText) {
  if (!buttonText || typeof buttonText !== 'string') return null;
  const normalized = buttonText
    .trim()
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const confirmResponses = new Set([
    'احضر', 'ساحضر', 'حضور', 'حاضر', 'تاكيد', 'نعم', 'موافق', 'قبول',
    'تاكيد الحضور', 'confirm', 'confirmed', 'yes', 'attend', 'attending', 'accept'
  ]);
  const declineResponses = new Set([
    'اعتذر', 'ساعتذر', 'اعتذار', 'معتذر', 'رفض', 'لا', 'لن احضر',
    'decline', 'declined', 'no', 'cancel', 'sorry', 'cannot attend', "can't attend"
  ]);

  if (confirmResponses.has(normalized)) return 'confirmed';
  if (declineResponses.has(normalized)) return 'declined';
  return null;
}

/**
 * Handle a WhatsApp button-reply event (RSVP confirm / decline).
 */
async function handleButtonResponse({
  phoneNumber,
  buttonText,
  messageId,
  originalMessageId,
}) {
  const normalized = normalizePhoneNumber(phoneNumber);
  const digits = normalized.replace(/\D/g, '');
  const phoneVariants = new Set([phoneNumber, normalized]);
  if (digits.startsWith('966') && digits.length === 12) {
    phoneVariants.add(digits.slice(3));
    phoneVariants.add('0' + digits.slice(3));
  }

  let guest = null;
  if (originalMessageId) {
    const outbound = await OutboundMessage.findOne({
      provider: 'taqnyat',
      providerMessageId: originalMessageId,
    }).select('guest purpose');

    if (outbound?.purpose === 'event_test_message') {
      logger.info('[Messaging] Ignoring button click from a test invitation', {
        messageId,
        originalMessageId,
      });
      return { success: false, error: 'TEST_REPLY_IGNORED' };
    }

    if (outbound?.guest) {
      guest = await Guest.findOne({
        _id: outbound.guest,
        phone: { $in: Array.from(phoneVariants) },
      }).populate('event');
    }
  }

  if (!guest) {
    logger.warn('[Messaging] Falling back to phone-only RSVP resolution', {
      messageId,
      originalMessageId: originalMessageId || null,
    });
    guest = await Guest.findOne({ phone: { $in: Array.from(phoneVariants) } })
      .sort({ 'invitation.sentAt': -1 })
      .populate('event');
  }

  if (!guest || !guest.event) {
    logger.warn('[Messaging] No guest found for button response', {
      phoneNumber,
      buttonText,
      messageId,
    });
    return { success: false, error: 'GUEST_NOT_FOUND' };
  }

  const event = guest.event;

  if (!invitationAllowsReply(event.invitationType)) {
    logger.info('[Messaging] Reply ignored — event mode does not collect RSVPs', {
      eventId: event._id,
      guestId: guest._id,
      mode: event.invitationType,
    });
    return { success: false, error: 'RSVP_NOT_ENABLED' };
  }

  const newStatus = normalizeRsvpResponse(buttonText);
  if (!newStatus) {
    logger.warn('[Messaging] Ignoring unrecognized RSVP response', {
      guestId: guest._id,
      buttonText,
      messageId,
    });
    return { success: false, error: 'INVALID_BUTTON' };
  }
  const isConfirm = newStatus === 'confirmed';

  if (guest.rsvp?.responded && guest.rsvp?.response === newStatus) {
    logger.info('[Messaging] RSVP already recorded for guest', {
      guestId: guest._id,
      currentStatus: guest.status,
      newStatus,
    });
    return { success: true, alreadyResponded: true };
  }

  guest.status = newStatus;
  guest.rsvp = {
    responded: true,
    response: newStatus,
    respondedAt: new Date(),
    message: buttonText,
  };
  await guest.save();

  try {
    await notificationService.sendToUser(event.host, {
      type: isConfirm ? 'guest_rsvp_accepted' : 'guest_rsvp_declined',
      title: isConfirm ? 'تأكيد حضور جديد' : 'اعتذار عن الحضور',
      titleAr: isConfirm ? 'تأكيد حضور جديد' : 'اعتذار عن الحضور',
      message: `${guest.name} ${isConfirm ? 'أكد الحضور' : 'اعتذر عن الحضور'} لفعالية "${event.eventDetails?.title || 'فعاليتك'}"`,
      messageAr: `${guest.name} ${isConfirm ? 'أكد الحضور' : 'اعتذر عن الحضور'} لفعالية "${event.eventDetails?.title || 'فعاليتك'}"`,
      data: {
        entityType: 'event',
        entityId: event._id,
        metadata: {
          guestId: guest._id,
          guestName: guest.name,
          status: newStatus,
        },
      },
    });
  } catch (notifErr) {
    logger.warn('[Messaging] Failed to send host notification for RSVP', {
      error: notifErr.message,
    });
  }

  const logOptions = {
    logContext: {
      eventId: event._id,
      guestId: guest._id,
      purpose: 'rsvp_auto_reply',
      metadata: { isConfirm, newStatus },
    },
    sensitive: true,
  };

  const qrReply = isConfirm && invitationIncludesQr(event.invitationType);
  const replyText = qrReply
    ? buildConfirmedCaption(event, guest, 'ar')
    : getReplyMessage(newStatus, event, 'ar');
  const qrCodeUrl = qrReply
    ? `https://quickchart.io/qr?text=${encodeURIComponent(guest.qrcode || guest._id.toString())}&size=300`
    : null;

  try {
    const waResult = qrReply
      ? await taqnyat.sendWhatsAppImage(guest.phone, qrCodeUrl, replyText, {
          ...logOptions,
          logContext: { ...logOptions.logContext, purpose: 'rsvp_qr_reply' },
        })
      : await taqnyat.sendWhatsAppText(guest.phone, replyText, logOptions);
    if (!waResult?.success) {
      throw new Error(waResult?.error || 'WhatsApp RSVP reply failed');
    }
  } catch (waErr) {
    logger.warn('[Messaging] WhatsApp RSVP reply failed — falling back to SMS', {
      error: waErr.message,
    });
    const smsText = qrReply
      ? `${replyText}\nرمز الدخول الخاص بك: ${qrCodeUrl}`
      : replyText;
    await taqnyat.sendSMS(guest.phone, smsText, {
      sender: TAQNYAT_SENDER,
      logContext: {
        ...logOptions.logContext,
        purpose: qrReply ? 'rsvp_qr_sms_fallback' : 'rsvp_auto_reply_sms_fallback',
      },
    });
  }

  try {
    await logAudit({
      action: 'messaging.rsvp_button_response',
      actor: { _id: null, role: 'guest' },
      targetType: 'guest',
      targetId: guest._id,
      changes: { after: { status: newStatus } },
      metadata: {
        eventId: event._id,
        phone: phoneNumber,
        buttonText,
        messageId,
      },
    });
  } catch (_) {}

  return { success: true, guestId: guest._id, status: newStatus };
}

module.exports = {
  updateDeliveryStatus,
  markGuestAsSmsFallback,
  handleButtonResponse,
  normalizeRsvpResponse,
};
