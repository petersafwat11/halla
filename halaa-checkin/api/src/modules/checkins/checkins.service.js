/**
 * @halaa-checkin/api
 * Check-in Service.
 * Implements gate resolution, search, recent admissions, atomic admission with idempotency,
 * and admin admission correction/reset.
 * Adheres to Technical Contract Sections 4–6 and Product Section 6.
 */

import {
  ERROR_CODES,
  DomainError,
  EVENT_STATUSES,
  LIMITS,
  REGEXES,
  gateResolveSchema,
  gateSearchQuerySchema,
  checkInAdmissionSchema,
  admissionCorrectionSchema,
  admissionResetSchema,
  idempotencyKeySchema,
  createSuccessEnvelope,
} from '@halaa-checkin/contracts';
import { Event } from '../events/event.model.js';
import { Guest } from '../guests/guest.model.js';
import { GuestsRepository } from '../guests/guests.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';
import { withTransaction } from '../../db/transaction.js';

export const CheckinsService = {
  /**
   * Resolve an invitation via QR token or guest ID.
   * Does NOT write admission.
   * Unknown or wrong-event QR returns 404 INVALID_INVITATION with no details.
   *
   * @param {string} eventId
   * @param {object} rawPayload
   * @param {object} _user
   * @returns {Promise<{ guest: object, event: object, eventState: string }>}
   */
  async resolveGuest(eventId, rawPayload, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const payload = gateResolveSchema.parse(rawPayload);

    const event = await Event.findById(eventId);
    if (!event) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    let guest = null;

    if (payload.token) {
      guest = await GuestsRepository.findByQrToken(eventId, payload.token);
      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.INVALID_INVITATION,
          message: 'Invitation not valid for this event',
          status: 404,
        });
      }
    } else if (payload.guestId) {
      guest = await GuestsRepository.findById(eventId, payload.guestId);
      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Guest not found',
          status: 404,
        });
      }
    }

    return {
      guest: guest.toSafeDto(),
      event: {
        id: event._id.toString(),
        name: event.name,
        status: event.status,
        venue: event.venue,
        startsAt: event.startsAt.toISOString(),
        timezone: event.timezone,
      },
      eventState: event.status,
    };
  },

  /**
   * Search active guests for gate preview (at most 20 matches).
   *
   * @param {string} eventId
   * @param {object} query
   * @param {object} _user
   * @returns {Promise<object[]>}
   */
  async searchGate(eventId, query, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const parsed = gateSearchQuerySchema.parse(query);

    const event = await Event.findById(eventId);
    if (!event) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    const matches = await GuestsRepository.searchGate(eventId, parsed.q);
    return matches.map((g) => g.toSafeDto());
  },

  /**
   * Get latest 10 admitted guests in an event.
   *
   * @param {string} eventId
   * @param {object} _user
   * @returns {Promise<object[]>}
   */
  async getRecentAdmissions(eventId, _user) {
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

    const recent = await GuestsRepository.findRecentAdmissions(eventId, 10);
    return recent.map((g) => g.toSafeDto());
  },

  /**
   * Perform atomic check-in admission.
   * Follows Section 5 admission algorithm strictly:
   * event fence, idempotency check/record, duplicate check, version check, audit.
   *
   * @param {string} eventId
   * @param {object} rawPayload
   * @param {string} idempotencyKey
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<{ status: number, body: object }>}
   */
  async admitGuest(eventId, rawPayload, idempotencyKey, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    if (!idempotencyKey) {
      throw new DomainError({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Idempotency-Key header is required',
        status: 400,
        fieldErrors: { idempotencyKey: 'Missing required header' },
      });
    }

    try {
      idempotencyKeySchema.parse(idempotencyKey);
    } catch {
      throw new DomainError({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Invalid Idempotency-Key header format',
        status: 400,
        fieldErrors: { idempotencyKey: 'Invalid idempotency key format' },
      });
    }

    const payload = checkInAdmissionSchema.parse(rawPayload);

    const canonicalPayload = {
      guestId: payload.guestId,
      version: payload.version,
      actualCompanions: payload.actualCompanions,
      method: payload.method,
    };
    const requestHash = IdempotencyService.computeHash(canonicalPayload);

    const actorId = user.id || user._id;

    try {
      return await withTransaction(async (session) => {
        // 1. Read idempotency record scoped to actor + event + operation + key
        const existingIdempotency = await IdempotencyService.findExisting(
          { actorId, operation: 'admission', eventId, key: idempotencyKey },
          { session }
        );

        if (existingIdempotency) {
          if (existingIdempotency.requestHash !== requestHash) {
            throw new DomainError({
              code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
              message: 'Idempotency key reused with different request payload',
              status: 409,
            });
          }
          return {
            status: existingIdempotency.response.status,
            body: existingIdempotency.response.body,
          };
        }

        // 2. Event fence: verify event exists and is LIVE; increment activitySeq
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
            message: 'Cannot admit guests to a closed event',
            status: 409,
          });
        }

        if (event.status !== EVENT_STATUSES.LIVE) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_NOT_LIVE,
            message: `Cannot admit guests to an event in status '${event.status}'`,
            status: 409,
          });
        }

        const fenceResult = await Event.updateOne(
          { _id: eventId, status: EVENT_STATUSES.LIVE },
          { $inc: { activitySeq: 1 } },
          { session }
        );
        if (fenceResult.matchedCount === 0) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_CLOSED,
            message: 'Event is no longer live',
            status: 409,
          });
        }

        // 3. Read active guest in event
        const guest = await Guest.findOne({
          _id: payload.guestId,
          eventId,
          deletedAt: null,
        }).session(session);

        if (!guest) {
          throw new DomainError({
            code: ERROR_CODES.NOT_FOUND,
            message: 'Guest not found',
            status: 404,
          });
        }

        // 4. Check if already checked in
        if (guest.checkIn !== null) {
          throw new DomainError({
            code: ERROR_CODES.ALREADY_CHECKED_IN,
            message: 'Invitation already admitted',
            status: 409,
            details: {
              guest: guest.toSafeDto(),
            },
          });
        }

        // 5. Check version
        if (guest.version !== payload.version) {
          throw new DomainError({
            code: ERROR_CODES.VERSION_CONFLICT,
            message: 'Guest version conflict. Please reload and retry.',
            status: 409,
            details: {
              guest: guest.toSafeDto(),
            },
          });
        }

        // 6. Validate actualCompanions within current allowance
        if (
          !Number.isInteger(payload.actualCompanions) ||
          payload.actualCompanions < LIMITS.MIN_COMPANIONS_PER_GUEST ||
          payload.actualCompanions > guest.allowedCompanions
        ) {
          throw new DomainError({
            code: ERROR_CODES.VALIDATION_FAILED,
            message: `actualCompanions must be an integer between ${LIMITS.MIN_COMPANIONS_PER_GUEST} and ${guest.allowedCompanions}`,
            status: 400,
            fieldErrors: {
              actualCompanions: `Exceeds allowed companions (${guest.allowedCompanions})`,
            },
          });
        }

        // 7. Atomic update guest with predicates
        const checkInRecord = {
          actualCompanions: payload.actualCompanions,
          checkedInAt: new Date(),
          checkedInBy: user.id || user._id,
          operatorName: user.displayName,
          method: payload.method,
        };

        const updateResult = await Guest.updateOne(
          {
            _id: guest._id,
            eventId,
            deletedAt: null,
            checkIn: null,
            version: payload.version,
          },
          {
            $set: { checkIn: checkInRecord },
            $inc: { version: 1 },
          },
          { session }
        );

        if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
          const concurrentGuest = await Guest.findById(guest._id).session(session);
          if (concurrentGuest && concurrentGuest.checkIn !== null) {
            throw new DomainError({
              code: ERROR_CODES.ALREADY_CHECKED_IN,
              message: 'Invitation already admitted',
              status: 409,
              details: {
                guest: concurrentGuest.toSafeDto(),
              },
            });
          }
          throw new DomainError({
            code: ERROR_CODES.VERSION_CONFLICT,
            message: 'Guest version conflict during admission',
            status: 409,
          });
        }

        // 8. Insert immutable audit record
        await AuditService.record({
          eventId,
          guestId: guest._id,
          actorId,
          actorName: user.displayName,
          action: 'GUEST_CHECKIN',
          changes: {
            after: {
              actualCompanions: payload.actualCompanions,
              actualPartySize: 1 + payload.actualCompanions,
              method: payload.method,
              checkedInAt: checkInRecord.checkedInAt.toISOString(),
              checkedInBy: checkInRecord.checkedInBy.toString(),
              operatorName: checkInRecord.operatorName,
            },
          },
          requestId,
          session,
        });

        // 9. Record idempotency entry and construct response
        guest.checkIn = checkInRecord;
        guest.version += 1;
        const responseBody = createSuccessEnvelope(guest.toSafeDto());

        await IdempotencyService.record(
          {
            actorId,
            operation: 'admission',
            eventId,
            key: idempotencyKey,
            requestHash,
            status: 201,
            body: responseBody,
          },
          { session }
        );

        return { status: 201, body: responseBody };
      });
    } catch (err) {
      // Handle concurrent identical insertion on idempotency unique key
      if (err.code === 11000 && (err.message?.includes('key') || err.keyPattern?.key)) {
        const existing = await IdempotencyService.findExisting({
          actorId,
          operation: 'admission',
          eventId,
          key: idempotencyKey,
        });
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new DomainError({
              code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
              message: 'Idempotency key reused with different request payload',
              status: 409,
            });
          }
          return { status: existing.response.status, body: existing.response.body };
        }
      }
      throw err;
    }
  },

  /**
   * Correct admission actualCompanions count.
   * Admin only. Live event only. Preserves original admission time/operator.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('../guests/guest.model.js').Guest>}
   */
  async correctAdmission(eventId, guestId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Resource not found',
        status: 404,
      });
    }

    const payload = admissionCorrectionSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      // 1. Event fence: live event only
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status !== EVENT_STATUSES.LIVE) {
        if (event.status === EVENT_STATUSES.CLOSED) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_CLOSED,
            message: 'Cannot correct admission in a closed event',
            status: 409,
          });
        }
        throw new DomainError({
          code: ERROR_CODES.EVENT_NOT_LIVE,
          message: 'Cannot correct admission in a non-live event',
          status: 409,
        });
      }

      const fenceResult = await Event.updateOne(
        { _id: eventId, status: EVENT_STATUSES.LIVE },
        { $inc: { activitySeq: 1 } },
        { session }
      );
      if (fenceResult.matchedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Event is no longer live',
          status: 409,
        });
      }

      // 2. Fetch active guest
      const guest = await Guest.findOne({
        _id: guestId,
        eventId,
        deletedAt: null,
      }).session(session);

      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Guest not found',
          status: 404,
        });
      }

      // 3. Guest must be admitted
      if (guest.checkIn === null) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Guest has not been admitted yet. Cannot correct admission.',
          status: 400,
        });
      }

      // 4. Version check
      if (guest.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict. Please reload and retry.',
          status: 409,
          details: { guest: guest.toSafeDto() },
        });
      }

      // 5. Validate actualCompanions within allowance
      if (
        !Number.isInteger(payload.actualCompanions) ||
        payload.actualCompanions < LIMITS.MIN_COMPANIONS_PER_GUEST ||
        payload.actualCompanions > guest.allowedCompanions
      ) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: `actualCompanions must be an integer between ${LIMITS.MIN_COMPANIONS_PER_GUEST} and ${guest.allowedCompanions}`,
          status: 400,
          fieldErrors: {
            actualCompanions: `Exceeds allowed companions (${guest.allowedCompanions})`,
          },
        });
      }

      const previousActualCompanions = guest.checkIn.actualCompanions;

      // 6. Update guest with predicates (preserves original admission time and operator)
      const updateResult = await Guest.updateOne(
        {
          _id: guest._id,
          eventId,
          deletedAt: null,
          checkIn: { $ne: null },
          version: payload.version,
        },
        {
          $set: {
            'checkIn.actualCompanions': payload.actualCompanions,
          },
          $inc: { version: 1 },
        },
        { session }
      );

      if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict during correction',
          status: 409,
        });
      }

      // 7. Audit log
      await AuditService.record({
        eventId,
        guestId: guest._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'CHECKIN_CORRECTION',
        reason: payload.reason.trim(),
        changes: {
          fieldNames: ['actualCompanions'],
          before: {
            actualCompanions: previousActualCompanions,
            actualPartySize: 1 + previousActualCompanions,
          },
          after: {
            actualCompanions: payload.actualCompanions,
            actualPartySize: 1 + payload.actualCompanions,
          },
        },
        requestId,
        session,
      });

      guest.checkIn.actualCompanions = payload.actualCompanions;
      guest.version += 1;
      return guest;
    });
  },

  /**
   * Reset admission.
   * Admin only. Live event only. Retains previous admission in audit.
   * Enables another deliberate admission.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} rawPayload
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<import('../guests/guest.model.js').Guest>}
   */
  async resetAdmission(eventId, guestId, rawPayload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Resource not found',
        status: 404,
      });
    }

    const payload = admissionResetSchema.parse(rawPayload);

    return withTransaction(async (session) => {
      // 1. Event fence: live event only
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        });
      }

      if (event.status !== EVENT_STATUSES.LIVE) {
        if (event.status === EVENT_STATUSES.CLOSED) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_CLOSED,
            message: 'Cannot reset admission in a closed event',
            status: 409,
          });
        }
        throw new DomainError({
          code: ERROR_CODES.EVENT_NOT_LIVE,
          message: 'Cannot reset admission in a non-live event',
          status: 409,
        });
      }

      const fenceResult = await Event.updateOne(
        { _id: eventId, status: EVENT_STATUSES.LIVE },
        { $inc: { activitySeq: 1 } },
        { session }
      );
      if (fenceResult.matchedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.EVENT_CLOSED,
          message: 'Event is no longer live',
          status: 409,
        });
      }

      // 2. Fetch active guest
      const guest = await Guest.findOne({
        _id: guestId,
        eventId,
        deletedAt: null,
      }).session(session);

      if (!guest) {
        throw new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Guest not found',
          status: 404,
        });
      }

      // 3. Guest must be admitted
      if (guest.checkIn === null) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Guest is not currently admitted',
          status: 400,
        });
      }

      // 4. Version check
      if (guest.version !== payload.version) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict. Please reload and retry.',
          status: 409,
          details: { guest: guest.toSafeDto() },
        });
      }

      const previousCheckIn = {
        actualCompanions: guest.checkIn.actualCompanions,
        actualPartySize: 1 + guest.checkIn.actualCompanions,
        checkedInAt: guest.checkIn.checkedInAt.toISOString(),
        checkedInBy: guest.checkIn.checkedInBy.toString(),
        operatorName: guest.checkIn.operatorName,
        method: guest.checkIn.method,
      };

      // 5. Update guest with predicates
      const updateResult = await Guest.updateOne(
        {
          _id: guest._id,
          eventId,
          deletedAt: null,
          checkIn: { $ne: null },
          version: payload.version,
        },
        {
          $set: { checkIn: null },
          $inc: { version: 1 },
        },
        { session }
      );

      if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
        throw new DomainError({
          code: ERROR_CODES.VERSION_CONFLICT,
          message: 'Guest version conflict during reset',
          status: 409,
        });
      }

      // 6. Audit log retaining previous admission details
      await AuditService.record({
        eventId,
        guestId: guest._id,
        actorId: user.id || user._id,
        actorName: user.displayName,
        action: 'CHECKIN_RESET',
        reason: payload.reason.trim(),
        changes: {
          before: previousCheckIn,
          after: { checkIn: null },
        },
        requestId,
        session,
      });

      guest.checkIn = null;
      guest.version += 1;
      return guest;
    });
  },
};
