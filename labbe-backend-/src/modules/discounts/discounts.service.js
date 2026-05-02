/**
 * Discounts Service
 * Business logic for discount / coupon code management
 * @module modules/discounts/discounts.service
 */

const Discount = require('../../../models/DiscountModel');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class DiscountsService {
  // ============================================
  // ADMIN CRUD
  // ============================================

  /**
   * Get all discount codes (admin)
   * @param {Object} filters - { page, limit, search, isActive }
   * @param {Object|null} whitelabelFilter - { whitelabelId } or null
   */
  async getAll(filters = {}, whitelabelFilter = null) {
    const { page = 1, limit = 20, search, isActive } = filters;
    const query = {};

    if (whitelabelFilter) {
      query.whitelabelId = whitelabelFilter.whitelabelId;
    }

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { descriptionEn: { $regex: escaped, $options: 'i' } },
        { descriptionAr: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Discount.countDocuments(query);
    const discounts = await Discount.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return {
      discounts: discounts.map(this._format),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get single discount by ID (admin)
   */
  async getById(id) {
    const discount = await Discount.findById(id).populate('createdBy', 'name email');
    if (!discount) throw new NotFoundError('Discount');
    return { discount: this._format(discount) };
  }

  /**
   * Create a new discount code (admin)
   */
  async create(data, createdBy) {
    const {
      code,
      descriptionEn,
      descriptionAr,
      discountType,
      value,
      maxUses,
      validFrom,
      validUntil,
      isActive,
      applicablePlanTypes,
      minimumAmount,
      whitelabelId,
    } = data;

    // Validate percentage cap
    if (discountType === 'percentage' && value > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%');
    }

    // Validate date range
    if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
      throw new ValidationError('validUntil must be after validFrom');
    }

    const existing = await Discount.findOne({ code: code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Discount code "${code.toUpperCase()}" already exists`);
    }

    const discount = await Discount.create({
      code,
      descriptionEn: descriptionEn || '',
      descriptionAr: descriptionAr || '',
      discountType,
      value,
      maxUses: maxUses || 0,
      validFrom: validFrom || new Date(),
      validUntil: validUntil || null,
      isActive: typeof isActive === 'undefined' ? true : isActive,
      applicablePlanTypes: applicablePlanTypes || [],
      minimumAmount: minimumAmount || 0,
      whitelabelId: whitelabelId || null,
      createdBy,
    });

    return { discount: this._format(discount) };
  }

  /**
   * Update a discount code (admin)
   */
  async update(id, data) {
    const allowed = [
      'descriptionEn', 'descriptionAr', 'discountType', 'value',
      'maxUses', 'validFrom', 'validUntil', 'isActive',
      'applicablePlanTypes', 'minimumAmount',
    ];

    const updateData = {};
    for (const key of allowed) {
      if (typeof data[key] !== 'undefined') {
        updateData[key] = data[key];
      }
    }

    if (updateData.discountType === 'percentage' && updateData.value > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%');
    }

    const discount = await Discount.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    if (!discount) throw new NotFoundError('Discount');
    return { discount: this._format(discount) };
  }

  /**
   * Delete a discount code (admin)
   */
  async delete(id) {
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) throw new NotFoundError('Discount');
    return { message: 'Discount deleted successfully' };
  }

  /**
   * Toggle active status (admin)
   */
  async toggleStatus(id) {
    const discount = await Discount.findById(id);
    if (!discount) throw new NotFoundError('Discount');
    discount.isActive = !discount.isActive;
    await discount.save();
    return { discount: this._format(discount) };
  }

  // ============================================
  // PUBLIC VALIDATION (used by summary page)
  // ============================================

  /**
   * Validate a discount code for a given plan amount
   * @param {string} code - The discount code
   * @param {number} amount - The plan price/amount
   * @param {string|null} planType - Plan type to check applicability
   * @param {Object|null} whitelabelFilter - Whitelabel scope
   */
  async validate(code, amount, planType = null, whitelabelFilter = null) {
    const query = { code: code.toUpperCase() };

    // Scoped to platform or whitelabel
    if (whitelabelFilter) {
      query.$or = [
        { whitelabelId: whitelabelFilter.whitelabelId },
        { whitelabelId: null },
      ];
    } else {
      query.whitelabelId = null;
    }

    const discount = await Discount.findOne(query);

    if (!discount) {
      return { valid: false, reason: 'Invalid discount code' };
    }

    const validity = discount.isValid();
    if (!validity.valid) {
      return { valid: false, reason: validity.reason };
    }

    // Check minimum amount
    if (discount.minimumAmount > 0 && amount < discount.minimumAmount) {
      return {
        valid: false,
        reason: `Minimum order amount is ${discount.minimumAmount} SAR`,
      };
    }

    // Check plan type restriction
    if (
      discount.applicablePlanTypes.length > 0 &&
      planType &&
      !discount.applicablePlanTypes.includes(planType)
    ) {
      return {
        valid: false,
        reason: 'Discount code is not applicable for this plan type',
      };
    }

    const discountAmount = discount.calculateDiscount(amount);
    const finalAmount = Math.max(0, amount - discountAmount);

    return {
      valid: true,
      code: discount.code,
      discountType: discount.discountType,
      value: discount.value,
      discountAmount,
      finalAmount,
      descriptionEn: discount.descriptionEn,
      descriptionAr: discount.descriptionAr,
    };
  }

  /**
   * Apply a discount (increment usage). Called when subscription is created.
   * @param {string} code
   */
  async applyDiscount(code) {
    const discount = await Discount.findOne({ code: code.toUpperCase() });
    if (discount) {
      await discount.incrementUsage();
    }
  }

  // ============================================
  // PRIVATE
  // ============================================

  _format(discount) {
    return {
      id: discount._id,
      code: discount.code,
      descriptionEn: discount.descriptionEn,
      descriptionAr: discount.descriptionAr,
      discountType: discount.discountType,
      value: discount.value,
      maxUses: discount.maxUses,
      usedCount: discount.usedCount,
      validFrom: discount.validFrom,
      validUntil: discount.validUntil,
      isActive: discount.isActive,
      applicablePlanTypes: discount.applicablePlanTypes,
      minimumAmount: discount.minimumAmount,
      whitelabelId: discount.whitelabelId,
      createdBy: discount.createdBy,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
    };
  }
}

module.exports = new DiscountsService();
