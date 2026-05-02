/**
 * Vendors Controller
 * HTTP request handling for public vendor marketplace
 * @module modules/vendors/vendors.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendPaginated } = require('../../shared/utils/responseHelper');
const vendorsService = require('./vendors.service');

/**
 * Get approved vendors (public marketplace)
 * GET /api/v2/vendors
 */
exports.getVendors = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

  const result = await vendorsService.getApprovedVendors(filters, options);

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get vendor by ID
 * GET /api/v2/vendors/:id
 */
exports.getVendorById = catchAsync(async (req, res) => {
  const result = await vendorsService.getVendorById(req.params.id);
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
