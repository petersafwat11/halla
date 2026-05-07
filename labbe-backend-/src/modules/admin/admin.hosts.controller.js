/**
 * Admin Hosts Controller
 * HTTP handlers for admin host-management endpoints
 */

const crypto = require('crypto');
const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { ValidationError } = require('../../shared/errors');
const { generateExcel } = require('../../shared/utils/excelExport');
const { getWhitelabelIdFromFilter } = require('./admin.controller.shared');

exports.getHosts = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getHosts({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Hosts retrieved successfully');
});

exports.getHostById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const host = await adminService.getHostById(id, whitelabelId);
  sendSuccess(res, { host }, 'Host retrieved successfully');
});

exports.createHost = catchAsync(async (req, res) => {
  const { email, phoneNumber, name, username, password } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const host = await adminService.createHost({
    email, phoneNumber, name, username,
    password: password || crypto.randomBytes(16).toString('hex'),
    whitelabelId,
  });

  sendSuccess(res, { host }, 'Host created successfully', 201);
});

exports.updateHostStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const host = await adminService.updateHostStatus(id, status, whitelabelId);
  sendSuccess(res, { host }, 'Host status updated successfully');
});

exports.updateHostSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planCode, status, billingCycle } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.updateHostSubscription(id, { planCode, status, billingCycle }, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.deleteHost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.deleteHost(id, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteHosts = catchAsync(async (req, res) => {
  const { ids } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.bulkDeleteHosts(ids, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.verifyHostByPhone = catchAsync(async (req, res) => {
  const { phoneNumber } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!phoneNumber) throw new ValidationError('Phone number is required');

  const result = await adminService.verifyHostByPhone(phoneNumber, whitelabelId);
  sendSuccess(res, result, 'Phone verification completed');
});

exports.findOrCreateHost = catchAsync(async (req, res) => {
  const { phoneNumber, name, email } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.findOrCreateHost({ phoneNumber, name, email, whitelabelId });
  const message = result.created ? 'Host created successfully' : 'Host found';
  sendSuccess(res, result, message, result.created ? 201 : 200);
});

exports.exportHosts = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportHosts(whitelabelId, { search, status, from, to });
  const buffer = generateExcel(data, 'hosts');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hosts.xlsx');
  res.send(buffer);
});
