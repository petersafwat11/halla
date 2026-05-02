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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Region'
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
 *           type: string
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/cities/:regionId', locationsController.getCitiesByRegion);

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
 *           type: string
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/District'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/districts/:cityId', locationsController.getDistrictsByCity);

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
 */
router.get('/all', locationsController.getAllLocations);

/**
 * @swagger
 * /locations/search:
 *   get:
 *     summary: Search locations
 *     description: Search across regions, cities, and districts by name
 *     tags: [Locations]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/search', locationsController.searchLocations);

/**
 * @swagger
 * /locations/resolve:
 *   post:
 *     summary: Resolve location IDs to names
 *     description: Convert location IDs (region, city, district) to their display names
 *     tags: [Locations]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               regionId:
 *                 type: string
 *               cityId:
 *                 type: string
 *               districtId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location names resolved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/resolve', locationsController.resolveLocationNames);

module.exports = router;
