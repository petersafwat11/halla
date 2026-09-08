/**
 * @halaa-checkin/api
 * Authorization middleware.
 * Enforces authentication, named role restrictions, and event scope.
 */

import { ERROR_CODES, DomainError, ROLES } from '@halaa-checkin/contracts';

/**
 * Require an authenticated user.
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return next(
      new DomainError({
        code: ERROR_CODES.UNAUTHENTICATED,
        message: 'Authentication required',
        status: 401,
      })
    );
  }
  return next();
}

/**
 * Require a specific role (e.g. 'admin').
 *
 * @param {string} requiredRole
 */
export function requireRole(requiredRole) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new DomainError({
          code: ERROR_CODES.UNAUTHENTICATED,
          message: 'Authentication required',
          status: 401,
        })
      );
    }

    if (req.user.role !== requiredRole) {
      return next(
        new DomainError({
          code: ERROR_CODES.FORBIDDEN,
          message: `Access denied. Requires '${requiredRole}' role.`,
          status: 403,
        })
      );
    }

    return next();
  };
}

/**
 * Require assignment to the requested event (or admin role).
 * Receptionists only see assigned events; unassigned events return generic 404.
 *
 * @param {(req: import('express').Request) => string} getEventId
 */
export function requireEventAssignment(getEventId) {
  return function eventScopeMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new DomainError({
          code: ERROR_CODES.UNAUTHENTICATED,
          message: 'Authentication required',
          status: 401,
        })
      );
    }

    // Admins have access to all events
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const eventId = getEventId(req);
    if (!eventId) {
      return next(
        new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        })
      );
    }

    const assigned = (req.user.assignedEventIds || []).includes(String(eventId));
    if (!assigned) {
      // Return generic 404 to avoid leaking event existence
      return next(
        new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Event not found',
          status: 404,
        })
      );
    }

    return next();
  };
}
