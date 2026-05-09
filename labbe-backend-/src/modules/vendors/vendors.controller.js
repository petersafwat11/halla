/**
 * Vendors Controller
 * HTTP request handling for public vendor marketplace
 * @module modules/vendors/vendors.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const vendorsService = require('./vendors.service');

/**
 * Get vendor categories
 * GET /api/v2/vendors/categories
 */
exports.getCategories = catchAsync(async (req, res) => {
  const result = await vendorsService.getCategories();
  sendSuccess(res, result);
});
