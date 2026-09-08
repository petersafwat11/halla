/**
 * @halaa-checkin/api
 * Guests Service.
 * Implements business rules, validation, capacity limits, lifecycle gates,
 * and transactional audit writes for guest invitations.
 * Adheres to Technical Contract Sections 3–5.
 */

import {
  ERROR_CODES,
  DomainError,
  EVENT_STATUSES,
  LIMITS,
  REGEXES,
  guestListQuerySchema,
  guestCreateSchema,
  guestUpdateSchema,
  guestSoftDeleteSchema,
  normalizeForSearch,
  normalizeReference,
  normalizeReferenceKey,
} from '@halaa-checkin/contracts';
import { Event } from '../events/event.model.js';
import { GuestsRepository } from './guests.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { withTransaction } from '../../db/transaction.js';
import { generateShortCode, generateQrToken } from '../../utils/crypto.js';

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const GuestsService = {
  /**
   * List paginated active guests in an event.
   *
   * @param {string} eventId
   * @param {object} queryParams
   * @param {object} _user
   * @returns {Promise<{ guests: import('./guest.model.js').Guest[], total: number, page: number, pageSize: number }>}
   */
  async listGuests(eventId, queryParams, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const parsedQuery = guestListQuerySchema.parse(queryParams);
    const filter = {};

    if (parsedQuery.status === 'admitted') {
      filter.checkIn = { $ne: null };
    } else if (parsedQuery.status === 'pending') {
      filter.checkIn = null;
    }

    if (parsedQuery.q) {
      const rawQ = parsedQuery.q.trim();
      const normQ = normalizeForSearch(rawQ);
      const orConditions = [];

      if (normQ.length > 0) {
        orConditions.push({ nameSearch: { $regex: escapeRegex(normQ) } });
      }
      if (rawQ.length > 0) {
        orConditions.push({ shortCode: rawQ.toUpperCase() });
        orConditions.push({ referenceKey: { $regex: escapeRegex(rawQ.toUpperCase()) } });
      }

      if (orConditions.length > 0) {
        filter.$or = orConditions;
      }
    }

    return GuestsRepository.findPaginated({
      eventId,
      filter,
      page: parsedQuery.page,
      pageSize: parsedQuery.pageSize,
    });
  },

  /**
   * Get an active guest by ID within an event.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} _user
   * @returns {Promise<import('./guest.model.js').Guest>}
   */
  async getGuestById(eventId, guestId, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    const guest = await GuestsRepository.findById(eventId, guestId);
    if (!guest) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    return guest;
  },

  /**
   * Create a new guest invitation in an event.
   * Transactional with event fence and capacity enforcement.
   *
   * @param {string} eventId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('./guest.model.js').Guest>}
   */
  async createGuest(eventId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const payload = guestCreateSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      // 1. Event fence: check event exists and is not closed
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status === EVENT_STATUSES.CLOSED) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot add guests to a closed event',
          status: 409,
        });
      }

      // Increment activitySeq serialization fence
      const fenceResult = await Event.updateOne(
        { _id: eventId, status: { $ne: EVENT_STATUSES.CLOSED } },
        { $inc: { activitySeq: 1 } },
        { session }
      );
      if (fenceResult.matchedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot add guests to a closed event',
          status: 409,
        });
      }

      // 2. Capacity check (1,000 active invitations max)
      const activeCount = await GuestsRepository.countActive(eventId, { session });
      if (activeCount >= LIMITS.MAX_EVENT_INVITATIONS) {
        throw new DomainError({
          code: ERROR_CODES.CAPACITY_EXCEEDED,
          message: `Event has reached the maximum capacity of ${LIMITS.MAX_EVENT_INVITATIONS} invitations`,
          status: 409,
        });
      }

      // 3. Reference uniqueness check
      const refKey = normalizeReferenceKey(payload.reference);
      if (refKey) {
        const existing = await GuestsRepository.findByReferenceKey(eventId, refKey, { session });
        if (existing) {
          throw new DomainError({
            code: ERROR_CODES.REFERENCE_CONFLICT,
            message: `Reference '${payload.reference}' is already used by another guest in this event`,
            status: 409,
            fieldErrors: { reference: 'Reference already exists in this event' },
          });
        }
      }

      // 4. Generate unique tokens
      const qrToken = generateQrToken();
      let shortCode = null;
      for (let i = 0; i < 5; i++) {
        const code = generateShortCode();
        const exists = await GuestsRepository.existsShortCode(eventId, code, { session });
        if (!exists) {
          shortCode = code;
          break;
        }
      }
      if (!shortCode) {
        throw new Error('Failed to generate unique short code');
      }

      // 5. Create guest document
      const guest = await GuestsRepository.create(
        {
          eventId,
          name: payload.name.trim(),
          nameSearch: normalizeForSearch(payload.name),
          reference: normalizeReference(payload.reference),
          referenceKey: refKey,
          allowedCompanions: payload.allowedCompanions,
          companionNames: payload.companionNames || [],
          qrToken,
          shortCode,
          version: 1,
          checkIn: null,
          deletedAt: null,
        },
        { session }
      );

      // 6. Record immutable audit
      await AuditService.record({
        eventId,
        guestId: guest._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'GUEST_CREATE',
        changes: {
          after: {
            name: guest.name,
            reference: guest.reference,
            allowedCompanions: guest.allowedCompanions,
            shortCode: guest.shortCode,
          },
        },
        requestId,
        session,
      });

      return guest;
    });
  },

  /**
   * Update an existing guest invitation.
   * Ordinary edit is rejected if already admitted.
   * Tokens remain immutable.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('./guest.model.js').Guest>}
   */
  async updateGuest(eventId, guestId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    const payload = guestUpdateSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      // 1. Event fence: check event exists and is not closed
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status === EVENT_STATUSES.CLOSED) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot edit guests in a closed event',
          status: 409,
        });
      }

      const fenceResult = await Event.updateOne(
        { _id: eventId, status: { $ne: EVENT_STATUSES.CLOSED } },
        { $inc: { activitySeq: 1 } },
        { session }
      );
      if (fenceResult.matchedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot edit guests in a closed event',
          status: 409,
        });
      }

      // 2. Fetch guest
      const guest = await GuestsRepository.findById(eventId, guestId, { session });
      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Guest not found',
          status: 404,
        });
      }

      // 3. Admitted guests cannot be edited through ordinary edit
      if (guest.checkIn !== null) {
        throw new DomainError({
          code: ERROR_CODES.ALREADY_CHECKED_IN,
          message: 'Cannot edit an admitted guest. Reset admission first.',
          status: 409,
        });
      }

      // 4. Optimistic locking
      if (guest.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict. Please reload and retry.',
          status: 409,
        });
      }

      // 5. Reference uniqueness check
      if (payload.reference !== undefined) {
        const newRefKey = normalizeReferenceKey(payload.reference);
        if (newRefKey) {
          const existing = await GuestsRepository.findByReferenceKey(eventId, newRefKey, {
            session,
            excludeGuestId: guest._id,
          });
          if (existing) {
            throw new DomainError({
              code: ERROR_CODES.REFERENCE_CONFLICT,
              message: `Reference '${payload.reference}' is already used by another guest in this event`,
              status: 409,
              fieldErrors: { reference: 'Reference already exists in this event' },
            });
          }
        }
      }

      // 6. Companion allowance consistency check
      const targetAllowed =
        payload.allowedCompanions !== undefined ? payload.allowedCompanions : guest.allowedCompanions;
      const targetNames =
        payload.companionNames !== undefined ? payload.companionNames : guest.companionNames;
      if (targetNames.length > targetAllowed) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'companionNames count cannot exceed allowedCompanions',
          status: 422,
          fieldErrors: { companionNames: 'Too many companion names' },
        });
      }

      // 7. Track changes and apply updates
      const changedFields = [];
      const before = {};
      const after = {};

      if (payload.name !== undefined && payload.name.trim() !== guest.name) {
        changedFields.push('name');
        before.name = guest.name;
        after.name = payload.name.trim();
        guest.name = payload.name.trim();
        guest.nameSearch = normalizeForSearch(payload.name);
      }

      if (payload.reference !== undefined) {
        const normRef = normalizeReference(payload.reference);
        if (normRef !== guest.reference) {
          changedFields.push('reference');
          before.reference = guest.reference;
          after.reference = normRef;
        }
        guest.reference = normRef;
        guest.referenceKey = normalizeReferenceKey(payload.reference);
      }

      if (
        payload.allowedCompanions !== undefined &&
        payload.allowedCompanions !== guest.allowedCompanions
      ) {
        changedFields.push('allowedCompanions');
        before.allowedCompanions = guest.allowedCompanions;
        after.allowedCompanions = payload.allowedCompanions;
        guest.allowedCompanions = payload.allowedCompanions;
      }

      if (payload.companionNames !== undefined) {
        changedFields.push('companionNames');
        before.companionNames = guest.companionNames;
        after.companionNames = payload.companionNames;
        guest.companionNames = payload.companionNames;
      }

      guest.version += 1;
      await GuestsRepository.save(guest, { session });

      // 8. Record audit
      await AuditService.record({
        eventId,
        guestId: guest._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'GUEST_UPDATE',
        changes: { fieldNames: changedFields, before, after },
        requestId,
        session,
      });

      return guest;
    });
  },

  /**
   * Soft-delete a guest invitation.
   * Rejected if the guest is already admitted.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<void>}
   */
  async deleteGuest(eventId, guestId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    const payload = guestSoftDeleteSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      // 1. Event fence: check event exists and is not closed
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status === EVENT_STATUSES.CLOSED) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot delete guests from a closed event',
          status: 409,
        });
      }

      const fenceResult = await Event.updateOne(
        { _id: eventId, status: { $ne: EVENT_STATUSES.CLOSED } },
        { $inc: { activitySeq: 1 } },
        { session }
      );
      if (fenceResult.matchedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Cannot delete guests from a closed event',
          status: 409,
        });
      }

      // 2. Fetch guest
      const guest = await GuestsRepository.findById(eventId, guestId, { session });
      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Guest not found',
          status: 404,
        });
      }

      // 3. Admitted guests cannot be deleted until explicit reset
      if (guest.checkIn !== null) {
        throw new DomainError({
          code: ERROR_CODES.ALREADY_CHECKED_IN,
          message: 'Cannot delete an admitted guest. Reset admission first.',
          status: 409,
        });
      }

      // 4. Optimistic locking
      if (guest.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict. Please reload and retry.',
          status: 409,
        });
      }

      // 5. Soft-delete
      guest.deletedAt = new Date();
      guest.version += 1;
      await GuestsRepository.save(guest, { session });

      // 6. Record audit
      await AuditService.record({
        eventId,
        guestId: guest._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'GUEST_DELETE',
        changes: {
          before: {
            name: guest.name,
            shortCode: guest.shortCode,
            reference: guest.reference,
          },
        },
        requestId,
        session,
      });
    });
  },
};
