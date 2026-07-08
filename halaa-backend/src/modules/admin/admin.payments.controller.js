/**
 * Admin Payments Controller
 * HTTP handlers for admin payment-management endpoints
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { generateExcel } = require('../../shared/utils/excelExport');

exports.getPayments = catchAsync(async (req, res) => {
  const { page, limit, status, search, from, to } = req.query;

  const result = await adminService.getPayments({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status, search, from, to,
  });

  sendSuccess(res, result, 'Payments retrieved successfully');
});

exports.getPaymentSummary = catchAsync(async (req, res) => {
  const summary = await adminService.getPaymentSummary();
  sendSuccess(res, summary, 'Payment summary retrieved successfully');
});

exports.getPaymentDetail = catchAsync(async (req, res) => {
  const detail = await adminService.getPaymentDetail(req.params.id);
  sendSuccess(res, detail, 'Payment retrieved successfully');
});

exports.exportPayments = catchAsync(async (req, res) => {
  const { status, search, from, to } = req.query;
  const data = await adminService.exportPayments({ status, search, from, to });
  const buffer = generateExcel(data, 'payments');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
  res.send(buffer);
});
