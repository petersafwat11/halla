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

const { validateZod } = require('../../shared/middleware/validation');
const { optionalAuth } = require('../../shared/middleware/auth');
const { getPublicVendorsQuerySchema } = require('./vendors.validation');
const vendorsController = require('./vendors.controller');

/**
 * @swagger
 * /vendors/public:
 *   get:
 *     summary: Get public vendors
 *     description: Retrieve paginated list of approved vendors with their active services
 *     tags: [Vendors]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: districtIds
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 */
router.get('/public', optionalAuth, validateZod(getPublicVendorsQuerySchema, 'query'), vendorsController.getPublicVendors);

/**
 * @swagger
 * /vendors/public/{vendorId}:
 *   get:
 *     summary: Get a public vendor profile
 *     description: Returns one approved vendor and their active public services using an allowlisted public DTO.
 *     tags: [Vendors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vendor profile retrieved successfully }
 *       404: { description: Vendor not found }
 */
router.get('/public/:vendorId', optionalAuth, vendorsController.getPublicVendor);

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VendorCategoriesResponse'
 */
router.get('/categories', vendorsController.getCategories);

module.exports = router;
