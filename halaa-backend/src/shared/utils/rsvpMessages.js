/**
 * Shared RSVP reply copy + entry-pass builders.
 *
 * Single source of truth for the guest-facing messages shown after an RSVP,
 * used by BOTH surfaces so web and WhatsApp stay in sync:
 *   - Web portal   → guests.service.submitRSVP (HTTP response)
 *   - WhatsApp      → messaging.webhook.service.handleButtonResponse (auto-reply)
 *
 * Per-event overrides live on `event.guestReplies.{onAttend,onAbsent}`
 * (see EventModel). When an override is absent we fall back to the professional
 * defaults below. Defaults are intentionally NOT baked into the schema so we can
 * improve copy without a migration.
 */

const { formatRiyadh } = require('./timezone');

/** Format an event date in Asia/Riyadh wall-clock. '' when no date. */
function formatDate(date, lang = 'ar') {
  if (!date) return '';
  return formatRiyadh(date, {
    style: 'date',
    locale: lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US-u-ca-gregory-nu-latn',
    options: {
      calendar: 'gregory',
      numberingSystem: 'latn',
    },
  });
}

/** Default reply copy by response + language. */
const DEFAULT_REPLIES = {
  confirmed: {
    ar: 'شكرًا لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. 🎉',
    en: "Thank you for confirming! We're delighted you'll be joining us. 🎉",
  },
  declined: {
    ar: 'شكراً لإخبارنا. سنفتقدك حقاً، وندعوك في أي وقت آخر.',
    en: "Thank you for letting us know. We'll truly miss you — you're welcome anytime.",
  },
};

const OVERRIDE_KEY = {
  confirmed: 'onAttend',
  declined: 'onAbsent',
};

/**
 * Resolve the reply message for a response: per-event override first,
 * then the localized default.
 */
function getReplyMessage(response, event, lang = 'ar') {
  const override = event?.guestReplies?.[OVERRIDE_KEY[response]];
  if (override && String(override).trim()) return String(override).trim();
  const byResponse = DEFAULT_REPLIES[response] || {};
  return byResponse[lang] || byResponse.ar || '';
}

/** Party size = the guest + any plus-ones they added (web only; WhatsApp = 1). */
function guestsCount(guest) {
  return 1 + Math.max(0, parseInt(guest?.rsvp?.plusOnes, 10) || 0);
}

/**
 * Structured entry-pass payload returned on a confirmed RSVP (web HTTP shape).
 * `code` stays the guest QR payload so door scanners are unaffected.
 */
function buildEntryPass(event, guest, lang = 'ar', { logoUrl = null, brandName = null, website = null } = {}) {
  const ed = event?.eventDetails?.toObject?.() || event?.eventDetails || {};
  const loc = ed.location?.toObject?.() || ed.location || {};
  return {
    guestName: guest?.name || '',
    code: guest?.qrcode || (guest?._id ? guest._id.toString() : ''),
    guestsCount: guestsCount(guest),
    brandName: brandName || null,
    website: website || null,
    logoUrl: logoUrl || null,
    event: {
      title: ed.title || '',
      date: ed.date || null,
      time: ed.time || '',
      venue: loc.address || '',
    },
  };
}

/**
 * Rich WhatsApp caption sent alongside the QR image for a CONFIRMED guest.
 * WhatsApp renders Arabic text natively (unlike a rasterized image), so the
 * "pass" is delivered as QR image + this formatted caption.
 */
function buildConfirmedCaption(event, guest, lang = 'ar') {
  const ed = event?.eventDetails || {};
  const title = ed.title || (lang === 'ar' ? 'مناسبة' : 'the event');
  const date = formatDate(ed.date, lang);
  const time = ed.time || '';
  const venue = ed.location?.address || '';
  const count = guestsCount(guest);
  const reply = getReplyMessage('confirmed', event, lang);

  const lines = [reply, ''];
  lines.push(`🎉 ${title}`);
  if (date) lines.push(`🗓️ ${date}${time ? ` · ${time}` : ''}`);
  if (venue) lines.push(`📍 ${venue}`);
  lines.push(lang === 'en' ? `👥 Guests: ${count}` : `👥 عدد الضيوف: ${count}`);
  lines.push('');
  lines.push(
    lang === 'en'
      ? 'Show this code at the entrance.'
      : 'يُرجى إبراز هذا الرمز عند الدخول.'
  );
  return lines.join('\n');
}

module.exports = {
  DEFAULT_REPLIES,
  formatDate,
  getReplyMessage,
  guestsCount,
  buildEntryPass,
  buildConfirmedCaption,
};
