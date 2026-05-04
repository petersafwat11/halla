/**
 * OTP Service
 * Business logic for OTP generation, storage, and verification
 * Uses MongoDB OTPModel for persistence (works across multiple instances)
 * @module modules/auth/otp.service
 */

const crypto = require('crypto');
const taqnyat = require('../../infrastructure/taqnyat');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const OTP = require('../../../models/OTPModel');

const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  cooldownSeconds: 30,
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phoneNumber, lang = 'ar') => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
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
    ar: `رمز التحقق الخاص بك في Halla هو: ${otp}\nصالح لمدة 5 دقائق.`,
    en: `Your Halla verification code is: ${otp}\nValid for 5 minutes.`,
  };

  try {
    const result = await taqnyat.sendSMS(normalizedPhone, messages[lang] || messages.ar);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[OTP] Send failed:', error);
    return { success: false, error: error.message };
  }
};

const verifyOTP = async (phoneNumber, otp) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  // FLOW-02-F02: exclude already-used records to prevent replay attacks
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone, used: { $ne: true } });

  if (!stored) {
    return { success: false, error: 'No OTP found. Please request a new code.' };
  }

  if (stored.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: stored._id });
    return { success: false, error: 'OTP has expired. Please request a new code.' };
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
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }
    await OTP.updateOne({ _id: stored._id }, { $inc: { attempts: 1 } });
    return { success: false, error: 'Invalid OTP code.' };
  }

  // FLOW-02-F02: soft-invalidate instead of hard-delete so the record
  // survives for audit purposes but cannot be replayed.
  await OTP.updateOne({ _id: stored._id }, { $set: { used: true } });
  return { success: true };
};

const resendOTP = async (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone });

  if (stored && (Date.now() - stored.createdAt.getTime()) < OTP_CONFIG.cooldownSeconds * 1000) {
    const waitTime = Math.ceil((OTP_CONFIG.cooldownSeconds * 1000 - (Date.now() - stored.createdAt.getTime())) / 1000);
    return { success: false, error: `Please wait ${waitTime} seconds before requesting a new code.` };
  }

  return sendOTP(phoneNumber);
};

const hasValidOTP = async (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const stored = await OTP.findOne({ phoneNumber: normalizedPhone });
  return !!(stored && stored.expiresAt > new Date());
};

// ============================================
// EMAIL VERIFICATION TOKEN (FLOW-02-F01)
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
    return { success: false, error: 'Verification link is invalid or has expired. Please request a new one.' };
  }

  // Soft-invalidate (FLOW-02-F02)
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
