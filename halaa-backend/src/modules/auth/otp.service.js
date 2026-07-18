/**
 * OTP Service
 * Business logic for OTP generation, storage, and verification
 * Uses MongoDB OTPModel for persistence (works across multiple instances)
 * @module modules/auth/otp.service
 */

const crypto = require('crypto');
const taqnyat = require('../../infrastructure/taqnyat');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const logger = require('../../shared/utils/logger');
const OTP = require('../../../models/OTPModel');

const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  cooldownSeconds: 30,
};

const generateOTP = () => {
  // Cryptographically secure 6-digit code (crypto.randomInt is uniform and
  // unpredictable, unlike Math.random()).
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Fixed-OTP reviewer bypass — DISABLED IN PRODUCTION (§5.2 / decision D7).
 *
 * A fixed-OTP production bypass is an unnecessary risk: App Store / Google Play
 * reviewers sign in with dedicated email/password accounts (no OTP, no SMS, no
 * MFA — see scripts/seedReviewerAccounts.js), so the bypass is never needed in
 * a production build. It is hard-gated off when NODE_ENV==='production' even if
 * REVIEWER_TEST_PHONE/REVIEWER_TEST_OTP are set, and remains available only in
 * non-production for local QA of the phone-OTP flow.
 */
const isReviewerPhone = (normalizedPhone) => {
  if (process.env.NODE_ENV === 'production') return false;
  const rp = process.env.REVIEWER_TEST_PHONE;
  return !!rp && normalizePhoneNumber(rp) === normalizedPhone;
};

/**
 * Result shape:
 *   { success: true, ... }
 *   { success: false, errorType: 'cooldown'|'expired'|'invalid'|'max_attempts'|'not_found'|'send_failed', meta?: {...}, message? }
 *
 * Callers should re-throw as `new OTPError(errorType, message, meta)` so
 * the structured fields reach the client via the global error handler.
 * Never put internal provider error strings on `message` — those leak.
 */
const sendOTP = async (phoneNumber, lang = 'ar') => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Reviewer test number: never send a real SMS (the fixed OTP is verified
  // directly in verifyOTP). Avoids SMS cost/spam and works without a device.
  if (isReviewerPhone(normalizedPhone)) {
    return { success: true, messageId: 'reviewer-bypass' };
  }

  const recent = await OTP.findOne({ phoneNumber: normalizedPhone });
  if (recent && (Date.now() - recent.createdAt.getTime()) < OTP_CONFIG.cooldownSeconds * 1000) {
    const waitSeconds = Math.ceil(
      (OTP_CONFIG.cooldownSeconds * 1000 - (Date.now() - recent.createdAt.getTime())) / 1000
    );
    return {
      success: false,
      errorType: 'cooldown',
      meta: { waitSeconds },
    };
  }

  const otp = generateOTP();

  // Remove any existing OTP for this phone
  await OTP.deleteMany({ phoneNumber: normalizedPhone });

  // Store in MongoDB with TTL
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  await OTP.create({
    phoneNumber: normalizedPhone,
    otp: hashedOtp,
    expiresAt: new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000),
  });

  const messages = {
    ar: `رمز التحقق الخاص بك في Halaa هو: ${otp}\nصالح لمدة 5 دقائق.`,
    en: `Your Halaa verification code is: ${otp}\nValid for 5 minutes.`,
  };

  try {
    const result = await taqnyat.sendSMS(normalizedPhone, messages[lang] || messages.ar, {
      sender: 'HalaaApp',
      sensitive: true,
      logContext: { purpose: 'auth_otp', metadata: { language: lang } },
    });
    // taqnyat.sendSMS also signals "soft" failures (HTTP 200 with no
    // messageId, or a recognised error envelope) by returning
    // { success: false, ... } instead of throwing. Without this check the
    // OTP record is written but no SMS goes out, and the client is told
    // "code sent" — silently broken auth.
    if (!result || result.success === false) {
      logger.error('OTP send failed (provider soft failure)', {
        phoneNumber: normalizedPhone,
        providerError: result?.error,
        providerCode: result?.code,
        providerDetails: result?.details,
      });
      return { success: false, errorType: 'send_failed' };
    }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    // The provider error message may contain internal details (account IDs,
    // raw API errors). Log it for ops, return only a stable error type to
    // the caller.
    logger.error('OTP send failed', {
      phoneNumber: normalizedPhone,
      message: error.message,
      // axios attaches the upstream response body on `error.response.data` —
      // this is where Taqnyat puts the actionable reason (e.g. "ip not
      // authorized", "invalid sender name"). Without it the only signal in
      // logs is a generic network/HTTP message.
      providerStatus: error.response?.status,
      providerData: error.response?.data,
    });
    return { success: false, errorType: 'send_failed' };
  }
};

const verifyOTP = async (phoneNumber, otp) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Reviewer test number: accept the fixed OTP (env-gated, single number).
  if (
    isReviewerPhone(normalizedPhone) &&
    process.env.REVIEWER_TEST_OTP &&
    otp === process.env.REVIEWER_TEST_OTP
  ) {
    return { success: true };
  }

  // exclude already-used records to prevent replay attacks
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone, used: { $ne: true } });

  if (!stored) {
    return { success: false, errorType: 'not_found' };
  }

  if (stored.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: stored._id });
    return { success: false, errorType: 'expired' };
  }

  // Use timing-safe comparison
  const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
  const otpBuffer = Buffer.from(stored.otp);
  const inputBuffer = Buffer.from(hashedInput);
  if (otpBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(otpBuffer, inputBuffer)) {
    // Track attempts via a simple field check - delete after max attempts
    const attempts = (stored.attempts || 0) + 1;
    if (attempts >= OTP_CONFIG.maxAttempts) {
      await OTP.deleteOne({ _id: stored._id });
      return { success: false, errorType: 'max_attempts' };
    }
    await OTP.updateOne({ _id: stored._id }, { $inc: { attempts: 1 } });
    const attemptsLeft = Math.max(0, OTP_CONFIG.maxAttempts - attempts);
    return { success: false, errorType: 'invalid', meta: { attemptsLeft } };
  }

  // soft-invalidate instead of hard-delete so the record survives for
  // audit purposes but cannot be replayed.
  await OTP.updateOne({ _id: stored._id }, { $set: { used: true } });
  return { success: true };
};

const resendOTP = async (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone });

  if (stored && (Date.now() - stored.createdAt.getTime()) < OTP_CONFIG.cooldownSeconds * 1000) {
    const waitSeconds = Math.ceil((OTP_CONFIG.cooldownSeconds * 1000 - (Date.now() - stored.createdAt.getTime())) / 1000);
    return { success: false, errorType: 'cooldown', meta: { waitSeconds } };
  }

  return sendOTP(phoneNumber);
};

const hasValidOTP = async (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone });
  return !!(stored && stored.expiresAt > new Date());
};

// ============================================
// EMAIL VERIFICATION TOKEN
// ============================================

const EMAIL_VERIFICATION_TTL_HOURS = 24;

/**
 * Create and persist an email verification token for a newly-registered host.
 * Returns the raw (unhashed) token that is embedded in the link.
 * The OTP record stores the sha256 hash so the raw token is never persisted.
 *
 * @param {string} email - Recipient email address
 * @param {string} userId - User ID
 * @returns {Promise<string>} raw token
 */
const createEmailVerificationToken = async (email, userId) => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');

  // Remove any existing email_verification OTPs for this email
  await OTP.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });

  await OTP.create({
    email: email.toLowerCase(),
    otp: hashed,
    type: 'email_verification',
    userId,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    used: false,
  });

  return raw;
};

/**
 * Redeem an email verification token.
 * Returns the userId on success so the caller can mark the user as verified.
 *
 * @param {string} rawToken - Raw token from the verification link
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
const redeemEmailVerificationToken = async (rawToken) => {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await OTP.findOne({
    otp: hashed,
    type: 'email_verification',
    used: { $ne: true },
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return { success: false, errorType: 'expired_or_invalid' };
  }

  // Soft-invalidate so the record survives for audit but cannot be replayed.
  await OTP.updateOne({ _id: record._id }, { $set: { used: true } });

  return { success: true, userId: record.userId?.toString() };
};

module.exports = {
  sendOTP,
  verifyOTP,
  resendOTP,
  hasValidOTP,
  OTP_CONFIG,
  createEmailVerificationToken,
  redeemEmailVerificationToken,
};
