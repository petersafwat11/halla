/**
 * @halaa-checkin/api
 * Guests Express Routes.
 * Mounted at /events/:eventId/guests.
 * Requires admin role and authenticated session.
 */

import express from 'express';
import {
  ROLES,
  createSuccessEnvelope,
  createPaginatedEnvelope,
} from '@halaa-checkin/contracts';
import { requireAuth, requireRole } from '../../middleware/authorize.js';
import { GuestsService } from './guests.service.js';
import { CheckinsService } from '../checkins/checkins.service.js';
import { ExportsService } from '../exports/exports.service.js';

export function createGuestsRouter() {
  const router = express.Router({ mergeParams: true });

  // All guest routes require authentication and admin role
  router.use(requireAuth);
  router.use(requireRole(ROLES.ADMIN));

  /**
   * GET /events/:eventId/guests
   * Paginated list of active guests.
   */
  router.get('/', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const result = await GuestsService.listGuests(eventId, req.query, req.user);
      const safeDtos = result.guests.map((g) => g.toSafeDto());

      return res.status(200).json(
        createPaginatedEnvelope(safeDtos, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        })
      );
    } catch (err) {
      return next(err);
    }
  });

  /**
   * POST /events/:eventId/guests
   * Create a new guest invitation.
   */
  router.post('/', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const guest = await GuestsService.createGuest(eventId, req.body, req.user, {
        requestId: req.id,
      });

      return res.status(201).json(createSuccessEnvelope(guest.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/guests/:guestId
   * Retrieve active guest details.
   */
  router.get('/:guestId', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      const guest = await GuestsService.getGuestById(eventId, guestId, req.user);

      return res.status(200).json(createSuccessEnvelope(guest.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * PATCH /events/:eventId/guests/:guestId
   * Update guest editable details.
   */
  router.patch('/:guestId', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      const updatedGuest = await GuestsService.updateGuest(
        eventId,
        guestId,
        req.body,
        req.user,
        { requestId: req.id }
      );

      return res.status(200).json(createSuccessEnvelope(updatedGuest.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * DELETE /events/:eventId/guests/:guestId
   * Soft-delete a guest invitation.
   */
  router.delete('/:guestId', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      await GuestsService.deleteGuest(eventId, guestId, req.body, req.user, {
        requestId: req.id,
      });

      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  /**
   * PATCH /events/:eventId/guests/:guestId/checkin
   * Correct actualCompanions count for an admitted guest (Admin only).
   */
  router.patch('/:guestId/checkin', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      const updatedGuest = await CheckinsService.correctAdmission(
        eventId,
        guestId,
        req.body,
        req.user,
        { requestId: req.id }
      );

      return res.status(200).json(createSuccessEnvelope(updatedGuest.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * DELETE /events/:eventId/guests/:guestId/checkin
   * Reset admission for an admitted guest (Admin only).
   * Returns 200 with updated guest DTO.
   */
  router.delete('/:guestId/checkin', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      const resetGuest = await CheckinsService.resetAdmission(
        eventId,
        guestId,
        req.body,
        req.user,
        { requestId: req.id }
      );

      return res.status(200).json(createSuccessEnvelope(resetGuest.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/guests/:guestId/qr
   * Generate internal QR image preview for an active guest.
   * Returns { data: { imageDataUrl, shortCode } } with Cache-Control: no-store.
   */
  router.get('/:guestId/qr', async (req, res, next) => {
    try {
      const { eventId, guestId } = req.params;
      const result = await ExportsService.getGuestQr(eventId, guestId, req.user);

      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).json(createSuccessEnvelope(result));
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
