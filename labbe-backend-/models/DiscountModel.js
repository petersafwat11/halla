/**
 * Discount / Coupon Code Model
 * Manages promotional discount codes for plan subscriptions
 */

const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Discount code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,30}$/, 'Code must be 3-30 alphanumeric chars, dashes, or underscores'],
    },
    descriptionEn: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Discount type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Value must be non-negative'],
    },
    // 0 = unlimited
    maxUses: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, default: Date.now },
    // null = no expiry
    validUntil: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    // empty array = applies to all plan types
    applicablePlanTypes: [{ type: String }],
    // minimum plan price to apply discount (0 = no minimum)
    minimumAmount: { type: Number, default: 0, min: 0 },
    // null = platform-wide; set to whitelabel ObjectId to restrict to one tenant
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes (code is already indexed via unique:true in schema)
discountSchema.index({ isActive: 1 });
discountSchema.index({ validUntil: 1 });
discountSchema.index({ whitelabelId: 1 });

/**
 * Check if discount is currently valid (not expired, not exhausted)
 * @returns {{ valid: boolean, reason: string }}
 */
discountSchema.methods.isValid = function () {
  if (!this.isActive) {
    return { valid: false, reason: 'Discount code is inactive' };
  }
  const now = new Date();
  if (this.validFrom && now < this.validFrom) {
    return { valid: false, reason: 'Discount code is not yet active' };
  }
  if (this.validUntil && now > this.validUntil) {
    return { valid: false, reason: 'Discount code has expired' };
  }
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) {
    return { valid: false, reason: 'Discount code usage limit reached' };
  }
  return { valid: true, reason: '' };
};

/**
 * Calculate discount amount for a given price
 * @param {number} price
 * @returns {number} discount amount (not the final price)
 */
discountSchema.methods.calculateDiscount = function (price) {
  if (this.discountType === 'percentage') {
    const pct = Math.min(this.value, 100);
    return Math.floor(price * (pct / 100));
  }
  // fixed
  return Math.min(this.value, price);
};

/**
 * Increment usage count atomically
 */
discountSchema.methods.incrementUsage = async function () {
  await this.constructor.findByIdAndUpdate(this._id, { $inc: { usedCount: 1 } });
};

module.exports = mongoose.model('Discount', discountSchema);
