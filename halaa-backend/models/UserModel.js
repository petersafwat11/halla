/**
 * Unified User Model
 * Single source of truth for all user types: Host, Admin, Vendor, Guest
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
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_VALUES,
} = require("../src/shared/constants");
const { mongoosePhoneValidator } = require("../src/shared/utils/phone");
const { signStoredImage, signStoredImages } = require("../src/shared/utils/s3Upload");

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
 * Business-account profile data (role:host + accountType:'business').
 *
 * Minimal + server-owned: the public-facing organization name IS the user's
 * top-level `name`, and the logo IS the top-level `avatar` (S3 key). Only the
 * free-text description lives here. No colors/website (global tokens, owner
 * decision). Event branding is SNAPSHOTTED onto the event at creation, never
 * read live from here.
 */
const businessDataSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true, maxlength: 2000 },
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
    taglineAr: { type: String, trim: true, maxlength: 160 },
    taglineEn: { type: String, trim: true, maxlength: 160 },
    aboutAr: { type: String, trim: true, maxlength: 2000 },
    aboutEn: { type: String, trim: true, maxlength: 2000 },

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
    totalViews: { type: Number, default: 0 },

    // Vendor-specific status
    vendorStatus: {
      type: String,
      enum: Object.values(VENDOR_STATUS),
      default: VENDOR_STATUS.PENDING,
    },

    // Admin notes
    adminNotes: String,
    rejectionReason: String,

    // profile-completion flag (auto-set when required vendor fields are present)
    profileCompleted: { type: Boolean, default: false },

    // status-change audit timestamps and actor
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

    // Expo push tokens for this user's devices. Registered by the mobile app
    // on login/foreground (PATCH /auth/update-push-token) and pruned when Expo
    // reports DeviceNotRegistered during delivery. A user may have several
    // (multiple devices); deduped on write.
    pushTokens: {
      type: [String],
      default: [],
    },

    // Stable, random, opaque billing identifier used as the RevenueCat App User
    // ID (§9.1). Deliberately NOT the Mongo _id / phone / email — those must
    // never be exposed to the store/RevenueCat. Generated on creation; existing
    // users are backfilled by scripts/backfill-billing-user-id.js.
    billingUserId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomUUID(),
    },

    // ============ AUTHENTICATION ============
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

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

    // Account-type discriminator for `role:'host'` users. 'personal' = ordinary
    // host; 'business' = Halaa Business org account. FAIL-CLOSED: a host MUST
    // carry an explicit value (validator below); `null` is reserved for
    // non-host roles. Immutable via the normal profile endpoints — admin-set.
    accountType: {
      type: String,
      enum: { values: [...ACCOUNT_TYPE_VALUES, null], message: "Invalid accountType" },
      default: null,
      validate: {
        validator: function (v) {
          // Only enforce on the save/create path (this === document). On
          // query-level updates `this` is the query; those paths set
          // accountType explicitly via $set and are covered by service code.
          if (this instanceof mongoose.Document && this.role === ROLES.HOST) {
            return v === ACCOUNT_TYPES.PERSONAL || v === ACCOUNT_TYPES.BUSINESS;
          }
          return true;
        },
        message:
          'A host account must have accountType "personal" or "business" (fail-closed).',
      },
    },

    // One-time password-update recommendation for admin-created businesses.
    // It is advisory only and is consumed after the first successful login.
    mustChangePassword: { type: Boolean, default: false },

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

    // ============ NOTIFICATION PREFERENCES ============
    // Mixed because keys vary by role (host has appNotifications only;
    // admin has both app + email; vendor has neither). The active
    // notifications service reads `appNotifications[<key>]` to decide
    // whether to create an in-app notification.
    notificationPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },

    // ============ SUBSCRIPTION ============
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // ============ ROLE-SPECIFIC PROFILE DATA ============
    profile: {
      hostData: hostDataSchema,
      businessData: businessDataSchema,
      vendorData: vendorDataSchema,
      adminData: adminDataSchema,
      guestData: guestDataSchema,
    },

    // ============ PREFERENCES ============
    // top-level language preference; returned on profile fetch
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
userSchema.index({ role: 1, createdAt: -1 });
// Account-type segregation (personal vs business host queries).
userSchema.index({ role: 1, accountType: 1, status: 1 });
userSchema.index({ "profile.vendorData.serviceCategories": 1 });
userSchema.index({ "profile.vendorData.vendorStatus": 1 });
userSchema.index({
  role: 1,
  status: 1,
  "profile.vendorData.vendorStatus": 1,
  "profile.vendorData.rating": -1,
  _id: 1,
});
userSchema.index({
  role: 1,
  status: 1,
  "profile.vendorData.vendorStatus": 1,
  "profile.vendorData.serviceLocation.regionId": 1,
  "profile.vendorData.serviceLocation.cityId": 1,
});
userSchema.index({
  role: 1,
  status: 1,
  "profile.vendorData.vendorStatus": 1,
  "profile.vendorData.serviceLocation.districtIds": 1,
});
userSchema.index({ email: 1, role: 1 });
userSchema.index({ mobile: 1, role: 1 });
userSchema.index({ phoneNumber: 1, role: 1 }); // Legacy support

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
  ].includes(this.role);
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

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  return resetToken;
};

/**
 * Generate email verification code
 * @returns {string} 6-digit verification code
 */
userSchema.methods.createEmailVerificationCode = function () {
  // Cryptographically secure 6-digit code (uniform, unpredictable).
  const code = crypto.randomInt(100000, 1000000).toString();

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
  // Hashed-code comparison must be constant-time. A plain `===`
  // short-circuits on first byte mismatch and leaks per-byte timing
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
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

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
 * Get public profile (remove sensitive data, sign S3 image refs).
 *
 * Async because every image field stored in the DB is an S3 key — we mint a
 * 1-hour pre-signed URL for each at serialization. Callers MUST await.
 *
 * @returns {Promise<Object>}
 */
userSchema.methods.toPublicJSON = async function () {
  const obj = this.toObject();

  // Remove sensitive fields
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationCode;
  delete obj.emailVerificationExpires;
  delete obj.__v;

  // Sign top-level avatar
  obj.avatar = await signStoredImage(obj.avatar);

  // Role-data flattening: copy the role-specific subdoc to `roleData` and
  // drop the rest of `profile` from the response.
  if (obj.profile) {
    const roleDataMap = {
      [ROLES.HOST]: "hostData",
      [ROLES.VENDOR]: "vendorData",
      [ROLES.ADMIN]: "adminData",
      [ROLES.SUPER_ADMIN]: "adminData",
      [ROLES.MODERATOR]: "adminData",
      [ROLES.GUEST]: "guestData",
    };

    const relevantData = roleDataMap[obj.role];
    if (relevantData && obj.profile[relevantData]) {
      obj.roleData = obj.profile[relevantData];
    }

    // Business accounts (role:host + accountType:'business') need their
    // `businessData` surfaced alongside `roleData` (=hostData). The whole
    // `profile` is dropped below, so copy it out explicitly.
    if (obj.accountType === ACCOUNT_TYPES.BUSINESS && obj.profile.businessData) {
      obj.businessData = obj.profile.businessData;
    }

    delete obj.profile;
  }

  // Sign role-specific image fields.
  if (obj.roleData) {
    const rd = obj.roleData;
    if (obj.role === ROLES.VENDOR) {
      rd.businessLogo = await signStoredImage(rd.businessLogo);
      rd.nationalIdImage = await signStoredImage(rd.nationalIdImage);
      rd.commercialRecordImage = await signStoredImage(rd.commercialRecordImage);
      rd.profileFile = await signStoredImage(rd.profileFile);
      rd.cv = await signStoredImage(rd.cv);
      rd.portfolioImages = await signStoredImages(rd.portfolioImages);
      rd.pricePackages = await signStoredImages(rd.pricePackages);
    }
  }

  if (!obj.permissions) {
    obj.permissions = this.permissions || [];
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
 * @returns {Promise<number>}
 */
userSchema.statics.countByRole = async function (role) {
  const filter = { role, status: USER_STATUS.ACTIVE };
  return this.countDocuments(filter);
};

/**
 * Get user stats for dashboard
 * @returns {Promise<Object>}
 */
userSchema.statics.getStats = async function () {
  const matchStage = { status: { $ne: USER_STATUS.INACTIVE } };

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
