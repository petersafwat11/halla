/**
 * Staff Service
 * Business logic for staff portal operations - NO HTTP concerns
 * @module modules/staff/staff.service
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../../config');
const {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require('../../shared/errors');
const AppError = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');
const { ROLES } = require('../../shared/constants/roles');

// Existing models
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');

// Existing services
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');

const STAFF_TOKEN_RBAC_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

const escapeRegex = (s) =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class StaffService {
  /**
   * Verify staff access via token or phone+eventId
   */
  async verifyStaffAccess({ token, phone, eventId }) {
    if (token) {
      const validation = await StaffAccessToken.validateToken(token);

      if (!validation.valid) {
        // 410 vs 403 disambiguation: revoked / expired tokens surface as
        // 410 Gone with structured reason so the scanner can render
        // distinct UX. A lookup miss stays 403 — credential error.
        const goneReasons = ['staff_revoked', 'staff_expired'];
        if (goneReasons.includes(validation.reason)) {
          const err = new AppError(
            validation.message || validation.reason,
            410,
            validation.reason.toUpperCase()
          );
          err.body = {
            reason: validation.reason,
            message: validation.message,
            ...(validation.expiresAt
              ? { expiresAt: validation.expiresAt }
              : {}),
            ...(validation.revokedAt
              ? { revokedAt: validation.revokedAt }
              : {}),
          };
          throw err;
        }
        throw new ForbiddenError(
          validation.message || validation.reason || 'Invalid access token'
        );
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

    const query = { event: eventId };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    if (status) {
      query.status = status;
    }

    const [guests, total, stats, lastCheckedIn] = await Promise.all([
      Guest.find(query)
        .select('name phone email status checkIn qrCode rsvp createdAt')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Guest.countDocuments(query),
      // counts via aggregation; full collection load was OOM-class at >10K guests
      this._computeGuestStats(eventId),
      Guest.findOne({
        event: eventId,
        'checkIn.checkedInAt': { $exists: true, $ne: null },
      })
        .sort({ 'checkIn.checkedInAt': -1 })
        .select('checkIn.checkedInAt')
        .lean(),
    ]);

    return {
      data: guests,
      stats: {
        ...stats,
        lastCheckIn: lastCheckedIn?.checkIn?.checkedInAt || null,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Check in guest via QR code. Idempotency is enforced by the atomic CAS in
   * `_performIdempotentCheckIn` (see helper for rationale).
   */
  async checkInByQR(eventId, qrCode, staffUser) {
    const guest = await Guest.findOne({ event: eventId, qrcode: qrCode });

    if (!guest) {
      throw new NotFoundError('Guest not found with this QR code');
    }

    return this._performIdempotentCheckIn(eventId, guest, staffUser);
  }

  /**
   * Check in guest by identifier (guestId or phone)
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
   * Compute guest count breakdown via Mongo aggregation.
   * Aggregating in the DB is O(index-scan) and never builds the full
   * result set in Node.
   */
  async _computeGuestStats(eventId) {
    const buckets = await Guest.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(String(eventId)) } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const counts = buckets.reduce((acc, b) => {
      acc[b._id || 'unknown'] = b.n;
      return acc;
    }, {});
    return {
      total: Object.values(counts).reduce((s, n) => s + n, 0),
      confirmed: counts.confirmed || 0,
      checkedIn: counts.checked_in || 0,
      declined: counts.declined || 0,
      pending: (counts.invited || 0) + (counts.maybe || 0),
    };
  }

  /**
   * RBAC check shared by `listStaffTokens` and `revokeStaffToken`.
   * Allowed: event host, owning whitelabel admin, platform admin, super_admin.
   */
  _assertStaffTokensRBAC(event, actor) {
    const actorId = actor?._id?.toString?.() || actor?._id;
    const role = actor?.role;

    const isHost = event.host?.toString() === actorId;
    const isAdmin = STAFF_TOKEN_RBAC_ROLES.includes(role);
    const isWhitelabelAdmin =
      role === ROLES.WHITELABEL_ADMIN &&
      event.whitelabelId &&
      actor?.whitelabelId &&
      event.whitelabelId.toString() === actor.whitelabelId.toString();

    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError(
        'Not authorized to manage staff tokens for this event'
      );
    }
  }

  /**
   * List staff access tokens for an event. Returns active and revoked tokens
   * with lifecycle metadata so the host UI can render token status alongside
   * the staff member list.
   */
  async listStaffTokens(eventId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    this._assertStaffTokensRBAC(event, actor);

    const tokens = await StaffAccessToken.find({ event: eventId })
      .select(
        'phone staffName isRevoked revokedAt revokedBy expiresAt lastUsedAt useCount createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    return {
      tokens: tokens.map((t) => ({
        _id: t._id,
        phone: t.phone,
        staffName: t.staffName,
        isRevoked: !!t.isRevoked,
        revokedAt: t.revokedAt || null,
        revokedBy: t.revokedBy || null,
        expiresAt: t.expiresAt || null,
        isExpired: t.expiresAt
          ? t.expiresAt.getTime() <= Date.now()
          : false,
        lastUsedAt: t.lastUsedAt || null,
        useCount: t.useCount || 0,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Revoke a staff member's access tokens.
   *
   * `:staffId` is the staff member sub-document _id from `event.staffList`.
   * Multiple tokens may exist for one staff phone (re-issued after expiry);
   * the host's intent is "this staff member can no longer access the
   * portal", so we revoke them all.
   *
   * Idempotent: if no active tokens remain, returns `revoked: false,
   * affected: 0, wasAlreadyRevoked: true` — same final state.
   */
  async revokeStaffToken(eventId, staffMemberId, actor) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('Event');

    this._assertStaffTokensRBAC(event, actor);

    const staffMember = (event.staffList || []).find(
      (s) => s._id?.toString() === staffMemberId
    );
    if (!staffMember) throw new NotFoundError('Staff member');

    const result = await StaffAccessToken.updateMany(
      { event: eventId, phone: staffMember.phone, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actor?._id || null,
        },
      }
    );

    const affected = result?.modifiedCount || 0;

    await logAudit({
      action: 'staff_access_token.revoke',
      actor,
      targetType: 'staff_access_token',
      targetId: staffMember._id,
      whitelabelId: event.whitelabelId || null,
      metadata: {
        eventId,
        staffMemberId,
        staffPhone: staffMember.phone,
        staffName: staffMember.name,
        affected,
      },
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

  /**
   * Idempotent check-in core.
   *
   * The DB row IS the idempotency cache. An atomic `findOneAndUpdate` with
   * `status: { $ne: 'checked_in' }` as the guard means at most one concurrent
   * caller's update lands; everyone else falls through to "already checked
   * in" with the original `checkedInAt`.
   *
   * DB-level instead of HTTP cache: the scanner UI needs `alreadyCheckedIn:
   * true` on replay (to render "checked in at HH:MM"). The HTTP cache would
   * return the first call's body verbatim — `alreadyCheckedIn: false` — on
   * every replay, defeating the UX.
   */
  async _performIdempotentCheckIn(eventId, guest, staffUser) {
    const now = new Date();

    // staffUser may be a User document (host self-check-in / admin) OR a
    // session payload from the staff scanner (no `_id`, has `phone`,
    // `staffName`, optional `staffTokenId`). Capture both shapes so a
    // re-scan can tell staff B who originally checked the guest in.
    const checkedInByUserId =
      staffUser && staffUser._id ? staffUser._id : null;
    const checkedInByStaff =
      staffUser && !staffUser._id && (staffUser.phone || staffUser.staffName)
        ? {
            token: staffUser.staffTokenId || null,
            name: staffUser.staffName || null,
            phone: staffUser.phone || null,
          }
        : { token: null, name: null, phone: null };

    const updated = await Guest.findOneAndUpdate(
      {
        _id: guest._id,
        event: eventId,
        status: { $ne: 'checked_in' },
      },
      {
        $set: {
          status: 'checked_in',
          'checkIn.checkedIn': true,
          'checkIn.checkedInAt': now,
          'checkIn.checkedInBy': checkedInByUserId,
          'checkIn.checkedInByStaff': checkedInByStaff,
        },
      },
      { new: true }
    );

    if (updated) {
      this._notifyHostCheckIn(eventId, updated).catch((err) =>
        logger.warn('staff.notifyHost failed', { error: err?.message })
      );
      try {
        await logAudit({
          action: 'guest.check_in',
          actor: staffUser && staffUser._id ? staffUser : null,
          targetType: 'guest',
          targetId: updated._id,
          metadata: {
            eventId,
            checkedInAt: now,
            performedByStaff:
              staffUser && !staffUser._id
                ? { name: staffUser.staffName, phone: staffUser.phone }
                : null,
          },
        });
      } catch (auditErr) {
        logger.warn('staff.checkIn audit log failed', {
          error: auditErr?.message,
        });
      }
      return {
        guest: this._formatGuest(updated),
        alreadyCheckedIn: false,
        checkedInAt: updated.checkIn?.checkedInAt || now,
        message: 'Guest checked in successfully',
      };
    }

    // CAS lost — fetch the persisted record so the scanner can render
    // "checked in at HH:MM by <staffName>".
    const existing = await Guest.findOne({ _id: guest._id, event: eventId })
      .populate('checkIn.checkedInBy', 'name email');
    if (!existing) throw new NotFoundError('Guest');
    const originalActor =
      existing.checkIn?.checkedInBy?.name ||
      existing.checkIn?.checkedInByStaff?.name ||
      null;
    return {
      guest: this._formatGuest(existing),
      alreadyCheckedIn: true,
      checkedInAt: existing.checkIn?.checkedInAt || null,
      checkedInBy: originalActor,
      message: 'Guest was already checked in',
    };
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
      status: guest.status,
      checkIn: guest.checkIn,
    };
  }

  async _notifyHostCheckIn(eventId, guest) {
    const event = await Event.findById(eventId)
      .select('host eventDetails')
      .populate('host', 'preferredLanguage');
    if (!event?.host) return;

    const lang = event.host.preferredLanguage || 'ar';
    const hostId = event.host._id || event.host;
    const frontendUrl = config.frontend.url;

    await notificationService.sendToUser(hostId, {
      type: 'guest_checked_in',
      title: 'Guest Checked In',
      titleAr: 'تسجيل حضور ضيف',
      message: `${guest.name} has checked in to your event`,
      messageAr: `${guest.name} سجل حضوره في مناسبتك`,
      actionUrl: `${frontendUrl}/${lang}/host/events/${eventId}`,
      data: { entityType: 'guest', entityId: guest._id },
    });
  }
}

module.exports = new StaffService();
