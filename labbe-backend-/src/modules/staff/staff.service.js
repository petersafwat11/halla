/**
 * Staff Service
 * Business logic for staff portal operations - NO HTTP concerns
 * @module modules/staff/staff.service
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../../config');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../shared/errors');

// Import existing models during migration
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');

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
        // H-20: revoked / expired tokens surface as 410 Gone with the
        // structured reason in the body so the scanner can render distinct
        // UX. Lookup miss (`staff_invalid`) stays 403 — it's a credential
        // error, not a "the access is gone" condition.
        const goneReasons = ['staff_revoked', 'staff_expired'];
        if (goneReasons.includes(validation.reason)) {
          const AppError = require('../../shared/errors/AppError');
          const err = new AppError(
            validation.message || validation.reason,
            410,
            validation.reason.toUpperCase()
          );
          err.body = {
            reason: validation.reason,
            message: validation.message,
            ...(validation.expiresAt ? { expiresAt: validation.expiresAt } : {}),
            ...(validation.revokedAt ? { revokedAt: validation.revokedAt } : {}),
          };
          throw err;
        }
        throw new ForbiddenError(validation.message || validation.reason || 'Invalid access token');
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

    // H-22: stats via aggregation. Previously we loaded every guest doc
    // into memory and counted in JS — at 10K guests × 30s polling that's
    // 200MB+/min into the working set and a non-trivial CPU cost. The
    // aggregation runs entirely in the index / on the server.
    const stats = await this._computeGuestStats(eventId);

    return {
      data: guests,
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Check in guest via QR code.
   *
   * Phase 3e.2 (FLOW-20-F03 / decision D6): the actual idempotency
   * primitive is the atomic compare-and-swap inside
   * `_performIdempotentCheckIn` — see that helper for the rationale.
   * The scanner UI reads `alreadyCheckedIn` + `checkedInAt` from the
   * response to render either "Checked in" or "Already checked in at
   * HH:MM".
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

    // H-22: aggregation instead of full collection load + JS reduce.
    // `_computeGuestStats` returns the {total,confirmed,checkedIn,...}
    // bucket. We additionally need `lastCheckIn` which is a single doc
    // lookup sorted by `checkIn.checkedInAt`.
    const [stats, lastCheckedIn] = await Promise.all([
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
      ...stats,
      lastCheckIn: lastCheckedIn?.checkIn?.checkedInAt || null,
    };
  }

  /**
   * Compute guest count breakdown via Mongo aggregation.
   *
   * H-22: previously the staff stats endpoints loaded every guest into
   * memory and counted via `Array#filter`. Aggregating in the database is
   * O(index-scan) and never builds the full result set in Node.
   *
   * @param {string|ObjectId} eventId
   * @returns {Promise<{total:number, confirmed:number, checkedIn:number, declined:number, pending:number}>}
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
   * List staff access tokens for an event (Phase 4b W0-STAFF).
   *
   * The Phase 4 mobile staff revoke flow walked `event.staffList` and
   * passed the staff member sub-doc _id directly into the existing
   * revoke endpoint, which works but doesn't surface the actual token
   * lifecycle (active / revoked / expired). Peter asked for an explicit
   * "active staff tokens" list so the UI can render token status next
   * to the staff name.
   *
   * RBAC mirrors revokeStaffToken: event host, owning whitelabel admin,
   * platform admin, super_admin.
   *
   * @param {string} eventId
   * @param {Object} actor — req.user
   * @returns {Promise<{tokens: Array}>}
   */
  async listStaffTokens(eventId, actor) {
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
      throw new ForbiddenError('Not authorized to view staff tokens for this event');
    }

    const tokens = await StaffAccessToken.find({ event: eventId })
      .select('phone staffName isRevoked revokedAt revokedBy expiresAt lastUsedAt useCount createdAt')
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
        isExpired: t.expiresAt ? t.expiresAt.getTime() <= Date.now() : false,
        lastUsedAt: t.lastUsedAt || null,
        useCount: t.useCount || 0,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Revoke a staff member's access tokens (Phase 3e.1 / FLOW-20-F01 / D5).
   *
   * The path parameter `:staffId` is the **staff member sub-document _id**
   * (from `event.staffList[i]._id`) — that's what the host UI exposes.
   * We look up the staff member in the event, then revoke every active
   * `StaffAccessToken` for that event+phone. Multiple tokens can exist
   * if the host re-issued (e.g. after expiry); the host's intent is
   * "this staff member can no longer access the portal", which means
   * all tokens.
   *
   * RBAC: event host or whitelabel-admin (admin / super_admin allowed
   * via `restrictTo` at the router head).
   *
   * Idempotent at the action level: if no active tokens remain (already
   * revoked or never issued), returns 200 with `revoked: false,
   * affected: 0` — same final state.
   *
   * @param {string} eventId
   * @param {string} staffMemberId — staff sub-document _id from event.staffList
   * @param {Object} actor — req.user
   */
  async revokeStaffToken(eventId, staffMemberId, actor) {
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

    const staffMember = (event.staffList || []).find(
      (s) => s._id?.toString() === staffMemberId
    );
    if (!staffMember) throw new NotFoundError('Staff member');

    // Revoke every active token for this staff phone on this event.
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
      // True when the staff member already had no active tokens — same
      // final state as a fresh revoke. Useful for the UI to render
      // "already revoked" vs "just revoked".
      wasAlreadyRevoked: affected === 0,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Idempotent check-in core (Phase 3e.2 / FLOW-20-F03 / D6).
   *
   * The DB row IS the idempotency cache here. We use an atomic
   * `findOneAndUpdate` with `status: { $ne: 'checked_in' }` as the guard
   * — at most one concurrent caller's update lands; everyone else falls
   * through to "already checked in" with the original `checkedInAt`.
   *
   * Why DB-level instead of the HTTP idempotency cache: the spec wants
   * the scanner UI to see `alreadyCheckedIn: true` on replay (so it can
   * render "checked in at HH:MM"). The HTTP cache would return the
   * first call's body verbatim — `alreadyCheckedIn: false` — on every
   * replay, defeating the UX. Compare-and-swap on the guest doc gives
   * us correct first-vs-replay semantics naturally and is also safe
   * against concurrent scans of the same QR.
   */
  async _performIdempotentCheckIn(eventId, guest, staffUser) {
    const now = new Date();

    // H-21: capture WHO performed the check-in. `staffUser` may be:
    //   - a User document (host self-check-in / admin)
    //   - a session payload from the staff scanner (no `_id`, has
    //     `phone`, `staffName`, optional `staffTokenId`)
    // Build the audit fields accordingly so a re-scan can tell staff B who
    // originally checked the guest in.
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
      // First successful check-in (CAS won).
      this._notifyHostCheckIn(eventId, updated).catch(console.error);
      // M-10 / Phase 5 hand-off groundwork: emit an audit-log entry so
      // there's a forensic trail of every check-in.
      try {
        const { logAudit } = require('../../shared/utils/auditLog');
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
        // eslint-disable-next-line no-console
        console.warn('[staff.checkIn] audit log failed:', auditErr?.message);
      }
      return {
        guest: this._formatGuest(updated),
        alreadyCheckedIn: false,
        checkedInAt: updated.checkIn?.checkedInAt || now,
        message: 'Guest checked in successfully',
      };
    }

    // CAS lost — guest was already checked in (possibly by a concurrent
    // scan). Fetch the persisted record to return the original
    // `checkedInAt` AND the original actor so the scanner UI can render
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
