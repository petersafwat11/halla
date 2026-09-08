/**
 * @halaa-checkin/api
 * Imports Express Routes.
 * Mounted at /events/:eventId/imports.
 * Handles non-destructive CSV preview, atomic idempotent commit, and template download.
 * Adheres to Technical Contract Section 4.
 */

import express from 'express';
import {
  ROLES,
  ERROR_CODES,
  DomainError,
  csvPayloadSchema,
  idempotencyKeySchema,
  createSuccessEnvelope,
} from '@halaa-checkin/contracts';
import { requireAuth, requireRole } from '../../middleware/authorize.js';
import { ImportsService } from './imports.service.js';

export function createImportsRouter() {
  const router = express.Router({ mergeParams: true });

  // All import routes require authentication and admin role
  router.use(requireAuth);
  router.use(requireRole(ROLES.ADMIN));

  /**
   * POST /events/:eventId/imports/preview
   * Preview a CSV import file without committing changes.
   */
  router.post('/preview', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const parsedBody = csvPayloadSchema.parse(req.body);

      const preview = await ImportsService.previewImport(
        eventId,
        parsedBody.csv,
        req.user
      );

      return res.status(200).json(createSuccessEnvelope(preview));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * POST /events/:eventId/imports/commit
   * Atomically commit a validated CSV file with idempotency.
   */
  router.post('/commit', async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const rawKey = req.headers['idempotency-key'];

      if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Header Idempotency-Key is required for import commit',
          status: 400,
        });
      }

      const idempotencyKey = idempotencyKeySchema.parse(rawKey);
      const parsedBody = csvPayloadSchema.parse(req.body);

      const result = await ImportsService.commitImport(
        eventId,
        parsedBody.csv,
        idempotencyKey,
        req.user,
        { requestId: req.id }
      );

      return res.status(201).json(createSuccessEnvelope(result));
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /events/:eventId/imports/template
   * Download a sample CSV template with UTF-8 BOM.
   */
  router.get('/template', (req, res) => {
    const lang = req.query.lang === 'en' ? 'en' : 'ar';
    const csvContent = ImportsService.getTemplate(lang);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="halaa-guest-template-${lang}.csv"`
    );
    return res.status(200).send(csvContent);
  });

  return router;
}
