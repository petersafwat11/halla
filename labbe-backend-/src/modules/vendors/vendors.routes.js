/**
 * Vendors Routes
 * Route definitions for public vendor marketplace
 * @module modules/vendors/vendors.routes
 */

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Public vendor marketplace endpoints
 */

const express = require('express');
const router = express.Router();

const vendorsController = require('./vendors.controller');
const { validateObjectId } = require('../../shared/middleware/validation');

// All routes are public (no auth required)

/**
 * @swagger
 * /vendors/categories:
 *   get:
 *     summary: Get vendor categories
 *     description: Retrieve all available vendor categories
 *     tags: [Vendors]
 *     security: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', vendorsController.getCategories);

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve approved vendors with pagination and filtering
 *     tags: [Vendors]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by vendor name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by vendor category
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
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
 *                     vendors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vendor'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', vendorsController.getVendors);

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve detailed information about a specific vendor
 *     tags: [Vendors]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), vendorsController.getVendorById);

module.exports = router;
