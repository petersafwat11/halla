/**
 * Messaging webhook service.
 * Handles delivery-status updates and WhatsApp button (RSVP) replies
 * received via the Taqnyat / Meta webhook.
 */

const taqnyat = require('../../infrastructure/taqnyat');
const Guest = require('../../../models/GuestModel');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const notificationService = require('../../shared/utils/notificationService');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { NotFoundError } = require('../../shared/errors');
const { TAQNYAT_SENDER } = require('./messaging.formatting');

/**
 * Update a guest's invitation delivery status from a webhook event.
 */
async function updateDeliveryStatus(messageId, status, timestamp) {
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
 * Handle a WhatsApp button-reply event (RSVP confirm / decline / maybe).
 *
 * Resolves the guest by phone (trying multiple format variants), persists
 * the RSVP status, notifies the host, and sends an auto-reply. Falls back
 * to SMS for the QR delivery if the WhatsApp 24h conversation window has
 * expired.
 */
async function handleButtonResponse({ phoneNumber, buttonText, messageId }) {
  // Build phone-format variants — Meta sends e.g. "966512345678"; the DB
  // may store "0512345678" or "512345678".
  const normalized = normalizePhoneNumber(phoneNumber);
  const digits = normalized.replace(/\D/g, '');
  const phoneVariants = new Set([phoneNumber, normalized]);
  if (digits.startsWith('966') && digits.length === 12) {
    phoneVariants.add(digits.slice(3));
    phoneVariants.add('0' + digits.slice(3));
  }

  const guest = await Guest.findOne({ phone: { $in: Array.from(phoneVariants) } })
    .sort({ 'invitation.sentAt': -1 })
    .populate('event');

  if (!guest || !guest.event) {
    logger.warn('[Messaging] Guest not found for phone variants — sending default reply', {
      variants: Array.from(phoneVariants),
      messageId,
    });
    const defaultReply = 'شكراً لردك! لم يتم العثور على بياناتك في النظام.';
    try {
      await taqnyat.sendWhatsAppText(phoneNumber, defaultReply);
    } catch (e) {
      logger.error('[Messaging] Failed to send default reply to unknown guest', {
        error: e.message,
      });
    }
    return { success: false, error: 'GUEST_NOT_FOUND' };
  }

  const event = guest.event;

  const statusMap = {
    'سأحضر': 'confirmed',
    'سأعتذر': 'declined',
    'ربما': 'maybe',
  };
  const rsvpStatus = statusMap[buttonText];
  if (!rsvpStatus) {
    return { success: false, error: 'INVALID_BUTTON' };
  }

  await Guest.findByIdAndUpdate(guest._id, {
    status: rsvpStatus,
    'rsvp.responded': true,
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
      const statusLabel =
        rsvpStatus === 'confirmed'
          ? 'سيحضر ✅'
          : rsvpStatus === 'declined'
          ? 'اعتذر ❌'
          : 'ربما يحضر 🤔';
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

  // Auto-reply text. Prefer canonical `guestReplies.{onAttend,onAbsent,onExpected}`
  // and fall back to legacy `invitationSettings.*AutoReply` during the dual-write
  // window.
  const autoReplyMap = {
    'confirmed':
      event.guestReplies?.onAttend ||
      event.invitationSettings?.attendanceAutoReply ||
      'شكراً لتأكيد حضورك! نتطلع لرؤيتك.',
    'declined':
      event.guestReplies?.onAbsent ||
      event.invitationSettings?.absenceAutoReply ||
      'شكراً لإعلامنا. نتمنى لك يوماً سعيداً.',
    'maybe':
      event.guestReplies?.onExpected ||
      event.invitationSettings?.expectedAttendanceAutoReply ||
      'شكراً. نأمل أن نراك بيننا!',
  };
  const replyMessage = autoReplyMap[rsvpStatus];

  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
    guest.qrcode || guest._id.toString()
  )}&size=300`;

  // sendWhatsAppImage uses the 24h conversation window (session message).
  // If the window has expired, fall back to SMS with the QR link as text.
  try {
    const waResult = await taqnyat.sendWhatsAppImage(phoneNumber, qrCodeUrl, replyMessage);
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
      `${replyMessage}\nرمز الدخول الخاص بك: ${qrCodeUrl}`,
      { sender: TAQNYAT_SENDER }
    );
  }

  return { success: true, status: rsvpStatus };
}

module.exports = {
  updateDeliveryStatus,
  markGuestAsSmsFallback,
  handleButtonResponse,
};
