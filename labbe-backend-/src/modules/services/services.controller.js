/**
 * Services Controller
 * HTTP request handling for vendor services
 * @module modules/services/services.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated, sendPaginated, sendDeleted } = require('../../shared/utils/responseHelper');
const servicesService = require('./services.service');

/**
 * Get public services
 * GET /api/v2/services/public
 */
exports.getPublicServices = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

  const result = await servicesService.getPublicServices(filters, options);

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get my services (vendor)
 * GET /api/v2/services
 */
exports.getMyServices = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

  const result = await servicesService.getMyServices(req.user._id, options);

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get my stats (vendor)
 * GET /api/v2/services/stats
 */
exports.getMyStats = catchAsync(async (req, res) => {
  const result = await servicesService.getMyStats(req.user._id);
  sendSuccess(res, result);
});

/**
 * Get service by ID
 * GET /api/v2/services/:id
 */
exports.getService = catchAsync(async (req, res) => {
  const result = await servicesService.getServiceById(req.params.id, req.user._id);
  sendSuccess(res, result);
});

/**
 * Create service
 * POST /api/v2/services
 */
exports.createService = catchAsync(async (req, res) => {
  const result = await servicesService.createService(req.user._id, req.body, req.file);
  sendCreated(res, result, 'Service created successfully');
});

/**
 * Update service
 * PATCH /api/v2/services/:id
 */
exports.updateService = catchAsync(async (req, res) => {
  const result = await servicesService.updateService(
    req.params.id,
    req.user._id,
    req.body,
    req.file
  );
  sendSuccess(res, result, 'Service updated successfully');
});

/**
 * Toggle service status
 * PATCH /api/v2/services/:id/toggle-status
 */
exports.toggleServiceStatus = catchAsync(async (req, res) => {
  const result = await servicesService.toggleServiceStatus(req.params.id, req.user._id);
  sendSuccess(res, result, 'Service status updated');
});

/**
 * Delete service
 * DELETE /api/v2/services/:id
 */
exports.deleteService = catchAsync(async (req, res) => {
  await servicesService.deleteService(req.params.id, req.user._id);
  sendDeleted(res, 'Service deleted');
});
