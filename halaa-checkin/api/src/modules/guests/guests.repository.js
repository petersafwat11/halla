/**
 * @halaa-checkin/api
 * Guests Repository.
 * Owns Mongoose database queries for guest documents.
 */

import { normalizeForSearch } from '@halaa-checkin/contracts';
import { Guest } from './guest.model.js';

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const GuestsRepository = {
  /**
   * Find a guest by ID within an event (excluding soft-deleted).
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./guest.model.js').Guest | null>}
   */
  async findById(eventId, guestId, { session } = {}) {
    return Guest.findOne({ _id: guestId, eventId, deletedAt: null }).session(session || null);
  },

  /**
   * Find an active guest by reference key within an event.
   *
   * @param {string} eventId
   * @param {string} referenceKey
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @param {string} [options.excludeGuestId]
   * @returns {Promise<import('./guest.model.js').Guest | null>}
   */
  async findByReferenceKey(eventId, referenceKey, { session, excludeGuestId } = {}) {
    if (!referenceKey) return null;
    const filter = { eventId, referenceKey, deletedAt: null };
    if (excludeGuestId) {
      filter._id = { $ne: excludeGuestId };
    }
    return Guest.findOne(filter).session(session || null);
  },

  /**
   * Check if a short code already exists within an event.
   *
   * @param {string} eventId
   * @param {string} shortCode
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<boolean>}
   */
  async existsShortCode(eventId, shortCode, { session } = {}) {
    const exists = await Guest.exists({ eventId, shortCode }).session(session || null);
    return !!exists;
  },

  /**
   * Count active (non-deleted) guests in an event.
   *
   * @param {string} eventId
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<number>}
   */
  async countActive(eventId, { session } = {}) {
    return Guest.countDocuments({ eventId, deletedAt: null }).session(session || null);
  },

  /**
   * Find paginated guests matching filters.
   * Stable sort by nameSearch asc, _id asc.
   *
   * @param {object} params
   * @param {string} params.eventId
   * @param {object} [params.filter]
   * @param {number} [params.page]
   * @param {number} [params.pageSize]
   * @returns {Promise<{ guests: import('./guest.model.js').Guest[], total: number, page: number, pageSize: number }>}
   */
  async findPaginated({ eventId, filter = {}, page = 1, pageSize = 25 }) {
    const mongoFilter = {
      eventId,
      deletedAt: null,
      ...filter,
    };

    const total = await Guest.countDocuments(mongoFilter);
    const guests = await Guest.find(mongoFilter)
      .sort({ nameSearch: 1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return { guests, total, page, pageSize };
  },

  /**
   * Retrieve minimal active guest fields for statistics calculation.
   * Excludes qrToken.
   *
   * @param {string} eventId
   * @returns {Promise<Array<{ allowedCompanions: number, checkIn: object | null }>>}
   */
  async findActiveForStats(eventId) {
    return Guest.find({ eventId, deletedAt: null })
      .select('allowedCompanions checkIn')
      .lean();
  },

  /**
   * Create and save a new guest document.
   *
   * @param {object} guestData
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./guest.model.js').Guest>}
   */
  async create(guestData, { session } = {}) {
    const guest = new Guest(guestData);
    await guest.save({ session });
    return guest;
  },

  /**
   * Save an existing guest document.
   *
   * @param {import('./guest.model.js').Guest} guest
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./guest.model.js').Guest>}
   */
  async save(guest, { session } = {}) {
    await guest.save({ session });
    return guest;
  },

  /**
   * Find an active guest by QR token within an event.
   *
   * @param {string} eventId
   * @param {string} qrToken
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./guest.model.js').Guest | null>}
   */
  async findByQrToken(eventId, qrToken, { session } = {}) {
    return Guest.findOne({ eventId, qrToken, deletedAt: null }).session(session || null);
  },

  /**
   * Search active guests for gate lookup (at most 20 safe matches).
   * Supports Arabic/English name normalization, short code, and reference.
   *
   * @param {string} eventId
   * @param {string} q
   * @returns {Promise<import('./guest.model.js').Guest[]>}
   */
  async searchGate(eventId, q) {
    const rawQ = (q || '').trim();
    const normQ = normalizeForSearch(rawQ);
    const orConditions = [];

    if (normQ.length > 0) {
      orConditions.push({ nameSearch: { $regex: escapeRegex(normQ) } });
    }
    if (rawQ.length > 0) {
      orConditions.push({ shortCode: rawQ.toUpperCase() });
      orConditions.push({ referenceKey: { $regex: escapeRegex(rawQ.toUpperCase()) } });
    }

    if (orConditions.length === 0) return [];

    return Guest.find({
      eventId,
      deletedAt: null,
      $or: orConditions,
    })
      .sort({ nameSearch: 1, _id: 1 })
      .limit(20);
  },

  /**
   * Find latest 10 safe admitted guests in an event.
   *
   * @param {string} eventId
   * @param {number} [limit=10]
   * @returns {Promise<import('./guest.model.js').Guest[]>}
   */
  async findRecentAdmissions(eventId, limit = 10) {
    return Guest.find({
      eventId,
      deletedAt: null,
      checkIn: { $ne: null },
    })
      .sort({ 'checkIn.checkedInAt': -1, _id: -1 })
      .limit(limit);
  },
};
