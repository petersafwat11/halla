/**
 * Events Service — Guests sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.guests.service
 */

const {
  NotFoundError,
  ValidationError,
  PackageLimitError,
  AppError,
} = require("../../shared/errors");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const { isPoolPlan, isPerEventPlan } = require('../../shared/constants/plans');

const { normalizePhoneNumber } = require('../../shared/utils/phone');
// Post-review polish — extracted error codes shared between
// updateGuestList and updateEventStep2 so they can't drift.
const { GUEST_LIST_BELOW_CONFIRMED } = require('../../shared/constants/events');

const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

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
      email: guest.email,
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
  async addGuests(eventId, guests, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });

    if (!event) {
      throw new NotFoundError("Event");
    }

    if (['cancelled', 'completed'].includes(event.status)) {
      throw new ValidationError("Cannot add guests to a " + event.status + " event");
    }

    const newGuestCount = guests.length;

    // Capacity check: handle pool vs per-event plans
    const capacitySub = event.subscriptionId
      ? await Subscription.findById(event.subscriptionId).populate('planId')
      : await Subscription.getCapacityForEvent(userId, newGuestCount);

    if (!capacitySub) {
      throw new PackageLimitError(
        'subscription',
        0,
        'No active subscription with sufficient capacity'
      );
    }

    if (isPoolPlan(capacitySub.planId?.planType)) {
      await Subscription.consumeInvites(capacitySub._id, newGuestCount);
    } else if (isPerEventPlan(capacitySub.planId?.planType)) {
      const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
      if (maxInvites !== null && maxInvites !== undefined && newGuestCount > maxInvites) {
        throw new PackageLimitError(
          'guests',
          maxInvites,
          `Guest count exceeds plan limit of ${maxInvites}`
        );
      }
    }

    if (!event.subscriptionId) {
      event.subscriptionId = capacitySub._id;
    }

    const guestIds = await this.createGuestsFromList(guests, eventId, userId);
    event.guestList.push(...guestIds);
    await event.save();

    const updatedEvent = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );

    return { event: updatedEvent, addedCount: guestIds.length };
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
    // userId is used downstream as `addedBy` on net-new guests; pull it
    // out of the context whether we got the legacy ObjectId or the full
    // req.user shape.
    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext))
      .populate('guestList', 'name email phone status');
    if (!event) throw new NotFoundError("Event");

    // Enforce per-event guest limit against the new total (not cumulative)
    const newCount = guestList?.length || 0;
    const limit = event.guestLimit;
    if (limit && limit !== -1 && newCount > limit) {
      throw new PackageLimitError("guests", limit,
        `Guest list exceeds the limit of ${limit}.`);
    }

    // The guest-list editor can drop a guest the host has already removed
    // in the UI, but it must not let the new total fall below the count of
    // guests who already confirmed (or already checked in). Doing so would
    // silently delete confirmed RSVPs and leave the host with a smaller
    // list than the number of attendees they're expecting.
    //
    // The middleware guard `checkGuestLimit` only protects against
    // exceeding the plan ceiling; this guards the floor.
    const confirmedCount = (event.guestList || []).filter((g) =>
      ['confirmed', 'checked_in'].includes(g.status)
    ).length;
    if (confirmedCount > 0 && newCount < confirmedCount) {
      throw new AppError(
        `Cannot reduce guest list below ${confirmedCount} confirmed guests.`,
        400,
        GUEST_LIST_BELOW_CONFIRMED
      );
    }

    // Build map of existing guests by normalized phone for O(1) lookup
    const existingGuests = event.guestList || [];
    const existingByPhone = new Map(
      existingGuests.map(g => [normalizePhoneNumber(g.phone), g])
    );

    const keptGuestIds = [];
    const toCreate = [];
    const incomingPhones = new Set();

    for (const incoming of (guestList || [])) {
      const normPhone = normalizePhoneNumber(incoming.phone);
      incomingPhones.add(normPhone);
      const existing = existingByPhone.get(normPhone);
      if (existing) {
        // Keep existing guest — preserves RSVP status, QR code, check-in history
        // Update name/email if the host changed them
        if (existing.name !== incoming.name || (incoming.email && existing.email !== incoming.email)) {
          await Guest.findByIdAndUpdate(existing._id, {
            name: incoming.name,
            ...(incoming.email && { email: incoming.email }),
          });
        }
        keptGuestIds.push(existing._id);
      } else {
        toCreate.push({
          name: incoming.name,
          phone: incoming.phone,
          email: incoming.email || '',
          event: eventId,
          status: 'invited',
          addedBy: userId,
        });
      }
    }

    // Soft-delete guests removed from the UI (tombstone, not hard delete)
    const toDeleteIds = existingGuests
      .filter(g => !incomingPhones.has(normalizePhoneNumber(g.phone)))
      .map(g => g._id);
    if (toDeleteIds.length > 0) {
      await Guest.updateMany(
        { _id: { $in: toDeleteIds } },
        { $set: { deleted: true, deletedAt: new Date() } }
      );
    }

    // Create only truly new guests (triggers QR code pre-save hook)
    const newGuests = toCreate.length > 0 ? await Guest.create(toCreate) : [];
    const newGuestIds = newGuests.map(g => g._id);

    // Full replace — not push
    event.guestList = [...keptGuestIds, ...newGuestIds];
    await event.save();

    // Track only the net-new guests on the subscription
    if (event.subscriptionId && newGuestIds.length > 0) {
      try {
        await Subscription.findByIdAndUpdate(event.subscriptionId, {
          $inc: { "usage.guestsUsed": newGuestIds.length, "usage.totalGuests": newGuestIds.length },
        });
      } catch (e) {
        logger.warn('Failed to track guest addition on subscription', { err: e?.message });
      }
    }

    const updated = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );

    logAudit({
      action: 'event.guest_list_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        addedCount: newGuestIds.length,
        removedCount: toDeleteIds.length,
        keptCount: keptGuestIds.length,
        totalCount: updated.guestList.length,
      },
    }).catch(() => {});

    return { event: updated, addedCount: newGuestIds.length };
  },

};
