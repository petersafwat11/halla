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
  if (req.query.districtIds) filters.districtIds = req.query.districtIds;
  if (req.query.minPrice) filters.minPrice = req.query.minPrice;
  if (req.query.maxPrice) filters.maxPrice = req.query.maxPrice;
  if (req.query.minRating) filters.minRating = req.query.minRating;

  const result = await vendorsService.getPublicVendors(filters, { page, limit });
  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get vendor categories
 * GET /api/v2/vendors/categories
 */
exports.getCategories = catchAsync(async (req, res) => {
  const result = await vendorsService.getCategories();
  sendSuccess(res, result);
});
