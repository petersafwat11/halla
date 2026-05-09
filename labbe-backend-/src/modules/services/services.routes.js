/**
 * Services Routes
 * Route definitions for vendor services
 * @module modules/services/services.routes
 */

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Vendor service management endpoints
 */

const express = require('express');
const router = express.Router();

const servicesController = require('./services.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const {
  validateObjectId,
  validateZod,
  parseFormDataJsonFields,
} = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');
const {
  createServiceSchema,
  updateServiceSchema,
  getPublicServicesQuerySchema,
} = require('./services.validation');

const { uploadServiceImage } = require('../../shared/utils/s3Upload');

/**
 * @swagger
 * /services/public:
 *   get:
 *     summary: Get public services
 *     description: Paginated list of marketplace services from approved vendors. Globally cross-tenant.
 *     tags: [Services]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *       - in: query
 *         name: regionId
 *         schema: { type: integer }
 *       - in: query
 *         name: cityId
 *         schema: { type: integer }
 *       - in: query
 *         name: districtIds
 *         description: Comma-separated district ids
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: minRating
 *         schema: { type: number, minimum: 0, maximum: 5 }
 *     responses:
 *       200:
 *         description: Public services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Service' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get(
  '/public',
  validateZod(getPublicServicesQuerySchema, 'query'),
  servicesController.getPublicServices
);

/**
 * @swagger
 * /services/stats:
 *   get:
 *     summary: Get my service stats
 *     description: Aggregated stats for the current vendor's services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalServices: { type: integer }
 *                         activeServices: { type: integer }
 *                         totalViews: { type: integer }
 *                         avgRating: { type: number }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/stats',
  protect,
  restrictTo(ROLES.VENDOR),
  servicesController.getMyStats
);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: Vendors get their own service; non-vendor authenticated users get a public+active service and trigger a best-effort view-count increment.
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     service: { $ref: '#/components/schemas/Service' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', protect, validateObjectId('id'), servicesController.getService);

// Protected routes (vendor only)
router.use(protect);
router.use(restrictTo(ROLES.VENDOR));

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get my services
 *     description: List services for the current vendor
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Service' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', servicesController.getMyServices);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create service
 *     description: Create a new vendor service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, category, price]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               descriptionAr: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               currency: { type: string }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               serviceLocation:
 *                 type: object
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/',
  uploadServiceImage,
  parseFormDataJsonFields(['tags', 'serviceLocation']),
  validateZod(createServiceSchema),
  servicesController.createService
);

/**
 * @swagger
 * /services/{id}:
 *   patch:
 *     summary: Update service
 *     description: Update an existing vendor service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               descriptionAr: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               currency: { type: string }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               serviceLocation:
 *                 type: object
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  validateObjectId('id'),
  uploadServiceImage,
  parseFormDataJsonFields(['tags', 'serviceLocation']),
  validateZod(updateServiceSchema),
  servicesController.updateService
);

/**
 * @swagger
 * /services/{id}/toggle-status:
 *   patch:
 *     summary: Toggle service status
 *     description: Toggle a service between active and disabled
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Service status toggled successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/toggle-status', validateObjectId('id'), servicesController.toggleServiceStatus);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Delete service
 *     description: Delete a vendor service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', validateObjectId('id'), servicesController.deleteService);

module.exports = router;
