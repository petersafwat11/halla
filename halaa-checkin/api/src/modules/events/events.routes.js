/**
 * @halaa-checkin/api
 * Events Express Routes.
 * Handles event CRUD, lifecycle transitions, event-scoped stats, and mounts guest routes.
 * Adheres to Technical Contract Section 4.
 */

import express from 'express';
import {
  ROLES,
  createSuccessEnvelope,
  createPaginatedEnvelope,
} from '@halaa-checkin/contracts';
import { requireAuth, requireRole, requireEventAssignment } from '../../middleware/authorize.js';
import { EventsService } from './events.service.js';
import { createGuestsRouter } from '../guests/guests.routes.js';
import { createImportsRouter } from '../imports/imports.routes.js';
import { createGateRouter, createCheckinsRouter } from '../checkins/checkins.routes.js';
import { createExportsRouter } from '../exports/exports.routes.js';

export function createEventsRouter() {
  const router = express.Router();

  // All event routes require authentication
  router.use(requireAuth);

  /**
   * GET /events
   * List visible events for current user (most recent first).
   */
  router.get('/', async (req, res, next) => {
    try {
      const result = await EventsService.listEvents(req.user, req.query);
      const safeDtos = result.events.map((e) => e.toSafeDto());

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
   * POST /events
   * Create a new draft event (Admin only).
   */
  router.post('/', requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const event = await EventsService.createEvent(req.body, req.user, {
        requestId: req.id,
      });

      return res.status(201).json(createSuccessEnvelope(event.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId
   * Retrieve event details (Admin or assigned reception).
   */
  router.get(
    '/:eventId',
    requireEventAssignment((req) => req.params.eventId),
    async (req, res, next) => {
      try {
        const event = await EventsService.getEventById(req.params.eventId, req.user);
        return res.status(200).json(createSuccessEnvelope(event.toSafeDto()));
      } catch (err) {
        return next(err);
      }
    }
  );

  /**
   * PATCH /events/:eventId
   * Update event details (Admin only).
   */
  router.patch('/:eventId', requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const updatedEvent = await EventsService.updateEvent(
        req.params.eventId,
        req.body,
        req.user,
        { requestId: req.id }
      );

      return res.status(200).json(createSuccessEnvelope(updatedEvent.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * POST /events/:eventId/status
   * Transition event status (Admin only).
   */
  router.post('/:eventId/status', requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const updatedEvent = await EventsService.updateEventStatus(
        req.params.eventId,
        req.body,
        req.user,
        { requestId: req.id }
      );

      return res.status(200).json(createSuccessEnvelope(updatedEvent.toSafeDto()));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/stats
   * Retrieve event-wide attendance summary (Admin or assigned reception).
   */
  router.get(
    '/:eventId/stats',
    requireEventAssignment((req) => req.params.eventId),
    async (req, res, next) => {
      try {
        const stats = await EventsService.getEventStats(req.params.eventId, req.user);
        return res.status(200).json(createSuccessEnvelope(stats));
      } catch (err) {
        return next(err);
      }
    }
  );

  /**
   * Mount Guests sub-router:
   * /events/:eventId/guests/*
   */
  router.use('/:eventId/guests', createGuestsRouter());

  /**
   * Mount Imports sub-router:
   * /events/:eventId/imports/*
   */
  router.use('/:eventId/imports', createImportsRouter());

  /**
   * Mount Gate sub-router:
   * /events/:eventId/gate/*
   */
  router.use('/:eventId/gate', createGateRouter());

  /**
   * Mount Check-ins sub-router:
   * /events/:eventId/checkins/*
   */
  router.use('/:eventId/checkins', createCheckinsRouter());

  /**
   * Mount Exports sub-router:
   * /events/:eventId/exports/*
   */
  router.use('/:eventId/exports', createExportsRouter());

  return router;
}
