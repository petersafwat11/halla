/**
 * @halaa-checkin/api
 * Session resolution and authentication middleware.
 * Reads HttpOnly session cookie, verifies SHA-256 digest, and loads active user.
 */

import { Session } from '../modules/auth/session.model.js';
import { User } from '../modules/auth/user.model.js';
import { sha256 } from '../utils/crypto.js';

/**
 * Creates authentication middleware with injected config.
 *
 * @param {object} config
 * @returns {import('express').RequestHandler}
 */
export function createAuthMiddleware(config) {
  return async function authMiddleware(req, res, next) {
    req.user = null;
    req.session = null;
    req.csrfToken = null;

    const cookieName = config.session.cookieName;
    const sessionToken = req.cookies ? req.cookies[cookieName] : null;

    if (!sessionToken || typeof sessionToken !== 'string') {
      return next();
    }

    try {
      const tokenHash = sha256(sessionToken);
      const session = await Session.findActiveByTokenHash(tokenHash);

      if (!session) {
        return next();
      }

      // Check if user exists and is not disabled
      const user = await User.findOne({ _id: session.userId, disabledAt: null });
      if (!user) {
        // Disabled or deleted user: session invalid
        return next();
      }

      req.session = session;
      req.user = user.toSafeDto();
      req.userDoc = user;
      req.csrfToken = session.csrfToken;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
