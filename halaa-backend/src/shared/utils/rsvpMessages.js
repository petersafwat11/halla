const {
  DEFAULT_REPLIES, formatDate, getReplyMessage, guestsCount, buildConfirmedCaption,
} = require('@halaa/shared/utils/rsvpMessages');

/** Structured portal pass. The WhatsApp caption and UI previews share one builder. */
function buildEntryPass(event, guest, lang = 'ar', { logoUrl = null, brandName = null, website = null } = {}) {
  const ed = event?.eventDetails?.toObject?.() || event?.eventDetails || {};
  const loc = ed.location?.toObject?.() || ed.location || {};
  return {
    guestName: guest?.name || '',
    code: guest?.qrcode || (guest?._id ? guest._id.toString() : ''),
    guestsCount: guestsCount(guest), brandName: brandName || null, website: website || null, logoUrl: logoUrl || null,
    event: { title: ed.title || '', date: ed.date || null, time: ed.time || '', venue: loc.address || '' },
  };
}
module.exports = { DEFAULT_REPLIES, formatDate, getReplyMessage, guestsCount, buildEntryPass, buildConfirmedCaption };
