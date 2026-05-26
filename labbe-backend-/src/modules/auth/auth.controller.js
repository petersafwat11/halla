/**
 * Auth Controller
 * HTTP request handling only - delegates to auth.service.
 *
 * Authentication uses two HttpOnly cookies on web and a body-delivered
 * refresh token on mobile:
 *   - access_token  : HttpOnly cookie, path=/, 15-min TTL
 *   - refresh_token : HttpOnly cookie, path=/api/v2/auth/refresh, 30-day TTL
 *
 * Mobile clients pass the refresh token in the request body. The cookie
 * path restriction means non-refresh routes never see the refresh token
 * on web, eliminating CSRF surface for the long-lived credential.
 *
 * @module modules/auth/auth.controller
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
} = require("../../shared/utils/responseHelper");
const { ValidationError } = require("../../shared/errors");
const authService = require("./auth.service");
const config = require("../../config");
const User = require("../../../models/UserModel");
const { logAudit } = require("../../shared/utils/auditLog");

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

/**
 * Build base cookie options for the access token (path=/).
 *
 * SameSite=Lax: web and API live on the same VPS in production but on
 * different ports in dev. Lax keeps top-level GETs (Next.js SSR first
 * paint) and same-site fetches working while blocking cross-site form
 * POSTs from malicious origins. `None` would force a CSRF token on every
 * mutation; `Strict` would break dev. Mobile uses Authorization headers,
 * not cookies, so SameSite is web-only concern.
 *
 * `Secure: true` only in production (HTTPS). `HttpOnly: true` ensures
 * JavaScript cannot read the token.
 */
const accessCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: "lax",
  path: "/",
  maxAge: config.jwt.accessCookieMaxAgeMs,
});

/**
 * Build base cookie options for the refresh token (path-restricted).
 * See accessCookieOptions for SameSite rationale.
 */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: "lax",
  path: config.jwt.refreshCookiePath,
  maxAge: config.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
});

/**
 * Set both cookies on the response.
 * @param {Object} res
 * @param {{ accessToken: string, refreshToken: string }} pair
 */
const setAuthCookies = (res, pair) => {
  if (!pair) return;
  if (pair.accessToken) res.cookie(ACCESS_COOKIE, pair.accessToken, accessCookieOptions());
  if (pair.refreshToken) res.cookie(REFRESH_COOKIE, pair.refreshToken, refreshCookieOptions());
};

/**
 * Clear both auth cookies (path-aware).
 */
const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: config.jwt.refreshCookiePath });
};

/**
 * Read context (ip, userAgent) from the request for refresh-token auditing.
 */
const requestContext = (req) => ({
  ip: req.ip,
  userAgent: req.get("user-agent") || "",
});

/**
 * Detect whether the request originates from a browser. Browsers send the
 * refresh token in an HttpOnly cookie, so we strip it from the JSON body to
 * shrink leak surface (logs, error reporters, screenshots). Mobile keeps the
 * body field — it stores the token in SecureStore.
 */
const isBrowserClient = (req) => {
  if (req.get("x-client") === "mobile") return false;
  return Boolean(req.cookies && Object.keys(req.cookies).length > 0);
};

/**
 * Send the standard auth response.
 * Shape: status, token (root, legacy), refreshToken (mobile only), data.user.
 */
const sendAuthResponse = (
  res,
  { user, accessToken, refreshToken, additionalData = {}, statusCode = 200, message = null }
) => {
  const response = {
    status: "success",
    token: accessToken,
    data: {
      user,
      ...additionalData,
    },
  };

  if (refreshToken && !isBrowserClient(res.req)) {
    response.refreshToken = refreshToken;
  }

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
  const result = await authService.login(req.body, requestContext(req));

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    additionalData: { subscription: result.subscription },
    statusCode: 200,
    message: "Login successful",
  });
});

/**
 * Logout — revoke refresh token and clear cookies.
 * POST /api/v2/auth/logout
 */
exports.logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);

  // Best-effort actor identification from access token cookie (decode only, no verify)
  let actorId = null;
  try {
    const access = req.cookies?.[ACCESS_COOKIE];
    if (access) actorId = jwt.decode(access)?.id;
  } catch { /* swallow */ }
  logAudit({ action: 'auth.logout', actor: actorId ? { _id: actorId } : null, targetType: 'user', targetId: actorId || undefined, metadata: { ip: req.ip } }).catch(() => {});

  sendSuccess(res, null, "Logged out successfully");
});

/**
 * Refresh access + refresh tokens.
 * POST /api/v2/auth/refresh
 *
 * Web reads the refresh token from the path-restricted cookie. Mobile sends it
 * in the JSON body. Either way, the response is a brand-new pair and the old
 * refresh row is marked revoked. Re-using a revoked refresh triggers a chain
 * revocation in the service (replay = forced logout).
 */
exports.refresh = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  const result = await authService.rotateRefreshToken(refreshToken, requestContext(req));

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: await authService.sanitizeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    statusCode: 200,
    message: "Token refreshed",
  });
});

// ============================================
// SIGNUP
// ============================================

/**
 * Host signup
 * POST /api/v2/auth/signup/host
 */
exports.hostSignup = catchAsync(async (req, res) => {
  const result = await authService.signupHost(req.body, requestContext(req));

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    additionalData: { subscription: result.subscription },
    statusCode: 201,
    message: "Account created successfully",
  });
});

/**
 * Vendor signup — pending approval, no token issued.
 * POST /api/v2/auth/signup/vendor
 */
exports.vendorSignup = catchAsync(async (req, res) => {
  const result = await authService.signupVendor(req.body, req.files);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: null,
    refreshToken: null,
    additionalData: { pendingApproval: result.pendingApproval },
    statusCode: 201,
    message: "Vendor application submitted successfully",
  });
});

/**
 * Whitelabel signup — pending approval, no token issued.
 * POST /api/v2/auth/signup/whitelabel
 */
exports.whitelabelSignup = catchAsync(async (req, res) => {
  const result = await authService.signupWhitelabel(req.body, req.file);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: null,
    refreshToken: null,
    additionalData: { pendingApproval: result.pendingApproval },
    statusCode: 201,
    message: "Whitelabel application submitted successfully",
  });
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
  const result = await authService.verifySignupOTP(phoneNumber, otp, requestContext(req));

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    additionalData: {
      subscription: result.subscription,
      isNewUser: result.isNewUser,
      profileCompleted: result.profileCompleted,
    },
    statusCode: 201,
    message: "Account created successfully",
  });
});

/**
 * Verify OTP and login
 * POST /api/v2/auth/otp/verify-login
 */
exports.verifyLoginOTP = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const result = await authService.verifyLoginOTP(phoneNumber, otp, requestContext(req));

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    additionalData: {
      subscription: result.subscription,
      isNewUser: result.isNewUser,
      profileCompleted: result.profileCompleted,
    },
    statusCode: 200,
    message: "Login successful",
  });
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
 * Reset password with token. Re-issues a fresh token pair and revokes
 * any previous refresh tokens for the user.
 * PATCH /api/v2/auth/reset-password/:token
 */
exports.resetPassword = catchAsync(async (req, res) => {
  const { password, passwordConfirm } = req.body;
  const { token } = req.params;

  const result = await authService.resetPassword(
    token,
    password,
    passwordConfirm,
    requestContext(req)
  );

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    statusCode: 200,
    message: "Password reset successful",
  });
});

/**
 * Update password (logged in user). Revokes all existing refresh tokens.
 * PATCH /api/v2/auth/update-password
 */
exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;

  const result = await authService.updatePassword(
    req.user._id,
    currentPassword,
    newPassword,
    passwordConfirm,
    requestContext(req)
  );

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    statusCode: 200,
    message: "Password updated successfully",
  });
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
 * Complete host profile
 * PATCH /api/v2/auth/complete-profile
 *
 * Re-issues a fresh token pair so the new (potentially elevated)
 * profile state takes effect immediately.
 */
exports.completeHostProfile = catchAsync(async (req, res) => {
  const user = await authService.completeHostProfile(req.user._id, req.body);
  const tokens = await authService.issueTokenPair(user, requestContext(req));

  setAuthCookies(res, tokens);

  sendAuthResponse(res, {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    statusCode: 200,
    message: "Profile completed successfully",
  });
});

// ============================================
// EMAIL VERIFICATION LINK
// ============================================

/**
 * Redeem an email verification link sent at host signup.
 * GET /api/v2/auth/verify-email-link?token=<raw>
 * Public endpoint — no JWT required.
 */
exports.verifyEmailLink = catchAsync(async (req, res) => {
  const { token } = req.query;
  const result = await authService.verifyEmailLink(token);
  sendSuccess(res, null, result.message);
});

/**
 * Resend the email-verification link.
 * POST /api/v2/auth/resend-verification-email
 * Public endpoint — anti-enumeration response is generated by the service.
 * Must be rate-limited at the route layer (IP + email).
 */
exports.resendEmailVerification = catchAsync(async (req, res) => {
  const { email } = req.body;
  const lang = req.params?.lang || req.query?.lang || "ar";
  const result = await authService.resendEmailVerificationLink(email, lang);
  sendSuccess(res, null, result.message);
});

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Send email verification code
 * POST /api/v2/auth/send-verification-code
 */
exports.sendEmailVerificationCode = catchAsync(async (req, res) => {
  await authService.sendEmailVerificationCode(req.user._id);
  sendSuccess(res, null, "Verification code sent to your email");
});

/**
 * Verify email with code
 * POST /api/v2/auth/verify-email
 */
exports.verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.user._id, req.body.code);
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
    const err = new ValidationError("Token is invalid or has expired");
    err.code = "TOKEN_INVALID_OR_EXPIRED";
    throw err;
  }

  sendSuccess(res, {
    valid: true,
    user: { email: user.email, username: user.username, role: user.role },
  });
});

/**
 * Setup password (first time for whitelabel)
 * POST /api/v2/auth/setup-password
 *
 * Returns a full token pair through the cookie + body shape.
 */
exports.setupPassword = catchAsync(async (req, res) => {
  // Token presence + password rules + confirm match are enforced by
  // setupPasswordSchema (Zod). The controller only owns the lookup +
  // hand-over to issueTokenPair.
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordSetupToken: hashedToken,
    passwordSetupExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new ValidationError("Token is invalid or has expired");
    err.code = "TOKEN_INVALID_OR_EXPIRED";
    throw err;
  }

  user.password = password;
  user.passwordSetupToken = undefined;
  user.passwordSetupExpires = undefined;
  user.passwordChangedAt = Date.now() - 1000;
  // activate the whitelabel account once they set their password
  if (user.status !== 'active') {
    user.status = 'active';
  }

  await user.save();

  // setupPassword is effectively a credentials handover (the temp password
  // is replaced with one the user controls). Invalidate any refresh tokens
  // issued under the temp credential before minting a fresh pair, so a
  // stolen interim session cannot survive the setup ceremony.
  await authService.revokeAllForUser(user._id);

  const tokens = await authService.issueTokenPair(user, requestContext(req));
  setAuthCookies(res, tokens);

  sendAuthResponse(res, {
    user: user.toPublicJSON ? await user.toPublicJSON() : user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    statusCode: 200,
    message: "Password set successfully",
  });
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
