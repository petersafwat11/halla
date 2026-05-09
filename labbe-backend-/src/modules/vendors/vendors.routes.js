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
