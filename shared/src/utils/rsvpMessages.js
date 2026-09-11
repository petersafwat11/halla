import DEFAULT_GUEST_REPLIES from '../constants/guestReplies.cjs';
import { formatDate as formatLocaleDate } from './locale.js';

// Used by both the actual WhatsApp sender and the create-event previews.
// Guest-facing defaults and WhatsApp captions remain Arabic regardless of UI language.
export const DEFAULT_REPLIES = {
  confirmed: { ar: DEFAULT_GUEST_REPLIES.onAttend, en: DEFAULT_GUEST_REPLIES.onAttend },
  declined: { ar: DEFAULT_GUEST_REPLIES.onAbsent, en: DEFAULT_GUEST_REPLIES.onAbsent },
};

export function formatDate(date, lang = 'ar') {
  if (!date) return '';
  const instant = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instant.getTime())) return '';
  return formatLocaleDate(instant, lang === 'ar' ? 'ar' : 'en', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh',
  });
}

export function getReplyMessage(response, event, lang = 'ar') {
  const key = { confirmed: 'onAttend', declined: 'onAbsent' }[response];
  const override = event?.guestReplies?.[key];
  if (override && String(override).trim()) return String(override).trim();
  const defaults = DEFAULT_REPLIES[response] || {};
  return defaults[lang] || defaults.ar || '';
}

export function guestsCount(guest) {
  return 1 + Math.max(0, parseInt(guest?.rsvp?.plusOnes, 10) || 0);
}

export function buildConfirmedCaption(event, guest, lang = 'ar') {
  const details = event?.eventDetails || {};
  const title = details.title || (lang === 'ar' ? 'مناسبة' : 'the event');
  const date = formatDate(details.date, lang);
  const time = details.time || '';
  const venue = details.location?.address || '';
  const lines = [getReplyMessage('confirmed', event, lang), '', `🎉 ${title}`];
  if (date) lines.push(`🗓️ ${date}${time ? ` · ${time}` : ''}`);
  if (venue) lines.push(`📍 ${venue}`);
  lines.push(lang === 'en' ? `👥 Guests: ${guestsCount(guest)}` : `👥 عدد الضيوف: ${guestsCount(guest)}`);
  lines.push('', lang === 'en' ? 'Show this code at the entrance.' : 'يُرجى إبراز هذا الرمز عند الدخول.');
  return lines.join('\n');
}

/** Mode/outcome delivery contract. Portal responses never send a WhatsApp follow-up. */
export function getReplyDelivery(invitationType, response, deliveryMode = 'quick_reply') {
  const enabled = ['reply_and_qr', 'reply_only'].includes(invitationType) && ['confirmed', 'declined'].includes(response);
  const includesQr = enabled && invitationType === 'reply_and_qr' && response === 'confirmed';
  const channel = !enabled ? 'none' : deliveryMode === 'portal_link' ? 'portal' : 'whatsapp';
  return { channel, includesQr, richCaption: includesQr && channel === 'whatsapp' };
}

/** Form adapter; sample guest count is explicitly 1 and the QR is not a real guest code. */
export function buildReplyPreview({ invitationType, isBusinessEvent, response, guestReplies, eventName, eventDate, eventTime, address }) {
  const delivery = getReplyDelivery(invitationType, response, isBusinessEvent ? 'portal_link' : 'quick_reply');
  const event = { guestReplies, eventDetails: { title: eventName, date: eventDate, time: eventTime, location: address } };
  return {
    ...delivery,
    text: delivery.channel === 'none' ? '' : delivery.richCaption
      ? buildConfirmedCaption(event, { rsvp: { plusOnes: 0 } }, 'ar')
      : getReplyMessage(response, event, 'ar'),
  };
}
