/**
 * Auth Controller
 * HTTP request handling only - delegates to auth.service
 * @module modules/auth/auth.controller
 */

const crypto = require("crypto");
const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendCreated,
} = require("../../shared/utils/responseHelper");
const { ValidationError } = require("../../shared/errors");
const authService = require("./auth.service");
const config = require("../../config");
const User = require("../../../models/UserModel");

/**
 * Set JWT cookie on response
 * @param {Object} res - Express response
 * @param {string} token - JWT token
 */
const setTokenCookie = (res, token) => {
  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + config.jwt.cookieExpiresIn * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.isProd,
    sameSite: "strict",
  });
};

// ============================================
// LOGIN
// ============================================

/**
 * Helper to send auth response in legacy format (for backward compatibility)
 */
const sendAuthResponse = (res, user, token, additionalData = {}, statusCode = 200, message = null) => {
  const response = {
    status: 'success',
    token, // Token at root level for legacy backend compatibility
    data: {
      user,
      ...additionalData
    }
  };

  if (message) response.message = message;

  res.status(statusCode).json(response);
};

// ============================================
// LOGIN
// ============================================

/**
 * Login with email/phone and password
 * POST /api/v2/auth/login
 */
exports.login = catchAsync(async (req, res) => {
  const { user, token, subscription } = await authService.login(req.body);

  setTokenCookie(res, token);

  sendAuthResponse(res, user, token, { subscription }, 200, "Login successful");
});

/**
 * Logout
 * POST /api/v2/auth/logout
 */
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  sendSuccess(res, null, "Logged out successfully");
};

// ============================================
// SIGNUP
// ============================================

/**
 * Host signup
 * POST /api/v2/auth/signup/host
 */
exports.hostSignup = catchAsync(async (req, res) => {
  const { user, token, subscription } = await authService.signupHost(req.body);

  setTokenCookie(res, token);

  sendAuthResponse(res, user, token, { subscription }, 201, "Account created successfully");
});

/**
 * Vendor signup
 * POST /api/v2/auth/signup/vendor
 */
exports.vendorSignup = catchAsync(async (req, res) => {
  const { user, token, pendingApproval } = await authService.signupVendor(req.body, req.files);

  if (token) setTokenCookie(res, token);

  sendAuthResponse(res, user, token, { pendingApproval }, 201, "Vendor application submitted successfully");
});

/**
 * Whitelabel signup
 * POST /api/v2/auth/signup/whitelabel
 */
exports.whitelabelSignup = catchAsync(async (req, res) => {
  const { user, token, pendingApproval } = await authService.signupWhitelabel(req.body);

  if (token) setTokenCookie(res, token);

  sendAuthResponse(res, user, token, { pendingApproval }, 201, "Whitelabel application submitted successfully");
});

// ============================================
// OTP
// ============================================

/**
 * Send OTP for signup
 * POST /api/v2/auth/otp/send-signup
 */
exports.sendSignupOTP = catchAsync(async (req, res) => {
  const result = await authService.sendSignupOTP(req.body.phoneNumber);

  sendSuccess(res, result, "OTP sent successfully");
});

/**
 * Send OTP for login
 * POST /api/v2/auth/otp/send-login
 */
exports.sendLoginOTP = catchAsync(async (req, res) => {
  const result = await authService.sendLoginOTP(req.body.phoneNumber);

  sendSuccess(res, result, "OTP sent successfully");
});

/**
 * Verify OTP and complete signup
 * POST /api/v2/auth/otp/verify-signup
 */
exports.verifySignupOTP = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const result = await authService.verifySignupOTP(phoneNumber, otp);

  setTokenCookie(res, result.token);

  sendAuthResponse(res, result.user, result.token,
    {
      subscription: result.subscription,
      isNewUser: result.isNewUser,
      profileCompleted: result.profileCompleted
    },
    201, "Account created successfully"
  );
});

/**
 * Verify OTP and login
 * POST /api/v2/auth/otp/verify-login
 */
exports.verifyLoginOTP = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const result = await authService.verifyLoginOTP(phoneNumber, otp);

  setTokenCookie(res, result.token);

  sendAuthResponse(res, result.user, result.token,
    {
      subscription: result.subscription,
      isNewUser: result.isNewUser,
      profileCompleted: result.profileCompleted
    },
    200, "Login successful"
  );
});

/**
 * Resend OTP
 * POST /api/v2/auth/otp/resend
 */
exports.resendOTP = catchAsync(async (req, res) => {
  const { phoneNumber, type } = req.body;
  const result = await authService.resendOTP(phoneNumber, type);

  sendSuccess(res, result, "OTP resent successfully");
});

// ============================================
// PASSWORD
// ============================================

/**
 * Forgot password - send reset link
 * POST /api/v2/auth/forgot-password
 */
exports.forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  sendSuccess(res, null, result.message);
});

/**
 * Reset password with token
 * PATCH /api/v2/auth/reset-password/:token
 */
exports.resetPassword = catchAsync(async (req, res) => {
  const { password, passwordConfirm } = req.body;
  const { token } = req.params;

  const result = await authService.resetPassword(
    token,
    password,
    passwordConfirm
  );

  setTokenCookie(res, result.token);

  sendSuccess(
    res,
    { user: result.user, token: result.token },
    "Password reset successful"
  );
});

/**
 * Update password (logged in user)
 * PATCH /api/v2/auth/update-password
 */
exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;

  const result = await authService.updatePassword(
    req.user._id,
    currentPassword,
    newPassword,
    passwordConfirm
  );

  setTokenCookie(res, result.token);

  sendSuccess(
    res,
    { user: result.user, token: result.token },
    "Password updated successfully"
  );
});

// ============================================
// PROFILE
// ============================================

/**
 * Get current user
 * GET /api/v2/auth/me
 */
exports.getMe = catchAsync(async (req, res) => {
  const result = await authService.getMe(req.user._id);

  sendSuccess(res, result);
});

/**
 * Update current user profile
 * PATCH /api/v2/auth/update-me
 */
exports.updateMe = catchAsync(async (req, res) => {
  // Extract allowed fields
  const allowedFields = ["username", "email", "avatar", "phoneNumber"];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (req.file) {
    updateData.avatar = req.file.path || req.file.filename;
  }

  // Import User model directly for simple update
  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  });

  sendSuccess(
    res,
    { user: user.toPublicJSON() },
    "Profile updated successfully"
  );
});

/**
 * Complete host profile
 * PATCH /api/v2/auth/complete-profile
 */
exports.completeHostProfile = catchAsync(async (req, res) => {
  const user = await authService.completeHostProfile(req.user._id, req.body);

  const token = authService.signToken(user._id, user.role);
  setTokenCookie(res, token);

  sendSuccess(res, { user, token }, "Profile completed successfully");
});

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Send email verification code
 * POST /api/v2/auth/send-verification-code
 */
exports.sendEmailVerificationCode = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.email) {
    throw new ValidationError("No email address to verify");
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified");
  }

  const code = user.createEmailVerificationCode();
  await user.save({ validateBeforeSave: false });

  // Send the verification code via email
  const emailModule = require("../../infrastructure/email");
  await emailModule({
    email: user.email,
    subject: "Email Verification Code",
    message: `<h2>Email Verification</h2><p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
  });

  sendSuccess(res, null, "Verification code sent to your email");
});

/**
 * Verify email with code
 * POST /api/v2/auth/verify-email
 */
exports.verifyEmail = catchAsync(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user._id);

  if (!user.verifyEmailCode(code)) {
    throw new ValidationError("Invalid or expired verification code");
  }

  user.emailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;

  if (user.profile?.hostData) {
    user.profile.hostData.emailVerified = true;
  }

  await user.save({ validateBeforeSave: false });

  sendSuccess(res, null, "Email verified successfully");
});

// ============================================
// PASSWORD SETUP (Whitelabel)
// ============================================

/**
 * Validate setup token
 * GET /api/v2/auth/validate-setup-token/:token
 */
exports.validateSetupToken = catchAsync(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordSetupToken: hashedToken,
    passwordSetupExpires: { $gt: Date.now() },
  }).select("email username role");

  if (!user) {
    throw new ValidationError("Token is invalid or has expired");
  }

  sendSuccess(res, {
    valid: true,
    user: { email: user.email, username: user.username, role: user.role },
  });
});

/**
 * Setup password (first time for whitelabel)
 * POST /api/v2/auth/setup-password
 */
exports.setupPassword = catchAsync(async (req, res) => {
  const { token, password, passwordConfirm } = req.body;

  if (!token || !password) {
    throw new ValidationError("Token and password are required");
  }

  if (password !== passwordConfirm) {
    throw new ValidationError("Passwords do not match");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordSetupToken: hashedToken,
    passwordSetupExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ValidationError("Token is invalid or has expired");
  }

  user.password = password;
  user.passwordSetupToken = undefined;
  user.passwordSetupExpires = undefined;
  user.passwordChangedAt = Date.now() - 1000;

  await user.save();

  const jwtToken = authService.signToken(user._id, user.role);
  setTokenCookie(res, jwtToken);

  sendSuccess(
    res,
    {
      user: user.toPublicJSON ? user.toPublicJSON() : user,
      token: jwtToken,
    },
    "Password set successfully"
  );
});

/**
 * Resend setup email
 * POST /api/v2/auth/resend-setup-email
 */
exports.resendSetupEmail = catchAsync(async (req, res) => {
  const emailModule = require("../../infrastructure/email");
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    sendSuccess(res, null, "If that email exists, a setup link has been sent");
    return;
  }

  if (user.password && !user.passwordSetupToken) {
    throw new ValidationError(
      "Password is already set. Please use forgot password instead."
    );
  }

  const setupToken = user.createPasswordSetupToken();
  await user.save({ validateBeforeSave: false });

  const setupURL = `${config.frontend.url}/setup-password/${setupToken}`;

  try {
    await emailModule.send.passwordSetup(user.email, {
      userName: user.username || user.email,
      setupUrl: setupURL,
    });
  } catch (err) {
    user.passwordSetupToken = undefined;
    user.passwordSetupExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw err;
  }

  sendSuccess(res, null, "Setup email sent successfully");
});
