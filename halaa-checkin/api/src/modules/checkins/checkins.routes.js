/**
 * @halaa-checkin/api
 * Check-in & Gate Express Routes.
 * Implements /events/:eventId/gate/* and /events/:eventId/checkins.
 * Adheres to Technical Contract Section 4.
 */

import express from 'express';
import { createSuccessEnvelope } from '@halaa-checkin/contracts';
import { requireAuth, requireEventAssignment } from '../../middleware/authorize.js';
import { CheckinsService } from './checkins.service.js';

/**
 * Gate router mounted at /events/:eventId/gate.
 * Scoped to assigned event (admin or assigned receptionist).
 */
export function createGateRouter() {
  const router = express.Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(requireEventAssignment((req) => req.params.eventId));

  /**
   * POST /events/:eventId/gate/resolve
   * Exactly one of {token} or {guestId} -> safe guest and event state.
   */
  router.post('/resolve', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const result = await CheckinsService.resolveGuest(eventId, req.body, req.user);
      return res.status(200).json(createSuccessEnvelope(result));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/gate/search
   * q length 2..120 -> at most 20 safe matches.
   */
  router.get('/search', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const results = await CheckinsService.searchGate(eventId, req.query, req.user);
      return res.status(200).json(createSuccessEnvelope(results));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/gate/recent
   * Latest 10 safe admitted guests.
   */
  router.get('/recent', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const results = await CheckinsService.getRecentAdmissions(eventId, req.user);
      return res.status(200).json(createSuccessEnvelope(results));
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

/**
 * Check-in router mounted at /events/:eventId/checkins.
 * Scoped to assigned event (admin or assigned receptionist).
 */
export function createCheckinsRouter() {
  const router = express.Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(requireEventAssignment((req) => req.params.eventId));

  /**
   * POST /events/:eventId/checkins
   * Atomic check-in admission with Idempotency-Key header.
   */
  router.post('/', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const idempotencyKey = req.headers['idempotency-key'];

      const result = await CheckinsService.admitGuest(
        eventId,
        req.body,
        idempotencyKey,
        req.user,
        { requestId: req.id }
      );

      return res.status(result.status).json(result.body);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
