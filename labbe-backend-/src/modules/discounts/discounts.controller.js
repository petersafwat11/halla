/**
 * Discounts Controller
 * HTTP layer for discount/coupon management
 * @module modules/discounts/discounts.controller
 */

const discountsService = require('./discounts.service');
const catchAsync = require('../../shared/utils/catchAsync');

class DiscountsController {
  /**
   * GET /discounts/admin
   * List all discount codes (admin)
   */
  getAll = catchAsync(async (req, res) => {
    const { page, limit, search, isActive } = req.query;
    const result = await discountsService.getAll(
      { page, limit, search, isActive },
      req.whitelabelFilter || null
    );
    res.status(200).json({ status: 'success', ...result });
  });

  /**
   * GET /discounts/admin/:id
   * Get single discount by ID (admin)
   */
  getById = catchAsync(async (req, res) => {
    const result = await discountsService.getById(req.params.id);
    res.status(200).json({ status: 'success', ...result });
  });

  /**
   * POST /discounts/admin
   * Create a new discount code (admin)
   */
  create = catchAsync(async (req, res) => {
    const result = await discountsService.create(req.body, req.user._id);
    res.status(201).json({ status: 'success', ...result });
  });

  /**
   * PATCH /discounts/admin/:id
   * Update a discount code (admin)
   */
  update = catchAsync(async (req, res) => {
    const result = await discountsService.update(req.params.id, req.body);
    res.status(200).json({ status: 'success', ...result });
  });

  /**
   * DELETE /discounts/admin/:id
   * Delete a discount code (admin)
   */
  delete = catchAsync(async (req, res) => {
    const result = await discountsService.delete(req.params.id);
    res.status(200).json({ status: 'success', ...result });
  });

  /**
   * PATCH /discounts/admin/:id/toggle
   * Toggle active status (admin)
   */
  toggleStatus = catchAsync(async (req, res) => {
    const result = await discountsService.toggleStatus(req.params.id);
    res.status(200).json({ status: 'success', ...result });
  });

  /**
   * POST /discounts/validate
   * Validate a discount code for a plan (authenticated users)
   */
  validate = catchAsync(async (req, res) => {
    const { code, amount, planType } = req.body;

    if (!code) {
      return res.status(400).json({
        status: 'fail',
        message: 'Discount code is required',
      });
    }
    if (typeof amount === 'undefined' || amount === null) {
      return res.status(400).json({
        status: 'fail',
        message: 'Amount is required',
      });
    }

    const result = await discountsService.validate(
      code,
      parseFloat(amount),
      planType || null,
      req.whitelabelFilter || null
    );

    res.status(200).json({ status: 'success', data: result });
  });
}

module.exports = new DiscountsController();
