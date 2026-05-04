/**
 * Users Service
 * Business logic for user management - NO HTTP concerns
 * @module modules/users/users.service
 */

const config = require("../../config");
const {
  ROLES,
  USER_STATUS,
  VENDOR_STATUS,
  SUBSCRIPTION_STATUS,
} = require("../../shared/constants");
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} = require("../../shared/errors");
const AppError = require("../../shared/errors/AppError");

// Import existing models during migration
const User = require("../../../models/UserModel");
const Subscription = require("../../../models/SubscriptionModel");
const Plan = require("../../../models/PlanModel");

// Import existing services
const notificationService = require('../notifications/notifications.service');
const emailModule = require('../../infrastructure/email');
const { logAudit } = require('../../shared/utils/auditLog');
const { processUploadedFiles } = require('../../shared/utils/s3Upload');

class UsersService {
  // ============================================
  // COMMON HELPERS
  // ============================================

  /**
   * Build search query
   * @param {string} searchValue
   * @param {string[]} fields
   * @returns {Object}
   */
  buildSearchQuery(searchValue, fields) {
    if (!searchValue) return {};
    const escaped = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escaped, $options: "i" };
    return {
      $or: fields.map((field) => ({ [field]: searchRegex })),
    };
  }

  /**
   * Build date range query
   * @param {string} from
   * @param {string} to
   * @returns {Object}
   */
  buildDateQuery(from, to) {
    if (!from && !to) return {};
    const query = {};
    if (from) query.$gte = new Date(from);
    if (to) query.$lte = new Date(to);
    return { createdAt: query };
  }

  // ============================================
  // HOST MANAGEMENT
  // ============================================

  /**
   * Get all hosts with pagination and filtering
   * @param {Object} filters
   * @param {Object} options
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getHosts(filters = {}, options = {}, whitelabelFilter = null) {
    const { search, status, from, to } = filters;
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let query = { role: ROLES.HOST };

    if (whitelabelFilter) {
      Object.assign(query, whitelabelFilter);
    }

    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "username",
        "name",
        "email",
        "phoneNumber",
      ]);
      query = { ...query, ...searchQuery };
    }

    if (status) query.status = status;
    if (from || to) {
      Object.assign(query, this.buildDateQuery(from, to));
    }

    const [hosts, total] = await Promise.all([
      User.find(query)
        .select("-password -passwordResetToken")
        .populate("subscription", "planType status currentPeriodEnd")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const formattedHosts = hosts.map((host) => ({
      id: host._id,
      username: host.username,
      name: host.name,
      email: host.email,
      phoneNumber: host.phoneNumber,
      status: host.status,
      profileCompleted: host.profile?.hostData?.profileCompleted,
      emailVerified: host.profile?.hostData?.emailVerified,
      subscription: host.subscription
        ? {
          plan: host.subscription.planType,
          status: host.subscription.status,
          expiresAt: host.subscription.currentPeriodEnd,
        }
        : null,
      createdAt: host.createdAt,
    }));

    return {
      data: formattedHosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get host by ID
   * @param {string} id
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<Object>}
   */
  async getHostById(id, whitelabelFilter = null) {
    const query = {
      _id: id,
      role: ROLES.HOST,
      ...whitelabelFilter,
    };

    const host = await User.findOne(query)
      .select("-password -passwordResetToken")
      .populate({
        path: "subscription",
        populate: { path: "planId" },
      });

    if (!host) {
      throw new NotFoundError("Host");
    }

    return {
      host: host.toPublicJSON(),
      subscription: host.subscription?.getSummary() || null,
    };
  }

  /**
   * Create host (admin action)
   * @param {Object} userData
   * @param {Object} context - { whitelabelId, createdBy }
   * @returns {Promise<Object>}
   */
  async createHost(userData, context = {}) {
    const { email, phoneNumber, password, username, name } = userData;
    const { whitelabelId } = context;

    if (!phoneNumber && !email) {
      throw new ValidationError("Email or phone number is required");
    }

    // Check duplicates
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    });

    if (existingUser) {
      throw new ConflictError(
        "User already exists",
        existingUser.email === email?.toLowerCase() ? "email" : "phone"
      );
    }

    const host = await User.create({
      email: email?.toLowerCase(),
      phoneNumber,
      password: password || require('crypto').randomBytes(16).toString('hex'),
      username,
      name,
      role: ROLES.HOST,
      status: USER_STATUS.ACTIVE,
      whitelabelId: whitelabelId || null,
      profile: {
        hostData: {
          profileCompleted: false,
          emailVerified: false,
        },
      },
    });

    // Handle subscription assignment
    await this._assignHostSubscription(host, whitelabelId);

    return {
      host: host.toPublicJSON(),
    };
  }

  /**
   * Assign subscription to host
   * @private
   */
  async _assignHostSubscription(host, whitelabelId) {
    if (whitelabelId) {
      // Share the whitelabel admin's subscription with the host
      const whitelabelAdmin =
        await User.findById(whitelabelId).populate("subscription");
      if (whitelabelAdmin?.subscription) {
        await User.findByIdAndUpdate(host._id, {
          subscription: whitelabelAdmin.subscription._id || whitelabelAdmin.subscription,
        });
        return;
      }
    }

    const trialPlan = await Plan.getOrCreateByCode("trial");
    const subscription = await Subscription.createForUser(
      host._id,
      trialPlan._id,
      {
        whitelabelId: whitelabelId || null,
        status: SUBSCRIPTION_STATUS.TRIAL,
      }
    );
    await User.findByIdAndUpdate(host._id, { subscription: subscription._id });
  }

  /**
   * Update host status
   * @param {string} id
   * @param {string} status
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<Object>}
   */
  async updateHostStatus(id, status, whitelabelFilter = null) {
    if (!Object.values(USER_STATUS).includes(status)) {
      throw new ValidationError("Invalid status value");
    }

    const host = await User.findOneAndUpdate(
      { _id: id, role: ROLES.HOST, ...whitelabelFilter },
      { status },
      { new: true, runValidators: true }
    );

    if (!host) {
      throw new NotFoundError("Host");
    }

    // Send notification
    this._notifyStatusChange(host, status).catch(console.error);

    return { host: host.toPublicJSON() };
  }

  /**
   * Delete host
   * @param {string} id
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<void>}
   */
  async deleteHost(id, deletedBy = null, whitelabelFilter = null) {
    const host = await User.findOne({
      _id: id,
      role: ROLES.HOST,
      ...whitelabelFilter,
    });

    if (!host) {
      throw new NotFoundError("Host");
    }

    // Soft delete the host
    await host.softDelete(deletedBy);

    // Cancel subscription (don't hard delete)
    if (host.subscription) {
      await Subscription.findByIdAndUpdate(host.subscription, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Host account deleted',
      });
    }
  }

  // ============================================
  // VENDOR MANAGEMENT
  // ============================================

  /**
   * Get all vendors with pagination
   * @param {Object} filters
   * @param {Object} options
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getVendors(filters = {}, options = {}, whitelabelFilter = null) {
    const { search, status, vendorStatus, category, from, to } = filters;
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let query = { role: ROLES.VENDOR };

    if (whitelabelFilter) {
      Object.assign(query, whitelabelFilter);
    }

    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "profile.vendorData.brandName",
        "profile.vendorData.ownerFullName",
        "email",
        "phoneNumber",
      ]);
      query = { ...query, ...searchQuery };
    }

    if (status) query.status = status;
    if (vendorStatus) query["profile.vendorData.vendorStatus"] = vendorStatus;
    if (category) query["profile.vendorData.categories"] = category;
    if (from || to) {
      Object.assign(query, this.buildDateQuery(from, to));
    }

    const [vendors, total] = await Promise.all([
      User.find(query)
        .select("-password -passwordResetToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const formattedVendors = vendors.map((vendor) => ({
      id: vendor._id,
      brandName: vendor.profile?.vendorData?.brandName,
      ownerName: vendor.profile?.vendorData?.ownerFullName,
      email: vendor.email,
      phoneNumber: vendor.phoneNumber,
      status: vendor.status,
      vendorStatus: vendor.profile?.vendorData?.vendorStatus,
      categories: vendor.profile?.vendorData?.categories || [],
      city: vendor.profile?.vendorData?.city,
      rating: vendor.profile?.vendorData?.rating,
      createdAt: vendor.createdAt,
    }));

    return {
      data: formattedVendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor by ID
   * @param {string} id
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<Object>}
   */
  async getVendorById(id, whitelabelFilter = null) {
    const vendor = await User.findOne({
      _id: id,
      role: ROLES.VENDOR,
      ...whitelabelFilter,
    }).select("-password -passwordResetToken");

    if (!vendor) {
      throw new NotFoundError("Vendor");
    }

    return { vendor: vendor.toPublicJSON() };
  }

  /**
   * Update vendor status
   * @param {string} id
   * @param {Object} statusData
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<Object>}
   */
  async updateVendorStatus(id, statusData, whitelabelFilter = null, actorId = null) {
    const { status, vendorStatus, rejectionReason } = statusData;
    const updateData = {};

    if (status && Object.values(USER_STATUS).includes(status)) {
      updateData.status = status;
    }

    // FLOW-03-F04: fetch current vendor status BEFORE applying changes so we
    // can enforce the full state machine allowlist.
    const existing = await User.findOne({ _id: id, role: ROLES.VENDOR, ...whitelabelFilter })
      .select('profile.vendorData.vendorStatus email name').lean();
    if (!existing) throw new NotFoundError("Vendor");

    if (vendorStatus && Object.values(VENDOR_STATUS).includes(vendorStatus)) {
      // FLOW-03-F04: full state machine — only these transitions are legal:
      //   pending → approved | rejected
      //   approved → suspended
      //   suspended → approved
      // All other transitions (including → pending) are rejected with 422.
      const from = existing.profile?.vendorData?.vendorStatus || VENDOR_STATUS.PENDING;
      const ALLOWED = {
        [VENDOR_STATUS.PENDING]: [VENDOR_STATUS.APPROVED, VENDOR_STATUS.REJECTED],
        [VENDOR_STATUS.APPROVED]: [VENDOR_STATUS.SUSPENDED],
        [VENDOR_STATUS.SUSPENDED]: [VENDOR_STATUS.APPROVED],
        [VENDOR_STATUS.REJECTED]: [],
      };
      if (!(ALLOWED[from] || []).includes(vendorStatus)) {
        // FLOW-03-F04: 422 with structured body matching the spec contract
        const transitionErr = new AppError('INVALID_TRANSITION', 422, 'INVALID_TRANSITION');
        transitionErr.errors = [{ error: 'INVALID_TRANSITION', from, to: vendorStatus }];
        throw transitionErr;
      }

      updateData["profile.vendorData.vendorStatus"] = vendorStatus;

      if (vendorStatus === VENDOR_STATUS.APPROVED) {
        updateData.status = USER_STATUS.ACTIVE;
        updateData["profile.vendorData.approvedAt"] = new Date();
      } else if (vendorStatus === VENDOR_STATUS.REJECTED) {
        updateData.status = USER_STATUS.REJECTED;
        if (rejectionReason) {
          updateData["profile.vendorData.rejectionReason"] = rejectionReason;
        }
        updateData["profile.vendorData.rejectedAt"] = new Date();
        if (actorId) {
          updateData["profile.vendorData.rejectedBy"] = actorId;
        }
      }
    }

    const vendor = await User.findOneAndUpdate(
      { _id: id, role: ROLES.VENDOR, ...whitelabelFilter },
      updateData,
      { new: true, runValidators: true }
    );

    if (!vendor) {
      throw new NotFoundError("Vendor");
    }

    // FLOW-24-F02: audit trail on vendor status transitions
    logAudit({
      action: 'vendor.status_updated',
      actor: { _id: actorId },
      targetType: 'user',
      targetId: id,
      metadata: {
        previousVendorStatus: existing.profile?.vendorData?.vendorStatus,
        newVendorStatus: vendorStatus,
        rejectionReason,
      },
    }).catch(() => {});

    // Send notifications
    this._notifyVendorStatusChange(vendor, vendorStatus, rejectionReason).catch(
      console.error
    );

    return { vendor: vendor.toPublicJSON() };
  }

  // ============================================
  // ADMIN/MODERATOR MANAGEMENT
  // ============================================

  /**
   * Get all moderators
   * @param {Object} filters
   * @param {Object} options
   * @param {Object} context
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getModerators(filters = {}, options = {}, context = {}) {
    const { search, status } = filters;
    const { page = 1, limit = 10 } = options;
    const { userRole, whitelabelId } = context;
    const skip = (page - 1) * limit;

    // Determine which roles to fetch based on requester
    let roleFilter;
    if (userRole === ROLES.SUPER_ADMIN) {
      roleFilter = { $in: [ROLES.ADMIN, ROLES.MODERATOR] };
    } else if (userRole === ROLES.ADMIN) {
      roleFilter = ROLES.MODERATOR;
    } else if (userRole === ROLES.WHITELABEL_ADMIN) {
      roleFilter = ROLES.WHITELABEL_MODERATOR;
    } else {
      throw new ForbiddenError("You cannot view moderators");
    }

    let query = { role: roleFilter };

    // Whitelabel isolation
    if (
      [ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR].includes(userRole)
    ) {
      query.whitelabelId = whitelabelId;
    }

    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "username",
        "name",
        "email",
      ]);
      query = { ...query, ...searchQuery };
    }

    if (status) query.status = status;

    const [moderators, total] = await Promise.all([
      User.find(query)
        .select("-password -passwordResetToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return {
      data: moderators.map((m) => m.toPublicJSON()),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create moderator
   * @param {Object} userData
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async createModerator(userData, context = {}) {
    const { email, phoneNumber, password, username, name, role, pageAccess } =
      userData;
    const { userRole, whitelabelId, targetWhitelabelId } = context;

    // Validate role assignment
    let targetRole = role || ROLES.MODERATOR;
    if (userRole === ROLES.WHITELABEL_ADMIN) {
      targetRole = ROLES.WHITELABEL_MODERATOR;
    } else if (userRole === ROLES.ADMIN && role === ROLES.ADMIN) {
      throw new ForbiddenError("Only super admin can create admins");
    }

    // TENANT-F01: every admin/moderator must be bound to a tenant.
    // - WHITELABEL_ADMIN inherits its own whitelabelId.
    // - SUPER_ADMIN must explicitly pass targetWhitelabelId on the request.
    // - Platform ADMIN, after the TENANT-F01 fix, is itself tenant-scoped, so
    //   uses its own whitelabelId.
    let assignedWhitelabelId;
    if (userRole === ROLES.WHITELABEL_ADMIN) {
      assignedWhitelabelId = whitelabelId;
    } else if (userRole === ROLES.SUPER_ADMIN) {
      assignedWhitelabelId = targetWhitelabelId;
    } else if (userRole === ROLES.ADMIN) {
      assignedWhitelabelId = whitelabelId;
    }

    if (!assignedWhitelabelId) {
      throw new ValidationError(
        userRole === ROLES.SUPER_ADMIN
          ? "whitelabelId is required when a super admin creates a moderator"
          : "Creator has no whitelabel scope; cannot create moderator"
      );
    }

    // Check duplicates
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    });

    if (existingUser) {
      throw new ConflictError("User already exists");
    }

    const moderator = await User.create({
      email: email?.toLowerCase(),
      phoneNumber,
      password,
      username,
      name,
      role: targetRole,
      status: USER_STATUS.ACTIVE,
      whitelabelId: assignedWhitelabelId,
      pageAccess: pageAccess || {},
    });

    return { moderator: moderator.toPublicJSON() };
  }

  // ============================================
  // USER PROFILE (Self)
  // ============================================

  /**
   * Get current user profile
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getMyProfile(userId) {
    const user = await User.findById(userId)
      .select(
        "-password -passwordResetToken -passwordResetExpires -passwordSetupToken -passwordSetupExpires"
      )
      .populate("subscription");

    if (!user) {
      throw new NotFoundError("User");
    }

    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

  /**
   * Update current user profile
   * @param {string} userId
   * @param {Object} updateData
   * @param {Object} files
   * @returns {Promise<Object>}
   */
  async updateMyProfile(userId, updateData, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    // FLOW-07-F01: phone number changes require OTP — reject direct phone update here
    if (updateData.phoneNumber !== undefined && updateData.phoneNumber !== user.phoneNumber) {
      throw new ValidationError('Phone number updates require OTP verification. Use the phone update endpoint.');
    }

    const allowedFields = [
      "username",
      "name",
      "email",
      "phoneNumber",
      "profile",
      // FLOW-07-F03: allow updating language preference; mobile reads from server
      "preferredLanguage",
    ];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "profile") {
          // Only allow updating the role-appropriate data section
          const roleDataMap = {
            host: 'hostData',
            vendor: 'vendorData',
            whitelabel_admin: 'whitelabelData',
            whitelabel_moderator: 'whitelabelData',
            guest: 'guestData',
          };
          const allowedSection = roleDataMap[user.role];
          if (allowedSection && updateData.profile?.[allowedSection]) {
            if (!user.profile) user.profile = {};
            user.profile[allowedSection] = {
              ...(user.profile[allowedSection] || {}),
              ...updateData.profile[allowedSection],
            };
          }
        } else {
          user[field] = updateData[field];
        }
      }
    });

    // FLOW-07-F02: resolve S3 URLs via processUploadedFiles instead of local disk paths
    const uploadedUrls = processUploadedFiles(files);
    if (uploadedUrls.avatar) {
      user.avatar = uploadedUrls.avatar;
    }
    if (uploadedUrls.businessLogo && user.profile?.vendorData) {
      user.profile.vendorData.businessLogo = uploadedUrls.businessLogo;
    }

    const phoneChanged = updateData.phoneNumber !== undefined && updateData.phoneNumber !== user.phoneNumber;
    await user.save({ validateBeforeSave: false });

    // Track-B / FLOW-07-F01: audit phone number changes — do not log plaintext phone
    if (phoneChanged) {
      logAudit({
        action: 'user.phone_updated',
        actor: { _id: userId, role: user.role },
        targetType: 'user',
        targetId: userId,
      }).catch(() => {});
    }

    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

  /**
   * Request phone number update — sends OTP to the new number (FLOW-07-F01)
   */
  async requestPhoneUpdate(userId, newPhone) {
    const { sendOTP } = require('../auth/otp.service');
    const { normalizePhoneNumber } = require('../../shared/utils/phone');
    const normalized = normalizePhoneNumber(newPhone);
    if (!normalized) throw new ValidationError('Invalid phone number format');

    const existing = await User.findOne({ phoneNumber: normalized, _id: { $ne: userId } });
    if (existing) throw new ConflictError('Phone number already in use');

    const result = await sendOTP(normalized);
    if (!result.success) throw new ValidationError('Failed to send OTP: ' + result.error);
    return { sent: true };
  }

  /**
   * Confirm phone number update with OTP (FLOW-07-F01)
   */
  async confirmPhoneUpdate(userId, newPhone, otp) {
    const { verifyOTP } = require('../auth/otp.service');
    const { normalizePhoneNumber } = require('../../shared/utils/phone');
    const normalized = normalizePhoneNumber(newPhone);
    if (!normalized) throw new ValidationError('Invalid phone number format');

    const result = await verifyOTP(normalized, otp);
    if (!result.success) throw new ValidationError(result.error || 'Invalid OTP');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const oldPhone = user.phoneNumber;
    user.phoneNumber = normalized;
    await user.save({ validateBeforeSave: false });

    // Do not log plaintext phone numbers in audit metadata
    logAudit({
      action: 'user.phone_updated',
      actor: { _id: userId, role: user.role },
      targetType: 'user',
      targetId: userId,
    }).catch(() => {});

    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

  /**
   * Update current user password
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @param {string} passwordConfirm
   * @returns {Promise<Object>}
   */
  async updateMyPassword(
    userId,
    currentPassword,
    newPassword,
    passwordConfirm
  ) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new NotFoundError("User");

    if (!(await user.comparePassword(currentPassword))) {
      throw new ValidationError("Current password is incorrect");
    }

    if (newPassword !== passwordConfirm) {
      throw new ValidationError("Passwords do not match");
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now() - 1000;
    await user.save();

    return { success: true };
  }

  /**
   * Update profile section
   * @param {string} userId
   * @param {string} section
   * @param {Object} data
   * @param {Object} files
   * @returns {Promise<Object>}
   */
  async updateMyProfileSection(userId, section, data, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    const validSections = [
      "hostData",
      "vendorData",
      "businessInfo",
      "contactInfo",
      "documents",
    ];
    if (!validSections.includes(section)) {
      throw new ValidationError(`Invalid profile section: ${section}`);
    }

    if (!user.profile) user.profile = {};
    user.profile[section] = { ...user.profile[section], ...data };

    // FLOW-07-F02: resolve S3 URLs via processUploadedFiles instead of local disk paths
    const uploadedUrls = processUploadedFiles(files);

    // Handle section-specific file uploads
    if (section === "documents") {
      if (uploadedUrls.nationalIdImage) {
        user.profile.documents = user.profile.documents || {};
        user.profile.documents.nationalIdImage = uploadedUrls.nationalIdImage;
      }
      if (uploadedUrls.commercialRecordImage) {
        user.profile.documents = user.profile.documents || {};
        user.profile.documents.commercialRecordImage = uploadedUrls.commercialRecordImage;
      }
    }

    // Handle vendor-specific file uploads
    if (section === "vendorData") {
      const vd = user.profile.vendorData = user.profile.vendorData || {};
      if (uploadedUrls.businessLogo) {
        vd.businessLogo = uploadedUrls.businessLogo;
      }
      if (uploadedUrls.nationalIdImage) {
        vd.nationalIdImage = uploadedUrls.nationalIdImage;
      }
      if (uploadedUrls.commercialRecordImage) {
        vd.commercialRecordImage = uploadedUrls.commercialRecordImage;
      }
      if (uploadedUrls.portfolioImages?.length) {
        vd.portfolioImages = [
          ...(vd.portfolioImages || []),
          ...uploadedUrls.portfolioImages,
        ];
      }
      if (uploadedUrls.pricePackages?.length) {
        vd.pricePackages = [
          ...(vd.pricePackages || []),
          ...uploadedUrls.pricePackages,
        ];
      }

      // FLOW-24-F04: auto-set profileCompleted when all required vendor fields are present
      const vdCurrent = user.profile.vendorData;
      const hasName = !!(vdCurrent.brandName?.trim());
      const hasCategory = !!(
        vdCurrent.serviceCategories &&
        Object.values(vdCurrent.serviceCategories).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        )
      );
      const hasDescription = !!(vdCurrent.serviceDescription?.trim());
      const hasPortfolio = !!(vdCurrent.portfolioImages?.length > 0);
      vdCurrent.profileCompleted = hasName && hasCategory && hasDescription && hasPortfolio;
    }

    await user.save({ validateBeforeSave: false });
    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

  /**
   * Get notification preferences
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getNotificationPreferences(userId) {
    const user = await User.findById(userId).select("notificationPreferences");
    if (!user) throw new NotFoundError("User");

    const stored = user.notificationPreferences || {};

    // Return structured format { appNotifications, emailNotifications }
    // Support both legacy flat format and new structured format
    let result;
    if (stored.appNotifications || stored.emailNotifications || stored.smsNotifications) {
      result = {
        appNotifications: stored.appNotifications || {},
        emailNotifications: stored.emailNotifications || {},
        smsNotifications: stored.smsNotifications || {},
      };
    } else {
      // Legacy flat format — return empty structured object so frontend uses defaults
      result = { appNotifications: {}, emailNotifications: {}, smsNotifications: {} };
    }

    return { preferences: result };
  }

  /**
   * Update notification preferences
   * @param {string} userId
   * @param {Object} preferences
   * @returns {Promise<Object>}
   */
  async updateNotificationPreferences(userId, preferences) {
    // Accept structured { appNotifications, emailNotifications } format
    const toStore = preferences.appNotifications !== undefined || preferences.emailNotifications !== undefined || preferences.smsNotifications !== undefined
      ? preferences
      : { appNotifications: {}, emailNotifications: {}, smsNotifications: {} };

    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: toStore },
      { new: true, runValidators: true }
    ).select("notificationPreferences");

    if (!user) throw new NotFoundError("User");

    return { preferences: user.notificationPreferences };
  }

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================

  /**
   * Notify user of status change
   * @private
   */
  async _notifyStatusChange(user, status) {
    const messages = {
      [USER_STATUS.SUSPENDED]: {
        title: "Account Suspended",
        titleAr: "تم تعليق الحساب",
        message: "Your account has been suspended. Please contact support.",
        messageAr: "تم تعليق حسابك. يرجى التواصل مع الدعم.",
      },
      [USER_STATUS.ACTIVE]: {
        title: "Account Activated",
        titleAr: "تم تفعيل الحساب",
        message: "Your account has been activated.",
        messageAr: "تم تفعيل حسابك.",
      },
    };

    const msg = messages[status];
    if (msg) {
      await notificationService.sendToUser(user._id, {
        type: "account_status",
        ...msg,
      });
    }
  }

  /**
   * Notify vendor of status change
   * @private
   */
  async _notifyVendorStatusChange(vendor, vendorStatus, rejectionReason) {
    const frontendUrl = config.frontend.url;

    if (vendorStatus === VENDOR_STATUS.APPROVED) {
      await notificationService.sendToUser(vendor._id, {
        type: "vendor_approved",
        title: "Account Approved!",
        titleAr: "تم قبول حسابك!",
        message: "Congratulations! Your vendor account has been approved.",
        messageAr: "تهانينا! تم قبول حسابك كمزود خدمة.",
        actionUrl: `${frontendUrl}/ar/vendor-dashboard`,
      });

      if (vendor.email) {
        await emailModule.send.vendorApproval(
          vendor.email,
          {
            vendorName: vendor.profile?.vendorData?.brandName || vendor.name,
            ownerName: vendor.profile?.vendorData?.ownerFullName || vendor.name,
            status: VENDOR_STATUS.APPROVED,
            dashboardUrl: `${frontendUrl}/ar/vendor-dashboard`,
          },
          "ar"
        );
      }
    } else if (vendorStatus === VENDOR_STATUS.REJECTED) {
      await notificationService.sendToUser(vendor._id, {
        type: "vendor_rejected",
        title: "Account Not Approved",
        titleAr: "لم يتم قبول الحساب",
        message: rejectionReason
          ? `Your vendor account was not approved. Reason: ${rejectionReason}`
          : "Your vendor account was not approved.",
        messageAr: rejectionReason
          ? `لم يتم قبول حسابك. السبب: ${rejectionReason}`
          : "لم يتم قبول حسابك كمزود خدمة.",
      });
    }
  }
}

module.exports = new UsersService();
