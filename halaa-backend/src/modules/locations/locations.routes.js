/**
 * Locations Routes
 * Route definitions for Saudi Arabia locations
 * @module modules/locations/locations.routes
 */

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Saudi Arabia location lookup endpoints
 */

const express = require('express');
const router = express.Router();

const locationsController = require('./locations.controller');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');
const { validateZod } = require('../../shared/middleware/validation');
const { regionIdParam, cityIdParam, searchQuery } = require('./locations.validation');

// All routes are public (no auth required)

/**
 * @swagger
 * /locations/regions:
 *   get:
 *     summary: Get all regions
 *     description: Retrieve all Saudi Arabia regions
 *     tags: [Locations]
 *     security: []
 *     responses:
 *       200:
 *         description: Regions retrieved successfully
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
 *                     regions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Region'
 */
router.get('/regions', locationsController.getRegions);

/**
 * @swagger
 * /locations/cities/{regionId}:
 *   get:
 *     summary: Get cities by region
 *     description: Retrieve all cities within a specific region
 *     tags: [Locations]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: regionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Region ID
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                     cities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/City'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/cities/:regionId', validateZod(regionIdParam, 'params'), locationsController.getCitiesByRegion);

/**
 * @swagger
 * /locations/districts/{cityId}:
 *   get:
 *     summary: Get districts by city
 *     description: Retrieve all districts within a specific city
 *     tags: [Locations]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: City ID
 *     responses:
 *       200:
 *         description: Districts retrieved successfully
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
 *                     districts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/District'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/districts/:cityId', validateZod(cityIdParam, 'params'), locationsController.getDistrictsByCity);

/**
 * @swagger
 * /locations/all:
 *   get:
 *     summary: Get all location data
 *     description: Retrieve all locations in a nested structure (regions > cities > districts)
 *     tags: [Locations]
 *     security: []
 *     responses:
 *       200:
 *         description: All locations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationsAllResponse'
 */
router.get('/all', apiLimiter, locationsController.getAllLocations);

/**
 * @swagger
 * /locations/search:
 *   get:
 *     summary: Search locations
 *     description: Search across regions, cities, and districts by name (minimum 2 characters)
 *     tags: [Locations]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query string (min 2 chars)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationsSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/search', apiLimiter, validateZod(searchQuery, 'query'), locationsController.searchLocations);

module.exports = router;
