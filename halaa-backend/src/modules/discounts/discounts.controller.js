/**
 * Discounts Controller
 * HTTP layer for discount/coupon management
 * @module modules/discounts/discounts.controller
 */

const discountsService = require('./discounts.service');
const catchAsync = require('../../shared/utils/catchAsync');
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendDeleted,
} = require('../../shared/utils/responseHelper');

class DiscountsController {
  getAll = catchAsync(async (req, res) => {
    const { page, limit, search, isActive } = req.query;
    const result = await discountsService.getAll({ page, limit, search, isActive });
    res.status(200).json({
      success: true,
      status: 'success',
      data: result.discounts,
      pagination: result.pagination,
      stats: result.stats,
    });
  });

  getById = catchAsync(async (req, res) => {
    const result = await discountsService.getById(req.params.id);
    sendSuccess(res, result.discount);
  });

  create = catchAsync(async (req, res) => {
    const result = await discountsService.create(req.body, req.user._id);
    res.locals = res.locals || {};
    res.locals.discountAudit = { id: result.discount.id };
    sendCreated(res, result.discount, 'Discount created successfully');
  });

  update = catchAsync(async (req, res) => {
    const result = await discountsService.update(req.params.id, req.body);
    sendSuccess(res, result.discount, 'Discount updated successfully');
  });

  delete = catchAsync(async (req, res) => {
    await discountsService.delete(req.params.id);
    sendDeleted(res, 'Discount deleted successfully');
  });

  toggleStatus = catchAsync(async (req, res) => {
    const result = await discountsService.toggleStatus(req.params.id);
    res.locals = res.locals || {};
    res.locals.discountAudit = { isActive: result.discount.isActive };
    sendSuccess(res, result.discount);
  });

  validate = catchAsync(async (req, res) => {
    const { code, amount, planType } = req.body;
    const result = await discountsService.validate(code, amount, planType || null);
    sendSuccess(res, result);
  });
}

module.exports = new DiscountsController();
