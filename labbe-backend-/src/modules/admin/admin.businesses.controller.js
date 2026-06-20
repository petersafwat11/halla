/**
 * Admin Businesses Controller
 * HTTP handlers for admin business-management endpoints.
 */

const crypto = require('crypto');
const businessesService = require('./admin.businesses.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { processUploadedFiles } = require('../../shared/utils/s3Upload');

exports.getBusinesses = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;
  const result = await businessesService.getBusinesses({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to,
  });
  sendSuccess(res, result, 'Businesses retrieved successfully');
});

exports.getBusinessById = catchAsync(async (req, res) => {
  const business = await businessesService.getBusinessById(req.params.id);
  sendSuccess(res, { business }, 'Business retrieved successfully');
});

exports.createBusiness = catchAsync(async (req, res) => {
  const { name, email, phoneNumber, password, description } = req.body;
  const uploaded = processUploadedFiles(req.files);
  const business = await businessesService.createBusiness({
    name,
    email,
    phoneNumber,
    password: password || crypto.randomBytes(12).toString('hex'),
    description,
    logoKey: uploaded.logo || null,
  });
  sendSuccess(res, { business }, 'Business created successfully', 201);
});

exports.updateBusiness = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  const business = await businessesService.updateBusiness(req.params.id, { name, description });
  sendSuccess(res, { business }, 'Business updated successfully');
});

exports.updateBusinessLogo = catchAsync(async (req, res) => {
  const uploaded = processUploadedFiles(req.files);
  const result = await businessesService.updateBusinessLogo(req.params.id, uploaded.logo);
  sendSuccess(res, result, 'Logo updated successfully');
});

exports.assignPlan = catchAsync(async (req, res) => {
  const { mode, planCode, discountCode, grantReason } = req.body;
  const result = await businessesService.assignPlan(
    req.params.id,
    { mode, planCode, discountCode, grantReason },
    req.user._id
  );
  sendSuccess(res, result, 'Plan assignment processed');
});

exports.revokeAssignment = catchAsync(async (req, res) => {
  const result = await businessesService.revokeAssignment(req.params.assignmentId, req.user._id);
  sendSuccess(res, { assignment: result }, 'Checkout link revoked');
});

exports.regenerateAssignment = catchAsync(async (req, res) => {
  const result = await businessesService.regenerateAssignment(req.params.assignmentId, req.user._id);
  sendSuccess(res, result, 'Checkout link regenerated');
});

exports.suspendBusiness = catchAsync(async (req, res) => {
  const business = await businessesService.suspendBusiness(req.params.id, req.user._id);
  sendSuccess(res, { business }, 'Business suspended');
});

exports.activateBusiness = catchAsync(async (req, res) => {
  const business = await businessesService.activateBusiness(req.params.id);
  sendSuccess(res, { business }, 'Business activated');
});

exports.deleteBusiness = catchAsync(async (req, res) => {
  const result = await businessesService.deleteBusiness(req.params.id, req.user._id);
  sendSuccess(res, result, result.message);
});
