/**
 * Locations Controller
 * HTTP request handling for Saudi Arabia locations
 * @module modules/locations/locations.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const locationsService = require('./locations.service');

/**
 * Get all regions
 * GET /api/v2/locations/regions
 */
exports.getRegions = catchAsync(async (req, res) => {
  const result = await locationsService.getRegions();
  sendSuccess(res, result);
});

/**
 * Get cities by region
 * GET /api/v2/locations/cities/:regionId
 */
exports.getCitiesByRegion = catchAsync(async (req, res) => {
  const result = await locationsService.getCitiesByRegion(req.params.regionId);
  sendSuccess(res, result);
});

/**
 * Get districts by city
 * GET /api/v2/locations/districts/:cityId
 */
exports.getDistrictsByCity = catchAsync(async (req, res) => {
  const result = await locationsService.getDistrictsByCity(req.params.cityId);
  sendSuccess(res, result);
});

/**
 * Get all locations
 * GET /api/v2/locations/all
 */
exports.getAllLocations = catchAsync(async (req, res) => {
  const result = await locationsService.getAllLocations();
  sendSuccess(res, result);
});

/**
 * Search locations
 * GET /api/v2/locations/search?q=xxx
 */
exports.searchLocations = catchAsync(async (req, res) => {
  const { q } = req.query;
  const result = await locationsService.searchLocations(q || '');
  sendSuccess(res, result);
});

/**
 * Resolve location names from IDs
 * POST /api/v2/locations/resolve
 */
exports.resolveLocationNames = catchAsync(async (req, res) => {
  const result = await locationsService.resolveLocationNames(req.body);
  sendSuccess(res, result);
});
