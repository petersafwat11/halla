/**
 * Admin Payments Controller
 * HTTP handlers for admin payment-management endpoints
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { generateExcel } = require('../../shared/utils/excelExport');
const { getWhitelabelIdFromFilter } = require('./admin.controller.shared');

exports.getPayments = catchAsync(async (req, res) => {
  const { page, limit, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getPayments({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Payments retrieved successfully');
});

exports.getPaymentSummary = catchAsync(async (req, res) => {
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const summary = await adminService.getPaymentSummary({ whitelabelId });
  sendSuccess(res, summary, 'Payment summary retrieved successfully');
});

exports.getPaymentDetail = catchAsync(async (req, res, next) => {
  const { AppError } = require('../../shared/errors');
  const detail = await adminService.getPaymentDetail(req.params.id);
  // Enforce whitelabel scope here: WHITELABEL_ADMIN has PAYMENTS:FULL on their
  // own org, so route-level RBAC alone would allow reading any payment by id-guess.
  const wlFilter = getWhitelabelIdFromFilter(req);
  if (
    wlFilter !== undefined &&
    String(detail?.whitelabelId || '') !== String(wlFilter || '')
  ) {
    return next(new AppError('Payment not found', 404));
  }
  sendSuccess(res, detail, 'Payment retrieved successfully');
});

exports.exportPayments = catchAsync(async (req, res) => {
  const { status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportPayments(whitelabelId, { status, from, to });
  const buffer = generateExcel(data, 'payments');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
  res.send(buffer);
});
