/**
 * Auth Service
 * Business logic for authentication - NO HTTP concerns
 * @module modules/auth/auth.service
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const {
  ROLES,
  USER_STATUS,
  VENDOR_STATUS,
  SUBSCRIPTION_STATUS
} = require('../../shared/constants');
const {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  NotFoundError,
  AccountStatusError,
  AccountLockedError,
  OTPError,
} = require('../../shared/errors');

// Import existing models (keep using old models during migration)
const User = require('../../../models/UserModel');
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');

// Import existing services
const otpService = require('./otp.service');
const notificationService = require('../notifications/notifications.service');
const emailModule = require('../../infrastructure/email');
const { normalizePhoneNumber } = require('../../shared/utils/phone');

class AuthService {
  /**
   * Sign JWT token
   * @param {string} id - User ID
   * @param {string} [role] - User role
   * @returns {string} JWT token
   */
  signToken(id, role = null) {
    const payload = { id };
    if (role) payload.role = role;

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Sanitize user object for response
   * @param {Object} user - User document
   * @returns {Object} Safe user object
   */
  sanitizeUser(user) {
    if (user.toPublicJSON) {
      return user.toPublicJSON();
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    delete userObj.emailVerificationCode;
    delete userObj.emailVerificationExpires;
    delete userObj.otp;
    delete userObj.otpExpires;
    delete userObj.__v;

    return userObj;
  }

  /**
   * Get user subscription summary
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Subscription summary
   */
  async getUserSubscription(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] }
    }).populate('planId');

    if (!subscription) return null;

    return subscription.getSummary ? subscription.getSummary() : subscription;
  }

  // ============================================
  // LOGIN METHODS
  // ============================================

  /**
   * Login with email/phone and password
   * @param {Object} credentials
   * @param {string} [credentials.email]
   * @param {string} [credentials.phoneNumber]
   * @param {string} credentials.password
   * @returns {Promise<{user: Object, token: string, subscription: Object|null}>}
   */
  async login(credentials) {
    const { email, phoneNumber, password } = credentials;

    if ((!email && !phoneNumber) || !password) {
      throw new ValidationError('Email/phone and password are required');
    }

    // Find user
    const query = email
      ? { email: email.toLowerCase() }
      : { phoneNumber };

    const user = await User.findOne(query).select('+password +loginAttempts +lockUntil');

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new AccountLockedError(remainingMinutes);
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
      });
    }

    // Check user status
    this._validateUserStatus(user);

    // Generate token and get subscription
    const token = this.signToken(user._id, user.role);
    const subscription = await this.getUserSubscription(user._id);

    return {
      user: this.sanitizeUser(user),
      token,
      subscription,
    };
  }

  /**
   * Validate user status for login
   * @param {Object} user
   * @throws {AccountStatusError}
   * @private
   */
  _validateUserStatus(user) {
    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AccountStatusError('suspended');
    }

    if (user.status === USER_STATUS.INACTIVE) {
      throw new AccountStatusError('inactive');
    }

    // Vendor-specific checks
    if (user.role === ROLES.VENDOR) {
      const vendorStatus = user.profile?.vendorData?.vendorStatus;
      if (vendorStatus === VENDOR_STATUS.PENDING) {
        throw new AccountStatusError('pending');
      }
      if (vendorStatus === VENDOR_STATUS.REJECTED) {
        throw new AccountStatusError('rejected');
      }
    }
  }

  // ============================================
  // SIGNUP METHODS
  // ============================================

  /**
   * Check for duplicate email/phone
   * @param {string} email
   * @param {string} phoneNumber
   * @param {string} [excludeUserId]
   * @throws {ConflictError}
   * @private
   */
  async _checkDuplicates(email, phoneNumber, excludeUserId = null) {
    const query = {
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    };

    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUsers = await User.find(query).limit(2);

    if (existingUsers.length === 0) return;

    const emailDup = email && existingUsers.some(u => u.email === email.toLowerCase());
    const phoneDup = phoneNumber && existingUsers.some(u => u.phoneNumber === phoneNumber);

    if (emailDup && phoneDup) {
      throw new ConflictError('This email and phone number are already registered', 'email_and_phone');
    }
    if (emailDup) {
      throw new ConflictError('This email is already registered', 'email');
    }
    if (phoneDup) {
      throw new ConflictError('This phone number is already registered', 'phone');
    }
  }

  /**
   * Host signup
   * @param {Object} userData
   * @returns {Promise<{user: Object, token: string, subscription: Object}>}
   */
  async signupHost(userData) {
    const { email, phoneNumber, password, username, name } = userData;

    if (!phoneNumber) {
      throw new ValidationError('Phone number is required');
    }

    // Validate phone
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new ValidationError('Invalid phone number format');
    }

    // Check duplicates
    await this._checkDuplicates(email, normalizedPhone);

    // Create host
    const host = await User.create({
      email: email?.toLowerCase(),
      phoneNumber: normalizedPhone,
      password,
      username: username || `host_${normalizedPhone.slice(-6)}`,
      name,
      role: ROLES.HOST,
      status: USER_STATUS.ACTIVE,
      profile: {
        hostData: {
          profileCompleted: false,
          emailVerified: false,
        },
      },
    });

    // Create trial subscription
    const trialPlan = await Plan.getOrCreateByCode('trial');
    const subscription = await Subscription.createForUser(host._id, trialPlan._id, {
      status: SUBSCRIPTION_STATUS.TRIAL,
    });

    host.subscription = subscription._id;
    await host.save({ validateBeforeSave: false });

    // Send admin notification (non-blocking)
    this._notifyAdminsNewUser(host, ROLES.HOST).catch(console.error);

    // Send welcome notification to new host (non-blocking)
    notificationService.sendToUser(host._id, {
      type: 'welcome',
      title: 'Welcome to Labbe!',
      titleAr: 'مرحباً بك في لبّي!',
      message: 'Your account has been created successfully. Start creating your first event!',
      messageAr: 'تم إنشاء حسابك بنجاح. ابدأ في إنشاء أول مناسبة لك!',
      data: { entityType: 'user', entityId: host._id },
    }).catch(console.error);

    const token = this.signToken(host._id, host.role);
    await subscription.populate('planId');

    return {
      user: this.sanitizeUser(host),
      token,
      subscription: subscription.getSummary ? subscription.getSummary() : subscription,
    };
  }

  /**
   * Vendor signup
   * @param {Object} userData
   * @param {Object} files - Uploaded files
   * @returns {Promise<{user: Object, token: string}>}
   */
  async signupVendor(userData, files = {}) {
    const { email, phoneNumber, password, brandName, ownerFullName } = userData;

    if (!phoneNumber || !email) {
      throw new ValidationError('Email and phone number are required');
    }

    if (!brandName || !ownerFullName) {
      throw new ValidationError('Brand name and owner name are required');
    }

    await this._checkDuplicates(email, phoneNumber);

    // Parse JSON fields
    const serviceCategories = this._parseJsonField(userData.serviceCategories);
    const serviceLocation = this._parseJsonField(userData.serviceLocation);
    const socialLinks = this._parseJsonField(userData.socialLinks);

    const vendorData = {
      brandName,
      ownerFullName,
      vendorStatus: VENDOR_STATUS.PENDING,
      serviceDescription: userData.serviceDescription || '',
      serviceCategories,
      serviceLocation,
      socialLinks,
      otherData: userData.otherData || '',
      nationalId: userData.nationalId || '',
      commercialRecordNumber: userData.commercialRecordNumber || '',
    };

    // Handle file uploads
    if (files.businessLogo?.[0]) {
      vendorData.businessLogo = `/uploads/logos/${files.businessLogo[0].filename}`;
    }
    if (files.nationalIdImage?.[0]) {
      vendorData.nationalIdImage = `/uploads/documents/${files.nationalIdImage[0].filename}`;
    }
    if (files.commercialRecordImage?.[0]) {
      vendorData.commercialRecordImage = `/uploads/documents/${files.commercialRecordImage[0].filename}`;
    }
    if (files.portfolioImages?.length) {
      vendorData.portfolioImages = files.portfolioImages.map(f => `/uploads/portfolios/${f.filename}`);
    }

    const vendor = await User.create({
      email: email.toLowerCase(),
      phoneNumber,
      password,
      username: brandName.replace(/\s+/g, '_').toLowerCase(),
      name: ownerFullName,
      role: ROLES.VENDOR,
      status: USER_STATUS.PENDING,
      profile: { vendorData },
    });

    // Notifications
    this._notifyAdminsNewVendor(vendor, brandName, ownerFullName).catch(console.error);
    if (email) {
      emailModule.send.vendorApplicationPending(email, {
        vendorName: ownerFullName,
        brandName,
        email,
      }).catch(console.error);
    }

    return {
      user: this.sanitizeUser(vendor),
      token: null,
      pendingApproval: true,
    };
  }

  /**
   * Whitelabel signup
   * @param {Object} userData
   * @returns {Promise<{user: Object, token: string}>}
   */
  async signupWhitelabel(userData) {
    const { email, phoneNumber, englishName, arabicName, planSelection } = userData;

    if (!phoneNumber && !email) {
      throw new ValidationError('Email or phone number is required');
    }

    await this._checkDuplicates(email, phoneNumber);

    const requirements = this._parseJsonField(userData.requirements);
    const address = this._parseJsonField(userData.address);
    const parsedPlanSelection = this._parseJsonField(planSelection);

    const whitelabelData = {
      englishName,
      arabicName,
      platformName: userData.platformName || englishName,
      companyName: userData.companyName || arabicName,
      requirements,
      address,
      licenseNumber: userData.licenseNumber || '',
      taxNumber: userData.taxNumber || '',
      planSelection: {
        planCode: parsedPlanSelection?.planCode || 'business_quarterly',
        billingCycle: parsedPlanSelection?.billingCycle || 'yearly',
      },
      applicationStatus: VENDOR_STATUS.PENDING,
    };

    // Generate temp password
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const whitelabel = await User.create({
      email: email?.toLowerCase(),
      phoneNumber,
      password: tempPassword,
      username: englishName?.replace(/\s+/g, '_').toLowerCase() || `wl_${Date.now()}`,
      name: arabicName || englishName,
      role: ROLES.WHITELABEL_ADMIN,
      status: USER_STATUS.PENDING,
      profile: { whitelabelData },
    });

    whitelabel.whitelabelId = whitelabel._id;
    await whitelabel.save({ validateBeforeSave: false });

    // Notifications
    this._notifyAdminsNewWhitelabel(whitelabel, englishName, arabicName).catch(console.error);
    if (email) {
      const planName = parsedPlanSelection?.planCode || 'Business';
      emailModule.send.whitelabelApplicationPending(email, {
        platformName: englishName || arabicName,
        email,
        planName,
      }).catch(console.error);
    }

    return {
      user: this.sanitizeUser(whitelabel),
      token: null,
      pendingApproval: true,
    };
  }

  // ============================================
  // OTP METHODS
  // ============================================

  /**
   * Send OTP for signup
   * @param {string} phoneNumber
   * @returns {Promise<{phoneNumber: string, expiresIn: number}>}
   */
  async sendSignupOTP(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new ValidationError('Invalid phone number format');
    }

    // Check if user exists
    const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
    if (existingUser) {
      throw new ConflictError('An account with this phone number already exists', 'phone');
    }

    // Send OTP
    const result = await otpService.sendOTP(normalizedPhone);

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to send OTP');
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
    };
  }

  /**
   * Send OTP for login
   * @param {string} phoneNumber
   * @returns {Promise<{phoneNumber: string, expiresIn: number}>}
   */
  async sendLoginOTP(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const user = await User.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      throw new NotFoundError('No account found with this phone number');
    }

    this._validateUserStatus(user);

    const result = await otpService.sendOTP(normalizedPhone);
    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to send OTP');
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
    };
  }

  /**
   * Verify OTP and complete signup
   * @param {string} phoneNumber
   * @param {string} otp
   * @returns {Promise<{user: Object, token: string, subscription: Object, isNewUser: boolean}>}
   */
  async verifySignupOTP(phoneNumber, otp) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const verifyResult = await otpService.verifyOTP(normalizedPhone, otp);
    if (!verifyResult.success) {
      throw new OTPError('invalid', verifyResult.error);
    }

    // Check if user already exists
    let user = await User.findOne({ phoneNumber: normalizedPhone });
    if (user) {
      throw new ConflictError('An account with this phone number already exists', 'phone');
    }

    // Create new host
    try {
      user = await User.create({
        phoneNumber: normalizedPhone,
        username: `host_${normalizedPhone.slice(-6)}`,
        role: ROLES.HOST,
        status: USER_STATUS.ACTIVE,
        profile: {
          hostData: {
            profileCompleted: false,
            phoneVerified: true,
          },
        },
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('An account with this phone number already exists', 'phone');
      }
      throw err;
    }

    // Create trial subscription
    const trialPlan = await Plan.getOrCreateByCode('trial');
    const subscription = await Subscription.createForUser(user._id, trialPlan._id, {
      status: SUBSCRIPTION_STATUS.TRIAL,
    });

    user.subscription = subscription._id;
    await user.save({ validateBeforeSave: false });
    await subscription.populate('planId');

    this._notifyAdminsNewUser(user, ROLES.HOST).catch(console.error);

    // Send welcome notification to new user (non-blocking)
    notificationService.sendToUser(user._id, {
      type: 'welcome',
      title: 'Welcome to Labbe!',
      titleAr: 'مرحباً بك في لبّي!',
      message: 'Your account has been created successfully. Start creating your first event!',
      messageAr: 'تم إنشاء حسابك بنجاح. ابدأ في إنشاء أول مناسبة لك!',
      data: { entityType: 'user', entityId: user._id },
    }).catch(console.error);

    const token = this.signToken(user._id, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
      subscription: subscription.getSummary ? subscription.getSummary() : subscription,
      isNewUser: true,
      profileCompleted: false,
    };
  }

  /**
   * Verify OTP and login
   * @param {string} phoneNumber
   * @param {string} otp
   * @returns {Promise<{user: Object, token: string, subscription: Object|null}>}
   */
  async verifyLoginOTP(phoneNumber, otp) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const verifyResult = await otpService.verifyOTP(normalizedPhone, otp);
    if (!verifyResult.success) {
      throw new OTPError('invalid', verifyResult.error);
    }

    const user = await User.findOne({ phoneNumber: normalizedPhone }).populate({
      path: 'subscription',
      populate: { path: 'planId' },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    this._validateUserStatus(user);

    const token = this.signToken(user._id, user.role);
    const profileCompleted = user.profile?.hostData?.profileCompleted ?? true;
    const subscriptionInfo = user.subscription?.getSummary
      ? user.subscription.getSummary()
      : user.subscription;

    return {
      user: this.sanitizeUser(user),
      token,
      subscription: subscriptionInfo,
      isNewUser: false,
      profileCompleted,
    };
  }

  /**
   * Resend OTP
   * @param {string} phoneNumber
   * @param {string} type - 'signup' or 'login'
   * @returns {Promise<{phoneNumber: string, expiresIn: number}>}
   */
  async resendOTP(phoneNumber, type) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (type === 'login') {
      const user = await User.findOne({ phoneNumber: normalizedPhone });
      if (!user) {
        throw new NotFoundError('No account found with this phone number');
      }
    }

    if (type === 'signup') {
      const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
      if (existingUser) {
        throw new ConflictError('An account with this phone number already exists', 'phone');
      }
    }

    const result = await otpService.resendOTP(normalizedPhone);
    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to resend OTP');
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
    };
  }

  // ============================================
  // PASSWORD METHODS
  // ============================================

  /**
   * Request password reset
   * @param {string} email
   * @returns {Promise<{message: string}>}
   */
  async forgotPassword(email, language = 'ar') {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal whether email exists — return same success response
      return { message: 'If that email is registered, a reset link has been sent' };
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const lang = user.preferredLanguage || language;
    const resetURL = `${config.frontend.url}/${lang}/reset-password?token=${resetToken}`;

    await emailModule.send.passwordReset(
      user.email,
      {
        userName: user.name || user.username || 'User',
        resetUrl: resetURL,
        expiresIn: '10 minutes',
      },
      lang
    );

    return { message: 'Reset link sent to your email' };
  }

  /**
   * Reset password with token
   * @param {string} token
   * @param {string} password
   * @param {string} passwordConfirm
   * @returns {Promise<{user: Object, token: string}>}
   */
  async resetPassword(token, password, passwordConfirm) {
    if (password !== passwordConfirm) {
      throw new ValidationError('Passwords do not match');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ValidationError('Token is invalid or has expired');
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000;
    await user.save();

    const jwtToken = this.signToken(user._id, user.role);

    return {
      user: this.sanitizeUser(user),
      token: jwtToken,
    };
  }

  /**
   * Update password (logged in user)
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @param {string} passwordConfirm
   * @returns {Promise<{user: Object, token: string}>}
   */
  async updatePassword(userId, currentPassword, newPassword, passwordConfirm) {
    if (newPassword !== passwordConfirm) {
      throw new ValidationError('Passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User');
    }

    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now() - 1000;
    await user.save();

    const token = this.signToken(user._id, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  // ============================================
  // PROFILE METHODS
  // ============================================

  /**
   * Get current user with subscription
   * @param {string} userId
   * @returns {Promise<{user: Object, subscription: Object|null}>}
   */
  async getMe(userId) {
    const user = await User.findById(userId)
      .populate({
        path: 'subscription',
        populate: { path: 'planId' },
      })
      .populate('whitelabelId', 'identity domain status');

    if (!user) {
      throw new NotFoundError('User');
    }

    const subscriptionInfo = user.subscription?.getSummary
      ? user.subscription.getSummary()
      : null;

    return {
      user: this.sanitizeUser(user),
      subscription: subscriptionInfo,
    };
  }

  /**
   * Complete host profile
   * @param {string} userId
   * @param {Object} profileData
   * @returns {Promise<Object>}
   */
  async completeHostProfile(userId, profileData) {
    const { username, email, password, passwordConfirm } = profileData;

    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.HOST) {
      throw new NotFoundError('Host');
    }

    if (password && passwordConfirm) {
      if (password !== passwordConfirm) {
        throw new ValidationError('Passwords do not match');
      }
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
      }
      user.password = password;
    }

    if (username) user.username = username;
    if (email && !user.email) user.email = email.toLowerCase();

    if (!user.profile.hostData) {
      user.profile.hostData = {};
    }
    user.profile.hostData.profileCompleted = true;

    await user.save();

    return this.sanitizeUser(user);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Parse JSON field from FormData
   * @param {string|Object} field
   * @returns {Object}
   * @private
   */
  _parseJsonField(field) {
    if (!field) return {};
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch {
      return {};
    }
  }

  /**
   * Notify admins of new user registration
   * @private
   */
  async _notifyAdminsNewUser(user, role) {
    const frontendUrl = config.frontend.url;
    await notificationService.sendToAdmins({
      type: 'new_user',
      title: 'New Host Registered',
      titleAr: 'مضيف جديد مسجل',
      message: `New host "${user.name || user.phoneNumber}" has registered.`,
      messageAr: `تم تسجيل مضيف جديد "${user.name || user.phoneNumber}".`,
      actionUrl: `${frontendUrl}/ar/admin-dash/hosts/${user._id}`,
      data: {
        entityType: 'user',
        entityId: user._id,
        metadata: { userId: user._id, userName: user.name || user.username, userRole: role },
      },
    });
  }

  /**
   * Notify admins of new vendor application
   * @private
   */
  async _notifyAdminsNewVendor(vendor, brandName, ownerName) {
    const frontendUrl = config.frontend.url;
    await notificationService.sendToAdmins({
      type: 'vendor_registration',
      title: 'New Vendor Application',
      titleAr: 'طلب مزود خدمة جديد',
      message: `New vendor "${brandName}" has applied. Please review their application.`,
      messageAr: `تقدم مزود خدمة جديد "${brandName}". يرجى مراجعة الطلب.`,
      actionUrl: `${frontendUrl}/ar/admin-dash/vendors/${vendor._id}`,
      data: {
        entityType: 'user',
        entityId: vendor._id,
        metadata: { vendorId: vendor._id, brandName, ownerName },
      },
    });
  }

  /**
   * Notify admins of new whitelabel application
   * @private
   */
  async _notifyAdminsNewWhitelabel(whitelabel, englishName, arabicName) {
    const frontendUrl = config.frontend.url;
    await notificationService.sendToAdmins({
      type: 'whitelabel_application',
      title: 'New Whitelabel Application',
      titleAr: 'طلب علامة بيضاء جديد',
      message: `New whitelabel application from "${englishName || arabicName}". Please review.`,
      messageAr: `طلب علامة بيضاء جديد من "${arabicName || englishName}". يرجى المراجعة.`,
      actionUrl: `${frontendUrl}/ar/admin-dash/whitelabels/${whitelabel._id}`,
      data: {
        entityType: 'user',
        entityId: whitelabel._id,
        metadata: { whitelabelId: whitelabel._id, platformName: englishName || arabicName },
      },
    });
  }
}

module.exports = new AuthService();
