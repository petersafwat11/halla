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
const RefreshToken = require('../../../models/RefreshTokenModel');

// Import existing services
const otpService = require('./otp.service');
const notificationService = require('../notifications/notifications.service');
const emailModule = require('../../infrastructure/email');
const { normalizePhoneNumber, validateAndFormatPhone } = require('../../shared/utils/phone');
const { processUploadedFiles } = require('../../shared/utils/s3Upload');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

class AuthService {
  /**
   * Sign a short-lived access token.
   * @param {string} id - User ID
   * @param {string} [role] - User role
   * @returns {string} JWT
   */
  signAccessToken(id, role = null) {
    const payload = { id };
    if (role) payload.role = role;

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
  }

  /**
   * Hash a refresh token for at-rest storage. We never persist the raw token.
   * @param {string} raw
   * @returns {string} sha256 hex digest
   * @private
   */
  _hashRefresh(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Issue a fresh access + refresh token pair, persisting the refresh hash.
   *
   * @param {Object} user           - User document (must have _id and role)
   * @param {Object} [context]      - Optional request context for audit
   * @param {string} [context.ip]
   * @param {string} [context.userAgent]
   * @returns {Promise<{ accessToken: string, refreshToken: string, refreshTokenId: string, expiresAt: Date }>}
   */
  async issueTokenPair(user, context = {}) {
    const accessToken = this.signAccessToken(user._id, user.role);
    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + config.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000
    );
    const stored = await RefreshToken.create({
      userId: user._id,
      tokenHash: this._hashRefresh(rawRefresh),
      expiresAt,
      userAgent: context.userAgent || '',
      ip: context.ip || '',
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      refreshTokenId: stored._id,
      expiresAt,
    };
  }

  /**
   * Rotate a refresh token.
   * - Validates the incoming raw refresh token against the stored hash.
   * - On success, marks the old token revoked and issues a new pair.
   * - On a replay (already-revoked token presented again) revokes every
   *   refresh token belonging to the user — replay = forced logout.
   *
   * @param {string} rawRefresh
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
   */
  async rotateRefreshToken(rawRefresh, context = {}) {
    if (!rawRefresh) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const tokenHash = this._hashRefresh(rawRefresh);

    // Rotation must be atomic. A find→check→issue→save sequence would let
    // two parallel /auth/refresh calls both pass the `revokedAt == null`
    // check and both issue new pairs without triggering replay detection.
    // findOneAndUpdate atomically claims (and revokes) the row only if it
    // is still active. A null result means somebody already claimed it →
    // REPLAY, and we revoke every refresh token for the user.
    const claimed = await RefreshToken.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: false } // we want the pre-update doc so we can read userId/expiresAt
    );

    if (!claimed) {
      // Either the token never existed, or it was already revoked. To
      // distinguish replay from "never existed" we do a follow-up read.
      // Either way the safe response is 401; if the row exists with
      // revokedAt set, that is a replay and we revoke the user's family.
      const replayed = await RefreshToken.findOne({ tokenHash });
      if (replayed) {
        await this.revokeAllForUser(replayed.userId);
        throw new UnauthorizedError('Refresh token reuse detected — all sessions revoked');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (claimed.expiresAt.getTime() <= Date.now()) {
      // We already revoked it above. Nothing else to do.
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await User.findById(claimed.userId);
    if (!user) {
      await this.revokeAllForUser(claimed.userId);
      throw new UnauthorizedError('User no longer exists');
    }

    // Block status checks (kept consistent with login)
    this._validateUserStatus(user);

    const fresh = await this.issueTokenPair(user, context);

    // Backfill the audit pointer on the now-revoked old row.
    await RefreshToken.updateOne(
      { _id: claimed._id },
      { $set: { replacedBy: fresh.refreshTokenId } }
    );

    return {
      user,
      accessToken: fresh.accessToken,
      refreshToken: fresh.refreshToken,
      expiresAt: fresh.expiresAt,
    };
  }

  /**
   * Revoke a single refresh token (called from /auth/logout).
   * Idempotent — no error if the token is already gone.
   * @param {string} rawRefresh
   */
  async revokeRefreshToken(rawRefresh) {
    if (!rawRefresh) return;
    const tokenHash = this._hashRefresh(rawRefresh);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  /**
   * Revoke every refresh token for a user.
   * Used by password reset, password update, and replay detection.
   * @param {string} userId
   */
  async revokeAllForUser(userId) {
    if (!userId) return;
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  /**
   * Sanitize user object for response
   * @param {Object} user - User document
   * @returns {Object} Safe user object
   */
  async sanitizeUser(user) {
    if (user.toPublicJSON) {
      return await user.toPublicJSON();
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
    // findActiveForUser returns deterministic ordering with expiry filtering.
    // A direct findOne() would let a stale active row (status flip pending)
    // win over the most recent one.
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;
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
   * @param {Object} [context]   - { ip, userAgent } passed to the refresh-token row
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string, subscription: Object|null}>}
   */
  async login(credentials, context = {}) {
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
      logAudit({ action: 'auth.login_locked', actor: { _id: user._id, role: user.role }, targetType: 'user', targetId: user._id, metadata: { ip: context.ip, lockUntil: user.lockUntil }, status: 'failure' }).catch(() => {});
      throw new AccountLockedError(remainingMinutes);
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      }
      // Audit: login failure
      logAudit({ action: 'auth.login_failed', actor: { _id: user._id, role: user.role }, targetType: 'user', targetId: user._id, metadata: { ip: context.ip, reason: 'invalid_password' }, status: 'failure' }).catch(() => {});
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

    // Audit: login success
    logAudit({ action: 'auth.login', actor: { _id: user._id, role: user.role }, targetType: 'user', targetId: user._id, metadata: { ip: context.ip, userAgent: context.userAgent } }).catch(() => {});

    // Issue token pair and get subscription
    const tokens = await this.issueTokenPair(user, context);
    const subscription = await this.getUserSubscription(user._id);

    return {
      user: await this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string, subscription: Object}>}
   */
  async signupHost(userData, context = {}) {
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
    // notificationPreferences.appNotifications seeds every toggle as on so
    // a new host receives every in-app notification by default. They can
    // opt out per-channel from Settings → Notifications.
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
      notificationPreferences: {
        appNotifications: {
          eventUpdates: true,
          eventReminders: true,
          guestResponses: true,
          guestCheckIns: true,
          subscriptionAlerts: true,
          systemUpdates: true,
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
    this._notifyAdminsNewUser(host, ROLES.HOST).catch((err) =>
      logger.error('host signup: notify admins failed', err)
    );

    // Send welcome notification to new host (non-blocking)
    notificationService.sendToUser(host._id, {
      type: 'welcome',
      title: 'Welcome to Halaa!',
      titleAr: 'مرحباً بك في هلا!',
      message: 'Your account has been created successfully. Start creating your first event!',
      messageAr: 'تم إنشاء حسابك بنجاح. ابدأ في إنشاء أول مناسبة لك!',
      data: { entityType: 'user', entityId: host._id },
    }).catch((err) => logger.error('host signup: welcome notification failed', err));

    if (host.email) {
      const lang = context.lang || 'ar';
      otpService.createEmailVerificationToken(host.email, host._id)
        .then((rawToken) => {
          const verificationUrl = `${config.frontend.url}/${lang}/verify-email?token=${rawToken}`;
          return emailModule.send.emailVerification(host.email, {
            name: host.name || host.username,
            verificationUrl,
            expiresIn: '24 hours',
          }, lang);
        })
        .catch((err) => logger.error('host signup: email verification send failed', err));
    }

    if (host.email) {
      emailModule.send.welcome(host.email, {
        name: host.name || host.username,
        email: host.email,
        role: ROLES.HOST,
      }, context.lang || 'ar').catch((err) =>
        logger.error('host signup: welcome email failed', err)
      );
    }

    const tokens = await this.issueTokenPair(host, context);
    await subscription.populate('planId');

    return {
      user: await this.sanitizeUser(host),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

     const normalizedPhone = normalizePhoneNumber(phoneNumber);
     await this._checkDuplicates(email, normalizedPhone);

    // Parse JSON fields
    const serviceCategories = this._parseJsonField(userData.serviceCategories);
    const serviceLocation = this._parseJsonField(userData.serviceLocation);
    const socialLinks = this._parseJsonField(userData.socialLinks);

    // validate serviceCategories keys against allowed enum
    const ALLOWED_CATEGORY_KEYS = new Set([
      'eventPlanning', 'mediaProduction', 'giftsAndGiveaways', 'foodAndBeverages',
      'beautyAndFashion', 'logisticsAndDelivery', 'corporateServices', 'supportServices',
      'technicalServices', 'soundLightingEntertainment', 'hallsAndVenues',
    ]);
    if (serviceCategories && typeof serviceCategories === 'object') {
      const invalidKeys = Object.keys(serviceCategories).filter(k => !ALLOWED_CATEGORY_KEYS.has(k));
      if (invalidKeys.length > 0) {
        throw new ValidationError(`Invalid service category keys: ${invalidKeys.join(', ')}`);
      }
    }

    // Validate social links as URLs; WhatsApp is a phone number, not a URL.
    if (socialLinks && typeof socialLinks === 'object') {
      const URL_FIELDS = ['instagram', 'facebook', 'tiktok', 'twitter', 'website'];
      const urlRegex = /^https?:\/\/.+/i;
      for (const field of URL_FIELDS) {
        if (socialLinks[field] && !urlRegex.test(socialLinks[field])) {
          throw new ValidationError(`Invalid URL for social link: ${field}`);
        }
      }
      if (socialLinks.whatsapp) {
        const parsedWhatsApp = validateAndFormatPhone(socialLinks.whatsapp);
        if (!parsedWhatsApp.isValid) {
          throw new ValidationError(parsedWhatsApp.error || 'Invalid WhatsApp number');
        }
        socialLinks.whatsapp = parsedWhatsApp.formatted;
      }
    }

    const vendorData = {
      brandName,
      ownerFullName,
      vendorStatus: VENDOR_STATUS.PENDING,
      serviceDescription: userData.serviceDescription || '',
      taglineAr: userData.taglineAr || '',
      taglineEn: userData.taglineEn || '',
      aboutAr: userData.aboutAr || '',
      aboutEn: userData.aboutEn || '',
      serviceCategories,
      serviceLocation,
      socialLinks,
      otherData: userData.otherData || '',
      nationalId: userData.nationalId || '',
      commercialRecordNumber: userData.commercialRecordNumber || '',
    };

    // Handle file uploads via S3 utility
    const uploadedPaths = processUploadedFiles(files);
    if (uploadedPaths.businessLogo) vendorData.businessLogo = uploadedPaths.businessLogo;
    if (uploadedPaths.nationalIdImage) vendorData.nationalIdImage = uploadedPaths.nationalIdImage;
    if (uploadedPaths.commercialRecordImage) vendorData.commercialRecordImage = uploadedPaths.commercialRecordImage;
    if (uploadedPaths.portfolioImages) vendorData.portfolioImages = uploadedPaths.portfolioImages;

     const vendor = await User.create({
       email: email.toLowerCase(),
       phoneNumber: normalizedPhone,
       password,
       username: brandName.replace(/\s+/g, '_').toLowerCase(),
       name: ownerFullName,
       role: ROLES.VENDOR,
       status: USER_STATUS.PENDING,
       profile: { vendorData },
     });

    // Notifications
    this._notifyAdminsNewVendor(vendor, brandName, ownerFullName).catch((err) =>
      logger.error('vendor signup: notify admins failed', err)
    );
    if (email) {
      emailModule.send.vendorApplicationPending(email, {
        vendorName: ownerFullName,
        brandName,
        email,
      }).catch((err) =>
        logger.error('vendor signup: pending email failed', err)
      );
    }

    logAudit({
      action: 'vendor_signup',
      actor: vendor._id,
      targetType: 'User',
      targetId: vendor._id,
      metadata: { brandName, ownerFullName, email },
      status: 'success',
    }).catch((err) => logger.error('vendor signup: audit log failed', err));

    return {
      user: await this.sanitizeUser(vendor),
      token: null,
      pendingApproval: true,
    };
  }


  // ============================================
  // EMAIL VERIFICATION LINK
  // ============================================

  /**
   * Redeem a link-based email verification token sent at host signup.
   * Public endpoint — no JWT required.
   * @param {string} rawToken - Token from the verification link query param
   * @returns {Promise<{message: string}>}
   */
  async verifyEmailLink(rawToken) {
    if (!rawToken) {
      const err = new ValidationError('Verification token is required');
      err.code = 'VERIFICATION_TOKEN_MISSING';
      throw err;
    }

    const result = await otpService.redeemEmailVerificationToken(rawToken);
    if (!result.success) {
      // Surface a stable code so the client can show a "request a new link"
      // affordance instead of a dead-end error.
      const err = new ValidationError('Verification link is invalid or has expired.');
      err.code = 'VERIFICATION_LINK_EXPIRED';
      throw err;
    }

    const user = await User.findById(result.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    user.emailVerified = true;
    if (user.profile?.hostData) {
      user.profile.hostData.emailVerified = true;
    }
    await user.save({ validateBeforeSave: false });

    logAudit({
      action: 'user.email_verified',
      actor: { _id: user._id, role: user.role },
      targetType: 'user',
      targetId: user._id,
    }).catch(() => {});

    return { message: 'Email verified successfully' };
  }

  /**
   * Public resend of the email verification link.
   * Anti-enumeration: always returns the same generic success response,
   * whether or not the email maps to a real, unverified user. The caller
   * must rate-limit this endpoint by IP + email.
   *
   * @param {string} email
   * @param {string} [language='ar']
   * @returns {Promise<{message: string}>}
   */
  async resendEmailVerificationLink(email, language = 'ar') {
    const genericResponse = {
      message: 'If that email needs verification, a new link has been sent.',
    };

    if (!email) return genericResponse;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.emailVerified) return genericResponse;

    const lang = user.preferredLanguage || language;

    try {
      const rawToken = await otpService.createEmailVerificationToken(user.email, user._id);
      const verificationUrl = `${config.frontend.url}/${lang}/verify-email?token=${rawToken}`;
      await emailModule.send.emailVerification(user.email, {
        name: user.name || user.username,
        verificationUrl,
        expiresIn: '24 hours',
      }, lang);
    } catch (err) {
      logger.error('resendEmailVerificationLink: send failed', err);
    }

    return genericResponse;
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
      throw new OTPError(result.errorType || 'send_failed', null, result.meta);
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
      // Resend cooldown — clients sync their UI timer to this so the
      // "Resend code" button isn't enabled before the backend will allow it.
      cooldownSeconds: otpService.OTP_CONFIG.cooldownSeconds,
    };
  }

  /**
   * Send OTP for login
   * @param {string} phoneNumber
   * @returns {Promise<{phoneNumber: string, expiresIn: number, cooldownSeconds: number}>}
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
      throw new OTPError(result.errorType || 'send_failed', null, result.meta);
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
      cooldownSeconds: otpService.OTP_CONFIG.cooldownSeconds,
    };
  }

  /**
   * Verify OTP and complete signup
   * @param {string} phoneNumber
   * @param {string} otp
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string, subscription: Object, isNewUser: boolean}>}
   */
  async verifySignupOTP(phoneNumber, otp, context = {}) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const verifyResult = await otpService.verifyOTP(normalizedPhone, otp);
    if (!verifyResult.success) {
      throw new OTPError(verifyResult.errorType || 'invalid', null, verifyResult.meta);
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
        notificationPreferences: {
          appNotifications: {
            eventUpdates: true,
            eventReminders: true,
            guestResponses: true,
            guestCheckIns: true,
            subscriptionAlerts: true,
            systemUpdates: true,
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

    this._notifyAdminsNewUser(user, ROLES.HOST).catch((err) =>
      logger.error('signup OTP verify: notify admins failed', err)
    );

    // Send welcome notification to new user (non-blocking)
    notificationService.sendToUser(user._id, {
      type: 'welcome',
      title: 'Welcome to Halaa!',
      titleAr: 'مرحباً بك في هلا!',
      message: 'Your account has been created successfully. Start creating your first event!',
      messageAr: 'تم إنشاء حسابك بنجاح. ابدأ في إنشاء أول مناسبة لك!',
      data: { entityType: 'user', entityId: user._id },
    }).catch((err) =>
      logger.error('signup OTP verify: welcome notification failed', err)
    );

    const tokens = await this.issueTokenPair(user, context);

    logAudit({
      action: 'signup_otp_verified',
      actor: user._id,
      targetType: 'User',
      targetId: user._id,
      metadata: { phoneNumber: normalizedPhone },
      status: 'success',
      ip: context.ip,
      userAgent: context.userAgent,
    }).catch((err) => logger.error('signup OTP verify: audit log failed', err));

    return {
      user: await this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      subscription: subscription.getSummary ? subscription.getSummary() : subscription,
      isNewUser: true,
      profileCompleted: false,
    };
  }

  /**
   * Verify OTP and login
   * @param {string} phoneNumber
   * @param {string} otp
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string, subscription: Object|null}>}
   */
  async verifyLoginOTP(phoneNumber, otp, context = {}) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const verifyResult = await otpService.verifyOTP(normalizedPhone, otp);
    if (!verifyResult.success) {
      throw new OTPError(verifyResult.errorType || 'invalid', null, verifyResult.meta);
    }

    const user = await User.findOne({ phoneNumber: normalizedPhone }).populate({
      path: 'subscription',
      populate: { path: 'planId' },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    this._validateUserStatus(user);

    const tokens = await this.issueTokenPair(user, context);
    const profileCompleted = user.profile?.hostData?.profileCompleted ?? false; // missing hostData ≠ complete
    const subscriptionInfo = user.subscription?.getSummary
      ? user.subscription.getSummary()
      : user.subscription;

    return {
      user: await this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
      throw new OTPError(result.errorType || 'send_failed', null, result.meta);
    }

    return {
      phoneNumber: normalizedPhone,
      expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60,
      cooldownSeconds: otpService.OTP_CONFIG.cooldownSeconds,
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
        expiresIn: '1 hour',
      },
      lang
    );

    return { message: 'Reset link sent to your email' };
  }

  /**
   * Reset password with token. Clears the lockout and revokes refresh tokens.
   * @param {string} token
   * @param {string} password
   * @param {string} passwordConfirm
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string}>}
   */
  async resetPassword(token, password, passwordConfirm, context = {}) {
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
      const err = new ValidationError('Token is invalid or has expired');
      err.code = 'TOKEN_INVALID_OR_EXPIRED';
      throw err;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000;
    // a successful password reset proves identity, so unlock the account.
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // invalidate every existing session before issuing a new pair.
    await this.revokeAllForUser(user._id);
    const tokens = await this.issueTokenPair(user, context);

    logAudit({ action: 'auth.password_reset', actor: { _id: user._id, role: user.role }, targetType: 'user', targetId: user._id, metadata: { ip: context.ip } }).catch(() => {});

    return {
      user: await this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Update password (logged in user). Revokes all existing refresh tokens.
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @param {string} passwordConfirm
   * @param {Object} [context] - { ip, userAgent }
   * @returns {Promise<{user: Object, accessToken: string, refreshToken: string}>}
   */
  async updatePassword(userId, currentPassword, newPassword, passwordConfirm, context = {}) {
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

    // a password change must invalidate all other sessions immediately.
    await this.revokeAllForUser(user._id);
    const tokens = await this.issueTokenPair(user, context);

    logAudit({ action: 'auth.password_changed', actor: { _id: user._id, role: user.role }, targetType: 'user', targetId: user._id, metadata: { ip: context.ip } }).catch(() => {});

    return {
      user: await this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationCode -emailVerificationExpires')
      .populate({
        path: 'subscription',
        select: 'status planId currentPeriodEnd trialEndsAt cancelAtPeriodEnd',
        populate: { path: 'planId', select: 'code name price billingCycle features' },
      });

    if (!user) {
      throw new NotFoundError('User');
    }

    const subscriptionInfo = user.subscription?.getSummary
      ? user.subscription.getSummary()
      : null;

    return {
      user: await this.sanitizeUser(user),
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

    logAudit({
      action: 'profile_completed',
      actor: user._id,
      targetType: 'User',
      targetId: user._id,
      metadata: { username: user.username, email: user.email },
      status: 'success',
    }).catch((err) => logger.error('complete profile: audit log failed', err));

    return await this.sanitizeUser(user);
  }

  /**
   * Send a 6-digit email verification code to the user's email.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async sendEmailVerificationCode(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (!user.email) {
      throw new ValidationError('No email address to verify');
    }
    if (user.emailVerified) {
      throw new ValidationError('Email is already verified');
    }

    const code = user.createEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    await emailModule({
      email: user.email,
      subject: 'Email Verification Code',
      message: `<h2>Email Verification</h2><p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
    });
  }

  /**
   * Verify the user's email using the 6-digit code.
   * @param {string} userId
   * @param {string} code
   * @returns {Promise<void>}
   */
  async verifyEmail(userId, code) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.verifyEmailCode(code)) {
      throw new ValidationError('Invalid or expired verification code');
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;

    if (user.profile?.hostData) {
      user.profile.hostData.emailVerified = true;
    }

    await user.save({ validateBeforeSave: false });
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

}

module.exports = new AuthService();
