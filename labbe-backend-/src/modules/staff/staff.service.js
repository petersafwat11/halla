/**
 * Staff Service
 * Business logic for staff portal operations - NO HTTP concerns
 * @module modules/staff/staff.service
 */

const jwt = require('jsonwebtoken');
const config = require('../../config');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../shared/errors');

// Import existing models during migration
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const { withIdempotency } = require('../../shared/utils/idempotency');

class StaffService {
  /**
   * Verify staff access via token or phone+eventId
   * @param {Object} params - { token, phone, eventId }
   * @returns {Promise<Object>}
   */
  async verifyStaffAccess({ token, phone, eventId }) {
    // Token-based verification
    if (token) {
      const validation = await StaffAccessToken.validateToken(token);

      if (!validation.valid) {
        throw new ForbiddenError(validation.reason || 'Invalid access token');
      }

      const event = validation.event;
      const sessionToken = this._generateSessionToken({
        eventId: event._id,
        phone: validation.staffToken.phone,
        staffName: validation.staffToken.staffName,
      });

      return {
        verified: true,
        staff: {
          name: validation.staffToken.staffName,
          phone: validation.staffToken.phone,
          role: 'staff',
        },
        event: this._formatEventForStaff(event),
        sessionToken,
      };
    }

    // Phone + EventId verification
    if (!phone || !eventId) {
      throw new ValidationError('Phone and event ID are required');
    }

    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event');
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const staffMember = event.staffList?.find(
      (s) => s.phone?.replace(/[\s\-\(\)]/g, '') === cleanPhone
    );

    if (!staffMember) {
      throw new ForbiddenError('You do not have staff access to this event');
    }

    const sessionToken = this._generateSessionToken({
      eventId: event._id,
      phone: cleanPhone,
      staffName: staffMember.name,
      staffId: staffMember._id,
    });

    return {
      verified: true,
      staff: {
        _id: staffMember._id,
        name: staffMember.name,
        phone: staffMember.phone,
        role: 'staff',
      },
      event: this._formatEventForStaff(event),
      sessionToken,
    };
  }

  /**
   * Get event guests for staff portal
   * @param {string} eventId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{data: Array, stats: Object, pagination: Object}>}
   */
  async getEventGuests(eventId, filters = {}, options = {}) {
    const { search, status } = filters;
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event');
    }

    let query = { event: eventId };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
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
        .select('name phone email status checkIn qrCode rsvp createdAt')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Guest.countDocuments(query),
    ]);

    // Calculate stats
    const allGuests = await Guest.find({ event: eventId }).select('status');
    const stats = {
      total: allGuests.length,
      confirmed: allGuests.filter((g) => g.status === 'confirmed').length,
      checkedIn: allGuests.filter((g) => g.status === 'checked_in').length,
      declined: allGuests.filter((g) => g.status === 'declined').length,
      pending: allGuests.filter((g) => ['invited', 'maybe'].includes(g.status)).length,
    };

    return {
      data: guests,
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Check in guest via QR code.
   *
   * Phase 3e.2 (FLOW-20-F03 / decision D6): wrapped in `withIdempotency`
   * with key `checkin:<eventId>:<guestId>`. First scan caches the
   * success response (with `alreadyCheckedIn: false`). Subsequent scans
   * within the 24h TTL return the cached response — but the wrapper
   * post-processes to flip `alreadyCheckedIn: true` based on whether
   * the underlying guest doc was already checked in. The scanner UI
   * uses `alreadyCheckedIn` + `checkedInAt` to render the right state.
   */
  async checkInByQR(eventId, qrCode, staffUser) {
    const guest = await Guest.findOne({ event: eventId, qrcode: qrCode });

    if (!guest) {
      throw new NotFoundError('Guest not found with this QR code');
    }

    return this._performIdempotentCheckIn(eventId, guest, staffUser);
  }

  /**
   * Manual check in guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {Object} staffUser
   * @returns {Promise<Object>}
   */
  async manualCheckIn(eventId, guestId, staffUser) {
    const guest = await Guest.findOne({ _id: guestId, event: eventId });

    if (!guest) {
      throw new NotFoundError('Guest');
    }

    return this._performIdempotentCheckIn(eventId, guest, staffUser);
  }

  /**
   * Check in guest by identifier (guestId or phone)
   * @param {string} eventId
   * @param {Object} identifier - { guestId, phone }
   * @param {Object} staffUser
   * @returns {Promise<Object>}
   */
  async checkInByIdentifier(eventId, { guestId, phone }, staffUser) {
    let guest;
    if (guestId) {
      guest = await Guest.findOne({ _id: guestId, event: eventId });
    } else if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      guest = await Guest.findOne({
        event: eventId,
        $or: [{ phone: cleanPhone }, { phone: phone }],
      });
    }

    if (!guest) {
      throw new NotFoundError('Guest not found');
    }

    return this._performIdempotentCheckIn(eventId, guest, staffUser);
  }

  /**
   * Get event stats for staff
   * @param {string} eventId
   * @returns {Promise<Object>}
   */
  async getEventStats(eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event');
    }

    const guests = await Guest.find({ event: eventId }).select('status checkIn');

    return {
      total: guests.length,
      confirmed: guests.filter((g) => g.status === 'confirmed').length,
      checkedIn: guests.filter((g) => g.status === 'checked_in').length,
      declined: guests.filter((g) => g.status === 'declined').length,
      pending: guests.filter((g) => ['invited', 'maybe'].includes(g.status)).length,
      lastCheckIn: guests
        .filter((g) => g.checkIn?.checkedInAt)
        .sort((a, b) => new Date(b.checkIn.checkedInAt) - new Date(a.checkIn.checkedInAt))[0]?.checkIn?.checkedInAt || null,
    };
  }

  /**
   * Revoke a staff access token (Phase 3e.1 / FLOW-20-F01 / decision D5).
   *
   * RBAC: only the event host or whitelabel-admin (when the event belongs
   * to their whitelabel) — admin / super_admin allowed via `restrictTo`
   * at the route layer. Re-revoking an already-revoked token is
   * idempotent (returns 200 with the same final state).
   *
   * The staff "ID" parameter is the StaffAccessToken document's _id.
   *
   * @param {string} eventId
   * @param {string} staffTokenId
   * @param {Object} actor — req.user
   * @returns {Promise<Object>}
   */
  async revokeStaffToken(eventId, staffTokenId, actor) {
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
      throw new ForbiddenError('Not authorized to revoke this staff token');
    }

    const token = await StaffAccessToken.findOne({ _id: staffTokenId, event: eventId });
    if (!token) throw new NotFoundError('StaffAccessToken');

    const wasAlreadyRevoked = token.isRevoked;
    if (!wasAlreadyRevoked) {
      token.isRevoked = true;
      token.revokedAt = new Date();
      token.revokedBy = actor?._id || null;
      await token.save();
    }

    await logAudit({
      action: 'staff_access_token.revoke',
      actor,
      targetType: 'staff_access_token',
      targetId: token._id,
      whitelabelId: event.whitelabelId || null,
      changes: {
        before: { isRevoked: wasAlreadyRevoked },
        after: { isRevoked: true },
      },
      metadata: {
        eventId,
        staffPhone: token.phone,
        staffName: token.staffName,
        wasAlreadyRevoked,
      },
    });

    return {
      revoked: true,
      revokedAt: token.revokedAt,
      wasAlreadyRevoked,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Idempotent check-in core (Phase 3e.2 / FLOW-20-F03 / D6).
   *
   * Uses `withIdempotency` keyed by `checkin:<eventId>:<guestId>`. The
   * cached body keeps the original `checkedInAt`, so a second scan
   * within 24h returns the same timestamp and `alreadyCheckedIn: true`
   * — exactly what the scanner UI needs to render
   * "Already checked in at HH:MM".
   */
  async _performIdempotentCheckIn(eventId, guest, staffUser) {
    const key = `checkin:${eventId}:${guest._id}`;

    const result = await withIdempotency(
      key,
      async () => {
        // Re-read guest inside the cache miss to pick up any concurrent
        // status update.
        const fresh = await Guest.findById(guest._id);
        if (!fresh) throw new NotFoundError('Guest');

        if (fresh.status === 'checked_in') {
          return {
            guest: this._formatGuest(fresh),
            alreadyCheckedIn: true,
            checkedInAt: fresh.checkIn?.checkedInAt || null,
            message: 'Guest was already checked in',
          };
        }

        fresh.status = 'checked_in';
        fresh.checkIn = {
          checkedIn: true,
          checkedInAt: new Date(),
        };
        await fresh.save();

        this._notifyHostCheckIn(eventId, fresh).catch(console.error);

        return {
          guest: this._formatGuest(fresh),
          alreadyCheckedIn: false,
          checkedInAt: fresh.checkIn.checkedInAt,
          message: 'Guest checked in successfully',
        };
      },
      { scope: 'staff.checkin' }
    );

    // Cached replays return the original payload with
    // `alreadyCheckedIn: false` because the *first* call did the actual
    // check-in. We post-process to flip the flag for replays so the UI
    // shows the right state.
    if (result && result.alreadyCheckedIn === false) {
      // Determine if this is a replay by checking whether the guest
      // already shows checked_in (it always should be, since this is
      // post-cache-write — but this also makes the second response
      // honest).
      try {
        const reread = await Guest.findById(guest._id).select('status checkIn');
        if (reread?.status === 'checked_in' && reread.checkIn?.checkedInAt) {
          // Detect replay: the cached checkedInAt is older than ~5 sec.
          const cachedAt = new Date(result.checkedInAt || 0).getTime();
          const persistedAt = new Date(reread.checkIn.checkedInAt).getTime();
          if (cachedAt && Math.abs(persistedAt - cachedAt) > 5000) {
            return { ...result, alreadyCheckedIn: true };
          }
        }
      } catch (_) {
        /* swallow — return the cached body */
      }
    }

    return result;
  }

  _generateSessionToken(payload) {
    return jwt.sign(
      { type: 'staff_session', ...payload },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
  }

  _formatEventForStaff(event) {
    return {
      _id: event._id,
      title: event.eventDetails?.title,
      date: event.eventDetails?.date,
      time: event.eventDetails?.time,
      location: event.eventDetails?.location,
      status: event.status,
    };
  }

  _formatGuest(guest) {
    return {
      id: guest._id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      status: guest.status,
      checkIn: guest.checkIn,
    };
  }

  async _notifyHostCheckIn(eventId, guest) {
    const event = await Event.findById(eventId).select('host eventDetails');
    if (!event?.host) return;

    const frontendUrl = config.frontend.url;
    await notificationService.sendToUser(event.host, {
      type: 'guest_checked_in',
      title: 'Guest Checked In',
      titleAr: 'تسجيل حضور ضيف',
      message: `${guest.name} has checked in to your event`,
      messageAr: `${guest.name} سجل حضوره في مناسبتك`,
      actionUrl: `${frontendUrl}/ar/host/events/${eventId}`,
      data: { entityType: 'guest', entityId: guest._id },
    });
  }
}

module.exports = new StaffService();
