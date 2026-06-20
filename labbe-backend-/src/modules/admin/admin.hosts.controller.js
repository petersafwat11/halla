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

exports.getHosts = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;

  const result = await adminService.getHosts({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to,
  });

  sendSuccess(res, result, 'Hosts retrieved successfully');
});

exports.getHostById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const host = await adminService.getHostById(id);
  sendSuccess(res, { host }, 'Host retrieved successfully');
});

exports.createHost = catchAsync(async (req, res) => {
  const { email, phoneNumber, name, username, password } = req.body;

  const host = await adminService.createHost({
    email, phoneNumber, name, username,
    password: password || crypto.randomBytes(16).toString('hex'),
  });

  sendSuccess(res, { host }, 'Host created successfully', 201);
});

exports.updateHostStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const host = await adminService.updateHostStatus(id, status);
  sendSuccess(res, { host }, 'Host status updated successfully');
});

exports.updateHostSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planCode, status } = req.body;

  const result = await adminService.updateHostSubscription(id, { planCode, status });
  sendSuccess(res, result, result.message);
});

exports.deleteHost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteHost(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteHosts = catchAsync(async (req, res) => {
  const { ids } = req.body;

  const result = await adminService.bulkDeleteHosts(ids);
  sendSuccess(res, result, result.message);
});

exports.verifyHostByPhone = catchAsync(async (req, res) => {
  const { phoneNumber } = req.query;

  if (!phoneNumber) throw new ValidationError('Phone number is required');

  const result = await adminService.verifyHostByPhone(phoneNumber);
  sendSuccess(res, result, 'Phone verification completed');
});

exports.findOrCreateHost = catchAsync(async (req, res) => {
  const { phoneNumber, name, email } = req.body;

  const result = await adminService.findOrCreateHost({ phoneNumber, name, email });
  const message = result.created ? 'Host created successfully' : 'Host found';
  sendSuccess(res, result, message, result.created ? 201 : 200);
});

exports.exportHosts = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const data = await adminService.exportHosts({ search, status, from, to });
  const buffer = generateExcel(data, 'hosts');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hosts.xlsx');
  res.send(buffer);
});
