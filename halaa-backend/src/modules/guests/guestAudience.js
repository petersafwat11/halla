const activeGuestFilter = (eventId) => ({ event: eventId, deleted: { $ne: true } });

function guestAudienceFilter(eventId, action, guestIds) {
  const clauses = {
    newGuests: { 'invitation.sent': { $ne: true } },
    resend: { 'invitation.sent': true, status: { $in: ['invited', 'pending'] } },
    extraReminder: { $or: [
      { status: { $in: ['confirmed', 'checked_in'] } }, { 'rsvp.response': 'confirmed' },
    ] },
  };
  if (!clauses[action]) throw new Error('Unknown guest audience');
  return {
    ...activeGuestFilter(eventId), ...clauses[action],
    ...(Array.isArray(guestIds) ? { _id: { $in: guestIds } } : {}),
  };
}
module.exports = { activeGuestFilter, guestAudienceFilter };
