/**
 * Discounts Service
 * Business logic for discount / coupon code management
 * @module modules/discounts/discounts.service
 */

const Discount = require('../../../models/DiscountModel');
const { NotFoundError, ConflictError } = require('../../shared/errors');

class DiscountsService {
  // ============================================
  // ADMIN CRUD
  // ============================================

  async getAll(filters = {}) {
    const { page = 1, limit = 20, search, isActive } = filters;
    const query = {};

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

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [total, discounts] = await Promise.all([
      Discount.countDocuments(query),
      Discount.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return {
      discounts: discounts.map(this._format),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    };
  }

  async getById(id) {
    const discount = await Discount.findById(id)
      .populate('createdBy', 'name email')
      .lean();
    if (!discount) throw new NotFoundError('Discount');
    return { discount: this._format(discount) };
  }

  async create(data, createdBy) {
    try {
      const discount = await Discount.create({
        code: data.code,
        descriptionEn: data.descriptionEn || '',
        descriptionAr: data.descriptionAr || '',
        discountType: data.discountType,
        value: data.value,
        maxUses: data.maxUses || 0,
        validFrom: data.validFrom || new Date(),
        validUntil: data.validUntil || null,
        isActive: typeof data.isActive === 'undefined' ? true : data.isActive,
        applicablePlanTypes: data.applicablePlanTypes || [],
        minimumAmount: data.minimumAmount || 0,
        createdBy,
      });

      return { discount: this._format(discount.toObject()) };
    } catch (err) {
      if (err && err.code === 11000) {
        throw new ConflictError(`Discount code "${data.code}" already exists`);
      }
      throw err;
    }
  }

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

    const discount = await Discount.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name email')
      .lean();

    if (!discount) throw new NotFoundError('Discount');
    return { discount: this._format(discount) };
  }

  async delete(id) {
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) throw new NotFoundError('Discount');
    return { message: 'Discount deleted successfully' };
  }

  async toggleStatus(id) {
    // Why: pipeline-form $set with $not flips isActive in a single round-trip
    // — no read-modify-write race. Populated + .lean() so the response shape
    // matches every other admin endpoint.
    const discount = await Discount.findByIdAndUpdate(
      id,
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true }
    )
      .populate('createdBy', 'name email')
      .lean();

    if (!discount) throw new NotFoundError('Discount');
    return { discount: this._format(discount) };
  }

  // ============================================
  // PUBLIC VALIDATION (used by summary page)
  // ============================================

  async validate(code, amount, planType = null) {
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    // Why: collapse "doesn't exist", "inactive", "expired", and "exhausted"
    // into a single message. Distinguishing them leaks the keyspace to anyone
    // with a valid auth token (the endpoint is rate-limited but still
    // brute-forceable). minimumAmount and applicablePlanTypes are surfaced
    // explicitly because they help legit users and only fire after the code
    // is already known-valid.
    if (!discount || !discount.isValid().valid) {
      return { valid: false, reason: 'Discount code is invalid or expired' };
    }

    if (discount.minimumAmount > 0 && amount < discount.minimumAmount) {
      return {
        valid: false,
        reason: `Minimum order amount is ${discount.minimumAmount} SAR`,
      };
    }

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

  async applyDiscount(code) {
    // Why: single atomic findOneAndUpdate with the maxUses guard expression.
    // Two-trip read-then-inc could let usedCount exceed maxUses under
    // concurrent payments. The match expression accepts maxUses === 0
    // (unlimited) or usedCount < maxUses; otherwise nothing is updated.
    await Discount.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        $or: [
          { maxUses: 0 },
          { $expr: { $lt: ['$usedCount', '$maxUses'] } },
        ],
      },
      { $inc: { usedCount: 1 } }
    );
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
      createdBy: discount.createdBy,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
    };
  }
}

module.exports = new DiscountsService();
