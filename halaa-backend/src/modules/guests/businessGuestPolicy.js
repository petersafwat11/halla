const jwt = require('jsonwebtoken');
const config = require('../../config');
const { resolveInvitationDelivery } = require('../messaging/invitationDelivery');

const isOpen = event => ['scheduled', 'live', 'published'].includes(event?.status);
const canShowPass = (event, guest) => Boolean(isOpen(event) && event.invitationType === 'reply_and_qr' &&
  guest?.rsvp?.response === 'confirmed' && !guest.deleted);
function businessPass(event, guest) {
  if (!canShowPass(event, guest)) return null;
  return {
    code: jwt.sign({ purpose: 'business_entry', guestId: String(guest._id), eventId: String(event._id) }, config.jwt.secret, { expiresIn: '7d' }),
    guestsCount: 1 + (guest.rsvp?.plusOnes || 0),
  };
}
module.exports = { isOpen, canShowPass, businessPass, resolveInvitationDelivery };
