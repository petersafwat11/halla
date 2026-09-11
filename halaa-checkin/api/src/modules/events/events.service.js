/**
 * @halaa-checkin/api
 * Events Service.
 * Implements business rules, lifecycle status transitions, optimistic locking,
 * role/assignment scope, and transactional audit writes for events.
 * Adheres to Technical Contract Sections 3–6.
 */

import {
  ERROR_CODES,
  DomainError,
  ROLES,
  EVENT_STATUSES,
  EVENT_TIMEZONE,
  REGEXES,
  eventCreateSchema,
  eventUpdateSchema,
  eventStatusTransitionSchema,
  validateEventStatusTransition,
  parseExplicitOffsetDate,
  calculateStats,
} from '@halaa-checkin/contracts';
import { Event } from './event.model.js';
import { GuestsRepository } from '../guests/guests.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { withTransaction } from '../../db/transaction.js';

export const EventsService = {
  /**
   * List visible events for the requesting user.
   * Admins see all events; receptionists see assigned events only.
   *
   * @param {object} user
   * @param {object} [query]
   * @returns {Promise<{ events: import('./event.model.js').Event[], total: number, page: number, pageSize: number }>}
   */
  async listEvents(user, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 100));

    const filter = {};
    if (user.role === ROLES.RECEPTION) {
      filter._id = { $in: user.assignedEventIds || [] };
    }

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ startsAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return { events, total, page, pageSize };
  },

  /**
   * Get an event by ID with access control verification.
   *
   * @param {string} eventId
   * @param {object} user
   * @returns {Promise<import('./event.model.js').Event>}
   */
  async getEventById(eventId, user) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const event = await Event.findById(eventId);
    if (!event || event.purgingAt) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    // Receptionists must be explicitly assigned to the event
    if (user.role === ROLES.RECEPTION) {
      const isAssigned = (user.assignedEventIds || []).includes(eventId);
      if (!isAssigned) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }
    }

    return event;
  },

  /**
   * Create a new draft event. Admin only.
   *
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('./event.model.js').Event>}
   */
  async createEvent(rawPayload, user, { requestId } = {}) {
    const payload = eventCreateSchema.parse(rawPayload);
    const startsAtUtc = parseExplicitOffsetDate(payload.startsAt);

    return withTransaction(async (session) => {
      const event = new Event({
        name: payload.name.trim(),
        venue: payload.venue.trim(),
        startsAt: startsAtUtc,
        timezone: EVENT_TIMEZONE,
        status: EVENT_STATUSES.DRAFT,
        version: 1,
        activitySeq: 0,
        closedAt: null,
      });

      await event.save({ session });

      await AuditService.record({
        eventId: event._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'EVENT_CREATE',
        changes: {
          after: {
            name: event.name,
            venue: event.venue,
            startsAt: event.startsAt,
            status: event.status,
          },
        },
        requestId,
        session,
      });

      return event;
    });
  },

  /**
   * Update event details (name, venue, startsAt).
   * Settings edit compares and increments version; activitySeq is untouched.
   * Closed events cannot be edited without reopening.
   *
   * @param {string} eventId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('./event.model.js').Event>}
   */
  async updateEvent(eventId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const payload = eventUpdateSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      const event = await Event.findById(eventId).session(session);
      if (!event || event.purgingAt) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status === EVENT_STATUSES.CLOSED) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Closed events cannot be edited without reopening',
          status: 409,
        });
      }

      if (event.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Event version conflict. Please reload and retry.',
          status: 409,
        });
      }

      const changedFields = [];
      const before = {};
      const after = {};

      if (payload.name !== undefined && payload.name.trim() !== event.name) {
        changedFields.push('name');
        before.name = event.name;
        after.name = payload.name.trim();
        event.name = payload.name.trim();
      }

      if (payload.venue !== undefined && payload.venue.trim() !== event.venue) {
        changedFields.push('venue');
        before.venue = event.venue;
        after.venue = payload.venue.trim();
        event.venue = payload.venue.trim();
      }

      if (payload.startsAt !== undefined) {
        const parsedDate = parseExplicitOffsetDate(payload.startsAt);
        if (parsedDate.getTime() !== event.startsAt.getTime()) {
          changedFields.push('startsAt');
          before.startsAt = event.startsAt.toISOString();
          after.startsAt = parsedDate.toISOString();
          event.startsAt = parsedDate;
        }
      }

      event.version += 1;
      await event.save({ session });

      await AuditService.record({
        eventId: event._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'EVENT_UPDATE',
        changes: { fieldNames: changedFields, before, after },
        requestId,
        session,
      });

      return event;
    });
  },

  /**
   * Transition event lifecycle status.
   * Increments activitySeq and version to serialize against concurrent gate operations.
   *
   * @param {string} eventId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('./event.model.js').Event>}
   */
  async updateEventStatus(eventId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const payload = eventStatusTransitionSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      const event = await Event.findById(eventId).session(session);
      if (!event || event.purgingAt) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Event version conflict. Please reload and retry.',
          status: 409,
        });
      }

      const transition = validateEventStatusTransition({
        currentStatus: event.status,
        targetStatus: payload.status,
        reason: payload.reason,
      });

      if (!transition.valid) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: transition.error,
          status: 409,
        });
      }

      const oldStatus = event.status;
      event.status = payload.status;
      event.activitySeq += 1;
      event.version += 1;

      if (payload.status === EVENT_STATUSES.CLOSED) {
        event.closedAt = new Date();
      } else if (payload.status === EVENT_STATUSES.LIVE) {
        event.closedAt = null;
      }

      await event.save({ session });

      await AuditService.record({
        eventId: event._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'EVENT_STATUS_CHANGE',
        reason: payload.reason || null,
        changes: {
          before: { status: oldStatus },
          after: { status: event.status },
        },
        requestId,
        session,
      });

      return event;
    });
  },

  /**
   * Calculate authoritative event-wide attendance statistics.
   *
   * @param {string} eventId
   * @param {object} user
   * @returns {Promise<object>}
   */
  async getEventStats(eventId, user) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const event = await Event.findById(eventId);
    if (!event || event.purgingAt) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    if (user.role === ROLES.RECEPTION) {
      const isAssigned = (user.assignedEventIds || []).includes(eventId);
      if (!isAssigned) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }
    }

    const guests = await GuestsRepository.findActiveForStats(eventId);
    const stats = calculateStats(guests);

    return {
      ...stats,
      asOf: new Date().toISOString(),
    };
  },
};
