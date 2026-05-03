/**
 * Plan Model
 * Static configuration for subscription plans
 * Supports: Trial, Single Event (hosts), Lite (hosts), Pro/Elite (whitelabel)
 */

const mongoose = require("mongoose");
const { PLAN_TYPES, PLAN_AVAILABILITY, PLAN_FAMILIES, BILLING_TYPES, isPerEventPlan, isPoolPlan, isManagedPlan } = require('../src/shared/constants/plans');

// ============================================
// FEATURES SCHEMA
// ============================================
const featuresSchema = new mongoose.Schema(
  {
    // Core Invitation Features (from باقات كرت)
    hasInAppInvites: { type: Boolean, default: true }, // إرسال الدعوات من خلال التطبيق
    hasWhatsAppInvites: { type: Boolean, default: true }, // وصول الدعوات على الواتساب
    hasSMSInvites: { type: Boolean, default: true }, // وصول الدعوات على الرسائل النصية

    // Entry & Scanning Features
    hasQRCode: { type: Boolean, default: true }, // رمز QR للدخول
    hasQRScanning: { type: Boolean, default: true }, // إمكانية تصوير الدخول ورفع الاسم و الرقم
    hasFlexibleEntryMode: { type: Boolean, default: true }, // إمكانية تغيير اللود الدخول على التطبيق دون جهاز خاص

    // Staff & Management Features
    hasStaffCheckIn: { type: Boolean, default: true }, // إدارة الموظفين
    hasStaffAssignment: { type: Boolean, default: true }, // إمكانية تعيين فريق العمل

    // Communication Features
    hasRSVPTracking: { type: Boolean, default: true }, // استقبال رسائل المدعوين - حضور أو لن يحضر
    hasAutoReminders: { type: Boolean, default: true }, // تذكيرات تلقائية
    hasEmailNotifications: { type: Boolean, default: true },
    hasCustomWhatsAppNumber: { type: Boolean, default: false },

    // Compensation Invites (دعوات تعويضية)
    hasCompensationInvites: { type: Boolean, default: true }, // رصيد دعوات تعويضية
    compensationPercentage: { type: Number, default: 10 }, // 10% من رصيدك من عدد الدعوات

    // Templates
    hasBasicTemplates: { type: Boolean, default: true },
    hasPremiumTemplates: { type: Boolean, default: false },

    // Post Event
    hasPostEventPage: { type: Boolean, default: false },

    // Reports & Analytics
    hasCustomReports: { type: Boolean, default: false },

    // Support
    priorityPoints: { type: Number, default: 1 }, // 1=Trial, 2=Lite, 3=Pro, 4=Elite
    hasWhatsAppSupport: { type: Boolean, default: true },
  },
  { _id: false }
);

// ============================================
// PRICING SCHEMA
// ============================================
//
// AMOUNT UNIT CONTRACT (B-2):
//   `oneTime` is a non-negative number in **SAR major units** (Saudi
//   Riyals). E.g. `29` = 29.00 SAR, `99.99` = 99.99 SAR. SAR has 2-decimal
//   precision (halalas), so values with more than 2 decimal places are
//   rejected — those would imply an upstream rounding bug.
//
// Conversion to halalas (Moyasar's required unit) is done inside the
// payment provider via `_sarToHalalas`. Callers MUST pass SAR — never
// pre-multiply.
const pricingSchema = new mongoose.Schema(
  {
    oneTime: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => {
          if (v === null || v === undefined) return true;
          if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false;
          // 2-decimal precision check: 29.99 OK, 29.999 not OK.
          const rounded = Math.round(v * 100) / 100;
          return Math.abs(rounded - v) < 1e-9;
        },
        message:
          "pricing.oneTime must be a non-negative number in SAR with at most 2 decimal places. " +
          "E.g. 29 (= 29.00 SAR) or 99.99 (= 99.99 SAR).",
      },
    },
  },
  { _id: false }
);

// ============================================
// LIMITS SCHEMA
// ============================================
const limitsSchema = new mongoose.Schema(
  {
    maxEvents: { type: Number, default: 1 },
    maxInvitesPerEvent: { type: Number, default: null },
    invitePool: { type: Number, default: null },
    durationDays: { type: Number, default: 90 },
  },
  { _id: false }
);

// ============================================
// PLAN SCHEMA
// ============================================
const planSchema = new mongoose.Schema(
  {
    // ============ IDENTITY ============
    code: { type: String, required: true, unique: true, trim: true },

    // Plan type categorization
    planType: {
      type: String,
      enum: ['trial', 'basic_event', 'basic_monthly', 'premium_event', 'premium_monthly', 'business_event', 'business_quarterly', 'business_annual', 'unlimited'],
      required: true,
    },

    planFamily: { type: String, enum: ['basic', 'premium', 'business', null], default: null },
    billingType: { type: String, enum: ['event', 'monthly', 'quarterly', 'annual', null], default: null },

    // Target audience
    availableFor: { type: String, enum: ['host', 'whitelabel', 'platform_admin'], default: 'host' },

    // Names
    nameAr: {
      type: String,
      required: [true, "Arabic name is required"],
    },
    nameEn: {
      type: String,
      required: [true, "English name is required"],
    },
    descriptionAr: String,
    descriptionEn: String,

    // ============ PRICING ============
    pricing: {
      type: pricingSchema,
      required: true,
    },
    currency: {
      type: String,
      default: "SAR",
      enum: ["SAR", "USD", "EUR", "AED", "KWD", "BHD", "QAR", "OMR"],
    },

    // ============ LIMITS ============
    limits: {
      type: limitsSchema,
      required: true,
    },

    // ============ FEATURES ============
    features: {
      type: featuresSchema,
      required: true,
    },

    // ============ DISPLAY ============
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    color: String,
    icon: String,

    // ============ VISIBILITY ============
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },

    // ============ METADATA ============
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================
planSchema.index({ isActive: 1, isPublic: 1, sortOrder: 1 });
planSchema.index({ planType: 1, availableFor: 1 });

// ============================================
// VIRTUALS
// ============================================

// Get localized name
planSchema.virtual("name").get(function () {
  return {
    ar: this.nameAr,
    en: this.nameEn,
  };
});

// Get localized description
planSchema.virtual("description").get(function () {
  return {
    ar: this.descriptionAr,
    en: this.descriptionEn,
  };
});

// Monthly discount percentage when paying yearly (for direct pricing)
planSchema.virtual("yearlyDiscount").get(function () {
  const monthlyTotal = (this.pricing?.direct?.monthly || 0) * 12;
  const yearlyPrice = this.pricing?.direct?.yearly || 0;
  if (monthlyTotal === 0) return 0;
  return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
});

// Check if this is a per-event plan
planSchema.virtual("isSingleEvent").get(function () {
  return isPerEventPlan(this.planType);
});

planSchema.virtual("isPoolPlan").get(function () {
  return isPoolPlan(this.planType);
});

planSchema.virtual("isManagedPlan").get(function () {
  return isManagedPlan(this.planType);
});

// Check if this is a host plan
planSchema.virtual("isHostPlan").get(function () {
  return this.availableFor === PLAN_AVAILABILITY.HOST;
});

// Check if this is a whitelabel plan
planSchema.virtual("isWhitelabelPlan").get(function () {
  return this.availableFor === PLAN_AVAILABILITY.WHITELABEL;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get plan display info for frontend
 * @param {string} lang - Language code (ar/en)
 * @returns {Object}
 */
planSchema.methods.getDisplayInfo = function (lang = "ar") {
  return {
    code: this.code,
    planType: this.planType,
    availableFor: this.availableFor,
    name: lang === "ar" ? this.nameAr : this.nameEn,
    description: lang === "ar" ? this.descriptionAr : this.descriptionEn,
    pricing: { oneTime: this.pricing?.oneTime || 0 },
    currency: this.currency,
    limits: this.limits,
    features: this.features,
    isPopular: this.isPopular,
    color: this.color,
    icon: this.icon,
  };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get plan by code
 * @param {string} code
 * @returns {Promise<Plan>}
 */
planSchema.statics.getByCode = async function (code) {
  return this.findOne({ code, isActive: true });
};

/**
 * Get plan by code, creating from PLAN_DEFAULTS if not in database
 * This ensures single event plans work without requiring database seeding
 * @param {string} code
 * @returns {Promise<Plan>}
 */
planSchema.statics.getOrCreateByCode = async function (code) {
  // First try to find in database
  let plan = await this.findOne({ code, isActive: true });
  if (plan) return plan;

  // If not found, try to create from PLAN_DEFAULTS
  const { PLAN_DEFAULTS } = require("../src/shared/constants");
  const planConfig = PLAN_DEFAULTS[code];

  if (!planConfig) {
    return null; // Plan code not found in defaults either
  }

  // Create the plan from defaults
  try {
    plan = await this.create({
      code,
      ...planConfig,
      isActive: true,
      isPublic: true,
    });
    return plan;
  } catch (error) {
    // If creation fails (e.g., race condition), try to find again
    if (error.code === 11000) {
      return this.findOne({ code, isActive: true });
    }
    throw error;
  }
};

// ============================================
// CREATE MODEL
// ============================================

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
