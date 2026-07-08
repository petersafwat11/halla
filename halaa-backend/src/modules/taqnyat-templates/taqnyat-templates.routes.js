/**
 * Routes for the Taqnyat WhatsApp template cache (host list + admin CRUD).
 * Admin sub-router is mounted at /api/v2/admin/taqnyat-templates.
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { validateObjectId } = require('../../shared/middleware/validation');
const { validateZod } = require('../../shared/middleware/validation');
const { ADMIN_PAGES } = require('../../shared/constants');

const controller = require('./taqnyat-templates.controller');
const {
  createTemplateSchema,
  assignMappingSchema,
  listForHostQuerySchema,
} = require('./taqnyat-templates.validation');

router.use(protect);

/**
 * @swagger
 * /api/v2/taqnyat-templates:
 *   get:
 *     tags: [TaqnyatTemplates]
 *     summary: List active host-facing Taqnyat templates
 *     description: Returns active + APPROVED templates the host can pick in the wizard. Filtered by `category` when provided.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
  *         description: Halaa-side category code (e.g. wedding, engagement).
 *     responses:
 *       200:
 *         description: Templates list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/TaqnyatTemplate' }
 *       401: { description: Unauthorized }
 */
router.get('/', validateZod(listForHostQuerySchema, 'query'), controller.listForHost);

const adminRouter = express.Router();
adminRouter.use(protect);

/**
 * @swagger
 * /api/v2/admin/taqnyat-templates:
 *   get:
 *     tags: [TaqnyatTemplates]
 *     summary: List every Taqnyat template (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Templates list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/TaqnyatTemplate' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
adminRouter.get('/', requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, 'view'), controller.listForAdmin);

/**
 * @swagger
 * /api/v2/admin/taqnyat-templates/sync:
 *   post:
 *     tags: [TaqnyatTemplates]
 *     summary: Pull Meta templates and refresh the local cache
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer }
 *                     orphanedCount: { type: integer }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       502: { description: Taqnyat upstream failed }
 */
adminRouter.post('/sync', requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, 'create'), controller.sync);

/**
 * @swagger
 * /api/v2/admin/taqnyat-templates:
 *   post:
 *     tags: [TaqnyatTemplates]
 *     summary: Submit a new template to Meta for approval
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaqnyatTemplateCreateRequest' }
 *     responses:
 *       200:
 *         description: Submitted; cache row created PENDING
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     template: { $ref: '#/components/schemas/TaqnyatTemplate' }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       502: { description: Taqnyat upstream failed }
 */
adminRouter.post(
  '/',
  requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, 'create'),
  validateZod(createTemplateSchema),
  controller.createUpstream
);

/**
 * @swagger
 * /api/v2/admin/taqnyat-templates/{id}:
 *   patch:
 *     tags: [TaqnyatTemplates]
 *     summary: Update admin-curated fields (category, varMapping, active, sortOrder)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaqnyatTemplateAssignRequest' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     template: { $ref: '#/components/schemas/TaqnyatTemplate' }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
adminRouter.patch(
  '/:id',
  validateObjectId('id'),
  requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, 'update'),
  validateZod(assignMappingSchema),
  controller.assignMapping
);

/**
 * @swagger
 * /api/v2/admin/taqnyat-templates/{id}:
 *   delete:
 *     tags: [TaqnyatTemplates]
 *     summary: Hard-delete a template upstream + remove the local cache row
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *       502: { description: Taqnyat upstream failed }
 */
adminRouter.delete(
  '/:id',
  validateObjectId('id'),
  requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, 'delete'),
  controller.deleteUpstream
);

module.exports = router;
module.exports.adminRouter = adminRouter;
