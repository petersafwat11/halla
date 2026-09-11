/**
 * @halaa-checkin/api
 * Exports Express Routes.
 * Mounted at /events/:eventId/exports.
 * Requires admin role and authenticated session.
 * Adheres to Technical Contract Sections 4 & 7.
 */

import express from 'express';
import fs from 'node:fs';
import contentDisposition from 'content-disposition';
import { ROLES, createSuccessEnvelope } from '@halaa-checkin/contracts';
import { requireAuth, requireRole } from '../../middleware/authorize.js';
import { ExportsService } from './exports.service.js';

export function createExportsRouter() {
  const router = express.Router({ mergeParams: true });

  // All export routes require authentication and admin role
  router.use(requireAuth);
  router.use(requireRole(ROLES.ADMIN));

  /**
   * POST /events/:eventId/exports
   * Request an asynchronous PDF export (passes or report).
   * Returns 202 Accepted with { id, state, snapshotAt }.
   */
  router.post('/', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const result = await ExportsService.createExportJob(eventId, req.body, req.user, {
        requestId: req.id,
      });

      return res.status(202).json(createSuccessEnvelope(result));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/exports/:exportId
   * Check safe status and progress of an export job.
   */
  router.get('/:exportId', async (req, res, next) => {
    try {
      const { eventId, exportId } = req.params;
      const jobDto = await ExportsService.getExportJob(eventId, exportId, req.user);

      return res.status(200).json(createSuccessEnvelope(jobDto));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/exports/:exportId/download
   * Stream authenticated PDF artifact.
   * Enforces readiness, non-expiry, and authenticated access.
   */
  router.get('/:exportId/download', async (req, res, next) => {
    try {
      const { eventId, exportId } = req.params;
      const { filePath, filename, size } = await ExportsService.getDownloadStream(
        eventId,
        exportId,
        req.user
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Disposition', contentDisposition(filename));
      if (size) {
        res.setHeader('Content-Length', size);
      }

      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => next(streamErr));
      return stream.pipe(res);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
