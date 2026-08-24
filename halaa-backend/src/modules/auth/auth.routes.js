/**
 * Auth Routes
 * Route definitions for authentication module
 * @module modules/auth/auth.routes
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

const express = require("express");
const router = express.Router();

// Controller
const authController = require("./auth.controller");

// Shared middleware (using existing during migration)
const { protect } = require("../../shared/middleware/auth");
const {
  validateZod,
} = require("../../shared/middleware/validation");
const {
  loginSchema,
  hostSignupSchema,
  vendorSignupSchema,
  otpSendSchema,
  otpVerifySchema,
  otpResendSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  completeProfileSchema,
  verifyEmailSchema,
  verifyEmailLinkSchema,
  resendEmailVerificationSchema,
} = require("./auth.validation");
const {
  authLimiter,
  refreshLimiter,
  otpLimiter,
  otpHourlyLimiter,
  passwordResetLimiter,
} = require("../../shared/middleware/rateLimiter");

// File upload (using shared utils)
const { uploadVendorFiles } = require("../../shared/utils/fileUpload");

const { AppError } = require("../../shared/errors");
const catchAsync = require("../../shared/utils/catchAsync");
const User = require("../../../models/UserModel");

const { normalizePhoneNumber } = require("../../shared/utils/phone");

/**
 * Check for duplicate email/phone during signup
 */
const checkDuplicates = catchAsync(async (req, res, next) => {
  const { email, phoneNumber, mobile } = req.body;
  const rawMobile = mobile || phoneNumber || "";
  const normalizedPhone = rawMobile ? normalizePhoneNumber(rawMobile) : "";
  const normalizedEmail = email?.toLowerCase().trim();

  if (normalizedEmail) {
    const query = { email: normalizedEmail };
    const existing = await User.findOne(query).select("email").lean();
    if (existing) return next(new AppError("This email address is already registered. Please use a different email or try logging in.", 409));
  }

  if (normalizedPhone || rawMobile) {
    const phoneConditions = [];
    if (normalizedPhone) {
      phoneConditions.push({ mobile: normalizedPhone }, { phoneNumber: normalizedPhone });
    }
    if (rawMobile && rawMobile !== normalizedPhone) {
      phoneConditions.push({ mobile: rawMobile }, { phoneNumber: rawMobile });
    }
    const existing = await User.findOne({ $or: phoneConditions }).select("mobile phoneNumber").lean();
    if (existing) return next(new AppError("This mobile number is already registered. Please use a different number or try logging in.", 409));
  }

  next();
});

// ============================================
// PUBLIC ROUTES
// ============================================

// Host Signup
/**
 * @swagger
 * /auth/signup/host:
 *   post:
 *     summary: Register a new host account
 *     description: Create a new host user account with email, password, and phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupHostRequest'
 *     responses:
 *       201:
 *         description: Host registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post(
  "/signup/host",
  authLimiter,
  validateZod(hostSignupSchema),
  checkDuplicates,
  authController.hostSignup
);

// Vendor Signup
/**
 * @swagger
 * /auth/signup/vendor:
 *   post:
 *     summary: Register a new vendor account
 *     description: Create a new vendor account with business details and documents
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/SignupVendorRequest'
 *     responses:
 *       201:
 *         description: Vendor registered successfully (pending approval)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post(
  "/signup/vendor",
  authLimiter,
  uploadVendorFiles,
  validateZod(vendorSignupSchema),
  checkDuplicates,
  authController.vendorSignup
);

// ============================================
// LOGIN ROUTES
// ============================================

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/login", authLimiter, validateZod(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate access + refresh tokens
 *     description: Read refresh token from HttpOnly cookie (web) or `refreshToken` body field (mobile). Always rotates.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Tokens rotated
 *       401:
 *         description: Refresh token invalid, revoked, or replayed
 */
// 60 req/min per IP — generous enough for mobile + multiple web tabs but
// blocks refresh-token brute force.
router.post("/refresh", refreshLimiter, authController.refresh);

// ============================================
// OTP ROUTES
// ============================================

/**
 * @swagger
 * /auth/otp/send-signup:
 *   post:
 *     summary: Send OTP for signup verification
 *     description: Send SMS OTP to phone number for signup verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/otp/send-signup",
  otpLimiter,
  otpHourlyLimiter,
  validateZod(otpSendSchema),
  checkDuplicates,
  authController.sendSignupOTP
);

/**
 * @swagger
 * /auth/otp/verify-signup:
 *   post:
 *     summary: Verify signup OTP
 *     description: Verify OTP code for signup
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerifyRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/otp/verify-signup", authLimiter, validateZod(otpVerifySchema), authController.verifySignupOTP);

/**
 * @swagger
 * /auth/otp/send-login:
 *   post:
 *     summary: Send OTP for login
 *     description: Send SMS OTP to phone number for login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/otp/send-login",
  otpLimiter,
  otpHourlyLimiter,
  validateZod(otpSendSchema),
  authController.sendLoginOTP
);

/**
 * @swagger
 * /auth/otp/verify-login:
 *   post:
 *     summary: Verify login OTP
 *     description: Verify OTP code and login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerifyRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/otp/verify-login", authLimiter, validateZod(otpVerifySchema), authController.verifyLoginOTP);

/**
 * @swagger
 * /auth/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     description: Resend OTP code to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/otp/resend",
  otpLimiter,
  otpHourlyLimiter,
  validateZod(otpResendSchema),
  authController.resendOTP
);

// ============================================
// PASSWORD ROUTES
// ============================================

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateZod(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   patch:
 *     summary: Reset password
 *     description: Reset password using token from email
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.patch(
  "/reset-password/:token",
  authLimiter,
  validateZod(resetPasswordSchema),
  authController.resetPassword
);

// ============================================
// LOGOUT
// ============================================

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout current user and invalidate token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
// Logout is intentionally public: clearing cookies + revoking the
// presented refresh token must work even when the access token has
// already expired.
router.post("/logout", authLimiter, authController.logout);

router.get(
  "/verify-email-link",
  authLimiter,
  validateZod(verifyEmailLinkSchema, "query"),
  authController.verifyEmailLink
);

/**
 * @swagger
 * /auth/resend-verification-email:
 *   post:
 *     summary: Resend email verification link
 *     description: Public, rate-limited resend of the email verification
 *       link sent at host signup. Always returns a generic success message
 *       to prevent account enumeration.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Generic success response
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  "/resend-verification-email",
  passwordResetLimiter,
  validateZod(resendEmailVerificationSchema),
  authController.resendEmailVerification
);

// ============================================
// PROTECTED ROUTES
// ============================================

router.use(protect);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get current logged in user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", authController.getMe);

/**
 * @swagger
 * /auth/update-push-token:
 *   patch:
 *     summary: Register the caller's Expo push token (mobile)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pushToken]
 *             properties:
 *               pushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Push token registered
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.patch("/update-push-token", authController.updatePushToken);

/**
 * @swagger
 * /auth/remove-push-token:
 *   patch:
 *     summary: Unregister the caller's Expo push token (logout)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Push token removed
 */
router.patch("/remove-push-token", authController.removePushToken);

/**
 * @swagger
 * /auth/update-password:
 *   patch:
 *     summary: Update password
 *     description: Update current user's password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/update-password",
  authLimiter,
  validateZod(updatePasswordSchema),
  authController.updatePassword
);

/**
 * @swagger
 * /auth/complete-profile:
 *   patch:
 *     summary: Complete host profile
 *     description: Complete host profile setup after registration
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HostProfile'
 *     responses:
 *       200:
 *         description: Profile completed successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/complete-profile",
  validateZod(completeProfileSchema),
  authController.completeHostProfile
);

/**
 * @swagger
 * /auth/send-verification-code:
 *   post:
 *     summary: Send email verification code
 *     description: Send verification code to user's email
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification code sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/send-verification-code",
  authController.sendEmailVerificationCode
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email
 *     description: Verify email address with verification code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/verify-email",
  validateZod(verifyEmailSchema),
  authController.verifyEmail
);

module.exports = router;
