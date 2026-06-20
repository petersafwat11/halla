/**
 * Admin Vendors Controller
 * HTTP handlers for admin vendor-management endpoints
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { generateExcel } = require('../../shared/utils/excelExport');

exports.getVendors = catchAsync(async (req, res) => {
  const { page, limit, search, status, category, from, to } = req.query;

  const result = await adminService.getVendors({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, category, from, to,
  });

  sendSuccess(res, result, 'Vendors retrieved successfully');
});

exports.getVendorById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const vendor = await adminService.getVendorById(id);
  sendSuccess(res, { vendor }, 'Vendor retrieved successfully');
});

exports.updateVendorStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const vendor = await adminService.updateVendorStatus(id, status, req.user?._id);
  sendSuccess(res, { vendor }, 'Vendor status updated successfully');
});

exports.updateVendorRating = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const result = await adminService.updateVendorRating(id, rating, comment);
  sendSuccess(res, result, 'Vendor rating updated successfully');
});

exports.deleteVendor = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteVendor(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteVendors = catchAsync(async (req, res) => {
  const { ids } = req.body;

  const result = await adminService.bulkDeleteVendors(ids);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateVendorStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body;

  const result = await adminService.bulkUpdateVendorStatus(ids, status);
  sendSuccess(res, result, result.message);
});

exports.exportVendors = catchAsync(async (req, res) => {
  const { search, status, category, from, to } = req.query;
  const data = await adminService.exportVendors({ search, status, category, from, to });
  const buffer = generateExcel(data, 'vendors');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=vendors.xlsx');
  res.send(buffer);
});
