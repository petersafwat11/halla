/**
 * Guests Service
 * Business logic for guest portal operations - NO HTTP concerns
 * @module modules/guests/guests.service
 */

const config = require('../../config');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors');
const { ROLES } = require('../../shared/constants');
const logger = require('../../shared/utils/logger');

// Import existing models during migration
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { generateExcel, guardExportMaxRows } = require('../../shared/utils/excelExport');
const { formatRiyadh } = require('../../shared/utils/timezone');
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

    // Notify host of RSVP — fire-and-forget
    this._notifyHostRSVP(guest, response, previousStatus).catch((err) =>
      logger.error('guests.submitRSVP notify host failed', err)
    );

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

    let query = { event: eventId, deleted: { $ne: true } };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (status) {
      query.status = status;
    }

    const [guests, total] = await Promise.all([
      Guest.find(query)
        .select('name phone status rsvp checkIn invitation addedBy createdAt')
        .populate('addedBy', 'username')
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
   * @param {Object|string} actor - req.user or userId
   * @returns {Promise<Object>}
   */
  async addGuest(eventId, guestData, actor) {
    const userId = this._actorId(actor);
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check guest limit from event's guestLimit field
    if (event.guestLimit) {
      const currentGuestCount = await Guest.countDocuments({
        event: eventId,
        deleted: { $ne: true },
      });
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

    logAudit({
      action: 'guest.added',
      actor: this._actorRef(actor),
      targetType: 'guest',
      targetId: guest._id,
      metadata: { eventId, guestName: guest.name },
    }).catch(() => {});

    return { guest: this._formatGuest(guest) };
  }

  /**
   * Update guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {Object} updateData
   * @param {Object|string} actor - req.user or userId
   * @returns {Promise<Object>}
   */
  async updateGuest(eventId, guestId, updateData, actor) {
    const userId = this._actorId(actor);
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) {
      throw new NotFoundError('Event');
    }

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) {
      throw new NotFoundError('Guest');
    }

    const allowedFields = ['name', 'phone', 'status'];
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
      this._notifyHostStatusChange(event.host, updatedGuest, updateObj.status).catch((err) =>
        logger.error('guests.updateGuest notify host failed', err)
      );
    }

    logAudit({
      action: 'guest.updated',
      actor: this._actorRef(actor),
      targetType: 'guest',
      targetId: guestId,
      metadata: { eventId, changes: updateObj },
    }).catch(() => {});

    return { guest: this._formatGuest(updatedGuest) };
  }

  /**
   * Delete guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {Object|string} actor - req.user or userId
   * @returns {Promise<void>}
   */
  async deleteGuest(eventId, guestId, actor) {
    const userId = this._actorId(actor);
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

    logAudit({
      action: 'guest.deleted',
      actor: this._actorRef(actor),
      targetType: 'guest',
      targetId: guestId,
      metadata: { eventId, guestName: guest.name },
    }).catch(() => {});
  }

  /**
   * Export guests to Excel
   * @param {string} eventId
   * @param {Object|string} actor - req.user or userId
   * @returns {Promise<Buffer>}
   */
  async exportGuestsExcel(eventId, actor) {
    const userId = this._actorId(actor);
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate({
        path: 'guestList',
        select: 'name phone status rsvp checkIn invitation addedBy',
        populate: { path: 'addedBy', select: 'username' },
      });

    if (!event) {
      throw new NotFoundError('Event');
    }

    const guestCount = event.guestList?.length || 0;
    guardExportMaxRows(guestCount, 'guests');

    const guestsForExport = (event.guestList || []).map((guest) => ({
      Name: guest.name || '',
      Phone: guest.phone || '',
      Status: guest.status || 'invited',
      'Response Date': guest.rsvp?.respondedAt
        ? formatRiyadh(guest.rsvp.respondedAt)
        : '',
      'Check-in Time': guest.checkIn?.checkedInAt
        ? formatRiyadh(guest.checkIn.checkedInAt)
        : '',
      'Invitation Sent': guest.invitation?.sent ? 'Yes' : 'No',
      'Added By': guest.addedBy?.username || 'Unknown',
    }));

    const buffer = await generateExcel(guestsForExport, `event-${eventId}-guests`);

    logAudit({
      action: 'event.exported',
      actor: this._actorRef(actor),
      targetType: 'event',
      targetId: eventId,
      metadata: { format: 'xlsx' },
    }).catch(() => {});

    return buffer;
  }

  /**
   * Rotate the active GuestAccessToken for a guest. Marks the existing
   * active post_event token revoked with reason 'rotation', then issues a
   * new token (default 90-day expiry from event date, or now if missing).
   * Best-effort SMS delivery — rotation must reach the guest (lost-phone
   * scenario), but a delivery failure does not roll back the rotation.
   */
  async rotateGuestQR(eventId, guestId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    const actorId = actor?._id?.toString?.() || actor?._id;
    const role = actor?.role;
    const isHost = event.host?.toString() === actorId;
    const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
    const isWhitelabelAdmin =
      role === ROLES.WHITELABEL_ADMIN &&
      event.whitelabelId &&
      actor?.whitelabelId &&
      event.whitelabelId.toString() === actor.whitelabelId.toString();
    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError('Not authorized to rotate this QR');
    }

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) throw new NotFoundError('Guest');

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

    const qrUrl = GuestAccessToken.getTokenLink(fresh.token, 'post_event', 'ar');

    let delivery = { attempted: false };
    if (guest.phone) {
      delivery = { attempted: true, channel: 'sms' };
      try {
        const taqnyat = require('../../infrastructure/taqnyat.js');
        const SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp';
        const message =
          `${guest.name || ''}، تم إصدار رابط جديد لمحتوى المناسبة. الرابط القديم لم يعد صالحاً.\n${qrUrl}`;
        const sendResult = await taqnyat.sendSMS(guest.phone, message, { sender: SENDER });
        delivery.success = !!sendResult?.success;
        if (!delivery.success) delivery.error = sendResult?.error || 'send_failed';
      } catch (err) {
        delivery.success = false;
        delivery.error = err?.message || 'send_threw';
      }
    } else {
      delivery.error = 'no_phone';
    }

    await logAudit({
      action: 'guest_access_token.rotate',
      actor,
      targetType: 'guest_access_token',
      targetId: fresh._id,
      whitelabelId: event.whitelabelId || null,
      metadata: { eventId, guestId, expiresAt, delivery },
    });

    return {
      token: fresh.token,
      qrUrl,
      expiresAt: fresh.expiresAt,
      delivery,
    };
  }

  /**
   * Manually revoke a guest access token. Distinct from rotation: revokes
   * the active token without issuing a replacement. Idempotent — when no
   * active token exists, returns `wasAlreadyRevoked: true` instead of 404.
   */
  async revokeGuestAccess(eventId, guestId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    const actorId = actor?._id?.toString?.() || actor?._id;
    const role = actor?.role;
    const isHost = event.host?.toString() === actorId;
    const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
    const isWhitelabelAdmin =
      role === ROLES.WHITELABEL_ADMIN &&
      event.whitelabelId &&
      actor?.whitelabelId &&
      event.whitelabelId.toString() === actor.whitelabelId.toString();
    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError('Not authorized to revoke this QR');
    }

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
      revoked: affected > 0,
      affected,
      wasAlreadyRevoked: affected === 0,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  _actorId(actor) {
    if (!actor) return undefined;
    if (typeof actor === 'string') return actor;
    return actor._id?.toString?.() || actor._id;
  }

  _actorRef(actor) {
    if (!actor) return undefined;
    if (typeof actor === 'string') return { _id: actor };
    return { _id: actor._id, role: actor.role };
  }

  _formatGuest(guest) {
    return {
      id: guest._id,
      name: guest.name,
      phone: guest.phone,
      status: guest.status,
      rsvp: guest.rsvp,
      checkIn: guest.checkIn,
      invitation: guest.invitation ? {
        sent: guest.invitation.sent,
        sentAt: guest.invitation.sentAt,
        method: guest.invitation.method,
        effectiveChannel: guest.invitation.effectiveChannel,
        smsFallback: guest.invitation.smsFallback,
        status: guest.invitation.status,
        deliveredAt: guest.invitation.deliveredAt,
        readAt: guest.invitation.readAt,
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
