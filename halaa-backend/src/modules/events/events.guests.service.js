/**
 * Events Service — Guests sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.guests.service
 */

const {
  NotFoundError,
  ValidationError,
} = require("../../shared/errors");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");

const { normalizePhoneNumber } = require('../../shared/utils/phone');

module.exports = {
  /**
   * Create guests from list
   * @param {Array} guestData
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async createGuestsFromList(guestData, eventId, userId) {
    if (!guestData.length) return [];

    // Deduplicate by normalized phone — keep last occurrence
    const seen = new Map();
    for (const guest of guestData) {
      const key = normalizePhoneNumber(guest.phone);
      seen.set(key, guest);
    }

    const docs = Array.from(seen.values()).map(guest => ({
      name: guest.name,
      phone: guest.phone,
      ...(guest.category !== undefined && { category: guest.category }),
      event: eventId,
      status: "invited",
      invitedBy: guest.invitedBy || null,
      addedBy: userId,
    }));

    // Use Guest.create() instead of insertMany to trigger pre-save hooks (QR code generation)
    const savedGuests = await Guest.create(docs);
    return savedGuests.map(g => g._id);
  },

  /**
   * Add guests to event
   * @param {string} eventId
   * @param {Array} guests
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addGuests(eventId, guests, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError('Event');
    const existing = await Guest.find({ event: eventId, deleted: { $ne: true } }).select('name phone category').lean();
    return this.updateEventStep2(eventId, {
      guestList: [...existing, ...guests], staffList: event.staffList || [], expectedVersion: event.__v,
    }, userContext);
  },

  /**
   * Update guest status
   * @param {string} eventId
   * @param {string} guestId
   * @param {string} status
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateGuestStatus(eventId, guestId, status, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });

    if (!event) {
      throw new NotFoundError("Event");
    }

    if (['cancelled', 'completed'].includes(event.status)) {
      throw new ValidationError("Cannot modify guest status on a " + event.status + " event");
    }

    const guest = await Guest.findOneAndUpdate(
      { _id: guestId, event: eventId },
      { status },
      { new: true }
    );

    if (!guest) {
      throw new NotFoundError("Guest");
    }

    return { guest };
  },

  /**
   * Update guest list
   * @param {string} eventId
   * @param {Array} guestList
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateGuestList(eventId, guestList, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError('Event');
    return this.updateEventStep2(eventId, {
      guestList, staffList: event.staffList || [], expectedVersion: event.__v,
    }, userContext);
  },
};
