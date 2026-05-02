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
   * Check in guest via QR code
   * @param {string} eventId
   * @param {string} qrCode
   * @param {Object} staffUser
   * @returns {Promise<Object>}
   */
  async checkInByQR(eventId, qrCode, staffUser) {
    const guest = await Guest.findOne({ event: eventId, qrcode: qrCode });

    if (!guest) {
      throw new NotFoundError('Guest not found with this QR code');
    }

    if (guest.status === 'checked_in') {
      return {
        guest: this._formatGuest(guest),
        alreadyCheckedIn: true,
        message: 'Guest was already checked in',
      };
    }

    guest.status = 'checked_in';
    guest.checkIn = {
      checkedIn: true,
      checkedInAt: new Date(),
    };
    await guest.save();

    // Notify host
    this._notifyHostCheckIn(eventId, guest).catch(console.error);

    return {
      guest: this._formatGuest(guest),
      alreadyCheckedIn: false,
      message: 'Guest checked in successfully',
    };
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

    if (guest.status === 'checked_in') {
      return {
        guest: this._formatGuest(guest),
        alreadyCheckedIn: true,
      };
    }

    guest.status = 'checked_in';
    guest.checkIn = {
      checkedIn: true,
      checkedInAt: new Date(),
    };
    await guest.save();

    this._notifyHostCheckIn(eventId, guest).catch(console.error);

    return {
      guest: this._formatGuest(guest),
      alreadyCheckedIn: false,
    };
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

    if (guest.status === 'checked_in') {
      return {
        guest: this._formatGuest(guest),
        alreadyCheckedIn: true,
        message: 'Guest was already checked in',
      };
    }

    guest.status = 'checked_in';
    guest.checkIn = {
      checkedIn: true,
      checkedInAt: new Date(),
    };
    await guest.save();

    this._notifyHostCheckIn(eventId, guest).catch(console.error);

    return {
      guest: this._formatGuest(guest),
      alreadyCheckedIn: false,
      message: 'Guest checked in successfully',
    };
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

  // ============================================
  // PRIVATE HELPERS
  // ============================================

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
