/**
 * @halaa-checkin/api
 * Authentication API Routes: /auth/login, /auth/session, /auth/logout.
 * Adheres to Technical Contract Section 4.
 */

import { Router } from 'express';
import { loginSchema, createSuccessEnvelope } from '@halaa-checkin/contracts';
import { loginUser, logoutUser } from './auth.service.js';
import { requireAuth } from '../../middleware/authorize.js';
import { createLoginRateLimiter } from '../../middleware/rateLimits.js';

/**
 * Creates authentication router with injected dependencies.
 *
 * @param {object} deps
 * @param {object} deps.config
 * @param {import('express').RequestHandler} [deps.loginLimiter]
 * @returns {Router}
 */
export function createAuthRouter({ config, loginLimiter }) {
  const router = Router();
  const limiter =
    loginLimiter ||
    (config.env === 'test' ? createLoginRateLimiter({ max: 1000 }) : createLoginRateLimiter({ max: 10 }));

  /**
   * POST /auth/login
   * Public endpoint; protected by Origin + JSON and login rate limiter.
   */
  router.post('/login', limiter, async (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body);
      const result = await loginUser({
        username: payload.username,
        password: payload.password,
        config,
      });

      // Set session cookie
      res.cookie(config.session.cookieName, result.sessionToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: config.session.ttlMs,
      });

      return res.status(200).json(
        createSuccessEnvelope({
          user: result.user,
          csrfToken: result.csrfToken,
        })
      );
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /auth/session
   * Authenticated session probe. Returns user DTO, CSRF token, and expiry.
   */
  router.get('/session', requireAuth, (req, res) => {
    return res.status(200).json(
      createSuccessEnvelope({
        user: req.user,
        csrfToken: req.csrfToken,
        expiresAt: req.session.expiresAt.toISOString(),
      })
    );
  });

  /**
   * POST /auth/logout
   * Revokes session in database and clears session cookie.
   * Responds with 204 No Content.
   */
  router.post('/logout', async (req, res, next) => {
    try {
      const sessionToken = req.cookies ? req.cookies[config.session.cookieName] : null;
      if (sessionToken) {
        await logoutUser(sessionToken);
      }

      res.clearCookie(config.session.cookieName, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        path: '/',
      });

      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
