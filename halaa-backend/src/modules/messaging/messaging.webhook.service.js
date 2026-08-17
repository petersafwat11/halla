/**
 * Messaging webhook service.
 * Handles delivery-status updates and WhatsApp button (RSVP) replies
 * received via the Taqnyat / Meta webhook.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Guest = require('../../../models/GuestModel');
const OutboundMessage = require('../../../models/OutboundMessageModel');
const {
  updateOutboundDeliveryStatus,
  markOutboundSmsFallback,
} = require('../../infrastructure/outboundMessageLog');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
// Use the gated notifications service so a host who turned off
// `guestResponses` in Settings doesn't get a WhatsApp-RSVP push.
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

/**
 * Update a guest's invitation delivery status from a webhook event.
 */
async function updateDeliveryStatus(messageId, status, timestamp) {
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

  const updateData = { 'invitation.status': status };
  if (status === 'delivered') {
    updateData['invitation.deliveredAt'] = timestamp;
  } else if (status === 'read') {
    updateData['invitation.readAt'] = timestamp;
  }

  await Guest.findByIdAndUpdate(guest._id, updateData);
  return { success: true, guestId: guest._id, status };
}

/**
 * Mark a guest's invitation as fallen back to SMS when Taqnyat reports
 * `no_capability` / `failed` for a WhatsApp send. Used by the webhook
 * controller — extracted here to keep the controller free of model
 * imports.
 */
async function markGuestAsSmsFallback(messageId) {
  await markOutboundSmsFallback(messageId).catch((error) => {
    logger.error('[Messaging] Failed to mark outbound SMS fallback', {
      messageId,
      error: error.message,
    });
  });
  return Guest.findOneAndUpdate(
    { 'invitation.messageId': messageId },
    {
      $set: {
        'invitation.effectiveChannel': 'sms',
        'invitation.smsFallback': true,
        'invitation.status': 'sent',
      },
    }
  );
}

/**
 * Handle a WhatsApp button-reply event (RSVP confirm / decline).
 *
 * Resolves the guest by phone (trying multiple format variants), persists
 * the RSVP status, notifies the host, and sends an auto-reply. Falls back
 * to SMS for the QR delivery if the WhatsApp 24h conversation window has
 * expired.
 */
async function handleButtonResponse({
  phoneNumber,
  buttonText,
  messageId,
  originalMessageId,
}) {
  // Build phone-format variants — Meta sends e.g. "966512345678"; the DB
  // may store "0512345678" or "512345678".
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
    logger.warn('[Messaging] Guest not found for phone variants — sending default reply', {
      variants: Array.from(phoneVariants),
      messageId,
    });
    const defaultReply = 'شكراً لردك! لم يتم العثور على بياناتك في النظام.';
    try {
      await taqnyat.sendWhatsAppText(phoneNumber, defaultReply, {
        logContext: { purpose: 'rsvp_unknown_guest_reply' },
      });
    } catch (e) {
      logger.error('[Messaging] Failed to send default reply to unknown guest', {
        error: e.message,
      });
    }
    return { success: false, error: 'GUEST_NOT_FOUND' };
  }

  const event = guest.event;
  const replyLogOptions = {
    logContext: {
      eventId: event._id,
      guestId: guest._id,
      purpose: 'rsvp_auto_reply',
      metadata: { inboundMessageId: messageId || null },
    },
  };

  if (!invitationAllowsReply(event.invitationType)) {
    logger.warn('[Messaging] Ignoring RSVP button for a no-reply invitation', {
      eventId: event._id,
      guestId: guest._id,
      invitationType: event.invitationType,
      messageId,
    });
    return { success: false, error: 'REPLY_NOT_ALLOWED' };
  }

  const statusMap = {
    'سأحضر': 'confirmed',
    'سأعتذر': 'declined',
  };
  const rsvpStatus = statusMap[buttonText];
  if (!rsvpStatus) {
    return { success: false, error: 'INVALID_BUTTON' };
  }

  await Guest.findByIdAndUpdate(guest._id, {
    status: rsvpStatus,
    'rsvp.responded': true,
    'rsvp.response': rsvpStatus,
    'rsvp.respondedAt': new Date(),
  });

  try {
    await logAudit({
      action: 'guest.rsvp.button',
      actor: { _id: null, role: 'system' },
      targetType: 'guest',
      targetId: guest._id,
      metadata: {
        eventId: event._id,
        rsvpStatus,
        messageId,
      },
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  try {
    if (event.host) {
      const statusLabel = rsvpStatus === 'confirmed' ? 'سيحضر ✅' : 'اعتذر ❌';
      await notificationService.sendToUser(event.host, {
        type: 'guest_rsvp',
        title: 'رد ضيف جديد',
        message: `${guest.name} — ${statusLabel}`,
        data: { eventId: event._id, guestId: guest._id, status: rsvpStatus },
      });
    }
  } catch (notifErr) {
    logger.error('[Messaging] Failed to notify host of RSVP', { error: notifErr.message });
  }

  // Reply copy from shared source of truth (per-event override → default).
  // WhatsApp invites are Arabic-templated, so replies use Arabic.
  const replyMessage = getReplyMessage(rsvpStatus, event, 'ar');

  // Only a CONFIRMED guest on a QR-bearing invitation type receives the entry
  // pass (QR image + rich caption). Declined guests — and confirmed guests on
  // a reply_only invitation (no QR) — get a plain text reply.
  if (rsvpStatus !== 'confirmed' || !invitationIncludesQr(event.invitationType)) {
    try {
      const waResult = await taqnyat.sendWhatsAppText(phoneNumber, replyMessage, replyLogOptions);
      if (!waResult.success) throw new Error(waResult.error || 'WA text failed');
    } catch (waErr) {
      logger.warn('[Messaging] WhatsApp text reply failed, falling back to SMS', {
        error: waErr.message,
      });
      await taqnyat.sendSMS(phoneNumber, replyMessage, {
        sender: TAQNYAT_SENDER,
        logContext: { ...replyLogOptions.logContext, purpose: 'rsvp_auto_reply_sms_fallback' },
      });
    }
    return { success: true, status: rsvpStatus };
  }

  // Confirmed → QR image of the guest's qrcode + a formatted caption carrying
  // event data + guest count + entry instructions.
  const caption = buildConfirmedCaption(event, guest, 'ar');
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
    guest.qrcode || guest._id.toString()
  )}&size=300`;

  // sendWhatsAppImage uses the 24h conversation window (session message).
  // If the window has expired, fall back to SMS with the QR link as text.
  try {
    const waResult = await taqnyat.sendWhatsAppImage(
      phoneNumber,
      qrCodeUrl,
      caption,
      { ...replyLogOptions, logContext: { ...replyLogOptions.logContext, purpose: 'rsvp_qr_reply' } }
    );
    if (!waResult.success) {
      throw new Error(waResult.error || 'WA image failed');
    }
  } catch (waErr) {
    logger.warn(
      '[Messaging] WhatsApp image send failed, falling back to SMS for QR delivery',
      { error: waErr.message }
    );
    await taqnyat.sendSMS(
      phoneNumber,
      `${caption}\nرمز الدخول الخاص بك: ${qrCodeUrl}`,
      {
        sender: TAQNYAT_SENDER,
        logContext: { ...replyLogOptions.logContext, purpose: 'rsvp_qr_sms_fallback' },
      }
    );
  }

  return { success: true, status: rsvpStatus };
}

module.exports = {
  updateDeliveryStatus,
  markGuestAsSmsFallback,
  handleButtonResponse,
};
