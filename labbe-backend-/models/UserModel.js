/**
 * Unified User Model
 * Single source of truth for all user types: Host, Admin, Vendor, WhiteLabel, Guest
 * Role-based discrimination with role-specific data stored in profile sub-documents
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const validator = require("validator");
const {
  ROLES,
  USER_STATUS,
  PERMISSIONS,
  getDefaultPermissions,
  VENDOR_STATUS,
} = require("../src/shared/constants");
const { mongoosePhoneValidator } = require("../src/shared/utils/phone");

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Host-specific profile data
 */
const hostDataSchema = new mongoose.Schema(
  {
    profileCompleted: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    subscribedBefore: { type: Boolean, default: false },
    bio: String,
    company: String,
    position: String,
  },
  { _id: false }
);

/**
 * Vendor-specific profile data
 */
const vendorDataSchema = new mongoose.Schema(
  {
    // Business identity
    brandName: { type: String, trim: true },
    ownerFullName: { type: String, trim: true },

    // Service information
    serviceDescription: String,

    // Service categories (from frontend)
    serviceCategories: {
      eventPlanning: [String],
      mediaProduction: [String],
      giftsAndGiveaways: [String],
      foodAndBeverages: [String],
      beautyAndFashion: [String],
      logisticsAndDelivery: [String],
      corporateServices: [String],
      supportServices: [String],
      technicalServices: [String],
      soundLightingEntertainment: [String],
      hallsAndVenues: [String],
    },

    // Service location (Saudi Arabia regions/cities/districts)
    serviceLocation: {
      regionId: { type: Number, required: false },
      regionNameAr: String,
      regionNameEn: String,
      cityId: { type: Number, required: false }, // null = all cities in region
      cityNameAr: String,
      cityNameEn: String,
      districtIds: [Number], // empty = all districts in city
      districtNames: [{ nameAr: String, nameEn: String }],
      coverageType: {
        type: String,
        enum: ["region", "city", "districts"],
        default: "city",
      },
    },

    otherData: String, // Additional service notes

    // Portfolio
    portfolioImages: [String],
    businessLogo: String,
    profileFile: String, // Company profile document

    // Packages
    pricePackages: [String],

    // Verification documents
    commercialRecordNumber: String,
    nationalId: String,
    commercialRecordImage: String,
    nationalIdImage: String,

    // Social links
    socialLinks: {
      instagram: String,
      facebook: String,
      tiktok: String,
      twitter: String,
      website: String,
      whatsapp: String,
    },

    // Performance metrics
    rating: { type: Number, default: null, min: 0, max: 5 },
    numberOfRatings: { type: Number, default: 0 },
    numberOfClicks: { type: Number, default: 0 },

    // Vendor-specific status
    vendorStatus: {
      type: String,
      enum: Object.values(VENDOR_STATUS),
      default: VENDOR_STATUS.PENDING,
    },

    // Admin notes
    adminNotes: String,
    rejectionReason: String,

    // FLOW-24-F02: profile-completion flag (auto-set when required vendor fields are present)
    profileCompleted: { type: Boolean, default: false },

    // FLOW-24-F02: status-change audit timestamps and actor
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

/**
 * Admin-specific profile data
 */
const adminDataSchema = new mongoose.Schema(
  {
    title: String,
    department: String,
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Admin activity tracking
    actionsCount: { type: Number, default: 0 },
    lastActionAt: Date,
  },
  { _id: false }
);

/**
 * WhiteLabel-specific profile data
 */
const whitelabelDataSchema = new mongoose.Schema(
  {
    // Brand identity
    arabicName: { type: String, trim: true },
    englishName: { type: String, trim: true },
    platformName: String,
    companyName: String, // For payment/invoice purposes
    logo: String,
    favicon: String,

    // System requirements
    requirements: {
      numberOfEventsMonthly: Number,
      numberOfGuestsMonthly: Number,
      eventTypes: [String],
      eventsTypesOther: String,
    },

    // Address Information
    address: {
      city: String,
      neighborhood: String,
      street: String,
      buildingNumber: String,
      additionalNumber: String,
      placeType: String,
      placeNumber: String,
    },

    // Tax & License
    licenseNumber: String,
    taxNumber: String,

    // Plan selection during signup
    planSelection: {
      planCode: {
        type: String,
        enum: [
          "business_event_100", "business_event_150", "business_event_200",
          "business_event_300", "business_event_400", "business_event_500",
          "business_quarterly", "business_annual",
        ],
      },
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly", "once"],
      },
      needsCustomBranding: {
        type: Boolean,
        default: false,
      },
    },

    // Application status
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { _id: false }
);

/**
 * Guest-specific profile data (for event attendees)
 */
const guestDataSchema = new mongoose.Schema(
  {
    preferredLanguage: { type: String, default: "ar" },
    dietaryRestrictions: [String],
    accessibilityNeeds: String,
  },
  { _id: false }
);

// ============================================
// MAIN USER SCHEMA
// ============================================

const userSchema = new mongoose.Schema(
  {
    // ============ CORE IDENTITY ============
    // Email - normalized to lowercase, unique across all users
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || validator.isEmail(v);
        },
        message: "Invalid email format",
      },
    },

    // Mobile/Phone - normalized format, unique across all users
    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      validate: {
        validator: mongoosePhoneValidator,
        message:
          "Invalid phone number. Supported formats: Saudi (+9665xxxxxxxx or 05xxxxxxxx), Egypt (+201xxxxxxxxx or 01xxxxxxxxx)",
      },
    },

    // Legacy field for backward compatibility
    phoneNumber: {
      type: String,
      sparse: true,
      trim: true,
    },

    username: {
      type: String,
      trim: true,
      minlength: [2, "Username must be at least 2 characters"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },

    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    avatar: String,

    // ============ AUTHENTICATION ============
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordSetupToken: String,
    passwordSetupExpires: Date,

    // Email verification
    emailVerificationCode: String,
    emailVerificationExpires: Date,
    emailVerified: { type: Boolean, default: false },

    // ============ ROLE & ACCESS ============
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: [true, "User role is required"],
      default: ROLES.GUEST,
    },

    // Granular permissions (for moderators)
    permissions: {
      type: [String],
      enum: Object.values(PERMISSIONS),
      default: function () {
        return getDefaultPermissions(this.role);
      },
    },

    // ============ STATUS ============
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },

    // ============ MULTI-TENANT ============
    // References another User with role whitelabel_admin (the whitelabel owner)
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // FLOW-04-F04: whitelabel subdomain / custom domain config
    domain: {
      subdomain: { type: String, lowercase: true, trim: true, default: null },
      customDomain: { type: String, lowercase: true, trim: true, default: null },
    },

    // ============ SUBSCRIPTION ============
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // ============ ROLE-SPECIFIC PROFILE DATA ============
    profile: {
      hostData: hostDataSchema,
      vendorData: vendorDataSchema,
      adminData: adminDataSchema,
      whitelabelData: whitelabelDataSchema,
      guestData: guestDataSchema,
    },

    // ============ PREFERENCES ============
    // FLOW-07-F03: top-level language preference; returned on profile fetch
    // so mobile clients can sync from server rather than storing locally only.
    preferredLanguage: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar',
    },

    // ============ METADATA ============
    lastLoginAt: Date,
    lastActivityAt: Date,
    loginCount: { type: Number, default: 0 },

    // Login security
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // For soft delete
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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

// Compound indexes for common queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ whitelabelId: 1, role: 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ "profile.vendorData.serviceCategories": 1 });
userSchema.index({ "profile.vendorData.vendorStatus": 1 });
userSchema.index({ email: 1, role: 1 });
userSchema.index({ mobile: 1, role: 1 });
userSchema.index({ phoneNumber: 1, role: 1 }); // Legacy support

// FLOW-04-F04: unique sparse index for whitelabel subdomain
userSchema.index({ "domain.subdomain": 1 }, { unique: true, sparse: true });

// Unique compound indexes for better duplicate detection
userSchema.index(
  { email: 1 },
  { unique: true, sparse: true, collation: { locale: "en", strength: 2 } }
);

// Text index for search
userSchema.index({
  username: "text",
  name: "text",
  email: "text",
  "profile.vendorData.brandName": "text",
});

// ============================================
// VIRTUALS
// ============================================

// Get display name based on role
userSchema.virtual("displayName").get(function () {
  if (this.name) return this.name;
  if (this.username) return this.username;
  if (this.profile?.vendorData?.brandName)
    return this.profile.vendorData.brandName;
  if (this.email) return this.email.split("@")[0];
  if (this.phoneNumber) return `User ${this.phoneNumber.slice(-4)}`;
  return "User";
});

// Check if user is admin type
userSchema.virtual("isAdmin").get(function () {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.WHITELABEL_ADMIN,
    ROLES.WHITELABEL_MODERATOR,
  ].includes(this.role);
});

// Check if user belongs to whitelabel
userSchema.virtual("isWhitelabelUser").get(function () {
  return !!this.whitelabelId;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Only hash if password is actually set (not undefined/null)
  if (!this.password) return next();

  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Set password changed timestamp only if this is an existing user
  // Don't set it for new users or OTP-only users
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second for token timing
  }

  next();
});

// Normalize email and mobile before saving
userSchema.pre("save", function (next) {
  // Normalize email to lowercase
  if (this.email && this.isModified("email")) {
    this.email = this.email.toLowerCase().trim();
  }

  // Normalize mobile number
  if (this.mobile && this.isModified("mobile")) {
    const { validateAndFormatPhone } = require("../src/shared/utils/phone");
    const result = validateAndFormatPhone(this.mobile);
    if (result.isValid) {
      this.mobile = result.formatted;
    }
  }

  // Legacy phoneNumber support - sync with mobile
  if (this.phoneNumber && this.isModified("phoneNumber") && !this.mobile) {
    const { validateAndFormatPhone } = require("../src/shared/utils/phone");
    const result = validateAndFormatPhone(this.phoneNumber);
    if (result.isValid) {
      this.phoneNumber = result.formatted;
      this.mobile = result.formatted; // Sync to mobile field
    }
  }

  next();
});

// Set default permissions based on role
userSchema.pre("save", function (next) {
  if (
    this.isModified("role") &&
    (!this.permissions || this.permissions.length === 0)
  ) {
    this.permissions = getDefaultPermissions(this.role);
  }
  next();
});

// ============================================
// QUERY MIDDLEWARE
// ============================================

// Exclude soft-deleted users by default
userSchema.pre(/^find/, function (next) {
  // Only apply if not explicitly querying deleted users
  if (!this.getQuery().deletedAt) {
    this.find({ deletedAt: { $exists: false } });
  }
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Compare password for authentication
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password was changed after token was issued
 * @param {number} JWTTimestamp - Token issued at timestamp
 * @returns {boolean}
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Generate password reset token
 * @returns {string} Plain reset token
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour (FLOW-06-F01)

  return resetToken;
};

/**
 * Generate password setup token (for whitelabel first-time setup)
 * @returns {string} Plain setup token
 */
userSchema.methods.createPasswordSetupToken = function () {
  const setupToken = crypto.randomBytes(32).toString("hex");

  this.passwordSetupToken = crypto
    .createHash("sha256")
    .update(setupToken)
    .digest("hex");

  this.passwordSetupExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days (FLOW-04-F02)

  return setupToken;
};

/**
 * Generate email verification code
 * @returns {string} 6-digit verification code
 */
userSchema.methods.createEmailVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailVerificationCode = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return code;
};

/**
 * Verify email verification code
 * @param {string} code - Code to verify
 * @returns {boolean}
 */
userSchema.methods.verifyEmailCode = function (code) {
  // M-14 fix: hashed-code comparison must be constant-time. The previous
  // `===` short-circuits on first byte mismatch and leaks per-byte timing
  // information that, combined with the 6-digit numeric input space, can be
  // exploited to recover a verification code over many attempts. Use
  // `crypto.timingSafeEqual` over equal-length buffers.
  if (
    !code ||
    !this.emailVerificationCode ||
    !this.emailVerificationExpires ||
    this.emailVerificationExpires <= Date.now()
  ) {
    return false;
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  const a = Buffer.from(hashedCode, "hex");
  const b = Buffer.from(this.emailVerificationCode, "hex");

  // Defensive — if for any reason the stored value is not a hex digest of
  // the same length, bail out rather than throw from timingSafeEqual.
  if (a.length === 0 || a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

/**
 * Check if account is locked due to too many login attempts
 * @returns {boolean}
 */
userSchema.methods.isLocked = function () {
  const lockUntil = this.profile?.adminData?.lockUntil || this.lockUntil;
  return !!(lockUntil && lockUntil > Date.now());
};

/**
 * Increment login attempts and lock account if necessary
 * @returns {Promise}
 */
userSchema.methods.incLoginAttempts = async function () {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes (FLOW-01-F07 / FLOW-05-F01)

  // If we have a previous lock that has expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Otherwise increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock the account if we've reached max attempts
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

/**
 * Check if user has a specific permission
 * @param {string} permission
 * @returns {boolean}
 */
userSchema.methods.hasPermission = function (permission) {
  // Super admin and admin have all permissions
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(this.role)) {
    return true;
  }
  return this.permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {string[]} permissions
 * @returns {boolean}
 */
userSchema.methods.hasAnyPermission = function (permissions) {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(this.role)) {
    return true;
  }
  return permissions.some((p) => this.permissions.includes(p));
};

/**
 * Update login tracking
 */
userSchema.methods.recordLogin = async function () {
  this.lastLoginAt = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  if (this.profile?.adminData) {
    this.profile.adminData.lastLogin = new Date();
    this.profile.adminData.loginAttempts = 0;
  }
  await this.save({ validateBeforeSave: false });
};

/**
 * Soft delete user
 * @param {ObjectId} deletedBy - ID of user performing deletion
 */
userSchema.methods.softDelete = async function (deletedBy) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.status = USER_STATUS.INACTIVE;
  await this.save({ validateBeforeSave: false });
};

/**
 * Get public profile (remove sensitive data)
 * @returns {Object}
 */
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();

  // Remove sensitive fields
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationCode;
  delete obj.emailVerificationExpires;
  delete obj.__v;

  // Remove role-specific data not relevant to user's role
  if (obj.profile) {
    const roleDataMap = {
      [ROLES.HOST]: "hostData",
      [ROLES.VENDOR]: "vendorData",
      [ROLES.ADMIN]: "adminData",
      [ROLES.SUPER_ADMIN]: "adminData",
      [ROLES.MODERATOR]: "adminData",
      [ROLES.WHITELABEL_ADMIN]: "whitelabelData",
      [ROLES.WHITELABEL_MODERATOR]: "whitelabelData",
      [ROLES.GUEST]: "guestData",
    };

    const relevantData = roleDataMap[obj.role];
    if (relevantData && obj.profile[relevantData]) {
      obj.roleData = obj.profile[relevantData];
    }
    delete obj.profile;
  }

  // Ensure permissions are included for admin roles
  // (they should already be in obj, but ensure they're not removed)
  if (!obj.permissions) {
    obj.permissions = this.permissions || [];
  }

  // Ensure whitelabelId is included for whitelabel users
  if (this.whitelabelId) {
    obj.whitelabelId = this.whitelabelId;
  }

  return obj;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find user by email or phone
 * @param {string} identifier - Email or phone
 * @returns {Promise<User>}
 */
userSchema.statics.findByIdentifier = async function (identifier) {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/[\s\-\(\)]/g, "");

  return this.findOne({
    $or: [
      { email: cleanIdentifier },
      { mobile: cleanPhone },
      { phoneNumber: cleanPhone }, // Legacy support
    ],
  }).select("+password");
};

/**
 * Check if email exists (case-insensitive)
 * @param {string} email - Email to check
 * @param {string} excludeUserId - User ID to exclude from check
 * @returns {Promise<boolean>}
 */
userSchema.statics.emailExists = async function (email, excludeUserId = null) {
  if (!email) return false;

  const query = { email: email.toLowerCase().trim() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const user = await this.findOne(query);
  return !!user;
};

/**
 * Check if mobile exists
 * @param {string} mobile - Mobile to check
 * @param {string} excludeUserId - User ID to exclude from check
 * @returns {Promise<boolean>}
 */
userSchema.statics.mobileExists = async function (
  mobile,
  excludeUserId = null
) {
  if (!mobile) return false;

  const cleanMobile = mobile.replace(/[\s\-\(\)]/g, "");
  const query = {
    $or: [
      { mobile: cleanMobile },
      { phoneNumber: cleanMobile }, // Legacy support
    ],
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const user = await this.findOne(query);
  return !!user;
};

/**
 * Find users by role
 * @param {string} role
 * @param {Object} options - Query options
 * @returns {Promise<User[]>}
 */
userSchema.statics.findByRole = async function (role, options = {}) {
  const query = this.find({ role, status: USER_STATUS.ACTIVE });

  if (options.whitelabelId) {
    query.where("whitelabelId").equals(options.whitelabelId);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.sort) {
    query.sort(options.sort);
  }

  return query;
};

/**
 * Count users by role
 * @param {string} role
 * @param {ObjectId} whitelabelId - Optional
 * @returns {Promise<number>}
 */
userSchema.statics.countByRole = async function (role, whitelabelId = null) {
  const filter = { role, status: USER_STATUS.ACTIVE };
  if (whitelabelId !== undefined) {
    filter.whitelabelId = whitelabelId;
  }
  return this.countDocuments(filter);
};

/**
 * Get user stats for dashboard
 * @param {ObjectId} whitelabelId - Optional
 * @returns {Promise<Object>}
 */
userSchema.statics.getStats = async function (whitelabelId = null) {
  const matchStage = { status: { $ne: USER_STATUS.INACTIVE } };
  if (whitelabelId !== undefined) {
    matchStage.whitelabelId = whitelabelId;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {};
  stats.forEach((s) => {
    result[s._id] = s.count;
  });

  return result;
};

/**
 * Search users
 * @param {string} searchTerm
 * @param {Object} filters
 * @returns {Promise<User[]>}
 */
userSchema.statics.search = async function (searchTerm, filters = {}) {
  const query = {};

  if (searchTerm) {
    query.$or = [
      { username: { $regex: searchTerm, $options: "i" } },
      { name: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
      { mobile: { $regex: searchTerm, $options: "i" } },
      { phoneNumber: { $regex: searchTerm, $options: "i" } }, // Legacy support
      { "profile.vendorData.brandName": { $regex: searchTerm, $options: "i" } },
    ];
  }

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.whitelabelId !== undefined) {
    query.whitelabelId = filters.whitelabelId;
  }

  return this.find(query)
    .select("-password -passwordResetToken -emailVerificationCode")
    .sort({ createdAt: -1 })
    .limit(filters.limit || 50);
};

// ============================================
// CREATE MODEL
// ============================================

const User = mongoose.model("User", userSchema);

module.exports = User;
