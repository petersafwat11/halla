/**
 * Vendors Controller
 * HTTP request handling for public vendor marketplace
 * @module modules/vendors/vendors.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendPaginated, getPaginationFromQuery } = require('../../shared/utils/responseHelper');
const vendorsService = require('./vendors.service');

/**
 * Get public vendors
 * GET /api/v2/vendors/public
 */
exports.getPublicVendors = catchAsync(async (req, res) => {
  const { page, limit } = getPaginationFromQuery(req.query);

  const filters = {};
  if (req.query.search) filters.search = req.query.search;
  if (req.query.category) filters.category = req.query.category;
  if (req.query.regionId) filters.regionId = req.query.regionId;
  if (req.query.cityId) filters.cityId = req.query.cityId;
  if (req.query.districtId) filters.districtId = req.query.districtId;
  if (req.query.minPrice !== undefined) filters.minPrice = req.query.minPrice;
  if (req.query.maxPrice !== undefined) filters.maxPrice = req.query.maxPrice;
  if (req.query.rating !== undefined) filters.rating = req.query.rating;

  const language = req.query.lang || req.headers['accept-language'];
  const result = await vendorsService.getPublicVendors(filters, { page, limit, language });
  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get one approved public vendor and their active public services.
 * GET /api/v2/vendors/public/:vendorId
 */
exports.getPublicVendor = catchAsync(async (req, res) => {
  const language = req.query.lang || req.headers['accept-language'];
  const result = await vendorsService.getPublicVendorById(req.params.vendorId, { language });
  sendSuccess(res, result);
});

/**
 * Get vendor categories
 * GET /api/v2/vendors/categories
 */
exports.getCategories = catchAsync(async (req, res) => {
  const result = await vendorsService.getCategories();
  sendSuccess(res, result);
});
