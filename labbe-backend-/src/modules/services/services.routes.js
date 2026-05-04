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
const { validateObjectId } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');

// Use centralized S3 upload utility
const { uploadServiceImage } = require('../../shared/utils/s3Upload');

/**
 * @swagger
 * /services/public:
 *   get:
 *     summary: Get public services
 *     description: Get paginated list of publicly available services
 *     tags: [Services]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Service'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
// Public routes
router.get('/public', servicesController.getPublicServices);

// FLOW-25-F04: Authenticated routes (any logged-in user — host contacts vendor)
router.post('/:id/inquire', protect, validateObjectId('id'), servicesController.recordInquiry);
router.post('/:id/book', protect, validateObjectId('id'), servicesController.recordBooking);

// Protected routes (vendor only)
router.use(protect);
router.use(restrictTo(ROLES.VENDOR));

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get my services
 *     description: Get list of services for the current vendor
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
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', servicesController.getMyServices);
/**
 * @swagger
 * /services/stats:
 *   get:
 *     summary: Get my service stats
 *     description: Get statistics for the current vendor's services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service stats retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats', servicesController.getMyStats);
/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: Get detailed information about a specific service
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
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), servicesController.getService);
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
 *             required: [name, description, category, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
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
router.post('/', uploadServiceImage, servicesController.createService);
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
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
router.patch('/:id', validateObjectId('id'), uploadServiceImage, servicesController.updateService);
/**
 * @swagger
 * /services/{id}/toggle-status:
 *   patch:
 *     summary: Toggle service status
 *     description: Toggle a service between active and inactive
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
