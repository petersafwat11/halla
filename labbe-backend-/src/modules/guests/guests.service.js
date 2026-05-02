/**
 * Guests Service
 * Business logic for guest portal operations - NO HTTP concerns
 * @module modules/guests/guests.service
 */

const config = require('../../config');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors');

// Import existing models during migration
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { generateExcel } = require('../../shared/utils/excelExport');
const GuestAccessToken = require('../../../models/GuestAccessTokenModel');
const { logAudit } = require('../../shared/utils/auditLog');

class GuestsService {
  /**
   * Get guest by invitation code/QR
   * @param {string} code - Invitation code or QR code
   * @returns {Promise<Object>}
   */
  async getGuestByCode(code) {
    const guest = await Guest.findOne({
      qrcode: code,
    }).populate({
      path: 'event',
      select: 'eventDetails status host',
      populate: { path: 'host', select: 'username name' },
    });

    if (!guest) {
      throw new NotFoundError('Invitation not found');
    }

    return {
      guest: this._formatGuestPortal(guest),
      event: this._formatEventForGuest(guest.event),
    };
  }

  /**
   * RSVP response from guest
   * @param {string} guestId
   * @param {string} response - 'confirmed' | 'declined' | 'maybe'
   * @param {Object} [additionalInfo]
   * @returns {Promise<Object>}
   */
  async submitRSVP(guestId, response, additionalInfo = {}) {
    const validResponses = ['confirmed', 'declined', 'maybe'];
    if (!validResponses.includes(response)) {
      throw new ValidationError('Invalid RSVP response');
    }

    if (!additionalInfo.invitationCode) {
      throw new ValidationError('Invitation code is required');
    }

    const guest = await Guest.findById(guestId).populate('event');
    if (!guest) {
      throw new NotFoundError('Guest');
    }

    // Verify invitation code matches this guest
    const codeMatch = guest.qrcode === additionalInfo.invitationCode;
    if (!codeMatch) {
      throw new ForbiddenError('Invalid invitation code for this guest');
    }

    // Check event is still active
    const activeStatuses = ['scheduled', 'live', 'published'];
    if (guest.event && !activeStatuses.includes(guest.event.status)) {
      throw new ValidationError('This event is no longer accepting RSVPs');
    }

    const previousStatus = guest.status;

    guest.status = response;
    guest.rsvp = {
      response,
      respondedAt: new Date(),
      message: additionalInfo.message || '',
      dietaryRestrictions: additionalInfo.dietaryRestrictions || '',
      plusOnes: Math.max(0, parseInt(additionalInfo.plusOnes) || 0),
    };

    await guest.save();

    // Notify host of RSVP
    this._notifyHostRSVP(guest, response, previousStatus).catch(console.error);

    return { guest: this._formatGuestPortal(guest) };
  }

  /**
   * Get event guests for host
   * @param {string} eventId
   * @param {string} userId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getEventGuests(eventId, userId, filters = {}, options = {}) {
    const { search, status } = filters;
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    let query = { event: eventId };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    if (status) {
      query.status = status;
    }

    const [guests, total] = await Promise.all([
      Guest.find(query)
        .select('name phone email status rsvp checkIn invitation addedBy createdAt')
        .populate('addedBy', 'username email')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Guest.countDocuments(query),
    ]);

    return {
      data: guests.map((g) => this._formatGuest(g)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Add guest to event
   * @param {string} eventId
   * @param {Object} guestData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addGuest(eventId, guestData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check guest limit from event's guestLimit field
    if (event.guestLimit) {
      const currentGuestCount = await Guest.countDocuments({ event: eventId });
      if (currentGuestCount >= event.guestLimit) {
        throw new ValidationError(`Guest limit reached (max ${event.guestLimit} guests)`);
      }
    }

    const guest = await Guest.create({
      ...guestData,
      event: eventId,
      status: 'invited',
      addedBy: userId,
    });

    event.guestList.push(guest._id);
    await event.save();

    return { guest: this._formatGuest(guest) };
  }

  /**
   * Update guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {Object} updateData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateGuest(eventId, guestId, updateData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) {
      throw new NotFoundError('Guest');
    }

    // Validate phone if provided
    if (updateData.phone) {
      const cleanPhone = updateData.phone.replace(/[\s\-\(\)]/g, '');
      if (!/^[\+]?[0-9]{7,15}$/.test(cleanPhone)) {
        throw new ValidationError('Invalid phone number format');
      }
      updateData.phone = cleanPhone;
    }

    const allowedFields = ['name', 'email', 'phone', 'status'];
    const updateObj = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateObj[field] = updateData[field];
      }
    });

    const previousStatus = guest.status;
    const updatedGuest = await Guest.findByIdAndUpdate(guestId, updateObj, {
      new: true,
      runValidators: true,
    });

    // Notify host if status changed
    if (updateObj.status && updateObj.status !== previousStatus) {
      this._notifyHostStatusChange(event.host, updatedGuest, updateObj.status).catch(console.error);
    }

    return { guest: this._formatGuest(updatedGuest) };
  }

  /**
   * Delete guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteGuest(eventId, guestId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) {
      throw new NotFoundError('Guest');
    }

    event.guestList = event.guestList.filter((id) => id.toString() !== guestId);
    await event.save();
    await Guest.findByIdAndDelete(guestId);
  }

  /**
   * Export guests to Excel
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportGuestsExcel(eventId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate({
        path: 'guestList',
        select: 'name email phone status rsvp checkIn invitation addedBy',
        populate: { path: 'addedBy', select: 'username email' },
      });

    if (!event) {
      throw new NotFoundError('Event');
    }

    const guestsForExport = (event.guestList || []).map((guest) => ({
      Name: guest.name || '',
      Phone: guest.phone || '',
      Email: guest.email || '',
      Status: guest.status || 'invited',
      'Response Date': guest.rsvp?.respondedAt
        ? new Date(guest.rsvp.respondedAt).toLocaleString()
        : '',
      'Check-in Time': guest.checkIn?.time
        ? new Date(guest.checkIn.time).toLocaleString()
        : '',
      'Invitation Sent': guest.invitation?.sent ? 'Yes' : 'No',
      'Added By': guest.addedBy?.username || guest.addedBy?.email || 'Unknown',
    }));

    return generateExcel(guestsForExport, `event-${eventId}-guests`);
  }

  /**
   * Rotate the active GuestAccessToken for a guest (Phase 3e.3 / FLOW-18-F03 / D7).
   *
   * Marks the existing active post_event token revoked with reason
   * `'rotation'`, then issues a new token (default 90-day expiry, falling
   * back to 365 days for legacy events without `eventDetails.date`).
   *
   * RBAC: host or whitelabel-admin only (admin / super_admin allowed via
   * the existing `restrictTo` setup at the route head).
   */
  async rotateGuestQR(eventId, guestId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    const actorId = actor?._id?.toString?.() || actor?._id;
    const role = actor?.role;
    const isHost = event.host?.toString() === actorId;
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const isWhitelabelAdmin =
      role === 'whitelabel_admin' &&
      event.whitelabelId &&
      actor?.whitelabelId &&
      event.whitelabelId.toString() === actor.whitelabelId.toString();
    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError('Not authorized to rotate this QR');
    }

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) throw new NotFoundError('Guest');

    // Revoke any active post_event token(s) for this guest+event with
    // reason 'rotation'.
    await GuestAccessToken.updateMany(
      {
        guest: guestId,
        event: eventId,
        type: 'post_event',
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actor?._id || null,
          revokedReason: 'rotation',
        },
      }
    );

    // Generate a new token. Expiry default per D8: event.eventDate + 90d
    // when known, else createdAt + 90d.
    const expiryDays = 90;
    const eventDate = event.eventDetails?.date;
    const expiresAt = eventDate
      ? new Date(new Date(eventDate).getTime() + expiryDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const fresh = await GuestAccessToken.create({
      guest: guestId,
      event: eventId,
      type: 'post_event',
      token: GuestAccessToken.generateToken(),
      expiresAt,
    });

    await logAudit({
      action: 'guest_access_token.rotate',
      actor,
      targetType: 'guest_access_token',
      targetId: fresh._id,
      whitelabelId: event.whitelabelId || null,
      metadata: { eventId, guestId, expiresAt },
    });

    return {
      token: fresh.token,
      qrUrl: GuestAccessToken.getTokenLink(fresh.token, 'post_event', 'ar'),
      expiresAt: fresh.expiresAt,
    };
  }

  /**
   * Manually revoke a guest access token (Phase 3e.4 / FLOW-21-F03 / D8).
   *
   * Distinct from rotation: this revokes the active token and does NOT
   * issue a replacement. Subsequent scans return 410 Gone with
   * `reason: 'qr_revoked'`.
   */
  async revokeGuestAccess(eventId, guestId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    const actorId = actor?._id?.toString?.() || actor?._id;
    const role = actor?.role;
    const isHost = event.host?.toString() === actorId;
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const isWhitelabelAdmin =
      role === 'whitelabel_admin' &&
      event.whitelabelId &&
      actor?.whitelabelId &&
      event.whitelabelId.toString() === actor.whitelabelId.toString();
    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError('Not authorized to revoke this QR');
    }

    // Verify guest exists in the event so we don't silently no-op on a
    // typo'd guestId.
    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) throw new NotFoundError('Guest');

    const result = await GuestAccessToken.updateMany(
      {
        guest: guestId,
        event: eventId,
        type: 'post_event',
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actor?._id || null,
          revokedReason: 'manual',
        },
      }
    );

    const affected = result?.modifiedCount || 0;

    await logAudit({
      action: 'guest_access_token.revoke',
      actor,
      targetType: 'guest_access_token',
      targetId: guestId,
      whitelabelId: event.whitelabelId || null,
      metadata: { eventId, guestId, affected },
    });

    return {
      // `revoked: true` only when at least one token transitioned. If
      // the staff member already had no active tokens, the response is
      // still 200 (idempotent action) but `revoked: false` +
      // `wasAlreadyRevoked: true` so the UI can render the right
      // message.
      revoked: affected > 0,
      affected,
      wasAlreadyRevoked: affected === 0,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  _formatGuest(guest) {
    return {
      id: guest._id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      status: guest.status,
      rsvp: guest.rsvp,
      checkIn: guest.checkIn,
      invitation: guest.invitation ? {
        sent: guest.invitation.sent,
        sentAt: guest.invitation.sentAt,
      } : null,
      addedBy: guest.addedBy ? {
        id: guest.addedBy._id,
        username: guest.addedBy.username,
      } : null,
      createdAt: guest.createdAt,
    };
  }

  _formatGuestPortal(guest) {
    return {
      id: guest._id,
      name: guest.name,
      status: guest.status,
      rsvp: guest.rsvp,
    };
  }

  _formatEventForGuest(event) {
    if (!event) return null;
    return {
      id: event._id,
      title: event.eventDetails?.title,
      date: event.eventDetails?.date,
      time: event.eventDetails?.time,
      location: event.eventDetails?.location,
      description: event.eventDetails?.description,
      hostName: event.host?.name || event.host?.username,
    };
  }

  async _notifyHostRSVP(guest, response, previousStatus) {
    if (response === previousStatus) return;

    const event = await Event.findById(guest.event).select('host eventDetails');
    if (!event?.host) return;

    const statusMessages = {
      confirmed: { en: 'confirmed attendance', ar: 'أكد حضوره' },
      declined: { en: 'declined the invitation', ar: 'اعتذر عن الحضور' },
      maybe: { en: 'responded "maybe"', ar: 'رد بـ"ربما"' },
    };

    const msg = statusMessages[response];
    if (!msg) return;

    const frontendUrl = config.frontend.url;
    await notificationService.sendToUser(event.host, {
      type: `guest_rsvp_${response}`,
      title: 'Guest RSVP',
      titleAr: 'رد ضيف',
      message: `${guest.name} ${msg.en} for your event`,
      messageAr: `${guest.name} ${msg.ar} لمناسبتك`,
      actionUrl: `${frontendUrl}/ar/host/events/${event._id}`,
      data: { entityType: 'guest', entityId: guest._id },
    });
  }

  async _notifyHostStatusChange(hostId, guest, newStatus) {
    const statusMessages = {
      checked_in: { en: 'has checked in', ar: 'سجل حضوره' },
    };

    const msg = statusMessages[newStatus];
    if (!msg) return;

    await notificationService.sendToUser(hostId, {
      type: 'guest_status_change',
      title: 'Guest Status Update',
      titleAr: 'تحديث حالة ضيف',
      message: `${guest.name} ${msg.en}`,
      messageAr: `${guest.name} ${msg.ar}`,
      data: { entityType: 'guest', entityId: guest._id },
    });
  }
}

module.exports = new GuestsService();
